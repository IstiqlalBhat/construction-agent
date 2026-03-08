import { Project, TradePackage, Bid, Company } from '../types';
import { store } from '../store';
import { createA2AMessage } from '../a2a/protocol';
import { v4 as uuidv4 } from 'uuid';
import { askGemini, askGeminiJSON } from '../ai/gemini';
import { SYSTEM_PROMPTS, TRADE_DEFINITIONS, scopeDetectionPrompt, bidLevelingPrompt, negotiationOpenPrompt } from '../ai/prompts';
import { AI_CONFIG, isFeatureEnabled } from '../ai/config';

export class BuilderAgent {
  private gcCompanyId: string;

  constructor(gcCompanyId: string) {
    this.gcCompanyId = gcCompanyId;
  }

  async detectScopes(project: Project): Promise<TradePackage[]> {
    let selectedTrades: { division: number; name: string; scopeItems: string[]; reasoning?: string }[];
    let aiPowered = false;

    if (isFeatureEnabled('scopeDetection')) {
      const aiResult = await askGeminiJSON<{
        trades: { division: number; name: string; reasoning: string; scopeItems: string[] }[];
      }>(
        scopeDetectionPrompt(project),
        SYSTEM_PROMPTS.builderAgent,
        AI_CONFIG.params.scopeDetection
      );

      if (aiResult?.trades?.length) {
        aiPowered = true;
        selectedTrades = aiResult.trades
          .filter(t => TRADE_DEFINITIONS.some(td => td.division === t.division))
          .map(t => {
            const def = TRADE_DEFINITIONS.find(td => td.division === t.division)!;
            return {
              division: t.division,
              name: t.name,
              scopeItems: t.scopeItems?.length ? t.scopeItems : [...def.scopeItems],
              reasoning: t.reasoning,
            };
          });
      } else {
        selectedTrades = this.selectTradesForProject(project.estimatedValue).map(t => ({
          division: t.division,
          name: t.name,
          scopeItems: [...t.scopeItems],
        }));
      }
    } else {
      selectedTrades = this.selectTradesForProject(project.estimatedValue).map(t => ({
        division: t.division,
        name: t.name,
        scopeItems: [...t.scopeItems],
      }));
    }

    const tradePackages: TradePackage[] = selectedTrades.map(trade => ({
      id: uuidv4(),
      projectId: project.id,
      csiDivision: trade.division,
      tradeName: `Division ${trade.division} - ${trade.name}`,
      scopeItems: trade.scopeItems,
      estimatedBudget: this.estimateTradeBudget(trade.division, project.estimatedValue),
      status: 'detected' as const,
      drawings: this.generateDrawingRefs(trade.division),
      specs: [`Section ${trade.division} 00 00 - ${trade.name}`],
    }));

    // Persist trade packages to Supabase
    await store.createTradePackages(tradePackages);

    // Update project status
    project.tradePackages = tradePackages;
    project.status = 'scope_detection';
    await store.updateProjectStatus(project.id, 'scope_detection');

    await createA2AMessage(
      'AGENT_DISCOVERY_REQUEST',
      `agent-${this.gcCompanyId}`,
      'platform',
      project.id,
      {
        action: 'scope_detection_complete',
        tradeCount: tradePackages.length,
        trades: tradePackages.map(tp => tp.tradeName),
        aiPowered,
        reasoning: selectedTrades.filter(t => t.reasoning).map(t => ({ trade: t.name, reasoning: t.reasoning })),
      }
    );

    return tradePackages;
  }

  async discoverSubs(tradePackage: TradePackage): Promise<Company[]> {
    const allSubs = await store.getSubCompanies();

    const matchedSubs = allSubs.filter(sub => {
      const divisionMatch = sub.csiDivisions.includes(tradePackage.csiDivision);
      const capacityMatch = sub.capacity.maxProjectSize >= tradePackage.estimatedBudget;
      return divisionMatch && capacityMatch;
    });

    for (const sub of matchedSubs) {
      await createA2AMessage(
        'AGENT_DISCOVERY_RESPONSE',
        `agent-${sub.id}`,
        `agent-${this.gcCompanyId}`,
        tradePackage.projectId,
        {
          companyName: sub.name,
          trades: sub.trades,
          available: true,
          emr: sub.prequalifications.emr,
        }
      );
    }

    return matchedSubs;
  }

