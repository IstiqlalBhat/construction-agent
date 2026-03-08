#!/usr/bin/env npx tsx
/**
 * Negotiation Calculator Utility
 * Pure calculation — no database or API dependencies.
 * Applies hard guardrails and recommends a response.
 *
 * Usage:
 *   npx tsx scripts/calculate-negotiation.ts \
 *     --original-bid 3580000 \
 *     --gc-offer 3200000 \
 *     --round 2 \
 *     --max-discount 15 \
 *     --min-margin 8 \
 *     --escalation-rounds 4
 */

function main() {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined =>
    args.find((a, i) => args[i - 1] === flag);

  const originalBid = parseFloat(get('--original-bid') || '0');
  const gcOffer = parseFloat(get('--gc-offer') || '0');
  const round = parseInt(get('--round') || '1');
  const maxDiscountPct = parseFloat(get('--max-discount') || '15');
  const minMarginPct = parseFloat(get('--min-margin') || '8');
  const escalationRounds = parseInt(get('--escalation-rounds') || '4');

  if (!originalBid || !gcOffer) {
    console.error('Usage: --original-bid <N> --gc-offer <N> [--round N] [--max-discount N] [--min-margin N] [--escalation-rounds N]');
    process.exit(1);
  }

  const minAcceptable = originalBid * (1 - minMarginPct / 100);
  const maxDiscountFloor = originalBid * (1 - maxDiscountPct / 100);
  const gapPercent = ((originalBid - gcOffer) / originalBid) * 100;

  let decision: 'accept' | 'counter' | 'escalate';
  let counterPrice: number;

  if (gcOffer >= minAcceptable) {
    decision = 'accept';
    counterPrice = gcOffer;
  } else if (gapPercent > maxDiscountPct || round >= escalationRounds) {
    decision = 'escalate';
    counterPrice = Math.round(originalBid * 0.95);
  } else {
    decision = 'counter';
    counterPrice = Math.round(gcOffer + (originalBid - gcOffer) * 0.6);
    if (counterPrice < maxDiscountFloor) counterPrice = Math.round(maxDiscountFloor);
  }

  console.log(JSON.stringify({
    decision,
    original_bid: originalBid,
    gc_offer: gcOffer,
    counter_price: counterPrice,
    gap_percent: parseFloat(gapPercent.toFixed(1)),
    round,
    min_acceptable: Math.round(minAcceptable),
    max_discount_floor: Math.round(maxDiscountFloor),
  }, null, 2));
}

main();
