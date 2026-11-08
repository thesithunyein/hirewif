type Watch = { asset: 'wif'; threshold: number; updatedAt: string };

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function command<T>(body: unknown[]): Promise<T | null> {
  const redis = redisConfig();
  if (!redis) return null;
  const response = await fetch(redis.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redis.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { result?: T };
  return json.result ?? null;
}

export async function getWatch(address: string): Promise<Watch | null> {
  const value = await command<string>(['GET', `hirewif:watch:${address.toLowerCase()}`]);
  if (!value) return null;
  try {
    return JSON.parse(value) as Watch;
  } catch {
    return null;
  }
}

export async function saveWatch(address: string, threshold: number): Promise<Watch | null> {
  const watch: Watch = { asset: 'wif', threshold, updatedAt: new Date().toISOString() };
  const saved = await command<string>([
    'SET',
    `hirewif:watch:${address.toLowerCase()}`,
    JSON.stringify(watch),
    'EX',
    '31536000',
  ]);
  return saved === 'OK' ? watch : null;
}

export async function removeWatch(address: string): Promise<boolean> {
  const result = await command<number>(['DEL', `hirewif:watch:${address.toLowerCase()}`]);
  return result === 1;
}
