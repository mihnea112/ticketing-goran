import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { isAuthenticated, unauthorizedResponse } from "@/lib/utils";

// Definim tipul corect pentru props
type Props = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, props: Props) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  // Așteptăm params
  const params = await props.params;
  const { id } = params;

  const { price, totalQuantity, name } = await req.json();

  try {
    await pool.query(
      `UPDATE ticket_categories 
       SET price = $1, "totalQuantity" = $2, name = COALESCE($3, name)
       WHERE id = $4`,
      [price, totalQuantity, name, id]
    );
    return NextResponse.json({
      success: true,
      message: "Categoria a fost actualizată",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Eroare la actualizare" },
      { status: 500 }
    );
  }
}
