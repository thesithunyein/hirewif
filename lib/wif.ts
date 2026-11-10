import { createPublicClient, http, formatUnits, keccak256, parseAbiItem, parseEventLogs, parseUnits, toBytes, type Address, type Hash, type Log } from 'viem';
import { robinhood, WIF_ADDRESS } from './chain';
import { HIRE_CONTRACT, HIRE_CONTRACT_VERSION } from './config';
import { agents } from './agents';
import { claimRedemption } from './redemption';
import { HIRE_V3_ADDRESS, agentKeyFor, taskHashFor } from './v3';

export const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD' as Address;
const RPC_URL = process.env.ROBINHOOD_RPC ?? 'https://rpc.mainnet.chain.robinhood.com';
const DEPLOY_BLOCK = 108_500_000n;
/** HireWifV3 went live at block 110,643,8xx; nothing to read before it. */
const V3_DEPLOY_BLOCK = 110_640_000n;
const FLOW_WINDOW = 200_000n;
const LOG_CHUNK = 50_000n;
const FLOW_CHUNK = 20_000n;
const CHUNK_TIMEOUT_MS = 12_000;

type TransferLog = {
  args?: { value?: bigint; from?: string; to?: string };
  transactionHash?: string | null;
};

/** Hard ceiling per RPC call, so one slow window cannot hang a request. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('rpc chunk timed out')), ms);
  });
  return Promise.race([work, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function redemptionKey(rail: 'v1' | 'v3', txHash: string): string {
  return `${rail}:${txHash.toLowerCase()}`;
}

/**
 * Sum of WIF actually moved between two addresses inside a transaction.
 * The contract's own event is a claim about a payment; the token transfers are the payment,
 * so both are checked and the wrong token cannot pass.
 */
function wifMoved(logs: readonly Log[], from: string, to: string): bigint {
  const wantFrom = from.toLowerCase();
  const wantTo = to.toLowerCase();
  let total = 0n;
  for (const event of parseEventLogs({ abi: [TRANSFER], logs: [...logs], strict: false })) {
    if (event.address.toLowerCase() !== WIF_ADDRESS.toLowerCase()) continue;
    const args = event.args as { from?: string; to?: string; value?: bigint };
    if (args.from?.toLowerCase() === wantFrom && args.to?.toLowerCase() === wantTo) {
      total += args.value ?? 0n;
    }
  }
  return total;
}

const client = createPublicClient({ chain: robinhood, transport: http(RPC_URL) });

const WIF_READ_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const TRANSFER = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
const HIRED = parseAbiItem('event Hired(address indexed user, string agent, uint256 paid, uint256 burned)');
const HIRED_V2 = parseAbiItem('event Hired(address indexed user, string agent, uint256 paid, uint256 burned, bytes32 taskHash, uint256 nonce)');
const HIRED_V3 = parseAbiItem(
  'event Hired(uint256 indexed hireId, bytes32 indexed agentId, address indexed hirer, uint256 paid, uint256 burned, bytes32 taskHash, uint256 nonce)'
);

type Hit = { at: number; value: unknown };
const cache = new Map<string, Hit>();

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  try {
    const value = await fn();
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (error) {
    // A slow or failed refresh keeps the last good value instead of blanking the page.
    if (hit) return hit.value as T;
    throw error;
  }
}

export type Market = {
  priceUsd: number;
  priceNative: number;
  change24h: number;
  change1h: number;
  volume24h: number;
  liquidityUsd: number;
  marketCap: number;
  buys24h: number;
  sells24h: number;
  pair: string;
  dex: string;
};

export async function getMarket(): Promise<Market | null> {
  return cached('market', 60_000, async () => {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${WIF_ADDRESS}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { pairs?: Record<string, unknown>[] };
      const pairs = (json.pairs ?? []).filter((p) => p.chainId === 'robinhood');
      if (!pairs.length) return null;
      const p = pairs.sort(
        (a, b) => Number((b.liquidity as { usd?: number })?.usd ?? 0) - Number((a.liquidity as { usd?: number })?.usd ?? 0)
      )[0] as Record<string, any>;
      return {
        priceUsd: Number(p.priceUsd ?? 0),
        priceNative: Number(p.priceNative ?? 0),
        change24h: Number(p.priceChange?.h24 ?? 0),
        change1h: Number(p.priceChange?.h1 ?? 0),
        volume24h: Number(p.volume?.h24 ?? 0),
        liquidityUsd: Number(p.liquidity?.usd ?? 0),
        marketCap: Number(p.marketCap ?? p.fdv ?? 0),
        buys24h: Number(p.txns?.h24?.buys ?? 0),
        sells24h: Number(p.txns?.h24?.sells ?? 0),
        pair: String(p.pairAddress ?? ''),
        dex: String(p.dexId ?? ''),
      };
    } catch {
      return null;
    }
  });
}

