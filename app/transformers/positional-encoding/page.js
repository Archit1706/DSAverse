"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Shuffle as ShuffleIcon, Plus, Waves, Ruler, RotateCw, Brain, Orbit, EyeOff,
    CheckCircle, XCircle, Wrench, Unplug, ListOrdered,
} from 'lucide-react';
import { loadTinyGpt } from '@/lib/ml/tinyGpt';
import { forwardWith, nextTokenScore, sinusoidal, rope } from '@/lib/ml/gptVariants';
import { toRows, softmax } from '@/lib/ml/tensor';
import useLoaded from '@/lib/ml/useLoaded';
import Heatmap from '@/components/ml/Heatmap';
import TokenStrip from '@/components/ml/TokenStrip';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import ProbBars from '@/components/ml/ProbBars';
import Tex from '@/components/math/Tex';
import Plane2D, { Vector, Label, Segment } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card, Segmented,
} from '@/components/ml/TourKit';

/* ── positions ─────────────────────────────────────────────
   Attention compares every token with every other by content alone, so
   without help it cannot tell "Mia saw Ben" from "Ben saw Mia". Three
   answers: add a learned vector per position (the tiny GPT, GPT-2), add a
   fixed sinusoid (the original Transformer), or rotate q and k by their
   position (RoPE, used by LLaMA). */

const PE_D = 16;          // sinusoid width in the tour: 8 sin/cos pairs
const ROPE_THETA = 0.3;   // the 2D RoPE demo's angle per position

const PRESETS = [
    { label: 'Mia … She found', text: 'One day, Mia went to the park. She found a red ball' },
    { label: 'Ruby saw a cat', text: 'After lunch, Ruby saw a cat in the kitchen.' },
    { label: 'Ben and Zoe', text: 'One day, Ben and Zoe went to the farm. Ben was happy.' },
    { label: 'Lily lost her hat', text: 'Last week, Lily lost her blue hat. She was sad. She' },
];

/* Measured over 100 generated stories (seed 31, 5,755 predictions) and
   checked by the test suite: next-token loss and accuracy with the
   tiny GPT's position vectors, and with them replaced by zeros. */
const POS_OFF = { stories: 100, tokens: 5755, loss: [0.326, 2.196], acc: [0.866, 0.652] };

/* The tour's prompts: "which pair of positions has exactly the same dot
   product as this one?" Exactly one option shares the reference offset k;
   the others have offsets whose dot product differs by at least 0.3.
   Chosen by a seeded search (seed 23) so that every shortcut — smallest or
   largest offset, the same start, the same end, the closest start, the
   lowest start, the highest end — is right at most a quarter of the time;
   the answer's button follows a Latin square. Rows: [p, k, options, answer]. */
const PAIR_ASKS = [
    [[2, 1, [[13, 8], [39, 3], [33, 1], [2, 9]], 2], [2, 9, [[34, 9], [2, 6], [8, 8], [2, 11]], 0], [5, 8, [[15, 2], [31, 7], [8, 10], [12, 8]], 3], [16, 9, [[26, 12], [13, 9], [16, 11], [6, 5]], 1]],
    [[21, 9, [[21, 1], [30, 9], [21, 5], [3, 3]], 1], [17, 9, [[17, 3], [2, 7], [0, 11], [6, 9]], 3], [20, 6, [[8, 6], [20, 5], [40, 3], [20, 1]], 0], [3, 9, [[40, 7], [3, 11], [2, 9], [28, 8]], 2]],
    [[21, 6, [[21, 8], [21, 9], [3, 12], [5, 6]], 3], [28, 2, [[28, 1], [0, 2], [10, 10], [6, 8]], 1], [7, 5, [[20, 1], [0, 8], [4, 5], [4, 6]], 2], [25, 9, [[10, 9], [10, 7], [21, 6], [25, 3]], 0]],
    [[4, 8, [[12, 8], [31, 9], [34, 2], [4, 12]], 0], [22, 2, [[12, 10], [27, 7], [36, 2], [22, 4]], 2], [3, 8, [[7, 9], [6, 8], [3, 4], [0, 3]], 1], [28, 3, [[28, 5], [5, 11], [13, 6], [16, 3]], 3]],
];

/* RoPE demo vectors: 2D for the picture, 16D for the check beside it. */
const ROPE_Q = [1.2, 0.5], ROPE_K = [0.8, 1.1];
const ROPE_Q16 = [0.6, -1.1, 0.3, 0.9, -0.4, 1.3, 0.2, -0.7, 1.0, 0.1, -0.5, 0.8, 0.4, -0.9, 0.7, 0.2];
const ROPE_K16 = [-0.3, 0.8, 1.1, -0.2, 0.6, 0.5, -1.0, 0.4, 0.2, -0.6, 0.9, 0.3, -0.8, 0.1, 0.5, 1.2];
const ROPE_CASES = [[5, 2], [9, 6], [3, 6]];

const ACTS = [
    { id: 1, label: 'A Bag of Words', icon: ShuffleIcon },
    { id: 2, label: 'Add a Position', icon: Plus },
    { id: 3, label: 'Sinusoids', icon: Waves },
    { id: 4, label: 'Distance, Not Place', icon: Ruler },
    { id: 5, label: 'A Turn per Pair', icon: RotateCw },
    { id: 6, label: 'Learned Positions', icon: Brain },
    { id: 7, label: 'RoPE', icon: Orbit },
    { id: 8, label: 'Without Positions', icon: EyeOff },
];

