"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, PenLine, Image as ImageIcon, Grid3x3, Shrink, Layers, Boxes, Network, Target,
    CheckCircle, XCircle, Eraser, Wrench, Contrast, Waves,
} from 'lucide-react';
import { forward, preprocessDrawing } from '@/lib/ml/digitCnn';
import { loadDigitCnnWithSamples } from '@/lib/ml/digitSamples';
import { rankedChoices, slotOf } from '@/lib/ml/predictChoices';
import useLoaded from '@/lib/ml/useLoaded';
import { createRng } from '@/lib/random';
import FeatureMap from '@/components/ml/FeatureMap';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import ProbBars from '@/components/ml/ProbBars';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Segmented, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card,
} from '@/components/ml/TourKit';

/* ── the network ───────────────────────────────────────────
   The digit CNN, layer by layer: what each layer holds, its output shape
   and how many learned numbers it has. The counts are checked against the
   loaded weights by the page's test suite. */

const LAYERS = [
    { id: 'conv1', what: '8 kernels of 3 × 3 on 1 channel, + 8 biases', shape: [8, 28, 28], params: 8 * 1 * 9 + 8 },
    { id: 'pool1', what: '2 × 2 max pool, stride 2', shape: [8, 14, 14], params: 0 },
    { id: 'conv2', what: '16 kernels of 3 × 3 on 8 channels, + 16 biases', shape: [16, 14, 14], params: 16 * 8 * 9 + 16 },
    { id: 'pool2', what: '2 × 2 max pool, stride 2', shape: [16, 7, 7], params: 0 },
    { id: 'fc1', what: '784 inputs to 32 units, + 32 biases', shape: [32], params: 784 * 32 + 32 },
    { id: 'fc2', what: '32 inputs to 10 outputs, + 10 biases', shape: [10], params: 32 * 10 + 10 },
];
const TOTAL_PARAMS = LAYERS.reduce((a, l) => a + l.params, 0);

// samples.json holds four MNIST test digits of each class, in order.
const PRESETS = [
    { label: 'A zero', sample: 2 },
    { label: 'A two', sample: 9 },
    { label: 'A five', sample: 21 },
    { label: 'A seven', sample: 29 },
    { label: 'A nine', sample: 37 },
];

const ACTS = [
    { id: 1, label: 'Input', name: 'The Input', icon: ImageIcon },
    { id: 2, label: 'conv1', name: 'First Convolution', icon: Grid3x3 },
    { id: 3, label: 'pool1', name: 'First Pool', icon: Shrink },
    { id: 4, label: 'conv2', name: 'Second Convolution', icon: Layers },
    { id: 5, label: 'pool2', name: 'Second Pool and Flatten', icon: Boxes },
    { id: 6, label: 'Dense', name: 'Dense Layers', icon: Network },
    { id: 7, label: 'Answer', name: 'The Answer', icon: Target },
];

const MEAN = 0.1307, STD = 0.3081;
const fmtInt = (v) => Math.round(v).toLocaleString('en-US');
const f2 = (v) => (Math.round(v * 100) / 100 + 0).toFixed(2);
const pct = (v) => `${Math.round(v * 100)}%`;
// Three decimals, without rounding a near-certainty up to a flat 1.
const prob = (p) => (p >= 0.9995 ? 'above 0.999' : p.toFixed(3));
const argmax = (a) => { let k = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[k]) k = i; return k; };
const plane = (flat, c, H, W) => Array.from({ length: H }, (_, y) => Array.from(flat.slice((c * H + y) * W, (c * H + y + 1) * W)));
const planes = (flat, C, H, W) => Array.from({ length: C }, (_, c) => plane(flat, c, H, W));
const shapeLabel = (s) => `[${s.join(', ')}]`;

/** Every intermediate the page draws, from one forward pass. */
function readDigit(model, pixels) {
    const run = forward(model, pixels);
    const ranked = run.probs.map((p, d) => [p, d]).sort((a, b) => b[0] - a[0]);
    return {
        ...run,
        pred: ranked[0][1], runnerUp: ranked[1][1],
        maps: {
            input: plane(pixels, 0, 28, 28), norm: plane(run.input, 0, 28, 28),
            conv1: planes(run.conv1, 8, 28, 28), conv1Relu: planes(run.conv1Relu, 8, 28, 28),
            pool1: planes(run.pool1, 8, 14, 14), conv2Relu: planes(run.conv2Relu, 16, 14, 14),
            pool2: planes(run.pool2, 16, 7, 7), flat: plane(run.pool2, 0, 16, 49),
        },
    };
}

