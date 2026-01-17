// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import { cookies } from "next/headers";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import type { Lang } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  title: "Goran Bregović & Bijelo Dugme",
  description: "Concert aniversar 50 de ani. O seară istorică alături de legendara trupă rock.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Goran Bregović & Bijelo Dugme - Live",
    description: "Rezervă-ți locul la cel mai așteptat concert rock al anului.",
    type: "website",
  },
};

function normalizeLang(v?: string): Lang {
  return v === "en" ? "en" : "ro";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("lang")?.value;
  const initialLang = normalizeLang(cookieLang);

  return (
    <html lang={initialLang} className={`${inter.variable} ${playfair.variable} scroll-smooth`}>
      <head>
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '859893973482297');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=859893973482297&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>

      <body className="bg-[#0a0905] text-[#faeacc] min-h-screen flex flex-col antialiased selection:bg-yellow-600/30 selection:text-yellow-100 font-sans overflow-x-hidden">
        <LanguageProvider initialLang={initialLang}>
          <Navbar />
          <main className="flex-1 relative z-10 pt-24 flex flex-col">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}