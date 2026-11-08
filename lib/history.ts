import type { Market } from './wif';

type Snapshot = {
  at: number;
  priceUsd: number;
  liquidityUsd: number;
  volume24h: number;
};

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redisCommand<T>(command: string[]): Promise<T | null> {
  const redis = redisConfig();
  if (!redis) return null;
  const response = await fetch(redis.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redis.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { result?: T | null };
  return body.result ?? null;
}

export async function recordMarketSnapshot(market: Market): Promise<Snapshot | null> {
  const current: Snapshot = {
    at: Date.now(),
    priceUsd: market.priceUsd,
    liquidityUsd: market.liquidityUsd,
    volume24h: market.volume24h,
  };
  const previousRaw = await redisCommand<string>(['GET', 'hirewif:market-snapshot']);
  await redisCommand<number>(['SET', 'hirewif:market-snapshot', JSON.stringify(current), 'EX', '604800']);
  if (!previousRaw) return null;
  try {
    const previous = JSON.parse(previousRaw) as Snapshot;
    return Date.now() - previous.at >= 60 * 60 * 1000 ? previous : null;
  } catch {
    return null;
  }
}
