// app/api/tickets/route.ts
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT
        id,
        code,
        name,
        price,
        "totalQuantity"  AS "totalQuantity",
        "soldQuantity"   AS "soldQuantity"
      FROM ticket_categories
      ORDER BY price ASC
    `);

    return NextResponse.json(res.rows);
  } catch (e: any) {
    console.error("tickets GET error:", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  } finally {
    client.release();
  }
}