import { NextRequest, NextResponse } from 'next/server';
import { buildReport } from '@/lib/report';
import { claimHirePayment, claimHirePaymentV3 } from '@/lib/wif';
import { commitAnswer } from '@/lib/commit';
import { HIRE_V3_CONFIGURED } from '@/lib/v3';
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

  // V3 binds the question to the payment, so the answer cannot be claimed with a
  // different task than the one that was paid for.
  let hireId: bigint | null = null;
  if (HIRE_V3_CONFIGURED) {
    const claim = await claimHirePaymentV3(agent, task, tx as Hash, user);
    if (!claim.ok) {
      return NextResponse.json({ error: 'This hire transaction could not be verified. Pay for the agent first.' }, { status: 402 });
    }
    hireId = claim.hireId;
  } else {
    const paid = await claimHirePayment(agent, task, tx as Hash, user);
    if (!paid) {
      return NextResponse.json({ error: 'This hire transaction could not be verified. Pay for the agent first.' }, { status: 402 });
    }
  }

  const report = await buildReport(agent, task);

  // Record the answer hash onchain for V3 hires. Non-fatal: the buyer keeps their answer.
  const committed = hireId !== null ? await commitAnswer(hireId, report.result) : false;

  return NextResponse.json({ ...report, committed, rail: HIRE_V3_CONFIGURED ? 'v3' : 'v1' });
}
