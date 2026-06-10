import type { NextRequest } from "next/server";

const LOCAL_FALLBACK = "http://localhost:3000";

/** Env override wins in production; otherwise follow the incoming request origin. */
export function resolveAppBaseUrl(req?: NextRequest, requestOrigin?: string): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.ARIES_BASE_URL
  )?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const origin = requestOrigin?.trim() || extractOriginFromRequest(req);
  if (origin) return origin.replace(/\/$/, "");

  return LOCAL_FALLBACK;
}

function extractOriginFromRequest(req?: NextRequest): string | null {
  if (!req) return null;

  const headerOrigin = req.headers.get("origin")?.trim();
  if (headerOrigin) return headerOrigin;

  const referer = req.headers.get("referer")?.trim();
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore malformed referer
    }
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") || "http";
    return `${proto}://${host.split(",")[0].trim()}`;
  }

  return null;
}

export function buildAppUrl(
  path: string,
  req?: NextRequest,
  requestOrigin?: string
): string {
  const base = resolveAppBaseUrl(req, requestOrigin);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