/** The strongest conv1 response, written out as its nine products plus the bias. */
function workedUnit(model, run) {
    const k = argmax(run.conv1);
    const c = Math.floor(k / 784), y = Math.floor((k % 784) / 28), x = k % 28;
    const w = model.tensors['conv1.weight'].data, b = model.tensors['conv1.bias'].data[c];
    const terms = [];
    for (let a = 0; a < 3; a++) {
        for (let d = 0; d < 3; d++) {
            const iy = y + a - 1, ix = x + d - 1;
            const xv = iy >= 0 && iy < 28 && ix >= 0 && ix < 28 ? run.input[iy * 28 + ix] : 0;
            terms.push({ w: w[c * 9 + a * 3 + d], x: xv });
        }
    }
    return { c, y, x, terms, b, value: run.conv1[k] };
}

/** One conv2 kernel: the 8 slices of 3 × 3 weights feeding output channel o. */
function conv2Kernel(model, o) {
    const w = model.tensors['conv2.weight'].data;
    return Array.from({ length: 8 }, (_, c) => Array.from({ length: 3 }, (_, a) => Array.from({ length: 3 }, (_, d) => w[((o * 8 + c) * 3 + a) * 3 + d])));
}

/* ── the guided tour ─────────────────────────────────────── */
function generateSteps(model, samples, presetIndex) {
    const pre = PRESETS[presetIndex];
    const sample = samples[pre.sample];
    const r = readDigit(model, sample.pixels);
    const label = sample.label;
    const unit = workedUnit(model, r);
    const kernels = Array.from({ length: 8 }, (_, c) => Array.from({ length: 3 }, (_, a) => Array.from({ length: 3 }, (_, d) => model.tensors['conv1.weight'].data[c * 9 + a * 3 + d])));
    const zeros1 = r.conv1Relu.filter(v => v === 0).length;
    const strongest2 = Math.floor(argmax(r.conv2Relu) / 196);
    const active = r.fc1.filter(v => v > 0).length;
    const steps = [];
    const base = { presetIndex, digit: label, r };
    const s = (act, data, explanation) => steps.push({ act, actName: ACTS[act - 1].name, ...base, ...data, explanation });

    s(1, { kind: 'input' }, `A handwritten ${label} from the MNIST test set: 28 × 28 = 784 brightness values between 0 and 1, white ink on black. The network was trained on 60,000 pictures like this one.`);
    s(1, { kind: 'norm' }, `First the pixels are standardised exactly as they were in training: (x − ${MEAN}) / ${STD}. The black background becomes ${f2(-MEAN / STD)} and full ink ${f2((1 - MEAN) / STD)}. The input is a stack of one channel: [1, 28, 28].`);
    s(2, { kind: 'kernels', kernels, layer: 0 }, `conv1 holds 8 kernels of 3 × 3 weights over the single input channel, plus one bias each: 8 × 1 × 9 + 8 = ${LAYERS[0].params} learned numbers. Blue weights reward ink under them, orange ones penalise it.`);
    s(2, { kind: 'conv1', unit }, `Each kernel slides over the picture (padding 1) and writes one map: [8, 28, 28]. Before ReLU the maps are signed. The strongest response is channel ${unit.c + 1} at row ${unit.y}, column ${unit.x}: nine weight × pixel products plus the bias ${f2(unit.b)} give ${f2(unit.value)}.`);
    s(2, { kind: 'relu' }, `ReLU replaces every negative value with 0: ${fmtInt(zeros1)} of the 6,272 values (${pct(zeros1 / 6272)}) become exactly 0. What is left says where each kernel's pattern appears.`);
    s(3, { kind: 'pool1', layer: 1 }, 'Max-pooling keeps the largest value in each 2 × 2 window of every channel: [8, 28, 28] becomes [8, 14, 14]. Pooling has no weights at all.');
    s(4, { kind: 'conv2k', kernel: conv2Kernel(model, strongest2), out: strongest2, layer: 2 }, `conv2 has 16 kernels, and each one is a 3 × 3 window through all 8 channels of pool1: 8 × 9 = 72 weights, plus a bias. Here are the 8 slices of kernel ${strongest2 + 1}. In all 16 × 72 + 16 = ${fmtInt(LAYERS[2].params)} learned numbers.`);
    s(4, { kind: 'conv2', out: strongest2 }, `The 16 maps after ReLU: [16, 14, 14]. Each mixes all eight first-layer maps, so it responds to combinations of strokes; channel ${strongest2 + 1}, outlined, responds most strongly to this ${label}.`);
    s(5, { kind: 'pool2', layer: 3 }, 'Pool again: [16, 14, 14] becomes [16, 7, 7]. Each value now summarises a 10 × 10 patch of the digit.');
    s(5, { kind: 'flatten' }, 'Flatten: the 16 maps of 7 × 7 are laid end to end as one vector of 16 × 7 × 7 = 784 numbers (one row per channel here). From now on the network no longer knows which numbers were neighbours.');
    s(6, { kind: 'fc1', active, layer: 4 }, `fc1 connects every one of the 784 numbers to each of 32 units: 784 × 32 + 32 = ${fmtInt(LAYERS[4].params)} learned numbers, ${pct(LAYERS[4].params / TOTAL_PARAMS)} of the whole network. After ReLU, ${active} of the 32 units are active for this ${label}.`);
    s(6, { kind: 'logits', layer: 5 }, `fc2 turns the 32 hidden values into 10 scores, one per digit: 32 × 10 + 10 = ${LAYERS[5].params} learned numbers. The largest score, ${f2(r.logits[r.pred])}, belongs to ${r.pred}; the next is ${r.runnerUp} at ${f2(r.logits[r.runnerUp])}.`);
    s(7, { kind: 'answer' }, `Softmax turns the scores into probabilities that add up to 1. The network says ${r.pred} with probability ${prob(r.probs[r.pred])}${r.pred === label ? ' — correct' : ` — wrong, it is a ${label}`}. All of it took ${fmtInt(TOTAL_PARAMS)} learned numbers.`);
    return steps;
}

