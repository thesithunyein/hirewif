'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type PulseData = {
  market: {
    priceUsd: number;
    change24h: number;
    liquidityUsd: number;
    volume24h: number;
    buys24h: number;
    sells24h: number;
  } | null;
  flow: { transfers: number; hours: number } | null;
  hires: { count: number; repeatUsers: number } | null;
  signals: string[];
  updatedAt: string;
};

const usd = (n: number) => n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(6)}`;

export function Pulse() {
  const [data, setData] = useState<PulseData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/api/pulse', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('pulse unavailable'))))
      .then((value: PulseData) => setData(value))
      .catch(() => setFailed(true));
  }, []);

  return (
    <section className="mb-12 border border-line bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">WIF Pulse</div>
          <h2 className="mt-1 text-xl font-medium tracking-tight">What changed onchain?</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            A live signal layer for WIF. Check back when the market moves, then pay an agent to explain what matters.
          </p>
        </div>
        <Link
          href="#agent-research"
          className="inline-flex min-h-10 items-center border border-line px-3 text-xs hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          Unlock deep read
        </Link>
      </div>

      {failed ? (
        <p className="mt-5 text-sm text-muted">Pulse is temporarily unavailable. Try again shortly.</p>
      ) : !data ? (
        <p className="mt-5 text-sm text-muted">Reading live WIF activity…</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="border border-line p-3">
              <div className="text-xs text-muted">Price</div>
              <div className="mt-1 font-mono text-sm">{data.market ? usd(data.market.priceUsd) : '—'}</div>
            </div>
            <div className="border border-line p-3">
              <div className="text-xs text-muted">24h move</div>
              <div className="mt-1 font-mono text-sm">{data.market ? `${data.market.change24h >= 0 ? '+' : ''}${data.market.change24h.toFixed(2)}%` : '—'}</div>
            </div>
            <div className="border border-line p-3">
              <div className="text-xs text-muted">Recent transfers</div>
              <div className="mt-1 font-mono text-sm">{data.flow?.transfers.toLocaleString('en-US') ?? '—'}</div>
            </div>
            <div className="border border-line p-3">
              <div className="text-xs text-muted">Repeat wallets</div>
              <div className="mt-1 font-mono text-sm">{data.hires?.repeatUsers ?? 0}</div>
            </div>
          </div>
          {data.signals.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <div className="text-xs uppercase tracking-wider text-muted">Live signals</div>
              <ul className="mt-2 space-y-1 text-sm">
                {data.signals.map((signal) => <li key={signal}>• {signal}</li>)}
              </ul>
            </div>
          )}
          <div className="mt-4 text-xs text-muted">
            Updated {new Date(data.updatedAt).toISOString().slice(11, 16)} UTC · free headline, paid explanation
          </div>
        </>
      )}
    </section>
  );
}
