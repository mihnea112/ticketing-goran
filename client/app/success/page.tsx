"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode'; 

import dynamic from "next/dynamic";
import { TicketDocument } from "../../components/TicketPDF";

// Importăm PDFDownloadLink doar pe client
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <p className="text-yellow-500 text-sm">Se încarcă modulul PDF...</p> }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [status, setStatus] = useState("loading"); 
  const [orderDetails, setOrderDetails] = useState<any>(null);
  
  // Stocăm imaginile QR generate pentru a le pasa în PDF
  const [qrCodesForPDF, setQrCodesForPDF] = useState<Record<string, string>>({});
  
  const processedRef = useRef(false);

  useEffect(() => {
    if (!orderId || processedRef.current) return;
    processedRef.current = true;

    const confirmOrder = async () => {
      try {
        // 1. Confirmăm plata (Alocare numere bilete)
        const res = await fetch(`${API_URL}/api/orders/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        // Chiar dacă e deja confirmată, trecem mai departe să luăm detaliile
        if (!res.ok) {
            const errData = await res.json();
            if (errData.message !== "Comanda era deja confirmată") throw new Error("Eroare la confirmare");
        }

        // 2. Preluăm detaliile (inclusiv seriile generate: GA 105, etc)
        const detailsRes = await fetch(`${API_URL}/api/orders/${orderId}`);
        const detailsData = await detailsRes.json();
        
        // 3. Generăm imaginile QR pentru PDF (ca să nu le generăm on-the-fly la click)
        const qrMap: Record<string, string> = {};
        if (detailsData.items) {
            for (const item of detailsData.items) {
                const dataUrl = await QRCode.toDataURL(item.unique_qr_id, { width: 300, margin: 1 });
                qrMap[item.unique_qr_id] = dataUrl;
            }
        }
        
        setQrCodesForPDF(qrMap);
        setOrderDetails(detailsData);
        setStatus("success");

      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    };

    confirmOrder();
  }, [orderId]);

  if (!orderId) return <div className="text-white p-10">Eroare: Lipsă Order ID</div>;

  return (
    <div className="flex flex-col items-center w-full">
      {status === "loading" && (
        <div className="text-center mt-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold animate-pulse">Se finalizează comanda...</h1>
          <p className="text-yellow-500/60 mt-2">Se alocă locurile și se generează biletele.</p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center mt-20 p-8 border border-red-500/30 bg-red-900/10 rounded-2xl">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Ceva nu a mers bine</h1>
          <p>Nu am putut confirma automat comanda. Te rugăm să verifici emailul sau să contactezi suportul.</p>
          <p className="text-xs mt-4 text-gray-500">ID Comandă: {orderId}</p>
        </div>
      )}

      {status === "success" && orderDetails && (
        <div className="max-w-3xl w-full animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col items-center">
          
          {/* Header Succes */}
          <div className="size-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-10 text-black">
              <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-black text-yellow-500 mb-2 text-center">Comandă Confirmată!</h1>
          <p className="text-lg text-[#faeacc]/80 mb-10 text-center">
            Mulțumim, {orderDetails.customername}. Biletele tale sunt gata.
          </p>

          {/* LISTA BILETE VIZUALĂ */}
          <div className="w-full space-y-4 mb-10">
               {orderDetails.items?.map((item: any, idx: number) => (
                 <div key={idx} className="flex flex-col md:flex-row gap-6 bg-[#14120c] p-6 rounded-2xl border border-yellow-900/30 items-center relative overflow-hidden group hover:border-yellow-500/40 transition-colors">
                    
                    {/* QR Code */}
                    <div className="bg-white p-3 rounded-xl shrink-0 flex items-center justify-center">
                      <QRCodeCanvas value={item.unique_qr_id} size={120} />
                    </div>

                    {/* Detalii Text */}
                    <div className="flex-1 text-center md:text-left space-y-3">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Categorie</p>
                        <h3 className="text-2xl font-black text-white">{item.category_name}</h3>
                      </div>

                      {/* SERIE ȘI NUMĂR (HIGHLIGHT) */}
                      <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
                        <span className="text-[10px] text-yellow-500/60 uppercase tracking-widest block mb-0.5">Loc / Serie</span>
                        <span className="text-xl font-mono font-bold text-yellow-500 tracking-wider">
                           {item.ticket_display || "PENDING"}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-white/5">
                         <p className="text-[10px] text-zinc-600 font-mono">{item.unique_qr_id}</p>
                      </div>
                    </div>
                 </div>
               ))}
          </div>

          {/* Butoane Acțiune */}
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
            
            {/* Buton Download PDF */}
            <div className="flex-1">
                <PDFDownloadLink
                    document={<TicketDocument orderDetails={orderDetails} qrCodes={qrCodesForPDF} />}
                    fileName={`Bilete-Goran-${orderId?.slice(0, 8)}.pdf`}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-[#14120c] border border-yellow-500 text-yellow-500 font-bold rounded-xl hover:bg-yellow-500 hover:text-black transition-all group w-full text-center shadow-[0_0_20px_rgba(234,179,8,0.1)]"
                >
                    {({ loading }) => (
                        <>
                            {loading ? (
                                <span>Se generează PDF...</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">download</span>
                                    Descarcă Biletele (PDF)
                                </>
                            )}
                        </>
                    )}
                </PDFDownloadLink>
            </div>

            <Link href="/" className="flex-1 flex items-center justify-center px-8 py-4 bg-yellow-500 text-black font-bold rounded-xl hover:bg-[#faeacc] transition-colors text-center shadow-lg shadow-yellow-500/20">
                Înapoi la Site
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#0a0905] text-[#faeacc] pt-10 px-4 flex flex-col items-center pb-20">
      <Suspense fallback={
        <div className="text-center mt-20">
             <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto"></div>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  );
}