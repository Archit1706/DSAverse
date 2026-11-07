"use client";

import React from 'react';

const W = 420, PAD = { r: 10, t: 10, b: 22 };
const px = (v) => Math.round(v * 100) / 100;

/* A range narrower than a billionth of the values in it is flat. Tick steps
   that fine fall below the spacing between floats of that size, so a loop
   stepping through them never reaches the top — a run that starts at the
   minimum used to kill the page with "RangeError: Invalid array length". */
const isFlat = (lo, hi) => !(hi - lo >= 1e-9 * Math.max(1, Math.abs(lo), Math.abs(hi)));

/* A log axis always spans at least this factor, so a curve that barely moves
   is drawn as nearly flat rather than stretched over the whole height. */
const LOG_MIN_RATIO = 2;

/** Decimal places that show every multiple of `step` exactly: 0.25 → 2, 5 → 0. */
function decimalsOf(step) {
    for (let d = 0; d < 20; d++) {
        const x = step * 10 ** d, r = Math.round(x);
        if (r !== 0 && Math.abs(x - r) < 1e-6 * Math.abs(x)) return d;
    }
    return 20;
}

/** Round ticks covering [lo, hi], spaced 1, 2, 2.5 or 5 × 10ᵏ apart. A flat range gets one tick. */
function niceTicks(lo, hi, count = 4) {
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return { ticks: [], step: 0 };
    if (isFlat(lo, hi)) return { ticks: [lo], step: 0 };
    const step0 = (hi - lo) / count;
    const mag = 10 ** Math.floor(Math.log10(step0));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) ?? 10 * mag;
    const d = decimalsOf(step);
    const ticks = [];
    // Count an integer k rather than adding step to a float, so rounding error can neither build up nor stall the loop.
    for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-9 && ticks.length <= count + 1; k++) {
        ticks.push(Number((k * step).toFixed(d)));
    }
    return { ticks, step };
}

/* Mantissas per decade, coarse to fine. A log axis takes the coarsest set
   that gives it three ticks (two if none does): powers of ten over a long
   training run, then 1-3, 1-2-5 and 1-1.5-2-3-5-7 as the range narrows. */
const LOG_MANTISSAS = [[1], [1, 3], [1, 2, 5], [1, 1.5, 2, 3, 5, 7]];

function logTicks(y0, y1, maxTicks) {
    const e0 = Math.floor(Math.log10(y0)), e1 = Math.ceil(Math.log10(y1));
    const inside = (v) => v >= y0 * (1 - 1e-9) && v <= y1 * (1 + 1e-9);
    const sets = LOG_MANTISSAS.map(ms => {
        const ticks = [];
        for (let e = e0; e <= e1; e++) {
            for (const m of ms) {
                const v = Number((m * 10 ** e).toPrecision(6));
                if (inside(v)) ticks.push(v);
            }
        }
        return { ms, ticks };
    });
    const want = Math.min(3, maxTicks);
    const pick = sets.find(s => s.ticks.length >= want && s.ticks.length <= maxTicks) ?? sets.find(s => s.ticks.length >= 2);
    if (!pick) return null;
    const { ms, ticks } = pick;
    if (ticks.length <= maxTicks) return ticks;
    // Too many decades for the height: keep every n-th power of ten, anchored on 1 so labels hold still as the range grows.
    const n = Math.ceil(ticks.length / maxTicks);
    return ms.length === 1 ? ticks.filter(v => Math.round(Math.log10(v)) % n === 0) : ticks.filter((_, i) => i % n === 0);
}

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/[-0-9]/g, c => SUP[c]);

/** A log tick: 0.001 to 10000 as plain decimals, smaller or larger as 10⁻⁵ or 2×10⁻⁵. */
function logLabel(v) {
    if (v >= 1e-3 && v < 1e5) return String(Number(v.toPrecision(6)));
    const e = Math.floor(Math.log10(v) + 1e-9);
    const m = Number((v / 10 ** e).toPrecision(3));
    return `${m === 1 ? '' : `${m}×`}10${sup(e)}`;
}

