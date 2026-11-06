"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Type, Grid3x3, Layers, Repeat, Target, BarChart3, PenLine, Calculator,
    CheckCircle, XCircle, Wrench, Unplug, Shuffle, Search, Cpu,
} from 'lucide-react';
import { loadTinyGpt } from '@/lib/ml/tinyGpt';
import { forwardWith, nextTokenScore } from '@/lib/ml/gptVariants';
import { toRows, softmax } from '@/lib/ml/tensor';
import { generateStories } from '@/lib/ml/stories';
import useLoaded from '@/lib/ml/useLoaded';
import Heatmap from '@/components/ml/Heatmap';
import TokenStrip from '@/components/ml/TokenStrip';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import ProbBars from '@/components/ml/ProbBars';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card, Segmented,
} from '@/components/ml/TourKit';

/* ── the whole model ───────────────────────────────────────
   Every step of the tiny GPT's forward pass on one sentence, from bytes to
   the next token, with every matrix it touches: 640 × 64 token table,
   64 × 64 position table, three blocks of 49,984 numbers, a final
   LayerNorm, and the token table again (transposed) to score all 640
   tokens. 195,136 numbers in all. */

const PRESETS = [
    { label: 'Mia … She found', text: 'One day, Mia went to the park. She found a red ball' },
    { label: 'Ruby saw a cat', text: 'After lunch, Ruby saw a cat in the kitchen.' },
    { label: 'Ben and Zoe', text: 'One day, Ben and Zoe went to the farm. Ben was happy.' },
    { label: 'Lily lost her hat', text: 'Last week, Lily lost her blue hat. She was sad. She' },
];

/* Measured over 100 generated stories (seed 41, 5,767 predictions) and
   checked by the test suite: next-token loss and top-guess accuracy of the
   full model, and with all four heads of one layer switched off. */
const GPT_STATS = { stories: 100, tokens: 5767, full: [0.329, 0.864], layerOff: [[2.279, 0.537], [0.712, 0.757], [0.339, 0.862]] };

const ACTS = [
    { id: 1, label: 'Tokens', icon: Type },
    { id: 2, label: 'Embeddings', icon: Grid3x3 },
    { id: 3, label: 'Block 1', icon: Layers },
    { id: 4, label: 'Blocks 2 and 3', icon: Repeat },
    { id: 5, label: 'Unembed', icon: Target },
    { id: 6, label: 'Probabilities', icon: BarChart3 },
    { id: 7, label: 'Generate', icon: PenLine },
    { id: 8, label: 'Every Number', icon: Calculator },
];

const num = (v, d = 2) => {
    const r = Math.round(v * 10 ** d) / 10 ** d;
    return `${r < 0 ? '−' : ''}${Math.abs(r).toFixed(d)}`;
};
const pct = (v) => `${Math.round(v * 100)}%`;
const fmt = (n) => n.toLocaleString('en-US');
const clean = (t) => (t.trim() === '' ? '␣' : t.trim());
const show = (t) => (t.startsWith(' ') ? `·${t.slice(1)}` : t).replace(/\n/g, '↵');
const tokText = (model, id) => model.tokenizer.tokenText(id) ?? model.tokenizer.tokenLabel(id);
const tokensOf = (model, ids) => ids.map(id => ({ id, text: tokText(model, id) }));
const rowOf = (t, i) => Array.from(t.data.subarray(i * t.cols, (i + 1) * t.cols));
const absMax = (rows) => Math.max(1e-6, ...rows.flat().map(Math.abs));
const withFuture = (rows) => rows.map((r, i) => r.map((v, j) => (j > i ? -Infinity : v)));
const topOf = (p, k) => p.map((x, id) => ({ id, p: x })).sort((a, b) => b.p - a.p).slice(0, k);

