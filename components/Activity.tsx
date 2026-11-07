'use client';

import { useEffect, useState } from 'react';

export function Activity() {
  const [count, setCount] = useState(0);
  const [burned, setBurned] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem('hirewif-history');
    if (!raw) return;
    const items = JSON.parse(raw);
    setCount(items.length);
    setBurned(items.reduce((sum: number, i: { burn?: number }) => sum + (i.burn || 0), 0));
  }, []);

  return (
    <div className="mb-10 flex gap-6 text-sm">
      <div className="border border-line px-4 py-3">
        <div className="text-xs text-muted">Hires</div>
        <div className="font-medium">{count}</div>
      </div>
      <div className="border border-line px-4 py-3">
        <div className="text-xs text-muted">WIF burned</div>
        <div className="font-medium">{burned}</div>
      </div>
      <div className="border border-line px-4 py-3">
        <div className="text-xs text-muted">Flywheel</div>
        <div className="font-medium">10% per hire</div>
      </div>
    </div>
  );
}
