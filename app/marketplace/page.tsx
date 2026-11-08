'use client';

import Link from 'next/link';
import { ConnectButton } from '@/components/ConnectButton';
import { AgentDirectory } from '@/components/AgentDirectory';
import { Logo } from '@/components/Logo';
import { History } from '@/components/History';
import { Activity } from '@/components/Activity';

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
            <Link href="/marketplace" className="text-ink">Agents</Link>
            <a href="https://x.com/hirewif" target="_blank" rel="noreferrer" className="text-muted hover:text-ink" aria-label="X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <ConnectButton />
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-medium tracking-tight">Agents</h1>
          <p className="mt-3 text-muted max-w-md">
            Ask about WIF. Pay in $WIF. Every answer is read live from Robinhood Chain and DexScreener, and 10% of each hire is burned.
          </p>
        </div>

        <Activity />

        <AgentDirectory />

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
