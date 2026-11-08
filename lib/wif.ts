import { createPublicClient, http, formatUnits, keccak256, parseAbiItem, parseEventLogs, parseUnits, toBytes, type Address, type Hash } from 'viem';
import { robinhood, WIF_ADDRESS } from './chain';
import { HIRE_CONTRACT, HIRE_CONTRACT_VERSION } from './config';
import { agents } from './agents';
import { claimRedemption } from './redemption';

export const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD' as Address;
const RPC_URL = process.env.ROBINHOOD_RPC ?? 'https://rpc.mainnet.chain.robinhood.com';
const DEPLOY_BLOCK = 108_500_000n;
const FLOW_WINDOW = 200_000n;
const LOG_CHUNK = 50_000n;

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

type Hit = { at: number; value: unknown };
const cache = new Map<string, Hit>();

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
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
      const latest = await client.getBlockNumber({ cacheTime: 0 });
      const from = latest - FLOW_WINDOW;
      const [logs, headBlock, tailBlock] = await Promise.all([
        client.getLogs({
          address: WIF_ADDRESS,
          event: TRANSFER,
          fromBlock: from,
          toBlock: latest,
          strict: true,
        }),
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
      const logs = [];

      for (let fromBlock = DEPLOY_BLOCK; fromBlock <= latest; fromBlock += LOG_CHUNK) {
        const toBlock = fromBlock + LOG_CHUNK - 1n > latest ? latest : fromBlock + LOG_CHUNK - 1n;
        const chunk = await client.getLogs({
          address: HIRE_CONTRACT,
          event: HIRED,
          fromBlock,
          toBlock,
          strict: true,
        });
        logs.push(...chunk);
      }

      const hires: Hire[] = logs.map((log) => ({
        user: String(log.args.user),
        agent: String(log.args.agent),
        paid: Number(formatUnits(log.args.paid, 18)),
        burned: Number(formatUnits(log.args.burned, 18)),
        tx: String(log.transactionHash),
        block: Number(log.blockNumber),
      }));

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

export async function claimHirePayment(agentId: string, _task: string, txHash: Hash, payer: string): Promise<boolean> {
  const agent = agents.find((item) => item.id === agentId);
  if (!agent) return false;
  const claimKey = txHash.toLowerCase();

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

    // Bind the one-time redemption to the first submitted task in this runtime.
    // The deployed contract predates task hashes, so this is the strongest server-side
    // protection available until a task-aware contract is deployed.
    return await claimRedemption(claimKey);
  } catch {
    return false;
  }
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
