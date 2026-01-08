import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { transporter, mailOptions } from "@/lib/nodemailer"; // Asigurat import corect
import { renderToBuffer } from "@react-pdf/renderer";
import { TicketDocument } from "@/components/TicketPDF";
import React from "react";
import QRCode from "qrcode";

// --- CONFIGURAȚII VERCEL (CRITICE) ---
// Încearcă să extindă timpul de execuție la 60 secunde (doar Pro) sau max posibil pe Hobby
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Interfață date
interface TicketData {
  unique_qr_id: string;
  ticket_display: string;
  category_name: string;
  priceperunit: number;
  series_prefix?: string;
  ticket_number?: number;
}

export async function POST(request: Request) {
  console.time("TotalExecution"); // Start cronometru general
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
    // FAZA 1: DATABASE TRANSACTION
    // =================================================
    console.time("DatabaseTransaction");
    await client.query("BEGIN");

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

    if (checkRes.rows[0].status === "paid") {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: true, message: "Deja plătită." });
    }

    const customerEmail = checkRes.rows[0].customeremail;
    const customerName = checkRes.rows[0].customername || "Client";

    // Update Status
    await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [
      orderId,
    ]);

    // Get Items
    const itemsRes = await client.query(
      `SELECT oi.id, oi.ticketcategoryid, oi.quantity, tc.series_prefix 
       FROM order_items oi
       JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id
       WHERE oi.orderid = $1`,
      [orderId]
    );

    // Generate Tickets & Update Stock
    for (const item of itemsRes.rows) {
      const catRes = await client.query(
        `SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`,
        [item.ticketcategoryid]
      );
      let currentSold = Number(catRes.rows[0].soldQuantity);

      for (let i = 0; i < item.quantity; i++) {
        currentSold++;
        const uniqueQR = `${orderId.slice(0, 4)}-${item.ticketcategoryid.slice(
          0,
          4
        )}-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .substr(2, 5)}`;
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

    await client.query("COMMIT");
    console.timeEnd("DatabaseTransaction"); // Stop cronometru DB

    // =================================================
    // FAZA 2: PREGĂTIRE DATE (QR Codes)
    // =================================================
    console.time("QRGeneration");

    // Recitim datele curate
    const ticketsForPdf = await client.query(
      `SELECT t.unique_qr_code as unique_qr_id, t.ticket_display, tc.name as category_name, tc.price as priceperunit
       FROM tickets t
       JOIN ticket_categories tc ON t.category_id = tc.id
       WHERE t.order_id = $1 ORDER BY t.ticket_number ASC`,
      [orderId]
    );
    const tickets: TicketData[] = ticketsForPdf.rows;

    // Generare QR Paralelă
    const qrResults = await Promise.all(
      tickets.map(async (ticket) => {
        try {
          const url = await QRCode.toDataURL(ticket.unique_qr_id, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 150,
          });
          return { id: ticket.unique_qr_id, url };
        } catch (e) {
          return null;
        }
      })
    );

    qrResults.forEach((res) => {
      if (res) qrCodesMap[res.id] = res.url;
    });

    orderDetailsForEmail = {
      id: orderId,
      customername: customerName,
      created_at: checkRes.rows[0].created_at,
      items: tickets,
    };
    console.timeEnd("QRGeneration");

    // =================================================
    // FAZA 3: PDF & EMAIL
    // =================================================

    // --- BLOC DE SIGURANȚĂ PENTRU PDF ---
    // Încercăm să generăm PDF. Dacă durează prea mult sau crapă,
    // trimitem mail fără PDF ca să nu pierdem confirmarea clientului.
    let pdfBuffer: Buffer | null = null;

    try {
      console.log("Începe generarea PDF...");
      console.time("PDFRender");
      pdfBuffer = await renderToBuffer(
        <TicketDocument
          orderDetails={orderDetailsForEmail}
          qrCodes={qrCodesMap}
        />
      );
      console.timeEnd("PDFRender");
      console.log("PDF generat cu succes. Mărime:", pdfBuffer.length);
    } catch (pdfError) {
      console.error(
        "⚠️ EROARE GENERARE PDF (Se va trimite mail fara PDF):",
        pdfError
      );
      pdfBuffer = null;
    }

    // Pregătire atașamente (doar dacă există buffer)
    const attachments = pdfBuffer
      ? [
          {
            filename: `Bilete-Goran-${orderId.slice(0, 6)}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : [];

    // Trimitere Email
    try {
      console.log("Începe trimiterea emailului...");
      console.time("SMTP");

      await transporter.sendMail({
        ...mailOptions,
        to: customerEmail,
        subject: `Comanda ta #${orderId.slice(
          0,
          8
        )} - Goran Bregović & Bijelo Dugme`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #d97706;">Salut ${customerName},</h2>
            <p>Plata a fost confirmată cu succes!</p>
            ${
              pdfBuffer
                ? `<p><strong>✅ Biletele tale sunt atașate în format PDF.</strong></p>`
                : `<p style="color:red;"><strong>⚠️ Notă:</strong> PDF-ul se generează. Dacă nu este atașat, te rugăm să ne contactezi sau să prezinți acest email la intrare.</p>`
            }
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <p style="margin:0;"><strong>Eveniment:</strong> Goran Bregović & Bijelo Dugme</p>
                <p style="margin:0;"><strong>Locație:</strong> Sala Constantin Jude, Timișoara</p>
                <p style="margin:0;"><strong>Data:</strong> 14 Februarie 2026, 20:00</p>
                <p style="margin:0;"><strong>ID Comandă:</strong> ${orderId}</p>
            </div>
          </div>
        `,
        attachments: attachments,
      });
      console.timeEnd("SMTP");
      console.log(`📧 Email trimis cu succes la ${customerEmail}`);
    } catch (emailError) {
      console.error("❌ EROARE SMTP:", emailError);
      // Nu dăm throw error aici, pentru că plata e deja înregistrată în DB
    }

    console.timeEnd("TotalExecution");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Rollback doar dacă nu am apucat să dăm COMMIT
    try {
      await client.query("ROLLBACK");
    } catch (e) {}
    console.error("CRITICAL ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
