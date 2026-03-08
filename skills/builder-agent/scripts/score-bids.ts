#!/usr/bin/env npx tsx
/**
 * Bid Scoring Utility
 * Pure calculation — no database or API dependencies.
 * Reads bid data from stdin (JSON), outputs scored/ranked results.
 *
 * Usage:
 *   cat bids.json | npx tsx scripts/score-bids.ts
 *
 * Input format (JSON array on stdin):
 * [
 *   { "company": "MechPro", "base_bid": 3580000, "bond_provided": true, "insurance_ok": true, "exclusions": 2, "emr": 0.82 },
 *   { "company": "CoolAir", "base_bid": 3750000, "bond_provided": true, "insurance_ok": true, "exclusions": 1, "emr": 0.95 }
 * ]
 */

import * as readline from 'readline';

interface BidInput {
  company: string;
  base_bid: number;
  bond_provided: boolean;
  insurance_ok: boolean;
  exclusions: number;
  emr: number;
}

interface ScoredBid extends BidInput {
  score: number;
  price_delta_pct: number;
  rank: number;
}

async function readStdin(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin });
  const lines: string[] = [];
  for await (const line of rl) lines.push(line);
  return lines.join('\n');
}

async function main() {
  const input = await readStdin();
  const bids: BidInput[] = JSON.parse(input);

  if (!bids.length) {
    console.log(JSON.stringify({ error: 'No bids provided' }));
    return;
  }

  const avgBid = bids.reduce((s, b) => s + b.base_bid, 0) / bids.length;

  const scored: ScoredBid[] = bids.map(bid => {
    const priceScore = Math.max(0, 100 - Math.abs(bid.base_bid - avgBid) / avgBid * 100);
    const complianceScore = (bid.bond_provided ? 15 : 0) + (bid.insurance_ok ? 15 : 0);
    const exclusionPenalty = bid.exclusions * 5;
    const emrScore = Math.max(0, (1.0 - bid.emr) * 100);
    const score = Math.round(priceScore * 0.5 + complianceScore + emrScore * 0.2 - exclusionPenalty);
    const priceDelta = ((bid.base_bid - avgBid) / avgBid * 100);

    return { ...bid, score, price_delta_pct: parseFloat(priceDelta.toFixed(1)), rank: 0 };
  });

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((b, i) => b.rank = i + 1);

  console.log(JSON.stringify({ avg_bid: Math.round(avgBid), bids: scored }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
