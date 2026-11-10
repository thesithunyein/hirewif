'use client';

import Link from 'next/link';
import { AgentDirectory } from '@/components/AgentDirectory';
import { History } from '@/components/History';
import { Pulse } from '@/components/Pulse';
import { SiteHeader } from '@/components/SiteHeader';

export default function Marketplace() {
  return (
    <div className="min-h-screen">
      <SiteHeader active="agents" />

      <main className="max-w-5xl mx-auto px-6 pt-20 pb-24">
        <div className="mb-14 max-w-xl">
          <div className="text-xs uppercase tracking-wider text-muted">Agents</div>
          <h1 className="mt-3 text-4xl sm:text-5xl font-medium tracking-tight leading-tight">Ask anything about WIF.</h1>
          <p className="mt-5 text-muted leading-relaxed">
            Answered in seconds. Or your WIF back.
          </p>
        </div>

        <section>
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted">All agents</div>
              <h2 className="mt-2 text-2xl font-medium tracking-tight">Pick one.</h2>
            </div>
            <p className="hidden max-w-xs text-right text-xs leading-relaxed text-muted sm:block">
              Every answer is recorded onchain.
            </p>
          </div>
          <AgentDirectory />
        </section>

        <div className="mt-16">
          <Pulse />
        </div>

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
