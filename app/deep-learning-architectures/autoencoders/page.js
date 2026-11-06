"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Grid3x3, Shrink, Expand, TrendingDown, MapPin, Blend, Minimize2,
    CheckCircle, XCircle, Wrench, Unplug, Play, Pause, RotateCcw, Shuffle,
} from 'lucide-react';
import { createMLP, forward, lossAndGrads, createOptimizer, cloneMLP } from '@/lib/ml/mlp';
import { useTrainer } from '@/lib/ml/useTrainer';
import { createRng } from '@/lib/random';
import FeatureMap from '@/components/ml/FeatureMap';
import LossChart from '@/components/ml/LossChart';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { sequential } from '@/components/ml/colors';
import Tex from '@/components/math/Tex';
import Plane2D, { Point, usePlane } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, LoadingCard, FormulaPanel, Card,
} from '@/components/ml/TourKit';

/* ── the pictures and the network ──────────────────────────
   400 pictures of 12 × 12 pixels, each one soft blob, brightness
   exp(−d² / 2σ²) with σ = 1.3, centred at a random point of
   [1.5, 9.5]² (seed 4). A picture is 144 numbers, but two facts — the
   blob's column and row — decide all of them.

   The autoencoder is 144 → 32 → 2 → 32 → 144, tanh on every hidden layer
   (the 2-unit code included, so codes lie in (−1, 1)²) and nothing on the
   output. It trains in your browser to reproduce its input: 3,000 Adam
   steps at learning rate 0.003 on batches of 32 pictures, mean squared
   error per pixel. Same seeds, same network. */

const S = 12;
const SIGMA = 1.3;
const N_IMAGES = 400;
const ARCH = [144, 32, 2, 32, 144];
const TRAIN = { steps: 3000, batch: 32, lr: 0.003 };
const NET_SEED = 1;
const BATCH_SEED = 77;
const PARAMS = ARCH.slice(1).reduce((a, n, l) => a + n * ARCH[l] + n, 0);

function blob(cx, cy) {
    const img = new Array(S * S);
    for (let k = 0; k < S * S; k++) {
        const x = k % S, y = Math.floor(k / S);
        img[k] = Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * SIGMA * SIGMA));
    }
    return img;
}
const CENTRES = (() => {
    const r = createRng(4);
    return Array.from({ length: N_IMAGES }, () => [1.5 + 8 * r.next(), 1.5 + 8 * r.next()]);
})();
const IMAGES = CENTRES.map(([x, y]) => blob(x, y));

const rowsOf = (img) => Array.from({ length: S }, (_, r) => img.slice(r * S, r * S + S));
const msePix = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return s / a.length; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const lerp = (p, q, t) => p.map((v, i) => (1 - t) * v + t * q[i]);
const peakOf = (img) => Math.max(...img);
function nearestTo(points, at, skip = -1) {
    let best = -1, bd = Infinity;
    points.forEach((p, i) => { if (i === skip) return; const d = dist(p, at); if (d < bd) { bd = d; best = i; } });
    return best;
}
const nearestImage = (at) => nearestTo(CENTRES, at);

/* What a network that ignores its input can do at best: paint the average picture. */
const MEAN_IMAGE = Array.from({ length: S * S }, (_, k) => mean(IMAGES.map(img => img[k])));
const MEAN_MSE = mean(IMAGES.map(img => msePix(img, MEAN_IMAGE)));

/* Measured once with the same pictures and seeds, and checked by the test
   suite: the same autoencoder with a 1-unit code, and PCA, the linear
   version of the same squeeze, keeping 2 and 8 components. */
const NARROW_MSE = 0.0150;
const PCA_MSE = { 2: 0.017553, 8: 0.004601 };

/* ── training ───────────────────────────────────────────── */
function createRun(code = 2) {
    const net = createMLP([144, 32, code, 32, 144], { activation: 'tanh', output: 'linear', seed: NET_SEED });
    return { net, opt: createOptimizer(net, { type: 'adam', lr: TRAIN.lr }), rng: createRng(BATCH_SEED) };
}
/** One Adam step on a batch; returns the batch's error per pixel. */
function trainStep(run) {
    const X = Array.from({ length: TRAIN.batch }, () => IMAGES[run.rng.int(0, N_IMAGES - 1)]);
    const g = lossAndGrads(run.net, X, X);
    run.opt.step(g);
    return g.dataLoss / (S * S);
}

/** Every picture's code: the activations of the middle layer. */
function encodeAll(net, X) {
    const { A } = forward(net, X);
    const k = net.sizes[2], mid = A[2];
    return X.map((_, i) => Array.from(mid.slice(i * k, i * k + k)));
}
function encodeTrace(net, x) {
    const { A } = forward(net, [x]);
    return { hidden: Array.from(A[1]), code: Array.from(A[2]) };
}
/** The decoder half on its own: a code → 32 tanh units → 144 pixels. */
function decodeWith(net, z) {
    const k = z.length, H = net.sizes[3];
    const [W3, W4] = [net.W[2], net.W[3]], [b3, b4] = [net.b[2], net.b[3]];
    const hidden = new Array(H);
    for (let o = 0; o < H; o++) { let a = b3[o]; for (let i = 0; i < k; i++) a += W3[o * k + i] * z[i]; hidden[o] = Math.tanh(a); }
    const out = new Array(S * S);
    for (let o = 0; o < S * S; o++) { let a = b4[o]; for (let i = 0; i < H; i++) a += W4[o * H + i] * hidden[i]; out[o] = a; }
    return { hidden, out };
}
const decode = (net, z) => decodeWith(net, z).out;
function reconError(net) {
    const codes = encodeAll(net, IMAGES);
    return mean(IMAGES.map((img, i) => msePix(img, decode(net, codes[i]))));
}

