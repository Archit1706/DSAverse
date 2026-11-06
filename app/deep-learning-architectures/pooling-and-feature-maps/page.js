"use client";

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Layers, Crown, Sigma, Boxes, ScanSearch, MoveRight, Wrench,
    CheckCircle, XCircle, Shrink,
} from 'lucide-react';
import { forward, conv2d, maxPool2 } from '@/lib/ml/digitCnn';
import { loadDigitCnnWithSamples } from '@/lib/ml/digitSamples';
import { rankedChoices, slotOf } from '@/lib/ml/predictChoices';
import useLoaded from '@/lib/ml/useLoaded';
import FeatureMap from '@/components/ml/FeatureMap';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import ProbBars from '@/components/ml/ProbBars';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Segmented, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card,
} from '@/components/ml/TourKit';

/* ── the network and its digits ────────────────────────────
   The real digit CNN (conv 3×3 ×8 → ReLU → max-pool → conv 3×3 ×16 → ReLU →
   max-pool → dense 32 → 10), run on MNIST test digits. samples.json holds
   four digits of each class in order, so digit d, variant v is sample
   4d + v. Every map on this page is the network's own output. */

const sampleIndex = (digit, variant) => digit * 4 + variant;

const PRESETS = [
    { label: 'A three', sample: 13, channel: 6 },
    { label: 'A seven', sample: 29, channel: 2 },
    { label: 'A zero', sample: 1, channel: 7 },
    { label: 'A four', sample: 18, channel: 0 },
];

const ACTS = [
    { id: 1, label: 'Feature maps', name: 'Feature Maps', icon: Layers },
    { id: 2, label: 'Max pool', name: 'Max Pooling', icon: Crown },
    { id: 3, label: 'Average pool', name: 'Average Pooling', icon: Sigma },
    { id: 4, label: 'Stack', name: 'Stacking Channels', icon: Boxes },
    { id: 5, label: 'Receptive field', name: 'Receptive Fields', icon: ScanSearch },
    { id: 6, label: 'Shift', name: 'Shifting the Digit', icon: MoveRight },
];

const POSITIONS = ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'];
const OFFSETS = [[0, 0], [0, 1], [1, 0], [1, 1]];

const r1 = (v) => Math.round(v * 10) / 10 + 0;
const f1 = (v) => r1(v).toFixed(1);
const trim = (v) => String(Math.round(v * 1000) / 1000 + 0);
const pct = (v) => `${Math.round(v * 100)}%`;
const argmax = (a) => { let k = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[k]) k = i; return k; };
const plane = (flat, c, H, W) => Array.from({ length: H }, (_, y) => Array.from(flat.slice((c * H + y) * W, (c * H + y + 1) * W)));
const planes = (flat, C, H, W) => Array.from({ length: C }, (_, c) => plane(flat, c, H, W));

/** The aligned 4×4 patch (two pooling windows each way) where this map
    responds most, among patches whose four windows each have a clear
    largest value once rounded to one decimal. */
function chooseCrop(map) {
    let best = null, fallback = null;
    for (let r = 0; r <= 24; r += 2) {
        for (let c = 0; c <= 24; c += 2) {
            let sum = 0, clear = true;
            for (const [wr, wc] of [[0, 0], [0, 2], [2, 0], [2, 2]]) {
                const v = OFFSETS.map(([a, b]) => r1(map[r + wr + a][c + wc + b])).sort((x, y) => y - x);
                if (v[0] - v[1] < 0.2) clear = false;
                sum += v.reduce((x, y) => x + y, 0);
            }
            if (!fallback || sum > fallback.sum) fallback = { r, c, sum };
            if (clear && (!best || sum > best.sum)) best = { r, c, sum };
        }
    }
    const pick = best ?? fallback;
    return { r: pick.r, c: pick.c };
}

/** The four 2×2 windows of a 4×4 patch, in reading order. */
function windowsOf(patch) {
    return [0, 1, 2, 3].map(k => {
        const r = 2 * (k >> 1), c = 2 * (k & 1);
        const values = OFFSETS.map(([a, b]) => patch[r + a][c + b]);
        const order = [...values].sort((x, y) => y - x);
        const sum = values.reduce((x, y) => x + y, 0);
        const nonzero = values.filter(v => v > 0);
        return {
            k, r, c, values, sum, mean: sum / 4, max: order[0], min: order[3], argmax: values.indexOf(order[0]),
            unique: order[0] - order[1] >= 0.2,
            nonzeroMean: nonzero.length ? nonzero.reduce((x, y) => x + y, 0) / nonzero.length : 0,
        };
    });
}

/* ── receptive fields ──────────────────────────────────────
   Each layer as (kernel, stride, padding). A unit at index i of a layer
   reads indices [i·s − p, i·s − p + k − 1] of the layer below; following
   that down to the pixels gives the patch it depends on. */
const LAYERS = [
    { name: 'conv1', k: 3, s: 1, p: 1 },
    { name: 'pool1', k: 2, s: 2, p: 0 },
    { name: 'conv2', k: 3, s: 1, p: 1 },
    { name: 'pool2', k: 2, s: 2, p: 0 },
];

/** The input rows (or columns) [lo, hi] that unit i of layer L depends on. */
function fieldOf(L, i) {
    let lo = i, hi = i;
    for (let l = L; l >= 0; l--) {
        const { k, s, p } = LAYERS[l];
        lo = lo * s - p;
        hi = hi * s - p + k - 1;
    }
    return [lo, hi];
}

/** The textbook recurrence: RF grows by (k − 1) × jump, jump multiplies by the stride. */
function rfTable() {
    const rows = [];
    let rf = 1, jump = 1;
    for (const { name, k, s } of LAYERS) {
        const prev = rf, prevJump = jump;
        rf += (k - 1) * jump;
        jump *= s;
        rows.push({ name, k, s, prev, prevJump, rf, jump });
    }
    return rows;
}

/** For a pool2 unit (I, J): the nested chain of units down to conv1, as input boxes. */
function rfChain(I, J) {
    const units = [[4 * I, 4 * J], [2 * I, 2 * J], [2 * I, 2 * J], [I, J]];
    return units.map(([i, j], L) => {
        const [r0, r1_] = fieldOf(L, i), [c0, c1] = fieldOf(L, j);
        return { layer: L, name: LAYERS[L].name, unit: [i, j], r0, r1: r1_, c0, c1 };
    });
}

