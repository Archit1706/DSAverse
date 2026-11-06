"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, SlidersHorizontal, Shuffle,
    Brain, Minimize2, EyeOff, FlaskConical, BarChart3, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench, Loader2,
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
import { diverging, inkOn } from '@/components/ml/colors';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the experiment ────────────────────────────────────────
   30 noisy two-moons points to train on and 400 more from the same
   distribution to validate on, and a network far bigger than 30 points
   need: 2 → 24 → 24 → 1 with tanh, 697 parameters. Full-batch gradient
   descent with η = 1 for 1,000 steps. Every run on a seed starts from the
   same initial weights, so the plain, weight-decay and dropout runs differ
   only in the regulariser. lib/ml/mlp.js does the training: its l2 option
   adds (λ/2)Σw² over the weights (not the biases), its dropout is inverted
   dropout on every hidden layer. */
const N_TRAIN = 30;
const N_VAL = 400;
const NOISE = 0.25;
const SIZES = [2, 24, 24, 1];
const LR = 1;
const STEPS = 1000;
const LAMBDA = 0.01;
const P_DROP = 0.5;
const EVAL_EVERY = 20;
const N_WEIGHTS = SIZES.slice(1).reduce((a, n, l) => a + n * SIZES[l], 0);
const N_PARAMS = N_WEIGHTS + SIZES.slice(1).reduce((a, n) => a + n, 0);
const FIELD = [-1.5, 1.5];

function makeData(seed) {
    const train = makeDataset('moons', { n: N_TRAIN, noise: NOISE, seed: seed * 3 + 1 });
    const val = makeDataset('moons', { n: N_VAL, noise: NOISE, seed: seed * 3 + 2 });
    return { seed, train, val };
}
const newNet = (seed) => createMLP(SIZES, { activation: 'tanh', output: 'sigmoid', seed: seed * 5 + 3 });

/** Mean binary cross-entropy (from the logit, as the engine computes it) and accuracy, with nothing dropped. */
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
const sumSq = (net) => net.W.reduce((a, w) => a + w.reduce((b, q) => b + q * q, 0), 0);
const probs = (net, X) => { const { A } = forward(net, X); return A[A.length - 1]; };

/** One training run. `keep` lists the steps whose network is kept for drawing. */
function trainRun(data, seed, { l2 = 0, p = 0, steps = STEPS, keep = [] } = {}) {
    const net = newNet(seed);
    const opt = createOptimizer(net, { type: 'sgd', lr: LR });
    const rng = createRng(seed * 7 + 2);
    const curve = [], snaps = {};
    for (let s = 0; s <= steps; s++) {
        if (s % EVAL_EVERY === 0 || s === steps) {
            const tr = evaluate(net, data.train), va = evaluate(net, data.val);
            curve.push({ step: s, train: tr.loss, val: va.loss, trainAcc: tr.acc, valAcc: va.acc, right: tr.right, norm: Math.sqrt(sumSq(net)) });
        }
        if (keep.includes(s)) snaps[s] = cloneMLP(net);
        if (s < steps) opt.step(lossAndGrads(net, data.train.X, data.train.y, { l2, dropout: p, rng }));
    }
    return { l2, p, net, curve, snaps, end: curve[curve.length - 1] };
}

/* ── one decayed step ──────────────────────────────────────
   With weight decay the step is w ← w − η(∂L/∂w + λw) = (1 − ηλ)w − η∂L/∂w.
   The prompt asks, of one weight on the weight-decay run's first step,
   whether |w| shrinks. (The memorised network would make a poor question:
   its data gradient is so small that nearly every weight shrinks.) It shrinks when the data's gradient
   points the same way as the decay (S), or the other way but more weakly
   (D); it grows when the data pushes away from 0 harder than the decay
   pulls (A). Either cue alone (signs, or sizes) answers 75% of a 25/25/50
   mix; S entries are only taken where the data's pull is the bigger one,
   so sizes alone get them wrong. Entries whose |w| moves by less than a
   quarter of the decay's own pull, or with |w| < 0.05, are never asked. */
const MARGIN = 0.25;
const WD_MIX = { S: 0.25, D: 0.25, A: 0.5 };
const SHRINK_OPTIONS = ['Shrinks: |w| gets smaller', 'Grows: |w| gets bigger'];
const decayed = (w, g) => (1 - LR * LAMBDA) * w - LR * g;
const shown3 = (v) => Number(v.toPrecision(3));
const shown4 = (v) => Math.round(v * 1e4) / 1e4;

function census(net, data) {
    const { gradW } = lossAndGrads(net, data.train.X, data.train.y);
    const out = [];
    net.W.forEach((w, l) => w.forEach((wi, i) => {
        const g = gradW[l][i];
        const nw = decayed(wi, g);
        const same = Math.sign(g) === Math.sign(wi);
        const decayWins = LAMBDA * Math.abs(wi) > Math.abs(g);
        const shrink = Math.abs(nw) < Math.abs(wi);
        const shownShrink = Math.abs(decayed(shown4(wi), shown3(g))) < Math.abs(shown4(wi));
        // a step that overshoots through 0 is neither kind of pull
        const clear = Math.abs(Math.abs(nw) - Math.abs(wi)) >= MARGIN * LR * LAMBDA * Math.abs(wi) && Math.abs(wi) >= 0.05
            && shownShrink === shrink && Math.sign(nw) === Math.sign(wi);
        const kind = same ? (decayWins ? null : 'S') : decayWins ? 'D' : 'A';
        out.push({ l, o: Math.floor(i / SIZES[l]), i: i % SIZES[l], w: wi, g, nw, shrink, kind: clear ? kind : null });
    }));
    return out;
}
const shrinkShare = (cs) => cs.filter(e => e.shrink).length / cs.length;

function chooseEntry(entries, mix, rng) {
    const keys = Object.keys(mix);
    let r = rng.next() * keys.reduce((a, k) => a + mix[k], 0);
    let key = keys[keys.length - 1];
    for (const k of keys) { if (r < mix[k]) { key = k; break; } r -= mix[k]; }
    const pool = entries.filter(e => e.kind === key);
    return pool.length ? rng.pick(pool) : null;
}

/* ── one dropout mask ────────────────────────────────────── */
const MASK_AVG = 10000;
function maskDemo(net, x, seed) {
    const rng = createRng(seed * 11 + 5);
    const { A } = forward(net, [x]);
    const h = Array.from(A[1]);
    const mask = h.map(() => (rng.next() < P_DROP ? 0 : 1));
    const out = h.map((v, k) => (mask[k] * v) / (1 - P_DROP));
    const sum = new Array(h.length).fill(0);
    for (let r = 0; r < MASK_AVG; r++) h.forEach((v, k) => { if (rng.next() >= P_DROP) sum[k] += v / (1 - P_DROP); });
    const avg = sum.map(s => s / MASK_AVG);
    return { h, mask, out, avg, maxDev: Math.max(...avg.map((a, k) => Math.abs(a - h[k]))) };
}

