"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, SlidersHorizontal, Shuffle,
    Columns3, Scale, Rows3, Users, Layers, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench, Replace,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import Tex from '@/components/math/Tex';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { diverging, inkOn } from '@/components/ml/colors';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── a batch you can read ──────────────────────────────────
   One layer's pre-activations for a batch: one row per example, one column
   per unit. Each unit has its own centre m and spread s, so the columns
   start out on different scales. Values are rounded to one decimal so every
   sum on the page can be checked by hand. Eight rows are drawn so Explore can
   grow the batch; the tour uses the first six, plus one spare example for the
   "batch mates" act. */
const B = 6;
const D = 4;
const MAX_B = 8;
const EPS = 1e-5;          // PyTorch's default for BatchNorm1d and LayerNorm
const r1 = (v) => Math.round(v * 10) / 10;

function makeBatch(seed) {
    const rng = createRng(seed * 17 + 3);
    const units = Array.from({ length: D }, () => ({ m: r1(-3 + 8 * rng.next()), s: r1(0.4 + 2.2 * rng.next()) }));
    const rows = Array.from({ length: MAX_B }, () => units.map(u => r1(u.m + u.s * rng.normal())));
    const spare = units.map(u => r1(u.m + u.s * rng.normal()));
    return { seed, units, rows, spare };
}

const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const variance = (v) => { const m = mean(v); return v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length; };

/** Batch norm in training mode: statistics down each column (unit), over the examples. */
function batchNorm(rows, gamma = null, beta = null) {
    const mu = Array.from({ length: D }, (_, j) => mean(rows.map(r => r[j])));
    const vr = Array.from({ length: D }, (_, j) => variance(rows.map(r => r[j])));
    const sd = vr.map(v => Math.sqrt(v + EPS));
    const xhat = rows.map(r => r.map((x, j) => (x - mu[j]) / sd[j]));
    const y = xhat.map(r => r.map((q, j) => (gamma ? gamma[j] : 1) * q + (beta ? beta[j] : 0)));
    return { mu, vr, sd, xhat, y };
}

/** Layer norm: statistics across each row (example), over its units. γ and β are still per unit. */
function layerNorm(rows, gamma = null, beta = null) {
    const mu = rows.map(mean);
    const vr = rows.map(variance);
    const sd = vr.map(v => Math.sqrt(v + EPS));
    const xhat = rows.map((r, i) => r.map(x => (x - mu[i]) / sd[i]));
    const y = xhat.map(r => r.map((q, j) => (gamma ? gamma[j] : 1) * q + (beta ? beta[j] : 0)));
    return { mu, vr, sd, xhat, y };
}

/** PyTorch's running statistics over `steps` training batches of B drawn from the same units:
    r ← (1 − momentum) r + momentum · batch, starting from mean 0 and variance 1. The batch's mean is
    used as is; its variance is stored unbiased (÷ (B − 1)), though training normalises with ÷ B. */
const RUN_STEPS = 30;
const MOMENTUM = 0.1;
function runningStats(batch) {
    const rng = createRng(batch.seed * 29 + 11);
    let rm = new Array(D).fill(0), rv = new Array(D).fill(1);
    for (let t = 0; t < RUN_STEPS; t++) {
        const rows = Array.from({ length: B }, () => batch.units.map(u => r1(u.m + u.s * rng.normal())));
        const { mu, vr } = batchNorm(rows);
        rm = rm.map((r, j) => (1 - MOMENTUM) * r + MOMENTUM * mu[j]);
        rv = rv.map((r, j) => (1 - MOMENTUM) * r + MOMENTUM * vr[j] * B / (B - 1));
    }
    return { mean: rm, var: rv };
}
const evalNorm = (row, run) => row.map((x, j) => (x - run.mean[j]) / Math.sqrt(run.var[j] + EPS));

/* ── a deep network ────────────────────────────────────────
   Ten layers of 16 ReLU units, no biases, a batch of 32 standard-normal
   inputs. Weights are PyTorch's default scale (variance 1/(3n)) times
   `scale`. With bn, each layer is z = W h, then batch norm (γ = 1, β = 0),
   then ReLU. The score is s = (1/32) Σ_b v · h_10[b] for a unit vector v;
   the backward pass returns ‖∂s/∂H_k‖ for every layer's activations H_k. */
const DEEP = { n: 16, L: 10, batch: 32 };
function makeDeep(seed) {
    const rng = createRng(seed * 41 + 9);
    const { n, L, batch } = DEEP;
    const X = Array.from({ length: batch }, () => Array.from({ length: n }, () => rng.normal()));
    const Z = Array.from({ length: L }, () => Array.from({ length: n }, () => Array.from({ length: n }, () => rng.normal())));
    const v0 = Array.from({ length: n }, () => rng.normal());
    const len = Math.hypot(...v0);
    return { seed, X, Z, v: v0.map(a => a / len) };
}
const frob = (M) => Math.sqrt(M.reduce((a, r) => a + r.reduce((b, q) => b + q * q, 0), 0));

function runDeep(net, bn, scale) {
    const { n, L, batch } = DEEP;
    const std = scale / Math.sqrt(3 * n);
    const W = net.Z.map(M => M.map(row => row.map(w => std * w)));
    const H = [net.X], ZH = [null], INV = [null], spread = [];
    let minVar = Infinity;      // the smallest unit variance batch norm divides by, to compare with ε
    for (let k = 0; k < L; k++) {
        const z = H[k].map(h => W[k].map(row => row.reduce((a, w, j) => a + w * h[j], 0)));
        const all = z.flat();
        spread.push(Math.sqrt(variance(all)));
        let zh = z, inv = null;
        if (bn) {
            const mu = Array.from({ length: n }, (_, j) => mean(z.map(r => r[j])));
            const vars = Array.from({ length: n }, (_, j) => variance(z.map(r => r[j])));
            minVar = Math.min(minVar, ...vars);
            inv = vars.map(v => 1 / Math.sqrt(v + EPS));
            zh = z.map(r => r.map((q, j) => (q - mu[j]) * inv[j]));
        }
        ZH.push(zh); INV.push(inv);
        H.push(zh.map(r => r.map(q => (q > 0 ? q : 0))));
    }
    let G = H[L].map(() => net.v.map(q => q / batch));
    const grad = new Array(L + 1).fill(0);
    grad[L] = frob(G);
    for (let k = L; k >= 1; k--) {
        let U = G.map((g, b) => g.map((q, i) => (ZH[k][b][i] > 0 ? q : 0)));
        if (bn) {
            // through batch norm: ∂z = (inv / B) (B ∂ẑ − Σ_b ∂ẑ − ẑ Σ_b ∂ẑ ẑ), unit by unit
            const s1 = new Array(n).fill(0), s2 = new Array(n).fill(0);
            U.forEach((r, b) => r.forEach((q, j) => { s1[j] += q; s2[j] += q * ZH[k][b][j]; }));
            U = U.map((r, b) => r.map((q, j) => (INV[k][j] / batch) * (batch * q - s1[j] - ZH[k][b][j] * s2[j])));
        }
        G = U.map(u => Array.from({ length: n }, (_, j) => W[k - 1].reduce((a, row, i) => a + row[j] * u[i], 0)));
        grad[k - 1] = frob(G);
    }
    return { bn, scale, spread, grad, out: H[L], minVar, perLayer: (grad[0] / grad[L]) ** (1 / L), spreadFactor: (spread[L - 1] / spread[0]) ** (1 / (L - 1)) };
}
const DEEP_CONFIGS = [[false, 1], [false, 10], [true, 1], [true, 10]];
const maxDiff = (A, Bm) => Math.max(...A.map((r, i) => Math.max(...r.map((q, j) => Math.abs(q - Bm[i][j])))));

