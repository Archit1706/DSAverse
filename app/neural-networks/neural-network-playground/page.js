"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, SlidersHorizontal, Shuffle,
    Boxes, TrendingDown, Spline, Layers, Copy, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench, Loader2, Plus, Minus,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { createMLP, cloneMLP, forward, lossAndGrads, createOptimizer } from '@/lib/ml/mlp';
import { makeDataset } from '@/lib/ml/datasets';
import { useTrainer } from '@/lib/ml/useTrainer';
import Tex from '@/components/math/Tex';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import DecisionField from '@/components/ml/DecisionField';
import TrainingCurve from '@/components/ml/TrainingCurve';
import { AI_COLORS } from '@/components/ml/colors';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the playground ────────────────────────────────────────
   Two hundred points from one of five toy datasets to train on and two
   hundred more from the same distribution to validate on, and a network
   built from the controls: up to four hidden layers of up to eight units and
   one sigmoid output, trained on binary cross-entropy by lib/ml/mlp.js.
   Every unit's picture is its activation at the 24 × 24 points of
   GRID_POINTS (48 × 48 for the large ones), from the same forward pass the
   training uses. */

const FIELD = [-1.2, 1.2];
const N_POINTS = 200;
const DATASETS = [['spiral', 'Spiral'], ['circles', 'Circles'], ['moons', 'Moons'], ['xor', 'XOR'], ['linear', 'Linear']];
const gridOf = (n) => Array.from({ length: n * n }, (_, k) => [
    FIELD[0] + (((k % n) + 0.5) / n) * (FIELD[1] - FIELD[0]),
    FIELD[1] - ((Math.floor(k / n) + 0.5) / n) * (FIELD[1] - FIELD[0]),
]);
const GRID = 24;
const GRID_POINTS = gridOf(GRID);
const PIC_GRID = 48;                 // the large single-unit pictures
const PIC_POINTS = gridOf(PIC_GRID);
const SAME_W = 0.5;

function makeData(kind, noise, seed) {
    return {
        train: makeDataset(kind, { n: N_POINTS, noise, seed: seed * 3 + 1 }),
        val: makeDataset(kind, { n: N_POINTS, noise, seed: seed * 3 + 2 }),
    };
}

/** 'random' is lib/ml's own start (Xavier for tanh and sigmoid, He for ReLU);
    'same' sets every weight to 0.5 and 'zero' every weight to 0. Biases start at 0 in all three. */
function buildNet(sizes, act, seed, init = 'random') {
    const net = createMLP(sizes, { activation: act, output: 'sigmoid', seed: seed * 5 + 3 });
    if (init !== 'random') net.W.forEach(w => w.fill(init === 'same' ? SAME_W : 0));
    return net;
}
const paramCount = (sizes) => sizes.slice(1).reduce((a, n, l) => a + n * sizes[l] + n, 0);
const probsOf = (net, X) => { const { A } = forward(net, X); return A[A.length - 1]; };

/** Mean binary cross-entropy (from the logit) and accuracy at ŷ ≥ ½, as lib/ml's accuracy counts it. */
function evaluate(net, { X, y }) {
    const { Z, A } = forward(net, X);
    const z = Z[Z.length - 1], p = A[A.length - 1];
    let loss = 0, right = 0;
    for (let s = 0; s < X.length; s++) {
        loss += Math.max(z[s], 0) - z[s] * y[s] + Math.log1p(Math.exp(-Math.abs(z[s])));
        right += (p[s] >= 0.5 ? 1 : 0) === y[s] ? 1 : 0;
    }
    return { loss: loss / X.length, acc: right / X.length, right };
}

/** The largest difference between two units of one hidden layer, over their
    weights and biases. 0 means each layer is one unit, copied. */
function unitSpread(net) {
    let d = 0;
    for (let l = 0; l < net.sizes.length - 2; l++) {
        const nIn = net.sizes[l], w = net.W[l], b = net.b[l];
        for (let o = 1; o < net.sizes[l + 1]; o++) {
            d = Math.max(d, Math.abs(b[o] - b[0]));
            for (let i = 0; i < nIn; i++) d = Math.max(d, Math.abs(w[o * nIn + i] - w[i]));
        }
    }
    return d;
}

/** Unit u of layer l (1 is the first hidden layer) at the point x: each input
    times its weight, the bias, z and the unit's output. */
function unitTerms(net, x, l, u) {
    const { Z, A } = forward(net, [x]);
    const nIn = net.sizes[l - 1], w = net.W[l - 1];
    const terms = Array.from({ length: nIn }, (_, i) => ({ i, w: w[u * nIn + i], a: A[l - 1][i], t: w[u * nIn + i] * A[l - 1][i] }));
    return { l, u, terms, b: net.b[l - 1][u], z: Z[l][u], a: A[l][u] };
}

/** Each unit's picture as numbers in [−1, 1]: blue positive, orange negative.
    Inputs are scaled by the field's half-width, sigmoid units drawn as 2a − 1,
    ReLU and linear units by their own largest value; the output is drawn as
    1 − 2ŷ so that, as on the decision field, orange means class 1. */
function tileValues(net, A, l, u, res = GRID) {
    const n = net.sizes[l], L = net.sizes.length - 1, out = new Float64Array(res * res);
    let max = 0;
    for (let k = 0; k < out.length; k++) { out[k] = A[l][k * n + u]; max = Math.max(max, Math.abs(out[k])); }
    for (let k = 0; k < out.length; k++) {
        const v = out[k];
        if (l === 0) out[k] = v / FIELD[1];
        else if (l === L) out[k] = 1 - 2 * v;
        else if (net.activation === 'sigmoid') out[k] = 2 * v - 1;
        else if (net.activation !== 'tanh') out[k] = max > 0 ? v / max : 0;
    }
    return out;
}

/** Where a·x + b·y + c = 0 crosses the square of the plane on screen, or null. */
function edgeSegment(a, b, c) {
    const [lo, hi] = FIELD, pts = [];
    if (Math.abs(b) > 1e-12) for (const x of [lo, hi]) { const y = -(a * x + c) / b; if (y >= lo && y <= hi) pts.push([x, y]); }
    if (Math.abs(a) > 1e-12) for (const y of [lo, hi]) { const x = -(b * y + c) / a; if (x >= lo && x <= hi) pts.push([x, y]); }
    let best = null, d = 0;
    for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
            const e = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
            if (e > d) { d = e; best = [pts[i], pts[j]]; }
        }
    }
    return best;
}

/* ── numbers ───────────────────────────────────────────── */

const f2 = (v) => { const s = (Math.round(v * 100) / 100).toFixed(2); return (s === '-0.00' ? '0.00' : s).replace('-', '−'); };
const f3 = (v) => { const s = (Math.round(v * 1000) / 1000).toFixed(3); return (s === '-0.000' ? '0.000' : s).replace('-', '−'); };
const pct = (v) => `${Math.round(v * 100)}%`;
const pctTex = (v) => `${Math.round(v * 100)}\\%`;
const r2 = (v) => Math.round(v * 100) / 100;
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (k) => String(k).split('').map(c => SUB[c]).join('');
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** Three significant figures; × 10ⁿ below 0.001. */
const sig3 = (v) => {
    if (v === 0) return '0';
    if (Math.abs(v) >= 1e-3) return String(Number(v.toPrecision(3))).replace('-', '−');
    let e = Math.floor(Math.log10(Math.abs(v)));
    let m = Number((Math.abs(v) / 10 ** e).toPrecision(3));
    if (m >= 10) { m /= 10; e += 1; }
    return `${v < 0 ? '−' : ''}${m.toFixed(2)} × 10${String(e).split('').map(c => SUP[c]).join('')}`;
};
/** TeX wants ASCII minus; "a - -b" and "a + -b" are tidied to "a + b" and "a - b". */
const tex = (s) => s.replace(/−/g, '-').replace(/- -/g, '+ ').replace(/\+ -/g, '- ');
/** The same tidying for text: "a + −b" reads "a − b". */
const tidy = (s) => s.replace(/\+ −/g, '− ').replace(/− −/g, '+ ');
const par = (s) => (s.startsWith('−') ? `(${s})` : s);
const pt = ([x, y]) => `(${f2(x)}, ${f2(y)})`;
const lin = (a, b, c) => tidy(`${f2(a)}·x + ${f2(b)}·y + ${f2(c)}`);
const linTex = (a, b, c) => tex(`${f2(a)}\\,x + ${f2(b)}\\,y + ${f2(c)}`);
const count = (n) => n.toLocaleString('en-US');