/* Pairs of pictures at least 5 pixels apart, for the halfway comparison. */
const MIX_PAIRS = (() => {
    const r = createRng(9), pairs = [];
    for (let t = 0; t < 300; t++) {
        const i = r.int(0, N_IMAGES - 1), j = r.int(0, N_IMAGES - 1);
        if (dist(CENTRES[i], CENTRES[j]) >= 5) pairs.push([i, j]);
    }
    return pairs;
})();

const SNAPS = [0, 100, 500];
/** A resumable training job, so the page trains in slices and stays responsive. */
function createTourJob() {
    const run = createRun(2);
    const snaps = {}, history = [];
    let done = 0;
    return {
        progress: () => done / TRAIN.steps,
        advance(budgetMs) {
            const t0 = Date.now();
            while (done < TRAIN.steps) {
                if (SNAPS.includes(done) && !snaps[done]) snaps[done] = cloneMLP(run.net);
                const loss = trainStep(run);
                done++;
                if (done % 10 === 0) history.push({ step: done, loss });
                if (Date.now() - t0 >= budgetMs) return false;
            }
            return true;
        },
        result: () => analyse(run.net, snaps, history),
    };
}

function analyse(net, snaps, history) {
    const codes = encodeAll(net, IMAGES);
    const recon = codes.map(z => decode(net, z));
    const mse = mean(IMAGES.map((img, i) => msePix(img, recon[i])));
    // the picture with the nearest code: how far away is its blob?
    const nnMean = mean(codes.map((z, i) => dist(CENTRES[i], CENTRES[nearestTo(codes, z, i)])));
    let pairSum = 0, pairs = 0;
    for (let i = 0; i < N_IMAGES; i++) for (let j = i + 1; j < N_IMAGES; j++) { pairSum += dist(CENTRES[i], CENTRES[j]); pairs++; }
    const mixes = MIX_PAIRS.map(([i, j]) => {
        const mid = blob(...lerp(CENTRES[i], CENTRES[j], 0.5));
        const pix = lerp(IMAGES[i], IMAGES[j], 0.5);
        const lat = decode(net, lerp(codes[i], codes[j], 0.5));
        return { pixMse: msePix(pix, mid), latMse: msePix(lat, mid), pixPeak: peakOf(pix), latPeak: peakOf(lat) };
    });
    const mix = { n: mixes.length };
    for (const key of ['pixMse', 'latMse', 'pixPeak', 'latPeak']) mix[key] = mean(mixes.map(m => m[key]));
    return { net, snaps, history, codes, recon, mse, nnMean, pairMean: pairSum / pairs, mix };
}

/* ── the tour ───────────────────────────────────────────── */
/* Nine reference pictures, blobs nearest a 3 × 3 grid, drawn on the code map. */
const REFS = [2.5, 5.5, 8.5].flatMap(y => [2.5, 5.5, 8.5].map(x => nearestImage([x, y])));

/* Each preset follows picture A (and B, for the halfway act). `order` is
   which spot, A to D from left to right, holds the answer of each of the
   four map prompts: every spot once per preset. */
const PRESETS = [
    { label: 'Top left, bottom right', a: [2.5, 2.5], b: [8.5, 8.5], order: [2, 0, 3, 1] },
    { label: 'Bottom left, top right', a: [2.5, 8.5], b: [8.5, 2.5], order: [1, 3, 0, 2] },
    { label: 'Left, right', a: [2, 5.5], b: [9, 5.5], order: [3, 1, 2, 0] },
    { label: 'Top, bottom', a: [5.5, 2], b: [5.5, 9], order: [0, 2, 1, 3] },
];

/* Four pictures for each map prompt, each within 1.5 pixels of a different
   thumbnail's blob (and at least 3 from each other), none a thumbnail
   itself. Every ring then sits by a thumbnail, so the question is only which
   thumbnail the picture looks like; which ring holds the answer is decided by
   the preset's order, not by where the rings are. */
const QUERY_NEAR = 1.5;
const QUERY_GAP = 3;
const NEAR_REF = REFS.map(ri => CENTRES.map((_, i) => i).filter(i => !REFS.includes(i) && dist(CENTRES[i], CENTRES[ri]) <= QUERY_NEAR));
function querySets(presetIndex, count = 4, rng = createRng(300 + presetIndex)) {
    const sets = [];
    while (sets.length < count) {
        const set = rng.shuffle(REFS.map((_, k) => k)).slice(0, 4).map(k => rng.pick(NEAR_REF[k]));
        if (set.every((i, x) => set.every((j, y) => x === y || dist(CENTRES[i], CENTRES[j]) >= QUERY_GAP))) sets.push(set);
    }
    return sets;
}

