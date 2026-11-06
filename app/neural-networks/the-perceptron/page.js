"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, Dumbbell, Shuffle,
    CircleDot, CircleAlert, Repeat, Ban, Ruler, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { useTrainer } from '@/lib/ml/useTrainer';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import TrainingCurve from '@/components/ml/TrainingCurve';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the neuron and its learning rule ──────────────────────
   z = w₁x₁ + w₂x₂ + b, and the perceptron says 1 when z ≥ 0. It visits the
   points in a fixed order; on a mistake it adds η(y − ŷ)·x to w and
   η(y − ŷ) to b, which tips the line towards getting that point right. On
   a correct point it does nothing at all. Coordinates have one decimal and
   η = 0.5, so every weight on the page has at most two. */

const N_TOUR = 10;
const ETA = 0.5;
const GAP = 0.12;
const MAX_EPOCHS = 200;
const DEFAULT_SEED = 17;
const STUDY_RUNS = 200;
const RANGE = [-1.2, 1.2];
const XOR_PTS = [[-0.6, -0.6, 0], [0.6, 0.6, 0], [-0.6, 0.6, 1], [0.6, -0.6, 1]].map(([a, b, y]) => ({ x: [a, b], y }));

const ACTS = [
    { id: 1, label: 'Neuron', icon: CircleDot },
    { id: 2, label: 'Mistakes', icon: CircleAlert },
    { id: 3, label: 'Epochs', icon: Repeat },
    { id: 4, label: 'XOR', icon: Ban },
    { id: 5, label: 'Margin', icon: Ruler },
];

const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const tn = (v, d = 2) => f(v, d).replace('−', '-');
/* z is exact to three decimals (a weight with two times an input with one), so
   it is shown with three — or two when the third is 0 — and never rounds a tie. */
const fz = (z) => { const s = f(z, 3); return s.endsWith('0') ? s.slice(0, -1) : s; };
const fp = (v, d = 2) => (v < 0 ? `(${f(v, d)})` : f(v, d));
const tp = (v, d = 2) => (v < 0 ? `(${tn(v, d)})` : tn(v, d));
const vec = (w, d = 2) => `(${f(w[0], d)}, ${f(w[1], d)})`;
const r1 = (v) => Math.round(v * 10) / 10;
const pct = (x) => `${(100 * x).toFixed(1)}%`;
const cls = (y) => (y ? 'orange' : 'blue');

/* z is rounded to 1e-9. Inputs have one decimal and weights only a few more,
   so the exact z is a multiple of 0.005; rounding strips the 1e-17 float noise,
   and a point exactly on the line really scores 0 and is answered 1. */
const zOf = (w, b, x) => Math.round((w[0] * x[0] + w[1] * x[1] + b) * 1e9) / 1e9;
const out = (w, b, x) => (zOf(w, b, x) >= 0 ? 1 : 0);

/** Points in [−1, 1]² with one decimal, labelled by a random line, none closer to it than `gap`. */
function separable(seed, n = N_TOUR, gap = GAP) {
    const rng = createRng(seed);
    const th = rng.next() * 2 * Math.PI, u = [Math.cos(th), Math.sin(th)], c = (rng.next() - 0.5) * 0.6;
    const pts = [];
    while (pts.length < n) {
        const x = [r1(rng.next() * 2 - 1), r1(rng.next() * 2 - 1)];
        const d = u[0] * x[0] + u[1] * x[1] - c;
        if (Math.abs(d) < gap || pts.some(p => p.x[0] === x[0] && p.x[1] === x[1])) continue;
        pts.push({ x, y: d > 0 ? 1 : 0 });
    }
    return { pts, u, c };
}
/* overlapping() is defined after maxMargin(), which it uses to make sure no line separates its points. */

/** Every visit of every epoch, until an epoch makes no mistakes or maxEpochs run out. */
function trainLog(pts, w0, b0, eta = ETA, maxEpochs = MAX_EPOCHS, useBias = true) {
    let w = [...w0], b = b0;
    const epochs = [];
    for (let e = 0; e < maxEpochs; e++) {
        const visits = [];
        let mistakes = 0;
        pts.forEach((p, k) => {
            const z = zOf(w, b, p.x), yhat = z >= 0 ? 1 : 0;
            const v = { k, z, yhat, wBefore: w, bBefore: b, updated: yhat !== p.y };
            if (v.updated) {
                const s = eta * (p.y - yhat);
                w = [w[0] + s * p.x[0], w[1] + s * p.x[1]];
                if (useBias) b += s;
                mistakes++;
            }
            visits.push({ ...v, wAfter: w, bAfter: b });
        });
        epochs.push({ mistakes, visits, w, b });
        if (!mistakes) return { epochs, w, b, converged: true };
    }
    return { epochs, w, b, converged: false };
}

/** The widest-margin separating line: the best unit normal from a 0.1° sweep, refined by ternary search. */
function maxMargin(pts) {
    const at = (th) => {
        const u = [Math.cos(th), Math.sin(th)];
        let lo = Infinity, hi = -Infinity;
        for (const p of pts) { const d = u[0] * p.x[0] + u[1] * p.x[1]; if (p.y) lo = Math.min(lo, d); else hi = Math.max(hi, d); }
        return { m: (lo - hi) / 2, c: (lo + hi) / 2, u };
    };
    let best = -Infinity, bt = 0;
    for (let k = 0; k < 3600; k++) { const th = (k / 3600) * 2 * Math.PI, m = at(th).m; if (m > best) { best = m; bt = th; } }
    let a = bt - (2 * Math.PI) / 3600, b = bt + (2 * Math.PI) / 3600;
    for (let i = 0; i < 80; i++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (at(m1).m < at(m2).m) a = m1; else b = m2; }
    return at((a + b) / 2);
}
/** Points near a random line with labels flipped at random within 0.3 of it, redrawn until no line separates them. */
function overlapping(seed, n) {
    for (let k = 0; ; k++) {
        const { pts, u, c } = separable(seed + k * 7919, n, 0);
        const rng = createRng(seed + k * 7919 + 7);
        const flipped = pts.map(p => (Math.abs(u[0] * p.x[0] + u[1] * p.x[1] - c) < 0.3 && rng.next() < 0.5 ? { ...p, y: 1 - p.y } : p));
        if (maxMargin(flipped).m < -0.02) return flipped;
    }
}
/** Distance from the line to the nearest point, negative if any point is on the wrong side. */
const marginOf = (pts, w, b) => Math.min(...pts.map(p => (2 * p.y - 1) * zOf(w, b, p.x))) / Math.hypot(w[0], w[1]);

