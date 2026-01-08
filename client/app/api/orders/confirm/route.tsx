import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { transporter, mailOptions } from "@/lib/nodemailer";
import QRCode from "qrcode";

// NU mai importăm react-pdf, el este cauza blocajului!

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) return NextResponse.json({ success: false }, { status: 400 });

    console.log(`[START] Procesare comanda: ${orderId}`);

    // =================================================
    // FAZA 1: DATABASE
    // =================================================
    await client.query("BEGIN");

    // 1. Verificare
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

    // Idempotency check
    if (checkRes.rows[0].status === "paid") {
      await client.query("ROLLBACK");
      console.log("Comanda deja platita.");
      return NextResponse.json({ success: true });
    }

    const customerEmail = checkRes.rows[0].customeremail;
    const customerName = checkRes.rows[0].customername || "Client";

    // 2. Update Status
    await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [
      orderId,
    ]);

    // 3. Generare Bilete in DB
    const itemsRes = await client.query(
      `SELECT oi.ticketcategoryid, oi.quantity, tc.series_prefix, tc.name as cat_name
       FROM order_items oi 
       JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id 
       WHERE oi.orderid = $1`,
      [orderId]
    );

    const ticketsData = [];

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
        )}-${Math.random().toString(36).substr(2, 4)}`;
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

        // Salvăm datele pentru email
        ticketsData.push({
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
    console.log("[DB] Tranzactie finalizata cu succes.");

    // =================================================
    // FAZA 2: PREGĂTIRE EMAIL (FĂRĂ PDF)
    // =================================================

    // Generăm un singur QR code (pentru primul bilet) sau câte unul pentru fiecare,
    // dar pentru simplitate și viteză, le punem ca imagini CID (embedded) sau base64 în HTML.

    // Construim HTML-ul pentru bilete
    let ticketsHtml = "";

    for (const ticket of ticketsData) {
      // Generăm QR rapid
      const qrDataURL = await QRCode.toDataURL(ticket.unique_qr, {
        width: 200,
        margin: 1,
      });

      ticketsHtml += `
        <div style="border: 2px dashed #d97706; padding: 20px; margin-bottom: 20px; border-radius: 10px; background: #fff;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${ticket.category}</h3>
          <p style="margin: 0; font-size: 14px; color: #666;">Loc: <strong>${ticket.display}</strong></p>
          <div style="margin-top: 15px; text-align: center;">
            <img src="${qrDataURL}" alt="QR Code" style="width: 150px; height: 150px;" />
            <p style="font-size: 10px; color: #999;">${ticket.unique_qr}</p>
          </div>
        </div>
      `;
    }

    // =================================================
    // FAZA 3: TRIMITERE
    // =================================================
    console.log(`[EMAIL] Se trimite mail catre ${customerEmail}...`);

    await transporter.sendMail({
      ...mailOptions,
      to: customerEmail,
      subject: `Comanda Confirmată #${orderId.slice(0, 6)} - Biletele Tale`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #d97706; text-align: center; margin-top: 0;">Plată Confirmată!</h2>
            <p style="text-align: center; color: #4b5563;">Salut ${customerName}, îți mulțumim pentru comandă.</p>
            
            <div style="margin: 30px 0;">
              ${ticketsHtml}
            </div>

            <div style="background-color: #eee; padding: 15px; border-radius: 8px; font-size: 14px;">
              <p style="margin: 5px 0;"><strong>Eveniment:</strong> Goran Bregović & Bijelo Dugme</p>
              <p style="margin: 5px 0;"><strong>Data:</strong> 14 Februarie 2026, 20:00</p>
              <p style="margin: 5px 0;"><strong>Locație:</strong> Sala Constantin Jude, Timișoara</p>
            </div>
            
            <p style="text-align: center; font-size: 12px; color: #999; margin-top: 30px;">
              Prezintă codurile QR de mai sus la intrare.
            </p>
          </div>
        </div>
      `,
    });

    console.log("[SUCCESS] Email trimis.");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("[CRITICAL ERROR]", error);
    // Chiar dacă e eroare, returnam 500 ca sa vedem in logs
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
