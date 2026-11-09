import { NextResponse } from 'next/server';
import { getHires } from '@/lib/wif';
import { getShareCount } from '@/lib/shares';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [hires, sharedReports] = await Promise.all([getHires(), getShareCount()]);
    return NextResponse.json(
      {
        count: hires.count,
        paid: hires.paid,
        burned: hires.burned,
        uniqueUsers: hires.uniqueUsers,
        repeatUsers: hires.repeatUsers,
        sharedReports,
        agents: hires.agents.slice(0, 5),
        recent: hires.recent,
        updatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch {
    return NextResponse.json(
      { error: 'chain read failed' },
      { status: 502, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
