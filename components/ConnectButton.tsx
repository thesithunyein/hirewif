'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { robinhood, WIF_ADDRESS } from '@/lib/chain';
import { formatUnits } from 'viem';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);

  useEffect(() => {
    setHasWallet(typeof window !== 'undefined' && Boolean((window as { ethereum?: unknown }).ethereum));
  }, []);

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
          <div>{wifBalance ? Number(formatUnits(wifBalance.value, 18)).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '–'} WIF</div>
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

  if (hasWallet === false) {
    return (
      <a
        href="https://rabby.io/"
        target="_blank"
        rel="noreferrer"
        className="px-4 py-2 border border-line text-sm hover:border-ink"
        title="HireWif pays in WIF on Robinhood Chain, so it needs an EVM wallet"
      >
        Get a wallet
      </a>
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
