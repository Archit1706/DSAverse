"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Waves, Scale, Eye, Plus, Cpu, Layers, Unplug,
    CheckCircle, XCircle, Wrench, Ruler,
} from 'lucide-react';
import { loadTinyGpt } from '@/lib/ml/tinyGpt';
import { forwardWith, nextTokenScore } from '@/lib/ml/gptVariants';
import { toRows, softmax } from '@/lib/ml/tensor';
import useLoaded from '@/lib/ml/useLoaded';
import Heatmap from '@/components/ml/Heatmap';
import TokenStrip from '@/components/ml/TokenStrip';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import ProbBars from '@/components/ml/ProbBars';
import Tex from '@/components/math/Tex';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card, Segmented,
} from '@/components/ml/TourKit';

/* ── the block ─────────────────────────────────────────────
   One block of the tiny GPT, exactly as it runs: x → LayerNorm → attention
   → add → LayerNorm → FFN (64 → 256 → 64, GELU) → add. Like GPT-2 it
   normalises *before* each sublayer (pre-norm); the 2017 Transformer
   normalised after adding ("add & norm"). The shape of the stream never
   changes: [T, 64] in, [T, 64] out, three times. */

const D = 64, HIDDEN = 256;
const BLOCK_PARAMS = 2 * (2 * D) + 4 * (D * D + D) + (D * HIDDEN + HIDDEN) + (HIDDEN * D + D);   // 49,984

const PRESETS = [
    { label: 'Mia … She found', text: 'One day, Mia went to the park. She found a red ball' },
    { label: 'Ruby saw a cat', text: 'After lunch, Ruby saw a cat in the kitchen.' },
    { label: 'Ben and Zoe', text: 'One day, Ben and Zoe went to the farm. Ben was happy.' },
    { label: 'Lily lost her hat', text: 'Last week, Lily lost her blue hat. She was sad. She' },
];

/* Measured over 100 generated stories (seed 41, 5,767 predictions) and
   checked by the test suite: loss and top-guess accuracy with all three
   blocks, with only the first one or two (the rest skipped), and with every
   residual connection removed; the mean size (Euclidean norm) of a token's
   row entering each block, of what attention and the FFN add, and leaving. */
const BLOCK_STATS = {
    stories: 100, tokens: 5767,
    full: [0.329, 0.864], layers1: [4.768, 0.228], layers2: [0.597, 0.816], noResidual: [8.668, 0.009],
    norms: { x: [1.75, 8.74, 17.70], attn: [2.51, 4.68, 3.56], ffn: [7.08, 12.15, 25.12], out: [8.74, 17.70, 35.11] },
    geluSmall: 0.338,
};

const ACTS = [
    { id: 1, label: 'The Stream', icon: Waves },
    { id: 2, label: 'Norm First', icon: Scale },
    { id: 3, label: 'Attention Reads', icon: Eye },
    { id: 4, label: 'Add', icon: Plus },
    { id: 5, label: 'Feed-Forward', icon: Cpu },
    { id: 6, label: 'Add Again', icon: Plus },
    { id: 7, label: 'Stack Three', icon: Layers },
    { id: 8, label: 'No Shortcut', icon: Unplug },
];

const num = (v, d = 2) => {
    const r = Math.round(v * 10 ** d) / 10 ** d;
    return `${r < 0 ? '−' : ''}${Math.abs(r).toFixed(d)}`;
};
const pct = (v) => `${Math.round(v * 100)}%`;
const clean = (t) => (t.trim() === '' ? '␣' : t.trim());
const tokText = (model, id) => model.tokenizer.tokenText(id) ?? model.tokenizer.tokenLabel(id);
const tokensOf = (model, ids) => ids.map(id => ({ id, text: tokText(model, id) }));
const rowOf = (t, i) => Array.from(t.data.subarray(i * t.cols, (i + 1) * t.cols));
const norm = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
const meanStd = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return [m, Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length)]; };
const absMax = (rows) => Math.max(1e-6, ...rows.flat().map(Math.abs));
const withFuture = (rows) => rows.map((r, i) => r.map((v, j) => (j > i ? -Infinity : v)));

