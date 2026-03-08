'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { C, card, cardSolid, header, meshBg, btn, tag as tagS, badgeStyles, statCard, statLabel, statValue } from '@/lib/styles';

interface AgentCard {
  agentId: string; companyId: string; type: string;
  company: { id: string; name: string; type: string; trades: string[]; csiDivisions: number[]; serviceArea: string;
    prequalifications: { emr: number; bondingCapacity: number; certifications: string[] };
    capacity: { currentBacklog: number; maxProjectSize: number; availableStart: string; crewSize: number }; };
  capabilities: string[]; status: string;
}
interface Bid { id: string; tradePackageId: string; projectId: string; subCompanyId: string; subCompanyName: string; baseBid: number; lineItems: { csiCode: string; description: string; laborCost: number; materialCost: number; equipmentCost: number; subtotal: number }[]; inclusions: string[]; exclusions: string[]; qualifications: string[]; status: string; submittedAt: string; }
interface A2AMessage { id: string; type: string; fromAgentId: string; toAgentId: string; projectId: string; payload: Record<string, unknown>; timestamp: string; }

const fmt = (n: number) => '$' + n.toLocaleString();
const Icon = ({ d, size = 16, color = 'currentColor', sw = 1.8 }: { d: string; size?: number; color?: string; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const Badge = ({ status }: { status: string }) => {
  const m: Record<string, { c: string; l: string }> = {
    submitted: { c: 'blue', l: 'Submitted' }, under_review: { c: 'purple', l: 'Reviewing' },
    shortlisted: { c: 'cyan', l: 'Shortlisted' }, negotiating: { c: 'amber', l: 'Negotiating' },
    awarded: { c: 'green', l: 'Awarded' }, rejected: { c: 'red', l: 'Rejected' },
    online: { c: 'green', l: 'Online' }, offline: { c: 'red', l: 'Offline' },
  };
  const s = m[status] || { c: 'blue', l: status };
  const b = badgeStyles[s.c] || badgeStyles.blue;
  return <span style={b.container}><span style={b.dot} />{s.l}</span>;
};

export default function SubDashboard() {
  const [subs, setSubs] = useState<AgentCard[]>([]);
  const [selectedSub, setSelectedSub] = useState<AgentCard | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [messages, setMessages] = useState<A2AMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'bids' | 'messages'>('overview');
  const [expandedBid, setExpandedBid] = useState<string | null>(null);

  const loadSubs = useCallback(async () => {
    const res = await fetch('/api/agents/discover?type=Sub');
    const data = await res.json();
    setSubs(data);
    if (data.length > 0 && !selectedSub) setSelectedSub(data[0]);
  }, [selectedSub]);
  useEffect(() => { loadSubs(); }, [loadSubs]);

  const loadBids = useCallback(async (subId: string) => {
    const res = await fetch(`/api/bids?subId=${subId}`);
    setBids(await res.json());
  }, []);

  const loadMessages = useCallback(async () => {
    const res = await fetch('/api/itb');
    const data = await res.json();
    if (selectedSub) setMessages(data.filter((m: A2AMessage) => m.fromAgentId.includes(selectedSub.companyId) || m.toAgentId.includes(selectedSub.companyId)));
  }, [selectedSub]);

  useEffect(() => { if (selectedSub) { loadBids(selectedSub.companyId); loadMessages(); } }, [selectedSub, loadBids, loadMessages]);

  const awardedBids = bids.filter(b => b.status === 'awarded');
  const pendingBids = bids.filter(b => b.status !== 'awarded' && b.status !== 'rejected');
  const rejectedBids = bids.filter(b => b.status === 'rejected');
  const totalBidValue = bids.reduce((s, b) => s + b.baseBid, 0);

  const capPct = selectedSub ? Math.min(100, (selectedSub.company.capacity.currentBacklog / (selectedSub.company.capacity.maxProjectSize * 5)) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: C.bg0 }}>
      <div style={meshBg} />

      {/* Header */}
      <header style={header} className="relative z-10">
        <div className="max-w-[1400px] mx-auto w-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] text-white" style={{ background: 'linear-gradient(135deg, #00e89d, #00d4ff)' }}>A2A</div>
              <span className="text-sm font-bold tracking-tight hidden sm:inline" style={{ color: C.t1 }}>Construct<span style={{ background: 'linear-gradient(135deg, #4f7df9, #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>A2A</span></span>
            </Link>
            <div className="w-px h-5" style={{ background: C.br }} />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(0, 232, 157, 0.1)' }}>
                <Icon d="M13 10V3L4 14h7v7l9-11h-7z" size={13} color="#00e89d" />
              </div>
              <span className="text-sm font-semibold" style={{ color: C.t1 }}>TradeAgent</span>
              {selectedSub && <span style={{ ...badgeStyles.green.container, fontSize: 10 }}><span style={badgeStyles.green.dot} />{selectedSub.company.name}</span>}
            </div>
          </div>
          <Link href="/gc" style={{ ...btn.ghost, ...btn.sm, textDecoration: 'none' }}>
            <Icon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" size={13} />
            Switch to GC
          </Link>
        </div>
      </header>

      <div className="flex relative z-10" style={{ minHeight: 'calc(100vh - 57px)' }}>
        {/* Sidebar */}
        <div style={{ width: 260, borderRight: `1px solid ${C.br}`, background: C.bg1, overflowY: 'auto' as const }}>
          <div className="p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: C.t3 }}>Registered Agents</h3>
            <div className="space-y-1">
              {subs.map(sub => {
                const active = selectedSub?.companyId === sub.companyId;
                return (
                  <button key={sub.companyId} onClick={() => { setSelectedSub(sub); setActiveTab('overview'); setExpandedBid(null); }}
                    className="w-full text-left"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', border: 'none', background: active ? 'rgba(0,232,157,0.06)' : 'transparent', outline: 'none', fontFamily: 'inherit' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: active ? 'rgba(0, 232, 157, 0.12)' : 'rgba(56, 68, 120, 0.15)' }}>
                      <Icon d="M13 10V3L4 14h7v7l9-11h-7z" size={14} color={active ? '#00e89d' : '#6b7a99'} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: active ? '#4dffc3' : C.t1 }}>{sub.company.name}</div>
                      <div className="flex gap-1 mt-0.5">
                        {sub.company.trades.map((t, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0 rounded" style={{ background: 'rgba(56,68,120,0.15)', color: C.t3 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full ml-auto flex-shrink-0" style={{ background: '#00e89d' }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          {selectedSub && (
            <div className="max-w-5xl" style={{ animation: 'fadeIn 0.3s ease both' }}>
              {/* Tabs */}
              <div className="flex gap-0.5 mb-6 p-1 rounded-xl" style={{ background: 'rgba(12, 16, 33, 0.5)', border: `1px solid ${C.br}` }}>
                {([
                  { key: 'overview' as const, icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', label: 'Overview' },
                  { key: 'bids' as const, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Bids' },
                  { key: 'messages' as const, icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z', label: 'A2A Messages' },
                ]).map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: activeTab === tab.key ? C.bg2 : 'transparent',
                      color: activeTab === tab.key ? C.t1 : C.t3,
                      boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                    }}>
                    <Icon d={tab.icon} size={14} color={activeTab === tab.key ? C.t1 : C.t3} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div>
                  {/* Agent Profile Card */}
                  <div style={{ ...cardSolid, padding: 24, marginBottom: 24 }}>
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                          style={{ background: 'rgba(0, 232, 157, 0.08)', border: '1px solid rgba(0, 232, 157, 0.15)' }}>
                          <Icon d="M13 10V3L4 14h7v7l9-11h-7z" size={26} color="#00e89d" sw={1.5} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold" style={{ color: C.t1 }}>{selectedSub.company.name}</h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs" style={{ color: C.t2 }}>TradeAgent</span>
                            <span className="text-xs" style={{ color: C.t3 }}>|</span>
                            <span className="text-xs" style={{ color: C.t2 }}>{selectedSub.company.serviceArea}</span>
                          </div>
                        </div>
                      </div>
                      <Badge status={selectedSub.status} />
                    </div>

                    <div className="grid grid-cols-5 gap-4 mb-5">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.t3 }}>Trades</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedSub.company.trades.map((t, i) => (
                            <span key={i} style={{ ...badgeStyles.blue.container, fontSize: 10 }}><span style={badgeStyles.blue.dot} />{t}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.t3 }}>EMR</div>
                        <div className="text-2xl font-black" style={{ color: selectedSub.company.prequalifications.emr < 0.85 ? '#00e89d' : '#ffb224' }}>
                          {selectedSub.company.prequalifications.emr}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.t3 }}>Bonding</div>
                        <div className="text-lg font-bold mono" style={{ color: C.t1 }}>
                          {(selectedSub.company.prequalifications.bondingCapacity / 1000000).toFixed(0)}M
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.t3 }}>Crew</div>
                        <div className="text-2xl font-black" style={{ color: C.t1 }}>{selectedSub.company.capacity.crewSize}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.t3 }}>Availability</div>
                        <div className="text-sm font-semibold mono" style={{ color: C.t1 }}>{selectedSub.company.capacity.availableStart}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {selectedSub.company.prequalifications.certifications.map((c, i) => (
                        <span key={i} style={{ ...badgeStyles.purple.container, fontSize: 10 }}><span style={badgeStyles.purple.dot} />{c}</span>
                      ))}
                      {selectedSub.capabilities.map((c, i) => (
                        <span key={`cap-${i}`} style={tagS}>{c}</span>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-5 gap-4 mb-6">
                    {[
                      { label: 'Active Bids', value: pendingBids.length, color: '#4f7df9' },
                      { label: 'Won', value: awardedBids.length, color: '#00e89d' },
                      { label: 'Lost', value: rejectedBids.length, color: '#ff4d6a' },
                      { label: 'Win Rate', value: bids.length > 0 ? `${Math.round(awardedBids.length / bids.length * 100)}%` : '--', color: '#9f7aea' },
                      { label: 'Total Value', value: fmt(totalBidValue), color: '#00d4ff', small: true },
                    ].map((stat, i) => (
                      <div key={i} style={{ ...statCard, animation: 'slideUp 0.6s ease-out both', animationDelay: `${i * 0.06}s` }}>
                        <span style={statLabel}>{stat.label}</span>
                        <div style={{ ...statValue, color: stat.color, ...(stat.small ? { fontSize: 18 } : {}) }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Capacity */}
                  <div style={{ ...cardSolid, padding: 20 }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: C.t3 }}>Capacity Utilization</h3>
                      <span className="text-xs mono font-semibold" style={{ color: capPct > 80 ? '#ff4d6a' : capPct > 60 ? '#ffb224' : '#00e89d' }}>
                        {Math.round(capPct)}%
                      </span>
                    </div>
                    <div className="mb-3" style={{ height: 6, borderRadius: 3, background: 'rgba(56,68,120,0.2)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        borderRadius: 3,
                        width: `${capPct}%`,
                        background: capPct > 80 ? 'linear-gradient(135deg, #ffb224, #ff6b6b)' : 'linear-gradient(135deg, #00e89d, #00d4ff)',
                      }} />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: C.t2 }}>Backlog: <span className="mono font-semibold" style={{ color: C.t1 }}>{fmt(selectedSub.company.capacity.currentBacklog)}</span></span>
                      <span style={{ color: C.t2 }}>Max: <span className="mono font-semibold" style={{ color: C.t1 }}>{fmt(selectedSub.company.capacity.maxProjectSize)}</span></span>
                    </div>
                  </div>
                </div>
              )}

              {/* BIDS */}
              {activeTab === 'bids' && (
                <div>
                  {bids.length === 0 ? (
                    <div style={{ ...cardSolid, textAlign: 'center', padding: '80px 24px' }}>
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(0, 232, 157, 0.08)' }}>
                        <Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={28} color="#00e89d" sw={1.5} />
                      </div>
                      <h3 className="text-lg font-bold mb-2" style={{ color: C.t1 }}>No Bids Yet</h3>
                      <p className="text-sm" style={{ color: C.t2 }}>TradeAgent will auto-generate bids when matching ITBs arrive</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bids.map((bid, idx) => {
                        const expanded = expandedBid === bid.id;
                        const labor = bid.lineItems.reduce((s, li) => s + li.laborCost, 0);
                        const material = bid.lineItems.reduce((s, li) => s + li.materialCost, 0);
                        const equip = bid.lineItems.reduce((s, li) => s + li.equipmentCost, 0);
                        return (
                          <div key={bid.id} style={{ ...cardSolid, overflow: 'hidden', animation: 'slideUp 0.6s ease-out both', animationDelay: `${Math.min(idx, 5) * 0.06}s` }}>
                            <div className="p-5 cursor-pointer" onClick={() => setExpandedBid(expanded ? null : bid.id)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{
                                      background: bid.status === 'awarded' ? 'rgba(0, 232, 157, 0.1)' : bid.status === 'rejected' ? 'rgba(255, 77, 106, 0.08)' : 'rgba(79, 125, 249, 0.08)',
                                      border: `1px solid ${bid.status === 'awarded' ? 'rgba(0, 232, 157, 0.2)' : bid.status === 'rejected' ? 'rgba(255, 77, 106, 0.12)' : 'rgba(79, 125, 249, 0.12)'}`,
                                    }}>
                                    <Icon d={bid.status === 'awarded' ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"}
                                      size={18} color={bid.status === 'awarded' ? '#00e89d' : bid.status === 'rejected' ? '#ff4d6a' : '#4f7df9'} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2.5">
                                      <span className="font-semibold text-sm" style={{ color: C.t1 }}>Project {bid.projectId.slice(0, 8)}</span>
                                      <Badge status={bid.status} />
                                    </div>
                                    <span className="text-[11px] mono" style={{ color: C.t3 }}>
                                      {new Date(bid.submittedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-lg font-bold mono" style={{ color: bid.status === 'awarded' ? '#00e89d' : C.t1 }}>
                                    {fmt(bid.baseBid)}
                                  </span>
                                  <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke={C.t3} strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>

                              {/* Cost breakdown bar */}
                              <div className="mt-3 flex gap-0.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(56,68,120,0.15)' }}>
                                <div style={{ width: `${(labor / bid.baseBid) * 100}%`, background: '#4f7df9', borderRadius: '4px 0 0 4px' }} />
                                <div style={{ width: `${(material / bid.baseBid) * 100}%`, background: '#00d4ff' }} />
                                <div style={{ width: `${(equip / bid.baseBid) * 100}%`, background: '#9f7aea', borderRadius: '0 4px 4px 0' }} />
                              </div>
                              <div className="flex gap-4 mt-2 text-[10px]">
                                <span style={{ color: '#7da2ff' }}>Labor {fmt(labor)}</span>
                                <span style={{ color: '#66e3ff' }}>Material {fmt(material)}</span>
                                <span style={{ color: '#c4a8ff' }}>Equipment {fmt(equip)}</span>
                              </div>
                            </div>

                            {/* Expanded */}
                            {expanded && (
                              <div className="px-5 pb-5" style={{ borderTop: `1px solid ${C.br}`, animation: 'slideUp 0.3s ease both' }}>
                                <div className="grid grid-cols-2 gap-6 pt-4">
                                  <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.t3 }}>Line Items</h4>
                                    {bid.lineItems.map((li, i) => (
                                      <div key={i} className="flex justify-between py-1.5 text-xs" style={{ borderBottom: '1px solid rgba(56,68,120,0.1)' }}>
                                        <span style={{ color: C.t1 }}>{li.description}</span>
                                        <span className="mono font-semibold" style={{ color: C.t2 }}>{fmt(li.subtotal)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.t3 }}>Scope</h4>
                                    {bid.inclusions.map((inc, i) => (
                                      <div key={i} className="text-xs flex items-start gap-1.5 py-0.5">
                                        <span className="font-bold" style={{ color: '#00e89d' }}>+</span>
                                        <span style={{ color: C.t1 }}>{inc}</span>
                                      </div>
                                    ))}
                                    {bid.exclusions.map((exc, i) => (
                                      <div key={i} className="text-xs flex items-start gap-1.5 py-0.5">
                                        <span className="font-bold" style={{ color: '#ff4d6a' }}>-</span>
                                        <span style={{ color: C.t1 }}>{exc}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* MESSAGES */}
              {activeTab === 'messages' && (
                <div>
                  {messages.length === 0 ? (
                    <div style={{ ...cardSolid, textAlign: 'center', padding: '80px 24px' }}>
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(0, 212, 255, 0.08)' }}>
                        <Icon d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" size={28} color="#00d4ff" sw={1.5} />
                      </div>
                      <h3 className="text-lg font-bold mb-2" style={{ color: C.t1 }}>No A2A Messages</h3>
                      <p className="text-sm" style={{ color: C.t2 }}>Messages appear as your agent communicates</p>
                    </div>
                  ) : (
                    <div style={{ ...cardSolid, overflow: 'hidden' }}>
                      {messages.map((msg, i) => {
                        const isSent = msg.fromAgentId.includes(selectedSub!.companyId);
                        const typeColor = msg.type.includes('BID') ? { bg: 'rgba(159,122,234,0.1)', fg: '#c4a8ff' } :
                          msg.type.includes('ITB') ? { bg: 'rgba(0,212,255,0.08)', fg: '#66e3ff' } :
                          msg.type.includes('NEGOTIATION') || msg.type.includes('COUNTER') ? { bg: 'rgba(255,178,36,0.08)', fg: '#ffc966' } :
                          msg.type.includes('AWARD') ? { bg: 'rgba(0,232,157,0.08)', fg: '#4dffc3' } :
                          msg.type.includes('REJECTION') ? { bg: 'rgba(255,77,106,0.08)', fg: '#ff8099' } :
                          { bg: 'rgba(79,125,249,0.08)', fg: '#7da2ff' };
                        return (
                          <div key={msg.id} className="px-5 py-3.5 flex items-center gap-4 transition-colors hover:bg-white/[0.015]"
                            style={{ borderBottom: i < messages.length - 1 ? '1px solid rgba(56,68,120,0.12)' : 'none' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: isSent ? 'rgba(0, 232, 157, 0.08)' : 'rgba(79, 125, 249, 0.08)' }}>
                              <Icon d={isSent ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"}
                                size={14} color={isSent ? '#00e89d' : '#4f7df9'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold" style={{ color: isSent ? '#4dffc3' : '#7da2ff' }}>
                                  {isSent ? 'SENT' : 'RECV'}
                                </span>
                                <span className="text-[11px] font-bold mono px-2 py-0.5 rounded" style={{ background: typeColor.bg, color: typeColor.fg }}>{msg.type}</span>
                              </div>
                              <div className="text-[10px] mt-0.5 mono" style={{ color: C.t3 }}>
                                {isSent ? `To: ${msg.toAgentId}` : `From: ${msg.fromAgentId}`}
                              </div>
                            </div>
                            <span className="text-[10px] mono flex-shrink-0" style={{ color: C.t3 }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
