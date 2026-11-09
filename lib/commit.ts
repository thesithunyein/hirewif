import { createWalletClient, http, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { robinhood } from './chain';
import { HIRE_V3_ABI, HIRE_V3_ADDRESS } from './v3';

const RPC_URL = process.env.ROBINHOOD_RPC ?? 'https://rpc.mainnet.chain.robinhood.com';

/**
 * Committing the answer hash is what makes the bond mean something: a hirer can only
 * reclaim a payment from the operator's bond when no answer was committed in time.
 * The operator key stays server-side and never reaches the browser.
 */
export const COMMIT_ENABLED = Boolean(process.env.OPERATOR_PRIVATE_KEY && HIRE_V3_ADDRESS);

export async function commitAnswer(hireId: bigint, result: string): Promise<boolean> {
  const privateKey = process.env.OPERATOR_PRIVATE_KEY;
  if (!privateKey || !HIRE_V3_ADDRESS) return false;

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const wallet = createWalletClient({ account, chain: robinhood, transport: http(RPC_URL) });
    await wallet.writeContract({
      address: HIRE_V3_ADDRESS,
      abi: HIRE_V3_ABI,
      functionName: 'commit',
      args: [hireId, keccak256(toBytes(result))],
    });
    return true;
  } catch {
    // A failed commit must never cost the buyer their answer.
    return false;
  }
}