/** Every parameter group of the model, counted from its tensors. */
function paramGroups(model) {
    const t = model.tensors, n = (k) => t[k].data.length;
    const blocks = [0, 1, 2].map(l => Object.keys(t).filter(k => k.startsWith(`h${l}.`)).reduce((s, k) => s + n(k), 0));
    const groups = [['Token table wte [640, 64]', n('wte')], ['Position table wpe [64, 64]', n('wpe')],
        ...blocks.map((c, l) => [`Block ${l + 1}`, c]), ['Final LayerNorm', n('lnf_g') + n('lnf_b')]];
    return { groups, total: groups.reduce((s, g) => s + g[1], 0) };
}

/** Greedy continuation, one forward pass per new token. */
function greedy(model, ids, n) {
    const out = [], probs = [];
    let cur = ids.slice();
    for (let k = 0; k < n && cur.length < model.config.ctx; k++) {
        const r = forwardWith(model, cur);
        const p = softmax(rowOf(r.logits, cur.length - 1));
        let best = 0;
        for (let c = 1; c < p.length; c++) if (p[c] > p[best]) best = c;
        out.push(best); probs.push(p[best]);
        cur = [...cur, best];
    }
    return { out, probs };
}

/* Counting prompts: before each table is shown, how many numbers does it
   hold? The four answers sit at four different ranks among their options
   (third largest, smallest, largest, second largest), so "always pick the
   biggest" is right once per tour; the answer's button follows a Latin
   square across the sentences. Distractors are the usual slips: adding
   instead of multiplying, a square table, two untied tables, forgetting
   the biases. */
const ORDERS = [[2, 0, 3, 1], [1, 3, 0, 2], [3, 1, 2, 0], [0, 2, 1, 3]];
const COUNT_QS = [
    { q: 'The token table has one row of 64 numbers for each of the 640 tokens. How many numbers is that?', list: [40960, 409600, 81920, 704], because: '640 × 64 = 40,960. (81,920 would be two separate tables, one in and one out; this model uses the same one for both.)' },
    { q: 'The position table has one 64-number row for each of the 64 positions. How many numbers?', list: [4096, 40960, 16640, 8192], because: '64 × 64 = 4,096.' },
    { q: 'One block\'s attention: W_Q, W_K, W_V and W_O, each [64, 64] with a bias of 64. How many numbers?', list: [16640, 4160, 1040, 4096], because: '4 × (64 × 64 + 64) = 16,640, for all four heads together.' },
    { q: 'One block\'s FFN: W₁ [64, 256] with bias 256, then W₂ [256, 64] with bias 64. How many numbers?', list: [33088, 65536, 32768, 16384], because: '64 × 256 + 256 + 256 × 64 + 64 = 33,088. Without the biases it would be 32,768.' },
];
function countAsk(presetIndex, k) {
    const { q, list, because } = COUNT_QS[k];
    const pos = ORDERS[presetIndex][k];
    return { question: q, options: [0, 1, 2, 3].map(p => fmt(list[(p - pos + 4) % 4])), correct: pos, because };
}

