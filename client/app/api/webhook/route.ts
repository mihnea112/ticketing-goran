import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import pool from "@/lib/db";
import { sendOrderConfirmedEmail } from "@/lib/nodemailer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as any, // Folosește ultima versiune disponibilă
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  // 1. Verificăm dacă cererea vine chiar de la Stripe (Securitate)
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

  // 2. Ascultăm evenimentul de plată reușită
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Luăm ID-ul comenzii din Metadata (pe care l-am pus când am creat sesiunea de plată)
    const orderId = session.metadata?.orderId;
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name || "Client";

    if (!orderId) {
      console.error("Lipsă Order ID în metadata Stripe:", session.id);
      return new NextResponse("Order ID missing", { status: 400 });
    }

    console.log(`✅ Plată confirmată pentru comanda: ${orderId}`);

    try {
      const client = await pool.connect();

      // 3. Actualizăm Baza de Date: Status -> 'paid'
      // Salvăm și Payment Intent ID ca referință
      const updateQuery = `
        UPDATE orders 
        SET status = 'paid', 
            payment_intent_id = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *;
      `;

      const res = await client.query(updateQuery, [
        session.payment_intent,
        orderId,
      ]);
      client.release();

      if (res.rowCount === 0) {
        console.error("Comanda nu a fost găsită în DB pentru update:", orderId);
        return new NextResponse("Order not found", { status: 404 });
      }

      const order = res.rows[0];

      // 4. Trimitem Emailul cu Biletul
      // Folosim funcția automată pentru detectarea URL-ului corect
      const getBaseUrl = () => {
        if (process.env.NEXT_PUBLIC_BASE_URL)
          return process.env.NEXT_PUBLIC_BASE_URL;
        if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
        return "http://localhost:3000";
      };

      const baseUrl = getBaseUrl();
      const ticketLink = `${baseUrl}/tickets/view/${order.id}`;

      // Trimitem mail doar dacă avem cui
      if (customerEmail) {
        await sendOrderConfirmedEmail({
          to: customerEmail,
          customerName: customerName,
          orderId: order.id,
          ticketLink: ticketLink,
        });
        console.log("📧 Email bilet trimis către:", customerEmail);
      }
    } catch (err) {
      console.error("Eroare la procesarea comenzii în DB:", err);
      return new NextResponse("Server Error", { status: 500 });
    }
  }

  return new NextResponse(null, { status: 200 });
}
