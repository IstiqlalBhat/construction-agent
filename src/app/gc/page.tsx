'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { C, card, cardSolid, header, meshBg, btn, input as inputS, inputLabel, modalOverlay, modalContent, badgeStyles, tag, th, td, statCard, statLabel, statValue } from '@/lib/styles';

interface Project { id: string; name: string; location: string; estimatedValue: number; status: string; tradePackages: TradePackage[]; createdAt: string; description: string; }
interface TradePackage { id: string; projectId: string; csiDivision: number; tradeName: string; scopeItems: string[]; estimatedBudget: number; status: string; drawings: string[]; specs: string[]; }
interface Bid { id: string; tradePackageId: string; projectId: string; subCompanyId: string; subCompanyName: string; baseBid: number; lineItems: { csiCode: string; description: string; laborCost: number; materialCost: number; equipmentCost: number; subtotal: number }[]; inclusions: string[]; exclusions: string[]; qualifications: string[]; schedule: { mobilizationDate: string; completionDate: string; leadTimeItems: { item: string; weeks: number }[] }; compliance: { bondProvided: boolean; insuranceMeetsRequirements: boolean }; status: string; submittedAt: string; levelingScore?: number; levelingNotes?: string; }
interface NegotiationSession { id: string; bidId: string; tradePackageId: string; projectId: string; gcCompanyId: string; subCompanyId: string; status: string; rounds: { roundNumber: number; fromAgent: string; proposedPrice: number; message: string; veProposal?: string; timestamp: string }[]; finalPrice?: number; }
interface A2AMessage { id: string; type: string; fromAgentId: string; toAgentId: string; projectId: string; payload: Record<string, unknown>; timestamp: string; }

type View = 'projects' | 'project-detail' | 'trade-bids' | 'negotiation' | 'messages';
const fmt = (n: number) => '$' + n.toLocaleString();

const Badge = ({ status }: { status: string }) => {
  const m: Record<string, { c: string; l: string }> = {
    draft: { c: 'secondary', l: 'Draft' }, scope_detection: { c: 'blue', l: 'Scoping' }, bidding: { c: 'cyan', l: 'Bidding' },
    leveling: { c: 'purple', l: 'Leveling' }, negotiation: { c: 'amber', l: 'Negotiation' }, awarded: { c: 'green', l: 'Awarded' },
    contracted: { c: 'green', l: 'Contracted' }, detected: { c: 'blue', l: 'Detected' }, approved: { c: 'blue', l: 'Approved' },
    itb_sent: { c: 'cyan', l: 'ITB Sent' }, bids_received: { c: 'purple', l: 'Bids In' }, leveled: { c: 'amber', l: 'Leveled' },
    negotiating: { c: 'amber', l: 'Negotiating' }, submitted: { c: 'blue', l: 'Submitted' }, under_review: { c: 'purple', l: 'Reviewing' },
    shortlisted: { c: 'cyan', l: 'Shortlisted' }, rejected: { c: 'red', l: 'Rejected' }, open: { c: 'amber', l: 'Open' },
    agreed: { c: 'green', l: 'Agreed' }, escalated: { c: 'red', l: 'Escalated' }, failed: { c: 'red', l: 'Failed' },
  };
  const s = m[status] || { c: 'blue', l: status };
  const b = badgeStyles[s.c] || badgeStyles.blue;
  return <span style={b.container}><span style={b.dot} />{s.l}</span>;
};

const Ico = ({ d, size = 16, color = 'currentColor', sw = 1.8 }: { d: string; size?: number; color?: string; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const ScoreRing = ({ score }: { score: number }) => {
  const r = 18, c = 2 * Math.PI * r;
  const color = score > 70 ? C.green : score > 50 ? C.amber : C.red;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44 }}>
      <svg width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(56,68,120,0.2)" strokeWidth={3} />
        <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', fontSize: 12, fontWeight: 700, color, fontFamily: 'monospace' }}>{score}</span>
    </div>
  );
};