const num = (v, d = 2) => {
    const r = Math.round(v * 10 ** d) / 10 ** d;
    return `${r < 0 ? '−' : ''}${Math.abs(r).toFixed(d)}`;
};
const pct = (v) => `${Math.round(v * 100)}%`;
const clean = (t) => (t.trim() === '' ? '␣' : t.trim());
const tokText = (model, id) => model.tokenizer.tokenText(id) ?? model.tokenizer.tokenLabel(id);
const tokensOf = (model, ids) => ids.map(id => ({ id, text: tokText(model, id) }));
const dotv = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const normv = (a) => Math.sqrt(dotv(a, a));
const peDot = (p, k, d = PE_D) => dotv(sinusoidal(p, d), sinusoidal(p + k, d));
const omega = (i, d = PE_D) => 1 / 10000 ** (2 * i / d);
const rot2 = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const pairLabel = ([a, o]) => `positions ${a} and ${a + o}`;
const lastProbs = (run) => {
    const L = run.logits, T = L.rows;
    return softmax(Array.from(L.data.subarray((T - 1) * L.cols, T * L.cols)));
};
const lastLogits = (run) => { const L = run.logits, T = L.rows; return Array.from(L.data.subarray((T - 1) * L.cols, T * L.cols)); };
const maxAbsDiff = (a, b) => a.reduce((m, x, i) => Math.max(m, Math.abs(x - b[i])), 0);

/** Earlier words reversed, last token kept in place. */
const reverseEarlier = (ids) => [...ids.slice(0, -1).reverse(), ids[ids.length - 1]];

/** Mean, lowest and highest cosine similarity between learned position vectors k apart. */
function learnedSimilarity(model, maxK = 24) {
    const wpe = model.tensors.wpe, d = wpe.cols, n = wpe.rows;
    const rowv = (p) => Array.from(wpe.data.subarray(p * d, (p + 1) * d));
    const rows = Array.from({ length: n }, (_, p) => rowv(p));
    const cos = (a, b) => dotv(a, b) / (normv(a) * normv(b));
    const byK = [];
    for (let k = 0; k <= maxK; k++) {
        const v = [];
        for (let p = 0; p + k < n; p++) v.push(cos(rows[p], rows[p + k]));
        byK.push({ mean: v.reduce((a, b) => a + b, 0) / v.length, lo: Math.min(...v), hi: Math.max(...v) });
    }
    const grid = Array.from({ length: maxK }, (_, i) => Array.from({ length: maxK }, (_, j) => cos(rows[i], rows[j])));
    return { byK, grid };
}

