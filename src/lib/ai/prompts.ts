// Centralized prompt templates for all LLM interactions

export const SYSTEM_PROMPTS = {
  builderAgent: `You are an expert AI agent (BuilderAgent) working for a General Contractor in construction procurement. You have deep knowledge of CSI MasterFormat divisions, construction means and methods, market pricing, and bid evaluation. Always be professional, precise, and provide construction-specific reasoning.`,

  tradeAgent: `You are an AI agent (TradeAgent) representing a construction subcontractor. You specialize in bid analysis, cost estimation, scope evaluation, and negotiation strategy. You understand construction labor rates, material costs, equipment needs, and market conditions. Always protect your client's profitability while maintaining competitive positioning.`,
} as const;

export const TRADE_DEFINITIONS = [
  { division: 3, name: 'Concrete', scopeItems: ['Cast-in-place concrete', 'Reinforcing steel', 'Formwork', 'Concrete finishing', 'Foundations & footings'] },
  { division: 5, name: 'Structural Steel', scopeItems: ['Structural steel framing', 'Steel decking', 'Miscellaneous metals', 'Steel stairs & railings', 'Anchor bolts'] },
  { division: 7, name: 'Roofing & Waterproofing', scopeItems: ['Roof membrane system', 'Roof insulation', 'Flashing & sheet metal', 'Waterproofing', 'Joint sealants'] },
  { division: 8, name: 'Doors & Windows', scopeItems: ['Hollow metal doors & frames', 'Wood doors', 'Aluminum storefront', 'Curtain wall system', 'Finish hardware'] },
  { division: 9, name: 'Finishes', scopeItems: ['Drywall & metal framing', 'Ceramic tile', 'Acoustical ceilings', 'Painting', 'Flooring'] },
  { division: 22, name: 'Plumbing', scopeItems: ['Domestic water piping', 'Sanitary waste & vent', 'Plumbing fixtures', 'Water heaters', 'Storm drainage'] },
  { division: 23, name: 'HVAC', scopeItems: ['HVAC ductwork', 'Air handling units', 'Chilled water piping', 'Controls & automation', 'Testing & balancing'] },
  { division: 26, name: 'Electrical', scopeItems: ['Power distribution', 'Branch wiring & devices', 'Lighting fixtures', 'Fire alarm system', 'Emergency power'] },
  { division: 31, name: 'Earthwork', scopeItems: ['Site clearing', 'Excavation & fill', 'Grading', 'Soil compaction', 'Erosion control'] },
  { division: 32, name: 'Site Improvements', scopeItems: ['Asphalt paving', 'Concrete sidewalks', 'Landscaping', 'Site utilities', 'Fencing'] },
] as const;

export function scopeDetectionPrompt(project: {
  name: string;
  location: string;
  description: string;
  estimatedValue: number;
}): string {
  const millions = (project.estimatedValue / 1000000).toFixed(1);
  const tradeCount = project.estimatedValue > 50000000 ? '8-10' : project.estimatedValue > 10000000 ? '5-7' : '3-5';

  return `Analyze this construction project and identify which CSI MasterFormat trade divisions are needed.

Project: ${project.name}
Location: ${project.location}
Description: ${project.description || 'Commercial construction project'}
Estimated Value: $${project.estimatedValue.toLocaleString()}

Available CSI divisions:
${TRADE_DEFINITIONS.map(t => `- Division ${t.division}: ${t.name}`).join('\n')}

For a $${millions}M project, select the most appropriate trades (typically ${tradeCount} divisions).

For each trade, provide:
- division: CSI division number
- name: trade name
- reasoning: 1-2 sentences why this trade is needed for THIS specific project
- scopeItems: 3-5 specific scope items tailored to this project

Return JSON: {"trades": [{"division": N, "name": "...", "reasoning": "...", "scopeItems": ["..."]}]}`;
}

export function bidLevelingPrompt(params: {
  tradeName: string;
  estimatedBudget: number;
  bids: Array<{
    subCompanyName: string;
    baseBid: number;
    avgBid: number;
    emr: number | null;
    bondProvided: boolean;
    exclusions: string[];
    inclusions: string[];
  }>;
}): string {
  const avg = params.bids[0]?.avgBid ?? 0;
  return `Analyze these construction bids for ${params.tradeName} (budget: $${params.estimatedBudget.toLocaleString()}):

${params.bids.map(b => `${b.subCompanyName}:
  - Bid: $${b.baseBid.toLocaleString()} (${((b.baseBid - avg) / avg * 100).toFixed(1)}% vs avg of $${Math.round(avg).toLocaleString()})
  - EMR: ${b.emr ?? 'N/A'}
  - Bond: ${b.bondProvided ? 'Yes' : 'No'}
  - Exclusions: ${b.exclusions.join('; ')}
  - Inclusions: ${b.inclusions.join('; ')}`).join('\n\n')}

For each bid, write a 1-2 sentence analysis covering price competitiveness, scope completeness, and risk factors.

Return JSON: {"analyses": [{"companyName": "exact company name", "notes": "analysis..."}]}`;
}

