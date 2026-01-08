import { NextResponse } from "next/server";
import pool from "@/lib/db";

// Definirea tipului pentru params ca Promise
type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, props: Props) {
  // 1. Așteptăm params (Unwrap the Promise)
  const params = await props.params;
  const id = params.id;
  
  try {
    const orderRes = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
    
    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: "Comanda inexistentă" }, { status: 404 });
    }

    const ticketsRes = await pool.query(
      `SELECT t.unique_qr_code as unique_qr_id, 
              t.ticket_display, 
              t.series_prefix,
              t.ticket_number,
              tc.name as category_name, 
              tc.code as category_code,
              tc.price as priceperunit
       FROM tickets t
       JOIN ticket_categories tc ON t.category_id = tc.id
       WHERE t.order_id = $1
       ORDER BY t.ticket_number ASC`,
      [id]
    );

    return NextResponse.json({ ...orderRes.rows[0], items: ticketsRes.rows });
  } catch (error) {
    console.error("Eroare preluare comanda:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}