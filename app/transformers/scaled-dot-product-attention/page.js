"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Type, KeyRound, FlipHorizontal2, X as Times, Divide, EyeOff, Percent, Blend, Gauge, Cpu,
    CheckCircle, XCircle, Wrench, Unplug, Shuffle,
} from 'lucide-react';
import { loadTinyGpt } from '@/lib/ml/tinyGpt';
import { forwardWith, nextTokenScore } from '@/lib/ml/gptVariants';
import { matmul, transpose, toRows, softmax } from '@/lib/ml/tensor';
import { generateStories } from '@/lib/ml/stories';
import useLoaded from '@/lib/ml/useLoaded';
import { createRng } from '@/lib/random';
import Heatmap from '@/components/ml/Heatmap';
import TokenStrip from '@/components/ml/TokenStrip';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card, Segmented,
} from '@/components/ml/TourKit';

/* ── the computation ───────────────────────────────────────
   One head of the tiny GPT (lib/ml/tinyGpt.js, d = 64, 4 heads of 16),
   written as the four matrix steps of scaled dot-product attention:
   S = QKᵀ / √dₖ, mask the future, softmax each row, multiply by V. The
   tour follows layer 1, head 4 (the name-finding head from Self-Attention).
   The numbers come from lib/ml/gptVariants.js, which runs the same weights
   and can leave the ÷√d out. */

const LAYER = 0;
const HEAD = 3;
const HD = 16;

const PRESETS = [
    { label: 'Mia … She found', text: 'One day, Mia went to the park. She found a red ball' },
    { label: 'Ruby saw a cat', text: 'After lunch, Ruby saw a cat in the kitchen.' },
    { label: 'Ben and Zoe', text: 'One day, Ben and Zoe went to the farm. Ben was happy.' },
    { label: 'Lily lost her hat', text: 'Last week, Lily lost her blue hat. She was sad. She' },
];

/* Measured over 150 generated stories (seed 7, 8,701 next-token predictions),
   every head of every layer, rows from the third token on; checked by the
   test suite. */
const NO_SQRT = {
    stories: 150, tokens: 8701,
    loss: [0.328, 0.399], acc: [0.866, 0.849],
    top: [0.413, 0.773], sharp: [0.080, 0.454], rms: [3.05, 11.99],
};
const D_VALUES = [4, 16, 64, 256];

const ACTS = [
    { id: 1, label: 'Input', icon: Type },
    { id: 2, label: 'Q, K, V', icon: KeyRound },
    { id: 3, label: 'QKᵀ', icon: Times },
    { id: 4, label: '÷√d', icon: Divide },
    { id: 5, label: 'Mask', icon: EyeOff },
    { id: 6, label: 'Softmax', icon: Percent },
    { id: 7, label: '× V', icon: Blend },
    { id: 8, label: 'Why √d', icon: Gauge },
    { id: 9, label: 'In the Model', icon: Cpu },
];

const num = (v, d = 2) => {
    if (v === -Infinity) return '−∞';
    const r = Math.round(v * 10 ** d) / 10 ** d;
    return `${r < 0 ? '−' : ''}${Math.abs(r).toFixed(d)}`;
};
const tn = (v, d = 2) => num(v, d).replace('−', '-');
const pct = (v) => `${Math.round(v * 100)}%`;
const clean = (t) => (t.trim() === '' ? '␣' : t.trim());
const texTok = (t) => `\\text{${clean(t).replace(/[\\{}$&#%_^~]/g, c => `\\${c}`)}}`;
const tokensOf = (model, ids) => ids.map(id => ({ id, text: model.tokenizer.tokenText(id) ?? model.tokenizer.tokenLabel(id) }));
const withFuture = (rows) => rows.map((r, i) => r.map((v, j) => (j > i ? -Infinity : v)));

/** Random queries and keys of size d: how spread the scores are and what softmax does with them. */
function saturation(d, { trials = 300, keys = 8, seed = 5 } = {}) {
    const rng = createRng(seed * 1000 + d);
    let ss = 0, n = 0, topS = 0, topU = 0, gS = 0, gU = 0;
    const jac = (w) => Math.sqrt(w.reduce((a, wi, i) => a + w.reduce((b, wj, j) => b + ((i === j ? wi : 0) - wi * wj) ** 2, 0), 0));
    for (let t = 0; t < trials; t++) {
        const q = Array.from({ length: d }, () => rng.normal());
        const s = Array.from({ length: keys }, () => { let a = 0; for (let c = 0; c < d; c++) a += q[c] * rng.normal(); return a; });
        s.forEach(x => { ss += x * x; n++; });
        const wS = softmax(s.map(x => x / Math.sqrt(d))), wU = softmax(s);
        topS += Math.max(...wS); topU += Math.max(...wU); gS += jac(wS); gU += jac(wU);
    }
    return { d, sd: Math.sqrt(ss / n), topS: topS / trials, topU: topU / trials, gradS: gS / trials, gradU: gU / trials };
}