/** Dropout left on at test time: passes with fresh masks over the validation points. */
const PASSES = 5;
function noisyPasses(net, data, p, rng, n = PASSES) {
    const pEval = probs(net, data.val.X);
    return Array.from({ length: n }, () => {
        const { A } = forward(net, data.val.X, { dropout: p, rng });
        const q = A[A.length - 1];
        let right = 0, flips = 0;
        for (let s = 0; s < q.length; s++) {
            right += (q[s] >= 0.5 ? 1 : 0) === data.val.y[s] ? 1 : 0;
            flips += (q[s] >= 0.5) !== (pEval[s] >= 0.5) ? 1 : 0;
        }
        return { probs: q, acc: right / q.length, flips };
    });
}
function leftOn(net, data, seed) {
    const pEval = probs(net, data.val.X);
    // the validation point the full network gives closest to 0.8 for its own guess: sure, not saturated
    let idx = 0;
    pEval.forEach((p, s) => { if (Math.abs(Math.max(p, 1 - p) - 0.8) < Math.abs(Math.max(pEval[idx], 1 - pEval[idx]) - 0.8)) idx = s; });
    const passes = noisyPasses(net, data, P_DROP, createRng(seed * 13 + 9)).map(r => ({ p: r.probs[idx], acc: r.acc, flips: r.flips }));
    return { idx, x: data.val.X[idx], label: data.val.y[idx], pEval: pEval[idx], accEval: evaluate(net, data.val).acc, passes };
}

/* ── numbers ───────────────────────────────────────────── */

const numD = (v, d) => {
    const s = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(/\.?0+$/, '');
    return (s === '-0' ? '0' : s).replace('-', '−');
};
const num = (v) => numD(v, 4);
const f2 = (v) => { const s = (Math.round(v * 100) / 100).toFixed(2); return (s === '-0.00' ? '0.00' : s).replace('-', '−'); };
const f3 = (v) => { const s = (Math.round(v * 1000) / 1000).toFixed(3); return (s === '-0.000' ? '0.000' : s).replace('-', '−'); };
const pct = (v) => `${Math.round(v * 100)}%`;
/** A share that never rounds to 0% or 100% unless it is exactly that. */
const share = (v) => ((v > 0.99 && v < 1) || (v > 0 && v < 0.01) ? `${(Math.round(v * 1000) / 10).toFixed(1)}%` : pct(v));
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (k) => String(k).split('').map(c => SUB[c]).join('');
const sup = (e) => String(e).split('').map(c => SUP[c]).join('');
function mant3(v) {
    const a = Math.abs(v);
    let e = Math.floor(Math.log10(a));
    let m = Number((a / 10 ** e).toPrecision(3));
    if (m >= 10) { m /= 10; e += 1; }
    return { sign: v < 0, m: m.toFixed(2), e };
}
/** Three significant figures; × 10ⁿ below 0.001. */
const sig3 = (v) => {
    if (v === 0) return '0';
    if (Math.abs(v) >= 1e-3) return String(shown3(v)).replace('-', '−');
    const { sign, m, e } = mant3(v);
    return `${sign ? '−' : ''}${m} × 10${sup(e)}`;
};
const sig3Tex = (v) => {
    if (v === 0) return '0';
    if (Math.abs(v) >= 1e-3) return String(shown3(v));
    const { sign, m, e } = mant3(v);
    return `${sign ? '-' : ''}${m} \\times 10^{${e}}`;
};
/** TeX wants ASCII minus; "a - -b" and "a + -b" are tidied to "a + b" and "a - b". */
const tex = (s) => s.replace(/−/g, '-').replace(/- -/g, '+ ').replace(/\+ -/g, '- ');
/** A negative number in brackets, for "a · (−b)". */
const par = (s) => (s.startsWith('−') || s.startsWith('-') ? `(${s})` : s);
const wName = (e) => `W${sub(e.l + 1)}[${e.o + 1}, ${e.i + 1}]`;
const pt = ([x, y]) => `(${f2(x)}, ${f2(y)})`;

/* ── the guided tour ─────────────────────────────────────── */

const ACTS = [
    { id: 1, label: 'Memorise', icon: Brain },
    { id: 2, label: 'Weight decay', icon: Minimize2 },
    { id: 3, label: 'Dropout', icon: EyeOff },
    { id: 4, label: 'Test time', icon: FlaskConical },
    { id: 5, label: 'Compare', icon: BarChart3 },
];
const DEFAULT_SEED = 19;

/** The tour's three training runs, one per yield, so the page can paint between them. */
function* buildTour(seed) {
    const data = makeData(seed);
    const plain = trainRun(data, seed, { keep: [0, 100, STEPS] });
    yield 1;
    const wd = trainRun(data, seed, { l2: LAMBDA });
    yield 2;
    const drop = trainRun(data, seed, { p: P_DROP });
    yield 3;
    const start = census(plain.snaps[0], data), end = census(plain.snaps[STEPS], data);
    const ask = chooseEntry(start, WD_MIX, createRng(seed * 31 + 7));
    // the validation point the memorised network is most wrong about, its loss from the logit
    const { Z } = forward(plain.net, data.val.X);
    const z = Z[Z.length - 1];
    let worst = 0, worstLoss = -1;
    z.forEach((v, s) => { const l = Math.max(v, 0) - v * data.val.y[s] + Math.log1p(Math.exp(-Math.abs(v))); if (l > worstLoss) { worstLoss = l; worst = s; } });
    return {
        seed, data, plain, wd, drop, ask,
        share: { start: shrinkShare(start), end: shrinkShare(end) },
        worst: { idx: worst, x: data.val.X[worst], label: data.val.y[worst], pRight: Math.exp(-worstLoss), loss: worstLoss },
        mask: maskDemo(drop.net, data.train.X[0], seed),
        leftOn: leftOn(drop.net, data, seed),
    };
}
function tourOf(seed) {
    const it = buildTour(seed);
    let r = it.next();
    while (!r.done) r = it.next();
    return r.value;
}

const at = (run, step) => run.curve.find(c => c.step === step);
const valMin = (run) => run.curve.reduce((b, c) => (c.val < b.val ? c : b), run.curve[0]);

