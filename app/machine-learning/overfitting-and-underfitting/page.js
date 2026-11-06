"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2, Shuffle,
    Database, SlidersHorizontal, ChartLine, Weight, Layers, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { fitPolynomial, evalPoly, polyMse as mse } from '@/lib/ml/polyfit';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── data and polynomial fits ──────────────────────────────
   Twelve noisy training points and thirty validation points from the same
   hidden curve. A degree-d polynomial has d + 1 coefficients; it is fitted
   by minimising MSE + λ·Σ_{k≥1} c_k² (the constant term is not penalised)
   with lib/ml/polyfit, which solves it by Householder QR. */

const N_TRAIN = 12;
const N_VAL = 30;
const MAX_DEG = 11;
const NOISE = 0.25;
const DEFAULT_SEED = 4;
const LAMBDAS = [1e-6, 1e-4, 1e-2, 1];
const BV_SETS = 20;
const BV_DEGREES = [0, 1, 3, 6, 11];
const CLEAR_RATIO = 3;
const ASK_PER_SIDE = 2;
const BV_OPTIONS = ['Bias²: the average misses the true curve', 'Variance: the fits disagree with each other'];

const ACTS = [
    { id: 1, label: 'The data', icon: Database },
    { id: 2, label: 'More flexible', icon: SlidersHorizontal },
    { id: 3, label: 'The U', icon: ChartLine },
    { id: 4, label: 'Penalty', icon: Weight },
    { id: 5, label: 'Bias and variance', icon: Layers },
];

const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const tn = (v, d = 2) => f(v, d).replace('−', '-');
/** Errors span six orders of magnitude here, so print them by significance. */
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const sup = (n) => [...String(n)].map(ch => SUP[ch]).join('');
const fe = (v) => {
    if (v === 0) return '0';
    if (v >= 100) return f(v, 0);
    if (v >= 0.001) return f(v, Math.max(0, 2 - Math.floor(Math.log10(v))));
    const [mant, exp] = v.toExponential(1).split('e');
    return `${mant} × 10${sup(Number(exp))}`;
};
const lam = (v) => (v >= 0.01 ? String(v) : `10${sup(Math.round(Math.log10(v)))}`);
const r2d = (v) => Math.round(v * 100) / 100;

const truth = (x) => 0.8 * Math.sin(2.6 * x) + 0.25 * x;

/* Training x sit on a jittered grid with the ends pinned at ±1, so no two
   points crowd together and validation never asks for extrapolation; the
   validation x are uniform on the same interval. */
function makeSample(rng, n, grid) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const base = -1 + (2 * i) / (n - 1);
        const x = !grid ? r2d(rng.next() * 2 - 1) : i === 0 || i === n - 1 ? base : r2d(base + (rng.next() - 0.5) * (0.8 / (n - 1)));
        pts.push([x, r2d(truth(x) + rng.normal(0, NOISE))]);
    }
    return pts.sort((a, b) => a[0] - b[0]);
}
function makeData(seed, nTrain = N_TRAIN) {
    const rng = createRng(seed);
    return { train: makeSample(rng, nTrain, true), val: makeSample(rng, N_VAL, false) };
}

/* With fewer points than coefficients there are infinitely many exact fits;
   a whisper of penalty (10⁻¹⁰) picks the one with the smallest coefficients. */
const effectiveLambda = (n, d, lambda) => (n < d + 1 ? Math.max(lambda, 1e-10) : lambda);

const fitPoly = (pts, d, lambda = 0) => fitPolynomial(pts, d, effectiveLambda(pts.length, d, lambda));
const coefNorm = (c) => Math.sqrt(c.slice(1).reduce((s, v) => s + v * v, 0));

function sweep(data, lambda = 0) {
    return Array.from({ length: MAX_DEG + 1 }, (_, d) => {
        const c = fitPoly(data.train, d, lambda);
        return { d, c, train: mse(c, data.train), val: mse(c, data.val) };
    });
}

/** Refit one degree on many fresh training sets and measure, on a grid of x:
    bias² (how far the average fit is from the truth), variance (how far the
    fits are from their average) and the average squared miss, which is
    exactly their sum. */
