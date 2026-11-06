"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Layers, Layers3, Merge, ArrowDownToLine, GitMerge, Route, CheckCircle, BarChart3,
    XCircle, Wrench, Unplug, Play, Pause, RotateCcw,
} from 'lucide-react';
import { makeDataset } from '@/lib/ml/datasets';
import { rankedChoices, slotOf } from '@/lib/ml/predictChoices';
import { useTrainer } from '@/lib/ml/useTrainer';
import { createRng } from '@/lib/random';
import DecisionField from '@/components/ml/DecisionField';
import LossChart from '@/components/ml/LossChart';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, LoadingCard, FormulaPanel, Card,
} from '@/components/ml/TourKit';

/* ── the task and the network ──────────────────────────────
   Two interleaved spirals, 200 points. The network turns a point's two
   coordinates into 8 numbers h₀ = tanh(W₀x + b₀), passes them through a stack
   of blocks of 8 tanh units, and reads one score z off the top; p = σ(z) is
   the chance the point is orange.

   Block ℓ (1-based) maps hₗ₋₁ to hₗ:
     plain        hₗ = tanh(Wₗhₗ₋₁ + bₗ)
     with a skip  hₗ = hₗ₋₁ + tanh(Wₗhₗ₋₁ + bₗ)
   In code the skip is a number: 0 is plain, 1 is a residual block, and the
   break-it uses 0.5. Every network here trains in your browser: 800 Adam
   steps (learning rate 0.01) on batches of 32 points, the same seed for the
   batches whatever the architecture. */

const WIDTH = 8;
const TRAIN = { steps: 800, batch: 32, lr: 0.01 };
const DATA = makeDataset('spiral', { n: 200, noise: 0.1, seed: 7 });
const X = DATA.X, Y = DATA.y;
const POINTS = X.map(([x, y], i) => ({ x, y, label: Y[i] }));
const TOUR_SEED = 1;
const LN2 = Math.log(2);

function createNet({ depth, skip, seed }) {
    const rng = createRng(seed);
    const normals = (len, sd) => Float64Array.from({ length: len }, () => rng.normal(0, sd));
    return {
        depth, skip,
        W0: normals(WIDTH * 2, Math.SQRT1_2), b0: new Float64Array(WIDTH),
        Ws: normals(depth * WIDTH * WIDTH, Math.sqrt(1 / WIDTH)), bs: new Float64Array(depth * WIDTH),
        Wo: normals(WIDTH, Math.sqrt(1 / WIDTH)), bo: new Float64Array(1),
    };
}
const cloneNet = (net) => ({
    depth: net.depth, skip: net.skip,
    W0: Float64Array.from(net.W0), b0: Float64Array.from(net.b0), Ws: Float64Array.from(net.Ws),
    bs: Float64Array.from(net.bs), Wo: Float64Array.from(net.Wo), bo: Float64Array.from(net.bo),
});
const zeroGradsOf = (net) => ({
    W0: new Float64Array(net.W0.length), b0: new Float64Array(WIDTH), Ws: new Float64Array(net.Ws.length),
    bs: new Float64Array(net.bs.length), Wo: new Float64Array(WIDTH), bo: new Float64Array(1),
});
const paramCount = (net) => net.W0.length + net.b0.length + net.Ws.length + net.bs.length + net.Wo.length + net.bo.length;

/** One point forward. hs receives h₀…h_D ((D+1)·8 numbers), fs the branch outputs (D·8). Returns z. */
function forwardInto(net, x, hs, fs) {
    const { depth, skip, W0, b0, Ws, bs, Wo, bo } = net;
    for (let o = 0; o < WIDTH; o++) hs[o] = Math.tanh(b0[o] + W0[o * 2] * x[0] + W0[o * 2 + 1] * x[1]);
    for (let l = 0; l < depth; l++) {
        const wo = l * WIDTH * WIDTH, hi = l * WIDTH, ho = hi + WIDTH;
        for (let o = 0; o < WIDTH; o++) {
            let a = bs[hi + o];
            for (let i = 0; i < WIDTH; i++) a += Ws[wo + o * WIDTH + i] * hs[hi + i];
            const f = Math.tanh(a);
            fs[hi + o] = f;
            hs[ho + o] = skip * hs[hi + o] + f;
        }
    }
    let z = bo[0];
    for (let i = 0; i < WIDTH; i++) z += Wo[i] * hs[depth * WIDTH + i];
    return z;
}
const makeScratch = (D) => ({
    hs: new Float64Array((D + 1) * WIDTH), fs: new Float64Array(Math.max(1, D) * WIDTH),
    dh: new Float64Array(WIDTH), dprev: new Float64Array(WIDTH), da: new Float64Array(WIDTH),
});
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const logLoss = (z, y) => Math.max(z, 0) - z * y + Math.log1p(Math.exp(-Math.abs(z)));

/**
 * Mean logistic loss over the points `idx`, adding its gradient to g. Also
 * the size of the gradient at every layer: hNorm[l] is the mean over the
 * points of ‖∂ℓ/∂hₗ‖, one point's own loss ℓ.
 */
function lossAndGrads(net, idx, g, scratch) {
    const D = net.depth, N = idx.length, { skip, Ws, Wo } = net;
    const { hs, fs, dh, dprev, da } = scratch ?? makeScratch(D);
    const hNorm = new Float64Array(D + 1);
    let loss = 0;
    for (const n of idx) {
        const x = X[n], z = forwardInto(net, x, hs, fs);
        loss += logLoss(z, Y[n]);
        const dz = (sigmoid(z) - Y[n]) / N;
        g.bo[0] += dz;
        for (let i = 0; i < WIDTH; i++) { g.Wo[i] += dz * hs[D * WIDTH + i]; dh[i] = dz * Wo[i]; }
        for (let l = D - 1; l >= 0; l--) {
            let nn = 0;
            for (let i = 0; i < WIDTH; i++) nn += dh[i] * dh[i];
            hNorm[l + 1] += Math.sqrt(nn);
            const wo = l * WIDTH * WIDTH, hi = l * WIDTH;
            for (let o = 0; o < WIDTH; o++) { const f = fs[hi + o]; da[o] = dh[o] * (1 - f * f); }
            // the skip hands the gradient straight down; the branch adds Wᵀ(s ⊙ dh)
            for (let i = 0; i < WIDTH; i++) dprev[i] = skip * dh[i];
            for (let o = 0; o < WIDTH; o++) {
                const d = da[o];
                g.bs[hi + o] += d;
                for (let i = 0; i < WIDTH; i++) { g.Ws[wo + o * WIDTH + i] += d * hs[hi + i]; dprev[i] += d * Ws[wo + o * WIDTH + i]; }
            }
            for (let i = 0; i < WIDTH; i++) dh[i] = dprev[i];
        }
        let nn = 0;
        for (let i = 0; i < WIDTH; i++) nn += dh[i] * dh[i];
        hNorm[0] += Math.sqrt(nn);
        for (let o = 0; o < WIDTH; o++) {
            const d = dh[o] * (1 - hs[o] * hs[o]);
            g.b0[o] += d; g.W0[o * 2] += d * x[0]; g.W0[o * 2 + 1] += d * x[1];
        }
    }
    // dz carried 1/N, so the sums are already means
    return { loss: loss / N, hNorm: Array.from(hNorm) };
}