/* ── the forward pass with a pool1 window of any size ─────
   With win = 2 this is exactly the trained network. Bigger windows pool
   harder and the result is stretched back to 14 × 14 so the trained layers
   after it still fit — the "pool too hard" break. */
function dense(x, w, b) {
    const [O, I] = w.shape;
    const out = new Float64Array(O);
    for (let o = 0; o < O; o++) {
        let s = b.data[o];
        for (let i = 0; i < I; i++) s += w.data[o * I + i] * x[i];
        out[o] = s;
    }
    return out;
}
const relu = (a) => a.map(v => (v > 0 ? v : 0));
function poolK(a, C, H, W, k) {
    const h = H / k, w = W / k;
    const out = new Float64Array(C * h * w);
    for (let c = 0; c < C; c++) {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let m = -Infinity;
                for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) m = Math.max(m, a[(c * H + y * k + dy) * W + x * k + dx]);
                out[(c * h + y) * w + x] = m;
            }
        }
    }
    return out;
}
function stretch(a, C, h, f) {
    const H = h * f;
    const out = new Float64Array(C * H * H);
    for (let c = 0; c < C; c++) for (let y = 0; y < H; y++) for (let x = 0; x < H; x++) out[(c * H + y) * H + x] = a[(c * h + Math.floor(y / f)) * h + Math.floor(x / f)];
    return out;
}
const WINDOWS = [2, 4, 7, 14];
function forwardWith(model, pixels, win = 2) {
    const t = model.tensors;
    const input = Float64Array.from(pixels, p => (p - model.mean) / model.std);
    const conv1Relu = relu(conv2d(input, 1, 28, 28, t['conv1.weight'], t['conv1.bias']));
    const h = 28 / win;
    const pool1 = win === 2 ? maxPool2(conv1Relu, 8, 28, 28) : stretch(poolK(conv1Relu, 8, 28, 28, win), 8, h, 14 / h);
    const conv2Relu = relu(conv2d(pool1, 8, 14, 14, t['conv2.weight'], t['conv2.bias']));
    const pool2 = maxPool2(conv2Relu, 16, 14, 14);
    const fc1 = relu(dense(pool2, t['fc1.weight'], t['fc1.bias']));
    const logits = dense(fc1, t['fc2.weight'], t['fc2.bias']);
    const top = Math.max(...logits);
    const ex = Array.from(logits, l => Math.exp(l - top));
    const z = ex.reduce((a, b) => a + b, 0);
    return { conv1Relu, pool1, conv2Relu, pool2, probs: ex.map(e => e / z) };
}

/* ── shifting ─────────────────────────────────────────────── */
function shiftImage(pixels, d) {
    const out = new Float64Array(784);
    for (let y = 0; y < 28; y++) for (let x = d; x < 28; x++) out[y * 28 + x] = pixels[y * 28 + x - d];
    return out;
}
/** Summed absolute change over summed activity. */
function relChange(a, b) {
    let num = 0, den = 0;
    for (let i = 0; i < a.length; i++) { num += Math.abs(a[i] - b[i]); den += Math.abs(a[i]); }
    return den ? num / den : 0;
}
function shiftReport(model, pixels, d) {
    const a = forwardWith(model, pixels), b = forwardWith(model, shiftImage(pixels, d));
    return {
        conv1: relChange(a.conv1Relu, b.conv1Relu), pool1: relChange(a.pool1, b.pool1), pool2: relChange(a.pool2, b.pool2),
        before: argmax(a.probs), after: argmax(b.probs), conf: b.probs[argmax(b.probs)], shifted: b,
    };
}
const statsCache = new WeakMap();
/** Over all 40 test digits, for shifts of 1, 2 and 3 pixels. */
function shiftStats(model, samples) {
    if (statsCache.has(samples)) return statsCache.get(samples);
    const rows = [1, 2, 3].map(d => {
        let conv1 = 0, pool1 = 0, pool2 = 0, same = 0;
        for (const s of samples) {
            const r = shiftReport(model, s.pixels, d);
            conv1 += r.conv1; pool1 += r.pool1; pool2 += r.pool2;
            if (r.after === r.before) same++;
        }
        const n = samples.length;
        return { d, conv1: conv1 / n, pool1: pool1 / n, pool2: pool2 / n, same, n };
    });
    statsCache.set(samples, rows);
    return rows;
}

