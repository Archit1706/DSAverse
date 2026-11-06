"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2, Shuffle,
    Ruler, Square, Zap, Anchor, Spline, Hash, Percent, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import Plane2D, { Point, Segment, FunctionPlot, Polygon, Label } from '@/components/math/Plane2D';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── data and the three fits ───────────────────────────────
   Ten points near a gentle line. One end point becomes an outlier. Each
   loss is minimised exactly, so the lines on screen are the true optima:
   squared loss by the normal equations; absolute loss by trying every line
   through two points (an absolute-loss optimum always passes through two);
   Huber by iteratively reweighted least squares, which only ever lowers
   its convex objective. */

const N = 10;
const DEFAULT_SEED = 8;
const STAGES = [1 / 3, 2 / 3, 1];
const OUTLIER_AT = 7.5;
const STUDY_LIFT = 3.4;
const DELTA = 1;
const Y_LIMIT = 3.8;
const CE_PROBS = [0.9, 0.5, 0.1, 0.01];
const SLOPE_OPTIONS = ['Slope increases', 'Slope decreases'];
const COST_OPTIONS = ['Squared loss: r²', 'Absolute loss: |r|'];

const ACTS = [
    { id: 1, label: 'Residuals', icon: Ruler },
    { id: 2, label: 'Squared', icon: Square },
    { id: 3, label: 'An outlier', icon: Zap },
    { id: 4, label: 'Absolute', icon: Anchor },
    { id: 5, label: 'Huber', icon: Spline },
    { id: 6, label: 'One number', icon: Hash },
    { id: 7, label: 'Classifiers', icon: Percent },
];

const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const fp = (v, d = 2) => (v < 0 ? `(${f(v, d)})` : f(v, d));
const tn = (v, d = 2) => f(v, d).replace('−', '-');
const pct = (v) => `${Math.round(v * 100)}%`;
const clampY = (y) => Math.max(-Y_LIMIT, Math.min(Y_LIMIT, y));

function makeData(seed) {
    const rng = createRng(seed);
    const pts = [];
    for (let i = 0; i < N; i++) {
        const x = Math.round((rng.next() * 7.6 - 3.8) * 10) / 10;
        pts.push([x, Math.round(clampY(0.3 * x + rng.normal(0, 0.8)) * 10) / 10]);
    }
    return pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

const huber = (r, delta) => (Math.abs(r) <= delta ? 0.5 * r * r : delta * (Math.abs(r) - 0.5 * delta));
/* per: a point's cost ℓ(r). pull: how hard it tugs the line, |ℓ′(r)|. A point
   lying exactly on the absolute-loss line has no derivative there and is
   drawn with no pull. */
const LOSSES = {
    mse: { name: 'Squared', per: (r) => r * r, pull: (r) => 2 * Math.abs(r) },
    mae: { name: 'Absolute', per: (r) => Math.abs(r), pull: (r) => (Math.abs(r) < 1e-9 ? 0 : 1) },
    huber: { name: 'Huber', per: huber, pull: (r, delta) => Math.min(Math.abs(r), delta) },
};
const residuals = (pts, line) => pts.map(([x, y]) => line.w * x + line.b - y);
const meanLoss = (pts, line, kind, delta = DELTA) => residuals(pts, line).reduce((s, r) => s + LOSSES[kind].per(r, delta), 0) / pts.length;

function median(values) {
    const v = [...values].sort((a, b) => a - b);
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Weighted least squares for a line; null when every weighted x is equal. */
function weightedLine(pts, weights) {
    let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(([x, y], i) => { const w = weights[i]; sw += w; sx += w * x; sy += w * y; sxx += w * x * x; sxy += w * x * y; });
    const det = sw * sxx - sx * sx;
    if (Math.abs(det) < 1e-12 * Math.max(1, sw * sxx)) return null;
    return { w: (sw * sxy - sx * sy) / det, b: (sxx * sy - sx * sxy) / det };
}

function fitSquared(pts) {
    return weightedLine(pts, pts.map(() => 1)) ?? { w: 0, b: pts.reduce((s, p) => s + p[1], 0) / pts.length };
}

function fitAbsolute(pts) {
    let best = null, bestLoss = Infinity;
    for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
            const [x1, y1] = pts[i], [x2, y2] = pts[j];
            if (Math.abs(x2 - x1) < 1e-12) continue;
            const w = (y2 - y1) / (x2 - x1);
            const line = { w, b: y1 - w * x1 };
            const loss = meanLoss(pts, line, 'mae');
            if (loss < bestLoss - 1e-12) { bestLoss = loss; best = { ...line, through: [i, j] }; }
        }
    }
    return best ?? { w: 0, b: median(pts.map(p => p[1])), through: [] };
}

/* IRLS gets close; then Newton steps on the piecewise-quadratic objective
   finish the job exactly: with the inside set A (|r| ≤ δ) and the signs s of
   the rest fixed, the optimum solves Σ_A rᵢ(xᵢ, 1) = −δ Σ_out sᵢ(xᵢ, 1). */
