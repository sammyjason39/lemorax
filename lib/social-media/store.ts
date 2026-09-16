import { createServerSupabaseClient } from "@/lib/supabase";
import type { ApifyInstagramProfile, ApifyInstagramPost } from "@/lib/apify/instagram";
import { persistRemoteMediaOnce } from "@/lib/social-media/media-store";
import { configureInstagramFetch } from "@/lib/social-media/fetch";

configureInstagramFetch();

function mediaProxy(u: string | null): string | null {
  return u ? `/api/social-media/media?url=${encodeURIComponent(u)}` : null;
}

export type SocialProfile = {
  id: string;
  platform: string;
  username: string;
  display_name: string | null;
  followers: number;
  following: number;
  posts_count: number;
  engagement_rate: number;
  conversion_rate: number;
  profile_views: number;
  link_clicks: number;
  conversions: number;
  bio: string | null;
  profile_pic_url: string | null;
  synced_at: string | null;
  source: string | null;
};

export type SocialPost = {
  id: string;
  profile_id: string;
  platform: string;
  external_id: string | null;
  post_url: string | null;
  caption: string | null;
  media_type: string | null;
  published_at: string | null;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagement_rate: number;
  clicks: number;
  conversions: number;
  thumbnail_url: string | null;
};

function profileId(platform: string, username: string): string {
  return `${platform}_${username.toLowerCase()}`;
}

function postEngagementRate(likes: number, comments: number, followers: number): number {
  if (!followers) return 0;
  return Math.round(((likes + comments) / followers) * 10000) / 100;
}