const ACTS = [
    { id: 1, label: 'Pictures', icon: Grid3x3 },
    { id: 2, label: 'Squeeze', icon: Shrink },
    { id: 3, label: 'Rebuild', icon: Expand },
    { id: 4, label: 'Learning', icon: TrendingDown },
    { id: 5, label: 'The Code Map', icon: MapPin },
    { id: 6, label: 'In Between', icon: Blend },
    { id: 7, label: 'Too Narrow', icon: Minimize2 },
];

const n3 = (v) => { const s = Math.abs(v).toFixed(3); return (v < 0 && s !== '0.000' ? '−' : '') + s; };
const t3 = (v) => { const s = Math.abs(v).toFixed(3); return (v < 0 && s !== '0.000' ? '-' : '') + s; };
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);
const f4 = (v) => v.toFixed(4);
const times = (a, b) => (a / b).toFixed(1);
const SPOT = 'ABCD';
function where([x, y]) {
    const col = x < 4 ? 'left' : x < 8 ? 'middle' : 'right';
    const row = y < 4 ? 'top' : y < 8 ? 'middle' : 'bottom';
    if (row === 'middle') return col === 'middle' ? 'centre' : `${col} edge`;
    return col === 'middle' ? `${row} middle` : `${row} ${col}`;
}
const at = (i) => `column ${f1(CENTRES[i][0])}, row ${f1(CENTRES[i][1])}`;

function generateSteps(info, presetIndex) {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, presetIndex, ...data, explanation });
    const P = PRESETS[presetIndex];
    const a = nearestImage(P.a), b = nearestImage(P.b);
    const za = info.codes[a], zb = info.codes[b];
    const mseA = msePix(IMAGES[a], info.recon[a]);

    s(1, 'Pictures', { kind: 'gallery' },
        `Four hundred pictures, each 12 × 12 = 144 pixels. Every one is a single soft blob; only where the blob sits changes. Storing a picture takes 144 numbers, yet two facts — the blob's column and row — pin it down.`);
    s(1, 'Pictures', { kind: 'pixels', img: a },
        `This one has its blob at ${at(a)}, near the ${where(CENTRES[a])}; its brightest pixel is ${f2(peakOf(IMAGES[a]))}. An autoencoder is trained to output its own input, through a middle layer too narrow to copy it: here, 2 numbers.`);
    const enc = encodeTrace(info.net, IMAGES[a]);
    s(2, 'Squeeze', { kind: 'encode', img: a, hidden: enc.hidden, code: enc.code },
        `The encoder: 144 pixels → 32 tanh units → 2 tanh units. Its output, z = (${n3(za[0])}, ${n3(za[1])}), is the code — everything the decoder will be told about this picture. Nobody chose what the two numbers mean; training decides.`);
    const dec = decodeWith(info.net, za);
    s(3, 'Rebuild', { kind: 'decode', img: a, code: za, hidden: dec.hidden, out: dec.out, mse: mseA },
        `The decoder: 2 → 32 → 144, with no squashing on the output. From (${n3(za[0])}, ${n3(za[1])}) alone it paints the blob back. The error is ${f4(mseA)} per pixel: the picture returns almost exactly, because two numbers are enough to describe it.`);
    s(3, 'Rebuild', { kind: 'baseline', img: a },
        `Is ${f4(info.mse)} — the error over all 400 pictures — good? A network that ignored its input could at best paint the average picture, a smudge in the middle, with error ${f4(MEAN_MSE)}. The two-number code is ${times(MEAN_MSE, info.mse)}× better.`);
    for (const t of [0, 100, 500, TRAIN.steps]) {
        const net = t === TRAIN.steps ? info.net : info.snaps[t];
        const out = decode(net, encodeAll(net, [IMAGES[a]])[0]);
        const mse = t === TRAIN.steps ? info.mse : reconError(net);
        const vsMean = mse < MEAN_MSE ? `already ${times(MEAN_MSE, mse)}× better than the average picture` : `no better yet than painting the average picture (${f4(MEAN_MSE)})`;
        const lead = t === 0 ? 'Before training, with random weights' : t === TRAIN.steps ? `After all ${TRAIN.steps.toLocaleString('en-US')} steps` : `After ${t} steps`;
        s(4, 'Learning', { kind: 'snap', at: t, img: a, out, mse },
            `${lead}, picture A comes back as the right-hand image. Over all 400 pictures the error is ${f4(mse)} per pixel, ${vsMean}.${t === TRAIN.steps ? ' The curve is the error of each training batch.' : ''}`);
    }
    s(5, 'The Code Map', { kind: 'map' },
        `Every picture's code as a point. The nine thumbnails are pictures with blobs on a 3 × 3 grid, drawn at their codes. Nobody told the network about columns and rows, yet pictures with nearby blobs get nearby codes. The map may come out rotated, flipped or bent; only the neighbours matter.`);
    querySets(presetIndex).forEach((set, k) => {
        const cands = [...set].sort((i, j) => info.codes[i][0] - info.codes[j][0]);
        const answer = P.order[k], query = cands[answer];
        const ref = REFS[nearestTo(REFS.map(i => CENTRES[i]), CENTRES[query])];
        s(5, 'The Code Map', { kind: 'ask', query, cands, k },
            `A picture the tour has not shown, its blob nearest the ${where(CENTRES[ref])} thumbnail's. The rings A to D mark the codes of four pictures, and one of them is this one. Find the thumbnail it looks like and look near its code.`);
        s(5, 'The Code Map', { kind: 'reveal', query, cands, answer, ref, k },
            `Spot ${SPOT[answer]}: code (${n3(info.codes[query][0])}, ${n3(info.codes[query][1])}). The blob sits at ${at(query)}, closest to the ${where(CENTRES[ref])} thumbnail, whose code is ${f2(dist(info.codes[query], info.codes[ref]))} away. The other three pictures, shown beside the map, have blobs elsewhere.`);
    });
    s(5, 'The Code Map', { kind: 'neighbours' },
        `Measured over all 400 pictures: the picture with the nearest code has its blob ${f2(info.nnMean)} pixels away on average, where two pictures picked at random are ${f2(info.pairMean)} apart. The code is a map of blob positions, learned only from trying to rebuild pixels.`);

    const pix = lerp(IMAGES[a], IMAGES[b], 0.5);
    const zmid = lerp(za, zb, 0.5);
    const lat = decode(info.net, zmid);
    const mid = blob(...lerp(CENTRES[a], CENTRES[b], 0.5));
    s(6, 'In Between', { kind: 'pixelMix', a, b, mix: pix, mid },
        `Pictures A and B, ${f1(dist(CENTRES[a], CENTRES[b]))} pixels apart. What lies halfway? Averaging their pixels gives two faint blobs — brightest pixel ${f2(peakOf(pix))} — not one blob in between. Against a real blob at the midpoint, its error is ${f4(msePix(pix, mid))}.`);
    s(6, 'In Between', { kind: 'codeMix', a, b, mix: lat, mid, zmid },
        `Average their codes instead and decode: one blob, brightest pixel ${f2(peakOf(lat))}, error ${f4(msePix(lat, mid))}. Over ${info.mix.n} pairs at least 5 pixels apart, averaging codes beats averaging pixels ${times(info.mix.pixMse, info.mix.latMse)}× on error (${f4(info.mix.latMse)} against ${f4(info.mix.pixMse)}).`);
    const ts = [0, 1, 2, 3, 4, 5, 6].map(i => i / 6);
    s(6, 'In Between', { kind: 'walk', a, b, fades: ts.map(t => lerp(IMAGES[a], IMAGES[b], t)), walks: ts.map(t => decode(info.net, lerp(za, zb, t))) },
        `Seven steps from A to B. Fading pixels dims one blob while the other brightens; walking the code, z = (1 − t)·zA + t·zB, slides a single blob across. Every point of the code space decodes to a picture, which is why an autoencoder's decoder can be used to make new ones.`);
    s(7, 'Too Narrow', { kind: 'narrow' },
        `Squeeze through one number instead of two and the same training ends at ${f4(NARROW_MSE)}, ${times(NARROW_MSE, info.mse)}× worse: these pictures vary in two independent ways, and one number cannot keep every position apart. PCA, the straight-line squeeze, does worse still with two numbers (${f4(PCA_MSE[2])}) and needs eight to come close (${f4(PCA_MSE[8])}). Try one number in Explore.`);
    return steps;
}

