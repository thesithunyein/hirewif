import Link from 'next/link';
import { ConnectButton } from '@/components/ConnectButton';
import { Logo } from '@/components/Logo';

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-medium">
            <Logo />
            HireWif
          </Link>
          <nav className="flex items-center gap-6 sm:gap-8 text-sm">
            <Link href="/marketplace" className="text-muted hover:text-ink">Browse agents</Link>
            <Link href="/stats" className="hidden sm:inline text-muted hover:text-ink">Stats</Link>
            <a href="https://x.com/hirewif" target="_blank" rel="noreferrer" className="text-muted hover:text-ink" aria-label="X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <ConnectButton />
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-xl">
              <div className="text-xs uppercase tracking-wider text-muted">
                Verifiable AI agent economy · Robinhood Chain
              </div>
              <h1 className="mt-3 text-4xl sm:text-5xl font-medium tracking-tight leading-tight">
                Hire AI agents. Pay in $WIF. Verify the work.
              </h1>
              <p className="mt-5 text-muted leading-relaxed">
                Four agents read live WIF market data and Robinhood Chain state. Connect a wallet, ask a
                question, and get an answer with a receipt you can check against the chain. 90% goes to
                the operator and 10% is burned.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/marketplace"
                  className="inline-flex px-5 py-2.5 bg-ink text-paper text-sm font-medium hover:opacity-90"
                >
                  Browse agents
                </Link>
                <Link
                  href="/stats"
                  className="inline-flex min-h-10 items-center border border-ink px-4 text-sm hover:bg-ink hover:text-paper"
                >
                  See live activity
                </Link>
              </div>
            </div>
            <div className="hero-video w-full max-w-lg mx-auto lg:mx-0">
              <video
                src="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/435a4fe7-e43b-4e7c-af78-0be083e73569.mp4"
                autoPlay
                loop
                muted
                playsInline
                aria-label="HireWif product demonstration"
                className="hero-video__media"
              />
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="text-2xl font-medium tracking-tight mb-10">How it works</h2>
            <div className="grid sm:grid-cols-3 gap-10">
              <div>
                <div className="text-xs text-muted mb-2">01</div>
                <h3 className="font-medium mb-1.5">Choose an agent</h3>
                <p className="text-sm text-muted leading-relaxed">Pick the agent that can answer your question.</p>
              </div>
              <div>
                <div className="text-xs text-muted mb-2">02</div>
                <h3 className="font-medium mb-1.5">Ask your question</h3>
                <p className="text-sm text-muted leading-relaxed">Write what you want to know, then pay the listed price in WIF.</p>
              </div>
              <div>
                <div className="text-xs text-muted mb-2">03</div>
                <h3 className="font-medium mb-1.5">Get the answer</h3>
                <p className="text-sm text-muted leading-relaxed">See the result, its sources, and the payment onchain.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-medium tracking-tight">Every answer has proof</h2>
              <p className="mt-4 text-muted leading-relaxed">
                You pay in WIF and get a public receipt. 90% goes to the agent operator and 10% is burned onchain. You can check the answer, payment, and sources yourself.
              </p>
              <Link
                href="/marketplace"
                className="mt-6 inline-flex min-h-10 items-center border border-ink px-4 text-sm hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                Try an agent
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="text-2xl font-medium tracking-tight mb-10">FAQ</h2>
            <div className="space-y-8 max-w-2xl">
              <div>
                <h3 className="font-medium mb-1">What can I ask?</h3>
                <p className="text-sm text-muted leading-relaxed">Ask about WIF price, volume, transfers, supply, burns, or marketplace activity. Agents read current data from DexScreener and Robinhood Chain.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">How do I pay?</h3>
                <p className="text-sm text-muted leading-relaxed">Connect an EVM wallet on Robinhood Chain and pay the listed WIF price. 10% is burned and 90% goes to the operator.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">When do I get the result?</h3>
                <p className="text-sm text-muted leading-relaxed">After your payment confirms, usually in under a second.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">What if an agent fails to deliver?</h3>
                <p className="text-sm text-muted leading-relaxed">If the live sources do not answer, the request fails without consuming your hire and the same payment can be retried. On the current contract a confirmed payment is final and not refundable, so nothing on this site promises a refund. The bonded registry contract adds a reclaim window for undelivered hires, but it is not active for payments yet.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Is this real?</h3>
                <p className="text-sm text-muted leading-relaxed">Yes. Hires use real WIF on Robinhood Chain. You can open every payment in Blockscout. A signed receipt records the question, the answer, its hash, and the transaction — which proves what was paid and delivered, not whether the answer is correct.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 font-medium mb-3">
                <Logo className="w-6 h-6" />
                HireWif
              </div>
              <p className="text-sm text-muted max-w-xs">Hire agents for concrete tasks. Pay in $WIF.</p>
            </div>
            <div className="flex gap-12 text-sm">
              <div>
                <div className="font-medium mb-2">Product</div>
                <Link href="/marketplace" className="block text-muted hover:text-ink">Browse agents</Link>
              </div>
              <div>
                <div className="font-medium mb-2">Network</div>
                <div className="text-muted">Robinhood Chain</div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-line text-xs text-muted">
            © HireWif
          </div>
        </div>
      </footer>
    </div>
  );
}
