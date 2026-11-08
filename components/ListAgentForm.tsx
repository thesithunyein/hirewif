'use client';

import { useEffect, useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { robinhood } from '@/lib/chain';
import { HIRE_CONTRACT } from '@/lib/config';

const LIST_ABI = [
  {
    name: 'listAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agent', type: 'string' },
      { name: 'payee', type: 'address' },
      { name: 'price', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const ID_RE = /^[a-z0-9][a-z0-9-]{1,31}$/;
const PRICE_RE = /^\d{1,7}(\.\d{1,18})?$/;

export function ListAgentForm({ onListed }: { onListed?: () => void }) {
  const { isConnected, address } = useAccount();
  const [id, setId] = useState('');
  const [price, setPrice] = useState('');
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const priceNum = Number(price);
  const valid =
    ID_RE.test(id) &&
    PRICE_RE.test(price) &&
    Number.isFinite(priceNum) &&
    priceNum >= 1 &&
    priceNum <= 1_000_000;

  useEffect(() => {
    if (isSuccess) onListed?.();
  }, [isSuccess, onListed]);

  const submit = () => {
    if (!isConnected || !address || !valid) return;
    writeContract({
      address: HIRE_CONTRACT,
      abi: LIST_ABI,
      functionName: 'listAgent',
      args: [id, address, parseUnits(price, 18)],
      chainId: robinhood.id,
    });
  };

  const busy = isPending || isConfirming;

  return (
    <div className="border border-line bg-white p-6">
      <div className="text-xs text-muted uppercase tracking-wider">Supply side</div>
      <h3 className="text-lg font-medium mt-1">List an agent</h3>
      <p className="text-sm text-muted leading-relaxed mt-2 mb-5 max-w-xl">
        You bring the work, the payee keeps 90%. 10% of every hire is burned. Your agent id becomes
        an endpoint on this page, and the price is enforced by the contract, so nobody can hire you
        for less than you asked.
      </p>

      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3">
        <label className="text-xs text-muted">
          Agent id
          <input
            value={id}
            onChange={(e) => setId(e.target.value.toLowerCase().trim())}
            placeholder="wallet-watch"
            className="mt-1 w-full border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink"
            disabled={busy || isSuccess}
          />
        </label>
        <label className="text-xs text-muted">
          Price in WIF
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.trim())}
            placeholder="2500"
            inputMode="decimal"
            className="mt-1 w-full border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink"
            disabled={busy || isSuccess}
          />
        </label>
        <button
          onClick={submit}
          disabled={!isConnected || !valid || busy || isSuccess}
          className="self-end px-5 py-2 text-sm bg-ink text-paper disabled:opacity-40 hover:opacity-90 h-[38px]"
        >
          {busy ? 'Listing…' : isSuccess ? 'Listed' : 'List'}
        </button>
      </div>

      <div className="mt-3 text-xs text-muted space-y-1">
        {!isConnected && <p>Connect a wallet first. That wallet becomes the payee.</p>}
        {id && !ID_RE.test(id) && (
          <p>Lowercase letters, numbers and dashes only, 2 to 32 characters.</p>
        )}
        {price && !(PRICE_RE.test(price) && priceNum >= 1) && <p>Enter a whole WIF price of 1 or more.</p>}
        {isSuccess && hash && (
          <p>
            Listed. The agent is now in the directory.{' '}
            <a
              href={`https://robinhoodchain.blockscout.com/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              View tx
            </a>
            <button
              onClick={() => {
                setId('');
                setPrice('');
                reset();
              }}
              className="ml-3 underline hover:text-ink"
            >
              List another
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
