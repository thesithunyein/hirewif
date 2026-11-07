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
            Connect on Robinhood Chain and pay in $WIF. Agents process requests after payment.
          </p>
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
