import { NextRequest, NextResponse } from 'next/server';
import { BuilderAgent } from '@/lib/agents/builder-agent';

export const maxDuration = 60;

// POST level bids for a trade package
export async function POST(request: NextRequest) {
  const { tradePackageId, gcCompanyId } = await request.json();
  const agent = new BuilderAgent(gcCompanyId || 'gc-turner');
  const leveledBids = await agent.levelBids(tradePackageId);
  return NextResponse.json(leveledBids);
}
