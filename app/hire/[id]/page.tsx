import { notFound } from 'next/navigation';
import { HireStatus } from '@/components/HireStatus';
import { HIRE_V3_ADDRESS } from '@/lib/v3';
import { SiteHeader } from '@/components/SiteHeader';

export default function HirePage({ params }: { params: { id: string } }) {
  if (!/^\d{1,12}$/.test(params.id) || !HIRE_V3_ADDRESS) notFound();
  const hireId = BigInt(params.id);

  return (
    <div className="min-h-screen">
      <SiteHeader active="other" />

      <main className="mx-auto max-w-xl px-6 py-20">
        <div className="text-xs uppercase tracking-wider text-muted">Hire #{params.id}</div>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">Answered, or paid back.</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          No answer in 10 minutes? Get your WIF back here.
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
          View contract
        </a>
      </main>
    </div>
  );
}