/* One prompt per map question, asked before the answer is drawn. The four
   pictures are equally far apart and the answer's spot follows the preset's
   order, so only reading the map finds it. */
function predictFor(step, next) {
    if (!next || step.kind !== 'ask' || next.kind !== 'reveal') return null;
    return {
        question: 'This picture goes through the encoder. On which spot does its code land?',
        options: step.cands.map((_, c) => `Spot ${SPOT[c]}`),
        correct: next.answer,
        because: `Spot ${SPOT[next.answer]}: its blob is nearest the ${where(CENTRES[next.ref])} thumbnail's, and pictures that look alike get codes close together.`,
    };
}

function formulaFor(step) {
    switch (step.kind) {
        case 'encode':
            return String.raw`z = \tanh\!\big(W_2 \tanh(W_1 x + b_1) + b_2\big) = (${t3(step.code[0])},\ ${t3(step.code[1])})`;
        case 'decode':
            return String.raw`\hat{x} = W_4 \tanh(W_3 z + b_3) + b_4, \qquad \tfrac{1}{144}\sum_i (x_i - \hat{x}_i)^2 = ${f4(step.mse)}`;
        case 'snap':
            return String.raw`L = \tfrac{1}{144}\sum_i (x_i - \hat{x}_i)^2 = ${f4(step.mse)}`;
        case 'pixelMix':
            return String.raw`\tfrac{1}{2}(x_A + x_B)`;
        case 'codeMix':
            return String.raw`\hat{x} = \mathrm{decode}\big(\tfrac{1}{2}(z_A + z_B)\big), \quad \tfrac{1}{2}(z_A + z_B) = (${t3(step.zmid[0])},\ ${t3(step.zmid[1])})`;
        case 'walk':
            return String.raw`z_t = (1 - t)\, z_A + t\, z_B, \quad t = 0, \tfrac{1}{6}, \dots, 1`;
        default:
            return null;
    }
}