/** Top next-token guesses for the last position after `layers` blocks. */
function lens(model, ids, layers, k = 3) {
    const r = forwardWith(model, ids, { layers });
    const L = r.logits, T = L.rows;
    const p = softmax(rowOf(L, T - 1));
    return p.map((x, id) => ({ id, p: x })).sort((a, b) => b.p - a.p).slice(0, k).map(x => ({ label: clean(tokText(model, x.id)), p: x.p }));
}

/* Shape prompts: four per tour, one per sublayer. Every answer is a
   different shape, so "always pick [T, 64]" is right a quarter of the time,
   and the options rotate so the answer's button follows a Latin square. */
const ORDERS = [[2, 0, 3, 1], [1, 3, 0, 2], [3, 1, 2, 0], [0, 2, 1, 3]];
const SHAPE_QS = [
    'LayerNorm works on each token\'s row by itself. What shape comes out?',
    'Each of the four heads in this block makes its own weight matrix. What shape is one?',
    'The FFN\'s first layer widens every token\'s 64 numbers to 256. What shape comes out?',
    'What shape is W₁, the matrix that does the widening?',
];
const shapeLabels = (T) => [`[${T}, 64]`, `[${T}, ${T}]`, `[${T}, 256]`, '[64, 256]'];
function shapeAsk(T, presetIndex, q) {
    const L = shapeLabels(T), pos = ORDERS[presetIndex][q];
    const because = [
        `One output row per token, each still 64 numbers: [T, 64] = [${T}, 64].`,
        `Every token (row) gets one weight for every token (column): [T, T] = [${T}, ${T}].`,
        `Still one row per token, now 256 numbers wide: [${T}, 256].`,
        'It maps 64 numbers to 256 and is the same for every token, so it has no T in it: [64, 256].',
    ][q];
    return { question: SHAPE_QS[q], options: [0, 1, 2, 3].map(p => L[(q + p - pos + 4) % 4]), correct: pos, because };
}

