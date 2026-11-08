'use client';

import { useEffect, useState } from 'react';

interface Entry {
  agent: string;
  task: string;
  result: string;
  hash?: string;
  burn: number;
  time: number;
}

export function History() {
  const [items, setItems] = useState<Entry[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('hirewif-history');
    if (raw) setItems(JSON.parse(raw));
  }, []);

  if (!items.length) return null;

  return (
    <div className="mt-16">
      <h2 className="text-lg font-medium mb-4">Your recent hires</h2>
      <div className="space-y-3">
        {items.slice(0, 5).map((item, i) => (
          <div key={i} className="border border-line p-4 text-sm">
            <div className="flex justify-between text-xs text-muted mb-2">
              <span>{item.agent}</span>
              <span>{item.burn} WIF burned</span>
            </div>
            <div className="text-xs text-muted">Question: {item.task}</div>
            {item.result ? (
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap border border-line bg-soft p-3 text-sm leading-relaxed text-ink">
                {item.result}
              </pre>
            ) : (
              <div className="mt-3 text-sm text-muted">Answer unavailable for this saved hire.</div>
            )}
            {item.hash && (
              <a
                href={`https://robinhoodchain.blockscout.com/tx/${item.hash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-10 items-center text-xs text-muted underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                Verify payment onchain
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