/* ── predict prompts ─────────────────────────────────────── */
// Plausible slips for each count: forgetting the biases, forgetting that a
// kernel spans every input channel, one weight per output value, skipping
// the hidden layer, and so on. Round and unround slips are mixed so that
// "the answer ends in 0" is no shortcut.
const PARAM_SLIPS = {
    0: [72, 90, 10, 160, 6272, 784],
    2: [160, 1152, 73, 3136, 1296, 1170],
    4: [25088, 1600, 401440, 816, 50176, 544],
    5: [320, 3210, 42, 7850, 352, 340],
};
// Wrong shapes for the two pooling layers: dropping or doubling channels,
// stride 1 instead of 2, halving twice. Three smaller and three larger than
// the answer, so it can take any rank by size.
const SHAPE_SLIPS = {
    1: [[8, 13, 13], [4, 14, 14], [8, 7, 7], [16, 14, 14], [8, 27, 27], [8, 28, 28]],
    3: [[16, 6, 6], [8, 7, 7], [4, 7, 7], [16, 14, 14], [16, 13, 13], [32, 7, 7]],
};
const sizeOf = (shape) => shape.reduce((a, b) => a * b, 1);
const PROMPT_SALT = 72;
const INPUT_OF = { 1: '[8, 28, 28]', 3: '[16, 14, 14]' };
const QUESTION = {
    0: 'conv1 has 8 kernels of 3 × 3, each with a bias; its input is the [1, 28, 28] picture. How many learned numbers is that?',
    2: 'conv2 has 16 kernels of 3 × 3, each with a bias; its input is pool1’s [8, 14, 14]. How many learned numbers is that?',
    4: 'fc1 connects the 784 flattened values to 32 units, each with a bias. How many learned numbers is that?',
    5: 'fc2 connects the 32 hidden units to 10 outputs, each with a bias. How many learned numbers is that?',
};
const BECAUSE = {
    0: '8 kernels × (1 channel × 3 × 3) = 72 weights, plus 8 biases: 80.',
    2: 'Each kernel spans all 8 input channels: 16 × (8 × 3 × 3) = 1,152 weights, plus 16 biases: 1,168.',
    4: 'A weight for every input–unit pair: 784 × 32 = 25,088, plus 32 biases: 25,120.',
    5: '32 × 10 = 320 weights, plus 10 biases: 330.',
};


const predictFor = (step, next) => {
    if (!next || next.layer === undefined) return null;
    const L = next.layer;
    const slot = slotOf(next.presetIndex, L, PROMPT_SALT);
    if (LAYERS[L].params) {
        const { options, correct } = rankedChoices(LAYERS[L].params, PARAM_SLIPS[L], { slot, step: 10, fmt: fmtInt });
        return { question: QUESTION[L], options, correct, because: BECAUSE[L] };
    }
    // Ordered by size, with the answer at rank `slot`.
    const bySize = new Map([LAYERS[L].shape, ...SHAPE_SLIPS[L]].map(sh => [sizeOf(sh), shapeLabel(sh)]));
    const { options, correct } = rankedChoices(sizeOf(LAYERS[L].shape), SHAPE_SLIPS[L].map(sizeOf), { slot, fmt: (v) => bySize.get(v) ?? String(v) });
    return {
        question: `${LAYERS[L].id} is a 2 × 2 max pool with stride 2, applied to ${INPUT_OF[L]}. What shape comes out?`,
        options, correct,
        because: `Pooling works on each channel separately, so the channel count stays; height and width halve: ${INPUT_OF[L]} → ${shapeLabel(LAYERS[L].shape)}.`,
    };
};