/* Shape prompts: before each product is shown, what shape comes out? Options
   are four of five shapes, with the answer's button position rotated by the
   question number and the sentence, so no fixed button and no fixed shape
   scores above a third. */
const SHAPES = (T) => [`[${T}, ${T}]`, `[${T}, ${HD}]`, `[${HD}, ${T}]`, `[${HD}, ${HD}]`, `[${T}, 64]`];
function shapeAsk(T, k, presetIndex, answer, question, because) {
    const pool = SHAPES(T);
    const others = pool.filter(s => s !== answer);
    const rot = (k + presetIndex) % others.length;
    const distract = [...others.slice(rot), ...others.slice(0, rot)].slice(0, 3);
    const pos = (k + presetIndex) % 4;
    const options = [...distract.slice(0, pos), answer, ...distract.slice(pos)];
    return { question, options, correct: pos, because };
}
function maskAsk(T, k, presetIndex) {
    const answer = (T * (T - 1)) / 2;
    const pos = (k + presetIndex) % 4;
    const distract = [(T * (T + 1)) / 2, T * T, T - 1];
    const vals = [...distract.slice(0, pos), answer, ...distract.slice(pos)];
    return {
        question: `The mask sets every score above the diagonal to −∞. With ${T} tokens, how many scores is that?`,
        options: vals.map(v => `${v} scores`),
        correct: pos,
        because: `Row i may look at tokens 1 to i, so it loses the ${T} − i after it: 0 + 1 + … + ${T - 1} = ${T} × ${T - 1} / 2 = ${answer}. The diagonal stays — a token may look at itself.`,
    };
}