function fitHuber(pts, delta = DELTA) {
    const lossAt = (l) => residuals(pts, l).reduce((s, r) => s + huber(r, delta), 0);
    let line = fitSquared(pts);
    for (let it = 0; it < 300; it++) {
        const weights = residuals(pts, line).map(r => (Math.abs(r) <= delta ? 1 : delta / Math.abs(r)));
        const next = weightedLine(pts, weights);
        if (!next) break;
        const moved = Math.abs(next.w - line.w) + Math.abs(next.b - line.b);
        line = next;
        if (moved < 1e-13) break;
    }
    for (let it = 0; it < 30; it++) {
        const rs = residuals(pts, line);
        let n = 0, sx = 0, sxx = 0, sy = 0, sxy = 0, gx = 0, g1 = 0;
        pts.forEach(([x, y], i) => {
            if (Math.abs(rs[i]) <= delta) { n++; sx += x; sxx += x * x; sy += y; sxy += x * y; }
            else { const sgn = Math.sign(rs[i]); gx += delta * sgn * x; g1 += delta * sgn; }
        });
        const det = sxx * n - sx * sx;
        if (n < 2 || Math.abs(det) < 1e-12) break;
        const ax = sxy - gx, a1 = sy - g1;
        const next = { w: (n * ax - sx * a1) / det, b: (sxx * a1 - sx * ax) / det };
        if (lossAt(next) > lossAt(line) + 1e-15) break;
        const moved = Math.abs(next.w - line.w) + Math.abs(next.b - line.b);
        line = next;
        if (moved < 1e-15) break;
    }
    return line;
}

const fitAll = (pts, delta = DELTA) => ({ mse: fitSquared(pts), mae: fitAbsolute(pts), huber: fitHuber(pts, delta) });

/** One point's share of the total loss, or of the total pull on the line. */
function shareOf(pts, line, kind, index, delta = DELTA, measure = 'per') {
    const per = residuals(pts, line).map(r => LOSSES[kind][measure](r, delta));
    const total = per.reduce((s, v) => s + v, 0);
    return total > 0 ? per[index] / total : 0;
}

/* The plane leaves extra room on the side the outlier will jump to. */
const rangeFor = (dir) => (dir > 0 ? [-4, 8] : dir < 0 ? [-8, 4] : [-6, 6]);
const rangeOfPoints = (pts) => rangeFor(pts.some(p => p[1] > 4.2) ? 1 : pts.some(p => p[1] < -4.2) ? -1 : 0);

/** Lift one end point of many seeded datasets: how far does each fit's slope move? */
function outlierStudy(count = 300, seed = 41, lift = STUDY_LIFT) {
    const rng = createRng(seed);
    const sum = { mse: 0, mae: 0, huber: 0 };
    for (let k = 0; k < count; k++) {
        const pts = makeData(rng.int(1, 1e9));
        const end = rng.chance(0.5) ? pts.length - 1 : 0;
        const dir = rng.chance(0.5) ? 1 : -1;
        const before = fitAll(pts);
        const moved = pts.map((p, i) => (i === end ? [p[0], p[1] + dir * lift] : p));
        const after = fitAll(moved);
        for (const kind of Object.keys(sum)) sum[kind] += Math.abs(after[kind].w - before[kind].w);
    }
    return { count, lift, mse: sum.mse / count, mae: sum.mae / count, huber: sum.huber / count };
}

