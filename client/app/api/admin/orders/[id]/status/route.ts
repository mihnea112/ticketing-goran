import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { isAuthenticated, unauthorizedResponse } from "@/lib/utils";

// Definim tipul Props unde params este un Promise
type Props = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, props: Props) {
  // 1. Verificăm autentificarea
  if (!isAuthenticated(req)) {
    return unauthorizedResponse();
  }

  // 2. Așteptăm params (Aici era eroarea)
  const params = await props.params;
  const { id } = params;

  try {
    const body = await req.json();
    const { status } = body;

    // 3. Actualizăm statusul în baza de date
    await pool.query("UPDATE orders SET status = $1 WHERE id = $2", [
      status,
      id,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