function generateSteps(model, presetIndex) {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });
    const ids = model.tokenizer.encode(PRESETS[presetIndex].text);
    const T = ids.length;
    const tokens = tokensOf(model, ids);
    const run = forwardWith(model, ids);
    const blk = run.blocks[LAYER], h = blk.heads[HEAD];
    const raw = toRows(matmul(h.q, transpose(h.k)));
    const scaled = raw.map(r => r.map(v => v / Math.sqrt(HD)));
    const masked = toRows(h.scores);
    const weights = toRows(h.weights);
    const out = toRows(h.out);
    const last = T - 1;
    const lastRow = weights[last];
    const jTop = lastRow.indexOf(Math.max(...lastRow));
    const cell = { i: last, j: jTop };
    const base = { tokens, T, cell };
    let k = 0;

    s(1, 'Input', { ...base, kind: 'input', X: toRows(blk.ln1) },
        `${T} tokens, each a row of 64 numbers after the layer norm: X has shape [${T}, 64]. Scaled dot-product attention turns X into a new [${T}, 16] matrix for this head, in four matrix steps. Every number below is the tiny GPT's own, layer 1, head 4.`);
    steps.at(-1).ask = shapeAsk(T, k++, presetIndex, `[${T}, ${HD}]`,
        `Q = X W_Q, with X of shape [${T}, 64] and W_Q of shape [64, ${HD}]. What shape is Q?`,
        `A product [a, b] × [b, c] is [a, c]: the shared 64 disappears. One row of ${HD} numbers per token.`);
    s(2, 'Q, K, V', { ...base, kind: 'qkv', Q: toRows(h.q), K: toRows(h.k), V: toRows(h.v) },
        `Three learned [64, 16] matrices give every token a query, a key and a value: Q, K and V, each [${T}, ${HD}]. Row i of Q is what token i looks for; row j of K is what token j offers; row j of V is what it hands over.`);
    steps.at(-1).ask = shapeAsk(T, k++, presetIndex, `[${HD}, ${T}]`,
        `To score every query against every key, K is transposed first. K is [${T}, ${HD}]. What shape is Kᵀ?`,
        `Transposing swaps rows and columns: token j's key becomes column j of a [${HD}, ${T}] matrix.`);
    s(2, 'Q, K, V', { ...base, kind: 'kt', KT: toRows(transpose(h.k)) },
        `Kᵀ is [${HD}, ${T}]: each key is now a column. Multiplying Q by it takes the dot product of every query row with every key column — all ${T * T} scores in one matrix product.`);
    steps.at(-1).ask = shapeAsk(T, k++, presetIndex, `[${T}, ${T}]`,
        `Q is [${T}, ${HD}] and Kᵀ is [${HD}, ${T}]. What shape is QKᵀ?`,
        `[${T}, ${HD}] × [${HD}, ${T}] = [${T}, ${T}]: one score for every pair (query i, key j).`);
    const flat = raw.flat();
    const rms = Math.sqrt(flat.reduce((a, v) => a + v * v, 0) / flat.length);
    s(3, 'QKᵀ', { ...base, kind: 'raw', M: raw },
        `QKᵀ is [${T}, ${T}]: entry (i, j) is q_i · k_j. Here the scores run from ${num(Math.min(...flat), 1)} to ${num(Math.max(...flat), 1)}, with a root-mean-square size of ${num(rms, 1)}. A dot product of ${HD} pairs adds ${HD} terms, so it grows with the head size — the next step undoes that.`);
    steps.at(-1).ask = shapeAsk(T, k++, presetIndex, `[${T}, ${T}]`,
        `Every score is divided by √${HD} = 4. What shape is the result?`,
        'Dividing every entry by the same number changes the values, not the shape. Only matrix products change shape.');
    s(4, '÷√d', { ...base, kind: 'scaled', M: scaled },
        `Divided by √${HD} = 4: the root-mean-square size drops to ${num(rms / 4, 1)}. The order of the scores in every row is unchanged; only their spread shrinks. Softmax works on differences between scores, so spread is what decides how sharp the weights will be.`);
    steps.at(-1).ask = maskAsk(T, k++, presetIndex);
    s(5, 'Mask', { ...base, kind: 'masked', M: masked },
        `The causal mask: every score above the diagonal — ${(T * (T - 1)) / 2} of them — becomes −∞ (hatched). Token i may use tokens 1 to i and nothing after it, because a GPT is trained to predict the next token and must not read it.`);
    s(6, 'Softmax', { ...base, kind: 'weights', M: withFuture(weights) },
        `Softmax along each row: e^(score) over the row's total. e^(−∞) is exactly 0, so the future gets no weight at all; every row sums to 1. Row 1 has only itself to look at, so its weight is 1. The last row, "${clean(tokens[last].text)}", puts ${pct(lastRow[jTop])} on "${clean(tokens[jTop].text)}".`);
    steps.at(-1).ask = shapeAsk(T, k++, presetIndex, `[${T}, ${HD}]`,
        `The weights are [${T}, ${T}] and V is [${T}, ${HD}]. What shape is the output, weights × V?`,
        `[${T}, ${T}] × [${T}, ${HD}] = [${T}, ${HD}]: row i is token i's weighted average of the value rows.`);
    s(7, '× V', { ...base, kind: 'out', W: withFuture(weights), O: out },
        `Weights × V gives the head's output, [${T}, ${HD}] — back to one row per token. Row i is a blend of the value rows it chose. Four heads do this side by side; their outputs are joined into [${T}, 64] and mixed by W_O.`);

    const sat = D_VALUES.map(d => saturation(d));
    const s64 = sat.find(x => x.d === 64);
    s(8, 'Why √d', { ...base, kind: 'saturation', sat },
        `Why √d? Take random queries and keys whose entries have variance 1. Their dot product adds d terms, so its spread grows like √d: about ${sat.map(x => num(x.sd, 1)).join(', ')} for d = ${D_VALUES.join(', ')}. Unscaled, softmax over 8 keys saturates as d grows: at d = 64 the top weight averages ${pct(s64.topU)}, against ${pct(s64.topS)} with ÷√d. Saturated softmax also passes back almost no gradient (${num(s64.gradU, 3)} against ${num(s64.gradS, 3)}), which is what stalls training.`);

    const runU = forwardWith(model, ids, { scaled: false });
    const wU = toRows(runU.blocks[LAYER].heads[HEAD].weights);
    const sc = nextTokenScore(run.logits, ids), scU = nextTokenScore(runU.logits, ids);
    s(9, 'In the Model', { ...base, kind: 'model', W: withFuture(weights), WU: withFuture(wU), lossS: sc.loss, lossU: scU.loss },
        `The same head with the ÷√d left out (right): the rows snap toward one token. Over ${NO_SQRT.stories} generated stories, the share of rows whose top weight exceeds 0.9 rises from ${pct(NO_SQRT.sharp[0])} to ${pct(NO_SQRT.sharp[1])} and next-token loss from ${num(NO_SQRT.loss[0], 3)} to ${num(NO_SQRT.loss[1], 3)}. A trained model survives it; one trained without √d at larger d struggles to learn at all, because its softmax starts out saturated.`);
    return steps;
}

