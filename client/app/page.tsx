// app/page.tsx
import HomeClient from "./HomeClient";
import pool from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// --- CONFIGURARE UI (Beneficii Statice) ---
const UI_FEATURES: Record<string, string[]> = {
  gold: ["Loc premium la concert", "Vedere centrală excelentă", "Acces prioritar"],
  tribune: ["Loc pe scaun în tribună", "Vedere bună a scenei", "Acces rapid"],
};

const UI_BADGES: Record<string, string> = {
  gold: "PREMIUM",
  tribune: "POPULAR",
};

export type TicketData = {
  id: string;
  code: string;
  name: string;
  price: number;
  totalQuantity: number;
  soldQuantity: number;
  badge?: string;
  features: string[];
};

async function getTicketsFromDb(): Promise<TicketData[]> {
  const client = await pool.connect();
  try {
    /**
     * IMPORTANT:
     * If your columns are snake_case (e.g. total_quantity), change the SELECT aliases accordingly.
     * Your previous code suggests you have "totalQuantity" and "soldQuantity" (quoted camelCase).
     */
    const res = await client.query(`
      SELECT
        id,
        code,
        name,
        price,
        "totalQuantity" as "totalQuantity",
        "soldQuantity"  as "soldQuantity"
      FROM ticket_categories
      ORDER BY price ASC
    `);

    const rows = res.rows || [];

    return rows.map((t: any) => {
      const totalQuantity = Number(t.totalQuantity ?? 0);
      const soldQuantity = Number(t.soldQuantity ?? 0);
      const remaining = totalQuantity - soldQuantity;

      return {
        id: t.id,
        code: t.code,
        name: t.name,
        price: Number(t.price ?? 0),
        totalQuantity,
        soldQuantity,
        features: UI_FEATURES[t.code] || [],
        badge: UI_BADGES[t.code] || (remaining < 20 ? "LAST SEATS" : ""),
      };
    });
  } finally {
    client.release();
  }
}

export default async function Page() {
  const tickets = await getTicketsFromDb();
  return <HomeClient tickets={tickets} />;
}