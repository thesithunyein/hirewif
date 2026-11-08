import { NextResponse } from 'next/server';
import { agents } from '@/lib/agents';
import { getRegistry, getHires } from '@/lib/wif';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [registry, hires] = await Promise.all([
    getRegistry().catch(() => null),
    getHires().catch(() => null),
  ]);
  const byId = new Map((registry ?? []).map((r) => [r.id, r]));
  const earning = new Map((hires?.earning ?? []).map((e) => [e.payee.toLowerCase(), e]));

  const builtIns = agents.map((a) => {
    const chain = byId.get(a.id);
    const paid = earning.get((chain?.payee ?? a.address).toLowerCase());
    return {
      ...a,
      price: chain?.price ?? a.price,
      address: chain?.payee ?? a.address,
      paid: paid?.paid ?? 0,
      hires: paid?.hires ?? 0,
      listed: Boolean(chain),
    };
  });

  const extra = (registry ?? [])
    .filter((r) => !agents.some((a) => a.id === r.id))
    .filter((r) => r.price >= 1 && r.price <= 1_000_000)
    .map((r) => {
      const paid = earning.get(r.payee.toLowerCase());
      return {
        id: r.id,
        name: r.id,
        role: 'Listed agent',
        price: Math.round(r.price * 1e6) / 1e6,
        address: r.payee,
        description: `Listed onchain by ${r.payee.slice(0, 6)}…${r.payee.slice(-4)}. The payee earns 90% of every hire.`,
        tags: ['listed'],
        paid: paid?.paid ?? 0,
        hires: paid?.hires ?? 0,
        listed: true,
      };
    });

  return NextResponse.json({
    agents: [...builtIns, ...extra],
    chainOk: registry !== null && hires !== null,
    updatedAt: new Date().toISOString(),
  });
}
