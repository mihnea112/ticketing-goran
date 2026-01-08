import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { mapCategory } from "@/lib/utils";

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT * FROM ticket_categories ORDER BY price ASC"
    );
    const tickets = result.rows.map(mapCategory).map((t: any) => ({
      ...t,
      available: t.totalQuantity - t.soldQuantity,
      isSoldOut: t.totalQuantity <= t.soldQuantity,
    }));

    // Setăm cache control ca să nu facă request la DB la fiecare milisecundă (opțional)
    return NextResponse.json(tickets, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Eroare la preluarea biletelor" },
      { status: 500 }
    );
  }
}
