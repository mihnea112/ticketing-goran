// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

// IMPORTANT: set APP_URL in Vercel Production: https://bilete-goran-bregovici.vercel.app
const siteUrl =
  (process.env.APP_URL && process.env.APP_URL.replace(/\/+$/, "")) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "https://bilete-goran-bregovici.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  // Stronger SEO title (includes "Bilete", city, date)
  title: {
    default: "Bilete Bijelo Dugme & Goran Bregović – Timișoara | 14 Feb 2026",
    template: "%s | Bilete Bijelo Dugme & Goran Bregović",
  },

  // Stronger description with intent keywords
  description:
    "Cumpără bilete la Bijelo Dugme & Goran Bregović în Timișoara, Sala Constantin Jude, 14 februarie 2026, ora 20:00. Bilete limitate.",

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: "/favicon.ico",
  },

  // Index the main site; you will set noindex on private routes separately.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  openGraph: {
    title: "Bilete Bijelo Dugme & Goran Bregović – Timișoara | 14 Feb 2026",
    description:
      "Concert live la Sala Constantin Jude (Timișoara) pe 14 februarie 2026, ora 20:00. Cumpără bilete online.",
    url: siteUrl,
    siteName: "Bilete Bijelo Dugme & Goran Bregović",
    locale: "ro_RO",
    type: "website",
    // IMPORTANT: add a real image at /public/og.jpg (1200x630)
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Bijelo Dugme & Goran Bregović – Bilete Timișoara 14 Feb 2026",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Bilete Bijelo Dugme & Goran Bregović – Timișoara | 14 Feb 2026",
    description:
      "Cumpără bilete la concertul Bijelo Dugme & Goran Bregović în Timișoara, Sala Constantin Jude, 14 februarie 2026.",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Event JSON-LD (high ROI). Adjust fields as needed.
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Bijelo Dugme & Goran Bregović – Live in Concert",
    startDate: "2026-02-14T20:00:00+02:00",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: "Sala Constantin Jude",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Aleea F. C. Ripensia 7",
        addressLocality: "Timișoara",
        addressCountry: "RO",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Asociația Centrul Cultural Sârbesc Constantin",
    },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/booking`,
      priceCurrency: "RON",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <html lang="ro" className={`${inter.variable} ${playfair.variable} scroll-smooth`}>
      <head>
        <meta name="google-site-verification" content="xClF3oHXt074V5tXTXiXWw7xk-yuX_TZ5HUodDSD6Eo" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>

      <body className="bg-[#0a0905] text-[#faeacc] min-h-screen flex flex-col antialiased selection:bg-yellow-600/30 selection:text-yellow-100 font-sans overflow-x-hidden">
        {/* Event Structured Data */}
        <Script
          id="event-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
        />

        <Navbar />

        <main className="flex-1 relative z-10 pt-24 flex flex-col">{children}</main>

        <Footer />
      </body>
    </html>
  );
}