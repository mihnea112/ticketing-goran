import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/utils';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const result = await pool.query(`
      SELECT t.id, t.ticket_display, t.status, t.unique_qr_code,
             tc.name as category_name,
             o.customername, o.customeremail
      FROM tickets t
      JOIN ticket_categories tc ON t.category_id = tc.id
      JOIN orders o ON t.order_id = o.id
      ORDER BY t.ticket_number ASC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}