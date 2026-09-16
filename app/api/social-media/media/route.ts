import { NextRequest } from "next/server";
import { configureInstagramFetch } from "@/lib/social-media/fetch";

configureInstagramFetch();

export const dynamic = "force-dynamic";

/**
 * Proxy for Instagram CDN media (thumbnails + video).
 * Instagram signed CDN URLs reject browser requests from other origins (403),
 * but work when fetched server-side with a browser-like UA + IG referer.
 * Only instagram/facebook CDN hosts are allowed (SSRF guard).
 */
const ALLOWED_HOST = /(^|\.)cdninstagram\.com$|(^|\.)fbcdn\.net$/;

const UPSTREAM_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Referer: "https://www.instagram.com/",
  Accept: "*/*",
};

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return new Response("url required", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return new Response("invalid url", { status: 400 });
  }
  if (parsed.protocol !== "https:" || !ALLOWED_HOST.test(parsed.hostname)) {
    return new Response("host not allowed", { status: 400 });
  }

  const headers: Record<string, string> = { ...UPSTREAM_HEADERS };
  const range = req.headers.get("range");
  if (range) headers.Range = range;

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), { headers });
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }

  const h = new Headers();
  for (const key of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"]) {
    const v = upstream.headers.get(key);
    if (v) h.set(key, v);
  }
  h.set("Cache-Control", "public, max-age=86400, immutable");

  return new Response(upstream.body, { status: upstream.status, headers: h });
}