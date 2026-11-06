"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Brain, Repeat, Footprints, ScatterChart, Undo2, Infinity as InfinityIcon,
    CheckCircle, XCircle, Wrench, Scissors, Plus, Minus, Play, Pause, RotateCcw,
} from 'lucide-react';
import { createRecurrent, runSequence, backward, zeroGrads, batchLossAndGrads, clipGrads, createAdam, paramCount } from '@/lib/ml/recurrent';
import { rankedChoices, slotOf } from '@/lib/ml/predictChoices';
import { useTrainer } from '@/lib/ml/useTrainer';
import { createRng } from '@/lib/random';
import Plane2D, { Point, Segment, Label } from '@/components/math/Plane2D';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import LossChart from '@/components/ml/LossChart';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Segmented, Misconception, BreakNote, LoadingCard, FormulaPanel, Card,
} from '@/components/ml/TourKit';

/* ── the task and the network ──────────────────────────────
   Read a string of bits one at a time and say, after each one, how many 1s
   have been seen so far. A plain RNN with just two hidden units learns it
   in your browser when the page opens: 1,500 Adam steps on batches of 16
   random 8-bit strings, the same seed every time. */

const SEQ_LEN = 8;
const TRAIN = { hidden: 2, steps: 1500, seed: 11, batch: 16, lr: 0.03, clip: 1 };

const PRESETS = [
    { label: '1 0 1 1 0 0 1 0', bits: [1, 0, 1, 1, 0, 0, 1, 0] },
    { label: '0 1 1 0 1 1 1 0', bits: [0, 1, 1, 0, 1, 1, 1, 0] },
    { label: '1 1 0 0 0 1 0 1', bits: [1, 1, 0, 0, 0, 1, 0, 1] },
    { label: '0 0 1 0 1 1 0 1', bits: [0, 0, 1, 0, 1, 1, 0, 1] },
];

const ACTS = [
    { id: 1, label: 'No memory', name: 'Why a Loop?', icon: Brain },
    { id: 2, label: 'The loop', name: 'The Loop', icon: Repeat },
    { id: 3, label: 'Step by step', name: 'Reading One Bit at a Time', icon: Footprints },
    { id: 4, label: 'What h holds', name: 'What the Hidden State Holds', icon: ScatterChart },
    { id: 5, label: 'Training', name: 'Backpropagation Through Time', icon: Undo2 },
    { id: 6, label: 'Too far', name: 'Past the Training Length', icon: InfinityIcon },
];

const f2 = (v) => (Math.round(v * 100) / 100 + 0).toFixed(2);
const f1 = (v) => (Math.round(v * 10) / 10 + 0).toFixed(1);
const fLoss = (v) => (v < 0.1 ? v.toFixed(3) : f2(v));
const pct = (v) => `${Math.round(v * 100)}%`;
const countsOf = (bits) => { let c = 0; return bits.map(b => (c += b)); };
/** "0.00 − 0.26 + 1.41": a sum written with its signs, not "+ -0.26". */
const signedSum = (xs) => xs.map((x, i) => {
    const v = f2(Math.abs(x)), neg = f2(x).startsWith('-');
    return i === 0 ? f2(x) : `${neg ? '−' : '+'} ${v}`;
}).join(' ');

/** A batch of random bit strings with their running counts as targets. */
function countingBatch(rng, n, len) {
    return Array.from({ length: n }, () => {
        const bits = Array.from({ length: len }, () => (rng.chance(0.5) ? 1 : 0));
        return { bits, xs: bits.map(b => [b]), targets: countsOf(bits).map(c => [c]) };
    });
}

/** A fresh run: network, optimiser and data stream. `cut` pins the loop W to 0. */
function initCounter({ hidden = TRAIN.hidden, seed = TRAIN.seed, cut = false } = {}) {
    const net = createRecurrent('rnn', { input: 1, hidden, output: 1, seed });
    if (cut) net.p.W.fill(0);
    return { net, opt: createAdam(net.p, { lr: TRAIN.lr, frozen: cut ? ['W'] : [] }), rng: createRng(seed + 1) };
}
/** The learning rate holds for two thirds of the run, then falls tenfold, so training ends settled rather than jittering. */
const lrAt = (s) => TRAIN.lr * (s < 1000 ? 1 : Math.max(0.1, 1 - (0.9 * (s - 1000)) / 500));
function trainStep(run, s, len = SEQ_LEN) {
    const { loss, grads } = batchLossAndGrads(run.net, countingBatch(run.rng, TRAIN.batch, len));
    clipGrads(grads, TRAIN.clip);
    run.opt.lr = lrAt(s);
    run.opt.step(grads);
    return loss;
}
function trainCounter(opts = {}) {
    const run = initCounter(opts);
    const history = [];
    for (let s = 0; s < TRAIN.steps; s++) {
        const loss = trainStep(run, s);
        if (s % 10 === 0 || s === TRAIN.steps - 1) history.push({ step: s, loss });
    }
    return { net: run.net, history };
}

