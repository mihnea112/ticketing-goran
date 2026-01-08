import nodemailer from 'nodemailer';

const email = process.env.GMAIL_USER;
const pass = process.env.GMAIL_PASS;

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,              // Portul 465 cu secure: true este ideal pentru Vercel
  secure: true,
  auth: {
    user: email,
    pass: pass,           // Asigură-te că este App Password, nu parola de Google
  },
});

// ACEASTA ESTE PARTEA CARE ÎȚI LIPSEA
export const mailOptions = {
  from: email,
};