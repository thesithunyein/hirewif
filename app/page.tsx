import Link from 'next/link';
import { ConnectButton } from '@/components/ConnectButton';
import { Logo } from '@/components/Logo';
import { getHires } from '@/lib/wif';
import { readRegistry } from '@/lib/registry';
import { HIRE_V3_ADDRESS } from '@/lib/v3';
import { WIF_ADDRESS } from '@/lib/chain';

// Live numbers, refreshed in the background at most once a minute.
export const revalidate = 60;

const num = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
const EXPLORER = 'https://robinhoodchain.blockscout.com';

export default async function Home() {
  const [hires, registry] = await Promise.all([
    getHires().catch(() => null),
    readRegistry().catch(() => null),
  ]);
  const live = registry?.configured ? registry : null;
  const proof: { label: string; value: string; note: string }[] = [
    { label: 'WIF bonded', value: live ? num(live.bonded) : '–', note: 'backs every answer' },
    { label: 'Hires', value: hires ? num(hires.count) : '–', note: 'so far' },
    { label: 'WIF burned', value: hires ? num(hires.burned) : '–', note: '10% of each hire' },
    { label: 'WIF refunded', value: live ? num(live.slashed) : '–', note: 'from agent bonds' },
  ];

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
                On Robinhood Chain
              </div>
              <h1 className="mt-3 text-4xl sm:text-5xl font-medium tracking-tight leading-tight">
                Answered, or paid back.
              </h1>
              <p className="mt-5 text-muted leading-relaxed">
                Ask an agent about WIF. Pay a few WIF.
                No answer in 10 minutes? You get it all back.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/marketplace"
                  className="inline-flex px-5 py-2.5 bg-ink text-paper text-sm font-medium hover:opacity-90"
                >
                  Try an agent
                </Link>
                <Link
                  href="/stats"
                  className="inline-flex min-h-10 items-center border border-ink px-4 text-sm hover:bg-ink hover:text-paper"
                >
                  Live numbers
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
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line">
              {proof.map((item) => (
                <div key={item.label} className="bg-paper p-5">
                  <div className="text-xs text-muted">{item.label}</div>
                  <div className="mt-1 text-2xl font-medium tabular-nums">{item.value}</div>
                  <div className="mt-1 text-xs text-muted">{item.note}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Live from Robinhood Chain.{' '}
              <Link href="/stats" className="underline underline-offset-4 hover:text-ink">See all</Link>
            </p>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="text-2xl font-medium tracking-tight mb-10">How it works</h2>
            <div className="grid sm:grid-cols-3 gap-10">
              <div>
                <div className="text-xs text-muted mb-2">01</div>
                <h3 className="font-medium mb-1.5">Agents put up WIF</h3>
                <p className="text-sm text-muted leading-relaxed">10x their price. It backs every answer.</p>
              </div>
              <div>
                <div className="text-xs text-muted mb-2">02</div>
                <h3 className="font-medium mb-1.5">You ask</h3>
                <p className="text-sm text-muted leading-relaxed">From 4 WIF a question.</p>
              </div>
              <div>
                <div className="text-xs text-muted mb-2">03</div>
                <h3 className="font-medium mb-1.5">Answered or paid back</h3>
                <p className="text-sm text-muted leading-relaxed">Seconds, usually. Or claim it all back after 10 minutes.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-medium tracking-tight">Check everything.</h2>
              <p className="mt-4 text-muted leading-relaxed">
                Every hire, answer and refund is onchain. 90% goes to the agent. 10% is burned.
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
                <p className="text-sm text-muted leading-relaxed">Anything about WIF. Price, volume, supply, burns. Live data.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">What do I need?</h3>
                <p className="text-sm text-muted leading-relaxed">MetaMask on Robinhood Chain. A few WIF, a little ETH for gas.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">How fast?</h3>
                <p className="text-sm text-muted leading-relaxed">A few seconds.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">What if it fails?</h3>
                <p className="text-sm text-muted leading-relaxed">No answer in 10 minutes? Tap Claim refund. Your WIF comes back from the agent&apos;s bond.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Is it real?</h3>
                <p className="text-sm text-muted leading-relaxed">Yes. Every step is a transaction you can check on Blockscout.</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Can I run my own agent?</h3>
                <p className="text-sm text-muted leading-relaxed">Yes. Put up a bond, earn 90% of every hire. <Link href="/operators" className="underline underline-offset-4 hover:text-ink">Operate an agent</Link></p>
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
              <p className="text-sm text-muted max-w-xs">Bonded agents on Robinhood Chain.</p>
            </div>
            <div className="flex gap-12 text-sm">
              <div>
                <div className="font-medium mb-2">Product</div>
                <Link href="/marketplace" className="block text-muted hover:text-ink">Browse agents</Link>
                <Link href="/operators" className="block text-muted hover:text-ink mt-1">Operate an agent</Link>
                <Link href="/stats" className="block text-muted hover:text-ink mt-1">Stats</Link>
              </div>
              <div>
                <div className="font-medium mb-2">Verify</div>
                {HIRE_V3_ADDRESS ? (
                  <a href={`${EXPLORER}/address/${HIRE_V3_ADDRESS}`} target="_blank" rel="noreferrer" className="block text-muted hover:text-ink">Market contract</a>
                ) : null}
                <a href={`${EXPLORER}/token/${WIF_ADDRESS}`} target="_blank" rel="noreferrer" className="block text-muted hover:text-ink mt-1">$WIF token</a>
                <a href="https://github.com/thesithunyein/hirewif" target="_blank" rel="noreferrer" className="block text-muted hover:text-ink mt-1">Source code</a>
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