function generateSteps(T) {
    const { data, plain, wd, drop } = T;
    const steps = [];
    const s = (act, actName, d, explanation) => steps.push({ act, actName, ask: null, ...d, explanation });
    const c0 = at(plain, 0), c100 = at(plain, 100), cE = plain.end, vMin = valMin(plain);
    const ss = sumSq(plain.net);

    /* Act 1: memorise */
    s(1, 'Memorise', {
        kind: 'data', net: plain.snaps[0], run: 'plain', upTo: 0,
        tex: String.raw`\begin{aligned} \text{parameters} &= (2 \cdot 24 + 24) + (24 \cdot 24 + 24) + (24 \cdot 1 + 1) \\ &= 72 + 600 + 25 = ${N_PARAMS} \end{aligned}`,
    }, `30 noisy training points from two interleaved moons, 15 of each class, and 400 more drawn the same way to validate on. The network, 2 → 24 → 24 → 1 with tanh, has ${N_PARAMS} parameters: ${Math.round(N_PARAMS / N_TRAIN)} for every training point. Before training its weights are random: training loss ${f3(c0.train)}, validation loss ${f3(c0.val)} (always answering 50/50 would score ln 2 = 0.693).`);
    s(1, 'Memorise', {
        kind: 'train', net: plain.snaps[100], run: 'plain', upTo: 100,
        tex: tex(String.raw`\begin{gathered} L = -\tfrac{1}{n}\textstyle\sum_i \big[y_i \ln p_i + (1 - y_i)\ln(1 - p_i)\big] \\ L_{\text{train}} = ${f3(c100.train)}, \quad L_{\text{val}} = ${f3(c100.val)} \end{gathered}`),
    }, `After 100 steps of gradient descent (η = 1, all 30 points every step) the boundary has begun to follow the two moons. Training loss ${f3(c100.train)}, validation loss ${f3(c100.val)}; ${c100.right} of the 30 training points and ${pct(c100.valAcc)} of the validation points are on the right side.`);
    s(1, 'Memorise', {
        kind: 'train', net: plain.net, run: 'plain', upTo: STEPS,
        tex: tex(String.raw`L_{\text{train}}: ${f3(c0.train)} \to ${f3(cE.train)}, \qquad L_{\text{val}}: ${f3(c0.val)} \to ${f3(vMin.val)} \text{ (step ${vMin.step})} \to ${f3(cE.val)}`),
    }, `After ${STEPS.toLocaleString('en-US')} steps it gets ${cE.right === N_TRAIN ? 'all 30' : `${cE.right} of the 30`} training points right, with training loss ${f3(cE.train)}, by bending the boundary around the stray ones. On the validation points it is right ${pct(cE.valAcc)} of the time, and its validation loss${vMin.step < STEPS ? `, lowest at step ${vMin.step} (${f3(vMin.val)}), has climbed to ${f3(cE.val)}` : ` is ${f3(cE.val)}`}. It has learned the noise in these 30 points, not just the moons.`);
    s(1, 'Memorise', {
        kind: 'confident', net: plain.net, run: 'plain', upTo: STEPS, highlightVal: T.worst.idx,
        tex: tex(String.raw`\|W\| = \sqrt{\textstyle\sum w^2}: \; ${f2(c0.norm)} \to ${f2(cE.norm)}, \qquad -\ln(${sig3Tex(T.worst.pRight)}) = ${f2(T.worst.loss)}`),
    }, `${vMin.step < STEPS ? `Between step ${vMin.step} and step ${STEPS.toLocaleString('en-US')}, validation loss went from ${f3(vMin.val)} to ${f3(cE.val)} while validation accuracy went from ${pct(vMin.valAcc)} to ${pct(cE.valAcc)}. ` : ''}The loss punishes confident mistakes, and the network grew sure of itself: the size of its ${N_WEIGHTS} weights, ‖W‖ = √(Σw²), went from ${f2(c0.norm)} to ${f2(cE.norm)}, and big weights make steep, confident boundaries. Its worst validation point, ${pt(T.worst.x)} in class ${T.worst.label === 1 ? 'orange' : 'blue'} (ringed in yellow), gets probability ${sig3(T.worst.pRight)} for its own class: a loss of −ln p = ${f2(T.worst.loss)} from that one point, against an average of ${f3(cE.val)}. Both remedies on this page work by keeping the network from getting that sure.`);

    /* Act 2: weight decay */
    s(2, 'Weight decay', {
        kind: 'penalty', net: plain.net, run: 'plain', upTo: STEPS,
        tex: tex(String.raw`L = L_{\text{data}} + \tfrac{\lambda}{2}\textstyle\sum w^2 = ${f3(cE.train)} + 0.005 \times ${f2(ss)} = ${f3(cE.train + (LAMBDA / 2) * ss)}`),
    }, `Weight decay adds the weights' squared size to the loss: L = L_data + (λ/2)Σw², over the ${N_WEIGHTS} weights (biases are left alone). With λ = 0.01 the memorised network would pay (0.01/2) × ${f2(ss)} = ${f3((LAMBDA / 2) * ss)}, ${Math.round((LAMBDA / 2) * ss / cE.train).toLocaleString('en-US')} times its data loss of ${f3(cE.train)}. Training now has to trade fitting the points against keeping the weights small.`);
    const q = T.ask;
    const qShown = q ? { w: shown4(q.w), g: shown3(q.g) } : null;
    const qNew = q ? decayed(qShown.w, qShown.g) : null;
    s(2, 'Weight decay', {
        kind: 'step', net: plain.snaps[0], run: 'wd', upTo: 0, ask: q ? { ...q, shownW: qShown.w, shownG: qShown.g, shownNew: qNew } : null,
        tex: q
            ? tex(String.raw`w \leftarrow (1 - \eta\lambda)\,w - \eta\,\frac{\partial L_{\text{data}}}{\partial w} = 0.99 \cdot ${par(num(q.w))} - 1 \cdot ${par(sig3Tex(q.g))}`)
            : String.raw`w \leftarrow w - \eta\Big(\frac{\partial L_{\text{data}}}{\partial w} + \lambda w\Big) = (1 - \eta\lambda)\,w - \eta\,\frac{\partial L_{\text{data}}}{\partial w}`,
    }, `The penalty's gradient is λw, so each step becomes w ← w − η(∂L_data/∂w + λw) = (1 − ηλ)w − η ∂L_data/∂w. Before the data has its say, every weight is multiplied by 1 − ηλ = 0.99: that is the decay. Then the data's gradient pushes it, toward 0 or away. Now train again from the same starting weights with λ = 0.01.${q ? ` On the first step, weight ${wName(q)} is w = ${num(q.w)}, and ∂L_data/∂w = ${sig3(q.g)}.` : ''}`);
    if (q) {
        const why = q.kind === 'S'
            ? `the data's gradient has the same sign as w, so it pulls toward 0 along with the decay`
            : q.kind === 'D'
                ? `the data pushes away from 0, but by ${sig3(Math.abs(q.g))}, less than the decay's pull of 0.01 × |w| = ${sig3(LAMBDA * Math.abs(q.w))}`
                : `the data pushes away from 0 by ${sig3(Math.abs(q.g))}, more than the decay's pull of 0.01 × |w| = ${sig3(LAMBDA * Math.abs(q.w))}`;
        s(2, 'Weight decay', {
            kind: 'stepResult', net: plain.snaps[0], run: 'wd', upTo: 0,
            tex: tex(String.raw`w \leftarrow 0.99 \cdot ${par(num(q.w))} - 1 \cdot ${par(sig3Tex(q.g))} = ${num(qNew)}`),
        }, `|w| ${Math.abs(qNew) < Math.abs(qShown.w) ? 'shrinks' : 'grows'}, from ${num(Math.abs(qShown.w))} to ${num(Math.abs(qNew))}: ${why}. Over all ${N_WEIGHTS} weights, this first step shrinks ${share(T.share.start)} of them: early on, the data's gradient is as strong as the decay. The same decayed step taken from the memorised plain network would shrink ${share(T.share.end)}, because once the 30 points are fitted the data has almost nothing left to say (medians over ${REG_STUDY.n} seeds: ${share(REG_STUDY.shrink.start)} and ${share(REG_STUDY.shrink.end)}). Late in training, the decay is the strongest pull left.`);
    }
    s(2, 'Weight decay', {
        kind: 'trained', net: wd.net, run: 'wd', upTo: STEPS, bars: true,
        tex: tex(String.raw`\begin{gathered} \lambda = 0 \to \lambda = 0.01 \qquad \|W\|: ${f2(cE.norm)} \to ${f2(wd.end.norm)} \\ L_{\text{train}}: ${f3(cE.train)} \to ${f3(wd.end.train)}, \quad L_{\text{val}}: ${f3(cE.val)} \to ${f3(wd.end.val)} \end{gathered}`),
    }, `Carry on for all ${STEPS.toLocaleString('en-US')} steps with λ = 0.01. After ${STEPS.toLocaleString('en-US')} steps its training loss is ${f3(wd.end.train)}, worse than the plain run's ${f3(cE.train)}, and its validation loss is ${f3(wd.end.val)}, ${wd.end.val < cE.val ? 'better' : 'worse'} than the plain run's ${f3(cE.val)}. ${N_TRAIN - wd.end.right === 0 ? 'Every training point is still on the right side' : `${N_TRAIN - wd.end.right} training ${N_TRAIN - wd.end.right === 1 ? 'point is' : 'points are'} left on the wrong side`}, and ‖W‖ is ${f2(wd.end.norm)} instead of ${f2(cE.norm)}. Below, the 24 weights into the output unit, both runs.`);

    /* Act 3: dropout */
    const M = T.mask;
    const kKeep = M.mask.indexOf(1), kDrop = M.mask.indexOf(0);
    const kept = M.mask.filter(Boolean).length;
    s(3, 'Dropout', {
        kind: 'mask', net: drop.net, run: 'drop', upTo: STEPS,
        tex: tex(String.raw`\tilde h_k = \frac{m_k\, h_k}{1 - p}: \quad ${[kKeep, kDrop].filter(k => k >= 0).sort((a, b) => a - b).map(k => (M.mask[k]
            ? String.raw`\tilde h_{${k + 1}} = \frac{1 \cdot ${par(num(M.h[k]))}}{0.5} = ${num(M.out[k])}`
            : String.raw`\tilde h_{${k + 1}} = \frac{0 \cdot ${par(num(M.h[k]))}}{0.5} = 0`)).join(String.raw`, \quad `)}`),
    }, `Dropout fights memorising another way. On every training step each hidden unit is switched off with probability p = 0.5, independently, and the units that survive are doubled (divided by 1 − p). Here is training point 1 going through the first hidden layer of the dropout-trained network with one mask: ${kept} of the 24 units survive. The mask is redrawn on every step.`);
    s(3, 'Dropout', {
        kind: 'expect', net: drop.net, run: 'drop', upTo: STEPS,
        tex: String.raw`\mathbb{E}[\tilde h_k] = (1 - p)\cdot\frac{h_k}{1 - p} + p \cdot 0 = h_k`,
    }, `Why double the survivors? A unit survives half the time, so on average it passes on (1 − p) · h / (1 − p) = h, exactly what it passes on with nothing dropped. Averaging this layer over ${MASK_AVG.toLocaleString('en-US')} random masks gives back h to within ${f3(M.maxDev)}. So the next layer sees the same input on average in training as at test time, when nothing is dropped.`);
    s(3, 'Dropout', {
        kind: 'trained', net: drop.net, run: 'drop', upTo: STEPS,
        tex: tex(String.raw`\begin{gathered} p = 0 \to p = 0.5 \qquad \|W\|: ${f2(cE.norm)} \to ${f2(drop.end.norm)} \\ L_{\text{train}}: ${f3(cE.train)} \to ${f3(drop.end.train)}, \quad L_{\text{val}}: ${f3(cE.val)} \to ${f3(drop.end.val)} \end{gathered}`),
    }, `Trained with dropout on both hidden layers from the same start, every step trains a different random half of the network, so no unit can count on its neighbours to help carve an island around one stray point. After ${STEPS.toLocaleString('en-US')} steps: training loss ${f3(drop.end.train)} (plain ${f3(cE.train)}), validation loss ${f3(drop.end.val)} (plain ${f3(cE.val)}), ‖W‖ ${f2(drop.end.norm)} (plain ${f2(cE.norm)}). The losses are measured with nothing dropped, as at test time.`);

    /* Act 4: test time */
    const LO = T.leftOn;
    s(4, 'Test time', {
        kind: 'eval', net: drop.net, run: 'drop', upTo: STEPS, highlightVal: LO.idx,
        tex: tex(String.raw`\begin{gathered} \text{test: } \tilde h = h \\ p(\text{ringed point}) = ${num(LO.pEval)}, \qquad \text{validation accuracy} = ${f3(LO.accEval)} \end{gathered}`),
    }, `At test time dropout is switched off (model.eval() in PyTorch) and nothing is rescaled: the doubling during training has already matched the two scales. The field is this full network. It gives the ringed validation point, ${pt(LO.x)} in class ${LO.label === 1 ? 'orange' : 'blue'}, probability ${num(LO.pEval)} of being orange, and gets ${pct(LO.accEval)} of the validation points right.`);
    const ps = LO.passes.map(r => r.p), flips = LO.passes.map(r => r.flips);
    const [fLo, fHi] = [Math.min(...flips), Math.max(...flips)];
    s(4, 'Test time', {
        kind: 'leftOn', net: drop.net, run: 'drop', upTo: STEPS, highlightVal: LO.idx, passes: LO.passes,
        tex: tex(String.raw`\begin{gathered} p(\text{ringed point}) = ${ps.map(num).join(',\\; ')} \\ \text{dropout off: } ${num(LO.pEval)} \end{gathered}`),
    }, `Forget to switch it off and every prediction depends on the mask. Five passes with dropout left on give the ringed point ${ps.map(num).join(', ')} instead of ${num(LO.pEval)}. In each pass ${fLo === fHi ? fLo : `${fLo} to ${fHi}`} of the 400 validation points get the other class from the one the full network gives them. A model that answers differently each time it is asked is the usual sign of a missing model.eval().`);

    /* Act 5: compare */
    const regs = [['weight decay', wd], ['dropout', drop]];
    const usual = regs.every(([, r]) => r.end.train > cE.train && r.end.val < cE.val);
    const verdict = usual
        ? 'Both regularised networks fit their training points worse and the validation points better.'
        : `${regs.map(([name, r]) => `With ${name} the network fits its training points ${r.end.train > cE.train ? 'worse' : 'better'} and the validation points ${r.end.val < cE.val ? 'better' : 'worse'}`).join('; ')}: not every seed goes the usual way.`;
    s(5, 'Compare', {
        kind: 'compare', net: null,
        tex: tex(String.raw`L_{\text{val}}: \; ${f3(cE.val)} \;(\text{plain}), \quad ${f3(wd.end.val)} \;(\lambda = 0.01), \quad ${f3(drop.end.val)} \;(p = 0.5)`),
    }, `Side by side on these 30 points: training loss ${f3(cE.train)} plain, ${f3(wd.end.train)} with weight decay, ${f3(drop.end.train)} with dropout; validation loss ${f3(cE.val)}, ${f3(wd.end.val)} and ${f3(drop.end.val)}. ${verdict} Over ${REG_STUDY.n} seeds, weight decay had the lower validation loss in ${REG_STUDY.wdWins} and dropout in ${REG_STUDY.dropWins}.`);
    s(5, 'Compare', {
        kind: 'tooMuch', net: null,
        tex: tex(String.raw`\begin{gathered} \lambda = ${TM.lambda}: \; L_{\text{train}} = ${f3(TM.wd.train)}, \; L_{\text{val}} = ${f3(TM.wd.val)} \\ p = ${TM.p}: \; L_{\text{train}} = ${f3(TM.drop.train)}, \; L_{\text{val}} = ${f3(TM.drop.val)} \end{gathered}`),
    }, `Both are dials, not switches. Over the same ${REG_STUDY.n} seeds, λ = ${TM.lambda} multiplies every weight by ${numD(1 - LR * TM.lambda, 2)} on every step, and the median run ends up answering 50/50 everywhere: training and validation loss ${f3(TM.wd.train)} (ln 2), validation accuracy ${pct(TM.wd.valAcc)}. Dropout with p = ${TM.p} keeps one unit in ten and does no better: training loss ${f3(TM.drop.train)}, validation loss ${f3(TM.drop.val)}, accuracy ${pct(TM.drop.valAcc)}. Both validation losses still beat the plain run's ${f3(REG_STUDY.plain.val)}, because a network that never commits is never confidently wrong; accuracy shows what was lost (plain ${pct(REG_STUDY.plain.valAcc)}). The dial is set by watching the validation loss, as the polynomial's degree was on Overfitting and Underfitting.`);
    return steps;
}