/** Rounded output equals the true count: per step, and at the last step only. */
function evaluateCounter(net, len, n = 400, seed = 99) {
    const rng = createRng(seed);
    let right = 0, total = 0, last = 0;
    for (const ex of countingBatch(rng, n, len)) {
        const { steps } = runSequence(net, ex.xs);
        steps.forEach((s, t) => { total++; if (Math.round(s.y[0]) === ex.targets[t][0]) right++; });
        if (Math.round(steps[len - 1].y[0]) === ex.targets[len - 1][0]) last++;
    }
    return { step: right / total, last: last / n };
}

/** Final hidden states of every 8-bit string, and how tightly they cluster by count. */
function hiddenCloud(net) {
    const pts = [];
    for (let m = 0; m < 1 << SEQ_LEN; m++) {
        const bits = Array.from({ length: SEQ_LEN }, (_, k) => (m >> (SEQ_LEN - 1 - k)) & 1);
        const { h } = runSequence(net, bits.map(b => [b]));
        pts.push({ bits, count: bits.reduce((a, b) => a + b, 0), h: Array.from(h) });
    }
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let within = 0, nw = 0;
    const centres = [];
    for (let c = 0; c <= SEQ_LEN; c++) {
        const g = pts.filter(p => p.count === c);
        centres.push([g.reduce((a, p) => a + p.h[0], 0) / g.length, g.reduce((a, p) => a + p.h[1], 0) / g.length]);
        for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) { within += dist(g[i].h, g[j].h); nw++; }
    }
    let gap = 0;
    for (let c = 0; c < SEQ_LEN; c++) gap += dist(centres[c], centres[c + 1]) / SEQ_LEN;
    return { pts, centres, within: nw ? within / nw : 0, gap };
}

/** ‖∂L/∂hₜ‖ when the only error is the final count: how much each step hears. */
function gradientReach(net, bits) {
    const xs = bits.map(b => [b]);
    const run = runSequence(net, xs);
    // A fixed unit error on the last output, so the profile does not depend on how wrong the answer is.
    const dys = run.steps.map((s, t) => (t === bits.length - 1 ? Float64Array.of(1) : null));
    const { dhAt } = backward(net, run, dys, zeroGrads(net));
    return dhAt.map(g => Math.hypot(...g));
}

/** Everything trained once when the page opens. */
function trainAll() {
    const main = trainCounter();
    const cut = trainCounter({ cut: true });
    return {
        ...main,
        cutNet: cut.net,
        cutHistory: cut.history,
        acc: { 8: evaluateCounter(main.net, 8), 12: evaluateCounter(main.net, 12), 20: evaluateCounter(main.net, 20) },
        cutAcc: evaluateCounter(cut.net, 8),
        cloud: hiddenCloud(main.net),
    };
}

/* ── the guided tour ─────────────────────────────────────── */
const row = (M, r, cols) => Array.from(M.slice(r * cols, (r + 1) * cols));