/* "The perceptron finds the best line": 200 separable sets of 20 points,
   trained from zero, against the widest-margin line, both scored on 2,000
   fresh points from the same distribution. */
function marginStudy(runs = STUDY_RUNS) {
    const ratios = [];
    let accP = 0, accM = 0, mmBetter = 0, mmWorse = 0;
    for (let s = 1; s <= runs; s++) {
        const { pts, u, c } = separable(1000 + s, 20, 0.08);
        const r = trainLog(pts, [0, 0], 0, 1, 1000);
        const mm = maxMargin(pts);
        ratios.push(marginOf(pts, r.w, r.b) / mm.m);
        const rng = createRng(77 + s);
        let a = 0, am = 0, n = 0;
        while (n < 2000) {
            const x = [rng.next() * 2 - 1, rng.next() * 2 - 1];
            const d = u[0] * x[0] + u[1] * x[1] - c;
            if (Math.abs(d) < 0.08) continue;
            const y = d > 0 ? 1 : 0;
            n++;
            a += out(r.w, r.b, x) === y ? 1 : 0;
            am += (mm.u[0] * x[0] + mm.u[1] * x[1] - mm.c >= 0 ? 1 : 0) === y ? 1 : 0;
        }
        accP += a / n; accM += am / n;
        if (am > a) mmBetter++; else if (am < a) mmWorse++;
    }
    const sorted = [...ratios].sort((x, y) => x - y);
    return { runs, median: (sorted[runs / 2 - 1] + sorted[runs / 2]) / 2, under50: ratios.filter(r => r < 0.5).length, accP: accP / runs, accM: accM / runs, mmBetter, mmWorse };
}

/** The segment of w·x + b = 0 inside the visible square, or null. */
function boundarySegment(w, b) {
    const [lo, hi] = RANGE;
    const pts = [];
    if (Math.abs(w[1]) > 1e-9) for (const x of [lo, hi]) { const y = -(w[0] * x + b) / w[1]; if (y >= lo - 1e-9 && y <= hi + 1e-9) pts.push([x, y]); }
    if (Math.abs(w[0]) > 1e-9) for (const y of [lo, hi]) { const x = -(w[1] * y + b) / w[0]; if (x >= lo - 1e-9 && x <= hi + 1e-9) pts.push([x, y]); }
    return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : null;
}

/* The guided tour's data: the first draw from this seed on whose points the
   perceptron makes 3–6 mistakes in the first epoch, needs 3–8 epochs, starts
   and ends with a line inside the picture, and does not stop with its line
   touching a point. */
function tourData(seed) {
    for (let k = 0; k < 400; k++) {
        const { pts } = separable(seed + k * 101);
        const rng = createRng(seed + k * 101 + 99);
        const w0 = [r1(rng.normal(0, 0.6)), r1(rng.normal(0, 0.6))];
        if (Math.hypot(...w0) < 0.3) continue;
        const log = trainLog(pts, w0, 0);
        const pos = pts.filter(p => p.y).length;
        if (log.converged && log.epochs[0].mistakes >= 3 && log.epochs[0].mistakes <= 6 && log.epochs.length >= 3 && log.epochs.length <= 8
            && pos >= 3 && pos <= N_TOUR - 3 && boundarySegment(w0, 0) && boundarySegment(log.w, log.b) && marginOf(pts, log.w, log.b) > 0.02) return { pts, w0, b0: 0, log, draw: k };
    }
    return null;
}

/* Which first-epoch visits ask "will it update?". Each visit is asked about
   independently, mistakes with probability nNo/nYes and correct points with
   nYes/nNo (capped at 1), so "yes" and "no" are right equally often on
   average without the exact balance that would let "the opposite of last
   time" score. The first point is never asked about: act 1 already worked
   out its score. */
function pickAsks(visits, seed) {
    const rng = createRng(seed * 31 + 5);
    const cand = visits.filter(v => v.k > 0);
    const nYes = cand.filter(v => v.updated).length, nNo = cand.length - nYes;
    const pYes = Math.min(1, nNo / nYes), pNo = Math.min(1, nYes / nNo);
    for (let tries = 0; ; tries++) {
        const asks = cand.filter(v => rng.next() < (v.updated ? pYes : pNo)).map(v => v.k);
        if (asks.length >= 3 || tries > 50) return new Set(asks);
    }
}