/** "z = t₁ + … + b ≈ z" over two rows of at most four terms, then the unit's output. */
function sumTex(r, fn, out) {
    const parts = r.terms.map(q => f2(q.t));
    const rows = [];
    for (let i = 0; i < parts.length; i += 4) rows.push(parts.slice(i, i + 4).join(' + '));
    const body = rows.map((row, i) => (i === 0 ? `z = ${row}` : `\\quad + ${row}`)).join(' \\\\ ');
    return tex(`\\begin{gathered} ${body} + ${f2(r.b)} \\approx ${f2(r.z)} \\\\ ${out} = ${fn}(z) = ${f3(r.a)} \\end{gathered}`);
}

/* ── the guided tour ───────────────────────────────────── */

const TOUR = { kind: 'spiral', noise: 0.1, hidden: [8, 8], act: 'tanh', opt: 'adam', lr: 0.03 };
const TOUR_SIZES = [2, ...TOUR.hidden, 1];
const TOUR_STEPS = 300;
const SNAPS = [0, 25, 50, 100, TOUR_STEPS];
const TOUR_PARAMS = paramCount(TOUR_SIZES);
const EVAL_EVERY = 5;
const DEFAULT_SEED = 7;

/** Full-batch Adam on the training points, as on the tour; `keep` names the steps to snapshot. */
function trainRun(data, net, keep = []) {
    const opt = createOptimizer(net, { type: TOUR.opt, lr: TOUR.lr });
    const snaps = {}, curve = [];
    for (let k = 0; k <= TOUR_STEPS; k++) {
        if (keep.includes(k)) snaps[k] = cloneMLP(net);
        if (k % EVAL_EVERY === 0) {
            const tr = evaluate(net, data.train), va = evaluate(net, data.val);
            curve.push({ step: k, train: tr.loss, right: tr.right, acc: tr.acc, val: va.loss, valAcc: va.acc });
        }
        if (k < TOUR_STEPS) opt.step(lossAndGrads(net, data.train.X, data.train.y));
    }
    return { net, snaps, curve, end: curve[curve.length - 1] };
}
const at = (run, step) => run.curve.find(c => c.step === step);
const layer1 = (net) => Array.from({ length: net.sizes[1] }, (_, k) => {
    const a = net.W[0][k * 2], b = net.W[0][k * 2 + 1], c = net.b[0][k];
    return { k, a, b, c, norm: Math.hypot(a, b) };
});
const meanSharpness = (net) => layer1(net).reduce((s, e) => s + e.norm, 0) / net.sizes[1];

/* The prompt: which side of a first-layer unit's edge is a training point
   on? Only pairs whose z is at least ASK_MARGIN from 0 both exactly and when
   computed from the numbers on screen (two decimals) are asked, so the
   rounded numbers give the right answer. The sign wanted and the point's
   class are drawn independently, half and half. */
const ASK_MARGIN = 0.15;
const SIGN_OPTIONS = ['Positive: the blue side of the edge', 'Negative: the orange side of the edge'];

function layer1Candidates(net, { X, y }) {
    const out = [];
    for (const e of layer1(net)) {
        X.forEach(([px, py], s) => {
            const z = e.a * px + e.b * py + e.c;
            const shown = r2(e.a) * r2(px) + r2(e.b) * r2(py) + r2(e.c);
            if (Math.abs(z) >= ASK_MARGIN && Math.abs(shown) >= ASK_MARGIN && Math.sign(z) === Math.sign(shown)) {
                out.push({ ...e, s, x: [px, py], label: y[s], z, h: Math.tanh(z), positive: z > 0 });
            }
        });
    }
    return out;
}

function chooseAsks(cands, rng, n = 2) {
    const asks = [];
    for (let q = 0; q < n; q++) {
        const positive = rng.next() < 0.5, label = rng.next() < 0.5 ? 1 : 0;
        const free = cands.filter(c => !asks.some(a => a.k === c.k));
        let pool = free.filter(c => c.positive === positive && c.label === label);
        if (pool.length === 0) pool = free.filter(c => c.positive === positive);
        if (pool.length === 0) break;
        asks.push(pool[Math.floor(rng.next() * pool.length)]);
    }
    return asks;
}

const ACTS = [
    { id: 1, label: 'Build', icon: Boxes },
    { id: 2, label: 'Train', icon: TrendingDown },
    { id: 3, label: 'Layer 1', icon: Spline },
    { id: 4, label: 'Layer 2', icon: Layers },
    { id: 5, label: 'Same start', icon: Copy },
];

/** The tour's three training runs, one per yield, so the page can paint between them. */
function* buildTour(seed) {
    const data = makeData(TOUR.kind, TOUR.noise, seed);
    const main = trainRun(data, buildNet(TOUR_SIZES, TOUR.act, seed), SNAPS);
    yield 1;
    const zero = trainRun(data, buildNet(TOUR_SIZES, TOUR.act, seed, 'zero'));
    yield 2;
    const same = trainRun(data, buildNet(TOUR_SIZES, TOUR.act, seed, 'same'));
    yield 3;
    const net = main.net;
    const asks = chooseAsks(layer1Candidates(net, data.train), createRng(seed * 31 + 7));
    // the training point the network is closest to 85% sure of, so the arithmetic is not all ±1
    const p = probsOf(net, data.train.X);
    const own = (s) => (data.train.y[s] ? p[s] : 1 - p[s]);
    let probe = 0;
    for (let s = 1; s < p.length; s++) if (Math.abs(own(s) - 0.85) < Math.abs(own(probe) - 0.85)) probe = s;
    const wOut = net.W[2];
    let top = 0;
    for (let j = 1; j < wOut.length; j++) if (Math.abs(wOut[j]) > Math.abs(wOut[top])) top = j;
    const x = data.train.X[probe];
    const g0 = lossAndGrads(buildNet(TOUR_SIZES, TOUR.act, seed, 'zero'), data.train.X, data.train.y);
    return {
        seed, data, main, zero, same, asks,
        probe: { idx: probe, x, label: data.train.y[probe], own: own(probe) },
        mix: unitTerms(net, x, 2, top), out: unitTerms(net, x, 3, 0),
        zeroGrad: Math.max(...[...g0.gradW, ...g0.gradB].map(g => Math.max(...g.map(Math.abs)))),
        spread: { main: unitSpread(net), zero: unitSpread(zero.net), same: unitSpread(same.net) },
        sharp: Object.fromEntries(SNAPS.map(k => [k, meanSharpness(main.snaps[k])])),
        gridA: forward(net, GRID_POINTS).A,
        picA: forward(net, PIC_POINTS).A,
    };
}
function tourOf(seed) {
    const it = buildTour(seed);
    let r = it.next();
    while (!r.done) r = it.next();
    return r.value;
}

const SNAP_LOOK = {
    25: 'Look at the layer-1 squares: their edges are moving to new angles and positions.',
    50: 'Look at layer 2: each of its squares adds up several of those edges, so its boundary can bend.',
    100: 'The white rings are the training points still on the wrong side of the boundary',
};