function generateSteps(model, presetIndex) {
    const { net, cutNet, acc, cutAcc, cloud, history } = model;
    const bits = PRESETS[presetIndex].bits;
    const counts = countsOf(bits);
    const p = net.p;
    const run = runSequence(net, bits.map(b => [b]));
    const cutRun = runSequence(cutNet, bits.map(b => [b]));
    const cutRight = cutRun.steps.filter((s, t) => Math.round(s.y[0]) === counts[t]).length;
    const steps = [];
    const base = { presetIndex, bits, counts };
    const s = (act, data, explanation) => steps.push({ act, actName: ACTS[act - 1].name, ...base, ...data, explanation });

    s(1, { kind: 'task' }, `The task: read the bits ${bits.join(' ')} one at a time and say, after each one, how many 1s you have seen so far: ${counts.join(', ')}. The answer at each step depends on everything before it, not just on the bit in front of you.`);
    const one = cutRun.steps.find((x, t) => bits[t] === 1), zero = cutRun.steps.find((x, t) => bits[t] === 0);
    s(1, { kind: 'cut', cutYs: cutRun.steps.map(x => x.y[0]) },
        `A network without a loop sees only the current bit, so it can give one answer for every 1 (${one ? f1(one.y[0]) : '—'}) and one for every 0 (${zero ? f1(zero.y[0]) : '—'}) and nothing else. Trained the same way, it is right on ${cutRight} of these 8 steps, and on ${pct(cutAcc.step)} of steps over 400 random strings.`);
    s(2, { kind: 'loop' },
        `A recurrent network keeps a hidden state h — here just two numbers — and updates it at every step from the old state and the new bit: h = tanh(W h₋ + U x + b). A readout turns h into the count: y = V h + c. The same ${paramCount(net)} learned numbers are reused at every step, however long the string.`);

    run.steps.forEach((st, t) => {
        const k = t % 2;
        const terms = { rec: row(p.W, k, 2).reduce((a, w, j) => a + w * st.hPrev[j], 0), inp: p.U[k] * bits[t], bias: p.b[k] };
        s(3, { kind: 'read', t, k, hPrev: Array.from(st.hPrev), pre: [0, 1].map(j => row(p.W, j, 2).reduce((a, w, i) => a + w * st.hPrev[i], 0) + p.U[j] * bits[t] + p.b[j]), h: Array.from(st.h), y: st.y[0], terms, path: run.steps.slice(0, t + 1).map(x => Array.from(x.h)) },
            `Bit ${t + 1} is ${bits[t]}. Unit ${k + 1}: W row ${k + 1} · h₋ = ${f2(terms.rec)}, plus U·x = ${f2(terms.inp)}, plus b = ${f2(terms.bias)}, gives ${f2(terms.rec + terms.inp + terms.bias)}; tanh squeezes it to ${f2(st.h[k])}. The new state is (${f2(st.h[0])}, ${f2(st.h[1])}) and the readout says ${f2(st.y[0])} — the true count is ${counts[t]}.`);
    });

    s(4, { kind: 'cloud', cloud },
        `Every one of the 256 possible 8-bit strings, plotted at its final hidden state and coloured by its number of 1s. They fall into nine tight clusters, one per count, lined up in order. The order of the bits is gone: two strings with the same count end on average ${f2(cloud.within)} apart, while neighbouring counts sit ${f2(cloud.gap)} apart. Two numbers are enough because a count is all this task needs.`);

    const reach = gradientReach(net, bits);
    s(5, { kind: 'bptt', reach },
        `Training runs the error backwards through the same loop — backpropagation through time. With one unit of error on the final count, the gradient reaching h at step 8 has size ${f2(reach[SEQ_LEN - 1])} and at step 1 ${f2(reach[0])}: every step back multiplies it by Wᵀ and by tanh's slope. The updates for W, U and b add up the contributions from all 8 steps.`);
    s(5, { kind: 'curve', history },
        `The training that ran when this page opened: the mean squared error of the counts fell from ${fLoss(history[0].loss)} to ${fLoss(history[history.length - 1].loss)} in ${TRAIN.steps.toLocaleString('en-US')} steps. On 400 fresh 8-bit strings the rounded output is the right count at ${pct(acc[8].step)} of steps.`);

    const long = runSequence(net, Array.from({ length: 20 }, () => [1])).steps;
    const ones = long.map(x => x.y[0]);
    const hEnd = Array.from(long[19].h);
    const still = long.findIndex((x, t) => t > 0 && Math.hypot(x.h[0] - long[t - 1].h[0], x.h[1] - long[t - 1].h[1]) < 0.01);
    const pinned = Math.abs(hEnd[0]) > Math.abs(hEnd[1]) ? 0 : 1;
    // Training in a browser can land on slightly different weights than in Node (Math.tanh may
    // differ in the last bit), so the wording checks the numbers instead of assuming them.
    const settled = still >= 0
        ? `From bit ${still + 1} on, another 1 moves the state by less than 0.01`
        : `By bit 20, another 1 moves the state by only ${f2(Math.hypot(hEnd[0] - long[18].h[0], hEnd[1] - long[18].h[1]))}`;
    const edge = Math.abs(hEnd[pinned]) > 0.9 ? `, with unit ${pinned + 1} pressed against tanh's ${hEnd[pinned] > 0 ? 'ceiling of 1' : 'floor of −1'}` : '';
    s(6, { kind: 'long', ones, hEnd },
        `Now 20 ones in a row, longer than anything it was trained on. The count climbs ${ones.slice(0, 5).map(f1).join(', ')}, then flattens out near ${f1(ones[19])}. ${settled}: it has settled at (${f2(hEnd[0])}, ${f2(hEnd[1])}), a point that h = tanh(W h + U + b) maps back onto itself${edge}. A state that no longer moves cannot count any higher.`);
    s(6, { kind: 'lengths', acc },
        `Measured on 400 random strings of each length, the final count is right ${pct(acc[8].last)} of the time at length 8, ${pct(acc[12].last)} at 12 and ${pct(acc[20].last)} at 20. Strings of 8 bits rarely hold more than 6 ones, so the network never learned to go further. The loop gives it memory; it does not give it unlimited memory.`);
    return steps;
}

/* ── predict prompts ─────────────────────────────────────── */
// Chosen so the four shipped strings are balanced as well as random ones (the suite prints both).
// Asked only when the bit is a 1: on a 0 the trained network leaves its state
// where it was, so "the value already on screen" answered most 0-bit prompts
// with no arithmetic. The options are evenly spaced, 0.2 apart, with the
// answer at a hashed rank. Plausible slips (a dropped term) made better
// distractors but leaked through their pattern: the answer was the one
// nearest the old h, or the mean, 40% of the time. The suite prints both.
const PROMPT_SALT = 3;
const predictFor = (step, next) => {
    if (!next || next.kind !== 'read' || next.bits[next.t] !== 1) return null;
    const { k, terms, t } = next;
    const v = terms.rec + terms.inp + terms.bias;
    const slot = slotOf(next.presetIndex, t, PROMPT_SALT);
    const { options, correct } = rankedChoices(v, [], { slot, step: 0.2, fmt: f2 });
    return {
        question: `Bit ${t + 1} is a 1 and the old state is h₋ = (${f2(next.hPrev[0])}, ${f2(next.hPrev[1])}). With the weights on screen, what is unit ${k + 1}'s value before tanh: W row ${k + 1} · h₋ + U·x + b?`,
        options, correct,
        because: `${signedSum([terms.rec, terms.inp, terms.bias])} = ${f2(v)}. ${Math.abs(terms.rec) < 0.005
            ? 'At the start the old state is all zeros, so only the bit and the bias count.'
            : `Leaving out the old state would give ${f2(terms.inp + terms.bias)}, and leaving out the bit ${f2(terms.rec + terms.bias)}: the loop term W h₋ is where the memory comes in.`}`,
    };
};