  async broadcastITB(tradePackage: TradePackage, subs: Company[]): Promise<void> {
    for (const sub of subs) {
      await createA2AMessage(
        'ITB_BROADCAST',
        `agent-${this.gcCompanyId}`,
        `agent-${sub.id}`,
        tradePackage.projectId,
        {
          tradePackageId: tradePackage.id,
          tradeName: tradePackage.tradeName,
          scopeItems: tradePackage.scopeItems,
          estimatedBudget: tradePackage.estimatedBudget,
          drawings: tradePackage.drawings,
          specs: tradePackage.specs,
          bidDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        }
      );
    }

    await store.updateTradePackageStatus(tradePackage.id, 'itb_sent');
    await store.updateProjectStatus(tradePackage.projectId, 'bidding');
  }

  async levelBids(tradePackageId: string): Promise<Bid[]> {
    const bids = await store.getBidsByTradePackage(tradePackageId);
    if (bids.length === 0) return [];

    const avgBid = bids.reduce((sum, b) => sum + b.baseBid, 0) / bids.length;
    const tp = await store.getTradePackage(tradePackageId);

    // LLM leveling analysis
    let aiAnalysis: { analyses: { companyName: string; notes: string }[] } | null = null;
    if (isFeatureEnabled('bidLeveling')) {
      const bidParams = [];
      for (const b of bids) {
        const sub = await store.getCompany(b.subCompanyId);
        bidParams.push({
          subCompanyName: b.subCompanyName,
          baseBid: b.baseBid,
          avgBid,
          emr: sub?.prequalifications.emr ?? null,
          bondProvided: b.compliance.bondProvided,
          exclusions: b.exclusions,
          inclusions: b.inclusions,
        });
      }

      aiAnalysis = await askGeminiJSON(
        bidLevelingPrompt({
          tradeName: tp?.tradeName || 'trade package',
          estimatedBudget: tp?.estimatedBudget ?? 0,
          bids: bidParams,
        }),
        SYSTEM_PROMPTS.builderAgent,
        AI_CONFIG.params.bidLeveling
      );
    }

    for (const bid of bids) {
      const priceScore = Math.max(0, 100 - Math.abs(bid.baseBid - avgBid) / avgBid * 100);
      const complianceScore = (bid.compliance.bondProvided ? 15 : 0) + (bid.compliance.insuranceMeetsRequirements ? 15 : 0);
      const exclusionPenalty = bid.exclusions.length * 5;
      const sub = await store.getCompany(bid.subCompanyId);
      const emrScore = sub ? Math.max(0, (1.0 - sub.prequalifications.emr) * 100) : 0;

      const levelingScore = Math.round(priceScore * 0.5 + complianceScore + emrScore * 0.2 - exclusionPenalty);
      const aiNote = aiAnalysis?.analyses?.find(a => a.companyName === bid.subCompanyName);
      const levelingNotes = aiNote?.notes || this.generateLevelingNotes(bid, avgBid);

      await store.updateBid(bid.id, {
        levelingScore,
        levelingNotes,
        status: 'under_review',
      });

      bid.levelingScore = levelingScore;
      bid.levelingNotes = levelingNotes;
      bid.status = 'under_review';
    }

    bids.sort((a, b) => (b.levelingScore ?? 0) - (a.levelingScore ?? 0));

    if (tp) {
      await store.updateTradePackageStatus(tp.id, 'leveled');
    }

    return bids;
  }

