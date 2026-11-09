'use client';

import { useCallback, useEffect, useState } from 'react';
import { AgentCard, type V3Listing } from './AgentCard';
import { agents as builtIns, type Agent } from '@/lib/agents';
import { agentKeyFor } from '@/lib/v3';

type Listing = Agent & { paid?: number; hires?: number };

type RegistryAgent = { key: string; price: number; bond: number; active: boolean };

export function AgentDirectory() {
  const [list, setList] = useState<Listing[]>(builtIns);
  const [listings, setListings] = useState<Record<string, V3Listing>>({});
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    fetch('/api/agents', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('chain read failed');
        return r.json();
      })
      .then((d: { agents?: Listing[]; chainOk?: boolean }) => {
        if (d.agents?.length) setList(d.agents);
        setFailed(d.chainOk === false);
      })
      .catch(() => setFailed(true));

    fetch('/api/registry', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { agents?: RegistryAgent[]; configured?: boolean } | null) => {
        if (!d?.configured || !d.agents) return;
        const map: Record<string, V3Listing> = {};
        for (const entry of d.agents) {
          map[entry.key.toLowerCase()] = {
            key: entry.key as `0x${string}`,
            price: entry.price,
            bond: entry.bond,
            active: entry.active,
          };
        }
        setListings(map);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-6">
        {list.map((agent) => (
          <AgentCard key={agent.id} agent={agent} listing={listings[agentKeyFor(agent.id).toLowerCase()]} />
        ))}
      </div>
      {failed && (
        <p className="mt-3 text-xs text-muted">
          Live marketplace data is unavailable. Prices and totals may be out of date.
        </p>
      )}
    </div>
  );
}