function formulaFor(step) {
    switch (step.kind) {
        case 'task': return String.raw`y_t = \#\{\text{1s in } x_1, \dots, x_t\}`;
        case 'cut': return String.raw`y_t = f(x_t) \quad \text{(no } h\text{: the same answer for every 1)}`;
        case 'loop': return String.raw`h_t = \tanh(W h_{t-1} + U x_t + b), \qquad y_t = V h_t + c`;
        case 'read': {
            const { k, terms, h } = step;
            return String.raw`h_{t,${k + 1}} = \tanh(\underbrace{${f2(terms.rec)}}_{W h_{t-1}} + \underbrace{${f2(terms.inp)}}_{U x_t} + \underbrace{${f2(terms.bias)}}_{b}) = \tanh(${f2(terms.rec + terms.inp + terms.bias)}) = ${f2(h[k])}`;
        }
        case 'cloud': return String.raw`\overline{\lVert h - h' \rVert}_{\text{same count}} = ${f2(step.cloud.within)} \quad \text{vs} \quad \overline{\lVert \bar h_c - \bar h_{c+1} \rVert} = ${f2(step.cloud.gap)}`;
        case 'bptt': return String.raw`\frac{\partial L}{\partial h_{t-1}} = W^{\top}\!\left( (1 - h_t^2) \odot \frac{\partial L}{\partial h_t} \right)`;
        case 'curve': return String.raw`L = \tfrac{1}{N} \sum_t (y_t - \text{count}_t)^2 : \ ${fLoss(step.history[0].loss)} \to ${fLoss(step.history[step.history.length - 1].loss)}`;
        case 'long': return String.raw`h^{*} = \tanh(W h^{*} + U \cdot 1 + b) = (${f2(step.hEnd[0])}, ${f2(step.hEnd[1])}), \qquad y = V h^{*} + c = ${f1(step.ones[19])}`;
        case 'lengths': return String.raw`\text{final count right: } ${pct(step.acc[8].last).replace('%', '\\%')}\ (8),\ ${pct(step.acc[12].last).replace('%', '\\%')}\ (12),\ ${pct(step.acc[20].last).replace('%', '\\%')}\ (20)`;
        default: return '';
    }
}

const quizQuestions = [
    {
        question: 'What makes a recurrent network different from a feed-forward one?',
        options: [
            'It has more layers',
            'It carries a hidden state from one step to the next and reuses the same weights at every step',
            'It uses sigmoid instead of ReLU',
            'It reads the whole sequence at once',
        ],
        correct: 1,
        explanation: 'h_t = tanh(W h_{t−1} + U x_t + b): the old state feeds the new one, and W, U and b are the same at every step. That loop is the memory.',
    },
    {
        question: 'A two-unit RNN trained on 8-bit strings counts 1s almost perfectly, but on 20 ones in a row its count stops near 7. Why?',
        options: [
            'It ran out of time steps',
            'Its hidden units are squeezed by tanh into (−1, 1), so the state saturates and cannot represent larger counts it never trained on',
            'The input was too large',
            'RNNs cannot count',
        ],
        correct: 1,
        explanation: 'The count lives in two numbers bounded by tanh. Training never needed more than about 8, so the state reaches the edge of its range and stays there.',
    },
    {
        question: 'What is backpropagation through time?',
        options: [
            'Running the sequence backwards',
            'Ordinary backpropagation through the network unrolled over the steps, adding up each step’s contribution to the shared weights’ gradients',
            'Training on reversed strings',
            'Updating the weights after every bit',
        ],
        correct: 1,
        explanation: 'Unrolled, an RNN is a deep feed-forward network whose layers share weights. The gradient flows back step by step (multiplied by Wᵀ and the tanh slope each time), and each weight’s gradient is the sum over steps.',
    },
];

