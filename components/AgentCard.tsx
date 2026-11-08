'use client';

import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { WIF_ADDRESS, WIF_ABI, robinhood } from '@/lib/chain';
import { HIRE_CONTRACT, BURN_BPS } from '@/lib/config';
import { parseUnits } from 'viem';
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

export function AgentCard({ agent }: { agent: Agent }) {
  const { isConnected, address } = useAccount();
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [task, setTask] = useState('');
  const [result, setResult] = useState('');
  const [loadingResult, setLoadingResult] = useState(false);
  const [shared, setShared] = useState(false);
  const [reportUrl, setReportUrl] = useState('');
  const [step, setStep] = useState<'idle' | 'approving' | 'hiring' | 'done'>('idle');

  const amount = parseUnits(agent.price.toString(), 18);
  const burn = Math.floor(agent.price * BURN_BPS / 10000);
  const toOperator = agent.price - burn;

  const { data: allowance } = useReadContract({
    address: WIF_ADDRESS,
    abi: WIF_ABI,
    functionName: 'allowance',
    args: address ? [address, HIRE_CONTRACT] : undefined,
    chainId: robinhood.id,
    query: { enabled: !!address },
  });

  const needsApproval = !allowance || allowance < amount;

  const handleHire = () => {
    if (!isConnected || !task.trim()) return;
    if (needsApproval) {
      setStep('approving');
      writeContract({
        address: WIF_ADDRESS,
        abi: WIF_ABI,
        functionName: 'approve',
        args: [HIRE_CONTRACT, amount],
        chainId: robinhood.id,
      });
    } else {
      setStep('hiring');
      writeContract({
        address: HIRE_CONTRACT,
        abi: HIRE_ABI,
        functionName: 'hire',
        args: [agent.id, amount],
        chainId: robinhood.id,
      });
    }
  };

  useEffect(() => {
    if (!isSuccess) return;
    if (step === 'approving') {
      setStep('hiring');
      reset();
      writeContract({
        address: HIRE_CONTRACT,
        abi: HIRE_ABI,
        functionName: 'hire',
        args: [agent.id, amount],
        chainId: robinhood.id,
      });
    } else if (step === 'hiring' && !result && !loadingResult) {
      setStep('done');
      setLoadingResult(true);
      fetch('/api/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agent.id, task, tx: hash, user: address }),
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data.error || 'The agent could not complete this task.');
          return data;
        })
        .then((data: { result?: string; updatedAt?: string }) => {
          setResult(data.result || 'No data returned.');
          const params = new URLSearchParams({
            agent: agent.id,
            name: agent.name,
            task,
            result: data.result || 'No data returned.',
            price: String(agent.price),
            burn: String(burn),
            operator: String(toOperator),
            tx: hash || '',
          });
          setReportUrl(`${window.location.origin}/report?${params.toString()}`);
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
        <span>{agent.price.toLocaleString('en-US')} WIF</span>
        <span>
          {toOperator.toLocaleString('en-US')} operator · {burn.toLocaleString('en-US')} burned
        </span>
      </div>
      {agent.paid && agent.paid > 0 ? (
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