const quizQuestions = [
    {
        question: 'An autoencoder is trained to make its output equal its input. Why does it not simply learn to copy?',
        options: [
            'The middle layer is too narrow to carry every pixel, so it must keep only what describes the picture',
            'Its weights are frozen after the first step',
            'The loss rewards outputs that differ from the input',
            'No neural network can represent the identity',
        ],
        correct: 0,
        explanation: 'Two numbers cannot hold 144 independent pixels. To rebuild the picture from them, the network has to find the two facts that describe it — here, the blob\'s column and row.',
    },
    {
        question: 'You average the pixels of two pictures whose blobs are far apart. What do you get?',
        options: [
            'One blob halfway between them',
            'Two faint blobs, each about half as bright',
            'A blank picture',
            'The brighter of the two pictures',
        ],
        correct: 1,
        explanation: 'Pixel averaging keeps both blobs at half strength. Averaging the two codes and decoding gives one blob in between, because training laid the code space out by blob position.',
    },
    {
        question: 'With one number in the middle instead of two, the same training ends about four times worse. Why?',
        options: [
            'A one-number code trains more slowly, and 3,000 steps are not enough',
            'The pictures vary in two independent ways, column and row, and one number cannot keep every position apart',
            'A layer of one unit cannot use tanh',
            'The decoder has too few weights left to paint with',
        ],
        correct: 1,
        explanation: 'Every blob position needs its own code. A single number can only trace one path through the positions, so pictures off that path are rebuilt as the nearest picture on it.',
    },
];

const codeExample = `import torch
from torch import nn

# 400 pictures of one soft blob each, 12 × 12 = 144 pixels
ys, xs = torch.meshgrid(torch.arange(12.), torch.arange(12.), indexing='ij')
c = 1.5 + 8 * torch.rand(400, 2)
images = torch.exp(-((xs - c[:, 0, None, None]) ** 2 + (ys - c[:, 1, None, None]) ** 2)
                   / (2 * 1.3 ** 2)).reshape(400, 144)

encoder = nn.Sequential(nn.Linear(144, 32), nn.Tanh(), nn.Linear(32, 2), nn.Tanh())
decoder = nn.Sequential(nn.Linear(2, 32), nn.Tanh(), nn.Linear(32, 144))
model = nn.Sequential(encoder, decoder)
print(sum(p.numel() for p in model.parameters()))   # 9554

opt = torch.optim.Adam(model.parameters(), lr=0.003)
for step in range(3000):
    x = images[torch.randint(0, 400, (32,))]          # [32, 144]
    loss = ((model(x) - x) ** 2).mean()                # error per pixel
    opt.zero_grad(); loss.backward(); opt.step()

z = encoder(images[:1])                    # [1, 2]: the code
x_hat = decoder(z)                         # [1, 144]: the picture it stands for
halfway = decoder((encoder(images[:1]) + encoder(images[1:2])) / 2)`;

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
const r2 = (v) => Math.round(v * 100) / 100;
const Caption = ({ children }) => <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">{children}</p>;

function Pic({ img, label, cell = 10, tone, sub }) {
    return (
        <figure className="min-w-0 text-center">
            <div className={`inline-block rounded-md p-0.5 ${tone ?? ''}`} style={{ maxWidth: '100%' }}>
                <FeatureMap data={rowsOf(img)} cell={cell} domain={[0, 1]} gap={0} ariaLabel={label ?? 'Picture'} />
            </div>
            {label && <figcaption className="text-[11px] text-slate-400 mt-1">{label}</figcaption>}
            {sub && <figcaption className="text-[11px] text-slate-500 font-mono">{sub}</figcaption>}
        </figure>
    );
}

function Strip({ values, label }) {
    return (
        <div className="min-w-0">
            <div className="flex items-center justify-between mb-1"><Caption>{label}</Caption><ShapeTag shape={[1, values.length]} /></div>
            <FeatureMap data={[values]} cell={12} scale="diverging" domain={[-1, 1]} gap={0.5} ariaLabel={label} />
        </div>
    );
}

function CodeChip({ z }) {
    return (
        <div className="flex items-center gap-2">
            {z.map((v, i) => (
                <span key={i} className="font-mono text-lg px-3 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/40 text-yellow-100">{n3(v)}</span>
            ))}
            <ShapeTag shape={[1, z.length]} />
        </div>
    );
}

function Dots({ codes, color = '#64748b' }) {
    const { toScreen } = usePlane();
    return <g>{codes.map((z, i) => { const [x, y] = toScreen(z); return <circle key={i} cx={x} cy={y} r={1.8} fill={color} opacity={0.55} />; })}</g>;
}
function Thumb({ at: pos, img, size = 34, stroke = '#475569' }) {
    const { toScreen } = usePlane();
    const [cx, cy] = toScreen(pos);
    const c = size / S, x0 = r2(cx - size / 2), y0 = r2(cy - size / 2);
    return (
        <g>
            <rect x={x0 - 1.5} y={y0 - 1.5} width={size + 3} height={size + 3} fill="#020617" stroke={stroke} strokeWidth={1.5} />
            {img.map((v, k) => (
                <rect key={k} x={r2(x0 + (k % S) * c)} y={r2(y0 + Math.floor(k / S) * c)} width={r2(c + 0.06)} height={r2(c + 0.06)} fill={sequential(v)} />
            ))}
        </g>
    );
}
function Ring({ at: pos, label, tone }) {
    const { toScreen } = usePlane();
    const [x, y] = toScreen(pos);
    return (
        <g>
            <circle cx={x} cy={y} r={10} fill="none" stroke="#020617" strokeWidth={5} />
            <circle cx={x} cy={y} r={10} fill="none" stroke={tone} strokeWidth={2.5} />
            <text x={x + 12} y={y - 10} fill={tone} fontSize={16} fontWeight={700} stroke="#020617" strokeWidth={3} paintOrder="stroke">{label}</text>
        </g>
    );
}

