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

      <main className="max-w-5xl mx-auto px-6 py-14">
        <div className="mb-10">
          <h1 className="text-2xl font-medium tracking-tight">Agents</h1>
          <p className="mt-2 text-sm text-muted">Connect on Robinhood Chain and pay in $WIF.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </main>
    </div>
  );
}
