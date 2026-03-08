import { Company, Project, TradePackage, Bid, NegotiationSession, A2AMessage, AgentCard } from './types';
import { createServerClient } from './supabase/server';

// ─── DB Row Types (untyped client, manual casting) ───
/* eslint-disable @typescript-eslint/no-explicit-any */
type DbRow = any;

// ─── Mapping Utilities (snake_case DB <-> camelCase TS) ───

function mapCompany(db: DbRow): Company {
  return {
    id: db.id,
    name: db.name,
    type: db.type,
    trades: db.trades,
    csiDivisions: db.csi_divisions,
    serviceArea: db.service_area,
    prequalifications: {
      emr: db.emr,
      bondingCapacity: db.bonding_capacity,
      certifications: db.certifications,
    },
    capacity: {
      currentBacklog: db.current_backlog,
      maxProjectSize: db.max_project_size,
      availableStart: db.available_start ?? '',
      crewSize: db.crew_size,
    },
    agentEndpoint: db.agent_endpoint,
  };
}

function mapTradePackage(db: DbRow): TradePackage {
  return {
    id: db.id,
    projectId: db.project_id,
    csiDivision: db.csi_division,
    tradeName: db.trade_name,
    scopeItems: db.scope_items,
    estimatedBudget: db.estimated_budget,
    status: db.status as TradePackage['status'],
    drawings: db.drawings,
    specs: db.specs,
  };
}

function mapBid(
  db: DbRow,
  lineItems: DbRow[],
  leadTimeItems: DbRow[]
): Bid {
  return {
    id: db.id,
    tradePackageId: db.trade_package_id,
    projectId: db.project_id,
    subCompanyId: db.sub_company_id,
    subCompanyName: db.sub_company_name,
    baseBid: db.base_bid,
    lineItems: lineItems.map(li => ({
      csiCode: li.csi_code,
      description: li.description,
      laborCost: li.labor_cost,
      materialCost: li.material_cost,
      equipmentCost: li.equipment_cost,
      subtotal: li.subtotal,
    })),
    inclusions: db.inclusions,
    exclusions: db.exclusions,
    qualifications: db.qualifications,
    schedule: {
      mobilizationDate: db.mobilization_date ?? '',
      completionDate: db.completion_date ?? '',
      leadTimeItems: leadTimeItems.map(lt => ({ item: lt.item, weeks: lt.weeks })),
    },
    compliance: {
      bondProvided: db.bond_provided,
      insuranceMeetsRequirements: db.insurance_meets_requirements,
    },
    status: db.status,
    submittedAt: db.submitted_at,
    levelingScore: db.leveling_score ?? undefined,
    levelingNotes: db.leveling_notes ?? undefined,
  };
}

function mapNegotiationSession(db: DbRow, rounds: DbRow[]): NegotiationSession {
  return {
    id: db.id,
    bidId: db.bid_id,
    tradePackageId: db.trade_package_id,
    projectId: db.project_id,
    gcCompanyId: db.gc_company_id,
    subCompanyId: db.sub_company_id,
    status: db.status,
    rounds: rounds
      .sort((a, b) => a.round_number - b.round_number)
      .map(r => ({
        roundNumber: r.round_number,
        fromAgent: r.from_agent,
        proposedPrice: r.proposed_price,
        message: r.message,
        veProposal: r.ve_proposal ?? undefined,
        timestamp: r.timestamp,
      })),
    finalPrice: db.final_price ?? undefined,
    agreedTerms: db.agreed_terms ?? undefined,
  };
}

function mapAgentCard(db: DbRow, company: Company): AgentCard {
  return {
    agentId: db.agent_id,
    companyId: db.company_id,
    type: db.type,
    company,
    capabilities: db.capabilities,
    status: db.status,
  };
}

// ─── Supabase-backed DataStore ───

class DataStore {
  private get sb() {
    return createServerClient();
  }

  // ─── Company Methods ───

  async getCompany(id: string): Promise<Company | null> {
    const { data } = await this.sb.from('companies').select('*').eq('id', id).single();
    return data ? mapCompany(data) : null;
  }

