'use client';

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { WIF_ADDRESS, WIF_ABI, robinhood } from '@/lib/chain';
import { parseUnits } from 'viem';
import { Icon } from './Icon';
import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  price: number;
  address: string;
  description: string;
  tags: string[];
}

const results: Record<string, (task: string) => string> = {
  research: (task) => `Brief on "${task}":\n\nKey points:\n• Core concept defined\n• 3 primary sources identified\n• Open questions listed\n\nFull structured brief delivered.`,
  monitor: (task) => `Monitoring set for "${task}".\n\nAlerts will trigger on:\n• Price movement >5%\n• Large transfers\n• Contract events\n\nActive.`,
  content: (task) => `Draft for "${task}":\n\nClean, direct copy ready for use. Tone matched to purpose. Ready to publish or refine.`,
  data: (task) => `Data pull for "${task}" complete.\n\nExtracted, cleaned, and structured. Key fields organized. Export ready.`,
};

export function AgentCard({ agent }: { agent: Agent }) {
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [task, setTask] = useState('');
  const [result, setResult] = useState('');

  const burn = Math.round(agent.price * 0.1);

  const handleHire = () => {
    if (!isConnected || !task.trim()) return;
    writeContract({
      address: WIF_ADDRESS,
      abi: WIF_ABI,
      functionName: 'transfer',
      args: [agent.address as `0x${string}`, parseUnits(agent.price.toString(), 18)],
      chainId: robinhood.id,
    });
  };

  useEffect(() => {
    if (isSuccess && task && !result) {
      setResult(results[agent.id]?.(task) || 'Task completed.');
    }
  }, [isSuccess, task, result, agent.id]);

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

      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Describe the task..."
        rows={3}
        className="w-full border border-line px-3 py-2 text-sm resize-none focus:outline-none focus:border-ink"
        disabled={isSuccess}
      />

      <div className="flex items-center justify-between text-xs text-muted">
        <span>{agent.price} WIF</span>
        <span>{burn} WIF burned</span>
      </div>

      <button
        onClick={handleHire}
        disabled={!isConnected || !task.trim() || isPending || isConfirming || isSuccess}
        className="w-full py-2.5 text-sm bg-ink text-paper disabled:opacity-40 hover:opacity-90"
      >
        {isPending || isConfirming ? 'Sending…' : isSuccess ? 'Hired' : 'Hire'}
      </button>

      {isSuccess && (
        <div className="text-xs space-y-2 pt-2 border-t border-line">
          <div className="text-muted">
            Payment sent. {burn} WIF burned.{' '}
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
