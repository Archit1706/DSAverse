"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Network, ArrowLeftRight, ArrowRight, GitMerge, BookOpen, Unlock, Languages, Table2,
    CheckCircle, XCircle, Wrench, Unplug, Shuffle,
} from 'lucide-react';
import { encode, loadTranslateModels } from '@/lib/ml/seq2seq';
import { runSequence, softmax, oneHot } from '@/lib/ml/recurrent';
import { SRC_WORDS, TGT_WORDS, BOS, EOS, translateExample } from '@/lib/ml/sequenceTasks';
import useLoaded from '@/lib/ml/useLoaded';
import { createRng } from '@/lib/random';
import Heatmap from '@/components/ml/Heatmap';
import ProbBars from '@/components/ml/ProbBars';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card, Segmented,
} from '@/components/ml/TourKit';

/* ── three families ────────────────────────────────────────
   Encoder-only (BERT): every token sees every token. Decoder-only (GPT):
   every token sees only the past. Encoder–decoder (the 2017 Transformer,
   T5): an encoder reads the source both ways, a decoder writes the output
   causally, and cross-attention lets each decoder position query the
   encoder. The masks below are exact by definition; the cross-attention
   numbers come from the English → French translator trained for Deep
   Learning Architectures, an RNN encoder–decoder whose attention step is
   cross-attention in its simplest form: the decoder's state is the query,
   the encoder's states are both keys and values, scores are plain dot
   products (no learned projections, no ÷√d). */

const PRESETS = [
    { text: 'a big bird sees the big fox', tt: 4 },
    { text: 'the old dog chases the cat', tt: 3 },
    { text: 'the fox likes a small dog', tt: 5 },
    { text: 'a small fox chases the old fox', tt: 4 },
];

/* Measured over 300 one-clause test sentences (createRng(99), maxAdj 1,
   1,789 decoder steps that translate a source word) and checked by the
   test suite: exact sentences and words right with the model's own
   attention and with attention locked onto the same position; and how often
   the most-weighted source word is the one being translated, or simply the
   one at the same position. */
const CROSS = { sentences: 300, steps: 1789, exact: [1, 0.28], words: [1, 0.599], topAligned: 0.98, topSame: 0.657 };

const ACTS = [
    { id: 1, label: 'Three Families', icon: Network },
    { id: 2, label: 'Encoder: Both Ways', icon: ArrowLeftRight },
    { id: 3, label: 'Decoder: The Past', icon: ArrowRight },
    { id: 4, label: 'Cross-Attention', icon: GitMerge },
    { id: 5, label: 'Read the Encoder', icon: BookOpen },
    { id: 6, label: 'No Mask Across', icon: Unlock },
    { id: 7, label: 'A Whole Translation', icon: Languages },
    { id: 8, label: 'Which When', icon: Table2 },
];

const num = (v, d = 2) => {
    const r = Math.round(v * 10 ** d) / 10 ** d;
    return `${r < 0 ? '−' : ''}${Math.abs(r).toFixed(d)}`;
};
const pct = (v) => `${Math.round(v * 100)}%`;
const q = (w) => `"${w}"`;
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const srcIds = (text) => text.split(' ').map(w => SRC_WORDS.indexOf(w));
const allowed = (n, m, causal) => Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => (causal && j > i ? -Infinity : 1)));

/**
 * Greedy translation with the model's cross-attention, step by step. With
 * `locked`, each step's weights are forced onto the source word at the same
 * position (the break). Returns every step's weights, context and word.
 */
