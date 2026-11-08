import { NextRequest, NextResponse } from 'next/server';
import { buildReport } from '@/lib/report';

export const dynamic = 'force-dynamic';

const AGENTS = new Set(['monitor', 'data', 'ledger', 'research']);

export async function POST(req: NextRequest) {
  let body: { agent?: string; task?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const agent = String(body.agent ?? '');
  const task = String(body.task ?? '').trim();

  if (!AGENTS.has(agent) || !task) {
    return NextResponse.json({ error: 'Missing or unknown agent, or empty task' }, { status: 400 });
  }
  if (task.length > 500) {
    return NextResponse.json({ error: 'Task is too long (500 characters max)' }, { status: 400 });
  }

  const report = await buildReport(agent, task);
  return NextResponse.json(report);
}
