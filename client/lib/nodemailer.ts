import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // Parola de aplicație (App Password)
  },
});

export const mailOptions = {
  from: `"Goran Bregović Tickets" <${process.env.GMAIL_USER}>`,
};