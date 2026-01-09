"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import QRCode from "qrcode";

import dynamic from "next/dynamic";
import { TicketDocument } from "../../components/TicketPDF";

// Client-only PDFDownloadLink
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <p className="text-yellow-500 text-sm">Se pregătește PDF-ul...</p>,
  }
);

/**
 * Use same-origin by default (recommended on Vercel).
 * If NEXT_PUBLIC_API_URL is set (e.g. https://your-domain.com), we use it.
 */
const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")) || "";

type ConfirmResult = {
  success?: boolean;
  emailSent?: boolean;
  warning?: string;
  error?: string;
  mail?: any;
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [phase, setPhase] = useState<"confirm" | "fetch" | "qr">("confirm");

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [qrCodesForPDF, setQrCodesForPDF] = useState<Record<string, string>>({});
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  const processedRef = useRef(false);

  useEffect(() => {
    if (!orderId || processedRef.current) return;
    processedRef.current = true;

    const controller = new AbortController();

    const confirmOrder = async (): Promise<ConfirmResult> => {
      setPhase("confirm");

      const res = await fetch(`${API_BASE}/api/orders/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
        cache: "no-store",
        keepalive: true,
        signal: controller.signal,
      });

      // Always parse JSON if possible (useful for debugging)
      let data: ConfirmResult = {};
      try {
        data = await res.json();
      } catch {
        // ignore
      }

      if (!res.ok) {
        // If your backend uses idempotency and returns something like "Already paid",
        // you can adapt here; but since you want email before showing data,
        // we treat non-2xx as a hard error.
        throw new Error(data?.error || "Eroare la confirmarea comenzii.");
      }

      // If backend reports emailSent false, we warn (but confirmation succeeded).
      if (data?.emailSent === false) {
        setEmailWarning(data.warning || "Comanda a fost confirmată, dar emailul nu a putut fi trimis.");
      }

      return data;
    };

    const fetchDetails = async () => {
      setPhase("fetch");

      const detailsRes = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!detailsRes.ok) throw new Error("Nu s-au putut prelua detaliile comenzii.");

      return detailsRes.json();
    };

    const generateQrMapForPdf = async (ticketsList: any[]) => {
      setPhase("qr");

      const qrMap: Record<string, string> = {};
      if (!ticketsList?.length) return qrMap;

      const qrPromises = ticketsList.map(async (item: any) => {
        const codeToGen = item.unique_qr_code || item.unique_qr_id;
        if (!codeToGen) return null;

        try {
          const dataUrl = await QRCode.toDataURL(codeToGen, {
            width: 400,
            margin: 1,
            errorCorrectionLevel: "M",
          });
          return { id: codeToGen, dataUrl };
        } catch (err) {
          console.error("Eroare generare QR pt PDF:", err);
          return null;
        }
      });

      const results = await Promise.all(qrPromises);
      results.forEach((r) => {
        if (r) qrMap[r.id] = r.dataUrl;
      });

      return qrMap;
    };

    const run = async () => {
      try {
        // 1) MUST CONFIRM FIRST (this is where email is sent server-side)
        await confirmOrder();

        // 2) Only after confirm succeeded, fetch details
        const detailsData = await fetchDetails();

        // 3) Generate QR images for PDF (parallel)
        const ticketsList = detailsData.tickets || detailsData.items || [];
        const qrMap = await generateQrMapForPdf(ticketsList);

        setQrCodesForPDF(qrMap);
        setOrderDetails(detailsData);
        setStatus("success");
      } catch (err) {
        console.error("Critical Error:", err);
        setStatus("error");
      }
    };

    run();

    return () => controller.abort();
  }, [orderId]);

  if (!orderId) return <div className="text-white p-10 text-center">Lipsă ID Comandă</div>;

  const loadingTitle =
    phase === "confirm"
      ? "Confirmăm comanda..."
      : phase === "fetch"
      ? "Încărcăm biletele..."
      : "Pregătim QR-urile pentru PDF...";

  const loadingSubtitle =
    phase === "confirm"
      ? "Se finalizează confirmarea și se trimite emailul."
      : phase === "fetch"
      ? "Se preiau biletele generate din baza de date."
      : "Se generează imaginile QR pentru descărcarea PDF.";

  return (
    <div className="flex flex-col items-center w-full">
      {status === "loading" && (
        <div className="text-center mt-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold animate-pulse text-yellow-500">{loadingTitle}</h1>
          <p className="text-yellow-500/60 mt-2">{loadingSubtitle}</p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center mt-20 p-8 border border-red-500/30 bg-red-900/10 rounded-2xl max-w-md">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Eroare Procesare</h1>
          <p className="text-gray-300">Nu am putut confirma și încărca biletele automat.</p>
          <p className="text-sm mt-4 text-gray-500">
            Dacă plata a fost făcută, încearcă să reîncarci pagina sau verifică emailul.
          </p>
        </div>
      )}

      {status === "success" && orderDetails && (
        <div className="max-w-3xl w-full animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col items-center">
          <div className="size-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
            <span className="material-symbols-outlined text-4xl text-black font-bold">check</span>
          </div>

          <h1 className="text-4xl font-black text-yellow-500 mb-2 text-center">Comandă Reușită!</h1>
          <p className="text-lg text-[#faeacc]/80 mb-4 text-center">
            Mulțumim, {orderDetails.customername || "Client"}.
          </p>

          {emailWarning && (
            <div className="w-full mb-8 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 text-sm">
              {emailWarning}
            </div>
          )}

          {/* LISTA VIZUALĂ A BILETELOR */}
          <div className="w-full space-y-4 mb-10">
            {(orderDetails.tickets || orderDetails.items || []).map((item: any, idx: number) => {
              const qrValue = item.unique_qr_code || item.unique_qr_id;
              return (
                <div
                  key={idx}
                  className="flex flex-col md:flex-row gap-6 bg-[#14120c] p-6 rounded-2xl border border-yellow-900/30 items-center relative overflow-hidden group hover:border-yellow-500/40 transition-colors"
                >
                  <div className="bg-white p-3 rounded-xl shrink-0 flex items-center justify-center">
                    <QRCodeCanvas value={qrValue} size={120} />
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Bilet {idx + 1}</p>
                      <h3 className="text-2xl font-black text-white">{item.category_name || item.name}</h3>
                    </div>

                    <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
                      <span className="text-[10px] text-yellow-500/60 uppercase tracking-widest block mb-0.5">
                        Loc / Serie
                      </span>
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
            <div className="flex-1">
              <PDFDownloadLink
                document={
                  <TicketDocument
                    orderDetails={{
                      ...orderDetails,
                      items: orderDetails.tickets || orderDetails.items,
                    }}
                    qrCodes={qrCodesForPDF}
                  />
                }
                fileName={`Bilete-Concert-${orderId.slice(0, 6)}.pdf`}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-[#14120c] border border-yellow-500 text-yellow-500 font-bold rounded-xl hover:bg-yellow-500 hover:text-black transition-all group w-full text-center shadow-[0_0_20px_rgba(234,179,8,0.1)]"
              >
                {({ loading }) => (loading ? "Generare PDF..." : "Descarcă PDF Bilete")}
              </PDFDownloadLink>
            </div>

            <Link
              href="/"
              className="flex-1 flex items-center justify-center px-8 py-4 bg-yellow-500 text-black font-bold rounded-xl hover:bg-[#faeacc] transition-colors text-center shadow-lg shadow-yellow-500/20"
            >
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