'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

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
  history: {
    at: number;
    pricePct: number | null;
    liquidityPct: number | null;
    transferDelta: number;
    hireDelta: number;
    burnedDelta: number;
  } | null;
  signals: string[];
  updatedAt: string;
};

const usd = (n: number) => n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(6)}`;

export function Pulse() {
  const { address } = useAccount();
  const [data, setData] = useState<PulseData | null>(null);
  const [failed, setFailed] = useState(false);
  const [following, setFollowing] = useState(false);
  const [lastVisit, setLastVisit] = useState<{ at: number; priceUsd: number; change24h: number } | null>(null);
  const [threshold, setThreshold] = useState(5);

  useEffect(() => {
    const saved = localStorage.getItem('hirewif-follow-wif');
    setFollowing(saved === 'true');
    const savedThreshold = Number(localStorage.getItem('hirewif-wif-threshold'));
    if (savedThreshold) setThreshold(savedThreshold);
    if (address) {
      fetch(`/api/watchlist?address=${address}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((value: { watch?: { threshold: number } } | null) => {
          if (value?.watch) {
            setFollowing(true);
            setThreshold(value.watch.threshold);
            localStorage.setItem('hirewif-follow-wif', 'true');
            localStorage.setItem('hirewif-wif-threshold', String(value.watch.threshold));
          }
        })
        .catch(() => undefined);
    }
    const previous = localStorage.getItem('hirewif-pulse-last-visit');
    if (previous) {
      try {
        setLastVisit(JSON.parse(previous));
      } catch {
        localStorage.removeItem('hirewif-pulse-last-visit');
      }
    }
    fetch('/api/pulse', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('pulse unavailable'))))
      .then((value: PulseData) => {
        setData(value);
        if (value.market) {
          localStorage.setItem(
            'hirewif-pulse-last-visit',
            JSON.stringify({ at: Date.now(), priceUsd: value.market.priceUsd, change24h: value.market.change24h })
          );
        }
      })
      .catch(() => setFailed(true));
  }, [address]);

  const toggleFollowing = () => {
    const next = !following;
    setFollowing(next);
    localStorage.setItem('hirewif-follow-wif', String(next));
    if (address) {
      fetch(next ? '/api/watchlist' : `/api/watchlist?address=${address}`, {
        method: next ? 'POST' : 'DELETE',
        headers: next ? { 'Content-Type': 'application/json' } : undefined,
        body: next ? JSON.stringify({ address, threshold }) : undefined,
      }).catch(() => undefined);
    }
  };

  const updateThreshold = async (value: number) => {
    setThreshold(value);
    localStorage.setItem('hirewif-wif-threshold', String(value));
    if (address && following) {
      fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, threshold: value }),
      }).catch(() => undefined);
    }
  };

  const sinceLastVisit = data?.market && lastVisit && lastVisit.priceUsd > 0
    ? ((data.market.priceUsd - lastVisit.priceUsd) / lastVisit.priceUsd) * 100
    : null;

  return (
    <section className="mb-14 border-y border-line py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">WIF Pulse</div>
          <h2 className="mt-1 text-xl font-medium tracking-tight">What changed onchain?</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            A live signal layer for WIF. Check back when the market moves, then pay an agent to explain what matters.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleFollowing}
            className={`inline-flex min-h-10 items-center border px-3 text-xs transition-colors duration-100 ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
              following ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'
            }`}
          >
            {following ? 'Following WIF' : 'Follow WIF'}
          </button>
          <Link
            href="#agent-research"
            className="inline-flex min-h-10 items-center border border-line px-3 text-xs hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            Unlock deep read
          </Link>
        </div>
      </div>

      {failed ? (
        <p className="mt-5 text-sm text-muted">Pulse is temporarily unavailable. Try again shortly.</p>
      ) : !data ? (
        <p className="mt-5 text-sm text-muted">Reading live WIF activity…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted">Price</div>
              <div className="mt-1 font-mono text-sm tabular-nums">{data.market ? usd(data.market.priceUsd) : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted">24h move</div>
              <div className="mt-1 font-mono text-sm tabular-nums">{data.market ? `${data.market.change24h >= 0 ? '+' : ''}${data.market.change24h.toFixed(2)}%` : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Recent transfers</div>
              <div className="mt-1 font-mono text-sm tabular-nums">{data.flow?.transfers.toLocaleString('en-US') ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Repeat wallets</div>
              <div className="mt-1 font-mono text-sm tabular-nums">{data.hires?.repeatUsers ?? 0}</div>
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
          {sinceLastVisit !== null && (
            <div className="mt-4 border-t border-line pt-4 text-sm">
              <span className="font-medium">Since your last visit:</span>{' '}
              WIF is {sinceLastVisit >= 0 ? 'up' : 'down'} {Math.abs(sinceLastVisit).toFixed(2)}%.
            </div>
          )}
          {data.history && (
            <div className="mt-4 border-t border-line pt-4 text-sm">
              <span className="font-medium">Since the last saved pulse:</span>{' '}
              {data.history.pricePct !== null ? `price ${data.history.pricePct >= 0 ? 'up' : 'down'} ${Math.abs(data.history.pricePct).toFixed(2)}%` : 'price unavailable'}
              {data.history.liquidityPct !== null ? ` · liquidity ${data.history.liquidityPct >= 0 ? 'up' : 'down'} ${Math.abs(data.history.liquidityPct).toFixed(2)}%` : ''}
              {data.history.hireDelta > 0 ? ` · ${data.history.hireDelta} new hire${data.history.hireDelta === 1 ? '' : 's'}` : ''}
              {data.history.burnedDelta > 0 ? ` · ${data.history.burnedDelta.toLocaleString('en-US')} WIF burned` : ''}
            </div>
          )}
          {following && data.market && Math.abs(data.market.change24h) >= threshold && (
            <div className="mt-4 border border-ink p-3 text-sm">
              <span className="font-medium">WIF alert:</span>{' '}
              the 24h move crossed your {threshold}% threshold. Unlock Research for the sourced explanation.
            </div>
          )}
          <div className="mt-4 text-xs text-muted">
            Updated {new Date(data.updatedAt).toISOString().slice(11, 16)} UTC · {following ? 'your watch is saved on this device' : 'follow WIF to track changes when you return'}
          </div>
          {following && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>Alert me at</span>
              {[3, 5, 10].map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => updateThreshold(value)}
                  className={`min-h-10 border px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${threshold === value ? 'border-ink text-ink' : 'border-line hover:border-ink'}`}
                >
                  {value}%
                </button>
              ))}
              <span>24h move</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
