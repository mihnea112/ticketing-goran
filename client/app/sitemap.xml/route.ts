// app/sitemap.xml/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl() {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/+$/, "");

  return "http://localhost:3000";
}

type UrlEntry = {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
};

export async function GET() {
  const baseUrl = getBaseUrl();

  // Add only public, indexable pages here
  const urls: UrlEntry[] = [
    { path: "/", changefreq: "weekly", priority: 1.0 },
    { path: "/booking", changefreq: "weekly", priority: 0.9 },
    // Add public content pages if you have them:
    // { path: "/terms", changefreq: "yearly", priority: 0.3 },
    // { path: "/privacy", changefreq: "yearly", priority: 0.3 },
  ];

  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const loc = `${baseUrl}${u.path}`;
    const changefreq = u.changefreq ?? "weekly";
    const priority = (u.priority ?? 0.5).toFixed(1);
    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}