'use client';

import { useEffect, useState } from 'react';
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { formatUnits } from 'viem';
import { robinhood } from '@/lib/chain';
import { HIRE_V3_ABI, HIRE_V3_ADDRESS } from '@/lib/v3';

const EXPLORER = 'https://robinhoodchain.blockscout.com';

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Live onchain state of one V3 hire: committed, refunded, or the countdown to the refund.
 * After the deadline with no commit, the hirer reclaims the full payment from the bond here.
 */
export function HireStatus({ hireId }: { hireId: bigint }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const { writeContract, data: refundTx, isPending, error, reset } = useWriteContract();
  const { isLoading: refunding, isSuccess: refunded } = useWaitForTransactionReceipt({ hash: refundTx });

  const { data, refetch } = useReadContract({
    address: HIRE_V3_ADDRESS ?? undefined,
    abi: HIRE_V3_ABI,
    functionName: 'hires',
    args: [hireId],
    chainId: robinhood.id,
    query: { enabled: Boolean(HIRE_V3_ADDRESS), refetchInterval: 5_000 },
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (refunded) refetch();
  }, [refunded, refetch]);

  if (!data || !HIRE_V3_ADDRESS) return null;
  const [, hirer, paid, deadline, isCommitted, isRefunded, answerHash] = data;
  if (/^0x0{40}$/i.test(hirer)) {
    return <div className="text-muted">No hire #{hireId.toString()} exists on the contract yet.</div>;
  }
  const amount = Number(formatUnits(paid, 18)).toLocaleString('en-US');
  // The contract compares against block time; a few seconds of slack avoids a reverting claim.
  const left = Number(deadline) + 5 - now;

  if (isCommitted) {
    return (
      <div className="text-muted">
        Answered. Recorded onchain:{' '}
        <span className="font-mono">{`${answerHash.slice(0, 10)}…${answerHash.slice(-6)}`}</span>
      </div>
    );
  }

  if (isRefunded || refunded) {
    return (
      <div className="text-ink">
        Refunded {amount} WIF.{' '}
        {refundTx && (
          <a href={`${EXPLORER}/tx/${refundTx}`} target="_blank" rel="noreferrer" className="underline">
            View
          </a>
        )}
      </div>
    );
  }

  if (left > 0) {
    return (
      <div className="text-muted">
        Waiting for the answer. Refund opens in{' '}
        <span className="font-mono tabular-nums text-ink">{clock(left)}</span>.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-ink">No answer in time. Your {amount} WIF is ready.</div>
      <button
        type="button"
        onClick={() => {
          reset();
          writeContract({
            address: HIRE_V3_ADDRESS as `0x${string}`,
            abi: HIRE_V3_ABI,
            functionName: 'claimRefund',
            args: [hireId],
            chainId: robinhood.id,
          });
        }}
        disabled={isPending || refunding}
        className="w-full min-h-10 py-2.5 text-sm bg-ink text-paper disabled:opacity-40 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
      >
        {isPending || refunding ? 'Refunding…' : `Get ${amount} WIF back`}
      </button>
      {error && <div role="alert" className="text-red-700">Refund failed. Try again.</div>}
    </div>
  );
}