const generateSteps = (seed) => {
    const { pts, w0, b0, log } = tourData(seed) ?? tourData(DEFAULT_SEED);
    const steps = [];
    const s = (act, extra) => steps.push({ act, actName: ACTS[act - 1].label, pts, ...extra });
    const wrong0 = pts.filter(p => out(w0, b0, p.x) !== p.y).length;
    const p0 = pts[0], z0 = zOf(w0, b0, p0.x);

    s(1, {
        w: w0, b: b0,
        explanation: `A perceptron is one artificial neuron. It takes the two coordinates of a point, multiplies each by a weight, adds a bias and checks the sign: z = w₁x₁ + w₂x₂ + b, and it answers 1 (orange) when z ≥ 0, else 0 (blue). These ${N_TOUR} points need sorting. It starts with w = ${vec(w0, 1)} and b = ${f(b0, 1)}.`,
    });
    s(1, {
        w: w0, b: b0, focus: 0, showZ: true,
        explanation: `Take the ringed point, x = ${vec(p0.x, 1)}: z = ${f(w0[0], 1)} × ${fp(p0.x[0], 1)} + ${fp(w0[1], 1)} × ${fp(p0.x[1], 1)} + ${f(b0, 1)} = ${fz(z0)}, so the perceptron answers ${z0 >= 0 ? '1, orange' : '0, blue'}. The point is ${cls(p0.y)}, so that is ${(z0 >= 0 ? 1 : 0) === p0.y ? 'right' : 'wrong'}.`,
    });
    s(1, {
        w: w0, b: b0, arrow: true,
        explanation: `Every point with z = 0 lies on one straight line — the dashed one. The shaded side is where z ≥ 0 and the answer is orange; the arrow is w, which always points into that side. Right now ${wrong0 === N_TOUR ? `all ${N_TOUR} points are on the wrong side — the line faces the wrong way` : `${wrong0} of the ${N_TOUR} points are on the wrong side`}. Learning means moving this line.`,
    });

    const asks = pickAsks(log.epochs[0].visits, seed);
    const e1 = log.epochs[0].visits;
    e1.forEach((v, k) => {
        const prev = k > 0 ? e1[k - 1] : null;
        const p = pts[v.k];
        let before = '';
        if (prev) {
            const q = pts[prev.k];
            before = prev.updated
                ? `Point ${prev.k + 1} was ${cls(q.y)} but scored z = ${fz(prev.z)}, a mistake. The rule adds η(y − ŷ)·x = ${f(ETA, 1)} × ${q.y - prev.yhat > 0 ? '1' : '(−1)'} × ${vec(q.x, 1)} to w and ${f(ETA * (q.y - prev.yhat), 1)} to b: w is now ${vec(prev.wAfter)}, b = ${f(prev.bAfter)}. `
                : `Point ${prev.k + 1} scored z = ${fz(prev.z)} and is ${cls(q.y)}: right, so nothing changes. `;
        } else before = 'The first pass through the data — an epoch — visits the points in order. ';
        s(2, {
            w: v.wBefore, b: v.bBefore, focus: v.k, showZ: true, visit: v, ask: asks.has(v.k), lastUpdated: prev?.updated ?? null,
            explanation: `${before}Next: point ${v.k + 1} at ${vec(p.x, 1)}, which is ${cls(p.y)}.`,
        });
    });
    const last = e1[e1.length - 1], lq = pts[last.k];
    s(2, {
        w: log.epochs[0].w, b: log.epochs[0].b, epochEnd: 1,
        explanation: `${last.updated ? `Point ${last.k + 1} was ${cls(lq.y)} but scored z = ${fz(last.z)}, a mistake, so w is now ${vec(last.wAfter)} and b = ${f(last.bAfter)}.` : `Point ${last.k + 1} scored z = ${fz(last.z)} and is ${cls(lq.y)}: right.`} End of epoch 1: ${log.epochs[0].mistakes} mistakes, so ${log.epochs[0].mistakes} updates. Each update only nudged the line towards the point it got wrong: it need not fix that point, and it can push others across.`,
    });

    log.epochs.slice(1).forEach((ep, i) => {
        const wrongNow = pts.filter(p => out(ep.w, ep.b, p.x) !== p.y).length;
        const which = ep.visits.filter(v => v.updated).map(v => v.k + 1);
        s(3, {
            w: ep.w, b: ep.b, epochEnd: i + 2, done: ep.mistakes === 0,
            explanation: ep.mistakes
                ? `Epoch ${i + 2}: ${ep.mistakes === 1 ? `one mistake (point ${which[0]}), so one update` : `${ep.mistakes} mistakes (points ${which.join(', ')}), so ${ep.mistakes} updates`}. Now w = ${vec(ep.w)}, b = ${f(ep.b)}, and ${wrongNow === 0 ? 'every point is on its own side — but the perceptron only finds that out by making a whole pass without a mistake' : `${wrongNow} point${wrongNow === 1 ? ' is' : 's are'} still on the wrong side`}.`
                : `Epoch ${i + 2}: no mistakes at all, so no updates — every point is on its own side and the perceptron stops, with w = ${vec(ep.w)} and b = ${f(ep.b)}. Rosenblatt's convergence theorem promises this ending whenever some straight line separates the classes.`,
        });
    });

    const xor = trainLog(XOR_PTS, [0, 0], 0, ETA, 6);
    s(4, {
        pts: XOR_PTS, w: xor.epochs[0].w, b: xor.epochs[0].b, xor: true, epochEnd: 1,
        explanation: `XOR: orange where exactly one coordinate is positive. Starting from w = (0, 0), b = 0, the first epoch makes ${xor.epochs[0].mistakes} mistakes and ends at w = ${vec(xor.epochs[0].w)}, b = ${f(xor.epochs[0].b)}.`,
    });
    s(4, {
        pts: XOR_PTS, w: xor.epochs[1].w, b: xor.epochs[1].b, xor: true, epochEnd: 2,
        explanation: `Epoch 2 makes ${xor.epochs[1].mistakes} mistakes — and ends at w = ${vec(xor.epochs[1].w)}, b = ${f(xor.epochs[1].b)}, exactly where epoch 1 ended. Every later epoch repeats it — ${xor.epochs.slice(1).every(e => e.mistakes === xor.epochs[1].mistakes) ? `${xor.epochs[1].mistakes} mistakes in each of epochs 2 to ${xor.epochs.length}` : `${xor.epochs.slice(1).map(e => e.mistakes).join(', ')} mistakes in epochs 2 to ${xor.epochs.length}`}, the same updates cancelling out, round and round forever.`,
    });
    s(4, {
        pts: XOR_PTS, w: xor.epochs[1].w, b: xor.epochs[1].b, xor: true,
        explanation: 'No straight line puts both orange corners on one side and both blue corners on the other, so there is nothing for the rule to converge to. One neuron draws one line; XOR needs two. That is why networks have hidden layers.',
    });

    const mm = maxMargin(pts), mp = marginOf(pts, log.w, log.b);
    s(5, {
        w: log.w, b: log.b, mm,
        explanation: `The perceptron stopped at the first line with no mistakes. Its nearest point is ${f(mp, 3)} away. The dashed green line is the one that keeps the nearest points as far away as possible: ${f(mm.m, 3)} on each side${mp < mm.m * 0.999 ? ` — ${Math.round((100 * mp) / mm.m)}% of the margin the perceptron could have had` : ''}. Both are perfect on these ${N_TOUR} points, but the wider one leaves more room for points it has not seen.`,
    });
    s(5, {
        w: log.w, b: log.b, mm, done: true,
        explanation: 'Switch to "Train it yourself": watch the line hop as it learns, then give it XOR, overlapping classes or no bias and watch it never settle.',
    });
    return steps;
};

