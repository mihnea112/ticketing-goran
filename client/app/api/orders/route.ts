import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { mapCategory } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getClientUrl() {
  // 1) Your explicit domain (set this in Vercel Production)
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");

  // 2) Vercel automatic domain (no protocol)
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");

  // 3) Local fallback
  return "http://localhost:3000";
}

const CLIENT_URL = getClientUrl();

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { customer, items } = body;

    if (!items?.length) return NextResponse.json({ error: "Coș gol" }, { status: 400 });
    if (!customer?.email) return NextResponse.json({ error: "Lipsă email" }, { status: 400 });

    await client.query("BEGIN");

    let calculatedTotal = 0;
    const lineItemsForStripe: any[] = [];

    // Verificăm prețurile
    for (const item of items) {
      const ticketRes = await client.query("SELECT * FROM ticket_categories WHERE id = $1", [item.categoryId]);
      if (ticketRes.rows.length === 0) throw new Error(`Categorie invalidă: ${item.categoryId}`);

      const ticketData = mapCategory(ticketRes.rows[0]);
      calculatedTotal += ticketData.price * item.quantity;

      lineItemsForStripe.push({
        price_data: {
          currency: "ron",
          product_data: { name: ticketData.name, description: "Concert Goran Bregović" },
          unit_amount: Math.round(ticketData.price * 100),
        },
        quantity: item.quantity,
      });
    }

    // Creăm comanda (PENDING)
    const orderRes = await client.query(
      `INSERT INTO orders (customername, customeremail, totalamount, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [`${customer.firstName} ${customer.lastName}`, customer.email, calculatedTotal]
    );

    const orderId = orderRes.rows[0].id;

    // Salvăm itemele
    for (const item of items) {
      const tRes = await client.query("SELECT price FROM ticket_categories WHERE id = $1", [item.categoryId]);
      await client.query(
        `INSERT INTO order_items (orderid, ticketcategoryid, quantity, priceperunit)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.categoryId, item.quantity, tRes.rows[0].price]
      );
    }

    await client.query("COMMIT");

    // Debug: vezi exact ce URL folosește în production
    console.log("[orders] creating checkout session", {
      CLIENT_URL,
      APP_URL: process.env.APP_URL || null,
      VERCEL_URL: process.env.VERCEL_URL || null,
      VERCEL_ENV: process.env.VERCEL_ENV || null,
    });

    // Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItemsForStripe,
      mode: "payment",

      // IMPORTANT: route name is /succes in your app
      success_url: `${CLIENT_URL}/succes?orderId=${orderId}`,
      cancel_url: `${CLIENT_URL}/`,

      customer_email: customer.email,
      metadata: { orderId: String(orderId) },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error: any) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("Order Error:", error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  } finally {
    client.release();
  }
}