const predictFor = (step, next) => (next && step.ask ? step.ask : null);

function formulaFor(step) {
    if (!step?.cell || !step.tokens) return null;
    const { i, j } = step.cell;
    const ti = texTok(step.tokens[i].text), tj = texTok(step.tokens[j].text);
    if (step.kind === 'raw') return String.raw`(QK^\top)_{${ti},\,${tj}} = q_{${ti}} \cdot k_{${tj}} = ${tn(step.M[i][j])}`;
    if (step.kind === 'scaled') return String.raw`S_{${ti},\,${tj}} = \frac{q \cdot k}{\sqrt{${HD}}} = \frac{${tn(step.M[i][j] * 4)}}{4} = ${tn(step.M[i][j])}`;
    if (step.kind === 'masked') return String.raw`S_{ij} = -\infty \ \text{ for } j > i \qquad (${(step.T * (step.T - 1)) / 2}\ \text{entries})`;
    if (step.kind === 'weights') return String.raw`A_{${ti},\,${tj}} = \frac{e^{S_{${ti},${tj}}}}{\sum_{j' \le i} e^{S_{${ti},j'}}} = ${tn(step.M[i][j], 3)}`;
    if (step.kind === 'out') return String.raw`\text{out} = AV \;\in\; \mathbb{R}^{${step.T} \times ${HD}}`;
    if (step.kind === 'qkv') return String.raw`Q = XW_Q,\ K = XW_K,\ V = XW_V \;\in\; \mathbb{R}^{${step.T} \times ${HD}}`;
    if (step.kind === 'saturation' || step.kind === 'model') return String.raw`\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}} + M\right) V`;
    return null;
}

const quizQuestions = [
    {
        question: 'Why are the scores divided by √dₖ?',
        options: [
            'To make the computation faster',
            'The dot product of two d-dimensional vectors grows in spread like √d; dividing keeps scores near size 1 so softmax does not saturate',
            'To turn the scores into probabilities',
            'To stop tokens from attending to the future',
        ],
        correct: 1,
        explanation: 'q · k sums d products. With unit-variance entries its standard deviation is √d. Unscaled, larger heads give huge score gaps, softmax puts nearly all weight on one key, and almost no gradient flows back.',
    },
    {
        question: 'For T tokens and a head size of 16, what shape is QKᵀ?',
        options: ['[T, 16]', '[16, 16]', '[T, T]', '[16, T]'],
        correct: 2,
        explanation: 'Q is [T, 16] and Kᵀ is [16, T], so QKᵀ is [T, T]: one score for every query–key pair.',
    },
    {
        question: 'What are the attention weights above the diagonal after the causal mask and softmax?',
        options: ['Small but positive', 'Exactly 0', 'Negative', 'Equal to the diagonal'],
        correct: 1,
        explanation: 'The mask sets those scores to −∞, and e^(−∞) = 0, so after softmax those weights are exactly zero. The weight below and on the diagonal still sums to 1 in every row.',
    },
];

const codeExample = `import math, torch
import torch.nn.functional as F

torch.manual_seed(0)
T, d = 11, 16
Q, K, V = torch.randn(T, d), torch.randn(T, d), torch.randn(T, d)

S = Q @ K.T / math.sqrt(d)                                   # [T, T]
future = torch.triu(torch.ones(T, T, dtype=torch.bool), 1)   # above the diagonal
S = S.masked_fill(future, float('-inf'))
A = S.softmax(dim=-1)                                        # rows sum to 1
out = A @ V                                                  # [T, d]

ref = F.scaled_dot_product_attention(Q, K, V, is_causal=True)
print(tuple(S.shape), tuple(out.shape), A[0, 1].item(), torch.allclose(out, ref, atol=1e-6))
# (11, 11) (11, 16) 0.0 True`;

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