function formulaFor(step) {
    const r = step.r;
    switch (step.kind) {
        case 'input': return String.raw`x \in [0, 1]^{28 \times 28}`;
        case 'norm': return String.raw`\hat{x} = \frac{x - ${MEAN}}{${STD}}, \qquad \hat{x}_{\text{ink}} = ${f2((1 - MEAN) / STD)},\ \ \hat{x}_{\text{background}} = ${f2(-MEAN / STD)}`;
        case 'kernels': return String.raw`8 \times (1 \times 3 \times 3) + 8 = ${LAYERS[0].params}`;
        case 'conv1': {
            const u = step.unit;
            const shown = u.terms.map(t => `(${f2(t.w)})(${f2(t.x)})`).join(' + ');
            return String.raw`${shown} + (${f2(u.b)}) \approx ${f2(u.value)}`;
        }
        case 'relu': return String.raw`\operatorname{ReLU}(z) = \max(0, z)`;
        case 'pool1': return String.raw`[8, 28, 28] \to [8, 14, 14]`;
        case 'conv2k': return String.raw`16 \times (8 \times 3 \times 3) + 16 = ${fmtInt(LAYERS[2].params)}`;
        case 'conv2': return String.raw`[8, 14, 14] \to [16, 14, 14]`;
        case 'pool2': return String.raw`[16, 14, 14] \to [16, 7, 7]`;
        case 'flatten': return String.raw`[16, 7, 7] \to [784]`;
        case 'fc1': return String.raw`h = \operatorname{ReLU}(W_1 v + b_1),\ \ W_1 \in \mathbb{R}^{32 \times 784}: \ ${step.active} \text{ of } 32 \text{ active}`;
        case 'logits': return String.raw`z = W_2 h + b_2,\ \ z_{${r.pred}} = ${f2(r.logits[r.pred])},\ z_{${r.runnerUp}} = ${f2(r.logits[r.runnerUp])}`;
        case 'answer': return String.raw`p_{${r.pred}} = \frac{e^{z_{${r.pred}}}}{\sum_j e^{z_j}} ${r.probs[r.pred] >= 0.9995 ? '> 0.999' : `= ${r.probs[r.pred].toFixed(3)}`}`;
        default: return '';
    }
}

/** Seeded uniform noise: the misconception's test set. */
function noiseImages(n, seed) {
    const rng = createRng(seed);
    return Array.from({ length: n }, () => Float64Array.from({ length: 784 }, () => rng.next()));
}
function noiseReport(model, n = 50, seed = 2026) {
    const counts = Array(10).fill(0);
    let conf = 0, above = 0;
    for (const px of noiseImages(n, seed)) {
        const p = forward(model, px).probs;
        const k = argmax(p);
        counts[k]++; conf += p[k] / n;
        if (p[k] > 0.9) above++;
    }
    const mode = argmax(counts);
    return { n, mode, modeCount: counts[mode], conf, above };
}
function accuracy(model, samples, invert = false) {
    return samples.filter(s => argmax(forward(model, invert ? s.pixels.map(v => 1 - v) : s.pixels).probs) === s.label).length;
}

const quizQuestions = [
    {
        question: 'Which layer of the digit CNN holds most of its 26,698 learned numbers?',
        options: ['The first convolution', 'The second convolution', 'The first dense layer (784 → 32)', 'The max-pooling layers'],
        correct: 2,
        explanation: 'fc1 has a weight for every pair of its 784 inputs and 32 units: 25,088 weights plus 32 biases, 94% of the network. The two convolutions together have 1,248, and pooling has none.',
    },
    {
        question: 'Why does conv2 have 16 × 8 × 3 × 3 weights rather than 16 × 3 × 3?',
        options: [
            'Because it uses stride 8',
            'Because each kernel spans all 8 channels of its input',
            'Because it runs 8 times',
            'Because padding adds weights',
        ],
        correct: 1,
        explanation: 'A convolution kernel always covers every input channel. pool1 has 8 channels, so each 3 × 3 kernel of conv2 is really 8 × 3 × 3 = 72 weights, and it adds the 8 per-channel results together.',
    },
    {
        question: 'Fed an image of pure random noise, the digit CNN answers 8 with probability about 0.99. What does that show?',
        options: [
            'The noise really contains an 8',
            'Softmax must spread probability over the ten digits only, so a confident answer does not mean the input is a digit',
            'The network is broken',
            'Noise images were in the training set',
        ],
        correct: 1,
        explanation: 'The ten probabilities always add up to 1 and there is no "none of these" output. The network only ever saw digits, so on anything else its confidence means nothing.',
    },
];

