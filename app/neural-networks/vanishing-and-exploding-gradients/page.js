"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, SlidersHorizontal, Shuffle,
    Link2, TrendingDown, Zap, TrendingUp, Ruler, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import Tex from '@/components/math/Tex';
import Heatmap from '@/components/ml/Heatmap';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the networks ──────────────────────────────────────────
   Twelve layers of eight units and no biases: z_k = W_k h_{k−1}, h_k = f(z_k),
   with x = h_0 eight standard normals. The output is a score s = v · h_12 for a
   unit vector v, so backprop starts from δ_12 = ∂s/∂h_12 = v, norm 1, and each
   layer sends back δ_{k−1} = W_kᵀ (f′(z_k) ⊙ δ_k). Every W_k is one fixed
   matrix of standard normals times the init's standard deviation, so changing
   the init changes only the scale. */
const N = 8;
const DEPTH = 12;
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const ACTIVATIONS = {
    sigmoid: { name: 'Sigmoid', f: sigmoid, d: (z, h) => h * (1 - h) },
    tanh: { name: 'tanh', f: Math.tanh, d: (z, h) => 1 - h * h },
    relu: { name: 'ReLU', f: (z) => (z > 0 ? z : 0), d: (z) => (z > 0 ? 1 : 0) },
};
/** nVar is n · Var(w), the first part of each layer's expected squared factor. */
const INITS = {
    default: { name: 'PyTorch default', variance: '1/(3n)', nVar: 1 / 3, std: 1 / Math.sqrt(3 * N) },
    xavier: { name: 'Xavier', variance: '1/n', nVar: 1, std: 1 / Math.sqrt(N) },
    he: { name: 'He', variance: '2/n', nVar: 2, std: Math.sqrt(2 / N) },
    big: { name: '2× He', variance: '8/n', nVar: 8, std: 2 * Math.sqrt(2 / N) },
};
const TOUR_CONFIGS = [['sigmoid', 'default'], ['tanh', 'default'], ['tanh', 'xavier'], ['relu', 'default'], ['relu', 'he'], ['relu', 'big']];

function makeNet(seed) {
    const rng = createRng(seed * 13 + 5);
    const x = Array.from({ length: N }, () => rng.normal());
    const v0 = Array.from({ length: N }, () => rng.normal());
    const len = Math.hypot(...v0);
    const Z = Array.from({ length: DEPTH }, () => Array.from({ length: N }, () => Array.from({ length: N }, () => rng.normal())));
    return { seed, x, v: v0.map(a => a / len), Z };
}

const norm = (a) => Math.hypot(...a);

/** The forward and backward pass. Arrays run over k = 0 … 12; z, fp and u are null at 0. */
function runNet(net, act, init) {
    const A = ACTIVATIONS[act], s = INITS[init].std;
    const W = net.Z.map(M => M.map(row => row.map(w => s * w)));
    const h = [net.x], z = [null], fp = [null];
    for (let k = 1; k <= DEPTH; k++) {
        const zk = W[k - 1].map(row => row.reduce((acc, w, j) => acc + w * h[k - 1][j], 0));
        const hk = zk.map(A.f);
        z.push(zk); h.push(hk); fp.push(zk.map((zz, i) => A.d(zz, hk[i])));
    }
    const delta = new Array(DEPTH + 1).fill(null), u = new Array(DEPTH + 1).fill(null);
    delta[DEPTH] = net.v.slice();
    for (let k = DEPTH; k >= 1; k--) {
        u[k] = delta[k].map((g, i) => g * fp[k][i]);
        delta[k - 1] = Array.from({ length: N }, (_, j) => W[k - 1].reduce((acc, row, i) => acc + row[j] * u[k][i], 0));
    }
    const norms = delta.map(norm);
    // ∂s/∂W_k = u_k h_{k−1}ᵀ, an outer product, so its norm is ‖u_k‖ ‖h_{k−1}‖
    const wGrad = [null, ...Array.from({ length: DEPTH }, (_, i) => norm(u[i + 1]) * norm(h[i]))];
    // the mean of f′(z)² over every unit of every layer: the E[f′(z)²] of the rule
    const meanFp2 = fp.slice(1).flat().reduce((a, b) => a + b * b, 0) / (DEPTH * N);
    return {
        act, init, W, h, z, fp, u, delta, norms, wGrad, meanFp2,
        expected: INITS[init].nVar * meanFp2,
        average: norms[0] ** (1 / DEPTH),
    };
}

/** The deepest layer whose units are all off for this input (ReLU only), or 0. Scale does not
    change which units are on, so this is the same at every init. */
function deadLayer(net) {
    const r = runNet(net, 'relu', 'he');
    for (let k = DEPTH; k >= 1; k--) if (r.fp[k].every(v => v === 0)) return k;
    return 0;
}

/* ── one path: a chain of single tanh units ────────────────
   h_k = tanh(w_k h_{k−1}) and s = h_12, so ∂s/∂h_0 is the product of the
   twelve link factors w_k (1 − h_k²). Weights are ±0.5 to ±2.3 and the input
   ±0.3 to ±0.9, both to two decimals; the quartiles of |∂s/∂h_0| then fall
   near 10⁻⁴, 10⁻³ and 10⁻², the prompt's bucket edges. */
const r2 = (v) => Math.round(v * 100) / 100;
function makeChain(seed) {
    const rng = createRng(seed * 7 + 1);
    const h = [r2(rng.pick([-1, 1]) * (0.3 + 0.6 * rng.next()))];
    const w = [null];
    for (let k = 1; k <= DEPTH; k++) {
        w.push(r2(rng.pick([-1, 1]) * (0.5 + 1.8 * rng.next())));
        h.push(Math.tanh(w[k] * h[k - 1]));
    }
    const factor = [null, ...Array.from({ length: DEPTH }, (_, i) => w[i + 1] * (1 - h[i + 1] ** 2))];
    const delta = new Array(DEPTH + 1).fill(null);
    delta[DEPTH] = 1;
    for (let k = DEPTH; k >= 1; k--) delta[k - 1] = factor[k] * delta[k];
    return { w, h, factor, delta };
}