/* ── numbers ───────────────────────────────────────────── */

const numD = (v, d) => {
    const s = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(/\.?0+$/, '');
    return (s === '-0' ? '0' : s).replace('-', '−');
};
const num = (v) => numD(v, 4);
/** One decimal always shown, for the input grids: 1.0, −4.6. */
const f1 = (v) => numD(v, 1).replace(/^(−?\d+)$/, '$1.0');
const f2 = (v) => { const s = (Math.round(v * 100) / 100).toFixed(2); return (s === '-0.00' ? '0.00' : s).replace('-', '−'); };
const p2 = (v) => String(Number(v.toPrecision(2))).replace('-', '−');
const p3 = (v) => String(Number(v.toPrecision(3))).replace('-', '−');
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (k) => String(k).split('').map(c => SUB[c]).join('');
const sup = (e) => String(e).split('').map(c => SUP[c]).join('');
const mid = (v) => Math.abs(v) >= 0.01 && Math.abs(v) < 1000;
function mant(v) {
    const a = Math.abs(v);
    let e = Math.floor(Math.log10(a));
    let m = Math.round((a / 10 ** e) * 10) / 10;
    if (m >= 10) { m = 1; e += 1; }
    return { sign: v < 0 ? '−' : '', m: m.toFixed(1), e };
}
const sci = (v) => {
    if (v === 0) return '0';
    if (mid(v)) return p3(v);
    const { sign, m, e } = mant(v);
    return `${sign}${m} × 10${sup(e)}`;
};
/** TeX wants ASCII minus; "a - -b" and "a + -b" are tidied to "a + b" and "a - b". */
const tex = (s) => s.replace(/−/g, '-').replace(/- -/g, '+ ').replace(/\+ -/g, '- ');
const vec = (v, f = f2) => `(${v.map(f).join(', ')})`;
/** A negative number in brackets, for "a · (−b)" and "a − (−b)". */
const par = (s) => (s.startsWith('−') ? `(${s})` : s);
const sciTex = (v) => {
    if (v === 0) return '0';
    if (mid(v)) return p3(v).replace('−', '-');
    const { sign, m, e } = mant(v);
    return `${sign ? '-' : ''}${m} \\times 10^{${e}}`;
};

/* ── prompts ───────────────────────────────────────────────
   "Is this entry more than one spread from its mean: |x̂| > 1?" The answer is
   yes for most of a column's largest and smallest values and no for most of
   the rest, so "extremes are above 1" would score well if the entry were
   picked at random. Each tour therefore draws the kind of entry it asks about
   (yes/no × extreme/middle, and for layer norm also same/different from batch
   norm's answer) with these weights, which offset how often each kind exists
   (measured over 4,000 batches; the suite re-measures the outcome). Entries
   within 0.1 of |x̂| = 1 are never asked. */
const MARGIN = 0.1;
const BN_MIX = { YE: 0.28, NM: 0.28, YM: 0.46, NE: 1.0 };
const LN_MIX = { YDE: 0.25, YSE: 0.25, NSE: 0.46, NDE: 0.75, NSM: 0.05, NDM: 0.05 };
const YES_NO = ['Yes: |x̂| > 1', 'No: |x̂| < 1'];

function chooseEntry(entries, mix, rng) {
    const keys = Object.keys(mix);
    let r = rng.next() * keys.reduce((a, k) => a + mix[k], 0);
    let key = keys[keys.length - 1];
    for (const k of keys) { if (r < mix[k]) { key = k; break; } r -= mix[k]; }
    const pool = entries.filter(e => e.key === key);
    return pool.length ? rng.pick(pool) : null;
}

/* ── the guided tour ─────────────────────────────────────── */

const ACTS = [
    { id: 1, label: 'Batch norm', icon: Columns3 },
    { id: 2, label: 'γ and β', icon: Scale },
    { id: 3, label: 'Layer norm', icon: Rows3 },
    { id: 4, label: 'Batch mates', icon: Users },
    { id: 5, label: 'Deep nets', icon: Layers },
];
const DEFAULT_SEED = 80;          // both prompts asked; its deep net sits at the study's medians

function tourOf(seed) {
    const batch = makeBatch(seed);
    const X = batch.rows.slice(0, B);
    const bn = batchNorm(X), ln = layerNorm(X);
    const rng = createRng(seed * 31 + 7);
    const bnEntries = [], lnEntries = [];
    X.forEach((r, i) => r.forEach((x, j) => {
        const col = X.map(q => q[j]);
        const zb = bn.xhat[i][j], zl = ln.xhat[i][j];
        const ext = x === Math.max(...col) || x === Math.min(...col);
        const extR = x === Math.max(...r) || x === Math.min(...r);
        const clearB = Math.abs(Math.abs(zb) - 1) >= MARGIN, clearL = Math.abs(Math.abs(zl) - 1) >= MARGIN;
        if (clearB) bnEntries.push({ i, j, key: `${Math.abs(zb) > 1 ? 'Y' : 'N'}${ext ? 'E' : 'M'}` });
        if (clearB && clearL) lnEntries.push({ i, j, key: `${Math.abs(zl) > 1 ? 'Y' : 'N'}${(Math.abs(zl) > 1) === (Math.abs(zb) > 1) ? 'S' : 'D'}${extR ? 'E' : 'M'}` });
    }));
    const bnAsk = chooseEntry(bnEntries, BN_MIX, rng);
    const lnAsk = chooseEntry(lnEntries, LN_MIX, rng);
    const swapped = X.map((r, i) => (i === B - 1 ? batch.spare : r));
    const deepNet = makeDeep(seed);
    const deep = DEEP_CONFIGS.map(([on, sc]) => runDeep(deepNet, on, sc));
    return {
        batch, X, bn, ln, bnAsk, lnAsk,
        bnFocus: bnAsk ?? { i: 0, j: 0 }, lnFocus: lnAsk ?? { i: 0, j: 0 },
        swapped, bn2: batchNorm(swapped), ln2: layerNorm(swapped),
        two: batchNorm(X.slice(0, 2)), one: batchNorm(X.slice(0, 1)),
        run: runningStats(batch), deep,
    };
}

