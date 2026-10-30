"use client";

import React from 'react';

const W = 420, PAD = { l: 40, r: 10, t: 10, b: 22 };
const px = (v) => Math.round(v * 100) / 100;

function niceTicks(lo, hi, count = 4) {
    const span = hi - lo || 1;
    const step0 = span / count;
    const mag = 10 ** Math.floor(Math.log10(step0));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) ?? 10 * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toPrecision(6)));
    return out;
}

/**
 * Curves over training steps — loss, validation loss, accuracy.
 *
 *   <LossChart series={[{ name: 'train', color: '#38bdf8', points: history.map(h => ({ x: h.step, y: h.loss })) }]} />
 *
 * With logY the y axis is logarithmic, which keeps the long flat tail of a
 * loss curve readable. The latest value of each series is printed in the legend.
 */
export default function LossChart({ series, height = 170, logY = false, yMin, yMax, xLabel = 'step', ariaLabel = 'Loss over training' }) {
    const pts = series.flatMap(s => s.points).filter(p => Number.isFinite(p.y) && (!logY || p.y > 0));
    const H = height;
    if (pts.length === 0) {
        return (
            <div className="flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 text-xs text-slate-500" style={{ height: H }}>
                No steps yet — press play to train.
            </div>
        );
    }
    const xs = pts.map(p => p.x);
    const x0 = Math.min(...xs), x1 = Math.max(x0 + 1, ...xs);
    const tf = (y) => (logY ? Math.log10(y) : y);
    let y0 = yMin ?? (logY ? Math.min(...pts.map(p => p.y)) : Math.min(0, ...pts.map(p => p.y)));
    let y1 = yMax ?? Math.max(...pts.map(p => p.y));
    if (y1 <= y0) y1 = y0 + (logY ? y0 * 9 : 1);
    const [a, b] = [tf(y0), tf(y1)];
    const sx = (x) => px(PAD.l + ((x - x0) / (x1 - x0)) * (W - PAD.l - PAD.r));
    const sy = (y) => px(PAD.t + (1 - (tf(Math.min(y1, Math.max(y0, y))) - a) / (b - a || 1)) * (H - PAD.t - PAD.b));
    const ticks = logY
        ? niceTicks(a, b, 3).filter(Number.isInteger).map(e => 10 ** e)
        : niceTicks(y0, y1, 4);
    const fmt = (v) => (Math.abs(v) >= 1000 ? v.toExponential(0) : Math.abs(v) >= 1 ? String(Number(v.toFixed(2))) : String(Number(v.toPrecision(2))));

    return (
        <figure className="space-y-1.5">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} className="block">
                {ticks.map(t => (
                    <g key={t}>
                        <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke="#1e293b" />
                        <text x={PAD.l - 5} y={sy(t) + 3.5} fontSize="10" textAnchor="end" fill="#64748b">{fmt(t)}</text>
                    </g>
                ))}
                <text x={PAD.l} y={H - 6} fontSize="10" fill="#64748b">{x0}</text>
                <text x={W - PAD.r} y={H - 6} fontSize="10" textAnchor="end" fill="#64748b">{x1} {xLabel}</text>
                {series.map(s => {
                    const p = s.points.filter(q => Number.isFinite(q.y) && (!logY || q.y > 0));
                    if (p.length === 0) return null;
                    return (
                        <polyline key={s.name} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round"
                            strokeDasharray={s.dashed ? '5 4' : undefined}
                            points={p.map(q => `${sx(q.x)},${sy(q.y)}`).join(' ')} />
                    );
                })}
            </svg>
            <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                {series.map(s => {
                    const last = s.points[s.points.length - 1];
                    return (
                        <span key={s.name} className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-0.5 rounded" style={{ background: s.color }} />
                            {s.name}{last && Number.isFinite(last.y) && <span className="font-mono text-slate-200 tabular-nums">{last.y.toFixed(4)}</span>}
                        </span>
                    );
                })}
            </figcaption>
        </figure>
    );
}
