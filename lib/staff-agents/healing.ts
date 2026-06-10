export type HealingResult<T> = {
  ok: true;
  value: T;
  attempts: number;
} | {
  ok: false;
  error: string;
  attempts: number;
};

/** Retry transient failures (network, Supabase blips) with backoff */
export async function withSelfHealing<T>(
  fn: () => Promise<T>,
  opts?: { maxAttempts?: number; label?: string }
): Promise<HealingResult<T>> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  const label = opts?.label ?? "operation";
  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await fn();
      return { ok: true, value, attempts: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
  }

  return { ok: false, error: `${label} failed after ${maxAttempts} attempts: ${lastError}`, attempts: maxAttempts };
}
