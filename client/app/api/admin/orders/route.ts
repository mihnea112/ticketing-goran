import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/utils';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const result = await pool.query(`
      SELECT o.*, 
             COUNT(t.id) as tickets_generated 
      FROM orders o
      LEFT JOIN tickets t ON o.id = t.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}