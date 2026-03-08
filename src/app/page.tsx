'use client';

import { useEffect, useState, useCallback } from 'react';
import { C, card, cardSolid, header, meshBg, btn, badgeStyles, tag as tagS, statCard, statLabel, statValue, th, td } from '@/lib/styles';

// ─── Types (mirrors local-store.ts) ───

interface Identity {
  company: { name: string; type: 'GC' | 'Sub'; trades?: string[]; csi_divisions?: number[]; service_area?: string; project_types?: string[] };
  financials?: { emr?: number; bonding_capacity?: number; max_project_size?: number; current_backlog?: number; crew_size?: number };
  preferences?: { max_discount_percent?: number; min_margin_percent?: number; escalation_rounds?: number };
  agent: { role: string; created: string; session_key?: string };
}

interface Contact { name: string; session_key: string; trades?: string[]; role?: string }
interface ActivityEntry { ts: string; action: string; summary: string; details?: Record<string, unknown> }
interface TradePackage { trade_name: string; csi_division: number; estimated_budget: number; scope_items: string[]; status?: string }
interface LocalBid {
  base_bid: number; company?: string; from?: { company: string }; trade_name?: string;
  inclusions?: string[]; exclusions?: string[]; bond_provided?: boolean; emr?: number; status?: string;
}
interface LocalNegotiation {
  trade_name?: string; company?: string; original_bid: number; current_price?: number; status: string;
  rounds: Array<{ round: number; from: string; price: number; message: string; ve_proposal?: string; timestamp?: string }>;
}
interface Project {
  name: string; location: string; value: number; description?: string; status?: string; slug?: string;
  trade_packages: TradePackage[]; bids: Record<string, LocalBid>; negotiations: Record<string, LocalNegotiation>;
}
interface Opportunity {
  project_name: string; gc_company: string; trade_name: string; budget: number;
  scope_items?: string[]; bid_due_date?: string; slug: string;
  evaluation?: { should_bid: boolean; score: number; reasons: string[] };
}
interface DashboardData {
  identity: Identity | null; contacts: Contact[]; projects: Project[];
  opportunities: Opportunity[]; bids: Array<LocalBid & { project: string; trade: string }>;
  activity: ActivityEntry[]; agentDir: string; exists: boolean;
}

// ─── Helpers ───

const fmt = (n: number) => '$' + n.toLocaleString();
const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

const actionBadge = (action: string): { style: keyof typeof badgeStyles; label: string } => {
  const map: Record<string, { style: keyof typeof badgeStyles; label: string }> = {
    project_created: { style: 'blue', label: 'Project' },
    scope_detected: { style: 'cyan', label: 'Scope' },
    itb_sent: { style: 'purple', label: 'ITB Sent' },
    itb_received: { style: 'purple', label: 'ITB' },
    itb_evaluated: { style: 'secondary', label: 'Evaluated' },
    itb_declined: { style: 'secondary', label: 'Declined' },
    bid_received: { style: 'blue', label: 'Bid In' },
    bid_submitted: { style: 'blue', label: 'Bid Out' },
    bids_leveled: { style: 'cyan', label: 'Leveled' },
    negotiation_opened: { style: 'amber', label: 'Negotiate' },
    negotiation_counter: { style: 'amber', label: 'Counter' },
    negotiation_accepted: { style: 'green', label: 'Accepted' },
    negotiation_escalated: { style: 'red', label: 'Escalated' },
    bid_awarded: { style: 'green', label: 'Awarded' },
    bid_rejected: { style: 'red', label: 'Rejected' },
    contact_added: { style: 'secondary', label: 'Contact' },
    identity_created: { style: 'secondary', label: 'Setup' },
  };
  return map[action] || { style: 'secondary', label: action };
};

// ─── Components ───