export type Onchain = {
  supply: number;
  burned: number;
  hireContractBalance: number;
};

export async function getOnchain(): Promise<Onchain> {
  return cached('onchain', 45_000, async () => {
    const [supply, burned, hireBalance] = await Promise.all([
      client.readContract({ address: WIF_ADDRESS, abi: WIF_READ_ABI, functionName: 'totalSupply' }),
      client.readContract({ address: WIF_ADDRESS, abi: WIF_READ_ABI, functionName: 'balanceOf', args: [BURN_ADDRESS] }),
      client.readContract({ address: WIF_ADDRESS, abi: WIF_READ_ABI, functionName: 'balanceOf', args: [HIRE_CONTRACT] }),
    ]);
    return {
      supply: Number(formatUnits(supply, 18)),
      burned: Number(formatUnits(burned, 18)),
      hireContractBalance: Number(formatUnits(hireBalance, 18)),
    };
  });
}

export type Transfer = { value: number; from: string; to: string; tx: string };

export type Flow = {
  blocks: number;
  hours: number;
  transfers: number;
  senders: number;
  receivers: number;
  largest: Transfer[];
};

export async function getFlow(): Promise<Flow | null> {
  return cached('flow', 120_000, async () => {
    try {
      const latest = await withTimeout(client.getBlockNumber({ cacheTime: 0 }), CHUNK_TIMEOUT_MS);
      const from = latest - FLOW_WINDOW;

      // Read the window in bounded chunks. A single 200k-block call is what most
      // providers rate-limit, and a partial read would misreport the counts.
      const logs: TransferLog[] = [];
      const windows = Number(FLOW_WINDOW / FLOW_CHUNK);
      for (let index = 0; index < windows; index += 1) {
        const startBlock = from + FLOW_CHUNK * BigInt(index);
        const endBlock = startBlock + FLOW_CHUNK - 1n > latest ? latest : startBlock + FLOW_CHUNK - 1n;
        try {
          const chunk = await withTimeout(
            client.getLogs({
              address: WIF_ADDRESS,
              event: TRANSFER,
              fromBlock: startBlock,
              toBlock: endBlock,
              strict: true,
            }),
            CHUNK_TIMEOUT_MS
          );
          for (const entry of chunk) logs.push(entry as unknown as TransferLog);
        } catch {
          // One failed window means the total is not the total. Say so instead.
          return null;
        }
      }

      const [headBlock, tailBlock] = await Promise.all([
        client.getBlock({ blockNumber: latest }),
        client.getBlock({ blockNumber: from }),
      ]);
      const seconds = Number(headBlock.timestamp - tailBlock.timestamp);
      const senders = new Set<string>();
      const receivers = new Set<string>();
      const sorted = [...logs]
        .map((l) => ({
          value: Number(formatUnits(l.args?.value ?? 0n, 18)),
          from: String(l.args?.from),
          to: String(l.args?.to),
          tx: String(l.transactionHash),
        }))
        .sort((a, b) => b.value - a.value);
      for (const l of logs) {
        senders.add(String(l.args?.from));
        receivers.add(String(l.args?.to));
      }
      return {
        blocks: Number(FLOW_WINDOW),
        hours: Math.round((seconds / 3600) * 10) / 10,
        transfers: logs.length,
        senders: senders.size,
        receivers: receivers.size,
        largest: sorted.slice(0, 3),
      };
    } catch {
      return null;
    }
  });
}

export type Hire = {
  user: string;
  agent: string;
  paid: number;
  burned: number;
  tx: string;
  block: number;
};

export type Hires = {
  count: number;
  paid: number;
  burned: number;
  uniqueUsers: number;
  repeatUsers: number;
  recent: Hire[];
  agents: { agent: string; paid: number; hires: number }[];
};

