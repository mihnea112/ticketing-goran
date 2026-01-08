import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/utils';

export async function POST(req: NextRequest) {
  // Nota: De obicei scannerele au nevoie de Auth, dar uneori e mai simplu fără dacă URL-ul e secret
  // Aici lăsăm fără auth strict dacă app-ul de mobil nu trimite header-ul, 
  // dar recomandat e să decomentezi linia de mai jos:
  // if (!isAuthenticated(req)) return unauthorizedResponse();

  const { qrCode } = await req.json();
  
  try {
    const ticketRes = await pool.query(
      `SELECT t.*, tc.name as category_name, o.customername 
       FROM tickets t
       JOIN ticket_categories tc ON t.category_id = tc.id
       JOIN orders o ON t.order_id = o.id
       WHERE t.unique_qr_code = $1`,
      [qrCode]
    );

    if (ticketRes.rows.length === 0) {
      return NextResponse.json({ valid: false, message: "Bilet NECUNOSCUT." }, { status: 404 });
    }

    const ticket = ticketRes.rows[0];

    if (ticket.status === 'used') {
       return NextResponse.json({ 
         valid: false, 
         message: `Bilet DEJA FOLOSIT! (${ticket.ticket_display})`,
         details: { customer: ticket.customername }
       }, { status: 409 });
    }

    await pool.query("UPDATE tickets SET status = 'used' WHERE id = $1", [ticket.id]);

    return NextResponse.json({
      valid: true,
      customer: ticket.customername,
      category: ticket.category_name,
      ticketNumber: ticket.ticket_display,
    });

  } catch (error: any) {
    return NextResponse.json({ valid: false, message: "Eroare Server" }, { status: 500 });
  }
}