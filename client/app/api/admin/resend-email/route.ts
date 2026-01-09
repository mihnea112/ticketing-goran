import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendOrderConfirmedEmail } from '@/lib/nodemailer';

export async function POST(req: Request) {
  const adminToken = req.headers.get("x-admin-token");
  if (!adminToken) { 
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ message: "Order ID is required" }, { status: 400 });
    }

    const client = await pool.connect();
    
    // Selectăm toate coloanele
    const res = await client.query(
        `SELECT * FROM orders WHERE id = $1`,
        [orderId]
    );
    client.release();

    if (res.rows.length === 0) {
        return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const order = res.rows[0];

    // --- FIX AICI: Adăugat 'order.customeremail' ---
    const targetEmail = order.customeremail || order.email || order.customer_email;
    
    const targetName = order.customername || order.name || "Client";

    if (!targetEmail) {
        return NextResponse.json({ 
            message: `Nu s-a găsit adresa de email. Coloane disponibile: ${Object.keys(order).join(", ")}` 
        }, { status: 400 });
    }

    // Link-ul biletului
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const ticketLink = `${baseUrl}/tickets/view/${order.id}`;

    // Trimitem Emailul
    await sendOrderConfirmedEmail({
        to: targetEmail,
        customerName: targetName,
        orderId: order.id,
        ticketLink: ticketLink
    });

    return NextResponse.json({ message: `Email trimis cu succes către ${targetEmail}!` });

  } catch (error) {
    console.error("Resend Error:", error);
    return NextResponse.json({ message: "Server error sending email" }, { status: 500 });
  }
}