function generateSteps(T) {
    const { data, main, zero, same, asks, mix, out, probe } = T;
    const steps = [];
    const s = (act, actName, d, explanation) => steps.push({ act, actName, ask: null, ring: null, ...d, explanation });
    const ones = data.train.y.filter(v => v === 1).length;
    const c0 = at(main, 0), cEnd = main.end;
    const p0 = probsOf(main.snaps[0], data.train.X);
    const layerSums = TOUR_SIZES.slice(1).map((n, l) => `(${TOUR_SIZES[l]} \\times ${n} + ${n})`);

    s(1, 'Build', { kind: 'net', run: 'main', upTo: 0, net: main.snaps[0],
        tex: `${layerSums.join(' + ')} = ${TOUR_PARAMS}, \\qquad \\hat y \\in [${f2(Math.min(...p0))},\\ ${f2(Math.max(...p0))}]` },
    `${N_POINTS} points on two interleaved spiral arms, ${N_POINTS - ones} blue (class 0) and ${ones} orange (class 1); no straight line comes close to separating them. The network is 2 → 8 → 8 → 1: the inputs x and y, two hidden layers of eight tanh units and one sigmoid output, the probability of orange. That is ${TOUR_PARAMS} parameters, a weight for every arrow and a bias for every unit. The weights start random, drawn from N(0, 1/fan-in), so before any training the output stays near ½: between ${f2(Math.min(...p0))} and ${f2(Math.max(...p0))} on the training points, loss ${f3(c0.train)} (guessing ½ everywhere costs ln 2 = 0.693), ${c0.right} of ${N_POINTS} right.`);

    const pProbe0 = probsOf(main.snaps[0], [probe.x])[0];
    s(1, 'Build', { kind: 'net', run: 'main', upTo: 0, net: main.snaps[0], ring: probe.idx,
        tex: `h^{(1)} = \\tanh(W_1 x + b_1), \\quad h^{(2)} = \\tanh(W_2 h^{(1)} + b_2), \\quad \\hat y = \\sigma(W_3 h^{(2)} + b_3) = ${f3(pProbe0)} \\text{ at } ${tex(pt(probe.x))}` },
    `Every square in the diagram is one unit's picture of the plane: its value at each point, blue where it is positive, orange where it is negative, dark near 0. The two input squares are x and y themselves, a left-to-right and a bottom-to-top ramp. A layer-1 unit computes tanh(a·x + b·y + c), so its picture is a soft step across a straight line. A layer-2 unit adds up the eight layer-1 values with its own weights and squashes the sum. The output square is the decision field on the left, with the classes' colours: at the ringed point it says ŷ = ${f3(pProbe0)}. The lines are the weights, blue positive and orange negative, thicker for larger |w|.`);

    for (const k of SNAPS.slice(1)) {
        const c = at(main, k);
        const wrong = N_POINTS - c.right;
        const look = k === TOUR_STEPS
            ? `${c.right >= 190 ? 'Nothing in the network was told about spirals: eight straight edges, combined twice, are enough to follow both arms.' : 'Most of the way round both arms; Explore trains on past 300 steps.'} Validation: ${pct(c.valAcc)} of ${N_POINTS} fresh points from the same spirals.`
            : k === 100 ? `${SNAP_LOOK[100]}: ${wrong} of them.` : SNAP_LOOK[k];
        s(2, 'Train', { kind: 'net', run: 'main', upTo: k, net: main.snaps[k],
            tex: `L = -\\tfrac{1}{${N_POINTS}}\\textstyle\\sum_s \\big[y_s \\ln \\hat y_s + (1 - y_s)\\ln(1 - \\hat y_s)\\big] = ${f3(c.train)}, \\qquad ${c.right}/${N_POINTS} = ${pctTex(c.acc)}` },
        `Step ${k}: Adam with η = ${TOUR.lr}, every training point in every step. Loss ${f3(c.train)}, ${c.right} of ${N_POINTS} right; the average sharpness |(a, b)| of the layer-1 edges has gone from ${f2(T.sharp[0])} to ${f2(T.sharp[k])}. ${look}`);
    }

    const edges = layer1(main.net);
    const e0 = edges[asks[0]?.k ?? 0];
    s(3, 'Layer 1', { kind: 'edges',
        tex: `h_k = \\tanh(a_k x + b_k y + c_k), \\qquad h_{${e0.k + 1}} = \\tanh(${linTex(e0.a, e0.b, e0.c)})` },
    'The eight layer-1 units after training, each with its line a·x + b·y + c = 0 drawn in. On the line z = 0 and h = tanh(0) = 0. On the side the arrow (a, b) points to, z > 0 and h is positive (blue); on the other side h is negative (orange). How far a point is from the line, times |(a, b)|, decides how close h gets to ±1. That is all a first-layer unit can do: one straight cut, softened.');

    asks.forEach((q, n) => {
        const [x, y] = q.x;
        const dist = Math.abs(q.z) / q.norm;
        const sum = tidy(`(${f2(q.a)})(${f2(x)}) + (${f2(q.b)})(${f2(y)}) + ${f2(q.c)}`);
        s(3, 'Layer 1', { kind: 'ask', ask: q,
            tex: `h_{${q.k + 1}} = \\tanh(${linTex(q.a, q.b, q.c)}) \\quad\\text{at}\\quad (x, y) = ${tex(pt(q.x))}` },
        `${n === 0 ? 'Your turn. ' : ''}Unit ${q.k + 1}: a = ${f2(q.a)}, b = ${f2(q.b)}, c = ${f2(q.c)}. At the ringed point ${pt(q.x)}, z = ${sum} ≈ ${f2(q.z)}, so h = tanh(z) = ${f2(q.h)}: ${q.positive ? 'positive' : 'negative'}.`);
        s(3, 'Layer 1', { kind: 'reveal', ask: q,
            tex: tex(`z = (${f2(q.a)})(${f2(x)}) + (${f2(q.b)})(${f2(y)}) + ${f2(q.c)} \\approx ${f2(q.z)}, \\qquad h = \\tanh(z) = ${f2(q.h)}`) },
        `The colours are back. The arrow is (a, b) = (${f2(q.a)}, ${f2(q.b)}): it points across the line toward growing z, the blue side. The ringed point is on the ${q.positive ? 'side the arrow points to' : 'side away from the arrow'}, ${f3(dist)} from the line; times |(a, b)| = ${f2(q.norm)} that makes z ≈ ${f2(q.z)}, and tanh turns it into h = ${f2(q.h)}.`);
    });

    const top = mix.u, wTop = main.net.W[2][top];
    const big = [...mix.terms].sort((p, q) => Math.abs(q.t) - Math.abs(p.t)).slice(0, 2);
    s(4, 'Layer 2', { kind: 'mix', ring: probe.idx, tex: sumTex(mix, '\\tanh', `h^{(2)}_{${top + 1}}`) },
    `Layer-2 unit ${top + 1} carries the most weight into the output (w = ${f2(wTop)}). It never sees the plane, only the eight layer-1 values. At the ringed training point ${pt(probe.x)} it multiplies each by its own weight and adds them up; the biggest contributions are from layer-1 units ${big[0].i + 1} (${f2(big[0].t)}) and ${big[1].i + 1} (${f2(big[1].t)}). z ≈ ${f2(mix.z)}, so h = tanh(z) = ${f3(mix.a)}${Math.abs(mix.a) > 0.99 ? ', saturated: deep in tanh’s flat tail, where the exact z hardly matters' : ''}. Its picture is a sum of eight soft edges, squashed again, so the boundary between its blue and orange can bend, which no layer-1 unit's can.`);

    s(4, 'Layer 2', { kind: 'out', ring: probe.idx, tex: sumTex(out, '\\sigma', '\\hat y') },
    `The output unit does the same with the eight layer-2 values and squashes with σ instead of tanh: z ≈ ${f2(out.z)}, ŷ = σ(z) = ${f3(out.a)}, the probability that the ringed point is orange. It is ${probe.label ? 'orange' : 'blue'}, so the network gives its true class ${pct(probe.own)}. Every number on the field is the end of this chain of weighted sums and squashes, ${TOUR_PARAMS} parameters long.`);

    const z = zero.end, sm = same.end;
    s(5, 'Same start', { kind: 'net', run: 'zero', upTo: TOUR_STEPS, net: zero.net,
        tex: tex(`\\frac{\\partial L}{\\partial W_3} = \\overline{(\\hat y - y)\\,h^{(2)}} = 0, \\qquad \\frac{\\partial L}{\\partial b_3} = \\overline{\\hat y - y} = \\tfrac12 - \\tfrac{${ones}}{${N_POINTS}} = ${ones * 2 === N_POINTS ? '0' : f3(0.5 - ones / N_POINTS)}`) },
    `Why start from random weights at all? Start every weight at 0 instead (the biases are 0 already) and train exactly as before. Every hidden unit outputs tanh(0) = 0. The output weights' gradients are averages of (ŷ − y)·h, which are 0 because h is; every hidden weight's gradient is passed back through output weights that are 0. Even the output bias is stuck: its gradient is the average of ŷ − y = ½ − y, and with ${ones} orange points out of ${N_POINTS} that is ${ones * 2 === N_POINTS ? 'exactly 0' : f3(0.5 - ones / N_POINTS)}. The largest gradient at the start is ${sig3(T.zeroGrad)}. After ${TOUR_STEPS} steps: loss ${f3(z.train)} (ln 2), ${z.right} of ${N_POINTS} right, every point called orange because ŷ = ½ exactly.`);

    s(5, 'Same start', { kind: 'net', run: 'same', upTo: TOUR_STEPS, net: same.net,
        tex: `\\max_{\\text{same layer}} |w_{k,i} - w_{k',i}| = ${T.spread.same === 0 ? '0' : tex(sig3(T.spread.same))}, \\qquad ${sm.right}/${N_POINTS} = ${pctTex(sm.acc)} \\;\\text{ against }\\; ${cEnd.right}/${N_POINTS}` },
    `Now start every weight at ${SAME_W}, so nothing is 0. Training does move the weights, but the eight units of a layer start equal, so they compute the same value, receive the same gradient and take the same step, every step. After ${TOUR_STEPS} steps the largest difference between two units of the same layer is ${T.spread.same === 0 ? 'exactly 0' : sig3(T.spread.same)}: eight copies of one edge feeding eight copies of one layer-2 unit. One edge squashed twice can still only be split by one straight line, so ${sm.right} of ${N_POINTS} points are right (${pct(sm.acc)}), against ${cEnd.right} from the random start.`);

    const S = SAME_STUDY;
    s(5, 'Same start', { kind: 'study',
        tex: `\\text{median accuracy after ${TOUR_STEPS} steps: random } ${Math.round(S.random.acc * 100)}\\%, \\quad \\text{all } ${SAME_W}\\text{: } ${Math.round(S.same.acc * 100)}\\%, \\quad \\text{all } 0\\text{: } ${Math.round(S.zero.acc * 100)}\\%` },
    `Is this seed unlucky? Over ${S.n} seeds, ${TOUR_STEPS} steps each: from a random start the median training accuracy is ${pct(S.random.acc)}; from ${SAME_W} everywhere it is ${pct(S.same.acc)}, and every layer is still one unit copied in ${S.same.copies} of ${S.n} runs; from 0 everywhere nothing moves in ${S.zero.frozen} of ${S.n} and accuracy is ${pct(S.zero.acc)}. Training cannot tell identical units apart, because nothing in the gradient distinguishes them. The random start is what does, which is why a network starts from random weights rather than from a "neutral" equal value.`);
    return steps;
}

