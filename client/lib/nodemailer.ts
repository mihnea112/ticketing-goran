// lib/nodemailer.ts
import nodemailer, { Transporter } from "nodemailer";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

function getSmtpConfig(): SmtpConfig {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_PASS || process.env.SMTP_PASS;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "465");
  const secure = (process.env.SMTP_SECURE ?? "true").toLowerCase() === "true";

  const fromEmail = process.env.SMTP_FROM_EMAIL || user || "";
  const fromName = process.env.SMTP_FROM_NAME || "Bilete Goran Bregović";

  if (!user) throw new Error("Missing SMTP_USER/GMAIL_USER env var");
  if (!pass) throw new Error("Missing SMTP_PASS/GMAIL_PASS env var");
  if (!fromEmail) throw new Error("Missing SMTP_FROM_EMAIL (or SMTP_USER/GMAIL_USER)");

  return { host, port, secure, user, pass, fromEmail, fromName };
}

// Cache transporter in development to prevent repeated connections on hot reload.
declare global {
  // eslint-disable-next-line no-var
  var __nodemailerTransporter: Transporter | undefined;
}

export function getTransporter(): Transporter {
  if (process.env.NODE_ENV !== "production" && global.__nodemailerTransporter) {
    return global.__nodemailerTransporter;
  }

  const cfg = getSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },

    // Serverless-friendly timeouts
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  if (process.env.NODE_ENV !== "production") {
    global.__nodemailerTransporter = transporter;
  }

  return transporter;
}

export function buildMailFrom() {
  const cfg = getSmtpConfig();
  return `"${cfg.fromName}" <${cfg.fromEmail}>`;
}

export function buildOrderConfirmedHtml(params: {
  customerName: string;
  ticketLink: string;
  orderShort: string;
}) {
  const { customerName, ticketLink, orderShort } = params;

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; padding: 24px; background: #0b0b0f;">
      <div style="max-width: 640px; margin: 0 auto; background: #12121a; border: 1px solid rgba(217,119,6,0.35); border-radius: 12px; overflow: hidden;">
        <div style="padding: 22px; border-bottom: 1px solid rgba(217,119,6,0.25); background: linear-gradient(180deg,#141421 0%,#0f0f16 100%);">
          <div style="font-size: 12px; letter-spacing: 0.12em; color: #d97706; text-transform: uppercase;">
            Confirmare comandă
          </div>
          <h2 style="margin: 10px 0 0 0; font-size: 22px; line-height: 1.25; color: #f4f4f5;">
            Felicitări, ${customerName}!
          </h2>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: rgba(244,244,245,0.75);">
            Comanda #${orderShort} a fost confirmată. Biletele au fost generate.
          </p>
        </div>

        <div style="padding: 22px; background: #12121a;">
          <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: rgba(244,244,245,0.9);">
            Poți vizualiza și descărca biletele online din linkul de mai jos.
          </p>

          <div style="text-align: center; margin: 18px 0 16px 0;">
            <a href="${ticketLink}" style="display:inline-block; background:#d97706; color:#ffffff; padding: 14px 20px; text-decoration:none; border-radius:10px; font-weight: 700;">
              VEZI BILETELE ONLINE
            </a>
          </div>

          <p style="margin: 0; font-size: 12px; line-height: 1.6; color: rgba(244,244,245,0.65);">
            Dacă butonul nu funcționează, copiază linkul în browser:
            <br/>
            <span style="word-break: break-all; color: rgba(244,244,245,0.9);">${ticketLink}</span>
          </p>
        </div>

        <div style="padding: 16px 22px; border-top: 1px solid rgba(217,119,6,0.25); background: #0f0f16;">
          <p style="margin: 0; font-size: 12px; color: rgba(244,244,245,0.55);">
            Acest email a fost trimis automat. Te rugăm să nu răspunzi.
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function sendOrderConfirmedEmail(params: {
  to: string;
  customerName: string;
  orderId: string;
  ticketLink: string;
}) {
  const transporter = getTransporter();
  const from = buildMailFrom();

  const orderShort = params.orderId.slice(0, 6);

  const info = await transporter.sendMail({
    from,
    to: params.to,
    subject: `Comanda Confirmată #${orderShort}`,
    html: buildOrderConfirmedHtml({
      customerName: params.customerName,
      ticketLink: params.ticketLink,
      orderShort,
    }),
    text: `Comanda #${orderShort} a fost confirmată.\nBilete: ${params.ticketLink}`,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}