function decode(model, src, { locked = false, maxLen = 40 } = {}) {
    const { E } = encode(model, src);
    const { H, Vt } = model;
    let h = E[E.length - 1], prev = BOS;
    const out = [], steps = [];
    for (let t = 0; t < maxLen; t++) {
        const r = runSequence(model.dec, [oneHot(prev, Vt)], { h });
        h = r.h;
        const scores = E.map(e => dot(h, e));
        const alpha = locked ? E.map((_, j) => (j === Math.min(t, E.length - 1) ? 1 : 0)) : softmax(scores);
        const ctx = new Array(H).fill(0);
        E.forEach((e, j) => { for (let k = 0; k < H; k++) ctx[k] += alpha[j] * e[k]; });
        const logits = Float64Array.from(model.bo);
        for (let v = 0; v < Vt; v++) {
            let s = 0;
            for (let k = 0; k < H; k++) s += model.Wo[v * 2 * H + k] * h[k] + model.Wo[v * 2 * H + H + k] * ctx[k];
            logits[v] += s;
        }
        const probs = softmax(logits);
        let best = 0;
        for (let v = 1; v < probs.length; v++) if (probs[v] > probs[best]) best = v;
        steps.push({ alpha: Array.from(alpha), ctx, word: best, input: prev });
        if (best === EOS) break;
        out.push(best);
        prev = best;
    }
    return { out, steps, E: E.map(e => Array.from(e)) };
}

/**
 * Which source position each output word translates. Target word i is the
 * translation of source word i, and French keeps the order of repeated
 * words, so the k-th copy of a word in the output is the k-th in the source.
 */
function alignOf(src, out) {
    const seen = {};
    return out.map((w, t) => {
        const k = seen[w] ?? 0;
        seen[w] = k + 1;
        const at = src.map((x, j) => (x === w ? j : -1)).filter(j => j >= 0);
        return [t, at[k] ?? -1];
    });
}

/* Shape prompts, one per sublayer. The four answers are different shapes
   ([Ts, Ts], [Tt, Tt], [Tt, Ts], [Tt, 32]); the transposed [Ts, Tt] is
   offered every time and never right. Options rotate so the answer's
   button follows a Latin square. */
const ORDERS = [[2, 0, 3, 1], [1, 3, 0, 2], [3, 1, 2, 0], [0, 2, 1, 3]];
function shapeAsk(Ts, Tt, H, presetIndex, k) {
    const A = `[${Ts}, ${Ts}]`, B = `[${Tt}, ${Tt}]`, C = `[${Tt}, ${Ts}]`, D = `[${Ts}, ${Tt}]`, E = `[${Tt}, ${H}]`;
    const lists = [[A, C, B, D], [B, D, A, C], [C, D, A, B], [E, C, D, A]];
    const questions = [
        `The encoder's self-attention compares every source word with every source word. What shape are its scores?`,
        `The decoder's self-attention compares each of its ${Tt} input tokens with its own tokens. What shape are its scores?`,
        `Cross-attention: ${Tt} decoder queries against ${Ts} encoder keys. What shape are the scores?`,
        `Each decoder position reads a weighted average of the encoder's ${H}-number states. What shape is the result?`,
    ];
    const because = [
        `Ts queries against Ts keys: [Ts, Ts] = ${A}.`,
        `Tt queries against Tt keys: [Tt, Tt] = ${B}, with the future masked.`,
        `One row per decoder query, one column per encoder key: [Tt, Ts] = ${C}. Rows come from the side asking.`,
        `One row per decoder position, ${H} numbers each, since the values are encoder states: [Tt, ${H}] = ${E}.`,
    ];
    const L = lists[k], pos = ORDERS[presetIndex][k];
    return { question: questions[k], options: [0, 1, 2, 3].map(p => L[(p - pos + 4) % 4]), correct: pos, because: because[k] };
}