function generateSteps(seed) {
    const T = tourOf(seed);
    const { X, bn, ln } = T;
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ask: null, ...data, explanation });
    const { i: bi, j: bj } = T.bnFocus;
    const col = X.map(r => r[bj]);
    const ranges = Array.from({ length: D }, (_, j) => Math.max(...X.map(r => r[j])) - Math.min(...X.map(r => r[j])));
    const wide = ranges.indexOf(Math.max(...ranges)), narrow = ranges.indexOf(Math.min(...ranges));

    /* Act 1: batch norm */
    s(1, 'Batch norm', {
        kind: 'batch', focus: null,
        tex: String.raw`X \in \mathbb{R}^{6 \times 4}: \text{ one row per example, one column per unit}`,
    }, `A layer's pre-activations for a batch of 6 examples: one row per example, one column per unit, so X has shape [6, 4]. Each unit lives on its own scale: unit ${wide + 1}'s values span ${f2(ranges[wide])}, unit ${narrow + 1}'s only ${f2(ranges[narrow])}, and their averages run from ${f2(Math.min(...bn.mu))} to ${f2(Math.max(...bn.mu))}. Whatever comes next has to cope with all of that, and with it shifting as earlier layers train. Batch norm re-centres and rescales each unit using this batch's own numbers.`);
    s(1, 'Batch norm', {
        kind: 'mean', focus: { i: null, j: bj },
        tex: tex(String.raw`\mu_{${bj + 1}} = \tfrac{1}{6}\,(${col.map(v => numD(v, 1)).join(' + ')}) = ${num(bn.mu[bj])}`),
    }, `Batch norm works down the columns: for each unit, the mean of its 6 values over the batch. μ = ${vec(bn.mu)}, shape [4], one mean per unit. Unit ${bj + 1}'s is worked out below.`);
    const bnQ = T.bnAsk ? { kind: 'bn', i: bi, j: bj, x: X[bi][bj], mu: bn.mu[bj], sd: bn.sd[bj], z: bn.xhat[bi][bj] } : null;
    s(1, 'Batch norm', {
        kind: 'sd', focus: { i: bi, j: bj }, ask: bnQ,
        tex: tex(String.raw`\begin{gathered} \sigma_{${bj + 1}}^2 = \tfrac{1}{6} \sum_{b=1}^{6} (x_{b${bj + 1}} - \mu_{${bj + 1}})^2 = ${num(bn.vr[bj])} \\ \sqrt{\sigma_{${bj + 1}}^2 + \varepsilon} = \sqrt{${num(bn.vr[bj])} + 0.00001} = ${num(bn.sd[bj])} \end{gathered}`),
    }, `Then each unit's variance around its mean, σ², dividing by 6 (not 5), and the spread √(σ² + ε) that every entry will be divided by: ${vec(bn.sd)}. ε = 0.00001 matters only when a unit's values are nearly all the same. The highlighted entry, example ${bi + 1} in unit ${bj + 1}, is x = ${numD(X[bi][bj], 1)}.`);
    const zb = bn.xhat[bi][bj];
    const cm = Array.from({ length: D }, (_, j) => mean(bn.xhat.map(r => r[j])));
    const cv = Array.from({ length: D }, (_, j) => variance(bn.xhat.map(r => r[j])));
    s(1, 'Batch norm', {
        kind: 'normalize', focus: { i: bi, j: bj },
        tex: tex(String.raw`\hat{x}_{${bi + 1}${bj + 1}} = \frac{x - \mu_{${bj + 1}}}{\sqrt{\sigma_{${bj + 1}}^2 + \varepsilon}} = \frac{${numD(X[bi][bj], 1)} - ${num(bn.mu[bj])}}{${num(bn.sd[bj])}} = ${num(zb)}`),
    }, `Every entry minus its unit's mean, divided by its unit's spread. Example ${bi + 1} in unit ${bj + 1} becomes x̂ = ${num(zb)}. Every column of X̂ now has mean ${num(Math.max(...cm.map(Math.abs)))} and variance 1 to within ${p2(1 - Math.min(...cv))}, whatever scale it started on (ε keeps it a hair under 1). With 6 examples no |x̂| can pass √5 = 2.24; the largest here is ${f2(Math.max(...bn.xhat.flat().map(Math.abs)))}.`);

    /* Act 2: γ and β */
    s(2, 'γ and β', {
        kind: 'gamma', focus: { i: bi, j: bj }, gamma: new Array(D).fill(1), beta: new Array(D).fill(0),
        tex: tex(String.raw`y = \gamma_{${bj + 1}}\,\hat{x} + \beta_{${bj + 1}} = 1 \cdot ${par(num(zb))} + 0 = ${num(zb)}`),
    }, `Mean 0 and variance 1 for every unit is not always what the next layer needs: a sigmoid after it would sit on its straight middle stretch. So each unit gets two learned numbers, a scale γ and a shift β, and the layer outputs y = γx̂ + β. Both have shape [4]. PyTorch starts them at γ = 1 and β = 0, so at first y = x̂.`);
    const undo = X.map((r, i) => r.map((x, j) => bn.sd[j] * bn.xhat[i][j] + bn.mu[j]));
    const undoErr = maxDiff(undo, X);
    s(2, 'γ and β', {
        kind: 'undo', focus: { i: bi, j: bj }, gamma: bn.sd, beta: bn.mu, undoErr,
        tex: tex(String.raw`y = \sqrt{\sigma^2 + \varepsilon}\cdot\frac{x - \mu}{\sqrt{\sigma^2 + \varepsilon}} + \mu = x: \quad ${num(bn.sd[bj])} \cdot ${par(num(zb))} + ${num(bn.mu[bj])} = ${num(undo[bi][bj])}`),
    }, `Training can even undo the normalisation: set each unit's γ to its spread and β to its mean, and y = x again (largest difference here ${sci(undoErr)}, rounding). So batch norm takes nothing away from what the layer can express. It changes where training starts, at mean 0 and spread 1, and training moves γ and β only as far as the loss asks.`);

    /* Act 3: layer norm */
    const { i: li, j: lj } = T.lnFocus;
    s(3, 'Layer norm', {
        kind: 'lnMean', focus: { i: li, j: null },
        tex: tex(String.raw`\mu_{\text{ex } ${li + 1}} = \tfrac{1}{4}\,(${X[li].map(v => numD(v, 1)).join(' + ')}) = ${num(ln.mu[li])}`),
    }, `Layer norm turns the same recipe sideways: its statistics run across each example's 4 units, one row at a time, so there is one mean per example: ${vec(ln.mu)}, shape [6]. γ and β stay per unit, as in batch norm.`);
    const lnQ = T.lnAsk ? { kind: 'ln', i: li, j: lj, x: X[li][lj], mu: ln.mu[li], sd: ln.sd[li], z: ln.xhat[li][lj], zb: bn.xhat[li][lj] } : null;
    s(3, 'Layer norm', {
        kind: 'lnSd', focus: { i: li, j: lj }, ask: lnQ,
        tex: tex(String.raw`\begin{gathered} \sigma_{\text{ex } ${li + 1}}^2 = \tfrac{1}{4} \sum_{u=1}^{4} (x_{${li + 1}u} - \mu_{\text{ex } ${li + 1}})^2 = ${num(ln.vr[li])} \\ \sqrt{\sigma^2 + \varepsilon} = ${num(ln.sd[li])} \end{gathered}`),
    }, `And one spread per example, across its own units: ${vec(ln.sd)}. Nothing in a row's statistics comes from any other example. The highlighted entry is example ${li + 1} in unit ${lj + 1}, x = ${numD(X[li][lj], 1)}; batch norm gave it x̂ = ${f2(bn.xhat[li][lj])}.`);
    const zl = ln.xhat[li][lj];
    s(3, 'Layer norm', {
        kind: 'lnNormalize', focus: { i: li, j: lj },
        tex: tex(String.raw`\hat{x}_{${li + 1}${lj + 1}} = \frac{${numD(X[li][lj], 1)} - ${num(ln.mu[li])}}{${num(ln.sd[li])}} = ${num(zl)} \qquad \text{(batch norm: } ${num(bn.xhat[li][lj])}\text{)}`),
    }, `Each row of the layer-norm output now has mean 0 and variance 1; the columns no longer do. The same number gets a different x̂: ${num(zl)} measured against example ${li + 1}'s other units, ${num(bn.xhat[li][lj])} measured against unit ${lj + 1} in the other examples. Transformers use layer norm: each token is normalised on its own, so the result does not depend on the batch, and generation can run one sequence at a time.`);

    /* Act 4: batch mates */
    const old = X[B - 1], nw = T.batch.spare;
    const moves = bn.xhat[0].map((q, j) => T.bn2.xhat[0][j] - q);
    const mj = moves.map(Math.abs).indexOf(Math.max(...moves.map(Math.abs)));
    const d1 = moves[mj];
    const lnSame = T.ln2.xhat.slice(0, B - 1).every((r, i) => r.every((q, j) => q === ln.xhat[i][j]));
    const bnMoved = T.bn2.xhat.slice(0, B - 1).flat().filter((q, k) => q !== bn.xhat[Math.floor(k / D)][k % D]).length;
    s(4, 'Batch mates', {
        kind: 'mates', focus: { i: 0, j: mj }, lnSame, bnMoved,
        tex: tex(String.raw`\hat{x}_{1${mj + 1}}: \; ${num(bn.xhat[0][mj])} \;\to\; ${num(T.bn2.xhat[0][mj])} \quad \text{(batch norm)}, \qquad ${num(ln.xhat[0][mj])} \;\to\; ${num(T.ln2.xhat[0][mj])} \quad \text{(layer norm)}`),
    }, `Swap example 6, ${vec(old, v => numD(v, 1))}, for a new one, ${vec(nw, v => numD(v, 1))}, and run both again. Batch norm: every unit's μ and σ moved, so ${bnMoved === (B - 1) * D ? `all ${bnMoved}` : `${bnMoved} of the ${(B - 1) * D}`} outputs of examples 1 to 5 changed although their inputs did not. Example 1 moved most in unit ${mj + 1}: from ${num(bn.xhat[0][mj])} to ${num(T.bn2.xhat[0][mj])} (${d1 >= 0 ? '+' : '−'}${num(Math.abs(d1))}). Layer norm: examples 1 to 5 are ${lnSame ? 'exactly as before' : 'changed'}. In batch norm an example's output depends on which others share its batch.`);
    const ties = Array.from({ length: D }, (_, j) => X[0][j] === X[1][j]).filter(Boolean).length;
    const dj = X[0][bj] - X[1][bj];
    const sizes2 = T.two.xhat[0].filter((q, j) => X[0][j] !== X[1][j]).map(Math.abs);
    s(4, 'Batch mates', {
        kind: 'two', focus: { i: 0, j: bj }, ties,
        tex: tex(String.raw`\hat{x}_1 = \frac{x_1 - \frac{x_1 + x_2}{2}}{\sqrt{\left(\frac{x_1 - x_2}{2}\right)^2 + \varepsilon}} = \frac{${num(dj / 2)}}{\sqrt{${num((dj / 2) ** 2)} + 0.00001}} = ${num(T.two.xhat[0][bj])}`),
    }, `Shrink the batch to examples 1 and 2. Each unit's mean is halfway between its two values and its spread is half their gap, so every x̂ is +1 or −1, up to ε: here their sizes run from ${num(Math.min(...sizes2))} to ${num(Math.max(...sizes2))}${ties ? `, or 0 in the ${ties === 1 ? 'unit' : `${ties} units`} where the two are equal` : ''}. ε only bites when the two are close (a gap of 0.1 still gives 0.998). All that survives is which of the two is bigger; how far apart they were is gone.`);
    s(4, 'Batch mates', {
        kind: 'one', focus: null,
        tex: String.raw`\hat{x} = \frac{x - x}{\sqrt{0 + \varepsilon}} = 0, \qquad y = \gamma \cdot 0 + \beta = \beta`,
    }, `A batch of one: each value is its own mean, every σ² is 0, and x̂ = 0 / √ε = 0 for every unit, so y = β whatever the input was. Without ε it would be 0 / 0. That is why PyTorch refuses a training batch with one example per unit ("Expected more than 1 value per channel when training"), and why batch norm needs a different rule at inference.`);
    const ev = evalNorm(X[0], T.run);
    s(4, 'Batch mates', {
        kind: 'eval', focus: null, ev,
        tex: tex(String.raw`\hat{x}_{\text{eval}} = \frac{x - \mu_{\text{run}}}{\sqrt{\sigma^2_{\text{run}} + \varepsilon}}: \quad \frac{${numD(X[0][bj], 1)} - ${num(T.run.mean[bj])}}{\sqrt{${num(T.run.var[bj])} + 0.00001}} = ${num(ev[bj])}`),
    }, `At inference batch norm does not look at the batch. During training it keeps running averages, μ_run ← 0.9 μ_run + 0.1 μ_batch after every batch (and the same for the variance, stored with ÷ 5). After ${RUN_STEPS} training batches from these units, μ_run = ${vec(T.run.mean)} against true centres ${vec(T.batch.units.map(u => u.m))}; it started at 0, and 0.9³⁰ = 4% of that start is still in it. In eval mode example 1 becomes ${vec(ev)} instead of the training-mode ${vec(bn.xhat[0])}, and no longer depends on its batch mates.`);

    /* Act 5: deep nets */
    const [R1, R10, N1, N10] = T.deep;
    const all = (key) => T.deep.flatMap(r => r[key]).filter(v => v > 0).map(Math.log10);
    const rangeOf = (key) => [Math.floor(Math.min(...all(key))), Math.ceil(Math.max(...all(key)))];
    const ranges5 = { spread: rangeOf('spread'), grad: rangeOf('grad') };
    s(5, 'Deep nets', {
        kind: 'deep', cfg: 0, ghost: null, ranges: ranges5,
        tex: tex(String.raw`\text{spread of } z_{10} = ${sciTex(R1.spread[9])}, \qquad \|\partial s/\partial X\| = ${sciTex(R1.grad[0])}`),
    }, `Now a 10-layer ReLU network, 16 units wide, run on a batch of 32, with PyTorch's default weight scale and no normalisation. Left: the spread of each layer's pre-activations z. It shrinks about ×${numD(R1.spreadFactor, 2)} per layer, from ${sci(R1.spread[0])} to ${sci(R1.spread[9])}. Right: the gradient flowing back to each layer's activations, ${sci(R1.grad[0])} by the input. Both directions vanish, as on the previous page.`);
    s(5, 'Deep nets', {
        kind: 'deep', cfg: 1, ghost: 0, ranges: ranges5,
        tex: tex(String.raw`\text{spread of } z_{10} = ${sciTex(R10.spread[9])}, \qquad \|\partial s/\partial X\| = ${sciTex(R10.grad[0])}`),
    }, `The same network with every weight ×10. Each layer now multiplies the scale by about ${numD(R10.spreadFactor, 2)} instead of ${numD(R1.spreadFactor, 2)}: the spread reaches ${sci(R10.spread[9])} and the input gradient ${sci(R10.grad[0])}. Without normalisation, the weight scale is raised to the 10th power.`);
    s(5, 'Deep nets', {
        kind: 'deep', cfg: 2, ghost: 0, ranges: ranges5,
        tex: tex(String.raw`z \to \frac{z - \mu}{\sqrt{\sigma^2 + \varepsilon}} \to \text{ReLU}, \qquad \|\partial s/\partial X\| = ${sciTex(N1.grad[0])}`),
    }, `Put batch norm after every linear layer, before the ReLU (γ = 1, β = 0). Each layer's input is now normalised, so the spreads stay between ${f2(Math.min(...N1.spread))} and ${f2(Math.max(...N1.spread))} all the way down, and the input gradient is ${sci(N1.grad[0])} instead of ${sci(R1.grad[0])}. The gradient is not frozen either: it changes ×${numD(N1.perLayer, 2)} per layer here (over ${DEEP_STUDY.n} nets the median is ×${DEEP_STUDY.bnPerLayer}; very deep batch-norm nets start with gradients that grow with depth).`);
    const diff10 = maxDiff(N10.out, N1.out);
    s(5, 'Deep nets', {
        kind: 'deep', cfg: 3, ghost: 2, ranges: ranges5, diff10,
        tex: tex(String.raw`\max |h^{\times 10}_{10} - h^{\times 1}_{10}| = ${sciTex(diff10)}, \qquad \|\partial s/\partial X\| = ${sciTex(N10.grad[0])} \text{ vs } ${sciTex(N1.grad[0])}`),
    }, `And weights ×10 with batch norm: every z is 10 times bigger, and batch norm divides it straight back out. The final activations match the ×1 run to within ${sci(diff10)} (ε's doing), and the input gradient is ${sci(N10.grad[0])} against ${sci(N1.grad[0])}. The weights' overall scale no longer matters to the forward pass. Over ${DEEP_STUDY.n} nets: median input gradient ${sci(DEEP_STUDY.raw1)} without batch norm and ${p2(DEEP_STUDY.bn1)} with it, at either scale.`);
    return steps;
}