function createAdam(net, lr) {
    const ps = [net.W0, net.b0, net.Ws, net.bs, net.Wo, net.bo];
    const m = ps.map(p => new Float64Array(p.length)), v = ps.map(p => new Float64Array(p.length));
    let t = 0;
    return {
        step(g) {
            t++;
            const gs = [g.W0, g.b0, g.Ws, g.bs, g.Wo, g.bo];
            const c1 = 1 - 0.9 ** t, c2 = 1 - 0.999 ** t;
            ps.forEach((p, j) => {
                const gr = gs[j], mj = m[j], vj = v[j];
                for (let i = 0; i < p.length; i++) {
                    mj[i] = 0.9 * mj[i] + 0.1 * gr[i];
                    vj[i] = 0.999 * vj[i] + 0.001 * gr[i] * gr[i];
                    p[i] -= lr * (mj[i] / c1) / (Math.sqrt(vj[i] / c2) + 1e-8);
                }
            });
        },
    };
}

function initRun({ depth, skip, seed }) {
    const net = createNet({ depth, skip, seed });
    return { net, opt: createAdam(net, TRAIN.lr), rng: createRng(seed + 500), scratch: makeScratch(depth) };
}
function trainStep(run) {
    const idx = Array.from({ length: TRAIN.batch }, () => run.rng.int(0, X.length - 1));
    const g = zeroGradsOf(run.net);
    const r = lossAndGrads(run.net, idx, g, run.scratch);
    run.opt.step(g);
    return r;
}
const ALL = X.map((_, i) => i);
const fullLoss = (net) => lossAndGrads(net, ALL, zeroGradsOf(net));
const logitOf = (net, x) => forwardInto(net, x, new Float64Array((net.depth + 1) * WIDTH), new Float64Array(Math.max(1, net.depth) * WIDTH));

/** How far apart the 200 points are at each layer: the standard deviation across points, averaged over the 8 units. */
function spreadByLayer(net) {
    const D = net.depth, hs = new Float64Array((D + 1) * WIDTH), fs = new Float64Array(Math.max(1, D) * WIDTH);
    const all = X.map(x => { forwardInto(net, x, hs, fs); return Float64Array.from(hs); });
    return Array.from({ length: D + 1 }, (_, l) => {
        let tot = 0;
        for (let u = 0; u < WIDTH; u++) {
            const k = l * WIDTH + u;
            let m = 0;
            for (const h of all) m += h[k];
            m /= all.length;
            let v = 0;
            for (const h of all) v += (h[k] - m) ** 2;
            tot += Math.sqrt(v / all.length);
        }
        return tot / WIDTH;
    });
}

/** One point's backward pass, kept unit by unit: grads[l] = ∂ℓ/∂hₗ, shares[l] = what block l+1 sends back along its branch. */
function pointBackward(net, n) {
    const D = net.depth, hs = new Float64Array((D + 1) * WIDTH), fs = new Float64Array(Math.max(1, D) * WIDTH);
    const z = forwardInto(net, X[n], hs, fs);
    const p = sigmoid(z), dz = p - Y[n];
    let dh = Array.from(net.Wo, w => dz * w);
    const grads = new Array(D + 1), shares = new Array(D);
    grads[D] = dh;
    for (let l = D - 1; l >= 0; l--) {
        const share = new Array(WIDTH).fill(0);
        for (let o = 0; o < WIDTH; o++) {
            const d = dh[o] * (1 - fs[l * WIDTH + o] ** 2);
            for (let i = 0; i < WIDTH; i++) share[i] += d * net.Ws[l * WIDTH * WIDTH + o * WIDTH + i];
        }
        shares[l] = share;
        dh = dh.map((v, i) => net.skip * v + share[i]);
        grads[l] = dh;
    }
    const norm = (v) => Math.sqrt(v.reduce((a, x) => a + x * x, 0));
    return { z, p, dz, grads, shares, norms: grads.map(norm) };
}

/* ── the networks the tour trains when the page opens ─────── */
const TOUR_RUNS = [
    { key: 'p4', depth: 4, skip: 0, snaps: [] },
    { key: 'p20', depth: 20, skip: 0, snaps: [0, 100] },
    { key: 's20', depth: 20, skip: 1, snaps: [0] },
];

/** A resumable training job, so the page can train in slices and stay responsive. */
function createTourJob() {
    const runs = TOUR_RUNS.map(r => ({ ...r, run: initRun({ depth: r.depth, skip: r.skip, seed: TOUR_SEED }), done: 0, history: [], saved: {} }));
    const total = runs.length * TRAIN.steps;
    let i = 0;
    return {
        progress: () => runs.reduce((a, r) => a + r.done, 0) / total,
        advance(budgetMs) {
            const t0 = Date.now();
            while (i < runs.length) {
                const r = runs[i];
                if (r.snaps.includes(r.done) && !r.saved[r.done]) r.saved[r.done] = cloneNet(r.run.net);
                if (r.done >= TRAIN.steps) { i++; continue; }
                const { loss } = trainStep(r.run);
                r.done++;
                if (r.done % 4 === 0) r.history.push({ step: r.done, loss });
                if (Date.now() - t0 >= budgetMs) return false;
            }
            return true;
        },
        result: () => analyse(Object.fromEntries(runs.map(r => [r.key, r]))),
    };
}

function analyse(R) {
    const nets = {
        p4: R.p4.run.net, p20: R.p20.run.net, s20: R.s20.run.net,
        p0: R.p20.saved[0], p100: R.p20.saved[100], s0: R.s20.saved[0],
    };
    const end = { p4: fullLoss(nets.p4), p20: fullLoss(nets.p20), s20: fullLoss(nets.s20) };
    const zs = X.map(x => logitOf(nets.p20, x));
    const zMean = zs.reduce((a, b) => a + b, 0) / zs.length;
    return {
        nets,
        loss: { p4: end.p4.loss, p20: end.p20.loss, s20: end.s20.loss },
        history: { p4: R.p4.history, p20: R.p20.history, s20: R.s20.history },
        zSd: Math.sqrt(zs.reduce((a, z) => a + (z - zMean) ** 2, 0) / zs.length),
        pMean: zs.reduce((a, z) => a + sigmoid(z), 0) / zs.length,
        spread: { p0: spreadByLayer(nets.p0), p100: spreadByLayer(nets.p100), s0: spreadByLayer(nets.s0) },
        grad: { p0: fullLoss(nets.p0).hNorm, p100: fullLoss(nets.p100).hNorm, p20: end.p20.hNorm, s20: end.s20.hNorm },
    };
}

/* Measured offline with the functions above: final loss on all 200 points
   after 800 steps, seeds 1, 2 and 3. */