function Matrix({ title, shape, names, M, rowLabels, colLabels, scale = 'diverging', domain, cellSize = 24, showValues = false, digits = 1, selected, onSelect, ariaLabel }) {
    return (
        <div className="min-w-0">
            <Caption>{title} <ShapeTag shape={shape} names={names} /></Caption>
            <div className="overflow-x-auto max-w-full">
                <Heatmap data={M} rowLabels={rowLabels} colLabels={colLabels} scale={scale} domain={domain} cellSize={cellSize}
                    showValues={showValues} format={(v) => num(v, digits)} selected={selected} onSelect={onSelect} ariaLabel={ariaLabel ?? title} />
            </div>
        </div>
    );
}

function SaturationTable({ sat }) {
    return (
        <div className="w-full space-y-2">
            <div className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-2 text-xs text-slate-500">
                <span>d</span><span>spread of q · k</span><span>top weight, ÷√d</span><span>top weight, no ÷√d</span>
            </div>
            {sat.map(x => (
                <div key={x.d} className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-2 items-center text-xs font-mono">
                    <span className="text-slate-200">{x.d}</span>
                    <span className="text-slate-300">{num(x.sd, 1)} <span className="text-slate-600">(√d = {num(Math.sqrt(x.d), 1)})</span></span>
                    {[x.topS, x.topU].map((t, k) => (
                        <span key={k} className="flex items-center gap-1.5">
                            <span className="h-2 rounded bg-slate-800 flex-1 overflow-hidden"><span className={`block h-full ${k ? 'bg-amber-400' : 'bg-indigo-400'}`} style={{ width: `${100 * t}%` }} /></span>
                            <span className="w-9 text-right text-slate-300">{pct(t)}</span>
                        </span>
                    ))}
                </div>
            ))}
            <p className="text-xs text-slate-500 pt-1">300 random queries per row, 8 keys each, entries drawn from N(0, 1).</p>
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    const L = labels(step.tokens);
    const sel = step.cell;
    switch (step.kind) {
        case 'input':
            return (
                <div className="w-full space-y-3">
                    <TokenStrip tokens={step.tokens} size="sm" />
                    <Matrix title="X, after the layer norm" shape={[step.T, 64]} names={['T', 'd']} M={step.X} rowLabels={L} scale="diverging" domain={[-3, 3]} cellSize={9} />
                </div>
            );
        case 'qkv':
            return (
                <div className="w-full grid sm:grid-cols-3 gap-3">
                    {[['Q', step.Q], ['K', step.K], ['V', step.V]].map(([n, M]) => (
                        <Matrix key={n} title={n} shape={[step.T, HD]} names={['T', 'dₖ']} M={M} rowLabels={n === 'Q' ? L : undefined} cellSize={11} domain={[-3, 3]} />
                    ))}
                </div>
            );
        case 'kt':
            return <div className="w-full"><Matrix title="Kᵀ" shape={[HD, step.T]} names={['dₖ', 'T']} M={step.KT} colLabels={L} cellSize={18} domain={[-3, 3]} /></div>;
        case 'raw': case 'scaled': case 'masked':
            return (
                <div className="w-full">
                    <Matrix title={step.kind === 'raw' ? 'QKᵀ' : step.kind === 'scaled' ? 'QKᵀ / √16' : 'QKᵀ / √16 with the mask'} shape={[step.T, step.T]} names={['T', 'T']}
                        M={step.M} rowLabels={L} colLabels={L} cellSize={30} showValues digits={1} selected={sel}
                        domain={step.kind === 'raw' ? [-24, 24] : [-6, 6]} />
                </div>
            );
        case 'weights':
            return <div className="w-full"><Matrix title="Weights, softmax of each row" shape={[step.T, step.T]} names={['T', 'T']} M={step.M} rowLabels={L} colLabels={L} cellSize={30} showValues digits={2} scale="sequential" domain={[0, 1]} selected={sel} /></div>;
        case 'out':
            return (
                <div className="w-full grid md:grid-cols-2 gap-4">
                    <Matrix title="Weights" shape={[step.T, step.T]} names={['T', 'T']} M={step.W} rowLabels={L} scale="sequential" domain={[0, 1]} cellSize={16} />
                    <Matrix title="Output, weights × V" shape={[step.T, HD]} names={['T', 'dₖ']} M={step.O} rowLabels={L} cellSize={16} domain={[-2, 2]} />
                </div>
            );
        case 'saturation': return <SaturationTable sat={step.sat} />;
        case 'model':
            return (
                <div className="w-full grid md:grid-cols-2 gap-4">
                    <Matrix title={`With ÷√16 (loss on this sentence ${num(step.lossS, 3)})`} shape={[step.T, step.T]} names={['T', 'T']} M={step.W} rowLabels={L} scale="sequential" domain={[0, 1]} cellSize={16} />
                    <Matrix title={`Without (loss ${num(step.lossU, 3)})`} shape={[step.T, step.T]} names={['T', 'T']} M={step.WU} rowLabels={L} scale="sequential" domain={[0, 1]} cellSize={16} />
                </div>
            );
        default: return null;
    }
}

/* ── explore ─────────────────────────────────────────────── */
function Explore({ model, initialText }) {
    const [text, setText] = useState(initialText);
    const [seed, setSeed] = useState(1);
    const [layer, setLayer] = useState(LAYER);
    const [head, setHead] = useState(HEAD);
    const [unscaled, setUnscaled] = useState(false);
    const [sel, setSel] = useState(null);
    const [d, setD] = useState(64);
    const ids = useMemo(() => model.tokenizer.encode(text).slice(0, 40), [model, text]);
    const tokens = tokensOf(model, ids);
    const T = ids.length;
    const run = useMemo(() => forwardWith(model, ids, { scaled: !unscaled }), [model, ids, unscaled]);
    const base = useMemo(() => (unscaled ? forwardWith(model, ids) : run), [model, ids, unscaled, run]);
    const h = run.blocks[layer].heads[head];
    const W = withFuture(toRows(h.weights));
    const raw = toRows(matmul(h.q, transpose(h.k)));
    const cur = sel && sel.i < T ? { i: sel.i, j: Math.min(sel.j, sel.i) } : { i: T - 1, j: 0 };
    const sc = nextTokenScore(run.logits, ids), sc0 = nextTokenScore(base.logits, ids);
    const top = (rows) => rows.slice(1).reduce((a, r) => a + Math.max(...r.filter(Number.isFinite)), 0) / Math.max(1, rows.length - 1);
    const sat = useMemo(() => saturation(d), [d]);
    const L = labels(tokens);
    const rowLen = cur.i + 1;
    const sRow = raw[cur.i].slice(0, rowLen).map(v => (unscaled ? v : v / 4));
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Sentence:</span>
                    {PRESETS.map(p => (
                        <button key={p.label} onClick={() => { setText(p.text); setSel(null); }} aria-pressed={text === p.text}
                            className={`text-xs px-2.5 py-1 rounded-lg border ${text === p.text ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-400 hover:border-indigo-500'}`}>{p.label}</button>
                    ))}
                    <button onClick={() => { setText(generateStories(1, 100 + seed)[0]); setSeed(x => x + 1); setSel(null); }}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500"><Shuffle className="h-3.5 w-3.5" />Random story</button>
                </div>
                <TokenStrip tokens={tokens} size="sm" />
                <div className="flex flex-wrap items-center gap-3">
                    <Segmented options={[0, 1, 2].map(l => [l, `Layer ${l + 1}`])} value={layer} onChange={setLayer} accent="indigo" ariaLabel="Layer" />
                    <Segmented options={[0, 1, 2, 3].map(x => [x, `Head ${x + 1}`])} value={head} onChange={setHead} accent="indigo" ariaLabel="Head" />
                </div>
                <Matrix title={`Weights, layer ${layer + 1} head ${head + 1}${unscaled ? ' (no ÷√d)' : ''} — click a cell`} shape={[T, T]} names={['T', 'T']} M={W}
                    rowLabels={L} colLabels={L} scale="sequential" domain={[0, 1]} cellSize={26} showValues={T <= 16} digits={2} selected={cur} onSelect={(i, j) => setSel({ i, j })} />
                <div className="overflow-x-auto">
                    <Tex block>{String.raw`\frac{q_{${texTok(tokens[cur.i].text)}} \cdot k_{${texTok(tokens[cur.j].text)}}}{${unscaled ? '1' : '\\sqrt{16}'}} = \frac{${tn(raw[cur.i][cur.j])}}{${unscaled ? 1 : 4}} = ${tn(sRow[cur.j])} \;\Rightarrow\; w = \frac{e^{${tn(sRow[cur.j])}}}{\sum_{j \le i} e^{s_{ij}}} = ${tn(W[cur.i][cur.j], 3)}`}</Tex>
                </div>
                <p className="text-xs text-slate-400">Mean top weight in this head: {pct(top(W))}. Next-token loss on this text: {num(sc.loss, 3)}{unscaled ? ` (with ÷√d: ${num(sc0.loss, 3)})` : ''}.</p>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Unplug className="h-4 w-4 text-amber-400" />Break it: leave out the ÷√d</h3>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setUnscaled(v => !v)} aria-pressed={unscaled}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${unscaled ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-amber-500'}`}>
                        <Unplug className="h-3.5 w-3.5" />{unscaled ? 'Scores not scaled' : 'Drop the ÷√d'}
                    </button>
                    {unscaled && <button onClick={() => setUnscaled(false)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                {unscaled && (
                    <BreakNote>
                        Every score in every head is four times larger, so every row of weights sharpens. Over {NO_SQRT.stories} stories, rows with a top weight above 0.9 go from {pct(NO_SQRT.sharp[0])} to {pct(NO_SQRT.sharp[1])}, mean top weight from {pct(NO_SQRT.top[0])} to {pct(NO_SQRT.top[1])}, and next-token accuracy from {(100 * NO_SQRT.acc[0]).toFixed(1)}% to {(100 * NO_SQRT.acc[1]).toFixed(1)}%.
                    </BreakNote>
                )}
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">Random vectors: how d sets the spread</h3>
                <ParamSlider label="Head size d" value={d} onChange={setD} min={2} max={512} step={2} accent="indigo" />
                <SaturationTable sat={[sat]} />
                <p className="text-xs text-slate-400">Gradient that softmax passes back (size of its Jacobian): {num(sat.gradS, 3)} with ÷√d, {num(sat.gradU, 3)} without.</p>
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function ScaledDotProductPage() {
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

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/transformers" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Transformers
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Scaled Dot-Product Attention</h1>
                    <p className="text-indigo-50 max-w-3xl">
                        softmax(QKᵀ / √dₖ) V, one matrix step at a time, with the shape at every step and the tiny GPT&apos;s real numbers in every cell. Then the √dₖ: what it is for, and what happens without it.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/transformers/self-attention" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Self-Attention</Link>
                        <Link href="/linear-algebra/matrix-multiplication" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Matrix Multiplication</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Any head, any sentence', MousePointer2]]} mode={mode}
                            setMode={(m) => (m === 'explore' ? (model ? toExplore() : null) : setMode(m))} accent="indigo" />
                        <SourceChip kind="toy">Trained for this site · tiny GPT · 195,136 numbers</SourceChip>
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
                            <TourPlayer acts={ACTS} steps={stepHistory} play={play} predict={predict} accent="indigo" minHeight="min-h-[360px]">
                                <VisualizationPanel step={step} />
                            </TourPlayer>
                            {predict.prompt && <PredictPrompt predict={predict} accent="indigo" />}
                            <ExplanationBox text={step?.explanation} predict={predict} accent="indigo" />
                            {tex && <FormulaPanel><div className="overflow-x-auto"><Tex block>{tex}</Tex></div></FormulaPanel>}
                        </>
                    )}

                    <InCode title="The same four steps in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="Shapes, for T tokens" icon={FlipHorizontal2}>
                        <ul className="space-y-1.5 text-sm font-mono text-slate-400">
                            <li><span className="text-slate-200">Q, K, V</span> [T, dₖ]</li>
                            <li><span className="text-slate-200">QKᵀ</span> [T, dₖ] × [dₖ, T] = [T, T]</li>
                            <li><span className="text-slate-200">÷√dₖ, mask, softmax</span> [T, T]</li>
                            <li><span className="text-slate-200">× V</span> [T, T] × [T, dₖ] = [T, dₖ]</li>
                        </ul>
                    </Card>

                    <Misconception claim="The √d is a minor numerical detail.">
                        <p>Without it, random 64-dimensional queries and keys give scores spread about 8 wide, and softmax hands the top key most of the weight while passing back a fraction of the gradient — see the Why √d step. In the trained tiny GPT, leaving it out moves the share of near one-hot rows from {pct(NO_SQRT.sharp[0])} to {pct(NO_SQRT.sharp[1])} and the loss from {num(NO_SQRT.loss[0], 3)} to {num(NO_SQRT.loss[1], 3)}, measured over {NO_SQRT.tokens.toLocaleString('en-US')} predictions.</p>
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