function generateSteps(model, presetIndex) {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });
    const ids = model.tokenizer.encode(PRESETS[presetIndex].text);
    const T = ids.length, last = T - 1;
    const tokens = tokensOf(model, ids);
    const run = forwardWith(model, ids);
    const b = run.blocks[0];
    const base = { tokens, T };
    const lastName = clean(tokens[last].text);

    s(1, 'The Stream', { ...base, kind: 'mat', title: 'x: token + position vectors, entering block 1', m: toRows(b.input), shape: [T, 64] },
        `A transformer is a stream of vectors, one row per token: [${T}, 64] here. Each block reads the stream, computes something and adds it back. Nothing ever replaces the stream; blocks only add to it. Follow the row for "${lastName}".`);

    s(2, 'Norm First', { ...base, kind: 'setup', ask: shapeAsk(T, presetIndex, 0) }, 'Before attention looks at the stream, each row is normalised.');
    const [mx, sx] = meanStd(rowOf(b.input, last)), [ml, sl] = meanStd(rowOf(b.ln1, last));
    s(2, 'Norm First', { ...base, kind: 'ln', before: rowOf(b.input, last), after: rowOf(b.ln1, last), m: toRows(b.ln1) },
        `LayerNorm takes each row on its own: subtract its mean, divide by its spread, then apply a learned scale γ and shift β. For "${lastName}" the row has mean ${num(mx, 3)} and spread ${num(sx, 3)} going in; after normalising and γ, β it has mean ${num(ml, 3)} and spread ${num(sl, 3)}. The shape stays [${T}, 64]. Normalising first (pre-norm) is what GPT-2 and this model do; the 2017 Transformer added first and normalised after.`);

    s(3, 'Attention Reads', { ...base, kind: 'setup', ask: shapeAsk(T, presetIndex, 1) }, 'Attention reads the normalised rows.');
    const heads = b.heads.map(h => withFuture(toRows(h.weights)));
    s(3, 'Attention Reads', { ...base, kind: 'attn', heads, out: toRows(b.attnOut) },
        `Four heads, each with its own [${T}, ${T}] weights, mix information between tokens, and W_O brings the result back to [${T}, 64]. This is the only place in the block where one token's row reads another's.`);

    const xr = rowOf(b.input, last), ar = rowOf(b.attnOut, last), r1 = rowOf(b.resid1, last);
    s(4, 'Add', { ...base, kind: 'add', rows: [['x', xr], ['+ attention', ar], ['= stream', r1]] },
        `Attention's output is added to the stream, not swapped in: x + attention(LN(x)). For "${lastName}" the row entering had size ${num(norm(xr))}, attention added a vector of size ${num(norm(ar))}, and the new row has size ${num(norm(r1))}. The original information is still there, plus what attention found.`);

    s(5, 'Feed-Forward', { ...base, kind: 'setup', ask: shapeAsk(T, presetIndex, 2) }, 'Then a second LayerNorm, and the feed-forward network.');
    const act = toRows(b.ffnAct);
    const small = act.flat().filter(v => Math.abs(v) < 0.05).length / (T * HIDDEN);
    s(5, 'Feed-Forward', { ...base, kind: 'mat', title: 'FFN hidden layer after GELU', m: act, shape: [T, 256], wide: true },
        `The FFN works on each row separately: 64 numbers widen to 256, pass through GELU, and narrow back to 64. On this sentence ${pct(small)} of the 256 GELU outputs are within 0.05 of zero (${pct(BLOCK_STATS.geluSmall)} over ${BLOCK_STATS.stories} stories): each token switches on its own subset of the 256 units.`);
    s(5, 'Feed-Forward', { ...base, kind: 'setup', ask: shapeAsk(T, presetIndex, 3) }, 'The widening is a single matrix multiply.');
    s(5, 'Feed-Forward', { ...base, kind: 'mat', title: 'W₁ of block 1', m: toRows(model.tensors['h0.w1']), shape: [64, 256], wide: true, noRowLabels: true },
        `W₁ is [64, 256]: 64 numbers in, 256 out. It has no T in its shape because the same matrix is applied to every token. W₂ is [256, 64]. Together with their biases they hold ${(D * HIDDEN + HIDDEN + HIDDEN * D + D).toLocaleString('en-US')} of the block's ${BLOCK_PARAMS.toLocaleString('en-US')} numbers, twice what attention uses.`);

    const fr = rowOf(b.ffnOut, last), outr = rowOf(b.output, last);
    s(6, 'Add Again', { ...base, kind: 'add', rows: [['stream', r1], ['+ FFN', fr], ['= leaves block 1', outr]] },
        `The FFN's output is added too: x + FFN(LN(x)). For "${lastName}" it adds a vector of size ${num(norm(fr))}, and the row leaves block 1 with size ${num(norm(outr))}, still [${T}, 64]. Two sublayers, two additions, one block.`);

    const lensRows = [1, 2, 3].map(l => lens(model, ids, l));
    s(7, 'Stack Three', { ...base, kind: 'stack', lensRows },
        `The tiny GPT runs three identical blocks with different weights, then one last LayerNorm and the vocabulary matrix. Reading the stream after one block, after two and after three (the "logit lens") shows the guess for what follows "${lastName}" sharpening. Over ${BLOCK_STATS.stories} stories: one block gives loss ${num(BLOCK_STATS.layers1[0], 3)}, two give ${num(BLOCK_STATS.layers2[0], 3)}, three give ${num(BLOCK_STATS.full[0], 3)}. The stream's average size grows from ${num(BLOCK_STATS.norms.x[0])} to ${num(BLOCK_STATS.norms.out[2])} as each block adds to it.`);

    const nores = forwardWith(model, ids, { residual: false });
    const sc = nextTokenScore(run.logits, ids), scN = nextTokenScore(nores.logits, ids);
    s(8, 'No Shortcut', { ...base, kind: 'nores', on: sc, off: scN },
        `Remove the additions: each sublayer's output replaces the stream instead of adding to it. The same weights now give loss ${num(scN.loss, 3)} on this sentence instead of ${num(sc.loss, 3)}; over ${BLOCK_STATS.stories} stories, ${num(BLOCK_STATS.noResidual[0], 3)} instead of ${num(BLOCK_STATS.full[0], 3)}, and the top guess is right ${pct(BLOCK_STATS.noResidual[1])} of the time. The token and position vectors never reach the output, and training would have had no short path for gradients either.`);
    return steps;
}