const EDGES = [-2, -3, -4];          // log₁₀ of |∂s/∂h_0| between the four answers
const MARGIN = 0.15;                 // closer than this to an edge, the tour does not ask
const BUCKETS = ['Above 0.01', 'Between 0.001 and 0.01', 'Between 0.0001 and 0.001', 'Below 0.0001'];
const bucketOf = (v) => EDGES.filter(e => Math.log10(Math.abs(v)) < e).length;
const nearEdge = (v) => EDGES.some(e => Math.abs(Math.log10(Math.abs(v)) - e) < MARGIN);

/* ── numbers ───────────────────────────────────────────── */

const numD = (v, d) => {
    const s = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(/\.?0+$/, '');
    return (s === '-0' ? '0' : s).replace('-', '−');
};
const num = (v) => numD(v, 4);
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
/** 3 significant digits between 0.01 and 1000, else m × 10ᵉ. */
const sci = (v) => {
    if (v === 0) return '0';
    if (mid(v)) return p3(v);
    const { sign, m, e } = mant(v);
    return `${sign}${m} × 10${sup(e)}`;
};
const sciTex = (v) => {
    if (v === 0) return '0';
    if (mid(v)) return p3(v).replace('−', '-');
    const { sign, m, e } = mant(v);
    return `${sign ? '-' : ''}${m} \\times 10^{${e}}`;
};
/** Compact form for chart labels: 2.6e−11. */
const short = (v) => {
    if (v === 0) return '0';
    if (mid(v)) return p3(v);
    const { sign, m, e } = mant(v);
    return `${sign}${m}e${e < 0 ? '−' : ''}${Math.abs(e)}`;
};
const cell = (v) => (v === 0 ? '0' : Math.abs(v) >= 0.001 ? num(v) : short(v));
const tex = (s) => s.replace(/−/g, '-');

/* ── the guided tour ─────────────────────────────────────── */

const ACTS = [
    { id: 1, label: 'One path', icon: Link2 },
    { id: 2, label: 'Sigmoid', icon: TrendingDown },
    { id: 3, label: 'ReLU alone', icon: Zap },
    { id: 4, label: 'Too big', icon: TrendingUp },
    { id: 5, label: 'Careful init', icon: Ruler },
];
const DEFAULT_SEED = 211;     // a typical net: sigmoid and He near their medians, the prompt asked
const CHAIN_LINKS = [12, 11, 10];

/** The tour's chain and network. A net in which some layer has every ReLU unit off for this input
    (35 of 1,000) sends back exactly 0 at every scale; the tour moves on to the next such seed and
    leaves those nets to Explore. */
function tourOf(seed) {
    const chain = makeChain(seed);
    let netSeed = seed;
    while (deadLayer(makeNet(netSeed))) netSeed += 7919;
    const net = makeNet(netSeed);
    const runs = Object.fromEntries(TOUR_CONFIGS.map(([a, i]) => [`${a}-${i}`, runNet(net, a, i)]));
    return { chain, net, runs, ask: !nearEdge(chain.delta[0]) };
}

