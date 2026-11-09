'use client';

import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { WIF_ADDRESS, WIF_ABI, robinhood } from '@/lib/chain';
import { HIRE_CONTRACT, BURN_BPS, HIRE_CONTRACT_VERSION } from '@/lib/config';
import { HIRE_V3_ABI, HIRE_V3_ADDRESS, taskHashFor } from '@/lib/v3';
import { keccak256, parseUnits, toBytes } from 'viem';
import { Icon } from './Icon';
import { useState, useEffect } from 'react';

const HIRE_ABI = [
  {
    name: 'hire',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agent', type: 'string' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;
const HIRE_V2_ABI = [
  {
    name: 'hire',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agent', type: 'string' },
      { name: 'amount', type: 'uint256' },
      { name: 'taskHash', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

interface Agent {
  id: string;
  name: string;
  role: string;
  price: number;
  address: string;
  description: string;
  tags: string[];
  paid?: number;
  hires?: number;
}

export type V3Listing = { key: `0x${string}`; price: number; bond: number; active: boolean };

export function AgentCard({ agent, listing }: { agent: Agent; listing?: V3Listing }) {
  const { isConnected, address } = useAccount();
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [task, setTask] = useState('');
  const [result, setResult] = useState('');
  const [loadingResult, setLoadingResult] = useState(false);
  const [shared, setShared] = useState(false);
  const [reportUrl, setReportUrl] = useState('');
  const [step, setStep] = useState<'idle' | 'approving' | 'hiring' | 'done'>('idle');
  const [intent, setIntent] = useState<{ taskHash: `0x${string}`; nonce: bigint } | null>(null);
  const [committed, setCommitted] = useState<boolean | null>(null);

  // On V3 the price comes from the registry and the payment is bound to the question.
  const onV3 = Boolean(HIRE_V3_ADDRESS && listing?.active);
  const price = onV3 ? (listing as V3Listing).price : agent.price;
  const amount = parseUnits(String(price), 18);
  const burn = Math.floor((price * BURN_BPS) / 10000);
  const toOperator = price - burn;
  const approveTarget = onV3 ? (HIRE_V3_ADDRESS as `0x${string}`) : HIRE_CONTRACT;

  const { data: allowance } = useReadContract({
    address: WIF_ADDRESS,
    abi: WIF_ABI,
    functionName: 'allowance',
    args: address ? [address, approveTarget] : undefined,
    chainId: robinhood.id,
    query: { enabled: !!address },
  });

  const needsApproval = !allowance || allowance < amount;

  const startHire = () => {
    if (onV3) {
      writeContract({
        address: HIRE_V3_ADDRESS as `0x${string}`,
        abi: HIRE_V3_ABI,
        functionName: 'hire',
        args: [(listing as V3Listing).key, taskHashFor(task), BigInt(Date.now())],
        chainId: robinhood.id,
      });
      return;
    }
    if (HIRE_CONTRACT_VERSION === 2 && intent) {
      writeContract({
        address: HIRE_CONTRACT,
        abi: HIRE_V2_ABI,
        functionName: 'hire',
        args: [agent.id, amount, intent.taskHash, intent.nonce],
        chainId: robinhood.id,
      });
      return;
    }
    writeContract({
      address: HIRE_CONTRACT,
      abi: HIRE_ABI,
      functionName: 'hire',
      args: [agent.id, amount],
      chainId: robinhood.id,
    });
  };

  const handleHire = () => {
    if (!isConnected || !task.trim()) return;
    if (HIRE_CONTRACT_VERSION === 2 && !onV3) {
      setIntent({ taskHash: keccak256(toBytes(task.trim())), nonce: BigInt(Date.now()) });
    }
    if (needsApproval) {
      setStep('approving');
      writeContract({
        address: WIF_ADDRESS,
        abi: WIF_ABI,
        functionName: 'approve',
        args: [approveTarget, amount],
        chainId: robinhood.id,
      });
      return;
    }
    setStep('hiring');
    startHire();
  };

  useEffect(() => {
    if (!isSuccess) return;
    if (step === 'approving') {
      setStep('hiring');
      reset();
      startHire();
    } else if (step === 'hiring' && !result && !loadingResult) {
      setStep('done');
      setLoadingResult(true);
      // A 503 means the payment was not consumed, so retrying is safe and protects the buyer.
      const requestResult = async (attempt = 0): Promise<Response> => {
        const response = await fetch('/api/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: agent.id, task, tx: hash, user: address }),
        });
        if (response.status === 503 && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
          return requestResult(attempt + 1);
        }
        return response;
      };

      requestResult()
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data.error || 'The agent could not complete this task.');
          return data;
        })
        .then((data: { result?: string; committed?: boolean; receipt?: string | null }) => {
          setResult(data.result || 'No data returned.');
          setCommitted(typeof data.committed === 'boolean' ? data.committed : null);
          if (data.receipt) {
            setReportUrl(`${window.location.origin}/report?r=${encodeURIComponent(data.receipt)}`);
          } else {
            const params = new URLSearchParams({
              agent: agent.id,
              name: agent.name,
              task,
              result: data.result || 'No data returned.',
              price: String(price),
              burn: String(burn),
              operator: String(toOperator),
              tx: hash || '',
            });
            setReportUrl(`${window.location.origin}/report?${params.toString()}`);
          }
          const entry = {
            agent: agent.name,
            task,
            result: data.result,
            hash,
            burn,
            time: Date.now(),
            user: address,
          };
          const prev = JSON.parse(localStorage.getItem('hirewif-history') || '[]');
          localStorage.setItem('hirewif-history', JSON.stringify([entry, ...prev].slice(0, 20)));
        })
        .catch((e: Error) => setResult(`Payment went through, but the result failed: ${e.message}`))
        .finally(() => setLoadingResult(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, step]);

  const busy = isPending || isConfirming;
  const shareResult = async () => {
    try {
      const text = `${agent.name} report\n\n${result}\n\n${reportUrl}`.trim();
      if (navigator.share) {
        await navigator.share({ title: `${agent.name} report · HireWif`, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      if (hash && address) {
        await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tx: hash, address }),
        }).catch(() => undefined);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 1500);
    } catch {
      // Share cancellation is a user choice, not a transaction failure.
    }
  };

  return (
    <div id={`agent-${agent.id}`} className="border border-line bg-paper p-6 flex flex-col gap-5 hover:border-muted transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">{agent.role}</div>
          <h3 className="text-lg font-medium mt-1">{agent.name}</h3>
        </div>
        <div className="text-muted">
          <Icon name={agent.id} />
        </div>
      </div>
      <p className="text-sm text-muted leading-relaxed">{agent.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {agent.tags.map((tag) => (
          <span key={tag} className="text-xs px-2 py-0.5 bg-soft text-muted rounded">
            {tag}
          </span>
        ))}
      </div>

      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="What do you want to know?"
        rows={3}
        className="w-full border border-line px-3 py-2 text-sm resize-none focus:outline-none focus:border-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        disabled={step === 'done'}
      />

      <div className="flex items-center justify-between text-xs text-muted">
        <span>{price.toLocaleString('en-US')} WIF</span>
        <span>
          {toOperator.toLocaleString('en-US')} operator · {burn.toLocaleString('en-US')} burned
        </span>
      </div>
      {onV3 ? (
        <div className="text-xs text-muted -mt-2">
          Bond-backed · {(listing as V3Listing).bond.toLocaleString('en-US')} WIF locked · payment tied to your question
        </div>
      ) : agent.paid && agent.paid > 0 ? (
        <div className="text-xs text-muted -mt-2">
          {agent.paid.toLocaleString('en-US')} WIF earned · {agent.hires} hire{agent.hires === 1 ? '' : 's'}
        </div>
      ) : null}

      <button
        onClick={handleHire}
        disabled={!isConnected || !task.trim() || busy || step === 'done'}
        aria-busy={busy}
        className="w-full min-h-10 py-2.5 text-sm bg-ink text-paper transition-opacity duration-100 ease-out active:translate-y-px disabled:opacity-40 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
      >
        {busy ? (step === 'approving' ? 'Approving payment…' : 'Sending payment…') : step === 'done' ? 'Paid' : needsApproval ? 'Approve & hire' : 'Hire agent'}
      </button>
      {writeError && <div role="alert" className="text-xs text-red-700">Payment failed. Check your wallet and try again.</div>}

      {step === 'done' && (
        <div className="text-xs space-y-2 pt-2 border-t border-line">
          <div className="text-muted">
            Payment confirmed. {burn.toLocaleString('en-US')} WIF burned.{' '}
            {hash && (
              <a
                href={`https://robinhoodchain.blockscout.com/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Check payment
              </a>
            )}
          </div>
          {committed === true && <div className="text-muted">Answer hash committed onchain.</div>}
          {loadingResult && <div className="text-muted">Getting your answer…</div>}
          {result && (
            <>
              <details className="group">
                <summary className="inline-flex min-h-10 cursor-pointer items-center text-xs underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
                  <span className="group-open:hidden">View answer</span>
                  <span className="hidden group-open:inline">Hide answer</span>
                </summary>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-ink bg-soft p-3 rounded">{result}</pre>
              </details>
              <button
                type="button"
                onClick={shareResult}
                className="min-h-10 text-left text-xs underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                {shared ? 'Copied' : 'Share answer'}
              </button>
              {reportUrl && (
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block min-h-10 pt-2 text-xs underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                >
                  Open public receipt
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
