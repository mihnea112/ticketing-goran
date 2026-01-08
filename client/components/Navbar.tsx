"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Check if current path is part of admin section
  const isAdmin = pathname?.startsWith("/admin");

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMenuOpen]);

  return (
    <header className="fixed top-0 w-full z-[70] bg-[#0a0905]/90 backdrop-blur-md border-b border-yellow-900/30 shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        {/* LOGO */}
        <Link
          href="/"
          className="flex items-center gap-3 group relative z-[80]"
        >
          <div className="size-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-black transition-all duration-300">
            <span className="material-symbols-outlined text-2xl font-bold">
              music_note
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#faeacc] text-lg sm:text-xl font-black tracking-wider uppercase leading-none group-hover:text-yellow-500 transition-colors">
              Bijelo Dugme & Goran Bregović
            </span>
            <span className="text-[10px] text-yellow-600/80 font-bold tracking-[0.2em] uppercase">
              Live in Concert
            </span>
          </div>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-10">
          {!isAdmin ? (
            // PUBLIC NAVIGATION
            <>
              <Link
                href="/"
                className="text-yellow-100/70 hover:text-yellow-500 font-bold text-xs uppercase tracking-[0.15em] transition-colors relative group"
              >
                Eveniment
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-yellow-500 transition-all group-hover:w-full"></span>
              </Link>
              <Link
                href="/booking"
                className="text-yellow-100/70 hover:text-yellow-500 font-bold text-xs uppercase tracking-[0.15em] transition-colors relative group"
              >
                Bilete
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-yellow-500 transition-all group-hover:w-full"></span>
              </Link>

              <Link
                href="/booking"
                className="bg-yellow-500 hover:bg-[#faeacc] text-black font-black text-xs uppercase px-8 py-3 rounded-lg transition-all shadow-[0_0_20px_-5px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_-5px_rgba(234,179,8,0.6)] hover:-translate-y-0.5"
              >
                Rezervă acum
              </Link>
            </>
          ) : (
            // ADMIN NAVIGATION (Visible only if URL is /admin...)
            <>
              <div className="text-[#faeacc] font-bold text-xs uppercase tracking-widest border border-yellow-500/20 px-4 py-2 rounded-lg bg-yellow-900/10 cursor-default">
                Mod Administrator
              </div>
              <Link
                href="/"
                className="text-yellow-600 hover:text-red-400 font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">
                  logout
                </span>
                Ieșire
              </Link>
            </>
          )}
        </nav>

        {/* MOBILE MENU BUTTON */}
        <button
          className="md:hidden text-[#faeacc] relative z-[80] p-2 flex items-center justify-center hover:text-yellow-500 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle Menu"
        >
          <span className="material-symbols-outlined text-4xl">
            {isMenuOpen ? "close" : "menu"}
          </span>
        </button>

        {/* MOBILE MENU OVERLAY */}
        {isMenuOpen && (
          <div className="fixed inset-0 bg-[#0a0905] z-[75] md:hidden flex flex-col pt-32 px-8 animate-in fade-in duration-300">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

            <nav className="flex flex-col gap-6 relative z-10">
              {!isAdmin ? (
                // MOBILE PUBLIC LINKS
                <>
                  <Link
                    href="/"
                    className="text-4xl font-black text-[#faeacc] hover:text-yellow-500 transition-colors flex items-center justify-between py-4 border-b border-yellow-900/30"
                  >
                    Eveniment
                    <span className="material-symbols-outlined text-yellow-600">
                      chevron_right
                    </span>
                  </Link>
                  <Link
                    href="/booking"
                    className="text-4xl font-black text-[#faeacc] hover:text-yellow-500 transition-colors flex items-center justify-between py-4 border-b border-yellow-900/30"
                  >
                    Bilete
                    <span className="material-symbols-outlined text-yellow-600">
                      chevron_right
                    </span>
                  </Link>
                  <Link
                    href="/booking"
                    className="mt-8 bg-yellow-500 text-black font-black text-2xl py-6 rounded-xl text-center shadow-xl shadow-yellow-500/20 active:scale-95 transition-transform"
                  >
                    Rezervă acum
                  </Link>
                </>
              ) : (
                // MOBILE ADMIN LINKS
                <>
                  <Link
                    href="/admin/dashboard"
                    className="text-4xl font-black text-[#faeacc] py-4 border-b border-yellow-900/30"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/"
                    className="text-2xl font-bold text-red-400 py-4 border-b border-yellow-900/30 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">logout</span>
                    Ieșire Admin
                  </Link>
                </>
              )}
            </nav>

            {/* SOCIAL FOOTER (Mobile) */}
            <div className="mt-auto pb-12 relative z-10">
              <p className="text-yellow-700 font-bold uppercase tracking-widest text-xs mb-6 text-center">
                Urmărește-ne
              </p>
              <div className="flex justify-center gap-6">
                {["facebook", "instagram", "youtube"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="size-14 rounded-full bg-yellow-900/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all duration-300"
                  >
                    <span className="material-symbols-outlined text-2xl">
                      {social === "facebook"
                        ? "groups"
                        : social === "instagram"
                        ? "photo_camera"
                        : "play_circle"}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