function predictFor(step, next) {
    if (!step || !next || !step.ask) return null;
    const q = step.ask;
    if (!(q.kind === 'bn' ? next.kind === 'normalize' : next.kind === 'lnNormalize')) return null;
    const yes = Math.abs(q.z) > 1;
    // subtract the mean as shown (2 decimals), so the line reads right by hand: |5.5 − 2.93| = 2.57
    const dev = q.x - Math.round(q.mu * 100) / 100;
    const where = q.kind === 'bn' ? `unit ${q.j + 1}'s mean over the batch` : `example ${q.i + 1}'s mean over its units`;
    return {
        question: `Example ${q.i + 1}, unit ${q.j + 1}: x = ${numD(q.x, 1)}, ${where} is ${f2(q.mu)} and the spread is ${f2(q.sd)}. Is x more than one spread from the mean, so that |x̂| > 1?`,
        options: YES_NO,
        correct: yes ? 0 : 1,
        because: `|x − μ| = |${numD(q.x, 1)} − ${par(f2(q.mu))}| = ${f2(Math.abs(dev))}, ${yes ? 'more' : 'less'} than the spread ${f2(q.sd)}, so x̂ = ${f2(q.z)}.`,
    };
}

/* ── the measured misconception ────────────────────────────
   For each batch size, 1,000 seeded batches (seeds 1–1,000, units from
   makeBatch, values N(m, s) unrounded from createRng(seed · 53 + b)): redraw
   the last example and measure how far example 1's batch-norm outputs move
   (mean over the 4 units of |Δx̂|). Layer norm moves exactly 0 every time.
   DEEP_STUDY runs runDeep on nets 1–300. Both are rerun by the test suite. */