const SWEEP = [
    { depth: 1, plain: [0.2763, 0.0971, 0.1731], skip: [0.1179, 0.1189, 0.1057] },
    { depth: 2, plain: [0.0519, 0.1273, 0.0796], skip: [0.0405, 0.0417, 0.0982] },
    { depth: 4, plain: [0.0011, 0.0549, 0.0057], skip: [0.0012, 0.0014, 0.0003] },
    { depth: 8, plain: [0.0012, 0.1539, 0.3262], skip: [0.0001, 0.0002, 0.0002] },
    { depth: 12, plain: [0.6866, 0.6972, 0.6863], skip: [0.0001, 0.0003, 0.0001] },
    { depth: 20, plain: [0.6931, 0.6880, 0.6932], skip: [0.0001, 0.0007, 0.0001] },
    { depth: 30, plain: [0.6932, 0.6690, 0.6686], skip: [0.0000, 0.0002, 0.0003] },
];
/* The same, at depth 20, with every skip weakened to hₗ = 0.5·hₗ₋₁ + tanh(…). */
const HALF_SKIP = [0.6507, 0.6943, 0.5918];

const PRESETS = [
    { label: 'Orange point A', index: 45 },
    { label: 'Blue point B', index: 2 },
    { label: 'Orange point C', index: 33 },
    { label: 'Blue point D', index: 10 },
];

const ACTS = [
    { id: 1, label: 'Four Layers', icon: Layers },
    { id: 2, label: 'Twenty Layers', icon: Layers3 },
    { id: 3, label: 'The Points Merge', icon: Merge },
    { id: 4, label: 'No Gradient Returns', icon: ArrowDownToLine },
    { id: 5, label: 'Add the Skip', icon: GitMerge },
    { id: 6, label: 'The Gradient Highway', icon: Route },
    { id: 7, label: 'Twenty Layers, Trained', icon: CheckCircle },
    { id: 8, label: 'Deeper and Deeper', icon: BarChart3 },
];

const num = (v, d = 2) => {
    const r = Math.round(v * 10 ** d) / 10 ** d;
    return `${r < 0 ? '−' : ''}${Math.abs(r).toFixed(d)}`;
};
const n3 = (v) => num(v, 3);
const fLoss = (v) => num(v, 4);
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** A small ratio in plain Unicode: 0.25, or 1.7 × 10⁻⁵. */
const ratioText = (v) => {
    if (v >= 0.01) return v >= 10 ? String(Math.round(v)) : num(v, 2);
    const e = Math.floor(Math.log10(v));
    let m = v / 10 ** e;
    if (m >= 9.95) return `1.0 × 10${String(e + 1).split('').map(c => SUP[c]).join('')}`;
    m = Math.round(m * 10) / 10;
    return `${m.toFixed(1)} × 10${String(e).split('').map(c => SUP[c]).join('')}`;
};
/** Two significant figures, with thousands separators: 14,600. */
const sig2 = (v) => {
    if (v < 100) return String(Math.round(v));
    const p = 10 ** (Math.floor(Math.log10(v)) - 1);
    return (Math.round(v / p) * p).toLocaleString('en-US');
};
const SUB = (n) => String(n).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[c]).join('');
const pointText = (n) => `(${num(X[n][0])}, ${num(X[n][1])})`;
const colourOf = (n) => (Y[n] ? 'orange' : 'blue');

/** The first layer from which the points have merged: spread below 0.0005 at it and every layer above. */
function mergeLayer(spread) {
    let at = null;
    for (let l = spread.length - 1; l >= 0; l--) { if (spread[l] < 0.0005) at = l; else break; }
    return at;
}

/* ── the walk: one point's gradient down the top four blocks ─ */
const WALK_BLOCKS = 4;
const SHARE_MIN = 0.02;
const PROMPT_SALT = 361;
const PROMPT_STEP = 0.01;
const thousandths = (v) => Math.round(v * 1000);
/** Units worth asking about at block ℓ: a real branch share, and rounding that adds up on screen. */
const askable = (arr, share) => share.map((b, i) => i).filter(i =>
    Math.abs(share[i]) >= SHARE_MIN && thousandths(arr[i]) + thousandths(share[i]) === thousandths(arr[i] + share[i]));
const pickOf = (len, ...parts) => (slotOf(...parts, 1) * 4 + slotOf(...parts, 2)) % len;

function walkOf(info, presetIndex) {
    const n = PRESETS[presetIndex].index;
    const skip = pointBackward(info.nets.s0, n);
    const plain = pointBackward(info.nets.p0, n);
    const D = info.nets.s0.depth;
    const stops = Array.from({ length: WALK_BLOCKS + 1 }, (_, j) => {
        const l = D - j;
        const arriving = skip.grads[l];
        const share = j < WALK_BLOCKS ? skip.shares[l - 1] : null;
        let k = null;
        if (share) {
            const c = askable(arriving, share);
            if (c.length) k = c[pickOf(c.length, presetIndex, l, PROMPT_SALT)];
        }
        return { l, arriving, share, k };
    });
    return { n, skip, plain, stops };
}