  async getSubCompanies(): Promise<Company[]> {
    const { data } = await this.sb.from('companies').select('*').eq('type', 'Sub');
    return (data ?? []).map(mapCompany);
  }

  async getGCCompanies(): Promise<Company[]> {
    const { data } = await this.sb.from('companies').select('*').eq('type', 'GC');
    return (data ?? []).map(mapCompany);
  }

  async getSubsByDivision(division: number): Promise<Company[]> {
    const { data } = await this.sb.from('companies').select('*').eq('type', 'Sub').contains('csi_divisions', [division]);
    return (data ?? []).map(mapCompany);
  }

  // ─── Project Methods ───

  async getProject(id: string): Promise<Project | null> {
    const { data: proj } = await this.sb.from('projects').select('*').eq('id', id).single();
    if (!proj) return null;
    const { data: tps } = await this.sb.from('trade_packages').select('*').eq('project_id', id);
    return {
      id: proj.id,
      name: proj.name,
      location: proj.location,
      estimatedValue: proj.estimated_value,
      gcCompanyId: proj.gc_company_id,
      status: proj.status as Project['status'],
      description: proj.description,
      tradePackages: (tps ?? []).map(mapTradePackage),
      createdAt: proj.created_at,
    };
  }

  async getProjectsByGC(gcId: string): Promise<Project[]> {
    const { data: projects } = await this.sb.from('projects').select('*').eq('gc_company_id', gcId);
    if (!projects?.length) return [];

    const projectIds = projects.map(p => p.id);
    const { data: tps } = await this.sb.from('trade_packages').select('*').in('project_id', projectIds);
    const tpsByProject = new Map<string, TradePackage[]>();
    for (const tp of (tps ?? [])) {
      const arr = tpsByProject.get(tp.project_id) ?? [];
      arr.push(mapTradePackage(tp));
      tpsByProject.set(tp.project_id, arr);
    }

    return projects.map(p => ({
      id: p.id,
      name: p.name,
      location: p.location,
      estimatedValue: p.estimated_value,
      gcCompanyId: p.gc_company_id,
      status: p.status as Project['status'],
      description: p.description,
      tradePackages: tpsByProject.get(p.id) ?? [],
      createdAt: p.created_at,
    }));
  }

  async getAllProjects(): Promise<Project[]> {
    const { data: projects } = await this.sb.from('projects').select('*');
    if (!projects?.length) return [];

    const projectIds = projects.map(p => p.id);
    const { data: tps } = await this.sb.from('trade_packages').select('*').in('project_id', projectIds);
    const tpsByProject = new Map<string, TradePackage[]>();
    for (const tp of (tps ?? [])) {
      const arr = tpsByProject.get(tp.project_id) ?? [];
      arr.push(mapTradePackage(tp));
      tpsByProject.set(tp.project_id, arr);
    }

    return projects.map(p => ({
      id: p.id,
      name: p.name,
      location: p.location,
      estimatedValue: p.estimated_value,
      gcCompanyId: p.gc_company_id,
      status: p.status as Project['status'],
      description: p.description,
      tradePackages: tpsByProject.get(p.id) ?? [],
      createdAt: p.created_at,
    }));
  }

  async createProject(project: Project): Promise<void> {
    await this.sb.from('projects').insert({
      id: project.id,
      name: project.name,
      location: project.location,
      estimated_value: project.estimatedValue,
      gc_company_id: project.gcCompanyId,
      status: project.status,
      description: project.description,
      created_at: project.createdAt,
    });
  }

  async updateProjectStatus(id: string, status: Project['status']): Promise<void> {
    await this.sb.from('projects').update({ status }).eq('id', id);
  }

  // ─── Trade Package Methods ───

  async getTradePackage(id: string): Promise<TradePackage | null> {
    const { data } = await this.sb.from('trade_packages').select('*').eq('id', id).single();
    return data ? mapTradePackage(data) : null;
  }