/* ── the guided tour ─────────────────────────────────────── */
function generateSteps(model, samples, presetIndex) {
    const pre = PRESETS[presetIndex];
    const sample = samples[pre.sample];
    const run = forward(model, sample.pixels);
    const ch = pre.channel;
    const label = sample.label;
    const input = plane(sample.pixels, 0, 28, 28);
    const maps = planes(run.conv1Relu, 8, 28, 28);
    const top = Math.max(...run.conv1Relu);
    const crop = chooseCrop(maps[ch]);
    const patch = [0, 1, 2, 3].map(a => [0, 1, 2, 3].map(b => r1(maps[ch][crop.r + a][crop.c + b])));
    const wins = windowsOf(patch);
    const pool1 = planes(run.pool1, 8, 14, 14);
    const conv2 = planes(run.conv2Relu, 16, 14, 14);
    const pool2 = planes(run.pool2, 16, 7, 7);
    const probs = run.probs;
    const pred = argmax(probs);
    const zeros = run.conv1Relu.filter(v => v === 0).length;
    const steps = [];
    const base = { presetIndex, digit: label, channel: ch, input, maps, top, crop, patch };
    const s = (act, data, explanation) => steps.push({ act, actName: ACTS[act - 1].name, ...base, ...data, explanation });

    // Act 1 — feature maps
    s(1, { kind: 'input' }, `A handwritten ${label} from the MNIST test set: 28 × 28 pixels, each a brightness from 0 to 1. This picture is all the network gets.`);
    s(1, { kind: 'maps' }, `The first convolution runs 8 learned 3 × 3 kernels over the picture (padding 1, so each map stays 28 × 28), then ReLU turns every negative into 0. That is [8, 28, 28] = 6,272 numbers, and ${zeros.toLocaleString('en-US')} of them (${pct(zeros / 6272)}) are exactly 0: a kernel answers only where its pattern appears.`);
    s(1, { kind: 'focus' }, `Channel ${ch + 1} on its own, next to the nine weights it learned. The outlined 4 × 4 patch is where it responds most strongly; its values, rounded to one decimal, are what the next two acts pool.`);

    // Act 2 — max pooling, window by window
    s(2, { kind: 'crop', out: [null, null, null, null] }, 'Max pooling cuts a map into 2 × 2 windows that do not overlap (stride 2) and keeps only the largest number in each. This 4 × 4 patch holds four windows, numbered in reading order, so it pools down to 2 × 2.');
    const maxOut = [null, null, null, null];
    for (const w of wins) {
        maxOut[w.k] = w.max;
        s(2, { kind: 'max', window: w, out: [...maxOut] }, `Window ${w.k + 1}: max(${w.values.map(f1).join(', ')}) = ${f1(w.max)}, from the ${POSITIONS[w.argmax].toLowerCase()} cell. The other three numbers are dropped.`);
    }
    const pi = crop.r / 2, pj = crop.c / 2;
    const real = [0, 1, 2, 3].map(k => pool1[ch][pi + (k >> 1)][pj + (k & 1)]);
    s(2, { kind: 'maxDone', out: [...maxOut], pool1: pool1[ch], real, at: [pi, pj] },
        `Four windows became four numbers — the same ${real.map(f1).join(', ')} the real network computes at those positions of its pool1 layer. Done across the whole map, pooling turns each 28 × 28 map into 14 × 14: a quarter of the numbers, with the strongest response in every window kept.`);

    // Act 3 — average pooling on the same patch
    const avgOut = [null, null, null, null];
    for (const w of wins) {
        avgOut[w.k] = w.mean;
        s(3, { kind: 'avg', window: w, out: [...avgOut], maxOut: [...maxOut] }, `Window ${w.k + 1}: (${w.values.map(f1).join(' + ')}) / 4 = ${trim(w.sum)} / 4 = ${trim(w.mean)}. Average pooling keeps a blend of all four rather than the strongest.`);
    }
    const lit = wins.filter(w => w.max > 0);
    const diluted = lit.length ? lit.reduce((a, b) => (b.max - b.mean > a.max - a.mean ? b : a)) : wins[0];
    s(3, { kind: 'avgDone', out: [...avgOut], maxOut: [...maxOut], diluted: diluted.k },
        `Side by side. Max keeps a pattern that fired anywhere in its window at full strength; average dilutes it with the quiet cells around it — window ${diluted.k + 1} goes from ${f1(diluted.max)} to ${trim(diluted.mean)}. This network was trained with max pooling; average pooling is more often used once, at the very end, over a whole map.`);

    // Act 4 — the stack of channels
    s(4, { kind: 'stack', layer: 'pool1', grids: pool1 }, 'Pooling every channel gives [8, 14, 14]: eight smaller maps, each still a picture of where one pattern occurs.');
    s(4, { kind: 'stack', layer: 'conv2', grids: conv2 }, 'The second convolution has 16 kernels, and each is 8 × 3 × 3 = 72 weights: it reads a 3 × 3 patch of all eight maps at once and adds the results. So a channel here responds to combinations of first-layer patterns. After ReLU: [16, 14, 14].');
    s(4, { kind: 'stack', layer: 'pool2', grids: pool2 }, 'Pool again: [16, 7, 7] = 784 numbers, as many as the 28 × 28 input had pixels, but now sixteen coarse maps of which patterns occur where instead of one map of brightness.');
    s(4, { kind: 'classify', probs, pred }, `Flatten the 784 numbers into a dense layer of 32, then 10 outputs and softmax: the network says ${pred}, with probability ${probs[pred].toFixed(3)}. Pooling twice is also what keeps that dense layer small: 784 × 32 = 25,088 weights, against 12,544 × 32 = 401,408 if the [16, 28, 28] maps had gone in unpooled.`);

    // Act 5 — receptive fields of one nested chain of units
    // The pool2 unit whose 10 × 10 field (kept inside the image) holds the most ink.
    let I = 1, J = 1, most = -1;
    for (let a = 1; a <= 5; a++) {
        for (let b = 1; b <= 5; b++) {
            let ink = 0;
            for (let y = 4 * a - 3; y <= 4 * a + 6; y++) for (let x = 4 * b - 3; x <= 4 * b + 6; x++) ink += input[y][x];
            if (ink > most) { most = ink; I = a; J = b; }
        }
    }
    const chain = rfChain(I, J);
    const table = rfTable();
    const notes = [
        'A 3 × 3 kernel on the raw pixels sees exactly a 3 × 3 patch.',
        'Pooling widens the field by only one pixel, but it doubles the jump: neighbouring pool1 values sit 2 input pixels apart.',
        'So the next 3 × 3 kernel steps over 2 pixels at a time, and its field grows by 2 × 2 = 4.',
        'After two pools each value summarises a 10 × 10 patch, over a third of the image width, and neighbouring values sit 4 pixels apart.',
    ];
    table.forEach((row, L) => {
        s(5, { kind: 'rf', layer: L, chain: chain.slice(0, L + 1), table, unitAt: chain[L].unit },
            `One ${row.name} value depends on a ${row.rf} × ${row.rf} patch of the digit: RF = ${row.prev} + (${row.k} − 1) × ${row.prevJump} = ${row.rf}. ${notes[L]}`);
    });

    // Act 6 — shift the digit
    for (const d of [1, 2, 3]) {
        const r = shiftReport(model, sample.pixels, d);
        const softer = r.pool2 < r.conv1;
        s(6, { kind: 'shift', d, shifted: plane(shiftImage(sample.pixels, d), 0, 28, 28), change: r, shiftedMap: plane(r.shifted.conv1Relu, ch, 28, 28) },
            `Move the ${label} ${d} pixel${d > 1 ? 's' : ''} to the right. The conv1 maps change by ${pct(r.conv1)} (summed absolute change over summed activity), pool1 by ${pct(r.pool1)}, pool2 by ${pct(r.pool2)}. ${softer ? 'Pooling softens the change; it does not remove it.' : 'Pooling has not absorbed it at all.'} The network ${r.after === r.before ? 'still says' : 'now says'} ${r.after} (probability ${r.conf.toFixed(3)}).`);
    }
    const stats = shiftStats(model, samples);
    s(6, { kind: 'shiftSum', stats },
        `Over all 40 test digits, a 1-pixel shift changes pool2 by ${pct(stats[0].pool2)} on average, 2 pixels by ${pct(stats[1].pool2)}, 3 pixels by ${pct(stats[2].pool2)}. The prediction stays the same for ${stats[0].same}, ${stats[1].same} and ${stats[2].same} of the 40. The maps move with the digit; it is the trained layers that read them, not pooling alone, that keep the answer.`);
    return steps;
}

