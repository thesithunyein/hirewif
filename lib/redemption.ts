const localClaims = new Set<string>();

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
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