function generateSteps(seed) {
    const T = tourOf(seed);
    const { chain: C, runs } = T;
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, config: null, k: null, ghost: null, ask: false, ...data, explanation });

    /* Act 1: one path */
    s(1, 'One path', {
        kind: 'chainIntro', upto: DEPTH, factorsFrom: DEPTH + 1,
        tex: String.raw`\begin{gathered} h_k = \tanh(w_k\, h_{k-1}), \qquad s = h_{12} \\ \frac{\partial s}{\partial h_{12}} = 1 \end{gathered}`,
    }, `Start with the thinnest network there is: twelve layers of one tanh unit each. The forward pass is done: x = h₀ = ${num(C.h[0])} goes in, each layer multiplies by its weight and squashes, and out comes s = h₁₂ = ${num(C.h[DEPTH])}. Backprop starts from ∂s/∂h₁₂ = 1 and walks back one link at a time.`);
    for (const k of CHAIN_LINKS) {
        const f = C.factor[k];
        const note = k === DEPTH
            ? ' tanh′(z) = 1 − h², read straight off the unit\'s output. It is at most 1, so a link can grow the gradient only if |w| > 1, and then only while h stays well away from ±1.'
            : '';
        s(1, 'One path', {
            kind: 'chainLink', k, upto: k - 1, factorsFrom: k,
            tex: tex(String.raw`\begin{gathered} \frac{\partial s}{\partial h_{${k - 1}}} = w_{${k}}\,(1 - h_{${k}}^2)\,\frac{\partial s}{\partial h_{${k}}} \\ = (${num(C.w[k])})\,(1 - ${num(C.h[k])}^2)\,(${sciTex(C.delta[k])}) = ${sciTex(C.delta[k - 1])} \end{gathered}`),
        }, `Link ${k}: the chain rule multiplies by this link's local derivative, w × tanh′(z) = ${num(C.w[k])} × (1 − ${num(C.h[k])}²) = ${num(f)}.${note} ${Math.abs(f) > 1 ? 'This link grows the gradient' : 'This link shrinks the gradient'}: ∂s/∂h${sub(k - 1)} = ${sci(C.delta[k - 1])}.`);
    }
    const logSum = C.factor.slice(1).reduce((a, f) => a + Math.log10(Math.abs(f)), 0);
    const listed = C.factor.slice(1).map(f => `×${p2(f)}`).join(', ');
    s(1, 'One path', {
        kind: 'chainAll', upto: CHAIN_LINKS[CHAIN_LINKS.length - 1] - 1, factorsFrom: 1, ask: T.ask, d0: C.delta[0], logSum,
        tex: String.raw`\frac{\partial s}{\partial h_0} = \prod_{k=1}^{12} w_k\,(1 - h_k^2)`,
    }, `All twelve link factors are on the picture now, from link 1 to link 12: ${listed}. The gradient at the input is their product. Multiplying twelve numbers is easier in logs: each factor adds its log₁₀.`);
    const below = C.factor.slice(1).filter(f => Math.abs(f) < 1).length;
    s(1, 'One path', {
        kind: 'chainDone', upto: 0, factorsFrom: 1, d0: C.delta[0], logSum,
        tex: tex(String.raw`\begin{gathered} \log_{10}\left|\frac{\partial s}{\partial h_0}\right| = \sum_{k=1}^{12} \log_{10}|w_k\,(1 - h_k^2)| = ${numD(logSum, 2)} \\ \frac{\partial s}{\partial h_0} = ${sciTex(C.delta[0])} \end{gathered}`),
    }, `The logs add up to ${numD(logSum, 2)}, so ∂s/∂h₀ = ${sci(C.delta[0])}. ${below} of the 12 factors are below 1 in size. Depth turns factors into powers: twelve factors of 0.5 leave 0.5¹² = 0.00024, twelve of 2 make 4,096. Over ${CHAIN_STUDY.n.toLocaleString('en-US')} chains like this one the median |∂s/∂h₀| is ${sci(CHAIN_STUDY.median)} and ${CHAIN_STUDY.grew === 0 ? 'none' : `only ${CHAIN_STUDY.grew}`} grew past 1: a link that saturates its unit costs far more than a big weight gains.`);

    /* Act 2: sigmoid at PyTorch's default scale */
    const SD = runs['sigmoid-default'];
    s(2, 'Sigmoid', {
        kind: 'netIntro', config: 'sigmoid-default', upto: DEPTH,
        tex: String.raw`\begin{gathered} \delta_{k-1} = W_k^{\top}\big(f'(z_k) \odot \delta_k\big), \qquad \|\delta_{12}\| = \|v\| = 1 \\ \sigma'(z) = h\,(1 - h) \le 0.25 \end{gathered}`,
    }, `Now eight units per layer, twelve layers, sigmoid, and weights at PyTorch's default scale: variance 1/(3n) = 1/24 for n = 8 inputs. The output is a score s = v · h₁₂ for a fixed unit vector v, so the gradient starts as δ₁₂ = v, with norm 1. Each layer sends it back in two moves: multiply every entry by its unit's slope f′(z), then by Wᵀ. A sigmoid's slope is h(1 − h), never more than 0.25.`);
    for (const k of [12, 11]) {
        const fpk = SD.fp[k], uN = norm(SD.u[k]);
        s(2, 'Sigmoid', {
            kind: 'layer', config: 'sigmoid-default', k, upto: k - 1,
            tex: tex(String.raw`\begin{gathered} \|f'(z_{${k}}) \odot \delta_{${k}}\| = ${sciTex(uN)} \\ \|\delta_{${k - 1}}\| = \|W_{${k}}^{\top}(f'(z_{${k}}) \odot \delta_{${k}})\| = ${sciTex(SD.norms[k - 1])} \end{gathered}`),
        }, `Layer ${k}: the eight slopes f′(z${sub(k)}) run from ${num(Math.min(...fpk))} to ${num(Math.max(...fpk))}, so multiplying by them keeps ${p2(uN / SD.norms[k])} of the gradient's size. Wᵀ then ${SD.norms[k - 1] > uN ? 'stretches' : 'shrinks'} it by ${p2(SD.norms[k - 1] / uN)}. Together this layer multiplies ‖δ‖ by ${p2(SD.norms[k - 1] / SD.norms[k])}: ‖δ${sub(k - 1)}‖ = ${sci(SD.norms[k - 1])}.`);
    }
    const wRatio = SD.wGrad[1] / SD.wGrad[DEPTH];
    s(2, 'Sigmoid', {
        kind: 'ladder', config: 'sigmoid-default', upto: 0,
        tex: tex(String.raw`\|\delta_0\| = ${sciTex(SD.norms[0])}, \qquad \|\delta_0\|^{1/12} = ${num(SD.average)} \text{ per layer}`),
    }, `All twelve layers: the gradient reaching the input is ‖δ₀‖ = ${sci(SD.norms[0])}, an average factor of ${num(SD.average)} per layer. The weights feel it too: ∂s/∂W₁ = u₁h₀ᵀ has norm ${sci(SD.wGrad[1])}, against ${sci(SD.wGrad[DEPTH])} for the last layer's. With one learning rate for all of them, an SGD step moves the last layer's weights ${sci(1 / wRatio)} times further than the first layer's.`);

    /* Act 3: ReLU at the same scale */
    const RD = runs['relu-default'];
    const on = RD.meanFp2;
    s(3, 'ReLU alone', {
        kind: 'netIntro', config: 'relu-default', upto: DEPTH, ghost: 'sigmoid-default',
        tex: tex(String.raw`\begin{gathered} \text{ReLU}'(z) \in \{0, 1\} \\ n\,\mathrm{Var}(w)\,\mathbb{E}[f'(z)^2] = 8 \cdot \tfrac{1}{24} \cdot ${num(on)} = ${num(RD.expected)} \end{gathered}`),
    }, `Swap the sigmoid for ReLU, same weights. A ReLU's slope is 1 for a unit that is on and 0 for one that is off, so nothing saturates. Wᵀ still sets the size: with variance 1/24 per weight, a layer multiplies the gradient's squared size by about n · Var(w) · E[f′(z)²] = 8 × 1/24 × ${num(on)} = ${num(RD.expected)}, where ${num(on)} is the share of units that are on in this net.`);
    const offs = RD.fp[DEPTH].filter(v => v === 0).length;
    s(3, 'ReLU alone', {
        kind: 'layer', config: 'relu-default', k: DEPTH, upto: DEPTH - 1, ghost: 'sigmoid-default',
        tex: tex(String.raw`\begin{gathered} \|f'(z_{12}) \odot \delta_{12}\| = ${sciTex(norm(RD.u[DEPTH]))} \\ \|\delta_{11}\| = \|W_{12}^{\top}(f'(z_{12}) \odot \delta_{12})\| = ${sciTex(RD.norms[DEPTH - 1])} \end{gathered}`),
    }, `Layer 12: ${offs} of the 8 units are off (z ≤ 0), so their entries of δ₁₂ are zeroed and the rest pass unchanged. Then Wᵀ, with its small weights, ${RD.norms[DEPTH - 1] > norm(RD.u[DEPTH]) ? 'stretches' : 'shrinks'} what is left by ${p2(RD.norms[DEPTH - 1] / norm(RD.u[DEPTH]))}: ‖δ₁₁‖ = ${sci(RD.norms[DEPTH - 1])}.`);
    s(3, 'ReLU alone', {
        kind: 'ladder', config: 'relu-default', upto: 0, ghost: 'sigmoid-default',
        tex: tex(String.raw`\|\delta_0\| = ${sciTex(RD.norms[0])}, \qquad \|\delta_0\|^{1/12} = ${num(RD.average)} \text{ per layer}`),
    }, `‖δ₀‖ = ${sci(RD.norms[0])}, an average factor of ${num(RD.average)} per layer. Far better than the sigmoid's ${sci(SD.norms[0])} (faded bars), and still vanished: ReLU removed the saturation, but the weights are too small for the gradient to keep its size.`);

    /* Act 4: weights twice He's */
    const RB = runs['relu-big'], c = INITS.big.std / INITS.default.std;
    s(4, 'Too big', {
        kind: 'ladder', config: 'relu-big', upto: 0, ghost: 'relu-default',
        tex: tex(String.raw`\begin{gathered} \frac{\|\delta_0\|_{2\times\text{He}}}{\|\delta_0\|_{\text{default}}} = \left(\frac{${num(INITS.big.std)}}{${num(INITS.default.std)}}\right)^{12} = ${num(c)}^{12} = ${sciTex(c ** DEPTH)} \\ \|\delta_0\| = ${sciTex(RB.norms[0])} \end{gathered}`),
    }, `Scale every weight up by ${num(c)}, to a standard deviation of 2√(2/n) = ${num(INITS.big.std)}. With no biases, every z is only multiplied by a positive number, so exactly the same units are on, every layer's factor is ${num(c)} times larger, and the input gradient is ${num(c)}¹² = ${sci(c ** DEPTH)} times bigger: ‖δ₀‖ = ${sci(RB.norms[0])}. An SGD step of η × ${p3(RB.norms[0])} would throw the first layer's weights far across the loss surface: an exploding gradient.`);

    /* Act 5: He */
    const RH = runs['relu-he'];
    s(5, 'Careful init', {
        kind: 'ladder', config: 'relu-he', upto: 0, ghost: 'relu-default',
        tex: tex(String.raw`\begin{gathered} n\,\mathrm{Var}(w)\,\mathbb{E}[f'(z)^2] = 8 \cdot \tfrac{2}{8} \cdot ${num(RH.meanFp2)} = ${num(RH.expected)} \\ \|\delta_0\| = ${sciTex(RH.norms[0])} \end{gathered}`),
    }, `He initialisation picks Var(w) = 2/n, so that n · Var(w) · ½ = 1: each layer keeps the gradient's squared size on average. Here ‖δ₀‖ = ${sci(RH.norms[0])}: no steady slide, only the wobble of twelve random layers 8 units wide. Over ${VEG_STUDY.n.toLocaleString('en-US')} such nets the mean of ‖δ₀‖² is ${p2(VEG_STUDY.heMeanSq)}, while the median ‖δ₀‖ is ${p2(VEG_STUDY.he)}: a product of random factors is usually below its average. Wider layers wobble less: the median is ${p2(VEG_STUDY.widths[16][0])} at width 16, ${p2(VEG_STUDY.widths[32][0])} at 32 and ${p2(VEG_STUDY.widths[64][0])} at 64.`);
    const TX = runs['tanh-xavier'], TD = runs['tanh-default'];
    s(5, 'Careful init', {
        kind: 'compare', config: 'relu-he', upto: 0, ghost: 'sigmoid-default',
        tex: String.raw`n\,\mathrm{Var}(w)\,\mathbb{E}\big[f'(z)^2\big] \approx 1`,
    }, `The rule behind every act: keep n · Var(w) · E[f′(z)²] near 1. For ReLU E[f′²] is about ½, so Var(w) = 2/n (He). tanh's slope is near 1 for small z, so Xavier's 1/n comes close: ‖δ₀‖ = ${sci(TX.norms[0])} here, against ${sci(TD.norms[0])} at the default scale. A sigmoid caps E[f′²] at 1/16, which no sensible scale makes up for. The table lists all six runs on this net.`);
    return steps;
}