/* ── predict prompts ─────────────────────────────────────── */
// Chosen so the four shipped tours are balanced as well as every digit and channel (the suite prints both).
const PROMPT_SALT = 27;
const predictFor = (step, next) => {
    if (!next) return null;
    if (next.kind === 'max') {
        const w = next.window;
        if (!w.unique) return null;
        return {
            question: `Window ${w.k + 1} (dashed) is next. Which of its four cells does max pooling keep?`,
            options: POSITIONS,
            correct: w.argmax,
            because: `The largest of ${w.values.map(f1).join(', ')} is ${f1(w.max)}, in the ${POSITIONS[w.argmax].toLowerCase()} cell.`,
        };
    }
    if (next.kind === 'avg') {
        const w = next.window;
        const prev = step.kind === 'avg' ? step.window.mean : null;
        const slips = [w.max, w.sum, w.nonzeroMean, w.min, (w.sum - w.min) / 4, prev].filter(v => v !== null);
        const slot = slotOf(next.presetIndex, w.k, PROMPT_SALT);
        const { options, correct } = rankedChoices(w.mean, slips, { slot, step: 0.25, fmt: trim });
        return {
            question: `Window ${w.k + 1} (dashed) is next. What does average pooling turn it into?`,
            options, correct,
            because: `Add the four and divide by 4: (${w.values.map(f1).join(' + ')}) / 4 = ${trim(w.sum)} / 4 = ${trim(w.mean)}.`,
        };
    }
    if (next.kind === 'rf') {
        const row = next.table[next.layer];
        const slips = [row.prev + row.k - 1, row.prev * 2, row.k, row.prev + row.k, row.rf + row.jump];
        const slot = slotOf(next.presetIndex, next.layer, PROMPT_SALT + 1);
        const { options, correct } = rankedChoices(row.rf, slips, { slot, step: 1 });
        return {
            question: `The ${row.name} layer is next (kernel ${row.k}, stride ${row.s}). How many pixels wide is the patch of the digit one ${row.name} value depends on?`,
            options, correct,
            because: `RF = ${row.prev} + (${row.k} − 1) × ${row.prevJump} = ${row.rf}: the field grows by (k − 1) steps of the current jump, ${row.prevJump} pixel${row.prevJump > 1 ? 's' : ''}.`,
        };
    }
    return null;
};

const SHAPES = { pool1: [8, 14, 14], conv2: [16, 14, 14], pool2: [16, 7, 7] };
function formulaFor(step) {
    switch (step.kind) {
        case 'input': return String.raw`x \in [0, 1]^{28 \times 28}`;
        case 'maps':
        case 'focus': return String.raw`\text{map}_c = \operatorname{ReLU}(w_c * x + b_c), \quad [1, 28, 28] \to [8, 28, 28]`;
        case 'crop': return String.raw`y_{ij} = \max\{\, x_{2i,2j},\ x_{2i,2j+1},\ x_{2i+1,2j},\ x_{2i+1,2j+1} \,\}`;
        case 'max': return String.raw`\max(${step.window.values.map(f1).join(', ')}) = ${f1(step.window.max)}`;
        case 'maxDone': return String.raw`[8, 28, 28] \xrightarrow{\ \max 2\times2\ } [8, 14, 14]`;
        case 'avg': return String.raw`\tfrac{1}{4}(${step.window.values.map(f1).join(' + ')}) = \tfrac{${trim(step.window.sum)}}{4} = ${trim(step.window.mean)}`;
        case 'avgDone': return String.raw`\max = (${step.maxOut.map(f1).join(', ')}) \qquad \text{avg} = (${step.out.map(trim).join(', ')})`;
        case 'stack': return String.raw`[${SHAPES[step.layer].join(', ')}]`;
        case 'classify': return String.raw`[16, 7, 7] \to 784 \to 32 \to 10, \quad p(${step.pred}) = ${step.probs[step.pred].toFixed(3)}`;
        case 'rf': { const row = step.table[step.layer]; return String.raw`\text{RF}_{\text{${row.name}}} = ${row.prev} + (${row.k} - 1) \cdot ${row.prevJump} = ${row.rf}, \quad \text{jump} = ${row.prevJump} \cdot ${row.s} = ${row.jump}`; }
        case 'shift': return String.raw`\frac{\sum |a - a'|}{\sum |a|}:\ \text{conv1}\ ${Math.round(step.change.conv1 * 100)}\%,\ \text{pool1}\ ${Math.round(step.change.pool1 * 100)}\%,\ \text{pool2}\ ${Math.round(step.change.pool2 * 100)}\%`;
        case 'shiftSum': return String.raw`\text{pool2 change: } ${step.stats.map(r => `${Math.round(r.pool2 * 100)}\\%`).join(',\\ ')}\ \text{for shifts of } 1, 2, 3`;
        default: return '';
    }
}

