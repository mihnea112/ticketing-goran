// src/lib/i18n.ts
export type Lang = "ro" | "en";

export const DEFAULT_LANG: Lang = "ro";

export function normalizeLang(value: string | null | undefined): Lang {
  return value === "en" ? "en" : "ro";
}

export const dict = {
  ro: {
    // --- NAV ---
    nav_event: "Eveniment",
    nav_tickets: "Bilete",
    nav_cta: "Rezervă acum",
    nav_admin_mode: "Mod Administrator",
    nav_admin_exit: "Ieșire",
    nav_follow: "Urmărește-ne",
    menu_label: "Meniu",

    // --- HOME ---
    hero_badge: "Turneu Aniversar • Doživjeti Stotu",
    hero_title_big: "BIJELO DUGME",
    hero_subtitle: "GORAN BREGOVIĆ",
    organizer: "Organizator: ASOCIAȚIA CENTRUL CULTURAL SÂRBESC CONSTANTIN",
    btn_buy: "CUMPĂRĂ BILETE",
    btn_details: "DETALII EVENIMENT",

    info_date_label: "Data Concertului",
    info_location_label: "Locație",
    info_event_label: "Eveniment",
    info_time: "Ora 20:00",
    info_city: "TIMIȘOARA",
    info_venue: "Sala Constantin Jude",

    section_kicker: "Reuniunea Legendelor",
    section_title_1: "O seară istorică la",
    section_title_2: "Timișoara",
    access_public: "Acces Public",
    access_text: "Accesul în sală se face începând cu ora 18:30.",
    doors_warn: "ATENȚIE: Ușile se închid la ora 20:30!",

    tickets_title_small: "Bilete Disponibile",
    tickets_title_big: "Alege Locul Tău",
    ticket_buy: "Cumpără Bilet",
    ticket_unavailable: "Indisponibil",
    stock_sold_out: "Sold Out",
    stock_available: "Disponibil",
    stock_low_prefix: "Doar",
    stock_low_suffix: "rămase!",

    // --- BOOKING ---
    booking_kicker: "Proces de cumpărare",
    booking_title: "Rezervă Locul Tău",
    booking_step_1: "Alege Categoria",
    booking_step_2: "Informații Cumpărător",

    booking_label_first_name: "Nume",
    booking_label_last_name: "Prenume",
    booking_label_email: "Email",
    booking_label_phone: "Telefon",

    booking_ph_first_name: "Ex: Popescu",
    booking_ph_last_name: "Ex: Andrei",
    booking_ph_email: "nume@exemplu.com",
    booking_ph_phone: "+40 7xx xxx xxx",

    booking_stock_sold_out: "STOC EPUIZAT",
    booking_stock_available: "Locuri disponibile",
    booking_stock_only_prefix: "Doar",
    booking_stock_only_suffix: "locuri rămase!",

    booking_summary_title: "Sumar Comandă",
    booking_cart_empty: "Coșul este gol",
    booking_unit_price: "Preț unitar",
    booking_total_label: "Total de plată",

    booking_btn_processing: "Se procesează...",
    booking_btn_finish: "Finalizează Comanda",
    booking_btn_select_tickets: "Selectează bilete",

    booking_secure_payment: "Plată securizată prin Stripe",

    booking_err_contact: "Te rugăm să completezi toate datele de contact.",
    booking_err_server: "Eroare de conexiune la server.",
    booking_err_load_tickets: "Nu am putut încărca biletele",

    ticket_desc_general: "Loc în picioare, acces bar",
    ticket_desc_tribune: "Loc pe scaun, vizibilitate bună",
    ticket_desc_gold: "Primele rânduri, acces lounge",

    ticket_badge_best_value: "BEST VALUE",
    ticket_badge_popular: "POPULAR",
    ticket_badge_exclusive: "EXCLUSIV",
  },
  en: {
    // --- NAV ---
    nav_event: "Event",
    nav_tickets: "Tickets",
    nav_cta: "Book now",
    nav_admin_mode: "Admin mode",
    nav_admin_exit: "Exit",
    nav_follow: "Follow us",
    menu_label: "Menu",

    // --- HOME ---
    hero_badge: "Anniversary Tour • Doživjeti Stotu",
    hero_title_big: "BIJELO DUGME",
    hero_subtitle: "GORAN BREGOVIĆ",
    organizer: "Organizer: SERBIAN CULTURAL CENTER ASSOCIATION CONSTANTIN",
    btn_buy: "BUY TICKETS",
    btn_details: "EVENT DETAILS",

    info_date_label: "Concert Date",
    info_location_label: "Location",
    info_event_label: "Event",
    info_time: "8:00 PM",
    info_city: "TIMIȘOARA",
    info_venue: "Constantin Jude Hall",

    section_kicker: "Legends Reunion",
    section_title_1: "A historic night in",
    section_title_2: "Timișoara",
    access_public: "Public Access",
    access_text: "Venue access starts at 6:30 PM.",
    doors_warn: "WARNING: Doors close at 8:30 PM!",

    tickets_title_small: "Available Tickets",
    tickets_title_big: "Choose Your Seat",
    ticket_buy: "Buy Ticket",
    ticket_unavailable: "Unavailable",
    stock_sold_out: "Sold Out",
    stock_available: "Available",
    stock_low_prefix: "Only",
    stock_low_suffix: "left!",

    // --- BOOKING ---
    booking_kicker: "Checkout",
    booking_title: "Reserve Your Seat",
    booking_step_1: "Choose Category",
    booking_step_2: "Buyer Information",

    booking_label_first_name: "Last name",
    booking_label_last_name: "First name",
    booking_label_email: "Email",
    booking_label_phone: "Phone",

    booking_ph_first_name: "e.g. Popescu",
    booking_ph_last_name: "e.g. Andrei",
    booking_ph_email: "name@example.com",
    booking_ph_phone: "+40 7xx xxx xxx",

    booking_stock_sold_out: "SOLD OUT",
    booking_stock_available: "Seats available",
    booking_stock_only_prefix: "Only",
    booking_stock_only_suffix: "seats left!",

    booking_summary_title: "Order Summary",
    booking_cart_empty: "Your cart is empty",
    booking_unit_price: "Unit price",
    booking_total_label: "Total",

    booking_btn_processing: "Processing...",
    booking_btn_finish: "Complete Order",
    booking_btn_select_tickets: "Select tickets",

    booking_secure_payment: "Secure payment via Stripe",

    booking_err_contact: "Please fill in all contact details.",
    booking_err_server: "Server connection error.",
    booking_err_load_tickets: "Could not load tickets",

    ticket_desc_general: "Standing area, bar access",
    ticket_desc_tribune: "Seated, good visibility",
    ticket_desc_gold: "Front rows, lounge access",

    ticket_badge_best_value: "BEST VALUE",
    ticket_badge_popular: "POPULAR",
    ticket_badge_exclusive: "EXCLUSIVE",
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type DictKey = keyof typeof dict.ro;

/**
 * Pack type pentru Provider: aceleași chei, valori string (nu literal-types),
 * ca să nu-ți mai dea TS conflict între RO și EN.
 */
export type I18nPack = Record<DictKey, string>;

export function pack(lang: Lang): I18nPack {
  return dict[lang] as unknown as I18nPack;
}

export function t(lang: Lang, key: DictKey): string {
  return (dict[lang][key] ?? dict[DEFAULT_LANG][key] ?? String(key)) as string;
}