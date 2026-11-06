"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, SlidersHorizontal, Shuffle,
    Network, Layers, Sigma, Repeat, Grid3x3, ZoomOut, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { makeDataset } from '@/lib/ml/datasets';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import Heatmap from '@/components/ml/Heatmap';
import NetworkDiagram from '@/components/ml/NetworkDiagram';
import DecisionField from '@/components/ml/DecisionField';
import ProbBars from '@/components/ml/ProbBars';
import { AI_COLORS } from '@/components/ml/colors';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the network ────────────────────────────────────────────
   A 2-3-2 network (ReLU hidden layer, softmax output) trained for this page
   on the XOR data below: Adam, learning rate 0.05, L2 0.002, 3,000 steps from
   init seed 7, then every parameter rounded to one decimal so each product on
   screen can be checked by hand. The test suite retrains it and checks that
   rounding gives exactly these numbers. */

const NET = {
    W1: [[0.8, 3.3], [-3.4, -1.1], [-3.1, 2.8]],
    b1: [0.4, 0.2, -0.1],
    W2: [[2.4, 2.5, -3], [-2.4, -2.5, 3]],
    b2: [-1.6, 1.6],
};
const N_PARAMS = 6 + 3 + 6 + 2;
const XOR = makeDataset('xor', { n: 120, noise: 0.1, seed: 11 });
const FRESH = makeDataset('xor', { n: 1000, noise: 0.1, seed: 12 });
const CLASS_NAMES = ['blue', 'orange'];

/** Snap away float noise so a sum that is exactly 0 on paper is exactly 0 here. */
const snap = (v) => Math.round(v * 1e9) / 1e9;
const softmax = (z) => {
    const m = Math.max(...z);
    const e = z.map(v => Math.exp(v - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / s);
};
/** The textbook formula with no max subtracted: e^z overflows above z ≈ 709.78 in float64. */
const naiveSoftmax = (z) => {
    const e = z.map(v => Math.exp(v));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / s);
};

/** The whole forward pass for one point, every intermediate kept. */
function trace(x, { relu = true } = {}) {
    const z1 = NET.W1.map((w, k) => snap(w[0] * x[0] + w[1] * x[1] + NET.b1[k]));
    const h = z1.map(z => (relu ? Math.max(0, z) : z));
    const z2 = NET.W2.map((w, o) => snap(w[0] * h[0] + w[1] * h[1] + w[2] * h[2] + NET.b2[o]));
    const p = softmax(z2);
    return { x, z1, h, z2, p, cls: z2[1] > z2[0] ? 1 : 0 };
}
const correctOn = (data, opts) => data.X.filter((x, i) => trace(x, opts).cls === data.y[i]).length;
const TRAIN_RIGHT = correctOn(XOR);
const FRESH_RIGHT = correctOn(FRESH);

/* ── numbers as text ───────────────────────────────────── */