  async getTradePackagesByProject(projectId: string): Promise<TradePackage[]> {
    const { data } = await this.sb.from('trade_packages').select('*').eq('project_id', projectId);
    return (data ?? []).map(mapTradePackage);
  }

  async createTradePackages(tps: TradePackage[]): Promise<void> {
    if (tps.length === 0) return;
    await this.sb.from('trade_packages').insert(
      tps.map(tp => ({
        id: tp.id,
        project_id: tp.projectId,
        csi_division: tp.csiDivision,
        trade_name: tp.tradeName,
        scope_items: tp.scopeItems,
        estimated_budget: tp.estimatedBudget,
        status: tp.status,
        drawings: tp.drawings,
        specs: tp.specs,
      }))
    );
  }

  async updateTradePackageStatus(id: string, status: TradePackage['status']): Promise<void> {
    await this.sb.from('trade_packages').update({ status }).eq('id', id);
  }

  // ─── Bid Methods ───

  async getBid(id: string): Promise<Bid | null> {
    const { data: bid } = await this.sb.from('bids').select('*').eq('id', id).single();
    if (!bid) return null;
    const { data: lineItems } = await this.sb.from('bid_line_items').select('*').eq('bid_id', id);
    const { data: leadTimeItems } = await this.sb.from('lead_time_items').select('*').eq('bid_id', id);
    return mapBid(bid, lineItems ?? [], leadTimeItems ?? []);
  }

  async getBidsByTradePackage(tpId: string): Promise<Bid[]> {
    const { data: bids } = await this.sb.from('bids').select('*').eq('trade_package_id', tpId);
    if (!bids?.length) return [];
    return this.hydrateBids(bids);
  }

  async getBidsByProject(projectId: string): Promise<Bid[]> {
    const { data: bids } = await this.sb.from('bids').select('*').eq('project_id', projectId);
    if (!bids?.length) return [];
    return this.hydrateBids(bids);
  }

  async getBidsBySub(subId: string): Promise<Bid[]> {
    const { data: bids } = await this.sb.from('bids').select('*').eq('sub_company_id', subId);
    if (!bids?.length) return [];
    return this.hydrateBids(bids);
  }

  async getAllBids(): Promise<Bid[]> {
    const { data: bids } = await this.sb.from('bids').select('*');
    if (!bids?.length) return [];
    return this.hydrateBids(bids);
  }

  private async hydrateBids(bids: DbRow[]): Promise<Bid[]> {
    const bidIds = bids.map(b => b.id);
    const { data: allLineItems } = await this.sb.from('bid_line_items').select('*').in('bid_id', bidIds);
    const { data: allLeadItems } = await this.sb.from('lead_time_items').select('*').in('bid_id', bidIds);

    const lineItemsByBid = new Map<string, DbRow[]>();
    for (const li of (allLineItems ?? [])) {
      const arr = lineItemsByBid.get(li.bid_id) ?? [];
      arr.push(li);
      lineItemsByBid.set(li.bid_id, arr);
    }
    const leadItemsByBid = new Map<string, DbRow[]>();
    for (const lt of (allLeadItems ?? [])) {
      const arr = leadItemsByBid.get(lt.bid_id) ?? [];
      arr.push(lt);
      leadItemsByBid.set(lt.bid_id, arr);
    }

    return bids.map(b => mapBid(b, lineItemsByBid.get(b.id) ?? [], leadItemsByBid.get(b.id) ?? []));
  }

