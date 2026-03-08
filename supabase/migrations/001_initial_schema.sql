-- ConstructA2A: Initial Database Schema
-- Phase 1: Data Persistence with Supabase

-- ─── ENUMS ───
CREATE TYPE company_type AS ENUM ('GC', 'Sub');
CREATE TYPE project_status AS ENUM ('draft', 'scope_detection', 'bidding', 'leveling', 'negotiation', 'awarded', 'contracted');
CREATE TYPE trade_package_status AS ENUM ('detected', 'approved', 'itb_sent', 'bids_received', 'leveled', 'negotiating', 'awarded');
CREATE TYPE bid_status AS ENUM ('submitted', 'under_review', 'shortlisted', 'negotiating', 'awarded', 'rejected');
CREATE TYPE negotiation_status AS ENUM ('open', 'agreed', 'failed', 'escalated');
CREATE TYPE agent_from AS ENUM ('gc', 'sub');
CREATE TYPE agent_card_type AS ENUM ('BuilderAgent', 'TradeAgent');
CREATE TYPE agent_status AS ENUM ('online', 'offline', 'busy');

-- ─── TABLES ───

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type company_type NOT NULL,
  trades TEXT[] DEFAULT '{}',
  csi_divisions INT[] DEFAULT '{}',
  service_area TEXT DEFAULT '',
  emr FLOAT DEFAULT 1.0,
  bonding_capacity FLOAT DEFAULT 0,
  certifications TEXT[] DEFAULT '{}',
  current_backlog FLOAT DEFAULT 0,
  max_project_size FLOAT DEFAULT 0,
  available_start DATE,
  crew_size INT DEFAULT 0,
  agent_endpoint TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  estimated_value FLOAT DEFAULT 0,
  gc_company_id TEXT REFERENCES companies(id),
  status project_status DEFAULT 'draft',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trade_packages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  csi_division INT NOT NULL,
  trade_name TEXT NOT NULL,
  scope_items TEXT[] DEFAULT '{}',
  estimated_budget FLOAT DEFAULT 0,
  status trade_package_status DEFAULT 'detected',
  drawings TEXT[] DEFAULT '{}',
  specs TEXT[] DEFAULT '{}'
);

CREATE TABLE bids (
  id TEXT PRIMARY KEY,
  trade_package_id TEXT NOT NULL REFERENCES trade_packages(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sub_company_id TEXT NOT NULL REFERENCES companies(id),
  sub_company_name TEXT NOT NULL,
  base_bid FLOAT NOT NULL,
  inclusions TEXT[] DEFAULT '{}',
  exclusions TEXT[] DEFAULT '{}',
  qualifications TEXT[] DEFAULT '{}',
  mobilization_date TEXT,
  completion_date TEXT,
  bond_provided BOOLEAN DEFAULT FALSE,
  insurance_meets_requirements BOOLEAN DEFAULT TRUE,
  status bid_status DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  leveling_score INT,
  leveling_notes TEXT
);

CREATE TABLE bid_line_items (
  id TEXT PRIMARY KEY,
  bid_id TEXT NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  csi_code TEXT NOT NULL,
  description TEXT NOT NULL,
  labor_cost FLOAT DEFAULT 0,
  material_cost FLOAT DEFAULT 0,
  equipment_cost FLOAT DEFAULT 0,
  subtotal FLOAT DEFAULT 0
);

CREATE TABLE lead_time_items (
  id TEXT PRIMARY KEY,
  bid_id TEXT NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  weeks INT NOT NULL
);

CREATE TABLE negotiation_sessions (
  id TEXT PRIMARY KEY,
  bid_id TEXT NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  trade_package_id TEXT NOT NULL REFERENCES trade_packages(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  gc_company_id TEXT NOT NULL REFERENCES companies(id),
  sub_company_id TEXT NOT NULL REFERENCES companies(id),
  status negotiation_status DEFAULT 'open',
  final_price FLOAT,
  agreed_terms JSONB
);

CREATE TABLE negotiation_rounds (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES negotiation_sessions(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  from_agent agent_from NOT NULL,
  proposed_price FLOAT NOT NULL,
  message TEXT DEFAULT '',
  ve_proposal TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE a2a_messages (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_cards (
  agent_id TEXT PRIMARY KEY,
  company_id TEXT UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type agent_card_type NOT NULL,
  capabilities TEXT[] DEFAULT '{}',
  status agent_status DEFAULT 'online'
);

-- ─── INDEXES ───
CREATE INDEX idx_projects_gc ON projects(gc_company_id);
CREATE INDEX idx_trade_packages_project ON trade_packages(project_id);
CREATE INDEX idx_bids_trade_package ON bids(trade_package_id);
CREATE INDEX idx_bids_project ON bids(project_id);
CREATE INDEX idx_bids_sub ON bids(sub_company_id);
CREATE INDEX idx_bid_line_items_bid ON bid_line_items(bid_id);
CREATE INDEX idx_lead_time_items_bid ON lead_time_items(bid_id);
CREATE INDEX idx_negotiation_sessions_bid ON negotiation_sessions(bid_id);
CREATE INDEX idx_negotiation_rounds_session ON negotiation_rounds(session_id);
CREATE INDEX idx_a2a_messages_project ON a2a_messages(project_id);
CREATE INDEX idx_a2a_messages_timestamp ON a2a_messages(timestamp DESC);
CREATE INDEX idx_agent_cards_company ON agent_cards(company_id);

-- ─── RLS (Phase 6 will add user-specific policies) ───
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_time_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2a_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_cards ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (Phase 6 will restrict to authenticated users)
CREATE POLICY "Allow all access" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON trade_packages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON bids FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON bid_line_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON lead_time_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON negotiation_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON negotiation_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON a2a_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON agent_cards FOR ALL USING (true) WITH CHECK (true);

-- ─── REALTIME ───
ALTER PUBLICATION supabase_realtime ADD TABLE a2a_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
ALTER PUBLICATION supabase_realtime ADD TABLE negotiation_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE negotiation_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_packages;
