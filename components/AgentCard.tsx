'use client';

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { WIF_ADDRESS, WIF_ABI, robinhood } from '@/lib/chain';
import { parseUnits } from 'viem';
import { Icon } from './Icon';

interface Agent {
  id: string;
  name: string;
  role: string;
  price: number;
  address: string;
  description: string;
  tags: string[];
}

export function AgentCard({ agent }: { agent: Agent }) {
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleHire = () => {
    if (!isConnected) return;
    writeContract({
      address: WIF_ADDRESS,
      abi: WIF_ABI,
      functionName: 'transfer',
      args: [agent.address as `0x${string}`, parseUnits(agent.price.toString(), 18)],
      chainId: robinhood.id,
    });
  };

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
      <p className="text-sm text-muted leading-relaxed flex-1">{agent.description}</p>
      <div className="flex items-center justify-between pt-2 border-t border-line">
        <div className="text-sm font-medium">{agent.price} WIF</div>
        <button
          onClick={handleHire}
          disabled={!isConnected || isPending || isConfirming || isSuccess}
          className="px-4 py-2 text-sm bg-ink text-paper disabled:opacity-40 hover:opacity-90"
        >
          {isPending || isConfirming ? 'Sending' : isSuccess ? 'Hired' : 'Hire'}
        </button>
      </div>
      {isSuccess && (
        <div className="text-xs text-muted">Payment sent.</div>
      )}
    </div>
  );
}