function generateSteps(model, presetIndex) {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });
    const text = PRESETS[presetIndex].text;
    const ids = model.tokenizer.encode(text);
    const T = ids.length, last = T - 1;
    const tokens = tokensOf(model, ids);
    const run = forwardWith(model, ids);
    const base = { tokens, T };
    const bytes = new TextEncoder().encode(text).length;
    const multi = tokens.filter(t => t.text.trim().length > 1);

    s(1, 'Tokens', { ...base, kind: 'tokens' },
        `The text is ${bytes} bytes. The tokenizer, byte-level BPE with 640 entries, turns it into ${T} tokens, each an id between 0 and 639. Common pieces are single tokens with their leading space: ${multi.slice(0, 3).map(t => `"${show(t.text)}" (${t.id})`).join(', ')}. The model never sees letters, only these ${T} ids.`);

    s(2, 'Embeddings', { ...base, kind: 'setup', ask: countAsk(presetIndex, 0), shape: [640, 64] }, 'Each id picks a row of the token table, shape [640, 64].');
    s(2, 'Embeddings', { ...base, kind: 'mat', title: 'rows of the token table for these ids', m: toRows(run.tokEmb), shape: [T, 64] },
        `Each id selects its row from the 40,960-number token table: ${T} rows of 64 for this sentence. Nothing is computed yet; it is a lookup.`);
    s(2, 'Embeddings', { ...base, kind: 'setup', ask: countAsk(presetIndex, 1), shape: [64, 64] }, 'Then a row of the position table is added at each position.');
    s(2, 'Embeddings', { ...base, kind: 'mat', title: 'token + position: the stream entering block 1', m: toRows(run.blocks[0].input), shape: [T, 64] },
        `Row p of the 4,096-number position table is added to the token at position p. This [${T}, 64] stream is everything the blocks will see.`);

    const b1 = run.blocks[0];
    s(3, 'Block 1', { ...base, kind: 'setup', ask: countAsk(presetIndex, 2) }, 'Block 1 starts with LayerNorm and multi-head attention.');
    s(3, 'Block 1', { ...base, kind: 'heads', layer: 0, heads: b1.heads.map(h => withFuture(toRows(h.weights))) },
        `Attention in block 1: four heads, each with its own [${T}, ${T}] weights, the future hidden. Their 16,640 numbers are the only ones in the block that move information between tokens.`);
    s(3, 'Block 1', { ...base, kind: 'setup', ask: countAsk(presetIndex, 3) }, 'Then LayerNorm again and the feed-forward network, 64 → 256 → 64.');
    const act = toRows(b1.ffnAct);
    const lastAct = act[last];
    const nTop = lastAct.indexOf(Math.max(...lastAct));
    s(3, 'Block 1', { ...base, kind: 'ffn', act, nTop },
        `The FFN's 256 hidden units, after GELU, for every token: [${T}, 256]. For "${clean(tokens[last].text)}" the most active is unit ${nTop} at ${num(lastAct[nTop])}. Both sublayers add to the stream; block 1 is ${fmt(16640 + 33088 + 256)} numbers counting its two LayerNorms.`);

    const streams = [1, 2].map(l => toRows(run.blocks[l].output));
    s(4, 'Blocks 2 and 3', { ...base, kind: 'streams', streams },
        `Blocks 2 and 3 have the same shapes and their own weights. Each reads the stream, adds attention's result, then the FFN's. The stream is still [${T}, 64] after all three; only the numbers have changed.`);

    const logitsLast = rowOf(run.logits, last);
    const lo = Math.min(...logitsLast), hi = Math.max(...logitsLast);
    s(5, 'Unembed', { ...base, kind: 'unembed', final: toRows(run.final), logitsLast },
        `A last LayerNorm, then each row is multiplied by the token table turned on its side, [64, 640]: one score (logit) per token in the vocabulary, [${T}, 640] in all. The same 40,960 numbers that turned ids into vectors now turn vectors back into token scores. For the last position the scores run from ${num(lo, 1)} to ${num(hi, 1)}.`);

    const p = softmax(logitsLast);
    const top = topOf(p, 8);
    const sc = nextTokenScore(run.logits, ids);
    s(6, 'Probabilities', { ...base, kind: 'probs', bars: top.map(x => ({ label: tokText(model, x.id), p: x.p })) },
        `Softmax turns the 640 scores into probabilities. After "${clean(tokens[last].text)}" the model's top guess is "${show(tokText(model, top[0].id))}" at ${pct(top[0].p)}. Every position gets such a guess at once; on this sentence the top guess matches the actual next token at ${Math.round(sc.accuracy * sc.n)} of ${sc.n} positions. Over ${GPT_STATS.stories} stories it is right ${pct(GPT_STATS.full[1])} of the time.`);

    const g = greedy(model, ids, 10);
    s(7, 'Generate', { ...base, kind: 'gen', gen: tokensOf(model, g.out), genP: g.probs },
        `To write, take the top token, append it and run the whole forward pass again. Ten passes give "${g.out.map(id => tokText(model, id)).join('').replace(/\n/g, ' ')}". Each new token cost one full trip through all 195,136 numbers.`);

    const pg = paramGroups(model);
    s(8, 'Every Number', { ...base, kind: 'count', pg },
        `That is the whole model. ${pg.groups.map(([nm, c]) => `${nm.split(' [')[0]}: ${fmt(c)}`).join('; ')}. Total ${fmt(pg.total)}. GPT-2 small has the same parts with d = 768, 12 heads, 12 blocks and a 50,257-token vocabulary: about 124 million numbers.`);
    return steps;
}