const codeExample = `import torch
import torch.nn as nn

rnn = nn.RNN(input_size=1, hidden_size=2, batch_first=True)   # h = tanh(W h + U x + b)
readout = nn.Linear(2, 1)                                     # y = V h + c
print(sum(p.numel() for p in rnn.parameters()) + sum(p.numel() for p in readout.parameters()))
# 13 - PyTorch keeps two bias vectors (b_ih and b_hh); this page folds them into one b, so 11

bits = torch.tensor([[1., 0., 1., 1., 0., 0., 1., 0.]]).unsqueeze(-1)   # [batch, T, 1]
h_all, h_last = rnn(bits)            # h_all: [1, 8, 2], one hidden state per step
counts = readout(h_all).squeeze(-1)  # [1, 8], trained to read 1 1 2 3 3 3 4 4
loss = ((counts - bits.squeeze(-1).cumsum(-1)) ** 2).mean()
loss.backward()                      # backpropagation through time, all 8 steps`;

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
const COUNT_COLORS = ['#64748b', '#38bdf8', '#22d3ee', '#34d399', '#a3e635', '#facc15', '#fb923c', '#f472b6', '#c084fc'];
const Caption = ({ children }) => <div className="text-xs text-slate-400 mb-1.5 flex flex-wrap items-center gap-1.5">{children}</div>;

function BitStrip({ bits, counts, upto = bits.length, ys, cutYs }) {
    return (
        <div className="overflow-x-auto">
            <table className="text-sm font-mono mx-auto">
                <tbody>
                    <tr><td className="pr-3 text-xs text-slate-500">bit</td>{bits.map((b, t) => (
                        <td key={t} className="px-1 py-1"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${t === upto - 1 ? 'border-yellow-300 bg-yellow-400 text-slate-900' : t < upto ? 'border-slate-500 bg-slate-700 text-slate-100' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>{b}</span></td>
                    ))}</tr>
                    <tr><td className="pr-3 text-xs text-slate-500">count</td>{counts.map((c, t) => <td key={t} className={`text-center ${t < upto ? 'text-slate-200' : 'text-slate-600'}`}>{t < upto ? c : '·'}</td>)}</tr>
                    {ys && <tr><td className="pr-3 text-xs text-slate-500">RNN says</td>{ys.map((y, t) => <td key={t} className={`text-center text-xs ${t < upto ? (Math.round(y) === counts[t] ? 'text-green-300' : 'text-red-300') : 'text-slate-600'}`}>{t < upto ? f1(y) : '·'}</td>)}</tr>}
                    {cutYs && <tr><td className="pr-3 text-xs text-slate-500">no loop</td>{cutYs.map((y, t) => <td key={t} className={`text-center text-xs ${Math.round(y) === counts[t] ? 'text-green-300' : 'text-red-300'}`}>{f1(y)}</td>)}</tr>}
                </tbody>
            </table>
        </div>
    );
}

function Unrolled({ n = 4 }) {
    const W = 120;
    return (
        <svg viewBox={`0 0 ${n * W + 40} 190`} className="w-full block max-w-[560px] mx-auto" role="img" aria-label="The RNN unrolled over time">
            <defs><marker id="rnn-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" /></marker></defs>
            {Array.from({ length: n }, (_, t) => {
                const x = 30 + t * W;
                return (
                    <g key={t}>
                        <rect x={x} y={70} width={70} height={46} rx={8} fill="#1e293b" stroke="#facc15" strokeWidth={1.5} />
                        <text x={x + 35} y={98} textAnchor="middle" fontSize={14} fill="#f8fafc">h{t + 1}</text>
                        <text x={x + 35} y={176} textAnchor="middle" fontSize={13} fill="#94a3b8">x{t + 1}</text>
                        <line x1={x + 35} y1={160} x2={x + 35} y2={120} stroke="#94a3b8" markerEnd="url(#rnn-arrow)" />
                        <text x={x + 42} y={146} fontSize={11} fill="#64748b">U</text>
                        <text x={x + 35} y={20} textAnchor="middle" fontSize={13} fill="#94a3b8">y{t + 1}</text>
                        <line x1={x + 35} y1={68} x2={x + 35} y2={30} stroke="#94a3b8" markerEnd="url(#rnn-arrow)" />
                        <text x={x + 42} y={52} fontSize={11} fill="#64748b">V</text>
                        <line x1={x - 48} y1={93} x2={x - 4} y2={93} stroke="#facc15" strokeWidth={1.5} markerEnd="url(#rnn-arrow)" opacity={t === 0 ? 0.5 : 1} />
                        <text x={x - 26} y={86} textAnchor="middle" fontSize={11} fill="#facc15">{t === 0 ? 'h0' : 'W'}</text>
                    </g>
                );
            })}
        </svg>
    );
}

function Matrix({ name, rows, shape }) {
    return (
        <div className="inline-block">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5"><span className="font-mono text-slate-200">{name}</span><ShapeTag shape={shape} /></div>
            <table className="font-mono text-xs border-l border-r border-slate-500 px-1">
                <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className="px-1.5 py-0.5 text-right text-slate-100">{f2(v)}</td>)}</tr>)}</tbody>
            </table>
        </div>
    );
}

function Weights({ p }) {
    return (
        <div className="flex flex-wrap gap-4 justify-center">
            <Matrix name="W" shape={[2, 2]} rows={[row(p.W, 0, 2), row(p.W, 1, 2)]} />
            <Matrix name="U" shape={[2, 1]} rows={[[p.U[0]], [p.U[1]]]} />
            <Matrix name="b" shape={[2]} rows={[[p.b[0]], [p.b[1]]]} />
            <Matrix name="V" shape={[1, 2]} rows={[row(p.V, 0, 2)]} />
            <Matrix name="c" shape={[1]} rows={[[p.c[0]]]} />
        </div>
    );
}

