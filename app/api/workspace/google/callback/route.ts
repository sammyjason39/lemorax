import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/workspace/google-calendar";
import { consumeOAuthState, saveGoogleCalendarConnection } from "@/lib/workspace/google-store";
import { isGoogleCalendarConfigured } from "@/lib/workspace/google-config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const baseUrl = new URL("/dashboard/workspace", req.nextUrl.origin);

  try {
    if (!isGoogleCalendarConfigured()) {
      baseUrl.searchParams.set("error", "google_not_configured");
      return NextResponse.redirect(baseUrl);
    }

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const oauthError = req.nextUrl.searchParams.get("error");

    if (oauthError) {
      baseUrl.searchParams.set("error", oauthError);
      return NextResponse.redirect(baseUrl);
    }

    if (!code || !state) {
      baseUrl.searchParams.set("error", "missing_code");
      return NextResponse.redirect(baseUrl);
    }

    const valid = await consumeOAuthState(state);
    if (!valid) {
      baseUrl.searchParams.set("error", "invalid_state");
      return NextResponse.redirect(baseUrl);
    }

    const tokens = await exchangeGoogleCode(code);
    await saveGoogleCalendarConnection({
      googleEmail: tokens.googleEmail,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.tokenExpiresAt,
    });

    baseUrl.searchParams.set("connected", "1");
    return NextResponse.redirect(baseUrl);
  } catch (err) {
    baseUrl.searchParams.set("error", err instanceof Error ? err.message : "callback_failed");
    return NextResponse.redirect(baseUrl);
  }
}