const NORM_STUDY = { n: 1000, sizes: [2, 4, 8, 32, 128], medians: [0.5, 0.34, 0.15, 0.036, 0.0089] };
const DEEP_STUDY = { n: 300, raw1: 1.5e-5, bn1: 0.42, rawPerLayer: '0.39', bnPerLayer: '1.09' };

const quizQuestions = [
    {
        question: 'A batch of 32 examples passes through a layer of 64 units. Over which numbers does batch norm compute each mean and variance?',
        options: [
            'Each example\'s 64 unit values',
            'Each unit\'s 32 values, one per example',
            'All 2,048 numbers at once',
            'Each single number on its own',
        ],
        correct: 1,
        explanation: 'Batch norm works per unit, down the batch: 64 means and 64 variances, each over 32 values. Layer norm is the other way round: 32 means and variances, each over one example\'s 64 units.',
    },
    {
        question: 'Batch norm forces each unit to mean 0 and variance 1. Why does it then multiply by γ and add β?',
        options: [
            'To undo rounding errors in the division',
            'Because ε changes the variance slightly',
            'So training can give each unit whatever mean and spread suits the next layer, up to undoing the normalisation entirely (γ = σ, β = μ)',
            'To keep the outputs positive',
        ],
        correct: 2,
        explanation: 'y = γx̂ + β with learned γ and β per unit. Setting γ = √(σ² + ε) and β = μ gives back x exactly, so normalising costs nothing in what the layer can express.',
    },
    {
        question: 'Batch norm runs in training mode on a batch of just 2 examples. What does each unit\'s x̂ come out as?',
        options: [
            '+1 for the larger value and −1 for the smaller, up to ε (0 if they are equal)',
            'The two values divided by their sum',
            '0 for both',
            'The same as with a batch of 32',
        ],
        correct: 0,
        explanation: 'The mean is halfway between the two and the spread is half their gap, so each value sits one spread from the mean: ±1, a touch less when ε matters (a gap of 0.1 gives 0.998). Only the order survives; with a batch of 1, even that goes and every x̂ is 0.',
    },
];

const codeExample = `import torch

x = torch.tensor([[0.8, -4.6, -0.6, 0.6], [1.5, -4.3, -2.6, 0.8], [2.4, -0.3, 0.7, 1.0],
                  [2.0, 0.7, -0.4, 0.0], [3.6, -2.4, -2.4, 1.0], [2.6, 1.0, -0.1, -0.7]])
bn = torch.nn.BatchNorm1d(4)          # gamma = 1, beta = 0, eps = 1e-5
ln = torch.nn.LayerNorm(4)
show = lambda t: [round(v, 4) for v in t[0].tolist()]   # example 1
print(show(bn(x).detach()))   # [-1.536, -1.3051, 0.2494, 0.2436]
print(show(ln(x).detach()))   # [0.8049, -1.6787, 0.161, 0.7129]

x2 = x.clone()
x2[5] = torch.tensor([1.2, -0.6, 2.1, 0.4])   # swap example 6
print(show(bn(x2).detach()))  # [-1.2222, -1.3331, -0.0405, -0.0941]  <- example 1 moved
print(show(ln(x2).detach()))  # [0.8049, -1.6787, 0.161, 0.7129]  <- unchanged`;

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

/** A small matrix as a table. `tint` colours x̂-like values on the diverging scale (±2 at full
    colour); `footers` add per-column rows (μ, σ), `sides` per-row columns; `mark(i, j)` outlines
    a cell: 'focus' white, 'moved' amber. Clicking a cell calls onSelect(i, j) when given. */
