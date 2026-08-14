import React, { useState } from 'react';
import { toPersianDigits } from '../utils/helpers';

const PALETTE = ['#8b5cf6', '#10b981', '#f59e0b', '#2e86c1', '#ec4899', '#14b8a6', '#f97316', '#2563eb', '#84cc16', '#ef4444'];

interface Point {
  x: number;
  y: number;
}

function smoothPath(pts: Point[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function useTooltip() {
  const [tip, setTip] = useState<{ x: number; y: number; title: string; body: string; color: string } | null>(null);
  const el = tip ? (
    <div className="fixed z-50 pointer-events-none rounded-xl px-3 py-2 bg-gray-900/95 text-white shadow-2xl border border-white/10" style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, calc(-100% - 14px))' }}>
      <p className="text-[9px] font-black whitespace-nowrap" style={{ color: tip.color }}>{tip.title}</p>
      {tip.body && <p className="text-[9px] font-bold text-gray-200 whitespace-nowrap mt-0.5">{tip.body}</p>}
    </div>
  ) : null;
  return { tip, setTip, el };
}

export function AreaTrendChart({ data, height = 160, color = '#8b5cf6', prefix = '', suffix = '', showPoints = true }: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  prefix?: string;
  suffix?: string;
  showPoints?: boolean;
}) {
  const { el, setTip } = useTooltip();
  const W = 600;
  const H = height;
  const PAD = { top: 12, right: 8, bottom: 22, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...data.map(d => d.value));
  const pts: Point[] = data.map((d, i) => ({
    x: PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: PAD.top + innerH - (d.value / max) * innerH,
  }));
  const line = smoothPath(pts);
  const area = pts.length ? `${line} L ${pts[pts.length - 1].x},${PAD.top + innerH} L ${pts[0].x},${PAD.top + innerH} Z` : '';
  const gridLines = [0, 0.33, 0.66, 1].map(f => (
    <line key={f} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * f} y2={PAD.top + innerH * f} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 4" />
  ));
  return (
    <div className="relative overflow-x-auto pb-1">
      <div className="min-w-[520px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
          <defs>
            <linearGradient id={`ag-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {gridLines}
          {area && <path d={area} fill={`url(#ag-${color.replace('#', '')})`} />}
          <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: 1400, strokeDashoffset: 1400, animation: 'dashin 1s ease forwards' }} />
          {showPoints && pts.map((p, i) => (
            <g key={i} onClick={() => setTip({ x: p.x, y: p.y, title: data[i].label, body: `${prefix} ${toPersianDigits(data[i].value)}${suffix}`, color })}>
              <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
              <circle cx={p.x} cy={p.y} r={data[i].value === max ? 4 : 2.5} fill={color} stroke="#fff" strokeWidth="1.5"
                style={{ opacity: 0, animation: `popin .4s ease ${i * 0.02}s forwards` }} />
            </g>
          ))}
          {data.map((d, i) => {
            const x = pts[Math.min(i, pts.length - 1)]?.x || 0;
            const show = data.length <= 16 || i === 0 || i === data.length - 1 || (i >= Math.floor(data.length / 2) - 1 && i <= Math.floor(data.length / 2));
            return show ? <text key={i} x={x} y={H - 6} textAnchor="middle" fontSize="8" fontWeight="800" fill="#cbd5e1">{toPersianDigits(d.label)}</text> : null;
          })}
        </svg>
      </div>
      {el}
      <style>{`@keyframes dashin {to{stroke-dashoffset:0}} @keyframes popin {to{opacity:1}}`}</style>
    </div>
  );
}

