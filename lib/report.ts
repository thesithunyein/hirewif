import { getMarket, getOnchain, getFlow, getHires, getBlockTimes, type Hire } from './wif';

type Section = 'market' | 'onchain' | 'flow' | 'hires';

const DEFAULTS: Record<string, Section[]> = {
  monitor: ['market', 'flow'],
  data: ['onchain', 'flow'],
  ledger: ['hires'],
  research: ['market', 'onchain', 'hires'],
};

const MATCHERS: [Section, RegExp][] = [
  ['market', /price|volume|liquidity|market|worth|chart|pump|dump|cap\b/i],
  ['onchain', /supply|burn|burned|total|contract|balance|decimals/i],
  ['flow', /transfer|whale|wallet|flow|mov(e|ing)|large|buy|sell|activity/i],
  ['hires', /hire|hired|agent|earn|paid|marketplace|job|task|who/i],
];

function plan(agent: string, task: string): Section[] {
  const wanted = new Set<Section>();
  for (const [section, re] of MATCHERS) {
    if (re.test(task)) wanted.add(section);
  }
  const out: Section[] = [];
  for (const s of wanted) out.push(s);
  for (const s of DEFAULTS[agent] ?? []) if (!out.includes(s)) out.push(s);
  return out.length ? out : DEFAULTS[agent] ?? ['market'];
}

const usd = (n: number) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
};
const num = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const addr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length));

function ago(unix: number): string {
  const mins = Math.max(0, Math.round((Date.now() / 1000 - unix) / 60));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export type Report = {
  agent: string;
  task: string;
  sections: Section[];
  result: string;
  sources: string[];
  updatedAt: string;
};

export async function buildReport(agent: string, task: string): Promise<Report> {
  const sections = plan(agent, task);
  const need = new Set(sections);
  const [market, onchain, flow, hires] = await Promise.all([
    need.has('market') ? getMarket() : Promise.resolve(null),
    need.has('onchain') ? getOnchain().catch(() => null) : Promise.resolve(null),
    need.has('flow') ? getFlow() : Promise.resolve(null),
    need.has('hires') ? getHires().catch(() => null) : Promise.resolve(null),
  ]);

  const blocks = need.has('hires') && hires?.recent.length
    ? await getBlockTimes(hires.recent.map((h) => h.block))
    : new Map<number, number>();

  const lines: string[] = [];
  const sources: string[] = [];
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  lines.push(`Asked: ${task.trim()}`);
  lines.push(`Answered from live data · ${stamp}`);
  lines.push('');

  if (sections.includes('market')) {
    lines.push('WIF MARKET');
    if (!market) {
      lines.push('  unavailable right now · DexScreener did not answer. No estimate shown rather than a guess.');
    } else {
      lines.push(`  ${pad('price', 15)}${usd(market.priceUsd)}   ${pct(market.change24h)} 24h · ${pct(market.change1h)} 1h`);
      lines.push(`  ${pad('market cap', 15)}${usd(market.marketCap)}`);
      lines.push(`  ${pad('liquidity', 15)}${usd(market.liquidityUsd)}`);
      lines.push(
        `  ${pad('24h volume', 15)}${usd(market.volume24h)}   ${num(market.buys24h)} buys · ${num(market.sells24h)} sells`
      );
      sources.push(`DexScreener ${market.dex} pair ${addr(market.pair)}`);
      const turnover = market.liquidityUsd > 0 ? market.volume24h / market.liquidityUsd : 0;
      lines.push(
        `  read: ${turnover.toFixed(1)}x the pool turned over in 24h, ${market.change24h >= 0 ? 'price up' : 'price down'} ${Math.abs(market.change24h).toFixed(1)}% on the day.`
      );
    }
    lines.push('');
  }

  if (sections.includes('onchain')) {
    lines.push('WIF ONCHAIN');
    if (!onchain) {
      lines.push('  unavailable right now · RPC did not answer.');
    } else {
      const burnedShare = onchain.supply > 0 ? (onchain.burned / onchain.supply) * 100 : 0;
      lines.push(`  ${pad('total supply', 15)}${num(onchain.supply)} WIF`);
      lines.push(`  ${pad('burned address', 15)}${num(onchain.burned)} WIF (${burnedShare.toFixed(4)}% of supply)`);
      lines.push(`  ${pad('hire contract', 15)}${num(onchain.hireContractBalance)} WIF held`);
      sources.push('Robinhood Chain RPC · totalSupply and balanceOf');
    }
    lines.push('');
  }

  if (sections.includes('flow')) {
    lines.push('TRANSFER FLOW');
    if (!flow) {
      lines.push('  unavailable right now · RPC did not answer.');
    } else {
      lines.push(`  ${pad('window', 15)}last ${num(flow.blocks)} blocks (~${flow.hours}h)`);
      lines.push(`  ${pad('transfers', 15)}${num(flow.transfers)} across ${num(flow.senders)} senders and ${num(flow.receivers)} receivers`);
      if (flow.largest.length) {
        lines.push('  largest:');
        for (const t of flow.largest) {
          lines.push(`    ${num(t.value)} WIF  ${addr(t.from)} → ${addr(t.to)}  tx ${addr(t.tx)}`);
        }
      }
      sources.push('Robinhood Chain RPC · WIF Transfer logs');
    }
    lines.push('');
  }

  if (sections.includes('hires')) {
    lines.push('HIREWIF LEDGER');
    if (!hires) {
      lines.push('  unavailable right now · RPC did not answer.');
    } else if (hires.count === 0) {
      lines.push('  0 hires recorded on this contract.');
      lines.push('  Every hire writes a Hired event to Robinhood Chain, so this is the count, not a sample.');
      sources.push('Robinhood Chain RPC · HireWif Hired logs');
    } else {
      lines.push(`  ${pad('hires', 15)}${num(hires.count)}`);
      lines.push(`  ${pad('paid', 15)}${num(hires.paid)} WIF`);
      lines.push(`  ${pad('burned', 15)}${num(hires.burned)} WIF`);
      if (hires.earning.length) {
        lines.push('  agents earning:');
        for (const e of hires.earning.slice(0, 4)) {
          lines.push(`    ${addr(e.payee)}  ${num(e.paid)} WIF  ${e.hires} hire${e.hires === 1 ? '' : 's'}`);
        }
      }
      lines.push('  recent:');
      for (const h of hires.recent) {
        lines.push(`    ${hireLine(h, blocks.get(h.block))}`);
      }
      sources.push('Robinhood Chain RPC · HireWif Hired logs');
    }
    lines.push('');
  }

  lines.push(`sources: ${sources.length ? sources.join(' | ') : 'none available'}`);

  return {
    agent,
    task,
    sections,
    result: lines.join('\n').trim(),
    sources,
    updatedAt: new Date().toISOString(),
  };
}

function hireLine(h: Hire, timestamp?: number): string {
  const when = timestamp ? `  ${ago(timestamp)}` : '';
  return `${pad(h.agent, 10)}${num(h.paid)} WIF  ${addr(h.user)} → ${addr(h.payee)}  tx ${addr(h.tx)}${when}`;
}