/** At most d decimals, trailing zeros trimmed, true minus sign. */
const fmt = (v, d = 3) => {
    let s = (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('-', '−');
};
const tx = (v, d = 3) => fmt(v, d).replace('−', '-');
const plusMinus = (v, d = 3) => (v < 0 ? `− ${fmt(-v, d)}` : `+ ${fmt(v, d)}`);
const tPlusMinus = (v, d = 3) => (v < 0 ? `- ${tx(-v, d)}` : `+ ${tx(v, d)}`);
const vec = (a, d = 3) => `(${a.map(v => fmt(v, d)).join(', ')})`;
const tvec = (a, d = 3) => String.raw`\begin{pmatrix}${a.map(v => tx(v, d)).join(String.raw`\\`)}\end{pmatrix}`;
/** A probability: 3 decimals, or 4 when 3 would round to 0 or 1, or a bound beyond that. */
const fmtP = (v) => {
    const three = v.toFixed(3), four = v.toFixed(4);
    if (three !== '0.000' && three !== '1.000') return fmt(v, 3);
    if (four !== '0.0000' && four !== '1.0000') return four;
    return v < 0.5 ? '< 0.0001' : '> 0.9999';
};
const pvec = (a) => `(${a.map(fmtP).join(', ')})`;
const tpvec = (a) => String.raw`\begin{pmatrix}${a.map(v => fmtP(v).replace('< ', '<').replace('> ', '>')).join(String.raw`\\`)}\end{pmatrix}`;
const SUB = ['₀', '₁', '₂', '₃', '₄'];
const pct = (k, n) => `${((100 * k) / n).toFixed(1)}%`;

/** Unit k's sum written out: "(0.8)(0.6) + (3.3)(−0.3) + 0.4". */
const unitTerms = (k, x) => `(${fmt(NET.W1[k][0], 1)})(${fmt(x[0], 1)}) + (${fmt(NET.W1[k][1], 1)})(${fmt(x[1], 1)}) ${plusMinus(NET.b1[k], 1)}`;
const unitProducts = (k, x) => {
    const a = snap(NET.W1[k][0] * x[0]), b = snap(NET.W1[k][1] * x[1]);
    return `${fmt(a, 2)} ${plusMinus(b, 2)} ${plusMinus(NET.b1[k], 1)}`;
};

/* ── the tour ─────────────────────────────────────────── */

const N_POINTS = 4;
const DEFAULT_SEED = 23;
const FLOAT64_EXP_MAX = Math.log(Number.MAX_VALUE);           // 709.78
const FLOAT32_EXP_MAX = Math.log(3.4028234663852886e38);      // 88.72
const GRID = 48;

/** Four points on the 0.1 grid inside the data's square. None sits on an axis, and no
    hidden unit's sum is within 0.05 of 0, so "passes or outputs 0" is never a hair's breadth. */
function tourPoints(seed) {
    const rng = createRng(seed * 13 + 5);
    const pts = [];
    while (pts.length < N_POINTS) {
        const x = [rng.int(-10, 10) / 10, rng.int(-10, 10) / 10];
        if (x[0] === 0 || x[1] === 0 || pts.some(p => p[0] === x[0] && p[1] === x[1])) continue;
        if (trace(x).z1.some(z => Math.abs(z) < 0.05)) continue;
        pts.push(x);
    }
    return pts;
}

const ACTS = [
    { id: 1, label: 'The network', icon: Network },
    { id: 2, label: 'Hidden layer', icon: Layers },
    { id: 3, label: 'Softmax', icon: Sigma },
    { id: 4, label: 'More points', icon: Repeat },
    { id: 5, label: 'Batch', icon: Grid3x3 },
    { id: 6, label: 'The plane', icon: ZoomOut },
];

/* Which unit steps get a prompt. All three units lean the same way (two face up, two face
   left), so over random points "x₂ > 0 means it passes" would score 68% and "x₁ < 0 means it
   passes" 71% without reading a single weight. Each unit step is asked with a probability set by
   its cell — the answer (a), and whether the x₁-sign and x₂-sign shortcuts would be right
   (g1, g2) — chosen so that among the prompts asked, the answer and both shortcuts are each
   right half the time. Solved from the cell frequencies of tourPoints. Neighbouring units then
   tend to disagree (unit 2 faces away from units 1 and 3), so an answer that differs from the last
   one asked is kept with probability ALT, which brings "same as the last answer" back to a coin
   toss. About 5 prompts per tour. */
const ASK = { '000': 0.95, '001': 0.11, '010': 1, '011': 1, '100': 0.92, '101': 0.06, '110': 1, '111': 1 };
const ALT = 0.6;
const askCell = (t, k) => {
    const a = t.z1[k] > 0 ? 1 : 0;
    return `${a}${(t.x[0] > 0 ? 1 : 0) === a ? 1 : 0}${(t.x[1] > 0 ? 1 : 0) === a ? 1 : 0}`;
};

function unitSentence(k, t, pi) {
    const z = t.z1[k];
    return `Point ${pi + 1}, unit ${k + 1}: z${SUB[k + 1]} = ${unitTerms(k, t.x)} = ${unitProducts(k, t.x)} = ${fmt(z, 2)}. `
        + (z > 0 ? `Positive, so ReLU passes it on: h${SUB[k + 1]} = ${fmt(z, 2)}.` : `Negative, so ReLU outputs h${SUB[k + 1]} = 0.`);
}

function generateSteps(seed) {
    const steps = [];
    const s = (act, data, explanation) => steps.push({ act, actName: ACTS[act - 1].label, ...data, explanation });
    const pts = tourPoints(seed);
    const traces = pts.map(x => trace(x));
    const askRng = createRng(seed * 31 + 7);
    let lastAsked = null;
    const asks = traces.map(t => [0, 1, 2].map(k => {
        const a = t.z1[k] > 0 ? 1 : 0;
        const ask = askRng.chance(ASK[askCell(t, k)] * (lastAsked !== null && a !== lastAsked ? ALT : 1));
        if (ask) lastAsked = a;
        return ask;
    }));
    const t0 = traces[0];

    s(1, { scene: 'intro' }, `This network has 2 inputs, 3 hidden ReLU units and 2 outputs, and it was trained on the XOR data the perceptron could not separate. It classifies ${TRAIN_RIGHT} of the 120 training points correctly, and ${FRESH_RIGHT} of 1,000 fresh points drawn the same way (${pct(FRESH_RIGHT, 1000)}).`);
    s(1, { scene: 'params' }, `All it knows is ${N_PARAMS} numbers: W₁ is [3, 2], one row of two weights per hidden unit; b₁ holds 3 biases; W₂ is [2, 3], one row per output; b₂ holds 2. 6 + 3 + 6 + 2 = ${N_PARAMS}. A forward pass multiplies and adds them in order — nothing else.`);

    s(2, { scene: 'point', pi: 0, t: t0, known: 0 }, `Trace one input: point 1 is x = ${vec(t0.x, 1)}. The forward pass starts from these two numbers and visits the hidden units one at a time.`);
    for (let k = 0; k < 3; k++) {
        s(2, { scene: 'unit', pi: 0, t: t0, unit: k, known: k + 1, ask: asks[0][k] }, `${unitSentence(k, t0, 0)} The line on the plane is where unit ${k + 1}'s sum is exactly 0; on its shaded side the unit is on.`);
    }
    s(2, { scene: 'layer', pi: 0, t: t0, known: 3 }, `All three units at once are one matrix product: z₁ = W₁x + b₁ = ${vec(t0.z1, 2)}, and ReLU zeroes the negatives: h = ${vec(t0.h, 2)}. W₁ is [3, 2] and x is [2], so z₁ is [3].`);

    s(3, { scene: 'scores', pi: 0, t: t0, known: 3, out: 'scores' }, `The output layer does the same with W₂: z₂ = W₂h + b₂ = ${vec(t0.z2)}. These two scores (logits) are not probabilities: they can be any size and either sign.${t0.h.every(v => v === 0) ? ' Every hidden unit is off for this point, so W₂h = 0 and the scores are just the biases b₂: the answer for this whole region is stored in b₂.' : ''}`);
    const e0 = t0.z2.map(Math.exp);
    s(3, { scene: 'softmax', pi: 0, t: t0, known: 3, out: 'probs' }, `Softmax turns scores into probabilities: p = e^z ÷ Σ e^z. e^${fmt(t0.z2[0])} = ${fmt(e0[0], 4)} and e^${fmt(t0.z2[1])} = ${fmt(e0[1], 4)}, so p = ${pvec(t0.p)}. The network says ${CLASS_NAMES[t0.cls]}, with probability ${fmtP(t0.p[t0.cls])}.`);
    const m0 = Math.max(...t0.z2);
    s(3, { scene: 'stable', pi: 0, t: t0, known: 3, out: 'probs' }, `In practice softmax first subtracts the largest score, ${fmt(m0)}: the exponents become ${vec(t0.z2.map(v => snap(v - m0)))} and p = ${pvec(t0.p)} — identical, because e^(−max) cancels top and bottom. It matters for big scores: e^z overflows to infinity above z = ${fmt(FLOAT64_EXP_MAX, 2)} in float64 (${fmt(FLOAT32_EXP_MAX, 2)} in float32), and ∞ ÷ ∞ is not a number.`);

    for (let pi = 1; pi < N_POINTS; pi++) {
        const t = traces[pi];
        for (let k = 0; k < 3; k++) s(4, { scene: 'unit', pi, t, unit: k, known: k + 1, ask: asks[pi][k] }, unitSentence(k, t, pi));
        s(4, { scene: 'summary', pi, t, known: 3, out: 'probs' }, `Point ${pi + 1} = ${vec(t.x, 1)}: h = ${vec(t.h, 2)}, scores z₂ = ${vec(t.z2)}, p = ${pvec(t.p)} — ${CLASS_NAMES[t.cls]}, with ${fmtP(t.p[t.cls])}.`);
    }

    s(5, { scene: 'batch', stage: 'hidden', traces }, `Stack the ${N_POINTS} points as rows and X is [${N_POINTS}, 2]. One product does every unit for every point: Z₁ = XW₁ᵀ + b₁ is [${N_POINTS}, 2] × [2, 3] = [${N_POINTS}, 3], and ReLU keeps the shape: H is [${N_POINTS}, 3]. Each row of H is one point's h from the tour.`);
    s(5, { scene: 'batch', stage: 'out', traces }, `Then Z₂ = HW₂ᵀ + b₂ is [${N_POINTS}, 3] × [3, 2] = [${N_POINTS}, 2], and softmax along each row gives P, also [${N_POINTS}, 2]; every row sums to 1. Four points or four million, the forward pass is two matrix products and two element-wise functions.`);

    s(6, { scene: 'plane', traces }, `Run the same forward pass on a ${GRID} × ${GRID} grid — ${(GRID * GRID).toLocaleString('en-US')} points in one batch — and colour each by its class, stronger where p is closer to 1. That picture is the decision region: the three half-planes from the hidden units, added up and squashed by softmax. Open Explore to trace any point you click.`);
    return steps;
}

/** Before each hidden unit's step: will ReLU pass the sum on, or output 0? */
function predictFor(step, next) {
    if (!next || next.scene !== 'unit' || !next.ask) return null;
    const k = next.unit, t = next.t, z = t.z1[k];
    return {
        question: `Point ${next.pi + 1} is x = ${vec(t.x, 1)}. Unit ${k + 1} computes ${unitTerms(k, t.x)}. Does ReLU pass that sum on, or output 0?`,
        options: ['Passes it on', 'Outputs 0'],
        correct: z > 0 ? 0 : 1,
        because: `${unitProducts(k, t.x)} = ${fmt(z, 2)}, which is ${z > 0 ? 'positive, so ReLU passes it on unchanged' : 'negative, so ReLU outputs 0'}.`,
    };
}

/* ── shared geometry ───────────────────────────────────── */

const PLANE = 1.2;
/** The part of the square [−r, r]² where w·x + b ≥ 0 (Sutherland–Hodgman against one half-plane). */
function halfPlane(w, b, r = PLANE) {
    const sq = [[-r, -r], [r, -r], [r, r], [-r, r]];
    const f = (p) => w[0] * p[0] + w[1] * p[1] + b;
    const out = [];
    for (let i = 0; i < sq.length; i++) {
        const a = sq[i], c = sq[(i + 1) % sq.length];
        const fa = f(a), fc = f(c);
        if (fa >= 0) out.push(a);
        if ((fa >= 0) !== (fc >= 0)) { const t = fa / (fa - fc); out.push([a[0] + t * (c[0] - a[0]), a[1] + t * (c[1] - a[1])]); }
    }
    return out;
}
/** Where unit k's line w·x + b = 0 crosses the square, as two end points (or null). */
function unitLine(k, r = PLANE) {
    const [w0, w1] = NET.W1[k], b = NET.b1[k];
    const pts = [];
    if (w1 !== 0) for (const x of [-r, r]) { const y = -(w0 * x + b) / w1; if (y >= -r && y <= r) pts.push([x, y]); }
    if (w0 !== 0) for (const y of [-r, r]) { const x = -(w1 * y + b) / w0; if (x > -r && x < r) pts.push([x, y]); }
    return pts.length >= 2 ? pts.slice(0, 2) : null;
}
/** Collapse the network without ReLU: z₂ = (W₂W₁)x + (W₂b₁ + b₂). */
function collapsed() {
    const M = NET.W2.map(row => [0, 1].map(j => snap(row.reduce((acc, w, k) => acc + w * NET.W1[k][j], 0))));
    const c = NET.W2.map((row, o) => snap(row.reduce((acc, w, k) => acc + w * NET.b1[k], 0) + NET.b2[o]));
    return { M, c };
}

/* ── formulas ─────────────────────────────────────────── */

const tmat = (rows, d = 3) => String.raw`\begin{pmatrix}${rows.map(r => r.map(v => tx(v, d)).join(' & ')).join(String.raw`\\`)}\end{pmatrix}`;

function formulaFor(step) {
    const t = step.t;
    switch (step.scene) {
        case 'intro':
        case 'plane':
            return String.raw`p = \operatorname{softmax}\big(W_2\,\operatorname{ReLU}(W_1 x + b_1) + b_2\big)`;
        case 'params':
            return String.raw`W_1 \in \mathbb{R}^{3\times 2},\; b_1 \in \mathbb{R}^{3},\; W_2 \in \mathbb{R}^{2\times 3},\; b_2 \in \mathbb{R}^{2}: \quad 6 + 3 + 6 + 2 = ${N_PARAMS}`;
        case 'point':
            return String.raw`x = ${tvec(t.x, 1)}`;
        case 'unit': {
            const k = step.unit, z = t.z1[k], a = snap(NET.W1[k][0] * t.x[0]), b = snap(NET.W1[k][1] * t.x[1]);
            return String.raw`\begin{gathered} z_${k + 1} = (${tx(NET.W1[k][0], 1)})(${tx(t.x[0], 1)}) + (${tx(NET.W1[k][1], 1)})(${tx(t.x[1], 1)}) ${tPlusMinus(NET.b1[k], 1)} = ${tx(a, 2)} ${tPlusMinus(b, 2)} ${tPlusMinus(NET.b1[k], 1)} = ${tx(z, 2)} \\ h_${k + 1} = \max(0, ${tx(z, 2)}) = ${tx(t.h[k], 2)} \end{gathered}`;
        }
        case 'layer':
            return String.raw`\begin{gathered} z_1 = W_1 x + b_1 = ${tmat(NET.W1, 1)}${tvec(t.x, 1)} + ${tvec(NET.b1, 1)} = ${tvec(t.z1, 2)} \\ h = \operatorname{ReLU}(z_1) = ${tvec(t.h, 2)} \end{gathered}`;
        case 'scores':
            return String.raw`z_2 = W_2 h + b_2 = ${tmat(NET.W2, 1)}${tvec(t.h, 2)} + ${tvec(NET.b2, 1)} = ${tvec(t.z2)}`;
        case 'softmax': {
            const e = t.z2.map(Math.exp);
            return String.raw`p = \frac{e^{z}}{\sum_j e^{z_j}} = \frac{1}{${tx(e[0], 4)} + ${tx(e[1], 4)}}${tvec(e.map(v => snap(Math.round(v * 1e4) / 1e4)), 4)} = ${tpvec(t.p)}`;
        }
        case 'stable': {
            const m = Math.max(...t.z2), d = t.z2.map(v => snap(v - m)), e = d.map(Math.exp);
            return String.raw`\begin{gathered} p = \frac{e^{z - ${tx(m)}}}{\sum_j e^{z_j - ${tx(m)}}}, \quad z - ${tx(m)} = ${tvec(d)} \\ p = \frac{1}{${tx(e[0], 4)} + ${tx(e[1], 4)}}${tvec(e.map(v => Math.round(v * 1e4) / 1e4), 4)} = ${tpvec(t.p)} \end{gathered}`;
        }
        case 'summary':
            return String.raw`x = ${tvec(t.x, 1)} \;\to\; h = ${tvec(t.h, 2)} \;\to\; z_2 = ${tvec(t.z2)} \;\to\; p = ${tpvec(t.p)}`;
        case 'batch':
            return step.stage === 'hidden'
                ? String.raw`\underbrace{H}_{[${N_POINTS},\,3]} = \operatorname{ReLU}\big(\underbrace{X}_{[${N_POINTS},\,2]}\,\underbrace{W_1^{\top}}_{[2,\,3]} + b_1\big)`
                : String.raw`\underbrace{P}_{[${N_POINTS},\,2]} = \operatorname{softmax}\big(\underbrace{H}_{[${N_POINTS},\,3]}\,\underbrace{W_2^{\top}}_{[3,\,2]} + b_2\big)`;
        default:
            return '';
    }
}

/* ── the misconception, measured ───────────────────────────
   Points on a circle of radius 5 (no training point is farther than 1.18 from
   the centre), 360 directions. "page" is this network; "nets" retrains the same
   recipe from init seeds 1–100 and keeps those that reach 90% on the training
   data (the rest stall near 78%, a known XOR local minimum). Measured by the
   suite's fp-study.mjs. */
const FAR = { radius: 5, page: 0.786, pageMeanTop: 0.985, tried: 100, nets: 26, netsMedian: 0.81 };

const quizQuestions = [
    {
        question: 'A layer takes 3 inputs and has 4 units. In h = f(Wx + b), what shape is W?',
        options: ['[4, 3]', '[3, 4]', '[4, 4]', '[3, 1]'],
        correct: 0,
        explanation: 'W has one row per unit and one column per input, [out, in] = [4, 3]. Then Wx is [4, 3] times [3], which gives the 4 sums. PyTorch stores nn.Linear(3, 4).weight with exactly this shape.',
    },
    {
        question: 'A hidden unit has weights (0.5, −1) and bias 0.2. The input is x = (2, 1.5). What does the ReLU unit output?',
        options: ['0', '−0.3', '0.3', '1.2'],
        correct: 0,
        explanation: 'z = (0.5)(2) + (−1)(1.5) + 0.2 = 1 − 1.5 + 0.2 = −0.3. ReLU outputs max(0, z), and z is negative, so the unit outputs 0.',
    },
    {
        question: 'You add 100 to both output scores before softmax. What happens to the probabilities?',
        options: ['Nothing: they are unchanged', 'Both rise', 'The larger one moves toward 1', 'They overflow, so softmax fails'],
        correct: 0,
        explanation: 'Softmax depends only on the differences between scores: e^(z + 100) = e^100 · e^z, and the e^100 cancels top and bottom. That is why subtracting the largest score first is safe — and e^100 ≈ 2.7 × 10⁴³ is still far below float64’s limit.',
    },
];

const codeExample = `import torch

W1 = torch.tensor([[0.8, 3.3], [-3.4, -1.1], [-3.1, 2.8]])   # [3, 2]: one row per hidden unit
b1 = torch.tensor([0.4, 0.2, -0.1])
W2 = torch.tensor([[2.4, 2.5, -3.0], [-2.4, -2.5, 3.0]])     # [2, 3]: one row per output
b2 = torch.tensor([-1.6, 1.6])

x = torch.tensor([-0.2, -0.3])
z1 = W1 @ x + b1                  # [3]
h = torch.relu(z1)
z2 = W2 @ h + b2                  # [2] scores
p = torch.softmax(z2, dim=0)      # subtracts the max internally
print(z1, h, z2, p, sep='\\n')
# tensor([-0.7500,  1.2100, -0.3200])
# tensor([0.0000, 1.2100, 0.0000])
# tensor([ 1.4250, -1.4250])
# tensor([0.9453, 0.0547])

# A batch: rows are points. Same two products, any number of rows.
X = torch.tensor([[-0.2, -0.3], [0.5, 0.2], [0.2, 0.3], [-0.6, 0.3]])
P = torch.softmax(torch.relu(X @ W1.T + b1) @ W2.T + b2, dim=1)
print(X.shape, P.shape, P.sum(dim=1))
print(P[:, 0])                    # p(blue) for each point
# torch.Size([4, 2]) torch.Size([4, 2]) tensor([1., 1., 1., 1.])
# tensor([0.9453, 0.9783, 0.9713, 0.0075])`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the Hidden layer and Softmax acts and retry.'}
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

/* ── pictures ─────────────────────────────────────────── */

const W1_FLAT = NET.W1.flat(), W2_FLAT = NET.W2.flat();
const DATA_POINTS = XOR.X.map((x, i) => ({ x: x[0], y: x[1], label: XOR.y[i] }));
const PX = 300;
const toPx = ([x, y]) => [Math.round(((x + PLANE) / (2 * PLANE)) * PX * 100) / 100, Math.round(((PLANE - y) / (2 * PLANE)) * PX * 100) / 100];
const UNIT_COLORS = ['#a3e635', '#e879f9', '#facc15'];

/** The input plane: the data faintly, one hidden unit's line and "on" side, and the traced point. */
function UnitPlane({ point, unit = null, faintLines = false }) {
    const [cx, cy] = toPx(point);
    return (
        <svg viewBox={`0 0 ${PX} ${PX}`} width="100%" role="img" aria-label="The input plane" className="block rounded-lg border border-slate-700 bg-slate-950">
            <line x1={PX / 2} x2={PX / 2} y1="0" y2={PX} stroke="#334155" />
            <line y1={PX / 2} y2={PX / 2} x1="0" x2={PX} stroke="#334155" />
            {unit !== null && (
                <polygon points={halfPlane(NET.W1[unit], NET.b1[unit]).map(p => toPx(p).join(',')).join(' ')} fill={UNIT_COLORS[unit]} fillOpacity="0.13" />
            )}
            {DATA_POINTS.map((p, i) => {
                const [x, y] = toPx([p.x, p.y]);
                return <circle key={i} cx={x} cy={y} r="3" fill={AI_COLORS.classes[p.label]} opacity="0.35" />;
            })}
            {[0, 1, 2].map(k => {
                if (unit !== k && !faintLines) return null;
                const seg = unitLine(k);
                if (!seg) return null;
                const [a, b] = seg.map(toPx);
                return <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={UNIT_COLORS[k]} strokeWidth={unit === k ? 2.5 : 1.2} strokeOpacity={unit === k ? 1 : 0.6} strokeDasharray={unit === k ? undefined : '5 4'} />;
            })}
            <circle cx={cx} cy={cy} r="7" fill="#f8fafc" stroke={AI_COLORS.highlight} strokeWidth="3" />
            <text x={Math.min(cx + 10, PX - 60)} y={Math.max(cy - 10, 14)} fontSize="12" fill="#f8fafc" fontFamily="var(--font-jetbrains-mono), monospace">({fmt(point[0], 1)}, {fmt(point[1], 1)})</text>
        </svg>
    );
}

const fieldBatch = (relu) => (grid) => grid.map(p => trace(p, { relu }).p);
const FIELD_WITH_RELU = fieldBatch(true);
const FIELD_NO_RELU = fieldBatch(false);

function hiddenLabels(t, known) {
    return [null, [0, 1, 2].map(k => (k < known ? `h${SUB[k + 1]} = ${fmt(t.h[k], 2)}` : '')), null];
}

function StepViz({ step }) {
    if (step.scene === 'intro' || step.scene === 'plane') {
        const tourPts = step.scene === 'plane' ? step.traces.map(t => ({ x: t.x[0], y: t.x[1], label: t.cls })) : [];
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="max-w-sm w-full mx-auto"><DecisionField predictBatch={FIELD_WITH_RELU} points={[...DATA_POINTS, ...tourPts]} resolution={GRID} ariaLabel="The network's decision region over the XOR data" /></div>
                <NetworkDiagram sizes={[2, 3, 2]} weights={[W1_FLAT, W2_FLAT]} layerNames={['input x', 'hidden h', 'scores z₂']} ariaLabel="The 2-3-2 network with its weights" />
            </div>
        );
    }
    if (step.scene === 'params') {
        const blocks = [['W₁', NET.W1, ['out', 'in'], [3, 2]], ['b₁', NET.b1.map(v => [v]), ['out'], [3]], ['W₂', NET.W2, ['out', 'in'], [2, 3]], ['b₂', NET.b2.map(v => [v]), ['out'], [2]]];
        return (
            <div className="flex flex-wrap gap-5 justify-center">
                {blocks.map(([name, rows, names, shape]) => (
                    <div key={name} className="space-y-1.5">
                        <ShapeTag label={name} names={names} shape={shape} />
                        <Heatmap data={rows} scale="diverging" showValues format={(v) => fmt(v, 1)} cellSize={38} ariaLabel={`${name} values`} />
                    </div>
                ))}
            </div>
        );
    }
    if (step.scene === 'batch') {
        const ts = step.traces;
        const rows = ts.map((_, i) => `pt ${i + 1}`);
        const mats = step.stage === 'hidden'
            ? [['X', ts.map(t => t.x), ['x₁', 'x₂'], [N_POINTS, 2], 1], ['Z₁', ts.map(t => t.z1), ['z₁', 'z₂', 'z₃'], [N_POINTS, 3], 2], ['H', ts.map(t => t.h), ['h₁', 'h₂', 'h₃'], [N_POINTS, 3], 2]]
            : [['H', ts.map(t => t.h), ['h₁', 'h₂', 'h₃'], [N_POINTS, 3], 2], ['Z₂', ts.map(t => t.z2), ['z₀', 'z₁'], [N_POINTS, 2], 2], ['P', ts.map(t => t.p), ['p blue', 'p orange'], [N_POINTS, 2], 3]];
        return (
            <div className="flex flex-wrap gap-5 justify-center">
                {mats.map(([name, data, cols, shape, d]) => (
                    <div key={name} className="space-y-1.5 min-w-0">
                        <ShapeTag label={name} names={['n', name === 'X' ? 'in' : 'out']} shape={shape} />
                        <Heatmap data={data} rowLabels={rows} colLabels={cols} scale={name === 'P' ? 'sequential' : 'diverging'} domain={name === 'P' ? [0, 1] : undefined}
                            showValues format={(v) => fmt(v, d)} cellSize={44} ariaLabel={`${name} for the batch`} />
                    </div>
                ))}
            </div>
        );
    }
    const t = step.t;
    const known = step.known;
    const activations = [t.x, known === 3 && step.scene !== 'unit' ? t.h : null, step.out ? t.z2 : null];
    const labels = hiddenLabels(t, step.scene === 'unit' ? known : step.scene === 'point' ? 0 : 0);
    const highlight = step.scene === 'unit'
        ? new Set([`n:0:0`, `n:0:1`, `n:1:${step.unit}`, `e:0:${step.unit}:0`, `e:0:${step.unit}:1`])
        : step.scene === 'scores' ? new Set(['n:2:0', 'n:2:1', ...[0, 1].flatMap(o => [0, 1, 2].map(k => `e:1:${o}:${k}`))]) : null;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="max-w-sm w-full mx-auto">
                <UnitPlane point={t.x} unit={step.scene === 'unit' ? step.unit : null} faintLines={step.scene === 'layer' || step.scene === 'summary'} />
            </div>
            <div className="space-y-3 min-w-0">
                <NetworkDiagram sizes={[2, 3, 2]} weights={[W1_FLAT, W2_FLAT]} activations={activations} nodeLabels={labels} highlight={highlight}
                    layerNames={['input x', 'hidden h', 'scores z₂']} ariaLabel="The network with this point's values" />
                {step.out === 'probs' && (
                    <ProbBars items={CLASS_NAMES.map((name, o) => ({ label: name, p: t.p[o] }))} chosen={t.cls} accent={AI_COLORS.classes[t.cls]} ariaLabel="Softmax probabilities" />
                )}
            </div>
        </div>
    );
}

