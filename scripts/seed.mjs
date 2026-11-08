// Seeds real hires against the deployed HireWif contract.
// Usage: PK=0x... node scripts/seed.mjs [agent-id ...]
// Reads HIRE_CONTRACT from lib/config.ts so there is no address to copy.

import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, defineChain, http, parseAbi, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const WIF = '0x5173b8eA6923c2d40267890D45C46a3480954773';
const RPC = process.env.ROBINHOOD_RPC ?? 'https://rpc.mainnet.chain.robinhood.com';
const EXPLORER = 'https://robinhoodchain.blockscout.com';

const robinhood = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: 'Blockscout', url: EXPLORER } },
});

const HIRE_ABI = parseAbi(['function hire(string agent, uint256 amount)']);
const WIF_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
  return null;
}

async function main() {
  const pk = process.env.PK;
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    return fail('Set PK to a 32-byte hex private key. Nothing is written to disk.');
  }

  const config = readFileSync(new URL('../lib/config.ts', import.meta.url), 'utf8');
  const hireContract = config.match(/HIRE_CONTRACT\s*=\s*'(0x[0-9a-fA-F]{40})'/)?.[1];
  if (!hireContract) return fail('Could not read HIRE_CONTRACT from lib/config.ts.');

  const account = privateKeyToAccount(pk);
  const pub = createPublicClient({ chain: robinhood, transport: http(RPC) });
  const wallet = createWalletClient({ account, chain: robinhood, transport: http(RPC) });

  const ids = process.argv.slice(2);

  // The contract has no price registry, so the catalog in lib/agents.ts is the only
  // source of truth for what a hire costs. Read it instead of hardcoding a second copy.
  const catalog = readFileSync(new URL('../lib/agents.ts', import.meta.url), 'utf8');
  const prices = new Map(
    [...catalog.matchAll(/id:\s*'([^']+)'[\s\S]*?price:\s*([\d_]+)/g)].map((m) => [
      m[1],
      BigInt(m[2].replace(/_/g, '')) * 10n ** 18n,
    ])
  );
  if (!prices.size) return fail('Could not read agent prices from lib/agents.ts.');

  const requested = ids.length ? ids : [...prices.keys()];

  console.log(`hire contract ${hireContract}`);
  console.log(`paying from   ${account.address}`);

  const code = await pub.getCode({ address: hireContract });
  if (!code || code === '0x') return fail('No contract at that address on Robinhood Chain. Deploy first.');

  const quotes = [];
  for (const id of requested) {
    const price = prices.get(id);
    if (!price) {
      console.error(`"${id}" is not in lib/agents.ts. Skipping rather than guessing a price.`);
      continue;
    }
    quotes.push({ id, price });
  }

  if (!quotes.length) return fail('Nothing to hire.');

  const total = quotes.reduce((a, q) => a + q.price, 0n);
  const [wifBalance, ethBalance, allowance, latest] = await Promise.all([
    pub.readContract({ address: WIF, abi: WIF_ABI, functionName: 'balanceOf', args: [account.address] }),
    pub.getBalance({ address: account.address }),
    pub.readContract({
      address: WIF,
      abi: WIF_ABI,
      functionName: 'allowance',
      args: [account.address, hireContract],
    }),
    pub.getBlockNumber(),
  ]);

  console.log(`block         ${latest}`);
  console.log(`ETH           ${formatUnits(ethBalance, 18)}`);
  console.log(`WIF           ${formatUnits(wifBalance, 18)}`);
  console.log(`needed        ${formatUnits(total, 18)} WIF`);
  for (const q of quotes) {
    console.log(`  ${q.id.padEnd(10)} ${formatUnits(q.price, 18).padStart(10)} WIF`);
  }

  if (wifBalance < total) {
    return fail(`Short by ${formatUnits(total - wifBalance, 18)} WIF. Buy WIF first, then rerun.`);
  }

  if (allowance < total) {
    const hash = await wallet.writeContract({
      address: WIF,
      abi: WIF_ABI,
      functionName: 'approve',
      args: [hireContract, total],
    });
    console.log(`approve       ${EXPLORER}/tx/${hash}`);
    const r = await pub.waitForTransactionReceipt({ hash });
    if (r.status !== 'success') return fail('Approve reverted.');
  }

  for (const q of quotes) {
    const hash = await wallet.writeContract({
      address: hireContract,
      abi: HIRE_ABI,
      functionName: 'hire',
      args: [q.id, q.price],
    });
    const r = await pub.waitForTransactionReceipt({ hash });
    const ok = r.status === 'success';
    console.log(
      `${ok ? 'hired' : 'FAILED'} ${q.id.padEnd(10)} ${formatUnits(q.price, 18)} WIF  ${EXPLORER}/tx/${hash}`
    );
    if (!ok) return fail('Hire reverted. Stopping here rather than spending more gas.');
  }

  console.log(
    `done. ${quotes.length} hire${quotes.length === 1 ? '' : 's'}, ${formatUnits(total, 18)} WIF gross, 10% burned.`
  );
}

main().catch((e) => {
  console.error(e.shortMessage ?? e.message ?? e);
  process.exitCode = 1;
});
