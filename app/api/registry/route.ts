import { NextResponse } from 'next/server';
import { readRegistry } from '@/lib/registry';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const snapshot = await readRegistry();
  return NextResponse.json(
    { ...snapshot, updatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
