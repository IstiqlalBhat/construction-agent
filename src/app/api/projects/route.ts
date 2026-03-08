import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { Project } from '@/lib/types';
import { BuilderAgent } from '@/lib/agents/builder-agent';
import { TradeAgent } from '@/lib/agents/trade-agent';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60;

// GET all projects or filter by GC
export async function GET(request: NextRequest) {
  const gcId = request.nextUrl.searchParams.get('gcId');
  let projects: Project[];

  if (gcId) {
    projects = await store.getProjectsByGC(gcId);
  } else {
    projects = await store.getAllProjects();
  }

  return NextResponse.json(projects);
}

// POST create new project and run scope detection
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, location, estimatedValue, description, gcCompanyId } = body;

  const project: Project = {
    id: uuidv4(),
    name,
    location,
    estimatedValue,
    gcCompanyId: gcCompanyId || 'gc-turner',
    status: 'draft',
    tradePackages: [],
    createdAt: new Date().toISOString(),
    description: description || '',
  };

  await store.createProject(project);

  // Run scope detection automatically
  const agent = new BuilderAgent(project.gcCompanyId);
  const tradePackages = await agent.detectScopes(project);

  // Auto-discover subs and broadcast ITBs for each trade package
  for (const tp of tradePackages) {
    await store.updateTradePackageStatus(tp.id, 'approved');
    tp.status = 'approved';
    const matchedSubs = await agent.discoverSubs(tp);

    if (matchedSubs.length > 0) {
      await agent.broadcastITB(tp, matchedSubs);

      // Auto-generate bids from matched subs
      for (const sub of matchedSubs) {
        const tradeAgent = new TradeAgent(sub.id);
        const evaluation = await tradeAgent.evaluateBidOpportunity(tp, project.estimatedValue);

        if (evaluation.shouldBid) {
          await tradeAgent.generateBid(tp, project.id);
        }
      }

      await store.updateTradePackageStatus(tp.id, 'bids_received');
    }
  }

  await store.updateProjectStatus(project.id, 'bidding');

  const updatedProject = await store.getProject(project.id);
  return NextResponse.json(updatedProject, { status: 201 });
}
