import Link from 'next/link';
import { verifyReceipt, type ReceiptPayload } from '@/lib/receipt';
import { SiteHeader } from '@/components/SiteHeader';

export const dynamic = 'force-dynamic';

type Params = { [key: string]: string | string[] | undefined };

const one = (value: string | string[] | undefined): string => (typeof value === 'string' ? value : '');

export default function ReportPage({ searchParams }: { searchParams: Params }) {
  // Preferred path: the server signed this payload, so the numbers cannot be edited.
  const token = one(searchParams.r);
  const verified: ReceiptPayload | null = token ? verifyReceipt(token) : null;

  // Legacy links still render, but they are explicitly not proof.
  const legacy: ReceiptPayload | null =
    !verified && one(searchParams.name) && one(searchParams.task) && one(searchParams.result)
      ? {
          v: 1,
          agent: one(searchParams.agent),
          name: one(searchParams.name),
          task: one(searchParams.task),
          result: one(searchParams.result),
          resultHash: '',
          price: one(searchParams.price),
          burn: one(searchParams.burn),
          operator: one(searchParams.operator),
          tx: one(searchParams.tx),
          at: '',
        }
      : null;

  const report = verified ?? legacy;
  const trusted = verified !== null;

  return (
    <div className="min-h-screen">
      <SiteHeader active="other" />

      <main className="mx-auto max-w-3xl px-6 py-16">
        {!report ? (
          <div className="border border-line p-6">
            <h1 className="text-2xl font-medium tracking-tight">Report not found</h1>
            <p className="mt-3 max-w-lg text-muted">
              This link does not include a verified answer. Choose an agent to ask a new question.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex min-h-10 items-center bg-ink px-4 text-sm text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              Choose an agent
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span className="uppercase tracking-wider">Public answer receipt</span>
              <span className="inline-flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${trusted ? 'bg-green-500' : 'bg-yellow-500'}`}
                  aria-hidden="true"
                />
                {trusted ? 'Signature verified' : 'Unverified link'}
              </span>
            </div>

            {!trusted && (
              <p className="mt-4 border border-yellow-600/40 bg-soft p-3 text-xs leading-relaxed text-muted">
                This receipt was not signed by the server, so the numbers below could have been typed by anyone.
                Treat the payment figures as a claim, not proof. Ask the agent again to get a signed receipt.
              </p>
            )}

            <h1 className="mt-5 text-3xl font-medium tracking-tight">{report.name}</h1>
            <p className="mt-3 text-muted">Question: {report.task}</p>

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

            <div className="mt-3 border border-line p-4">
              <div className="text-xs text-muted">Result hash (sha256)</div>
              <div className="mt-1 break-all font-mono text-xs">
                {report.resultHash || 'Not included in unsigned links'}
              </div>
            </div>

            <div className="mt-8 border-t border-line pt-5 text-xs leading-relaxed text-muted">
              <div className="font-medium text-ink">What this proves</div>
              <p className="mt-2">
                The payment is a real WIF transfer on Robinhood Chain: the payer funded the listed
                price, the burn share reached the burn address, and the remainder reached the
                operator. The result hash binds this text to this receipt. None of that says the
                answer is factually correct. It shows that this agent produced it for this question and
                was paid for it.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
              {report.tx ? (
                <a
                  href={`https://robinhoodchain.blockscout.com/tx/${report.tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-10 inline-flex items-center underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                >
                  Check payment
                </a>
              ) : null}
              <Link
                href={`/marketplace#agent-${report.agent}`}
                className="min-h-10 inline-flex items-center bg-ink px-4 text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                Ask {report.name} again
              </Link>
            </div>

            <p className="mt-8 border-t border-line pt-5 text-xs leading-relaxed text-muted">
              {trusted
                ? `Signed by the HireWif server${report.at ? ` at ${report.at.replace('T', ' ').slice(0, 16)} UTC` : ''}. The answer is built from live market and Robinhood Chain data, and the payment is onchain.`
                : 'This link is unsigned. Ask the agent again to receive a signed receipt.'}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
