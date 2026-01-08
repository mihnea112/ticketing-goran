import { NextRequest, NextResponse } from 'next/server';

export const mapCategory = (row: any) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  price: Number(row.price),
  totalQuantity: Number(row.totalQuantity || row.totalquantity || 0),
  soldQuantity: Number(row.soldQuantity || row.soldquantity || 0),
  badge: row.badge,
  series: row.series_prefix,
});

// Middleware Logic pentru Admin
export function isAuthenticated(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token");
  return token === "admin-logged-in-securely";
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}