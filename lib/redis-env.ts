/**
 * Upstash REST credentials under whichever names the host created them.
 * Set by hand they are UPSTASH_REDIS_REST_URL / _TOKEN; Vercel's Upstash integration
 * writes KV_REST_API_URL / _TOKEN, or <PREFIX>_REST_API_URL / _TOKEN with a custom prefix.
 */
function find(exact: string, suffix: string): string | undefined {
  if (process.env[exact]) return process.env[exact];
  if (process.env[`KV${suffix}`]) return process.env[`KV${suffix}`];
  const key = Object.keys(process.env).find((name) => name.endsWith(suffix) && !name.includes('READ_ONLY'));
  return key ? process.env[key] : undefined;
}

export function redisUrl(): string | undefined {
  return find('UPSTASH_REDIS_REST_URL', '_REST_API_URL');
}

export function redisToken(): string | undefined {
  return find('UPSTASH_REDIS_REST_TOKEN', '_REST_API_TOKEN');
}
