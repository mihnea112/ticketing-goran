"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/components/LanguageProvider";
import { socialLinks } from "@/lib/socialLinks"; // create this file as shared links (same as earlier)

function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();

  return (
    <div
      className={[
        "flex items-center gap-1 bg-black/30 border border-yellow-500/20 rounded-full p-1 backdrop-blur-md",
        compact ? "scale-95 origin-right" : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setLang("ro")}
        className={[
          "rounded-full font-black tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/30 px-3 py-1.5 text-xs",
          lang === "ro" ? "bg-yellow-500 text-black" : "text-yellow-200/80 hover:text-yellow-200",
        ].join(" ")}
        aria-pressed={lang === "ro"}
      >
        RO
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={[
          "rounded-full font-black tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/30 px-3 py-1.5 text-xs",
          lang === "en" ? "bg-yellow-500 text-black" : "text-yellow-200/80 hover:text-yellow-200",
        ].join(" ")}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );
}

function SocialIcons({ size = 40 }: { size?: number }) {
  const box = size >= 52 ? "size-14" : "size-10";

  return (
    <div className="flex gap-3">
      {socialLinks.map((social) => (
        <a
          key={social.name}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.name}
          className={`${box} rounded-lg bg-yellow-900/10 border border-yellow-500/10 flex items-center justify-center text-yellow-600 hover:bg-yellow-500 hover:text-black hover:border-yellow-500 transition-all duration-300`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size >= 52 ? 22 : 20}
            height={size >= 52 ? 22 : 20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {social.path}
          </svg>
        </a>
      ))}
    </div>
  );
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const closeMenu = () => setIsMenuOpen(false);

  // Close on route change
  useEffect(() => {
    closeMenu();
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  return (
    <>
      {/* BACKDROP behind navbar + page (mobile only) */}
      <button
        type="button"
        onClick={closeMenu}
        aria-label="Close menu"
        className={[
          "fixed inset-0 md:hidden z-[60] bg-black/70 backdrop-blur-sm transition-opacity",
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      <header className="fixed top-0 inset-x-0 z-[70] bg-[#0a0905]/90 backdrop-blur-md border-b border-yellow-900/30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 sm:h-24 flex items-center justify-between">
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-3 group relative z-[80] min-w-0">
            <div className="size-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-black transition-all duration-300 shrink-0">
              <span className="material-symbols-outlined text-2xl font-bold">music_note</span>
            </div>

            <div className="flex flex-col min-w-0">
              {/* smaller on mobile to prevent off-screen */}
              <span className="text-[#faeacc] text-sm sm:text-xl font-black tracking-wider uppercase leading-none group-hover:text-yellow-500 transition-colors truncate">
                Bijelo Dugme &amp; Goran Bregović
              </span>
              <span className="text-[9px] sm:text-[10px] text-yellow-600/80 font-bold tracking-[0.2em] uppercase truncate">
                Live in Concert
              </span>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-8">
            {!isAdmin ? (
              <>
                <LangToggle />

                <Link
                  href="/"
                  className="text-yellow-100/70 hover:text-yellow-500 font-bold text-xs uppercase tracking-[0.15em] transition-colors relative group"
                >
                  Eveniment
                  <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-yellow-500 transition-all group-hover:w-full" />
                </Link>

                <Link
                  href="/booking"
                  className="text-yellow-100/70 hover:text-yellow-500 font-bold text-xs uppercase tracking-[0.15em] transition-colors relative group"
                >
                  Bilete
                  <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-yellow-500 transition-all group-hover:w-full" />
                </Link>

                <Link
                  href="/booking"
                  className="bg-yellow-500 hover:bg-[#faeacc] text-black font-black text-xs uppercase px-7 py-3 rounded-lg transition-all shadow-[0_0_20px_-5px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_-5px_rgba(234,179,8,0.6)] hover:-translate-y-0.5"
                >
                  Rezervă acum
                </Link>

                {/* Footer social links moved here */}
                <SocialIcons />
              </>
            ) : (
              <>
                <div className="text-[#faeacc] font-bold text-xs uppercase tracking-widest border border-yellow-500/20 px-4 py-2 rounded-lg bg-yellow-900/10 cursor-default">
                  Mod Administrator
                </div>
                <Link
                  href="/"
                  className="text-yellow-600 hover:text-red-400 font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Ieșire
                </Link>
              </>
            )}
          </nav>

          {/* MOBILE RIGHT */}
          <div className="md:hidden flex items-center gap-2 relative z-[80]">
            {!isAdmin && <LangToggle compact />}
            <button
              type="button"
              className="text-[#faeacc] p-2 rounded-lg hover:bg-white/5 hover:text-yellow-500 transition-colors"
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label="Toggle Menu"
              aria-expanded={isMenuOpen}
            >
              <span className="material-symbols-outlined text-4xl">{isMenuOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </div>

        {/* MOBILE MENU PANEL (full screen) */}
        <div
          className={[
            "fixed inset-0 md:hidden z-[65] transition-opacity",
            isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <div className="absolute inset-0 bg-[#0a0905]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />

          {/* content */}
          <div className="relative h-full pt-28 px-6 flex flex-col">
            <nav className="flex flex-col gap-6">
              {!isAdmin ? (
                <>
                  <Link
                    href="/"
                    onClick={closeMenu}
                    className="text-3xl font-black text-[#faeacc] hover:text-yellow-500 transition-colors flex items-center justify-between py-4 border-b border-yellow-900/30"
                  >
                    Eveniment
                    <span className="material-symbols-outlined text-yellow-600">chevron_right</span>
                  </Link>

                  <Link
                    href="/booking"
                    onClick={closeMenu}
                    className="text-3xl font-black text-[#faeacc] hover:text-yellow-500 transition-colors flex items-center justify-between py-4 border-b border-yellow-900/30"
                  >
                    Bilete
                    <span className="material-symbols-outlined text-yellow-600">chevron_right</span>
                  </Link>

                  <Link
                    href="/booking"
                    onClick={closeMenu}
                    className="mt-2 bg-yellow-500 text-black font-black text-xl py-5 rounded-xl text-center shadow-xl shadow-yellow-500/20 active:scale-95 transition-transform"
                  >
                    Rezervă acum
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/admin/dashboard"
                    onClick={closeMenu}
                    className="text-3xl font-black text-[#faeacc] py-4 border-b border-yellow-900/30"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/"
                    onClick={closeMenu}
                    className="text-xl font-bold text-red-400 py-4 border-b border-yellow-900/30 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">logout</span>
                    Ieșire Admin
                  </Link>
                </>
              )}
            </nav>

            {/* Social footer inside mobile menu */}
            {!isAdmin && (
              <div className="mt-auto pb-10">
                <p className="text-yellow-700 font-bold uppercase tracking-widest text-xs mb-6 text-center">
                  Urmărește-ne
                </p>
                <div className="flex justify-center">
                  <SocialIcons size={56} />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}