// app/robots.txt/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl() {
  // Prefer an explicit env var you set in Vercel
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/+$/, "");

  // Vercel auto var (works without custom domain)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/+$/, "");

  // Fallback
  return "http://localhost:3000";
}

export async function GET() {
  const baseUrl = getBaseUrl();

  const content = `User-agent: *
Allow: /

# Block internal / sensitive routes (adjust to your app)
Disallow: /api/
Disallow: /tickets/view/
Disallow: /success
Disallow: /booking/success
Disallow: /booking/cancel

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}