function generateSteps(info, presetIndex) {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, presetIndex, ...data, explanation });
    const { loss, spread, grad } = info;
    const D = info.nets.p20.depth;
    const r0 = grad.p0[0] / grad.p0[D], r100 = grad.p100[0] / grad.p100[D];
    const merged = mergeLayer(spread.p100);
    const walk = walkOf(info, presetIndex);
    const { n } = walk;

    s(1, 'Four Layers', { kind: 'task' },
        `The task: 200 points on two interleaved spirals, blue and orange. The network turns a point's two coordinates into 8 numbers, h₀, and passes them up a stack of blocks. Each block is 8 tanh units — hₗ = tanh(Wₗhₗ₋₁ + bₗ) — and a last layer reads one score z off the top, with p = σ(z) the chance that the point is orange.`);
    s(1, 'Four Layers', { kind: 'trained4' },
        `Four blocks, trained in your browser when the page opened: 800 Adam steps on batches of 32 points. The training loss falls to ${fLoss(loss.p4)} and the boundary curls with the spiral. For scale, answering 50% for every point scores ln 2 = 0.693.`);

    s(2, 'Twenty Layers', { kind: 'trained20' },
        `Now 20 blocks, trained the same way on the same batches. If extra layers could only help, this would do at least as well. Its loss ends at ${fLoss(loss.p20)}: ln 2, a coin flip. It gives every point p ≈ ${num(info.pMean)}, and its scores vary across the 200 points by a standard deviation of ${n3(info.zSd)}. This is the training data, so the deeper network is not overfitting — it cannot even fit what it is shown.`);

    s(3, 'The Points Merge', { kind: 'spread', at: 0 },
        `Why? Follow the 200 points up the stack. The chart shows how far apart they are at each layer: the standard deviation across points, averaged over the 8 units. Before training, the 20 blocks pass the points up but squeeze them on the way — ${num(spread.p0[1])} at h₁, ${num(spread.p0[D])} at h${SUB(D)}. A tanh layer has no way to copy its input: tanh(a) is closer to 0 than a for every a ≠ 0.`);
    s(3, 'The Points Merge', { kind: 'spread', at: 100 },
        merged != null
            ? `After 100 training steps the deep layers have erased the differences: from h${SUB(merged)} up, the spread is below 0.0005, so every point produces the same 8 numbers there. Whatever came in at the bottom, the output is the same.`
            : `After 100 training steps the spread at the top is ${n3(spread.p100[D])} (it was ${n3(spread.p0[D])}), and the deep layers barely respond to which point came in.`);

    s(4, 'No Gradient Returns', { kind: 'grad', at: 0 },
        `Now go the other way. Backpropagation sends ∂ℓ/∂h down the stack; the chart shows its size at each layer, per point, on a log scale. Before training, the bottom layer h₀ receives ${ratioText(r0)} times what the top layer receives: weaker, but alive.`);
    s(4, 'No Gradient Returns', { kind: 'grad', at: 100 },
        `After 100 steps h₀ receives ${ratioText(r100)} times what the top receives — about ${sig2(r0 / r100)} times less than at the start. It is the same failure seen from the other end: once the upper layers give every point the same numbers, nudging anything below them changes nothing, so the gradient below them is close to zero.${loss.p20 > 0.6 ? ` In the remaining ${TRAIN.steps - 100} steps the loss never recovers.` : ''}`);

    s(5, 'Add the Skip', { kind: 'skip' },
        `The fix (He et al., 2015): let each block add to its input instead of replacing it — hₗ = hₗ₋₁ + tanh(Wₗhₗ₋₁ + bₗ). Doing nothing is now easy: W = 0 and b = 0 make the block exactly the identity. And a block can no longer erase differences — if it gives every point the same output, the gap between two points passes up unchanged. With the very same starting weights, the spread grows from ${num(spread.s0[1])} at h₁ to ${num(spread.s0[D])} at h${SUB(D)} instead of shrinking.`);

    const lead = `Follow one point's gradient down the top of the stack, before any training. The ${colourOf(n)} point at ${pointText(n)} gets p = ${num(walk.skip.p)}, so ∂ℓ/∂z = p − y = ${num(walk.skip.dz)}, and the gradient at h${SUB(D)} is that times the output weights.`;
    walk.stops.forEach((st, j) => {
        const blk = st.l;
        const prev = j > 0 ? walk.stops[j - 1] : null;
        const head = j === 0
            ? lead
            : `The skip sent ∂ℓ/∂h${SUB(blk + 1)} straight down and block ${blk + 1}'s branch added its share${prev.k != null ? ` — unit ${prev.k + 1}: ${n3(prev.arriving[prev.k])} ${prev.share[prev.k] < 0 ? '−' : '+'} ${n3(Math.abs(prev.share[prev.k]))} = ${n3(st.arriving[prev.k])}` : ''}. A plain block would have passed down only the share.`;
        const tail = st.share
            ? ` Block ${blk} sends part of it back along its branch: W${SUB(blk)}ᵀ(s ⊙ ∂ℓ/∂h${SUB(blk)}), where s = 1 − f² is the slope of each tanh.`
            : '';
        s(6, 'The Gradient Highway', { kind: 'walk', j, l: blk, arriving: st.arriving, share: st.share, k: st.k, n }, head + tail);
    });
    const rSkip = walk.skip.norms[0] / walk.skip.norms[D], rPlain = walk.plain.norms[0] / walk.plain.norms[D];
    s(6, 'The Gradient Highway', { kind: 'walkSum', n, skipNorms: walk.skip.norms, plainNorms: walk.plain.norms },
        `All the way down: for this point, ∂ℓ/∂h₀ is ${ratioText(rSkip)} times the size of ∂ℓ/∂h${SUB(D)}, because every block adds its share to what the skip carries. The same weights without skips give ${ratioText(rPlain)} times. The skip's own derivative is exactly 1, so the gradient from the loss reaches every layer whatever the blocks do — it cannot be multiplied away.`);

    s(7, 'Twenty Layers, Trained', { kind: 'trainedSkip' },
        `Train the 20-block network with skips — same seed, same batches, same 800 steps. The loss falls to ${fLoss(loss.s20)}, ${loss.s20 < loss.p4 ? 'below' : 'close to'} the four-block network's ${fLoss(loss.p4)}, against ${fLoss(loss.p20)} without skips. After training, h₀ still receives ${ratioText(grad.s20[0] / grad.s20[D])} times the gradient at the top.`);

    const plainFits = SWEEP.map(r => r.plain.filter(v => v < 0.01).length);
    const skipWorst = Math.max(...SWEEP.filter(r => r.depth >= 4).flatMap(r => r.skip));
    const stuckFrom = SWEEP.find(r => r.plain.every(v => v > 0.5))?.depth;
    const at8 = SWEEP.find(r => r.depth === 8);
    s(8, 'Deeper and Deeper', { kind: 'sweep' },
        `Measured with this page's own code, three seeds per depth, 800 steps each. Without skips the network does best at 4 blocks, fits only ${['none', 'one', 'two', 'all three'][plainFits[SWEEP.indexOf(at8)]]} of three seeds at 8, and from ${stuckFrom} blocks up stays near ln 2. With skips every depth from 4 to 30 fits the spiral (worst loss ${fLoss(skipWorst)}). One or two blocks are too few either way: this spiral needs depth.`);
    return steps;
}

const predictFor = (step, next) => {
    if (!next || step.kind !== 'walk' || next.kind !== 'walk' || step.k == null) return null;
    const k = step.k, a = step.arriving[k], b = step.share[k];
    const want = thousandths(a + b) / 1000;
    // Evenly spaced options only: offering the two numbers on screen as wrong
    // answers would let "never pick a number you can see" score 60%.
    const { options, correct } = rankedChoices(want, [], {
        slot: slotOf(step.presetIndex, step.l, PROMPT_SALT), step: PROMPT_STEP, fmt: n3,
    });
    return {
        question: `${n3(a)} arrives at unit ${k + 1} of h${SUB(step.l)}, and block ${step.l}'s branch sends ${n3(b)} back to unit ${k + 1}. What gradient reaches unit ${k + 1} of h${SUB(step.l - 1)}?`,
        options, correct,
        because: `The skip copies the gradient straight down and the branch adds its share: ${n3(a)} ${b < 0 ? '−' : '+'} ${n3(Math.abs(b))} = ${n3(want)}. A plain block would pass down only ${n3(b)}.`,
    };
};

function formulaFor(step) {
    switch (step.kind) {
        case 'task': return String.raw`h_l = \tanh(W_l h_{l-1} + b_l), \quad p = \sigma(z), \quad \ell = -[\,y \ln p + (1-y)\ln(1-p)\,]`;
        case 'trained4':
        case 'trained20': return String.raw`p = 0.5 \;\Rightarrow\; \ell = \ln 2 \approx 0.693`;
        case 'spread': return String.raw`\text{spread}(h_l) = \tfrac{1}{8}\textstyle\sum_u \operatorname{std}_{\text{points}}\, h_l[u]`;
        case 'grad': return String.raw`\frac{\partial \ell}{\partial h_{l-1}} = W_l^{\top}\Big(s_l \odot \frac{\partial \ell}{\partial h_l}\Big), \quad s_l = 1 - f_l^2`;
        case 'skip':
        case 'trainedSkip': return String.raw`h_l = h_{l-1} + \tanh(W_l h_{l-1} + b_l)`;
        case 'walk':
        case 'walkSum': return String.raw`\frac{\partial \ell}{\partial h_{l-1}} = \underbrace{\frac{\partial \ell}{\partial h_l}}_{\text{skip}} + \underbrace{W_l^{\top}\Big(s_l \odot \frac{\partial \ell}{\partial h_l}\Big)}_{\text{branch}}`;
        default: return null;
    }
}