/* ── the training lab's data ──────────────────────────── */

const LAB_N = 30;
const LAB_DEFAULTS = { data: 'separable', logEta: Math.log10(ETA), bias: true };

function labPoints(kind, seed) {
    if (kind === 'xor') return createRng(seed).shuffle(Array.from({ length: LAB_N }, (_, i) => {
        const rng = createRng(seed * 13 + i);
        const q = i % 4, sx = q === 0 || q === 3 ? -1 : 1, sy = q < 2 ? -1 : 1;
        return { x: [r1(sx * (0.25 + 0.6 * rng.next())), r1(sy * (0.25 + 0.6 * rng.next()))], y: sx * sy < 0 ? 1 : 0 };
    }));
    if (kind === 'overlap') return overlapping(seed, LAB_N);
    if (kind === 'offset') {
        // Separable, but only by a line that misses the origin: without a bias the perceptron cannot draw it.
        // (0.3, 0.3) and (0.7, 0.7) lie on one ray from the origin, so no line through it can split them.
        const pts = [{ x: [0.3, 0.3], y: 0 }, { x: [0.7, 0.7], y: 1 }];
        const rng = createRng(seed);
        while (pts.length < LAB_N) { const x = [r1(rng.next() * 2 - 1), r1(rng.next() * 2 - 1)]; const d = x[0] + x[1] - 0.9; if (Math.abs(d) > 0.12) pts.push({ x, y: d > 0 ? 1 : 0 }); }
        return pts;
    }
    return separable(seed, LAB_N).pts;
}

/* The lab starts from w = 0, b = 0, where η cannot change a single decision:
   every weight is η times the sum of the (y − ŷ)x so far, so z is η times
   what it would be with η = 1 and keeps its sign. The lab therefore keeps
   those sums (u, c) and shows w = ηu, b = ηc — moving the η slider rescales
   the weights while the line stays exactly where it is. */
const labStart = () => ({ u: [0, 0], c: 0, k: 0, epoch: 1, mistakes: 0, done: false });

/** One step of the lab's training: visit the next point, update on a mistake, and report each finished epoch. */
function labVisit(st, pts, bias) {
    if (st.done) return null;
    const p = pts[st.k];
    const yhat = zOf(st.u, st.c, p.x) >= 0 ? 1 : 0;
    if (yhat !== p.y) {
        const s = p.y - yhat;
        st.u = [st.u[0] + s * p.x[0], st.u[1] + s * p.x[1]];
        if (bias) st.c += s;
        st.mistakes++;
    }
    st.k++;
    if (st.k < pts.length) return null;
    const m = st.mistakes;
    st.k = 0; st.mistakes = 0; st.epoch++;
    if (m === 0 || st.epoch > MAX_EPOCHS) st.done = true;
    return { loss: m, mistakes: m, epoch: st.epoch - 1 };
}


/** The part of the visible square where w·x + b ≥ 0 (Sutherland–Hodgman against one half-plane). */
function yesRegion(w, b) {
    const [lo, hi] = RANGE;
    const square = [[lo, lo], [hi, lo], [hi, hi], [lo, hi]];
    const inside = (p) => zOf(w, b, p) >= 0;
    const poly = [];
    square.forEach((p, i) => {
        const q = square[(i + 1) % 4];
        if (inside(p)) poly.push(p);
        if (inside(p) !== inside(q)) {
            const zp = zOf(w, b, p), zq = zOf(w, b, q), t = zp / (zp - zq);
            poly.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
        }
    });
    return poly;
}

/* ── predict ─────────────────────────────────────────────
   Before a first-epoch visit: will the perceptron update on this point?
   Decided by which side of the line the ringed point is and its colour,
   both on screen. pickAsks balances the answers. */
const predictFor = (step, next) => {
    if (step.act !== 2 || !step.visit || !step.ask || !next) return null;
    const v = step.visit, p = step.pts[v.k];
    return {
        question: `Point ${v.k + 1} is ${cls(p.y)}. Will the perceptron change its weights when it visits this point?`,
        options: ['Yes, it updates', 'No, nothing changes'],
        correct: v.updated ? 0 : 1,
        because: v.updated
            ? `It scores z = ${fz(v.z)}, so the answer is ${v.yhat ? 'orange' : 'blue'} — wrong side of the line. A mistake, so w and b move.`
            : `It scores z = ${fz(v.z)}, so the answer is ${v.yhat ? 'orange' : 'blue'} — the right side. The perceptron only learns from mistakes.`,
    };
};