const codeExample = `import torch
import torch.nn as nn

net = nn.Sequential(
    nn.Conv2d(1, 8, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),    # [8, 14, 14]
    nn.Conv2d(8, 16, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),   # [16, 7, 7]
    nn.Flatten(), nn.Linear(16 * 7 * 7, 32), nn.ReLU(),           # [32]
    nn.Linear(32, 10))                                            # [10]

for name, p in net.named_parameters():
    print(name, tuple(p.shape), p.numel())
# 0.weight (8, 1, 3, 3) 72
# 0.bias (8,) 8
# 3.weight (16, 8, 3, 3) 1152
# 3.bias (16,) 16
# 7.weight (32, 784) 25088
# 7.bias (32,) 32
# 9.weight (10, 32) 320
# 9.bias (10,) 10
print(sum(p.numel() for p in net.parameters()))   # 26698

image = torch.rand(28, 28)                 # a digit, 0 = black, 1 = white
x = (image - 0.1307) / 0.3081              # standardised as in training
probs = net(x[None, None]).softmax(-1)     # [1, 10], sums to 1`;

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
const Caption = ({ children }) => <div className="text-xs text-slate-400 mb-1.5 flex flex-wrap items-center gap-1.5">{children}</div>;
const maxOf = (grids) => Math.max(1e-9, ...grids.flat(2));

function MapGrid({ grids, cell, scale = 'sequential', highlight, cols = 'grid-cols-4 sm:grid-cols-8' }) {
    const top = maxOf(grids.map(g => g.map(row => row.map(Math.abs))));
    return (
        <div className={`grid ${cols} gap-1.5`}>
            {grids.map((g, k) => (
                <div key={k} className={`rounded p-0.5 ${highlight === k ? 'ring-2 ring-yellow-400' : ''}`}>
                    <FeatureMap data={g} cell={cell} gap={0} scale={scale} domain={scale === 'diverging' ? [-top, top] : [0, top]} ariaLabel={`Channel ${k + 1}`} />
                    <div className="text-[10px] text-slate-500 text-center mt-0.5">{k + 1}</div>
                </div>
            ))}
        </div>
    );
}

function Kernels({ kernels, cell = 26 }) {
    const top = maxOf(kernels.map(k => k.map(row => row.map(Math.abs))));
    return (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {kernels.map((k, i) => (
                <div key={i}>
                    <FeatureMap data={k} cell={cell} scale="diverging" domain={[-top, top]} ariaLabel={`Kernel ${i + 1}`} />
                    <div className="text-[10px] text-slate-500 text-center mt-0.5">{i + 1}</div>
                </div>
            ))}
        </div>
    );
}