const quizQuestions = [
    {
        question: 'A 20-block network without skips ends with training loss 0.693 on a two-class task. What does that tell you?',
        options: [
            'It has overfitted the training data',
            'It answers about 50% for every point, no better than a coin flip',
            'It is converging and needs more steps to finish',
            'It has memorised the points but not the spiral',
        ],
        correct: 1,
        explanation: 'ln 2 ≈ 0.693 is the loss of answering p = 0.5 everywhere. It is the training loss, so the network is not overfitting: it is not fitting at all.',
    },
    {
        question: 'With a skip, hₗ = hₗ₋₁ + f(hₗ₋₁). Which gradient reaches hₗ₋₁?',
        options: [
            '∂ℓ/∂hₗ alone',
            'The branch\'s share (∂f/∂hₗ₋₁)ᵀ ∂ℓ/∂hₗ alone',
            '∂ℓ/∂hₗ plus the branch\'s share (∂f/∂hₗ₋₁)ᵀ ∂ℓ/∂hₗ',
            '∂ℓ/∂hₗ times the branch\'s share',
        ],
        correct: 2,
        explanation: 'The derivative of hₗ₋₁ + f(hₗ₋₁) is I + ∂f/∂hₗ₋₁, so the gradient from above passes down unchanged and the branch adds its share. Without the skip only the share gets through.',
    },
    {
        question: 'What does it take for a residual block hₗ = hₗ₋₁ + tanh(Wₗhₗ₋₁ + bₗ) to leave its input unchanged?',
        options: [
            'Nothing: it always copies its input',
            'Weights chosen so that tanh(Wₗh + bₗ) = h',
            'Wₗ = 0 and bₗ = 0, so the branch outputs tanh(0) = 0',
            'A learning rate of zero',
        ],
        correct: 2,
        explanation: 'With W = 0 and b = 0 the branch outputs tanh(0) = 0 and h + 0 = h exactly. A plain tanh layer has no setting that copies its input, which is why deep plain stacks lose information on the way up.',
    },
];

const codeExample = `import torch
import torch.nn as nn

class Block(nn.Module):
    def __init__(self, d=8):
        super().__init__()
        self.lin = nn.Linear(d, d)

    def forward(self, h):
        return h + torch.tanh(self.lin(h))      # the skip: h comes through untouched

net = nn.Sequential(nn.Linear(2, 8), nn.Tanh(),
                    *[Block() for _ in range(20)],
                    nn.Linear(8, 1))
print(sum(p.numel() for p in net.parameters()))   # 1473

# Doing nothing is easy for a block: zero its weights.
b = Block()
nn.init.zeros_(b.lin.weight)
nn.init.zeros_(b.lin.bias)
h = torch.randn(5, 8)
print(torch.equal(b(h), h))                       # True
# A plain tanh layer cannot copy its input at all.
print(torch.equal(torch.tanh(h), h))              # False`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Step through the tour once more and try again.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-yellow-500';
                    if (quizState.answered) {
                        if (i === q.correct) tone = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) tone = 'border-red-500 bg-red-500/10 text-red-300';
                        else tone = 'border-slate-800 text-slate-500';
                    }
                    return (
                        <button key={i} onClick={() => answer(i)} disabled={quizState.answered}
                            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${tone}`}>{opt}</button>
                    );
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className={`flex items-center gap-1.5 text-sm font-medium mb-1 ${quizState.selected === q.correct ? 'text-green-400' : 'text-red-400'}`}>
                        {quizState.selected === q.correct ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {quizState.selected === q.correct ? 'Correct' : 'Not quite'}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{q.explanation}</p>
                    <button onClick={next} className="text-sm px-4 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'Finish' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── scenes ──────────────────────────────────────────────── */
const COLORS = { plain: '#94a3b8', plainLate: '#f87171', skip: '#facc15' };
const Caption = ({ children }) => <div className="text-xs text-slate-400 mb-1.5 flex flex-wrap items-center gap-1.5">{children}</div>;

/** A whole decision field from one forward pass per grid point. */
function useField(net) {
    return useCallback((grid) => {
        if (!net) return grid.map(() => 0.5);
        const hs = new Float64Array((net.depth + 1) * WIDTH), fs = new Float64Array(Math.max(1, net.depth) * WIDTH);
        return grid.map(p => sigmoid(forwardInto(net, p, hs, fs)));
    }, [net]);
}
function Field({ net, title, version = 0 }) {
    const predictBatch = useField(net);
    return (
        <div className="min-w-0">
            <Caption>{title}</Caption>
            <DecisionField predictBatch={predictBatch} points={POINTS} version={version} resolution={40} ariaLabel={title} />
        </div>
    );
}

/**
 * One value per layer h₀…h_D as lines, optionally on a log scale, so plain
 * and residual stacks can be compared layer by layer.
 */
function LayerChart({ series, logY = false, yLabel, height = 190, floor = 1e-7 }) {
    const W = 560, H = height, L = 46, R = 12, T = 12, B = 30;
    const D = Math.max(...series.map(s => s.values.length)) - 1;
    const vals = series.flatMap(s => s.values).filter(v => Number.isFinite(v));
    const tf = (v) => (logY ? Math.log10(Math.max(v, floor)) : v);
    let lo = Math.min(...vals.map(tf)), hi = Math.max(...vals.map(tf));
    if (logY) { lo = Math.floor(lo); hi = Math.ceil(hi); } else { lo = 0; hi = hi > 0 ? hi * 1.1 : 1; }
    if (hi - lo < 1e-9) hi = lo + 1;
    const x = (l) => Math.round((L + (l / Math.max(1, D)) * (W - L - R)) * 100) / 100;
    const y = (v) => Math.round((T + (1 - (tf(v) - lo) / (hi - lo)) * (H - T - B)) * 100) / 100;
    const ticks = logY
        ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((_, i, a) => a.length <= 6 || i % 2 === 0)
        : [0, hi / 2, hi].map(v => Number(v.toPrecision(2)));
    const tickLabel = (t) => (logY ? (t === 0 ? '1' : `10${String(t).split('').map(c => SUP[c]).join('')}`) : String(t));
    const xTicks = Array.from({ length: D + 1 }, (_, l) => l).filter(l => l === 0 || l === D || (D <= 10 ? true : l % 5 === 0));
    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={yLabel}>
                {ticks.map((t, ti) => {
                    const yy = logY ? Math.round((T + (1 - (t - lo) / (hi - lo)) * (H - T - B)) * 100) / 100 : y(t);
                    return (
                        <g key={ti}>
                            <line x1={L} x2={W - R} y1={yy} y2={yy} stroke="#1e293b" />
                            <text x={L - 6} y={yy + 3.5} textAnchor="end" fontSize="10" fill="#64748b">{tickLabel(t)}</text>
                        </g>
                    );
                })}
                {xTicks.map(l => <text key={l} x={x(l)} y={H - 10} textAnchor="middle" fontSize="10" fill="#64748b">h{SUB(l)}</text>)}
                {series.map(s => (
                    <g key={s.name}>
                        <polyline fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '5 4' : undefined}
                            points={s.values.map((v, l) => `${x(l)},${y(v)}`).join(' ')} />
                        {s.values.map((v, l) => <circle key={l} cx={x(l)} cy={y(v)} r="2.6" fill={s.color} />)}
                    </g>
                ))}
            </svg>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                {series.map(s => (
                    <span key={s.name} className="flex items-center gap-1.5">
                        <span className="inline-block w-4 h-0.5" style={{ background: s.color }} />{s.name}
                    </span>
                ))}
                <span className="text-slate-500">{yLabel}</span>
            </div>
        </div>
    );
}

/** The stack, block by block, with the skip drawn as an arc over each block. */
function StackDiagram({ depth, skip = false, active = null }) {
    const W = 560, H = skip ? 104 : 80, top = skip ? 44 : 20, bw = Math.min(30, (W - 150) / depth - 4), gap = (W - 150 - depth * bw) / Math.max(1, depth - 1);
    const bx = (i) => Math.round((92 + i * (bw + gap)) * 100) / 100;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${depth} blocks${skip ? ' with skips' : ''}`}>
            <rect x="6" y={top + 6} width="44" height="28" rx="6" fill="#1e293b" stroke="#475569" />
            <text x="28" y={top + 24} textAnchor="middle" fontSize="11" fill="#cbd5e1">x, y</text>
            <line x1="50" x2="86" y1={top + 20} y2={top + 20} stroke="#475569" strokeWidth="1.5" />
            <text x="68" y={top + 14} textAnchor="middle" fontSize="10" fill="#94a3b8">h₀</text>
            {Array.from({ length: depth }, (_, i) => {
                const on = active === i + 1;
                return (
                    <g key={i}>
                        <rect x={bx(i)} y={top} width={bw} height="40" rx="4" fill={on ? 'rgba(250,204,21,0.25)' : '#0f172a'} stroke={on ? '#facc15' : '#475569'} />
                        {depth <= 8 && <text x={bx(i) + bw / 2} y={top + 24} textAnchor="middle" fontSize="10" fill="#94a3b8">{i + 1}</text>}
                        {skip && <path d={`M ${bx(i) - Math.min(4, gap / 2)} ${top + 20} C ${bx(i)} ${top - 30}, ${bx(i) + bw} ${top - 30}, ${bx(i) + bw + Math.min(4, gap / 2)} ${top + 20}`}
                            fill="none" stroke={on ? '#facc15' : '#a16207'} strokeWidth={on ? 2 : 1.2} />}
                        {i < depth - 1 && <line x1={bx(i) + bw} x2={bx(i + 1)} y1={top + 20} y2={top + 20} stroke="#475569" />}
                    </g>
                );
            })}
            <line x1={bx(depth - 1) + bw} x2={W - 44} y1={top + 20} y2={top + 20} stroke="#475569" strokeWidth="1.5" />
            <circle cx={W - 28} cy={top + 20} r="15" fill="#1e293b" stroke="#475569" />
            <text x={W - 28} y={top + 24} textAnchor="middle" fontSize="12" fill="#cbd5e1">z</text>
        </svg>
    );
}