/** A linear tick with just the decimals its step needs, trailing zeros dropped. */
function linearLabel(v, d) {
    const s = v.toFixed(Math.min(d, 20));
    return s.includes('.') && !s.includes('e') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

function yTicks(y0, y1, logY, maxTicks) {
    if (logY) {
        const t = logTicks(y0, y1, maxTicks);
        if (t) return t.map(v => ({ v, label: logLabel(v) }));
        // Narrower than a 1-1.5-2-3-5-7 decade: evenly spaced ticks still sit at the right heights on a log axis.
    }
    const { ticks, step } = niceTicks(y0, y1, Math.min(4, maxTicks));
    const d = step ? decimalsOf(step) : 4;
    return ticks.map(v => ({ v, label: step ? linearLabel(v, d) : String(Number(v.toPrecision(4))) }));
}

/** The y range to draw: the data (from 0 on a linear axis), widened when it is flat or, on a log axis, narrower than LOG_MIN_RATIO. */
function yRange(ys, logY, yMin, yMax) {
    const lo = Math.min(...ys), hi = Math.max(...ys);
    let y0 = yMin ?? (logY ? lo : Math.min(0, lo));
    let y1 = yMax ?? hi;
    if (logY) {
        if (!(y0 > 0)) y0 = lo;
        if (!(y1 / y0 >= LOG_MIN_RATIO)) {
            if (yMin === undefined && yMax === undefined) {
                const mid = (Math.log10(y0) + Math.log10(y1)) / 2, half = Math.log10(LOG_MIN_RATIO) / 2;
                y0 = 10 ** (mid - half);
                y1 = 10 ** (mid + half);
            } else if (yMax === undefined) y1 = y0 * LOG_MIN_RATIO;
            else if (yMin === undefined) y0 = y1 / LOG_MIN_RATIO;
            else if (isFlat(Math.log10(y0), Math.log10(y1))) y1 = y0 * LOG_MIN_RATIO;
        }
    } else if (isFlat(y0, y1)) {
        if (yMax === undefined) y1 = y0 + Math.max(1, Math.abs(y0));
        else y0 = y1 - Math.max(1, Math.abs(y1));
    }
    return [y0, y1];
}

/** The legend's number: integers as they are, everything else to 3 significant figures. */
function formatValue(v) {
    if (!Number.isFinite(v) || Number.isInteger(v)) return String(v);
    const a = Math.abs(v);
    if (a >= 100) return String(Math.round(v));
    if (a < 1e-4) return v.toExponential(2);
    return v.toPrecision(3);
}

/* Rough width of a 10-px label in the SVG's units, for the left margin. */
const labelWidth = (s) => [...s].reduce((w, c) => w + (c === '.' ? 3 : '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.includes(c) ? 4.5 : 6.2), 0);

/**
 * Curves over training steps — loss, validation loss, accuracy.
 *
 *   <LossChart series={[{ name: 'train', color: '#38bdf8', points: history.map(h => ({ x: h.step, y: h.loss })) }]} />
 *
 * With logY the y axis is logarithmic, which keeps the long flat tail of a
 * loss curve readable. The latest value of each series is printed in the
 * legend, through `format` (3 significant figures by default). Any range is
 * safe to draw, including a curve that has not moved at all.
 */
export default function LossChart({ series, height = 170, logY = false, yMin, yMax, xLabel = 'step', format = formatValue, ariaLabel = 'Loss over training' }) {
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
    const [y0, y1] = yRange(pts.map(p => p.y), logY, yMin, yMax);
    const tf = (y) => (logY ? Math.log10(y) : y);
    const [a, b] = [tf(y0), tf(y1)];
    const plotH = H - PAD.t - PAD.b;
    const ticks = yTicks(y0, y1, logY, Math.max(3, Math.floor(plotH / 24)));
    const padL = Math.max(40, Math.ceil(Math.max(0, ...ticks.map(t => labelWidth(t.label)))) + 9);
    const sx = (x) => px(padL + ((x - x0) / (x1 - x0)) * (W - padL - PAD.r));
    const sy = (y) => px(PAD.t + (1 - (tf(Math.min(y1, Math.max(y0, y))) - a) / (b - a || 1)) * plotH);

    return (
        <figure className="space-y-1.5">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} className="block">
                {ticks.map(t => (
                    <g key={t.v}>
                        <line x1={padL} x2={W - PAD.r} y1={sy(t.v)} y2={sy(t.v)} stroke="#1e293b" />
                        <text x={padL - 5} y={sy(t.v) + 3.5} fontSize="10" textAnchor="end" fill="#64748b">{t.label}</text>
                    </g>
                ))}
                <line x1={padL} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#334155" />
                <text x={padL} y={H - 6} fontSize="10" fill="#64748b">{formatValue(x0)}</text>
                <text x={(padL + W - PAD.r) / 2} y={H - 6} fontSize="10" textAnchor="middle" fill="#475569">{xLabel}</text>
                <text x={W - PAD.r} y={H - 6} fontSize="10" textAnchor="end" fill="#64748b">{formatValue(x1)}</text>
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
                            {s.name}{last && Number.isFinite(last.y) && <span className="font-mono text-slate-200 tabular-nums">{format(last.y)}</span>}
                        </span>
                    );
                })}
            </figcaption>
        </figure>
    );
}
