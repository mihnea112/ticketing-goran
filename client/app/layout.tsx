// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// 1. Configurare Fonturi
const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap' 
});

const playfair = Playfair_Display({ 
  subsets: ['latin'], 
  variable: '--font-playfair',
  display: 'swap' 
});

export const metadata: Metadata = {
  // Titlul actualizat pentru Bijelo Dugme
  title: 'Goran Bregović & Bijelo Dugme',
  description: 'Concert aniversar 50 de ani. O seară istorică alături de legendara trupă rock.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Goran Bregović & Bijelo Dugme - Live',
    description: 'Rezervă-ți locul la cel mai așteptat concert rock al anului.',
    type: 'website',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro" className={`${inter.variable} ${playfair.variable} scroll-smooth`}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      
      {/* Theme: Dark & Gold (specific Goran/Bijelo Dugme)
        bg-[#0a0905]: Negru profund
        text-[#faeacc]: Auriu pal/Crem
      */}
      <body className="bg-[#0a0905] text-[#faeacc] min-h-screen flex flex-col antialiased selection:bg-yellow-600/30 selection:text-yellow-100 font-sans overflow-x-hidden">
        
        <Navbar />
        
        <main className="flex-1 relative z-10 pt-24 flex flex-col">
          {children}
        </main>
        
        <Footer />
        
      </body>
    </html>
  );
}