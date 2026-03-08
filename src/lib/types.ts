export interface Company {
  id: string;
  name: string;
  type: 'GC' | 'Sub';
  trades: string[];
  csiDivisions: number[];
  serviceArea: string;
  prequalifications: {
    emr: number;
    bondingCapacity: number;
    certifications: string[];
  };
  capacity: {
    currentBacklog: number;
    maxProjectSize: number;
    availableStart: string;
    crewSize: number;
  };
  agentEndpoint: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  estimatedValue: number;
  gcCompanyId: string;
  status: 'draft' | 'scope_detection' | 'bidding' | 'leveling' | 'negotiation' | 'awarded' | 'contracted';
  tradePackages: TradePackage[];
  createdAt: string;
  description: string;
}

export interface TradePackage {
  id: string;
  projectId: string;
  csiDivision: number;
  tradeName: string;
  scopeItems: string[];
  estimatedBudget: number;
  status: 'detected' | 'approved' | 'itb_sent' | 'bids_received' | 'leveled' | 'negotiating' | 'awarded';
  drawings: string[];
  specs: string[];
}

export interface Bid {
  id: string;
  tradePackageId: string;
  projectId: string;
  subCompanyId: string;
  subCompanyName: string;
  baseBid: number;
  lineItems: BidLineItem[];
  inclusions: string[];
  exclusions: string[];
  qualifications: string[];
  schedule: {
    mobilizationDate: string;
    completionDate: string;
    leadTimeItems: { item: string; weeks: number }[];
  };
  compliance: {
    bondProvided: boolean;
    insuranceMeetsRequirements: boolean;
  };
  status: 'submitted' | 'under_review' | 'shortlisted' | 'negotiating' | 'awarded' | 'rejected';
  submittedAt: string;
  levelingScore?: number;
  levelingNotes?: string;
}

export interface BidLineItem {
  csiCode: string;
  description: string;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  subtotal: number;
}

export interface NegotiationSession {
  id: string;
  bidId: string;
  tradePackageId: string;
  projectId: string;
  gcCompanyId: string;
  subCompanyId: string;
  status: 'open' | 'agreed' | 'failed' | 'escalated';
  rounds: NegotiationRound[];
  finalPrice?: number;
  agreedTerms?: Record<string, string>;
}

export interface NegotiationRound {
  roundNumber: number;
  fromAgent: 'gc' | 'sub';
  proposedPrice: number;
  message: string;
  veProposal?: string;
  timestamp: string;
}

export interface A2AMessage {
  id: string;
  type: MessageType;
  fromAgentId: string;
  toAgentId: string;
  projectId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type MessageType =
  | 'AGENT_DISCOVERY_REQUEST'
  | 'AGENT_DISCOVERY_RESPONSE'
  | 'ITB_BROADCAST'
  | 'ITB_ACKNOWLEDGMENT'
  | 'BID_SUBMISSION'
  | 'BID_CLARIFICATION_RFI'
  | 'RFI_RESPONSE'
  | 'NEGOTIATION_OPEN'
  | 'COUNTEROFFER'
  | 'NEGOTIATION_CLOSE'
  | 'INTENT_TO_AWARD'
  | 'AWARD_REJECTION'
  | 'ESCALATION_TO_HUMAN';

export interface AgentCard {
  agentId: string;
  companyId: string;
  type: 'BuilderAgent' | 'TradeAgent';
  company: Company;
  capabilities: string[];
  status: 'online' | 'offline' | 'busy';
}
