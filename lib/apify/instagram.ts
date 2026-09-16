const ACTOR_ID = "apify~instagram-profile-scraper";
const POSTS_ACTOR_ID = "apify~instagram-scraper";

export type ApifyInstagramProfile = {
  username?: string;
  fullName?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  profilePicUrl?: string;
  latestPosts?: ApifyInstagramPost[];
  [key: string]: unknown;
};

export type ApifyInstagramPost = {
  id?: string;
  shortCode?: string;
  url?: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
  timestamp?: string | number;
  type?: string;
  displayUrl?: string;
  [key: string]: unknown;
};

function getApifyToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not configured");
  return token;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapeInstagramProfiles(
  usernames: string[],
  options?: { includeAboutSection?: boolean; waitSeconds?: number }
): Promise<ApifyInstagramProfile[]> {
  const token = getApifyToken();
  const waitForFinish = options?.waitSeconds ?? 120;

  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${token}&waitForFinish=${waitForFinish}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames,
        includeAboutSection: options?.includeAboutSection ?? false,
      }),
    }
  );

  if (!runRes.ok) {
    const text = await runRes.text();
    throw new Error(`Apify run failed (${runRes.status}): ${text.slice(0, 300)}`);
  }

  const runPayload = await runRes.json();
  const run = runPayload.data;
  if (!run) throw new Error("Apify returned no run data");

  if (run.status !== "SUCCEEDED") {
    throw new Error(`Apify run ended with status: ${run.status}`);
  }

  const datasetId = run.defaultDatasetId;
  if (!datasetId) throw new Error("Apify run has no dataset id");

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`
  );
  if (!itemsRes.ok) {
    throw new Error(`Failed to fetch Apify dataset (${itemsRes.status})`);
  }

  return (await itemsRes.json()) as ApifyInstagramProfile[];
}

/** Poll-based fallback when waitForFinish times out on slow runs */
export async function scrapeInstagramProfilesWithPoll(
  usernames: string[],
  options?: { includeAboutSection?: boolean; maxWaitMs?: number }
): Promise<ApifyInstagramProfile[]> {
  const token = getApifyToken();
  const maxWait = options?.maxWaitMs ?? 180_000;

  const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usernames,
      includeAboutSection: options?.includeAboutSection ?? false,
    }),
  });

  if (!runRes.ok) {
    const text = await runRes.text();
    throw new Error(`Apify run failed (${runRes.status}): ${text.slice(0, 300)}`);
  }

  const { data: run } = await runRes.json();
  const runId = run.id as string;
  let datasetId = run.defaultDatasetId as string;
  const started = Date.now();

  while (Date.now() - started < maxWait) {
    await sleep(2000);
    const pollRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    const pollPayload = await pollRes.json();
    const status = pollPayload.data?.status as string;
    datasetId = pollPayload.data?.defaultDatasetId ?? datasetId;

    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${status}`);
    }
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`
  );
  if (!itemsRes.ok) throw new Error(`Dataset fetch failed (${itemsRes.status})`);
  return (await itemsRes.json()) as ApifyInstagramProfile[];
}

import https from "https";
import http from "http";
import { URL } from "url";

/**
 * Direct IPv4 HTTPS JSON request.
 * Next.js bundles its own undici whose fetch intermittently fails to reach
 * api.apify.com on this network; node:https with an explicit IPv4 family is
 * deterministic. Used for the deep backfill calls.
 */
export function fetchJsonIPv4<T = unknown>(
  reqUrl: string,
  options?: { method?: string; body?: unknown; timeoutMs?: number }
): Promise<{ status: number; ok: boolean; json: T }> {
  const target = new URL(reqUrl);
  const payload = options?.body !== undefined ? JSON.stringify(options.body) : undefined;
  const transport = target.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        hostname: target.hostname,
        path: `${target.pathname}${target.search}`,
        method: options?.method || (payload ? "POST" : "GET"),
        family: 4,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": String(Buffer.byteLength(payload)) } : {}),
        },
        timeout: options?.timeoutMs ?? 120_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let parsed: unknown = text;
          try {
            parsed = JSON.parse(text);
          } catch {
            /* keep raw text */
          }
          resolve({ status: res.statusCode ?? 0, ok: (res.statusCode ?? 0) < 400, json: parsed as T });
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Deep post backfill via apify/instagram-scraper (supports resultsLimit).
 * The profile-scraper actor is hard-capped at 12 latest posts; this one
 * accepts directUrls + resultsLimit (practical cap ~200).
 */
export async function scrapeInstagramPostsDeep(
  username: string,
  resultsLimit = 48,
  maxWaitMs = 240_000
): Promise<ApifyInstagramPost[]> {
  const token = getApifyToken();

  const runRes = await fetchJsonIPv4<{ data?: { id?: string; defaultDatasetId?: string; status?: string } }>(
    `https://api.apify.com/v2/acts/${POSTS_ACTOR_ID}/runs?token=${token}`,
    {
      body: {
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "posts",
        resultsLimit,
        addParentData: false,
      },
      timeoutMs: 60_000,
    }
  );
  if (!runRes.ok) {
    const text = typeof runRes.json === "string" ? runRes.json : JSON.stringify(runRes.json);
    throw new Error(`Apify deep run failed (${runRes.status}): ${text.slice(0, 300)}`);
  }

  const run = runRes.json?.data;
  const runId = run?.id as string | undefined;
  let datasetId = run?.defaultDatasetId as string | undefined;
  if (!runId) throw new Error("Apify deep run has no id");
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    await sleep(3000);
    const pollRes = await fetchJsonIPv4<{ data?: { status?: string; defaultDatasetId?: string } }>(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
    );
    const status = pollRes.json?.data?.status as string | undefined;
    datasetId = (pollRes.json?.data?.defaultDatasetId as string | undefined) ?? datasetId;
    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify deep run ${status}`);
    }
  }

  if (!datasetId) throw new Error("Apify deep run produced no dataset");
  const itemsRes = await fetchJsonIPv4<ApifyInstagramPost[]>(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`,
    { timeoutMs: 120_000 }
  );
  if (!itemsRes.ok) throw new Error(`Dataset fetch failed (${itemsRes.status})`);
  return itemsRes.json as ApifyInstagramPost[];
}