function Bars({ values, labels, signed = false, highlight }) {
    const top = Math.max(1e-9, ...values.map(Math.abs));
    const H = 90, W = values.length * 14;
    const zero = signed ? H / 2 : H;
    return (
        <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full block" role="img" aria-label="Values">
            <line x1={0} x2={W} y1={zero} y2={zero} stroke="#334155" />
            {values.map((v, i) => {
                const h = (Math.abs(v) / top) * (signed ? H / 2 - 2 : H - 2);
                return (
                    <g key={i}>
                        <rect x={i * 14 + 2} width={10} y={v >= 0 ? zero - h : zero} height={Math.max(0.5, h)} rx={1.5}
                            fill={highlight === i ? '#facc15' : v >= 0 ? '#38bdf8' : '#fb923c'} />
                        {labels && <text x={i * 14 + 7} y={H + 12} fontSize={9} textAnchor="middle" fill={highlight === i ? '#facc15' : '#94a3b8'}>{labels[i]}</text>}
                    </g>
                );
            })}
        </svg>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    const m = step.r.maps;
    switch (step.kind) {
        case 'input':
            return (
                <div className="mx-auto w-full max-w-[260px]">
                    <Caption>The picture <ShapeTag names={['H', 'W']} shape={[28, 28]} /></Caption>
                    <FeatureMap data={m.input} cell={9} domain={[0, 1]} ariaLabel="Input digit" />
                </div>
            );
        case 'norm':
            return (
                <div className="mx-auto w-full max-w-[260px]">
                    <Caption>Standardised input <ShapeTag names={['C', 'H', 'W']} shape={[1, 28, 28]} /></Caption>
                    <FeatureMap data={m.norm} cell={9} scale="diverging" domain={[-2.9, 2.9]} ariaLabel="Standardised input" />
                    <p className="text-[11px] text-slate-500 mt-1">Orange below zero, blue above.</p>
                </div>
            );
        case 'kernels':
            return (
                <div className="w-full">
                    <Caption>conv1 weights: 8 kernels <ShapeTag names={['out', 'in', 'k', 'k']} shape={[8, 1, 3, 3]} /></Caption>
                    <Kernels kernels={step.kernels} />
                </div>
            );
        case 'conv1':
        case 'relu':
            return (
                <div className="w-full">
                    <Caption>conv1 {step.kind === 'relu' ? 'after ReLU' : 'before ReLU (signed)'} <ShapeTag names={['C', 'H', 'W']} shape={[8, 28, 28]} /></Caption>
                    <MapGrid grids={step.kind === 'relu' ? m.conv1Relu : m.conv1} cell={3} scale={step.kind === 'relu' ? 'sequential' : 'diverging'} highlight={step.kind === 'conv1' ? step.unit.c : undefined} />
                </div>
            );
        case 'pool1':
            return (
                <div className="w-full">
                    <Caption>pool1 <ShapeTag names={['C', 'H', 'W']} shape={[8, 14, 14]} /></Caption>
                    <MapGrid grids={m.pool1} cell={6} />
                </div>
            );
        case 'conv2k':
            return (
                <div className="w-full">
                    <Caption>conv2 kernel {step.out + 1}: one 3 × 3 slice per input channel <ShapeTag names={['in', 'k', 'k']} shape={[8, 3, 3]} /></Caption>
                    <Kernels kernels={step.kernel} />
                </div>
            );
        case 'conv2':
            return (
                <div className="w-full">
                    <Caption>conv2 after ReLU <ShapeTag names={['C', 'H', 'W']} shape={[16, 14, 14]} /></Caption>
                    <MapGrid grids={m.conv2Relu} cell={5} highlight={step.out} />
                </div>
            );
        case 'pool2':
            return (
                <div className="w-full">
                    <Caption>pool2 <ShapeTag names={['C', 'H', 'W']} shape={[16, 7, 7]} /></Caption>
                    <MapGrid grids={m.pool2} cell={10} />
                </div>
            );
        case 'flatten':
            return (
                <div className="w-full max-w-[520px] mx-auto">
                    <Caption>Flattened <ShapeTag shape={[784]} /> · drawn as 16 rows of 49</Caption>
                    <FeatureMap data={m.flat} cell={10} gap={0.5} domain={[0, maxOf([m.flat])]} ariaLabel="Flattened vector" />
                </div>
            );
        case 'fc1':
            return (
                <div className="w-full">
                    <Caption>fc1 after ReLU <ShapeTag shape={[32]} /> · {step.active} of 32 active</Caption>
                    <Bars values={Array.from(step.r.fc1)} />
                </div>
            );
        case 'logits':
            return (
                <div className="w-full max-w-md mx-auto">
                    <Caption>fc2 scores (logits) <ShapeTag shape={[10]} /></Caption>
                    <Bars values={step.r.logits} labels={step.r.logits.map((_, d) => String(d))} signed highlight={step.r.pred} />
                </div>
            );
        case 'answer':
            return (
                <div className="w-full max-w-md mx-auto">
                    <Caption>Softmax probabilities <ShapeTag shape={[10]} /></Caption>
                    <ProbBars items={step.r.probs.map((p, d) => ({ label: String(d), p }))} chosen={step.r.pred} accent="#facc15" />
                </div>
            );
        default:
            return null;
    }
}

/* ── draw ────────────────────────────────────────────────── */
const PAD = 280;

function DrawPad({ onDraw, paint }) {
    const ref = useRef(null);
    const drawing = useRef(false);
    const last = useRef(null);
    const lastEmit = useRef(0);

    useEffect(() => {
        const ctx = ref.current.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, PAD, PAD);
        if (!paint?.pixels) return;
        // Paint a 28 × 28 image at 10× so you can draw over it.
        const img = ctx.createImageData(PAD, PAD);
        for (let y = 0; y < PAD; y++) {
            for (let x = 0; x < PAD; x++) {
                const v = Math.round(255 * paint.pixels[Math.floor(y / 10) * 28 + Math.floor(x / 10)]);
                const i = (y * PAD + x) * 4;
                img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
                img.data[i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
    }, [paint]);

    const emit = useCallback(() => {
        const data = ref.current.getContext('2d').getImageData(0, 0, PAD, PAD).data;
        const gray = new Float64Array(PAD * PAD);
        for (let i = 0; i < gray.length; i++) gray[i] = data[i * 4] / 255;
        onDraw(preprocessDrawing(gray, PAD, PAD));
    }, [onDraw]);

    const at = (e) => {
        const r = ref.current.getBoundingClientRect();
        return [((e.clientX - r.left) * PAD) / r.width, ((e.clientY - r.top) * PAD) / r.height];
    };
    const line = (to) => {
        const ctx = ref.current.getContext('2d');
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(...last.current);
        ctx.lineTo(...to);
        ctx.stroke();
        last.current = to;
    };
    const down = (e) => {
        e.preventDefault();
        ref.current.setPointerCapture?.(e.pointerId);
        drawing.current = true;
        last.current = at(e);
        line(at(e));
    };
    const move = (e) => {
        if (!drawing.current) return;
        line(at(e));
        const now = performance.now();
        if (now - lastEmit.current > 120) { lastEmit.current = now; emit(); }
    };
    const up = () => {
        if (!drawing.current) return;
        drawing.current = false;
        emit();
    };

    return (
        <canvas ref={ref} width={PAD} height={PAD} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            style={{ touchAction: 'none' }} aria-label="Drawing pad: draw a digit with the mouse or a finger"
            className="w-full max-w-[280px] aspect-square rounded-lg border border-slate-600 bg-black cursor-crosshair" />
    );
}

function Draw({ model, samples, initial }) {
    const [pixels, setPixels] = useState(initial);
    const [paint, setPaint] = useState({ pixels: initial, key: 0 });
    const [invert, setInvert] = useState(false);
    const [noiseSeed, setNoiseSeed] = useState(1);
    const seen = useMemo(() => (pixels ? (invert ? pixels.map(v => 1 - v) : pixels) : null), [pixels, invert]);
    const r = useMemo(() => (seen ? readDigit(model, seen) : null), [model, seen]);
    const invertedAcc = useMemo(() => accuracy(model, samples, true), [model, samples]);
    const plainAcc = useMemo(() => accuracy(model, samples, false), [model, samples]);
    const load = (px) => { setPixels(px); setPaint(p => ({ pixels: px, key: p.key + 1 })); };

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 grid md:grid-cols-[280px_1fr] gap-5">
                <div className="space-y-3">
                    <DrawPad onDraw={(px) => { if (px) setPixels(px); }} paint={paint} />
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => { setPixels(null); setPaint(p => ({ pixels: null, key: p.key + 1 })); }}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Eraser className="h-3.5 w-3.5" />Clear</button>
                        <button onClick={() => { load(noiseImages(1, noiseSeed)[0]); setNoiseSeed(s => s + 1); }}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Waves className="h-3.5 w-3.5" />Feed it noise</button>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Or load an MNIST test digit</div>
                        <Segmented options={Array.from({ length: 10 }, (_, d) => [d, String(d)])} value={null} onChange={(d) => load(samples[d * 4 + 1].pixels)} accent="yellow" ariaLabel="Load a test digit" />
                    </div>
                </div>
                <div className="space-y-3 min-w-0">
                    {!r ? (
                        <p className="text-sm text-slate-400">Draw a digit on the black square, as large as the square allows. The network sees it the way MNIST digits were prepared: cropped, scaled to 20 pixels and centred in 28 × 28.</p>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-start gap-4">
                                <div className="w-[140px]">
                                    <Caption>What the network sees <ShapeTag shape={[28, 28]} /></Caption>
                                    <FeatureMap data={r.maps.input} cell={5} domain={[0, 1]} ariaLabel="Network input" />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <div className="text-sm text-slate-300 mb-2">The network says <span className="font-mono text-2xl text-white align-middle mx-1">{r.pred}</span> with probability {prob(r.probs[r.pred])}</div>
                                    <ProbBars items={r.probs.map((p, d) => ({ label: String(d), p }))} chosen={r.pred} accent="#facc15" />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {r && (
                <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                    <div><Caption>conv1 after ReLU <ShapeTag shape={[8, 28, 28]} /></Caption><MapGrid grids={r.maps.conv1Relu} cell={3} /></div>
                    <div><Caption>pool1 <ShapeTag shape={[8, 14, 14]} /></Caption><MapGrid grids={r.maps.pool1} cell={6} /></div>
                    <div><Caption>conv2 after ReLU <ShapeTag shape={[16, 14, 14]} /></Caption><MapGrid grids={r.maps.conv2Relu} cell={5} /></div>
                    <div><Caption>pool2 <ShapeTag shape={[16, 7, 7]} /></Caption><MapGrid grids={r.maps.pool2} cell={10} /></div>
                    <div><Caption>fc1 after ReLU <ShapeTag shape={[32]} /></Caption><Bars values={Array.from(r.fc1)} /></div>
                </div>
            )}

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Contrast className="h-4 w-4 text-amber-400" />Break it: black ink on white</h3>
                <p className="text-xs text-slate-400">Every MNIST digit is white on black. Flip the picture and the same strokes arrive as their opposite.</p>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setInvert(v => !v)} aria-pressed={invert}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${invert ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-amber-500'}`}>
                        <Contrast className="h-3.5 w-3.5" />{invert ? 'Inverted' : 'Invert the picture'}
                    </button>
                    {invert && (
                        <button onClick={() => setInvert(false)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">
                            <Wrench className="h-3.5 w-3.5" />Repair
                        </button>
                    )}
                </div>
                {invert && (
                    <BreakNote>
                        Inverted, the network reads <span className="font-semibold">{invertedAcc} of the 40</span> test digits correctly, against {plainAcc} the right way round. A convolution responds to the sign of what is under it, and the training data never showed it dark strokes.
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function ACnnReadsADigitPage() {
    const { data, error, retry } = useLoaded(loadDigitCnnWithSamples);
    const [mode, setMode] = useState('guided');
    const [presetIndex, setPresetIndex] = useState(0);
    const stepHistory = useMemo(() => (data ? generateSteps(data.model, data.samples, presetIndex) : []), [data, presetIndex]);
    const play = useStepPlayback(stepHistory, 1700);
    const step = play.step;
    const predict = usePredict(stepHistory, play.current, predictFor, play.pause);
    const noise = useMemo(() => (data ? noiseReport(data.model) : null), [data]);
    const [drawKey, setDrawKey] = useState(0);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const toDraw = useCallback(() => { setDrawKey(k => k + 1); setMode('draw'); play.pause(); }, [play]);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/deep-learning-architectures" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Deep Learning Architectures
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">A CNN Reads a Digit</h1>
                    <p className="text-yellow-50 max-w-3xl">
                        A real convolutional network, 26,698 learned numbers trained on MNIST, read layer by layer: every feature map, every pooled stack, the dense layers and the ten probabilities. Then draw your own digit.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/deep-learning-architectures/pooling-and-feature-maps" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Pooling and Feature Maps</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['draw', 'Draw a digit', PenLine]]} mode={mode}
                            setMode={(m) => (m === 'draw' ? toDraw() : setMode(m))} accent="yellow" />
                        <SourceChip kind="real">Digit CNN trained on MNIST (99.0% test accuracy) · MNIST test digits, CC BY-SA 3.0</SourceChip>
                    </div>

                    {error ? (
                        <LoadError error={error} onRetry={retry} accent="yellow" what="The digit CNN" />
                    ) : !data ? (
                        <LoadingCard text="Loading the digit CNN and its test digits (98 KB)…" />
                    ) : mode === 'draw' ? (
                        <Draw key={drawKey} model={data.model} samples={data.samples} initial={data.samples[PRESETS[presetIndex].sample].pixels} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Digit:</span>
                                {PRESETS.map((p, k) => (
                                    <button key={p.label} onClick={() => { setPresetIndex(k); play.pause(); }} aria-pressed={presetIndex === k}
                                        className={`text-xs px-2.5 py-1 rounded-lg border ${presetIndex === k ? 'border-yellow-400 bg-yellow-500/15 text-yellow-100' : 'border-slate-700 text-slate-400 hover:border-yellow-500'}`}>{p.label}</button>
                                ))}
                            </div>
                            <TourPlayer acts={ACTS} steps={stepHistory} play={play} predict={predict} accent="yellow" minHeight="min-h-[320px]">
                                <VisualizationPanel step={step} />
                            </TourPlayer>
                            {predict.prompt && <PredictPrompt predict={predict} accent="yellow" />}
                            <ExplanationBox text={step?.explanation} predict={predict} accent="yellow" />
                            {step && <FormulaPanel><div className="overflow-x-auto"><Tex block>{formulaFor(step)}</Tex></div></FormulaPanel>}
                        </>
                    )}

                    <InCode title="The same network in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="Where the 26,698 numbers live" icon={Network}>
                        <table className="w-full text-xs font-mono">
                            <tbody>
                                {LAYERS.map((l, L) => (
                                    <tr key={l.id} className={step && step.layer === L ? 'text-yellow-200' : 'text-slate-300'}>
                                        <td className="py-1 pr-2">{l.id}</td>
                                        <td className="pr-2 text-slate-500">{shapeLabel(l.shape)}</td>
                                        <td className="text-right">{fmtInt(l.params)}</td>
                                    </tr>
                                ))}
                                <tr className="text-white border-t border-slate-700"><td className="pt-1">total</td><td /><td className="pt-1 text-right">{fmtInt(TOTAL_PARAMS)}</td></tr>
                            </tbody>
                        </table>
                    </Card>

                    <Misconception claim="If the network is 99% sure, it has recognised a digit.">
                        {noise ? (
                            <>
                                <p>Its ten outputs always add up to 1, and there is no &ldquo;none of these&rdquo;. Fed {noise.n} images of pure random noise, it answers {noise.mode} for {noise.modeCount} of them, with mean probability {noise.conf.toFixed(3)}; {noise.above} of {noise.n} score above 0.9.</p>
                                <p>That is as confident as it is on real test digits. A probability from a classifier is only meaningful on inputs like the ones it was trained on. Try it with &ldquo;Feed it noise&rdquo; in Draw a digit.</p>
                            </>
                        ) : <p>Measuring on 50 noise images once the network loads…</p>}
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