function SetupGuide({ agentDir }: { agentDir: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: C.bg0 }}>
      <div style={meshBg} />
      <div style={{ ...cardSolid, padding: 48, maxWidth: 600, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1F3D7;&#xFE0F;</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.t1, marginBottom: 8 }}>ConstructA2A</h1>
        <p style={{ color: C.t2, fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
          No agent data found. Set up your OpenClaw agent to see your procurement activity here.
        </p>
        <div style={{ textAlign: 'left', background: C.bg0, borderRadius: 12, padding: 24, fontFamily: 'monospace', fontSize: 13, color: C.cyan, lineHeight: 1.8 }}>
          <div style={{ color: C.t3, marginBottom: 8 }}># 1. Run the setup script</div>
          <div>./skills/setup.sh</div>
          <div style={{ color: C.t3, marginTop: 16, marginBottom: 8 }}># 2. Install skill in OpenClaw</div>
          <div style={{ color: C.t2 }}>GC: skills/builder-agent/</div>
          <div style={{ color: C.t2 }}>Sub: skills/trade-agent/</div>
          <div style={{ color: C.t3, marginTop: 16, marginBottom: 8 }}># 3. Start your agent</div>
          <div style={{ color: C.t2 }}>Your agent will create identity at:</div>
          <div>{agentDir}/identity.json</div>
        </div>
        <p style={{ color: C.t3, fontSize: 12, marginTop: 24 }}>
          This dashboard reads from {agentDir}/ — the same files your OpenClaw agent writes.
          Every decision, bid, and negotiation is tracked here for full transparency.
        </p>
      </div>
    </div>
  );
}

function IdentityCard({ identity }: { identity: Identity }) {
  const isGC = identity.company.type === 'GC';
  return (
    <div style={{ ...cardSolid, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          background: isGC ? 'rgba(79,125,249,0.15)' : 'rgba(0,232,157,0.15)' }}>
          {isGC ? '\u{1F3D7}\u{FE0F}' : '\u26A1'}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{identity.company.name}</div>
          <div style={{ fontSize: 12, color: C.t2 }}>{isGC ? 'General Contractor' : 'Subcontractor'} &middot; {identity.company.service_area || 'No area set'}</div>
        </div>
      </div>
      {identity.company.trades?.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {identity.company.trades.map(t => <span key={t} style={tagS}>{t}</span>)}
        </div>
      ) : null}
      {!isGC && identity.financials && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          {identity.financials.emr != null && <div style={{ fontSize: 12, color: C.t2 }}>EMR: <span style={{ color: identity.financials.emr < 1 ? C.green : C.amber }}>{identity.financials.emr}</span></div>}
          {identity.financials.crew_size ? <div style={{ fontSize: 12, color: C.t2 }}>Crew: {identity.financials.crew_size}</div> : null}
          {identity.financials.bonding_capacity ? <div style={{ fontSize: 12, color: C.t2 }}>Bond cap: {fmt(identity.financials.bonding_capacity)}</div> : null}
          {identity.financials.current_backlog != null ? <div style={{ fontSize: 12, color: C.t2 }}>Backlog: {fmt(identity.financials.current_backlog)}</div> : null}
        </div>
      )}
      {identity.agent.session_key && (
        <div style={{ marginTop: 12, fontSize: 11, color: C.t3, fontFamily: 'monospace' }}>
          Session: {identity.agent.session_key.slice(0, 20)}...
        </div>
      )}
    </div>
  );
}

