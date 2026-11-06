"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, SlidersHorizontal, Shuffle,
    Layers, LineChart, Gauge, Spline, Dumbbell, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { createMLP, lossAndGrads, createOptimizer, forward } from '@/lib/ml/mlp';
import { makeDataset } from '@/lib/ml/datasets';
import { useTrainer } from '@/lib/ml/useTrainer';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import TrainingCurve from '@/components/ml/TrainingCurve';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the functions ──────────────────────────────────────────
   Each is a bend applied to one unit's weighted sum z. GELU uses the tanh
   form that GPT-2 (and the tiny GPT on the Transformers pages) computes;
   Leaky ReLU uses the 0.01 slope of the training engine. */

const C_GELU = Math.sqrt(2 / Math.PI);
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const gelu = (z) => 0.5 * z * (1 + Math.tanh(C_GELU * (z + 0.044715 * z ** 3)));
const geluD = (z) => {
    const t = Math.tanh(C_GELU * (z + 0.044715 * z ** 3));
    return 0.5 * (1 + t) + 0.5 * z * (1 - t * t) * C_GELU * (1 + 3 * 0.044715 * z * z);
};

const FUNCS = [
    { key: 'step', name: 'Step', color: '#94a3b8', f: (z) => (z >= 0 ? 1 : 0), d: () => 0, range: '0 or 1', maxSlope: '0 (∞ at the jump)' },
    { key: 'sigmoid', name: 'Sigmoid', color: '#38bdf8', f: sigmoid, d: (z) => sigmoid(z) * (1 - sigmoid(z)), range: '(0, 1)', maxSlope: '0.25 at z = 0' },
    { key: 'tanh', name: 'Tanh', color: '#a78bfa', f: Math.tanh, d: (z) => 1 - Math.tanh(z) ** 2, range: '(−1, 1)', maxSlope: '1 at z = 0' },
    { key: 'relu', name: 'ReLU', color: '#fb923c', f: (z) => (z > 0 ? z : 0), d: (z) => (z > 0 ? 1 : 0), range: '[0, ∞)', maxSlope: '1 for every z > 0' },
    { key: 'leakyRelu', name: 'Leaky ReLU', color: '#facc15', f: (z) => (z > 0 ? z : 0.01 * z), d: (z) => (z > 0 ? 1 : 0.01), range: '(−∞, ∞)', maxSlope: '1 for z > 0, 0.01 below' },
    { key: 'gelu', name: 'GELU', color: '#34d399', f: gelu, d: geluD, range: '[−0.17, ∞)', maxSlope: '1.13 near z = 1.5' },
];
const FN = Object.fromEntries(FUNCS.map(fn => [fn.key, fn]));

const f = (v, d = 3) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const tn = (v, d = 3) => f(v, d).replace('−', '-');
/** Like f, without trailing zeros: step(1.5) = 1 and ReLU(1.5) = 1.5, not 1.000 and 1.500. */
const fi = (v, d = 3) => (Math.abs(v - Math.round(v)) < 1e-12 ? String(Math.round(v)).replace('-', '−') : f(v, d).replace(/(\.\d*?)0+$/, '$1'));
const ti = (v, d = 3) => fi(v, d).replace('−', '-');
/** A coefficient in front of x: 1 → "", −1 → "−". */
const coef = (v) => (v === 1 ? '' : v === -1 ? '−' : String(v).replace('-', '−'));
const sg = (v, d = 1) => (v < 0 ? `− ${f(-v, d)}` : `+ ${f(v, d)}`);
const tsg = (v, d = 1) => (v < 0 ? `- ${tn(-v, d)}` : `+ ${tn(v, d)}`);
const half = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)).replace('-', '−');
const th = (v) => half(v).replace('−', '-');
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** 9.5e-7 → "9.5 × 10⁻⁷". */
const sci = (v, d = 1) => { const [m, e] = v.toExponential(d).split('e'); return `${m} × 10${String(Number(e)).split('').map(c => SUP[c]).join('')}`; };

/** A value and slope in Tex, with the numbers substituted. */
function fnTex(key, z) {
    const zs = tn(z, 1), zp = z < 0 ? `(${zs})` : zs;
    const v = ti(FN[key].f(z)), d = ti(FN[key].d(z));
    switch (key) {
        case 'step': return String.raw`\text{step}(${zs}) = ${z >= 0 ? 1 : 0}\ \ (1 \text{ if } z \ge 0),\qquad \text{step}'(${zs}) = 0`;
        case 'sigmoid': return String.raw`\sigma(${zs}) = \frac{1}{1 + e^{-${zp}}} = ${v},\qquad \sigma'(${zs}) = \sigma(1 - \sigma) = ${d}`;
        case 'tanh': return String.raw`\tanh(${zs}) = \frac{e^{${zs}} - e^{-${zp}}}{e^{${zs}} + e^{-${zp}}} = ${v},\qquad \tanh'(${zs}) = 1 - \tanh^2 = ${d}`;
        case 'relu': return String.raw`\text{ReLU}(${zs}) = \max(0, ${zs}) = ${v},\qquad \text{ReLU}'(${zs}) = ${d}`;
        case 'leakyRelu': return String.raw`\text{LeakyReLU}(${zs}) = \max(0.01\cdot${zp},\ ${zs}) = ${v},\qquad \text{slope} = ${d}`;
        default: return String.raw`\text{GELU}(${zs}) = \tfrac12 z\left(1 + \tanh\!\left(\sqrt{2/\pi}\,(z + 0.044715z^3)\right)\right) = ${v},\qquad \text{slope} = ${d}`;
    }
}

/* ── act 1: two layers with and without a bend ───────────────
   h = W₁x + b₁ (two units), y = W₂h + b₂. Without an activation that is
   (W₂W₁)x + (W₂b₁ + b₂) — one line. */
const W1 = [2, -1], B1 = [0.5, 1], W2 = [1, 1], B2 = -1;
const LIN_A = W2[0] * W1[0] + W2[1] * W1[1];
const LIN_B = W2[0] * B1[0] + W2[1] * B1[1] + B2;
const twoLayer = (x, act) => W2[0] * act(W1[0] * x + B1[0]) + W2[1] * act(W1[1] * x + B1[1]) + B2;

/* ── act 4: building a curve from ReLU hinges ───────────────
   Start from a straight line, then add units s·ReLU(x − k) left to right.
   Each adds s to the slope of everything right of its kink k. Before each
   one the learner predicts whether the curve right of k rises or falls.
   Answers are fair coins; half the time the hinge flips the slope's sign,
   otherwise it shrinks the slope without flipping it (or grows it, when the
   slope is already as small as the grid allows), so neither "follow the
   sign of s" nor "keep the current direction" beats a coin by much. */
