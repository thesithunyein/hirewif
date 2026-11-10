import { redisToken, redisUrl } from './redis-env';
const localClaims = new Set<string>();

function redisConfig() {
  const url = redisUrl();
  const token = redisToken();
  return url && token ? { url, token } : null;
}

export async function claimRedemption(key: string, ttlSeconds = 60 * 60 * 24 * 30): Promise<boolean> {
  const redis = redisConfig();
  if (!redis) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_EPHEMERAL_REDEMPTIONS !== 'true') {
      throw new Error('Durable redemption storage is not configured');
    }
    if (localClaims.has(key)) return false;
    localClaims.add(key);
    return true;
  }

  const response = await fetch(`${redis.url}/set/${encodeURIComponent(`hirewif:redemption:${key}`)}/1?NX=true&EX=${ttlSeconds}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redis.token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Redemption store returned ${response.status}`);
  const result = (await response.json()) as { result?: string | null };
  return result.result === 'OK';
}

/** Undo a claim when the answer could not be delivered, so the same payment can be retried. */
export async function releaseRedemption(key: string): Promise<void> {
  const redis = redisConfig();
  if (!redis) {
    localClaims.delete(key);
    return;
  }
  await fetch(`${redis.url}/del/${encodeURIComponent(`hirewif:redemption:${key}`)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redis.token}` },
    cache: 'no-store',
  });
}

const localAnswers = new Map<string, string>();

/**
 * Keep the delivered answer so a buyer whose response was lost after payment and commit
 * can fetch it again. The caller has already re-verified the payer before reading it back.
 */
export async function saveAnswer(key: string, payload: unknown, ttlSeconds = 60 * 60 * 24 * 30): Promise<void> {
  const value = JSON.stringify(payload);
  const redis = redisConfig();
  if (!redis) {
    localAnswers.set(key, value);
    return;
  }
  try {
    await fetch(`${redis.url}/set/${encodeURIComponent(`hirewif:answer:${key}`)}?EX=${ttlSeconds}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redis.token}` },
      body: value,
      cache: 'no-store',
    });
  } catch {
    // Best effort: the answer was already returned in this response.
  }
}

export async function loadAnswer<T>(key: string): Promise<T | null> {
  const redis = redisConfig();
  try {
    const raw = redis
      ? ((await (
          await fetch(`${redis.url}/get/${encodeURIComponent(`hirewif:answer:${key}`)}`, {
            headers: { Authorization: `Bearer ${redis.token}` },
            cache: 'no-store',
          })
        ).json()) as { result?: string | null }).result
      : localAnswers.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