function predictFor(step, next) {
    if (!step || !next || !step.ask || next.kind !== 'chainDone') return null;
    const b = bucketOf(next.d0);
    return {
        question: 'The gradient at the input is the product of these twelve link factors. How big is |∂s/∂h₀|?',
        options: BUCKETS,
        correct: b,
        because: `The factors' log₁₀s add up to ${numD(next.logSum, 2)}, so |∂s/∂h₀| = 10^(${numD(next.logSum, 2)}) = ${sci(Math.abs(next.d0))}: ${BUCKETS[b].toLowerCase()}.`,
    };
}

/* ── the measured misconception ────────────────────────────
   1,000 nets (seeds 1–1,000 through makeNet), each run at every activation
   and scale: the median ‖δ_0‖, the mean of ‖δ_0‖² for He, how many nets have
   a layer with every ReLU unit off (gradient exactly 0 at every scale), and
   He's median and mean square at widths 16, 32 and 64 (300 nets each, same
   construction with n units). CHAIN_STUDY runs makeChain over seeds 1–1,000.
   Both are rerun by the test suite. */
const VEG_STUDY = {
    n: 1000,
    sigmoid: 2.6e-11, tanhDefault: 4.3e-4, tanhXavier: 0.087, reluDefault: 2.2e-6, he: 0.1, big: 429,
    heMeanSq: 1.7, dead: 35,
    widths: { 16: [0.41, 0.91], 32: [0.63, 0.87], 64: [0.8, 0.92] },
};
const CHAIN_STUDY = { n: 1000, median: 0.0011, grew: 0 };