function ContactsList({ contacts }: { contacts: Contact[] }) {
  if (!contacts.length) return (
    <div style={{ ...cardSolid, padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Contacts</div>
      <div style={{ fontSize: 13, color: C.t3 }}>No contacts yet. Add agents in OpenClaw:</div>
      <div style={{ fontSize: 12, color: C.t3, fontFamily: 'monospace', marginTop: 4 }}>&gt; add contact [name] [session_key]</div>
    </div>
  );

  return (
    <div style={{ ...cardSolid, padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Contacts ({contacts.length})</div>
      {contacts.map(c => (
        <div key={c.session_key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid rgba(56,68,120,0.15)` }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: C.t1, fontWeight: 600 }}>{c.name}</div>
            {c.trades?.length ? <div style={{ fontSize: 11, color: C.t3 }}>{c.trades.join(', ')}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityLog({ activity }: { activity: ActivityEntry[] }) {
  if (!activity.length) return (
    <div style={{ ...cardSolid, padding: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Activity Log</div>
      <div style={{ fontSize: 14, color: C.t3, textAlign: 'center', padding: 32 }}>
        No activity yet. Start a conversation with your OpenClaw agent to begin procurement.
      </div>
    </div>
  );

  return (
    <div style={{ ...cardSolid, padding: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
        Activity Log ({activity.length} events)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {activity.map((entry, i) => {
          const badge = actionBadge(entry.action);
          const bs = badgeStyles[badge.style];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < activity.length - 1 ? '1px solid rgba(56,68,120,0.12)' : 'none' }}>
              <div style={{ width: 48, fontSize: 11, color: C.t3, textAlign: 'right', flexShrink: 0, paddingTop: 2 }}>
                {timeAgo(entry.ts)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ ...bs.container, fontSize: 10, alignSelf: 'flex-start' }}>
                  <span style={bs.dot} />
                  {badge.label}
                </span>
                <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.4 }}>{entry.summary}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GCProjectsView({ projects }: { projects: Project[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!projects.length) return (
    <div style={{ ...cardSolid, padding: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Projects</div>
      <div style={{ fontSize: 14, color: C.t3, textAlign: 'center', padding: 32 }}>
        No projects yet. Tell your agent: &quot;I have a new project&quot;
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projects ({projects.length})</div>
      {projects.map(p => {
        const key = p.slug || p.name;
        const isExpanded = expanded === key;
        const bidCount = Object.keys(p.bids).length;
        const negCount = Object.keys(p.negotiations).length;
        const awardedCount = p.trade_packages.filter(tp => tp.status === 'awarded').length;

        return (
          <div key={key} style={cardSolid}>
            <div style={{ padding: 20, cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : key)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: C.t2, marginTop: 2 }}>{p.location} &middot; {fmt(p.value)}</div>
                </div>
                {p.status && (() => {
                  const s = p.status === 'awarded' ? 'green' : p.status === 'bidding' ? 'blue' : 'secondary';
                  return <span style={badgeStyles[s].container}><span style={badgeStyles[s].dot} />{p.status}</span>;
                })()}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: C.t3 }}>
                <span>{p.trade_packages.length} trades</span>
                <span>{bidCount} bids</span>
                <span>{negCount} negotiations</span>
                {awardedCount > 0 && <span style={{ color: C.green }}>{awardedCount} awarded</span>}
                <span style={{ marginLeft: 'auto', color: C.t3 }}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
              </div>
            </div>

            {isExpanded && (
              <div style={{ borderTop: `1px solid ${C.br}`, padding: 20 }}>
                {p.trade_packages.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', marginBottom: 8 }}>Trade Packages</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        <th style={th}>Trade</th>
                        <th style={{ ...th, textAlign: 'right' }}>Budget</th>
                        <th style={th}>Status</th>
                      </tr></thead>
                      <tbody>{p.trade_packages.map((tp, i) => (
                        <tr key={i}>
                          <td style={{ ...td, color: C.t1, fontWeight: 600 }}>{tp.trade_name}</td>
                          <td style={{ ...td, textAlign: 'right', color: C.blueL }}>{fmt(tp.estimated_budget)}</td>
                          <td style={td}><span style={tagS}>{tp.status || 'detected'}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}

                {bidCount > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', marginBottom: 8 }}>Received Bids</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        <th style={th}>Sub</th>
                        <th style={{ ...th, textAlign: 'right' }}>Bid</th>
                        <th style={th}>Bond</th>
                        <th style={th}>Status</th>
                      </tr></thead>
                      <tbody>{Object.entries(p.bids).map(([k, b]) => (
                        <tr key={k}>
                          <td style={{ ...td, color: C.t1, fontWeight: 600 }}>{b.company || b.from?.company || k}</td>
                          <td style={{ ...td, textAlign: 'right', color: C.cyan }}>{fmt(b.base_bid)}</td>
                          <td style={td}>{b.bond_provided ? '\u2705' : '\u2014'}</td>
                          <td style={td}><span style={tagS}>{b.status || 'submitted'}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}

                {negCount > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', marginBottom: 8 }}>Negotiations</div>
                    {Object.entries(p.negotiations).map(([k, neg]) => {
                      const ns = neg.status === 'agreed' ? 'green' : neg.status === 'escalated' ? 'red' : 'amber';
                      return (
                        <div key={k} style={{ ...card, padding: 16, marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{neg.company || neg.trade_name || k}</span>
                            <span style={badgeStyles[ns].container}><span style={badgeStyles[ns].dot} />{neg.status}</span>
                          </div>
                          <div style={{ fontSize: 12, color: C.t2, marginBottom: 8 }}>
                            Original: {fmt(neg.original_bid)} &rarr; {neg.current_price ? fmt(neg.current_price) : 'In progress'} &middot; {neg.rounds.length} rounds
                          </div>
                          {neg.rounds.map((r, i) => (
                            <div key={i} style={{ padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(56,68,120,0.1)' : 'none', fontSize: 12 }}>
                              <span style={{ color: r.from === 'gc' ? C.blue : C.green, fontWeight: 600 }}>{r.from === 'gc' ? 'GC' : 'Sub'}</span>
                              <span style={{ color: C.t2 }}> &middot; R{r.round} &middot; </span>
                              <span style={{ color: C.cyan }}>{fmt(r.price)}</span>
                              <div style={{ color: C.t3, marginTop: 2 }}>{r.message}</div>
                              {r.ve_proposal && <div style={{ color: C.purple, marginTop: 2, fontStyle: 'italic' }}>VE: {r.ve_proposal}</div>}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SubOpportunitiesView({ opportunities, bids }: { opportunities: Opportunity[]; bids: Array<LocalBid & { project: string; trade: string }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {opportunities.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Opportunities ({opportunities.length})</div>
          {opportunities.map(opp => (
            <div key={opp.slug} style={{ ...cardSolid, padding: 20, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>{opp.project_name}</div>
                  <div style={{ fontSize: 13, color: C.t2, marginTop: 2 }}>{opp.trade_name} &middot; {fmt(opp.budget)}</div>
                  <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>From: {opp.gc_company}</div>
                </div>
                {opp.evaluation && (() => {
                  const s = opp.evaluation.should_bid ? 'green' : 'red';
                  return <span style={badgeStyles[s].container}><span style={badgeStyles[s].dot} />{opp.evaluation.should_bid ? `Bid (${opp.evaluation.score})` : 'No-Bid'}</span>;
                })()}
              </div>
              {opp.scope_items && opp.scope_items.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {opp.scope_items.slice(0, 4).map(s => <span key={s} style={tagS}>{s}</span>)}
                </div>
              )}
              {opp.bid_due_date && <div style={{ fontSize: 11, color: C.amber, marginTop: 8 }}>Due: {opp.bid_due_date}</div>}
            </div>
          ))}
        </div>
      )}

      {bids.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Submitted Bids ({bids.length})</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', ...cardSolid }}>
            <thead><tr>
              <th style={th}>Project</th>
              <th style={th}>Trade</th>
              <th style={{ ...th, textAlign: 'right' }}>Bid</th>
              <th style={th}>Status</th>
            </tr></thead>
            <tbody>{bids.map((b, i) => (
              <tr key={i}>
                <td style={{ ...td, color: C.t1, fontWeight: 600 }}>{b.project}</td>
                <td style={{ ...td, color: C.t2 }}>{b.trade}</td>
                <td style={{ ...td, textAlign: 'right', color: C.cyan }}>{fmt(b.base_bid)}</td>
                <td style={td}><span style={tagS}>{b.status || 'submitted'}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {!opportunities.length && !bids.length && (
        <div style={{ ...cardSolid, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: C.t3, padding: 32 }}>
            No opportunities or bids yet. Your agent will notify you when ITBs arrive.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'activity' | 'data'>('activity');

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg0, color: C.t2 }}>
      Loading agent data...
    </div>
  );

  if (!data?.exists || !data.identity) {
    return <SetupGuide agentDir={data?.agentDir || '~/.construct-agent'} />;
  }

  const { identity, contacts, projects, opportunities, bids, activity } = data;
  const isGC = identity.company.type === 'GC';

  const totalBids = isGC ? projects.reduce((s, p) => s + Object.keys(p.bids).length, 0) : bids.length;
  const activeNeg = isGC
    ? projects.reduce((s, p) => s + Object.values(p.negotiations).filter(n => n.status === 'open').length, 0)
    : bids.filter(b => b.status === 'negotiating').length;
  const awarded = isGC
    ? projects.reduce((s, p) => s + p.trade_packages.filter(tp => tp.status === 'awarded').length, 0)
    : bids.filter(b => b.status === 'awarded').length;

  return (
    <div style={{ minHeight: '100vh', background: C.bg0, color: C.t1 }}>
      <div style={meshBg} />

      <div style={{ ...header, padding: '0 24px', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 800, background: 'linear-gradient(135deg, #4f7df9, #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ConstructA2A
          </span>
          <span style={{ ...badgeStyles[isGC ? 'blue' : 'green'].container, fontSize: 10 }}>
            <span style={badgeStyles[isGC ? 'blue' : 'green'].dot} />
            {isGC ? 'GC Agent' : 'Sub Agent'}
          </span>
        </div>
        <button onClick={loadData} style={{ ...btn.ghost, ...btn.sm }}>Refresh</button>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div style={statCard}>
            <div style={statLabel}>{isGC ? 'Projects' : 'Opportunities'}</div>
            <div style={{ ...statValue, color: C.blue }}>{isGC ? projects.length : opportunities.length}</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>{isGC ? 'Bids Received' : 'Bids Submitted'}</div>
            <div style={{ ...statValue, color: C.cyan }}>{totalBids}</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Negotiations</div>
            <div style={{ ...statValue, color: C.amber }}>{activeNeg}</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Awarded</div>
            <div style={{ ...statValue, color: C.green }}>{awarded}</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Activity</div>
            <div style={{ ...statValue, color: C.purple }}>{activity.length}</div>
          </div>
        </div>

        {/* Layout: sidebar + content */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <IdentityCard identity={identity} />
            <ContactsList contacts={contacts} />
          </div>

          <div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
              {(['activity', 'data'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  ...btn.ghost, ...btn.sm,
                  ...(tab === t ? { background: 'rgba(79,125,249,0.15)', color: C.blueL, borderColor: 'rgba(79,125,249,0.3)' } : {}),
                }}>
                  {t === 'activity' ? 'Activity Log' : isGC ? 'Projects & Bids' : 'Opportunities & Bids'}
                </button>
              ))}
            </div>

            {tab === 'activity' && <ActivityLog activity={activity} />}
            {tab === 'data' && isGC && <GCProjectsView projects={projects} />}
            {tab === 'data' && !isGC && <SubOpportunitiesView opportunities={opportunities} bids={bids} />}
          </div>
        </div>
      </div>
    </div>
  );
}
