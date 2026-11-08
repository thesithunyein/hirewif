'use client';

import { useEffect, useState } from 'react';

type Hire = {
  user: string;
  agent: string;
  paid: number;
  burned: number;
  tx: string;
  block: number;
};

type Stats = {
  count: number;
  paid: number;
  burned: number;
  agents: { agent: string; paid: number; hires: number }[];
  recent: Hire[];
  updatedAt: string;
};

const num = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const addr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function Activity() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/stats')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: Stats) => {
          if (alive) {
            setStats(d);
            setFailed(false);
          }
        })
        .catch(() => alive && setFailed(true));
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const card = (label: string, value: string) => (
    <div className="border border-line px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );

  return (
    <div className="mb-10">
      <div className="flex gap-6 text-sm">
        {card('Hires', stats ? num(stats.count) : '—')}
        {card('WIF paid', stats ? num(stats.paid) : '—')}
        {card('WIF burned', stats ? num(stats.burned) : '—')}
        {card('Agents hired', stats ? num(stats.agents.length) : '—')}
      </div>

      <div className="mt-3 text-xs text-muted">
        {failed
          ? 'Chain read failed. Numbers stay blank rather than showing a guess.'
          : stats
            ? `Read from Robinhood Chain · Hired events · updated ${new Date(stats.updatedAt).toISOString().slice(11, 16)} UTC`
            : 'Reading the chain…'}
      </div>

      {stats && stats.recent.length > 0 && (
        <div className="mt-6 border border-line">
          <div className="px-4 py-2 border-b border-line text-xs text-muted">Latest hires</div>
          <div className="divide-y divide-line">
            {stats.recent.map((h) => (
              <div key={h.tx} className="px-4 py-2.5 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-medium">{h.agent}</span>
                <span>{num(h.paid)} WIF</span>
                <span className="text-muted">{addr(h.user)}</span>
                <a
                  href={`https://robinhoodchain.blockscout.com/tx/${h.tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted underline ml-auto"
                >
                  {addr(h.tx)}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