const quizQuestions = [
    {
        question: 'Backprop multiplies the gradient by one factor per layer. If each of 12 factors is about 0.5, roughly what is left of a gradient that started at 1?',
        options: [
            '0.5 × 12 = 6',
            'About 0.5',
            'About 0.0002, since 0.5¹² = 1/4096',
            'Exactly 0',
        ],
        correct: 2,
        explanation: 'Factors multiply, so depth becomes an exponent: 0.5¹² = 1/4096 ≈ 0.00024. In logs, twelve factors of 0.5 each subtract 0.3 from log₁₀, for −3.6 in total.',
    },
    {
        question: 'Why does a deep sigmoid network lose its gradient even when its weights are around 1?',
        options: [
            'Sigmoid outputs are always positive',
            'σ′(z) = σ(z)(1 − σ(z)) is at most 0.25, so every layer multiplies the gradient by roughly 0.25 × |w| or less',
            'The sigmoid has no derivative at z = 0',
            'Sigmoid networks cannot have weights above 1',
        ],
        correct: 1,
        explanation: 'The slope peaks at 0.25 at z = 0 and falls off on both sides. A factor of 0.25 per layer is 0.25¹² ≈ 6 × 10⁻⁸ after 12 layers; the default weight scale makes it smaller still.',
    },
    {
        question: 'A 12-layer ReLU network without biases has every weight multiplied by 2. What happens to the gradient that reaches the input?',
        options: [
            'It doubles',
            'It is multiplied by exactly 2¹² = 4,096',
            'Nothing, because ReLU′ is always 0 or 1',
            'It halves',
        ],
        correct: 1,
        explanation: 'Doubling the weights doubles every z, which does not change which units are on. Each layer\'s Wᵀ is twice as big, so each factor doubles, and twelve layers multiply the gradient by 2¹².',
    },
];

const codeExample = `import torch

def input_grad(act, init, seed):
    torch.manual_seed(seed)
    layers = [torch.nn.Linear(8, 8) for _ in range(12)]
    for layer in layers:
        torch.nn.init.zeros_(layer.bias)
        if init == "he":
            torch.nn.init.kaiming_normal_(layer.weight, nonlinearity="relu")
    x = torch.randn(8, requires_grad=True)
    v = torch.randn(8)
    h = x
    for layer in layers:
        h = act(layer(h))
    ((v / v.norm()) @ h).backward()    # s = v·h, so the gradient starts with norm 1
    return x.grad.norm().item()

def median(act, init):
    return torch.tensor([input_grad(act, init, s) for s in range(1000)]).median().item()

print(f"{median(torch.sigmoid, 'default'):.1e}")   # 3.3e-11  -> nn.Linear's own init
print(f"{median(torch.relu, 'default'):.1e}")      # 3.2e-06  -> ReLU alone
print(f"{median(torch.relu, 'he'):.1e}")           # 9.7e-02  -> He init`;

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

const LW = 640, LH = 236, LPAD = { l: 52, r: 12, t: 22, b: 30 };
const barX = (k) => LPAD.l + 10 + k * ((LW - LPAD.l - LPAD.r - 20) / DEPTH);
const BAR_W = 24;

/** ‖δ_k‖ for k = 0 … 12 as bars on a log axis. Bars below `upto` are not computed yet. A ghost
    run is drawn faded behind. Clicking a bar (k ≥ 1) selects that layer when onSelect is given. */
function Ladder({ norms, upto = 0, current = null, ghost = null, range = [-12, 5], color = '#fb923c', onSelect, ariaLabel }) {
    const [lo, hi] = range;
    const y = (v) => {
        const l = Math.max(lo, Math.min(hi, Math.log10(v)));
        return Math.round((LPAD.t + (1 - (l - lo) / (hi - lo)) * (LH - LPAD.t - LPAD.b)) * 100) / 100;
    };
    const base = LH - LPAD.b;
    const ticks = [];
    const step = hi - lo > 10 ? 4 : 2;
    for (let e = Math.ceil(lo / step) * step; e <= hi; e += step) ticks.push(e);
    if (!ticks.includes(0) && lo <= 0 && hi >= 0) ticks.push(0);
    return (
        <svg viewBox={`0 0 ${LW} ${LH}`} width="100%" role="img" aria-label={ariaLabel} className="block">
            {ticks.map(e => (
                <g key={e}>
                    <line x1={LPAD.l} x2={LW - LPAD.r} y1={y(10 ** e)} y2={y(10 ** e)} stroke={e === 0 ? '#64748b' : '#1e293b'} strokeDasharray={e === 0 ? '5 4' : undefined} />
                    <text x={LPAD.l - 6} y={y(10 ** e) + 3.5} fontSize="10" textAnchor="end" fill="#64748b">{e === 0 ? '1' : `10${sup(e)}`}</text>
                </g>
            ))}
            <text x={LW - LPAD.r} y={12} fontSize="10" textAnchor="end" fill="#64748b">backprop runs right to left · ‖δₖ‖ on a log scale</text>
            {norms.map((v, k) => {
                const x = barX(k) - BAR_W / 2;
                const g = ghost ? ghost[k] : null;
                const shown = k >= upto;
                const active = current !== null && (k === current || k === current - 1);
                return (
                    <g key={k} onClick={onSelect && k >= 1 ? () => onSelect(k) : undefined} style={onSelect && k >= 1 ? { cursor: 'pointer' } : undefined}>
                        {g !== null && g > 0 && <rect x={x - 3} y={y(g)} width={BAR_W + 6} height={Math.max(0, base - y(g))} fill="#94a3b8" opacity="0.18" rx="2" />}
                        {shown && v > 0 && (
                            <rect x={x} y={y(v)} width={BAR_W} height={Math.max(1, base - y(v))} fill={color} opacity={active ? 1 : 0.75} rx="2"
                                stroke={active ? '#f8fafc' : 'none'} strokeWidth="1.5" style={{ transition: 'y .35s ease, height .35s ease' }} />
                        )}
                        {!shown && <rect x={x} y={base - 6} width={BAR_W} height={6} fill="none" stroke="#334155" strokeDasharray="2 2" rx="2" />}
                        {shown && <text x={barX(k)} y={(v > 0 ? y(v) : base) - 5} fontSize="10" textAnchor="middle" fill="#e2e8f0">{short(v)}</text>}
                        <text x={barX(k)} y={LH - 12} fontSize="10" textAnchor="middle" fill={active ? '#f8fafc' : '#64748b'}>{`h${sub(k)}`}</text>
                    </g>
                );
            })}
        </svg>
    );
}