export function StackedDailyBars({ data, colors = ['#10b981', '#2e86c1'], height = 150 }: {
  data: { label: string; podcast: number; video: number }[];
  colors?: [string, string];
  height?: number;
}) {
  const { el, setTip } = useTooltip();
  const W = 600;
  const H = height;
  const PAD = { top: 8, right: 8, bottom: 22, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...data.map(d => d.podcast + d.video));
  const bw = Math.min(30, (innerW / Math.max(1, data.length)) * 0.62);
  return (
    <div className="relative overflow-x-auto pb-1">
      <div className="min-w-[520px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
          {[0, 0.5, 1].map(f => (
            <line key={f} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * f} y2={PAD.top + innerH * f} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 4" />
          ))}
          {data.map((d, i) => {
            const cx = PAD.left + (i + 0.5) * (innerW / Math.max(1, data.length));
            const total = d.podcast + d.video;
            const bpix = (total > 0 ? (d.podcast / max) * innerH : 0);
            const vpix = (total > 0 ? (d.video / max) * innerH : 0);
            return (
              <g key={i} onClick={() => setTip({ x: cx, y: PAD.top + innerH - Math.min(innerH, bpix + vpix) - 6, title: d.label, body: `${toPersianDigits(d.podcast)} پخش صوتی • ${toPersianDigits(d.video)} ویدیو`, color: colors[0] })}>
                {total > 0 && <>
                  <rect x={cx - bw / 2} y={PAD.top + innerH - vpix} width={bw} height={vpix + 3} rx="4" fill={colors[1]} style={{ opacity: 0, animation: `fadebar .4s ease ${i * 0.03}s forwards` }} />
                  <rect x={cx - bw / 2} y={PAD.top + innerH - vpix - bpix} width={bw} height={bpix + 3} rx="4" fill={colors[0]} style={{ opacity: 0, animation: `fadebar .4s ease ${i * 0.03}s forwards` }} />
                </>}
                <text x={cx} y={H - 6} textAnchor="middle" fontSize="8" fontWeight="800" fill="#cbd5e1">{d.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {el}
      <style>{`@keyframes fadebar {from{opacity:0; transform:scaleY(.7); transform-origin:bottom}to{opacity:1}}`}</style>
    </div>
  );
}

export function DonutChart({ data, size = 150, thickness = 18, centerLabel = '', centerValue = '', title = '' }: {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  title?: string;
}) {
  const { el, setTip } = useTooltip();
  const R = (size - thickness) / 2;
  const C = 2 * Math.PI * R;
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = { x: size / 2, y: size / 2 };
  let acc = 0;
  const segs = data.map((d, i) => {
    const frac = total > 0 ? d.value / total : 0;
    const dash = frac * C;
    const off = -acc * C;
    acc += frac;
    return { ...d, color: d.color || PALETTE[i % PALETTE.length], dash, off };
  });
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full select-none" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx.x} cy={cx.y} r={R} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
        {total > 0 && segs.map((s, i) => (
          <g key={i} onClick={() => setTip({ x: cx.x, y: cx.y - 10, title: s.label, body: `${toPersianDigits(s.value)} (%${toPersianDigits(Math.round((s.value / total) * 100))} درصد)`, color: s.color })}>
            <circle cx={cx.x} cy={cx.y} r={R} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${Math.max(0.01, s.dash - 1.2)} ${C - Math.max(0.01, s.dash - 1.2)}`} strokeDashoffset={-s.off * C} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray .6s ease, stroke-dashoffset .6s ease', strokeOpacity: 0.95 }} />
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {title && <p className="text-[8px] font-black text-gray-400 mb-0.5">{title}</p>}
        <p className="text-lg font-black" style={{ color: PALETTE[0] }}>{centerValue || toPersianDigits(total)}</p>
        {centerLabel && <p className="text-[8px] font-black text-gray-400">{centerLabel}</p>}
      </div>
      {el}
    </div>
  );
}

export function WeeklyHeatmap({ data, height = 168 }: {
  data: { day: number; hour: number; count: number }[];
  height?: number;
}) {
  const { el, setTip } = useTooltip();
  const DAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  const HOURS = 24;
  const max = Math.max(1, ...data.map(d => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  const map: Record<string, number> = {};
  data.forEach(d => { map[`${d.day}-${d.hour}`] = d.count; });

  const STOP_COLORS = ['#7dd3fc', '#38bdf8', '#3b82f6', '#7c3aed', '#a21caf', '#e11d48'];
  function cellColor(c: number): string {
    if (c <= 0) return '#f1f5f9';
    const f = Math.min(1, c / max);
    if (f <= 0.2) return STOP_COLORS[0];
    if (f <= 0.4) return STOP_COLORS[1];
    if (f <= 0.6) return STOP_COLORS[2];
    if (f <= 0.8) return STOP_COLORS[3];
    if (f < 1) return STOP_COLORS[4];
    return STOP_COLORS[5];
  }

  const cell = 21;
  const gap = 3.5;
  const labelCol = 40;
  const topPad = 20;
  const W = labelCol + HOURS * (cell + gap) - gap + 10;
  const H = Math.max(height, 30 + DAYS.length * (cell + gap) + 34);
  const hLabels = Array.from({ length: 24 }, (_, i) => i).filter(i => i % 4 === 0);
  return (
    <div className="relative">
      <div className="overflow-x-auto pb-1 rounded-xl border border-gray-100 bg-white/60 p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-sky-400 to-rose-500"></span>
            <span className="text-[10px] font-black text-gray-700">الگوی پخش در طول هفته</span>
          </div>
          <span className="text-[9px] font-bold text-gray-400">{toPersianDigits(total)} پخش در این بازه</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" style={{ minWidth: Math.min(680, W) }}>
          <defs>
            <linearGradient id="hm-legend" x1="0" y1="0" x2="1" y2="0">
              {STOP_COLORS.map((c, i) => <stop key={i} offset={`${(i / (STOP_COLORS.length - 1)) * 100}%`} stopColor={c} />)}
            </linearGradient>
          </defs>
          {hLabels.map(h => (
            <text key={h} x={labelCol + h * (cell + gap) + cell / 2} y={topPad - 6} textAnchor="middle" fontSize="8" fontWeight="700" fill="#94a3b8">{toPersianDigits(h)}</text>
          ))}
          {Array.from({ length: 24 }).map((_, h) => {
            if (h % 4 !== 0) {
              const x = labelCol + h * (cell + gap) + cell / 2;
              return <text key={h + '-t'} x={x} y={topPad - 2} textAnchor="middle" fontSize="5" fontWeight="700" fill="#e2e8f0">.</text>;
            }
            return null;
          })}
          {DAYS.map((dn, di) => {
            const day = di + 1;
            return (
              <g key={day}>
                <text x={labelCol - 8} y={topPad + di * (cell + gap) + cell / 2 + 1} textAnchor="end" fontSize="9" fontWeight="800" fill="#64748b">{dn}</text>
                {Array.from({ length: HOURS }).map((_, h) => {
                  const c = map[`${day}-${h}`] || 0;
                  return (
                    <rect key={h} x={labelCol + h * (cell + gap)} y={topPad + di * (cell + gap)} width={cell} height={cell} rx={5.5}
                      fill={cellColor(c)} opacity={c > 0 ? 0.95 : 1}
                      onMouseEnter={(e: React.MouseEvent<SVGRectElement>) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setTip({ x: r.left + cell / 2, y: r.top + 6, title: `${dn} • ساعت ${toPersianDigits(h)}`, body: `${toPersianDigits(c)} پخش`, color: c > 0 ? cellColor(c) : '#94a3b8' });
                      }}
                      onMouseLeave={() => setTip(null)}
                      style={{ transition: 'fill .15s, opacity .15s', cursor: 'pointer' }} />
                );
              })}
              </g>
            );
          })}
          <g>
            <rect x={labelCol} y={H - 24} width={150} height={9} rx={4.5} fill="url(#hm-legend)" />
            <text x={labelCol} y={H - 30} fontSize="7.5" fontWeight="800" fill="#94a3b8">کم</text>
            <text x={labelCol + 150} y={H - 30} fontSize="7.5" fontWeight="800" fill="#94a3b8" textAnchor="end">زیاد</text>
          </g>
        </svg>
      </div>
      {el}
    </div>
  );
}

export function RadialGauge({ value, max = 100, label = '', sublabel = '', color = '#10b981', size = 190 }: {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  size?: number;
}) {
  const R = (size - 24) / 2;
  const C = Math.PI * R;
  const frac = Math.min(1, max > 0 ? value / max : 0);
  const cx = size / 2;
  const cy = size / 2 + 6;
  return (
    <div className="inline-block">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto select-none" style={{ maxWidth: size }}>
        <path d={`M ${cx} ,${cy - R} A ${R},${R} 0 0 1 ${cx} ,${cy + R}`} fill="none" stroke="#f1f5f9" strokeWidth="16" strokeLinecap="round" />
        <path d={`M ${cx} ,${cy - R} A ${R},${R} 0 0 1 ${cx} ,${cy + R}`} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${frac * C} ${C}`} style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }} />
        <g transform={`rotate(45 ${cx} ${cy})`}>
          <line x1={cx - R - 14} y1={cy} x2={cx - R - 8} y2={cy} stroke="#e2e8f0" strokeWidth="2" />
          <line x1={cx + R + 8} y1={cy} x2={cx + R + 14} y2={cy} stroke="#e2e8f0" strokeWidth="2" />
        </g>
        <circle cx={cx} cy={cy} r="30" fill="#fff" stroke={color} strokeWidth="2.5" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.12))' }} />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="16" fontWeight="900" fill="#1f2937">{toPersianDigits(Math.round(frac * 100))}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="7" fontWeight="800" fill="#94a3b8">درصد</text>
        <text x={cx} y={cy + 23} textAnchor="middle" fontSize="7" fontWeight="800" fill="#9ca3af">{label}</text>
      </svg>
      {sublabel && <p className="text-center text-[9px] font-bold text-gray-400 mt-1">{sublabel}</p>}
    </div>
  );
}

export function RankBars({ data, color = '#8b5cf6', barColor2 = '#a78bfa', valueSuffix = ' پخش' }: {
  data: { title: string; value: number; subtitle?: string; icon?: string; cover?: string }[];
  color?: string;
  barColor2?: string;
  valueSuffix?: string;
}) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="space-y-2.5">
      {data.length === 0 && <p className="text-[9px] text-gray-300 text-center py-4">هنوز آماری ثبت نشده است</p>}
      {data.map((d, i) => (
        <div key={i} className="group">
          <div className="flex items-center gap-2.5 mb-1">
            <span className={`shrink-0 w-5 h-5 rounded-md text-center text-[9px] font-black leading-5 ${i === 0 ? 'bg-amber-400 text-white shadow-md shadow-amber-200' : 'bg-gray-100 text-gray-400'}`}>
              {i === 0 ? <i className="fas fa-crown text-[9px]"></i> : toPersianDigits(i + 1)}
            </span>
            {d.cover && <img src={d.cover} className="w-7 h-7 rounded-md object-cover" />}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-gray-700 truncate">{d.title}</p>
              {d.subtitle && <p className="text-[8px] text-gray-400 truncate">{d.subtitle}</p>}
            </div>
            <span className="shrink-0 text-[10px] font-black text-gray-600">{toPersianDigits(d.value)}</span>
            <span className="shrink-0 text-[8px] font-black text-gray-300 w-10">{valueSuffix}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden" style={{ marginRight: '0px', marginLeft: 3 }}>
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: `linear-gradient(90deg, ${color}, ${barColor2})`, ['--w' as any]: `${(d.value / max) * 100}%`, animation: 'growbar .9s cubic-bezier(.4,0,.2,1) forwards' }} />
          </div>
        </div>
      ))}
      <style>{`@keyframes growbar {from{width:0%} to{width:var(--w)}}`}</style>
    </div>
  );
}