const MAGS = [0.5, 1, 1.5, 2];
const N_HINGES = 4;

function hingeTour(seed) {
    const rng = createRng(seed * 7 + 3);
    let r = (rng.chance(0.5) ? 1 : -1) * rng.pick([1, 1.5, 2]);
    const r0 = r;
    const kinks = [-1.2, -0.4, 0.4, 1.2].map(k => Math.round((k + rng.pick([-0.2, -0.1, 0, 0.1, 0.2])) * 10) / 10);
    // A hinge either flips the direction or keeps it and changes the steepness. Keeping it
    // shrinks the slope (so "follow the sign of s" is wrong) unless the slope is already the
    // smallest, when it must grow (and "follow the sign of s" is right). Flipping more often
    // from the smallest slope, and never flipping to it, keeps both one-number shortcuts —
    // the sign of s, the current direction — within a few points of a coin toss.
    const hinges = kinks.map(k => {
        const flip = rng.chance(Math.abs(r) === MAGS[0] ? 0.7 : 0.42);
        let mag;
        if (flip) mag = rng.pick(MAGS.slice(1));
        else {
            const smaller = MAGS.filter(m => m < Math.abs(r));
            mag = smaller.length ? rng.pick(smaller) : rng.pick(MAGS.filter(m => m > Math.abs(r)));
        }
        const after = (flip ? -Math.sign(r) : Math.sign(r)) * mag;
        const h = { k, s: after - r, before: r, after, flip };
        r = after;
        return h;
    });
    // Centre the drawings: the intercept puts the middle of every partial curve's range at 0.
    const raw = (x, j) => r0 * x + hinges.slice(0, j).reduce((acc, h) => acc + h.s * Math.max(0, x - h.k), 0);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j <= N_HINGES; j++) for (let i = 0; i <= 80; i++) { const y = raw(-2 + i / 20, j); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    const c = Math.round(-(lo + hi)) / 2;
    return { r0, c, hinges, yRange: [Math.floor(lo + c) - 0.5, Math.ceil(hi + c) + 0.5] };
}
const hingeCurve = (tour, j) => (x) => tour.c + tour.r0 * x + tour.hinges.slice(0, j).reduce((acc, h) => acc + h.s * Math.max(0, x - h.k), 0);

/* ── act 5: the same small network trained with each activation ── */
const DEFAULT_SEED = 7;
const H_TOUR = 6;
const TOUR_STEPS = 1200;
const LR = 0.02;
const TRAINABLE = ['linear', 'sigmoid', 'tanh', 'relu'];

function curveData(seed, n = 30) {
    const d = makeDataset('curve', { n, noise: 0.08, seed });
    return { X: d.X, Y: d.y };
}
function trainNet(sizes, activation, X, Y, { seed, steps, lr = LR }) {
    const net = createMLP(sizes, { activation, output: 'linear', seed });
    const opt = createOptimizer(net, { type: 'adam', lr });
    for (let s = 0; s < steps; s++) opt.step(lossAndGrads(net, X, Y));
    return { net, mse: lossAndGrads(net, X, Y).dataLoss };
}
const netAt = (net) => (x) => forward(net, [[x]]).A[net.sizes.length - 1][0];
/** Unit i of a one-hidden-layer net, as its contribution vᵢ·f(wᵢx + bᵢ) to the output. */
const unitAt = (net, i) => {
    const act = FN[net.activation]?.f ?? ((z) => z);
    return (x) => net.W[1][i] * act(net.W[0][i] * x + net.b[0][i]);
};
/** The least-squares line through the data. */
function lsLine(X, Y) {
    const n = X.length;
    const mx = X.reduce((s, x) => s + x[0], 0) / n, my = Y.reduce((s, y) => s + y, 0) / n;
    let sxy = 0, sxx = 0;
    X.forEach((x, i) => { sxy += (x[0] - mx) * (Y[i] - my); sxx += (x[0] - mx) ** 2; });
    const a = sxy / sxx, b = my - a * mx;
    return { a, b, mse: X.reduce((s, x, i) => s + (a * x[0] + b - Y[i]) ** 2, 0) / n };
}
/** A network with no activation is affine; read its line off two inputs. */
const collapse = (net) => { const g = netAt(net); const b = g(0); return { a: g(1) - b, b }; };
/** Kinks of a one-hidden-layer ReLU net inside [lo, hi]: where some unit's wx + b crosses 0. */
const kinksOf = (net, lo, hi) => Array.from({ length: net.sizes[1] }, (_, i) => -net.b[0][i] / net.W[0][i])
    .filter(x => Number.isFinite(x) && x > lo && x < hi).sort((a, b) => a - b);

/* "More layers make a network more powerful, with or without activations":
   measured by the suite on 200 seeded wave sets (30 points, noise 0.08):
   [1, 16, 16, 1] with no activation and [1, 16, 1] with ReLU, Adam
   (lr 0.02, 1,500 steps) each. The suite reruns this and checks these
   numbers. */
const DEPTH_STUDY = { sets: 200, maxGap: 1e-6, linMean: 0.0536, reluMean: 0.0042, reluBetter: 200, ratioMedian: 13.3 };

const ACTS = [
    { id: 1, label: 'Why bend', icon: Layers },
    { id: 2, label: 'Gallery', icon: LineChart },
    { id: 3, label: 'Saturation', icon: Gauge },
    { id: 4, label: 'Hinges', icon: Spline },
    { id: 5, label: 'Trained', icon: Dumbbell },
];
const GALLERY_Z = [-1.5, 1.5];

