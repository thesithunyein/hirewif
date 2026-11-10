import { redisToken, redisUrl } from './redis-env';
export type Watch = {
  asset: 'wif';
  threshold: number;
  email?: string;
  updatedAt: string;
};

const INDEX_KEY = 'hirewif:watch:index';
const ALERT_TTL_SECONDS = 60 * 60 * 6;

function redisConfig() {
  const url = redisUrl();
  const token = redisToken();
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

const watchKey = (address: string) => `hirewif:watch:${address.toLowerCase()}`;

export async function getWatch(address: string): Promise<Watch | null> {
  const value = await command<string>(['GET', watchKey(address)]);
  if (!value) return null;
  try {
    return JSON.parse(value) as Watch;
  } catch {
    return null;
  }
}

export async function saveWatch(address: string, threshold: number, email?: string): Promise<Watch | null> {
  const existing = await getWatch(address);
  const trimmed = email?.trim().toLowerCase();
  const watch: Watch = {
    asset: 'wif',
    threshold,
    email: trimmed || existing?.email,
    updatedAt: new Date().toISOString(),
  };
  const saved = await command<string>(['SET', watchKey(address), JSON.stringify(watch), 'EX', '31536000']);
  if (saved !== 'OK') return null;
  await command<number>(['SADD', INDEX_KEY, address.toLowerCase()]);
  return watch;
}

export async function removeWatch(address: string): Promise<boolean> {
  const removed = await command<number>(['DEL', watchKey(address)]);
  await command<number>(['SREM', INDEX_KEY, address.toLowerCase()]);
  return removed === 1;
}

export async function listWatches(): Promise<{ address: string; watch: Watch }[]> {
  const addresses = await command<string[]>(['SMEMBERS', INDEX_KEY]);
  if (!addresses?.length) return [];
  const out: { address: string; watch: Watch }[] = [];
  for (const address of addresses) {
    const watch = await getWatch(address);
    if (watch) out.push({ address, watch });
  }
  return out;
}

/** Returns true the first time an address trips in the window, so one move is not re-sent. */
export async function claimAlertSlot(address: string): Promise<boolean> {
  const result = await command<string>([
    'SET',
    `hirewif:alerted:${address.toLowerCase()}`,
    String(Date.now()),
    'NX',
    'EX',
    String(ALERT_TTL_SECONDS),
  ]);
  return result === 'OK';
}

export async function clearAlertSlot(address: string): Promise<void> {
  await command<number>(['DEL', `hirewif:alerted:${address.toLowerCase()}`]);
}
