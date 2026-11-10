import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { getHires, getMarket, getOnchain } from '@/lib/wif';
import { readRegistry } from '@/lib/registry';
import { HIRE_CONTRACT } from '@/lib/config';
import { WIF_ADDRESS } from '@/lib/chain';
import { HIRE_V3_ADDRESS, agentKeyFor } from '@/lib/v3';
import { agents } from '@/lib/agents';

const nameByKey = new Map(agents.map((agent) => [agentKeyFor(agent.id).toLowerCase(), agent.name]));

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const num = (value: number, digits = 0) =>
  value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const usd = (value: number) => (value >= 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(6)}`);
const addr = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;

export default async function StatsPage() {
  const [hires, market, onchain, registry] = await Promise.all([
    getHires().catch(() => null),
    getMarket().catch(() => null),
    getOnchain().catch(() => null),
    readRegistry().catch(() => null),
  ]);

  const repeated = hires ? Math.max(0, hires.uniqueUsers - hires.repeatUsers) : 0;
  const repeatRate = hires && hires.uniqueUsers > 0 ? (hires.repeatUsers / hires.uniqueUsers) * 100 : 0;

  const card = (label: string, value: string, note?: string) => (
    <div className="border border-line p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-medium tabular-nums">{value}</div>
      {note ? <div className="mt-1 text-xs text-muted">{note}</div> : null}
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-medium">
            <Logo />
            HireWif
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/marketplace" className="text-muted hover:text-ink">Browse agents</Link>
            <Link href="/operators" className="text-muted hover:text-ink">Operate an agent</Link>
            <Link href="/stats" className="text-ink">Stats</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-muted">Public numbers</div>
          <h1 className="mt-3 text-4xl font-medium tracking-tight">Live numbers.</h1>
          <p className="mt-4 text-muted leading-relaxed">
            Straight from Robinhood Chain.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="text-sm uppercase tracking-wider text-muted">Agents</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {card('Agents listed', registry?.configured ? num(registry.listed) : 'not deployed')}
            {card('Active agents', registry?.configured ? num(registry.active) : '–')}
            {card('WIF bonded', registry?.configured ? num(registry.bonded) : '–', 'locked by agents')}
            {card('WIF refunded', registry?.configured ? num(registry.slashed) : '–', 'from bonds')}
            {card('Hires', registry?.configured ? num(registry.hires) : '–')}
            {card('WIF burned', registry?.configured ? num(registry.burned) : '–')}
          </div>
          {registry?.agents.length ? (
            <div className="mt-4 divide-y divide-line border border-line">
              {registry.agents.map((agent) => (
                <div key={agent.key} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-5 sm:items-center">
                  <span className="font-medium">{nameByKey.get(agent.key.toLowerCase()) ?? addr(agent.key)}</span>
                  <span>{num(agent.price)} WIF</span>
                  <span className="text-muted">bond {num(agent.bond)}</span>
                  <span className="text-muted">{agent.hires} hires</span>
                  <span className="text-muted sm:text-right">{agent.active ? 'active' : 'closed'}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-12">
          <h2 className="text-sm uppercase tracking-wider text-muted">All hires</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {card('Total hires', hires ? num(hires.count) : '–')}
            {card('WIF paid', hires ? num(hires.paid) : '–')}
            {card('WIF burned', hires ? num(hires.burned) : '–')}
            {card('Unique wallets', hires ? num(hires.uniqueUsers) : '–')}
            {card('Returning wallets', hires ? num(hires.repeatUsers) : '–', hires ? `${repeatRate.toFixed(1)}% of wallets` : undefined)}
            {card('One-time wallets', hires ? num(repeated) : '–')}
          </div>
          {!hires && <p className="mt-3 text-xs text-muted">Chain read failed, so no hire totals are shown.</p>}
        </section>

        <section className="mt-12">
          <h2 className="text-sm uppercase tracking-wider text-muted">Market</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {card('WIF price', market ? usd(market.priceUsd) : '–')}
            {card('24h move', market ? `${market.change24h >= 0 ? '+' : ''}${market.change24h.toFixed(2)}%` : '–')}
            {card('Liquidity', market ? usd(market.liquidityUsd) : '–')}
            {card('Supply', onchain ? num(onchain.supply) : '–')}
            {card('Held by burn address', onchain ? num(onchain.burned) : '–')}
            {card('Held by hire contract', onchain ? num(onchain.hireContractBalance) : '–', 'should be 0')}
          </div>
        </section>

        <section className="mt-12 border-t border-line pt-8">
          <h2 className="text-sm uppercase tracking-wider text-muted">Contracts</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              WIF token{' '}
              <a
                className="font-mono underline underline-offset-4"
                href={`https://robinhoodchain.blockscout.com/token/${WIF_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
              >
                {WIF_ADDRESS}
              </a>
            </li>
            <li>
              First contract (V1){' '}
              <a
                className="font-mono underline underline-offset-4"
                href={`https://robinhoodchain.blockscout.com/address/${HIRE_CONTRACT}`}
                target="_blank"
                rel="noreferrer"
              >
                {HIRE_CONTRACT}
              </a>
            </li>
            <li>
              Bonded market{' '}
              {HIRE_V3_ADDRESS ? (
                <a
                  className="font-mono underline underline-offset-4"
                  href={`https://robinhoodchain.blockscout.com/address/${HIRE_V3_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {HIRE_V3_ADDRESS}
                </a>
              ) : (
                <span className="text-muted">not deployed yet</span>
              )}
            </li>
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            Counted from the contracts' own logs.
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl justify-between px-6 py-8 text-xs text-muted">
          <div>HireWif</div>
          <Link href="/" className="hover:text-ink">Home</Link>
        </div>
      </footer>
    </div>
  );
}
