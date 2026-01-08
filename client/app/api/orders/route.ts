import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { mapCategory } from "@/lib/utils";

const CLIENT_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { customer, items } = body;

    if (!items?.length) return NextResponse.json({ error: "Coș gol" }, { status: 400 });
    if (!customer?.email) return NextResponse.json({ error: "Lipsă email" }, { status: 400 });

    await client.query("BEGIN");

    let calculatedTotal = 0;
    const lineItemsForStripe = [];

    // Verificăm prețurile și stocul
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

    // Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItemsForStripe,
      mode: "payment",
      success_url: `${CLIENT_URL}/success?orderId=${orderId}`,
      cancel_url: `${CLIENT_URL}/`,
      customer_email: customer.email,
      metadata: { orderId: orderId },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Order Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}