function predictFor(step, next) {
    if (!step || !next || !step.ask || next.kind !== 'stepResult') return null;
    const q = step.ask;
    const shrink = Math.abs(q.shownNew) < Math.abs(q.shownW);
    return {
        question: `First step of the weight-decay run. Weight ${wName(q)} is w = ${num(q.w)}, and the data's gradient is ∂L_data/∂w = ${sig3(q.g)}. With η = 1 and λ = 0.01 the step is w ← 0.99w − ∂L_data/∂w. Does |w| shrink or grow?`,
        options: SHRINK_OPTIONS,
        correct: shrink ? 0 : 1,
        because: `0.99 × ${par(num(q.w))} − ${par(sig3(q.g))} = ${num(q.shownNew)}, so |w| goes from ${num(Math.abs(q.shownW))} to ${num(Math.abs(q.shownNew))}.`,
    };
}

/* ── the measured misconception ────────────────────────────
   Seeds 1–100, every run as on the page (same data, start and step count).
   Medians of the final training loss, validation loss and validation
   accuracy; "wins" counts the seeds whose validation loss beat the plain
   run's. SHRINK is the median share of weights a decayed step shrinks, at
   the plain run's start and end. The suite reruns all of it. */
const REG_STUDY = {
    n: 100,
    plain: { train: 0.007, val: 1.44, valAcc: 0.784 },
    wd: { train: 0.297, val: 0.451, valAcc: 0.809 },
    drop: { train: 0.221, val: 0.565, valAcc: 0.81 },
    wdWins: 100, dropWins: 97,
    tooMuch: { lambda: 0.3, p: 0.9, wd: { train: 0.693, val: 0.693, valAcc: 0.5 }, drop: { train: 0.836, val: 0.857, valAcc: 0.5 } },
    shrink: { start: 0.571, end: 0.995 },
};
const TM = REG_STUDY.tooMuch;

