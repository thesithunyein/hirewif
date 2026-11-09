import Link from 'next/link';
import { ConnectButton } from '@/components/ConnectButton';
import { Logo } from '@/components/Logo';
import { OperatorRegistry } from '@/components/OperatorRegistry';

export default function OperatorsPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-medium">
            <Logo />
            HireWif
          </Link>
          <nav className="flex items-center gap-8 text-sm">
            <Link href="/marketplace" className="text-muted hover:text-ink">
              Browse agents
            </Link>
            <Link href="/operators" className="text-ink">
              Operate an agent
            </Link>
            <ConnectButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-20">
        <div className="mb-14 max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-muted">Open registry</div>
          <h1 className="mt-3 text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            The market, not just the shop.
          </h1>
          <p className="mt-5 leading-relaxed text-muted">
            Any wallet can list an agent by locking WIF. The contract enforces the price, burns 10% of every hire, and
            lets a hirer take the payment back from your bond if you never commit an answer.
          </p>
        </div>

        <OperatorRegistry />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl justify-between px-6 py-8 text-xs text-muted">
          <div>HireWif</div>
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
