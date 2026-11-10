import type { Flow, Hires, Market } from './wif';
import { redisToken, redisUrl } from './redis-env';

type Snapshot = {
  at: number;
  priceUsd: number;
  liquidityUsd: number;
  transfers: number;
  hires: number;
  burned: number;
};

function redisConfig() {
  const url = redisUrl();
  const token = redisToken();
  return url && token ? { url, token } : null;
}

export async function recordPulseSnapshot(market: Market | null, flow: Flow | null, hires: Hires | null) {
  const redis = redisConfig();
  if (!redis) return null;
  const response = await fetch(redis.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redis.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', 'hirewif:pulse-snapshot']),
    cache: 'no-store',
  });
  const previousRaw = response.ok ? ((await response.json()) as { result?: string }).result : null;
  const current: Snapshot = {
    at: Date.now(),
    priceUsd: market?.priceUsd ?? 0,
    liquidityUsd: market?.liquidityUsd ?? 0,
    transfers: flow?.transfers ?? 0,
    hires: hires?.count ?? 0,
    burned: hires?.burned ?? 0,
  };
  await fetch(redis.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redis.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', 'hirewif:pulse-snapshot', JSON.stringify(current), 'EX', '604800']),
    cache: 'no-store',
  });
  if (!previousRaw) return null;
  try {
    const previous = JSON.parse(previousRaw) as Snapshot;
    if (Date.now() - previous.at < 60 * 60 * 1000) return null;
    return {
      at: previous.at,
      pricePct: previous.priceUsd > 0 && current.priceUsd > 0 ? ((current.priceUsd - previous.priceUsd) / previous.priceUsd) * 100 : null,
      liquidityPct: previous.liquidityUsd > 0 && current.liquidityUsd > 0 ? ((current.liquidityUsd - previous.liquidityUsd) / previous.liquidityUsd) * 100 : null,
      transferDelta: current.transfers - previous.transfers,
      hireDelta: current.hires - previous.hires,
      burnedDelta: current.burned - previous.burned,
    };
  } catch {
    return null;
  }
}