const generateSteps = (pts, seed) => {
    const steps = [];
    const rng = createRng(seed * 31 + 7);
    const end = rng.chance(0.5) ? pts.length - 1 : 0;
    const dir = rng.chance(0.5) ? 1 : -1;
    const yRange = rangeFor(dir);
    const s = (act, data) => steps.push({ act, actName: ACTS[act - 1].label, pts, show: [], yRange, ...data });
    const clean = fitAll(pts);
    const r0 = residuals(pts, clean.mse);

    s(1, {
        show: ['mse'], fits: clean, residuals: 'mse',
        explanation: `Ten points and a line. Each point's residual r = ŷ − y is how far the line misses it — the dashed red gaps, here from ${f(Math.min(...r0))} to ${f(Math.max(...r0))}. A loss function turns those ten residuals into one number, and training means finding the line with the smallest number. Which loss you pick decides which line counts as best.`,
    });
    s(2, {
        show: ['mse'], fits: clean, squares: true,
        explanation: `The squared loss charges r² for each point — literally the area of these squares. MSE = mean of the areas = ${f(meanLoss(pts, clean.mse, 'mse'), 3)}. The least-squares line (w = ${f(clean.mse.w, 3)}, b = ${f(clean.mse.b, 3)}) is the line whose squares have the smallest total area.`,
    });

    /* Which costs more: r² or |r|? Equal numbers of residuals below and
       above 1 (none within 0.1 of it), in a seeded order. */
    const low = [], high = [];
    r0.forEach((r, i) => { if (Math.abs(r) < 0.9) low.push(i); else if (Math.abs(r) > 1.1) high.push(i); });
    const k = Math.min(2, low.length, high.length);
    const picks = rng.shuffle([...rng.shuffle(low).slice(0, k), ...rng.shuffle(high).slice(0, k)]);
    for (const i of picks) {
        const r = r0[i];
        const sq = r * r, ab = Math.abs(r);
        s(2, {
            show: ['mse'], fits: clean, squares: true, highlight: i, curveMark: r, costQuestion: { index: i, r },
            costAnswer: sq > ab ? 0 : 1,
            explanation: `The point at x = ${f(pts[i][0], 1)} is ${f(ab)} from the line: r² = ${f(ab)}² = ${f(sq, 3)} and |r| = ${f(ab)}. ${sq > ab ? 'Above 1, squaring makes a residual cost more than its size' : 'Below 1, squaring makes a residual cost less than its size'} — the two curves cross at |r| = 1.`,
        });
    }
    s(2, {
        show: ['mse'], fits: clean, squares: true, curves: true,
        explanation: 'So the squared loss is lenient on small misses and harsh on big ones: a residual of 0.5 costs 0.25, a residual of 3 costs 9. That harshness is about to matter.',
    });

    /* An end point turns into an outlier. */
    const from = pts[end][1];
    const liftTo = (frac) => pts.map((p, i) => (i === end ? [p[0], Math.round((from + frac * (dir * OUTLIER_AT - from)) * 10) / 10] : p));
    s(3, {
        show: ['mse'], fits: clean, squares: true, highlight: end, outlier: end,
        explanation: `Now one reading goes wrong — a sensor glitch, a typo. Watch the point at x = ${f(pts[end][0], 1)}, the ${end === 0 ? 'leftmost' : 'rightmost'} one. It is about to jump ${dir > 0 ? 'up' : 'down'} to y = ${f(dir * OUTLIER_AT, 1)}, in three moves.`,
    });
    let prev = clean;
    let lastPts = pts;
    STAGES.forEach((frac, li) => {
        const moved = liftTo(frac);
        const fits = fitAll(moved);
        const share = shareOf(moved, fits.mse, 'mse', end);
        s(3, {
            pts: moved, show: ['mse'], fits, squares: true, highlight: end, outlier: end, firstLift: li === 0,
            slopeBefore: prev.mse.w, slopeMove: fits.mse.w > prev.mse.w ? 0 : 1, liftBy: moved[end][1] - lastPts[end][1],
            explanation: `The point moves ${dir > 0 ? 'up' : 'down'} to y = ${f(moved[end][1], 1)}. The least-squares line tilts ${fits.mse.w > prev.mse.w ? 'up' : 'down'} — slope ${f(prev.mse.w, 3)} → ${f(fits.mse.w, 3)} — to shrink that one square, even though it makes the other nine worse. That point is now ${pct(share)} of the whole squared loss.`,
        });
        prev = fits;
        lastPts = moved;
    });
    const dirty = prev;
    const dirtyPts = lastPts;
    const pullSq = shareOf(dirtyPts, dirty.mse, 'mse', end, DELTA, 'pull');
    const pullAbs = shareOf(dirtyPts, dirty.mae, 'mae', end, DELTA, 'pull');
    const rOut = residuals(dirtyPts, dirty.mse)[end];
    const [ti, tj] = dirty.mae.through;
    s(4, {
        pts: dirtyPts, show: ['mse', 'mae'], fits: dirty, outlier: end, residuals: 'mae', through: dirty.mae.through,
        explanation: `The absolute loss charges |r|: a miss twice as big costs twice as much, not four times. Its best line has slope ${f(dirty.mae.w, 3)} — against ${f(clean.mae.w, 3)} before the glitch — while the squared-loss slope went ${f(clean.mse.w, 3)} → ${f(dirty.mse.w, 3)}. It passes exactly through two of the points${ti !== undefined ? ` (x = ${f(dirtyPts[ti][0], 1)} and x = ${f(dirtyPts[tj][0], 1)})` : ''}, as an absolute-loss line always can.`,
    });
    s(4, {
        pts: dirtyPts, show: ['mse', 'mae'], fits: dirty, outlier: end, pulls: true,
        explanation: `Why? Each point tugs on the line with force |ℓ′(r)|. Under squared loss that is 2|r|, so the outlier, ${f(Math.abs(rOut))} away, pulls with ${f(2 * Math.abs(rOut))} — ${pct(pullSq)} of all the pull. Under absolute loss every point off the line pulls with force exactly 1, however far away it is: the outlier gets ${pct(pullAbs)}, one vote like the rest.`,
    });
    const soft = fitHuber(dirtyPts, 0.3), hard = fitHuber(dirtyPts, 5);
    s(5, {
        pts: dirtyPts, show: ['mse', 'mae', 'huber'], fits: dirty, outlier: end, curves: true, delta: DELTA,
        explanation: `Huber loss is squared for small residuals (|r| ≤ δ) and absolute beyond, so ordinary points are fitted like least squares while the outlier is only charged linearly. With δ = ${DELTA}: slope ${f(dirty.huber.w, 3)}, between the absolute line's ${f(dirty.mae.w, 3)} and the squared line's ${f(dirty.mse.w, 3)}.`,
    });
    s(5, {
        pts: dirtyPts, show: ['mse', 'mae', 'huber'], fits: { ...dirty, huber: soft }, outlier: end, curves: true, delta: 0.3,
        explanation: `δ is a dial. Shrink it to 0.3 and almost every residual is in the absolute zone: slope ${f(soft.w, 3)}, close to the absolute line. Grow it to 5 and every residual is in the squared zone: slope ${f(hard.w, 3)}, the least-squares line exactly${Math.abs(hard.w - dirty.mse.w) < 1e-9 ? '' : ' (almost)'}.`,
    });

    const ys = dirtyPts.map(p => p[1]);
    const cleanMean = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
    const mean = ys.reduce((sum, y) => sum + y, 0) / ys.length;
    const med = median(ys), cleanMed = median(pts.map(p => p[1]));
    s(6, {
        pts: dirtyPts, outlier: end, constant: { mean, median: med },
        explanation: `The simplest model of all predicts one number c for every point. The best c under squared loss is the mean of y, ${f(mean, 3)}; under absolute loss it is the median, ${f(med, 3)}. The glitch moved the mean by ${f(Math.abs(mean - cleanMean), 3)} and the median by ${f(Math.abs(med - cleanMed), 3)} — and however much further the point goes, the mean follows it while the median cannot pass the neighbouring values. Choosing a loss is choosing what “typical” means.`,
    });

    CE_PROBS.forEach((p, i) => {
        s(7, {
            ce: p,
            explanation: i === 0
                ? `Classifiers output a probability, so they need a different loss. If the model gives the true class probability p = ${p}, cross-entropy charges −ln p = ${f(-Math.log(p), 3)}; the squared error (1 − p)² would be ${f((1 - p) ** 2, 3)}.`
                : i === CE_PROBS.length - 1
                    ? `p = ${p}: a confident wrong answer. Cross-entropy charges ${f(-Math.log(p), 3)} and keeps climbing towards infinity as p → 0; the squared error can never exceed 1 (here ${f((1 - p) ** 2, 4)}). Its gradient there is ${f(-1 / p, 0)} against ${f(-2 * (1 - p), 2)} — cross-entropy pushes hardest exactly when the model is most wrong.`
                    : `p = ${p}: cross-entropy ${f(-Math.log(p), 3)}, squared error ${f((1 - p) ** 2, 3)}.`,
        });
    });
    s(7, {
        ce: 0.8, done: true,
        explanation: 'Switch to Explore: drag any point, throw one far away, turn the Huber dial, and slide a classifier from confident-and-right to confident-and-wrong.',
    });
    return steps;
};

