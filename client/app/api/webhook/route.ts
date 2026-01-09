import { NextResponse } from "next/server";
import Stripe from "stripe";
import pool from "@/lib/db";
import { sendOrderConfirmedEmail } from "@/lib/nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as any,
});

function getBaseUrl() {
  // 1) Preferred: your explicit production URL
  const appUrl = process.env.APP_URL;
  if (appUrl) return appUrl.replace(/\/+$/, "");

  // 2) Vercel deployment URL (works even without custom domain)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/+$/, "");

  // 3) Last resort: avoid localhost in prod
  if (process.env.NODE_ENV === "production") {
    return "https://bilete-goran-bregovici.vercel.app";
  }

  return "http://localhost:3000";
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") || req.headers.get("Stripe-Signature");

  if (!signature) {
    return new NextResponse("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new NextResponse(null, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  const orderId = session.metadata?.orderId;
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name || "Client";

  if (!orderId) {
    console.error("Missing orderId in metadata:", session.id);
    return new NextResponse("Order ID missing", { status: 400 });
  }

  // Optional safety: ensure it’s really paid
  if (session.payment_status && session.payment_status !== "paid") {
    console.warn("checkout.session.completed but payment_status not paid:", session.id, session.payment_status);
    return new NextResponse(null, { status: 200 });
  }

  console.log("✅ Payment confirmed:", { orderId, env: process.env.VERCEL_ENV, hasAppUrl: !!process.env.APP_URL, hasVercelUrl: !!process.env.VERCEL_URL });

  const client = await pool.connect();
  try {
    const updateQuery = `
      UPDATE orders
      SET status = 'paid',
          payment_intent_id = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;

    const res = await client.query(updateQuery, [session.payment_intent, orderId]);

    if (res.rowCount === 0) {
      console.error("Order not found for update:", orderId);
      return new NextResponse("Order not found", { status: 404 });
    }

    const order = res.rows[0];

    const baseUrl = getBaseUrl();
    const ticketLink = `${baseUrl}/tickets/view/${encodeURIComponent(order.id)}`;

    if (customerEmail) {
      await sendOrderConfirmedEmail({
        to: customerEmail,
        customerName,
        orderId: order.id,
        ticketLink,
      });
      console.log("📧 Email sent to:", customerEmail, "ticketLink:", ticketLink);
    }

    return new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error("DB processing error:", err);
    return new NextResponse("Server Error", { status: 500 });
  } finally {
    client.release();
  }
}