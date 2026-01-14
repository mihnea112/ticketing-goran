import { NextResponse } from "next/server";
import Stripe from "stripe";
import pool from "@/lib/db";
import { sendOrderConfirmedEmail } from "@/lib/nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15" as any,
});

// IMPORTANT for Stripe: disable body parsing and read raw text
export async function POST(req: Request) {
  const body = await req.text();
  const sig =
    req.headers.get("stripe-signature") || req.headers.get("Stripe-Signature");

  if (!sig) return new NextResponse("Missing stripe-signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message || err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Always ACK quickly for event types you don't handle
  if (event.type !== "checkout.session.completed") {
    return new NextResponse(null, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  const orderId = session.metadata?.orderId;
  if (!orderId) return new NextResponse("Missing orderId", { status: 400 });

  if (session.payment_status && session.payment_status !== "paid") {
    // It's safe to ACK, Stripe may retry anyway
    return new NextResponse(null, { status: 200 });
  }

  const customerEmail = session.customer_details?.email || null;
  const customerName = session.customer_details?.name || "Client";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updateQuery = `
      UPDATE orders
      SET status = 'paid',
          payment_intent_id = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id;
    `;
    const updated = await client.query(updateQuery, [
      session.payment_intent,
      orderId,
    ]);

    if (updated.rowCount === 0) {
      await client.query("ROLLBACK");
      return new NextResponse("Order not found", { status: 404 });
    }

    await client.query("COMMIT");

    const baseUrl =
      (process.env.APP_URL || `https://${process.env.VERCEL_URL || ""}`)
        .replace(/\/+$/, "") || "https://bilete-goran-bregovici.vercel.app";

    const ticketLink = `${baseUrl}/tickets/view/${encodeURIComponent(orderId)}`;

    if (customerEmail) {
      await sendOrderConfirmedEmail({
        to: customerEmail,
        customerName,
        orderId: String(orderId),
        ticketLink,
      });
    }

    return new NextResponse(null, { status: 200 });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("Webhook DB error:", err);
    // IMPORTANT: return 500 so Stripe retries
    return new NextResponse("Server error", { status: 500 });
  } finally {
    client.release();
  }
}

// Optional: Stripe might GET your endpoint when you test manually.
// Return a non-redirect response.
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}