function generateSteps(model, presetIndex) {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });
    const ids = model.tokenizer.encode(PRESETS[presetIndex].text);
    const T = ids.length;
    const tokens = tokensOf(model, ids);
    const rev = reverseEarlier(ids);

    // 1. without positions and mask, order is invisible
    const runs = [[ids, false], [rev, false], [ids, true], [rev, true]].map(([x, positions]) => forwardWith(model, x, { positions, mask: false }));
    const [bagA, bagB, posA, posB] = runs.map(lastProbs);
    const top = (p) => p.map((x, id) => ({ id, p: x })).sort((a, b) => b.p - a.p).slice(0, 4).map(x => ({ label: clean(tokText(model, x.id)), p: x.p }));
    const [lA, lB, lC, lD] = runs.map(lastLogits);
    const bagDiff = maxAbsDiff(lA, lB), posDiff = maxAbsDiff(lC, lD);
    s(1, 'A Bag of Words', { kind: 'bag', tokens, revTokens: tokensOf(model, rev), barsA: top(bagA), barsB: top(bagB), bagDiff, posDiff },
        `Attention scores every pair by content: q · k does not know where either token sits. Take away the tiny GPT's position vectors and its causal mask, then reverse the words before "${clean(tokens[T - 1].text)}". Its prediction for the next token does not change at all: its 640 scores (logits) for the next token differ by at most ${bagDiff.toExponential(0)}, rounding error. Without positions, a sentence is a bag of words.`);

    // 2. add a position vector
    const run = forwardWith(model, ids);
    s(2, 'Add a Position', { kind: 'add', tokens, tok: toRows(run.tokEmb), pos: toRows(run.posEmb), sum: toRows(run.blocks[0].input) },
        `The fix: before the first layer, add a vector that depends only on the position. The tiny GPT learned one 64-number vector for each of its 64 positions, a [64, 64] table. Row p is added to whichever token sits at p, so "Mia" at position 3 and "Mia" at position 9 enter the network as different vectors. Put the same word at the same place twice and the pair is identical; put them at different places and the position row is all that differs.`);
    // with positions on, reversing does change the prediction
    s(2, 'Add a Position', { kind: 'bag', tokens, revTokens: tokensOf(model, rev), barsA: top(posA), barsB: top(posB), bagDiff: posDiff, posDiff, withPos: true },
        `Same reversal, positions back on (mask still off): now the 640 scores move by up to ${num(posDiff, 2)}. The model can tell the two orders apart.`);

    // 3. sinusoids
    const grid = Array.from({ length: 32 }, (_, p) => sinusoidal(p, PE_D));
    s(3, 'Sinusoids', { kind: 'sin', grid },
        `The original Transformer did not learn its positions; it wrote them down. Position p gets sin and cos of p·ω for ${PE_D / 2} frequencies, from ω = 1 (a full turn every ${num(2 * Math.PI, 1)} positions) down to ω = ${num(omega(PE_D / 2 - 1), 5)} (a full turn every ${Math.round(2 * Math.PI / omega(PE_D / 2 - 1)).toLocaleString('en-US')}). Fast pairs separate neighbours; slow pairs tell position 3 from position 300. Like the digits of a clock.`);

    // 4. distance, not place: four prompts
    PAIR_ASKS[presetIndex].forEach(([p, k, opts, pos], q) => {
        const ref = peDot(p, k);
        s(4, 'Distance, Not Place', {
            kind: 'pair-setup', p, k, ref, opts,
            ask: {
                question: `PE(${p}) · PE(${p + k}) = ${num(ref, 3)}. Which pair has exactly the same dot product?`,
                options: opts.map(pairLabel), correct: pos,
                because: `Only the offset matters: PE(p) · PE(p + k) = Σ cos(k·ωᵢ), with no p in it. ${pairLabel(opts[pos])} is ${k} apart, like ${p} and ${p + k}.`,
            },
        }, `${q === 0 ? 'Here is the property that makes sinusoids useful. ' : ''}Positions ${p} and ${p + k} are ${k} apart, and their encodings have dot product ${num(ref, 3)}. Four other pairs are listed.`);
        const dots = opts.map(([a, o]) => peDot(a, o));
        s(4, 'Distance, Not Place', { kind: 'pair', p, k, ref, opts, dots, pos },
            `${pairLabel(opts[pos])} is also ${k} apart and gives ${num(dots[pos], 3)}, the same. Each sin/cos pair contributes sin(pω)sin((p + k)ω) + cos(pω)cos((p + k)ω) = cos(kω): the p cancels. So a head can learn "look ${k} back" once and use it everywhere.`);
    });

    // 5. a turn per pair
    [[1, 2], [6, 2]].forEach(([p, k], z) => {
        s(5, 'A Turn per Pair', { kind: 'turn', p, k },
            z === 0
                ? `Look at one sin/cos pair as a point on a circle. Moving from position ${p} to ${p + k} turns it by k·ω: ${num(k * omega(0), 2)} radians for the fastest pair, ${num(k * omega(1), 2)} for the next. The turn depends on the step, not on where you start.`
                : `Start at ${p} instead and step ${k} again: the same turn. Every pair rotates at its own speed, which is why a fixed rotation (a linear map) can move any position k steps along.`);
    });

    // 6. learned positions
    const sim = learnedSimilarity(model);
    s(6, 'Learned Positions', { kind: 'learned', sim },
        `The tiny GPT was never told any of this. Its learned position vectors are similar to their neighbours anyway: cosine similarity ${num(sim.byK[1].mean, 2)} at distance 1, ${num(sim.byK[10].mean, 2)} at 10, ${num(sim.byK[20].mean, 2)} at 20. Training found "nearby positions look alike" on its own. Unlike sinusoids, it is only roughly a matter of distance: at distance 5 the similarity ranges from ${num(sim.byK[5].lo, 2)} to ${num(sim.byK[5].hi, 2)} depending on where you start.`);

    // 7. RoPE
    ROPE_CASES.forEach(([m, n], z) => {
        const qr = rot2(ROPE_Q, m * ROPE_THETA), kr = rot2(ROPE_K, n * ROPE_THETA);
        const score = dotv(qr, kr);
        const s16 = dotv(rope(ROPE_Q16, m), rope(ROPE_K16, n));
        const text = [
            `RoPE, used by LLaMA and most recent models, adds nothing to the token. It rotates q by m·θ and k by n·θ just before their dot product, where m and n are the two positions. Here q sits at ${m} and k at ${n}: the score is ${num(score, 3)}. Rotation keeps lengths, so |q| stays ${num(normv(ROPE_Q), 3)}.`,
            `Move both along by ${m - ROPE_CASES[0][0]}: q at ${m}, k at ${n}. Both turn by the same extra angle, the angle between them is unchanged, and the score is ${num(score, 3)} again. With 16 numbers rotated pair by pair it is ${num(s16, 4)} at both. The score sees m − n = ${m - n}, never m or n.`,
            `Change the offset (q at ${m}, k at ${n}, so m − n = ${m - n}) and the score changes, to ${num(score, 3)}. Relative position enters exactly where attention needs it, inside q · k.`,
        ][z];
        s(7, 'RoPE', { kind: 'rope', m, n, score, s16 }, text);
    });

    // 8. without positions
    const off = forwardWith(model, ids, { positions: false });
    const sc = nextTokenScore(run.logits, ids), scOff = nextTokenScore(off.logits, ids);
    s(8, 'Without Positions', { kind: 'off', tokens, on: sc, off: scOff },
        `Switch the tiny GPT's position vectors off, keeping everything else. On this sentence the loss goes from ${num(sc.loss, 3)} to ${num(scOff.loss, 3)}. Over ${POS_OFF.stories} stories it goes from ${num(POS_OFF.loss[0], 3)} to ${num(POS_OFF.loss[1], 3)}, and the top guess is right ${pct(POS_OFF.acc[1])} of the time instead of ${pct(POS_OFF.acc[0])}. Not a total collapse: the causal mask still leaks some order, since a token can tell how many tokens it can see.`);
    return steps;
}

const predictFor = (step, next) => (next && step.ask ? step.ask : null);