function CodeMap({ info, cands, answer = null, extra }) {
    return (
        <Plane2D xRange={[-1.2, 1.2]} yRange={[-1.2, 1.2]} grid={0.5} width={480} ariaLabel="The code of every picture, with reference thumbnails">
            <Dots codes={info.codes} />
            {REFS.map(i => <Thumb key={i} at={info.codes[i]} img={IMAGES[i]} />)}
            {cands?.map((i, c) => (
                <Ring key={i} at={info.codes[i]} label={SPOT[c]} tone={answer === null ? '#facc15' : c === answer ? '#4ade80' : '#94a3b8'} />
            ))}
            {extra}
        </Plane2D>
    );
}

function Bars({ rows }) {
    const top = Math.max(...rows.map(r => r.value));
    return (
        <div className="space-y-2.5 w-full max-w-xl">
            {rows.map(r => (
                <div key={r.label}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{r.label}</span><span className="font-mono text-slate-400">{f4(r.value)}</span></div>
                    <div className="h-3 rounded bg-slate-800"><div className="h-3 rounded" style={{ width: `${(100 * r.value) / top}%`, background: r.color }} /></div>
                </div>
            ))}
        </div>
    );
}

function VisualizationPanel({ step, info }) {
    if (!step) return null;
    switch (step.kind) {
        case 'gallery':
            return (
                <div className="w-full">
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-w-2xl mx-auto">
                        {IMAGES.slice(0, 12).map((img, i) => <Pic key={i} img={img} cell={7} />)}
                    </div>
                    <p className="text-center text-xs text-slate-500 mt-3">12 of the 400 pictures · each <ShapeTag shape={[12, 12]} /> = 144 numbers</p>
                </div>
            );
        case 'pixels':
            return (
                <div className="w-full flex flex-col items-center gap-2">
                    <div className="w-full max-w-md">
                        <FeatureMap data={rowsOf(step.img === undefined ? [] : IMAGES[step.img])} cell={30} domain={[0, 1]} showValues format={(v) => v.toFixed(1)} ariaLabel="Picture A with its pixel values" />
                    </div>
                    <p className="text-xs text-slate-500">Picture A · <ShapeTag shape={[12, 12]} /> pixel values</p>
                </div>
            );
        case 'encode':
            return (
                <div className="w-full grid sm:grid-cols-[auto_1fr] gap-5 items-center">
                    <Pic img={IMAGES[step.img]} label="Picture A, 144 pixels" cell={12} />
                    <div className="space-y-4 min-w-0">
                        <Strip values={step.hidden} label="32 tanh units" />
                        <div><Caption>The code, z</Caption><CodeChip z={step.code} /></div>
                    </div>
                </div>
            );
        case 'decode':
            return (
                <div className="w-full space-y-4">
                    <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-center">
                        <div><Caption>The code, z</Caption><CodeChip z={step.code} /></div>
                        <Strip values={step.hidden} label="32 tanh units" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <Pic img={IMAGES[step.img]} label="Original" cell={10} />
                        <Pic img={step.out} label="Rebuilt from 2 numbers" cell={10} tone="ring-1 ring-yellow-500/50" />
                        <figure className="min-w-0 text-center">
                            <FeatureMap data={rowsOf(step.out.map((v, k) => v - IMAGES[step.img][k]))} cell={10} scale="diverging" domain={[-0.25, 0.25]} gap={0} ariaLabel="Error per pixel" />
                            <figcaption className="text-[11px] text-slate-400 mt-1">Error, ±0.25 scale</figcaption>
                        </figure>
                    </div>
                </div>
            );
        case 'baseline':
            return (
                <div className="w-full space-y-5">
                    <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
                        <Pic img={IMAGES[step.img]} label="Original" cell={9} />
                        <Pic img={info.recon[step.img]} label="Autoencoder" cell={9} />
                        <Pic img={MEAN_IMAGE} label="Average picture" cell={9} />
                    </div>
                    <div className="flex justify-center"><Bars rows={[
                        { label: 'Paint the average picture', value: MEAN_MSE, color: '#64748b' },
                        { label: 'Autoencoder, 2-number code', value: info.mse, color: '#facc15' },
                    ]} /></div>
                </div>
            );
        case 'snap':
            return (
                <div className="w-full grid sm:grid-cols-[auto_1fr] gap-5 items-center">
                    <div className="grid grid-cols-2 gap-3">
                        <Pic img={IMAGES[step.img]} label="Original" cell={9} />
                        <Pic img={step.out} label={`Step ${step.at}`} cell={9} tone="ring-1 ring-yellow-500/50" sub={f4(step.mse)} />
                    </div>
                    <div className="min-w-0">
                        <Caption>Error per pixel, each batch</Caption>
                        <LossChart logY series={[{ name: 'batch error', color: '#facc15', points: info.history.filter(h => h.step <= Math.max(step.at, 10)).map(h => ({ x: h.step, y: h.loss })) }]} />
                    </div>
                </div>
            );
        case 'map':
        case 'neighbours':
            return <div className="w-full max-w-lg mx-auto"><CodeMap info={info} /></div>;
        case 'ask':
        case 'reveal':
            return (
                <div className="w-full grid md:grid-cols-[1fr_auto] gap-4 items-center">
                    <div className="min-w-0 max-w-lg w-full mx-auto"><CodeMap info={info} cands={step.cands} answer={step.kind === 'reveal' ? step.answer : null} /></div>
                    <div className="flex md:flex-col items-center justify-center gap-4">
                        <Pic img={IMAGES[step.query]} label="This picture" cell={8} tone="ring-2 ring-yellow-400" />
                        {step.kind === 'reveal' && (
                            <div className="grid grid-cols-2 gap-2">
                                {step.cands.map((i, c) => <Pic key={i} img={IMAGES[i]} label={`Spot ${SPOT[c]}`} cell={4} tone={c === step.answer ? 'ring-2 ring-green-400' : ''} />)}
                            </div>
                        )}
                    </div>
                </div>
            );
        case 'pixelMix':
        case 'codeMix':
            return (
                <div className="w-full space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                        <Pic img={IMAGES[step.a]} label="A" cell={8} />
                        <Pic img={step.mix} label={step.kind === 'pixelMix' ? 'Average pixels' : 'Decode the average code'} cell={8} tone={step.kind === 'pixelMix' ? 'ring-1 ring-red-400/60' : 'ring-1 ring-green-400/60'} sub={`peak ${f2(peakOf(step.mix))}`} />
                        <Pic img={IMAGES[step.b]} label="B" cell={8} />
                        <Pic img={step.mid} label="A real blob halfway" cell={8} />
                    </div>
                </div>
            );
        case 'walk':
            return (
                <div className="w-full space-y-4">
                    {[['Fading the pixels', step.fades], ['Walking the code', step.walks]].map(([title, imgs]) => (
                        <div key={title}>
                            <Caption>{title}</Caption>
                            <div className="grid grid-cols-7 gap-1.5">{imgs.map((img, i) => <Pic key={i} img={img} cell={5} />)}</div>
                        </div>
                    ))}
                    <p className="text-[11px] text-slate-500 text-center">t = 0 (picture A) to t = 1 (picture B)</p>
                </div>
            );
        case 'narrow':
            return (
                <div className="w-full flex justify-center">
                    <Bars rows={[
                        { label: 'Paint the average picture', value: MEAN_MSE, color: '#64748b' },
                        { label: 'PCA, 2 numbers (a straight-line squeeze)', value: PCA_MSE[2], color: '#a78bfa' },
                        { label: 'Autoencoder, 1 number', value: NARROW_MSE, color: '#f87171' },
                        { label: 'PCA, 8 numbers', value: PCA_MSE[8], color: '#c4b5fd' },
                        { label: 'Autoencoder, 2 numbers', value: info.mse, color: '#facc15' },
                    ]} />
                </div>
            );
        default:
            return null;
    }
}

