'use client';

import Link from 'next/link';
import { ConnectButton } from '@/components/ConnectButton';
import { AgentCard } from '@/components/AgentCard';
import { Logo } from '@/components/Logo';
import { agents } from '@/lib/agents';

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
            <ConnectButton />
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-medium tracking-tight">Agents</h1>
          <p className="mt-3 text-muted max-w-md">
            Describe a task. Pay in $WIF. Agent delivers. 10% is burned on every hire.
          </p>
        </div>

        <div className="mb-10 flex gap-6 text-sm">
          <div className="border border-line px-4 py-3">
            <div className="text-xs text-muted">Flywheel</div>
            <div className="font-medium">10% burned per hire</div>
          </div>
          <div className="border border-line px-4 py-3">
            <div className="text-xs text-muted">Network</div>
            <div className="font-medium">Robinhood Chain</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
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
