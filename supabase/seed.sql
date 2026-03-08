-- ConstructA2A: Seed Data
-- Turner Construction (GC) + 6 Subcontractors

-- ─── GC COMPANY ───
INSERT INTO companies (id, name, type, trades, csi_divisions, service_area, emr, bonding_capacity, certifications, current_backlog, max_project_size, available_start, crew_size, agent_endpoint)
VALUES (
  'gc-turner', 'Turner Construction', 'GC',
  '{}', '{}', 'National',
  0.75, 500000000, ARRAY['LEED-AP', 'OSHA-30'],
  2000000000, 200000000, '2026-04-01', 500,
  '/api/agents/gc-turner'
);

-- ─── SUB COMPANIES ───
INSERT INTO companies (id, name, type, trades, csi_divisions, service_area, emr, bonding_capacity, certifications, current_backlog, max_project_size, available_start, crew_size, agent_endpoint)
VALUES
  ('sub-apex-elec', 'Apex Electrical LLC', 'Sub',
   ARRAY['Electrical'], ARRAY[26, 27], 'Southeast US',
   0.82, 15000000, ARRAY['MBE', 'OSHA-30'],
   28000000, 8000000, '2026-06-01', 45,
   '/api/agents/sub-apex-elec'),

  ('sub-premier-mech', 'Premier Mechanical Inc', 'Sub',
   ARRAY['Mechanical', 'Plumbing'], ARRAY[23, 22], 'Southeast US',
   0.88, 20000000, ARRAY['OSHA-30', 'EPA-608'],
   35000000, 12000000, '2026-05-15', 60,
   '/api/agents/sub-premier-mech'),

  ('sub-ironworks', 'Southeast Ironworks', 'Sub',
   ARRAY['Structural Steel'], ARRAY[5], 'Southeast US',
   0.79, 25000000, ARRAY['AISC', 'AWS-D1.1'],
   18000000, 15000000, '2026-05-01', 35,
   '/api/agents/sub-ironworks'),

  ('sub-solid-concrete', 'Solid Concrete Solutions', 'Sub',
   ARRAY['Concrete'], ARRAY[3], 'National',
   0.85, 30000000, ARRAY['ACI', 'OSHA-30'],
   42000000, 20000000, '2026-04-15', 80,
   '/api/agents/sub-solid-concrete'),

  ('sub-firestar-elec', 'FireStar Electric Co', 'Sub',
   ARRAY['Electrical', 'Fire Alarm'], ARRAY[26, 28], 'Southeast US',
   0.91, 10000000, ARRAY['OSHA-30', 'NICET-III'],
   15000000, 6000000, '2026-07-01', 30,
   '/api/agents/sub-firestar-elec'),

  ('sub-hvac-masters', 'HVAC Masters Corp', 'Sub',
   ARRAY['Mechanical', 'HVAC'], ARRAY[23], 'National',
   0.80, 18000000, ARRAY['SMACNA', 'EPA-608', 'OSHA-30'],
   22000000, 10000000, '2026-06-15', 50,
   '/api/agents/sub-hvac-masters');

-- ─── AGENT CARDS ───
INSERT INTO agent_cards (agent_id, company_id, type, capabilities, status)
VALUES
  ('agent-gc-turner', 'gc-turner', 'BuilderAgent',
   ARRAY['scope-detection', 'bid-leveling', 'negotiation', 'contract-generation'], 'online'),

  ('agent-sub-apex-elec', 'sub-apex-elec', 'TradeAgent',
   ARRAY['bid-response', 'negotiation', 'rfi-processing', 'submittal-tracking'], 'online'),

  ('agent-sub-premier-mech', 'sub-premier-mech', 'TradeAgent',
   ARRAY['bid-response', 'negotiation', 'rfi-processing', 'submittal-tracking'], 'online'),

  ('agent-sub-ironworks', 'sub-ironworks', 'TradeAgent',
   ARRAY['bid-response', 'negotiation', 'rfi-processing', 'submittal-tracking'], 'online'),

  ('agent-sub-solid-concrete', 'sub-solid-concrete', 'TradeAgent',
   ARRAY['bid-response', 'negotiation', 'rfi-processing', 'submittal-tracking'], 'online'),

  ('agent-sub-firestar-elec', 'sub-firestar-elec', 'TradeAgent',
   ARRAY['bid-response', 'negotiation', 'rfi-processing', 'submittal-tracking'], 'online'),

  ('agent-sub-hvac-masters', 'sub-hvac-masters', 'TradeAgent',
   ARRAY['bid-response', 'negotiation', 'rfi-processing', 'submittal-tracking'], 'online');