const generateSteps = (seed) => {
    const steps = [];
    const s = (act, extra) => steps.push({ act, actName: ACTS[act - 1].label, ...extra });
    const lin = (z) => z, relu = FN.relu.f;

    s(1, {
        scene: 'layers', bend: false,
        explanation: `Two layers, no bend. Hidden units h₁ = 2x + 0.5 and h₂ = −x + 1 (the dashed lines) feed y = h₁ + h₂ − 1. Multiply it out: y = (1·2 + 1·(−1))x + (1·0.5 + 1·1 − 1) = ${coef(LIN_A)}x + ${LIN_B}. Two layers of weights, and the result is one straight line.`,
    });
    s(1, {
        scene: 'layers', bend: true,
        explanation: `Same weights, but each hidden unit now passes its sum through ReLU, which turns negatives into 0. Unit 1 switches off left of x = −0.25, unit 2 right of x = 1, so y = ReLU(2x + 0.5) + ReLU(−x + 1) − 1 has two corners: slope −1, then ${LIN_A}, then 2. A bend is what lets layers draw something a single line cannot.`,
    });
    s(1, {
        scene: 'layers', bend: false, collapse: true,
        explanation: `Without the bend, depth buys nothing: W₃(W₂(W₁x + b₁) + b₂) + b₃ = (W₃W₂W₁)x + (W₃W₂b₁ + W₃b₂ + b₃) for any number of layers — one matrix and one offset. Each activation function below is a different choice of bend.`,
    });

    FUNCS.forEach((fn) => {
        const [za, zb] = GALLERY_Z;
        const notes = {
            step: 'The perceptron’s bend. Its slope is 0 everywhere it is defined, so gradient descent gets no signal through it — which is why trainable networks replaced it.',
            sigmoid: 'A smooth step. It squashes any z into (0, 1), so it suits outputs that are probabilities; as a hidden unit its slope is never above 0.25.',
            tanh: 'A sigmoid stretched to (−1, 1) and centred on 0: tanh(z) = 2σ(2z) − 1. Its slope reaches 1 at z = 0.',
            relu: 'Zero for negatives, the identity for positives. Its slope is exactly 1 wherever the unit is on, which keeps gradients alive through many layers — the default in most networks.',
            leakyRelu: 'ReLU with a small slope (0.01 here) for negatives, so a unit that is off still passes a little gradient back.',
            gelu: 'A smooth ReLU: z times the chance a standard normal is below z (here in the tanh form GPT-2 uses). It dips slightly below 0 just left of the origin. Transformers use it.',
        };
        s(2, {
            scene: 'gallery', fn: fn.key, marks: GALLERY_Z,
            explanation: `${fn.name}: ${fn.name}(${f(za, 1)}) = ${fi(fn.f(za))} with slope ${fi(fn.d(za))}; ${fn.name}(${f(zb, 1)}) = ${fi(fn.f(zb))} with slope ${fi(fn.d(zb))}. Range ${fn.range}; steepest slope ${fn.maxSlope}. ${notes[fn.key]}`,
        });
    });

    const z4 = 4;
    s(3, {
        scene: 'saturation', z: 0, fns: ['sigmoid', 'tanh', 'relu'],
        explanation: `The gradient of every weight feeding a unit is multiplied by that unit's slope f′(z). At z = 0 the sigmoid's slope is ${f(FN.sigmoid.d(0), 2)} — its largest — and tanh's is ${f(FN.tanh.d(0), 0)}. ReLU's slope is 1 at any z > 0 (at exactly 0 the engine uses 0).`,
    });
    s(3, {
        scene: 'saturation', z: z4, fns: ['sigmoid', 'tanh', 'relu'],
        explanation: `Push z to 4: the sigmoid's slope falls to ${f(FN.sigmoid.d(z4), 4)} and tanh's to ${f(FN.tanh.d(z4), 4)}, while ReLU's stays 1. A unit sitting on a flat tail is saturated: nudging its weights barely changes its output, so the gradient that reaches them is close to zero.`,
    });
    s(3, {
        scene: 'saturation', z: 0, fns: ['sigmoid', 'tanh', 'relu'], chain: true,
        explanation: `Backpropagation multiplies one slope per layer. Through 10 sigmoid layers, even at their steepest, that is 0.25¹⁰ = ${sci(0.25 ** 10)} — the signal is gone before it reaches the first layer. ReLU's 1¹⁰ = 1. The Vanishing Gradients page follows this through a real network.`,
    });

    const tour = hingeTour(seed);
    tour.hinges.forEach((h, j) => {
        const prev = j > 0 ? tour.hinges[j - 1] : null;
        const lead = prev
            ? `The slope right of x = ${f(prev.k, 1)} became ${half(prev.before)} ${prev.s < 0 ? '−' : '+'} ${half(Math.abs(prev.s))} = ${half(prev.after)}, so the curve ${prev.after > 0 ? 'rises' : 'falls'} there. `
            : `A ReLU unit s·ReLU(x − k) is 0 left of its kink k and a line of slope s right of it. Start from a straight line of slope ${half(tour.r0)} and add four such units, left to right. `;
        s(4, {
            scene: 'hinges', tour, j, next: h,
            explanation: `${lead}Next, unit ${j + 1}: a kink at x = ${f(h.k, 1)} that adds ${half(h.s)} to the slope of everything right of it.`,
        });
    });
    const lastH = tour.hinges[N_HINGES - 1];
    s(4, {
        scene: 'hinges', tour, j: N_HINGES, done: true,
        explanation: `The slope right of x = ${f(lastH.k, 1)} became ${half(lastH.before)} ${lastH.s < 0 ? '−' : '+'} ${half(Math.abs(lastH.s))} = ${half(lastH.after)}. Four ReLU units, four corners: a sum of hinges can follow any curve as closely as you like, given enough of them. That is what a hidden layer of ReLUs computes.`,
    });

    const { X, Y } = curveData(seed);
    const ls = lsLine(X, Y);
    const fits = TRAINABLE.map(a => ({ activation: a, ...trainNet([1, H_TOUR, 1], a, X, Y, { seed, steps: TOUR_STEPS }) }));
    const byAct = Object.fromEntries(fits.map(x => [x.activation, x]));
    const col = collapse(byAct.linear.net);
    const nk = kinksOf(byAct.relu.net, -0.9, 0.9).length;
    const fitText = {
        linear: `No activation: ${H_TOUR} hidden units trained for ${TOUR_STEPS.toLocaleString()} steps, and the result is the line y = ${f(col.a)}x ${sg(col.b, 3)} — the least-squares line is y = ${f(ls.a)}x ${sg(ls.b, 3)}. Error ${f(byAct.linear.mse, 4)}; the best any straight line can do is ${f(ls.mse, 4)}. Training longer cannot beat it: a line is all this network can be.`,
        sigmoid: `Sigmoid: each unit is a smooth step (thin lines), and their sum follows the wave. Error ${f(byAct.sigmoid.mse, 4)}, ${f(byAct.linear.mse / byAct.sigmoid.mse, 0)}× lower than the line.`,
        tanh: `Tanh: the same kind of smooth steps, centred on 0. Error ${f(byAct.tanh.mse, 4)}.`,
        relu: `ReLU: ${nk} of the ${H_TOUR} units have their corner inside the data, and the fit is ${nk + 1} straight pieces. Error ${f(byAct.relu.mse, 4)}. Each activation bends differently; any of them lets the layer draw a curve, and none of them is the line.`,
    };
    fits.forEach(x => s(5, { scene: 'fit', data: { X, Y }, fits, focus: x.activation, ls, explanation: fitText[x.activation] }));
    s(5, {
        scene: 'fit', data: { X, Y }, fits, focus: 'all', ls, done: true,
        explanation: `All four on one chart: errors ${fits.map(x => `${x.activation === 'linear' ? 'none' : FN[x.activation].name} ${f(x.mse, 4)}`).join(', ')}. Open Explore to drag z along every function, then train your own network — and try three layers with no activation.`,
    });
    return steps;
};