  async openNegotiation(bid: Bid, targetPrice: number): Promise<string> {
    const sessionId = uuidv4();
    const sub = await store.getCompany(bid.subCompanyId);
    const tp = await store.getTradePackage(bid.tradePackageId);
    const gapPercent = ((bid.baseBid - targetPrice) / bid.baseBid * 100);

    let message = '';
    if (isFeatureEnabled('negotiation')) {
      message = await askGemini(
        negotiationOpenPrompt({
          tradeName: tp?.tradeName || 'Construction work',
          subName: sub?.name || bid.subCompanyName,
          bidAmount: bid.baseBid,
          targetPrice,
          gapPercent,
        }),
        SYSTEM_PROMPTS.builderAgent,
        AI_CONFIG.params.negotiationMessage
      );
    }

    if (!message) {
      message = `We appreciate your bid of $${bid.baseBid.toLocaleString()}. Based on our budget analysis and competitive leveling, we'd like to discuss a target price of $${targetPrice.toLocaleString()}. We value your qualifications and would like to work together on this project.`;
    }

    const session = {
      id: sessionId,
      bidId: bid.id,
      tradePackageId: bid.tradePackageId,
      projectId: bid.projectId,
      gcCompanyId: this.gcCompanyId,
      subCompanyId: bid.subCompanyId,
      status: 'open' as const,
      rounds: [{
        roundNumber: 1,
        fromAgent: 'gc' as const,
        proposedPrice: targetPrice,
        message,
        timestamp: new Date().toISOString(),
      }],
    };

    await store.createNegotiationSession(session);
    await store.updateBid(bid.id, { status: 'negotiating' });

    await createA2AMessage(
      'NEGOTIATION_OPEN',
      `agent-${this.gcCompanyId}`,
      `agent-${bid.subCompanyId}`,
      bid.projectId,
      {
        negotiationId: sessionId,
        bidId: bid.id,
        originalBid: bid.baseBid,
        targetPrice,
        aiGenerated: !!message,
      }
    );

    return sessionId;
  }

  async awardBid(bidId: string): Promise<void> {
    const bid = await store.getBid(bidId);
    if (!bid) return;

    await store.updateBid(bidId, { status: 'awarded' });

    const otherBids = await store.getBidsByTradePackage(bid.tradePackageId);
    for (const other of otherBids) {
      if (other.id !== bidId) {
        await store.updateBid(other.id, { status: 'rejected' });
        await createA2AMessage('AWARD_REJECTION', `agent-${this.gcCompanyId}`, `agent-${other.subCompanyId}`, bid.projectId, { bidId: other.id });
      }
    }

    const tp = await store.getTradePackage(bid.tradePackageId);
    await createA2AMessage('INTENT_TO_AWARD', `agent-${this.gcCompanyId}`, `agent-${bid.subCompanyId}`, bid.projectId, {
      bidId,
      awardAmount: bid.baseBid,
      tradeName: tp?.tradeName,
    });

    if (tp) {
      await store.updateTradePackageStatus(tp.id, 'awarded');
    }

    // Check if all trade packages are awarded
    const project = await store.getProject(bid.projectId);
    if (project) {
      const allAwarded = project.tradePackages.every(t => t.status === 'awarded');
      if (allAwarded) {
        await store.updateProjectStatus(project.id, 'awarded');
      }
    }
  }

  private selectTradesForProject(value: number): { division: number; name: string; scopeItems: readonly string[] }[] {
    const defs = [...TRADE_DEFINITIONS];
    if (value > 50000000) return defs;
    if (value > 10000000) return defs.filter(t => [3, 5, 9, 22, 23, 26, 31].includes(t.division));
    if (value > 5000000) return defs.filter(t => [3, 9, 22, 23, 26].includes(t.division));
    return defs.filter(t => [3, 23, 26].includes(t.division));
  }

  private estimateTradeBudget(division: number, totalValue: number): number {
    const percentages: Record<number, number> = {
      3: 0.12, 5: 0.08, 7: 0.04, 8: 0.05, 9: 0.10,
      22: 0.06, 23: 0.15, 26: 0.14, 31: 0.05, 32: 0.04,
    };
    const pct = percentages[division] ?? 0.05;
    const base = totalValue * pct;
    return Math.round(base * (0.9 + Math.random() * 0.2));
  }

  private generateDrawingRefs(division: number): string[] {
    const prefixes: Record<number, string> = {
      3: 'S', 5: 'S', 7: 'A', 8: 'A', 9: 'A',
      22: 'P', 23: 'M', 26: 'E', 31: 'C', 32: 'C',
    };
    const prefix = prefixes[division] ?? 'A';
    return [`${prefix}-101`, `${prefix}-201`, `${prefix}-301`];
  }

  private generateLevelingNotes(bid: Bid, avgBid: number): string {
    const notes: string[] = [];
    const delta = ((bid.baseBid - avgBid) / avgBid * 100).toFixed(1);
    if (bid.baseBid < avgBid) notes.push(`${Math.abs(parseFloat(delta))}% below average`);
    else notes.push(`${delta}% above average`);
    if (bid.exclusions.length > 2) notes.push('Multiple exclusions noted');
    if (bid.compliance.bondProvided) notes.push('Bond provided');
    if (!bid.compliance.insuranceMeetsRequirements) notes.push('Insurance review needed');
    return notes.join('; ');
  }
}
