import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/utils';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const statsRes = await pool.query(`SELECT COALESCE(SUM(totalamount), 0) as revenue, COUNT(id) as orders FROM orders WHERE status = 'paid'`);
    const inventoryRes = await pool.query('SELECT id, name, code, "totalQuantity", "soldQuantity" FROM ticket_categories');
    
    const chartRes = await pool.query(`
      SELECT TO_CHAR(created_at, 'Day') as day, SUM(totalamount) as sales
      FROM orders WHERE status='paid' AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'Day'), created_at ORDER BY created_at
    `);

    const recentOrdersRes = await pool.query(`
        SELECT o.id, o.customername, o.totalamount, TO_CHAR(o.created_at, 'DD.MM HH24:MI') as formatted_date
        FROM orders o WHERE status='paid' ORDER BY created_at DESC LIMIT 10
    `);

    return NextResponse.json({
      stats: {
        revenue: parseFloat(statsRes.rows[0].revenue),
        orders: parseInt(statsRes.rows[0].orders),
        ticketsSold: inventoryRes.rows.reduce((acc: number, i: any) => acc + i.soldQuantity, 0),
      },
      chart: chartRes.rows.map((r: any) => ({ day: r.day.trim(), sales: parseFloat(r.sales) })),
      inventory: inventoryRes.rows,
      recentOrders: recentOrdersRes.rows.map((r: any) => ({
          id: r.id, customer: r.customername, status: 'paid', date: r.formatted_date
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}