function biasVariance(seed, d, sets = BV_SETS, lambda = 0) {
    const rng = createRng(seed * 101 + 9);
    const grid = Array.from({ length: 41 }, (_, i) => -1 + i / 20);
    const fits = [];
    for (let s = 0; s < sets; s++) fits.push(fitPoly(makeSample(rng, N_TRAIN, true), d, lambda));
    const mean = fits[0].map((_, k) => fits.reduce((a, c) => a + c[k], 0) / sets);
    let bias2 = 0, variance = 0, miss = 0;
    for (const x of grid) {
        const preds = fits.map(c => evalPoly(c, x));
        const avg = preds.reduce((a, b) => a + b, 0) / sets;
        bias2 += (avg - truth(x)) ** 2;
        variance += preds.reduce((a, p) => a + (p - avg) ** 2, 0) / sets;
        miss += preds.reduce((a, p) => a + (p - truth(x)) ** 2, 0) / sets;
    }
    const g = grid.length;
    return { fits, mean, bias2: bias2 / g, variance: variance / g, miss: miss / g };
}
const bvSide = (bv) => (bv.bias2 > bv.variance ? 0 : 1);
const bvClear = (bv) => Math.max(bv.bias2, bv.variance) >= CLEAR_RATIO * Math.min(bv.bias2, bv.variance);

/** Degree 11 on many datasets: a perfect training fit, and what it costs on validation. */
function perfectFitStudy(count = 200, seed = 61) {
    const rng = createRng(seed);
    const ratios = [];
    let worstTrain = 0;
    for (let k = 0; k < count; k++) {
        const data = makeData(rng.int(1, 1e9));
        const c11 = fitPoly(data.train, MAX_DEG), c3 = fitPoly(data.train, 3);
        worstTrain = Math.max(worstTrain, mse(c11, data.train));
        ratios.push(mse(c11, data.val) / mse(c3, data.val));
    }
    ratios.sort((a, b) => a - b);
    return { count, worstTrain, median: ratios[count >> 1], worse: ratios.filter(r => r > 1).length / count };
}

