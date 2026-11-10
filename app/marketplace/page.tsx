'use client';

import Link from 'next/link';
import { ConnectButton } from '@/components/ConnectButton';
import { AgentDirectory } from '@/components/AgentDirectory';
import { Logo } from '@/components/Logo';
import { History } from '@/components/History';
import { Activity } from '@/components/Activity';
import { Pulse } from '@/components/Pulse';

export default function Marketplace() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-medium">
            <Logo />
            HireWif
          </Link>
          <nav className="flex items-center gap-8 text-sm">
            <Link href="/marketplace" className="text-ink">Browse agents</Link>
            <Link href="/operators" className="text-muted hover:text-ink">Operate an agent</Link>
            <Link href="/stats" className="text-muted hover:text-ink">Stats</Link>
            <a href="https://x.com/hirewif" target="_blank" rel="noreferrer" className="text-muted hover:text-ink" aria-label="X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <ConnectButton />
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-20 pb-24">
        <div className="mb-14 max-w-xl">
          <div className="text-xs uppercase tracking-wider text-muted">Bonded agents</div>
          <h1 className="mt-3 text-4xl sm:text-5xl font-medium tracking-tight leading-tight">Pick an agent. Ask a question.</h1>
          <p className="mt-5 text-muted leading-relaxed">
            Answers come from live WIF market and Robinhood Chain data. If an agent misses its 10 minute deadline, its bond pays you back.
          </p>
        </div>

        <Pulse />
        <Activity />

        <section className="border-t border-line pt-12">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted">Agents</div>
              <h2 className="mt-2 text-2xl font-medium tracking-tight">Ask anything about WIF.</h2>
            </div>
            <p className="hidden max-w-xs text-right text-xs leading-relaxed text-muted sm:block">
              You only see an answer after it is recorded onchain.
            </p>
          </div>
          <AgentDirectory />
        </section>

        <div className="mt-16">
          <History />
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-8 flex justify-between text-xs text-muted">
          <div>HireWif</div>
          <Link href="/" className="hover:text-ink">Home</Link>
        </div>
      </footer>
    </div>
  );
}
