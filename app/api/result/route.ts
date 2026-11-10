import { NextRequest, NextResponse } from 'next/server';
import { buildReport } from '@/lib/report';
import { claimRedemption, loadAnswer, releaseRedemption, saveAnswer } from '@/lib/redemption';
import { redemptionKey, verifyV1Hire, verifyV3Hire } from '@/lib/wif';
import { commitAnswer, hireClosed, readHire } from '@/lib/commit';
import { hashResult, signReceipt } from '@/lib/receipt';
import { HIRE_V3_CONFIGURED } from '@/lib/v3';
import { agents } from '@/lib/agents';
import { formatUnits, isAddress, isHash, type Hash } from 'viem';

export const dynamic = 'force-dynamic';
// Building the answer plus waiting for the commit to be mined can exceed the 10s default.
export const maxDuration = 60;

const AGENTS = new Set(['monitor', 'data', 'ledger', 'research']);

const UNVERIFIED = 'This hire transaction could not be verified. Pay for the agent first.';
const ALREADY_ANSWERED =
  'This hire was already answered and its answer hash is committed onchain. The answer was delivered to the paying wallet when it was committed.';
const EXPIRED =
  'This hire passed its 10 minute answer deadline without a committed answer, so no answer can be released. The full payment is refundable from the agent bond.';

function wif(amount: bigint): string {
  return formatUnits(amount, 18);
}

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
  const key = redemptionKey(rail, tx);
  const meta = agents.find((item) => item.id === agent);

  // 1. Verify the payment, without consuming it yet.
  let hireId: bigint | null = null;
  let paid = 0n;
  let burned = 0n;
  if (rail === 'v3') {
    const verified = await verifyV3Hire(agent, task, tx as Hash, user);
    if (!verified.ok || verified.hireId === null) return NextResponse.json({ error: UNVERIFIED }, { status: 402 });
    hireId = verified.hireId;
    paid = verified.paid;
    burned = verified.burned;
  } else if (!(await verifyV1Hire(agent, task, tx as Hash, user))) {
    return NextResponse.json({ error: UNVERIFIED }, { status: 402 });
  }

  // 2. A verified payer asking again gets the answer already delivered for this hire.
  const delivered = await loadAnswer<Record<string, unknown>>(key);
  if (delivered) return NextResponse.json({ ...delivered, redelivered: true });

  // 3. On V3, never answer a hire that is refunded or past its deadline: the hirer would
  //    keep the answer and also take the refund.
  if (hireId !== null) {
    try {
      const state = await readHire(hireId);
      if (!state) return NextResponse.json({ error: UNVERIFIED }, { status: 402 });
      if (state.committed) {
        // Committed earlier, and the stored copy (checked above) is gone: it was delivered once.
        return NextResponse.json({ error: ALREADY_ANSWERED, retryable: false, refundable: false }, { status: 409 });
      }
      if (await hireClosed(state)) {
        return NextResponse.json({ error: EXPIRED, refundable: !state.refunded, hireId: hireId.toString() }, { status: 410 });
      }
    } catch {
      return NextResponse.json({ error: 'Could not read the hire from Robinhood Chain. Retry in a moment.', retryable: true }, { status: 503 });
    }
  }

  // 4. Build the answer. If the sources fail, the payment stays unconsumed so a retry works.
  let report;
  try {
    report = await buildReport(agent, task);
  } catch {
    return NextResponse.json(
      { error: 'The live sources did not answer. Nothing was consumed - retry in a moment.', retryable: true, refundable: rail === 'v3' },
      { status: 503 }
    );
  }

  // 5. Consume the hire exactly once. On V1, if storage is down, serving a paying buyer beats
  //    stranding their payment. On V3 the onchain commit is the second lock.
  let claimed = true;
  try {
    claimed = await claimRedemption(key);
  } catch {
    claimed = true;
  }
  if (!claimed) {
    return rail === 'v3'
      ? NextResponse.json({ error: 'This hire is being answered by another request. Retry in a few seconds.', retryable: true }, { status: 409 })
      : NextResponse.json({ error: 'This hire transaction was already used for an answer.', retryable: false }, { status: 409 });
  }

  // 6. V3: the answer is released only once its hash is mined onchain.
  let commitTx: Hash | null = null;
  if (hireId !== null) {
    const outcome = await commitAnswer(hireId, report.result);
    if (outcome.status === 'expired') {
      return NextResponse.json({ error: EXPIRED, refundable: true, hireId: hireId.toString() }, { status: 410 });
    }
    if (outcome.status === 'failed' && outcome.reason === 'hire already committed with a different answer') {
      return NextResponse.json({ error: ALREADY_ANSWERED, retryable: false, refundable: false }, { status: 409 });
    }
    if (outcome.status === 'failed') {
      await releaseRedemption(key).catch(() => undefined);
      return NextResponse.json(
        {
          error: 'The answer could not be committed onchain, so it was not released. Your payment is safe: retry, or reclaim it from the bond after the deadline.',
          retryable: true,
          refundable: true,
        },
        { status: 503 }
      );
    }
    commitTx = outcome.tx;
  }

  const price = rail === 'v3' ? paid : null;
  const burn = rail === 'v3' ? burned : null;
  const v1Burn = meta ? Math.floor((meta.price * 1000) / 10000) : 0;

  const receipt = signReceipt({
    v: 1,
    agent,
    name: meta?.name ?? agent,
    task,
    result: report.result,
    resultHash: hashResult(report.result),
    price: price !== null ? wif(price) : String(meta?.price ?? ''),
    burn: burn !== null ? wif(burn) : String(v1Burn),
    operator: price !== null && burn !== null ? wif(price - burn) : String(meta ? meta.price - v1Burn : ''),
    tx,
    at: new Date().toISOString(),
  });

  const payload = {
    ...report,
    committed: hireId !== null,
    commitTx,
    hireId: hireId?.toString() ?? null,
    rail,
    receipt,
    receiptVerified: receipt !== null,
  };
  await saveAnswer(key, payload);
  return NextResponse.json(payload);
}