const generateSteps = (data, seed) => {
    const steps = [];
    const s = (act, extra) => steps.push({ act, actName: ACTS[act - 1].label, data, lambda: 0, ...extra });
    const rng = createRng(seed * 13 + 3);
    const rows = sweep(data);
    const best = rows.reduce((a, r) => (r.val < a.val ? r : a), rows[0]);

    s(1, {
        degree: null, showVal: false,
        explanation: `Twelve noisy measurements of a hidden curve. We will fit polynomials to them: degree d means d + 1 coefficients, ŷ = c₀ + c₁x + c₂x² + … up to the xᵈ term. The more coefficients, the more the curve can bend.`,
    });
    s(1, {
        degree: null, showVal: true,
        explanation: `Thirty more points from the same source, drawn hollow, are kept aside as a validation set. The model never sees them while fitting; they answer the only question that matters — how well does it do on data it has not seen?`,
    });

    /* Act 2: one degree at a time. */
    rows.forEach((r, d) => {
        const prev = rows[d - 1];
        let text;
        if (d === 0) text = `Degree 0 is a flat line at the mean of the twelve y values. Training MSE ${fe(r.train)}, validation MSE ${fe(r.val)}: both high. The model is too simple to follow the curve — underfitting.`;
        else if (d === 1) text = `Degree 1, a straight line: training ${fe(r.train)}, validation ${fe(r.val)}. Better, but a line cannot bend with the wave.`;
        else if (d === MAX_DEG) text = `Degree 11: twelve coefficients for twelve points, so the curve passes through every one. Training MSE ${fe(r.train)} — perfect. Validation MSE ${fe(r.val)}, ${f(r.val / best.val, 0)} times the best degree's. It memorised the noise.`;
        else if (d === best.d) text = `Degree ${d}: training ${fe(r.train)}, validation ${fe(r.val)} — the lowest validation error of any degree. The curve follows the wave and ignores the jitter.`;
        else if (d < best.d) text = `Degree ${d}: training error falls to ${fe(r.train)}; validation error ${r.val > prev.val ? 'rises' : 'falls'} to ${fe(r.val)}.`;
        else text = r.val > prev.val
            ? `Degree ${d}: training error falls to ${fe(r.train)}, but validation error rises to ${fe(r.val)}. The extra flexibility is being spent on the noise.`
            : `Degree ${d}: training error falls to ${fe(r.train)}; validation error dips to ${fe(r.val)}, still above degree ${best.d}'s ${fe(best.val)}. Past the bottom of the U, validation error wobbles with the noise rather than improving.`;
        s(2, { degree: d, showVal: true, rows: rows.slice(0, d + 1), explanation: text });
    });

    const c11 = rows[MAX_DEG].c;
    const big = Math.max(...c11.map(Math.abs));
    const peak = Math.max(...Array.from({ length: 401 }, (_, i) => Math.abs(evalPoly(c11, -1 + i / 200))));
    s(3, {
        degree: best.d, showVal: true, rows, best: best.d,
        explanation: `The whole picture: training error falls at every degree — each degree contains the one before, so the best fit on the points it sees can only improve. Validation error falls, bottoms out at degree ${best.d}, and climbs. That U is the bias–variance trade-off, and the bottom of it is the model to choose.`,
    });
    s(3, {
        degree: MAX_DEG, showVal: true, rows, best: best.d, coefs: true,
        explanation: `How does degree 11 hit every point? With large, cancelling coefficients: the biggest is ${f(big, 0)}, for a curve whose values on [−1, 1] never exceed ${f(peak, 1)} in size. Coefficients far larger than the data are the fingerprint of overfitting — which suggests a cure: make them expensive.`,
    });

    /* Act 4: the L2 penalty on degree 11. */
    const norm11 = coefNorm(c11);
    const ridge = LAMBDAS.map(l => { const c = fitPoly(data.train, MAX_DEG, l); return { l, c, n: coefNorm(c), train: mse(c, data.train), val: mse(c, data.val) }; });
    const bestRidge = ridge.reduce((a, r) => (r.val < a.val ? r : a), ridge[0]);
    for (const { l, n, train, val } of ridge) {
        const tail = l === LAMBDAS[0] ? `Even this tiny price shrinks ‖c‖ from ${f(norm11, 0)} to ${f(n, 0)}.`
            : l === LAMBDAS[LAMBDAS.length - 1] ? 'Too big a price and the curve is pressed towards flat: underfitting again, from the other side.'
                : l === bestRidge.l ? `The best of these four: a tamed degree 11, against ${fe(best.val)} for the best unpenalised degree.` : '';
        s(4, {
            degree: MAX_DEG, lambda: l, showVal: true, coefs: true, penaltyRow: { train, val, norm: n },
            explanation: `Degree 11 again, now minimising training MSE + λ·Σc² with λ = ${lam(l)} (the constant c₀ is left free). Coefficient size ‖c‖ = ${f(n, n > 100 ? 0 : 2)}; training MSE ${fe(train)}, validation MSE ${fe(val)}. ${tail}`.trim(),
        });
    }

    /* Act 5: refit each degree on many training sets. Before a balanced,
       seeded subset of the clear cases (one side at least 3× the other), a
       picture-only step asks which side is larger. */
    const bvs = BV_DEGREES.map(d => ({ d, bv: biasVariance(seed, d) }));
    const clearOf = (side) => bvs.filter(e => bvClear(e.bv) && bvSide(e.bv) === side).map(e => e.d);
    const k = Math.min(ASK_PER_SIDE, clearOf(0).length, clearOf(1).length);
    const asked = new Set([...rng.shuffle(clearOf(0)).slice(0, k), ...rng.shuffle(clearOf(1)).slice(0, k)]);
    for (const { d, bv } of bvs) {
        if (asked.has(d)) {
            s(5, {
                degree: d, bv, bvHidden: true, showVal: false,
                explanation: `Degree ${d}, refitted on ${BV_SETS} fresh training sets of twelve points from the same source. Each thin line is one fit; the bold line is their average; the dashed line is the true curve.`,
            });
        }
        const side = bvSide(bv);
        const tail = !bvClear(bv) ? 'Neither is three times the other: the two are roughly in balance.'
            : side === 0 ? 'The fits agree with one another but all miss the wave the same way: high bias. More data would not help; only a more flexible model would.'
                : bv.variance > 1 ? 'The average is not far from the truth, but each single fit swings wildly with its own noise: high variance. This is overfitting, seen across many datasets.'
                    : 'On average the fits sit on the true curve; the price is that each one wobbles with its own noise.';
        s(5, {
            degree: d, bv, bvAsk: asked.has(d), showVal: false,
            explanation: `Degree ${d} over ${BV_SETS} training sets: bias² (average fit against the truth) ${fe(bv.bias2)}, variance (spread of the fits around their average) ${fe(bv.variance)}. ${tail}`,
        });
    }
    s(5, {
        degree: best.d, showVal: true, rows, best: best.d, done: true,
        explanation: 'Switch to Explore: slide the degree and the penalty, shrink the training set, and watch the U move.',
    });
    return steps;
};