export async function getHires(): Promise<Hires> {
  return cached('hires', 30_000, async () => {
    try {
      const latest = await client.getBlockNumber({ cacheTime: 0 });
      const hires: Hire[] = [];

      // V3 events carry the agent as keccak256(id); map it back to the catalog id.
      const agentByKey = new Map(agents.map((agent) => [agentKeyFor(agent.id).toLowerCase(), agent.id]));

      const ranges: { fromBlock: bigint; toBlock: bigint }[] = [];
      for (let fromBlock = DEPLOY_BLOCK; fromBlock <= latest; fromBlock += LOG_CHUNK) {
        ranges.push({ fromBlock, toBlock: fromBlock + LOG_CHUNK - 1n > latest ? latest : fromBlock + LOG_CHUNK - 1n });
      }

      // Chunks are read in parallel batches; V3 is only read from its deploy block on.
      const BATCH = 8;
      for (let i = 0; i < ranges.length; i += BATCH) {
        const batch = await Promise.all(
          ranges.slice(i, i + BATCH).map(({ fromBlock, toBlock }) =>
            Promise.all([
              withTimeout(
                client.getLogs({ address: HIRE_CONTRACT, event: HIRED, fromBlock, toBlock, strict: true }),
                CHUNK_TIMEOUT_MS
              ),
              HIRE_V3_ADDRESS && toBlock >= V3_DEPLOY_BLOCK
                ? withTimeout(
                    client.getLogs({
                      address: HIRE_V3_ADDRESS,
                      event: HIRED_V3,
                      fromBlock: fromBlock > V3_DEPLOY_BLOCK ? fromBlock : V3_DEPLOY_BLOCK,
                      toBlock,
                      strict: true,
                    }),
                    CHUNK_TIMEOUT_MS
                  )
                : Promise.resolve([]),
            ])
          )
        );
        for (const [v1, v3] of batch) {
        for (const log of v1) {
          hires.push({
            user: String(log.args.user),
            agent: String(log.args.agent),
            paid: Number(formatUnits(log.args.paid, 18)),
            burned: Number(formatUnits(log.args.burned, 18)),
            tx: String(log.transactionHash),
            block: Number(log.blockNumber),
          });
        }
        for (const log of v3) {
          const key = String(log.args.agentId).toLowerCase();
          hires.push({
            user: String(log.args.hirer),
            agent: agentByKey.get(key) ?? key,
            paid: Number(formatUnits(log.args.paid, 18)),
            burned: Number(formatUnits(log.args.burned, 18)),
            tx: String(log.transactionHash),
            block: Number(log.blockNumber),
          });
        }
        }
      }

      const byAgent = new Map<string, { paid: number; hires: number }>();
      const byUser = new Map<string, number>();
      for (const h of hires) {
        const cur = byAgent.get(h.agent) ?? { paid: 0, hires: 0 };
        byAgent.set(h.agent, { paid: cur.paid + h.paid, hires: cur.hires + 1 });
        const user = h.user.toLowerCase();
        byUser.set(user, (byUser.get(user) ?? 0) + 1);
      }

      return {
        count: hires.length,
        paid: hires.reduce((a, h) => a + h.paid, 0),
        burned: hires.reduce((a, h) => a + h.burned, 0),
        uniqueUsers: byUser.size,
        repeatUsers: [...byUser.values()].filter((count) => count > 1).length,
        recent: [...hires].sort((a, b) => b.block - a.block).slice(0, 5),
        agents: [...byAgent.entries()]
          .map(([agent, v]) => ({ agent, ...v }))
          .sort((a, b) => b.paid - a.paid),
      };
    } catch (e) {
      throw new Error(`hire log read failed: ${(e as Error).message}`);
    }
  });
}

export async function verifyV1Hire(agentId: string, _task: string, txHash: Hash, payer: string): Promise<boolean> {
  const agent = agents.find((item) => item.id === agentId);
  if (!agent) return false;

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success' || receipt.to?.toLowerCase() !== HIRE_CONTRACT.toLowerCase()) return false;
    if (receipt.from.toLowerCase() !== payer.toLowerCase()) return false;

    const events = parseEventLogs({
      abi: HIRE_CONTRACT_VERSION === 2 ? [HIRED_V2] : [HIRED],
      logs: receipt.logs,
      strict: false,
    });
    const expectedPaid = parseUnits(String(agent.price), 18);
    const expectedBurned = (expectedPaid * 1000n) / 10_000n;

    const valid = events.some((event) => {
      const args = event.args as { user?: string; agent?: string; paid?: bigint; burned?: bigint; taskHash?: string };
      return (
        event.address.toLowerCase() === HIRE_CONTRACT.toLowerCase() &&
        args.user?.toLowerCase() === payer.toLowerCase() &&
        args.agent === agentId &&
        args.paid === expectedPaid &&
        args.burned === expectedBurned &&
        (HIRE_CONTRACT_VERSION === 1 || args.taskHash === keccak256(toBytes(_task.trim())))
      );
    });
    if (!valid) return false;

    // Independently confirm the WIF movements the contract claims: the payer funded the
    // exact price, 10% reached the burn address, and the remainder reached the operator.
    return (
      wifMoved(receipt.logs, payer, HIRE_CONTRACT) === expectedPaid &&
      wifMoved(receipt.logs, HIRE_CONTRACT, BURN_ADDRESS) === expectedBurned &&
      wifMoved(receipt.logs, HIRE_CONTRACT, agent.address) === expectedPaid - expectedBurned
    );
  } catch {
    return false;
  }
}