function generateSteps(model, presetIndex) {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });
    const { text, tt: Tt } = PRESETS[presetIndex];
    const src = srcIds(text);
    const Ts = src.length, H = model.H;
    const run = decode(model, src);
    const srcW = src.map(i => SRC_WORDS[i]);
    const decIn = ['<s>', ...run.out.map(w => TGT_WORDS[w])];
    const outW = run.steps.map(st => TGT_WORDS[st.word]);
    const align = alignOf(src, run.out);
    const base = { srcW, Ts, Tt, H, decIn: decIn.slice(0, Tt) };

    s(1, 'Three Families', { ...base, kind: 'families' },
        `Transformers come in three shapes, set by who may attend to whom. Encoder-only models like BERT let every token see the whole input. Decoder-only models like GPT let each token see only what came before. Encoder–decoder models like the original Transformer and T5 have both, joined by cross-attention. Here the source is ${q(text)}, ${Ts} words.`);

    s(2, 'Encoder: Both Ways', { ...base, kind: 'setup', ask: shapeAsk(Ts, Tt, H, presetIndex, 0) }, 'Start with the encoder, which reads the source.');
    s(2, 'Encoder: Both Ways', { ...base, kind: 'mask', mask: allowed(Ts, Ts, false), rows: srcW, cols: srcW, title: 'encoder self-attention: who may see whom', shape: [Ts, Ts] },
        `No mask: ${q(srcW[1])} can look at ${q(srcW[Ts - 1])}, which comes after it. The source is known in full before anything is written, so there is nothing to hide. That is what makes encoders good at understanding (BERT is trained to fill in masked words using both sides) and unable to write text one token at a time.`);

    s(3, 'Decoder: The Past', { ...base, kind: 'setup', ask: shapeAsk(Ts, Tt, H, presetIndex, 1) }, `The decoder writes French one word at a time. So far its input is ${decIn.slice(0, Tt).map(q).join(', ')}.`);
    s(3, 'Decoder: The Past', { ...base, kind: 'mask', mask: allowed(Tt, Tt, true), rows: decIn.slice(0, Tt), cols: decIn.slice(0, Tt), title: 'decoder self-attention: the causal mask', shape: [Tt, Tt] },
        `The decoder's own attention is causal, exactly as in GPT: position ${Tt - 1} sees positions 0 to ${Tt - 1}, never later ones, because later words do not exist yet when it is generating. A decoder-only model is this half on its own, with the source (if any) written into the same sequence.`);

    const A = run.steps.slice(0, Tt).map(st => st.alpha);
    s(4, 'Cross-Attention', { ...base, kind: 'setup', ask: shapeAsk(Ts, Tt, H, presetIndex, 2) }, 'Cross-attention connects the two halves: queries from the decoder, keys and values from the encoder.');
    const t0 = Tt - 1, top0 = A[t0].indexOf(Math.max(...A[t0]));
    s(4, 'Cross-Attention', { ...base, kind: 'cross', A, rows: outW.slice(0, Tt).map(w => `→ ${w}`), shape: [Tt, Ts] },
        `Each decoder position asks a question of the source. These are the trained translator's real weights, one row per decoder position, one column per source word: [${Tt}, ${Ts}], not square. When writing ${q(outW[t0])} it puts ${pct(A[t0][top0])} on ${q(srcW[top0])}. This model's version is the simplest one: query = the decoder's state, keys = values = the encoder's states, score = their dot product.`);

    s(5, 'Read the Encoder', { ...base, kind: 'setup', ask: shapeAsk(Ts, Tt, H, presetIndex, 3) }, `The weights then blend the encoder's states, ${H} numbers per source word.`);
    s(5, 'Read the Encoder', { ...base, kind: 'ctx', E: run.E, C: run.steps.slice(0, Tt).map(st => st.ctx), rows: outW.slice(0, Tt).map(w => `→ ${w}`), shape: [Tt, H] },
        `Each decoder position gets its own mix of the encoder's states: [${Tt}, ${Ts}] weights times [${Ts}, ${H}] states gives [${Tt}, ${H}]. The values come from the encoder, so the output has the encoder's width and the decoder's length. In a Transformer this is added to the decoder's residual stream, between its self-attention and its FFN.`);

    const ta = align.find(([t, sIdx]) => sIdx > t && t < run.steps.length);
    const [tr, sr] = ta ?? [0, 0];
    s(6, 'No Mask Across', { ...base, kind: 'row', alpha: run.steps[tr].alpha, writing: outW[tr], t: tr, s: sr },
        `Cross-attention has no causal mask. Writing word ${tr + 1}, ${q(outW[tr])}, the decoder looks at source word ${sr + 1}, ${q(srcW[sr])}, which is further along the English sentence than its own position: ${pct(run.steps[tr].alpha[sr])} of the weight. French puts the adjective after the noun, so the decoder has to read ahead. Only the decoder's own future is hidden, because it has not been written.`);

    const full = run.steps.map(st => st.alpha);
    s(7, 'A Whole Translation', { ...base, kind: 'cross', A: full, rows: outW.map(w => `→ ${w}`), shape: [full.length, Ts], wholeOut: outW },
        `The whole sentence: ${q(outW.filter(w => w !== '</s>').join(' '))}. The bright cells follow the meaning, not the position: over ${CROSS.sentences} test sentences the most-weighted source word is the one being translated in ${pct(CROSS.topAligned)} of steps, but the word at the same position in only ${pct(CROSS.topSame)}. Lock the weights onto the same position instead and only ${pct(CROSS.exact[1])} of sentences come out right.`);

    s(8, 'Which When', { ...base, kind: 'table' },
        'Encoders for reading, decoders for writing, both for turning one sequence into another. Most large language models today are decoder-only: given enough data, one causal stack can treat the source as the beginning of its own text.');
    return steps;
}