const predictFor = (step, next) => (next && step.ask ? step.ask : null);

function formulaFor(step) {
    if (!step) return null;
    if (step.kind === 'ln') return String.raw`\text{LN}(x) = \gamma \odot \frac{x - \mu}{\sigma} + \beta`;
    if (step.kind === 'attn' || (step.kind === 'add' && step.act === 4)) return String.raw`x \leftarrow x + \text{Attention}(\text{LN}_1(x))`;
    if (step.kind === 'mat' && step.act === 5) return String.raw`\text{FFN}(h) = \text{GELU}(h\,W_1 + b_1)\,W_2 + b_2, \quad W_1 \in \mathbb{R}^{64 \times 256},\; W_2 \in \mathbb{R}^{256 \times 64}`;
    if (step.kind === 'add' && step.act === 6) return String.raw`x \leftarrow x + \text{FFN}(\text{LN}_2(x))`;
    if (step.kind === 'stack') return String.raw`\text{logits} = \text{LN}_f(x^{(3)})\, W_E^\top`;
    return null;
}

const quizQuestions = [
    {
        question: 'In a pre-norm block like GPT-2\'s, what does the attention sublayer compute?',
        options: ['x ← Attention(x)', 'x ← LN(x + Attention(x))', 'x ← x + Attention(LN(x))', 'x ← LN(Attention(x))'],
        correct: 2,
        explanation: 'Normalise a copy, attend, and add the result back to the stream. The 2017 Transformer used LN(x + Attention(x)), "add & norm".',
    },
    {
        question: 'What shape does the stream have after each of the tiny GPT\'s three blocks, for T tokens?',
        options: ['[T, 64] every time', '[T, 256] after the FFN', '[T, T]', 'It halves with each block'],
        correct: 0,
        explanation: 'Each sublayer returns [T, 64] so that it can be added to the stream. Only inside the FFN does a row widen to 256, and only inside attention does a [T, T] matrix appear.',
    },
    {
        question: 'Which part of the block lets one token\'s row use information from another token?',
        options: ['LayerNorm', 'The FFN', 'Attention', 'The residual addition'],
        correct: 2,
        explanation: 'LayerNorm and the FFN act on each row by itself, and the addition is row by row too. Attention is the only step that mixes rows.',
    },
];

const codeExample = `import torch
from torch import nn

class Block(nn.Module):
    def __init__(self, d=64, heads=4, hidden=256):
        super().__init__()
        self.ln1, self.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.attn = nn.MultiheadAttention(d, heads, batch_first=True)
        self.ffn = nn.Sequential(nn.Linear(d, hidden), nn.GELU(), nn.Linear(hidden, d))

    def forward(self, x):
        T = x.shape[1]
        mask = torch.triu(torch.ones(T, T, dtype=torch.bool), 1)
        h = self.ln1(x)
        x = x + self.attn(h, h, h, attn_mask=mask, need_weights=False)[0]   # add
        x = x + self.ffn(self.ln2(x))                                         # add again
        return x

block = Block()
x = torch.randn(1, 14, 64)
print(block(x).shape, sum(p.numel() for p in block.parameters()))
# torch.Size([1, 14, 64]) 49984`;

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
const STAGES = ['x', 'LN₁', 'attention', '+ add', 'LN₂', 'FFN', '+ add'];

