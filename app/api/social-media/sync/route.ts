import { NextRequest, NextResponse } from "next/server";
import { scrapeInstagramProfiles, scrapeInstagramProfilesWithPoll } from "@/lib/apify/instagram";
import { getDashboardData, upsertFromApifyProfile } from "@/lib/social-media/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const usernames: string[] = Array.isArray(body.usernames)
      ? body.usernames.map((u: string) => u.replace(/^@/, "").trim()).filter(Boolean)
      : ["anjas_maradita"];

    if (!usernames.length) {
      return NextResponse.json({ error: "usernames required" }, { status: 400 });
    }

    let profiles;
    try {
      profiles = await scrapeInstagramProfiles(usernames, {
        includeAboutSection: body.includeAboutSection ?? false,
      });
    } catch {
      profiles = await scrapeInstagramProfilesWithPoll(usernames, {
        includeAboutSection: body.includeAboutSection ?? false,
      });
    }

    const results: Array<{
      username?: string;
      profileId: string;
      postsUpserted: number;
      followers: number;
      displayName?: string;
    }> = [];
    for (const profile of profiles) {
      const result = await upsertFromApifyProfile(profile);
      results.push({
        username: profile.username,
        displayName: profile.fullName,
        followers: Number(profile.followersCount) || 0,
        ...result,
      });
    }

    const dashboard = await getDashboardData();

    return NextResponse.json(
      {
        ok: true,
        synced: results.length,
        results,
        summary: dashboard.summary,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