/* ── predict ───────────────────────────────────────────────
   On the picture-only bias–variance steps: which is larger? The picture
   decides it — the gap between the bold average and the dashed truth is
   bias, the spread of the thin lines is variance — and only cases where one
   side is at least 3× the other are asked, as many of each as possible. */
const predictFor = (step, next) => {
    if (!step.bvHidden || !next || !next.bvAsk) return null;
    const { bias2, variance } = next.bv;
    return {
        question: `Degree ${next.degree}: which is larger — bias² (the bold average against the dashed truth) or variance (the spread of the thin fits around the bold one)?`,
        options: BV_OPTIONS,
        correct: bvSide(next.bv),
        because: `Bias² ${fe(bias2)} against variance ${fe(variance)}: ${bvSide(next.bv) === 0 ? 'the fits huddle together, away from the truth' : 'the fits scatter, even though their average tracks the truth'}.`,
    };
};

/** The formula for the step on screen, with its live values. */
function formulaFor(step) {
    if (step.bvHidden) return String.raw`\text{bias}^2 = \overline{(\bar f(x) - f(x))^2}, \qquad \text{variance} = \overline{(\hat f(x) - \bar f(x))^2}`;
    if (step.bv) {
        const b = Number(step.bv.bias2.toFixed(4)), v = Number(step.bv.variance.toFixed(4));
        return String.raw`\underbrace{${(b + v).toFixed(4)}}_{\text{avg. squared miss}} = \underbrace{${b.toFixed(4)}}_{\text{bias}^2} + \underbrace{${v.toFixed(4)}}_{\text{variance}}, \qquad \text{new data adds } \sigma^2 = ${NOISE * NOISE}`;
    }
    if (step.penaltyRow) {
        const { train, norm } = step.penaltyRow;
        return String.raw`\min_c \; \tfrac{1}{${N_TRAIN}}\textstyle\sum (\hat y_i - y_i)^2 + \lambda\lVert c\rVert^2: \quad ${tn(train, 4)} + ${step.lambda >= 0.01 ? step.lambda : `10^{${Math.round(Math.log10(step.lambda))}}`} \times ${tn(norm * norm, norm > 30 ? 0 : 3)}`;
    }
    if (step.degree === null) return String.raw`\hat y = c_0 + c_1 x + c_2 x^2 + \dots + c_d x^d, \qquad X \in \mathbb{R}^{${N_TRAIN} \times (d+1)}`;
    const r = step.rows?.[step.degree] ?? sweep(step.data)[step.degree];
    return String.raw`d = ${step.degree}: \quad \text{MSE}_{\text{train}} = ${r.train < 1e-6 ? '0.0000' : tn(r.train, 4)}, \quad \text{MSE}_{\text{val}} = ${tn(r.val, r.val > 10 ? 1 : 4)}`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'As the polynomial degree rises from 0 to 11 on twelve training points, what happens to training error?',
        options: ['It traces a U, like validation error', 'It never rises, reaching 0 at degree 11', 'It rises steadily', 'It stays the same'],
        correct: 1,
        explanation: 'Each degree can imitate every lower degree (set the new coefficient to 0), so the least-squares training error can only fall. With 12 coefficients and 12 points it interpolates exactly: training error 0.',
    },
    {
        question: 'A model has very low training error and high validation error. What is it doing?',
        options: ['Underfitting: it is too simple', 'Overfitting: it has learned the noise in the training set', 'It is perfectly fitted', 'The validation set must be broken'],
        correct: 1,
        explanation: 'The gap between training and validation error is the signature of overfitting (high variance). Underfitting shows high error on both.',
    },
    {
        question: 'An L2 penalty λ·Σc² is added to a degree-11 fit. What happens as λ grows from tiny to very large?',
        options: [
            'Validation error only ever falls',
            'Coefficients shrink; validation error first falls (less overfitting), then rises again (underfitting)',
            'Training error falls to 0',
            'Nothing — the penalty only matters for neural networks',
        ],
        correct: 1,
        explanation: 'A small λ tames the wild coefficients and improves validation error; a huge λ flattens the curve towards a constant and underfits. λ is a dial along the same bias–variance trade-off as the degree.',
    },
];