const predictFor = (step, next) => (next && step.ask ? step.ask : null);

function formulaFor(step) {
    if (!step) return null;
    if (step.kind === 'mat' && step.act === 2) return String.raw`x^{(0)}_p = W_E[\text{id}_p] + W_P[p]`;
    if (step.kind === 'heads' || step.kind === 'ffn' || step.kind === 'streams') return String.raw`x \leftarrow x + \text{Attn}(\text{LN}_1(x)), \qquad x \leftarrow x + \text{FFN}(\text{LN}_2(x))`;
    if (step.kind === 'unembed') return String.raw`\text{logits} = \text{LN}_f\!\left(x^{(3)}\right) W_E^\top \;\in\; \mathbb{R}^{${step.T} \times 640}`;
    if (step.kind === 'probs') return String.raw`P(\text{next} = v) = \frac{e^{\,\text{logit}_v}}{\sum_{u=1}^{640} e^{\,\text{logit}_u}}`;
    if (step.kind === 'count') return String.raw`40{,}960 + 4{,}096 + 3 \times 49{,}984 + 128 = ${fmt(step.pg.total).replace(/,/g, '{,}')}`;
    return null;
}

const quizQuestions = [
    {
        question: 'How does the tiny GPT turn its final vectors into scores for the 640 tokens?',
        options: [
            'A separate [64, 640] output matrix trained from scratch',
            'It multiplies by the token table transposed: the same numbers used for the input lookup',
            'It looks up the nearest token by Euclidean distance',
            'Softmax alone produces 640 numbers from 64',
        ],
        correct: 1,
        explanation: 'The logits are LN(x) times wteᵀ, [64, 640]. Sharing the table (weight tying) saves 40,960 numbers and makes "similar input" and "similar output" the same notion.',
    },
    {
        question: 'Generating 10 new tokens takes how many forward passes?',
        options: ['One', 'Ten: one per new token', 'Three: one per block', '640'],
        correct: 1,
        explanation: 'Each pass yields one next token, which is appended to the input for the next pass. (Real systems cache the keys and values of earlier positions so each pass is cheap, but there is still one per token.)',
    },
    {
        question: 'Where are most of the tiny GPT\'s 195,136 numbers?',
        options: ['In the position table', 'In the final LayerNorm', 'In the three blocks, about 150,000', 'In the softmax'],
        correct: 2,
        explanation: '3 × 49,984 = 149,952 in the blocks, two-thirds of it in the FFNs. The token table is 40,960, the position table 4,096, the final LayerNorm 128. Softmax has no parameters.',
    },
];

const codeExample = `import torch
from torch import nn

class TinyGPT(nn.Module):
    def __init__(self, vocab=640, ctx=64, d=64, heads=4, layers=3):
        super().__init__()
        self.wte, self.wpe = nn.Embedding(vocab, d), nn.Embedding(ctx, d)
        self.blocks = nn.ModuleList(nn.TransformerEncoderLayer(d, heads, 4 * d, dropout=0.0,
            activation='gelu', batch_first=True, norm_first=True) for _ in range(layers))
        self.lnf = nn.LayerNorm(d)

    def forward(self, ids):
        T = ids.shape[1]
        x = self.wte(ids) + self.wpe(torch.arange(T))
        mask = nn.Transformer.generate_square_subsequent_mask(T)
        for b in self.blocks:
            x = b(x, src_mask=mask, is_causal=True)
        return self.lnf(x) @ self.wte.weight.T          # tied: the token table again

m = TinyGPT()
print(sum(p.numel() for p in m.parameters()))
print(m(torch.randint(0, 640, (1, 14))).shape)
# 195136
# torch.Size([1, 14, 640])`;

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