/* ── predict ─────────────────────────────────────────────
   Before each hinge: right of its kink, does the curve rise or fall? The
   current right-hand slope is labelled on the chart and the question gives
   the hinge's slope change; their sum decides it. */
const predictFor = (step, next) => {
    if (step.scene !== 'hinges' || !step.next || !next) return null;
    const h = step.next;
    return {
        question: `Unit ${step.j + 1} bends the curve at x = ${f(h.k, 1)}, adding ${half(h.s)} to the slope right of it. Right of x = ${f(h.k, 1)}, will the curve rise or fall?`,
        options: ['Rises', 'Falls'],
        correct: h.after > 0 ? 0 : 1,
        because: `The slope there was ${half(h.before)}; adding ${half(h.s)} makes it ${half(h.after)}, which is ${h.after > 0 ? 'positive, so it rises' : 'negative, so it falls'}.`,
    };
};

function formulaFor(step) {
    if (step.scene === 'layers') {
        if (step.collapse) return String.raw`W_3\big(W_2(W_1x + b_1) + b_2\big) + b_3 = \underbrace{W_3W_2W_1}_{\text{one matrix}}\,x + \underbrace{W_3W_2b_1 + W_3b_2 + b_3}_{\text{one offset}}`;
        if (step.bend) return String.raw`y = 1\cdot\text{ReLU}(2x + 0.5) + 1\cdot\text{ReLU}(-x + 1) - 1`;
        return String.raw`y = W_2(W_1x + b_1) + b_2 = (1\cdot 2 + 1\cdot(-1))\,x + (1\cdot 0.5 + 1\cdot 1 - 1) = ${coef(LIN_A).replace('−', '-')}x + ${LIN_B}`;
    }
    if (step.scene === 'gallery') return fnTex(step.fn, GALLERY_Z[1]);
    if (step.scene === 'saturation') {
        if (step.chain) return String.raw`\prod_{\ell=1}^{10} \sigma'(z_\ell) \le 0.25^{10} = ${(0.25 ** 10).toExponential(2).replace('e-', '\\times 10^{-')}}, \qquad \prod_{\ell=1}^{10} \text{ReLU}'(z_\ell) = 1`;
        return String.raw`\sigma'(${step.z}) = ${ti(FN.sigmoid.d(step.z), 4)}, \quad \tanh'(${step.z}) = ${ti(FN.tanh.d(step.z), 4)}, \quad \text{ReLU}'(${step.z}) = ${FN.relu.d(step.z)}`;
    }
    if (step.scene === 'hinges') {
        const t = step.tour;
        const terms = t.hinges.slice(0, step.j).map(h => String.raw`${h.s < 0 ? '-' : '+'} ${th(Math.abs(h.s))}\,\text{ReLU}(x ${tsg(-h.k, 1)})`).join(' ');
        return String.raw`y = ${coef(t.r0).replace('−', '-')}x ${t.c < 0 ? '-' : '+'} ${th(Math.abs(t.c))} ${terms}`;
    }
    const fit = step.focus === 'all' ? null : step.fits.find(x => x.activation === step.focus);
    if (fit?.activation === 'linear') { const c = collapse(fit.net); return String.raw`\hat y = ${tn(c.a)}x ${tsg(c.b, 3)}, \qquad \text{MSE} = \tfrac1n \textstyle\sum (\hat y_i - y_i)^2 = ${tn(fit.mse, 4)} = \text{least squares } ${tn(step.ls.mse, 4)}`; }
    if (fit) return String.raw`\hat y = \sum_{i=1}^{${H_TOUR}} v_i\, ${fit.activation === 'relu' ? '\\text{ReLU}' : fit.activation === 'tanh' ? '\\tanh' : '\\sigma'}(w_i x + b_i) + c, \qquad \text{MSE} = ${tn(fit.mse, 4)}`;
    return String.raw`\text{MSE: } ${step.fits.map(x => `\\text{${x.activation === 'linear' ? 'none' : FN[x.activation].name}}\\ ${tn(x.mse, 4)}`).join(',\\quad ')}`;
}

/* ── the explore lab's data and training step ──────────────── */

const LAB_ACTS = [['linear', 'None'], ['sigmoid', 'Sigmoid'], ['tanh', 'Tanh'], ['relu', 'ReLU'], ['leakyRelu', 'Leaky ReLU']];
const LAB_DEFAULTS = { act: 'relu', hidden: 8, layers: 1, data: 'wave' };
const LAB_MAX_LAYERS = 5;
/** Root-mean-square of one layer's weight gradients: how hard backprop is pushing that layer. */
const gradRms = (g) => Math.sqrt(g.reduce((acc, v) => acc + v * v, 0) / g.length);
const LAB_MAX_STEPS = 3000;

function labData(kind, seed) {
    if (kind === 'wave') return curveData(seed, 40);
    const rng = createRng(seed * 3 + 1);
    const X = [], Y = [];
    for (let i = 0; i < 40; i++) {
        const x = rng.next() * 1.8 - 0.9;
        X.push([x]);
        Y.push((kind === 'step' ? (x > 0 ? 0.5 : -0.5) : Math.abs(x) * 1.2 - 0.5) + rng.normal(0, 0.05));
    }
    return { X, Y };
}
/** Mean slope f′(z) of every hidden unit over the data — how far from saturated the layer is. */
function meanSlope(net, X) {
    const { Z } = forward(net, X);
    const d = FN[net.activation]?.d;
    if (!d) return 1;
    let sum = 0, n = 0;
    for (let l = 1; l < net.sizes.length - 1; l++) for (const z of Z[l]) { sum += d(z); n++; }
    return sum / n;
}