function predictFor(step, next) {
    if (!step || !next || step.kind !== 'ask' || next.kind !== 'reveal') return null;
    const q = step.ask;
    return {
        question: `Layer-1 unit ${q.k + 1} has a = ${f2(q.a)}, b = ${f2(q.b)}, c = ${f2(q.c)}, so h = tanh(${lin(q.a, q.b, q.c)}). At the ringed point (x, y) = ${pt(q.x)}, is h positive or negative?`,
        options: SIGN_OPTIONS,
        correct: q.positive ? 0 : 1,
        because: `z = ${tidy(`${par(f2(q.a))} × ${par(f2(q.x[0]))} + ${par(f2(q.b))} × ${par(f2(q.x[1]))} + ${f2(q.c)}`)} ≈ ${f2(q.z)}, ${q.positive ? 'above' : 'below'} 0, so h = tanh(z) = ${f2(q.h)}.`,
    };
}

/* ── the measured misconception ────────────────────────────
   Seeds 1–100, the tour's data and network, 300 steps of Adam (η = 0.03)
   from each of the three starts. Medians of the final training and
   validation accuracy; `copies` counts the runs whose every hidden layer
   ends with all its units exactly equal (unitSpread 0), `frozen` the runs
   in which no parameter moved at all. The suite reruns all of it. */
const SAME_STUDY = {
    n: 100,
    random: { acc: 1, valAcc: 0.99 },
    same: { acc: 0.5675, valAcc: 0.55, copies: 100 },
    zero: { acc: 0.5, valAcc: 0.5, frozen: 100 },
};

const quizQuestions = [
    {
        question: 'A unit in the first hidden layer computes h = tanh(a·x + b·y + c). What does its picture over the plane look like?',
        options: ['A ring around one region of the plane', 'A soft step across one straight line: positive on one side, negative on the other', 'Whatever shape the data needs, once it is trained', 'A blend of several straight edges'],
        correct: 1,
        explanation: 'a·x + b·y + c is the same all along any line parallel to a·x + b·y + c = 0, so the unit\'s value depends only on which side of that line a point is and how far from it. tanh turns that into a soft step. Bends and rings appear one layer later, where several edges are added up.',
    },
    {
        question: 'Every weight of a 2 → 8 → 8 → 1 tanh network starts at 0.5 (biases at 0), and it trains for 300 steps of Adam on the spiral. What do the eight first-layer units look like afterwards?',
        options: ['Eight copies of one edge: same start, same gradient, same step', 'Eight different edges, because training pushes them apart', 'All exactly zero, because equal weights cancel out', 'Random, because Adam adds noise to every step'],
        correct: 0,
        explanation: 'Units of one layer that start equal compute the same value and receive the same gradient, so every update keeps them equal. On this page, over 100 seeds, every layer is still one unit copied in all 100 runs, and the median training accuracy is 57% against 100% from a random start.',
    },
    {
        question: 'How many weights and biases does a 2 → 8 → 8 → 1 network have?',
        options: ['96', '88', '105', '81'],
        correct: 2,
        explanation: 'Each layer has inputs × units weights plus one bias per unit: 2·8 + 8 = 24, 8·8 + 8 = 72 and 8·1 + 1 = 9, so 105. 88 forgets the biases; 96 forgets the output layer.',
    },
];

const codeExample = `import torch

torch.manual_seed(0)
net = torch.nn.Sequential(
    torch.nn.Linear(2, 8), torch.nn.Tanh(),
    torch.nn.Linear(8, 8), torch.nn.Tanh(),
    torch.nn.Linear(8, 1))
print(sum(p.numel() for p in net.parameters()))   # 105

for p in net.parameters():                        # every weight 0.5, every bias 0
    torch.nn.init.constant_(p, 0.5 if p.dim() == 2 else 0.0)
x = torch.randn(200, 2)
y = (x[:, 0] * x[:, 1] > 0).float().unsqueeze(1)  # XOR of the signs
opt = torch.optim.Adam(net.parameters(), lr=0.03)
for _ in range(300):
    opt.zero_grad()
    torch.nn.functional.binary_cross_entropy_with_logits(net(x), y).backward()
    opt.step()
W1 = net[0].weight
print((W1 - W1[0]).abs().max().item())   # 1.19e-07: float32 rounding, the 8 rows are still one row
print(round(((net(x) > 0).float() == y).float().mean().item(), 3))   # 0.645: one straight cut through XOR`;

/* ── pictures ──────────────────────────────────────────── */

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Replay the tour and retry.'}
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

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const POS_RGB = hexRgb(AI_COLORS.positive), NEG_RGB = hexRgb(AI_COLORS.negative), ZERO_RGB = [15, 23, 42], HIDDEN_RGB = [51, 65, 85];

/** Values in [−1, 1] into a GRID × GRID image on the diverging scale (grey when hidden). */
function tileImage(ctx, t, hide = false, res = GRID) {
    const img = ctx.createImageData(res, res);
    for (let k = 0; k < t.length; k++) {
        const x = Math.max(-1, Math.min(1, Number.isFinite(t[k]) ? t[k] : 0));
        const to = x < 0 ? NEG_RGB : POS_RGB, f = Math.abs(x);
        for (let c = 0; c < 3; c++) img.data[k * 4 + c] = hide ? HIDDEN_RGB[c] : Math.round(ZERO_RGB[c] + (to[c] - ZERO_RGB[c]) * f);
        img.data[k * 4 + 3] = 255;
    }
    return img;
}

const PIC = 240;
const toPic = ([x, y]) => [
    Math.round(((x - FIELD[0]) / (FIELD[1] - FIELD[0])) * PIC * 100) / 100,
    Math.round(((FIELD[1] - y) / (FIELD[1] - FIELD[0])) * PIC * 100) / 100,
];

/** One unit's picture, large, with its edge line, the arrow (a, b) and a ringed point. */
function UnitPicture({ t, hide = false, edge = null, arrow = false, ring = null, label }) {
    const ref = useRef(null);
    useEffect(() => {
        const ctx = ref.current?.getContext('2d');
        if (ctx) ctx.putImageData(tileImage(ctx, t, hide, PIC_GRID), 0, 0);
    }, [t, hide]);
    const seg = edge ? edgeSegment(edge.a, edge.b, edge.c) : null;
    let head = null;
    if (seg && arrow) {
        const m = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2];
        const [x0, y0] = toPic(m), [x1, y1] = toPic([m[0] + (0.42 * edge.a) / edge.norm, m[1] + (0.42 * edge.b) / edge.norm]);
        const ux = (x1 - x0) / Math.hypot(x1 - x0, y1 - y0), uy = (y1 - y0) / Math.hypot(x1 - x0, y1 - y0);
        const r = (v) => Math.round(v * 100) / 100;
        head = { x0, y0, x1, y1, pts: `${x1},${y1} ${r(x1 - 11 * ux - 6 * uy)},${r(y1 - 11 * uy + 6 * ux)} ${r(x1 - 11 * ux + 6 * uy)},${r(y1 - 11 * uy - 6 * ux)}` };
    }
    const ringPx = ring ? toPic(ring) : null;
    return (
        <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
            <canvas ref={ref} width={PIC_GRID} height={PIC_GRID} className="absolute inset-0 w-full h-full" aria-hidden="true" />
            <svg viewBox={`0 0 ${PIC} ${PIC}`} className="absolute inset-0 w-full h-full" role="img" aria-label={label}>
                <line x1={PIC / 2} x2={PIC / 2} y1="0" y2={PIC} stroke="#334155" strokeWidth="1" />
                <line y1={PIC / 2} y2={PIC / 2} x1="0" x2={PIC} stroke="#334155" strokeWidth="1" />
                {seg && <line x1={toPic(seg[0])[0]} y1={toPic(seg[0])[1]} x2={toPic(seg[1])[0]} y2={toPic(seg[1])[1]} stroke="#f8fafc" strokeWidth="2" strokeDasharray="7 5" />}
                {head && (
                    <g stroke="#f8fafc" fill="#f8fafc">
                        <line x1={head.x0} y1={head.y0} x2={head.x1} y2={head.y1} strokeWidth="2.5" />
                        <polygon points={head.pts} strokeWidth="1" />
                    </g>
                )}
                {ringPx && (
                    <g>
                        <circle cx={ringPx[0]} cy={ringPx[1]} r="4" fill="#f8fafc" />
                        <circle cx={ringPx[0]} cy={ringPx[1]} r="9" fill="none" stroke={AI_COLORS.highlight} strokeWidth="3" />
                    </g>
                )}
            </svg>
        </div>
    );
}

