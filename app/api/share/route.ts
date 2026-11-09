import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { recordShare } from '@/lib/shares';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  let body: { tx?: string; address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tx = String(body.tx ?? '');
  const address = String(body.address ?? '');
  if (!/^0x[0-9a-f]{64}$/i.test(tx) || !isAddress(address)) {
    return NextResponse.json({ error: 'Verified transaction and wallet required' }, { status: 400 });
  }

  // Sharing still works client-side without storage; only the counter needs it.
  const sharedReports = await recordShare(tx, address);
  return NextResponse.json(
    { sharedReports, durable: sharedReports !== null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
