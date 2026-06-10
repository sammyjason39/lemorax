import { createServerSupabaseClient } from "@/lib/supabase";
import type { ApifyInstagramProfile } from "@/lib/apify/instagram";

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
        thumbnail_url: post.displayUrl || null,
        raw: post,
        updated_at: now,
      },
      { onConflict: "id" }
    );
    if (postErr) throw new Error(postErr.message);
    postsUpserted++;
  }

  return { profileId: id, postsUpserted };
}
