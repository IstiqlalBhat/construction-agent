import { Bid, TradePackage, Company, NegotiationSession } from '../types';
import { store } from '../store';
import { createA2AMessage } from '../a2a/protocol';
import { v4 as uuidv4 } from 'uuid';
import { askGemini, askGeminiJSON } from '../ai/gemini';
import { SYSTEM_PROMPTS, bidEvaluationPrompt, bidScopePrompt, negotiationResponsePrompt } from '../ai/prompts';
import { AI_CONFIG, isFeatureEnabled } from '../ai/config';

export class TradeAgent {
  private subCompanyId: string;
  private company: Company | null = null;

  constructor(subCompanyId: string) {
    this.subCompanyId = subCompanyId;
  }

  private async getCompany(): Promise<Company> {
    if (!this.company) {
      this.company = await store.getCompany(this.subCompanyId);
      if (!this.company) throw new Error(`Company not found: ${this.subCompanyId}`);
    }
    return this.company;
  }

  async evaluateBidOpportunity(tradePackage: TradePackage, projectValue: number): Promise<{
    shouldBid: boolean;
    score: number;
    reasons: string[];
  }> {
    const company = await this.getCompany();

    if (isFeatureEnabled('bidEvaluation')) {
      const aiResult = await askGeminiJSON<{
        shouldBid: boolean;
        score: number;
        reasons: string[];
      }>(
        bidEvaluationPrompt({
          companyName: company.name,
          trades: company.trades,
          csiDivisions: company.csiDivisions,
          emr: company.prequalifications.emr,
          currentBacklog: company.capacity.currentBacklog,
          maxProjectSize: company.capacity.maxProjectSize,
          crewSize: company.capacity.crewSize,
          bondingCapacity: company.prequalifications.bondingCapacity,
          certifications: company.prequalifications.certifications,
          serviceArea: company.serviceArea,
          tradeName: tradePackage.tradeName,
          estimatedBudget: tradePackage.estimatedBudget,
          scopeItems: tradePackage.scopeItems,
          projectValue,
        }),
        SYSTEM_PROMPTS.tradeAgent,
        AI_CONFIG.params.bidEvaluation
      );

      if (aiResult && typeof aiResult.shouldBid === 'boolean') {
        return {
          shouldBid: aiResult.shouldBid,
          score: Math.min(100, Math.max(0, aiResult.score)),
          reasons: aiResult.reasons || [],
        };
      }
    }

    return this.evaluateBidRuleBased(tradePackage, company);
  }

