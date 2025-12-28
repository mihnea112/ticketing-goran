// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css'; // Asigură-te că Tailwind e aici
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Goran Bregović - Live la Sala Palatului',
  description: 'Concert extraordinar Goran Bregović & Wedding and Funeral Band. Bilete disponibile acum.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <head>
        {/* Adaugă link-ul pentru Google Fonts / Material Symbols aici sau în globals.css */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="bg-[#1a1810] min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 relative z-10 pt-20"> {/* pt-20 pentru că Navbar e fixed */}
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}