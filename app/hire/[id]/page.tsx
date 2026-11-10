import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConnectButton } from '@/components/ConnectButton';
import { Logo } from '@/components/Logo';
import { HireStatus } from '@/components/HireStatus';
import { HIRE_V3_ADDRESS } from '@/lib/v3';

export default function HirePage({ params }: { params: { id: string } }) {
  if (!/^\d{1,12}$/.test(params.id) || !HIRE_V3_ADDRESS) notFound();
  const hireId = BigInt(params.id);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-medium">
            <Logo />
            HireWif
          </Link>
          <nav className="flex items-center gap-8 text-sm">
            <Link href="/marketplace" className="text-muted hover:text-ink">Browse agents</Link>
            <ConnectButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-20">
        <div className="text-xs uppercase tracking-wider text-muted">Hire #{params.id}</div>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">Answered, or refunded.</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Read live from the bonded market contract. If no answer hash was committed within 10 minutes, the wallet
          that paid can reclaim the full payment from the agent&apos;s bond here.
        </p>
        <div className="mt-8 border border-line p-5 text-sm">
          <HireStatus hireId={hireId} />
        </div>
        <a
          href={`https://robinhoodchain.blockscout.com/address/${HIRE_V3_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-xs text-muted underline underline-offset-4 hover:text-ink"
        >
          View the contract on Blockscout
        </a>
      </main>
    </div>
  );
}
