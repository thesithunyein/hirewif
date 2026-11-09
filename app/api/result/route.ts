import { NextRequest, NextResponse } from 'next/server';
import { buildReport } from '@/lib/report';
import { claimRedemption } from '@/lib/redemption';
import { redemptionKey, verifyV1Hire, verifyV3Hire } from '@/lib/wif';
import { commitAnswer } from '@/lib/commit';
import { hashResult, signReceipt } from '@/lib/receipt';
import { HIRE_V3_CONFIGURED } from '@/lib/v3';
import { agents } from '@/lib/agents';
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

  const rail: 'v1' | 'v3' = HIRE_V3_CONFIGURED ? 'v3' : 'v1';

  // 1. Verify the payment, without consuming it yet.
  let hireId: bigint | null = null;
  if (rail === 'v3') {
    const verified = await verifyV3Hire(agent, task, tx as Hash, user);
    if (!verified.ok) {
      return NextResponse.json({ error: 'This hire transaction could not be verified. Pay for the agent first.' }, { status: 402 });
    }
    hireId = verified.hireId;
  } else if (!(await verifyV1Hire(agent, task, tx as Hash, user))) {
    return NextResponse.json({ error: 'This hire transaction could not be verified. Pay for the agent first.' }, { status: 402 });
  }

  // 2. Build the answer. If the sources fail, the payment stays unconsumed so a retry works.
  let report;
  try {
    report = await buildReport(agent, task);
  } catch {
    return NextResponse.json(
      {
        error: 'The live sources did not answer. Nothing was consumed - retry in a moment.',
        retryable: true,
        refundable: rail === 'v3',
      },
      { status: 503 }
    );
  }

  // 3. Consume the hire exactly once. If storage is down, serving a paying buyer beats
  //    stranding their payment, so the answer is still returned and flagged.
  let claimed = true;
  try {
    claimed = await claimRedemption(redemptionKey(rail, tx));
  } catch {
    claimed = true;
  }
  if (!claimed) {
    return NextResponse.json({ error: 'This hire transaction was already used for an answer.', retryable: false }, { status: 409 });
  }

  // 4. Record the answer hash so the bond can only be reclaimed when nothing was delivered.
  const committed = hireId !== null ? await commitAnswer(hireId, report.result) : false;

  const meta = agents.find((item) => item.id === agent);
  const burn = meta ? Math.floor((meta.price * 1000) / 10000) : 0;

  const receipt = signReceipt({
    v: 1,
    agent,
    name: meta?.name ?? agent,
    task,
    result: report.result,
    resultHash: hashResult(report.result),
    price: String(meta?.price ?? ''),
    burn: String(burn),
    operator: String(meta ? meta.price - burn : ''),
    tx,
    at: new Date().toISOString(),
  });

  return NextResponse.json({ ...report, committed, rail, receipt, receiptVerified: receipt !== null });
}
