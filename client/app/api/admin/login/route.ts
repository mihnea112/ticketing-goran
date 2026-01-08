import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  // În producție, folosește variabile de mediu pentru parola reală
  if (password === "concert2025") {
    return NextResponse.json({ success: true, token: "admin-logged-in-securely" });
  } else {
    return NextResponse.json({ success: false, error: "Parolă incorectă" }, { status: 401 });
  }
}