/* ── explore ─────────────────────────────────────────────── */
function NarrowPanel({ twoNumbers }) {
    const trainer = useTrainer({
        init: () => createRun(1),
        step: (run) => ({ loss: trainStep(run) }),
        deps: [],
        maxSteps: TRAIN.steps,
        budgetMs: 8,
    });
    const run = trainer.state;
    const version = Math.floor(trainer.steps / 100);
    const view = useMemo(() => ({
        mse: reconError(run.net),
        strip: [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].map(u => decode(run.net, [u])),
    }), [run, version]); // eslint-disable-line react-hooks/exhaustive-deps
    const [u, setU] = useState(0);
    const one = useMemo(() => decode(run.net, [u]), [run, u, version]); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                <button onClick={trainer.toggle} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">
                    {trainer.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{trainer.running ? 'Pause' : trainer.steps ? 'Resume' : 'Train the 1-number autoencoder'}
                </button>
                <button onClick={trainer.reset} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-3.5 w-3.5" />Reset</button>
                <span className="text-xs text-slate-400 font-mono ml-auto">step {trainer.steps} / {TRAIN.steps} · error {f4(view.mse)}</span>
            </div>
            <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-center">
                <Pic img={one} label={`decode(${n3(u)})`} cell={8} />
                <ParamSlider label="The one number" value={u} onChange={setU} min={-1} max={1} step={0.01} accent="yellow" />
            </div>
            <div>
                <Caption>Everything the decoder can paint, code −1 to 1</Caption>
                <div className="grid grid-cols-9 gap-1">{view.strip.map((img, i) => <Pic key={i} img={img} cell={4} />)}</div>
            </div>
            <BreakNote>
                One number traces a single path through the blob positions, so a picture off that path comes back as the nearest picture on it, or as a blur. After {trainer.steps.toLocaleString('en-US')} steps the error is {f4(view.mse)}; the two-number code reached {f4(twoNumbers)}. Measured over the full 3,000 steps: {f4(NARROW_MSE)}.
            </BreakNote>
        </div>
    );
}