const codeExample = `import numpy as np

rng = np.random.default_rng(10)
truth = lambda x: 0.8 * np.sin(2.6 * x) + 0.25 * x
x = np.linspace(-1, 1, 12); x[1:-1] += rng.uniform(-0.036, 0.036, 10)   # 12 to fit
xv = rng.uniform(-1, 1, 300)                                             # 300 held out
y, yv = truth(x) + rng.normal(0, 0.25, 12), truth(xv) + rng.normal(0, 0.25, 300)

for d in [1, 3, 11]:
    X, Xv = np.vander(x, d + 1), np.vander(xv, d + 1)          # [12, d+1], [300, d+1]
    c = np.linalg.lstsq(X, y, rcond=None)[0]
    print(d, np.mean((X @ c - y) ** 2).round(4), np.mean((Xv @ c - yv) ** 2).round(3))
# 1 0.2294 0.141     too simple
# 3 0.0264 0.09      about right
# 11 0.0 1.275       every point hit; 14 times degree 3's error

X, Xv = np.vander(x, 12, increasing=True), np.vander(xv, 12, increasing=True)
D = np.eye(12); D[0, 0] = 0                                    # the constant is not penalised
for lam in [1e-6, 1e-2, 1]:
    c = np.linalg.solve(X.T @ X / 12 + lam * D, X.T @ y / 12)  # minimises MSE + λ‖c‖²
    print(lam, np.linalg.norm(c[1:]).round(2), np.mean((Xv @ c - yv) ** 2).round(3))
# 1e-06 33.57 0.101
# 0.01 2.02 0.087
# 1 0.28 0.399       pressed towards flat`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the U and the penalty acts, then retry.'}
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

const C = { train: '#38bdf8', val: '#fb923c', fit: '#a3e635', truth: '#94a3b8', faint: '#a3e635' };
const r2 = (v) => Math.round(v * 100) / 100;

/* The data and the fitted curve. Not Plane2D: x spans 2 units and y 4, and
   equal units would make the plot twice as tall as it is wide. */
function CurvePlot({ train, val, coefs = [], showVal, showTruth, faint = [] }) {
    const W = 420, H = 300, P = 28, Y = [-2, 2];
    const sx = (x) => r2(P + ((x + 1.05) / 2.1) * (W - 2 * P));
    const sy = (y) => r2(H - P - ((Math.max(Y[0] - 1, Math.min(Y[1] + 1, y)) - Y[0]) / (Y[1] - Y[0])) * (H - 2 * P));
    const path = (fn) => Array.from({ length: 211 }, (_, i) => { const x = -1.05 + i / 100; return `${i ? 'L' : 'M'}${sx(x)},${sy(fn(x))}`; }).join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Training points, validation points and the fitted curve">
            <defs><clipPath id="of-clip"><rect x={P} y={P - 10} width={W - 2 * P} height={H - 2 * P + 20} /></clipPath></defs>
            {[-2, -1, 0, 1, 2].map(v => <g key={v}><line x1={P} x2={W - P} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? '#334155' : '#1e293b'} /><text x={P - 6} y={sy(v) + 4} fontSize="10" textAnchor="end" fill="#64748b">{v}</text></g>)}
            {[-1, -0.5, 0, 0.5, 1].map(v => <text key={v} x={sx(v)} y={H - 8} fontSize="10" textAnchor="middle" fill="#64748b">{v}</text>)}
            <g clipPath="url(#of-clip)">
                {showTruth && <path d={path(truth)} fill="none" stroke={C.truth} strokeWidth="1.5" strokeDasharray="5 4" />}
                {faint.map((c, i) => <path key={i} d={path(x => evalPoly(c, x))} fill="none" stroke={C.faint} strokeWidth="1" opacity="0.35" />)}
                {coefs.length > 0 && <path d={path(x => evalPoly(coefs, x))} fill="none" stroke={C.fit} strokeWidth="2.5" />}
            </g>
            {showVal && val.map(([x, y], i) => <circle key={`v${i}`} cx={sx(x)} cy={sy(y)} r="4" fill="none" stroke={C.val} strokeWidth="1.5" />)}
            {train.map(([x, y], i) => <circle key={`t${i}`} cx={sx(x)} cy={sy(y)} r="4.5" fill={C.train} stroke="#0f172a" strokeWidth="1" />)}
        </svg>
    );
}