const quizQuestions = [
    {
        question: 'A network has two layers and no activation function: h = W₁x + b₁, then y = W₂h + b₂. What can it compute?',
        options: ['Any curve, if the layers are wide enough', 'Only a straight line (an affine function of x)', 'A curve with one bend per hidden unit', 'Only a horizontal line'],
        correct: 1,
        explanation: 'W₂(W₁x + b₁) + b₂ = (W₂W₁)x + (W₂b₁ + b₂): one matrix and one offset, whatever the widths. Without a bend, layers collapse into one.',
    },
    {
        question: 'What is the sigmoid’s largest slope σ′(z), reached at z = 0?',
        options: ['1', '0.5', '0.25', '0'],
        correct: 2,
        explanation: 'σ′(z) = σ(z)(1 − σ(z)), and at z = 0, σ = 0.5, so σ′ = 0.5 × 0.5 = 0.25. Ten sigmoid layers multiply at most 0.25¹⁰ ≈ 10⁻⁶ into the gradient.',
    },
    {
        question: 'A ReLU unit’s weighted sum z is −3 on every training example. What happens to its incoming weights during training?',
        options: ['They grow until z is positive', 'They get zero gradient and stop changing — the unit is dead', 'They shrink towards zero', 'They flip sign'],
        correct: 1,
        explanation: 'ReLU′(z) = 0 for z < 0, so every gradient through the unit is multiplied by 0. Leaky ReLU keeps a small slope (0.01) there so the unit can recover.',
    },
];

const codeExample = `import torch
import torch.nn.functional as F

z = torch.tensor([-1.5, 0.0, 1.5, 4.0], requires_grad=True)
for name, act in [('sigmoid', torch.sigmoid), ('tanh', torch.tanh), ('relu', torch.relu),
                  ('gelu', lambda t: F.gelu(t, approximate='tanh'))]:
    y = act(z)
    (slope,) = torch.autograd.grad(y.sum(), z)   # f'(z) at each z
    print(f'{name:8s}', y.detach().numpy().round(3), slope.numpy().round(4))
# sigmoid  [0.182 0.5   0.818 0.982] [0.1491 0.25   0.1491 0.0177]
# tanh     [-0.905  0.     0.905  0.999] [0.1807 1.     0.1807 0.0013]
# relu     [0.  0.  1.5 4. ] [0. 0. 1. 1.]
# gelu     [-0.1  0.   1.4  4. ] [-0.1277  0.5     1.1277  1.0003]

# Three linear layers with no activation in between are one line:
torch.manual_seed(0)
deep = torch.nn.Sequential(torch.nn.Linear(1, 16), torch.nn.Linear(16, 16), torch.nn.Linear(16, 1))
W = deep[2].weight @ deep[1].weight @ deep[0].weight     # [1, 16] @ [16, 16] @ [16, 1] = [1, 1]
x = torch.tensor([[0.0], [1.0], [2.0]])
y = deep(x).detach().squeeze()
print(W.shape, torch.allclose(y[1] - y[0], y[2] - y[1]), torch.allclose(y[1] - y[0], W.squeeze()))
# torch.Size([1, 1]) True True`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the Why bend and Saturation acts and retry.'}
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

/* ── chart ──────────────────────────────────────────────── */

const r2 = (v) => Math.round(v * 100) / 100;

/** A function chart with independent x and y scales (Plane2D keeps one unit square, which these ranges do not suit). */
function FnChart({ xRange, yRange, curves = [], points = [], marks = [], vlines = [], labels = [], onPickX, width = 520, height = 260, ariaLabel }) {
    const pad = { l: 34, r: 12, t: 10, b: 24 };
    const [x0, x1] = xRange, [y0, y1] = yRange;
    const sx = (x) => r2(pad.l + ((x - x0) / (x1 - x0)) * (width - pad.l - pad.r));
    const sy = (y) => r2(pad.t + ((y1 - y) / (y1 - y0)) * (height - pad.t - pad.b));
    const step = (span) => (span > 8 ? 2 : span > 3 ? 1 : 0.5);
    const ticks = (lo, hi) => { const st = step(hi - lo), out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(Math.round(v * 10) / 10); return out; };
    const path = (fn, samples = 240) => {
        let d = '', down = false;
        const span = y1 - y0;
        for (let i = 0; i <= samples; i++) {
            const x = x0 + ((x1 - x0) * i) / samples, y = fn(x);
            if (!Number.isFinite(y)) { down = false; continue; }
            const yc = Math.min(Math.max(y, y0 - span), y1 + span);
            d += `${down ? 'L' : 'M'}${sx(x)},${sy(yc)}`;
            down = true;
        }
        return d;
    };
    const pick = (e) => {
        if (!onPickX) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = x0 + (((e.clientX - rect.left) / rect.width) * width - pad.l) / (width - pad.l - pad.r) * (x1 - x0);
        onPickX(Math.max(x0, Math.min(x1, x)));
    };
    return (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="block rounded-lg bg-slate-950/60 touch-none" role="img" aria-label={ariaLabel}
            onPointerDown={onPickX ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); } : undefined}
            onPointerMove={onPickX ? (e) => { if (e.buttons) pick(e); } : undefined}
            style={onPickX ? { cursor: 'ew-resize' } : undefined}>
            <defs><clipPath id={`clip-${width}-${height}`}><rect x={pad.l} y={pad.t} width={width - pad.l - pad.r} height={height - pad.t - pad.b} /></clipPath></defs>
            {ticks(x0, x1).map(v => <line key={`x${v}`} x1={sx(v)} x2={sx(v)} y1={pad.t} y2={height - pad.b} stroke={v === 0 ? '#334155' : '#1e293b'} />)}
            {ticks(y0, y1).map(v => <line key={`y${v}`} y1={sy(v)} y2={sy(v)} x1={pad.l} x2={width - pad.r} stroke={v === 0 ? '#334155' : '#1e293b'} />)}
            {ticks(x0, x1).map(v => <text key={`tx${v}`} x={sx(v)} y={height - 8} fontSize="10" textAnchor="middle" fill="#64748b">{String(v).replace('-', '−')}</text>)}
            {ticks(y0, y1).map(v => <text key={`ty${v}`} x={pad.l - 5} y={r2(sy(v) + 3.5)} fontSize="10" textAnchor="end" fill="#64748b">{String(v).replace('-', '−')}</text>)}
            <g clipPath={`url(#clip-${width}-${height})`}>
                {vlines.map((v, i) => <line key={`v${i}`} x1={sx(v.x)} x2={sx(v.x)} y1={pad.t} y2={height - pad.b} stroke={v.color ?? '#facc15'} strokeDasharray={v.dash ?? '4 4'} strokeWidth="1.5" />)}
                {curves.map((c, i) => <path key={`c${i}`} d={path(c.f, c.samples)} fill="none" stroke={c.color} strokeWidth={c.width ?? 2.5} strokeDasharray={c.dash} opacity={c.opacity ?? 1} />)}
                {points.map((p, i) => <circle key={`p${i}`} cx={sx(p.x)} cy={sy(p.y)} r={p.r ?? 3} fill={p.color ?? '#e2e8f0'} opacity={p.opacity ?? 0.85} />)}
                {marks.map((m, i) => <circle key={`m${i}`} cx={sx(m.x)} cy={sy(m.y)} r="5" fill={m.color} stroke="#0f172a" strokeWidth="1.5" />)}
            </g>
            {labels.map((l, i) => <text key={`l${i}`} x={sx(l.x)} y={sy(l.y)} fontSize="11" textAnchor={l.anchor ?? 'middle'} fill={l.color ?? '#e2e8f0'} fontWeight="600">{l.text}</text>)}
        </svg>
    );
}

