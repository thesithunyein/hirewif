import { NextResponse } from 'next/server';
import { agents } from '@/lib/agents';
import { getHires } from '@/lib/wif';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const hires = await getHires().catch(() => null);
  const byAgent = new Map((hires?.agents ?? []).map((a) => [a.agent, a]));

  const list = agents.map((a) => {
    const stat = byAgent.get(a.id);
    return {
      ...a,
      paid: stat?.paid ?? 0,
      hires: stat?.hires ?? 0,
    };
  });

  return NextResponse.json(
    {
      agents: list,
      chainOk: hires !== null,
      updatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
