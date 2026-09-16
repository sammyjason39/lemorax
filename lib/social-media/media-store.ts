import { createServerSupabaseClient } from "@/lib/supabase";
import { configureInstagramFetch } from "@/lib/social-media/fetch";

configureInstagramFetch();

const BUCKET = "social-media-media";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const ALLOWED_HOST = /(^|\.)cdninstagram\.com$|(^|\.)fbcdn\.net$/;

let bucketReady = false;

async function ensureBucket(sb: ReturnType<typeof createServerSupabaseClient>) {
  if (bucketReady) return;
  const { data } = await sb.storage.listBuckets();
  if (!data?.some((b) => b.name === BUCKET)) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true });
    if (error && !String(error.message).includes("already exists")) throw new Error(error.message);
  }
  bucketReady = true;
}

/**
 * Download a signed Instagram CDN asset at sync time and store it in
 * Supabase Storage. CDN URLs expire (oe= param), so a stable copy is the
 * only durable way to render media later.
 * Returns a public URL, or null when the source is unreachable.
 */
export async function persistRemoteMedia(
  remoteUrl: string,
  objectPath: string
): Promise<string | null> {
  try {
    const parsed = new URL(remoteUrl);
    if (parsed.protocol !== "https:" || !ALLOWED_HOST.test(parsed.hostname)) return null;
  } catch {
    return null;
  }

  const sb = createServerSupabaseClient();
  await ensureBucket(sb);

  const res = await fetch(remoteUrl, {
    headers: { "User-Agent": UA, Referer: "https://www.instagram.com/" },
    redirect: "follow",
  });
  if (!res.ok) return null;

  const body = await res.arrayBuffer();
  if (body.byteLength === 0) return null;

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(objectPath, body, { contentType, upsert: true });

  if (error) {
    // Bucket may have been created without public access — retry read via public URL anyway
    const { data } = await sb.storage.from(BUCKET).getPublicUrl(objectPath);
    return data?.publicUrl ?? null;
  }

  const { data } = await sb.storage.from(BUCKET).getPublicUrl(objectPath);
  return data?.publicUrl ?? null;
}

/** Only re-download when we don't already have a stable copy for this path. */
export async function persistRemoteMediaOnce(
  remoteUrl: string | null,
  objectPath: string
): Promise<string | null> {
  if (!remoteUrl) return null;
  const sb = createServerSupabaseClient();
  await ensureBucket(sb);
  const { data } = await sb.storage.from(BUCKET).getPublicUrl(objectPath);
  const existing = data?.publicUrl;
  if (existing) {
    try {
      const head = await fetch(existing, { method: "HEAD" });
      if (head.ok) return existing;
    } catch {
      /* fall through to upload */
    }
  }
  return persistRemoteMedia(remoteUrl, objectPath);
}