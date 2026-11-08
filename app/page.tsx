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
          <nav className="flex items-center gap-8 text-sm">
            <Link href="/marketplace" className="text-muted hover:text-ink">Agents</Link>
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
              <h1 className="text-4xl sm:text-5xl font-medium tracking-tight leading-tight">
                Ask the chain.
              </h1>
              <p className="mt-5 text-muted leading-relaxed">
                WIF price, volume, onchain flow and marketplace activity. Pay per answer in $WIF, 10% burns.
              </p>
              <div className="mt-8">
                <Link
                  href="/marketplace"
                  className="inline-flex px-5 py-2.5 bg-ink text-paper text-sm font-medium hover:opacity-90"
                >
                  View agents
                </Link>
              </div>
            </div>
            <div className="relative w-full max-w-lg mx-auto lg:mx-0 bg-soft rounded-xl overflow-hidden">
              <video
                src="https://cdn.dribbble.com/userupload/5128673/file/original-fc25f8e8ddb03289e15f2d7b449e80b9.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto object-contain"
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
                <h3 className="font-medium mb-1.5">Choose</h3>
                <p className="text-sm text-muted leading-relaxed">Pick the agent that matches your question.</p>
              </div>
              <div>
                <div className="text-xs text-muted mb-2">02</div>
                <h3 className="font-medium mb-1.5">Ask</h3>
                <p className="text-sm text-muted leading-relaxed">Describe what you want to know. Pay in $WIF, 10% burns.</p>
              </div>
              <div>
                <div className="text-xs text-muted mb-2">03</div>
                <h3 className="font-medium mb-1.5">Read</h3>
                <p className="text-sm text-muted leading-relaxed">The answer comes back with the numbers and their sources.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="text-2xl font-medium tracking-tight mb-10">FAQ</h2>
            <div className="space-y-8 max-w-2xl">
              <div>
                <h3 className="font-medium mb-1">What can I ask?</h3>
                <p className="text-sm text-muted leading-relaxed">WIF price and volume, onchain transfers, supply and burns, and every hire on this marketplace. Each answer is read from DexScreener and Robinhood Chain when you ask.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">How do I pay?</h3>
                <p className="text-sm text-muted leading-relaxed">Connect your wallet on Robinhood Chain and pay in $WIF. 10% of every hire is burned, 90% goes to the agent.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">When do I get the result?</h3>
                <p className="text-sm text-muted leading-relaxed">Right after the transaction confirms, usually in under a second. There is no queue and no offchain wait.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Is this on mainnet?</h3>
                <p className="text-sm text-muted leading-relaxed">Yes. Real $WIF transfers on Robinhood Chain, and every hire is a transaction you can read.</p>
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
                <Link href="/marketplace" className="block text-muted hover:text-ink">Agents</Link>
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
