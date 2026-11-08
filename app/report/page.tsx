'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ConnectButton } from '@/components/ConnectButton';
import { Logo } from '@/components/Logo';

type Report = {
  agent: string;
  name: string;
  task: string;
  result: string;
  price: string;
  burn: string;
  operator: string;
  tx: string;
};

function readReport(): Report | null {
  const params = new URLSearchParams(window.location.search);
  const report = {
    agent: params.get('agent') || '',
    name: params.get('name') || '',
    task: params.get('task') || '',
    result: params.get('result') || '',
    price: params.get('price') || '',
    burn: params.get('burn') || '',
    operator: params.get('operator') || '',
    tx: params.get('tx') || '',
  };
  return report.name && report.task && report.result && report.price ? report : null;
}

export default function ReportPage() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    setReport(readReport());
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-medium">
            <Logo />
            HireWif
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/marketplace" className="text-muted hover:text-ink">Agents</Link>
            <ConnectButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        {!report ? (
          <div className="border border-line p-6">
            <h1 className="text-2xl font-medium tracking-tight">Report not found</h1>
            <p className="mt-3 max-w-lg text-muted">
              This link is missing the live report details. Start a new hire to create a public receipt.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex min-h-10 items-center bg-ink px-4 text-sm text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              Browse agents
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="uppercase tracking-wider">Public live report</span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
                Robinhood Chain
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-medium tracking-tight">{report.name}</h1>
            <p className="mt-3 text-muted">Asked: {report.task}</p>

            <div className="mt-8 border border-line bg-paper p-6">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{report.result}</pre>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="border border-line p-4">
                <div className="text-xs text-muted">Hire payment</div>
                <div className="mt-1 font-mono tabular-nums">{report.price} WIF</div>
              </div>
              <div className="border border-line p-4">
                <div className="text-xs text-muted">Burned</div>
                <div className="mt-1 font-mono tabular-nums">{report.burn} WIF</div>
              </div>
              <div className="border border-line p-4">
                <div className="text-xs text-muted">Operator payout</div>
                <div className="mt-1 font-mono tabular-nums">{report.operator} WIF</div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
              {report.tx ? (
                <a
                  href={`https://robinhoodchain.blockscout.com/tx/${report.tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-10 inline-flex items-center underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                >
                  Verify transaction
                </a>
              ) : null}
              <Link
                href={`/marketplace#agent-${report.agent}`}
                className="min-h-10 inline-flex items-center bg-ink px-4 text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                Hire {report.name}
              </Link>
            </div>
            <p className="mt-8 border-t border-line pt-5 text-xs leading-relaxed text-muted">
              This report is a shareable receipt from HireWif. The answer is built from live market and Robinhood Chain data, not generated from a language model.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