/* Training and validation error against degree, on a log scale. */
function UChart({ rows, current, best, maxDeg = MAX_DEG }) {
    const W = 420, H = 230, L = 46, B = 26, T = 10;
    const vals = rows.flatMap(r => [r.train, r.val]).filter(v => v > 0);
    const lo = Math.max(1e-4, Math.min(...vals, 0.01)), hi = Math.max(...vals, 1);
    const [a, b] = [Math.log10(lo), Math.log10(hi)];
    const sx = (d) => r2(L + (d / maxDeg) * (W - L - 12));
    const sy = (v) => r2(T + (1 - (Math.log10(Math.max(lo, v)) - a) / (b - a || 1)) * (H - T - B));
    const line = (key) => rows.map((r, i) => `${i ? 'L' : 'M'}${sx(r.d)},${sy(r[key])}`).join(' ');
    const ticks = [];
    for (let e = Math.ceil(a); e <= Math.floor(b); e++) ticks.push(e);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Training and validation error by degree">
            {ticks.map(e => <g key={e}><line x1={L} x2={W - 12} y1={sy(10 ** e)} y2={sy(10 ** e)} stroke="#1e293b" /><text x={L - 6} y={sy(10 ** e) + 4} fontSize="10" textAnchor="end" fill="#64748b">{e >= 0 ? 10 ** e : (10 ** e).toFixed(-e)}</text></g>)}
            {Array.from({ length: maxDeg + 1 }, (_, d) => <text key={d} x={sx(d)} y={H - 8} fontSize="10" textAnchor="middle" fill={d === current ? '#e2e8f0' : '#64748b'}>{d}</text>)}
            {current !== null && current !== undefined && <line x1={sx(current)} x2={sx(current)} y1={T} y2={H - B} stroke="#475569" strokeDasharray="3 3" />}
            {rows.length > 0 && <path d={line('val')} fill="none" stroke={C.val} strokeWidth="2.5" />}
            {rows.length > 0 && <path d={line('train')} fill="none" stroke={C.train} strokeWidth="2.5" />}
            {rows.map(r => <circle key={`v${r.d}`} cx={sx(r.d)} cy={sy(r.val)} r="3.5" fill={C.val} />)}
            {rows.map(r => <circle key={`t${r.d}`} cx={sx(r.d)} cy={sy(r.train)} r="3.5" fill={C.train} />)}
            {best !== undefined && best !== null && rows[best] && <circle cx={sx(best)} cy={sy(rows[best].val)} r="8" fill="none" stroke="#facc15" strokeWidth="2" />}
            <text x={W - 14} y={T + 10} fontSize="10" textAnchor="end" fill={C.val}>validation</text>
            <text x={W - 14} y={T + 24} fontSize="10" textAnchor="end" fill={C.train}>training</text>
            <text x="2" y={H - 8} fontSize="10" fill="#94a3b8">degree</text>
        </svg>
    );
}

