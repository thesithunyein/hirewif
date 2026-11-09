import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { getWatch, removeWatch, saveWatch } from '@/lib/watchlist';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Durable storage is optional. When it is missing the endpoint answers 200 with
// durable:false instead of a 503, so a missing integration never looks like a bug.
function notDurable() {
  return NextResponse.json(
    { watch: null, durable: false },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address') ?? '';
  if (!isAddress(address)) return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
  if (!process.env.UPSTASH_REDIS_REST_URL) return notDurable();
  const watch = await getWatch(address);
  return NextResponse.json({ watch, durable: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  let body: { address?: string; threshold?: number; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const address = String(body.address ?? '');
  const threshold = Number(body.threshold ?? 5);
  const email = body.email ? String(body.email).trim() : undefined;
  if (!isAddress(address) || !Number.isFinite(threshold) || threshold < 1 || threshold > 100) {
    return NextResponse.json({ error: 'Valid wallet address and threshold required' }, { status: 400 });
  }
  // Optional channel: an email only matters when a delivery provider is configured.
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'That email address does not look valid' }, { status: 400 });
  }
  if (!process.env.UPSTASH_REDIS_REST_URL) return notDurable();
  const watch = await saveWatch(address, threshold, email);
  if (!watch) return notDurable();
  return NextResponse.json({ watch, durable: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address') ?? '';
  if (!isAddress(address)) return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
  if (!process.env.UPSTASH_REDIS_REST_URL) return notDurable();
  await removeWatch(address);
  return NextResponse.json({ ok: true, durable: true }, { headers: { 'Cache-Control': 'no-store' } });
}
