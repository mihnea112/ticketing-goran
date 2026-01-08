import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { transporter, mailOptions } from "@/lib/nodemailer";
import QRCode from "qrcode"; 

// ⚠️ IMPORTANT: NU mai importăm 'react-pdf' aici. 
// Asta asigura ca functia ramane usoara si rapida.

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing Order ID" }, { status: 400 });
    }

    console.log(`🚀 [START] Procesare comandă: ${orderId}`);

    // =================================================
    // FAZA 1: TRANZACȚIA BAZĂ DE DATE (CRITIC)
    // =================================================
    await client.query("BEGIN");

    // 1. Verificăm comanda și o blocăm
    const checkRes = await client.query(
      "SELECT * FROM orders WHERE id = $1 FOR UPDATE", 
      [orderId]
    );

    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Comanda nu există" }, { status: 404 });
    }
    
    // Verificăm dacă e deja plătită (Idempotency)
    if (checkRes.rows[0].status === 'paid') {
      await client.query("ROLLBACK");
      console.log("⚠️ Comanda este deja marcată ca plătită.");
      return NextResponse.json({ success: true, message: "Already paid" });
    }

    const customerEmail = checkRes.rows[0].customeremail;
    const customerName = checkRes.rows[0].customername || "Client";

    // 2. Setăm statusul la PAID
    await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [orderId]);

    // 3. Preluăm produsele pentru a genera biletele
    const itemsRes = await client.query(
      `SELECT oi.ticketcategoryid, oi.quantity, tc.series_prefix, tc.name as cat_name
       FROM order_items oi 
       JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id 
       WHERE oi.orderid = $1`, [orderId]
    );

    // Vom stoca aici datele biletelor pentru a le pune în email mai târziu
    const generatedTickets = [];

    // 4. Generăm biletele efectiv
    for (const item of itemsRes.rows) {
      // Blocăm categoria pentru inventar corect
      const catRes = await client.query(
        `SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`, 
        [item.ticketcategoryid]
      );
      let currentSold = Number(catRes.rows[0].soldQuantity);

      for (let i = 0; i < item.quantity; i++) {
        currentSold++;
        // Generăm un cod unic sigur
        const uniqueQR = `${orderId.slice(0,4)}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2,5)}`.toUpperCase();
        const displayID = `${item.series_prefix || "GEN"} ${currentSold}`;
        
        // Inserăm biletul
        await client.query(
          `INSERT INTO tickets (order_id, category_id, series_prefix, ticket_number, ticket_display, unique_qr_code, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'valid')`,
          [orderId, item.ticketcategoryid, item.series_prefix || "GEN", currentSold, displayID, uniqueQR]
        );

        // Adăugăm în lista pentru email
        generatedTickets.push({
          unique_qr: uniqueQR,
          display: displayID,
          category: item.cat_name
        });
      }
      
      // Actualizăm stocul
      await client.query(`UPDATE ticket_categories SET "soldQuantity" = $1 WHERE id = $2`, [currentSold, item.ticketcategoryid]);
    }

    // SALVĂM TOTUL ÎN BAZA DE DATE
    await client.query("COMMIT");
    console.log("✅ [DB] Tranzacție finalizată cu succes.");

    // =================================================
    // FAZA 2: GENERARE HTML PENTRU EMAIL
    // =================================================
    
    let ticketsHtmlBlocks = '';
    
    // Generăm HTML pentru fiecare bilet
    for (const ticket of generatedTickets) {
      // Generăm QR Code ca imagine Base64 (foarte rapid)
      const qrDataURL = await QRCode.toDataURL(ticket.unique_qr, { 
        width: 200, 
        margin: 1,
        errorCorrectionLevel: 'M'
      });
      
      ticketsHtmlBlocks += `
        <div style="border: 2px dashed #d97706; padding: 20px; margin-bottom: 20px; border-radius: 10px; background-color: #ffffff;">
          <div style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #333; font-size: 18px;">${ticket.category}</h3>
            <p style="margin: 5px 0 0 0; color: #666;">Loc / Serie: <strong>${ticket.display}</strong></p>
          </div>
          <div style="text-align: center;">
            <img src="${qrDataURL}" alt="QR Code" style="width: 150px; height: 150px; display: inline-block;" />
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
      subject: `Biletele Tale - Comanda #${orderId.slice(0,8)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <div style="background-color: #111827; padding: 20px; text-align: center;">
              <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Confirmare Comandă</h1>
            </div>

            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #374151;">Salut <strong>${customerName}</strong>,</p>
              <p style="color: #4b5563;">Plata a fost confirmată cu succes! Mai jos găsești biletele tale electronice.</p>
              
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #1e40af;">Goran Bregović & Bijelo Dugme</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #1e3a8a;">📅 14 Februarie 2026, 20:00</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #1e3a8a;">📍 Sala Constantin Jude, Timișoara</p>
              </div>

              <p style="text-align: center; font-weight: bold; margin-bottom: 20px;">Biletele tale:</p>
              
              ${ticketsHtmlBlocks}

              <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
                Te rugăm să prezinți codurile QR de mai sus la intrare (direct de pe telefon).
              </p>
            </div>

            <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0;">ID Comandă: ${orderId}</p>
              <p style="margin: 5px 0 0 0;">Acesta este un mesaj automat.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("✅ [SUCCESS] Email trimis și comandă procesată.");
    return NextResponse.json({ success: true });

  } catch (error: any) {
    // Rollback doar dacă eroarea a apărut înainte de COMMIT
    try { await client.query("ROLLBACK"); } catch (e) {}
    
    console.error("❌ [CRITICAL ERROR]", error);
    // Returnăm eroare 500 ca să vedem în loguri, dar nu lăsăm clientul să creadă că a plătit degeaba
    return NextResponse.json({ success: false, error: error.message || "Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}