const quizQuestions = [
    {
        question: 'A network was trained with dropout p = 0.5, the inverted dropout PyTorch uses. At test time, what happens to a hidden unit\'s activation h?',
        options: [
            'It is multiplied by 0.5',
            'It passes through unchanged: no unit is dropped and nothing is rescaled',
            'It is dropped with probability 0.5, as in training',
            'It is multiplied by 2',
        ],
        correct: 1,
        explanation: 'Inverted dropout does the rescaling during training: survivors are divided by 1 − p, so their average already equals h. At test time (model.eval()) the layer is the identity.',
    },
    {
        question: 'Plain gradient descent with η = 0.1 and weight decay λ = 0.01. What happens to every weight on every step, before the data\'s gradient is applied?',
        options: [
            'It is multiplied by 1 − ηλ = 0.999',
            'It is set to 0 if it is small enough',
            'It is multiplied by 1 − λ = 0.99',
            'Nothing: weight decay only changes the loss value',
        ],
        correct: 0,
        explanation: 'The penalty (λ/2)Σw² adds λw to each gradient, so w ← w − η(∂L/∂w + λw) = (1 − ηλ)w − η∂L/∂w. With η = 0.1 and λ = 0.01 the factor is 0.999.',
    },
    {
        question: 'Compared with the same network trained without it, a network trained with well-tuned weight decay or dropout usually has…',
        options: [
            'a lower training loss and a lower validation loss',
            'the same training loss and a lower validation loss',
            'a higher training loss and a lower validation loss',
            'a higher training loss and a higher validation loss',
        ],
        correct: 2,
        explanation: 'Regularisation stops the network fitting the noise in its training points, so it fits them worse. On this page (medians over 100 seeds): training loss up from 0.007 to 0.297 with weight decay and 0.221 with dropout, validation loss down from 1.440 to 0.451 and 0.565.',
    },
];

const codeExample = `import torch

torch.manual_seed(3)
drop = torch.nn.Dropout(p=0.5)            # inverted dropout, like this page
h = torch.tensor([0.62, -0.41, 0.88, 0.15, -0.73, 0.30])
print(drop(h))    # training mode: [1.24, -0.82, 0, 0.30, 0, 0], three kept and doubled
drop.eval()
print(drop(h))    # eval mode: [0.62, -0.41, 0.88, 0.15, -0.73, 0.30], h unchanged

w = torch.tensor([1.5], requires_grad=True)
opt = torch.optim.SGD([w], lr=1.0, weight_decay=0.01)
(0.02 * w).sum().backward()               # a data gradient of 0.02
opt.step()
print(round(w.item(), 4))   # 1.465 = 0.99 * 1.5 - 0.02`;

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

const RUN_COLOR = { plain: '#f87171', wd: '#a3e635', drop: '#38bdf8' };
const RUN_NAME = { plain: 'plain', wd: 'weight decay', drop: 'dropout' };

