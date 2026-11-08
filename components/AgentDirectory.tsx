'use client';

import { useCallback, useEffect, useState } from 'react';
import { AgentCard } from './AgentCard';
import { agents as builtIns, type Agent } from '@/lib/agents';

type Listing = Agent & { paid?: number; hires?: number };

export function AgentDirectory() {
  const [list, setList] = useState<Listing[]>(builtIns);
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
          <AgentCard key={agent.id} agent={agent} />
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