export async function listProfiles(): Promise<SocialProfile[]> {
  const sb = createServerSupabaseClient();
  const { data, error } = await sb
    .from("social_media_profiles")
    .select("*")
    .order("synced_at", { ascending: false, nullsFirst: false })
    .order("followers", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as SocialProfile[];
}

export async function listPosts(profileId?: string, limit = 50): Promise<SocialPost[]> {
  const sb = createServerSupabaseClient();
  let q = sb.from("social_media_posts").select("*").order("published_at", { ascending: false }).limit(limit);
  if (profileId) q = q.eq("profile_id", profileId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as SocialPost[];
}

export async function getDashboardData() {
  const [profiles, posts] = await Promise.all([listProfiles(), listPosts(undefined, 20)]);

  const totalFollowers = profiles.reduce((s, p) => s + (p.followers || 0), 0);
  const totalEngagement =
    profiles.length > 0
      ? profiles.reduce((s, p) => s + (Number(p.engagement_rate) || 0), 0) / profiles.length
      : 0;
  const totalConversions = profiles.reduce((s, p) => s + (p.conversions || 0), 0);
  const totalClicks = profiles.reduce((s, p) => s + (p.link_clicks || 0), 0);
  const avgConversionRate =
    profiles.length > 0
      ? profiles.reduce((s, p) => s + (Number(p.conversion_rate) || 0), 0) / profiles.length
      : 0;

  const postEngagement =
    posts.length > 0
      ? posts.reduce((s, p) => s + (Number(p.engagement_rate) || 0), 0) / posts.length
      : 0;

  const engagementByPost = posts.map((p) => ({
    id: p.id,
    caption: (p.caption || "").slice(0, 60),
    likes: p.likes,
    comments: p.comments,
    reach: p.reach,
    engagement_rate: p.engagement_rate,
    published_at: p.published_at,
  }));

  return {
    summary: {
      totalFollowers,
      avgEngagementRate: Math.round(totalEngagement * 100) / 100,
      postAvgEngagement: Math.round(postEngagement * 100) / 100,
      totalConversions,
      totalLinkClicks: totalClicks,
      avgConversionRate: Math.round(avgConversionRate * 100) / 100,
      profileCount: profiles.length,
      postCount: posts.length,
    },
    profiles,
    posts,
    engagementByPost,
  };
}

export async function getSocialContextForAgent(limit = 15): Promise<string> {
  try {
    const data = await getDashboardData();
    if (!data.profiles.length) return "";

    const profileLines = data.profiles
      .map(
        (p) =>
          `- @${p.username} (${p.platform}): ${p.followers.toLocaleString("id-ID")} followers, ER ${p.engagement_rate}%, conv ${p.conversion_rate}%`
      )
      .join("\n");

    const postLines = data.posts.slice(0, limit).map((p, i) => {
      const cap = (p.caption || "").replace(/\s+/g, " ").slice(0, 120);
      return `${i + 1}. [${p.published_at?.slice(0, 10) ?? "?"}] ${cap} — ❤️${p.likes} 💬${p.comments} reach ${p.reach}`;
    });

    return `## Data Social Media Lemorax\n\n### Profil\n${profileLines}\n\n### Konten terbaru\n${postLines.join("\n")}`;
  } catch {
    return "";
  }
}

/**
 * Full past-performance digest for Soca: every post with real metrics,
 * format breakdowns, timing patterns, and hashtag performance so the agent
 * can reason about what to create next.
 */
export async function getSocialPerformanceContext(limit = 24): Promise<string> {
  try {
    const sb = createServerSupabaseClient();
    const { data: profiles } = await sb.from("social_media_profiles").select("*").order("followers", { ascending: false });
    if (!profiles?.length) return "";

    const { data: posts } = await sb
      .from("social_media_posts")
      .select("caption, media_type, published_at, likes, comments, reach, impressions, engagement_rate, external_id, raw")
      .order("published_at", { ascending: false })
      .limit(limit);

    const real = (posts || []).filter((p: any) => p.raw?.source !== "seed" && (p.likes > 0 || p.comments > 0));

    const lines = real.map((p: any, i: number) => {
      const cap = (p.caption || "").replace(/\s+/g, " ").slice(0, 110);
      const views = Number(p.raw?.videoViewCount) || 0;
      const hashtags: string[] = Array.isArray(p.raw?.hashtags) ? p.raw.hashtags : [];
      const dt = p.published_at ? new Date(p.published_at) : null;
      const when = dt ? `${dt.toISOString().slice(0, 10)} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : "?";
      const parts = [
        `${i + 1}. [${p.media_type || "?"} | ${when}] "${cap}"`,
        `   likes ${p.likes} · comments ${p.comments} · ER ${p.engagement_rate}%${views ? ` · views ${views}` : ""} · reach ${p.reach}`,
      ];
      if (hashtags.length) parts.push(`   hashtags: ${hashtags.slice(0, 8).map((h) => `#${h}`).join(" ")}`);
      return parts.join("\n");
    });

    // Aggregates for reasoning
    const total = real.length;
    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
    const byType: Record<string, { n: number; er: number[]; likes: number[] }> = {};
    const byHour: Record<number, { n: number; er: number[] }> = {};
    const byDow: Record<number, { n: number; er: number[] }> = {};
    const tagStats: Record<string, { n: number; er: number[] }> = {};
    let bestER: { er: number; cap: string; type: string } | null = null;
    let worstER: { er: number; cap: string; type: string } | null = null;

    for (const p of real) {
      const type = p.media_type || "Image";
      (byType[type] ||= { n: 0, er: [], likes: [] });
      byType[type].n++;
      byType[type].er.push(p.engagement_rate || 0);
      byType[type].likes.push(p.likes || 0);

      if (p.published_at) {
        const d = new Date(p.published_at);
        (byHour[d.getHours()] ||= { n: 0, er: [] });
        byHour[d.getHours()].er.push(p.engagement_rate || 0);
        byHour[d.getHours()].n++;
        (byDow[d.getDay()] ||= { n: 0, er: [] });
        byDow[d.getDay()].er.push(p.engagement_rate || 0);
        byDow[d.getDay()].n++;
      }
      for (const h of (Array.isArray(p.raw?.hashtags) ? p.raw.hashtags : []).slice(0, 10)) {
        (tagStats[h] ||= { n: 0, er: [] });
        tagStats[h].n++;
        tagStats[h].er.push(p.engagement_rate || 0);
      }
      const item = { er: p.engagement_rate || 0, cap: (p.caption || "").replace(/\s+/g, " ").slice(0, 60), type };
      if (!bestER || item.er > bestER.er) bestER = item;
      if (!worstER || item.er < worstER.er) worstER = item;
    }

    const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const typeLines = Object.entries(byType)
      .map(([t, v]) => `- ${t}: ${v.n} post, rata-rata ER ${avg(v.er).toFixed(2)}%, rata-rata likes ${Math.round(avg(v.likes)).toLocaleString("id-ID")}`)
      .join("\n");
    const hourLines = Object.entries(byHour)
      .map(([h, v]) => `- jam ${String(h).padStart(2, "0")}:00 (${v.n}x, ER rata ${avg(v.er).toFixed(2)}%)`)
      .join("\n");
    const dowLines = Object.entries(byDow)
      .map(([d, v]) => `- ${DOW[Number(d)]} (${v.n}x, ER rata ${avg(v.er).toFixed(2)}%)`)
      .join("\n");
    const topTags = Object.entries(tagStats)
      .sort((a, b) => b[1].er.length * avg(b[1].er) - a[1].er.length * avg(a[1].er))
      .slice(0, 10)
      .map(([h, v]) => `#${h} (${v.n}x, ER rata ${avg(v.er).toFixed(2)}%)`)
      .join(", ");

    const overallER = avg(real.map((p: any) => p.engagement_rate || 0));

    return [
      "## Past Performance Social Media (data real dari sync)",
      "",
      "### Profil akun",
      (profiles || [])
        .map((p: any) => `- @${p.username} (${p.platform}): ${(p.followers || 0).toLocaleString("id-ID")} followers, ER ${p.engagement_rate}%`)
        .join("\n"),
      "",
      `### Ringkasan ${total} konten terakhir`,
      `- ER keseluruhan rata-rata: ${overallER.toFixed(2)}%`,
      `- Konten terbaik: [${bestER?.type}] "${bestER?.cap}" ER ${bestER?.er.toFixed(2)}%`,
      `- Konten terendah: [${worstER?.type}] "${worstER?.cap}" ER ${worstER?.er.toFixed(2)}%`,
      "",
      "### Performa per format",
      typeLines || "(belum ada data)",
      "",
      "### Jam posting (WIB)",
      hourLines || "(belum ada data)",
      "",
      "### Hari posting",
      dowLines || "(belum ada data)",
      "",
      "### Hashtag paling berdampak",
      topTags || "(belum ada data)",
      "",
      "### Detail konten",
      lines.join("\n"),
      "",
      "Gunakan data ini untuk menjawab pertanyaan performa dan memberi rekomendasi konten berikutnya. Selalu rujuk angka nyata, sebutkan format dan jam yang paling berhasil, dan kaitkan rekomendasi video berikutnya dengan pola yang terbukti.",
    ].join("\n");
  } catch {
    return "";
  }
}

export async function upsertFromApifyProfile(raw: ApifyInstagramProfile): Promise<{ profileId: string; postsUpserted: number }> {
  const username = (raw.username || "").trim();
  if (!username) throw new Error("Apify profile missing username");

  const platform = "instagram";
  const id = profileId(platform, username);
  const followers = Number(raw.followersCount) || 0;
  const following = Number(raw.followsCount) || 0;
  const postsCount = Number(raw.postsCount) || 0;
  const now = new Date().toISOString();

  const sb = createServerSupabaseClient();

  const latestPosts = Array.isArray(raw.latestPosts) ? raw.latestPosts : [];
  let engagementSum = 0;
  for (const post of latestPosts) {
    const likes = Number(post.likesCount) || 0;
    const comments = Number(post.commentsCount) || 0;
    engagementSum += postEngagementRate(likes, comments, followers);
  }
  const engagementRate =
    latestPosts.length > 0 ? Math.round((engagementSum / latestPosts.length) * 100) / 100 : 0;

  const { error: profileErr } = await sb.from("social_media_profiles").upsert(
    {
      id,
      platform,
      username,
      display_name: raw.fullName || username,
      followers,
      following,
      posts_count: postsCount,
      engagement_rate: engagementRate,
      bio: raw.biography || null,
      profile_pic_url: raw.profilePicUrl || null,
      synced_at: now,
      source: "apify",
      raw,
      updated_at: now,
    },
    { onConflict: "platform,username" }
  );
  if (profileErr) throw new Error(profileErr.message);

  let postsUpserted = 0;
  for (const post of latestPosts) {
    const shortCode = post.shortCode || post.id;
    const postId = shortCode ? `${id}_${shortCode}` : `${id}_post_${postsUpserted}`;
    const likes = Number(post.likesCount) || 0;
    const comments = Number(post.commentsCount) || 0;
    const ts = post.timestamp;
    let publishedAt: string | null = null;
    if (typeof ts === "number") publishedAt = new Date(ts * 1000).toISOString();
    else if (typeof ts === "string") publishedAt = new Date(ts).toISOString();

    const er = postEngagementRate(likes, comments, followers);
    const reach = Math.max(likes + comments, Math.round(followers * 0.18));
    const videoUrl = typeof post.videoUrl === "string" ? post.videoUrl : null;

    // Instagram CDN URLs are signed and expire — archive media into Supabase
    // Storage at sync time so cards keep working after the signature lapses.
    const shortCodeSafe = String(shortCode || `post_${postsUpserted}`).replace(/[^A-Za-z0-9_-]/g, "");
    const thumbStored = await persistRemoteMediaOnce(
      post.displayUrl || null,
      `${id}/${shortCodeSafe}_cover.jpg`
    );
    const videoStored = videoUrl
      ? await persistRemoteMediaOnce(videoUrl, `${id}/${shortCodeSafe}_video.mp4`)
      : null;

    const { error: postErr } = await sb.from("social_media_posts").upsert(
      {
        id: postId,
        profile_id: id,
        platform,
        external_id: shortCode ? String(shortCode) : null,
        post_url: post.url || (shortCode ? `https://www.instagram.com/p/${shortCode}/` : null),
        caption: post.caption || null,
        media_type: post.type || "Image",
        published_at: publishedAt,
        likes,
        comments,
        reach,
        impressions: Math.round(reach * 1.4),
        engagement_rate: er,
        thumbnail_url: thumbStored || mediaProxy(post.displayUrl || null),
        raw: { ...post, proxiedVideoUrl: videoStored || mediaProxy(videoUrl) },
        updated_at: now,
      },
      { onConflict: "id" }
    );
    if (postErr) throw new Error(postErr.message);
    postsUpserted++;
  }

  return { profileId: id, postsUpserted };
}

/**
 * Deep backfill using apify/instagram-scraper (supports resultsLimit up to
 * ~200 via directUrls). The profile-scraper actor is hard-capped at 12 posts.
 * Posts are upserted through the same pipeline so media archiving applies.
 */
export async function upsertFromApifyPosts(
  username: string,
  posts: ApifyInstagramPost[]
): Promise<{ profileId: string; postsUpserted: number }> {
  return upsertFromApifyProfile({
    username,
    latestPosts: posts,
  });
}