function Pipeline({ active }) {
    return (
        <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono mb-3" aria-label="Block stages">
            {STAGES.map((st, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span className="text-slate-600">→</span>}
                    <span className={`px-2 py-0.5 rounded border ${active.includes(i) ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-500'}`}>{st}</span>
                </React.Fragment>
            ))}
        </div>
    );
}
const ACTIVE = { 1: [0], 2: [1], 3: [2], 4: [3], 5: [4, 5], 6: [6], 7: [], 8: [3, 6] };

function RowStrip({ label, row, domain }) {
    return (
        <div className="grid grid-cols-[7rem_1fr_4rem] items-center gap-2 text-xs">
            <span className="font-mono text-slate-300 text-right">{label}</span>
            <div className="overflow-x-auto"><Heatmap data={[row]} scale="diverging" domain={[-domain, domain]} cellSize={7} ariaLabel={label} /></div>
            <span className="font-mono text-slate-400">|v| {num(norm(row))}</span>
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    const L = labels(step.tokens);
    const body = (() => {
        switch (step.kind) {
            case 'mat': {
                const dm = absMax(step.m);
                return (
                    <div className="min-w-0">
                        <Caption>{step.title} <ShapeTag shape={step.shape} /></Caption>
                        <div className="overflow-x-auto max-w-full"><Heatmap data={step.m} rowLabels={step.noRowLabels ? undefined : L} scale="diverging" domain={[-dm, dm]} cellSize={step.wide ? 3 : 7} ariaLabel={step.title} /></div>
                    </div>
                );
            }
            case 'setup':
                return <p className="text-sm text-slate-400">The answer appears on the next step.</p>;
            case 'ln': {
                const dm = Math.max(absMax([step.before]), absMax([step.after]));
                return (
                    <div className="space-y-2">
                        <Caption>Row for &quot;{L[step.T - 1]}&quot; before and after LayerNorm</Caption>
                        <RowStrip label="x" row={step.before} domain={dm} />
                        <RowStrip label="LN₁(x)" row={step.after} domain={dm} />
                    </div>
                );
            }
            case 'attn':
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {step.heads.map((w, h) => (
                                <div key={h} className="min-w-0">
                                    <Caption>head {h + 1} <ShapeTag shape={[step.T, step.T]} /></Caption>
                                    <div className="overflow-x-auto"><Heatmap data={w} scale="sequential" domain={[0, 1]} cellSize={Math.max(6, Math.floor(150 / step.T))} ariaLabel={`Head ${h + 1} weights`} /></div>
                                </div>
                            ))}
                        </div>
                        <div className="min-w-0">
                            <Caption>attention output after W_O <ShapeTag shape={[step.T, 64]} /></Caption>
                            <div className="overflow-x-auto"><Heatmap data={step.out} rowLabels={L} scale="diverging" domain={[-absMax(step.out), absMax(step.out)]} cellSize={6} ariaLabel="Attention output" /></div>
                        </div>
                    </div>
                );
            case 'add': {
                const dm = absMax(step.rows.map(r => r[1]));
                return (
                    <div className="space-y-2">
                        <Caption>Row for &quot;{L[step.T - 1]}&quot;, 64 numbers each</Caption>
                        {step.rows.map(([lab, row]) => <RowStrip key={lab} label={lab} row={row} domain={dm} />)}
                    </div>
                );
            }
            case 'stack':
                return (
                    <div className="space-y-3">
                        <div className="grid sm:grid-cols-3 gap-3">
                            {step.lensRows.map((bars, l) => (
                                <div key={l} className="min-w-0">
                                    <Caption>after block {l + 1}</Caption>
                                    <ProbBars items={bars} chosen={0} accent="#818cf8" ariaLabel={`Guesses after block ${l + 1}`} />
                                </div>
                            ))}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="text-xs font-mono text-slate-300">
                                <thead><tr className="text-slate-500"><th className="pr-4 text-left font-normal">over {BLOCK_STATS.stories} stories</th><th className="pr-4 font-normal">1 block</th><th className="pr-4 font-normal">2 blocks</th><th className="font-normal">3 blocks</th></tr></thead>
                                <tbody>
                                    <tr><td className="pr-4">loss</td>{[BLOCK_STATS.layers1, BLOCK_STATS.layers2, BLOCK_STATS.full].map((x, i) => <td key={i} className="pr-4 text-center">{num(x[0], 3)}</td>)}</tr>
                                    <tr><td className="pr-4">top guess right</td>{[BLOCK_STATS.layers1, BLOCK_STATS.layers2, BLOCK_STATS.full].map((x, i) => <td key={i} className="pr-4 text-center">{pct(x[1])}</td>)}</tr>
                                    <tr><td className="pr-4">stream size leaving</td>{BLOCK_STATS.norms.out.map((x, i) => <td key={i} className="pr-4 text-center">{num(x)}</td>)}</tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'nores':
                return (
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        {[['With residuals', step.on], ['Without residuals', step.off]].map(([t, sc]) => (
                            <div key={t} className="rounded-lg border border-slate-700 p-3">
                                <div className="text-slate-200 font-semibold">{t}</div>
                                <div className="font-mono text-xs text-slate-400">loss {num(sc.loss, 3)} · top guess right {pct(sc.accuracy)}</div>
                            </div>
                        ))}
                    </div>
                );
            default: return null;
        }
    })();
    return (
        <div className="w-full">
            <Pipeline active={ACTIVE[step.act] ?? []} />
            <div className="overflow-x-auto mb-3"><TokenStrip tokens={step.tokens} size="sm" /></div>
            {body}
        </div>
    );
}

/* ── explore ─────────────────────────────────────────────── */
function Explore({ model, initialText }) {
    const [text, setText] = useState(initialText);
    const [sel, setSel] = useState(null);
    const [layer, setLayer] = useState(0);
    const [residual, setResidual] = useState(true);
    const [blocks, setBlocks] = useState(3);
    const ids = useMemo(() => model.tokenizer.encode(text).slice(0, 40), [model, text]);
    const tokens = tokensOf(model, ids);
    const T = ids.length;
    const i = sel == null || sel >= T ? T - 1 : sel;
    const run = useMemo(() => forwardWith(model, ids, { residual, layers: blocks }), [model, ids, residual, blocks]);
    const full = useMemo(() => forwardWith(model, ids), [model, ids]);
    const b = run.blocks[Math.min(layer, blocks - 1)];
    const rows = [['x', b.input], ['LN₁(x)', b.ln1], ['attention', b.attnOut], [residual ? 'x + attention' : 'attention only', b.resid1], ['LN₂', b.ln2], ['FFN', b.ffnOut], [residual ? 'leaves block' : 'FFN only', b.output]].map(([l, t]) => [l, rowOf(t, i)]);
    const dm = absMax(rows.map(r => r[1]));
    const p = softmax(rowOf(run.logits, i));
    const top = p.map((x, id) => ({ id, p: x })).sort((a, c) => c.p - a.p).slice(0, 5);
    const sc = nextTokenScore(run.logits, ids), sc0 = nextTokenScore(full.logits, ids);
    const broken = !residual || blocks < 3;
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Sentence:</span>
                    {PRESETS.map(pr => (
                        <button key={pr.label} onClick={() => { setText(pr.text); setSel(null); }} aria-pressed={text === pr.text}
                            className={`text-xs px-2.5 py-1 rounded-lg border ${text === pr.text ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-400 hover:border-indigo-500'}`}>{pr.label}</button>
                    ))}
                </div>
                <div>
                    <Caption>Click a token to follow its row</Caption>
                    <div className="overflow-x-auto"><TokenStrip tokens={tokens} size="sm" selected={i} onSelect={setSel} /></div>
                </div>
                <Segmented options={[0, 1, 2].filter(l => l < blocks).map(l => [l, `Block ${l + 1}`])} value={Math.min(layer, blocks - 1)} onChange={setLayer} accent="indigo" ariaLabel="Block" />
                <div className="space-y-1.5">
                    {rows.map(([lab, row]) => <RowStrip key={lab} label={lab} row={row} domain={dm} />)}
                </div>
                <div className="max-w-md">
                    <Caption>Next token after &quot;{clean(tokens[i].text)}&quot;</Caption>
                    <ProbBars items={top.map(x => ({ label: clean(tokText(model, x.id)), p: x.p }))} chosen={0} accent="#818cf8" />
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Unplug className="h-4 w-4 text-amber-400" />Break it</h3>
                <div className="flex flex-wrap gap-3">
                    <Segmented options={[[true, 'Residuals on'], [false, 'Residuals off']]} value={residual} onChange={setResidual} accent="indigo" ariaLabel="Residual connections" />
                    <Segmented options={[[1, '1 block'], [2, '2 blocks'], [3, '3 blocks']]} value={blocks} onChange={setBlocks} accent="indigo" ariaLabel="Blocks used" />
                    {broken && <button onClick={() => { setResidual(true); setBlocks(3); }} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                <p className="text-xs font-mono text-slate-400">loss on this text: {num(sc.loss, 3)} (all three blocks with residuals: {num(sc0.loss, 3)})</p>
                {broken && (
                    <BreakNote>
                        {!residual
                            ? `Without the additions each sublayer's output replaces the stream. Over ${BLOCK_STATS.stories} stories the loss goes from ${num(BLOCK_STATS.full[0], 3)} to ${num(BLOCK_STATS.noResidual[0], 3)}: the weights were trained to add small corrections to a stream, not to rebuild it.`
                            : `Skipping blocks: the last LayerNorm and the vocabulary matrix read the stream early. Over ${BLOCK_STATS.stories} stories, ${blocks === 1 ? `one block gives loss ${num(BLOCK_STATS.layers1[0], 3)}` : `two blocks give loss ${num(BLOCK_STATS.layers2[0], 3)}`}, against ${num(BLOCK_STATS.full[0], 3)} with all three.`}
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function TransformerBlockPage() {
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
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Transformer Block</h1>
                    <p className="text-indigo-50 max-w-3xl">
                        LayerNorm, attention, add; LayerNorm, feed-forward, add. Follow one token&apos;s row through a real block of the tiny GPT, watch the residual stream grow, and see what the model loses without the additions.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/transformers/positional-encoding" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Positional Encoding</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Follow a token', MousePointer2]]} mode={mode}
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
                            <TourPlayer acts={ACTS} steps={stepHistory} play={play} predict={predict} accent="indigo" minHeight="min-h-[320px]">
                                <VisualizationPanel step={step} />
                            </TourPlayer>
                            {predict.prompt && <PredictPrompt predict={predict} accent="indigo" />}
                            <ExplanationBox text={step?.explanation} predict={predict} accent="indigo" />
                            {tex && <FormulaPanel><div className="overflow-x-auto"><Tex block>{tex}</Tex></div></FormulaPanel>}
                        </>
                    )}

                    <InCode title="A pre-norm block in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="Sizes in the tiny GPT" icon={Ruler}>
                        <ul className="space-y-1.5 text-sm text-slate-400 font-mono">
                            <li>T = tokens in the input (up to 64)</li>
                            <li>d = 64 numbers per token</li>
                            <li>4 heads of 16</li>
                            <li>FFN: 64 → 256 → 64</li>
                            <li>3 blocks · {BLOCK_PARAMS.toLocaleString('en-US')} numbers each</li>
                        </ul>
                    </Card>

                    <Misconception claim="Each layer transforms the representation into a new one.">
                        <p>Nothing in a block overwrites the stream; attention and the FFN each add a vector to it. The proof is what happens when the additions are replaced by assignments: the same trained weights go from loss {num(BLOCK_STATS.full[0], 3)} to {num(BLOCK_STATS.noResidual[0], 3)} over {BLOCK_STATS.stories} stories, and the top guess is right {pct(BLOCK_STATS.noResidual[1])} of the time instead of {pct(BLOCK_STATS.full[1])}.</p>
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
