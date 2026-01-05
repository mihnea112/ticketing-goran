"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode'; 

import dynamic from "next/dynamic";
import { TicketDocument } from "./TicketPDF";

// Importăm PDFDownloadLink doar pe client
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <p>Se încarcă modulul PDF...</p> }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// 1. MUTĂM TOATĂ LOGICA ÎNTR-O COMPONENTĂ SEPARATĂ (SuccessContent)
function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [status, setStatus] = useState("loading"); 
  const [orderDetails, setOrderDetails] = useState<any>(null);
  
  const [qrCodesForPDF, setQrCodesForPDF] = useState<Record<string, string>>({});
  
  const processedRef = useRef(false);

  useEffect(() => {
    if (!orderId || processedRef.current) return;
    processedRef.current = true;

    const confirmOrder = async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        if (!res.ok) throw new Error("Eroare la confirmare");

        const detailsRes = await fetch(`${API_URL}/api/orders/${orderId}`);
        const detailsData = await detailsRes.json();
        
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
          <p className="text-yellow-500/60 mt-2">Vă rugăm nu închideți pagina.</p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center mt-20 p-8 border border-red-500/30 bg-red-900/10 rounded-2xl">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Ceva nu a mers bine</h1>
          <p>Nu am putut confirma automat comanda.</p>
          <p className="text-xs mt-4 text-gray-500">ID Comandă: {orderId}</p>
        </div>
      )}

      {status === "success" && orderDetails && (
        <div className="max-w-3xl w-full animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col items-center">
          
          <div className="size-20 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-10 text-black">
              <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-black text-yellow-500 mb-2 text-center">Plată Reușită!</h1>
          <p className="text-lg text-[#faeacc]/80 mb-10 text-center">Locurile tale au fost rezervate.</p>

          <div className="w-full bg-[#14120c] border border-yellow-900/30 rounded-3xl p-8 mb-10 relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-900 via-yellow-500 to-yellow-900"></div>
             
             <div className="space-y-6">
               {orderDetails.items?.map((item: any, idx: number) => (
                 <div key={idx} className="flex flex-col md:flex-row gap-6 bg-[#0a0905] p-6 rounded-2xl border border-yellow-900/20 items-center">
                    <div className="bg-white p-4 rounded-xl shrink-0 flex items-center justify-center">
                      <QRCodeCanvas value={item.unique_qr_id} size={150} />
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                      <h3 className="text-2xl font-bold text-white">{item.category_name}</h3>
                      <p className="font-mono text-yellow-500/80">{item.unique_qr_id}</p>
                    </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
            <div className="flex-1">
                <PDFDownloadLink
                    document={<TicketDocument orderDetails={orderDetails} qrCodes={qrCodesForPDF} />}
                    fileName={`Bilet-Goran-${orderId?.slice(0, 8)}.pdf`}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-[#14120c] border border-yellow-500 text-yellow-500 font-bold rounded-xl hover:bg-yellow-500 hover:text-black transition-all group w-full text-center"
                >
                    {({ loading }) => (
                        <>
                            {loading ? (
                                <span>Se generează...</span>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5 group-hover:scale-110 transition-transform">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                    Descarcă PDF
                                </>
                            )}
                        </>
                    )}
                </PDFDownloadLink>
            </div>

            <Link href="/" className="flex-1 flex items-center justify-center px-8 py-4 bg-yellow-500 text-black font-bold rounded-xl hover:bg-[#faeacc] transition-colors text-center">
                Înapoi la Site
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}

// 2. EXPORTĂM PAGINA PRINCIPALĂ CARE ÎNFĂȘOARĂ TOTUL ÎN SUSPENSE
export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#0a0905] text-[#faeacc] pt-10 px-4 flex flex-col items-center pb-20">
      <Suspense fallback={
        <div className="text-center mt-20">
             <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto"></div>
             <p className="mt-4 text-yellow-500">Se inițializează...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  );
}