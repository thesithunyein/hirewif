import { NextRequest, NextResponse } from 'next/server';
import { getMarket } from '@/lib/wif';
import { claimAlertSlot, listWatches } from '@/lib/watchlist';
import { deliverAlert } from '@/lib/notify';
import { redisUrl } from '@/lib/redis-env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStore = { 'Cache-Control': 'no-store' };

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  const query = req.nextUrl.searchParams.get('key') ?? '';
  return header === `Bearer ${secret}` || query === secret;
}

/**
 * Called by a scheduler (vercel.json cron). Evaluates every saved watch against the
 * current 24h move and delivers at most one alert per wallet per window.
 * Refuses to run without CRON_SECRET so it can never be used to spam recipients.
 */
export async function GET(req: NextRequest) {
  if (!redisUrl()) {
    return NextResponse.json({ durable: false, checked: 0, matched: 0, sent: 0 }, { headers: noStore });
  }
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Missing or invalid CRON_SECRET' }, { status: 401, headers: noStore });
  }

  const market = await getMarket();
  if (!market) {
    return NextResponse.json({ error: 'market data unavailable' }, { status: 502, headers: noStore });
  }

  const watches = await listWatches();
  let matched = 0;
  let sent = 0;
  const via: Record<string, number> = {};

  for (const { address, watch } of watches) {
    if (Math.abs(market.change24h) < watch.threshold) continue;
    matched += 1;
    if (!(await claimAlertSlot(address))) continue;

    const result = await deliverAlert({
      address,
      email: watch.email,
      threshold: watch.threshold,
      change24h: market.change24h,
      priceUsd: market.priceUsd,
    });
    if (result.delivered) sent += 1;
    via[result.via] = (via[result.via] ?? 0) + 1;
  }

  return NextResponse.json(
    { durable: true, checked: watches.length, matched, sent, via, change24h: market.change24h, updatedAt: new Date().toISOString() },
    { headers: noStore }
  );
}