  async createBid(bid: Bid): Promise<void> {
    // Insert bid row
    await this.sb.from('bids').insert({
      id: bid.id,
      trade_package_id: bid.tradePackageId,
      project_id: bid.projectId,
      sub_company_id: bid.subCompanyId,
      sub_company_name: bid.subCompanyName,
      base_bid: bid.baseBid,
      inclusions: bid.inclusions,
      exclusions: bid.exclusions,
      qualifications: bid.qualifications,
      mobilization_date: bid.schedule.mobilizationDate || null,
      completion_date: bid.schedule.completionDate || null,
      bond_provided: bid.compliance.bondProvided,
      insurance_meets_requirements: bid.compliance.insuranceMeetsRequirements,
      status: bid.status,
      submitted_at: bid.submittedAt,
      leveling_score: bid.levelingScore ?? null,
      leveling_notes: bid.levelingNotes ?? null,
    });

    // Insert line items
    if (bid.lineItems.length > 0) {
      const { v4: uuidv4 } = await import('uuid');
      await this.sb.from('bid_line_items').insert(
        bid.lineItems.map(li => ({
          id: uuidv4(),
          bid_id: bid.id,
          csi_code: li.csiCode,
          description: li.description,
          labor_cost: li.laborCost,
          material_cost: li.materialCost,
          equipment_cost: li.equipmentCost,
          subtotal: li.subtotal,
        }))
      );
    }

    // Insert lead time items
    if (bid.schedule.leadTimeItems.length > 0) {
      const { v4: uuidv4 } = await import('uuid');
      await this.sb.from('lead_time_items').insert(
        bid.schedule.leadTimeItems.map(lt => ({
          id: uuidv4(),
          bid_id: bid.id,
          item: lt.item,
          weeks: lt.weeks,
        }))
      );
    }
  }

