import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { transporter, mailOptions } from "@/lib/nodemailer";
import { renderToBuffer } from "@react-pdf/renderer";
import { TicketDocument } from "@/components/TicketPDF";
import React from "react";
import QRCode from "qrcode";

export const maxDuration = 60; // Încercăm să creștem limita
export const dynamic = 'force-dynamic';

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

    if (!orderId) return NextResponse.json({ success: false }, { status: 400 });

    // --- FAZA 1: DB ---
    await client.query("BEGIN");
    
    // Verificari DB (simplificate pentru claritate)
    const checkRes = await client.query("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
    if (checkRes.rows.length === 0 || checkRes.rows[0].status === 'paid') {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: true, message: "Skipped" });
    }

    const customerEmail = checkRes.rows[0].customeremail;
    const customerName = checkRes.rows[0].customername || "Client";

    // Update DB
    await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [orderId]);
    
    // Preluare bilete
    const itemsRes = await client.query(
      `SELECT oi.id, oi.ticketcategoryid, oi.quantity, tc.series_prefix 
       FROM order_items oi JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id WHERE oi.orderid = $1`, [orderId]
    );

    // Generare Bilete
    for (const item of itemsRes.rows) {
      const catRes = await client.query(`SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`, [item.ticketcategoryid]);
      let currentSold = Number(catRes.rows[0].soldQuantity);

      for (let i = 0; i < item.quantity; i++) {
        currentSold++;
        const uniqueQR = `${orderId.slice(0,4)}-${Date.now()}-${i}`;
        const displayID = `${item.series_prefix || "GEN"} ${currentSold}`;
        
        await client.query(
          `INSERT INTO tickets (order_id, category_id, series_prefix, ticket_number, ticket_display, unique_qr_code, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'valid')`,
          [orderId, item.ticketcategoryid, item.series_prefix || "GEN", currentSold, displayID, uniqueQR]
        );
      }
      await client.query(`UPDATE ticket_categories SET "soldQuantity" = $1 WHERE id = $2`, [currentSold, item.ticketcategoryid]);
    }

    await client.query("COMMIT");

    // --- FAZA 2: PREGATIRE PDF ---
    // Luam datele curate
    const ticketsRes = await client.query(
      `SELECT t.unique_qr_code as unique_qr_id, t.ticket_display, tc.name as category_name, tc.price as priceperunit
       FROM tickets t JOIN ticket_categories tc ON t.category_id = tc.id WHERE t.order_id = $1`, [orderId]
    );
    const tickets: TicketData[] = ticketsRes.rows;

    // Generare QR (Rapid)
    const qrResults = await Promise.all(tickets.map(async (t) => {
        try { return { id: t.unique_qr_id, url: await QRCode.toDataURL(t.unique_qr_id) }; } 
        catch { return null; }
    }));
    qrResults.forEach(r => { if(r) qrCodesMap[r.id] = r.url });

    orderDetailsForEmail = {
      id: orderId,
      customername: customerName,
      created_at: new Date(),
      items: tickets,
    };

    // --- FAZA 3: PDF CU TIMEOUT (SOLUȚIA MAGICĂ) ---
    let pdfBuffer: Buffer | null = null;

    try {
      console.log("⏳ Începe generarea PDF (max 4s)...");
      
      // Definim un Timeout Promise care dă reject după 4 secunde
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout PDF")), 4000)
      );

      // Definim PDF Promise
      const pdfPromise = renderToBuffer(
        <TicketDocument orderDetails={orderDetailsForEmail} qrCodes={qrCodesMap} />
      );

      // Le punem la întrecere. Cine termină primul câștigă.
      // @ts-ignore
      pdfBuffer = await Promise.race([pdfPromise, timeoutPromise]);
      
      console.log("✅ PDF generat cu succes!");
    } catch (err) {
      console.error("⚠️ PDF a eșuat sau a expirat (Se trimite mail simplu):", err);
      pdfBuffer = null;
    }

    // --- FAZA 4: EMAIL ---
    try {
      console.log("📧 Trimitere email...");
      
      const attachments = pdfBuffer ? [{
        filename: 'Bilete-Concert.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : [];

      await transporter.sendMail({
        ...mailOptions,
        to: customerEmail,
        subject: `Confirmare Comandă #${orderId.slice(0,6)}`,
        html: `
          <h3>Salut ${customerName},</h3>
          <p>Plata a fost confirmată.</p>
          ${pdfBuffer 
            ? '<p>✅ Biletele sunt atașate.</p>' 
            : '<p style="color:red">⚠️ Eroare generare PDF. Te rugăm să prezinți acest email la intrare.</p>'
          }
          <p><strong>Bilete:</strong></p>
          <ul>
            ${tickets.map(t => `<li>${t.category_name} - Loc: ${t.ticket_display}</li>`).join('')}
          </ul>
        `,
        attachments: attachments
      });
      console.log("✅ Email trimis!");
    } catch (e) {
      console.error("❌ Eroare SMTP:", e);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("Server Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}