/* The network diagram: one column per layer, each unit drawn as its picture
   of the plane, the lines between them coloured by the weight's sign and
   thickened by its size. One canvas at twice its layout size, with a
   transparent button over each unit when units can be picked. */
const NC = { W: 640, tile: 40, gap: 10, pad: 14 };
function netLayout(sizes) {
    const maxN = Math.max(...sizes);
    const H = NC.pad * 2 + maxN * NC.tile + (maxN - 1) * NC.gap;
    const xs = sizes.map((_, l) => NC.pad + (l * (NC.W - 2 * NC.pad - NC.tile)) / (sizes.length - 1));
    const ys = sizes.map(n => {
        const top = (H - (n * NC.tile + (n - 1) * NC.gap)) / 2;
        return Array.from({ length: n }, (_, u) => top + u * (NC.tile + NC.gap));
    });
    return { H, xs, ys };
}
const layerName = (l, L) => (l === 0 ? 'input' : l === L ? 'output' : `layer ${l}`);
const unitName = (l, u, L) => (l === 0 ? `input ${u === 0 ? 'x' : 'y'}` : l === L ? 'the output' : `layer ${l}, unit ${u + 1}`);

function NetworkCanvas({ net, A, selected = null, onSelect = null, ring = null }) {
    const ref = useRef(null);
    const sizesKey = net.sizes.join(',');
    const lay = useMemo(() => netLayout(sizesKey.split(',').map(Number)), [sizesKey]);
    const L = net.sizes.length - 1;
    useEffect(() => {
        const ctx = ref.current?.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        ctx.clearRect(0, 0, NC.W, lay.H);
        const { tile } = NC;
        for (let l = 0; l < L; l++) {
            const nIn = net.sizes[l], w = net.W[l];
            const max = Math.max(...Array.from(w, Math.abs)) || 1;
            for (let o = 0; o < net.sizes[l + 1]; o++) {
                for (let i = 0; i < nIn; i++) {
                    const v = w[o * nIn + i], f = Number.isFinite(v) ? Math.min(1, Math.abs(v) / max) : 0;
                    const rgb = v >= 0 ? POS_RGB : NEG_RGB;
                    ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.12 + 0.68 * f})`;
                    ctx.lineWidth = 0.4 + 2.6 * f;
                    ctx.beginPath();
                    ctx.moveTo(lay.xs[l] + tile, lay.ys[l][i] + tile / 2);
                    ctx.lineTo(lay.xs[l + 1], lay.ys[l + 1][o] + tile / 2);
                    ctx.stroke();
                }
            }
        }
        const tmp = document.createElement('canvas');
        tmp.width = GRID; tmp.height = GRID;
        const tctx = tmp.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        for (let l = 0; l <= L; l++) {
            for (let u = 0; u < net.sizes[l]; u++) {
                const x = lay.xs[l], y = lay.ys[l][u];
                tctx.putImageData(tileImage(tctx, tileValues(net, A, l, u)), 0, 0);
                ctx.drawImage(tmp, x, y, tile, tile);
                const hot = selected && selected.l === l && selected.u === u;
                ctx.strokeStyle = hot ? AI_COLORS.highlight : '#475569';
                ctx.lineWidth = hot ? 3 : 1;
                ctx.strokeRect(x, y, tile, tile);
                if (ring) {
                    ctx.beginPath();
                    ctx.arc(x + ((ring[0] - FIELD[0]) / (FIELD[1] - FIELD[0])) * tile, y + ((FIELD[1] - ring[1]) / (FIELD[1] - FIELD[0])) * tile, 2.6, 0, 2 * Math.PI);
                    ctx.strokeStyle = AI_COLORS.highlight;
                    ctx.lineWidth = 1.4;
                    ctx.stroke();
                }
            }
        }
    }, [net, A, selected, ring, lay, L]);

    return (
        <div className="max-w-[600px] mx-auto">
            <div className="relative w-full" style={{ aspectRatio: `${NC.W} / ${lay.H}` }}>
                <canvas ref={ref} width={NC.W * 2} height={lay.H * 2} className="absolute inset-0 w-full h-full" role="img"
                    aria-label={`The network ${net.sizes.join(' → ')}: every unit drawn as its value over the plane, the lines between units coloured by weight`} />
                {onSelect && net.sizes.map((n, l) => Array.from({ length: n }, (_, u) => (
                    <button key={`${l}-${u}`} onClick={() => onSelect({ l, u })} aria-pressed={!!selected && selected.l === l && selected.u === u}
                        aria-label={`Show ${unitName(l, u, L)}`} title={unitName(l, u, L)}
                        className="absolute rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                        style={{ left: `${(lay.xs[l] / NC.W) * 100}%`, top: `${(lay.ys[l][u] / lay.H) * 100}%`, width: `${(NC.tile / NC.W) * 100}%`, height: `${(NC.tile / lay.H) * 100}%` }} />
                )))}
            </div>
            <div className="relative h-4 mt-1">
                {net.sizes.map((_, l) => (
                    <span key={l} className="absolute -translate-x-1/2 text-[10px] text-slate-500 whitespace-nowrap" style={{ left: `${((lay.xs[l] + NC.tile / 2) / NC.W) * 100}%` }}>
                        {layerName(l, L)}
                    </span>
                ))}
            </div>
        </div>
    );
}

/** The classifier's field with the training points; wrong ones get a white ring. */
function Field({ net, data, version = 0, highlight = null, extra = null, onAddPoint }) {
    const predictBatch = useCallback((grid) => probsOf(net, grid), [net]);
    const points = useMemo(() => {
        const p = probsOf(net, data.train.X);
        const pts = data.train.X.map(([x, y], i) => ({ x, y, label: data.train.y[i], wrong: (p[i] >= 0.5 ? 1 : 0) !== data.train.y[i] }));
        if (extra) pts.push({ x: extra[0], y: extra[1], label: probsOf(net, [extra])[0] >= 0.5 ? 1 : 0 });
        return pts;
    // the Explore network trains in place; version says when it changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [net, data, extra, version]);
    return (
        <DecisionField predictBatch={predictBatch} points={points} version={version} xRange={FIELD} yRange={FIELD} resolution={60}
            highlight={extra ? points.length - 1 : highlight} onAddPoint={onAddPoint}
            ariaLabel={`The network's decision field over the plane, with the ${N_POINTS} training points; misclassified points have a white ring`} />
    );
}

function Stat({ label, value, tone = 'text-slate-100' }) {
    return (
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
            <div className="text-[11px] text-slate-500">{label}</div>
            <div className={`font-mono text-sm ${tone}`}>{value}</div>
        </div>
    );
}

function Legend() {
    return (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: AI_COLORS.positive }} />unit positive, weight positive</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: AI_COLORS.negative }} />unit negative, weight negative</span>
            <span>output square: the field&apos;s colours</span>
        </p>
    );
}

/** A unit's weighted sum, one row per input. */
function TermsTable({ r, inputName }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead><tr className="text-slate-500 text-left"><th className="font-medium pb-1 pr-2">input</th><th className="font-medium pb-1 pr-2">value</th><th className="font-medium pb-1 pr-2">weight</th><th className="font-medium pb-1">product</th></tr></thead>
                <tbody className="font-mono text-slate-200">
                    {r.terms.map(q => (
                        <tr key={q.i} className="border-t border-slate-800"><td className="py-1 pr-2 font-sans text-slate-400">{inputName(q.i)}</td><td className="pr-2">{f3(q.a)}</td><td className="pr-2">{f3(q.w)}</td><td>{f3(q.t)}</td></tr>
                    ))}
                    <tr className="border-t border-slate-800"><td className="py-1 pr-2 font-sans text-slate-400">bias</td><td className="pr-2"></td><td className="pr-2"></td><td>{f3(r.b)}</td></tr>
                    <tr className="border-t border-slate-700"><td className="py-1 pr-2 font-sans text-slate-300">z</td><td className="pr-2"></td><td className="pr-2"></td><td className="text-orange-200">{f3(r.z)}</td></tr>
                </tbody>
            </table>
        </div>
    );
}

