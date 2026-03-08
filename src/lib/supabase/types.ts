// Database types matching the Supabase schema

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: DbCompany;
        Insert: DbCompany;
        Update: Partial<DbCompany>;
        Relationships: [];
      };
      projects: {
        Row: DbProject;
        Insert: DbProjectInsert;
        Update: Partial<DbProject>;
        Relationships: [];
      };
      trade_packages: {
        Row: DbTradePackage;
        Insert: DbTradePackage;
        Update: Partial<DbTradePackage>;
        Relationships: [];
      };
      bids: {
        Row: DbBid;
        Insert: DbBidInsert;
        Update: Partial<DbBid>;
        Relationships: [];
      };
      bid_line_items: {
        Row: DbBidLineItem;
        Insert: DbBidLineItem;
        Update: Partial<DbBidLineItem>;
        Relationships: [];
      };
      lead_time_items: {
        Row: DbLeadTimeItem;
        Insert: DbLeadTimeItem;
        Update: Partial<DbLeadTimeItem>;
        Relationships: [];
      };
      negotiation_sessions: {
        Row: DbNegotiationSession;
        Insert: DbNegotiationSession;
        Update: Partial<DbNegotiationSession>;
        Relationships: [];
      };
      negotiation_rounds: {
        Row: DbNegotiationRound;
        Insert: DbNegotiationRoundInsert;
        Update: Partial<DbNegotiationRound>;
        Relationships: [];
      };
      a2a_messages: {
        Row: DbA2AMessage;
        Insert: DbA2AMessageInsert;
        Update: Partial<DbA2AMessage>;
        Relationships: [];
      };
      agent_cards: {
        Row: DbAgentCard;
        Insert: DbAgentCard;
        Update: Partial<DbAgentCard>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      company_type: 'GC' | 'Sub';
      project_status: 'draft' | 'scope_detection' | 'bidding' | 'leveling' | 'negotiation' | 'awarded' | 'contracted';
      trade_package_status: 'detected' | 'approved' | 'itb_sent' | 'bids_received' | 'leveled' | 'negotiating' | 'awarded';
      bid_status: 'submitted' | 'under_review' | 'shortlisted' | 'negotiating' | 'awarded' | 'rejected';
      negotiation_status: 'open' | 'agreed' | 'failed' | 'escalated';
      agent_from: 'gc' | 'sub';
      agent_card_type: 'BuilderAgent' | 'TradeAgent';
      agent_status: 'online' | 'offline' | 'busy';
    };
    CompositeTypes: Record<string, never>;
  };
};

// ─── Row Types ───

export interface DbCompany {
  id: string;
  name: string;
  type: 'GC' | 'Sub';
  trades: string[];
  csi_divisions: number[];
  service_area: string;
  emr: number;
  bonding_capacity: number;
  certifications: string[];
  current_backlog: number;
  max_project_size: number;
  available_start: string | null;
  crew_size: number;
  agent_endpoint: string;
  created_at: string;
}

export interface DbProject {
  id: string;
  name: string;
  location: string;
  estimated_value: number;
  gc_company_id: string;
  status: 'draft' | 'scope_detection' | 'bidding' | 'leveling' | 'negotiation' | 'awarded' | 'contracted';
  description: string;
  created_at: string;
}

export interface DbProjectInsert {
  id: string;
  name: string;
  location: string;
  estimated_value: number;
  gc_company_id: string;
  status: 'draft' | 'scope_detection' | 'bidding' | 'leveling' | 'negotiation' | 'awarded' | 'contracted';
  description: string;
  created_at?: string;
}

export interface DbTradePackage {
  id: string;
  project_id: string;
  csi_division: number;
  trade_name: string;
  scope_items: string[];
  estimated_budget: number;
  status: 'detected' | 'approved' | 'itb_sent' | 'bids_received' | 'leveled' | 'negotiating' | 'awarded';
  drawings: string[];
  specs: string[];
}

export interface DbBid {
  id: string;
  trade_package_id: string;
  project_id: string;
  sub_company_id: string;
  sub_company_name: string;
  base_bid: number;
  inclusions: string[];
  exclusions: string[];
  qualifications: string[];
  mobilization_date: string | null;
  completion_date: string | null;
  bond_provided: boolean;
  insurance_meets_requirements: boolean;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'negotiating' | 'awarded' | 'rejected';
  submitted_at: string;
  leveling_score: number | null;
  leveling_notes: string | null;
}

export interface DbBidInsert {
  id: string;
  trade_package_id: string;
  project_id: string;
  sub_company_id: string;
  sub_company_name: string;
  base_bid: number;
  inclusions: string[];
  exclusions: string[];
  qualifications: string[];
  mobilization_date: string | null;
  completion_date: string | null;
  bond_provided: boolean;
  insurance_meets_requirements: boolean;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'negotiating' | 'awarded' | 'rejected';
  submitted_at?: string;
  leveling_score: number | null;
  leveling_notes: string | null;
}

export interface DbBidLineItem {
  id: string;
  bid_id: string;
  csi_code: string;
  description: string;
  labor_cost: number;
  material_cost: number;
  equipment_cost: number;
  subtotal: number;
}

export interface DbLeadTimeItem {
  id: string;
  bid_id: string;
  item: string;
  weeks: number;
}

export interface DbNegotiationSession {
  id: string;
  bid_id: string;
  trade_package_id: string;
  project_id: string;
  gc_company_id: string;
  sub_company_id: string;
  status: 'open' | 'agreed' | 'failed' | 'escalated';
  final_price: number | null;
  agreed_terms: Record<string, string> | null;
}

export interface DbNegotiationRound {
  id: string;
  session_id: string;
  round_number: number;
  from_agent: 'gc' | 'sub';
  proposed_price: number;
  message: string;
  ve_proposal: string | null;
  timestamp: string;
}

export interface DbNegotiationRoundInsert {
  id: string;
  session_id: string;
  round_number: number;
  from_agent: 'gc' | 'sub';
  proposed_price: number;
  message: string;
  ve_proposal: string | null;
  timestamp?: string;
}

export interface DbA2AMessage {
  id: string;
  type: string;
  from_agent_id: string;
  to_agent_id: string;
  project_id: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface DbA2AMessageInsert {
  id: string;
  type: string;
  from_agent_id: string;
  to_agent_id: string;
  project_id: string;
  payload: Record<string, unknown>;
  timestamp?: string;
}

export interface DbAgentCard {
  agent_id: string;
  company_id: string;
  type: 'BuilderAgent' | 'TradeAgent';
  capabilities: string[];
  status: 'online' | 'offline' | 'busy';
}