const predictFor = (step, next) => (next && step.ask ? step.ask : null);

function formulaFor(step) {
    if (!step) return null;
    if (step.kind === 'mask' && step.act === 2) return String.raw`\text{softmax}\!\left(\frac{Q_{\text{enc}} K_{\text{enc}}^\top}{\sqrt{d}}\right) V_{\text{enc}}, \quad \text{no mask}`;
    if (step.kind === 'mask' && step.act === 3) return String.raw`\text{softmax}\!\left(\frac{Q_{\text{dec}} K_{\text{dec}}^\top}{\sqrt{d}} + M\right) V_{\text{dec}}, \quad M_{ij} = -\infty \text{ for } j > i`;
    if (step.kind === 'cross') return String.raw`\text{Cross} = \text{softmax}\!\left(\frac{Q_{\text{dec}} K_{\text{enc}}^\top}{\sqrt{d}}\right) V_{\text{enc}} \in \mathbb{R}^{T_t \times d}; \quad \text{here } \alpha_{t} = \text{softmax}(h_t \cdot h_j)`;
    if (step.kind === 'ctx') return String.raw`c_t = \sum_{j=1}^{${step.Ts}} \alpha_{t,j}\, h_j, \qquad [${step.Tt}, ${step.Ts}] \times [${step.Ts}, ${step.H}] = [${step.Tt}, ${step.H}]`;
    return null;
}

const quizQuestions = [
    {
        question: 'In cross-attention, where do the queries, keys and values come from?',
        options: [
            'All three from the encoder',
            'Queries from the decoder; keys and values from the encoder',
            'Queries from the encoder; keys and values from the decoder',
            'All three from the decoder',
        ],
        correct: 1,
        explanation: 'The side that is writing asks (queries); the source it reads supplies keys to match and values to blend. So the output has one row per decoder position.',
    },
    {
        question: 'Which family is BERT, and what does its attention see?',
        options: [
            'Decoder-only; each token sees only earlier tokens',
            'Encoder-decoder; cross-attention only',
            'Encoder-only; every token sees every token, both directions',
            'Decoder-only; every token sees every token',
        ],
        correct: 2,
        explanation: 'BERT is an encoder with no mask, trained to fill in masked words from both sides. That makes it good at understanding text and unsuited to generating it left to right.',
    },
    {
        question: 'Why does cross-attention not need a causal mask?',
        options: [
            'Because softmax already ignores future tokens',
            'Because the whole source is known before decoding starts, so no source word is "the future"',
            'Because the decoder has no future tokens',
            'It does need one; T5 masks it',
        ],
        correct: 1,
        explanation: 'Only the decoder\'s own future is unknown. The source sentence is complete, and reading ahead in it is often necessary: French puts most adjectives after the noun.',
    },
];