const quizQuestions = [
    {
        question: 'A max-pooling layer with 2×2 windows and stride 2 receives a [16, 14, 14] stack of feature maps. What comes out?',
        options: ['[16, 14, 14]', '[16, 7, 7]', '[8, 7, 7]', '[4, 14, 14]'],
        correct: 1,
        explanation: 'Pooling works on each channel separately, so the 16 channels stay. Each 14 × 14 map keeps one value per 2 × 2 window: 7 × 7.',
    },
    {
        question: 'In the digit CNN, one value of the second pooling layer depends on how large a patch of the input image?',
        options: ['2 × 2', '4 × 4', '7 × 7', '10 × 10'],
        correct: 3,
        explanation: 'Receptive fields grow by (k − 1) × jump at each layer: 3 after conv1, 4 after the first pool (jump becomes 2), 4 + 2 × 2 = 8 after conv2, and 8 + 1 × 2 = 10 after the second pool.',
    },
    {
        question: 'Shifting a digit by one pixel changed the second pooling layer’s output by about two-fifths on average. What does that show?',
        options: [
            'Pooling makes a CNN fully shift-invariant',
            'Pooling only tolerates shifts that keep each maximum inside its window; the maps still move with the digit',
            'The network ignores where strokes are',
            'Max pooling and average pooling give identical results',
        ],
        correct: 1,
        explanation: 'A 2 × 2 max pool returns the same value only while the largest response stays in the same window. Most of the time a shift moves responses across window borders, so the pooled maps change; the trained layers after them are what keep the prediction.',
    },
];

const codeExample = `import torch
import torch.nn.functional as F

window = torch.tensor([[[[0.0, 3.4],
                         [2.7, 1.1]]]])     # [batch, channels, H, W]
print(F.max_pool2d(window, 2))   # tensor([[[[3.4000]]]])
print(F.avg_pool2d(window, 2))   # tensor([[[[1.8000]]]])

# pooling works channel by channel: only H and W shrink
maps = torch.randn(1, 8, 28, 28)
print(F.max_pool2d(maps, 2).shape)   # torch.Size([1, 8, 14, 14])

# the digit CNN's feature stack, layer by layer
net = torch.nn.Sequential(
    torch.nn.Conv2d(1, 8, 3, padding=1), torch.nn.ReLU(), torch.nn.MaxPool2d(2),
    torch.nn.Conv2d(8, 16, 3, padding=1), torch.nn.ReLU(), torch.nn.MaxPool2d(2))
print(net(torch.zeros(1, 1, 28, 28)).shape)   # torch.Size([1, 16, 7, 7])`;

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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── scenes ──────────────────────────────────────────────── */
const Caption = ({ children }) => <div className="text-xs text-slate-400 mb-1.5">{children}</div>;
const WIN_COLORS = ['#facc15', '#38bdf8', '#f472b6', '#a3e635'];

function MapGrid({ grids, domain, cell, highlight, label = (k) => `${k + 1}` }) {
    return (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {grids.map((g, k) => (
                <div key={k} className={`rounded p-0.5 ${highlight === k ? 'ring-2 ring-yellow-400' : ''}`}>
                    <FeatureMap data={g} cell={cell} gap={0} domain={domain} ariaLabel={`Channel ${k + 1}`} />
                    <div className="text-[10px] text-slate-500 text-center mt-0.5">{label(k)}</div>
                </div>
            ))}
        </div>
    );
}

function PoolPatch({ step, ghost }) {
    const w = step.window;
    const overlays = [0, 1, 2, 3].map(k => ({ r: 2 * (k >> 1), c: 2 * (k & 1), h: 2, w: 2, color: '#475569', width: 1.5 }));
    if (w) overlays.push({ r: w.r, c: w.c, h: 2, w: 2, color: WIN_COLORS[w.k], width: 3.5 });
    if (ghost !== null && ghost !== undefined) overlays.push({ r: 2 * (ghost >> 1), c: 2 * (ghost & 1), h: 2, w: 2, color: '#e2e8f0', width: 3, dashed: true });
    const outRows = [[step.out[0], step.out[1]], [step.out[2], step.out[3]]];
    const isAvg = step.act === 3;
    return (
        <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="w-[208px]">
                <Caption>Channel {step.channel + 1}, rows {step.crop.r}–{step.crop.r + 3}, columns {step.crop.c}–{step.crop.c + 3}</Caption>
                <FeatureMap data={step.patch} cell={50} domain={[0, step.top]} showValues format={f1} overlays={overlays} ariaLabel="The 4 by 4 patch" />
            </div>
            <MoveRight className="h-6 w-6 text-slate-600 hidden sm:block" />
            <div className="w-[108px]">
                <Caption>{isAvg ? 'Average pool' : 'Max pool'} <ShapeTag shape={[2, 2]} /></Caption>
                <svg viewBox="-1 -1 102 102" className="w-full block" role="img" aria-label="Pooled output">
                    {outRows.map((row, i) => row.map((v, j) => {
                        const k = i * 2 + j;
                        return (
                            <g key={k}>
                                <rect x={j * 50 + 1} y={i * 50 + 1} width={48} height={48} rx={4} fill={v === null ? '#0f172a' : '#1e293b'}
                                    stroke={v === null ? '#334155' : WIN_COLORS[k]} strokeWidth={v === null ? 1 : 2.5} strokeDasharray={v === null ? '4 3' : undefined} />
                                {v !== null && <text x={j * 50 + 25} y={i * 50 + 30} textAnchor="middle" fontSize={isAvg ? 12 : 14} fill="#f8fafc" fontFamily="var(--font-jetbrains-mono), monospace">{isAvg ? trim(v) : f1(v)}</text>}
                            </g>
                        );
                    }))}
                </svg>
            </div>
            {step.kind === 'avgDone' && (
                <div className="w-[108px]">
                    <Caption>Max pool, for comparison</Caption>
                    <svg viewBox="-1 -1 102 102" className="w-full block" role="img" aria-label="Max pooled output">
                        {step.maxOut.map((v, k) => (
                            <g key={k}>
                                <rect x={(k & 1) * 50 + 1} y={(k >> 1) * 50 + 1} width={48} height={48} rx={4} fill="#1e293b"
                                    stroke={k === step.diluted ? '#facc15' : '#475569'} strokeWidth={k === step.diluted ? 3 : 1.5} />
                                <text x={(k & 1) * 50 + 25} y={(k >> 1) * 50 + 30} textAnchor="middle" fontSize={14} fill="#f8fafc" fontFamily="var(--font-jetbrains-mono), monospace">{f1(v)}</text>
                            </g>
                        ))}
                    </svg>
                </div>
            )}
            {step.kind === 'maxDone' && (
                <div className="w-[176px]">
                    <Caption>The network&apos;s pool1, channel {step.channel + 1} <ShapeTag shape={[14, 14]} /></Caption>
                    <FeatureMap data={step.pool1} cell={12} domain={[0, step.top]} overlays={[{ r: step.at[0], c: step.at[1], h: 2, w: 2, color: '#facc15', width: 2.5 }]} ariaLabel="Pool1 map" />
                </div>
            )}
        </div>
    );
}

