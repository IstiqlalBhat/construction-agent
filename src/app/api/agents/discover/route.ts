import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

// GET agent cards / companies
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') as 'GC' | 'Sub' | null;
  const companyId = request.nextUrl.searchParams.get('companyId');

  if (companyId) {
    const card = await store.getAgentCard(companyId);
    return card ? NextResponse.json(card) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (type) {
    const cards = await store.getAgentCardsByType(type);
    return NextResponse.json(cards);
  }

  const cards = await store.getAllAgentCards();
  return NextResponse.json(cards);
}
