import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { transporter, mailOptions } from "@/lib/nodemailer";

// Fără generare PDF sau QR aici! Doar DB și text mail.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) return NextResponse.json({ error: "No ID" }, { status: 400 });

    console.log(`Processing Order: ${orderId}`);

    // --- FAZA 1: TRANZACȚIE DB ---
    await client.query("BEGIN");

    // 1. Verificăm comanda
    const checkRes = await client.query("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Idempotency (Dacă e deja plătită, nu mai inserăm dubluri, doar retrimitem mailul)
    const alreadyPaid = checkRes.rows[0].status === 'paid';
    
    if (!alreadyPaid) {
        // 2. Setăm status PAID
        await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [orderId]);

        // 3. Preluăm itemele
        const itemsRes = await client.query(
          `SELECT oi.ticketcategoryid, oi.quantity, tc.series_prefix 
           FROM order_items oi 
           JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id 
           WHERE oi.orderid = $1`, [orderId]
        );

        // 4. GENERĂM BILETELE (Bucla corectată)
        for (const item of itemsRes.rows) {
          // Blocăm categoria pentru stoc
          const catRes = await client.query(`SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`, [item.ticketcategoryid]);
          let currentSold = Number(catRes.rows[0].soldQuantity);

          for (let k = 0; k < item.quantity; k++) {
            currentSold++;
            
            // REPARATIE COLIZIUNE: Adăugăm indexul 'k' și un random distinct în string
            const uniqueQR = `${orderId.slice(0,4)}-${item.ticketcategoryid.slice(0,2)}-${currentSold}-${Date.now().toString(36)}-${k}`; 
            
            const displayID = `${item.series_prefix || "GEN"} ${currentSold}`;
            
            await client.query(
              `INSERT INTO tickets (order_id, category_id, series_prefix, ticket_number, ticket_display, unique_qr_code, status)
               VALUES ($1, $2, $3, $4, $5, $6, 'valid')`,
              [orderId, item.ticketcategoryid, item.series_prefix || "GEN", currentSold, displayID, uniqueQR]
            );
          }
          // Updatăm stocul o singură dată per categorie
          await client.query(`UPDATE ticket_categories SET "soldQuantity" = $1 WHERE id = $2`, [currentSold, item.ticketcategoryid]);
        }
        
        await client.query("COMMIT");
        console.log("✅ DB Transaction Complete");
    } else {
        await client.query("ROLLBACK"); // Nu e nevoie de commit, doar am citit
        console.log("ℹ️ Order already paid, resending email...");
    }

    // --- FAZA 2: TRIMITERE EMAIL (Doar Link) ---
    const customerEmail = checkRes.rows[0].customeremail;
    const customerName = checkRes.rows[0].customername || "Client";
    
    // Configurați URL-ul site-ului (Vercel sau Localhost)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bilete-goran-bregovici.vercel.app";
    const ticketLink = `${baseUrl}/tickets/view/${orderId}`;

    await transporter.sendMail({
      ...mailOptions,
      to: customerEmail,
      subject: `Comanda Confirmată #${orderId.slice(0,6)}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #f3f4f6;">
          <div style="background: white; padding: 30px; border-radius: 8px; text-align: center;">
            <h2 style="color: #d97706;">Felicitări, ${customerName}!</h2>
            <p>Plata a fost înregistrată și biletele au fost generate.</p>
            
            <div style="margin: 30px 0;">
              <a href="${ticketLink}" style="background-color: #d97706; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                VEZI BILETELE ONLINE
              </a>
            </div>
            
            <p style="font-size: 12px; color: #666;">Salvarea biletelor pe telefon se face accesând linkul de mai sus.</p>
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("❌ Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    client.release();
  }
}