/** One stop of the backward walk: what arrives at hₗ, and what block ℓ's branch sends back. */
function WalkTable({ step }) {
    const rows = [[`∂ℓ/∂h${SUB(step.l)} arriving`, step.arriving, 'text-slate-100']];
    if (step.share) rows.push([`block ${step.l}'s branch sends back`, step.share, 'text-yellow-200']);
    return (
        <div className="overflow-x-auto">
            <table className="text-xs font-mono border-separate border-spacing-x-1 border-spacing-y-1">
                <thead>
                    <tr><th />{step.arriving.map((_, u) => <th key={u} className={`px-1 font-normal ${u === step.k ? 'text-yellow-300' : 'text-slate-500'}`}>unit {u + 1}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map(([label, vals, tone]) => (
                        <tr key={label}>
                            <td className="pr-2 text-slate-400 whitespace-nowrap font-sans">{label}</td>
                            {vals.map((v, u) => (
                                <td key={u} className={`px-1.5 py-1 rounded text-right ${tone} ${u === step.k ? 'bg-yellow-500/15 ring-1 ring-yellow-400/60' : 'bg-slate-800/60'}`}>{n3(v)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Final losses per depth: three seeds each, plain and with skips, on a log scale. */
function SweepChart() {
    const W = 560, H = 230, L = 46, R = 12, T = 12, B = 34, lo = -4, hi = 0;
    const y = (v) => Math.round((T + (1 - (Math.log10(Math.max(v, 1e-4)) - lo) / (hi - lo)) * (H - T - B)) * 100) / 100;
    const col = (W - L - R) / SWEEP.length;
    const cx = (i) => L + col * (i + 0.5);
    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Final training loss by depth, with and without skips">
                {[-4, -3, -2, -1, 0].map(t => (
                    <g key={t}>
                        <line x1={L} x2={W - R} y1={y(10 ** t)} y2={y(10 ** t)} stroke="#1e293b" />
                        <text x={L - 6} y={y(10 ** t) + 3.5} textAnchor="end" fontSize="10" fill="#64748b">{t === 0 ? '1' : `10${String(t).split('').map(c => SUP[c]).join('')}`}</text>
                    </g>
                ))}
                <line x1={L} x2={W - R} y1={y(LN2)} y2={y(LN2)} stroke="#f87171" strokeDasharray="5 4" />
                <text x={W - R - 2} y={y(LN2) - 4} textAnchor="end" fontSize="10" fill="#f87171">ln 2: a coin flip</text>
                {SWEEP.map((r, i) => (
                    <g key={r.depth}>
                        {r.plain.map((v, k) => <circle key={`p${k}`} cx={Math.round((cx(i) - 9 + (k - 1) * 4) * 100) / 100} cy={y(v)} r="4" fill={COLORS.plain} />)}
                        {r.skip.map((v, k) => <circle key={`s${k}`} cx={Math.round((cx(i) + 9 + (k - 1) * 4) * 100) / 100} cy={y(v)} r="4" fill={COLORS.skip} />)}
                        <text x={cx(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="#94a3b8">{r.depth}</text>
                    </g>
                ))}
                <text x={L + (W - L - R) / 2} y={H - 1} textAnchor="middle" fontSize="10" fill="#64748b">blocks</text>
            </svg>
            <div className="flex flex-wrap gap-x-4 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLORS.plain }} />plain, 3 seeds</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLORS.skip }} />with skips, 3 seeds</span>
                <span className="text-slate-500">final training loss, log scale (below 10⁻⁴ drawn at 10⁻⁴)</span>
            </div>
        </div>
    );
}

function VisualizationPanel({ step, info }) {
    if (!step) return null;
    const { nets, history, spread, grad } = info;
    const D = nets.p20.depth;
    const curve = (name, color, h) => ({ name, color, points: h.map(e => ({ x: e.step, y: e.loss })) });
    switch (step.kind) {
        case 'task':
            return (
                <div className="w-full grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 items-center">
                    <Field net={null} title="200 training points" />
                    <div className="space-y-3">
                        <Caption>Four blocks of 8 tanh units <ShapeTag shape={[200, 8]} /></Caption>
                        <StackDiagram depth={4} />
                        <p className="text-xs text-slate-400">{paramCount(nets.p4)} numbers to learn: 24 into h₀, 72 per block, 9 for the score.</p>
                    </div>
                </div>
            );
        case 'trained4':
            return (
                <div className="w-full grid sm:grid-cols-2 gap-4 items-start">
                    <Field net={nets.p4} title={`4 blocks · loss ${fLoss(info.loss.p4)}`} />
                    <div><Caption>Training loss (batches of 32)</Caption><LossChart series={[curve('4 blocks', COLORS.plain, history.p4)]} logY /></div>
                </div>
            );
        case 'trained20':
            return (
                <div className="w-full space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field net={nets.p4} title={`4 blocks · ${fLoss(info.loss.p4)}`} />
                        <Field net={nets.p20} title={`20 blocks · ${fLoss(info.loss.p20)}`} />
                    </div>
                    <LossChart series={[curve('4 blocks', COLORS.plain, history.p4), curve('20 blocks', COLORS.plainLate, history.p20)]} logY />
                </div>
            );
        case 'spread':
            return (
                <div className="w-full space-y-2">
                    <StackDiagram depth={D} />
                    <LayerChart yLabel="spread of the 200 points at each layer"
                        series={[
                            { name: 'plain, before training', color: COLORS.plain, values: spread.p0, dashed: step.at === 100 },
                            ...(step.at === 100 ? [{ name: 'plain, after 100 steps', color: COLORS.plainLate, values: spread.p100 }] : []),
                        ]} />
                </div>
            );
        case 'grad':
            return (
                <div className="w-full space-y-2">
                    <StackDiagram depth={D} />
                    <LayerChart logY yLabel="‖∂ℓ/∂h‖ per point, log scale"
                        series={[
                            { name: 'plain, before training', color: COLORS.plain, values: grad.p0, dashed: step.at === 100 },
                            ...(step.at === 100 ? [{ name: 'plain, after 100 steps', color: COLORS.plainLate, values: grad.p100 }] : []),
                        ]} />
                </div>
            );
        case 'skip':
            return (
                <div className="w-full space-y-2">
                    <StackDiagram depth={D} skip />
                    <LayerChart yLabel="spread of the 200 points at each layer, before training"
                        series={[
                            { name: 'plain', color: COLORS.plain, values: spread.p0 },
                            { name: 'with skips (same weights)', color: COLORS.skip, values: spread.s0 },
                        ]} />
                </div>
            );
        case 'walk':
            return (
                <div className="w-full space-y-3">
                    <StackDiagram depth={D} skip active={step.share ? step.l : null} />
                    <Caption>One point&apos;s gradient, unit by unit <ShapeTag shape={[1, 8]} /></Caption>
                    <WalkTable step={step} />
                </div>
            );
        case 'walkSum':
            return (
                <div className="w-full space-y-2">
                    <StackDiagram depth={D} skip />
                    <LayerChart logY yLabel={`‖∂ℓ/∂h‖ for the point at ${pointText(step.n)}, before training`}
                        series={[
                            { name: 'plain (same weights)', color: COLORS.plain, values: step.plainNorms },
                            { name: 'with skips', color: COLORS.skip, values: step.skipNorms },
                        ]} />
                </div>
            );
        case 'trainedSkip':
            return (
                <div className="w-full space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field net={nets.p20} title={`20 plain · ${fLoss(info.loss.p20)}`} />
                        <Field net={nets.s20} title={`20 with skips · ${fLoss(info.loss.s20)}`} />
                    </div>
                    <LossChart series={[curve('20 plain', COLORS.plainLate, history.p20), curve('20 with skips', COLORS.skip, history.s20)]} logY />
                    <LayerChart logY yLabel="‖∂ℓ/∂h‖ per point after training"
                        series={[
                            { name: '20 plain', color: COLORS.plainLate, values: grad.p20 },
                            { name: '20 with skips', color: COLORS.skip, values: grad.s20 },
                        ]} />
                </div>
            );
        case 'sweep': return <div className="w-full"><SweepChart /></div>;
        default: return null;
    }
}

/* ── explore: train both side by side ────────────────────── */
function Explore() {
    const [depth, setDepth] = useState(20);
    const [seed, setSeed] = useState(TOUR_SEED);
    const [weak, setWeak] = useState(false);
    const trainer = useTrainer({
        init: () => ({ plain: initRun({ depth, skip: 0, seed }), res: initRun({ depth, skip: weak ? 0.5 : 1, seed }), gPlain: null, gRes: null }),
        step: (st) => {
            const a = trainStep(st.plain), b = trainStep(st.res);
            st.gPlain = a.hNorm; st.gRes = b.hNorm;
            return { plain: a.loss, res: b.loss };
        },
        deps: [depth, seed, weak],
        maxSteps: TRAIN.steps,
        budgetMs: 8,
    });
    const st = trainer.state;
    const version = Math.floor(trainer.steps / 20);
    // full-data numbers are recomputed only when the fields repaint
    const view = useMemo(() => ({
        lossPlain: fullLoss(st.plain.net).loss, lossRes: fullLoss(st.res.net).loss,
        spreadPlain: spreadByLayer(st.plain.net), spreadRes: spreadByLayer(st.res.net),
    }), [st, version]); // eslint-disable-line react-hooks/exhaustive-deps
    const resName = weak ? 'skips at 0.5' : 'with skips';
    const last = trainer.history[trainer.history.length - 1];
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <ParamSlider label="Blocks" value={depth} onChange={setDepth} min={1} max={30} step={1} accent="yellow"
                    hint="Both networks start from the same weights and see the same batches." />
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={trainer.toggle} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">
                        {trainer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{trainer.running ? 'Pause' : trainer.steps ? 'Resume' : 'Train both'}
                    </button>
                    <button onClick={trainer.reset} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" />Reset</button>
                    <button onClick={() => setSeed(s => s + 1)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-yellow-500">New seed ({seed})</button>
                    <span className="text-xs text-slate-400 font-mono ml-auto">step {trainer.steps} / {TRAIN.steps}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field net={st.plain.net} version={version} title={`Plain · loss ${fLoss(view.lossPlain)}`} />
                    <Field net={st.res.net} version={version} title={`${weak ? 'Skips at 0.5' : 'With skips'} · loss ${fLoss(view.lossRes)}`} />
                </div>
                <LossChart logY series={[
                    { name: 'plain', color: COLORS.plain, points: trainer.history.map(h => ({ x: h.step, y: h.plain })) },
                    { name: resName, color: COLORS.skip, points: trainer.history.map(h => ({ x: h.step, y: h.res })) },
                ]} />
                {last && <p className="text-xs text-slate-500">Latest batch: plain {fLoss(last.plain)}, {resName} {fLoss(last.res)}. The fields and the losses in their titles use all 200 points.</p>}
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 grid md:grid-cols-2 gap-4">
                <div className="min-w-0">
                    <Caption>How far apart the points are</Caption>
                    <LayerChart height={170} yLabel="spread per layer" series={[
                        { name: 'plain', color: COLORS.plain, values: view.spreadPlain },
                        { name: resName, color: COLORS.skip, values: view.spreadRes },
                    ]} />
                </div>
                <div className="min-w-0">
                    <Caption>Gradient reaching each layer (latest batch)</Caption>
                    {st.gPlain ? (
                        <LayerChart height={170} logY yLabel="‖∂ℓ/∂h‖, log scale" series={[
                            { name: 'plain', color: COLORS.plain, values: st.gPlain },
                            { name: resName, color: COLORS.skip, values: st.gRes },
                        ]} />
                    ) : <p className="text-xs text-slate-500 py-10 text-center">Train to see the gradients.</p>}
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Unplug className="h-4 w-4 text-amber-400" />Break it: weaken the skips</h3>
                <p className="text-xs text-slate-400">Keep the skips but scale them: hₗ = 0.5·hₗ₋₁ + tanh(Wₗhₗ₋₁ + bₗ). The highway now halves the gradient at every block.</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setWeak(w => !w)} aria-pressed={weak}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${weak ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-amber-500'}`}>
                        <Unplug className="h-3.5 w-3.5" />{weak ? 'Skips at 0.5' : 'Weaken the skips'}
                    </button>
                    {weak && <button onClick={() => setWeak(false)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                {weak && (
                    <BreakNote>
                        Through {depth} block{depth === 1 ? '' : 's'} the highway alone now carries 0.5{String(depth).split('').map(c => SUP[c]).join('')} ≈ {ratioText(0.5 ** depth)} of the gradient, so the network has to rely on its branches again. Measured with three seeds at 20 blocks, the losses ended at {HALF_SKIP.map(fLoss).join(', ')} — most of the way back to ln 2 = 0.693 — where full skips reached {SWEEP.find(r => r.depth === 20).skip.map(fLoss).join(', ')}. The identity is what matters, not just having a second path.
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function ResidualConnectionsPage() {
    const [info, setInfo] = useState(null);
    const [progress, setProgress] = useState(0);
    const [mode, setMode] = useState('guided');
    const [presetIndex, setPresetIndex] = useState(0);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    // Train in slices after the first paint, so the skeleton shows and the page stays responsive.
    useEffect(() => {
        let alive = true, timer = 0;
        const job = createTourJob();
        const tick = () => {
            if (!alive) return;
            const done = job.advance(30);
            setProgress(job.progress());
            if (done) setInfo(job.result());
            else timer = setTimeout(tick, 0);
        };
        timer = setTimeout(tick, 30);
        return () => { alive = false; clearTimeout(timer); };
    }, []);
    const stepHistory = useMemo(() => (info ? generateSteps(info, presetIndex) : []), [info, presetIndex]);
    const play = useStepPlayback(stepHistory, 1800);
    const step = play.step;
    const predict = usePredict(stepHistory, play.current, predictFor, play.pause);
    const [exploreKey, setExploreKey] = useState(0);
    const toExplore = () => { setExploreKey(k => k + 1); setMode('explore'); play.pause(); };
    const tex = step ? formulaFor(step) : null;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/deep-learning-architectures" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Deep Learning Architectures
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Residual Connections</h1>
                    <p className="text-yellow-50 max-w-3xl">
                        Twenty layers should beat four, yet without skips they cannot even fit the training data. Watch the points merge and the gradient vanish in a deep plain network, then add hₗ = hₗ₋₁ + f(hₗ₋₁) and train it again.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/neural-networks/vanishing-and-exploding-gradients" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Vanishing and Exploding Gradients</Link>
                        <Link href="/neural-networks/backpropagation" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Backpropagation</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Train them yourself', MousePointer2]]} mode={mode}
                            setMode={(m) => (m === 'explore' ? toExplore() : setMode(m))} accent="yellow" />
                        <SourceChip kind="live">Trained in your browser · 8 units per layer · 1,473 numbers at 20 blocks</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={exploreKey} />
                    ) : !info ? (
                        <LoadingCard text={`Training three networks in your browser (2,400 steps)… ${Math.round(progress * 100)}%`} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Point for the gradient walk:</span>
                                {PRESETS.map((pr, k) => (
                                    <button key={pr.label} onClick={() => { setPresetIndex(k); play.pause(); }} aria-pressed={presetIndex === k}
                                        className={`text-xs px-2.5 py-1 rounded-lg border ${presetIndex === k ? 'border-yellow-400 bg-yellow-500/15 text-yellow-100' : 'border-slate-700 text-slate-400 hover:border-yellow-500'}`}>{pr.label}</button>
                                ))}
                            </div>
                            <TourPlayer acts={ACTS} steps={stepHistory} play={play} predict={predict} accent="yellow" minHeight="min-h-[380px]">
                                <VisualizationPanel step={step} info={info} />
                            </TourPlayer>
                            {predict.prompt && <PredictPrompt predict={predict} accent="yellow" />}
                            <ExplanationBox text={step?.explanation} predict={predict} accent="yellow" />
                            {tex && <FormulaPanel><div className="overflow-x-auto"><Tex block>{tex}</Tex></div></FormulaPanel>}
                        </>
                    )}

                    <InCode title="A residual block in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="What the skip changes" icon={GitMerge}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="font-mono text-slate-200">Forward</span>: a block adds a correction to h instead of replacing it, so it cannot erase the differences between inputs.</li>
                            <li><span className="font-mono text-slate-200">Backward</span>: the derivative of hₗ₋₁ + f(hₗ₋₁) is I + ∂f/∂h, so the gradient from above reaches every layer.</li>
                            <li><span className="font-mono text-slate-200">Cost</span>: one addition per unit. No new weights.</li>
                            <li>Every transformer block wraps both its attention and its feed-forward layer in one.</li>
                        </ul>
                    </Card>

                    <Misconception claim="Extra layers can only help: at worst they learn to pass their input through.">
                        {info ? (
                            <>
                                <p>A tanh layer cannot pass its input through — tanh(a) ≠ a — and a deep stack of them is hard to train at all. Here 4 plain blocks reach a training loss of {fLoss(info.loss.p4)} and 20 plain blocks {fLoss(info.loss.p20)}, a coin flip. That is the training data, so the deeper network is not overfitting.</p>
                                <p>He et al. found the same in 2015: on CIFAR-10 a 56-layer plain network had higher training error than a 20-layer one. Skips fixed it, and made 152 layers trainable.</p>
                            </>
                        ) : <p>Measuring once the networks have trained…</p>}
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
