import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

// GET bids with filters
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const tradePackageId = request.nextUrl.searchParams.get('tradePackageId');
  const subId = request.nextUrl.searchParams.get('subId');

  let bids;
  if (tradePackageId) {
    bids = await store.getBidsByTradePackage(tradePackageId);
  } else if (projectId) {
    bids = await store.getBidsByProject(projectId);
  } else if (subId) {
    bids = await store.getBidsBySub(subId);
  } else {
    bids = await store.getAllBids();
  }

  return NextResponse.json(bids);
}
