// app/api/orders/confirm/route.ts
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { sendOrderConfirmedEmail } from "@/lib/nodemailer";

// IMPORTANT: Nodemailer needs Node runtime (NOT Edge)
export const runtime = "nodejs";

// Keep your existing config
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function getBaseUrl(request: Request) {
  // Prefer explicit env
  const appUrl = process.env.NEXT_PUBLIC_API_URL;
  if (appUrl) return appUrl.replace(/\/+$/, "");

  // Vercel automatic env
  if (process.env.NEXT_PUBLIC_API_URL) return `https://${process.env.NEXT_PUBLIC_API_URL}`.replace(/\/+$/, "");

  // Fallback to request headers (works behind many proxies)
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`.replace(/\/+$/, "");

  return "http://localhost:3000";
}

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json().catch(() => null);
    const orderId: string | undefined = body?.orderId;

    if (!orderId) return NextResponse.json({ error: "No ID" }, { status: 400 });

    console.log(`[confirm] Processing Order: ${orderId}`);

    // Helpful: confirm env presence on Vercel (remove later if you want)
    console.log("[confirm] env check", {
      hasUser: Boolean(process.env.GMAIL_USER || process.env.SMTP_USER),
      hasPass: Boolean(process.env.GMAIL_PASS || process.env.SMTP_PASS),
      vercelEnv: process.env.VERCEL_ENV,
    });

    // --- FAZA 1: TRANZACȚIE DB ---
    await client.query("BEGIN");

    // 1) Verificăm comanda + lock
    const checkRes = await client.query("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [orderId]);

    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Idempotency
    const alreadyPaid = checkRes.rows[0].status === "paid";

    if (!alreadyPaid) {
      // 2) Setăm status PAID
      await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [orderId]);

      // 3) Preluăm itemele
      const itemsRes = await client.query(
        `SELECT oi.ticketcategoryid, oi.quantity, tc.series_prefix
         FROM order_items oi
         JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id
         WHERE oi.orderid = $1`,
        [orderId]
      );

      // 4) Generăm biletele
      for (const item of itemsRes.rows) {
        const catRes = await client.query(
          `SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`,
          [item.ticketcategoryid]
        );

        let currentSold = Number(catRes.rows[0].soldQuantity);

        for (let k = 0; k < Number(item.quantity); k++) {
          currentSold++;

          const uniqueQR = `${orderId.slice(0, 4)}-${String(item.ticketcategoryid).slice(
            0,
            2
          )}-${currentSold}-${Date.now().toString(36)}-${k}`;

          const displayID = `${item.series_prefix || "GEN"} ${currentSold}`;

          await client.query(
            `INSERT INTO tickets (order_id, category_id, series_prefix, ticket_number, ticket_display, unique_qr_code, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'valid')`,
            [orderId, item.ticketcategoryid, item.series_prefix || "GEN", currentSold, displayID, uniqueQR]
          );
        }

        // Update stock once per category
        await client.query(`UPDATE ticket_categories SET "soldQuantity" = $1 WHERE id = $2`, [
          currentSold,
          item.ticketcategoryid,
        ]);
      }

      await client.query("COMMIT");
      console.log("[confirm] ✅ DB Transaction Complete");
    } else {
      // We locked the order row; rollback releases lock
      await client.query("ROLLBACK");
      console.log("[confirm] ℹ️ Order already paid, resending email...");
    }

    // --- FAZA 2: TRIMITERE EMAIL (Doar Link) ---
    const customerEmail = checkRes.rows[0].customeremail;
    const customerName = checkRes.rows[0].customername || "Client";

    if (!customerEmail) {
      console.warn("[confirm] Missing customer email on order:", orderId);
      return NextResponse.json({ success: true, emailSent: false, warning: "Missing customer email" });
    }

    const baseUrl = getBaseUrl(request);
    const ticketLink = `${baseUrl}/tickets/view/${encodeURIComponent(orderId)}`;

    try {
      const mailInfo = await sendOrderConfirmedEmail({
        to: customerEmail,
        customerName,
        orderId,
        ticketLink,
      });

      console.log("[confirm] ✅ Email result", mailInfo);

      return NextResponse.json({
        success: true,
        emailSent: true,
        mail: mailInfo,
      });
    } catch (mailErr: any) {
      console.error("[confirm] ❌ Email send failed:", mailErr?.message || mailErr);

      // Do not fail payment confirmation just because email failed
      return NextResponse.json({
        success: true,
        emailSent: false,
        warning: "Order confirmed but email failed to send",
        error: String(mailErr?.message || mailErr),
      });
    }
  } catch (error: any) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("[confirm] ❌ Error:", error?.message || error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  } finally {
    client.release();
  }
}