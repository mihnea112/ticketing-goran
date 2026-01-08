import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { transporter, mailOptions } from "@/lib/nodemailer";
import QRCode from "qrcode";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing Order ID" },
        { status: 400 }
      );
    }

    console.log(`🚀 [START] Procesare comandă: ${orderId}`);

    // =================================================
    // FAZA 1: DATABASE TRANSACTION
    // =================================================
    await client.query("BEGIN");

    const checkRes = await client.query(
      "SELECT * FROM orders WHERE id = $1 FOR UPDATE",
      [orderId]
    );

    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    if (checkRes.rows[0].status === "paid") {
      await client.query("ROLLBACK");
      console.log("⚠️ Comanda deja plătită.");
      return NextResponse.json({ success: true, message: "Already paid" });
    }

    const customerEmail = checkRes.rows[0].customeremail;
    const customerName = checkRes.rows[0].customername || "Client";

    // Update Status
    await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [
      orderId,
    ]);

    // Preluare iteme
    const itemsRes = await client.query(
      `SELECT oi.ticketcategoryid, oi.quantity, tc.series_prefix, tc.name as cat_name
       FROM order_items oi 
       JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id 
       WHERE oi.orderid = $1`,
      [orderId]
    );

    // Pregătim datele pentru generare
    const generatedTickets = [];

    // Generăm biletele în DB
    for (const item of itemsRes.rows) {
      const catRes = await client.query(
        `SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`,
        [item.ticketcategoryid]
      );
      let currentSold = Number(catRes.rows[0].soldQuantity);

      for (let i = 0; i < item.quantity; i++) {
        currentSold++;
        const uniqueQR = `${orderId.slice(0, 4)}-${Date.now().toString(
          36
        )}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
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

        generatedTickets.push({
          unique_qr: uniqueQR,
          display: displayID,
          category: item.cat_name,
        });
      }
      await client.query(
        `UPDATE ticket_categories SET "soldQuantity" = $1 WHERE id = $2`,
        [currentSold, item.ticketcategoryid]
      );
    }

    await client.query("COMMIT");
    console.log("✅ [DB] Tranzacție salvată.");

    // =================================================
    // FAZA 2: PREGĂTIRE EMAIL CU IMAGINI CID (CRITIC)
    // =================================================

    let ticketsHtmlBlocks = "";
    const emailAttachments = [];

    for (const [index, ticket] of generatedTickets.entries()) {
      // 1. Generăm QR ca Data URL
      const qrDataURL = await QRCode.toDataURL(ticket.unique_qr, {
        width: 300,
        margin: 1,
        errorCorrectionLevel: "M",
      });

      // 2. Extragem doar conținutul base64 (fără prefixul "data:image/png;base64,")
      const base64Content = qrDataURL.split(",")[1];

      // 3. Creăm un Content-ID (CID) unic pentru această imagine
      const uniqueCid = `qr-${index}-${ticket.unique_qr}@ticket`;

      // 4. Adăugăm la lista de atașamente Nodemailer
      emailAttachments.push({
        filename: `qr-${ticket.unique_qr}.png`,
        content: base64Content,
        encoding: "base64",
        cid: uniqueCid, // <--- ASTA ESTE CHEIA!
      });

      // 5. În HTML folosim cid:... în loc de base64 lung
      ticketsHtmlBlocks += `
        <div style="border: 2px dashed #d97706; padding: 20px; margin-bottom: 20px; border-radius: 10px; background-color: #ffffff;">
          <div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #333; font-size: 18px;">${ticket.category}</h3>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Serie/Loc: <strong>${ticket.display}</strong></p>
          </div>
          <div style="text-align: center;">
            <img src="cid:${uniqueCid}" alt="QR Code" style="width: 150px; height: 150px; display: inline-block;" />
            <p style="font-family: monospace; font-size: 12px; color: #999; margin: 5px 0 0 0;">${ticket.unique_qr}</p>
          </div>
        </div>
      `;
    }

    // =================================================
    // FAZA 3: TRIMITERE EMAIL
    // =================================================
    console.log(`📧 [EMAIL] Trimitere către ${customerEmail}...`);

    await transporter.sendMail({
      ...mailOptions,
      to: customerEmail,
      subject: `Biletele Tale - Comanda #${orderId.slice(0, 8)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background-color: #111827; padding: 20px; text-align: center;">
              <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Comandă Confirmată</h1>
            </div>
            <div style="padding: 30px;">
              <p>Salut <strong>${customerName}</strong>,</p>
              <p>Plata a fost procesată. Iată biletele tale:</p>
              
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                <p style="margin:0; font-weight:bold; color:#1e40af;">Goran Bregović & Bijelo Dugme</p>
                <p style="margin:5px 0 0 0; font-size:14px; color:#1e3a8a;">📅 14 Feb 2026, 20:00 | 📍 Sala Constantin Jude</p>
              </div>

              ${ticketsHtmlBlocks}

              <p style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 20px;">
                Prezintă codurile QR la intrare.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: emailAttachments, // <--- Lista cu imaginile CID
    });

    console.log("✅ [SUCCESS] Email trimis.");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    try {
      await client.query("ROLLBACK");
    } catch (e) {}
    console.error("❌ [ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server Error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
