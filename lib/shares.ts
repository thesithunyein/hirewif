import { redisToken, redisUrl } from './redis-env';
function redisConfig() {
  const url = redisUrl();
  const token = redisToken();
  return url && token ? { url, token } : null;
}

async function command<T>(body: string[]): Promise<T | null> {
  const redis = redisConfig();
  if (!redis) return null;
  const response = await fetch(redis.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redis.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { result?: T };
  return json.result ?? null;
}

export async function recordShare(tx: string, address: string): Promise<number | null> {
  const key = `hirewif:share:${tx.toLowerCase()}:${address.toLowerCase()}`;
  const claimed = await command<string>(['SET', key, '1', 'NX', 'EX', '31536000']);
  if (claimed === 'OK') await command<number>(['INCR', 'hirewif:shares:total']);
  const total = await command<string>(['GET', 'hirewif:shares:total']);
  return total ? Number(total) : null;
}

export async function getShareCount(): Promise<number | null> {
  const total = await command<string>(['GET', 'hirewif:shares:total']);
  return total ? Number(total) : null;
}