/** The picture for a guided step. */
function StepChart({ step }) {
    if (step.scene === 'layers') {
        const act = step.bend ? FN.relu.f : (z) => z;
        return (
            <FnChart xRange={[-2, 2]} yRange={[-1.5, 3.5]} ariaLabel="Two hidden units and the output they make"
                curves={[
                    { f: (x) => act(W1[0] * x + B1[0]), color: '#38bdf8', width: 1.5, dash: '5 4' },
                    { f: (x) => act(W1[1] * x + B1[1]), color: '#a78bfa', width: 1.5, dash: '5 4' },
                    { f: (x) => twoLayer(x, act), color: '#fb923c', width: 3 },
                ]}
                labels={[{ x: 1.55, y: 3.1, text: step.bend ? 'ReLU(h₁)' : 'h₁', color: '#38bdf8' }, { x: -1.6, y: 3.1, text: step.bend ? 'ReLU(h₂)' : 'h₂', color: '#a78bfa' }, { x: 0.25, y: -1.1, text: 'y', color: '#fb923c' }]}
            />
        );
    }
    if (step.scene === 'gallery') {
        const fn = FN[step.fn];
        return (
            <FnChart xRange={[-4, 4]} yRange={[-1.5, 2.5]} ariaLabel={`${fn.name} and its slope`}
                curves={[
                    ...FUNCS.filter(o => o.key !== fn.key).map(o => ({ f: o.f, color: o.color, width: 1.2, opacity: 0.25 })),
                    { f: fn.d, color: fn.color, width: 1.8, dash: '5 4' },
                    { f: fn.f, color: fn.color, width: 3 },
                ]}
                marks={step.marks.map(z => ({ x: z, y: fn.f(z), color: fn.color }))}
                labels={[{ x: 3.2, y: 2.2, text: fn.name, color: fn.color }, { x: 3.2, y: -1.25, text: 'dashed: slope', color: '#94a3b8' }]}
            />
        );
    }
    if (step.scene === 'saturation') {
        return (
            <FnChart xRange={[-6, 6]} yRange={[-0.25, 1.15]} ariaLabel="Slopes of sigmoid, tanh and ReLU"
                curves={step.fns.map(k => ({ f: FN[k].d, color: FN[k].color, width: 2.5 }))}
                vlines={[{ x: step.z }]}
                marks={step.fns.map(k => ({ x: step.z, y: FN[k].d(step.z), color: FN[k].color }))}
                labels={[{ x: -4.6, y: 1.03, text: 'slope f′(z)', color: '#94a3b8' }, ...step.fns.map((k, i) => ({ x: 4.3, y: 0.95 - i * 0.12, text: FN[k].name, color: FN[k].color }))]}
            />
        );
    }
    if (step.scene === 'hinges') {
        const t = step.tour, cur = hingeCurve(t, step.j);
        const right = step.j > 0 ? t.hinges[step.j - 1].after : t.r0;
        return (
            <FnChart xRange={[-2, 2]} yRange={t.yRange} ariaLabel="A curve built from ReLU hinges"
                curves={[...t.hinges.slice(0, step.j).map(h => ({ f: (x) => h.s * Math.max(0, x - h.k) + t.yRange[0] + 0.25, color: '#64748b', width: 1.2, dash: '3 3' })), { f: cur, color: '#fb923c', width: 3 }]}
                vlines={[...t.hinges.slice(0, step.j).map(h => ({ x: h.k, color: '#475569', dash: '2 4' })), ...(step.next ? [{ x: step.next.k, color: '#facc15' }] : [])]}
                labels={[{ x: 1.95, y: Math.min(t.yRange[1] - 0.25, Math.max(t.yRange[0] + 0.4, cur(1.95) + (right > 0 ? -0.45 : 0.6))), text: `slope ${half(right)}`, anchor: 'end', color: '#fdba74' }]}
            />
        );
    }
    const { X, Y } = step.data;
    const shown = step.focus === 'all' ? step.fits : step.fits.filter(fit => fit.activation === step.focus);
    const colorOf = (a) => (a === 'linear' ? '#e2e8f0' : FN[a].color);
    const units = shown.length === 1 && shown[0].activation !== 'linear' ? Array.from({ length: H_TOUR }, (_, i) => ({ f: unitAt(shown[0].net, i), color: colorOf(shown[0].activation), width: 1, opacity: 0.35 })) : [];
    return (
        <FnChart xRange={[-1, 1]} yRange={[-1.3, 1.3]} ariaLabel="Training data and the fitted curves"
            points={X.map((x, i) => ({ x: x[0], y: Y[i] }))}
            curves={[...units, ...(step.focus === 'linear' ? [{ f: (x) => step.ls.a * x + step.ls.b, color: '#22c55e', width: 1.5, dash: '6 4' }] : []), ...shown.map(fit => ({ f: netAt(fit.net), color: colorOf(fit.activation), width: 3 }))]}
            labels={shown.map((fit, i) => ({ x: -0.95, y: 1.15 - i * 0.2, text: `${fit.activation === 'linear' ? 'none' : FN[fit.activation].name}  ${f(fit.mse, 4)}`, anchor: 'start', color: colorOf(fit.activation) }))}
        />
    );
}

/* ── explore ───────────────────────────────────────────── */