function HiddenPlane({ path, cloud, highlightLast = true }) {
    return (
        <Plane2D xRange={[-1.15, 1.15]} yRange={[-1.15, 1.15]} grid={0.5} width={300} tickLabels={false} ariaLabel="Hidden state plane">
            <Segment from={[-1, -1]} to={[1, -1]} color="#334155" width={1} dashed />
            <Segment from={[1, -1]} to={[1, 1]} color="#334155" width={1} dashed />
            <Segment from={[1, 1]} to={[-1, 1]} color="#334155" width={1} dashed />
            <Segment from={[-1, 1]} to={[-1, -1]} color="#334155" width={1} dashed />
            {cloud && cloud.pts.map((pt, i) => <Point key={i} at={pt.h} r={3} color={COUNT_COLORS[pt.count]} />)}
            {cloud && cloud.centres.map((c, i) => <Label key={`l${i}`} at={c} dx={6} dy={-6} size={11} color={COUNT_COLORS[i]}>{i}</Label>)}
            {path && path.map((h, t) => t > 0 && <Segment key={`s${t}`} from={path[t - 1]} to={h} color="#64748b" width={1.5} />)}
            {/* Only the newest point is labelled: a 0 leaves the state in place, so older labels would pile up. */}
            {path && path.map((h, t) => {
                const now = t === path.length - 1 && highlightLast;
                return <Point key={`p${t}`} at={h} r={now ? 6 : 3.5} color={now ? '#facc15' : '#94a3b8'} label={now ? `${t + 1}` : undefined} />;
            })}
        </Plane2D>
    );
}

