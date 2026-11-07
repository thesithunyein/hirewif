'use client';

import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { robinhood, WIF_ADDRESS } from '@/lib/chain';
import { formatUnits } from 'viem';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const { data: wifBalance } = useBalance({
    address,
    token: WIF_ADDRESS,
    chainId: robinhood.id,
  });

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="hidden sm:block text-right text-xs text-muted">
          <div>{address.slice(0, 6)}…{address.slice(-4)}</div>
          <div>{wifBalance ? Number(formatUnits(wifBalance.value, 18)).toFixed(0) : '—'} WIF</div>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-3 py-1.5 border border-line text-xs hover:border-ink"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const injected = connectors.find((c) => c.type === 'injected');

  return (
    <button
      onClick={() => injected && connect({ connector: injected, chainId: robinhood.id })}
      className="px-4 py-2 bg-ink text-paper text-sm"
    >
      Connect
    </button>
  );
}
