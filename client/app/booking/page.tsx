"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LanguageProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface TicketData {
  id: string;
  code: string;
  name: string;
  price: number;
  totalQuantity: number;
  soldQuantity: number;
  desc?: string;
  badge?: string;
}

export default function BookingPage() {
  const router = useRouter();
  const { lang, t } = useLang();

  // Translated UI metadata (desc + badge) driven by i18n keys
  const UI_METADATA = useMemo<Record<string, { desc: string; badge?: string }>>(
    () => ({
      general: {
        desc: t("ticket_desc_general"),
        badge: t("ticket_badge_best_value"),
      },
      tribune: {
        desc: t("ticket_desc_tribune"),
        badge: t("ticket_badge_popular"),
      },
      gold: {
        desc: t("ticket_desc_gold"),
        badge: t("ticket_badge_exclusive"),
      },
    }),
    [lang, t]
  );

  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch(`${API_URL}/api/tickets`);
        if (!res.ok) throw new Error(t("booking_err_load_tickets"));

        const data = await res.json();

        const processedTickets: TicketData[] = data.map((x: any) => ({
          ...x,
          id: String(x.id),
          ...(UI_METADATA[x.code] || {}),
        }));

        setTickets(processedTickets);

        const initialQty: Record<string, number> = {};
        processedTickets.forEach((tt) => (initialQty[tt.id] = 0));
        setQuantities(initialQty);
      } catch (err) {
        console.error(err);
        setError(t("booking_err_server"));
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]); // refetch so desc/badges update when lang changes

  const updateQty = (id: string, delta: number) => {
    const ticket = tickets.find((x) => x.id === id);
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

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    if (!customer.email || !customer.firstName || !customer.lastName) {
      setError(t("booking_err_contact"));
      setSubmitting(false);
      return;
    }

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([categoryId, quantity]) => ({ categoryId, quantity }));

    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Order error");
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("Missing payment URL");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || t("booking_err_server"));
      setSubmitting(false);
    }
  };

  const total = tickets.reduce((acc, ticket) => acc + ticket.price * (quantities[ticket.id] || 0), 0);
  const selectedItemsCount = Object.values(quantities).reduce((a, b) => a + b, 0);

  const lowStockLabel = (available: number) =>
    `${t("booking_stock_only_prefix")} ${available} ${t("booking_stock_only_suffix")}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0905] flex items-center justify-center text-yellow-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 bg-[#0a0905]">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-12 border-b border-yellow-900/20 pb-8">
          <span className="text-yellow-500 font-bold tracking-[0.2em] uppercase text-xs">{t("booking_kicker")}</span>
          <h1 className="text-4xl md:text-5xl font-black text-[#faeacc] mt-2">{t("booking_title")}</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left Column */}
          <div className="flex-1 space-y-16">
            {/* 1. Tickets */}
            <div>
              <h2 className="text-2xl font-black mb-6 text-[#faeacc] flex items-center gap-3">
                <span className="size-8 rounded-full bg-yellow-500 text-black text-sm flex items-center justify-center">
                  1
                </span>
                {t("booking_step_1")}
              </h2>

              <div className="grid sm:grid-cols-2 gap-6">
                {tickets.map((ticket) => {
                  const available = ticket.totalQuantity - ticket.soldQuantity;
                  const isSoldOut = available <= 0;
                  const isLowStock = available > 0 && available < 10;
                  const currentQty = quantities[ticket.id] || 0;
                  const isGold = ticket.code === "gold";

                  return (
                    <div
                      key={ticket.id}
                      className={`
                        relative p-6 rounded-2xl border transition-all duration-300 flex flex-col gap-6 group
                        ${
                          isSoldOut
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
                          <h3 className={`text-xl font-bold ${isGold ? "text-yellow-400" : "text-[#faeacc]"}`}>
                            {ticket.name}
                          </h3>
                          <p className="text-yellow-100/40 text-xs mb-2">{ticket.desc}</p>

                          <p className="text-yellow-500 text-2xl font-black mt-1">
                            {ticket.price}{" "}
                            <span className="text-xs text-yellow-600 font-normal">RON</span>
                          </p>

                          <p
                            className={`text-xs font-bold mt-3 flex items-center gap-1 ${
                              isSoldOut ? "text-red-900" : isLowStock ? "text-red-400" : "text-green-500"
                            }`}
                          >
                            {isSoldOut ? (
                              t("booking_stock_sold_out")
                            ) : (
                              <>
                                <span
                                  className={`size-2 rounded-full ${
                                    isLowStock ? "bg-red-500 animate-pulse" : "bg-green-500"
                                  }`}
                                />
                                {isLowStock ? lowStockLabel(available) : t("booking_stock_available")}
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

                      {/* Counter */}
                      <div
                        className={`flex items-center justify-between p-1.5 bg-[#0a0905] rounded-xl border border-yellow-900/30 ${
                          isSoldOut ? "pointer-events-none" : ""
                        }`}
                      >
                        <button
                          disabled={isSoldOut || currentQty <= 0}
                          onClick={() => updateQty(ticket.id, -1)}
                          className="size-10 rounded-lg hover:bg-yellow-900/30 flex items-center justify-center text-yellow-500 disabled:text-gray-700 transition-colors"
                        >
                          <span className="material-symbols-outlined">remove</span>
                        </button>

                        <span className="text-xl font-black text-[#faeacc] w-8 text-center">{currentQty}</span>

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

            {/* 2. Customer Form */}
            <div>
              <h2 className="text-2xl font-black mb-6 text-[#faeacc] flex items-center gap-3">
                <span className="size-8 rounded-full bg-yellow-500 text-black text-sm flex items-center justify-center">
                  2
                </span>
                {t("booking_step_2")}
              </h2>

              <div className="grid sm:grid-cols-2 gap-6 p-8 rounded-3xl border border-yellow-900/20 bg-[#14120c]">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider ml-1">
                    {t("booking_label_first_name")}
                  </label>
                  <input
                    name="firstName"
                    value={customer.firstName}
                    onChange={handleInputChange}
                    type="text"
                    placeholder={t("booking_ph_first_name")}
                    className="w-full bg-[#0a0905] border border-yellow-900/30 text-[#faeacc] placeholder-yellow-900/30 rounded-xl px-4 py-4 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider ml-1">
                    {t("booking_label_last_name")}
                  </label>
                  <input
                    name="lastName"
                    value={customer.lastName}
                    onChange={handleInputChange}
                    type="text"
                    placeholder={t("booking_ph_last_name")}
                    className="w-full bg-[#0a0905] border border-yellow-900/30 text-[#faeacc] placeholder-yellow-900/30 rounded-xl px-4 py-4 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider ml-1">
                    {t("booking_label_email")}
                  </label>
                  <input
                    name="email"
                    value={customer.email}
                    onChange={handleInputChange}
                    type="email"
                    placeholder={t("booking_ph_email")}
                    className="w-full bg-[#0a0905] border border-yellow-900/30 text-[#faeacc] placeholder-yellow-900/30 rounded-xl px-4 py-4 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider ml-1">
                    {t("booking_label_phone")}
                  </label>
                  <input
                    name="phone"
                    value={customer.phone}
                    onChange={handleInputChange}
                    type="tel"
                    placeholder={t("booking_ph_phone")}
                    className="w-full bg-[#0a0905] border border-yellow-900/30 text-[#faeacc] placeholder-yellow-900/30 rounded-xl px-4 py-4 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-[400px]">
            <div className="sticky top-32 bg-[#14120c] border border-yellow-900/30 rounded-3xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-900 via-yellow-500 to-yellow-900" />

              <h3 className="text-2xl font-black text-[#faeacc] border-b border-yellow-900/20 pb-6">
                {t("booking_summary_title")}
              </h3>

              <div className="space-y-6 min-h-[100px]">
                {selectedItemsCount > 0 ? (
                  tickets.map((ticket) => {
                    const qty = quantities[ticket.id];
                    if (!qty) return null;

                    return (
                      <div key={ticket.id} className="flex justify-between items-start animate-in slide-in-from-left-4 fade-in duration-300">
                        <div>
                          <p className="font-bold text-[#faeacc]">
                            {qty} x {ticket.name}
                          </p>
                          <p className="text-xs text-yellow-600/70">
                            {t("booking_unit_price")}: {ticket.price} RON
                          </p>
                        </div>
                        <p className="font-bold text-yellow-500">{ticket.price * qty} RON</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-yellow-900/40">
                    <span className="material-symbols-outlined text-4xl mb-2">shopping_cart_off</span>
                    <p className="text-sm font-bold uppercase tracking-wide">{t("booking_cart_empty")}</p>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-dashed border-yellow-900/30">
                <div className="flex justify-between items-end">
                  <span className="text-yellow-600 font-bold uppercase tracking-wider text-xs mb-1">
                    {t("booking_total_label")}
                  </span>
                  <div className="text-right">
                    <span className="text-4xl font-black text-[#faeacc]">{total}</span>
                    <span className="text-lg font-bold text-yellow-500 ml-1">RON</span>
                  </div>
                </div>
              </div>

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
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-black" />
                    {t("booking_btn_processing")}
                  </span>
                ) : (
                  <>
                    <span className="relative z-10 group-disabled:hidden">{t("booking_btn_finish")}</span>
                    <span className="relative z-10 hidden group-disabled:block">{t("booking_btn_select_tickets")}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-yellow-900/60 text-[10px] font-bold uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm">lock</span>
                {t("booking_secure_payment")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}