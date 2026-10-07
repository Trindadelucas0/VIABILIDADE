import { AppError } from "./errors";

const buckets = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function recentHits(key: string) {
  const now = Date.now();
  return (buckets.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
}

export function assertUnderLimit(key: string) {
  if (recentHits(key).length >= MAX_ATTEMPTS) {
    throw new AppError(429, "RATE_LIMITED", "Muitas tentativas. Tente novamente em alguns minutos.");
  }
}

export function recordLimitHit(key: string) {
  const hits = recentHits(key);
  hits.push(Date.now());
  buckets.set(key, hits);
}