/* ── predict ───────────────────────────────────────────────
   Two questions, both answerable from the screen. Before each highlighted
   residual: which loss charges it more? (The tour asks about as many
   residuals under 1 as over it.) And before the outlier's first jump:
   which way does the least-squares slope turn? Which end jumps, and which
   way, are seeded. */
const predictFor = (step, next) => {
    if (!next) return null;
    if (next.costQuestion) {
        const { index, r } = next.costQuestion;
        return {
            question: `The point at x = ${f(next.pts[index][0], 1)} is ${f(Math.abs(r))} from the line. Which loss charges it more?`,
            options: COST_OPTIONS,
            correct: next.costAnswer,
            because: `r² = ${f(r * r, 3)} and |r| = ${f(Math.abs(r))}. Squaring a number above 1 makes it bigger; squaring one below 1 makes it smaller.`,
        };
    }
    if (next.firstLift) {
        const i = next.outlier;
        return {
            question: `The ${i === 0 ? 'leftmost' : 'rightmost'} point jumps ${next.liftBy > 0 ? 'up' : 'down'} by ${f(Math.abs(next.liftBy), 1)}. What happens to the least-squares line's slope?`,
            options: SLOPE_OPTIONS,
            correct: next.slopeMove,
            because: `The line turns towards the point. A ${i === 0 ? 'left' : 'right'}-end point moving ${next.liftBy > 0 ? 'up' : 'down'} pulls the slope ${next.slopeMove === 0 ? 'up' : 'down'}: ${f(next.slopeBefore, 3)} → ${f(next.fits.mse.w, 3)}.`,
        };
    }
    return null;
};