function formulaFor(step) {
    if (!step) return null;
    if (step.kind === 'add') return String.raw`x_p = \text{tok}(w_p) + \text{pos}(p) \;\in\; \mathbb{R}^{64}`;
    if (step.kind === 'sin') return String.raw`PE(p, 2i) = \sin(p\,\omega_i), \quad PE(p, 2i{+}1) = \cos(p\,\omega_i), \quad \omega_i = 10000^{-2i/${PE_D}}`;
    if (step.kind === 'pair-setup' || step.kind === 'pair') return String.raw`PE(${step.p}) \cdot PE(${step.p + step.k}) = \sum_{i=0}^{${PE_D / 2 - 1}} \cos(${step.k}\,\omega_i) = ${num(step.ref, 3).replace('−', '-')}`;
    if (step.kind === 'turn') return String.raw`\begin{pmatrix}\sin((p{+}k)\omega)\\ \cos((p{+}k)\omega)\end{pmatrix} = \begin{pmatrix}\cos k\omega & \sin k\omega\\ -\sin k\omega & \cos k\omega\end{pmatrix}\begin{pmatrix}\sin p\omega\\ \cos p\omega\end{pmatrix}`;
    if (step.kind === 'rope') return String.raw`(R_{${step.m}\theta}\, q) \cdot (R_{${step.n}\theta}\, k) = q \cdot R_{(${step.n - step.m})\theta}\, k = ${num(step.score, 3).replace('−', '-')}`;
    return null;
}

const quizQuestions = [
    {
        question: 'Why does a transformer need position information at all?',
        options: [
            'Softmax cannot handle more than 64 tokens',
            'Attention compares tokens by content, so without positions reordering the input just reorders the output',
            'The feed-forward layer needs to know the sentence length',
            'Positions make the embeddings smaller',
        ],
        correct: 1,
        explanation: 'q · k has no notion of where either token is. Without position vectors (and without the causal mask) the tiny GPT gives exactly the same prediction for a sentence and its reversal.',
    },
    {
        question: 'With sinusoidal encodings, what does PE(p) · PE(p + k) depend on?',
        options: ['Only p', 'Only k', 'Both p and k', 'Neither: it is always 0'],
        correct: 1,
        explanation: 'Each sin/cos pair contributes cos(k·ω), so the sum Σ cos(k·ωᵢ) has no p in it. PE(2)·PE(5) equals PE(30)·PE(33).',
    },
    {
        question: 'How does RoPE add position?',
        options: [
            'It adds a learned vector to each token embedding',
            'It appends the position number as an extra dimension',
            'It rotates q and k by angles proportional to their positions, so q · k depends only on the offset',
            'It multiplies the attention weights by the distance',
        ],
        correct: 2,
        explanation: 'Rotating q by mθ and k by nθ leaves the angle between them changed by (n − m)θ, so the score depends on m − n. Rotation also keeps lengths, so nothing else changes.',
    },
];

const codeExample = `import numpy as np

def pe(p, d=16, base=10000):
    w = 1 / base ** (np.arange(0, d, 2) / d)
    out = np.empty(d)
    out[0::2], out[1::2] = np.sin(p * w), np.cos(p * w)
    return out

print(round(pe(2) @ pe(5), 4), round(pe(30) @ pe(33), 4))   # offset 3 both times

def rope(x, p, base=10000):
    a = p / base ** (np.arange(0, len(x), 2) / len(x))
    x1, x2 = x[0::2], x[1::2]
    out = np.empty(len(x))
    out[0::2], out[1::2] = x1 * np.cos(a) - x2 * np.sin(a), x1 * np.sin(a) + x2 * np.cos(a)
    return out

rng = np.random.default_rng(0)
q, k = rng.normal(size=16), rng.normal(size=16)
print(round(rope(q, 5) @ rope(k, 2), 4), round(rope(q, 9) @ rope(k, 6), 4))   # same offset
print(round(np.linalg.norm(rope(q, 7)) - np.linalg.norm(q), 12))
# 5.5431 5.5431
# 2.7754 2.7754
# 0.0`;