function VisualizationPanel({ step, model }) {
    if (!step) return null;
    const p = model.net.p;
    switch (step.kind) {
        case 'task': return <BitStrip bits={step.bits} counts={step.counts} />;
        case 'cut': return <BitStrip bits={step.bits} counts={step.counts} cutYs={step.cutYs} />;
        case 'loop':
            return (
                <div className="w-full space-y-4">
                    <Unrolled />
                    <Weights p={p} />
                </div>
            );
        case 'read':
            return (
                <div className="w-full space-y-4">
                    <BitStrip bits={step.bits} counts={step.counts} upto={step.t + 1} ys={step.path.map((h) => h[0] * p.V[0] + h[1] * p.V[1] + p.c[0])} />
                    <div className="grid sm:grid-cols-[minmax(0,300px)_1fr] gap-4 items-center">
                        <div><Caption>Hidden state h <ShapeTag shape={[2]} /> after each bit</Caption><HiddenPlane path={step.path} /></div>
                        <div className="space-y-3">
                            <Weights p={p} />
                            <div className="text-xs font-mono text-slate-300 space-y-1">
                                <div>h₋ = ({f2(step.hPrev[0])}, {f2(step.hPrev[1])}) · x = {step.bits[step.t]}</div>
                                <div>W h₋ + U x + b = ({f2(step.pre[0])}, {f2(step.pre[1])})</div>
                                <div className="text-yellow-200">h = tanh(…) = ({f2(step.h[0])}, {f2(step.h[1])}) · y = {f2(step.y)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'cloud':
            return (
                <div className="grid sm:grid-cols-[minmax(0,320px)_1fr] gap-4 items-center w-full">
                    <div><Caption>Final h for all 256 strings, coloured by count</Caption><HiddenPlane cloud={step.cloud} /></div>
                    <div className="flex flex-wrap gap-1.5 text-xs">{COUNT_COLORS.map((c, i) => <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{i} ones</span>)}</div>
                </div>
            );
        case 'bptt': {
            const top = Math.max(...step.reach);
            return (
                <div className="w-full max-w-md mx-auto">
                    <Caption>‖∂L/∂hₜ‖ for one unit of error on the final count</Caption>
                    <div className="flex items-end gap-2 h-40">
                        {step.reach.map((g, t) => (
                            <div key={t} className="flex-1 flex flex-col items-center justify-end h-full">
                                <span className="text-[10px] text-slate-400 mb-1 font-mono">{f2(g)}</span>
                                <div className="w-full rounded-t bg-yellow-400" style={{ height: `${(g / top) * 100}%` }} />
                                <span className="text-[10px] text-slate-500 mt-1">t={t + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        case 'curve':
            return (
                <div className="w-full">
                    <Caption>Training loss, measured as it trained in your browser</Caption>
                    <LossChart series={[{ name: 'MSE', color: '#facc15', points: step.history.map(h => ({ x: h.step, y: h.loss })) }]} logY />
                </div>
            );
        case 'long':
            return (
                <div className="w-full">
                    <Caption>20 ones in a row: true count against the RNN&apos;s output</Caption>
                    <svg viewBox="0 0 420 170" className="w-full block max-w-[520px] mx-auto" role="img" aria-label="Count against output">
                        {[0, 5, 10, 15, 20].map(v => <g key={v}><line x1={30} x2={410} y1={150 - v * 7} y2={150 - v * 7} stroke="#1e293b" /><text x={24} y={154 - v * 7} fontSize={10} textAnchor="end" fill="#64748b">{v}</text></g>)}
                        {step.ones.map((y, t) => (
                            <g key={t}>
                                <circle cx={40 + t * 18.5} cy={150 - (t + 1) * 7} r={3} fill="#64748b" />
                                <circle cx={40 + t * 18.5} cy={150 - y * 7} r={3.5} fill="#facc15" />
                            </g>
                        ))}
                        <line x1={40 + 7 * 18.5} x2={40 + 7 * 18.5} y1={8} y2={150} stroke="#475569" strokeDasharray="4 3" />
                        <text x={44 + 7 * 18.5} y={18} fontSize={10} fill="#94a3b8">trained up to 8 steps</text>
                    </svg>
                    <div className="flex gap-4 justify-center text-xs text-slate-400"><span><span className="inline-block h-2 w-2 rounded-full bg-slate-500 mr-1" />true count</span><span><span className="inline-block h-2 w-2 rounded-full bg-yellow-400 mr-1" />RNN output</span></div>
                </div>
            );
        case 'lengths':
            return (
                <div className="w-full max-w-sm mx-auto space-y-2">
                    <Caption>Final count right, 400 random strings each</Caption>
                    {[8, 12, 20].map(len => (
                        <div key={len} className="grid grid-cols-[4rem_1fr_3rem] items-center gap-2 text-xs">
                            <span className="text-slate-400 font-mono">{len} bits</span>
                            <span className="h-3 rounded bg-slate-800 overflow-hidden"><span className="block h-full bg-yellow-400" style={{ width: `${step.acc[len].last * 100}%` }} /></span>
                            <span className="text-slate-200 font-mono text-right">{pct(step.acc[len].last)}</span>
                        </div>
                    ))}
                </div>
            );
        default: return null;
    }
}

/* ── explore: train it yourself ──────────────────────────── */
function Explore({ initialBits, reference }) {
    const [hidden, setHidden] = useState(2);
    const [cut, setCut] = useState(false);
    const [seed, setSeed] = useState(TRAIN.seed);
    const [bits, setBits] = useState(initialBits);
    const trainer = useTrainer({
        init: () => initCounter({ hidden, seed, cut }),
        step: (run, s) => ({ loss: trainStep(run, s) }),
        deps: [hidden, seed, cut],
        maxSteps: 3000,
        budgetMs: 8,
    });
    const net = trainer.state.net;
    const run = runSequence(net, bits.map(b => [b]));
    const counts = countsOf(bits);
    const right = run.steps.filter((s, t) => Math.round(s.y[0]) === counts[t]).length;
    const last = trainer.history[trainer.history.length - 1];
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-slate-500">Hidden units</span>
                    <Segmented options={[[2, '2'], [3, '3'], [4, '4']]} value={hidden} onChange={setHidden} accent="yellow" ariaLabel="Hidden units" />
                    <button onClick={trainer.toggle} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">
                        {trainer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{trainer.running ? 'Pause' : trainer.steps ? 'Resume' : 'Train'}
                    </button>
                    <button onClick={trainer.reset} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" />Reset</button>
                    <button onClick={() => setSeed(s => s + 1)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-yellow-500">New seed ({seed})</button>
                    <span className="text-xs text-slate-400 font-mono ml-auto">step {trainer.steps} · loss {last ? fLoss(last.loss) : '—'}</span>
                </div>
                <LossChart series={[{ name: 'MSE', color: '#facc15', points: trainer.history.map(h => ({ x: h.step, y: h.loss })) }]} logY />
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Test string (click a bit to flip it)</span>
                    <button onClick={() => setBits(b => (b.length < 16 ? [...b, 1] : b))} aria-label="Add a bit" className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"><Plus className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setBits(b => (b.length > 1 ? b.slice(0, -1) : b))} aria-label="Remove a bit" className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="text-xs text-slate-400 ml-auto">{right} of {bits.length} counts right</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="text-sm font-mono">
                        <tbody>
                            <tr>{bits.map((b, t) => (
                                <td key={t} className="px-0.5 py-1"><button onClick={() => setBits(bs => bs.map((x, i) => (i === t ? 1 - x : x)))} aria-label={`Flip bit ${t + 1}`}
                                    className={`h-8 w-8 rounded-md border ${b ? 'border-yellow-300 bg-yellow-400 text-slate-900' : 'border-slate-600 bg-slate-700 text-slate-100'}`}>{b}</button></td>
                            ))}</tr>
                            <tr>{counts.map((c, t) => <td key={t} className="text-center text-slate-300 text-xs">{c}</td>)}</tr>
                            <tr>{run.steps.map((s, t) => <td key={t} className={`text-center text-xs ${Math.round(s.y[0]) === counts[t] ? 'text-green-300' : 'text-red-300'}`}>{f1(s.y[0])}</td>)}</tr>
                        </tbody>
                    </table>
                </div>
                {hidden === 2 && <div className="max-w-[300px]"><Caption>Hidden state path</Caption><HiddenPlane path={run.steps.map(s => Array.from(s.h))} /></div>}
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Scissors className="h-4 w-4 text-amber-400" />Break it: cut the loop</h3>
                <p className="text-xs text-slate-400">Pin W to zero, so the new state cannot see the old one, and train again.</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setCut(c => !c)} aria-pressed={cut}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${cut ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-amber-500'}`}>
                        <Scissors className="h-3.5 w-3.5" />{cut ? 'Loop cut (W = 0)' : 'Cut the loop'}
                    </button>
                    {cut && <button onClick={() => setCut(false)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                {cut && (
                    <BreakNote>
                        With W = 0 the state is rebuilt from the current bit alone, so every 1 gets the same answer and every 0 another. Train it and watch the loss stall instead of falling towards 0.
                        {reference && <> When this page opened, {TRAIN.steps.toLocaleString('en-US')} steps took the cut network to a loss of {fLoss(reference.cut)}, against {fLoss(reference.main)} with the loop.</>}
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function RecurrentNeuralNetworksPage() {
    const [model, setModel] = useState(null);
    const [mode, setMode] = useState('guided');
    const [presetIndex, setPresetIndex] = useState(0);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    // Train after the first paint, so the skeleton shows while it runs.
    useEffect(() => { const t = setTimeout(() => setModel(trainAll()), 30); return () => clearTimeout(t); }, []);
    const stepHistory = useMemo(() => (model ? generateSteps(model, presetIndex) : []), [model, presetIndex]);
    const play = useStepPlayback(stepHistory, 1700);
    const step = play.step;
    const predict = usePredict(stepHistory, play.current, predictFor, play.pause);
    const [exploreKey, setExploreKey] = useState(0);
    const toExplore = () => { setExploreKey(k => k + 1); setMode('explore'); play.pause(); };
    const finalLoss = (h) => h[h.length - 1].loss;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/deep-learning-architectures" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Deep Learning Architectures
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Recurrent Neural Networks</h1>
                    <p className="text-yellow-50 max-w-3xl">
                        A network with a loop: it reads one step at a time and carries a hidden state forward. Watch a two-unit RNN, trained in your browser, learn to count — and see exactly where its memory runs out.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/neural-networks/backpropagation" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Backpropagation</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Train it yourself', MousePointer2]]} mode={mode}
                            setMode={(m) => (m === 'explore' ? toExplore() : setMode(m))} accent="yellow" />
                        <SourceChip kind="live">Trained in your browser · 2 hidden units · 11 numbers</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={exploreKey} initialBits={PRESETS[presetIndex].bits}
                            reference={model && { main: finalLoss(model.history), cut: finalLoss(model.cutHistory) }} />
                    ) : !model ? (
                        <LoadingCard text="Training the RNN in your browser (1,500 steps)…" />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">String:</span>
                                {PRESETS.map((pr, k) => (
                                    <button key={pr.label} onClick={() => { setPresetIndex(k); play.pause(); }} aria-pressed={presetIndex === k}
                                        className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${presetIndex === k ? 'border-yellow-400 bg-yellow-500/15 text-yellow-100' : 'border-slate-700 text-slate-400 hover:border-yellow-500'}`}>{pr.label}</button>
                                ))}
                            </div>
                            <TourPlayer acts={ACTS} steps={stepHistory} play={play} predict={predict} accent="yellow" minHeight="min-h-[340px]">
                                <VisualizationPanel step={step} model={model} />
                            </TourPlayer>
                            {predict.prompt && <PredictPrompt predict={predict} accent="yellow" />}
                            <ExplanationBox text={step?.explanation} predict={predict} accent="yellow" />
                            {step && <FormulaPanel><div className="overflow-x-auto"><Tex block>{formulaFor(step)}</Tex></div></FormulaPanel>}
                        </>
                    )}

                    <InCode title="The same RNN in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="One cell, reused at every step" icon={Repeat}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="font-mono text-slate-200">W</span> [2, 2] — old state to new state: the loop.</li>
                            <li><span className="font-mono text-slate-200">U</span> [2, 1] — the new bit to the new state.</li>
                            <li><span className="font-mono text-slate-200">V</span> [1, 2] — the state to the answer.</li>
                            <li>Plus biases <span className="font-mono text-slate-200">b</span> and <span className="font-mono text-slate-200">c</span>: 11 numbers for any length.</li>
                        </ul>
                    </Card>

                    <Misconception claim="An RNN remembers the whole sequence it has read.">
                        {model ? (
                            <>
                                <p>It remembers only what fits in its hidden state and what training rewarded. Here that is two numbers, and all 256 eight-bit strings land in nine clusters by count: strings with the same count end {f2(model.cloud.within)} apart on average, against {f2(model.cloud.gap)} between neighbouring counts. The order of the bits is gone.</p>
                                <p>And past what it trained on, the state saturates: the final count is right {pct(model.acc[8].last)} of the time on 8-bit strings and {pct(model.acc[20].last)} on 20-bit ones.</p>
                            </>
                        ) : <p>Measuring once the network has trained…</p>}
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
