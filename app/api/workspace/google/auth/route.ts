import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getGoogleAuthUrl } from "@/lib/workspace/google-calendar";
import { saveOAuthState } from "@/lib/workspace/google-store";
import { isGoogleCalendarConfigured } from "@/lib/workspace/google-config";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json(
        { error: "Google OAuth belum dikonfigurasi. Set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET." },
        { status: 503 }
      );
    }

    const state = randomBytes(24).toString("hex");
    await saveOAuthState(state);

    const url = getGoogleAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Auth failed" },
      { status: 500 }
    );
  }
}
