import { NextRequest, NextResponse } from 'next/server';
import { buildReport } from '@/lib/report';
import { verifyHirePayment } from '@/lib/wif';
import { isAddress, isHash, type Hash } from 'viem';

export const dynamic = 'force-dynamic';

const AGENTS = new Set(['monitor', 'data', 'ledger', 'research']);

export async function POST(req: NextRequest) {
  let body: { agent?: string; task?: string; tx?: string; user?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const agent = String(body.agent ?? '');
  const task = String(body.task ?? '').trim();
  const tx = String(body.tx ?? '');
  const user = String(body.user ?? '');

  if (!AGENTS.has(agent) || !task || !isHash(tx) || !isAddress(user)) {
    return NextResponse.json({ error: 'A valid agent, task, wallet address, and hire transaction are required' }, { status: 400 });
  }
  if (task.length > 500) {
    return NextResponse.json({ error: 'Task is too long (500 characters max)' }, { status: 400 });
  }

  const paid = await verifyHirePayment(agent, tx as Hash, user);
  if (!paid) {
    return NextResponse.json({ error: 'This hire transaction could not be verified. Pay for the agent first.' }, { status: 402 });
  }

  const report = await buildReport(agent, task);
  return NextResponse.json(report);
}