  async generateBid(tradePackage: TradePackage, projectId: string): Promise<Bid> {
    const company = await this.getCompany();
    const budget = tradePackage.estimatedBudget;
    const bidMultiplier = 0.85 + Math.random() * 0.30;
    const baseBid = Math.round(budget * bidMultiplier);
    const lineItems = this.generateLineItems(tradePackage, baseBid);

    let scopeDetails: { inclusions: string[]; exclusions: string[]; qualifications: string[] };

    if (isFeatureEnabled('bidGeneration')) {
      const aiScope = await askGeminiJSON<{
        inclusions: string[];
        exclusions: string[];
        qualifications: string[];
      }>(
        bidScopePrompt({
          companyName: company.name,
          trades: company.trades,
          tradeName: tradePackage.tradeName,
          csiDivision: tradePackage.csiDivision,
          scopeItems: tradePackage.scopeItems,
          baseBid,
        }),
        SYSTEM_PROMPTS.tradeAgent,
        AI_CONFIG.params.bidGeneration
      );
      scopeDetails = aiScope || this.generateScopeDetailsFallback(tradePackage);
    } else {
      scopeDetails = this.generateScopeDetailsFallback(tradePackage);
    }

    const bid: Bid = {
      id: uuidv4(),
      tradePackageId: tradePackage.id,
      projectId,
      subCompanyId: this.subCompanyId,
      subCompanyName: company.name,
      baseBid,
      lineItems,
      inclusions: scopeDetails.inclusions,
      exclusions: scopeDetails.exclusions,
      qualifications: scopeDetails.qualifications,
      schedule: {
        mobilizationDate: company.capacity.availableStart,
        completionDate: new Date(new Date(company.capacity.availableStart).getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        leadTimeItems: this.generateLeadTimeItems(tradePackage.csiDivision),
      },
      compliance: {
        bondProvided: budget > 500000,
        insuranceMeetsRequirements: true,
      },
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };

    await store.createBid(bid);

    await createA2AMessage(
      'BID_SUBMISSION',
      `agent-${this.subCompanyId}`,
      `agent-gc-turner`,
      projectId,
      {
        bidId: bid.id,
        tradePackageId: tradePackage.id,
        baseBid: bid.baseBid,
        companyName: company.name,
      }
    );

    return bid;
  }

  async respondToNegotiation(session: NegotiationSession): Promise<NegotiationSession> {
    const company = await this.getCompany();
    const lastRound = session.rounds[session.rounds.length - 1];
    const bid = await store.getBid(session.bidId);
    if (!bid) return session;

    const originalBid = bid.baseBid;
    const gcOffer = lastRound.proposedPrice;
    const gap = originalBid - gcOffer;
    const gapPercent = (gap / originalBid) * 100;
    const minAcceptable = originalBid * (1 - AI_CONFIG.guardrails.minMarginPercent / 100);
    const roundNumber = session.rounds.length + 1;

    // Programmatic guardrails determine decision
    let decision: 'accept' | 'counter' | 'escalate';
    let counterPrice: number;

    if (gcOffer >= minAcceptable) {
      decision = 'accept';
      counterPrice = gcOffer;
    } else if (gapPercent > AI_CONFIG.guardrails.maxDiscountPercent || roundNumber >= AI_CONFIG.guardrails.escalationThreshold) {
      decision = 'escalate';
      counterPrice = Math.round(originalBid * 0.95);
    } else {
      decision = 'counter';
      counterPrice = Math.round(gcOffer + gap * 0.6);
    }

    const tp = await store.getTradePackage(session.tradePackageId);

    // LLM generates the message, guardrails enforce the price
    let message = '';
    if (isFeatureEnabled('negotiation')) {
      message = await askGemini(
        negotiationResponsePrompt({
          companyName: company.name,
          tradeName: tp?.tradeName || 'construction work',
          originalBid,
          gcOffer,
          gapPercent,
          roundNumber,
          minAcceptable,
          decision,
          counterPrice,
        }),
        SYSTEM_PROMPTS.tradeAgent,
        AI_CONFIG.params.negotiationResponse
      );
    }

    if (!message) {
      if (decision === 'accept') {
        message = `We accept the proposed price of $${counterPrice.toLocaleString()}. We look forward to delivering quality work on this project.`;
      } else if (decision === 'escalate') {
        message = `The ${gapPercent.toFixed(1)}% gap between our positions requires management review. Our counter of $${counterPrice.toLocaleString()} reflects our minimum sustainable pricing given current market conditions.`;
      } else {
        message = `Considering current material costs and labor rates, we can adjust to $${counterPrice.toLocaleString()}. This reflects fair market value for the specified scope of work.`;
      }
    }

    let veProposal: string | undefined;
    if (decision === 'counter' && Math.random() > 0.5) {
      const veOptions = [
        'Substitute equivalent-spec material from alternative manufacturer',
        'Prefabricate assemblies off-site to reduce field labor hours',
        'Optimize routing and layout to reduce material quantities',
      ];
      veProposal = veOptions[Math.floor(Math.random() * veOptions.length)];
      const veSavings = 15000 + Math.round(Math.random() * 30000);
      message += ` Additionally, we propose a VE option: ${veProposal} for potential savings of $${veSavings.toLocaleString()}.`;
    }

    const round = {
      roundNumber,
      fromAgent: 'sub' as const,
      proposedPrice: counterPrice,
      message,
      veProposal,
      timestamp: new Date().toISOString(),
    };

    // Persist round
    await store.addNegotiationRound(session.id, round);
    session.rounds.push(round);

    if (decision === 'accept') {
      session.status = 'agreed';
      session.finalPrice = counterPrice;
      await store.updateNegotiationSession(session.id, { status: 'agreed', finalPrice: counterPrice });
    } else if (decision === 'escalate') {
      session.status = 'escalated';
      await store.updateNegotiationSession(session.id, { status: 'escalated' });
    }

    await createA2AMessage(
      decision === 'accept' ? 'NEGOTIATION_CLOSE' : 'COUNTEROFFER',
      `agent-${this.subCompanyId}`,
      `agent-${session.gcCompanyId}`,
      session.projectId,
      {
        negotiationId: session.id,
        roundNumber,
        proposedPrice: counterPrice,
        status: decision === 'accept' ? 'agreed' : decision === 'escalate' ? 'escalated' : 'open',
      }
    );

    return session;
  }

  private evaluateBidRuleBased(tradePackage: TradePackage, company: Company): { shouldBid: boolean; score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 50;

    if (company.csiDivisions.includes(tradePackage.csiDivision)) {
      score += 25;
      reasons.push('Strong trade match');
    } else {
      score -= 30;
      reasons.push('Trade not in core competencies');
    }

    if (tradePackage.estimatedBudget <= company.capacity.maxProjectSize) {
      score += 15;
      reasons.push('Within capacity limits');
    } else {
      score -= 20;
      reasons.push('Exceeds max project size');
    }

    const backlogRatio = company.capacity.currentBacklog / (company.capacity.maxProjectSize * 5);
    if (backlogRatio < 0.7) {
      score += 10;
      reasons.push('Backlog capacity available');
    } else if (backlogRatio > 0.9) {
      score -= 15;
      reasons.push('Near capacity, resource strain risk');
    }

    if (company.prequalifications.emr < 0.85) {
      score += 5;
      reasons.push('Strong safety record (low EMR)');
    }

    return {
      shouldBid: score >= 60,
      score: Math.min(100, Math.max(0, score)),
      reasons,
    };
  }

  private generateLineItems(tp: TradePackage, baseBid: number): Bid['lineItems'] {
    const items = tp.scopeItems;
    const totalParts = items.length;
    let remaining = baseBid;

    return items.map((item, idx) => {
      const isLast = idx === totalParts - 1;
      const portion = isLast ? remaining : Math.round(remaining / (totalParts - idx) * (0.7 + Math.random() * 0.6));
      remaining -= isLast ? remaining : portion;

      const laborPct = 0.35 + Math.random() * 0.15;
      const materialPct = 0.40 + Math.random() * 0.15;
      const equipPct = 1 - laborPct - materialPct;

      return {
        csiCode: `${tp.csiDivision} ${String(Math.floor(Math.random() * 99)).padStart(2, '0')} 00`,
        description: item,
        laborCost: Math.round(portion * laborPct),
        materialCost: Math.round(portion * materialPct),
        equipmentCost: Math.round(portion * equipPct),
        subtotal: portion,
      };
    });
  }

  private generateScopeDetailsFallback(tp: TradePackage) {
    return {
      inclusions: [
        `All Division ${tp.csiDivision} work per plans & specifications`,
        'Labor, materials, and equipment as specified',
        'Coordination with other trades',
        'Shop drawings and submittals',
      ],
      exclusions: [
        'Work by other divisions',
        'Permit fees',
        'After-hours or overtime work',
      ],
      qualifications: [
        'Based on 5-day work week, single shift',
        'Pricing held for 30 days from submission',
      ],
    };
  }

  private generateLeadTimeItems(division: number): { item: string; weeks: number }[] {
    const items: Record<number, { item: string; weeks: number }[]> = {
      3: [{ item: 'Reinforcing steel', weeks: 6 }],
      5: [{ item: 'Structural steel', weeks: 14 }, { item: 'Steel decking', weeks: 8 }],
      22: [{ item: 'Commercial fixtures', weeks: 8 }, { item: 'Water heaters', weeks: 6 }],
      23: [{ item: 'Air handling units', weeks: 16 }, { item: 'Chillers', weeks: 20 }],
      26: [{ item: 'Main switchgear', weeks: 16 }, { item: 'Transformers', weeks: 20 }],
      31: [],
      32: [],
      7: [{ item: 'Roofing membrane', weeks: 4 }],
      8: [{ item: 'Curtain wall', weeks: 14 }],
      9: [{ item: 'Specialty tile', weeks: 8 }],
    };
    return items[division] ?? [];
  }
}