const codeExample = `import torch
from torch import nn

d, Ts, Tt = 32, 7, 4
cross = nn.MultiheadAttention(d, num_heads=1, batch_first=True)
enc = torch.randn(1, Ts, d)        # encoder output: keys and values
dec = torch.randn(1, Tt, d)        # decoder states: queries
out, w = cross(query=dec, key=enc, value=enc)   # no mask: the whole source is known
print(out.shape, w.shape)
print(torch.allclose(w.sum(-1), torch.ones(1, Tt)))
# torch.Size([1, 4, 32]) torch.Size([1, 4, 7])
# True`;

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

function Chips({ words, tone = 'slate' }) {
    const cls = tone === 'indigo' ? 'border-indigo-500/50 text-indigo-100' : 'border-slate-700 text-slate-200';
    return (
        <div className="flex flex-wrap gap-1">
            {words.map((w, i) => <span key={i} className={`px-2 py-0.5 rounded border text-xs font-mono ${cls}`}>{w}</span>)}
        </div>
    );
}

function MaskBox({ title, mask, rows, cols, shape, cell = 18 }) {
    return (
        <div className="min-w-0">
            <Caption>{title} {shape && <ShapeTag shape={shape} />}</Caption>
            <div className="overflow-x-auto"><Heatmap data={mask} rowLabels={rows} colLabels={cols} scale="sequential" domain={[0, 1]} cellSize={cell} ariaLabel={title} /></div>
        </div>
    );
}

const FAMILIES = [
    ['Encoder-only', 'BERT, RoBERTa, the MiniLM embedder on the RAG pages', 'Every token sees every token', 'Classify, fill in a blank, embed a sentence'],
    ['Decoder-only', 'GPT, LLaMA, the tiny GPT on these pages', 'Each token sees only earlier tokens', 'Generate text, one token at a time'],
    ['Encoder–decoder', 'The 2017 Transformer, T5, BART, Whisper', 'Encoder both ways, decoder causal, joined by cross-attention', 'Translate, summarise, speech to text'],
];