function Mat({ title, m, shape, rowLabels, cell = 6 }) {
    const dm = absMax(m);
    return (
        <div className="min-w-0">
            <Caption>{title} <ShapeTag shape={shape} /></Caption>
            <div className="overflow-x-auto max-w-full"><Heatmap data={m} rowLabels={rowLabels} scale="diverging" domain={[-dm, dm]} cellSize={cell} ariaLabel={title} /></div>
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    const L = labels(step.tokens);
    const strip = <div className="overflow-x-auto mb-3"><TokenStrip tokens={step.tokens} size="sm" /></div>;
    switch (step.kind) {
        case 'tokens': return <div className="w-full">{strip}</div>;
        case 'setup':
            return (
                <div className="w-full">
                    {strip}
                    {step.shape && <p className="text-sm text-slate-400">Table shape: <ShapeTag shape={step.shape} /></p>}
                </div>
            );
        case 'mat': return <div className="w-full">{strip}<Mat title={step.title} m={step.m} shape={step.shape} rowLabels={L} /></div>;
        case 'heads':
            return (
                <div className="w-full">
                    {strip}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {step.heads.map((w, h) => (
                            <div key={h} className="min-w-0">
                                <Caption>L{step.layer + 1}H{h + 1} <ShapeTag shape={[step.T, step.T]} /></Caption>
                                <div className="overflow-x-auto"><Heatmap data={w} scale="sequential" domain={[0, 1]} cellSize={Math.max(6, Math.floor(150 / step.T))} ariaLabel={`Head ${h + 1} weights`} /></div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'ffn':
            return (
                <div className="w-full">
                    {strip}
                    <Mat title={`FFN hidden units after GELU (unit ${step.nTop} is the most active for the last token)`} m={step.act} shape={[step.T, 256]} rowLabels={L} cell={3} />
                </div>
            );
        case 'streams':
            return <div className="w-full space-y-3">{strip}{step.streams.map((m, k) => <Mat key={k} title={`stream after block ${k + 2}`} m={m} shape={[step.T, 64]} rowLabels={L} />)}</div>;
        case 'unembed': {
            const sorted = step.logitsLast.map((v, id) => [v, id]).sort((a, b) => b[0] - a[0]);
            const lo = sorted[sorted.length - 1][0], hi = sorted[0][0];
            const W = 640, H = 90;
            return (
                <div className="w-full space-y-3">
                    {strip}
                    <Mat title="after the final LayerNorm" m={step.final} shape={[step.T, 64]} rowLabels={L} />
                    <div>
                        <Caption>640 scores for the last position, sorted <ShapeTag shape={[640]} /></Caption>
                        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="max-w-2xl" role="img" aria-label="Sorted logits">
                            {sorted.map(([v], k) => {
                                const y0 = H - 6 - (0 - lo) / (hi - lo) * (H - 12), y = H - 6 - (v - lo) / (hi - lo) * (H - 12);
                                return <rect key={k} x={k} width="1" y={Math.min(y, y0).toFixed(2)} height={Math.max(0.5, Math.abs(y - y0)).toFixed(2)} fill={k < 8 ? '#a5b4fc' : '#475569'} />;
                            })}
                        </svg>
                    </div>
                </div>
            );
        }
        case 'probs': return <div className="w-full">{strip}<div className="max-w-md"><ProbBars items={step.bars} chosen={0} accent="#818cf8" ariaLabel="Next-token probabilities" /></div></div>;
        case 'gen':
            return (
                <div className="w-full space-y-2">
                    {strip}
                    <Caption>ten greedy tokens, with the probability each had when chosen</Caption>
                    <div className="flex flex-wrap gap-1.5">
                        {step.gen.map((t, k) => (
                            <span key={k} className="px-1.5 py-0.5 rounded border border-indigo-500/50 text-xs font-mono text-indigo-100">
                                {show(t.text)} <span className="text-slate-500">{pct(step.genP[k])}</span>
                            </span>
                        ))}
                    </div>
                </div>
            );
        case 'count':
            return (
                <div className="w-full space-y-1.5">
                    {step.pg.groups.map(([nm, c]) => (
                        <div key={nm} className="grid grid-cols-[minmax(8rem,14rem)_1fr_5rem] items-center gap-2 text-xs">
                            <span className="text-slate-300">{nm}</span>
                            <span className="h-2.5 rounded bg-indigo-400/80" style={{ width: `${(c / step.pg.total) * 100}%` }} />
                            <span className="font-mono text-slate-400 text-right">{fmt(c)}</span>
                        </div>
                    ))}
                    <div className="text-xs font-mono text-indigo-200 pt-1">total {fmt(step.pg.total)}</div>
                </div>
            );
        default: return null;
    }
}

/* ── explore: inspect any head or neuron ─────────────────── */
function scanNeuron(model, layer, unit, n = 40) {
    const hits = [];
    generateStories(n, 5).forEach(story => {
        const ids = model.tokenizer.encode(story).slice(0, 64);
        const act = forwardWith(model, ids, { layers: layer + 1 }).blocks[layer].ffnAct;
        for (let i = 0; i < ids.length; i++) hits.push({ v: act.data[i * act.cols + unit], before: i > 0 ? tokText(model, ids[i - 1]) : '', tok: tokText(model, ids[i]) });
    });
    return hits.sort((a, b) => b.v - a.v).slice(0, 8);
}

function Explore({ model, initialText }) {
    const [text, setText] = useState(initialText);
    const [seed, setSeed] = useState(1);
    const [layer, setLayer] = useState(0);
    const [head, setHead] = useState(3);
    const [unit, setUnit] = useState(0);
    const [scan, setScan] = useState(null);
    const [offLayer, setOffLayer] = useState(-1);
    const ids = useMemo(() => model.tokenizer.encode(text).slice(0, 48), [model, text]);
    const tokens = tokensOf(model, ids);
    const T = ids.length;
    const run = useMemo(() => forwardWith(model, ids, { headsOff: offLayer < 0 ? [] : [0, 1, 2, 3].map(h => [offLayer, h]) }), [model, ids, offLayer]);
    const full = useMemo(() => forwardWith(model, ids), [model, ids]);
    const w = withFuture(toRows(run.blocks[layer].heads[head].weights));
    const act = run.blocks[layer].ffnAct;
    const unitActs = Array.from({ length: T }, (_, i) => act.data[i * act.cols + unit]);
    const amax = Math.max(1e-6, ...unitActs.map(Math.abs));
    const p = softmax(rowOf(run.logits, T - 1));
    const sc = nextTokenScore(run.logits, ids), sc0 = nextTokenScore(full.logits, ids);
    const L = labels(tokens);
    const scanKey = `${layer}.${unit}`;
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Text:</span>
                    {PRESETS.map(pr => (
                        <button key={pr.label} onClick={() => setText(pr.text)} aria-pressed={text === pr.text}
                            className={`text-xs px-2.5 py-1 rounded-lg border ${text === pr.text ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-400 hover:border-indigo-500'}`}>{pr.label}</button>
                    ))}
                    <button onClick={() => { setText(generateStories(1, 900 + seed)[0]); setSeed(x => x + 1); }}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500"><Shuffle className="h-3.5 w-3.5" />Random story</button>
                </div>
                <textarea value={text} onChange={e => setText(e.target.value.slice(0, 240))} rows={2} aria-label="Text to run"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:border-indigo-500 outline-none" />
                <p className="text-xs text-slate-500">The model was trained on simple children&apos;s stories; text unlike them gets odd predictions. First 48 tokens are used.</p>
                <Segmented options={[0, 1, 2].map(l => [l, `Layer ${l + 1}`])} value={layer} onChange={(l) => { setLayer(l); setScan(null); }} accent="indigo" ariaLabel="Layer" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3 min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Grid3x3 className="h-4 w-4 text-indigo-400" />Head L{layer + 1}H{head + 1}</h3>
                    <Segmented options={[0, 1, 2, 3].map(h => [h, `Head ${h + 1}`])} value={head} onChange={setHead} accent="indigo" ariaLabel="Head" />
                    <div className="overflow-x-auto"><Heatmap data={w} rowLabels={L} scale="sequential" domain={[0, 1]} cellSize={Math.max(7, Math.min(16, Math.floor(300 / T)))} ariaLabel="Head weights" /></div>
                </div>
                <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3 min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Cpu className="h-4 w-4 text-indigo-400" />FFN unit {unit} of layer {layer + 1}</h3>
                    <ParamSlider label="unit" value={unit} onChange={(u) => { setUnit(u); setScan(null); }} min={0} max={255} step={1} accent="indigo" format={v => String(v)} />
                    <Caption>activation on each token (brighter = higher, largest {num(Math.max(...unitActs))})</Caption>
                    <div className="overflow-x-auto"><TokenStrip tokens={tokens} size="sm" showIds={false} weights={unitActs.map(v => Math.max(0, v) / amax)} /></div>
                    <button onClick={() => setScan({ key: scanKey, hits: scanNeuron(model, layer, unit) })}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500"><Search className="h-3.5 w-3.5" />What does it respond to? (40 stories)</button>
                    {scan && scan.key === scanKey && (
                        <ul className="text-xs font-mono space-y-0.5">
                            {scan.hits.map((h, k) => (
                                <li key={k} className="flex justify-between gap-2"><span><span className="text-slate-500">{show(h.before)}</span><span className="text-indigo-200">{show(h.tok)}</span></span><span className="text-slate-400">{num(h.v)}</span></li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-2">
                <Caption>Next token after &quot;{clean(tokens[T - 1].text)}&quot;</Caption>
                <div className="max-w-md"><ProbBars items={topOf(p, 6).map(x => ({ label: tokText(model, x.id), p: x.p }))} chosen={0} accent="#818cf8" /></div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Unplug className="h-4 w-4 text-amber-400" />Break it: switch off a layer&apos;s attention</h3>
                <div className="flex flex-wrap gap-2">
                    <Segmented options={[[-1, 'All on'], [0, 'Layer 1 off'], [1, 'Layer 2 off'], [2, 'Layer 3 off']]} value={offLayer} onChange={setOffLayer} accent="indigo" ariaLabel="Attention off" />
                    {offLayer >= 0 && <button onClick={() => setOffLayer(-1)} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                <p className="text-xs font-mono text-slate-400">loss on this text: {num(sc.loss, 3)} (all heads on: {num(sc0.loss, 3)})</p>
                {offLayer >= 0 && (
                    <BreakNote>
                        All four heads of layer {offLayer + 1} now output zeros, so in that layer no token can read any other. Over {GPT_STATS.stories} stories the loss goes from {num(GPT_STATS.full[0], 3)} to {num(GPT_STATS.layerOff[offLayer][0], 3)} and the top guess is right {pct(GPT_STATS.layerOff[offLayer][1])} of the time instead of {pct(GPT_STATS.full[1])}.
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function InsideTinyGptPage() {
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
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Inside a Tiny GPT</h1>
                    <p className="text-indigo-50 max-w-3xl">
                        A whole forward pass of a real 195,136-number GPT, from bytes to the next token: every table, every block, the scores for all 640 tokens. Then open it up yourself and inspect any head or any of its 768 neurons.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/transformers/the-transformer-block" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">The Transformer Block</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Inspect', MousePointer2]]} mode={mode}
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

                    <InCode title="The same architecture in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="The tiny GPT" icon={Layers}>
                        <ul className="space-y-1.5 text-sm text-slate-400 font-mono">
                            <li>vocabulary 640 (byte-level BPE)</li>
                            <li>context 64 tokens</li>
                            <li>d = 64, 4 heads of 16</li>
                            <li>3 blocks, FFN 256</li>
                            <li>trained on 12,000 stories</li>
                        </ul>
                    </Card>

                    <Misconception claim="A language model looks up answers in what it memorised.">
                        <p>There is no text stored anywhere in it: 195,136 numbers, and every prediction is the same sequence of lookups, matrix products, softmaxes and additions shown here. Switch off one layer&apos;s attention and those same numbers predict far worse: with layer 1&apos;s heads off, the top guess is right {pct(GPT_STATS.layerOff[0][1])} of the time instead of {pct(GPT_STATS.full[1])}.</p>
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
