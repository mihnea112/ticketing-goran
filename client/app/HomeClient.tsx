// app/HomeClient.tsx
"use client";

import React from "react";
import Link from "next/link";
import type { TicketData } from "./page";

export default function HomeClient({ tickets }: { tickets: TicketData[] }) {
  return (
    <div className="flex flex-col w-full bg-[#0a0905] min-h-screen text-[#faeacc]">
      {/* --- HERO SECTION --- */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0905] via-[#0a0905]/70 to-black/40 z-10" />
          <div className="absolute inset-0 bg-yellow-900/20 z-0 mix-blend-overlay" />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1574169208507-84376144848b?auto=format&fit=crop&q=80&w=2079"
            alt="Concert Hero Background"
            className="w-full h-full object-cover scale-105 opacity-60"
          />
        </div>

        <div className="relative z-20 text-center px-4 max-w-6xl animate-in fade-in zoom-in duration-1000 mt-10">
          <span className="inline-block px-6 py-2 border border-yellow-500/50 rounded-full text-yellow-400 text-sm font-bold tracking-[0.3em] uppercase mb-6 backdrop-blur-md bg-black/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            Turneu Aniversar • Doživjeti Stotu
          </span>

          <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black mb-4 tracking-tighter leading-none">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_25px_rgba(234,179,8,0.4)]">
              BIJELO DUGME
            </span>
          </h1>

          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="h-[2px] w-12 bg-yellow-500/50"></span>
            <h2 className="text-2xl sm:text-4xl font-serif italic text-yellow-100/90 tracking-wide">
              GORAN BREGOVIĆ
            </h2>
            <span className="h-[2px] w-12 bg-yellow-500/50"></span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm sm:text-lg text-yellow-100/70 font-light max-w-5xl mx-auto mb-8 uppercase tracking-widest">
            <span>Alen Islamović</span>
            <span className="text-yellow-500 hidden sm:inline">•</span>
            <span>Mladen Vojičić Tifa</span>
            <span className="text-yellow-500 hidden sm:inline">•</span>
            <span>Zoran Redžić</span>
            <span className="text-yellow-500 hidden sm:inline">•</span>
            <span>Ogi Radivojević</span>
            <span className="text-yellow-500 hidden sm:inline">•</span>
            <span>Djidji Jankelić</span>
          </div>

          <p className="text-xs sm:text-sm text-yellow-200/60 font-light max-w-3xl mx-auto mb-10 tracking-widest">
            Organizator: ASOCIAȚIA CENTRUL CULTURAL SÂRBESC CONSTANTIN
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Link
              href="/booking"
              className="h-14 px-12 bg-yellow-600 hover:bg-yellow-500 text-black font-black text-lg rounded-full transition-all transform hover:-translate-y-1 shadow-[0_0_30px_rgba(234,179,8,0.3)] flex items-center justify-center gap-2"
            >
              CUMPĂRĂ BILETE
            </Link>
            <Link
              href="#info"
              className="h-14 px-12 border border-yellow-500/30 text-yellow-100 font-bold text-lg rounded-full hover:bg-yellow-500/10 hover:border-yellow-500 transition-all flex items-center justify-center"
            >
              DETALII EVENIMENT
            </Link>
          </div>
        </div>
      </section>

      {/* --- INFO BAR --- */}
      <section id="info" className="relative z-30 -mt-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 bg-[#12100b] border border-yellow-800/40 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 flex items-center gap-6 border-b md:border-b-0 md:border-r border-yellow-900/30 group hover:bg-yellow-900/5 transition-colors">
            <div className="size-16 bg-gradient-to-br from-yellow-900/20 to-yellow-600/10 rounded-2xl flex items-center justify-center text-yellow-500 border border-yellow-500/20 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">calendar_today</span>
            </div>
            <div>
              <p className="text-yellow-600/60 text-xs font-bold uppercase tracking-widest mb-1">Data Concertului</p>
              <p className="text-2xl font-black text-white">14 FEB 2026</p>
              <p className="text-yellow-500 font-bold">Ora 20:00</p>
            </div>
          </div>

          <div className="p-8 flex items-center gap-6 border-b md:border-b-0 md:border-r border-yellow-900/30 group hover:bg-yellow-900/5 transition-colors">
            <div className="size-16 bg-gradient-to-br from-yellow-900/20 to-yellow-600/10 rounded-2xl flex items-center justify-center text-yellow-500 border border-yellow-500/20 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">location_on</span>
            </div>
            <div>
              <p className="text-yellow-600/60 text-xs font-bold uppercase tracking-widest mb-1">Locație</p>
              <p className="text-2xl font-black text-white">TIMIȘOARA</p>
              <p className="text-yellow-500 font-bold">Sala Constantin Jude</p>
            </div>
          </div>

          <div className="p-8 flex items-center gap-6 group hover:bg-yellow-900/5 transition-colors">
            <div className="size-16 bg-gradient-to-br from-yellow-900/20 to-yellow-600/10 rounded-2xl flex items-center justify-center text-yellow-500 border border-yellow-500/20 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">star</span>
            </div>
            <div>
              <p className="text-yellow-600/60 text-xs font-bold uppercase tracking-widest mb-1">Eveniment</p>
              <p className="text-2xl font-black text-white">BIJELO DUGME</p>
              <p className="text-yellow-500 font-bold">50 Ani de Istorie</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTENT SECTION --- */}
      <section className="py-24 px-4 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-yellow-500 text-xs font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
            <span className="w-10 h-[1px] bg-yellow-500"></span>
            Reuniunea Legendelor
          </h2>
          <h3 className="text-4xl sm:text-5xl font-black mb-8 leading-tight text-white">
            O seară istorică la <br />
            <span className="text-yellow-500">Timișoara</span>
          </h3>
          <p className="text-yellow-100/70 text-lg mb-8 leading-relaxed text-justify">
            După decenii de istorie muzicală, <strong>Bijelo Dugme</strong> revine pe scenă într-o formulă de excepție, condusă de legendarul{" "}
            <strong>Goran Bregović</strong>. Alături de vocile inconfundabile ale lui <strong>Alen Islamović</strong> și{" "}
            <strong>Mladen Vojičić Tifa</strong>, plus măiestria lui <strong>Zoran Redžić</strong>, <strong>Ogi Radivojević</strong> și{" "}
            <strong>Djidji Jankelić</strong>, veți retrăi hiturile care au definit generații întregi.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-900/10 border-l-4 border-yellow-600 rounded-r-xl">
              <h4 className="font-bold text-white mb-1">Locație: Sala Constantin Jude</h4>
              <p className="text-sm text-yellow-200/60">Aleea F. C. Ripensia 7, Timișoara</p>
            </div>
            <div className="p-4 bg-yellow-900/10 border-l-4 border-yellow-600 rounded-r-xl">
              <h4 className="font-bold text-white mb-1">Acces Public</h4>
              <p className="text-sm text-yellow-200/60 mb-2">Accesul în sală se face începând cu ora 18:30.</p>
              <p className="text-sm text-red-400 font-bold border-t border-yellow-500/20 pt-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">warning</span>
                ATENȚIE: Ușile se închid la ora 20:30!
              </p>
            </div>
          </div>
        </div>

        <div className="relative rounded-3xl overflow-hidden shadow-2xl group border border-yellow-900/30 aspect-[4/3]">
          <div className="absolute inset-0 bg-yellow-600/20 z-10 mix-blend-overlay pointer-events-none"></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=2670&auto=format&fit=crop&q=80&w=2070"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale contrast-125"
            alt="Live Concert Atmosphere"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0905] via-transparent to-transparent z-20"></div>

          <div className="absolute bottom-6 left-6 z-30">
            <div className="bg-yellow-500 text-black font-bold text-xs px-3 py-1 rounded mb-2 inline-block">BILETE LIMITATE</div>
            <p className="text-white font-bold text-xl">Nu ratați evenimentul anului 2026!</p>
          </div>
        </div>
      </section>

      {/* --- TICKETS SECTION --- */}
      <section className="bg-[#0f0c05] py-24 px-4 border-t border-yellow-900/20 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-600/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-yellow-600 font-bold tracking-[0.3em] uppercase mb-4 text-xs">Bilete Disponibile</h2>
            <h3 className="text-4xl md:text-5xl font-black text-white">Alege Locul Tău</h3>
          </div>

          {tickets.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-yellow-200/70">
              Momentan nu putem încărca biletele.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {tickets.map((ticket) => {
                const remaining = Number(ticket.totalQuantity) - Number(ticket.soldQuantity);
                const isLowStock = remaining > 0 && remaining <= 50;
                const isSoldOut = remaining <= 0;

                // Keep compatibility: vip OR gold is "premium"
                const isGold = ticket.code === "vip" || ticket.code === "gold";

                return (
                  <div
                    key={ticket.id}
                    className={`p-8 rounded-3xl border transition-all hover:-translate-y-2 duration-300 flex flex-col relative overflow-hidden group ${
                      isGold
                        ? "border-yellow-500/50 bg-gradient-to-b from-yellow-900/20 to-[#1a150b] shadow-[0_0_40px_-10px_rgba(234,179,8,0.2)]"
                        : "border-white/10 bg-[#16130a] hover:border-yellow-500/30"
                    }`}
                  >
                    {ticket.badge && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-yellow-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-yellow-500/20">
                          {ticket.badge}
                        </span>
                      </div>
                    )}

                    <div className="mb-6 relative z-10">
                      <h4 className={`text-xl font-black uppercase tracking-tight mb-2 ${isGold ? "text-yellow-400" : "text-white"}`}>
                        {ticket.name}
                      </h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-white">{ticket.price}</span>
                        <span className="text-yellow-600 font-bold text-sm">RON</span>
                      </div>
                    </div>

                    <div className="mb-8 relative z-10">
                      <div className={`text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${isLowStock ? "text-red-500" : "text-green-500"}`}>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isSoldOut ? "bg-gray-500" : isLowStock ? "bg-red-500 animate-pulse" : "bg-green-500"
                          }`}
                        />
                        {isSoldOut ? "Sold Out" : isLowStock ? `Doar ${remaining} rămase!` : "Disponibil"}
                      </div>
                    </div>

                    <ul className="space-y-4 mb-10 flex-1 relative z-10 border-t border-white/5 pt-6">
                      {(ticket.features || []).map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                          <span className="material-symbols-outlined text-yellow-600 text-lg">check</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {!isSoldOut ? (
                      <Link
                        href="/booking"
                        className={`w-full py-4 rounded-xl font-bold text-center transition-all relative z-10 flex items-center justify-center gap-2 ${
                          isGold ? "bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/10" : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        Cumpără Bilet
                      </Link>
                    ) : (
                      <button disabled className="w-full py-4 rounded-xl font-bold bg-white/5 text-gray-500 cursor-not-allowed border border-white/5">
                        Indisponibil
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
}