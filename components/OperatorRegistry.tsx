'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { parseUnits } from 'viem';
import { robinhood, WIF_ABI, WIF_ADDRESS } from '@/lib/chain';
import { HIRE_V3_ABI, HIRE_V3_ADDRESS, HIRE_V3_CONFIGURED, agentKeyFor } from '@/lib/v3';
import { agents as CATALOG } from '@/lib/agents';

const NAME_BY_KEY = new Map(CATALOG.map((agent) => [agentKeyFor(agent.id).toLowerCase(), agent.name]));

type RegistryAgent = {
  id: string;
  key: string;
  payout: string;
  price: number;
  bond: number;
  hires: number;
  paid: number;
  burned: number;
  slashed: number;
  active: boolean;
};

const num = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const addr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function OperatorRegistry() {
  const { address, isConnected } = useAccount();
  const [agents, setAgents] = useState<RegistryAgent[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [price, setPrice] = useState('4');
  const [payout, setPayout] = useState('');
  const [step, setStep] = useState<'idle' | 'approving' | 'registering' | 'done'>('idle');
  const [notice, setNotice] = useState('');

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const load = useCallback(() => {
    fetch('/api/registry', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { agents?: RegistryAgent[] }) => {
        setAgents(d.agents ?? []);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (address) setPayout((current) => current || address);
  }, [address]);

  const priceValue = Number(price);
  const validPrice = Number.isFinite(priceValue) && priceValue > 0;
  const bondValue = validPrice ? priceValue * 10 : 0;

  const { data: allowance } = useReadContract({
    address: WIF_ADDRESS,
    abi: WIF_ABI,
    functionName: 'allowance',
    args: address && HIRE_V3_ADDRESS ? [address, HIRE_V3_ADDRESS] : undefined,
    chainId: robinhood.id,
    query: { enabled: Boolean(address && HIRE_V3_ADDRESS) },
  });

  const bondWei = validPrice ? parseUnits(String(bondValue), 18) : 0n;
  const needsApproval = !allowance || allowance < bondWei;
  const canSubmit =
    HIRE_V3_CONFIGURED && isConnected && agentId.trim().length > 0 && validPrice && payout.length === 42 && step !== 'done';

  const handleRegister = () => {
    if (!canSubmit || !HIRE_V3_ADDRESS) return;
    const key = agentKeyFor(agentId);
    if (needsApproval) {
      setStep('approving');
      writeContract({
        address: WIF_ADDRESS,
        abi: WIF_ABI,
        functionName: 'approve',
        args: [HIRE_V3_ADDRESS, bondWei],
        chainId: robinhood.id,
      });
    } else {
      setStep('registering');
      writeContract({
        address: HIRE_V3_ADDRESS,
        abi: HIRE_V3_ABI,
        functionName: 'register',
        args: [key, parseUnits(String(priceValue), 18), payout as `0x${string}`, bondWei],
        chainId: robinhood.id,
      });
    }
  };

  useEffect(() => {
    if (!isSuccess) return;
    if (step === 'approving') {
      setStep('registering');
      const key = agentKeyFor(agentId);
      if (!HIRE_V3_ADDRESS) return;
      writeContract({
        address: HIRE_V3_ADDRESS,
        abi: HIRE_V3_ABI,
        functionName: 'register',
        args: [
          key,
          parseUnits(String(priceValue), 18),
          payout as `0x${string}`,
          parseUnits(String(priceValue * 10), 18),
        ],
        chainId: robinhood.id,
      });
    } else if (step === 'registering') {
      setStep('done');
      setNotice('Agent listed. Your bond is locked and you earn 90% of every hire.');
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, step]);

  const busy = isPending || isConfirming;

  return (
    <div className="space-y-14">
      {!HIRE_V3_CONFIGURED && (
        <div className="border border-line bg-soft p-5 text-sm">
          <div className="font-medium">Registry not connected yet</div>
          <p className="mt-1 text-muted">
            The V3 registry contract is compiled and tested, but this deployment has not published its address yet. Set{' '}
            <code className="text-ink">NEXT_PUBLIC_HIRE_V3_CONTRACT</code> after deploying to switch listings on. The
            existing V1 hire rail keeps working until then.
          </p>
        </div>
      )}

      <section>
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Listed agents</div>
            <h2 className="mt-2 text-2xl font-medium tracking-tight">Live agents</h2>
          </div>
          <span className="text-xs text-muted">{agents.length} listed</span>
        </div>

        {loadError ? (
          <p className="text-sm text-muted">Could not read the agent list. Try again in a moment.</p>
        ) : agents.length === 0 ? (
          <p className="text-sm text-muted">No agents listed yet. Be the first to lock a bond.</p>
        ) : (
          <div className="divide-y divide-line border border-line">
            {agents.map((agent) => (
              <div key={agent.key} className="grid gap-2 px-4 py-4 text-sm sm:grid-cols-5 sm:items-center">
                <div className="font-medium">{NAME_BY_KEY.get(agent.key.toLowerCase()) ?? `${agent.id.slice(0, 12)}…`}</div>
                <div>{num(agent.price)} WIF</div>
                <div className="text-muted">bond {num(agent.bond)} WIF</div>
                <div className="text-muted">{agent.hires} hires · {num(agent.burned)} burned</div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <span className="text-muted">{addr(agent.payout)}</span>
                  <span className={agent.active ? 'text-ink' : 'text-muted'}>{agent.active ? 'active' : 'closed'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border border-line p-6">
        <div className="text-xs uppercase tracking-wider text-muted">Become an operator</div>
        <h2 className="mt-2 text-2xl font-medium tracking-tight">Lock a bond, take hires.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Your bond is 10x your price and stays locked while you operate. You earn 90% of every hire; 10% is burned. If
          you never commit an answer, the hirer reclaims the full payment from your bond.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-muted">Agent id</span>
            <input
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="wif-whale-watch"
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Price (WIF)</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-muted">Payout address</span>
            <input
              value={payout}
              onChange={(e) => setPayout(e.target.value)}
              placeholder="0x…"
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-mono text-xs focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>
            Bond required <span className="text-ink">{validPrice ? `${num(bondValue)} WIF` : '–'}</span> · 10x price
          </span>
          <span>90% to you · 10% burned</span>
        </div>

        <button
          type="button"
          onClick={handleRegister}
          disabled={!canSubmit || busy}
          aria-busy={busy}
          className="mt-6 w-full min-h-10 bg-ink px-4 py-2.5 text-sm text-paper transition-opacity duration-100 ease-out active:translate-y-px disabled:opacity-40 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 sm:w-auto"
        >
          {busy
            ? step === 'approving'
              ? 'Approving bond…'
              : 'Listing agent…'
            : step === 'done'
              ? 'Listed'
              : !HIRE_V3_CONFIGURED
                ? 'Registry not deployed'
                : needsApproval
                  ? 'Approve bond & list'
                  : 'List agent'}
        </button>

        {writeError && (
          <div role="alert" className="mt-3 text-xs text-red-700">
            Transaction failed. Check your wallet balance and the bond amount.
          </div>
        )}
        {notice && <div className="mt-3 text-xs text-muted">{notice}</div>}
      </section>
    </div>
  );
}