export function negotiationOpenPrompt(params: {
  tradeName: string;
  subName: string;
  bidAmount: number;
  targetPrice: number;
  gapPercent: number;
}): string {
  return `Write a professional negotiation opening message for a construction procurement bid.

Trade: ${params.tradeName}
Subcontractor: ${params.subName}
Their bid: $${params.bidAmount.toLocaleString()}
Your target price: $${params.targetPrice.toLocaleString()}
Gap: ${params.gapPercent.toFixed(1)}%

Write 2-3 professional sentences. Acknowledge their submission quality, reference competitive analysis, and propose the target diplomatically. Return only the message text.`;
}

export function bidEvaluationPrompt(params: {
  companyName: string;
  trades: string[];
  csiDivisions: number[];
  emr: number;
  currentBacklog: number;
  maxProjectSize: number;
  crewSize: number;
  bondingCapacity: number;
  certifications: string[];
  serviceArea: string;
  tradeName: string;
  estimatedBudget: number;
  scopeItems: string[];
  projectValue: number;
}): string {
  return `Evaluate this bid opportunity for ${params.companyName} (${params.trades.join(', ')}).

Opportunity:
- Trade: ${params.tradeName}
- Estimated Budget: $${params.estimatedBudget.toLocaleString()}
- Scope: ${params.scopeItems.join(', ')}
- Project Value: $${params.projectValue.toLocaleString()}

Company Profile:
- Core Trades: ${params.trades.join(', ')}
- CSI Divisions: ${params.csiDivisions.join(', ')}
- EMR: ${params.emr}
- Current Backlog: $${params.currentBacklog.toLocaleString()}
- Max Project Size: $${params.maxProjectSize.toLocaleString()}
- Available Crew: ${params.crewSize}
- Bonding Capacity: $${params.bondingCapacity.toLocaleString()}
- Certifications: ${params.certifications.join(', ')}
- Service Area: ${params.serviceArea}

Provide a bid/no-bid recommendation considering trade match, capacity, backlog, safety record, and bonding.

Return JSON: {"shouldBid": true/false, "score": 0-100, "reasons": ["reason1", "reason2", "reason3"]}`;
}

export function bidScopePrompt(params: {
  companyName: string;
  trades: string[];
  tradeName: string;
  csiDivision: number;
  scopeItems: string[];
  baseBid: number;
}): string {
  return `Generate realistic bid scope details for ${params.companyName} (${params.trades.join(', ')}) bidding on ${params.tradeName}.

CSI Division: ${params.csiDivision}
Scope Items: ${params.scopeItems.join(', ')}
Bid Amount: $${params.baseBid.toLocaleString()}

Generate construction-specific scope:
- inclusions: 3-4 items this bid covers (specific to Division ${params.csiDivision})
- exclusions: 2-3 items explicitly excluded (standard for this trade)
- qualifications: 2 bid conditions/assumptions

Return JSON: {"inclusions": ["..."], "exclusions": ["..."], "qualifications": ["..."]}`;
}

export function negotiationResponsePrompt(params: {
  companyName: string;
  tradeName: string;
  originalBid: number;
  gcOffer: number;
  gapPercent: number;
  roundNumber: number;
  minAcceptable: number;
  decision: 'accept' | 'counter' | 'escalate';
  counterPrice: number;
}): string {
  return `You are negotiating on behalf of ${params.companyName} for ${params.tradeName}.

Situation:
- Original bid: $${params.originalBid.toLocaleString()}
- GC's latest offer: $${params.gcOffer.toLocaleString()}
- Gap: ${params.gapPercent.toFixed(1)}%
- Round: ${params.roundNumber}
- Minimum acceptable: $${params.minAcceptable.toLocaleString()} (8% max discount)

Your decision: ${params.decision === 'accept' ? `ACCEPT at $${params.counterPrice.toLocaleString()}` : params.decision === 'escalate' ? `ESCALATE - counter at $${params.counterPrice.toLocaleString()}` : `COUNTER at $${params.counterPrice.toLocaleString()}`}

Write a professional 2-3 sentence response.
${params.decision === 'counter' ? 'Reference current material/labor costs or supply chain factors.' : ''}
${params.decision === 'accept' ? 'Express enthusiasm about the partnership.' : ''}
${params.decision === 'escalate' ? 'Explain the gap requires management approval.' : ''}

Return only the message text.`;
}