/** The formula for the step on screen, with its live values. */
function formulaFor(step) {
    const n = step.pts.length;
    if (step.act === 7) {
        const p = step.ce;
        return String.raw`\text{CE} = -\ln p = -\ln ${p} = ${tn(-Math.log(p), 3)}, \qquad (1 - p)^2 = ${tn((1 - p) ** 2, 4)}`;
    }
    if (step.constant) return String.raw`\arg\min_c \tfrac1n\textstyle\sum (c - y_i)^2 = \bar y = ${tn(step.constant.mean, 3)}, \qquad \arg\min_c \tfrac1n\sum |c - y_i| = \operatorname{median}(y) = ${tn(step.constant.median, 3)}`;
    const { fits } = step;
    if (step.costQuestion) {
        const r = step.costQuestion.r;
        return String.raw`r^2 = ${tn(Math.abs(r))}^2 = ${tn(r * r, 3)} \quad\text{vs}\quad |r| = ${tn(Math.abs(r))}`;
    }
    if (step.act === 5) {
        const d = step.delta;
        return String.raw`\ell_\delta(r) = \begin{cases} \tfrac12 r^2 & |r| \le \delta \\ \delta\,(|r| - \tfrac12\delta) & |r| > \delta \end{cases}, \quad \delta = ${d}, \quad \tfrac1n\textstyle\sum \ell_\delta(r_i) = ${tn(meanLoss(step.pts, fits.huber, 'huber', d), 4)}`;
    }
    if (step.act === 4) return String.raw`\text{MAE} = \tfrac{1}{${n}}\textstyle\sum |r_i| = ${tn(meanLoss(step.pts, fits.mae, 'mae'), 4)} \quad (w = ${tn(fits.mae.w, 3)}), \qquad \text{MSE} = ${tn(meanLoss(step.pts, fits.mse, 'mse'), 4)} \quad (w = ${tn(fits.mse.w, 3)})`;
    return String.raw`\text{MSE} = \tfrac{1}{${n}}\textstyle\sum_{i=1}^{${n}} r_i^2 = ${tn(meanLoss(step.pts, fits.mse, 'mse'), 4)}, \quad r_i = (${tn(fits.mse.w, 3)})\,x_i ${fits.mse.b < 0 ? '-' : '+'} ${tn(Math.abs(fits.mse.b), 3)} - y_i`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'One data point is a wild outlier. Which loss’s best-fit line moves the most towards it?',
        options: ['Absolute loss (MAE)', 'Squared loss (MSE)', 'Huber loss with a small δ', 'They all move the same amount'],
        correct: 1,
        explanation: 'Squared loss charges r², so the outlier’s cost grows with the square of its distance and the fit bends to shrink it. Absolute loss charges |r| and barely moves; Huber with a small δ behaves like absolute loss.',
    },
    {
        question: 'A model must predict one constant c for every example. Which c minimises the mean absolute error?',
        options: ['The mean of y', 'The median of y', 'The mode of y', 'Halfway between the smallest and largest y'],
        correct: 1,
        explanation: 'Moving c past a point changes the absolute loss at the same rate whichever point it is, so the optimum balances equal numbers of points on each side: the median. Squared loss gives the mean instead.',
    },
    {
        question: 'A classifier gives the true class probability p = 0.01. Why do classifiers use cross-entropy −ln p rather than (1 − p)²?',
        options: [
            'Cross-entropy is always smaller, so training is faster',
            'Cross-entropy charges about 4.6 and keeps growing as p → 0, so a confident wrong answer is punished hard; (1 − p)² can never exceed 1',
            'Squared error cannot be computed for probabilities',
            'They give identical gradients, cross-entropy is just a convention',
        ],
        correct: 1,
        explanation: '−ln 0.01 ≈ 4.61 and the cost is unbounded; (1 − 0.01)² ≈ 0.98 and can never pass 1. Cross-entropy’s gradient −1/p is also largest exactly when the model is confidently wrong.',
    },
];

const codeExample = `import torch
import torch.nn as nn

r = torch.tensor([0.5, -1.5, 3.0])        # residuals: prediction − target
zero = torch.zeros(3)
print(nn.MSELoss()(r, zero))              # mean r²            → 3.8333
print(nn.L1Loss()(r, zero))               # mean |r|           → 1.6667
print(nn.HuberLoss(delta=1.0)(r, zero))   # ½r² or δ(|r| − ½δ) → 1.2083

logits = torch.tensor([[2.0, 0.5, -1.0]]) # a classifier's scores, true class 0
print(nn.CrossEntropyLoss()(logits, torch.tensor([0])))   # −ln softmax → 0.2413`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the outlier and classifier acts, then retry.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-lime-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── pictures ───────────────────────────────────────────── */

/* SVG coordinates are rounded so the server and the browser print the same attributes. */
const r2 = (v) => Math.round(v * 100) / 100;
const COLORS = { mse: '#a3e635', mae: '#38bdf8', huber: '#e879f9', data: '#e2e8f0', outlier: '#fb923c', resid: '#fb7185' };

function FitPlane({ pts, fits, show, squares, residualsOf, highlight, outlier, through = [], constant, onDrag, yRange = [-6, 6] }) {
    const sq = squares && fits?.mse ? residuals(pts, fits.mse) : null;
    const rs = residualsOf && fits?.[residualsOf] ? residuals(pts, fits[residualsOf]) : null;
    return (
        <Plane2D xRange={[-5, 5]} yRange={yRange} grid={1} ariaLabel="The points and the best line under each loss">
            {sq && pts.map(([x, y], i) => {
                const yhat = y + sq[i];
                const side = Math.abs(sq[i]);
                const dx = x + side > 4.9 ? -side : side;
                return <Polygon key={`s${i}`} points={[[x, y], [x + dx, y], [x + dx, yhat], [x, yhat]]} fill={COLORS.mse} fillOpacity={i === highlight ? 0.35 : 0.12} strokeWidth={1} />;
            })}
            {rs && pts.map(([x, y], i) => <Segment key={`r${i}`} from={[x, y]} to={[x, y + rs[i]]} color={COLORS.resid} width={1.5} dashed />)}
            {constant && <FunctionPlot f={() => constant.mean} color={COLORS.mse} width={2.5} />}
            {constant && <FunctionPlot f={() => constant.median} color={COLORS.mae} width={2.5} dashed />}
            {fits && show.map(kind => (
                <FunctionPlot key={kind} f={(x) => fits[kind].w * x + fits[kind].b} color={COLORS[kind]} width={kind === 'mse' ? 3 : 2.5} dashed={kind === 'huber'} />
            ))}
            {pts.map(([x, y], i) => (
                <Point key={i} at={[x, y]} r={i === highlight || i === outlier ? 7 : 5.5} snap={0.1}
                    color={i === outlier ? COLORS.outlier : through.includes(i) ? COLORS.mae : COLORS.data}
                    onDrag={onDrag ? (p) => onDrag(i, p) : undefined} ariaLabel={`Drag point ${i + 1}, at (${x}, ${y})`} />
            ))}
        </Plane2D>
    );
}

