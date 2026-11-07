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
            <div className="relative aspect-video">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              >
                <source src="/hero.webm" type="video/webm" />
                <source src="/hero.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-10">
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
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-6 flex justify-between text-xs text-muted">
          <div>HireWif</div>
          <div>Robinhood Chain</div>
        </div>
      </footer>
    </div>
  );
}