function formulaFor(step, pending) {
    if (step.mm) return String.raw`\text{margin} = \min_i \frac{(2y_i - 1)(w \cdot x_i + b)}{\lVert w \rVert} = ${tn(marginOf(step.pts, step.w, step.b), 3)} \quad\text{vs best}\quad ${tn(step.mm.m, 3)}`;
    if (step.focus !== undefined && step.showZ) {
        const p = step.pts[step.focus], z = zOf(step.w, step.b, p.x);
        const sum = String.raw`z = w_1 x_1 + w_2 x_2 + b = ${tn(step.w[0])} \cdot ${tp(p.x[0], 1)} + ${tp(step.w[1])} \cdot ${tp(p.x[1], 1)} + ${tp(step.b)}`;
        return pending ? sum : String.raw`${sum} = ${fz(z).replace('−', '-')} \;\Rightarrow\; \hat y = ${z >= 0 ? 1 : 0}`;
    }
    if (step.epochEnd || step.xor) return String.raw`w \leftarrow w + \eta\,(y - \hat y)\,x, \qquad b \leftarrow b + \eta\,(y - \hat y), \qquad \eta = ${ETA}`;
    return String.raw`\hat y = \begin{cases} 1 & w_1x_1 + w_2x_2 + b \ge 0 \\ 0 & \text{otherwise} \end{cases}, \qquad w = ${String.raw`(${tn(step.w[0])}, ${tn(step.w[1])})`},\; b = ${tn(step.b)}`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'A perceptron has w = (2, −1) and b = 0.5. What does it answer for the point x = (0.5, 2)?',
        options: ['1, because z = 0.5', '0, because z = −0.5', '1, because every weight is non-zero', '0, because x₂ is larger than x₁'],
        correct: 1,
        explanation: 'z = 2 × 0.5 + (−1) × 2 + 0.5 = 1 − 2 + 0.5 = −0.5, which is below 0, so the answer is 0.',
    },
    {
        question: 'The perceptron visits a point it already classifies correctly. What does the learning rule do?',
        options: ['Moves the line a little towards the point', 'Moves the line a little away from the point', 'Nothing — the update is η(y − ŷ)x and y − ŷ = 0', 'Halves the learning rate'],
        correct: 2,
        explanation: 'The perceptron only learns from mistakes. When ŷ = y the factor (y − ŷ) is 0, so neither w nor b changes.',
    },
    {
        question: 'Why can a single perceptron never learn XOR?',
        options: ['Its learning rate is too small', 'XOR needs more training epochs', 'No straight line separates the two XOR classes, and one perceptron can only draw a straight line', 'XOR has too few points'],
        correct: 2,
        explanation: 'A perceptron’s boundary is the line w·x + b = 0. XOR’s orange corners sit diagonally opposite each other, so every line leaves at least one point on the wrong side, and the updates go round in a loop forever.',
    },
];

