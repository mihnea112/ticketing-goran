"use client";

import React from "react";
import dynamic from "next/dynamic";
// 👇 AICI IMPORTĂM FIȘIERUL EXISTENT TicketPDF.tsx
import { TicketDocument } from "@/components/TicketPDF"; 

// Importăm PDFDownloadLink dinamic (pentru a nu crăpa la randare server-side)
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <span className="text-yellow-500 text-xs">Se încarcă modulul PDF...</span> }
);

interface TicketViewClientProps {
  orderData: any;      // Datele generale despre comandă
  tickets: any[];      // Lista de bilete
  qrCodesMap: Record<string, string>; // Imaginile QR generate
}

export default function TicketViewClient({ orderData, tickets, qrCodesMap }: TicketViewClientProps) {
  
  // ⚠️ PREGĂTIRE DATE PENTRU PDF EXISTENT
  // TicketDocument așteaptă un obiect care să conțină un array "items"
  const orderDetailsForPdf = {
    ...orderData,
    items: tickets // Punem lista de bilete în proprietatea 'items'
  };

  return (
    <div className="min-h-screen bg-[#0a0905] text-[#faeacc] py-10 px-4 font-sans flex flex-col items-center">
      <div className="max-w-3xl w-full">
        
        {/* HEADER VIZUAL */}
        <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-black text-yellow-500 uppercase tracking-widest mb-2">
                Goran Bregović
            </h1>
            <p className="text-xl text-yellow-500/80 font-bold uppercase mb-4">& Bijelo Dugme</p>
            
            <div className="inline-block border border-yellow-900/50 bg-[#14120c] px-6 py-3 rounded-xl">
                <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Locație & Dată</p>
                <p className="font-bold text-gray-200">Sala Constantin Jude, Timișoara</p>
                <p className="text-yellow-500 font-mono mt-1">14 Februarie 2026 • 20:00</p>
            </div>
        </div>

        {/* INFO CLIENT */}
        <div className="bg-[#14120c] border border-yellow-900/30 p-6 rounded-2xl mb-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left shadow-2xl shadow-yellow-900/10">
            <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Titular Comandă</p>
                <h2 className="text-xl font-bold text-white">{orderData.customername}</h2>
                <p className="text-xs text-gray-600 font-mono mt-1">ID: {orderData.id?.slice(0,8).toUpperCase()}</p>
            </div>
            <div className="mt-4 md:mt-0">
                <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${
                    orderData.status === 'paid' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-yellow-900/30 text-yellow-500'
                }`}>
                    {orderData.status === 'paid' ? 'CONFIRMATĂ' : orderData.status}
                </span>
            </div>
        </div>

        {/* LISTA VIZUALĂ A BILETELOR (PREVIEW PE ECRAN) */}
        <div className="space-y-6 mb-12">
            {tickets.map((t, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-6 bg-[#14120c] p-6 rounded-2xl border border-yellow-900/30 items-center relative overflow-hidden hover:border-yellow-500/40 transition-colors">
                    
                    {/* Elemente decorative laterale */}
                    <div className="absolute -left-3 top-1/2 w-6 h-6 bg-[#0a0905] rounded-full border-r border-yellow-900/30"></div>
                    <div className="absolute -right-3 top-1/2 w-6 h-6 bg-[#0a0905] rounded-full border-l border-yellow-900/30"></div>

                    {/* Imagine QR */}
                    <div className="bg-white p-2 rounded-xl shrink-0">
                        <img src={t.qrUrl} alt="QR" className="w-32 h-32 md:w-40 md:h-40" />
                    </div>

                    {/* Detalii Bilet */}
                    <div className="flex-1 text-center md:text-left space-y-3">
                        <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Categorie</p>
                            <h3 className="text-2xl font-black text-white">{t.category_name}</h3>
                        </div>

                        <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
                            <span className="text-[10px] text-yellow-500/60 uppercase tracking-widest block mb-0.5">Loc / Serie</span>
                            <span className="text-xl font-mono font-bold text-yellow-500 tracking-wider">
                                {t.ticket_display}
                            </span>
                        </div>
                        
                        <div className="pt-2 border-t border-white/5">
                            <p className="text-[10px] text-zinc-600 font-mono">Cod Unic: {t.unique_qr_code}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* ZONA DE DOWNLOAD (Folosește TicketDocument existent) */}
        <div className="text-center pb-10">
            <p className="text-sm text-gray-500 mb-4">
                Descarcă biletele în format PDF pentru a le prezenta la intrare.
            </p>
            
            <div className="flex justify-center">
                <PDFDownloadLink
                    document={
                        <TicketDocument 
                            orderDetails={orderDetailsForPdf} // Pasăm obiectul compus corect
                            qrCodes={qrCodesMap}              // Pasăm harta cu imaginile QR
                        />
                    }
                    fileName={`Bilete-Goran-${orderData.id?.slice(0, 6)}.pdf`}
                    className="flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-yellow-500/20"
                >
                    {({ loading }) => (
                        loading ? (
                            <span>Se generează PDF...</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-xl">download</span>
                                <span>Descarcă Biletele (PDF)</span>
                            </>
                        )
                    )}
                </PDFDownloadLink>
            </div>
        </div>
      </div>
    </div>
  );
}