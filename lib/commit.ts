import { createPublicClient, createWalletClient, http, keccak256, toBytes, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { robinhood } from './chain';
import { HIRE_V3_ABI, HIRE_V3_ADDRESS } from './v3';

const RPC_URL = process.env.ROBINHOOD_RPC ?? 'https://rpc.mainnet.chain.robinhood.com';

/** Do not start a commit this close to the deadline: it could land after it and revert. */
const DEADLINE_MARGIN_SECONDS = 20n;
const ATTEMPTS = 3;
const RECEIPT_TIMEOUT_MS = 12_000;

/**
 * Committing the answer hash is what makes the bond mean something: a hirer can only
 * reclaim a payment from the operator's bond when no answer was committed in time.
 * The operator key stays server-side and never reaches the browser.
 */
export const COMMIT_ENABLED = Boolean(process.env.OPERATOR_PRIVATE_KEY && HIRE_V3_ADDRESS);

export type HireState = {
  hirer: string;
  paid: bigint;
  deadline: bigint;
  committed: boolean;
  refunded: boolean;
  answerHash: Hash;
};

export type CommitOutcome =
  | { status: 'committed'; tx: Hash | null }
  /** Past the deadline or refunded: the answer must not be served, the hirer is owed a refund. */
  | { status: 'expired' }
  /** Nothing landed. The hire is still open and the request can be retried. */
  | { status: 'failed'; reason: string };

const publicClient = createPublicClient({ chain: robinhood, transport: http(RPC_URL) });

export function answerHashFor(result: string): Hash {
  return keccak256(toBytes(result));
}

export async function readHire(hireId: bigint): Promise<HireState | null> {
  if (!HIRE_V3_ADDRESS) return null;
  const [, hirer, paid, deadline, committed, refunded, answerHash] = await publicClient.readContract({
    address: HIRE_V3_ADDRESS,
    abi: HIRE_V3_ABI,
    functionName: 'hires',
    args: [hireId],
  });
  return { hirer, paid, deadline, committed, refunded, answerHash };
}

async function chainNow(): Promise<bigint> {
  const block = await publicClient.getBlock({ blockTag: 'latest' });
  return block.timestamp;
}

/** True when the hire can no longer be answered: refunded, or too close to / past its deadline. */
export async function hireClosed(state: HireState): Promise<boolean> {
  if (state.refunded) return true;
  if (state.committed) return false;
  return (await chainNow()) + DEADLINE_MARGIN_SECONDS >= state.deadline;
}

/**
 * Commit the answer hash and wait until it is mined. The answer is only released on
 * `committed`; a hire that got its answer without a commit could also be refunded.
 */
export async function commitAnswer(hireId: bigint, result: string): Promise<CommitOutcome> {
  const privateKey = process.env.OPERATOR_PRIVATE_KEY;
  if (!privateKey || !HIRE_V3_ADDRESS) return { status: 'failed', reason: 'operator signer not configured' };

  const answerHash = answerHashFor(result);
  // Wallet exports often omit the 0x prefix; viem requires it.
  const normalized = privateKey.trim().replace(/^(0x)?/i, '0x') as `0x${string}`;
  let wallet;
  try {
    const account = privateKeyToAccount(normalized);
    wallet = createWalletClient({ account, chain: robinhood, transport: http(RPC_URL) });
  } catch {
    return { status: 'failed', reason: 'operator signer key is invalid' };
  }

  let reason = 'commit did not land';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const state = await readHire(hireId);
      if (!state) return { status: 'failed', reason: 'hire not found' };
      if (state.committed) {
        // An earlier attempt landed after its receipt wait timed out.
        return state.answerHash.toLowerCase() === answerHash.toLowerCase()
          ? { status: 'committed', tx: null }
          : { status: 'failed', reason: 'hire already committed with a different answer' };
      }
      if (await hireClosed(state)) return { status: 'expired' };

      const tx = await wallet.writeContract({
        address: HIRE_V3_ADDRESS,
        abi: HIRE_V3_ABI,
        functionName: 'commit',
        args: [hireId, answerHash],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx, timeout: RECEIPT_TIMEOUT_MS });
      if (receipt.status === 'success') return { status: 'committed', tx };
      reason = 'commit transaction reverted';
    } catch (error) {
      reason = error instanceof Error ? error.message.split('\n')[0] : 'commit failed';
    }
    await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
  }

  // One last read: a timed-out send may still have been mined.
  try {
    const state = await readHire(hireId);
    if (state?.committed && state.answerHash.toLowerCase() === answerHash.toLowerCase()) {
      return { status: 'committed', tx: null };
    }
  } catch {
    // fall through
  }
  return { status: 'failed', reason };
}