/** Verify and consume in one step. The route uses the split form so a failed build costs nothing. */
export async function claimHirePayment(agentId: string, task: string, txHash: Hash, payer: string): Promise<boolean> {
  if (!(await verifyV1Hire(agentId, task, txHash, payer))) return false;
  return claimRedemption(redemptionKey('v1', txHash));
}

/**
 * Verify a V3 hire before releasing an answer.
 * Binds the payment to the exact question: the task hash committed in the event
 * must match the task the caller is asking about, which V1 could not check.
 */
export async function verifyV3Hire(
  agentId: string,
  task: string,
  txHash: Hash,
  payer: string
): Promise<{ ok: boolean; hireId: bigint | null; paid: bigint; burned: bigint }> {
  const miss = { ok: false, hireId: null, paid: 0n, burned: 0n } as const;
  if (!HIRE_V3_ADDRESS) return miss;

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') return miss;
    if (receipt.to?.toLowerCase() !== HIRE_V3_ADDRESS.toLowerCase()) return miss;
    if (receipt.from.toLowerCase() !== payer.toLowerCase()) return miss;

    const expectedKey = agentKeyFor(agentId).toLowerCase();
    const expectedTask = taskHashFor(task).toLowerCase();

    const events = parseEventLogs({ abi: [HIRED_V3], logs: receipt.logs, strict: false });
    const match = events.find((event) => {
      if (event.address.toLowerCase() !== HIRE_V3_ADDRESS!.toLowerCase()) return false;
      const args = event.args as {
        hirer?: string;
        agentId?: string;
        paid?: bigint;
        burned?: bigint;
        taskHash?: string;
      };
      if (args.hirer?.toLowerCase() !== payer.toLowerCase()) return false;
      if ((args.agentId ?? '').toLowerCase() !== expectedKey) return false;
      if ((args.taskHash ?? '').toLowerCase() !== expectedTask) return false;
      const paid = args.paid ?? 0n;
      return paid > 0n && args.burned === (paid * 1000n) / 10_000n;
    });

    if (!match) return miss;

    // V3 pulls the price and burns its share immediately; operator earnings accrue in the
    // contract, so the payout leg is withdrawn later rather than transferred here.
    const paid = (match.args as { paid?: bigint }).paid ?? 0n;
    const burned = (match.args as { burned?: bigint }).burned ?? 0n;
    if (wifMoved(receipt.logs, payer, HIRE_V3_ADDRESS) !== paid) return miss;
    if (burned > 0n && wifMoved(receipt.logs, HIRE_V3_ADDRESS, BURN_ADDRESS) !== burned) return miss;

    const args = match.args as { hireId?: bigint };
    return { ok: true, hireId: args.hireId ?? null, paid, burned };
  } catch {
    return miss;
  }
}

/** Verify and consume a V3 hire in one step. */
export async function claimHirePaymentV3(
  agentId: string,
  task: string,
  txHash: Hash,
  payer: string
): Promise<{ ok: boolean; hireId: bigint | null; paid: bigint; burned: bigint }> {
  const verified = await verifyV3Hire(agentId, task, txHash, payer);
  if (!verified.ok) return verified;
  const claimed = await claimRedemption(redemptionKey('v3', txHash));
  return claimed ? verified : { ok: false, hireId: null, paid: 0n, burned: 0n };
}

export async function getBlockTimes(blocks: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  const unique = [...new Set(blocks)];
  await Promise.all(
    unique.map(async (n) => {
      try {
        const b = await client.getBlock({ blockNumber: BigInt(n) });
        out.set(n, Number(b.timestamp));
      } catch {
        /* timestamp is optional */
      }
    })
  );
  return out;
}

export { WIF_ADDRESS, HIRE_CONTRACT };