/** The classifier's field with the training points; wrong ones get a white ring. */
function Field({ net, data, highlightVal = null, dropout = null, version = 0 }) {
    const predictBatch = useCallback((grid) => {
        if (!net) return grid.map(() => 0.5);
        return dropout ? forward(net, grid, { dropout: dropout.p, rng: createRng(dropout.draw) }).A[net.sizes.length - 1] : probs(net, grid);
    }, [net, dropout]);
    const points = useMemo(() => {
        const p = net ? probs(net, data.train.X) : null;
        const pts = data.train.X.map(([x, y], i) => ({ x, y, label: data.train.y[i], wrong: p ? (p[i] >= 0.5 ? 1 : 0) !== data.train.y[i] : false }));
        if (highlightVal !== null) pts.push({ x: data.val.X[highlightVal][0], y: data.val.X[highlightVal][1], label: data.val.y[highlightVal] });
        return pts;
    // the Explore network trains in place; version says when it changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [net, data, highlightVal, version]);
    return (
        <DecisionField predictBatch={predictBatch} points={points} version={version} xRange={FIELD} yRange={FIELD} resolution={60}
            highlight={highlightVal !== null ? points.length - 1 : null}
            ariaLabel="The network's decision field over the plane, with the 30 training points; misclassified points have a white ring" />
    );
}

function Curves({ runs, upTo }) {
    const series = runs.flatMap(r => [
        { name: `${RUN_NAME[r.key]} train`, color: RUN_COLOR[r.key], points: r.run.curve.filter(c => c.step <= upTo && c.step > 0).map(c => ({ x: c.step, y: c.train })) },
        { name: `${RUN_NAME[r.key]} val`, color: r.key === 'plain' ? '#fb923c' : r.key === 'wd' ? '#facc15' : '#a78bfa', points: r.run.curve.filter(c => c.step <= upTo && c.step > 0).map(c => ({ x: c.step, y: c.val })) },
    ]);
    return <TrainingCurve logY series={series} height={170} ariaLabel="Training and validation loss against step, log scale" />;
}

/** The 24 weights into the output unit, two runs side by side. */
function WeightBars({ a, b }) {
    const wa = Array.from(a.W[2]), wb = Array.from(b.W[2]);
    const max = Math.max(...wa.map(Math.abs), ...wb.map(Math.abs));
    const W = 480, H = 120, mid = H / 2, bw = W / 24;
    const y = (v) => Math.round((mid - (v / max) * (mid - 8)) * 100) / 100;
    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 mb-1 text-[11px] text-slate-400">
                <ShapeTag label="W₃" shape={[1, 24]} />
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: RUN_COLOR.plain }} />plain</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: RUN_COLOR.wd }} />weight decay</span>
                <span>largest |w| {f2(Math.max(...wa.map(Math.abs)))} vs {f2(Math.max(...wb.map(Math.abs)))}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="The 24 weights into the output unit: plain run against weight decay">
                <line x1="0" x2={W} y1={mid} y2={mid} stroke="#334155" />
                {wa.map((v, k) => (
                    <g key={k}>
                        <rect x={k * bw + 2} width={bw / 2 - 2} y={Math.min(y(v), mid)} height={Math.max(0.5, Math.abs(y(v) - mid))} fill={RUN_COLOR.plain} />
                        <rect x={k * bw + bw / 2} width={bw / 2 - 2} y={Math.min(y(wb[k]), mid)} height={Math.max(0.5, Math.abs(y(wb[k]) - mid))} fill={RUN_COLOR.wd} />
                    </g>
                ))}
            </svg>
        </div>
    );
}