function VisualizationPanel({ step }) {
    if (!step) return null;
    const head = (
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div><Caption>source (encoder input) · Ts = {step.Ts}</Caption><Chips words={step.srcW} /></div>
            <div><Caption>decoder input so far · Tt = {step.Tt}</Caption><Chips words={step.decIn} tone="indigo" /></div>
        </div>
    );
    switch (step.kind) {
        case 'families': {
            const tgt = step.decIn;
            return (
                <div className="w-full">
                    {head}
                    <div className="grid md:grid-cols-3 gap-4">
                        <MaskBox title="Encoder-only" mask={allowed(step.Ts, step.Ts, false)} cell={12} />
                        <MaskBox title="Decoder-only" mask={allowed(step.Ts, step.Ts, true)} cell={12} />
                        <div className="space-y-2">
                            <MaskBox title="Encoder–decoder: cross" mask={allowed(tgt.length, step.Ts, false)} cell={12} />
                            <MaskBox title="… and decoder self" mask={allowed(tgt.length, tgt.length, true)} cell={12} />
                        </div>
                    </div>
                </div>
            );
        }
        case 'setup': return <div className="w-full">{head}<p className="text-sm text-slate-400">The answer appears on the next step.</p></div>;
        case 'mask': return <div className="w-full">{head}<MaskBox title={step.title} mask={step.mask} rows={step.rows} cols={step.cols} shape={step.shape} /></div>;
        case 'cross':
            return (
                <div className="w-full">
                    {head}
                    <div className="overflow-x-auto"><MaskBox title="cross-attention weights (trained translator)" mask={step.A} rows={step.rows} cols={step.srcW} shape={step.shape} cell={30} /></div>
                </div>
            );
        case 'ctx': {
            const dm = Math.max(...step.E.flat().map(Math.abs));
            return (
                <div className="w-full space-y-3">
                    {head}
                    <div className="min-w-0">
                        <Caption>encoder states, the values <ShapeTag shape={[step.Ts, step.H]} /></Caption>
                        <div className="overflow-x-auto"><Heatmap data={step.E} rowLabels={step.srcW} scale="diverging" domain={[-dm, dm]} cellSize={9} ariaLabel="Encoder states" /></div>
                    </div>
                    <div className="min-w-0">
                        <Caption>what each decoder position reads <ShapeTag shape={step.shape} /></Caption>
                        <div className="overflow-x-auto"><Heatmap data={step.C} rowLabels={step.rows} scale="diverging" domain={[-dm, dm]} cellSize={9} ariaLabel="Context vectors" /></div>
                    </div>
                </div>
            );
        }
        case 'row':
            return (
                <div className="w-full space-y-3">
                    {head}
                    <Caption>writing word {step.t + 1}, &quot;{step.writing}&quot;: weight on each source word</Caption>
                    <div className="max-w-md"><ProbBars items={step.srcW.map((w, j) => ({ label: `${j + 1}. ${w}`, p: step.alpha[j] }))} chosen={step.s} accent="#818cf8" ariaLabel="Weights on source words" /></div>
                </div>
            );
        case 'table':
            return (
                <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-xs text-slate-500"><th className="py-1 pr-3 font-normal">family</th><th className="pr-3 font-normal">examples</th><th className="pr-3 font-normal">attention</th><th className="font-normal">good at</th></tr></thead>
                        <tbody>
                            {FAMILIES.map(r => (
                                <tr key={r[0]} className="border-t border-slate-800 align-top">
                                    <td className="py-2 pr-3 text-indigo-200 font-semibold whitespace-nowrap">{r[0]}</td>
                                    <td className="pr-3 text-slate-400">{r[1]}</td><td className="pr-3 text-slate-300">{r[2]}</td><td className="text-slate-300">{r[3]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        default: return null;
    }
}

/* ── explore ─────────────────────────────────────────────── */
function Explore({ model, initialText }) {
    const [src, setSrc] = useState(() => srcIds(initialText));
    const [seed, setSeed] = useState(1);
    const [locked, setLocked] = useState(false);
    const [row, setRow] = useState(0);
    const good = useMemo(() => decode(model, src), [model, src]);
    const run = useMemo(() => (locked ? decode(model, src, { locked: true }) : good), [model, src, locked, good]);
    const srcW = src.map(i => SRC_WORDS[i]);
    const outW = run.steps.map(st => TGT_WORDS[st.word]);
    const want = [...good.out, EOS];
    const r = Math.min(row, run.steps.length - 1);
    const right = run.steps.filter((st, t) => st.word === want[t]).length;
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Source:</span>
                    {PRESETS.map(pr => (
                        <button key={pr.text} onClick={() => { setSrc(srcIds(pr.text)); setRow(0); }} aria-pressed={srcW.join(' ') === pr.text}
                            className={`text-xs px-2.5 py-1 rounded-lg border ${srcW.join(' ') === pr.text ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-400 hover:border-indigo-500'}`}>{pr.text}</button>
                    ))}
                    <button onClick={() => { const ex = translateExample(createRng(700 + seed), { clauses: 1 + (seed % 2), maxAdj: 1 }); setSrc(ex.src); setSeed(x => x + 1); setRow(0); }}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500"><Shuffle className="h-3.5 w-3.5" />Random sentence</button>
                </div>
                <div>
                    <Caption>French out (click a word to see its weights)</Caption>
                    <div className="flex flex-wrap gap-1">
                        {outW.map((w, t) => (
                            <button key={t} onClick={() => setRow(t)} aria-pressed={t === r}
                                className={`px-2 py-0.5 rounded border text-xs font-mono ${t === r ? 'border-indigo-400 bg-indigo-500/20 text-white' : run.steps[t].word === want[t] ? 'border-slate-700 text-slate-200' : 'border-red-500/60 text-red-300'}`}>{w}</button>
                        ))}
                    </div>
                </div>
                <div className="grid md:grid-cols-[auto_1fr] gap-4 items-start">
                    <div className="overflow-x-auto min-w-0">
                        <Heatmap data={run.steps.map(st => st.alpha)} rowLabels={outW.map(w => `→ ${w}`)} colLabels={srcW} scale="sequential" domain={[0, 1]} cellSize={Math.max(16, Math.min(28, Math.floor(360 / srcW.length)))}
                            selected={{ i: r, j: run.steps[r].alpha.indexOf(Math.max(...run.steps[r].alpha)) }} onSelect={(i) => setRow(i)} ariaLabel="Cross-attention weights" />
                    </div>
                    <div className="min-w-0">
                        <Caption>writing &quot;{outW[r]}&quot;</Caption>
                        <ProbBars items={srcW.map((w, j) => ({ label: w, p: run.steps[r].alpha[j] }))} accent="#818cf8" ariaLabel="Weights for this word" />
                    </div>
                </div>
            </div>
            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Unplug className="h-4 w-4 text-amber-400" />Break it: read the source in step</h3>
                <div className="flex flex-wrap gap-2">
                    <Segmented options={[[false, 'Learned weights'], [true, 'Locked to the same position']]} value={locked} onChange={setLocked} accent="indigo" ariaLabel="Cross-attention" />
                    {locked && <button onClick={() => setLocked(false)} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                <p className="text-xs font-mono text-slate-400">{right} of {want.length} output words match the model&apos;s own translation</p>
                {locked && (
                    <BreakNote>
                        Word t of the output may now only read word t of the source. Wherever French reorders, the decoder is reading the wrong word. Over {CROSS.sentences} test sentences, {pct(CROSS.words[1])} of words and {pct(CROSS.exact[1])} of sentences come out right, against {pct(CROSS.exact[0])} with the learned weights.
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function EncoderDecoderPage() {
    const loaded = useLoaded(loadTranslateModels);
    const model = loaded.data?.nets?.attention ?? null;
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
    const real = step && ['cross', 'ctx', 'row'].includes(step.kind);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/transformers" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Transformers
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Encoder–Decoder and Cross-Attention</h1>
                    <p className="text-indigo-50 max-w-3xl">
                        BERT reads both ways, GPT writes forwards, and T5 does both, joined by cross-attention: decoder queries against encoder keys. Real cross-attention weights from a trained English-to-French translator, and what happens when it may only read in step.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/transformers/the-transformer-block" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">The Transformer Block</Link>
                        <Link href="/transformers/why-attention" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Why Attention</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Translate', MousePointer2]]} mode={mode}
                            setMode={(m) => (m === 'explore' ? (model ? toExplore() : null) : setMode(m))} accent="indigo" />
                        {mode === 'explore' || real
                            ? <SourceChip kind="toy">Trained for this site · English → French GRU translator with attention</SourceChip>
                            : <SourceChip kind="illustrative">Masks are exact by definition</SourceChip>}
                    </div>

                    {loaded.error ? (
                        <LoadError error={loaded.error} onRetry={loaded.retry} accent="indigo" what="The translator" />
                    ) : !model ? (
                        <LoadingCard text="Loading the translator (172 KB)…" />
                    ) : mode === 'explore' ? (
                        <Explore key={exploreKey} model={model} initialText={PRESETS[presetIndex].text} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Source:</span>
                                {PRESETS.map((pr, k) => (
                                    <button key={pr.text} onClick={() => { setPresetIndex(k); play.pause(); }} aria-pressed={presetIndex === k}
                                        className={`text-xs px-2.5 py-1 rounded-lg border ${presetIndex === k ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-400 hover:border-indigo-500'}`}>{pr.text}</button>
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

                    <InCode title="Cross-attention in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="Who attends to whom" icon={Network}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-slate-200">Encoder self-attention</span>: source to source, no mask.</li>
                            <li><span className="text-slate-200">Decoder self-attention</span>: output to output, causal mask.</li>
                            <li><span className="text-slate-200">Cross-attention</span>: output queries, source keys and values, no mask.</li>
                        </ul>
                    </Card>

                    <Misconception claim="The decoder reads the source in step: output word t looks at input word t.">
                        <p>In the trained translator, the most-weighted source word is the word at the same position in only {pct(CROSS.topSame)} of {CROSS.steps.toLocaleString('en-US')} steps, but the word actually being translated in {pct(CROSS.topAligned)}. Force it to read in step and sentence accuracy drops from {pct(CROSS.exact[0])} to {pct(CROSS.exact[1])}.</p>
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