function RfScene({ step }) {
    const colors = ['#facc15', '#38bdf8', '#f472b6', '#a3e635'];
    const overlays = step.chain.map((b, L) => {
        const r0 = Math.max(0, b.r0), c0 = Math.max(0, b.c0);
        return { r: r0, c: c0, h: Math.min(27, b.r1) - r0 + 1, w: Math.min(27, b.c1) - c0 + 1, color: colors[L], width: L === step.layer ? 3 : 1.5 };
    });
    return (
        <div className="grid sm:grid-cols-[minmax(0,240px)_1fr] gap-5 items-center">
            <div>
                <Caption>Input <ShapeTag shape={[28, 28]} /></Caption>
                <FeatureMap data={step.input} cell={8} domain={[0, 1]} overlays={overlays} ariaLabel="Input with receptive fields" />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                    <thead><tr className="text-slate-500 text-left"><th className="py-1 pr-2">layer</th><th className="pr-2">k</th><th className="pr-2">stride</th><th className="pr-2">RF</th><th>jump</th></tr></thead>
                    <tbody>
                        {step.table.map((row, L) => (
                            <tr key={row.name} className={L === step.layer ? 'text-white' : L < step.layer ? 'text-slate-400' : 'text-slate-600'}>
                                <td className="py-1 pr-2"><span className="inline-block h-2 w-2 rounded-sm mr-1.5" style={{ background: L <= step.layer ? colors[L] : '#334155' }} />{row.name}</td>
                                <td className="pr-2">{row.k}</td><td className="pr-2">{row.s}</td>
                                <td className="pr-2">{L <= step.layer ? `${row.rf} × ${row.rf}` : '?'}</td>
                                <td>{L <= step.layer ? row.jump : '?'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="text-[11px] text-slate-500 mt-2">Outlined: one {step.table[step.layer].name} value at position ({step.unitAt[0]}, {step.unitAt[1]}) and the units below it that feed it.</p>
            </div>
        </div>
    );
}

function ChangeBars({ change }) {
    return (
        <div className="space-y-1.5">
            {[['conv1', change.conv1], ['pool1', change.pool1], ['pool2', change.pool2]].map(([name, v]) => (
                <div key={name} className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2 text-xs">
                    <span className="font-mono text-slate-400">{name}</span>
                    <span className="h-3 rounded bg-slate-800 overflow-hidden"><span className="block h-full rounded bg-yellow-400 transition-[width] duration-300" style={{ width: `${Math.min(100, v * 100 / 1.5)}%` }} /></span>
                    <span className="font-mono text-slate-300 text-right">{pct(v)}</span>
                </div>
            ))}
            <p className="text-[11px] text-slate-500">Change = Σ|before − after| / Σ|before|. Bar full at 150%.</p>
        </div>
    );
}

function VisualizationPanel({ step, ghost }) {
    if (!step) return null;
    const domain = [0, step.top];
    switch (step.kind) {
        case 'input':
            return (
                <div className="mx-auto w-full max-w-[260px]">
                    <Caption>Input image <ShapeTag names={['H', 'W']} shape={[28, 28]} /></Caption>
                    <FeatureMap data={step.input} cell={9} domain={[0, 1]} ariaLabel="Input digit" />
                </div>
            );
        case 'maps':
        case 'focus':
            return (
                <div className="w-full space-y-4">
                    {step.kind === 'maps' ? (
                        <>
                            <Caption>After conv1 and ReLU <ShapeTag names={['C', 'H', 'W']} shape={[8, 28, 28]} /> · one colour scale for all eight</Caption>
                            <MapGrid grids={step.maps} domain={domain} cell={3} highlight={step.channel} label={(k) => `ch ${k + 1}`} />
                        </>
                    ) : (
                        <div className="flex flex-wrap items-start justify-center gap-6">
                            <div className="w-[230px]">
                                <Caption>Channel {step.channel + 1} <ShapeTag shape={[28, 28]} /></Caption>
                                <FeatureMap data={step.maps[step.channel]} cell={8} domain={domain} overlays={[{ r: step.crop.r, c: step.crop.c, h: 4, w: 4, color: '#facc15', width: 2.5 }]} ariaLabel={`Channel ${step.channel + 1}`} />
                            </div>
                            <div className="w-[230px]">
                                <Caption>The input, same patch outlined</Caption>
                                <FeatureMap data={step.input} cell={8} domain={[0, 1]} overlays={[{ r: step.crop.r, c: step.crop.c, h: 4, w: 4, color: '#facc15', width: 2.5 }]} ariaLabel="Input digit" />
                            </div>
                        </div>
                    )}
                </div>
            );
        case 'crop':
        case 'max':
        case 'maxDone':
        case 'avg':
        case 'avgDone':
            return <PoolPatch step={step} ghost={ghost} />;
        case 'stack': {
            const shape = SHAPES[step.layer];
            const flat = step.grids.flat(2);
            return (
                <div className="w-full">
                    <Caption>{step.layer} <ShapeTag names={['C', 'H', 'W']} shape={shape} /></Caption>
                    <MapGrid grids={step.grids} domain={[0, Math.max(1e-9, ...flat)]} cell={step.layer === 'pool2' ? 10 : 5} />
                </div>
            );
        }
        case 'classify':
            return (
                <div className="w-full max-w-md mx-auto">
                    <Caption>Softmax over the 10 outputs <ShapeTag shape={[10]} /></Caption>
                    <ProbBars items={step.probs.map((p, d) => ({ label: String(d), p }))} chosen={step.pred} accent="#facc15" />
                </div>
            );
        case 'rf':
            return <RfScene step={step} />;
        case 'shift':
            return (
                <div className="grid sm:grid-cols-3 gap-4 w-full items-start">
                    <div><Caption>Original</Caption><FeatureMap data={step.input} cell={6} domain={[0, 1]} ariaLabel="Original digit" /></div>
                    <div><Caption>Shifted right by {step.d}</Caption><FeatureMap data={step.shifted} cell={6} domain={[0, 1]} ariaLabel="Shifted digit" /></div>
                    <div className="space-y-3">
                        <Caption>How much each layer changed</Caption>
                        <ChangeBars change={step.change} />
                        <p className="text-xs text-slate-400">Prediction: <span className="text-white font-mono">{step.change.before}</span> → <span className="text-white font-mono">{step.change.after}</span></p>
                    </div>
                </div>
            );
        case 'shiftSum':
            return (
                <div className="w-full overflow-x-auto">
                    <Caption>All 40 test digits, measured now in your browser</Caption>
                    <table className="w-full text-sm font-mono">
                        <thead><tr className="text-slate-500 text-left text-xs"><th className="py-1 pr-3">shift</th><th className="pr-3">conv1</th><th className="pr-3">pool1</th><th className="pr-3">pool2</th><th>same answer</th></tr></thead>
                        <tbody>
                            {step.stats.map(r => (
                                <tr key={r.d} className="text-slate-200"><td className="py-1 pr-3">{r.d} px</td><td className="pr-3">{pct(r.conv1)}</td><td className="pr-3">{pct(r.pool1)}</td><td className="pr-3 text-yellow-300">{pct(r.pool2)}</td><td>{r.same} / {r.n}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        default:
            return null;
    }
}

/* ── explore ─────────────────────────────────────────────── */
function Explore({ model, samples, initial }) {
    const [digit, setDigit] = useState(initial.digit);
    const [variant, setVariant] = useState(initial.variant);
    const [channel, setChannel] = useState(initial.channel);
    const [shift, setShift] = useState(0);
    const [win, setWin] = useState(2);
    const [cell, setCell] = useState(initial.cell);
    const sample = samples[sampleIndex(digit, variant)];
    const pixels = useMemo(() => shiftImage(sample.pixels, shift), [sample, shift]);
    const run = useMemo(() => forwardWith(model, pixels, win), [model, pixels, win]);
    const unshifted = useMemo(() => forwardWith(model, sample.pixels, win), [model, sample, win]);
    const correct = useMemo(() => samples.filter(s => argmax(forwardWith(model, s.pixels, win).probs) === s.label).length, [model, samples, win]);
    const trained = useMemo(() => samples.filter(s => argmax(forwardWith(model, s.pixels, 2).probs) === s.label).length, [model, samples]);
    const conv = plane(run.conv1Relu, channel, 28, 28);
    const pooled = plane(run.pool1, channel, 14, 14);
    const top = Math.max(1e-9, ...run.conv1Relu);
    const [i, j] = cell;
    const windowVals = OFFSETS.map(([a, b]) => conv[2 * i + a][2 * j + b]);
    const pred = argmax(run.probs);
    const broken = win !== 2;
    const rf = [Math.max(0, 2 * i - 1), Math.max(0, 2 * j - 1)];
    const rfEnd = [Math.min(27, 2 * i + 2), Math.min(27, 2 * j + 2)];

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-slate-500">Digit</span>
                    <Segmented options={Array.from({ length: 10 }, (_, d) => [d, String(d)])} value={digit} onChange={setDigit} accent="yellow" ariaLabel="Digit" />
                    <span className="text-xs text-slate-500">Sample</span>
                    <Segmented options={[0, 1, 2, 3].map(v => [v, String(v + 1)])} value={variant} onChange={setVariant} accent="yellow" ariaLabel="Sample" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-slate-500">conv1 channel</span>
                    <Segmented options={Array.from({ length: 8 }, (_, c) => [c, String(c + 1)])} value={channel} onChange={setChannel} accent="yellow" ariaLabel="Channel" />
                </div>
                <div className="grid sm:grid-cols-3 gap-4 items-start">
                    <div>
                        <Caption>Input{shift ? `, shifted ${shift} px` : ''}</Caption>
                        <FeatureMap data={plane(pixels, 0, 28, 28)} cell={7} domain={[0, 1]} ariaLabel="Input digit"
                            overlays={broken ? [] : [{ r: rf[0], c: rf[1], h: rfEnd[0] - rf[0] + 1, w: rfEnd[1] - rf[1] + 1, color: '#38bdf8', width: 2 }]} />
                    </div>
                    <div>
                        <Caption>conv1 + ReLU, channel {channel + 1}</Caption>
                        <FeatureMap data={conv} cell={7} domain={[0, top]} ariaLabel="conv1 map"
                            overlays={broken ? [] : [{ r: 2 * i, c: 2 * j, h: 2, w: 2, color: '#facc15', width: 2 }]} />
                    </div>
                    <div>
                        <Caption>pool1, channel {channel + 1} · click a cell</Caption>
                        <FeatureMap data={pooled} cell={14} domain={[0, top]} onCell={(a, b) => setCell([a, b])} ariaLabel="pool1 map, click a cell"
                            overlays={broken ? [] : [{ r: i, c: j, h: 1, w: 1, color: '#facc15', width: 2.5 }]} />
                    </div>
                </div>
                {broken ? (
                    <BreakNote>
                        <p>pool1 now uses {win} × {win} windows: each channel keeps {(28 / win) ** 2} values instead of 196 (stretched back to 14 × 14 so the trained layers after it still fit).
                            The network reads <span className="font-semibold">{correct} of the 40</span> test digits correctly, against {trained} with the 2 × 2 pooling it was trained with.</p>
                    </BreakNote>
                ) : (
                    <div className="text-sm text-slate-300">
                        <Tex>{String.raw`\text{pool1}[${channel + 1}][${i}][${j}] = \max(${windowVals.map(v => v.toFixed(2)).join(', ')}) = ${pooled[i][j].toFixed(2)}`}</Tex>
                        <p className="text-xs text-slate-500 mt-1">It reads the yellow 2 × 2 window of the conv1 map, which reads the blue {rfEnd[0] - rf[0] + 1} × {rfEnd[1] - rf[1] + 1} patch of the input.</p>
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3">
                    <ParamSlider label="Shift the digit right" value={shift} onChange={setShift} min={0} max={4} step={1} accent="yellow" format={(v) => `${v} px`} />
                    <ChangeBars change={{ conv1: relChange(unshifted.conv1Relu, run.conv1Relu), pool1: relChange(unshifted.pool1, run.pool1), pool2: relChange(unshifted.pool2, run.pool2) }} />
                </div>
                <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-slate-300">Prediction: <span className="font-mono text-white">{pred}</span> <span className="text-xs text-slate-500">(true label {sample.label})</span></span>
                    </div>
                    <ProbBars items={run.probs.map((p, d) => ({ label: String(d), p }))} chosen={pred} accent="#facc15" />
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Shrink className="h-4 w-4 text-amber-400" />Break it: pool too hard</h3>
                <p className="text-xs text-slate-400">Give the first pooling layer bigger windows. Every extra halving throws away where things are.</p>
                <div className="flex flex-wrap items-center gap-3">
                    <Segmented options={WINDOWS.map(w => [w, w === 2 ? '2 × 2 (trained)' : `${w} × ${w}`])} value={win} onChange={setWin} accent="yellow" ariaLabel="pool1 window" />
                    {broken && (
                        <button onClick={() => setWin(2)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">
                            <Wrench className="h-3.5 w-3.5" />Repair
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function PoolingAndFeatureMapsPage() {
    const { data, error, retry } = useLoaded(loadDigitCnnWithSamples);
    const [mode, setMode] = useState('guided');
    const [presetIndex, setPresetIndex] = useState(0);
    const stepHistory = useMemo(() => (data ? generateSteps(data.model, data.samples, presetIndex) : []), [data, presetIndex]);
    const play = useStepPlayback(stepHistory, 1700);
    const step = play.step;
    const predict = usePredict(stepHistory, play.current, predictFor, play.pause);
    const stats = useMemo(() => (data ? shiftStats(data.model, data.samples) : null), [data]);
    const [explore, setExplore] = useState({ key: 0, digit: 3, variant: 1, channel: 6, cell: [6, 6] });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const toExplore = useCallback(() => {
        const p = PRESETS[presetIndex];
        setExplore(e => ({
            key: e.key + 1, digit: Math.floor(p.sample / 4), variant: p.sample % 4, channel: p.channel,
            cell: step?.crop ? [step.crop.r / 2, step.crop.c / 2] : e.cell,
        }));
        setMode('explore');
        play.pause();
    }, [presetIndex, play, step]);

    const ghost = predict.pending ? stepHistory[play.current + 1]?.window?.k ?? null : null;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/deep-learning-architectures" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Deep Learning Architectures
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Pooling and Feature Maps</h1>
                    <p className="text-yellow-50 max-w-3xl">
                        Inside a real digit-reading CNN: eight feature maps from the first layer, max and average pooling window by window, sixteen maps stacked on top, and the patch of the digit each value can see.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/deep-learning-architectures/convolution" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Convolution</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]]} mode={mode}
                            setMode={(m) => (m === 'explore' ? toExplore() : setMode(m))} accent="yellow" />
                        <SourceChip kind="real">Digit CNN trained on MNIST (99.0% test accuracy) · 40 MNIST test digits, CC BY-SA 3.0</SourceChip>
                    </div>

                    {error ? (
                        <LoadError error={error} onRetry={retry} accent="yellow" what="The digit CNN" />
                    ) : !data ? (
                        <LoadingCard text="Loading the digit CNN and its test digits (98 KB)…" />
                    ) : mode === 'explore' ? (
                        <Explore key={explore.key} model={data.model} samples={data.samples} initial={explore} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Digit:</span>
                                {PRESETS.map((p, k) => (
                                    <button key={p.label} onClick={() => { setPresetIndex(k); play.pause(); }} aria-pressed={presetIndex === k}
                                        className={`text-xs px-2.5 py-1 rounded-lg border ${presetIndex === k ? 'border-yellow-400 bg-yellow-500/15 text-yellow-100' : 'border-slate-700 text-slate-400 hover:border-yellow-500'}`}>{p.label}</button>
                                ))}
                            </div>
                            <TourPlayer acts={ACTS} steps={stepHistory} play={play} predict={predict} accent="yellow" minHeight="min-h-[340px]">
                                <VisualizationPanel step={step} ghost={ghost} />
                            </TourPlayer>
                            {predict.prompt && <PredictPrompt predict={predict} accent="yellow" />}
                            <ExplanationBox text={step?.explanation} predict={predict} accent="yellow" />
                            {step && <FormulaPanel><div className="overflow-x-auto"><Tex block>{formulaFor(step)}</Tex></div></FormulaPanel>}
                        </>
                    )}

                    <InCode title="Pooling in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="What pooling does" icon={Crown}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-slate-200 font-semibold">Shrinks each map</span> — a 2 × 2 window with stride 2 keeps one value in four.</li>
                            <li><span className="text-slate-200 font-semibold">Leaves channels alone</span> — [C, H, W] becomes [C, H/2, W/2].</li>
                            <li><span className="text-slate-200 font-semibold">Grows receptive fields</span> — it doubles the jump, so the next kernel reaches twice as far.</li>
                            <li><span className="text-slate-200 font-semibold">Has no weights</span> — nothing in a pooling layer is learned.</li>
                        </ul>
                    </Card>

                    <Misconception claim="Pooling makes a CNN shift-invariant.">
                        {stats ? (
                            <>
                                <p>A 2 × 2 max pool returns the same value only while the largest response stays inside the same window. Shift a digit by one pixel and pool2&apos;s output changes by {pct(stats[0].pool2)} on average over the 40 test digits ({pct(stats[1].pool2)} for 2 pixels, {pct(stats[2].pool2)} for 3).</p>
                                <p>The answer survives for {stats[0].same}, {stats[1].same} and {stats[2].same} of the 40, because the layers that read those maps were trained on handwriting that is never in exactly the same place. Pooling softens a shift; it does not cancel it.</p>
                            </>
                        ) : <p>Measuring over 40 test digits once the network loads…</p>}
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