function QuizPanel({ quizState, setQuizState }) {
    const qq = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Step through the tour once more and try again.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white">Retake</button>
            </div>
        );
    }
    const answer = (idx) => {
        if (quizState.answered) return;
        const right = idx === qq.correct;
        setQuizState(st => ({ ...st, selected: idx, answered: true, score: right ? st.score + 1 : st.score }));
    };
    const next = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(st => ({ ...st, complete: true }));
        else setQuizState(st => ({ ...st, current: st.current + 1, selected: null, answered: false }));
    };
    return (
        <div>
            <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
            <p className="text-sm text-slate-200 mb-3 leading-relaxed">{qq.question}</p>
            <div className="space-y-2">
                {qq.options.map((opt, i) => {
                    let tone = 'border-slate-700 text-slate-300 hover:border-indigo-500';
                    if (quizState.answered) {
                        if (i === qq.correct) tone = 'border-green-500 bg-green-500/10 text-green-300';
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
                    <p className={`flex items-center gap-1.5 text-sm font-medium mb-1 ${quizState.selected === qq.correct ? 'text-green-400' : 'text-red-400'}`}>
                        {quizState.selected === qq.correct ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {quizState.selected === qq.correct ? 'Correct' : 'Not quite'}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{qq.explanation}</p>
                    <button onClick={next} className="text-sm px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'Finish' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── scenes ──────────────────────────────────────────────── */
const Caption = ({ children }) => <div className="text-xs text-slate-400 mb-1.5 flex flex-wrap items-center gap-1.5">{children}</div>;
const labels = (tokens) => tokens.map(t => clean(t.text));

/** Bars of similarity against offset; `series` share one axis from −1 to 1. */
function SimilarityBars({ series, n, ariaLabel }) {
    const W = 420, H = 130, pad = 22, bw = (W - pad) / n;
    const y = (v) => 10 + (1 - v) / 2 * (H - 30);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="max-w-xl" role="img" aria-label={ariaLabel}>
            <line x1={pad} x2={W} y1={y(0)} y2={y(0)} stroke="#475569" strokeWidth="1" />
            <text x={pad - 4} y={y(1) + 4} textAnchor="end" fontSize="9" fill="#64748b">1</text>
            <text x={pad - 4} y={y(0) + 3} textAnchor="end" fontSize="9" fill="#64748b">0</text>
            <text x={pad - 4} y={y(-1) + 3} textAnchor="end" fontSize="9" fill="#64748b">−1</text>
            {series.map((sr, z) => sr.values.map((v, k) => {
                const x = pad + k * bw;
                if (sr.kind === 'bar') return <rect key={`${z}-${k}`} x={(x + 1).toFixed(2)} width={Math.max(1, bw - 2).toFixed(2)} y={Math.min(y(v), y(0)).toFixed(2)} height={Math.abs(y(v) - y(0)).toFixed(2)} fill={sr.color} opacity="0.8" />;
                if (sr.kind === 'range') return <line key={`${z}-${k}`} x1={(x + bw / 2).toFixed(2)} x2={(x + bw / 2).toFixed(2)} y1={y(v[0]).toFixed(2)} y2={y(v[1]).toFixed(2)} stroke={sr.color} strokeWidth="1.5" />;
                return <circle key={`${z}-${k}`} cx={(x + bw / 2).toFixed(2)} cy={y(v).toFixed(2)} r="2.6" fill={sr.color} />;
            }))}
            {[0, 5, 10, 15, 20, 25, 30, 35, 40].filter(k => k < n).map(k => (
                <text key={k} x={(pad + k * bw + bw / 2).toFixed(2)} y={H - 4} textAnchor="middle" fontSize="9" fill="#64748b">{k}</text>
            ))}
        </svg>
    );
}

function TurnPlane({ p, k }) {
    const pts = [[0, 1, '#818cf8'], [1, 0.62, '#fbbf24']].map(([i, r, color]) => {
        const w = omega(i);
        return { i, color, a: [r * Math.sin(p * w), r * Math.cos(p * w)], b: [r * Math.sin((p + k) * w), r * Math.cos((p + k) * w)] };
    });
    return (
        <Plane2D xRange={[-1.3, 1.3]} yRange={[-1.3, 1.3]} grid={0.5} width={300} tickLabels={false} ariaLabel="Two sin/cos pairs as points on circles">
            {pts.map(pt => (
                <React.Fragment key={pt.i}>
                    <Vector to={pt.a} color={pt.color} width={2} opacity={0.5} label={`p=${p}`} />
                    <Vector to={pt.b} color={pt.color} width={3} label={`p=${p + k}`} />
                </React.Fragment>
            ))}
        </Plane2D>
    );
}

function RopePlane({ m, n, q = ROPE_Q, k = ROPE_K, theta = ROPE_THETA, onDragQ, onDragK }) {
    const qr = rot2(q, m * theta), kr = rot2(k, n * theta);
    return (
        <Plane2D xRange={[-2, 2]} yRange={[-2, 2]} grid={0.5} width={320} ariaLabel="q and k before and after rotation">
            <Vector to={q} color="#818cf8" width={2} dashed opacity={0.55} onDrag={onDragQ} snap={0.1} ariaLabel="q before rotation" />
            <Vector to={k} color="#fbbf24" width={2} dashed opacity={0.55} onDrag={onDragK} snap={0.1} ariaLabel="k before rotation" />
            <Vector to={qr} color="#818cf8" width={3} label={`q at ${m}`} />
            <Vector to={kr} color="#fbbf24" width={3} label={`k at ${n}`} />
        </Plane2D>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    switch (step.kind) {
        case 'bag':
            return (
                <div className="w-full grid sm:grid-cols-2 gap-4">
                    {[[step.tokens, step.barsA, 'As written'], [step.revTokens, step.barsB, 'Earlier words reversed']].map(([tk, bars, title]) => (
                        <div key={title} className="min-w-0 space-y-2">
                            <Caption>{title}{step.withPos ? ' · positions on' : ' · no positions, no mask'}</Caption>
                            <div className="overflow-x-auto"><TokenStrip tokens={tk} size="sm" /></div>
                            <ProbBars items={bars} accent="#818cf8" ariaLabel={`Next token, ${title}`} />
                        </div>
                    ))}
                    <p className="sm:col-span-2 text-xs font-mono text-slate-400">largest change in the 640 next-token scores: {step.bagDiff < 1e-3 ? step.bagDiff.toExponential(1) : num(step.bagDiff, 2)}</p>
                </div>
            );
        case 'add': {
            const L = labels(step.tokens);
            return (
                <div className="w-full space-y-3">
                    {[['token vectors', step.tok], ['+ position vectors (rows 0 to ' + (step.tokens.length - 1) + ' of the table)', step.pos], ['= what layer 1 receives', step.sum]].map(([t, d]) => (
                        <div key={t} className="min-w-0">
                            <Caption>{t} <ShapeTag shape={[step.tokens.length, 64]} names={['T', 'd']} /></Caption>
                            <div className="overflow-x-auto"><Heatmap data={d} rowLabels={L} scale="diverging" domain={[-0.5, 0.5]} cellSize={7} ariaLabel={t} /></div>
                        </div>
                    ))}
                </div>
            );
        }
        case 'sin':
            return (
                <div className="w-full min-w-0">
                    <Caption>PE for positions 0 to 31 <ShapeTag shape={[32, PE_D]} names={['position', 'd']} /> columns: sin, cos of ω₀, then ω₁, …</Caption>
                    <div className="overflow-x-auto"><Heatmap data={step.grid} rowLabels={step.grid.map((_, p) => String(p))} scale="diverging" domain={[-1, 1]} cellSize={14} ariaLabel="Sinusoidal encodings" /></div>
                </div>
            );
        case 'pair-setup':
        case 'pair':
            return (
                <div className="w-full space-y-3 text-sm">
                    <div className="font-mono text-indigo-200">PE({step.p}) · PE({step.p + step.k}) = {num(step.ref, 3)} <span className="text-slate-500">offset {step.k}</span></div>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {step.opts.map((o, z) => (
                            <div key={z} className={`rounded-lg border px-3 py-2 font-mono text-xs ${step.kind === 'pair' && z === step.pos ? 'border-green-500 bg-green-500/10 text-green-200' : 'border-slate-700 text-slate-300'}`}>
                                PE({o[0]}) · PE({o[0] + o[1]}) = {step.kind === 'pair' ? num(step.dots[z], 3) : '?'}
                                {step.kind === 'pair' && <span className="text-slate-500"> · offset {o[1]}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'turn':
            return (
                <div className="w-full flex flex-wrap items-center gap-6">
                    <TurnPlane p={step.p} k={step.k} />
                    <div className="text-xs font-mono space-y-1 text-slate-300">
                        <div><span className="text-indigo-300">pair 0</span>, ω = 1: turn {num(step.k * omega(0), 3)} rad</div>
                        <div><span className="text-amber-300">pair 1</span>, ω = {num(omega(1), 3)}: turn {num(step.k * omega(1), 3)} rad</div>
                    </div>
                </div>
            );
        case 'learned':
            return (
                <div className="w-full grid md:grid-cols-[auto_1fr] gap-4 items-start">
                    <div className="min-w-0">
                        <Caption>Cosine similarity of positions 0 to 23 <ShapeTag shape={[24, 24]} /></Caption>
                        <div className="overflow-x-auto"><Heatmap data={step.sim.grid} scale="diverging" domain={[-1, 1]} cellSize={9} ariaLabel="Similarity of learned positions" /></div>
                    </div>
                    <div className="min-w-0">
                        <Caption>Mean by distance (bars) with lowest to highest (lines)</Caption>
                        <SimilarityBars n={step.sim.byK.length} ariaLabel="Similarity by distance" series={[
                            { kind: 'bar', color: '#818cf8', values: step.sim.byK.map(x => x.mean) },
                            { kind: 'range', color: '#fbbf24', values: step.sim.byK.map(x => [x.lo, x.hi]) },
                        ]} />
                    </div>
                </div>
            );
        case 'rope':
            return (
                <div className="w-full flex flex-wrap items-center gap-6">
                    <RopePlane m={step.m} n={step.n} />
                    <div className="text-xs font-mono space-y-1 text-slate-300">
                        <div>q at {step.m}, k at {step.n}, m − n = {step.m - step.n}</div>
                        <div className="text-indigo-200">score (2D): {num(step.score, 3)}</div>
                        <div>score (16D): {num(step.s16, 4)}</div>
                    </div>
                </div>
            );
        case 'off':
            return (
                <div className="w-full space-y-3">
                    <div className="overflow-x-auto"><TokenStrip tokens={step.tokens} size="sm" /></div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        {[['Positions on', step.on], ['Positions off', step.off]].map(([t, sc]) => (
                            <div key={t} className="rounded-lg border border-slate-700 p-3">
                                <div className="text-slate-200 font-semibold">{t}</div>
                                <div className="font-mono text-xs text-slate-400">loss {num(sc.loss, 3)} · top guess right {pct(sc.accuracy)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        default: return null;
    }
}

/* ── explore ─────────────────────────────────────────────── */
function SinusoidExplorer() {
    const [d, setD] = useState(16);
    const [p, setP] = useState(4);
    const [k, setK] = useState(3);
    const p2 = p + 17;
    const grid = useMemo(() => Array.from({ length: 40 }, (_, q) => sinusoidal(q, d)), [d]);
    const sims = (start) => Array.from({ length: 31 }, (_, o) => peDot(start, o, d) / (d / 2));
    return (
        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Waves className="h-4 w-4 text-indigo-400" />Sinusoids</h3>
            <div className="grid sm:grid-cols-3 gap-3">
                <ParamSlider label="width d" value={d} onChange={setD} min={4} max={64} step={4} accent="indigo" format={v => String(v)} />
                <ParamSlider label="start p" value={p} onChange={setP} min={0} max={40} step={1} accent="indigo" format={v => String(v)} />
                <ParamSlider label="offset k" value={k} onChange={setK} min={0} max={30} step={1} accent="indigo" format={v => String(v)} />
            </div>
            <div className="overflow-x-auto max-h-72"><Heatmap data={grid} rowLabels={grid.map((_, q) => String(q))} highlightRow={p} scale="diverging" domain={[-1, 1]} cellSize={Math.max(6, Math.min(14, Math.floor(480 / d)))} ariaLabel="Sinusoidal encodings" /></div>
            <div className="font-mono text-xs space-y-1">
                <div className="text-indigo-200">PE({p}) · PE({p + k}) = {num(peDot(p, k, d), 4)}</div>
                <div className="text-amber-200">PE({p2}) · PE({p2 + k}) = {num(peDot(p2, k, d), 4)}</div>
            </div>
            <div>
                <Caption>Similarity with each later position, from p = {p} (bars) and p = {p2} (dots): the same curve</Caption>
                <SimilarityBars n={31} ariaLabel="Similarity by offset" series={[{ kind: 'bar', color: '#818cf8', values: sims(p) }, { kind: 'dot', color: '#fbbf24', values: sims(p2) }]} />
            </div>
        </div>
    );
}

function RopeExplorer() {
    const [q, setQ] = useState(ROPE_Q);
    const [k, setK] = useState(ROPE_K);
    const [m, setM] = useState(5);
    const [n, setN] = useState(2);
    const [theta, setTheta] = useState(ROPE_THETA);
    const score = dotv(rot2(q, m * theta), rot2(k, n * theta));
    return (
        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Orbit className="h-4 w-4 text-indigo-400" />RoPE in 2D: drag q and k (dashed), move the positions</h3>
            <div className="flex flex-wrap items-start gap-6">
                <RopePlane m={m} n={n} q={q} k={k} theta={theta} onDragQ={setQ} onDragK={setK} />
                <div className="flex-1 min-w-[220px] space-y-3">
                    <ParamSlider label="q position m" value={m} onChange={setM} min={0} max={20} step={1} accent="indigo" format={v => String(v)} />
                    <ParamSlider label="k position n" value={n} onChange={setN} min={0} max={20} step={1} accent="indigo" format={v => String(v)} />
                    <ParamSlider label="θ per position" value={theta} onChange={setTheta} min={0.05} max={1} step={0.05} accent="indigo" format={v => num(v, 2)} />
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => { setM(x => Math.min(20, x + 3)); setN(x => Math.min(20, x + 3)); }} disabled={m > 17 || n > 17}
                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500 disabled:opacity-40">Shift both by 3</button>
                        <button onClick={() => { setM(x => Math.max(0, x - 3)); setN(x => Math.max(0, x - 3)); }} disabled={m < 3 || n < 3}
                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500 disabled:opacity-40">Shift both back by 3</button>
                    </div>
                    <div className="font-mono text-xs space-y-1">
                        <div className="text-indigo-200">score = {num(score, 4)} <span className="text-slate-500">(m − n = {m - n})</span></div>
                        <div className="text-slate-400">|q| = {num(normv(q), 3)} before, {num(normv(rot2(q, m * theta)), 3)} after</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Explore({ model, initialText }) {
    const [text, setText] = useState(initialText);
    const [positions, setPositions] = useState(true);
    const [mask, setMask] = useState(true);
    const [reversed, setReversed] = useState(false);
    const ids0 = useMemo(() => model.tokenizer.encode(text).slice(0, 40), [model, text]);
    const ids = reversed ? reverseEarlier(ids0) : ids0;
    const run = useMemo(() => forwardWith(model, ids, { positions, mask }), [model, ids, positions, mask]);
    const base = useMemo(() => forwardWith(model, ids0, { positions, mask }), [model, ids0, positions, mask]);
    const p = lastProbs(run);
    const diff = maxAbsDiff(lastLogits(run), lastLogits(base));
    const top = p.map((x, id) => ({ id, p: x })).sort((a, b) => b.p - a.p).slice(0, 5);
    const broken = !positions || !mask || reversed;
    return (
        <div className="space-y-4">
            <SinusoidExplorer />
            <RopeExplorer />
            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 sm:p-6 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Unplug className="h-4 w-4 text-amber-400" />Break it: the tiny GPT without positions</h3>
                <div className="flex flex-wrap items-center gap-2">
                    {PRESETS.map(pr => (
                        <button key={pr.label} onClick={() => setText(pr.text)} aria-pressed={text === pr.text}
                            className={`text-xs px-2.5 py-1 rounded-lg border ${text === pr.text ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-400 hover:border-indigo-500'}`}>{pr.label}</button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-3">
                    <Segmented options={[[true, 'Positions on'], [false, 'Positions off']]} value={positions} onChange={setPositions} accent="indigo" ariaLabel="Positions" />
                    <Segmented options={[[true, 'Mask on'], [false, 'Mask off']]} value={mask} onChange={setMask} accent="indigo" ariaLabel="Causal mask" />
                    <Segmented options={[[false, 'As written'], [true, 'Earlier words reversed']]} value={reversed} onChange={setReversed} accent="indigo" ariaLabel="Word order" />
                    {broken && <button onClick={() => { setPositions(true); setMask(true); setReversed(false); }} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                <div className="overflow-x-auto"><TokenStrip tokens={tokensOf(model, ids)} size="sm" /></div>
                <div className="grid md:grid-cols-2 gap-4 items-start">
                    <div className="max-w-md">
                        <Caption>Next token after &quot;{clean(tokText(model, ids[ids.length - 1]))}&quot;</Caption>
                        <ProbBars items={top.map(x => ({ label: clean(tokText(model, x.id)), p: x.p }))} chosen={0} accent="#818cf8" />
                    </div>
                    <div className="text-xs font-mono text-slate-400 space-y-1">
                        <div>loss on this text: {num(nextTokenScore(run.logits, ids).loss, 3)}</div>
                        {reversed && <div className={diff < 1e-5 ? 'text-green-300' : 'text-amber-200'}>largest change in the 640 next-token scores: {diff < 1e-3 ? diff.toExponential(1) : num(diff, 2)}{diff < 1e-5 ? ', none' : ''}</div>}
                    </div>
                </div>
                {broken && (
                    <BreakNote>
                        {!positions && !mask && reversed
                            ? 'No positions and no mask: the reversed sentence gives exactly the prediction of the original. The model sees a bag of words.'
                            : !positions && reversed
                                ? 'No positions, but the mask is on: each earlier token still sees a different prefix after reversing, so some order leaks through and the prediction moves.'
                                : `Over ${POS_OFF.stories} stories, positions off takes the loss from ${num(POS_OFF.loss[0], 3)} to ${num(POS_OFF.loss[1], 3)}. The model was trained with both positions and the mask; take either away and it is reading text it has never seen.`}
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function PositionalEncodingPage() {
    const loaded = useLoaded(loadTinyGpt);
    const model = loaded.data;
    const [mode, setMode] = useState('guided');
    const [presetIndex, setPresetIndex] = useState(0);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const stepHistory = useMemo(() => (model ? generateSteps(model, presetIndex) : []), [model, presetIndex]);
    const play = useStepPlayback(stepHistory, 2000);
    const step = play.step;
    const predict = usePredict(stepHistory, play.current, predictFor, play.pause);
    const [exploreKey, setExploreKey] = useState(0);
    const toExplore = () => { setExploreKey(k => k + 1); setMode('explore'); play.pause(); };
    const tex = step ? formulaFor(step) : null;
    const turnMode = step && ['turn', 'rope', 'pair', 'pair-setup', 'sin'].includes(step.kind);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/transformers" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Transformers
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Positional Encoding</h1>
                    <p className="text-indigo-50 max-w-3xl">
                        Attention alone cannot tell &quot;Mia saw Ben&quot; from &quot;Ben saw Mia&quot;. Learned position vectors, sinusoids whose dot product depends only on distance, and RoPE&apos;s rotations, checked on a real tiny GPT.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/transformers/multi-head-attention" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Multi-Head Attention</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]]} mode={mode}
                            setMode={(m) => (m === 'explore' ? (model ? toExplore() : null) : setMode(m))} accent="indigo" />
                        {turnMode
                            ? <SourceChip kind="illustrative">Sinusoids and rotations computed exactly · hand-picked vectors</SourceChip>
                            : <SourceChip kind="toy">Trained for this site · tiny GPT · 195,136 numbers</SourceChip>}
                    </div>

                    {loaded.error ? (
                        <LoadError error={loaded.error} onRetry={loaded.retry} accent="indigo" what="The tiny GPT" />
                    ) : !model ? (
                        <LoadingCard text="Loading the tiny GPT (390 KB)…" />
                    ) : mode === 'explore' ? (
                        <Explore key={exploreKey} model={model} initialText={PRESETS[presetIndex].text} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Sentence:</span>
                                {PRESETS.map((pr, k) => (
                                    <button key={pr.label} onClick={() => { setPresetIndex(k); play.pause(); }} aria-pressed={presetIndex === k}
                                        className={`text-xs px-2.5 py-1 rounded-lg border ${presetIndex === k ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-400 hover:border-indigo-500'}`}>{pr.label}</button>
                                ))}
                            </div>
                            <TourPlayer acts={ACTS} steps={stepHistory} play={play} predict={predict} accent="indigo" minHeight="min-h-[320px]">
                                <VisualizationPanel step={step} />
                            </TourPlayer>
                            {predict.prompt && <PredictPrompt predict={predict} accent="indigo" />}
                            <ExplanationBox text={step?.explanation} predict={predict} accent="indigo" />
                            {tex && <FormulaPanel><div className="overflow-x-auto"><Tex block>{tex}</Tex></div></FormulaPanel>}
                        </>
                    )}

                    <InCode title="Sinusoids and RoPE in NumPy" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="Three ways to add order" icon={ListOrdered}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-slate-200">Learned</span>: one trained vector per position, added to the token (GPT-2, this tiny GPT). Stops at the table&apos;s length.</li>
                            <li><span className="text-slate-200">Sinusoidal</span>: sin and cos of p·ωᵢ, added to the token (the 2017 Transformer). Nothing to train.</li>
                            <li><span className="text-slate-200">Rotary (RoPE)</span>: rotate q and k by their positions (LLaMA and most recent models). Scores see only the offset.</li>
                        </ul>
                    </Card>

                    <Misconception claim="The model reads tokens left to right, so it knows the order anyway.">
                        <p>Every position is processed at once, and q · k compares content only. With position vectors and the causal mask removed, the tiny GPT gives a sentence and its reversal exactly the same prediction. Even with the mask on, removing positions takes its loss from {num(POS_OFF.loss[0], 3)} to {num(POS_OFF.loss[1], 3)} over {POS_OFF.stories} stories.</p>
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