/* ── explore ──────────────────────────────────────────── */

const TEMPERATURE = 0.001;

function TraceLab() {
    const [x, setX] = useState([0.3, 0.6]);
    const [wide, setWide] = useState(false);
    const [noRelu, setNoRelu] = useState(false);
    const [cold, setCold] = useState(false);
    const range = wide ? 6 : PLANE;
    const stepSize = wide ? 0.5 : 0.1;
    const t = trace(x, { relu: !noRelu });
    const field = noRelu ? FIELD_NO_RELU : FIELD_WITH_RELU;
    const right = useMemo(() => correctOn(XOR, { relu: !noRelu }), [noRelu]);
    const pick = (a, b) => setX([Math.round(a / stepSize) * stepSize, Math.round(b / stepSize) * stepSize].map(v => snap(Math.max(-range, Math.min(range, v)))));
    const setWideView = (w) => { setWide(w); if (!w) setX(v => v.map(c => snap(Math.max(-PLANE, Math.min(PLANE, Math.round(c * 10) / 10))))); };

    const broken = [];
    if (noRelu) {
        const { M, c } = collapsed();
        broken.push(`No ReLU: h = z₁, so z₂ = W₂(W₁x + b₁) + b₂ = (W₂W₁)x + (W₂b₁ + b₂), and W₂W₁ = ${vec(M[0], 2)} over ${vec(M[1], 2)} with bias ${vec(c, 2)}. One linear map, so the boundary is one straight line. Same ${N_PARAMS} numbers: ${right} of 120 right, down from ${TRAIN_RIGHT}.`);
    }
    let coldInfo = null;
    if (cold) {
        const zT = t.z2.map(v => snap(v / TEMPERATURE));
        const naive = naiveSoftmax(zT);
        coldInfo = { zT, naive, stable: softmax(zT) };
        const e = zT.map(v => Math.exp(v));
        const overflow = e.some(v => !Number.isFinite(v));
        broken.push(overflow
            ? `Textbook softmax at temperature ${TEMPERATURE}: the scores become ${vec(zT, 0)}, and e^${fmt(Math.max(...zT), 0)} overflows float64 (anything above ${fmt(FLOAT64_EXP_MAX, 2)}) to ∞. ∞ ÷ ∞ is NaN — "not a number" — and a NaN spreads through every later step of training. Subtracting the largest score first gives ${pvec(coldInfo.stable)}.`
            : `Textbook softmax at temperature ${TEMPERATURE}: the scores become ${vec(zT, 0)}, small enough here that e^z stays finite. Move the point away from the boundary and they will not be.`);
    }
    const repair = () => { setNoRelu(false); setCold(false); };
    const points = [...DATA_POINTS, { x: x[0], y: x[1], label: t.cls }];

    return (
        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-white font-semibold">Trace any point</h2>
                <SourceChip kind="toy">Trained for this page, rounded to one decimal</SourceChip>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-2 min-w-0">
                    <div className="max-w-sm w-full mx-auto">
                        <DecisionField predictBatch={field} points={points} highlight={points.length - 1} resolution={GRID}
                            xRange={[-range, range]} yRange={[-range, range]} onAddPoint={pick} ariaLabel="Click to choose the point to trace" />
                    </div>
                    <p className="text-[11px] text-slate-500">Click the plane to trace a point. Colour strength is the softmax probability.</p>
                    <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900 text-xs">
                        {[[false, 'Data range'], [true, '5× wider']].map(([w, label]) => (
                            <button key={label} onClick={() => setWideView(w)} className={`px-3 py-1 rounded-md ${wide === w ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{label}</button>
                        ))}
                    </div>
                </div>
                <div className="space-y-3 min-w-0">
                    <NetworkDiagram sizes={[2, 3, 2]} weights={[W1_FLAT, W2_FLAT]} activations={[t.x, t.h, t.z2]} layerNames={['input x', noRelu ? 'h = z₁ (no ReLU)' : 'hidden h', 'scores z₂']} ariaLabel="The network with the traced point's values" />
                    <ProbBars items={CLASS_NAMES.map((name, o) => ({ label: name, p: t.p[o] }))} chosen={t.cls} accent={AI_COLORS.classes[t.cls]} ariaLabel="Softmax probabilities" />
                    <div className="flex flex-wrap gap-1.5">
                        <ShapeTag label="W₁" names={['out', 'in']} shape={[3, 2]} />
                        <ShapeTag label="W₂" names={['out', 'in']} shape={[2, 3]} />
                    </div>
                    <ParamSlider label="x₁" value={x[0]} onChange={(v) => pick(v, x[1])} min={-range} max={range} step={stepSize} accent="orange" format={(v) => fmt(v, 1)} />
                    <ParamSlider label="x₂" value={x[1]} onChange={(v) => pick(x[0], v)} min={-range} max={range} step={stepSize} accent="orange" format={(v) => fmt(v, 1)} />
                </div>
            </div>
            <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-3 text-slate-100 text-sm overflow-x-auto space-y-1">
                <Tex block>{String.raw`z_1 = W_1 ${tvec(t.x, 1)} + b_1 = ${tvec(t.z1, 2)}, \quad h = ${noRelu ? 'z_1' : String.raw`\operatorname{ReLU}(z_1)`} = ${tvec(t.h, 2)}`}</Tex>
                <Tex block>{String.raw`z_2 = W_2 h + b_2 = ${tvec(t.z2)}, \quad p = \operatorname{softmax}(z_2) = ${tpvec(t.p)}`}</Tex>
                {coldInfo && <Tex block>{String.raw`\frac{z_2}{${TEMPERATURE}} = ${tvec(coldInfo.zT, 0)}, \quad \text{textbook } p = \begin{pmatrix}\text{${String(coldInfo.naive[0])}}\\\text{${String(coldInfo.naive[1])}}\end{pmatrix}, \quad \text{max-subtracted } p = ${tpvec(coldInfo.stable)}`}</Tex>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                <button onClick={() => setNoRelu(true)} disabled={noRelu}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500 disabled:opacity-40">Skip the ReLU</button>
                <button onClick={() => setCold(true)} disabled={cold}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500 disabled:opacity-40">Textbook softmax, temperature {TEMPERATURE}</button>
                <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                    <Wrench className="h-3.5 w-3.5" />Repair
                </button>
            </div>
            {broken.map(msg => <p key={msg} className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{msg}</p>)}
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function ForwardPassPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const stepHistory = useMemo(() => generateSteps(seed), [seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

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
    const layerRow = { intro: [], params: ['W1', 'b1', 'W2', 'b2'], point: ['x'], unit: ['W1', 'b1', 'relu'], layer: ['W1', 'b1', 'relu'], scores: ['W2', 'b2'], softmax: ['softmax'], stable: ['softmax'], summary: ['W1', 'b1', 'relu', 'W2', 'b2', 'softmax'], batch: ['W1', 'b1', 'relu', 'W2', 'b2', 'softmax'], plane: [] }[step.scene] ?? [];

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/neural-networks" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Neural Networks
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Forward Pass</h1>
                    <p className="text-orange-100 max-w-3xl">
                        Follow two numbers through a trained 2-3-2 network that solves XOR: three weighted sums, three ReLUs, two scores, one softmax. Then the same arithmetic for a whole batch, and for every point of the plane at once.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Activation Functions', '/neural-networks/activation-functions'], ['Matrix Multiplication', '/linear-algebra/matrix-multiplication']].map(([name, href]) => (
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
                        {mode === 'guided' && <SourceChip kind="toy">Trained for this page, rounded to one decimal</SourceChip>}
                    </div>

                    {mode === 'explore' ? <TraceLab /> : (
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
                                    <div className="min-h-[320px] flex flex-col justify-center">
                                        <StepViz step={step} />
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
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New points" title="New points"
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

                    <InCode title="The same forward pass in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The pieces</h2>
                        <table className="w-full text-xs">
                            <thead><tr className="text-slate-500"><th className="text-left font-medium pb-1">piece</th><th className="text-left font-medium">shape</th><th className="text-left font-medium">does</th></tr></thead>
                            <tbody>
                                {[['x', 'x', '[2]', 'the input'], ['W1', 'W₁', '[3, 2]', 'one row per hidden unit'], ['b1', 'b₁', '[3]', 'shifts each unit'], ['relu', 'ReLU', 'keeps shape', 'zeroes negatives'],
                                    ['W2', 'W₂', '[2, 3]', 'one row per output'], ['b2', 'b₂', '[2]', 'shifts each score'], ['softmax', 'softmax', 'keeps shape', 'scores → probabilities']].map(([key, name, shape, does]) => (
                                    <tr key={key} className={`border-t border-slate-800 ${mode === 'guided' && layerRow.includes(key) ? 'bg-slate-800/60 text-slate-100' : 'text-slate-400'}`}>
                                        <td className="py-1.5 pr-2 font-mono">{name}</td>
                                        <td className="pr-2 font-mono">{shape}</td>
                                        <td>{does}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;A softmax output of 0.99 means the network is 99% sure, so it must know.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            This network only ever saw points within about 1.2 of the centre. On a circle of radius {FAR.radius}, where there is no data at all, it still gives one class at least 0.99 in {(FAR.page * 100).toFixed(1)}% of 360 directions (mean top probability {FAR.pageMeanTop}). With ReLU, the scores grow in a straight line as you move away, so softmax saturates. Of {FAR.tried} retrainings from other seeds, the {FAR.nets} that reached 90% accuracy had a median share of {(FAR.netsMedian * 100).toFixed(0)}%. Softmax measures how far a point is from the boundary, not how much the network knows. Switch Explore to &ldquo;5× wider&rdquo; to see it.
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
