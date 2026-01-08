import { NextResponse } from "next/server";
import pool from "@/lib/db";
// Asigură-te că lib/nodemailer exportă corect 'transporter' și 'mailOptions'
import { transporter, mailOptions } from "@/lib/nodemailer";
import { renderToBuffer } from "@react-pdf/renderer";
import { TicketDocument } from "@/components/TicketPDF";
import React from "react";
import QRCode from "qrcode";

// Interfață pentru datele biletului (ajută la TypeScript)
interface TicketData {
  unique_qr_id: string;
  ticket_display: string;
  category_name: string;
  priceperunit: number;
  series_prefix?: string;
  ticket_number?: number;
}

export async function POST(request: Request) {
  const client = await pool.connect();
  let orderDetailsForEmail = null;
  let qrCodesMap: Record<string, string> = {};

  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Lipseste Order ID" },
        { status: 400 }
      );
    }

    // =================================================
    // FAZA 1: TRANZACȚIA SQL (Lock & Update & Insert)
    // =================================================
    await client.query("BEGIN");

    // 1. Verificăm comanda și o blocăm pentru update
    const checkRes = await client.query(
      "SELECT * FROM orders WHERE id = $1 FOR UPDATE",
      [orderId]
    );

    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "Comanda nu există" },
        { status: 404 }
      );
    }

    // Idempotency: Dacă e deja plătită, ne oprim (dar cu succes)
    if (checkRes.rows[0].status === "paid") {
      await client.query("ROLLBACK");
      return NextResponse.json({
        success: true,
        message: "Comanda este deja confirmată și plătită.",
      });
    }

    const customerEmail = checkRes.rows[0].customeremail;
    const customerName = checkRes.rows[0].customername || "Client";

    // 2. Setăm statusul PAID
    await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [
      orderId,
    ]);

    // 3. Preluăm itemele din comandă
    // NOTĂ: Postgres returnează coloanele cu litere mici (ticketcategoryid)
    const itemsRes = await client.query(
      `SELECT oi.id, oi.ticketcategoryid, oi.quantity, tc.series_prefix 
       FROM order_items oi
       JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id
       WHERE oi.orderid = $1`,
      [orderId]
    );

    // 4. GENERĂM BILETELE ÎN TABEL (INVENTAR)
    for (const item of itemsRes.rows) {
      // Blocăm categoria pentru a citi soldQuantity corect
      const catRes = await client.query(
        `SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`,
        [item.ticketcategoryid]
      );

      let currentSold = Number(catRes.rows[0].soldQuantity);

      // Generăm 'n' bilete pentru această linie din comandă
      for (let i = 0; i < item.quantity; i++) {
        currentSold++;
        const ticketNumber = currentSold;
        const series = item.series_prefix || "GEN";
        const displayID = `${series} ${ticketNumber}`;

        // Generăm un ID unic complex pentru QR
        const uniqueQR = `${orderId.slice(0, 4)}-${item.ticketcategoryid.slice(
          0,
          4
        )}-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .substr(2, 5)}`;

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

      // Actualizăm stocul vândut per categorie
      await client.query(
        `UPDATE ticket_categories SET "soldQuantity" = $1 WHERE id = $2`,
        [currentSold, item.ticketcategoryid]
      );
    }

    // SALVĂM MODIFICĂRILE ÎN BAZĂ
    await client.query("COMMIT");

    // =================================================
    // FAZA 2: PREGĂTIRE DATE PENTRU PDF (După Commit)
    // =================================================

    // 1. Recitim biletele generate pentru a avea datele exacte
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

    const tickets: TicketData[] = ticketsForPdf.rows;

    // 2. Generăm imaginile QR (Optimizat cu Promise.all)
    const qrPromises = tickets.map(async (ticket) => {
      try {
        const url = await QRCode.toDataURL(ticket.unique_qr_id, {
          errorCorrectionLevel: "H",
        });
        return { id: ticket.unique_qr_id, url };
      } catch (err) {
        console.error(`Eroare generare QR pentru ${ticket.unique_qr_id}`, err);
        return null;
      }
    });

    const qrResults = await Promise.all(qrPromises);

    // Convertim array-ul în map: { "cod_unic": "data:image/png..." }
    qrResults.forEach((res) => {
      if (res) qrCodesMap[res.id] = res.url;
    });

    // 3. Structurăm datele pentru React-PDF
    orderDetailsForEmail = {
      id: orderId,
      customername: customerName,
      created_at: checkRes.rows[0].created_at,
      items: tickets, // Trimitem lista de bilete procesată
    };

    // =================================================
    // FAZA 3: RENDER PDF & SEND EMAIL
    // =================================================

    try {
      console.log("Generating PDF...");

      const pdfBuffer = await renderToBuffer(
        <TicketDocument
          orderDetails={orderDetailsForEmail}
          qrCodes={qrCodesMap}
        />
      );

      console.log("PDF Generated. Sending Email...");

      await transporter.sendMail({
        ...mailOptions, // Importat din lib/nodemailer
        to: customerEmail,
        subject: `Comanda ta #${orderId.slice(
          0,
          8
        )} - Goran Bregović & Bijelo Dugme`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #d97706;">Salut ${customerName},</h2>
            <p>Îți mulțumim pentru achiziție! Plata a fost confirmată cu succes.</p>
            <p><strong>Biletele tale sunt atașate acestui email în format PDF.</strong></p>
            <p>Te rugăm să prezinți codul QR de pe bilet la intrare (pe telefon sau printat).</p>
            <br>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
                <p style="margin:0;"><strong>Eveniment:</strong> Goran Bregović & Bijelo Dugme</p>
                <p style="margin:0;"><strong>Locație:</strong> Sala Constantin Jude, Timișoara</p>
                <p style="margin:0;"><strong>Data:</strong> 14 Februarie 2026, 20:00</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">Acesta este un mesaj automat. Te rugăm să nu răspunzi la acest email.</p>
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
      // Nu dăm fail la request dacă doar emailul eșuează, dar logăm eroarea.
      // Comanda este deja plătită în baza de date.
      console.error(
        "❌ EROARE TRIMITERE EMAIL (dar comanda e salvata):",
        emailError
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Facem Rollback DOAR dacă eroarea a apărut ÎNAINTE de commit (în Faza 1)
    // Dacă eroarea apare la email, comanda rămâne plătită.
    try {
      await client.query("ROLLBACK");
    } catch (e) {
      // Ignorăm eroarea de rollback dacă nu e necesar
    }

    console.error("Critical Confirm Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
