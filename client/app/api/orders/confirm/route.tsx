import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { sendOrderConfirmedEmail } from "@/lib/nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getBaseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const orderId: string | undefined = body?.orderId;

  if (!orderId) return NextResponse.json({ error: "No ID" }, { status: 400 });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Lock order row
    const orderRes = await client.query(
      "SELECT * FROM orders WHERE id = $1 FOR UPDATE",
      [orderId]
    );
    if (orderRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const order = orderRes.rows[0];
    const alreadyPaid = order.status === "paid";

    // 2) Check if tickets already exist
    const tcRes = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM tickets WHERE order_id = $1`,
      [orderId]
    );
    const ticketsCount = Number(tcRes.rows[0].cnt);
    const shouldGenerateTickets = ticketsCount === 0;

    // 3) If not paid, mark paid
    if (!alreadyPaid) {
      await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [
        orderId,
      ]);
    }

    // 4) Generate tickets ONLY if missing (even if already paid)
    if (shouldGenerateTickets) {
      const itemsRes = await client.query(
        `SELECT oi.ticketcategoryid, oi.quantity, tc.series_prefix
         FROM order_items oi
         JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id
         WHERE oi.orderid = $1`,
        [orderId]
      );

      for (const item of itemsRes.rows) {
        const catRes = await client.query(
          `SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`,
          [item.ticketcategoryid]
        );

        let currentSold = Number(catRes.rows[0].soldQuantity);

        for (let k = 0; k < Number(item.quantity); k++) {
          currentSold++;

          const uniqueQR = `${orderId.slice(0, 4)}-${String(
            item.ticketcategoryid
          ).slice(0, 2)}-${currentSold}-${Date.now().toString(36)}-${k}`;

          const displayID = `${item.series_prefix || "GEN"} ${currentSold}`;

          await client.query(
            `INSERT INTO tickets (order_id, category_id, series_prefix, ticket_number, ticket_display, unique_qr_code, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'valid')`,
            [
              orderId,
              item.ticketcategoryid,
              item.series_prefix || "GEN",
              currentSold,
              displayID,
              uniqueQR,
            ]
          );
        }

        await client.query(
          `UPDATE ticket_categories SET "soldQuantity" = $1 WHERE id = $2`,
          [currentSold, item.ticketcategoryid]
        );
      }
    }

    await client.query("COMMIT");

    // 5) Email (launch-safe: avoid duplicates if already paid)
    const customerEmail = order.customeremail as string | undefined;
    const customerName = (order.customername as string | undefined) || "Client";

    const baseUrl = getBaseUrl();
    const ticketLink = `${baseUrl}/tickets/view/${encodeURIComponent(orderId)}`;

    let emailSent = false;
    let warning: string | undefined;

    if (!customerEmail) {
      warning = "Missing customer email on order.";
    } else if (alreadyPaid) {
      // Webhook likely already sent; skip to prevent duplicates
      warning = "Order already paid; skipped email to avoid duplicates.";
    } else {
      try {
        await sendOrderConfirmedEmail({
          to: customerEmail,
          customerName,
          orderId,
          ticketLink,
        });
        emailSent = true;
      } catch (e: any) {
        warning = `Email failed: ${String(e?.message || e)}`;
      }
    }

    return NextResponse.json({
      success: true,
      alreadyPaid,
      ticketsGenerated: shouldGenerateTickets,
      emailSent,
      warning,
    });
  } catch (error: any) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("❌ confirm error:", error);
    return NextResponse.json(
      { error: String(error?.message || error) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
