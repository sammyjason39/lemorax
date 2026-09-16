import { NextRequest, NextResponse } from "next/server";
import { scrapeInstagramProfiles, scrapeInstagramProfilesWithPoll, scrapeInstagramPostsDeep } from "@/lib/apify/instagram";
import { getDashboardData, upsertFromApifyProfile, upsertFromApifyPosts } from "@/lib/social-media/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const usernames: string[] = Array.isArray(body.usernames)
      ? body.usernames.map((u: string) => u.replace(/^@/, "").trim()).filter(Boolean)
      : ["anjas_maradita"];

    if (!usernames.length) {
      return NextResponse.json({ error: "usernames required" }, { status: 400 });
    }

    // deep=true backfills up to `limit` posts (default 48, hard cap 48) via
    // apify/instagram-scraper. Normal sync stays on the 12-post profile actor.
    const deep = body.deep === true;
    const limit = Math.min(Math.max(Number(body.limit) || 48, 12), 48);

    const results: Array<{
      username?: string;
      profileId?: string;
      postsUpserted?: number;
      followers?: number;
      displayName?: string;
      mode?: string;
    }> = [];

    for (const username of usernames) {
      if (deep) {
        try {
          const posts = await scrapeInstagramPostsDeep(username, limit);
          const result = await upsertFromApifyPosts(username, posts);
          results.push({
            username,
            displayName: username,
            ...result,
            mode: "deep",
          });
          continue;
        } catch (deepErr) {
          // Deep backfill failed — fall through to the regular profile sync
          console.error("deep sync failed, falling back:", deepErr instanceof Error ? deepErr.message : deepErr);
        }
      }

      let profiles;
      try {
        profiles = await scrapeInstagramProfiles([username], {
          includeAboutSection: body.includeAboutSection ?? false,
        });
      } catch {
        profiles = await scrapeInstagramProfilesWithPoll(usernames, {
          includeAboutSection: body.includeAboutSection ?? false,
        });
      }

      for (const profile of profiles) {
        const result = await upsertFromApifyProfile(profile);
        results.push({
          username: profile.username,
          displayName: profile.fullName,
          followers: Number(profile.followersCount) || 0,
          ...result,
          mode: deep ? "deep-fallback-profile" : "profile",
        });
      }
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
