'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { C, card, cardSolid, header, meshBg, btn, tag as tagS, statCard, statLabel, statValue } from '@/lib/styles';

const STEPS = [
  { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Scope Detection', desc: 'AI parses plans & specs' },
  { icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', label: 'Sub Discovery', desc: 'Match qualified subs' },
  { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'ITB Broadcast', desc: 'A2A protocol messaging' },
  { icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', label: 'Bid Collection', desc: 'Structured bid responses' },
  { icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', label: 'Negotiation', desc: 'Autonomous multi-round' },
  { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Award', desc: 'Contract & LOI' },
];

const ACTIVITY = [
  { agent: 'BuilderAgent', action: 'Detected 7 trade packages', type: 'scope', time: '2s ago' },
  { agent: 'TradeAgent', action: 'Bid submitted: $2.4M', type: 'bid', time: '5s ago' },
  { agent: 'BuilderAgent', action: 'Leveled 4 electrical bids', type: 'level', time: '8s ago' },
  { agent: 'TradeAgent', action: 'Counter: $2.35M + VE option', type: 'negotiate', time: '12s ago' },
  { agent: 'BuilderAgent', action: 'Award issued to Apex Electric', type: 'award', time: '15s ago' },
];

const gradientText = {
  background: 'linear-gradient(135deg, #4f7df9, #00d4ff)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
} as const;

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveStep(s => (s + 1) % STEPS.length), 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen relative" style={{ background: C.bg0 }}>
      <div style={meshBg} />

      {/* Header */}
      <header className="relative z-10" style={header}>
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] text-white"
                style={{ background: 'linear-gradient(135deg, #4f7df9, #00d4ff)' }}>A2A</div>
            </div>
            <span className="text-[15px] font-bold tracking-tight" style={{ color: C.t1 }}>
              Construct<span style={gradientText}>A2A</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/gc" style={{ ...btn.primary, ...btn.sm, textDecoration: 'none' }}>GC Dashboard</Link>
            <Link href="/sub" style={{ ...btn.ghost, ...btn.sm, textDecoration: 'none' }}>Sub Dashboard</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
          <div style={{ animation: 'slideUp 0.6s ease-out both' }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8 border"
              style={{ background: 'rgba(79, 125, 249, 0.06)', borderColor: 'rgba(79, 125, 249, 0.15)', color: '#7da2ff' }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#4f7df9', animation: 'pulse-ring 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#4f7df9' }}></span>
              </span>
              Agent Network Active — 7 Agents Online
            </div>

            <h1 className="text-6xl font-black tracking-tight leading-[1.1] mb-6" style={{ color: C.t1 }}>
              Construction Procurement
              <br />
              <span style={gradientText}>Powered by Agents</span>
            </h1>

            <p className="text-lg max-w-2xl mx-auto leading-relaxed mb-12" style={{ color: C.t2 }}>
              Autonomous AI agents for GCs and Subs communicate via A2A protocols —
              compressing weeks of procurement work into hours.
            </p>

            <div className="flex items-center justify-center gap-4 mb-20">
              <Link href="/gc" style={{ ...btn.primary, ...btn.lg, textDecoration: 'none' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                Launch GC Dashboard
              </Link>
              <Link href="/sub" style={{ ...btn.ghost, ...btn.lg, textDecoration: 'none' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Sub Dashboard
              </Link>
            </div>
          </div>

          {/* Pipeline Flow */}
          <div className="max-w-4xl mx-auto mb-20" style={{ animation: 'slideUp 0.6s ease-out both', animationDelay: '0.2s' }}>
            <div className="flex items-start justify-between relative">
              {/* Connecting line */}
              <div className="absolute top-6 left-[8%] right-[8%] h-px" style={{ background: C.br }}>
                <div className="h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(activeStep / (STEPS.length - 1)) * 100}%`,
                    background: 'linear-gradient(135deg, #4f7df9, #00d4ff)',
                    boxShadow: '0 0 8px rgba(79, 125, 249, 0.4)',
                  }} />
              </div>

              {STEPS.map((step, i) => (
                <div key={i} className="flex flex-col items-center relative z-10" style={{ width: '16%' }}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${i <= activeStep ? 'scale-110' : ''}`}
                    style={{
                      background: i <= activeStep ? 'linear-gradient(135deg, #4f7df9, #00d4ff)' : C.bg3,
                      border: `1px solid ${i <= activeStep ? 'transparent' : C.br}`,
                      boxShadow: i === activeStep ? '0 0 24px rgba(79, 125, 249, 0.4)' : 'none',
                    }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={i <= activeStep ? 'white' : '#6b7a99'} strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold mb-1 transition-colors"
                    style={{ color: i <= activeStep ? C.t1 : C.t3 }}>
                    {step.label}
                  </span>
                  <span className="text-[10px]" style={{ color: C.t3 }}>{step.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link href="/gc" className="group block" style={{ ...card, padding: 32, textDecoration: 'none', animation: 'slideUp 0.6s ease-out both', animationDelay: '0.3s' }}>
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(79, 125, 249, 0.1)', border: '1px solid rgba(79, 125, 249, 0.15)' }}>
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#4f7df9" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <svg className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="#4f7df9" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: C.t1 }}>General Contractor</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: C.t2 }}>
                Your BuilderAgent handles scope detection, sub discovery, ITB broadcasting, bid leveling, negotiation, and award — autonomously.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Scope Detection', 'Bid Leveling', 'Auto-Negotiate', 'Award'].map(cap => (
                  <span key={cap} style={tagS}>{cap}</span>
                ))}
              </div>
            </Link>

            <Link href="/sub" className="group block" style={{ ...card, padding: 32, textDecoration: 'none', animation: 'slideUp 0.6s ease-out both', animationDelay: '0.4s' }}>
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(0, 232, 157, 0.08)', border: '1px solid rgba(0, 232, 157, 0.15)' }}>
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#00e89d" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="#00e89d" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: C.t1 }}>Subcontractor</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: C.t2 }}>
                Your TradeAgent monitors opportunities, runs bid/no-bid analysis, composes structured bids, and negotiates within your guardrails.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Bid/No-Bid AI', 'Auto-Compose', 'Negotiate', 'Compliance'].map(cap => (
                  <span key={cap} style={tagS}>{cap}</span>
                ))}
              </div>
            </Link>
          </div>
        </section>

        {/* Live Activity + Stats */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Activity Feed */}
            <div className="md:col-span-2" style={{ ...cardSolid, padding: 24, animation: 'slideUp 0.6s ease-out both', animationDelay: '0.5s' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.t2 }}>Live A2A Activity</h3>
                <div className="flex items-center gap-2 text-xs" style={{ color: C.t3 }}>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#00e89d', animation: 'pulse-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#00e89d' }}></span>
                  </span>
                  Streaming
                </div>
              </div>
              <div className="space-y-1">
                {ACTIVITY.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/[0.02]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                      background: item.type === 'scope' ? 'rgba(79, 125, 249, 0.1)' :
                        item.type === 'bid' ? 'rgba(159, 122, 234, 0.1)' :
                        item.type === 'level' ? 'rgba(0, 212, 255, 0.1)' :
                        item.type === 'negotiate' ? 'rgba(255, 178, 36, 0.1)' :
                        'rgba(0, 232, 157, 0.1)',
                    }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke={
                        item.type === 'scope' ? '#4f7df9' :
                        item.type === 'bid' ? '#9f7aea' :
                        item.type === 'level' ? '#00d4ff' :
                        item.type === 'negotiate' ? '#ffb224' : '#00e89d'
                      }>
                        <path strokeLinecap="round" strokeLinejoin="round" d={
                          item.type === 'scope' ? 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' :
                          item.type === 'bid' ? 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' :
                          item.type === 'level' ? 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' :
                          item.type === 'negotiate' ? 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' :
                          'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                        } />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold" style={{
                        fontFamily: 'monospace',
                        color: item.agent === 'BuilderAgent' ? '#7da2ff' : '#4dffc3'
                      }}>{item.agent}</span>
                      <span className="text-xs mx-2" style={{ color: C.t3 }}>|</span>
                      <span className="text-xs" style={{ color: C.t2 }}>{item.action}</span>
                    </div>
                    <span className="text-[10px] flex-shrink-0" style={{ fontFamily: 'monospace', color: C.t3 }}>{item.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-5" style={{ animation: 'slideUp 0.6s ease-out both', animationDelay: '0.6s' }}>
              {[
                { label: 'Active Agents', value: '7', color: '#4f7df9', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
                { label: 'CSI Divisions', value: '10', color: '#9f7aea', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
                { label: 'Protocol', value: 'v1.0', color: '#00d4ff', icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' },
                { label: 'Avg Latency', value: '<2s', color: '#00e89d', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
              ].map((stat, i) => (
                <div key={i} style={statCard}>
                  <div className="flex items-center justify-between">
                    <span style={statLabel}>{stat.label}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}12` }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={stat.color} strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                      </svg>
                    </div>
                  </div>
                  <div style={{ ...statValue, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