function FunctionProbe() {
    const [z, setZ] = useState(1.5);
    const [sel, setSel] = useState('sigmoid');
    const fn = FN[sel];
    return (
        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-white font-semibold">Drag z along every function</h2>
                <SourceChip kind="live">Computed in your browser</SourceChip>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {FUNCS.map(o => (
                    <button key={o.key} onClick={() => setSel(o.key)} aria-pressed={sel === o.key}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sel === o.key ? 'text-slate-900 font-semibold' : 'text-slate-300 border-slate-700 hover:border-slate-500'}`}
                        style={sel === o.key ? { background: o.color, borderColor: o.color } : undefined}>{o.name}</button>
                ))}
            </div>
            <FnChart xRange={[-5, 5]} yRange={[-1.5, 3]} onPickX={(x) => setZ(Math.round(x * 20) / 20)} ariaLabel="Every activation function; drag to move z"
                curves={[...FUNCS.filter(o => o.key !== sel).map(o => ({ f: o.f, color: o.color, width: 1.3, opacity: 0.35 })), { f: fn.d, color: fn.color, width: 1.8, dash: '5 4' }, { f: fn.f, color: fn.color, width: 3 }]}
                vlines={[{ x: z }]}
                marks={FUNCS.map(o => ({ x: z, y: o.f(z), color: o.color }))}
                labels={[{ x: 4.9, y: 2.7, text: `${fn.name}; dashed: its slope`, anchor: 'end', color: fn.color }]}
            />
            <ParamSlider label="z" value={z} onChange={setZ} min={-5} max={5} step={0.05} accent="orange" format={(v) => f(v, 2)} hint="Or drag on the chart" />
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="text-slate-500 text-xs"><th className="text-left font-medium py-1">function</th><th className="text-right font-medium">f(z)</th><th className="text-right font-medium">slope f′(z)</th></tr></thead>
                    <tbody>
                        {FUNCS.map(o => (
                            <tr key={o.key} className={`border-t border-slate-800 ${o.key === sel ? 'bg-slate-800/60' : ''}`}>
                                <td className="py-1.5"><span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: o.color }} />{o.name}</td>
                                <td className="text-right font-mono text-slate-200">{f(o.f(z))}</td>
                                <td className={`text-right font-mono ${o.d(z) < 0.02 && o.key !== 'step' ? 'text-rose-300' : 'text-slate-200'}`}>{f(o.d(z), 4)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="text-slate-100 text-sm overflow-x-auto"><Tex block>{fnTex(sel, z)}</Tex></div>
        </div>
    );
}

function TrainLab({ initialSeed }) {
    const [act, setAct] = useState(LAB_DEFAULTS.act);
    const [hidden, setHidden] = useState(LAB_DEFAULTS.hidden);
    const [layers, setLayers] = useState(LAB_DEFAULTS.layers);
    const [data, setData] = useState(LAB_DEFAULTS.data);
    const [seed, setSeed] = useState(initialSeed);
    const { X, Y } = useMemo(() => labData(data, seed), [data, seed]);
    const sizes = useMemo(() => [1, ...Array(layers).fill(hidden), 1], [layers, hidden]);

    const trainer = useTrainer({
        init: () => {
            const net = createMLP(sizes, { activation: act, output: 'linear', seed });
            return { net, opt: createOptimizer(net, { type: 'adam', lr: LR }) };
        },
        step: (st) => { const g = lossAndGrads(st.net, X, Y); st.opt.step(g); return { loss: g.dataLoss }; },
        deps: [act, sizes, X, seed],
        maxSteps: LAB_MAX_STEPS,
    });
    const net = trainer.state.net;
    const grads = lossAndGrads(net, X, Y);
    const mse = grads.dataLoss;
    const gFirst = gradRms(grads.gradW[0]);
    // Once training converges every gradient is small, so the layers are compared where they start.
    const atInit = useMemo(() => {
        const g0 = lossAndGrads(createMLP(sizes, { activation: act, output: 'linear', seed }), X, Y);
        return { first: gradRms(g0.gradW[0]), last: gradRms(g0.gradW[sizes.length - 3]) };
    }, [sizes, act, seed, X, Y]);
    const ls = lsLine(X, Y);
    const col = act === 'linear' ? collapse(net) : null;
    const slope = act === 'linear' ? null : meanSlope(net, X);
    const color = act === 'linear' ? '#e2e8f0' : FN[act].color;
    const units = layers === 1 && act !== 'linear' ? Array.from({ length: hidden }, (_, i) => ({ f: unitAt(net, i), color, width: 1, opacity: 0.3 })) : [];

    const broken = [];
    if (act === 'linear') broken.push(`No activation: this ${layers}-layer network of ${hidden} units is the line y = ${f(col.a)}x ${sg(col.b, 3)}, and training can only make it the least-squares line, y = ${f(ls.a)}x ${sg(ls.b, 3)} (error ${f(ls.mse, 4)}). Add layers and it is still a line.`);
    if (act === 'sigmoid' && layers >= 3) broken.push(`Stacked sigmoids: on its way back, the gradient is multiplied by a slope of at most 0.25 in every layer. At the start of training the first layer's weight gradient was ${sci(atInit.first)}, ${f(atInit.last / atInit.first, 0)}× smaller than the last hidden layer's (${sci(atInit.last)}). The loss still falls because Adam divides each weight's step by that weight's own recent gradient size; plain gradient descent steps in proportion to the gradient itself. Vanishing and Exploding Gradients follows this through a deep network.`);
    const repair = () => { setAct(LAB_DEFAULTS.act); setHidden(LAB_DEFAULTS.hidden); setLayers(LAB_DEFAULTS.layers); };

    return (
        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-white font-semibold">Train a network with each activation</h2>
                <SourceChip kind="live">Trained live in your browser · same seed, same run</SourceChip>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-2 min-w-0">
                    <FnChart xRange={[-1, 1]} yRange={[-1.3, 1.3]} ariaLabel="Data, the network's fit and each hidden unit's contribution"
                        points={X.map((x, i) => ({ x: x[0], y: Y[i] }))}
                        curves={[...units, ...(act === 'linear' ? [{ f: (x) => ls.a * x + ls.b, color: '#22c55e', width: 1.5, dash: '6 4' }] : []), { f: netAt(net), color, width: 3 }]}
                    />
                    <p className="text-[11px] text-slate-500">{layers === 1 && act !== 'linear' ? 'Thin lines: each hidden unit’s contribution vᵢ·f(wᵢx + bᵢ); the thick line is their sum.' : act === 'linear' ? 'Green dashed: the least-squares line.' : 'Thick line: the network’s output.'}</p>
                </div>
                <div className="space-y-3 min-w-0">
                    <div className="grid grid-cols-2 gap-2 text-center">
                        {[['step', trainer.steps], ['error (MSE)', f(mse, 4)], [act === 'linear' ? 'line slope' : 'mean f′(z)', act === 'linear' ? f(col.a) : f(slope, 3)], ['W1 gradient', sci(gFirst)]].map(([k, v]) => (
                            <div key={k} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
                                <div className="font-mono text-sm text-slate-100 tabular-nums">{v}</div>
                            </div>
                        ))}
                    </div>
                    <TrainingCurve logY xLabel="step" series={[{ name: 'training error', color, points: trainer.history.map(h => ({ x: h.step, y: h.loss })) }]} height={130} />
                    <div className="flex flex-wrap gap-1.5">
                        <ShapeTag label="X" names={['n', 'in']} shape={[X.length, 1]} />
                        {net.W.map((w, l) => <ShapeTag key={l} label={`W${l + 1}`} names={['out', 'in']} shape={[sizes[l + 1], sizes[l]]} />)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={trainer.toggle} disabled={trainer.steps >= LAB_MAX_STEPS}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-40">
                            {trainer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{trainer.running ? 'Pause' : 'Train'}
                        </button>
                        <button onClick={() => trainer.stepOnce(50)} disabled={trainer.steps >= LAB_MAX_STEPS} className="text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40">+50 steps</button>
                        <button onClick={trainer.reset} aria-label="Reset the weights" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                        <button onClick={() => setSeed(randomSeed())} aria-label="New data and weights" title="New data and weights" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <label className="block">
                    <span className="block text-sm font-medium text-slate-300 mb-1">Activation</span>
                    <select value={act} onChange={e => setAct(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200">
                        {LAB_ACTS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="block text-sm font-medium text-slate-300 mb-1">Target</span>
                    <select value={data} onChange={e => setData(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200">
                        <option value="wave">Wave</option>
                        <option value="step">Step</option>
                        <option value="vee">V shape</option>
                    </select>
                </label>
                <ParamSlider label="Units per layer" value={hidden} onChange={setHidden} min={1} max={16} step={1} accent="orange" />
                <ParamSlider label="Hidden layers" value={layers} onChange={setLayers} min={1} max={LAB_MAX_LAYERS} step={1} accent="orange" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                <button onClick={() => { setAct('linear'); setLayers(3); setHidden(16); }} disabled={act === 'linear' && layers === 3 && hidden === 16}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500 disabled:opacity-40">Remove the activation (3 layers)</button>
                <button onClick={() => { setAct('sigmoid'); setLayers(LAB_MAX_LAYERS); setHidden(8); }} disabled={act === 'sigmoid' && layers === LAB_MAX_LAYERS && hidden === 8}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500 disabled:opacity-40">Stack {LAB_MAX_LAYERS} sigmoid layers</button>
                <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                    <Wrench className="h-3.5 w-3.5" />Repair
                </button>
            </div>
            {broken.map(msg => <p key={msg} className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{msg}</p>)}
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function ActivationFunctionsPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    // Training happens inside generateSteps, so the steps are built after mount: the server never trains.
    const [stepHistory, setStepHistory] = useState([]);
    useEffect(() => { setStepHistory(generateSteps(seed)); }, [seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided' || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(Math.max(0, stepHistory.findIndex(s => s.act === act))); };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/neural-networks" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Neural Networks
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Activation Functions</h1>
                    <p className="text-orange-100 max-w-3xl">
                        The bend after every weighted sum. Without it, a hundred layers are one straight line; with it, a layer of units can draw a curve. Compare six of them, their slopes, and what they let a real network learn.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['The Perceptron', '/neural-networks/the-perceptron'], ['The Derivative', '/differential-calculus/the-derivative']].map(([name, href]) => (
                            <Link key={href} href={href} className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">{name}</Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                            {[['guided', 'Guided tour', Compass], ['explore', 'Explore', SlidersHorizontal]].map(([key, label, Icon]) => (
                                <button key={key} role="tab" aria-selected={mode === key} onClick={() => { setMode(key); setIsPlaying(false); }}
                                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                    <Icon className="h-4 w-4" />{label}
                                </button>
                            ))}
                        </div>
                        {mode === 'guided' && <SourceChip kind="live">Every number computed in your browser</SourceChip>}
                    </div>

                    {mode === 'explore' ? (
                        <>
                            <FunctionProbe />
                            <TrainLab initialSeed={seed} />
                        </>
                    ) : !step ? (
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 min-h-[420px] flex items-center justify-center text-sm text-slate-500">Training the tour&apos;s networks…</div>
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
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    <div className="min-h-[300px] flex flex-col justify-center gap-2">
                                        <StepChart step={step} />
                                        {step.scene === 'fit' && (
                                            <div className="flex flex-wrap gap-1.5">
                                                <ShapeTag label="X" names={['n', 'in']} shape={[step.data.X.length, 1]} />
                                                <ShapeTag label="W1" names={['out', 'in']} shape={[H_TOUR, 1]} />
                                                <ShapeTag label="W2" names={['out', 'in']} shape={[1, H_TOUR]} />
                                            </div>
                                        )}
                                        {step.scene === 'layers' && (
                                            <div className="flex flex-wrap gap-1.5">
                                                <ShapeTag label="W1" names={['out', 'in']} shape={[2, 1]} />
                                                <ShapeTag label="W2" names={['out', 'in']} shape={[1, 2]} />
                                                <ShapeTag label="W2·W1" shape={[1, 1]} />
                                            </div>
                                        )}
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
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New hinges and data" title="New hinges and data"
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
                                <Tex block>{formulaFor(step)}</Tex>
                            </div>
                        </>
                    )}

                    <InCode title="The same functions and slopes in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">At a glance</h2>
                        <table className="w-full text-xs">
                            <thead><tr className="text-slate-500"><th className="text-left font-medium pb-1">function</th><th className="text-left font-medium">range</th><th className="text-left font-medium">steepest</th></tr></thead>
                            <tbody>
                                {FUNCS.map(o => (
                                    <tr key={o.key} className={`border-t border-slate-800 ${step?.fn === o.key ? 'bg-slate-800/60' : ''}`}>
                                        <td className="py-1.5 pr-2 text-slate-200"><span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: o.color }} />{o.name}</td>
                                        <td className="pr-2 text-slate-400">{o.range}</td>
                                        <td className="text-slate-400">{o.maxSlope}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;More layers make a network more powerful, with or without activation functions.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Without them, every extra layer multiplies into the same single matrix. On {DEPTH_STUDY.sets} seeded wave datasets, a network of two 16-unit layers with no activation finished within a millionth of the least-squares line&apos;s error every time (mean {DEPTH_STUDY.linMean}). One 16-unit layer with ReLU averaged {DEPTH_STUDY.reluMean} — a median {DEPTH_STUDY.ratioMedian}× lower, and better on {DEPTH_STUDY.reluBetter === DEPTH_STUDY.sets ? 'every one' : `${DEPTH_STUDY.reluBetter}`}.
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
