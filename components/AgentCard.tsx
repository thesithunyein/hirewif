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
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [task, setTask] = useState('');
  const [result, setResult] = useState('');
  const [loadingResult, setLoadingResult] = useState(false);
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
        body: JSON.stringify({ agent: agent.id, task }),
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data.error || 'The agent could not complete this task.');
          return data;
        })
        .then((data: { result?: string; updatedAt?: string }) => {
          setResult(data.result || 'No data returned.');
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

  return (
    <div className="border border-line bg-white p-6 flex flex-col gap-5 hover:border-muted transition-colors">
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
        placeholder="Describe the task..."
        rows={3}
        className="w-full border border-line px-3 py-2 text-sm resize-none focus:outline-none focus:border-ink"
        disabled={step === 'done'}
      />

      <div className="flex items-center justify-between text-xs text-muted">
        <span>{agent.price.toLocaleString('en-US')} WIF total</span>
        <span>
          {toOperator.toLocaleString('en-US')} to operator · {burn.toLocaleString('en-US')} burned
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
        className="w-full py-2.5 text-sm bg-ink text-paper disabled:opacity-40 hover:opacity-90"
      >
        {busy ? (step === 'approving' ? 'Approving…' : 'Hiring…') : step === 'done' ? 'Hired' : needsApproval ? 'Approve & Hire' : 'Hire'}
      </button>

      {step === 'done' && (
        <div className="text-xs space-y-2 pt-2 border-t border-line">
          <div className="text-muted">
            Payment sent. {burn.toLocaleString('en-US')} WIF burned onchain.{' '}
            {hash && (
              <a
                href={`https://robinhoodchain.blockscout.com/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                View tx
              </a>
            )}
          </div>
          {loadingResult && <div className="text-muted">Generating result…</div>}
          {result && (
            <pre className="text-xs whitespace-pre-wrap text-ink bg-soft p-3 rounded">
              {result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
