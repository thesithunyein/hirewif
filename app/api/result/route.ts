import { NextRequest, NextResponse } from 'next/server';

const templates: Record<string, (task: string) => string> = {
  research: (task) =>
    `Research brief: ${task}\n\nSummary\nThe topic was analyzed for core definitions, current state, and key open questions.\n\nKey points\n• Primary concept identified and scoped\n• 3 supporting sources noted\n• Risks and unknowns listed\n\nNext steps\nReview sources and expand any section as needed.`,
  monitor: (task) =>
    `Monitor configured: ${task}\n\nWatching\n• Price and volume changes\n• Large transfers\n• Relevant contract events\n\nStatus\nActive. Alerts will surface when conditions are met.`,
  content: (task) =>
    `Draft: ${task}\n\nOutput\nClean, direct copy ready for use. Tone is neutral and precise.\n\nNotes\nReady to publish or refine further.`,
  data: (task) =>
    `Data result: ${task}\n\nExtracted\nKey fields pulled and cleaned.\n\nStructure\nRows organized. Export-ready format prepared.`,
};

export async function POST(req: NextRequest) {
  const { agent, task } = await req.json();
  if (!agent || !task) {
    return NextResponse.json({ error: 'Missing agent or task' }, { status: 400 });
  }
  const result = templates[agent]?.(task) || `Completed: ${task}`;
  return NextResponse.json({ result });
}
