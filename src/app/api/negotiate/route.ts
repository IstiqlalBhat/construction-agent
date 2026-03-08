import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { BuilderAgent } from '@/lib/agents/builder-agent';
import { TradeAgent } from '@/lib/agents/trade-agent';

export const maxDuration = 60;

// GET negotiation sessions
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (sessionId) {
    const session = await store.getNegotiationSession(sessionId);
    return session ? NextResponse.json(session) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (projectId) {
    const sessions = await store.getNegotiationsByProject(projectId);
    return NextResponse.json(sessions);
  }

  const sessions = await store.getAllNegotiations();
  return NextResponse.json(sessions);
}

// POST start or continue negotiation
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, bidId, targetPrice, sessionId, gcCompanyId, counterPrice } = body;

  if (action === 'open') {
    const bid = await store.getBid(bidId);
    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    const gcAgent = new BuilderAgent(gcCompanyId || 'gc-turner');
    const negotiationId = await gcAgent.openNegotiation(bid, targetPrice);
    const session = await store.getNegotiationSession(negotiationId);
    if (!session) return NextResponse.json({ error: 'Session creation failed' }, { status: 500 });

    // Auto-respond from sub agent
    const subAgent = new TradeAgent(bid.subCompanyId);
    const updatedSession = await subAgent.respondToNegotiation(session);

    return NextResponse.json(updatedSession, { status: 201 });
  }

  if (action === 'counter') {
    const session = await store.getNegotiationSession(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const round = {
      roundNumber: session.rounds.length + 1,
      fromAgent: 'gc' as const,
      proposedPrice: counterPrice,
      message: `Counter offer of $${counterPrice.toLocaleString()}. We believe this reflects fair market value for the scope of work.`,
      timestamp: new Date().toISOString(),
    };

    await store.addNegotiationRound(session.id, round);
    session.rounds.push(round);

    // Sub agent auto-responds
    const subAgent = new TradeAgent(session.subCompanyId);
    const updatedSession = await subAgent.respondToNegotiation(session);

    return NextResponse.json(updatedSession);
  }

  if (action === 'accept') {
    const session = await store.getNegotiationSession(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const lastSubRound = [...session.rounds].reverse().find(r => r.fromAgent === 'sub');
    if (lastSubRound) {
      await store.updateNegotiationSession(session.id, {
        status: 'agreed',
        finalPrice: lastSubRound.proposedPrice,
        agreedTerms: { price: String(lastSubRound.proposedPrice), acceptedBy: 'gc' },
      });

      session.status = 'agreed';
      session.finalPrice = lastSubRound.proposedPrice;

      // Award the bid
      const gcAgent = new BuilderAgent(gcCompanyId || 'gc-turner');
      await store.updateBid(session.bidId, { baseBid: lastSubRound.proposedPrice });
      await gcAgent.awardBid(session.bidId);
    }

    return NextResponse.json(session);
  }

  if (action === 'award') {
    const bid = await store.getBid(bidId);
    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    const gcAgent = new BuilderAgent(gcCompanyId || 'gc-turner');
    await gcAgent.awardBid(bidId);

    const updatedBid = await store.getBid(bidId);
    return NextResponse.json(updatedBid);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
