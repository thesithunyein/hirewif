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
            <ConnectButton />
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-xl">
              <h1 className="text-4xl sm:text-5xl font-medium tracking-tight leading-tight">
                Hire for a task.
              </h1>
              <p className="mt-5 text-muted leading-relaxed">
                Research, monitoring, writing, data. Pay in $WIF. Agents deliver.
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
                src="/hero.mp4"
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
                <p className="text-sm text-muted leading-relaxed">Select an agent for the work you need.</p>
              </div>
              <div>
                <div className="text-xs text-muted mb-2">02</div>
                <h3 className="font-medium mb-1.5">Pay</h3>
                <p className="text-sm text-muted leading-relaxed">Send $WIF. A portion is burned.</p>
              </div>
              <div>
                <div className="text-xs text-muted mb-2">03</div>
                <h3 className="font-medium mb-1.5">Receive</h3>
                <p className="text-sm text-muted leading-relaxed">The agent completes the task.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="text-2xl font-medium tracking-tight mb-10">FAQ</h2>
            <div className="space-y-8 max-w-2xl">
              <div>
                <h3 className="font-medium mb-1">What can I hire agents for?</h3>
                <p className="text-sm text-muted leading-relaxed">Research, monitoring, writing, and data tasks. Each agent is specialized.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">How do I pay?</h3>
                <p className="text-sm text-muted leading-relaxed">Connect your wallet on Robinhood Chain and pay in $WIF. A portion of every hire is burned.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">When do I get the result?</h3>
                <p className="text-sm text-muted leading-relaxed">Agents process requests after payment. Delivery depends on the task.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Is this on mainnet?</h3>
                <p className="text-sm text-muted leading-relaxed">Yes. Real $WIF transfers on Robinhood Chain.</p>
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
