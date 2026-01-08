import { NextResponse } from "next/server";
import { transporter, mailOptions } from "@/lib/nodemailer";

export async function GET() {
  try {
    await transporter.verify(); // Verifică conexiunea
    await transporter.sendMail({
      ...mailOptions,
      to: "sandracalancea@gmail.com", // Pune mailul tau aici
      subject: "Test Vercel",
      html: "<h1>Merge!</h1>"
    });
    return NextResponse.json({ status: "OK" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}