/** The chain of single units: h_k in each node, w_k above each link, its factor below once
    backprop has reached it. */
function ChainView({ chain, factorsFrom, current }) {
    const x = (k) => 20 + k * 50;
    return (
        <svg viewBox="0 0 640 104" width="100%" role="img" aria-label="A chain of twelve single tanh units with each link's weight and factor" className="block">
            {Array.from({ length: DEPTH }, (_, i) => i + 1).map(k => {
                const hot = k === current;
                return (
                    <g key={k}>
                        <line x1={x(k - 1) + 17} x2={x(k) - 17} y1={46} y2={46} stroke={hot ? '#fb923c' : '#475569'} strokeWidth={hot ? 3 : 1.5} />
                        <text x={(x(k - 1) + x(k)) / 2} y={24} fontSize="11" textAnchor="middle" fill="#94a3b8">{numD(chain.w[k], 2)}</text>
                        {k >= factorsFrom && (
                            <text x={(x(k - 1) + x(k)) / 2} y={76} fontSize="11" textAnchor="middle" fill={Math.abs(chain.factor[k]) > 1 ? '#a3e635' : '#fb923c'}>×{p2(chain.factor[k])}</text>
                        )}
                    </g>
                );
            })}
            {chain.h.map((h, k) => (
                <g key={k}>
                    <circle cx={x(k)} cy={46} r={17} fill="#0f172a" stroke={k === current || k === current - 1 ? '#f8fafc' : '#64748b'} strokeWidth="1.5" />
                    <text x={x(k)} y={49.5} fontSize="10" textAnchor="middle" fill="#e2e8f0">{numD(h, 2)}</text>
                </g>
            ))}
            <text x={2} y={99} fontSize="10" fill="#64748b">grey: weight w · in the circle: h · orange (green if it grows the gradient): the factor w(1 − h²)</text>
        </svg>
    );
}

