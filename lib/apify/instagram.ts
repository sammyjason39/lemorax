const ACTOR_ID = "apify~instagram-profile-scraper";

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
