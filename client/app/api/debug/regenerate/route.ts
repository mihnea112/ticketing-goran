import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // ATENTIE: Asta sterge toate biletele existente!
    await client.query("TRUNCATE TABLE tickets RESTART IDENTITY CASCADE");
    await client.query('UPDATE ticket_categories SET "soldQuantity" = 0');

    const ordersRes = await client.query("SELECT id FROM orders WHERE status = 'paid' ORDER BY created_at ASC");

    for (const order of ordersRes.rows) {
      const itemsRes = await client.query(
        `SELECT oi.id, oi.ticketcategoryid, oi.quantity, tc.series_prefix 
         FROM order_items oi
         JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id
         WHERE oi.orderid = $1`,
        [order.id]
      );

      for (const item of itemsRes.rows) {
        const catRes = await client.query(`SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`, [item.ticketcategoryid]);
        let currentSold = Number(catRes.rows[0].soldQuantity);

        for (let i = 0; i < item.quantity; i++) {
          currentSold++;
          const ticketNumber = currentSold;
          const series = item.series_prefix || "GEN";
          const displayID = `${series} ${ticketNumber}`;
          const uniqueQR = `${item.id}-${i + 1}-REGEN-${Date.now()}`;

          await client.query(
            `INSERT INTO tickets 
            (order_id, category_id, series_prefix, ticket_number, ticket_display, unique_qr_code, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'valid')`,
            [order.id, item.ticketcategoryid, series, ticketNumber, displayID, uniqueQR]
          );
        }
        await client.query(`UPDATE ticket_categories SET "soldQuantity" = $1 WHERE id = $2`, [currentSold, item.ticketcategoryid]);
      }
    }

    await client.query("COMMIT");
    return new NextResponse(`✅ REPARAT! Bilete regenerate pentru ${ordersRes.rows.length} comenzi.`);
  } catch (error: any) {
    await client.query("ROLLBACK");
    return new NextResponse("Eroare: " + error.message, { status: 500 });
  } finally {
    client.release();
  }
}