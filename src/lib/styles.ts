import { CSSProperties } from 'react';

// ─── Colors ───
export const C = {
  bg0: '#06080f', bg1: '#0c1021', bg2: 'rgba(15,20,40,0.7)', bg3: '#0f1428',
  br: 'rgba(56,68,120,0.35)', brActive: 'rgba(99,130,255,0.4)',
  t1: '#e8ecf4', t2: '#6b7a99', t3: '#3e4a66',
  blue: '#4f7df9', blueL: '#7da2ff', cyan: '#00d4ff', cyanL: '#66e3ff',
  green: '#00e89d', greenL: '#4dffc3', amber: '#ffb224', amberL: '#ffc966',
  red: '#ff4d6a', redL: '#ff8099', purple: '#9f7aea', purpleL: '#c4a8ff',
};

// ─── Reusable style objects ───
export const card: CSSProperties = {
  background: C.bg2, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${C.br}`, borderRadius: 16,
};
export const cardSolid: CSSProperties = {
  background: C.bg3, border: `1px solid ${C.br}`, borderRadius: 16,
};

export const header: CSSProperties = {
  position: 'sticky', top: 0, zIndex: 50, height: 57, display: 'flex', alignItems: 'center',
  borderBottom: `1px solid ${C.br}`, background: 'rgba(6,8,15,0.9)',
  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
};

export const meshBg: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
  background: `
    radial-gradient(ellipse at 20% 50%, rgba(79,125,249,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(0,212,255,0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 60% 80%, rgba(159,122,234,0.04) 0%, transparent 50%)`,
};

// ─── Buttons ───
const btnBase: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', border: 'none', outline: 'none', transition: 'all 0.2s ease',
  fontFamily: 'inherit', letterSpacing: '0.01em',
};
export const btn = {
  primary: { ...btnBase, background: 'linear-gradient(135deg, #4f7df9, #00d4ff)', color: 'white', boxShadow: '0 2px 12px rgba(79,125,249,0.3)' } as CSSProperties,
  success: { ...btnBase, background: 'linear-gradient(135deg, #00e89d, #00d4ff)', color: '#06080f', boxShadow: '0 2px 12px rgba(0,232,157,0.25)' } as CSSProperties,
  warning: { ...btnBase, background: 'linear-gradient(135deg, #ffb224, #ff6b6b)', color: '#06080f', boxShadow: '0 2px 12px rgba(255,178,36,0.25)' } as CSSProperties,
  ghost: { ...btnBase, background: 'transparent', color: C.t2, border: `1px solid ${C.br}` } as CSSProperties,
  sm: { padding: '5px 12px', fontSize: 11, borderRadius: 8 } as CSSProperties,
  lg: { padding: '12px 24px', fontSize: 15, borderRadius: 12 } as CSSProperties,
};

// ─── Inputs ───
export const input: CSSProperties = {
  width: '100%', padding: '11px 16px', background: 'rgba(12,16,33,0.8)',
  border: `1px solid ${C.br}`, borderRadius: 10, color: C.t1, fontSize: 14,
  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
};
export const inputLabel: CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: C.t2,
  marginBottom: 6, letterSpacing: '0.03em', textTransform: 'uppercase' as const,
};

// ─── Modal ───
export const modalOverlay: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: 24, background: 'rgba(3,4,8,0.85)',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
};
export const modalContent: CSSProperties = {
  width: '100%', maxWidth: 480, background: C.bg3, border: `1px solid ${C.br}`,
  borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 60px rgba(79,125,249,0.08)',
  animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)',
};

// ─── Badges ───
const badgeBase: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
  borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
  textTransform: 'uppercase' as const,
};
const dot = (color: string): CSSProperties => ({
  width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0,
});

export const badgeStyles: Record<string, { container: CSSProperties; dot: CSSProperties }> = {
  blue:      { container: { ...badgeBase, background: 'rgba(79,125,249,0.12)', color: '#7da2ff' }, dot: dot('#4f7df9') },
  green:     { container: { ...badgeBase, background: 'rgba(0,232,157,0.1)', color: '#4dffc3' }, dot: dot('#00e89d') },
  amber:     { container: { ...badgeBase, background: 'rgba(255,178,36,0.1)', color: '#ffc966' }, dot: dot('#ffb224') },
  red:       { container: { ...badgeBase, background: 'rgba(255,77,106,0.1)', color: '#ff8099' }, dot: dot('#ff4d6a') },
  purple:    { container: { ...badgeBase, background: 'rgba(159,122,234,0.12)', color: '#c4a8ff' }, dot: dot('#9f7aea') },
  cyan:      { container: { ...badgeBase, background: 'rgba(0,212,255,0.1)', color: '#66e3ff' }, dot: dot('#00d4ff') },
  secondary: { container: { ...badgeBase, background: 'rgba(107,122,153,0.12)', color: '#8b9cc0' }, dot: dot('#6b7a99') },
};

// ─── Tag ───
export const tag: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 6,
  fontSize: 11, fontWeight: 500, background: 'rgba(56,68,120,0.2)', color: C.t2,
  border: '1px solid rgba(56,68,120,0.15)',
};

// ─── Table ───
export const th: CSSProperties = {
  padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase' as const, color: C.t3, background: 'rgba(12,16,33,0.5)',
  borderBottom: `1px solid ${C.br}`, whiteSpace: 'nowrap',
};
export const td: CSSProperties = {
  padding: '14px 16px', fontSize: 13, borderBottom: '1px solid rgba(56,68,120,0.15)',
  verticalAlign: 'middle',
};

// ─── Stat Card ───
export const statCard: CSSProperties = {
  padding: 20, borderRadius: 14, background: C.bg2, border: `1px solid ${C.br}`,
  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
};
export const statLabel: CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: C.t2,
};
export const statValue: CSSProperties = {
  fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 8,
};
