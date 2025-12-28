"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// --- UI CONFIGURATION (Date statice de design) ---
const UI_METADATA: Record<string, { desc: string; badge?: string; badgeColor?: string }> = {
  general: {
    desc: "Loc în picioare, acces bar",
    badge: "BEST VALUE",
  },
  tribune: {
    desc: "Loc pe scaun, vizibilitate bună",
    badge: "POPULAR",
  },
  gold: {
    desc: "Primele rânduri, acces lounge",
    badge: "EXCLUSIV",
  },
};

// Interfața datelor care vin din API
interface TicketData {
  id: string;
  code: string;
  name: string;
  price: number;
  totalQuantity: number;
  soldQuantity: number;
  // Proprietăți adăugate de noi în frontend
  desc?: string;
  badge?: string;
}

export default function BookingPage() {
  const router = useRouter();
  
  // --- STATE ---
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Stocăm cantitățile selectate: { "uuid-bilet": 2 }
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Datele clientului
  const [customer, setCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // --- 1. FETCH DATA (La încărcare) ---
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        // MODIFICARE: Folosim API_URL dinamic
        const res = await fetch(`${API_URL}/api/tickets`);
        
        if (!res.ok) throw new Error("Nu am putut încărca biletele");
        
        const data = await res.json();

        // Combinăm datele din DB cu metadata UI
        const processedTickets = data.map((t: any) => ({
          ...t,
          ...UI_METADATA[t.code], 
        }));

        setTickets(processedTickets);
        
        // Inițializăm cantitățile cu 0
        const initialQty: Record<string, number> = {};
        processedTickets.forEach((t: any) => (initialQty[t.id] = 0));
        setQuantities(initialQty);

      } catch (err) {
        console.error(err);
        setError("Eroare de conexiune la server.");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // --- HANDLERS ---
  const updateQty = (id: string, delta: number) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;

    const available = ticket.totalQuantity - ticket.soldQuantity;
    const currentQty = quantities[id] || 0;
    const newQty = Math.min(available, Math.max(0, currentQty + delta));

    setQuantities((prev) => ({ ...prev, [id]: newQty }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  // --- SUBMIT ORDER ---
  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    // 1. Validare simplă
    if (!customer.email || !customer.firstName || !customer.lastName) {
      setError("Te rugăm să completezi toate datele de contact.");
      setSubmitting(false);
      return;
    }

    // 2. Pregătire payload
    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([categoryId, quantity]) => ({
        categoryId,
        quantity,
      }));

    try {
      // MODIFICARE: Folosim API_URL dinamic
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || "Eroare la procesare");
      }

      // 3. Succes
      alert(`Comandă plasată cu succes! ID: ${result.orderId}`);
      
      // Reset
      setQuantities({}); 
      setCustomer({ firstName: "", lastName: "", email: "", phone: "" });
      
      // Reîncărcăm stocurile pentru a reflecta vânzarea
      window.location.reload(); 

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- CALCUL TOTAL ---
  const total = tickets.reduce((acc, ticket) => {
    return acc + ticket.price * (quantities[ticket.id] || 0);
  }, 0);

  const selectedItemsCount = Object.values(quantities).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0905] flex items-center justify-center text-yellow-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 bg-[#0a0905]">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-12 border-b border-yellow-900/20 pb-8">
          <span className="text-yellow-500 font-bold tracking-[0.2em] uppercase text-xs">
            Proces de cumpărare
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-[#faeacc] mt-2">
            Rezervă Locul Tău
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left Column: Tickets & Form */}
          <div className="flex-1 space-y-16">
            
            {/* 1. SELECTIE BILETE */}
            <div>
              <h2 className="text-2xl font-black mb-6 text-[#faeacc] flex items-center gap-3">
                <span className="size-8 rounded-full bg-yellow-500 text-black text-sm flex items-center justify-center">1</span>
                Alege Categoria
              </h2>

              <div className="grid sm:grid-cols-2 gap-6">
                {tickets.map((ticket) => {
                  const available = ticket.totalQuantity - ticket.soldQuantity;
                  const isSoldOut = available <= 0;
                  const isLowStock = available > 0 && available < 10;
                  const currentQty = quantities[ticket.id] || 0;
                  const isGold = ticket.code === 'gold';

                  return (
                    <div
                      key={ticket.id}
                      className={`
                        relative p-6 rounded-2xl border transition-all duration-300 flex flex-col gap-6 group
                        ${isSoldOut
                            ? "bg-white/5 border-white/5 opacity-50 grayscale"
                            : isGold 
                              ? "bg-yellow-900/10 border-yellow-500/50 hover:border-yellow-500"
                              : "bg-[#14120c] border-yellow-900/30 hover:border-yellow-500/50 hover:bg-yellow-900/10"
                        }
                        ${currentQty > 0 ? "border-yellow-500 ring-1 ring-yellow-500/50" : ""}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`text-xl font-bold ${isGold ? 'text-yellow-400' : 'text-[#faeacc]'}`}>
                            {ticket.name}
                          </h3>
                          <p className="text-yellow-100/40 text-xs mb-2">
                            {ticket.desc}
                          </p>
                          <p className="text-yellow-500 text-2xl font-black mt-1">
                            {ticket.price} <span className="text-xs text-yellow-600 font-normal">RON</span>
                          </p>

                          <p className={`text-xs font-bold mt-3 flex items-center gap-1 ${
                              isSoldOut ? "text-red-900" : isLowStock ? "text-red-400" : "text-green-500"
                            }`}>
                            {isSoldOut ? (
                              "STOC EPUIZAT"
                            ) : (
                              <>
                                <span className={`size-2 rounded-full ${isLowStock ? "bg-red-500 animate-pulse" : "bg-green-500"}`}></span>
                                {isLowStock ? `Doar ${available} locuri rămase!` : "Locuri disponibile"}
                              </>
                            )}
                          </p>
                        </div>
                        {ticket.badge && (
                          <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase px-2 py-1 rounded">
                            {ticket.badge}
                          </span>
                        )}
                      </div>

                      {/* Counter Control */}
                      <div className={`flex items-center justify-between p-1.5 bg-[#0a0905] rounded-xl border border-yellow-900/30 ${isSoldOut ? "pointer-events-none" : ""}`}>
                        <button
                          disabled={isSoldOut || currentQty <= 0}
                          onClick={() => updateQty(ticket.id, -1)}
                          className="size-10 rounded-lg hover:bg-yellow-900/30 flex items-center justify-center text-yellow-500 disabled:text-gray-700 transition-colors"
                        >
                          <span className="material-symbols-outlined">remove</span>
                        </button>
                        <span className="text-xl font-black text-[#faeacc] w-8 text-center">
                          {currentQty}
                        </span>
                        <button
                          disabled={isSoldOut || currentQty >= available}
                          onClick={() => updateQty(ticket.id, 1)}
                          className="size-10 rounded-lg bg-yellow-500 text-black flex items-center justify-center hover:bg-[#faeacc] transition-colors disabled:bg-gray-800 disabled:text-gray-600 shadow-lg shadow-yellow-500/20"
                        >
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. FORMULAR DATE */}
            <div>
              <h2 className="text-2xl font-black mb-6 text-[#faeacc] flex items-center gap-3">
                <span className="size-8 rounded-full bg-yellow-500 text-black text-sm flex items-center justify-center">2</span>
                Informații Cumpărător
              </h2>
              <div className="grid sm:grid-cols-2 gap-6 p-8 rounded-3xl border border-yellow-900/20 bg-[#14120c]">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider ml-1">Nume</label>
                  <input
                    name="firstName"
                    value={customer.firstName}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="Ex: Popescu"
                    className="w-full bg-[#0a0905] border border-yellow-900/30 text-[#faeacc] placeholder-yellow-900/30 rounded-xl px-4 py-4 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider ml-1">Prenume</label>
                  <input
                    name="lastName"
                    value={customer.lastName}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="Ex: Andrei"
                    className="w-full bg-[#0a0905] border border-yellow-900/30 text-[#faeacc] placeholder-yellow-900/30 rounded-xl px-4 py-4 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider ml-1">Email</label>
                  <input
                    name="email"
                    value={customer.email}
                    onChange={handleInputChange}
                    type="email"
                    placeholder="nume@exemplu.com"
                    className="w-full bg-[#0a0905] border border-yellow-900/30 text-[#faeacc] placeholder-yellow-900/30 rounded-xl px-4 py-4 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider ml-1">Telefon</label>
                  <input
                    name="phone"
                    value={customer.phone}
                    onChange={handleInputChange}
                    type="tel"
                    placeholder="+40 7xx xxx xxx"
                    className="w-full bg-[#0a0905] border border-yellow-900/30 text-[#faeacc] placeholder-yellow-900/30 rounded-xl px-4 py-4 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Summary */}
          <div className="w-full lg:w-[400px]">
            <div className="sticky top-32 bg-[#14120c] border border-yellow-900/30 rounded-3xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-900 via-yellow-500 to-yellow-900"></div>

              <h3 className="text-2xl font-black text-[#faeacc] border-b border-yellow-900/20 pb-6">
                Sumar Comandă
              </h3>

              <div className="space-y-6 min-h-[100px]">
                {selectedItemsCount > 0 ? (
                  tickets.map((ticket) => {
                     const qty = quantities[ticket.id];
                     if (!qty || qty === 0) return null;
                     
                     return (
                        <div key={ticket.id} className="flex justify-between items-start animate-in slide-in-from-left-4 fade-in duration-300">
                          <div>
                            <p className="font-bold text-[#faeacc]">{qty} x {ticket.name}</p>
                            <p className="text-xs text-yellow-600/70">Preț unitar: {ticket.price} RON</p>
                          </div>
                          <p className="font-bold text-yellow-500">{ticket.price * qty} RON</p>
                        </div>
                     )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-yellow-900/40">
                    <span className="material-symbols-outlined text-4xl mb-2">shopping_cart_off</span>
                    <p className="text-sm font-bold uppercase tracking-wide">Coșul este gol</p>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-dashed border-yellow-900/30">
                <div className="flex justify-between items-end">
                  <span className="text-yellow-600 font-bold uppercase tracking-wider text-xs mb-1">Total de plată</span>
                  <div className="text-right">
                    <span className="text-4xl font-black text-[#faeacc]">{total}</span>
                    <span className="text-lg font-bold text-yellow-500 ml-1">RON</span>
                  </div>
                </div>
              </div>

              {/* Mesaj Eroare */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm font-bold text-center">
                  {error}
                </div>
              )}

              <button
                disabled={total <= 0 || submitting}
                onClick={handleSubmit}
                className="w-full h-16 bg-yellow-500 text-black font-black text-lg uppercase tracking-wider rounded-xl hover:bg-[#faeacc] transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:bg-[#1a1810] disabled:text-yellow-900/30 disabled:shadow-none disabled:cursor-not-allowed group relative overflow-hidden"
              >
                {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></span>
                        Se procesează...
                    </span>
                ) : (
                    <>
                        <span className="relative z-10 group-disabled:hidden">Finalizează Comanda</span>
                        <span className="relative z-10 hidden group-disabled:block">Selectează bilete</span>
                    </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-yellow-900/60 text-[10px] font-bold uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm">lock</span>
                Plată securizată prin Netopia
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}