/** h, the mask and h̃ for the 24 units, in three blocks of 8; with `showAvg`, the mean of h̃ over many masks too. */
function MaskStrip({ demo, showAvg = false }) {
    const rows = [['h', demo.h, true], ['m', demo.mask, false], ['h̃', demo.out, true], ...(showAvg ? [['mean', demo.avg, true]] : [])];
    const block = (from) => (
        <table key={from} className="text-[10px] sm:text-xs font-mono border-separate" style={{ borderSpacing: 2 }}>
            <tbody>
                <tr><td /><td colSpan={8} className="text-[10px] text-slate-500 font-sans pb-0.5">units {from + 1}–{from + 8}</td></tr>
                {rows.map(([label, vals, tint]) => (
                    <tr key={label}>
                        <td className="pr-1 text-slate-500 font-sans">{label}</td>
                        {vals.slice(from, from + 8).map((v, k) => {
                            const t = Math.max(-1, Math.min(1, v / 2));
                            const off = demo.mask[from + k] === 0;
                            return (
                                <td key={k} className={`text-right px-1 py-0.5 rounded ${tint ? '' : off ? 'bg-slate-800 text-slate-500' : 'bg-slate-700 text-slate-100'}`}
                                    style={tint ? { background: diverging(t), color: inkOn(t, 'diverging'), opacity: label === 'h̃' && off ? 0.35 : 1 } : undefined}>
                                    {tint ? f2(v) : v}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <ShapeTag label="h, m, h̃" shape={[24]} />
                <span>first hidden layer, training point 1; m = 0 is dropped{showAvg ? `; mean: h̃ averaged over ${MASK_AVG.toLocaleString('en-US')} masks` : ''}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 overflow-x-auto">{[0, 8, 16].map(block)}</div>
        </div>
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

function CompareTable({ T }) {
    const rows = [['plain', T.plain], ['wd', T.wd], ['drop', T.drop]];
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
                <thead>
                    <tr className="text-slate-500 text-left">
                        <th className="font-medium pb-2 pr-3">run</th><th className="font-medium pb-2 pr-3">train loss</th><th className="font-medium pb-2 pr-3">val loss</th>
                        <th className="font-medium pb-2 pr-3">train right</th><th className="font-medium pb-2 pr-3">val acc</th><th className="font-medium pb-2">‖W‖</th>
                    </tr>
                </thead>
                <tbody className="font-mono text-slate-200">
                    {rows.map(([key, run]) => (
                        <tr key={key} className="border-t border-slate-800">
                            <td className="py-1.5 pr-3 font-sans" style={{ color: RUN_COLOR[key] }}>{RUN_NAME[key]}</td>
                            <td className="pr-3">{f3(run.end.train)}</td><td className="pr-3">{f3(run.end.val)}</td>
                            <td className="pr-3">{run.end.right}/{N_TRAIN}</td><td className="pr-3">{pct(run.end.valAcc)}</td><td>{f2(run.end.norm)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function StepView({ step, T }) {
    if (step.kind === 'compare') {
        return (
            <div className="space-y-4">
                <CompareTable T={T} />
                <Curves runs={[{ key: 'plain', run: T.plain }, { key: 'wd', run: T.wd }, { key: 'drop', run: T.drop }]} upTo={STEPS} />
            </div>
        );
    }
    if (step.kind === 'tooMuch') {
        const S = REG_STUDY;
        return (
            <div className="overflow-x-auto">
                <p className="text-xs text-slate-500 mb-2">Medians over {S.n} seeds, {STEPS.toLocaleString('en-US')} steps each</p>
                <table className="w-full text-xs sm:text-sm">
                    <thead><tr className="text-slate-500 text-left"><th className="font-medium pb-2 pr-3">setting</th><th className="font-medium pb-2 pr-3">train loss</th><th className="font-medium pb-2 pr-3">val loss</th><th className="font-medium pb-2">val acc</th></tr></thead>
                    <tbody className="font-mono text-slate-200">
                        {[['plain', S.plain], ['λ = 0.01', S.wd], [`λ = ${S.tooMuch.lambda}`, S.tooMuch.wd], ['p = 0.5', S.drop], [`p = ${S.tooMuch.p}`, S.tooMuch.drop]].map(([name, r]) => (
                            <tr key={name} className="border-t border-slate-800"><td className="py-1.5 pr-3 font-sans text-slate-300">{name}</td><td className="pr-3">{f3(r.train)}</td><td className="pr-3">{f3(r.val)}</td><td>{pct(r.valAcc)}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
    const runs = { plain: T.plain, wd: T.wd, drop: T.drop };
    const curveRuns = step.run === 'plain' ? [{ key: 'plain', run: T.plain }] : [{ key: 'plain', run: T.plain }, { key: step.run, run: runs[step.run] }];
    const end = at(runs[step.run], step.upTo) ?? runs[step.run].end;
    const isMask = step.kind === 'mask' || step.kind === 'expect';
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="max-w-[360px] w-full mx-auto">
                    <Field net={step.net} data={T.data} highlightVal={step.highlightVal ?? null} />
                    <p className="text-[11px] text-slate-500 mt-1.5">{RUN_NAME[step.run]} run, step {step.upTo.toLocaleString('en-US')} · blue and orange: the two classes</p>
                </div>
                <div className="space-y-3 min-w-0">
                    {isMask ? (
                        <div className="grid grid-cols-2 gap-2">
                            <Stat label="units kept, of 24" value={T.mask.mask.filter(Boolean).length} />
                            <Stat label="survivors multiplied by" value="1 / (1 − p) = 2" />
                            {step.kind === 'expect' && <Stat label={`largest |mean − h|, ${MASK_AVG.toLocaleString('en-US')} masks`} value={f3(T.mask.maxDev)} tone="text-orange-200" />}
                        </div>
                    ) : step.kind === 'leftOn' ? (
                        <div className="space-y-2">
                            <table className="w-full text-xs">
                                <thead><tr className="text-slate-500 text-left"><th className="font-medium pb-1 pr-2">dropout left on</th><th className="font-medium pb-1 pr-2">p(ringed point)</th><th className="font-medium pb-1">flipped, of 400</th></tr></thead>
                                <tbody className="font-mono text-slate-200">
                                    {step.passes.map((r, k) => (
                                        <tr key={k} className="border-t border-slate-800"><td className="py-1 pr-2 font-sans text-slate-400">pass {k + 1}</td><td className="pr-2">{num(r.p)}</td><td>{r.flips}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-[11px] text-slate-500">flipped: validation points given the other class than with dropout off</p>
                            <Stat label="dropout off (model.eval())" value={num(T.leftOn.pEval)} tone="text-orange-200" />
                        </div>
                    ) : (
                        <>
                            {step.upTo > 0 && <Curves runs={curveRuns} upTo={step.upTo} />}
                            <div className="grid grid-cols-2 gap-2">
                                <Stat label="training loss" value={f3(end.train)} />
                                <Stat label="validation loss" value={f3(end.val)} />
                                <Stat label="training points right" value={`${end.right} / ${N_TRAIN}`} />
                                <Stat label="validation accuracy" value={pct(end.valAcc)} />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <ShapeTag label="W₁" shape={[24, 2]} /><ShapeTag label="W₂" shape={[24, 24]} /><ShapeTag label="W₃" shape={[1, 24]} />
                                <span className="text-[11px] text-slate-500 self-center">‖W‖ = {f2(end.norm)}</span>
                            </div>
                            {step.bars && <WeightBars a={T.plain.net} b={T.wd.net} />}
                        </>
                    )}
                </div>
            </div>
            {isMask && <MaskStrip demo={T.mask} showAvg={step.kind === 'expect'} />}
        </div>
    );
}

/* ── explore ───────────────────────────────────────────── */

const LAB_LAMBDAS = [0, 0.001, 0.01, 0.1];
const LAB_PS = [0, 0.2, 0.5, 0.8];
const LAB_MAX = 2000;
const BREAK_LAMBDA = 0.3;

function Lab() {
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const [lambda, setLambda] = useState(0);
    const [p, setP] = useState(0);
    const [testDrop, setTestDrop] = useState(false);
    const [draw, setDraw] = useState(1);
    const [saved, setSaved] = useState(null);
    const data = useMemo(() => makeData(seed), [seed]);

    const trainer = useTrainer({
        init: () => {
            const net = newNet(seed);
            return { net, opt: createOptimizer(net, { type: 'sgd', lr: LR }), rng: createRng(seed * 7 + 2) };
        },
        step: (st, k) => {
            st.opt.step(lossAndGrads(st.net, data.train.X, data.train.y, { l2: lambda, dropout: p, rng: st.rng }));
            if ((k + 1) % 10 !== 0) return null;
            const tr = evaluate(st.net, data.train), va = evaluate(st.net, data.val);
            return { train: tr.loss, val: va.loss };
        },
        deps: [seed, lambda, p, data],
        maxSteps: LAB_MAX,
    });
    const net = trainer.state.net;
    const tr = evaluate(net, data.train), va = evaluate(net, data.val);
    const ss = sumSq(net);
    const dropView = testDrop && p > 0 ? { p, draw: seed * 101 + draw } : null;
    const passes = useMemo(() => (testDrop && p > 0 ? noisyPasses(net, data, p, createRng(seed * 13 + draw)) : null),
    // trainer.steps changes as the network trains in place
    // eslint-disable-next-line react-hooks/exhaustive-deps
        [testDrop, p, seed, draw, net, data, trainer.steps]);

    const breakIt = (kind) => {
        setSaved(s => s ?? { lambda, p });
        if (kind === 'test') { if (p === 0) setP(P_DROP); setTestDrop(true); setDraw(d => d + 1); }
        else { setTestDrop(false); setLambda(BREAK_LAMBDA); }
    };
    const repair = () => { if (saved) { setLambda(saved.lambda); setP(saved.p); } setTestDrop(false); setSaved(null); };

    let message = null;
    if (dropView && passes) {
        const fl = passes.map(r => r.flips);
        message = `Dropout left on at test time: every redraw uses a new mask, so the boundary flickers. In five passes, ${Math.min(...fl) === Math.max(...fl) ? Math.min(...fl) : `${Math.min(...fl)} to ${Math.max(...fl)}`} of the 400 validation points get the other class from the one the full network gives them; accuracy ${passes.map(r => pct(r.acc)).join(', ')}, against ${pct(va.acc)} with dropout off.`;
    } else if (lambda === BREAK_LAMBDA) {
        message = `λ = ${BREAK_LAMBDA}: every step multiplies each weight by ${numD(1 - LR * BREAK_LAMBDA, 2)} before the data's push, and the weights stay small (‖W‖ = ${f2(Math.sqrt(ss))}). After ${trainer.steps.toLocaleString('en-US')} steps the training loss is ${f3(tr.loss)}: the network cannot even fit the moons.`;
    }
    const chip = (active) => `text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? 'border-orange-500 bg-orange-500/15 text-orange-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`;

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 w-24">weight decay λ</span>
                    {LAB_LAMBDAS.map(v => <button key={v} onClick={() => { setLambda(v); setSaved(null); }} aria-pressed={lambda === v} className={chip(lambda === v)}>{v}</button>)}
                    {lambda === BREAK_LAMBDA && <span className={chip(true)}>{BREAK_LAMBDA}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 w-24">dropout p</span>
                    {LAB_PS.map(v => <button key={v} onClick={() => { setP(v); setSaved(null); if (v === 0) setTestDrop(false); }} aria-pressed={p === v} className={chip(p === v)}>{v}</button>)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="max-w-[360px] w-full mx-auto">
                        <Field net={net} data={data} dropout={dropView} version={trainer.steps} />
                        <p className="text-[11px] text-slate-500 mt-1.5">step {trainer.steps.toLocaleString('en-US')} · {dropView ? 'dropout ON at test (wrong)' : 'test mode: nothing dropped'}</p>
                    </div>
                    <div className="space-y-3 min-w-0">
                        <TrainingCurve logY series={[
                            { name: 'train', color: '#38bdf8', points: trainer.history.map(h => ({ x: h.step, y: h.train })) },
                            { name: 'val', color: '#fb923c', points: trainer.history.map(h => ({ x: h.step, y: h.val })) },
                        ]} height={150} ariaLabel="Training and validation loss against step, log scale" />
                        <div className="grid grid-cols-2 gap-2">
                            <Stat label="training loss" value={f3(tr.loss)} />
                            <Stat label="validation loss" value={f3(va.loss)} />
                            <Stat label="training points right" value={`${tr.right} / ${N_TRAIN}`} />
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
                    <button onClick={() => setSeed(randomSeed())} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm"><Shuffle className="h-4 w-4" />New data</button>
                    {dropView && <button onClick={() => setDraw(d => d + 1)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm">Redraw masks</button>}
                </div>
                <div className="text-slate-200 text-sm overflow-x-auto overflow-y-hidden">
                    <Tex block>{tex(String.raw`L = L_{\text{data}} + \tfrac{\lambda}{2}\textstyle\sum w^2 = ${f3(tr.loss)} + ${numD(lambda / 2, 4)} \times ${f2(ss)} = ${f3(tr.loss + (lambda / 2) * ss)}${p > 0 ? String.raw`, \qquad \tilde h = \frac{m\,h}{1 - ${p}} = ${numD(1 / (1 - p), 2)}\,m\,h` : ''}`)}</Tex>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => breakIt('test')} className="text-xs px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-200 hover:bg-amber-500/10">Dropout on at test</button>
                    <button onClick={() => breakIt('lambda')} className="text-xs px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-200 hover:bg-amber-500/10">λ = {BREAK_LAMBDA}</button>
                    <button onClick={repair} disabled={!saved && !testDrop} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40"><Wrench className="h-3.5 w-3.5" />Repair</button>
                </div>
                {message && <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 leading-relaxed">{message}</p>}
                <p className="text-[11px] text-slate-500 leading-relaxed">
                    Same data and the same starting weights for every setting; changing λ or p restarts the run. Gradient descent with η = 1 on all 30 points; losses are measured with nothing dropped unless dropout is left on at test.
                </p>
            </div>
        </div>
    );
}

/* ── the page ──────────────────────────────────────────── */

const NO_STEPS = [];

export default function DropoutAndWeightDecayPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const [built, setBuilt] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    // Three networks train for the tour, a few hundred milliseconds each, so they
    // run after the first paint with a frame between them.
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
    const S = REG_STUDY;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/neural-networks" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Neural Networks
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Dropout and Weight Decay</h1>
                    <p className="text-orange-100 max-w-3xl">
                        Train a network with far more parameters than data and it memorises the noise. Two cures, trained live: shrink every weight a little on every step, or switch off a random half of the units on every step.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Overfitting and Underfitting', '/machine-learning/overfitting-and-underfitting'], ['Optimizers', '/neural-networks/optimizers']].map(([name, href]) => (
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

                    <InCode title="Dropout and weight decay in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The two rules</h2>
                        <div className="space-y-3 text-slate-200 text-xs">
                            <div>
                                <p className="text-slate-400 mb-1">Weight decay, every step</p>
                                <div className="overflow-x-auto overflow-y-hidden py-0.5"><Tex>{String.raw`w \leftarrow (1 - \eta\lambda)\,w - \eta\,\partial L_{\text{data}}/\partial w`}</Tex></div>
                            </div>
                            <div>
                                <p className="text-slate-400 mb-1">Dropout, training only</p>
                                <div className="overflow-x-auto overflow-y-hidden py-0.5"><Tex>{String.raw`\tilde h = m \odot h / (1 - p), \quad m_k \sim \text{Bernoulli}(1 - p)`}</Tex></div>
                            </div>
                        </div>
                        <table className="w-full text-xs mt-4">
                            <tbody className="text-slate-300">
                                <tr className="border-t border-slate-800"><td className="py-1 pr-2 text-slate-500">here</td><td className={mode === 'guided' && step?.act === 2 ? 'text-orange-200' : ''}>λ = 0.01</td><td className={mode === 'guided' && step?.act === 3 ? 'text-orange-200' : ''}>p = 0.5</td></tr>
                                <tr className="border-t border-slate-800"><td className="py-1 pr-2 text-slate-500">in PyTorch</td><td>weight_decay=λ</td><td>nn.Dropout(p)</td></tr>
                                <tr className="border-t border-slate-800"><td className="py-1 pr-2 text-slate-500">at test</td><td>nothing to do</td><td className={mode === 'guided' && step?.act === 4 ? 'text-orange-200' : ''}>model.eval()</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;Regularisation helps because the network fits its training data better.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed mb-3">
                            It fits it worse, on purpose. Medians over {S.n} seeds of this page&apos;s experiment, after {STEPS.toLocaleString('en-US')} steps:
                        </p>
                        <table className="w-full text-xs">
                            <thead><tr className="text-slate-500"><th className="text-left font-medium pb-1"></th><th className="text-left font-medium pb-1">train loss</th><th className="text-left font-medium pb-1">val loss</th><th className="text-left font-medium pb-1">val acc</th></tr></thead>
                            <tbody className="font-mono text-slate-300">
                                {[['plain', S.plain], ['λ = 0.01', S.wd], ['p = 0.5', S.drop]].map(([name, r]) => (
                                    <tr key={name} className="border-t border-slate-800"><td className="py-1 font-sans text-slate-400">{name}</td><td>{f3(r.train)}</td><td>{f3(r.val)}</td><td>{pct(r.valAcc)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">Lower validation loss than the plain run in {S.wdWins} of {S.n} seeds with weight decay and {S.dropWins} of {S.n} with dropout.</p>
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