function CoefBars({ coefs }) {
    const max = Math.max(...coefs.map(Math.abs), 1e-9);
    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1.5"><span>Coefficients c₀ … c_d (bar length on a log scale)</span><ShapeTag label="c" names={['d+1']} shape={[coefs.length]} /></div>
            <div className="space-y-0.5">
                {coefs.map((c, k) => {
                    const w = Math.log10(1 + Math.abs(c)) / Math.log10(1 + max);
                    return (
                        <div key={k} className="flex items-center gap-2 text-[11px] font-mono">
                            <span className="w-7 text-slate-500">c{k}</span>
                            <div className="flex-1 h-2.5 bg-slate-800 rounded-sm overflow-hidden"><div className="h-full" style={{ width: `${r2(w * 100)}%`, background: c < 0 ? '#fb7185' : '#a3e635' }} /></div>
                            <span className="w-20 text-right text-slate-300 tabular-nums">{Math.abs(c) >= 1000 ? f(c, 0) : f(c, 2)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── explore ────────────────────────────────────────────── */

function Explore({ initialSeed, initialDegree }) {
    const [seed, setSeed] = useState(initialSeed);
    const [nTrain, setNTrain] = useState(N_TRAIN);
    const [degree, setDegree] = useState(initialDegree);
    const [logLam, setLogLam] = useState(-9);            // −9 means off
    const [showTruth, setShowTruth] = useState(true);
    const lambda = logLam <= -8.99 ? 0 : 10 ** logLam;
    const lambdaUsed = effectiveLambda(nTrain, degree, lambda);
    const data = useMemo(() => makeData(seed, nTrain), [seed, nTrain]);
    const rows = useMemo(() => sweep(data, lambda), [data, lambda]);
    const row = rows[degree];
    const best = rows.reduce((a, r) => (r.val < a.val ? r : a), rows[0]);
    const fullBest = useMemo(() => { const r = sweep(makeData(seed), lambda); return r.reduce((a, x) => (x.val < a.val ? x : a), r[0]).d; }, [seed, lambda]);
    const repair = () => { setSeed(initialSeed); setNTrain(N_TRAIN); setDegree(3); setLogLam(-9); };

    const notes = [];
    if (row.train < 1e-6 && row.val > 3 * best.val) notes.push(`Training error ${fe(row.train)}: the curve threads every training point. Validation error ${fe(row.val)} is ${f(row.val / best.val, 0)} times the best degree's. A perfect score on the data you trained on says nothing about new data.`);
    if (nTrain < N_TRAIN && degree + 1 >= nTrain) notes.push(`${nTrain} points and ${degree + 1} coefficients: ${degree + 1 > nTrain ? 'infinitely many curves fit exactly, and this is the one with the smallest coefficients' : 'exactly enough to pass through every point'}. With less data the bottom of the U sits at degree ${best.d}; with twelve points it was degree ${fullBest}.`);

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="min-w-0">
                        <CurvePlot train={data.train} val={data.val} coefs={row.c} showVal showTruth={showTruth} />
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                            <span style={{ color: C.train }}>● training ({data.train.length})</span><span style={{ color: C.val }}>○ validation ({N_VAL})</span>
                            <button onClick={() => setShowTruth(v => !v)} className="underline decoration-dotted">{showTruth ? 'hide' : 'show'} the true curve</button>
                        </div>
                    </div>
                    <div className="min-w-0 space-y-2">
                        <UChart rows={rows} current={degree} best={best.d} />
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {[['train MSE', fe(row.train)], ['validation MSE', fe(row.val)], ['best degree', best.d]].map(([k, v]) => (
                                <div key={k} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2 px-1">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
                                    <div className="font-mono text-sm text-slate-100 tabular-nums">{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ParamSlider label="Degree d" value={degree} onChange={setDegree} min={0} max={MAX_DEG} step={1} accent="lime" hint={`${degree + 1} coefficients`} />
                    <ParamSlider label="L2 penalty λ" value={logLam} onChange={setLogLam} min={-9} max={1} step={0.1} accent="lime"
                        format={() => (lambda === 0 ? 'off' : `10^${f(logLam, 1)}`)} hint="Log scale; far left is off." />
                </div>
                <div className="text-slate-100 text-sm">
                    <Tex block>{String.raw`\min_c \tfrac{1}{${data.train.length}}\textstyle\sum(\hat y_i - y_i)^2 + \lambda\lVert c\rVert^2, \quad \lambda = ${lambda === 0 ? (lambdaUsed > 0 ? '10^{-10}' : '0') : `10^{${tn(logLam, 1)}}`}, \quad \lVert c\rVert = ${tn(coefNorm(row.c), coefNorm(row.c) > 100 ? 0 : 3)}`}</Tex>
                </div>
                <CoefBars coefs={row.c} />
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => { setDegree(MAX_DEG); setLogLam(-9); }} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500">Degree 11, no penalty</button>
                    <button onClick={() => setNTrain(6)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500">Only 6 training points</button>
                    <button onClick={() => setSeed(randomSeed())} aria-label="New data" title="New data" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
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

export default function OverfittingPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const data = useMemo(() => makeData(seed), [seed]);
    const stepHistory = useMemo(() => generateSteps(data, seed), [data, seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [explore, setExplore] = useState({ seed, degree: 3, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const study = useMemo(() => perfectFitStudy(), []);

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
    const toExplore = () => {
        setExplore(e => ({ seed, degree: step.degree ?? 3, key: e.key + 1 }));
        setMode('explore');
        setIsPlaying(false);
    };
    const stepCoefs = step.degree === null ? [] : step.bv ? step.bv.mean : fitPoly(step.data.train, step.degree, step.lambda);
    const allRows = useMemo(() => sweep(data), [data]);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/machine-learning" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Machine Learning
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Overfitting and Underfitting</h1>
                    <p className="text-lime-50 max-w-3xl">
                        Slide a polynomial from degree 0 to 11 on twelve noisy points. Training error only ever falls; validation error traces a U. An L2 penalty pulls the wild coefficients back in.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/80">Builds on</span>
                        {[['Linear Regression', '/machine-learning/linear-regression'], ['Loss Functions', '/machine-learning/loss-functions']].map(([name, href]) => (
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
                        <SourceChip kind="live">Every fit solved in your browser · seeded noisy samples of a known curve</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={explore.key} initialSeed={explore.seed} initialDegree={explore.degree} />
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
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}{step.degree !== null && step.degree !== undefined && !step.bv ? ` · degree ${step.degree}` : ''}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                        <div className="min-w-0">
                                            <CurvePlot train={step.bv ? [] : step.data.train} val={step.data.val} coefs={stepCoefs} showVal={step.showVal} showTruth={step.act >= 3}
                                                faint={step.bv ? step.bv.fits : []} />
                                            {step.bv && (
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                                                    <span style={{ color: C.faint }}>thin: {BV_SETS} fits</span><span style={{ color: C.fit }}>bold: their average</span><span>dashed: the true curve</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 space-y-3">
                                            {step.coefs
                                                ? <CoefBars coefs={stepCoefs} />
                                                : step.bv
                                                    ? <div className="text-sm text-slate-300 space-y-3">
                                                        <div className="flex flex-wrap items-center gap-2"><span>Degree {step.degree}, {BV_SETS} training sets</span><ShapeTag label="fits" names={['sets', 'd+1']} shape={[BV_SETS, step.degree + 1]} /></div>
                                                        <div className="grid grid-cols-2 gap-2 text-center">{[['bias²', step.bv.bias2], ['variance', step.bv.variance]].map(([k, v]) => (
                                                            <div key={k} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2"><div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div><div className="font-mono text-slate-100">{step.bvHidden ? '?' : fe(v)}</div></div>))}</div>
                                                        <p className="text-xs text-slate-500 leading-relaxed">Bias² is the gap between the bold average and the dashed truth; variance is how far the thin fits stray from the bold one. Both are averaged over 41 points across [−1, 1].</p>
                                                    </div>
                                                    : <UChart rows={step.rows ?? (step.act >= 3 ? allRows : [])} current={step.degree} best={step.best} />}
                                        </div>
                                    </div>
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
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New data" title="New data"
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

                    <InCode title="The same experiment in NumPy" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Reading the two errors</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-sky-300 font-semibold">Both high</span> — underfitting: the model is too simple (high bias).</li>
                            <li><span className="text-orange-300 font-semibold">Training low, validation high</span> — overfitting: it learned the noise (high variance).</li>
                            <li><span className="text-lime-300 font-semibold">Both low, close together</span> — the bottom of the U.</li>
                        </ul>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            <ShapeTag label="X" names={['n', 'd+1']} shape={[N_TRAIN, MAX_DEG + 1]} />
                            <ShapeTag label="c" names={['d+1']} shape={[MAX_DEG + 1]} />
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;A model that fits its training data perfectly has learned the pattern.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            This page fitted degree 11 to {study.count} seeded datasets of twelve points. Every fit was perfect on its training points (worst training MSE {fe(study.worstTrain)}), and on validation it did worse than plain degree 3 in {Math.round(study.worse * study.count)} of them — typically {f(study.median, 0)} times worse.
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
