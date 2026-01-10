// src/components/LanguageProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, type DictKey, type Lang, normalizeLang, t as tr } from "@/lib/i18n";

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

function readLangFromUrl(): Lang | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const q = url.searchParams.get("lang");
  return q === "ro" || q === "en" ? q : null;
}

function readLangFromLocalStorage(): Lang | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem("lang");
  return v === "ro" || v === "en" ? v : null;
}

function writeLangToUrl(next: Lang) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("lang", next);
  window.history.replaceState({}, "", url.toString());
}

function writeLangCookie(next: Lang) {
  if (typeof window === "undefined") return;
  document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
}

function writeLangLocalStorage(next: Lang) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("lang", next);
}

export function LanguageProvider({
  initialLang = DEFAULT_LANG,
  children,
}: {
  initialLang?: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(normalizeLang(initialLang));

  useEffect(() => {
    const resolved = readLangFromUrl() ?? readLangFromLocalStorage() ?? normalizeLang(initialLang);
    const normalized = normalizeLang(resolved);

    setLangState(normalized);
    writeLangToUrl(normalized);
    writeLangCookie(normalized);
    writeLangLocalStorage(normalized);
    document.documentElement.lang = normalized;
  }, [initialLang]);

  const setLang = (next: Lang) => {
    const normalized = normalizeLang(next);
    setLangState(normalized);

    writeLangToUrl(normalized);
    writeLangCookie(normalized);
    writeLangLocalStorage(normalized);
    document.documentElement.lang = normalized;
  };

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t: (key) => tr(lang, key),
    }),
    [lang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LanguageProvider />");
  return ctx;
}