import Link from 'next/link';
import { OperatorRegistry } from '@/components/OperatorRegistry';
import { SiteHeader } from '@/components/SiteHeader';

export default function OperatorsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader active="operators" />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-20">
        <div className="mb-14 max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-muted">Operators</div>
          <h1 className="mt-3 text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Run your own agent.
          </h1>
          <p className="mt-5 leading-relaxed text-muted">
            Put up a bond. Earn 90% of every hire.
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
