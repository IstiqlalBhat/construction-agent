/**
 * Local Store — reads agent state from ~/.construct-agent/
 * This is the bridge between the OpenClaw agent (which writes files)
 * and the Next.js dashboard (which displays them).
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const AGENT_DIR = path.join(os.homedir(), '.construct-agent');

// ─── Types ───

export interface Identity {
  company: {
    name: string;
    type: 'GC' | 'Sub';
    trades?: string[];
    csi_divisions?: number[];
    service_area?: string;
    certifications?: string[];
    project_types?: string[];
  };
  financials?: {
    emr?: number;
    bonding_capacity?: number;
    max_project_size?: number;
    current_backlog?: number;
    crew_size?: number;
  };
  preferences?: {
    max_discount_percent?: number;
    min_margin_percent?: number;
    escalation_rounds?: number;
  };
  agent: {
    role: string;
    created: string;
    session_key?: string;
  };
}

export interface Contact {
  name: string;
  session_key: string;
  trades?: string[];
  csi_divisions?: number[];
  role?: string;
}

export interface LocalProject {
  name: string;
  location: string;
  value: number;
  description?: string;
  status?: string;
  created?: string;
  slug?: string;
}

export interface TradePackage {
  trade_package_id?: string;
  trade_name: string;
  csi_division: number;
  estimated_budget: number;
  scope_items: string[];
  status?: string;
}

export interface LocalBid {
  trade_package_id?: string;
  trade_name?: string;
  base_bid: number;
  company?: string;
  from?: { company: string };
  line_items?: Array<{ description: string; labor?: number; material?: number; equipment?: number; subtotal: number }>;
  inclusions?: string[];
  exclusions?: string[];
  qualifications?: string[];
  schedule?: { mobilization_date?: string; completion_date?: string; lead_time_items?: Array<{ item: string; weeks: number }> };
  bond_provided?: boolean;
  insurance_meets_requirements?: boolean;
  emr?: number;
  status?: string;
  submitted?: string;
}

export interface LocalNegotiation {
  negotiation_id?: string;
  trade_name?: string;
  company?: string;
  original_bid: number;
  current_price?: number;
  status: string;
  rounds: Array<{
    round: number;
    from: string;
    price: number;
    message: string;
    ve_proposal?: string;
    timestamp?: string;
  }>;
}

export interface ActivityEntry {
  ts: string;
  action: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface Opportunity {
  project_name: string;
  gc_company: string;
  trade_name: string;
  budget: number;
  scope_items?: string[];
  bid_due_date?: string;
  evaluation?: { should_bid: boolean; score: number; reasons: string[] };
  slug: string;
}

export interface DashboardData {
  identity: Identity | null;
  contacts: Contact[];
  projects: Array<LocalProject & { trade_packages: TradePackage[]; bids: Record<string, LocalBid>; negotiations: Record<string, LocalNegotiation>; leveling: Record<string, unknown> }>;
  opportunities: Opportunity[];
  bids: Array<LocalBid & { project: string; trade: string }>;
  activity: ActivityEntry[];
  agentDir: string;
  exists: boolean;
}

// ─── File Helpers ───

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJSON<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // Handle YAML-ish files by trying JSON first
    // The agent may write JSON or YAML — we try JSON, then fall back to basic YAML parsing
    try {
      return JSON.parse(content);
    } catch {
      return parseSimpleYAML(content) as T;
    }
  } catch {
    return null;
  }
}

function parseSimpleYAML(content: string): Record<string, unknown> {
  // Minimal YAML parser for flat/shallow objects the agent might write
  const result: Record<string, unknown> = {};
  let currentSection = '';

  for (const line of content.split('\n')) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    const kvMatch = trimmed.match(/^(\w[\w_]*):\s*(.*)$/);

    if (!kvMatch) continue;

    const [, key, rawVal] = kvMatch;
    let val: unknown = rawVal;

    // Parse value types
    if (rawVal === '' || rawVal === undefined) {
      // Section header
      if (indent === 0) {
        currentSection = key;
        if (!result[currentSection]) result[currentSection] = {};
      }
      continue;
    }

    // Strip quotes
    if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
      val = rawVal.slice(1, -1);
    } else if (rawVal === 'true') val = true;
    else if (rawVal === 'false') val = false;
    else if (rawVal === 'null') val = null;
    else if (/^-?\d+(\.\d+)?$/.test(rawVal)) val = parseFloat(rawVal);
    else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      try { val = JSON.parse(rawVal); } catch { val = rawVal; }
    } else {
      val = rawVal;
    }

    if (indent > 0 && currentSection) {
      (result[currentSection] as Record<string, unknown>)[key] = val;
    } else {
      result[key] = val;
    }
  }

  return result;
}

async function readJSONL<T>(filePath: string): Promise<T[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line); }
        catch { return null; }
      })
      .filter((entry): entry is T => entry !== null);
  } catch {
    return [];
  }
}

async function listDirs(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}

async function listJSONFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.filter(f => f.endsWith('.json'));
  } catch {
    return [];
  }
}

// ─── Public API ───

export async function getIdentity(): Promise<Identity | null> {
  // Try JSON first, then YAML
  const jsonId = await readJSON<Identity>(path.join(AGENT_DIR, 'identity.json'));
  if (jsonId) return jsonId;
  return readJSON<Identity>(path.join(AGENT_DIR, 'identity.yaml'));
}

export async function getContacts(): Promise<Contact[]> {
  const data = await readJSON<{ contacts: Contact[] }>(path.join(AGENT_DIR, 'contacts.json'))
    || await readJSON<{ contacts: Contact[] }>(path.join(AGENT_DIR, 'contacts.yaml'));
  return data?.contacts || [];
}

export async function getProjects(): Promise<DashboardData['projects']> {
  const projectsDir = path.join(AGENT_DIR, 'projects');
  const slugs = await listDirs(projectsDir);
  const projects: DashboardData['projects'] = [];

  for (const slug of slugs) {
    const projectDir = path.join(projectsDir, slug);
    const project = await readJSON<LocalProject>(path.join(projectDir, 'project.json'));
    if (!project) continue;

    const tradePackages = await readJSON<TradePackage[]>(path.join(projectDir, 'trade-packages.json')) || [];

    // Read bids
    const bids: Record<string, LocalBid> = {};
    const bidFiles = await listJSONFiles(path.join(projectDir, 'bids'));
    for (const f of bidFiles) {
      const bid = await readJSON<LocalBid>(path.join(projectDir, 'bids', f));
      if (bid) bids[f.replace('.json', '')] = bid;
    }

    // Read negotiations
    const negotiations: Record<string, LocalNegotiation> = {};
    const negFiles = await listJSONFiles(path.join(projectDir, 'negotiations'));
    for (const f of negFiles) {
      const neg = await readJSON<LocalNegotiation>(path.join(projectDir, 'negotiations', f));
      if (neg) negotiations[f.replace('.json', '')] = neg;
    }

    // Read leveling
    const leveling: Record<string, unknown> = {};
    const levelFiles = await listJSONFiles(path.join(projectDir, 'leveling'));
    for (const f of levelFiles) {
      const lev = await readJSON<unknown>(path.join(projectDir, 'leveling', f));
      if (lev) leveling[f.replace('.json', '')] = lev;
    }

    projects.push({ ...project, slug, trade_packages: tradePackages, bids, negotiations, leveling });
  }

  return projects;
}

export async function getOpportunities(): Promise<Opportunity[]> {
  const oppsDir = path.join(AGENT_DIR, 'opportunities');
  const slugs = await listDirs(oppsDir);
  const opportunities: Opportunity[] = [];

  for (const slug of slugs) {
    const oppDir = path.join(oppsDir, slug);
    const itb = await readJSON<Record<string, unknown>>(path.join(oppDir, 'itb.json'));
    if (!itb) continue;

    const evaluation = await readJSON<{ should_bid: boolean; score: number; reasons: string[] }>(path.join(oppDir, 'evaluation.json'));

    opportunities.push({
      project_name: (itb.project as Record<string, unknown>)?.name as string || slug,
      gc_company: (itb.from as Record<string, unknown>)?.company as string || 'Unknown GC',
      trade_name: (itb.payload as Record<string, unknown>)?.trade_name as string || 'Unknown Trade',
      budget: (itb.payload as Record<string, unknown>)?.estimated_budget as number || 0,
      scope_items: (itb.payload as Record<string, unknown>)?.scope_items as string[] || [],
      bid_due_date: (itb.payload as Record<string, unknown>)?.bid_due_date as string,
      evaluation: evaluation || undefined,
      slug,
    });
  }

  return opportunities;
}

export async function getSubBids(): Promise<Array<LocalBid & { project: string; trade: string }>> {
  const bidsDir = path.join(AGENT_DIR, 'bids');
  const projectSlugs = await listDirs(bidsDir);
  const allBids: Array<LocalBid & { project: string; trade: string }> = [];

  for (const projectSlug of projectSlugs) {
    const tradeSlugs = await listDirs(path.join(bidsDir, projectSlug));
    for (const tradeSlug of tradeSlugs) {
      const bid = await readJSON<LocalBid>(path.join(bidsDir, projectSlug, tradeSlug, 'bid.json'));
      if (bid) allBids.push({ ...bid, project: projectSlug, trade: tradeSlug });
    }
  }

  return allBids;
}

export async function getActivity(limit = 100): Promise<ActivityEntry[]> {
  const entries = await readJSONL<ActivityEntry>(path.join(AGENT_DIR, 'activity.jsonl'));
  // Return most recent first
  return entries.reverse().slice(0, limit);
}

export async function getDashboardData(): Promise<DashboardData> {
  const agentExists = await exists(AGENT_DIR);

  const [identity, contacts, projects, opportunities, bids, activity] = await Promise.all([
    getIdentity(),
    getContacts(),
    getProjects(),
    getOpportunities(),
    getSubBids(),
    getActivity(),
  ]);

  return {
    identity,
    contacts,
    projects,
    opportunities,
    bids,
    activity,
    agentDir: AGENT_DIR,
    exists: agentExists,
  };
}
