"use client"; // Important pentru Next.js App Router când folosim hooks (useState, useEffect)

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

// --- CONFIGURARE URL API ---
// Pe Vercel va lua valoarea setată în Environment Variables.
// Local va folosi http://localhost:4000
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// --- 1. CONFIGURARE UI (Date statice) ---
// Mapăm codurile din DB ('gold', 'tribune', 'general') la listele de beneficii
const UI_FEATURES: Record<string, string[]> = {
  gold: ['Primele rânduri', 'Acces VIP Lounge', 'Fast-track Entry'],
  tribune: ['Loc pe scaun', 'Vedere centrală', 'Acces separat'],
  general: ['Loc în picioare', 'Acces la bar', 'Zonă generală']
};

// Mapăm codurile pentru etichete (badge-uri) care nu sunt neapărat în DB
const UI_BADGES: Record<string, string> = {
  gold: 'PREMIUM',
  tribune: 'BEST SELLER',
  general: ''
};

interface TicketData {
  id: string;
  code: string;
  name: string;
  price: number;
  totalQuantity: number;
  soldQuantity: number;
  badge?: string;
  features: string[]; 
}

export default function HomePage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);

  // --- 2. FETCH DATA FROM BACKEND ---
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        // MODIFICARE: Folosim API_URL dinamic pentru Deploy
        const res = await fetch(`${API_URL}/api/tickets`);
        
        if (!res.ok) {
           console.error("API response not ok");
           return;
        }

        const data = await res.json();

        // Combinăm datele din DB cu beneficiile statice
        const processedTickets = data.map((t: any) => ({
          ...t,
          features: UI_FEATURES[t.code] || [],
          badge: UI_BADGES[t.code] || (t.totalQuantity - t.soldQuantity < 20 ? 'LAST SEATS' : '') 
        }));

        setTickets(processedTickets);
      } catch (error) {
        console.error("Eroare la încărcarea biletelor:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  return (
    <div className="flex flex-col w-full bg-[#0a0905] min-h-screen">
      
      {/* --- HERO SECTION --- */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0905] via-[#0a0905]/60 to-transparent z-10" />
          <div className="absolute inset-0 bg-[#1a1200]/30 z-0 mix-blend-overlay" />
          
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1974" 
            alt="Concert Hero" 
            className="w-full h-full object-cover scale-110 grayscale brightness-75 sepia-[0.3]"
          />
        </div>

        <div className="relative z-20 text-center px-4 max-w-5xl animate-in fade-in zoom-in duration-1000">
          <span className="inline-block px-4 py-1 border border-yellow-500/50 rounded-full text-yellow-400 text-xs font-bold tracking-widest uppercase mb-8 backdrop-blur-md bg-black/30">
            Concert Extraordinar
          </span>
          <h1 className="text-6xl sm:text-8xl font-black mb-6 tracking-tighter text-[#faeacc]">
            GORAN <span className="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">BREGOVIĆ</span>
          </h1>
          <p className="text-xl sm:text-2xl text-yellow-100/80 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
            Muzică balcanică, energie pură și o atmosferă electrizantă. 
            O seară de neuitat la Sala Palatului.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/booking"
              className="h-16 px-10 bg-yellow-500 text-black font-black text-lg rounded-xl hover:bg-[#faeacc] transition-all transform hover:-translate-y-1 shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined">confirmation_number</span>
              Cumpără Bilete
            </Link>
            <Link 
              href="#detalii"
              className="h-16 px-10 border border-yellow-500/30 text-yellow-100/90 font-bold text-lg rounded-xl hover:bg-yellow-500/10 hover:border-yellow-500 transition-all flex items-center justify-center"
            >
              Mai multe detalii
            </Link>
          </div>
        </div>
      </section>

      {/* --- INFO BAR --- */}
      <section id="detalii" className="relative z-30 -mt-10 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 bg-[#14120c] border border-yellow-900/30 rounded-2xl shadow-2xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-yellow-900/30">
          <div className="p-8 flex items-center gap-5 group hover:bg-yellow-900/5 transition-colors">
            <div className="size-14 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">calendar_month</span>
            </div>
            <div>
              <p className="text-yellow-600/60 text-xs font-bold uppercase tracking-wider mb-1">Data</p>
              <p className="text-xl font-bold text-[#faeacc]">24 Septembrie 2024</p>
              <p className="text-yellow-500 text-sm">Ora 19:30</p>
            </div>
          </div>
          <div className="p-8 flex items-center gap-5 group hover:bg-yellow-900/5 transition-colors">
            <div className="size-14 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">location_on</span>
            </div>
            <div>
              <p className="text-yellow-600/60 text-xs font-bold uppercase tracking-wider mb-1">Locație</p>
              <p className="text-xl font-bold text-[#faeacc]">Sala Palatului</p>
              <p className="text-yellow-500 text-sm">București</p>
            </div>
          </div>
          <div className="p-8 flex items-center gap-5 group hover:bg-yellow-900/5 transition-colors">
            <div className="size-14 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">verified_user</span>
            </div>
            <div>
              <p className="text-yellow-600/60 text-xs font-bold uppercase tracking-wider mb-1">Organizator</p>
              <p className="text-xl font-bold text-[#faeacc]">BestEvents Ro</p>
              <p className="text-yellow-500 text-sm">Experiență Premium</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTENT SECTION --- */}
      <section className="py-32 px-4 max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
        <div>
          <h2 className="text-yellow-500 text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-8 h-[1px] bg-yellow-500"></span>
            Detalii Organizatorice
          </h2>
          <h3 className="text-4xl sm:text-5xl font-black mb-8 leading-tight text-[#faeacc]">
            Tot ce trebuie să știi pentru spectacol
          </h3>
          <p className="text-yellow-100/60 text-lg mb-10 leading-relaxed">
            Pregătim o seară magică unde fiecare detaliu contează. Asigură-te că ajungi la timp pentru a te bucura de întreaga experiență.
          </p>
          <div className="space-y-6">
            <div className="flex gap-5 p-5 bg-yellow-900/5 border border-yellow-500/10 rounded-2xl group hover:border-yellow-500/50 hover:bg-yellow-900/10 transition-all duration-300">
              <span className="material-symbols-outlined text-yellow-500 text-3xl group-hover:scale-110 transition-transform">door_open</span>
              <div>
                <h4 className="font-bold text-lg mb-1 text-[#faeacc]">Acces în sală</h4>
                <p className="text-yellow-100/50 text-sm">Accesul publicului începe la 18:30. Vă rugăm să sosiți devreme.</p>
              </div>
            </div>
            <div className="flex gap-5 p-5 bg-yellow-900/5 border border-yellow-500/10 rounded-2xl group hover:border-yellow-500/50 hover:bg-yellow-900/10 transition-all duration-300">
              <span className="material-symbols-outlined text-yellow-500 text-3xl group-hover:scale-110 transition-transform">timelapse</span>
              <div>
                <h4 className="font-bold text-lg mb-1 text-[#faeacc]">Durată Show</h4>
                <p className="text-yellow-100/50 text-sm">Aproximativ 2.5 ore de spectacol incendiar fără pauză.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative rounded-3xl overflow-hidden shadow-2xl group border border-yellow-900/30">
          <div className="absolute inset-0 bg-yellow-500/10 z-10 mix-blend-overlay pointer-events-none"></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&q=80&w=2070" 
            className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105 sepia-[0.2]"
            alt="Venue"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
          <div className="absolute bottom-8 left-8 z-20">
            <p className="text-yellow-500 font-bold mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">map</span> Sala Palatului
            </p>
            <h4 className="text-2xl font-bold text-[#faeacc]">Strada Ion Câmpineanu 28</h4>
          </div>
        </div>
      </section>

      {/* --- TICKETS SECTION (INTEGRAT CU DB) --- */}
      <section className="bg-[#0f0c05] py-32 px-4 border-t border-yellow-900/20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-yellow-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-yellow-600 font-bold tracking-[0.2em] uppercase mb-4 text-sm">Rezervă-ți locul</h2>
            <h3 className="text-5xl font-black text-[#faeacc]">Categorii de Bilete</h3>
          </div>

          {/* Stare de Încărcare */}
          {loading ? (
            <div className="flex justify-center items-center h-64 text-yellow-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {tickets.map((ticket) => {
                // Calcule dinamice bazate pe datele din DB
                const remaining = ticket.totalQuantity - ticket.soldQuantity;
                const isLowStock = remaining > 0 && remaining <= 50;
                const isSoldOut = remaining <= 0;
                const isGold = ticket.code === 'gold';

                return (
                  <div 
                    key={ticket.id}
                    className={`p-10 rounded-3xl border-2 transition-all hover:scale-[1.02] flex flex-col relative overflow-hidden ${
                      isGold
                      ? 'border-yellow-500 bg-yellow-900/10 shadow-[0_0_30px_-5px_rgba(234,179,8,0.15)]' 
                      : 'border-yellow-900/20 bg-[#16130a] hover:border-yellow-700/50'
                    }`}
                  >
                    {/* Background pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <h4 className={`text-2xl font-black uppercase tracking-tight ${isGold ? 'text-yellow-400' : 'text-[#faeacc]'}`}>
                        {ticket.name}
                      </h4>
                      {ticket.badge && (
                        <span className="bg-yellow-500 text-black text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg shadow-yellow-500/20">
                          {ticket.badge}
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-6 flex items-baseline gap-2 relative z-10">
                      <span className="text-5xl font-black text-yellow-500">{ticket.price}</span>
                      <span className="text-yellow-700 font-bold">RON</span>
                    </div>
                    
                    <div className="mb-10 relative z-10">
                      <div className={`text-sm font-bold flex items-center gap-2 ${isLowStock ? 'text-red-400' : 'text-yellow-600/70'}`}>
                        <span className="material-symbols-outlined text-lg">
                          {isSoldOut ? 'block' : 'event_seat'}
                        </span>
                        {isSoldOut ? (
                          <>Stoc epuizat</>
                        ) : (
                          <>{remaining} bilete rămase</>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-4 mb-12 flex-1 relative z-10">
                      {ticket.features && ticket.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-yellow-100/70 text-sm">
                          <span className="material-symbols-outlined text-yellow-500 text-lg">
                            {isGold ? 'diamond' : 'check_circle'}
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {!isSoldOut ? (
                      <Link 
                        href="/booking"
                        className={`block text-center w-full py-4 rounded-xl font-bold transition-all relative z-10 ${
                          isGold 
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:to-white shadow-lg shadow-yellow-500/20' 
                            : 'border border-yellow-600/50 text-yellow-500 hover:bg-yellow-500 hover:text-black'
                        }`}
                      >
                        Cumpără Acum
                      </Link>
                    ) : (
                      <button 
                        disabled
                        className="w-full py-4 rounded-xl font-bold bg-gray-900/50 border border-gray-800 text-gray-600 cursor-not-allowed relative z-10"
                      >
                        Sold Out
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};