const codeExample = `import numpy as np

def perceptron(X, y, w, b, eta=0.5, epochs=200):
    for epoch in range(1, epochs + 1):
        mistakes = 0
        for xi, yi in zip(X, y):
            y_hat = int(w @ xi + b >= 0)
            if y_hat != yi:                          # learn only from mistakes
                w = w + eta * (yi - y_hat) * xi
                b = b + eta * (yi - y_hat)
                mistakes += 1
        print(epoch, mistakes, w, b)
        if mistakes == 0:
            return w, b

X = np.array([[-0.6, -0.6], [0.6, 0.6], [-0.6, 0.6], [0.6, -0.6]])
y = np.array([0, 0, 1, 1])                           # XOR
perceptron(X, y, np.zeros(2), 0.0, epochs=4)
# 1 3 [0.3 0.3] 0.5
# 2 4 [0.3 0.3] 0.5      the same weights, every epoch, forever
# 3 4 [0.3 0.3] 0.5
# 4 4 [0.3 0.3] 0.5`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Step through the mistakes act again and retry.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white">Retake</button>
            </div>
        );
    }
    const answer = (idx) => {
        if (quizState.answered) return;
        const right = idx === q.correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: right ? s.score + 1 : s.score }));
    };
    const next = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };
    return (
        <div>
            <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
            <p className="text-sm text-slate-200 mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let tone = 'border-slate-700 text-slate-300 hover:border-orange-500';
                    if (quizState.answered) {
                        if (i === q.correct) tone = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) tone = 'border-red-500 bg-red-500/10 text-red-300';
                        else tone = 'border-slate-800 text-slate-500';
                    }
                    return (
                        <button key={opt} onClick={() => answer(i)} disabled={quizState.answered}
                            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors flex items-start gap-2 ${tone}`}>
                            {quizState.answered && i === q.correct && <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                            {quizState.answered && i === quizState.selected && i !== q.correct && <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                            <span>{opt}</span>
                        </button>
                    );
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{q.explanation}</p>
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── pictures ───────────────────────────────────────────── */

const BOX = 360;
const r2 = (v) => Math.round(v * 100) / 100;
const toBox = ([x, y]) => [r2(((x - RANGE[0]) / (RANGE[1] - RANGE[0])) * BOX), r2(((RANGE[1] - y) / (RANGE[1] - RANGE[0])) * BOX)];
const COL = ['#38bdf8', '#fb923c'];

function PerceptronPlane({ pts, w, b, focus, mm, arrow, onAdd, hideWrong = false }) {
    const seg = boundarySegment(w, b);
    const region = yesRegion(w, b);
    const len = Math.hypot(w[0], w[1]);
    let normal = null;
    if (arrow && seg && len > 1e-9) {
        const mid = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2];
        normal = [toBox(mid), toBox([mid[0] + (0.35 * w[0]) / len, mid[1] + (0.35 * w[1]) / len])];
    }
    const mmSeg = mm ? boundarySegment(mm.u, -mm.c) : null;
    const add = (e) => {
        if (!onAdd) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = RANGE[0] + ((e.clientX - rect.left) / rect.width) * (RANGE[1] - RANGE[0]);
        const y = RANGE[1] - ((e.clientY - rect.top) / rect.height) * (RANGE[1] - RANGE[0]);
        onAdd([r1(Math.max(-1, Math.min(1, x))), r1(Math.max(-1, Math.min(1, y)))], e.shiftKey ? 0 : 1);
    };
    return (
        <svg viewBox={`0 0 ${BOX} ${BOX}`} width="100%" className="max-w-[420px] mx-auto block rounded-lg bg-slate-950/60" role="img"
            aria-label="Points coloured by class, the perceptron's line and the side it calls orange" onClick={add} style={onAdd ? { cursor: 'crosshair' } : undefined}>
            <defs><marker id="pc-tip" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#f8fafc" /></marker></defs>
            {region.length >= 3 && <polygon points={region.map(p => toBox(p).join(',')).join(' ')} fill={COL[1]} opacity="0.12" />}
            {[-1, -0.5, 0, 0.5, 1].map(v => (
                <g key={v}>
                    <line x1={toBox([v, RANGE[0]])[0]} x2={toBox([v, RANGE[1]])[0]} y1="0" y2={BOX} stroke="#1e293b" strokeWidth={v === 0 ? 1.5 : 1} />
                    <line y1={toBox([RANGE[0], v])[1]} y2={toBox([RANGE[1], v])[1]} x1="0" x2={BOX} stroke="#1e293b" strokeWidth={v === 0 ? 1.5 : 1} />
                </g>
            ))}
            {mmSeg && <line x1={toBox(mmSeg[0])[0]} y1={toBox(mmSeg[0])[1]} x2={toBox(mmSeg[1])[0]} y2={toBox(mmSeg[1])[1]} stroke="#a3e635" strokeWidth="2" strokeDasharray="3 4" />}
            {mm && [1, -1].map(sg => { const sgm = boundarySegment(mm.u, -mm.c - sg * mm.m); return sgm && <line key={sg} x1={toBox(sgm[0])[0]} y1={toBox(sgm[0])[1]} x2={toBox(sgm[1])[0]} y2={toBox(sgm[1])[1]} stroke="#a3e635" strokeWidth="1" opacity="0.4" />; })}
            {seg && <line x1={toBox(seg[0])[0]} y1={toBox(seg[0])[1]} x2={toBox(seg[1])[0]} y2={toBox(seg[1])[1]} stroke="#f8fafc" strokeWidth="2.5" strokeDasharray="7 5" />}
            {normal && <line x1={normal[0][0]} y1={normal[0][1]} x2={normal[1][0]} y2={normal[1][1]} stroke="#f8fafc" strokeWidth="2" markerEnd="url(#pc-tip)" />}
            {pts.map((p, i) => {
                const [cx, cy] = toBox(p.x);
                const wrong = !hideWrong && out(w, b, p.x) !== p.y;
                return (
                    <g key={i}>
                        {wrong && <circle cx={cx} cy={cy} r="10.5" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 2" />}
                        <circle cx={cx} cy={cy} r="7" fill={COL[p.y]} stroke="#0f172a" strokeWidth="1.5" />
                        {pts.length <= 12 && <text x={cx} y={r2(cy + 3.5)} fontSize="9" textAnchor="middle" fill="#0f172a" fontWeight="700">{i + 1}</text>}
                        {focus === i && <circle cx={cx} cy={cy} r="12" fill="none" stroke="#facc15" strokeWidth="2.5" />}
                    </g>
                );
            })}
        </svg>
    );
}

/** The neuron itself: inputs, weights on the wires, the sum and the step. */
function NeuronDiagram({ w, b, x, z }) {
    const yh = z === undefined ? null : z >= 0 ? 1 : 0;
    // Each weight sits on its wire a third of the way along, where the three wires are still apart.
    const wire = (y1, label, val) => (
        <g>
            <line x1="46" y1={y1} x2="166" y2="70" stroke={val >= 0 ? '#38bdf8' : '#fb923c'} strokeWidth={r2(1 + Math.min(4, Math.abs(val) * 2))} />
            <text x="88" y={r2(y1 + (70 - y1) * 0.35 - 5)} fontSize="10.5" textAnchor="middle" fill="#cbd5e1">{label} = {f(val)}</text>
        </g>
    );
    return (
        <svg viewBox="0 0 340 140" width="100%" className="max-w-[420px] mx-auto block" role="img" aria-label="The neuron: two inputs and a bias, weighted, summed and passed through a step">
            {wire(24, 'w₁', w[0])}
            {wire(70, 'w₂', w[1])}
            {wire(116, 'b', b)}
            {[['x₁', 24, x?.[0]], ['x₂', 70, x?.[1]], ['1', 116, 1]].map(([n, y, v]) => (
                <g key={n}>
                    <circle cx="30" cy={y} r="16" fill="#1e293b" stroke="#475569" />
                    <text x="30" y={y + 4} fontSize="11" textAnchor="middle" fill="#e2e8f0">{v === undefined ? n : n === '1' ? '1' : f(v, 1)}</text>
                </g>
            ))}
            <circle cx="186" cy="70" r="20" fill="#1e293b" stroke="#fb923c" strokeWidth="1.5" />
            <text x="186" y="75" fontSize="15" textAnchor="middle" fill="#fdba74">Σ</text>
            <text x="186" y="108" fontSize="10" textAnchor="middle" fill="#94a3b8">{z === undefined ? 'z' : `z = ${fz(z)}`}</text>
            <line x1="206" y1="70" x2="240" y2="70" stroke="#475569" strokeWidth="1.5" />
            <rect x="240" y="50" width="40" height="40" rx="6" fill="#1e293b" stroke="#475569" />
            <polyline points="248,80 260,80 260,60 272,60" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="280" y1="70" x2="300" y2="70" stroke="#475569" strokeWidth="1.5" />
            <circle cx="316" cy="70" r="14" fill={yh === null ? '#1e293b' : COL[yh]} stroke="#475569" />
            <text x="316" y="74" fontSize="11" textAnchor="middle" fill={yh === null ? '#e2e8f0' : '#0f172a'} fontWeight="700">{yh === null ? 'ŷ' : yh}</text>
        </svg>
    );
}

/* ── train it yourself ─────────────────────────────────── */

function TrainLab({ initialSeed }) {
    const [data, setData] = useState(LAB_DEFAULTS.data);
    const [seed, setSeed] = useState(initialSeed);
    const [logEta, setLogEta] = useState(LAB_DEFAULTS.logEta);
    const [bias, setBias] = useState(LAB_DEFAULTS.bias);
    const [extra, setExtra] = useState([]);
    const [pace, setPace] = useState(2);
    const eta = 10 ** logEta;
    const base = useMemo(() => labPoints(data, seed), [data, seed]);
    const pts = useMemo(() => [...base, ...extra], [base, extra]);

    const trainer = useTrainer({
        init: labStart,
        step: (st) => labVisit(st, pts, bias),
        deps: [pts, bias],
        maxStepsPerFrame: pace,
    });
    const st = trainer.state;
    const w = [eta * st.u[0], eta * st.u[1]], b = eta * st.c;
    const epochs = trainer.history;
    const converged = st.done && epochs.length > 0 && epochs[epochs.length - 1].mistakes === 0;
    const wrongNow = pts.filter(p => out(st.u, st.c, p.x) !== p.y).length;
    const { running, pause } = trainer;
    useEffect(() => { if (st.done && running) pause(); });

    const broken = [];
    if (data === 'xor') broken.push('XOR: no straight line separates these classes, so every epoch makes mistakes and the line never settles — it gives up after 200 epochs. One neuron is not enough; the Forward Pass page adds a hidden layer.');
    if (data === 'overlap') broken.push('Overlapping classes: some points sit on the wrong side of any line, so there is always a mistake to correct and the perceptron keeps hopping. A loss that weighs how wrong each point is (logistic regression) settles; the perceptron rule cannot.');
    if (!bias) broken.push(`No bias: b is stuck at 0, so the line must pass through the origin.${data === 'offset' ? ' These classes are separable, but only by a line that misses the origin — so it never converges.' : ''}`);
    const repair = () => { setData(LAB_DEFAULTS.data); setLogEta(LAB_DEFAULTS.logEta); setBias(true); setExtra([]); };

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h2 className="text-white font-semibold">A perceptron learning {data === 'xor' ? 'XOR' : `${pts.length} points`}</h2>
                    <SourceChip kind="live">Trained live in your browser · same seed, same run</SourceChip>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div>
                        <PerceptronPlane pts={pts} w={w} b={b} focus={st.done ? undefined : st.k} arrow onAdd={(x, y) => setExtra(e => [...e, { x, y }])} />
                        <p className="text-[11px] text-slate-500 mt-1.5">Click to add an orange point, shift-click for blue. A dashed red ring marks a point on the wrong side; the yellow ring is the next point to visit.</p>
                    </div>
                    <div className="space-y-3 min-w-0">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {[['epoch', st.done ? st.epoch - 1 : st.epoch], ['wrong now', wrongNow], ['status', converged ? 'converged' : st.done ? 'gave up' : 'learning']].map(([k, v]) => (
                                <div key={k} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
                                    <div className={`font-mono text-sm tabular-nums ${k === 'status' ? (converged ? 'text-emerald-300' : st.done ? 'text-rose-300' : 'text-slate-100') : 'text-slate-100'}`}>{v}</div>
                                </div>
                            ))}
                        </div>
                        <TrainingCurve xLabel="epoch" series={[{ name: 'mistakes per epoch', color: '#fb923c', points: epochs.map(h => ({ x: h.epoch, y: h.mistakes })) }]} />
                        <NeuronDiagram w={w} b={b} />
                        <div className="flex flex-wrap gap-1.5"><ShapeTag label="X" names={['n', 'features']} shape={[pts.length, 2]} /><ShapeTag label="w" shape={[2]} /></div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={trainer.toggle} disabled={st.done}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-40">
                                {trainer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{trainer.running ? 'Pause' : 'Train'}
                            </button>
                            <button onClick={() => trainer.stepOnce(1)} disabled={st.done} aria-label="Visit one point"
                                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                            <button onClick={() => trainer.stepOnce(pts.length)} disabled={st.done}
                                className="text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40">One epoch</button>
                            <button onClick={trainer.reset} aria-label="Reset the weights"
                                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                            <button onClick={() => { setSeed(randomSeed()); setExtra([]); }} aria-label="New data" title="New data"
                                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ParamSlider label="Learning rate η" value={logEta} onChange={setLogEta} min={-1.5} max={1} step={0.05} accent="orange"
                        format={() => eta.toFixed(eta < 1 ? 2 : 1)} hint="From w = 0, η only rescales w and b: the line, the mistakes and the epochs stay the same" />
                    <label className="block">
                        <span className="block text-sm font-medium text-slate-300 mb-1">Data</span>
                        <select value={data} onChange={e => { setData(e.target.value); setExtra([]); }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200">
                            <option value="separable">Separable</option>
                            <option value="offset">Separable, line away from the origin</option>
                            <option value="overlap">Overlapping</option>
                            <option value="xor">XOR</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="block text-sm font-medium text-slate-300 mb-1">Pace</span>
                        <select value={pace} onChange={e => setPace(Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200">
                            <option value={1}>One point a frame</option>
                            <option value={2}>Two points a frame</option>
                            <option value={10}>Ten points a frame</option>
                            <option value={LAB_N}>About an epoch a frame</option>
                        </select>
                    </label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => { setData('xor'); setExtra([]); }} disabled={data === 'xor'} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500 disabled:opacity-40">XOR</button>
                    <button onClick={() => { setData('overlap'); setExtra([]); }} disabled={data === 'overlap'} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500 disabled:opacity-40">Overlapping classes</button>
                    <button onClick={() => { setBias(false); setData('offset'); setExtra([]); }} disabled={!bias} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500 disabled:opacity-40">No bias term</button>
                    <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
                {broken.map(msg => <p key={msg} className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{msg}</p>)}
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function PerceptronPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const stepHistory = useMemo(() => generateSteps(seed), [seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [study, setStudy] = useState(null);
    useEffect(() => { const t = setTimeout(() => setStudy(marginStudy()), 80); return () => clearTimeout(t); }, []);

    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(Math.max(0, stepHistory.findIndex(s => s.act === act))); };
    const focusPt = step.focus !== undefined ? step.pts[step.focus] : null;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/neural-networks" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Neural Networks
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Perceptron</h1>
                    <p className="text-orange-100 max-w-3xl">
                        One artificial neuron: a weighted sum, a threshold, and a learning rule that only moves when it is wrong. Watch it find a line — and fail forever on XOR.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Logistic Regression', '/machine-learning/logistic-regression'], ['Dot Product', '/vectors/dot-product']].map(([name, href]) => (
                            <Link key={href} href={href} className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">{name}</Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                            {[['guided', 'Guided tour', Compass], ['train', 'Train it yourself', Dumbbell]].map(([key, label, Icon]) => (
                                <button key={key} role="tab" aria-selected={mode === key} onClick={() => { setMode(key); setIsPlaying(false); }}
                                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                    <Icon className="h-4 w-4" />{label}
                                </button>
                            ))}
                        </div>
                        {mode === 'guided' && <SourceChip kind="live">Every number computed in your browser</SourceChip>}
                    </div>

                    {mode === 'train' ? (
                        <TrainLab initialSeed={seed} />
                    ) : (
                        <>
                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="flex flex-wrap gap-1.5 px-4 pt-4" role="tablist" aria-label="Acts">
                                    {ACTS.map(act => {
                                        const Icon = act.icon;
                                        const tone = act.id === step.act
                                            ? 'bg-orange-500/20 text-orange-200 border-orange-500/50'
                                            : act.id < step.act ? 'bg-slate-800/60 text-slate-400 border-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300';
                                        return (
                                            <button key={act.id} role="tab" aria-selected={act.id === step.act} onClick={() => jumpToAct(act.id)}
                                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${tone}`}>
                                                <Icon className="h-3.5 w-3.5" />{act.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="h-0.5 bg-slate-800 mt-3">
                                    <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all" style={{ width: `${(currentStep / (stepHistory.length - 1)) * 100}%` }} />
                                </div>
                                <div className="p-4 sm:p-6 space-y-4">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}{step.epochEnd ? ` · after epoch ${step.epochEnd}` : ''}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                        <PerceptronPlane pts={step.pts} w={step.w} b={step.b} focus={step.focus} mm={step.mm} arrow={step.arrow || step.act >= 2} hideWrong={predict.pending} />
                                        <div className="space-y-3 min-w-0">
                                            <NeuronDiagram w={step.w} b={step.b} x={focusPt?.x} z={focusPt && !predict.pending ? zOf(step.w, step.b, focusPt.x) : undefined} />
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                {[['w₁', f(step.w[0])], ['w₂', f(step.w[1])], ['b', f(step.b)]].map(([k, v]) => (
                                                    <div key={k} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-1.5">
                                                        <div className="text-[10px] text-slate-500">{k}</div>
                                                        <div className="font-mono text-sm text-slate-100">{v}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5"><ShapeTag label="X" names={['n', 'features']} shape={[step.pts.length, 2]} /><ShapeTag label="w" shape={[2]} /></div>
                                            <p className="text-[11px] text-slate-500">
                                                {step.mm
                                                    ? 'White dashed: the perceptron’s line. Green dashed: the widest-margin line, with its margin edges.'
                                                    : predict.pending
                                                        ? 'Shaded: the side the perceptron calls orange. Yellow ring: the point being visited. The wrong-side markers are hidden until you answer.'
                                                        : 'Shaded: the side the perceptron calls orange. Dashed red ring: a point on the wrong side. Yellow ring: the point being visited.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                        <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                        <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-40">
                                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                        </button>
                                        <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New data" title="New data"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                                        <PredictToggle predict={predict} accent="orange" />
                                        <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                            Speed
                                            <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-orange-500" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {predict.prompt && <PredictPrompt predict={predict} accent="orange" />}

                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-orange-200 text-sm leading-relaxed">
                                        {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-slate-100 text-sm sm:text-base overflow-x-auto">
                                <Tex block>{formulaFor(step, predict.pending)}</Tex>
                            </div>
                        </>
                    )}

                    <InCode title="The same rule in NumPy" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The whole algorithm</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-slate-200 font-semibold">Score</span> — z = w·x + b; answer 1 if z ≥ 0.</li>
                            <li><span className="text-slate-200 font-semibold">Right?</span> — do nothing.</li>
                            <li><span className="text-slate-200 font-semibold">Wrong?</span> — w += η(y − ŷ)x, b += η(y − ŷ).</li>
                            <li><span className="text-slate-200 font-semibold">Repeat</span> — until an epoch with no mistakes, which comes only if a line can separate the classes.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;When the perceptron stops, it has found the best line.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            {study
                                ? <>It stops at the first line with no mistakes, wherever that is. On {study.runs} seeded separable sets of 20 points, its nearest point was a median {Math.round(study.median * 100)}% of the widest possible margin, and under half of it on {study.under50}. On 2,000 new points per set the widest-margin line scored {pct(study.accM)} against the perceptron&apos;s {pct(study.accP)}, better on {study.mmBetter} sets and worse on {study.mmWorse}. Support vector machines are the fix: they look for that widest line on purpose.</>
                                : `Measuring ${STUDY_RUNS} datasets…`}
                        </p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>
                </aside>
            </div>
        </div>
    );
}