export default function GCDashboard() {
  const [view, setView] = useState<View>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selProject, setSelProject] = useState<Project | null>(null);
  const [selTP, setSelTP] = useState<TradePackage | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [messages, setMessages] = useState<A2AMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selBid, setSelBid] = useState<Bid | null>(null);
  const [neg, setNeg] = useState<NegotiationSession | null>(null);

  const loadProjects = useCallback(async () => { setProjects(await (await fetch('/api/projects?gcId=gc-turner')).json()); }, []);
  useEffect(() => { loadProjects(); }, [loadProjects]);

  const createProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setLoading(true);
    const f = new FormData(e.currentTarget);
    const p = await (await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: f.get('name'), location: f.get('location'), estimatedValue: Number(f.get('value')), description: f.get('description'), gcCompanyId: 'gc-turner' }) })).json();
    setProjects(prev => [...prev, p]); setShowModal(false); setSelProject(p); setView('project-detail'); setLoading(false);
  };

  const openProject = async (p: Project) => {
    setSelProject(p); setView('project-detail');
    setBids(await (await fetch(`/api/bids?projectId=${p.id}`)).json());
  };
  const viewTradeBids = async (tp: TradePackage) => { setSelTP(tp); setSelBid(null); setBids(await (await fetch(`/api/bids?tradePackageId=${tp.id}`)).json()); setView('trade-bids'); };
  const levelBids = async (tp: TradePackage) => { setLoading(true); setBids(await (await fetch('/api/bids/level', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tradePackageId: tp.id }) })).json()); setLoading(false); };
  const openNeg = async (bid: Bid) => { setLoading(true); const s = await (await fetch('/api/negotiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'open', bidId: bid.id, targetPrice: Math.round(bid.baseBid * 0.93) }) })).json(); setNeg(s); setSelBid(bid); setView('negotiation'); setLoading(false); };
  const counter = async (price: number) => { if (!neg) return; setLoading(true); setNeg(await (await fetch('/api/negotiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'counter', sessionId: neg.id, counterPrice: price }) })).json()); setLoading(false); };
  const accept = async () => { if (!neg) return; setLoading(true); setNeg(await (await fetch('/api/negotiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept', sessionId: neg.id }) })).json()); await loadProjects(); setLoading(false); };
  const award = async (bidId: string) => { setLoading(true); await fetch('/api/negotiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'award', bidId }) }); if (selProject) await openProject(selProject); setLoading(false); };
  const loadMsgs = async (pid: string) => { setMessages(await (await fetch(`/api/itb?projectId=${pid}`)).json()); setView('messages'); };

  const nav = (v: View) => { setView(v); if (v === 'projects') { setSelProject(null); setSelTP(null); setNeg(null); } };

  return (
    <div style={{ minHeight: '100vh', background: C.bg0 }}>
      <div style={meshBg} />

      {/* Header */}
      <header style={header}>
        <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 10, color: 'white', background: 'linear-gradient(135deg,#4f7df9,#00d4ff)' }}>A2A</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>ConstructA2A</span>
            </Link>
            <div style={{ width: 1, height: 20, background: C.br }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(79,125,249,0.12)' }}>
                <Ico d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" size={13} color={C.blue} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>BuilderAgent</span>
              <Badge status="bidding" />
            </div>
          </div>
          <button onClick={() => setShowModal(true)} style={{ ...btn.primary, ...btn.sm }}>+ New Project</button>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px', position: 'relative', zIndex: 1 }}>
        {/* Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 20 }}>
          <button onClick={() => nav('projects')} style={{ background: 'none', border: 'none', color: view === 'projects' ? C.t1 : C.t2, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>Projects</button>
          {selProject && <><span style={{ color: C.t3 }}>/</span><button onClick={() => { setView('project-detail'); setSelTP(null); setNeg(null); }} style={{ background: 'none', border: 'none', color: view === 'project-detail' ? C.t1 : C.t2, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>{selProject.name}</button></>}
          {selTP && view === 'trade-bids' && <><span style={{ color: C.t3 }}>/</span><span style={{ color: C.t1 }}>{selTP.tradeName}</span></>}
          {view === 'negotiation' && <><span style={{ color: C.t3 }}>/</span><span style={{ color: C.t1 }}>Negotiation</span></>}
          {view === 'messages' && <><span style={{ color: C.t3 }}>/</span><span style={{ color: C.t1 }}>A2A Log</span></>}
        </div>

        {/* ─── PROJECTS ─── */}
        {view === 'projects' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: C.t1, marginBottom: 4 }}>Projects</h2>
            <p style={{ fontSize: 14, color: C.t2, marginBottom: 24 }}>Manage procurement across all active projects</p>

            {projects.length === 0 ? (
              <div style={{ ...cardSolid, textAlign: 'center', padding: '80px 24px' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', background: 'rgba(79,125,249,0.08)', border: '1px solid rgba(79,125,249,0.15)' }}>
                  <Ico d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" size={28} color={C.blue} sw={1.5} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 8 }}>No Projects Yet</h3>
                <p style={{ fontSize: 14, color: C.t2, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>Create your first project to kick off the A2A procurement pipeline</p>
                <button onClick={() => setShowModal(true)} style={btn.primary}>+ Create Project</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {projects.map(p => (
                  <div key={p.id} onClick={() => openProject(p)} style={{ ...card, padding: 24, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(79,125,249,0.1)', border: '1px solid rgba(79,125,249,0.15)', flexShrink: 0 }}>
                          <Ico d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" size={20} color={C.blue} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: C.t1 }}>{p.name}</span>
                            <Badge status={p.status} />
                          </div>
                          <span style={{ fontSize: 12, color: C.t2 }}>{p.location}</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                            {p.tradePackages.map(tp => <span key={tp.id} style={tag}>Div {tp.csiDivision}</span>)}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: C.blue }}>{fmt(p.estimatedValue)}</div>
                        <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{p.tradePackages.length} packages</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── PROJECT DETAIL ─── */}
        {view === 'project-detail' && selProject && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: C.t1 }}>{selProject.name}</h2>
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <span style={{ fontSize: 14, color: C.t2 }}>{selProject.location}</span>
                  <span style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 600, color: C.blue }}>{fmt(selProject.estimatedValue)}</span>
                </div>
              </div>
              <button onClick={() => loadMsgs(selProject.id)} style={{ ...btn.ghost, ...btn.sm }}>A2A Log</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { l: 'Trade Packages', v: selProject.tradePackages.length, c: C.blue },
                { l: 'Bids Received', v: bids.length, c: C.purple },
                { l: 'Total Bid Value', v: fmt(bids.reduce((s, b) => s + b.baseBid, 0)), c: C.green },
                { l: 'Awarded', v: selProject.tradePackages.filter(tp => tp.status === 'awarded').length, c: C.amber },
              ].map((s, i) => (
                <div key={i} style={statCard}>
                  <div style={statLabel}>{s.l}</div>
                  <div style={{ ...statValue, color: s.c, fontSize: typeof s.v === 'string' ? 20 : 28 }}>{s.v}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.t3, marginBottom: 12 }}>Trade Packages</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {selProject.tradePackages.map(tp => {
                const tpBids = bids.filter(b => b.tradePackageId === tp.id);
                const aw = tp.status === 'awarded';
                return (
                  <div key={tp.id} style={cardSolid}>
                    <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'monospace', fontSize: 14, background: aw ? 'rgba(0,232,157,0.1)' : 'rgba(79,125,249,0.08)', border: `1px solid ${aw ? 'rgba(0,232,157,0.2)' : 'rgba(79,125,249,0.12)'}`, color: aw ? C.green : C.blueL }}>
                          {tp.csiDivision}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: C.t1 }}>{tp.tradeName}</span>
                            <Badge status={tp.status} />
                          </div>
                          <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 12 }}>
                            <span style={{ fontFamily: 'monospace', color: C.t2 }}>Budget: {fmt(tp.estimatedBudget)}</span>
                            <span style={{ color: C.t3 }}>{tpBids.length} bids</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {tpBids.length > 0 && <button onClick={() => viewTradeBids(tp)} style={{ ...btn.primary, ...btn.sm }}>View Bids</button>}
                        {tpBids.length > 0 && !aw && tp.status !== 'leveled' && tp.status !== 'negotiating' && (
                          <button onClick={() => { levelBids(tp); viewTradeBids(tp); }} style={{ ...btn.ghost, ...btn.sm }}>Level</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TRADE BIDS ─── */}
        {view === 'trade-bids' && selTP && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: C.t1 }}>{selTP.tradeName}</h2>
                <div style={{ fontSize: 13, color: C.t2, marginTop: 4 }}>
                  <span style={{ fontFamily: 'monospace' }}>Budget: {fmt(selTP.estimatedBudget)}</span>
                  <span style={{ margin: '0 8px', color: C.t3 }}>|</span>
                  {bids.filter(b => b.tradePackageId === selTP.id).length} bids
                </div>
              </div>
              {selTP.status !== 'leveled' && selTP.status !== 'awarded' && (
                <button onClick={() => levelBids(selTP)} disabled={loading} style={{ ...btn.primary, ...btn.sm, opacity: loading ? 0.5 : 1 }}>Auto-Level Bids</button>
              )}
            </div>

            <div style={{ ...cardSolid, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: 'left' }}>Subcontractor</th>
                      <th style={{ ...th, textAlign: 'right' }}>Base Bid</th>
                      <th style={{ ...th, textAlign: 'center' }}>Score</th>
                      <th style={{ ...th, textAlign: 'center' }}>Bond</th>
                      <th style={{ ...th, textAlign: 'center' }}>Insured</th>
                      <th style={{ ...th, textAlign: 'left' }}>Status</th>
                      <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bids.filter(b => b.tradePackageId === selTP.id).sort((a, b) => (b.levelingScore ?? 0) - (a.levelingScore ?? 0)).map((bid, idx) => (
                      <tr key={bid.id} style={{ transition: 'background 0.15s' }}>
                        <td style={{ ...td, textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: idx === 0 && bid.levelingScore ? 'rgba(0,232,157,0.1)' : 'rgba(79,125,249,0.08)', color: idx === 0 && bid.levelingScore ? C.green : C.blueL }}>
                              #{idx + 1}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: C.t1 }}>{bid.subCompanyName}</div>
                              {bid.levelingNotes && <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{bid.levelingNotes}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: C.t1 }}>{fmt(bid.baseBid)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{bid.levelingScore != null ? <ScoreRing score={bid.levelingScore} /> : <span style={{ color: C.t3 }}>--</span>}</td>
                        <td style={{ ...td, textAlign: 'center' }}><Ico d={bid.compliance.bondProvided ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"} size={18} color={bid.compliance.bondProvided ? C.green : C.red} /></td>
                        <td style={{ ...td, textAlign: 'center' }}><Ico d={bid.compliance.insuranceMeetsRequirements ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"} size={18} color={bid.compliance.insuranceMeetsRequirements ? C.green : C.red} /></td>
                        <td style={td}><Badge status={bid.status} /></td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {bid.status !== 'awarded' && bid.status !== 'rejected' && bid.status !== 'negotiating' && <>
                              <button onClick={() => openNeg(bid)} disabled={loading} style={{ ...btn.warning, ...btn.sm, opacity: loading ? 0.5 : 1 }}>Negotiate</button>
                              <button onClick={() => award(bid.id)} disabled={loading} style={{ ...btn.success, ...btn.sm, opacity: loading ? 0.5 : 1 }}>Award</button>
                            </>}
                            <button onClick={() => setSelBid(selBid?.id === bid.id ? null : bid)} style={{ ...btn.ghost, ...btn.sm }}>{selBid?.id === bid.id ? 'Hide' : 'Detail'}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selBid && (
              <div style={{ ...cardSolid, padding: 24, animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontWeight: 700, color: C.t1 }}>{selBid.subCompanyName} — Bid Detail</span>
                  <button onClick={() => setSelBid(null)} style={{ ...btn.ghost, ...btn.sm }}>Close</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.t3, marginBottom: 12 }}>Line Items</div>
                    {selBid.lineItems.map((li, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 12, borderBottom: '1px solid rgba(56,68,120,0.12)' }}>
                        <span style={{ color: C.t1 }}>{li.description}</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: C.t2 }}>{fmt(li.subtotal)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700 }}>
                      <span style={{ color: C.t1 }}>Total</span>
                      <span style={{ fontFamily: 'monospace', color: C.blue }}>{fmt(selBid.baseBid)}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.t3, marginBottom: 12 }}>Inclusions</div>
                    {selBid.inclusions.map((inc, i) => <div key={i} style={{ fontSize: 12, color: C.t1, padding: '3px 0' }}><span style={{ color: C.green, marginRight: 6 }}>+</span>{inc}</div>)}
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.t3, marginBottom: 12, marginTop: 20 }}>Exclusions</div>
                    {selBid.exclusions.map((exc, i) => <div key={i} style={{ fontSize: 12, color: C.t1, padding: '3px 0' }}><span style={{ color: C.red, marginRight: 6 }}>-</span>{exc}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.t3, marginBottom: 12 }}>Schedule</div>
                    <div style={{ fontSize: 12 }}><span style={{ color: C.t2 }}>Mobilization: </span><span style={{ fontFamily: 'monospace', color: C.t1 }}>{selBid.schedule.mobilizationDate}</span></div>
                    <div style={{ fontSize: 12, marginTop: 4 }}><span style={{ color: C.t2 }}>Completion: </span><span style={{ fontFamily: 'monospace', color: C.t1 }}>{selBid.schedule.completionDate}</span></div>
                    {selBid.schedule.leadTimeItems.length > 0 && <>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.t3, marginBottom: 8, marginTop: 20 }}>Lead Times</div>
                      {selBid.schedule.leadTimeItems.map((lt, i) => <div key={i} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ color: C.t1 }}>{lt.item}</span><span style={{ fontFamily: 'monospace', fontWeight: 600, color: C.amber }}>{lt.weeks}w</span></div>)}
                    </>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── NEGOTIATION ─── */}
        {view === 'negotiation' && neg && (
          <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: 720, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: C.t1 }}>Negotiation</h2>
                <span style={{ fontSize: 13, color: C.t2 }}>{selBid?.subCompanyName} — Original: {selBid ? fmt(selBid.baseBid) : '—'}</span>
              </div>
              <Badge status={neg.status} />
            </div>

            <div style={{ ...cardSolid, padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {neg.rounds.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: r.fromAgent === 'gc' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ maxWidth: 520, padding: '16px 20px', borderRadius: 16, background: r.fromAgent === 'gc' ? 'rgba(79,125,249,0.08)' : 'rgba(0,232,157,0.06)', border: `1px solid ${r.fromAgent === 'gc' ? 'rgba(79,125,249,0.15)' : 'rgba(0,232,157,0.12)'}`, borderBottomLeftRadius: r.fromAgent === 'gc' ? 4 : 16, borderBottomRightRadius: r.fromAgent === 'sub' ? 4 : 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: r.fromAgent === 'gc' ? C.blueL : C.greenL }}>{r.fromAgent === 'gc' ? 'BuilderAgent' : 'TradeAgent'}</span>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.t3 }}>R{r.roundNumber}</span>
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: C.t1, margin: '0 0 12px' }}>{r.message}</p>
                      <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: r.fromAgent === 'gc' ? C.blueL : C.greenL }}>{fmt(r.proposedPrice)}</div>
                      {r.veProposal && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, fontSize: 12, background: 'rgba(255,178,36,0.06)', border: '1px solid rgba(255,178,36,0.1)', color: C.amberL }}>VE: {r.veProposal}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {neg.status === 'open' && (
              <div style={{ ...cardSolid, padding: 16, display: 'flex', gap: 10 }}>
                <button onClick={accept} disabled={loading} style={{ ...btn.success, ...btn.sm, opacity: loading ? 0.5 : 1 }}>Accept Offer</button>
                <button onClick={() => { const s = [...neg.rounds].reverse().find(r => r.fromAgent === 'sub'); const g = [...neg.rounds].reverse().find(r => r.fromAgent === 'gc'); if (s && g) counter(Math.round((s.proposedPrice + g.proposedPrice) / 2)); }} disabled={loading} style={{ ...btn.warning, ...btn.sm, opacity: loading ? 0.5 : 1 }}>Split Difference</button>
                <button onClick={() => { const g = [...neg.rounds].reverse().find(r => r.fromAgent === 'gc'); if (g) counter(Math.round(g.proposedPrice * 1.02)); }} disabled={loading} style={{ ...btn.ghost, ...btn.sm }}>Counter +2%</button>
              </div>
            )}
            {neg.status === 'agreed' && (
              <div style={{ ...cardSolid, padding: 40, textAlign: 'center', borderColor: 'rgba(0,232,157,0.25)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: 'rgba(0,232,157,0.1)' }}>
                  <Ico d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={28} color={C.green} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.greenL }}>Agreement Reached</div>
                <div style={{ fontSize: 14, color: C.t2, marginTop: 4 }}>Final: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.green }}>{neg.finalPrice ? fmt(neg.finalPrice) : '—'}</span></div>
              </div>
            )}
            {neg.status === 'escalated' && (
              <div style={{ ...cardSolid, padding: 40, textAlign: 'center', borderColor: 'rgba(255,77,106,0.25)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: 'rgba(255,77,106,0.1)' }}>
                  <Ico d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size={28} color={C.red} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.redL }}>Escalated to Human</div>
                <div style={{ fontSize: 14, color: C.t2, marginTop: 4, marginBottom: 16 }}>Agent guardrails exceeded — manual review required</div>
                <button onClick={accept} style={btn.success}>Override & Accept</button>
              </div>
            )}
          </div>
        )}

        {/* ─── MESSAGES ─── */}
        {view === 'messages' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: 900 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: C.t1, marginBottom: 24 }}>A2A Protocol Log</h2>
            <div style={{ ...cardSolid, overflow: 'hidden' }}>
              {messages.length === 0 ? <div style={{ padding: 48, textAlign: 'center', fontSize: 13, color: C.t3 }}>No messages recorded</div> : messages.map((msg, i) => {
                const tc = msg.type.includes('BID') ? { bg: 'rgba(159,122,234,0.1)', fg: C.purpleL } : msg.type.includes('NEGOTIATION') || msg.type.includes('COUNTER') ? { bg: 'rgba(255,178,36,0.08)', fg: C.amberL } : msg.type.includes('AWARD') || msg.type.includes('INTENT') ? { bg: 'rgba(0,232,157,0.08)', fg: C.greenL } : msg.type.includes('REJECTION') ? { bg: 'rgba(255,77,106,0.08)', fg: C.redL } : { bg: 'rgba(79,125,249,0.08)', fg: C.blueL };
                return (
                  <div key={msg.id} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: i < messages.length - 1 ? '1px solid rgba(56,68,120,0.12)' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tc.bg, flexShrink: 0 }}>
                      <Ico d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" size={14} color={tc.fg} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 4, background: tc.bg, color: tc.fg }}>{msg.type}</span>
                      <div style={{ fontSize: 10, fontFamily: 'monospace', color: C.t3, marginTop: 4 }}>{msg.fromAgentId} → {msg.toAgentId}</div>
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.t3, flexShrink: 0 }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL ─── */}
      {showModal && (
        <div style={modalOverlay} onClick={() => setShowModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(79,125,249,0.1)', border: '1px solid rgba(79,125,249,0.15)' }}>
                  <Ico d="M12 4v16m8-8H4" size={18} color={C.blue} sw={2.5} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: C.t1, margin: 0 }}>New Project</h3>
                  <p style={{ fontSize: 12, color: C.t3, margin: 0 }}>BuilderAgent will auto-run the full procurement pipeline</p>
                </div>
              </div>
            </div>
            <form onSubmit={createProject} style={{ padding: 24 }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div><label style={inputLabel}>Project Name</label><input name="name" required placeholder="e.g., Downtown Medical Center" style={inputS} /></div>
                <div><label style={inputLabel}>Location</label><input name="location" required placeholder="e.g., Atlanta, GA" style={inputS} /></div>
                <div><label style={inputLabel}>Estimated Value ($)</label><input name="value" type="number" required placeholder="e.g., 25000000" style={inputS} /></div>
                <div><label style={inputLabel}>Description</label><textarea name="description" rows={2} placeholder="Brief project description..." style={{ ...inputS, resize: 'vertical' as const }} /></div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ ...btn.ghost, flex: 1 }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ ...btn.primary, flex: 1, opacity: loading ? 0.5 : 1 }}>{loading ? 'Processing...' : 'Create & Launch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
