import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const { id } = params;
  const { price, totalQuantity, name } = await req.json();

  try {
    await pool.query(
      `UPDATE ticket_categories 
       SET price = $1, "totalQuantity" = $2, name = COALESCE($3, name)
       WHERE id = $4`,
      [price, totalQuantity, name, id]
    );
    return NextResponse.json({ success: true, message: "Categoria a fost actualizată" });
  } catch (error) {
    return NextResponse.json({ error: "Eroare la actualizare" }, { status: 500 });
  }
}