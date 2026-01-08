"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode'; // Folosit pentru generarea Base64 pt PDF

import dynamic from "next/dynamic";
import { TicketDocument } from "../../components/TicketPDF";

// Importăm PDFDownloadLink doar pe client pentru a evita erorile de SSR
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <p className="text-yellow-500 text-sm">Se pregătește PDF-ul...</p> }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  
  const [status, setStatus] = useState("loading"); 
  const [orderDetails, setOrderDetails] = useState<any>(null);
  
  // Stocăm imaginile QR (Base64) pentru PDF într-un obiect: { "QR-ID-UNIC": "data:image/png..." }
  const [qrCodesForPDF, setQrCodesForPDF] = useState<Record<string, string>>({});
  
  const processedRef = useRef(false);

  useEffect(() => {
    if (!orderId || processedRef.current) return;
    processedRef.current = true;

    const confirmAndFetch = async () => {
      try {
        // PAS 1: Confirmăm plata (Backend-ul va genera biletele în DB dacă nu există)
        const confirmRes = await fetch(`${API_URL}/api/orders/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        if (!confirmRes.ok) {
           // Ignorăm eroarea dacă e deja confirmată, altfel aruncăm excepție
           const data = await confirmRes.json();
           if (confirmRes.status !== 400 && data.message !== "Already paid") {
               throw new Error("Eroare la confirmarea comenzii.");
           }
        }

        // PAS 2: Preluăm detaliile. 
        // ⚠️ IMPORTANT: Acest endpoint trebuie să returneze lista de BILETE (tickets table), 
        // nu order_items, pentru a avea codurile unice.
        const detailsRes = await fetch(`${API_URL}/api/orders/${orderId}`);
        if (!detailsRes.ok) throw new Error("Nu s-au putut prelua detaliile.");
        
        const detailsData = await detailsRes.json();
        
        // Verificăm dacă avem bilete (fie în `tickets`, fie în `items` - depinde de API-ul tău GET)
        // Presupunem că `detailsData.items` este lista plată a biletelor generate
        const ticketsList = detailsData.tickets || detailsData.items || [];

        // PAS 3: Generăm imaginile QR pentru PDF în PARALEL (Mult mai rapid)
        const qrMap: Record<string, string> = {};
        
        if (ticketsList.length > 0) {
            // Folosim Promise.all pentru a nu aștepta după fiecare QR pe rând
            const qrPromises = ticketsList.map(async (item: any) => {
                if (!item.unique_qr_code && !item.unique_qr_id) return null;
                
                const codeToGen = item.unique_qr_code || item.unique_qr_id;
                
                try {
                    // Generăm Base64 string
                    const dataUrl = await QRCode.toDataURL(codeToGen, { 
                        width: 400, // Rezoluție bună pentru print
                        margin: 1,
                        errorCorrectionLevel: 'M'
                    });
                    return { id: codeToGen, dataUrl };
                } catch (err) {
                    console.error("Eroare generare QR pt PDF:", err);
                    return null;
                }
            });

            const results = await Promise.all(qrPromises);
            
            // Populăm mapa doar cu rezultatele valide
            results.forEach((res) => {
                if (res) qrMap[res.id] = res.dataUrl;
            });
        }
        
        // Salvăm datele
        setQrCodesForPDF(qrMap);
        setOrderDetails(detailsData);
        setStatus("success");

      } catch (err) {
        console.error("Critical Error:", err);
        setStatus("error");
      }
    };

    confirmAndFetch();
  }, [orderId]);

  if (!orderId) return <div className="text-white p-10 text-center">Lipsă ID Comandă</div>;

  return (
    <div className="flex flex-col items-center w-full">
      {status === "loading" && (
        <div className="text-center mt-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold animate-pulse text-yellow-500">Confirmăm comanda...</h1>
          <p className="text-yellow-500/60 mt-2">Se generează biletele unice.</p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center mt-20 p-8 border border-red-500/30 bg-red-900/10 rounded-2xl max-w-md">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Eroare Procesare</h1>
          <p className="text-gray-300">Nu am putut încărca biletele automat.</p>
          <p className="text-sm mt-4 text-gray-500">Verifică emailul pentru confirmare.</p>
        </div>
      )}

      {status === "success" && orderDetails && (
        <div className="max-w-3xl w-full animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col items-center">
          
          <div className="size-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
            <span className="material-symbols-outlined text-4xl text-black font-bold">check</span>
          </div>
          
          <h1 className="text-4xl font-black text-yellow-500 mb-2 text-center">Comandă Reușită!</h1>
          <p className="text-lg text-[#faeacc]/80 mb-10 text-center">
            Mulțumim, {orderDetails.customername || "Client"}.
          </p>

          {/* LISTA VIZUALĂ A BILETELOR (Folosește Canvas pentru afișare pe ecran) */}
          <div className="w-full space-y-4 mb-10">
               {/* Verificăm dacă array-ul se numește 'tickets' sau 'items' */}
               {(orderDetails.tickets || orderDetails.items || []).map((item: any, idx: number) => {
                 const qrValue = item.unique_qr_code || item.unique_qr_id;
                 return (
                   <div key={idx} className="flex flex-col md:flex-row gap-6 bg-[#14120c] p-6 rounded-2xl border border-yellow-900/30 items-center relative overflow-hidden group hover:border-yellow-500/40 transition-colors">
                      
                      {/* QR Code Vizual (Ecran) */}
                      <div className="bg-white p-3 rounded-xl shrink-0 flex items-center justify-center">
                        <QRCodeCanvas value={qrValue} size={120} />
                      </div>

                      <div className="flex-1 text-center md:text-left space-y-3">
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Bilet {idx + 1}</p>
                          <h3 className="text-2xl font-black text-white">{item.category_name || item.name}</h3>
                        </div>

                        <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
                          <span className="text-[10px] text-yellow-500/60 uppercase tracking-widest block mb-0.5">Loc / Serie</span>
                          <span className="text-xl font-mono font-bold text-yellow-500 tracking-wider">
                             {item.ticket_display || "GEN"}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-white/5">
                           <p className="text-[10px] text-zinc-600 font-mono">{qrValue}</p>
                        </div>
                      </div>
                   </div>
                 );
               })}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
            {/* Buton Download PDF - Folosește datele QR generate în useEffect */}
            <div className="flex-1">
                <PDFDownloadLink
                    document={
                        <TicketDocument 
                            // Trimitem lista corectă de bilete
                            orderDetails={{
                                ...orderDetails,
                                items: orderDetails.tickets || orderDetails.items 
                            }} 
                            // Trimitem imaginile QR pre-generate
                            qrCodes={qrCodesForPDF} 
                        />
                    }
                    fileName={`Bilete-Concert-${orderId.slice(0, 6)}.pdf`}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-[#14120c] border border-yellow-500 text-yellow-500 font-bold rounded-xl hover:bg-yellow-500 hover:text-black transition-all group w-full text-center shadow-[0_0_20px_rgba(234,179,8,0.1)]"
                >
                    {({ loading }) => (
                        loading ? "Generare PDF..." : "Descarcă PDF Bilete"
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
      <Suspense fallback={<div className="text-yellow-500 mt-10">Se încarcă...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}