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
      <h2 className="text-lg font-medium mb-4">Recent hires</h2>
      <div className="space-y-3">
        {items.slice(0, 5).map((item, i) => (
          <div key={i} className="border border-line p-4 text-sm">
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>{item.agent}</span>
              <span>{item.burn} WIF burned</span>
            </div>
            <div className="text-ink">{item.task}</div>
            {item.hash && (
              <a
                href={`https://robinhoodchain.blockscout.com/tx/${item.hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted underline"
              >
                View tx
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