function Grid({ title, shape, rows, fmt = f2, tint = false, mark, footers = [], sides = [], onSelect, dimRows = [] }) {
    return (
        <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1.5">{title}{shape && <ShapeTag shape={shape} />}</div>
            <div className="overflow-x-auto">
                <table className="text-xs font-mono border-separate" style={{ borderSpacing: '3px' }}>
                    <thead>
                        <tr className="text-slate-500">
                            <th />
                            {Array.from({ length: D }, (_, j) => <th key={j} className="font-medium font-sans px-1">u{j + 1}</th>)}
                            {sides.map(sd => <th key={sd.label} className="font-medium font-sans px-1 text-orange-300">{sd.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i} className={dimRows.includes(i) ? 'opacity-35' : ''}>
                                <td className="pr-1 text-slate-500 font-sans whitespace-nowrap">ex {i + 1}</td>
                                {r.map((v, j) => {
                                    const m = mark ? mark(i, j) : null;
                                    const t = Math.max(-1, Math.min(1, v / 2));
                                    return (
                                        <td key={j} onClick={onSelect ? () => onSelect(i, j) : undefined}
                                            {...(onSelect ? {
                                                tabIndex: 0, role: 'button', 'aria-label': `Example ${i + 1}, unit ${j + 1}: ${fmt(v)}`,
                                                onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i, j); } },
                                            } : {})}
                                            className={`text-right px-1.5 py-1 rounded min-w-[3.1rem] ${tint ? '' : 'bg-slate-800/80 text-slate-200'} ${m === 'focus' ? 'ring-2 ring-white' : m === 'moved' ? 'ring-1 ring-amber-400' : ''} ${onSelect ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400' : ''}`}
                                            style={tint ? { background: diverging(t), color: inkOn(t, 'diverging') } : undefined}>
                                            {fmt(v)}
                                        </td>
                                    );
                                })}
                                {sides.map(sd => <td key={sd.label} className="text-right px-1.5 text-orange-200">{f2(sd.values[i])}</td>)}
                            </tr>
                        ))}
                        {footers.map(ft => (
                            <tr key={ft.label}>
                                <td className="pr-1 text-orange-300 font-sans whitespace-nowrap">{ft.label}</td>
                                {ft.values.map((v, j) => <td key={j} className="text-right px-1.5 text-orange-200">{(ft.fmt ?? f2)(v)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const LW = 320, LH = 190, LPAD = { l: 40, r: 6, t: 18, b: 24 };

/** Values on a log axis as bars, one per layer. A ghost series is drawn faded behind. */
function LogBars({ values, labels, range, ghost = null, color = '#fb923c', title, ariaLabel }) {
    const [lo, hi] = range;
    const n = values.length;
    const gap = (LW - LPAD.l - LPAD.r) / n;
    const bw = Math.min(18, gap * 0.7);
    const y = (v) => {
        const l = Math.max(lo, Math.min(hi, Math.log10(v)));
        return Math.round((LPAD.t + (1 - (l - lo) / (hi - lo)) * (LH - LPAD.t - LPAD.b)) * 100) / 100;
    };
    const base = LH - LPAD.b;
    const step = Math.max(1, Math.ceil((hi - lo) / 5));
    const ticks = [];
    for (let e = Math.ceil(lo / step) * step; e <= hi; e += step) ticks.push(e);
    return (
        <div className="min-w-0">
            <div className="text-xs text-slate-400 mb-1">{title}</div>
            <svg viewBox={`0 0 ${LW} ${LH}`} width="100%" role="img" aria-label={ariaLabel} className="block">
                {ticks.map(e => (
                    <g key={e}>
                        <line x1={LPAD.l} x2={LW - LPAD.r} y1={y(10 ** e)} y2={y(10 ** e)} stroke={e === 0 ? '#64748b' : '#1e293b'} strokeDasharray={e === 0 ? '4 3' : undefined} />
                        <text x={LPAD.l - 4} y={y(10 ** e) + 3.5} fontSize="10" textAnchor="end" fill="#64748b">{e === 0 ? '1' : `10${sup(e)}`}</text>
                    </g>
                ))}
                {values.map((v, k) => {
                    const cx = LPAD.l + gap * (k + 0.5);
                    const g = ghost ? ghost[k] : null;
                    return (
                        <g key={k}>
                            {g !== null && g > 0 && <rect x={cx - bw / 2 - 2} y={y(g)} width={bw + 4} height={Math.max(0, base - y(g))} fill="#94a3b8" opacity="0.2" rx="2" />}
                            {v > 0 && <rect x={cx - bw / 2} y={y(v)} width={bw} height={Math.max(1, base - y(v))} fill={color} opacity="0.85" rx="2" style={{ transition: 'y .35s ease, height .35s ease' }} />}
                            <text x={cx} y={LH - 8} fontSize="9" textAnchor="middle" fill="#64748b">{labels[k]}</text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

const SPREAD_LABELS = Array.from({ length: DEEP.L }, (_, k) => `z${sub(k + 1)}`);
const GRAD_LABELS = Array.from({ length: DEEP.L + 1 }, (_, k) => (k === 0 ? 'X' : `h${sub(k)}`));
const cfgName = (r) => `${r.bn ? 'batch norm' : 'no normalisation'}, weights ×${r.scale}`;

function DeepView({ run, ghost, ranges }) {
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {cfgName(run)} · each layer&apos;s activations <ShapeTag shape={[DEEP.batch, DEEP.n]} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LogBars values={run.spread} labels={SPREAD_LABELS} range={ranges.spread} ghost={ghost ? ghost.spread : null}
                    title="spread of each layer's z (before any normalisation)" ariaLabel="Spread of each layer's pre-activations on a log scale" />
                <LogBars values={run.grad} labels={GRAD_LABELS} range={ranges.grad} ghost={ghost ? ghost.grad : null} color="#38bdf8"
                    title="‖∂s/∂H‖, the gradient reaching each layer" ariaLabel="Gradient norm reaching each layer on a log scale" />
            </div>
        </div>
    );
}

/** The tour's picture for one step. */
function StepView({ step, tour }) {
    const { X, bn, ln } = tour;
    const f = step.focus;
    const focusMark = (i, j) => (f && (f.i === null || f.i === i) && (f.j === null || f.j === j) ? 'focus' : null);
    const k = step.kind;
    if (k === 'deep') return <DeepView run={tour.deep[step.cfg]} ghost={step.ghost === null ? null : tour.deep[step.ghost]} ranges={step.ranges} />;
    const stats = (which) => [
        { label: 'μ', values: which.mu },
        ...(k === 'mean' ? [] : [{ label: 'σ²', values: which.vr }, { label: '√(σ²+ε)', values: which.sd }]),
    ];
    const raw = (props) => <Grid title="X, the layer's input" shape={[X.length, D]} rows={X} fmt={f1} {...props} />;
    if (k === 'batch') return raw({});
    if (k === 'mean' || k === 'sd') return raw({ mark: focusMark, footers: stats(bn) });
    if (k === 'normalize') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {raw({ mark: focusMark, footers: stats(bn) })}
                <Grid title="X̂ = (x − μ) / √(σ² + ε)" shape={[X.length, D]} rows={bn.xhat} tint mark={focusMark}
                    footers={[{ label: 'mean', values: bn.xhat[0].map((_, j) => mean(bn.xhat.map(r => r[j]))) }, { label: 'var', values: bn.xhat[0].map((_, j) => variance(bn.xhat.map(r => r[j]))) }]} />
            </div>
        );
    }
    if (k === 'gamma' || k === 'undo') {
        const y = bn.xhat.map(r => r.map((q, j) => step.gamma[j] * q + step.beta[j]));
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Grid title="X̂" shape={[X.length, D]} rows={bn.xhat} tint mark={focusMark} />
                <Grid title="Y = γ x̂ + β" shape={[X.length, D]} rows={y} tint={k === 'gamma'} mark={focusMark}
                    footers={[{ label: 'γ', values: step.gamma }, { label: 'β', values: step.beta }]} />
            </div>
        );
    }
    if (k === 'lnMean' || k === 'lnSd') {
        const sides = [{ label: 'μ', values: ln.mu }, ...(k === 'lnMean' ? [] : [{ label: '√(σ²+ε)', values: ln.sd }])];
        return raw({ mark: focusMark, sides });
    }
    if (k === 'lnNormalize') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Grid title="Batch norm's X̂ (per unit)" shape={[X.length, D]} rows={bn.xhat} tint mark={focusMark} />
                <Grid title="Layer norm's X̂ (per example)" shape={[X.length, D]} rows={ln.xhat} tint mark={focusMark}
                    sides={[{ label: 'mean', values: ln.xhat.map(mean) }, { label: 'var', values: ln.xhat.map(variance) }]} />
            </div>
        );
    }
    if (k === 'mates') {
        const moved = (a, b) => (i, j) => (f && i === f.i && j === f.j ? 'focus' : i < B - 1 && a[i][j] !== b[i][j] ? 'moved' : null);
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Grid title="Batch norm after the swap" shape={[B, D]} rows={tour.bn2.xhat} tint mark={moved(tour.bn2.xhat, bn.xhat)} />
                <Grid title="Layer norm after the swap" shape={[B, D]} rows={tour.ln2.xhat} tint mark={moved(tour.ln2.xhat, ln.xhat)} />
                <p className="sm:col-span-2 text-[11px] text-slate-500">Amber outline: changed although that example&apos;s input did not. Example 6 is the new one.</p>
            </div>
        );
    }
    if (k === 'two' || k === 'one') {
        const n = k === 'two' ? 2 : 1;
        const out = k === 'two' ? tour.two : tour.one;
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Grid title={`a batch of ${n}`} shape={[n, D]} rows={X.slice(0, n)} fmt={f1} mark={focusMark} footers={[{ label: 'μ', values: out.mu }, { label: 'σ²', values: out.vr }]} />
                <Grid title="X̂" shape={[n, D]} rows={out.xhat} tint fmt={(v) => numD(v, 4)} mark={focusMark} />
            </div>
        );
    }
    if (k === 'eval') {
        return (
            <div className="space-y-3">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-slate-500">
                                <th className="text-left font-medium pb-1 pr-3">unit</th>
                                <th className="text-left font-medium pb-1 pr-3">true centre</th>
                                <th className="text-left font-medium pb-1 pr-3">μ_run</th>
                                <th className="text-left font-medium pb-1 pr-3">σ²_run</th>
                                <th className="text-left font-medium pb-1 pr-3">example 1, training</th>
                                <th className="text-left font-medium pb-1">example 1, eval</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-slate-300">
                            {Array.from({ length: D }, (_, j) => (
                                <tr key={j} className="border-t border-slate-800">
                                    <td className="py-1 pr-3 font-sans">u{j + 1}</td>
                                    <td className="pr-3">{f2(tour.batch.units[j].m)}</td>
                                    <td className="pr-3">{f2(tour.run.mean[j])}</td>
                                    <td className="pr-3">{f2(tour.run.var[j])}</td>
                                    <td className="pr-3">{f2(bn.xhat[0][j])}</td>
                                    <td className="text-orange-200">{f2(step.ev[j])}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-[11px] text-slate-500">True centre: the mean each unit&apos;s values are drawn around. Training mode normalises with this batch&apos;s μ and σ²; eval mode with the running ones.</p>
            </div>
        );
    }
    return null;
}

/* ── explore ───────────────────────────────────────────── */

const SCALES = [0.1, 1, 10];

function Lab() {
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const [norm, setNorm] = useState('bn');
    const [size, setSize] = useState(B);
    const [swap, setSwap] = useState(false);
    const [gamma, setGamma] = useState(() => new Array(D).fill(1));
    const [beta, setBeta] = useState(() => new Array(D).fill(0));
    const [sel, setSel] = useState({ i: 0, j: 0 });
    const [broken, setBroken] = useState(null);
    const [deepBn, setDeepBn] = useState(true);
    const [scale, setScale] = useState(1);

    const batch = useMemo(() => makeBatch(seed), [seed]);
    const rows = useMemo(() => {
        const r = batch.rows.slice(0, size);
        return swap && size > 1 ? r.map((q, i) => (i === size - 1 ? batch.spare : q)) : r;
    }, [batch, size, swap]);
    const base = useMemo(() => batch.rows.slice(0, size), [batch, size]);
    const fn = norm === 'bn' ? batchNorm : layerNorm;
    const out = useMemo(() => fn(rows, gamma, beta), [fn, rows, gamma, beta]);
    const before = useMemo(() => fn(base, gamma, beta), [fn, base, gamma, beta]);
    const deepNet = useMemo(() => makeDeep(seed), [seed]);
    const deep = useMemo(() => runDeep(deepNet, deepBn, scale), [deepNet, deepBn, scale]);
    const deepRef = useMemo(() => runDeep(deepNet, deepBn, 1), [deepNet, deepBn]);
    const deepRanges = useMemo(() => {
        const r = (vals) => { const l = vals.filter(v => v > 0).map(Math.log10); return [Math.min(-1, Math.floor(Math.min(...l))), Math.max(1, Math.ceil(Math.max(...l)))]; };
        return { spread: r([...deep.spread, ...deepRef.spread]), grad: r([...deep.grad, ...deepRef.grad]) };
    }, [deep, deepRef]);

    const i = Math.min(sel.i, rows.length - 1), j = sel.j;
    const mu = norm === 'bn' ? out.mu[j] : out.mu[i];
    const vr = norm === 'bn' ? out.vr[j] : out.vr[i];
    const breakIt = (n) => { setSize(n); setSwap(false); setNorm('bn'); setBroken(n); };
    const repair = () => { setSize(B); setBroken(null); };
    const setUnit = (arr, setArr, v) => setArr(arr.map((q, k) => (k === j ? v : q)));

    let message = null;
    if (broken === 2 && size === 2 && norm === 'bn') {
        const sizes = out.xhat[0].filter((q, k) => rows[0][k] !== rows[1][k]).map(Math.abs);
        const ties = D - sizes.length;
        message = `A batch of 2: every x̂ is +1 or −1, up to ε${sizes.length ? `: here the sizes run from ${num(Math.min(...sizes))} to ${num(Math.max(...sizes))}` : ''}${ties ? `, or 0 in the ${ties === 1 ? 'unit' : `${ties} units`} where the two are equal` : ''}. How far apart the two examples were is gone; only which one is bigger survives.`;
    } else if (broken === 1 && size === 1 && norm === 'bn') {
        message = `A batch of 1: every value is its own mean, σ² = 0, so every x̂ = 0 / √ε = 0 and y = β = ${vec(beta)} whatever the input. Switch to layer norm and the same single example normalises fine.`;
    }

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    {[['bn', 'Batch norm'], ['ln', 'Layer norm']].map(([key, label]) => (
                        <button key={key} onClick={() => setNorm(key)} aria-pressed={norm === key}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${norm === key ? 'border-orange-500 bg-orange-500/15 text-orange-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>{label}</button>
                    ))}
                    <label className="flex items-center gap-2 text-xs text-slate-400 ml-2">
                        batch size <span className="font-mono text-slate-200 w-3">{size}</span>
                        <input type="range" min="1" max={MAX_B} value={size} onChange={e => { setSize(Number(e.target.value)); setBroken(null); }} className="w-24 accent-orange-500" aria-label="Batch size" />
                    </label>
                    <button onClick={() => setSwap(s => !s)} disabled={size < 2} aria-pressed={swap}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-40 ${swap ? 'border-amber-500 bg-amber-500/15 text-amber-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                        <Replace className="h-3.5 w-3.5" />Swap example {size}
                    </button>
                    <button onClick={() => { setSeed(randomSeed()); setSwap(false); }} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-slate-700 text-slate-300 hover:text-white ml-auto" aria-label="New random batch">
                        <Shuffle className="h-3.5 w-3.5" />New batch
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Grid title="X (click a cell)" shape={[rows.length, D]} rows={rows} fmt={f1} onSelect={(a, b) => setSel({ i: a, j: b })}
                        mark={(a, b) => (a === i && b === j ? 'focus' : null)}
                        footers={norm === 'bn' ? [{ label: 'μ', values: out.mu }, { label: '√(σ²+ε)', values: out.sd }] : []}
                        sides={norm === 'ln' ? [{ label: 'μ', values: out.mu }, { label: '√(σ²+ε)', values: out.sd }] : []} />
                    <Grid title="Y = γ x̂ + β" shape={[rows.length, D]} rows={out.y} tint onSelect={(a, b) => setSel({ i: a, j: b })}
                        mark={(a, b) => (a === i && b === j ? 'focus' : swap && a < rows.length - 1 && Math.abs(out.y[a][b] - before.y[a][b]) > 1e-12 ? 'moved' : null)} />
                </div>
                {swap && (
                    <p className="text-xs text-amber-200">
                        Example {size} swapped for {vec(batch.spare, v => numD(v, 1))}. {norm === 'bn'
                            ? `${out.y.slice(0, -1).flat().filter((v, k) => Math.abs(v - before.y[Math.floor(k / D)][k % D]) > 1e-12).length} of the other ${(rows.length - 1) * D} outputs moved (amber).`
                            : 'Layer norm: none of the other examples moved.'}
                    </p>
                )}
                <div className="text-slate-100 text-sm overflow-x-auto overflow-y-hidden">
                    <Tex block>{tex(String.raw`\begin{gathered} \hat{x}_{${i + 1}${j + 1}} = \frac{${numD(rows[i][j], 1)} - ${num(mu)}}{\sqrt{${num(vr)} + 0.00001}} = ${num(out.xhat[i][j])} \\ y = ${num(gamma[j])} \cdot ${par(num(out.xhat[i][j]))} + ${num(beta[j])} = ${num(out.y[i][j])} \end{gathered}`)}</Tex>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[['γ', gamma, setGamma, 0, 3], ['β', beta, setBeta, -3, 3]].map(([label, arr, setArr, lo, hi]) => (
                        <label key={label} className="flex items-center gap-2 text-xs text-slate-400">
                            {label} of unit {j + 1}
                            <input type="range" min={lo} max={hi} step="0.1" value={arr[j]} onChange={e => setUnit(arr, setArr, Number(e.target.value))} className="flex-1 accent-orange-500" aria-label={`${label} of unit ${j + 1}`} />
                            <span className="font-mono text-slate-200 w-9 text-right">{numD(arr[j], 1)}</span>
                        </label>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => breakIt(2)} disabled={broken === 2}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 disabled:opacity-40">Batch of 2</button>
                    <button onClick={() => breakIt(1)} disabled={broken === 1}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 disabled:opacity-40">Batch of 1</button>
                    <button onClick={repair}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"><Wrench className="h-3.5 w-3.5" />Repair</button>
                </div>
                {message && <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 text-sm text-amber-100 leading-relaxed">{message}</div>}
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400">10-layer net:</span>
                    {[[true, 'Batch norm'], [false, 'None']].map(([on, label]) => (
                        <button key={label} onClick={() => setDeepBn(on)} aria-pressed={deepBn === on}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${deepBn === on ? 'border-orange-500 bg-orange-500/15 text-orange-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>{label}</button>
                    ))}
                    <span className="text-xs text-slate-400 ml-2">weights ×</span>
                    {SCALES.map(sc => (
                        <button key={sc} onClick={() => setScale(sc)} aria-pressed={scale === sc}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${scale === sc ? 'border-orange-500 bg-orange-500/15 text-orange-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>{sc}</button>
                    ))}
                </div>
                <DeepView run={deep} ghost={scale === 1 ? null : deepRef} ranges={deepRanges} />
                <p className="text-xs text-slate-400 leading-relaxed">
                    ‖∂s/∂X‖ = {sci(deep.grad[0])}, ×{numD(deep.perLayer, 2)} per layer.{scale !== 1 && (deepBn
                        ? ` Faded: weights ×1. With batch norm the final activations differ from the ×1 run by at most ${sci(maxDiff(deep.out, deepRef.out))}${scale < 1
                            ? `: at ×${scale} the smallest unit variance is only ${Math.round(deep.minVar / EPS).toLocaleString('en-US')} times ε, so ε no longer vanishes next to σ²`
                            : `, ε's doing: in the ×1 run the smallest unit variance is ${Math.round(deepRef.minVar / EPS).toLocaleString('en-US')} times ε, at ×${scale} ${Math.round(deep.minVar / EPS).toLocaleString('en-US')} times`}.`
                        : ` Faded: weights ×1, whose input gradient is ${sci(deepRef.grad[0])}.`)}
                </p>
            </div>
        </div>
    );
}

/* ── the page ──────────────────────────────────────────── */

export default function NormalizationPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const tour = useMemo(() => tourOf(seed), [seed]);
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

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/neural-networks" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Neural Networks
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Normalization</h1>
                    <p className="text-orange-100 max-w-3xl">
                        Subtract the mean, divide by the spread, then let γ and β put back what training wants. Batch norm and layer norm, computed on a batch small enough to read, and what they do to a deep network.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Vanishing and Exploding Gradients', '/neural-networks/vanishing-and-exploding-gradients'], ['Forward Pass', '/neural-networks/forward-pass']].map(([name, href]) => (
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
                        <SourceChip kind="live">Every number computed in your browser from seeded random batches and weights</SourceChip>
                    </div>

                    {mode === 'explore' ? <Lab /> : (
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
                                    <div className="min-h-[300px]">
                                        <StepView step={step} tour={tour} />
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
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New batch and network" title="New batch and network"
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

                    <InCode title="The same batch in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-1">The recipe</h2>
                        <p className="text-xs text-slate-500 mb-3">The same two lines; only the axis of μ and σ² changes.</p>
                        <div className="space-y-2 text-slate-200 text-xs">
                            {[
                                String.raw`\hat{x} = \frac{x - \mu}{\sqrt{\sigma^2 + \varepsilon}}`,
                                String.raw`y = \gamma\,\hat{x} + \beta`,
                            ].map(line => <div key={line} className="overflow-x-auto overflow-y-hidden py-0.5"><Tex>{line}</Tex></div>)}
                        </div>
                        <table className="w-full text-xs mt-4">
                            <thead>
                                <tr className="text-slate-500"><th className="text-left font-medium pb-1"></th><th className="text-left font-medium pb-1">batch norm</th><th className="text-left font-medium pb-1">layer norm</th></tr>
                            </thead>
                            <tbody className="text-slate-300">
                                <tr className="border-t border-slate-800"><td className="py-1 pr-2 text-slate-500">μ, σ² over</td><td className={mode === 'guided' && step.act === 1 ? 'text-orange-200' : ''}>the batch, per unit</td><td className={mode === 'guided' && step.act === 3 ? 'text-orange-200' : ''}>the units, per example</td></tr>
                                <tr className="border-t border-slate-800"><td className="py-1 pr-2 text-slate-500">depends on batch mates</td><td className={mode === 'guided' && step.act === 4 ? 'text-orange-200' : ''}>yes</td><td>no</td></tr>
                                <tr className="border-t border-slate-800"><td className="py-1 pr-2 text-slate-500">at inference</td><td className={mode === 'guided' && step.kind === 'eval' ? 'text-orange-200' : ''}>running averages</td><td>same as training</td></tr>
                                <tr className="border-t border-slate-800"><td className="py-1 pr-2 text-slate-500">used in</td><td>CNNs</td><td>transformers</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;Batch norm normalises each example on its own.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed mb-3">
                            Its statistics come from the whole batch, so changing one example moves everyone else&apos;s output. Over {NORM_STUDY.n.toLocaleString('en-US')} seeded batches, redrawing the last example moved example 1&apos;s x̂ by a median of:
                        </p>
                        <table className="w-full text-xs">
                            <thead><tr className="text-slate-500"><th className="text-left font-medium pb-1">batch size</th><th className="text-left font-medium pb-1">batch norm</th><th className="text-left font-medium pb-1">layer norm</th></tr></thead>
                            <tbody className="font-mono text-slate-300">
                                {NORM_STUDY.sizes.map((n, k) => (
                                    <tr key={n} className="border-t border-slate-800"><td className="py-1">{n}</td><td>{NORM_STUDY.medians[k]}</td><td>0</td></tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">Bigger batches dilute the effect, which is one reason batch norm wants them; layer norm never has it.</p>
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
