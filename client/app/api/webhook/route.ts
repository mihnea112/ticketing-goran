import { NextResponse } from "next/server";
import Stripe from "stripe";
import pool from "@/lib/db";
import { sendOrderConfirmedEmail } from "@/lib/nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15" as any,
});

function normalize(url: string) {
  return url.replace(/\/+$/, "");
}

function getBaseUrl(req: Request) {
  // 1) Explicit override (recommended)
  if (process.env.APP_URL) return normalize(process.env.APP_URL);

  // 2) Derive from request headers (most reliable for webhooks)
  const xfHost = req.headers.get("x-forwarded-host");
  const host = req.headers.get("host");
  const xfProto = req.headers.get("x-forwarded-proto");
  const proto = xfProto || "https";

  const effectiveHost = xfHost || host;
  if (effectiveHost) return normalize(`${proto}://${effectiveHost}`);

  // 3) Vercel fallback
  if (process.env.VERCEL_URL) return normalize(`https://${process.env.VERCEL_URL}`);

  // 4) Last resort (never localhost in prod)
  return process.env.NODE_ENV === "production"
    ? "https://bilete-goran-bregovici.vercel.app"
    : "http://localhost:3000";
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature =
    req.headers.get("stripe-signature") || req.headers.get("Stripe-Signature");

  if (!signature) return new NextResponse("Missing stripe-signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
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

  // Safety: only when paid
  if (session.payment_status && session.payment_status !== "paid") {
    console.warn("checkout.session.completed but payment_status not paid:", session.id, session.payment_status);
    return new NextResponse(null, { status: 200 });
  }

  // Debug: this will immediately show you what domain Stripe is actually calling
  console.log("[webhook] env+host", {
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
    hasAppUrl: !!process.env.APP_URL,
    appUrl: process.env.APP_URL || null,
    vercelUrl: process.env.VERCEL_URL || null,
    host: req.headers.get("host"),
    xfHost: req.headers.get("x-forwarded-host"),
    xfProto: req.headers.get("x-forwarded-proto"),
  });

  const client = await pool.connect();
  try {
    const updateQuery = `
      UPDATE orders
      SET status = 'paid',
          payment_intent_id = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, status;
    `;

    const res = await client.query(updateQuery, [session.payment_intent, orderId]);

    if (res.rowCount === 0) {
      console.error("Order not found for update:", orderId);
      return new NextResponse("Order not found", { status: 404 });
    }

    const order = res.rows[0];

    const baseUrl = getBaseUrl(req);
    const ticketLink = `${baseUrl}/tickets/view/${encodeURIComponent(order.id)}`;

    console.log("[webhook] ticketLink", ticketLink);

    if (customerEmail) {
      await sendOrderConfirmedEmail({
        to: customerEmail,
        customerName,
        orderId: order.id,
        ticketLink,
      });
      console.log("📧 Email sent to:", customerEmail);
    }

    return new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error("DB processing error:", err);
    return new NextResponse("Server Error", { status: 500 });
  } finally {
    client.release();
  }
}