/* Per-residual cost of each loss, with the current residuals marked on
   every curve. */
function LossCurves({ marks = [], delta = DELTA, showHuber, highlight }) {
    return (
        <Plane2D xRange={[-3.5, 3.5]} yRange={[-0.6, 5.4]} grid={1} ariaLabel="Cost of one residual under each loss">
            {showHuber && [-delta, delta].map(d => <Segment key={d} from={[d, -0.6]} to={[d, 5.4]} color={COLORS.huber} width={1} dashed opacity={0.5} />)}
            <FunctionPlot f={(r) => r * r} color={COLORS.mse} width={2.5} />
            <FunctionPlot f={(r) => Math.abs(r)} color={COLORS.mae} width={2.5} />
            {showHuber && <FunctionPlot f={(r) => huber(r, delta)} color={COLORS.huber} width={2.5} dashed />}
            {marks.map((r, i) => (
                <React.Fragment key={i}>
                    {Math.abs(r) < 3.5 && r * r < 5.4 && <Point at={[r, r * r]} color={COLORS.mse} r={i === highlight ? 6 : 3.5} />}
                    {Math.abs(r) < 3.5 && <Point at={[r, Math.abs(r)]} color={COLORS.mae} r={i === highlight ? 6 : 3.5} />}
                </React.Fragment>
            ))}
            <Label at={[2.25, 5]} color={COLORS.mse} size={12}>r²</Label>
            <Label at={[2.6, 2.1]} color={COLORS.mae} size={12}>|r|</Label>
            <Label at={[0.05, -0.35]} color="#64748b" size={11}>residual r</Label>
        </Plane2D>
    );
}

/* Cross-entropy and squared error against the probability of the true
   class. Plane2D keeps equal units, which a [0, 1] × [0, 5] chart cannot
   use, so this one is a plain SVG. */
function CePanel({ p }) {
    const W = 360, H = 200, L = 34, B = 24;
    const sx = (v) => L + v * (W - L - 8), sy = (v) => H - B - (Math.min(v, 5) / 5) * (H - B - 8);
    const path = (fn) => Array.from({ length: 200 }, (_, i) => { const q = 0.002 + (i / 199) * 0.998; return `${i ? 'L' : 'M'}${sx(q).toFixed(2)},${sy(fn(q)).toFixed(2)}`; }).join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cross-entropy and squared error against the probability of the true class">
            {[0, 1, 2, 3, 4, 5].map(v => (
                <g key={v}><line x1={L} x2={W - 8} y1={sy(v)} y2={sy(v)} stroke="#1e293b" /><text x={L - 6} y={sy(v) + 4} fontSize="10" textAnchor="end" fill="#64748b">{v}</text></g>
            ))}
            {[0, 0.25, 0.5, 0.75, 1].map(v => <text key={v} x={sx(v)} y={H - 8} fontSize="10" textAnchor="middle" fill="#64748b">{v}</text>)}
            <path d={path(q => -Math.log(q))} fill="none" stroke={COLORS.huber} strokeWidth="2.5" />
            <path d={path(q => (1 - q) ** 2)} fill="none" stroke={COLORS.mse} strokeWidth="2.5" />
            <line x1={r2(sx(p))} x2={r2(sx(p))} y1={8} y2={H - B} stroke="#64748b" strokeDasharray="4 3" />
            <circle cx={r2(sx(p))} cy={r2(sy(-Math.log(p)))} r="5" fill={COLORS.huber} />
            <circle cx={r2(sx(p))} cy={r2(sy((1 - p) ** 2))} r="5" fill={COLORS.mse} />
            <text x={W - 10} y={H - B - 6} fontSize="10" textAnchor="end" fill="#94a3b8">probability of the true class p</text>
            <text x={sx(0.06)} y={20} fontSize="11" fill={COLORS.huber}>−ln p</text>
            <text x={sx(0.06)} y={sy(1) - 6} fontSize="11" fill={COLORS.mse}>(1 − p)²</text>
        </svg>
    );
}

/* How hard each point tugs on its loss's best line: |ℓ′(r)|, as shares. */
function PullBars({ pts, fits, outlier, delta = DELTA }) {
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400"><span>Each point&apos;s pull on the line, |ℓ′(r)|</span><ShapeTag label="r" names={['n']} shape={[pts.length]} /></div>
            {['mse', 'mae', 'huber'].map(kind => {
                const per = residuals(pts, fits[kind]).map(r => LOSSES[kind].pull(r, delta));
                const total = per.reduce((s, v) => s + v, 0) || 1;
                return (
                    <div key={kind} className="flex items-center gap-2">
                        <span className="w-16 text-xs font-semibold" style={{ color: COLORS[kind] }}>{LOSSES[kind].name}</span>
                        <div className="flex-1 flex h-4 rounded overflow-hidden bg-slate-800">
                            {per.map((v, i) => (
                                <div key={i} title={`point ${i + 1}: ${pct(v / total)}`} style={{ width: `${r2((v / total) * 100)}%`, background: i === outlier ? COLORS.outlier : COLORS[kind], opacity: i === outlier ? 1 : 0.35 + (i % 2) * 0.25 }} />
                            ))}
                        </div>
                        <span className="w-10 text-right font-mono text-xs text-slate-300 tabular-nums">{outlier !== undefined && outlier !== null ? pct(per[outlier] / total) : ''}</span>
                    </div>
                );
            })}
        </div>
    );
}

