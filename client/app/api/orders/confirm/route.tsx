import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { transporter, mailOptions } from "@/lib/nodemailer";
import { renderToBuffer } from "@react-pdf/renderer";
import { TicketDocument } from "@/components/TicketPDF";
import React from "react";
import QRCode from "qrcode"; // <--- IMPORT CRITIC

export async function POST(request: Request) {
  const client = await pool.connect();
  let orderDetailsForEmail = null;

  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) throw new Error("Lipseste Order ID");

    // =================================================
    // FAZA 1: TRANZACȚIA SQL (Lock & Update & Insert)
    // =================================================
    await client.query("BEGIN");

    // 1. Verificăm comanda
    const checkRes = await client.query(
      "SELECT * FROM orders WHERE id = $1 FOR UPDATE",
      [orderId]
    );
    if (checkRes.rows.length === 0) throw new Error("Comanda nu există");

    // Idempotency: Dacă e deja plătită
    if (checkRes.rows[0].status === "paid") {
      await client.query("ROLLBACK");
      return NextResponse.json({
        success: true,
        message: "Comanda era deja confirmată",
      });
    }

    const customerEmail = checkRes.rows[0].customeremail;
    const customerName = checkRes.rows[0].customername;

    // 2. Setăm statusul PAID
    await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [
      orderId,
    ]);

    // 3. Preluăm itemele pentru generare
    const itemsRes = await client.query(
      `SELECT oi.id, oi.ticketcategoryid, oi.quantity, tc.series_prefix 
       FROM order_items oi
       JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id
       WHERE oi.orderid = $1`,
      [orderId]
    );

    // 4. GENERĂM BILETELE ÎN TABEL
    for (const item of itemsRes.rows) {
      const catRes = await client.query(
        `SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`,
        [item.ticketcategoryid]
      );

      let currentSold = Number(catRes.rows[0].soldQuantity);

      for (let i = 0; i < item.quantity; i++) {
        currentSold++;
        const ticketNumber = currentSold;
        const series = item.series_prefix || "GEN";
        const displayID = `${series} ${ticketNumber}`;
        
        // Generăm un ID unic pentru bilet
        const uniqueQR = `${item.id}-${i + 1}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;

        await client.query(
          `INSERT INTO tickets 
          (order_id, category_id, series_prefix, ticket_number, ticket_display, unique_qr_code, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'valid')`,
          [
            orderId,
            item.ticketcategoryid,
            series,
            ticketNumber,
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

    // SALVĂM MODIFICĂRILE ÎN BAZĂ
    await client.query("COMMIT");

    // =================================================
    // FAZA 2: GENERARE QR & PREGĂTIRE PDF (După Commit)
    // =================================================

    // 1. Recitim biletele generate
    const ticketsForPdf = await client.query(
      `SELECT t.unique_qr_code as unique_qr_id, 
              t.ticket_display, 
              tc.name as category_name, 
              tc.price as priceperunit
       FROM tickets t
       JOIN ticket_categories tc ON t.category_id = tc.id
       WHERE t.order_id = $1
       ORDER BY t.ticket_number ASC`,
      [orderId]
    );

    // 2. Generăm imaginile QR (Mapare ID -> Base64 Image)
    const qrCodesMap: Record<string, string> = {};
    
    for (const ticket of ticketsForPdf.rows) {
      try {
        const qrImage = await QRCode.toDataURL(ticket.unique_qr_id);
        qrCodesMap[ticket.unique_qr_id] = qrImage;
      } catch (err) {
        console.error("Eroare generare QR pentru:", ticket.unique_qr_id, err);
      }
    }

    // 3. Structurăm datele
    orderDetailsForEmail = {
      id: orderId,
      customername: customerName,
      created_at: checkRes.rows[0].created_at,
      items: ticketsForPdf.rows,
    };

    // =================================================
    // FAZA 3: RENDER PDF & SEND EMAIL
    // =================================================

    try {
      // Pasăm și 'orderDetails' și 'qrCodes'
      const pdfBuffer = await renderToBuffer(
        <TicketDocument 
          orderDetails={orderDetailsForEmail} 
          qrCodes={qrCodesMap} 
        />
      );

      // Trimitem Email-ul
      await transporter.sendMail({
        ...mailOptions,
        to: customerEmail,
        subject: `Comanda ta #${orderId.slice(0, 8)} - Goran Bregović`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2>Salut ${customerName},</h2>
            <p>Plata a fost confirmată cu succes!</p>
            <p>Atașat găsești biletele tale în format PDF. Te rugăm să prezinți codul QR la intrare.</p>
            <br>
            <p><strong>Detalii Eveniment:</strong></p>
            <ul>
              <li>Locație: Sala Constantin Jude, Timișoara</li>
              <li>Data: 14 Februarie 2026, 20:00</li>
            </ul>
            <hr>
            <p style="font-size: 12px; color: #777;">Acesta este un mesaj automat.</p>
          </div>
        `,
        attachments: [
          {
            filename: `Bilete-Goran-${orderId.slice(0, 6)}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });

      console.log(`📧 Email trimis cu succes la ${customerEmail}`);
    } catch (emailError) {
      console.error("❌ EROARE TRIMITERE EMAIL:", emailError);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Confirm Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}