function SameStudyTable() {
    const S = SAME_STUDY;
    return (
        <div className="overflow-x-auto">
            <p className="text-xs text-slate-500 mb-2">Medians over {S.n} seeds, {TOUR_STEPS} steps of Adam each</p>
            <table className="w-full text-xs sm:text-sm">
                <thead><tr className="text-slate-500 text-left"><th className="font-medium pb-2 pr-3">start</th><th className="font-medium pb-2 pr-3">train acc</th><th className="font-medium pb-2 pr-3">val acc</th><th className="font-medium pb-2">units</th></tr></thead>
                <tbody className="font-mono text-slate-200">
                    <tr className="border-t border-slate-800"><td className="py-1.5 pr-3 font-sans text-slate-300">random</td><td className="pr-3">{pct(S.random.acc)}</td><td className="pr-3">{pct(S.random.valAcc)}</td><td className="font-sans text-slate-400">all different</td></tr>
                    <tr className="border-t border-slate-800"><td className="py-1.5 pr-3 font-sans text-slate-300">all {SAME_W}</td><td className="pr-3">{pct(S.same.acc)}</td><td className="pr-3">{pct(S.same.valAcc)}</td><td className="font-sans text-slate-400">copies in {S.same.copies}/{S.n}</td></tr>
                    <tr className="border-t border-slate-800"><td className="py-1.5 pr-3 font-sans text-slate-300">all 0</td><td className="pr-3">{pct(S.zero.acc)}</td><td className="pr-3">{pct(S.zero.valAcc)}</td><td className="font-sans text-slate-400">frozen in {S.zero.frozen}/{S.n}</td></tr>
                </tbody>
            </table>
        </div>
    );
}

function StepView({ step, T }) {
    const tA = T.gridA, pA = T.picA;
    if (step.kind === 'study') return <SameStudyTable />;
    if (step.kind === 'edges') {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {layer1(T.main.net).map(e => (
                    <div key={e.k} className="min-w-0">
                        <UnitPicture t={tileValues(T.main.net, pA, 1, e.k, PIC_GRID)} edge={e} arrow label={`Layer-1 unit ${e.k + 1}: tanh(${lin(e.a, e.b, e.c)}) over the plane, with its line`} />
                        <p className="text-[11px] text-slate-400 mt-1">unit {e.k + 1} · |(a, b)| = {f2(e.norm)}</p>
                    </div>
                ))}
            </div>
        );
    }
    if (step.kind === 'ask' || step.kind === 'reveal') {
        const q = step.ask, reveal = step.kind === 'reveal';
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="max-w-[340px] w-full mx-auto">
                    <UnitPicture t={tileValues(T.main.net, pA, 1, q.k, PIC_GRID)} hide={!reveal} edge={q} arrow={reveal} ring={q.x}
                        label={reveal ? `Layer-1 unit ${q.k + 1} over the plane, its line, the arrow (a, b) and the ringed point` : `Layer-1 unit ${q.k + 1}'s line, colours hidden, and the ringed point`} />
                    <p className="text-[11px] text-slate-500 mt-1.5">layer 1, unit {q.k + 1} · dashed: a·x + b·y + c = 0{reveal ? ' · arrow: (a, b)' : ' · colours hidden'}</p>
                </div>
                <div className="space-y-3 min-w-0">
                    <div className="flex flex-wrap gap-1.5"><ShapeTag label="W₁" shape={[8, 2]} /><ShapeTag label={`row ${q.k + 1}`} shape={[1, 2]} /></div>
                    <div className="grid grid-cols-3 gap-2">
                        <Stat label="a" value={f2(q.a)} /><Stat label="b" value={f2(q.b)} /><Stat label="c" value={f2(q.c)} />
                        <Stat label="x" value={f2(q.x[0])} /><Stat label="y" value={f2(q.x[1])} />
                        {reveal && <Stat label="h = tanh(z)" value={f2(q.h)} tone={q.positive ? 'text-sky-300' : 'text-orange-300'} />}
                    </div>
                </div>
            </div>
        );
    }
    if (step.kind === 'mix' || step.kind === 'out') {
        const r = step.kind === 'mix' ? T.mix : T.out;
        const l = r.l, net = T.main.net;
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="max-w-[300px] w-full mx-auto">
                        <UnitPicture t={tileValues(net, pA, l, r.u, PIC_GRID)} ring={T.probe.x} label={`${unitName(l, r.u, 3)} over the plane, with the ringed training point`} />
                        <p className="text-[11px] text-slate-500 mt-1.5">{unitName(l, r.u, 3)} · ringed: training point {pt(T.probe.x)}</p>
                    </div>
                    <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                            <ShapeTag label={l === 2 ? 'W₂' : 'W₃'} shape={l === 2 ? [8, 8] : [1, 8]} />
                            <ShapeTag label={l === 2 ? 'h⁽¹⁾' : 'h⁽²⁾'} shape={[8]} />
                        </div>
                        <TermsTable r={r} inputName={(i) => `${l === 2 ? 'layer 1' : 'layer 2'}, unit ${i + 1}`} />
                    </div>
                </div>
                <NetworkCanvas net={net} A={tA} selected={{ l, u: r.u }} ring={T.probe.x} />
                <Legend />
            </div>
        );
    }
    const run = T[step.run];
    const c = at(run, step.upTo);
    const A = step.net === T.main.net ? tA : forward(step.net, GRID_POINTS).A;
    const curves = step.upTo > 0 && [
        { name: step.run === 'main' ? 'train' : `${step.run === 'zero' ? 'all 0' : `all ${SAME_W}`} train`, color: '#38bdf8', points: run.curve.filter(q => q.step <= step.upTo && q.step > 0).map(q => ({ x: q.step, y: q.train })) },
        step.run === 'main'
            ? { name: 'val', color: '#fb923c', points: run.curve.filter(q => q.step <= step.upTo && q.step > 0).map(q => ({ x: q.step, y: q.val })) }
            : { name: 'random start, train', color: '#a3e635', points: T.main.curve.filter(q => q.step > 0).map(q => ({ x: q.step, y: q.train })) },
    ];
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="max-w-[340px] w-full mx-auto">
                    <Field net={step.net} data={T.data} highlight={step.ring} />
                    <p className="text-[11px] text-slate-500 mt-1.5">{step.run === 'main' ? 'random start' : step.run === 'zero' ? 'every weight 0 at the start' : `every weight ${SAME_W} at the start`}, step {step.upTo}</p>
                </div>
                <div className="space-y-3 min-w-0">
                    {curves && <TrainingCurve logY series={curves} height={150} ariaLabel="Training loss against step, log scale" />}
                    <div className="grid grid-cols-2 gap-2">
                        <Stat label="training loss" value={f3(c.train)} />
                        <Stat label="training points right" value={`${c.right} / ${N_POINTS}`} />
                        <Stat label="validation accuracy" value={pct(c.valAcc)} />
                        <Stat label="largest gap between two units" value={step.run === 'main' ? f2(unitSpread(step.net)) : sig3(T.spread[step.run])} tone={step.run === 'main' ? 'text-slate-100' : 'text-orange-200'} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <ShapeTag label="W₁" shape={[8, 2]} /><ShapeTag label="W₂" shape={[8, 8]} /><ShapeTag label="W₃" shape={[1, 8]} />
                        <span className="text-[11px] text-slate-500 self-center">{TOUR_PARAMS} parameters</span>
                    </div>
                </div>
            </div>
            <NetworkCanvas net={step.net} A={A} ring={step.ring !== null ? T.data.train.X[step.ring] : null} />
            <Legend />
        </div>
    );
}

/* ── explore ───────────────────────────────────────────── */

const LAB_LRS = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1];
const LAB_L2 = [0, 0.001, 0.01];
const LAB_DROP = [0, 0.2, 0.5];
const LAB_NOISE = [0, 0.1, 0.2];
const LAB_MAX = 5000;
const BREAK_LR = 3;
const OPTS = [['sgd', 'SGD'], ['momentum', 'Momentum'], ['adam', 'Adam']];
const ACTIVATIONS = [['tanh', 'tanh'], ['relu', 'ReLU'], ['sigmoid', 'sigmoid'], ['linear', 'linear']];
const INITS = [['random', 'random'], ['same', `all ${SAME_W}`], ['zero', 'all 0']];
const FN_TEX = { tanh: '\\tanh', sigmoid: '\\sigma', relu: '\\operatorname{ReLU}', linear: '' };
const LAB_START = { kind: 'spiral', noise: 0.1, seed: DEFAULT_SEED, hidden: [8, 8], act: 'tanh', opt: 'adam', lr: 0.03, l2: 0, drop: 0, init: 'random' };