  async updateBid(id: string, updates: Partial<Pick<Bid, 'status' | 'baseBid' | 'levelingScore' | 'levelingNotes'>>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.baseBid !== undefined) dbUpdates.base_bid = updates.baseBid;
    if (updates.levelingScore !== undefined) dbUpdates.leveling_score = updates.levelingScore;
    if (updates.levelingNotes !== undefined) dbUpdates.leveling_notes = updates.levelingNotes;
    await this.sb.from('bids').update(dbUpdates).eq('id', id);
  }

  // ─── Negotiation Methods ───

  async getNegotiationSession(id: string): Promise<NegotiationSession | null> {
    const { data: session } = await this.sb.from('negotiation_sessions').select('*').eq('id', id).single();
    if (!session) return null;
    const { data: rounds } = await this.sb.from('negotiation_rounds').select('*').eq('session_id', id);
    return mapNegotiationSession(session, rounds ?? []);
  }

  async getNegotiationsByProject(projectId: string): Promise<NegotiationSession[]> {
    const { data: sessions } = await this.sb.from('negotiation_sessions').select('*').eq('project_id', projectId);
    if (!sessions?.length) return [];

    const sessionIds = sessions.map(s => s.id);
    const { data: allRounds } = await this.sb.from('negotiation_rounds').select('*').in('session_id', sessionIds);
    const roundsBySession = new Map<string, DbRow[]>();
    for (const r of (allRounds ?? [])) {
      const arr = roundsBySession.get(r.session_id) ?? [];
      arr.push(r);
      roundsBySession.set(r.session_id, arr);
    }

    return sessions.map(s => mapNegotiationSession(s, roundsBySession.get(s.id) ?? []));
  }

  async getAllNegotiations(): Promise<NegotiationSession[]> {
    const { data: sessions } = await this.sb.from('negotiation_sessions').select('*');
    if (!sessions?.length) return [];

    const sessionIds = sessions.map(s => s.id);
    const { data: allRounds } = await this.sb.from('negotiation_rounds').select('*').in('session_id', sessionIds);
    const roundsBySession = new Map<string, DbRow[]>();
    for (const r of (allRounds ?? [])) {
      const arr = roundsBySession.get(r.session_id) ?? [];
      arr.push(r);
      roundsBySession.set(r.session_id, arr);
    }

    return sessions.map(s => mapNegotiationSession(s, roundsBySession.get(s.id) ?? []));
  }

  async createNegotiationSession(session: NegotiationSession): Promise<void> {
    await this.sb.from('negotiation_sessions').insert({
      id: session.id,
      bid_id: session.bidId,
      trade_package_id: session.tradePackageId,
      project_id: session.projectId,
      gc_company_id: session.gcCompanyId,
      sub_company_id: session.subCompanyId,
      status: session.status,
      final_price: session.finalPrice ?? null,
      agreed_terms: session.agreedTerms ?? null,
    });

    // Insert initial rounds
    if (session.rounds.length > 0) {
      const { v4: uuidv4 } = await import('uuid');
      await this.sb.from('negotiation_rounds').insert(
        session.rounds.map(r => ({
          id: uuidv4(),
          session_id: session.id,
          round_number: r.roundNumber,
          from_agent: r.fromAgent as 'gc' | 'sub',
          proposed_price: r.proposedPrice,
          message: r.message,
          ve_proposal: r.veProposal ?? null,
          timestamp: r.timestamp,
        }))
      );
    }
  }

  async addNegotiationRound(sessionId: string, round: NegotiationSession['rounds'][0]): Promise<void> {
    const { v4: uuidv4 } = await import('uuid');
    await this.sb.from('negotiation_rounds').insert({
      id: uuidv4(),
      session_id: sessionId,
      round_number: round.roundNumber,
      from_agent: round.fromAgent as 'gc' | 'sub',
      proposed_price: round.proposedPrice,
      message: round.message,
      ve_proposal: round.veProposal ?? null,
      timestamp: round.timestamp,
    });
  }

  async updateNegotiationSession(id: string, updates: Partial<Pick<NegotiationSession, 'status' | 'finalPrice' | 'agreedTerms'>>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.finalPrice !== undefined) dbUpdates.final_price = updates.finalPrice;
    if (updates.agreedTerms !== undefined) dbUpdates.agreed_terms = updates.agreedTerms;
    await this.sb.from('negotiation_sessions').update(dbUpdates).eq('id', id);
  }

  // ─── A2A Message Methods ───

  async getMessageLog(projectId: string): Promise<A2AMessage[]> {
    const { data } = await this.sb
      .from('a2a_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('timestamp', { ascending: true });
    return (data ?? []).map(m => ({
      id: m.id,
      type: m.type as A2AMessage['type'],
      fromAgentId: m.from_agent_id,
      toAgentId: m.to_agent_id,
      projectId: m.project_id,
      payload: m.payload as Record<string, unknown>,
      timestamp: m.timestamp,
    }));
  }

  async getAllMessages(): Promise<A2AMessage[]> {
    const { data } = await this.sb
      .from('a2a_messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    return (data ?? []).map(m => ({
      id: m.id,
      type: m.type as A2AMessage['type'],
      fromAgentId: m.from_agent_id,
      toAgentId: m.to_agent_id,
      projectId: m.project_id,
      payload: m.payload as Record<string, unknown>,
      timestamp: m.timestamp,
    }));
  }

  async addMessage(msg: A2AMessage): Promise<void> {
    await this.sb.from('a2a_messages').insert({
      id: msg.id,
      type: msg.type,
      from_agent_id: msg.fromAgentId,
      to_agent_id: msg.toAgentId,
      project_id: msg.projectId,
      payload: msg.payload,
      timestamp: msg.timestamp,
    });
  }

  // ─── Agent Card Methods ───

  async getAgentCard(companyId: string): Promise<AgentCard | null> {
    const { data: card } = await this.sb.from('agent_cards').select('*').eq('company_id', companyId).single();
    if (!card) return null;
    const company = await this.getCompany(card.company_id);
    if (!company) return null;
    return mapAgentCard(card, company);
  }

  async getAllAgentCards(): Promise<AgentCard[]> {
    const { data: cards } = await this.sb.from('agent_cards').select('*');
    if (!cards?.length) return [];

    const companyIds = cards.map(c => c.company_id);
    const { data: companies } = await this.sb.from('companies').select('*').in('id', companyIds);
    const companyMap = new Map<string, Company>();
    for (const c of (companies ?? [])) {
      companyMap.set(c.id, mapCompany(c));
    }

    return cards
      .filter(c => companyMap.has(c.company_id))
      .map(c => mapAgentCard(c, companyMap.get(c.company_id)!));
  }

  async getAgentCardsByType(type: 'GC' | 'Sub'): Promise<AgentCard[]> {
    const all = await this.getAllAgentCards();
    return all.filter(c => c.company.type === type);
  }
}

// Singleton
export const store = new DataStore();
