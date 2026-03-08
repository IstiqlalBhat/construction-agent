# Negotiation Guardrails & Pricing Strategy

## Hard Limits

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Maximum discount from original bid | 15% | Below this, profitability is unsustainable |
| Minimum acceptable margin | 8% | Accept any offer >= 92% of original bid |
| Escalation round threshold | 4 | After 4 rounds, human review is required |
| Counter split ratio | 60/40 | Counter at GC_offer + (gap * 0.6) — lean toward original |

## Decision Logic

```
IF gc_offer >= original_bid * 0.92:
  → ACCEPT at gc_offer

ELSE IF gap_percent > 15% OR round_number >= 4:
  → ESCALATE, counter at original_bid * 0.95

ELSE:
  → COUNTER at gc_offer + (original_bid - gc_offer) * 0.6
```

## VE (Value Engineering) Proposals

Include a VE proposal ~50% of the time when countering. Options:
1. Substitute equivalent-spec material from alternative manufacturer
2. Prefabricate assemblies off-site to reduce field labor hours
3. Optimize routing and layout to reduce material quantities

VE savings typically range $15,000-$45,000.

## Bid Pricing Strategy

- Base bid = estimated budget * (0.85 to 1.15 random multiplier)
- Line items split: ~40% labor, ~45% material, ~15% equipment (with variance)
- Bond provided when budget > $500,000
- Insurance always meets requirements
- Pricing held for 30 days from submission
- Based on 5-day work week, single shift
