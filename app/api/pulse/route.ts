import { NextResponse } from 'next/server';
import { getFlow, getHires, getMarket } from '@/lib/wif';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const [market, flow, hires] = await Promise.all([
    getMarket(),
    getFlow(),
    getHires().catch(() => null),
  ]);

  const signals: string[] = [];
  if (market) {
    const turnover = market.liquidityUsd > 0 ? market.volume24h / market.liquidityUsd : 0;
    if (Math.abs(market.change24h) >= 5) {
      signals.push(`WIF is ${market.change24h > 0 ? 'up' : 'down'} ${Math.abs(market.change24h).toFixed(1)}% over 24h.`);
    }
    if (turnover >= 1) signals.push(`24h volume is ${turnover.toFixed(1)}x displayed liquidity.`);
    if (market.buys24h !== market.sells24h) {
      signals.push(`${market.buys24h > market.sells24h ? 'Buys' : 'Sells'} lead activity right now.`);
    }
  }
  if (flow && flow.largest[0]) {
    signals.push(`${flow.largest[0].value.toLocaleString('en-US', { maximumFractionDigits: 0 })} WIF moved in the largest recent transfer.`);
  }
  if (hires?.recent[0]) {
    signals.push(`${hires.recent[0].agent} was the latest paid agent hire.`);
  }

  return NextResponse.json(
    {
      market: market
        ? {
            priceUsd: market.priceUsd,
            change24h: market.change24h,
            liquidityUsd: market.liquidityUsd,
            volume24h: market.volume24h,
            buys24h: market.buys24h,
            sells24h: market.sells24h,
          }
        : null,
      flow: flow ? { transfers: flow.transfers, hours: flow.hours } : null,
      hires: hires ? { count: hires.count, repeatUsers: hires.repeatUsers } : null,
      signals: signals.slice(0, 4),
      updatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