/** One layer's backward step as numbers: z, f′(z), δ_k, f′ ⊙ δ_k and δ_{k−1}, plus W_k. */
function LayerPanel({ run, k }) {
    const rows = [
        [`z${sub(k)}`, run.z[k]],
        [`f′(z${sub(k)})`, run.fp[k]],
        [`δ${sub(k)}`, run.delta[k]],
        [`f′ ⊙ δ${sub(k)}`, run.u[k]],
        [`δ${sub(k - 1)} = W${sub(k)}ᵀ(f′ ⊙ δ${sub(k)})`, run.delta[k - 1]],
    ];
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                Layer {k}&apos;s backward step, one row per vector <ShapeTag shape={[N]} label="each row" />
            </div>
            <div className="overflow-x-auto">
                <table className="text-[11px] font-mono w-full">
                    <thead>
                        <tr className="text-slate-500">
                            <th className="text-left font-medium pr-2 pb-1 font-sans">unit</th>
                            {Array.from({ length: N }, (_, i) => <th key={i} className="text-right font-medium px-1 pb-1">{i + 1}</th>)}
                            <th className="text-right font-medium pl-2 pb-1 font-sans">norm</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(([label, vals], r) => (
                            <tr key={label} className={`border-t border-slate-800 ${r === 4 ? 'text-orange-200' : 'text-slate-300'}`}>
                                <td className="py-1 pr-2 text-slate-400 font-sans whitespace-nowrap">{label}</td>
                                {vals.map((v, i) => <td key={i} className={`text-right px-1 ${r === 1 && v === 0 ? 'text-slate-600' : ''}`}>{cell(v)}</td>)}
                                <td className="text-right pl-2">{r >= 2 ? short(norm(vals)) : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 max-w-[260px]">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">W{sub(k)} <ShapeTag shape={[N, N]} /></div>
                    <Heatmap data={run.W[k - 1]} scale="diverging" cellSize={22} format={(v) => v.toFixed(2)}
                        rowLabels={Array.from({ length: N }, (_, i) => String(i + 1))} colLabels={Array.from({ length: N }, (_, j) => String(j + 1))}
                        ariaLabel={`Weights of layer ${k}`} />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed flex-1 min-w-[200px]">
                    Row i of W{sub(k)} holds unit i&apos;s weights, so Wᵀ sends unit i&apos;s share of the gradient back along that row. Orange is negative, blue positive. ∂s/∂W{sub(k)} = (f′ ⊙ δ{sub(k)}) h{sub(k - 1)}ᵀ, norm {short(run.wGrad[k])}.
                </p>
            </div>
        </div>
    );
}

const runKey = (run) => `${run.act}-${run.init}`;

/** All six tour runs on one net: the rule's value next to what came out. */
function RunsTable({ runs, highlight }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-slate-500">
                        <th className="text-left font-medium pb-1 pr-3">activation</th>
                        <th className="text-left font-medium pb-1 pr-3">weights</th>
                        <th className="text-left font-medium pb-1 pr-3">n · Var(w) · E[f′²]</th>
                        <th className="text-left font-medium pb-1 pr-3">‖δ₀‖</th>
                        <th className="text-left font-medium pb-1">per layer</th>
                    </tr>
                </thead>
                <tbody className="font-mono">
                    {runs.map(r => (
                        <tr key={runKey(r)} className={`border-t border-slate-800 ${runKey(r) === highlight ? 'text-orange-200' : 'text-slate-300'}`}>
                            <td className="py-1 pr-3 font-sans">{ACTIVATIONS[r.act].name}</td>
                            <td className="pr-3 font-sans">{INITS[r.init].name} ({INITS[r.init].variance})</td>
                            <td className="pr-3">{num(r.expected)}</td>
                            <td className="pr-3">{sci(r.norms[0])}</td>
                            <td>×{num(r.average)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ── explore ───────────────────────────────────────────── */

function Lab() {
    const [act, setAct] = useState('relu');
    const [init, setInit] = useState('he');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const [sel, setSel] = useState(DEPTH);
    const [broken, setBroken] = useState(null);

    const net = useMemo(() => makeNet(seed), [seed]);
    const run = useMemo(() => runNet(net, act, init), [net, act, init]);
    const byInit = useMemo(() => Object.keys(INITS).map(i => runNet(net, act, i)), [net, act]);
    const he = useMemo(() => runNet(net, 'relu', 'he'), [net]);
    const dead = useMemo(() => deadLayer(net), [net]);

    const choose = (a, i) => { setAct(a); setInit(i); setBroken(null); };
    const breakIt = (kind) => {
        if (kind === 'sigmoid') { setAct('sigmoid'); setInit('default'); }
        else { setAct('relu'); setInit('big'); }
        setBroken(kind);
    };
    const repair = () => { setAct('relu'); setInit('he'); setBroken(null); };

    let message = null;
    if (broken === 'sigmoid' && act === 'sigmoid' && init === 'default') {
        message = `Sigmoid at PyTorch's default scale: ‖δ₀‖ = ${sci(run.norms[0])} against He-ReLU's ${sci(he.norms[0])} (faded bars). The slopes are at most 0.25 and the weights small, so every layer multiplies by about ${num(run.average)}. The first layer's weight gradient is ${sci(run.wGrad[1] / run.wGrad[DEPTH])} times the last one's.`;
    } else if (broken === 'big' && act === 'relu' && init === 'big') {
        message = he.norms[0] > 0
            ? `Weights twice He's: the same units are on, every factor doubles, and ‖δ₀‖ = ${sci(run.norms[0])} is exactly ${Math.round(run.norms[0] / he.norms[0]).toLocaleString('en-US')} = 2¹² times He's ${sci(he.norms[0])}. A learning rate that suits He's gradients would multiply this one's steps by 4,096.`
            : 'Weights twice He\'s: every factor doubles, but in this net layer ' + dead + ' has every unit off, so the gradient is exactly 0 at every scale. Shuffle for another net.';
    }

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 w-20">Activation</span>
                    {Object.entries(ACTIVATIONS).map(([key, a]) => (
                        <button key={key} onClick={() => choose(key, init)} aria-pressed={act === key}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${act === key ? 'border-orange-500 bg-orange-500/15 text-orange-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>{a.name}</button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 w-20">Weights</span>
                    {Object.entries(INITS).map(([key, i]) => (
                        <button key={key} onClick={() => choose(act, key)} aria-pressed={init === key}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${init === key ? 'border-orange-500 bg-orange-500/15 text-orange-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>{i.name} · Var {i.variance}</button>
                    ))}
                    <button onClick={() => setSeed(randomSeed())} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-slate-700 text-slate-300 hover:text-white ml-auto" aria-label="New random network">
                        <Shuffle className="h-3.5 w-3.5" />New net
                    </button>
                </div>
                <Ladder norms={run.norms} current={sel} ghost={broken ? he.norms : null} onSelect={setSel}
                    ariaLabel="Gradient norm at each layer on a log scale; click a bar to see that layer's numbers" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-800 p-3">
                        <div className="text-slate-500 mb-1">gradient at the input</div>
                        <div className="font-mono text-slate-100 text-sm">‖δ₀‖ = {sci(run.norms[0])}</div>
                    </div>
                    <div className="rounded-lg border border-slate-800 p-3">
                        <div className="text-slate-500 mb-1">average factor per layer</div>
                        <div className="font-mono text-slate-100 text-sm">‖δ₀‖^(1/12) = {num(run.average)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-800 p-3 min-w-0">
                        <div className="text-slate-500 mb-1">the rule, n · Var(w) · E[f′²]</div>
                        <div className="text-slate-100 overflow-x-auto overflow-y-hidden"><Tex>{tex(String.raw`8 \cdot ${num(INITS[init].std ** 2)} \cdot ${num(run.meanFp2)} = ${num(run.expected)}`)}</Tex></div>
                    </div>
                </div>
                {dead > 0 && act === 'relu' && (
                    <p className="text-xs text-amber-200">In this net every ReLU unit of layer {dead} is off for this input, so ReLU sends back exactly 0 from there, whatever the scale.</p>
                )}
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => breakIt('sigmoid')} disabled={broken === 'sigmoid'}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 disabled:opacity-40">Sigmoid at the default scale</button>
                    <button onClick={() => breakIt('big')} disabled={broken === 'big'}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 disabled:opacity-40">Weights 2× He</button>
                    <button onClick={repair}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"><Wrench className="h-3.5 w-3.5" />Repair</button>
                </div>
                {message && (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 text-sm text-amber-100 leading-relaxed">{message}</div>
                )}
                <div>
                    <h3 className="text-xs text-slate-400 mb-2">{ACTIVATIONS[act].name} on this net at every scale</h3>
                    <RunsTable runs={byInit} highlight={`${act}-${init}`} />
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <LayerPanel run={run} k={sel} />
            </div>
        </div>
    );
}

/* ── the page ──────────────────────────────────────────── */

export default function VanishingExplodingGradientsPage() {
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
    const isChain = step.act === 1;
    const run = step.config ? tour.runs[step.config] : null;
    const ghost = step.ghost ? tour.runs[step.ghost].norms : null;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/neural-networks" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Neural Networks
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Vanishing and Exploding Gradients</h1>
                    <p className="text-orange-100 max-w-3xl">
                        Backprop multiplies the gradient by one factor per layer. Follow it back through twelve layers and watch the product shrink to nothing or blow up, then see the weight scale that keeps it alive.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Backpropagation', '/neural-networks/backpropagation'], ['Activation Functions', '/neural-networks/activation-functions']].map(([name, href]) => (
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
                        <SourceChip kind="live">Every number computed in your browser from seeded random weights</SourceChip>
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
                                        <span>{run ? `${ACTIVATIONS[run.act].name}, ${INITS[run.init].name} weights (Var ${INITS[run.init].variance})` : 'one unit per layer, tanh'}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    <div className="min-h-[300px] space-y-2">
                                        {isChain && <ChainView chain={tour.chain} factorsFrom={step.factorsFrom} current={step.k} />}
                                        <Ladder
                                            norms={isChain ? tour.chain.delta.map(Math.abs) : run.norms}
                                            upto={step.upto} current={step.k} ghost={ghost}
                                            range={isChain ? [-7, 1] : [-12, 5]}
                                            color={isChain ? '#38bdf8' : '#fb923c'}
                                            ariaLabel={isChain ? 'Size of ∂s/∂h at each unit of the chain on a log scale' : 'Gradient norm at each layer on a log scale'} />
                                        {ghost && <p className="text-[11px] text-slate-500">Faded bars: {ACTIVATIONS[tour.runs[step.ghost].act].name} at {INITS[tour.runs[step.ghost].init].name} scale, on the same net.</p>}
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
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New chain and network" title="New chain and network"
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

                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                                <div className="text-slate-100 text-sm sm:text-base overflow-x-auto overflow-y-hidden">
                                    <Tex block>{step.tex}</Tex>
                                </div>
                                {step.kind === 'layer' && run && (
                                    <div className="border-t border-slate-800 pt-4"><LayerPanel run={run} k={step.k} /></div>
                                )}
                                {step.kind === 'compare' && (
                                    <div className="border-t border-slate-800 pt-4"><RunsTable runs={TOUR_CONFIGS.map(([a, i]) => tour.runs[`${a}-${i}`])} highlight={step.config} /></div>
                                )}
                            </div>
                        </>
                    )}

                    <InCode title="The same experiment in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-1">One layer of backprop</h2>
                        <p className="text-xs text-slate-500 mb-3">From the gradient at layer k to the one below it.</p>
                        <div className="space-y-2 text-slate-200 text-xs">
                            {[
                                String.raw`u_k = f'(z_k) \odot \delta_k`,
                                String.raw`\delta_{k-1} = W_k^{\top} u_k`,
                                String.raw`\mathbb{E}\,\|\delta_{k-1}\|^2 \approx n\,\mathrm{Var}(w)\,\mathbb{E}[f'(z)^2]\;\|\delta_k\|^2`,
                            ].map(line => <div key={line} className="overflow-x-auto overflow-y-hidden py-0.5"><Tex>{line}</Tex></div>)}
                        </div>
                        <table className="w-full text-xs mt-4">
                            <thead>
                                <tr className="text-slate-500"><th className="text-left font-medium pb-1">activation</th><th className="text-left font-medium pb-1">f′(z)</th><th className="text-left font-medium pb-1">scale that keeps it</th></tr>
                            </thead>
                            <tbody className="text-slate-300">
                                <tr className={`border-t border-slate-800 ${mode === 'guided' && step.act === 2 ? 'text-orange-200' : ''}`}><td className="py-1">Sigmoid</td><td>≤ 0.25</td><td>none that is sensible</td></tr>
                                <tr className={`border-t border-slate-800 ${mode === 'guided' && step.act === 5 && step.kind === 'compare' ? 'text-orange-200' : ''}`}><td className="py-1">tanh</td><td>≤ 1</td><td>Xavier, Var 1/n</td></tr>
                                <tr className={`border-t border-slate-800 ${mode === 'guided' && step.act >= 3 ? 'text-orange-200' : ''}`}><td className="py-1">ReLU</td><td>0 or 1</td><td>He, Var 2/n</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;Switching to ReLU fixes vanishing gradients.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            ReLU removes saturation; the weight scale still decides. Over {VEG_STUDY.n.toLocaleString('en-US')} seeded 12-layer nets 8 units wide, ReLU at PyTorch&apos;s default scale left a median ‖δ₀‖ of {sci(VEG_STUDY.reluDefault)} (sigmoid: {sci(VEG_STUDY.sigmoid)}). The same nets at He&apos;s scale: {p2(VEG_STUDY.he)}, exactly 6⁶ = 46,656 times larger, because without biases a ReLU net&apos;s gradient scales with the 12th power of the weights&apos; scale. In {VEG_STUDY.dead} of the nets one layer had every unit off and the gradient was exactly 0 at every scale.
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