/* ── explore ────────────────────────────────────────────── */

function Explore({ initialPts }) {
    const [pts, setPts] = useState(initialPts);
    const [yRange] = useState(() => rangeOfPoints(initialPts));
    const [delta, setDelta] = useState(DELTA);
    const [p, setP] = useState(0.8);
    const fits = useMemo(() => fitAll(pts, delta), [pts, delta]);
    const [watch, setWatch] = useState(pts.length - 1);
    const drag = (i, [x, y]) => { setWatch(i); setPts(old => old.map((q, k) => (k === i ? [x, y] : q))); };
    const repair = () => { setPts(initialPts); setDelta(DELTA); setP(0.8); setWatch(initialPts.length - 1); };
    const throwFar = () => {
        setWatch(pts.length - 1);
        const far = yRange[1] > 6 ? OUTLIER_AT : yRange[0] < -6 ? -OUTLIER_AT : null;
        setPts(old => old.map((q, k) => (k === old.length - 1 ? [q[0], far ?? (q[1] > 0 ? -5.8 : 5.8)] : q)));
    };
    const rs = residuals(pts, fits.mse);
    const share = shareOf(pts, fits.mse, 'mse', watch, delta, 'pull');
    const notes = [];
    const rw = rs[watch];
    if (Math.abs(rw) > 3) notes.push(`The orange point is ${f(Math.abs(rw))} from the least-squares line and pulls it with force 2|r| = ${f(2 * Math.abs(rw))} — ${pct(share)} of all the pull from ten points — so that line has tilted to slope ${f(fits.mse.w, 3)}. Under absolute loss it pulls with force 1 like every other point, and that line holds at ${f(fits.mae.w, 3)}.`);
    if (p < 0.02) notes.push(`A classifier ${f((1 - p) * 100, 1)}% sure of the wrong class: cross-entropy charges ${f(-Math.log(p), 2)} and its gradient is ${f(-1 / p, 0)}. Squared error says ${f((1 - p) ** 2, 3)} — it barely notices the difference between bad and catastrophic.`);

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="min-w-0">
                        <FitPlane pts={pts} fits={fits} show={['mse', 'mae', 'huber']} outlier={watch} onDrag={drag} yRange={yRange} />
                        <p className="text-[11px] text-slate-500 mt-1.5">Drag any point; the orange one is the last you moved.</p>
                    </div>
                    <div className="min-w-0 space-y-3">
                        <LossCurves marks={rs} delta={delta} showHuber highlight={watch} />
                        <ParamSlider label="Huber δ" value={delta} onChange={setDelta} min={0.1} max={5} step={0.1} accent="lime" format={(v) => f(v, 1)}
                            hint="Small δ: like absolute loss. Large δ: like squared loss." />
                    </div>
                </div>
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                        <thead><tr className="text-xs text-slate-500 text-left"><th className="py-1 pr-3 font-medium">Loss</th><th className="pr-3 font-medium">Slope w</th><th className="pr-3 font-medium">Intercept b</th><th className="font-medium">Mean loss</th></tr></thead>
                        <tbody className="font-mono tabular-nums">
                            {['mse', 'mae', 'huber'].map(kind => (
                                <tr key={kind} className="border-t border-slate-800">
                                    <td className="py-1.5 pr-3 font-sans font-semibold" style={{ color: COLORS[kind] }}>{LOSSES[kind].name}{kind === 'huber' ? ` (δ = ${f(delta, 1)})` : ''}</td>
                                    <td className="pr-3 text-slate-200">{f(fits[kind].w, 3)}</td>
                                    <td className="pr-3 text-slate-200">{f(fits[kind].b, 3)}</td>
                                    <td className="text-slate-200">{f(meanLoss(pts, fits[kind], kind, delta), 4)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4"><PullBars pts={pts} fits={fits} outlier={watch} delta={delta} /></div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <CePanel p={p} />
                    <div className="space-y-3">
                        <ParamSlider label="Probability of the true class p" value={Math.log10(p)} onChange={(v) => setP(10 ** v)} min={-3} max={Math.log10(0.999)} step={0.01} accent="lime"
                            format={() => (p < 0.01 ? p.toFixed(4) : f(p, 3))} hint="Log scale, so the confident-and-wrong end gets room." />
                        <div className="text-slate-100 text-sm"><Tex block>{String.raw`-\ln ${p < 0.01 ? p.toFixed(4) : tn(p, 3)} = ${tn(-Math.log(p), 3)}, \quad (1 - p)^2 = ${tn((1 - p) ** 2, 4)}`}</Tex></div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={throwFar} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500">Throw the last point far off</button>
                    <button onClick={() => setP(0.002)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500">A confidently wrong classifier</button>
                    <button onClick={() => setPts(makeData(randomSeed()))} aria-label="New points" title="New points"
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                    <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
                {notes.map(msg => <p key={msg} className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{msg}</p>)}
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function LossFunctionsPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const pts = useMemo(() => makeData(seed), [seed]);
    const stepHistory = useMemo(() => generateSteps(pts, seed), [pts, seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [explore, setExplore] = useState({ pts, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const study = useMemo(() => outlierStudy(), []);

    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(stepHistory.findIndex(s => s.act === act)); };
    const toExplore = (nextPts = step.pts) => {
        setExplore(e => ({ pts: nextPts, key: e.key + 1 }));
        setMode('explore');
        setIsPlaying(false);
    };
    const dragInTour = (i, q) => toExplore(step.pts.map((r, k) => (k === i ? q : r)));
    const marks = step.fits && !step.constant ? residuals(step.pts, step.fits[step.show.includes('mae') && !step.show.includes('huber') ? 'mae' : 'mse']) : [];

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/machine-learning" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Machine Learning
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Loss Functions</h1>
                    <p className="text-lime-50 max-w-3xl">
                        The loss decides what &ldquo;good&rdquo; means. Same points, three losses, three different best lines — and a separate loss for classifiers that never lets confident mistakes off lightly.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/80">Builds on</span>
                        {[['Linear Regression', '/machine-learning/linear-regression'], ['What Is Machine Learning?', '/machine-learning/what-is-machine-learning']].map(([name, href]) => (
                            <Link key={href} href={href} className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">{name}</Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                            {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                <button key={key} role="tab" aria-selected={mode === key}
                                    onClick={() => { if (key === 'explore') toExplore(); else { setMode('guided'); setIsPlaying(false); } }}
                                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-lime-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                    <Icon className="h-4 w-4" />{label}
                                </button>
                            ))}
                        </div>
                        <SourceChip kind="live">Every fit solved exactly in your browser · seeded example points</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={explore.key} initialPts={explore.pts} />
                    ) : (
                        <>
                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="flex flex-wrap gap-1.5 px-4 pt-4" role="tablist" aria-label="Acts">
                                    {ACTS.map(act => {
                                        const Icon = act.icon;
                                        const tone = act.id === step.act
                                            ? 'bg-lime-500/20 text-lime-200 border-lime-500/50'
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
                                    <div className="h-full bg-gradient-to-r from-lime-500 to-green-500 transition-all" style={{ width: `${(currentStep / (stepHistory.length - 1)) * 100}%` }} />
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    {step.ce !== undefined ? (
                                        <div className="max-w-xl mx-auto"><CePanel p={step.ce} /></div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="min-w-0">
                                                <FitPlane pts={step.pts} fits={step.fits} show={step.show} squares={step.squares} residualsOf={step.residuals}
                                                    highlight={step.highlight} outlier={step.outlier} through={step.through} constant={step.constant} onDrag={dragInTour} yRange={step.yRange} />
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1.5">
                                                    {(step.constant ? [['mse', 'mean (squared)'], ['mae', 'median (absolute)']] : step.show.map(k => [k, LOSSES[k].name])).map(([k, label]) => (
                                                        <span key={k} className="flex items-center gap-1"><span className="inline-block w-3 h-0.5" style={{ background: COLORS[k] }} />{label}</span>
                                                    ))}
                                                    <span>· grab a point to take over</span>
                                                </div>
                                            </div>
                                            <div className="min-w-0 space-y-3">
                                                {step.pulls
                                                    ? <PullBars pts={step.pts} fits={step.fits} outlier={step.outlier} />
                                                    : <LossCurves marks={marks} delta={step.delta ?? DELTA} showHuber={step.act === 5} highlight={step.highlight} />}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 mt-4">
                                        <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                        <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                        <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500 disabled:opacity-40">
                                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                        </button>
                                        <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New points" title="New points"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                                        <PredictToggle predict={predict} accent="lime" />
                                        <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                            Speed
                                            <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-lime-500" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {predict.prompt && <PredictPrompt predict={predict} accent="lime" />}

                            <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-lime-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-lime-200 text-sm leading-relaxed">
                                        {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-slate-100 text-sm sm:text-base">
                                <Tex block>{formulaFor(step)}</Tex>
                            </div>
                        </>
                    )}

                    <InCode title="The same losses in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Four losses</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="font-semibold" style={{ color: COLORS.mse }}>Squared (MSE)</span> — mean r². Smooth and easy to solve; one big miss dominates.</li>
                            <li><span className="font-semibold" style={{ color: COLORS.mae }}>Absolute (MAE)</span> — mean |r|. Robust to outliers; its best constant is the median.</li>
                            <li><span className="font-semibold" style={{ color: COLORS.huber }}>Huber</span> — squared inside δ, absolute outside. The usual compromise.</li>
                            <li><span className="font-semibold text-slate-200">Cross-entropy</span> — −ln p of the true class. The loss for classifiers.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;The loss is just a scoreboard — any sensible one finds the same best line.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            The loss is the definition of best. This page built {study.count} seeded datasets like the tour&apos;s and moved one end point by {f(study.lift, 1)}. On average the squared-loss slope moved by {f(study.mse, 3)}, the Huber slope by {f(study.huber, 3)} and the absolute-loss slope by {f(study.mae, 3)}: same points, three different answers.
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