function Explore({ info }) {
    const [z, setZ] = useState(() => info.codes[REFS[0]]);
    const out = useMemo(() => decode(info.net, z), [info, z]);
    const near = useMemo(() => nearestTo(info.codes, z), [info, z]);
    const [pairIndex, setPairIndex] = useState(0);
    const [t, setT] = useState(0.5);
    const [narrow, setNarrow] = useState(false);
    const [i, j] = MIX_PAIRS[pairIndex % MIX_PAIRS.length];
    const pix = lerp(IMAGES[i], IMAGES[j], t);
    const lat = useMemo(() => decode(info.net, lerp(info.codes[i], info.codes[j], t)), [info, i, j, t]);
    const truth = blob(...lerp(CENTRES[i], CENTRES[j], t));
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <p className="text-sm text-slate-300 mb-3">Drag the yellow point anywhere on the code map. The decoder paints the picture that code stands for, including codes no training picture has.</p>
                <div className="grid md:grid-cols-[1fr_auto] gap-5 items-center">
                    <div className="min-w-0 max-w-lg w-full mx-auto">
                        <CodeMap info={info} extra={<Point at={z} onDrag={setZ} color="#facc15" r={7} ariaLabel="Code to decode" />} />
                    </div>
                    <div className="flex md:flex-col items-center justify-center gap-4">
                        <Pic img={out} label={`decode(${n3(z[0])}, ${n3(z[1])})`} cell={11} tone="ring-2 ring-yellow-400" sub={`peak ${f2(peakOf(out))}`} />
                        <Pic img={IMAGES[near]} label="Nearest training picture" cell={6} sub={`code ${f2(dist(z, info.codes[near]))} away`} />
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">Halfway between two pictures</h3>
                    <button onClick={() => setPairIndex(k => k + 1)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-yellow-500"><Shuffle className="h-3.5 w-3.5" />New pair</button>
                </div>
                <ParamSlider label="t, from A to B" value={t} onChange={setT} min={0} max={1} step={0.01} accent="yellow" />
                <div className="grid grid-cols-3 gap-3">
                    <Pic img={pix} label="Blend the pixels" cell={8} sub={`error ${f4(msePix(pix, truth))}`} />
                    <Pic img={lat} label="Blend the codes" cell={8} sub={`error ${f4(msePix(lat, truth))}`} />
                    <Pic img={truth} label="A real blob at t" cell={8} />
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Unplug className="h-4 w-4 text-amber-400" />Break it: squeeze to one number</h3>
                <p className="text-xs text-slate-400">The same network and training with a 1-unit middle layer: 144 → 32 → 1 → 32 → 144. It trains here in your browser.</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setNarrow(w => !w)} aria-pressed={narrow}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${narrow ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-amber-500'}`}>
                        <Unplug className="h-3.5 w-3.5" />{narrow ? 'One number' : 'Squeeze to one number'}
                    </button>
                    {narrow && <button onClick={() => setNarrow(false)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                {narrow && <NarrowPanel twoNumbers={info.mse} />}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function AutoencodersPage() {
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
    const loading = <LoadingCard text={`Training the autoencoder in your browser (3,000 steps)… ${Math.round(progress * 100)}%`} />;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/deep-learning-architectures" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Deep Learning Architectures
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Autoencoders</h1>
                    <p className="text-yellow-50 max-w-3xl">
                        Squeeze 144 pixels through two numbers and back. Train it in your browser, watch it discover where the blob sits without being told, then drag a point around the two-number space and see the decoder paint the picture it stands for.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/machine-learning/principal-component-analysis" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Principal Component Analysis</Link>
                        <Link href="/neural-networks/backpropagation" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Backpropagation</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Drag the code', MousePointer2]]} mode={mode}
                            setMode={(m) => (m === 'explore' ? toExplore() : setMode(m))} accent="yellow" />
                        <SourceChip kind="live">Trained in your browser · 144 → 32 → 2 → 32 → 144 · {PARAMS.toLocaleString('en-US')} numbers</SourceChip>
                    </div>

                    {!info ? loading : mode === 'explore' ? (
                        <Explore key={exploreKey} info={info} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Pictures A and B:</span>
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

                    <InCode title="The same autoencoder in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="What the bottleneck does" icon={Shrink}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="font-mono text-slate-200">Encoder</span>: 144 → 32 → 2. <span className="font-mono text-slate-200">Decoder</span>: 2 → 32 → 144. The only target is the input itself.</li>
                            <li><span className="font-mono text-slate-200">Code</span>: the 2 numbers in the middle. Nothing says what they mean; training lays them out by what varies.</li>
                            <li><span className="font-mono text-slate-200">Versus PCA</span>: PCA rebuilds a picture as the average plus a mix of fixed pictures, so it cannot slide a blob. The tanh layers let the code bend.</li>
                            <li>Every code decodes to some picture, which makes the decoder a generator. Variational autoencoders train the code space to have no holes.</li>
                        </ul>
                    </Card>

                    <Misconception claim="The picture halfway between two others is their average, pixel by pixel.">
                        {info ? (
                            <>
                                <p>Averaging pixels keeps both blobs at half strength. Over {info.mix.n} pairs at least 5 pixels apart, the pixel average&apos;s brightest pixel is {f2(info.mix.pixPeak)} on average, and its error against a real blob at the midpoint is {f4(info.mix.pixMse)}.</p>
                                <p>Decoding the average of the two codes gives one blob: brightest pixel {f2(info.mix.latPeak)}, error {f4(info.mix.latMse)} — {times(info.mix.pixMse, info.mix.latMse)}× closer. Halfway is a place in the code space, not in pixel space.</p>
                            </>
                        ) : <p>Measuring once the autoencoder has trained…</p>}
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