/** Share of the hidden values on the training points beyond ±0.99: saturated tanh units. */
function saturation(net, X) {
    const { A } = forward(net, X);
    let n = 0, sat = 0;
    for (let l = 1; l < net.sizes.length - 1; l++) for (const v of A[l]) { n++; if (Math.abs(v) > 0.99) sat++; }
    return n ? sat / n : 0;
}

function Lab() {
    const [cfg, setCfg] = useState(LAB_START);
    const [saved, setSaved] = useState(null);
    const [sel, setSel] = useState({ l: 1, u: 0 });
    const [probe, setProbe] = useState(null);
    const set = (patch) => setCfg(c => ({ ...c, ...patch }));
    const data = useMemo(() => makeData(cfg.kind, cfg.noise, cfg.seed), [cfg.kind, cfg.noise, cfg.seed]);
    const sizes = useMemo(() => [2, ...cfg.hidden, 1], [cfg.hidden]);
    const L = sizes.length - 1;

    const trainer = useTrainer({
        init: () => {
            const net = buildNet(sizes, cfg.act, cfg.seed, cfg.init);
            return { net, opt: createOptimizer(net, { type: cfg.opt, lr: cfg.lr }), rng: createRng(cfg.seed * 7 + 2) };
        },
        step: (st, k) => {
            st.opt.step(lossAndGrads(st.net, data.train.X, data.train.y, { l2: cfg.l2, dropout: cfg.drop, rng: st.rng }));
            if ((k + 1) % 10 !== 0) return null;
            return { train: evaluate(st.net, data.train).loss, val: evaluate(st.net, data.val).loss };
        },
        deps: [data, sizes, cfg.act, cfg.opt, cfg.lr, cfg.l2, cfg.drop, cfg.init, cfg.seed],
        maxSteps: LAB_MAX,
    });
    const net = trainer.state.net;
    const A = useMemo(() => forward(net, GRID_POINTS).A,
    // the network trains in place; trainer.steps says when it changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
        [net, trainer.steps]);
    const tr = evaluate(net, data.train), va = evaluate(net, data.val);
    const at0 = probe ?? data.train.X[0];
    const l = Math.min(sel.l, L), u = Math.min(sel.u, sizes[l] - 1);
    const r = l > 0 ? unitTerms(net, at0, l, u) : null;
    const spread = unitSpread(net);

    const breakIt = (kind) => {
        setSaved(s => s ?? { init: cfg.init, lr: cfg.lr, opt: cfg.opt });
        if (kind === 'same') set({ init: 'same' });
        else set({ opt: 'adam', lr: BREAK_LR });
    };
    const repair = () => { if (saved) set(saved); else set({ init: 'random' }); setSaved(null); };
    const choose = (patch) => { set(patch); if ('init' in patch || 'lr' in patch || 'opt' in patch) setSaved(null); };
    const setHidden = (hidden) => { set({ hidden }); setSel(s => ({ l: Math.min(s.l, hidden.length + 1), u: s.u })); };

    let message = null;
    if (!Number.isFinite(tr.loss)) {
        message = 'The loss is no longer a number: the weights have overflowed. Lower the learning rate or press Repair.';
    } else if (cfg.init === 'zero') {
        const moved = Math.max(...net.W.map(w => Math.max(...Array.from(w, Math.abs))));
        message = `Every weight started at 0, so every hidden unit outputs ${cfg.act === 'sigmoid' ? 'σ(0) = ½, the same in every unit' : '0'}. After ${count(trainer.steps)} steps ${moved === 0 ? 'every weight is still exactly 0: no gradient ever reached one' : `the largest weight is ${sig3(moved)}, and the units of each layer differ by at most ${sig3(spread)}`}. Training accuracy ${pct(tr.acc)}.`;
    } else if (cfg.init === 'same' && cfg.hidden.length > 0) {
        message = `Every weight started at ${SAME_W}. After ${count(trainer.steps)} steps the largest difference between two units of the same layer is ${spread === 0 ? 'exactly 0' : sig3(spread)}: each hidden layer is a single unit copied across its width — look at the pictures. One unit per layer can only cut the plane along one straight line: training accuracy ${pct(tr.acc)}.`;
    } else if (cfg.lr === BREAK_LR && cfg.opt === 'adam') {
        message = `Adam with η = ${BREAK_LR}: its first step moves every weight by ${BREAK_LR}, whatever the size of its gradient, because Adam divides each gradient by its own scale. The hidden units are thrown into saturation (${pct(saturation(net, data.train.X))} of their values on the training points are beyond ±0.99), where their gradient is nearly 0. After ${count(trainer.steps)} steps: loss ${f3(tr.loss)}, ${pct(tr.acc)} right.`;
    }
    const chip = (active) => `text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? 'border-orange-500 bg-orange-500/15 text-orange-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`;
    const stepper = 'p-1 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30';
    const row = (label, items, value, onPick) => (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 w-28">{label}</span>
            {items.map(([v, name]) => <button key={String(v)} onClick={() => onPick(v)} aria-pressed={value === v} className={chip(value === v)}>{name}</button>)}
        </div>
    );
    const inName = (i) => (l === 1 ? (i === 0 ? 'x' : 'y') : `layer ${l - 1}, unit ${i + 1}`);
    const fn = l === L ? '\\sigma' : FN_TEX[cfg.act];
    const outName = l === L ? '\\hat y' : 'a';

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 w-28">data</span>
                    {DATASETS.map(([v, name]) => <button key={v} onClick={() => { choose({ kind: v }); setProbe(null); }} aria-pressed={cfg.kind === v} className={chip(cfg.kind === v)}>{name}</button>)}
                    <button onClick={() => { set({ seed: randomSeed() }); setProbe(null); }} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800"><Shuffle className="h-3.5 w-3.5" />New data</button>
                </div>
                {row('noise', LAB_NOISE.map(v => [v, String(v)]), cfg.noise, v => choose({ noise: v }))}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 w-28">hidden layers</span>
                    <button onClick={() => setHidden(cfg.hidden.slice(0, -1))} disabled={cfg.hidden.length === 0} aria-label="Remove a hidden layer" className={stepper}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="font-mono text-sm text-slate-200 w-3 text-center">{cfg.hidden.length}</span>
                    <button onClick={() => setHidden([...cfg.hidden, 4])} disabled={cfg.hidden.length >= 4} aria-label="Add a hidden layer" className={stepper}><Plus className="h-3.5 w-3.5" /></button>
                    {cfg.hidden.map((w, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full border border-slate-700 pl-2 pr-1 py-0.5 text-xs text-slate-300">
                            L{i + 1}
                            <button onClick={() => setHidden(cfg.hidden.map((v, j) => (j === i ? v - 1 : v)))} disabled={w <= 1} aria-label={`Fewer units in layer ${i + 1}`} className={stepper}><Minus className="h-3 w-3" /></button>
                            <span className="font-mono w-3 text-center">{w}</span>
                            <button onClick={() => setHidden(cfg.hidden.map((v, j) => (j === i ? v + 1 : v)))} disabled={w >= 8} aria-label={`More units in layer ${i + 1}`} className={stepper}><Plus className="h-3 w-3" /></button>
                        </span>
                    ))}
                    <span className="text-[11px] text-slate-500">{sizes.join(' → ')} · {paramCount(sizes)} parameters</span>
                </div>
                {row('activation', ACTIVATIONS, cfg.act, v => choose({ act: v }))}
                {row('optimizer', OPTS, cfg.opt, v => choose({ opt: v }))}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 w-28">learning rate η</span>
                    {LAB_LRS.map(v => <button key={v} onClick={() => choose({ lr: v })} aria-pressed={cfg.lr === v} className={chip(cfg.lr === v)}>{v}</button>)}
                    {cfg.lr === BREAK_LR && <span className={chip(true)}>{BREAK_LR}</span>}
                </div>
                {row('weight decay λ', LAB_L2.map(v => [v, String(v)]), cfg.l2, v => choose({ l2: v }))}
                {row('dropout p', LAB_DROP.map(v => [v, String(v)]), cfg.drop, v => choose({ drop: v }))}
                {row('start', INITS, cfg.init, v => choose({ init: v }))}
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="max-w-[340px] w-full mx-auto">
                        <Field net={net} data={data} version={trainer.steps} extra={at0} onAddPoint={(x, y) => setProbe([x, y])} />
                        <p className="text-[11px] text-slate-500 mt-1.5">step {count(trainer.steps)} · click the field to move the ringed point</p>
                    </div>
                    <div className="space-y-3 min-w-0">
                        <TrainingCurve logY series={[
                            { name: 'train', color: '#38bdf8', points: trainer.history.filter(h => Number.isFinite(h.train)).map(h => ({ x: h.step, y: h.train })) },
                            { name: 'val', color: '#fb923c', points: trainer.history.filter(h => Number.isFinite(h.val)).map(h => ({ x: h.step, y: h.val })) },
                        ]} height={150} ariaLabel="Training and validation loss against step, log scale" />
                        <div className="grid grid-cols-2 gap-2">
                            <Stat label="training loss" value={Number.isFinite(tr.loss) ? f3(tr.loss) : 'not a number'} />
                            <Stat label="validation loss" value={Number.isFinite(va.loss) ? f3(va.loss) : 'not a number'} />
                            <Stat label="training accuracy" value={pct(tr.acc)} />
                            <Stat label="validation accuracy" value={pct(va.acc)} />
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={trainer.toggle} disabled={trainer.steps >= LAB_MAX} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-40 text-sm">
                        {trainer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{trainer.running ? 'Pause' : 'Train'}
                    </button>
                    <button onClick={() => trainer.stepOnce(50)} disabled={trainer.steps >= LAB_MAX} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm disabled:opacity-40">+50 steps</button>
                    <button onClick={trainer.reset} aria-label="Restart training" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                </div>
                <div>
                    <p className="text-xs text-slate-400 mb-2">Every unit, live. Pick one to see its arithmetic at the ringed point.</p>
                    <NetworkCanvas net={net} A={A} selected={{ l, u }} onSelect={setSel} ring={at0} />
                    <Legend />
                </div>
                <div className="rounded-lg border border-slate-800 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                        <span className="font-semibold">{unitName(l, u, L)}</span>
                        <span className="text-slate-500">at {pt(at0)}</span>
                        {r && <ShapeTag label={`W${sub(l)} row ${l === L ? 1 : u + 1}`} shape={[1, sizes[l - 1]]} />}
                    </div>
                    {r ? (
                        <>
                            <TermsTable r={r} inputName={inName} />
                            <div className="text-slate-200 text-sm overflow-x-auto overflow-y-hidden">
                                <Tex block>{sumTex(r, fn || '', outName).replace('= (z)', '= z')}</Tex>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-slate-400">An input unit just passes the point&apos;s {u === 0 ? 'x' : 'y'} on: {f2(at0[u])}. Its picture is the same ramp in every network.</p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => breakIt('same')} className="text-xs px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-200 hover:bg-amber-500/10">Every weight {SAME_W}</button>
                    <button onClick={() => breakIt('lr')} className="text-xs px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-200 hover:bg-amber-500/10">Learning rate {BREAK_LR}</button>
                    <button onClick={repair} disabled={!saved && cfg.init === 'random'} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40"><Wrench className="h-3.5 w-3.5" />Repair</button>
                </div>
                {message && <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 leading-relaxed">{message}</p>}
                <p className="text-[11px] text-slate-500 leading-relaxed">
                    {N_POINTS} points to train on and {N_POINTS} more from the same distribution to validate on. Every step uses all the training points; changing any setting restarts the run from the same seeded weights. Losses are measured with nothing dropped.
                </p>
            </div>
        </div>
    );
}

/* ── the page ──────────────────────────────────────────── */

const NO_STEPS = [];

export default function NeuralNetworkPlaygroundPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const [built, setBuilt] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    // Three networks train for the tour, so they run after the first paint
    // with a frame between them.
    const [stage, setStage] = useState(0);
    useEffect(() => {
        const it = buildTour(seed);
        let t;
        const tick = () => {
            const r = it.next();
            if (r.done) setBuilt({ seed, T: r.value, steps: generateSteps(r.value) });
            else { setStage(r.value); t = setTimeout(tick, 16); }
        };
        t = setTimeout(tick, 30);
        return () => clearTimeout(t);
    }, [seed]);
    const ready = built !== null && built.seed === seed;
    const stepHistory = ready ? built.steps : NO_STEPS;
    const step = ready ? stepHistory[Math.min(currentStep, stepHistory.length - 1)] : null;
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided' || !ready) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode, ready]);

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(Math.max(0, stepHistory.findIndex(s => s.act === act))); };
    const S = SAME_STUDY;
    const hot = (acts) => (mode === 'guided' && step && acts.includes(step.act) ? 'text-orange-200' : '');

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/neural-networks" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Neural Networks
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Neural Network Playground</h1>
                    <p className="text-orange-100 max-w-3xl">
                        Build a network, train it in your browser and look inside: every unit draws its own picture of the plane. The tour reads a trained network&apos;s first layer as straight edges and its second as their combinations, then starts every weight at the same value to show why networks start from random ones.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Backpropagation', '/neural-networks/backpropagation'], ['Optimizers', '/neural-networks/optimizers'], ['Dropout and Weight Decay', '/neural-networks/dropout-and-weight-decay']].map(([name, href]) => (
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
                        <SourceChip kind="live">Every network here is trained in your browser, from seeded data and weights</SourceChip>
                    </div>

                    {mode === 'explore' ? <Lab /> : !ready ? (
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 min-h-[420px] flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                            Training three networks in your browser… {Math.min(stage, 3)} of 3 done
                        </div>
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
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    <div className="min-h-[360px]">
                                        <StepView step={step} T={built.T} />
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
                                        <button onClick={() => { setSeed(randomSeed()); setStage(0); setCurrentStep(0); setIsPlaying(false); }} aria-label="New data and starting weights" title="New data and starting weights"
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

                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                                <div className="text-slate-100 text-sm sm:text-base overflow-x-auto overflow-y-hidden">
                                    <Tex block>{step.tex}</Tex>
                                </div>
                            </div>
                        </>
                    )}

                    <InCode title="The same network in PyTorch, every weight 0.5" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The tour&apos;s network</h2>
                        <div className="text-slate-200 text-xs overflow-x-auto overflow-y-hidden py-0.5 mb-3">
                            <Tex>{String.raw`h^{(l)} = f\big(W_l\,h^{(l-1)} + b_l\big)`}</Tex>
                        </div>
                        <table className="w-full text-xs">
                            <thead><tr className="text-slate-500 text-left"><th className="font-medium pb-1">layer</th><th className="font-medium pb-1">W</th><th className="font-medium pb-1">b</th><th className="font-medium pb-1 text-right">params</th></tr></thead>
                            <tbody className="text-slate-300">
                                {TOUR_SIZES.slice(1).map((n, l) => (
                                    <tr key={l} className="border-t border-slate-800">
                                        <td className={`py-1.5 pr-2 ${hot(l === 0 ? [3] : [4])}`}>{l === TOUR_SIZES.length - 2 ? 'output (σ)' : `${l + 1} (tanh)`}</td>
                                        <td className="pr-2"><ShapeTag shape={[n, TOUR_SIZES[l]]} /></td>
                                        <td className="pr-2"><ShapeTag shape={[n]} /></td>
                                        <td className="text-right font-mono">{n * TOUR_SIZES[l] + n}</td>
                                    </tr>
                                ))}
                                <tr className="border-t border-slate-700"><td className="py-1.5 text-slate-400" colSpan={3}>total</td><td className={`text-right font-mono ${hot([1])}`}>{TOUR_PARAMS}</td></tr>
                            </tbody>
                        </table>
                        <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">Trained with Adam, η = {TOUR.lr}, on all {N_POINTS} points for {TOUR_STEPS} steps.</p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;Starting every weight at the same value is a neutral start; training will tell the units apart.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed mb-3">
                            It never does. Units that start equal get equal gradients forever. The tour&apos;s spiral over {S.n} seeds, {TOUR_STEPS} steps each:
                        </p>
                        <table className="w-full text-xs">
                            <thead><tr className="text-slate-500"><th className="text-left font-medium pb-1">start</th><th className="text-left font-medium pb-1">train acc</th><th className="text-left font-medium pb-1">units</th></tr></thead>
                            <tbody className="font-mono text-slate-300">
                                <tr className="border-t border-slate-800"><td className="py-1 font-sans text-slate-400">random</td><td>{pct(S.random.acc)}</td><td className="font-sans">all different</td></tr>
                                <tr className="border-t border-slate-800"><td className="py-1 font-sans text-slate-400">all {SAME_W}</td><td>{pct(S.same.acc)}</td><td className="font-sans">copies in {S.same.copies}/{S.n}</td></tr>
                                <tr className="border-t border-slate-800"><td className="py-1 font-sans text-slate-400">all 0</td><td>{pct(S.zero.acc)}</td><td className="font-sans">frozen in {S.zero.frozen}/{S.n}</td></tr>
                            </tbody>
                        </table>
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
