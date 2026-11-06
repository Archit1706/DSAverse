"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Focus, Scissors, LayoutGrid, Combine, Shuffle as MixIcon, Table2, PowerOff, Scale,
    CheckCircle, XCircle, Wrench, Unplug, Shuffle,
} from 'lucide-react';
import { loadTinyGpt } from '@/lib/ml/tinyGpt';
import { forwardWith, nextTokenScore, attend } from '@/lib/ml/gptVariants';
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
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card, Segmented,
} from '@/components/ml/TourKit';

/* ── heads ─────────────────────────────────────────────────
   The tiny GPT has d = 64 and four heads of 16 per layer. Multi-head
   attention slices Q, K and V into four column blocks, runs scaled
   dot-product attention on each block separately, joins the four outputs
   and mixes them with W_O. `multiHead` below does exactly that on plain
   arrays; the tour checks it against the model's own trace. */

const D = 64, H = 4, HD = 16;
const LAYER = 0;

const PRESETS = [
    { label: 'Mia … She found', text: 'One day, Mia went to the park. She found a red ball' },
    { label: 'Ruby saw a cat', text: 'After lunch, Ruby saw a cat in the kitchen.' },
    { label: 'Ben and Zoe', text: 'One day, Ben and Zoe went to the farm. Ben was happy.' },
    { label: 'Lily lost her hat', text: 'Last week, Lily lost her blue hat. She was sad. She' },
];

/* Measured over 100 generated stories (seed 21, 5,849 predictions) and
   checked by the test suite. For each head: mean weight on the previous
   token, on itself and on the first token; mean distance looked back
   (Σⱼ wᵢⱼ (i − j)); mean largest weight; and next-token loss with that one
   head switched off (its output replaced by zeros). */
const BASE_LOSS = 0.328;
const STAT_STORIES = 100;
const HEAD_STATS = [
    { prev: 0.177, self: 0.069, first: 0.054, dist: 7.19, top: 0.535, off: 0.690 },
    { prev: 0.139, self: 0.046, first: 0.052, dist: 7.07, top: 0.455, off: 0.542 },
    { prev: 0.178, self: 0.084, first: 0.043, dist: 7.60, top: 0.354, off: 0.420 },
    { prev: 0.159, self: 0.106, first: 0.040, dist: 5.60, top: 0.527, off: 0.641 },
    { prev: 0.126, self: 0.105, first: 0.053, dist: 7.27, top: 0.551, off: 0.387 },
    { prev: 0.135, self: 0.114, first: 0.032, dist: 7.89, top: 0.445, off: 0.333 },
    { prev: 0.145, self: 0.066, first: 0.031, dist: 8.09, top: 0.448, off: 0.342 },
    { prev: 0.107, self: 0.092, first: 0.040, dist: 8.39, top: 0.487, off: 0.341 },
    { prev: 0.072, self: 0.090, first: 0.033, dist: 11.94, top: 0.339, off: 0.341 },
    { prev: 0.074, self: 0.067, first: 0.036, dist: 13.40, top: 0.294, off: 0.328 },
    { prev: 0.090, self: 0.070, first: 0.053, dist: 12.71, top: 0.315, off: 0.328 },
    { prev: 0.081, self: 0.132, first: 0.042, dist: 11.39, top: 0.294, off: 0.330 },
];

const ACTS = [
    { id: 1, label: 'One Head', icon: Focus },
    { id: 2, label: 'Split', icon: Scissors },
    { id: 3, label: 'Attend in Parallel', icon: LayoutGrid },
    { id: 4, label: 'Concatenate', icon: Combine },
    { id: 5, label: 'Mix with W_O', icon: MixIcon },
    { id: 6, label: 'What Heads Do', icon: Table2 },
    { id: 7, label: 'Switch One Off', icon: PowerOff },
    { id: 8, label: 'Same Cost', icon: Scale },
];

const num = (v, d = 2) => {
    const r = Math.round(v * 10 ** d) / 10 ** d;
    return `${r < 0 ? '−' : ''}${Math.abs(r).toFixed(d)}`;
};
const pct = (v) => `${Math.round(v * 100)}%`;
const clean = (t) => (t.trim() === '' ? '␣' : t.trim());
const tokText = (model, id) => model.tokenizer.tokenText(id) ?? model.tokenizer.tokenLabel(id);
const tokensOf = (model, ids) => ids.map(id => ({ id, text: tokText(model, id) }));
const withFuture = (rows) => rows.map((r, i) => r.map((v, j) => (j > i ? -Infinity : v)));
const cols = (rows, a, b) => rows.map(r => r.slice(a, b));
const matmulRows = (A, B) => A.map(r => B[0].map((_, c) => r.reduce((s, x, k) => s + x * B[k][c], 0)));
const range = (l, f, d) => { const v = HEAD_STATS.slice(l * 4, l * 4 + 4).map(x => x[f]); return `${num(Math.min(...v), d)} to ${num(Math.max(...v), d)}`; };
const headName = (k) => `L${Math.floor(k / 4) + 1}H${(k % 4) + 1}`;
const RANGES = [0, 1, 2, 3].map(h => `columns ${h * HD + 1}–${(h + 1) * HD}`);

/**
 * Multi-head attention on plain arrays: X [T, d], weights as [d, d] rows,
 * biases as length-d arrays. Split Q, K, V into `heads` column blocks,
 * attend in each (causal, scaled), concatenate, multiply by W_O.
 */
function multiHead(X, { wq, wk, wv, wo, bq, bk, bv, bo }, heads) {
    const d = X[0].length, hd = d / heads;
    const proj = (W, b) => matmulRows(X, W).map(r => r.map((v, c) => v + (b ? b[c] : 0)));
    const Q = proj(wq, bq), K = proj(wk, bk), Vv = proj(wv, bv);
    const outs = [];
    for (let h = 0; h < heads; h++) outs.push(attend(cols(Q, h * hd, (h + 1) * hd), cols(K, h * hd, (h + 1) * hd), cols(Vv, h * hd, (h + 1) * hd), { mask: true }));
    const concat = X.map((_, i) => outs.flatMap(o => o.out[i]));
    return { Q, K, V: Vv, outs, concat, out: matmulRows(concat, wo).map(r => r.map((v, c) => v + (bo ? bo[c] : 0))) };
}
const layerWeights = (model, l) => {
    const t = model.tensors, g = (n) => toRows(t[`h${l}.${n}`]), b = (n) => Array.from(t[`h${l}.${n}`].data);
    return { wq: g('wq'), wk: g('wk'), wv: g('wv'), wo: g('wo'), bq: b('bq'), bk: b('bk'), bv: b('bv'), bo: b('bo') };
};

/* The head prompts: before each head's own step, which 16 columns does it
   read? Each tour visits the four heads once, in a different order per
   sentence (a row of a Latin square), and the options are rotated so the
   answer sits at the next row's position. So every button is right once per
   tour, the button matching the head number is never right, and clicking
   buttons 1, 2, 3, 4 in turn is right a quarter of the time. */
const ORDERS = [[2, 0, 3, 1], [1, 3, 0, 2], [3, 1, 2, 0], [0, 2, 1, 3]];

function generateSteps(model, presetIndex) {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });
    const ids = model.tokenizer.encode(PRESETS[presetIndex].text);
    const T = ids.length;
    const tokens = tokensOf(model, ids);
    const run = forwardWith(model, ids);
    const blk = run.blocks[LAYER];
    const Wts = blk.heads.map(h => toRows(h.weights));
    const last = T - 1;
    const base = { tokens, T };

    const t4 = Wts[3][last], j4 = t4.indexOf(Math.max(...t4));
    s(1, 'One Head', { ...base, kind: 'one', W: withFuture(Wts[3]) },
        `One head gives every token one set of weights — one question it can ask of the sentence. Take layer 1's fourth head, the name-finding head from Self-Attention: from "${clean(tokens[last].text)}" it puts ${pct(t4[j4])} on "${clean(tokens[j4].text)}". But a token may need several things at once: who, what happened, which word came just before. One weight pattern cannot point at all of them.`);
    s(2, 'Split', { ...base, kind: 'split', Q: toRows(blk.q) },
        `Multi-head attention gives each token four smaller questions instead of one big one. Q, K and V are still made by [64, 64] matrices, then sliced by columns into four blocks of ${HD}: head 1 takes columns 1–16, head 2 columns 17–32, and so on. Nothing is copied; each head gets a different quarter.`);

    ORDERS[presetIndex].forEach((h, k) => {
        const row = Wts[h][last], jt = row.indexOf(Math.max(...row));
        const pos = ORDERS[(presetIndex + 1) % 4][k];
        const options = [0, 1, 2, 3].map(p => RANGES[(h + p - pos + 4) % 4]);
        s(3, 'Attend in Parallel', {
            ...base, kind: 'head-setup', h, k,
            ask: { question: `Head ${h + 1} is next. Which 16 of the 64 columns of Q, K and V does it use?`, options, correct: pos, because: `Head h takes block h: columns ${h * HD + 1} to ${(h + 1) * HD}. Its q · k and its blend use only those ${HD} numbers per token.` },
        }, `${k === 0 ? 'Each head now runs scaled dot-product attention on its own block, independently of the others. ' : ''}Next: head ${h + 1}.`);
        s(3, 'Attend in Parallel', { ...base, kind: 'head', h, W: withFuture(Wts[h]), Qh: cols(toRows(blk.q), h * HD, (h + 1) * HD) },
            `Head ${h + 1} uses columns ${h * HD + 1}–${(h + 1) * HD}: its own [${T}, ${HD}] queries, keys and values, and its own [${T}, ${T}] weights. From "${clean(tokens[last].text)}" it puts ${pct(row[jt])} on "${clean(tokens[jt].text)}". Over ${STAT_STORIES} stories it looks back ${num(HEAD_STATS[LAYER * 4 + h].dist, 1)} tokens on average.`);
    });

    const L = layerWeights(model, LAYER);
    const X = toRows(blk.ln1);
    const mh = multiHead(X, L, H);
    const outs = blk.heads.map(h => toRows(h.out));
    s(4, 'Concatenate', { ...base, kind: 'concat', outs, concat: mh.concat },
        `Each head returns [${T}, ${HD}]. Laid side by side they make [${T}, 64] again — the same width the layer started with, each quarter written by a different head.`);
    const model64 = toRows(blk.attnOut);
    let err = 0;
    mh.out.forEach((r, i) => r.forEach((v, c) => { err = Math.max(err, Math.abs(v - model64[i][c])); }));
    const contrib = [0, 1, 2, 3].map(h => {
        const part = matmulRows([outs[h][last]], L.wo.slice(h * HD, (h + 1) * HD))[0];
        return Math.hypot(...part);
    });
    s(5, 'Mix with W_O', { ...base, kind: 'mix', out: model64, contrib, err },
        `The joined output is multiplied by W_O [64, 64]. Each head's block meets its own 16 rows of W_O, so the result is a sum of four separate contributions — for "${clean(tokens[last].text)}" of sizes ${contrib.map(c => num(c, 2)).join(', ')}. Recomputed here from the layer's input, the output matches the model's own to within ${err.toExponential(0)}.`);

    s(6, 'What Heads Do', { ...base, kind: 'stats' },
        `What the twelve heads do on average, over ${STAT_STORIES} stories. Layer 1's heads look back ${range(0, 'dist', 1)} tokens on average; layer 3's look ${range(2, 'dist', 1)} back and spread their weight more (top weight ${range(2, 'top', 2)}). No head simply copies the previous token — at most ${pct(Math.max(...HEAD_STATS.map(x => x.prev)))} of a head's weight goes there.`);

    const sc = nextTokenScore(run.logits, ids).loss;
    const here = HEAD_STATS.map((_, k) => nextTokenScore(forwardWith(model, ids, { headsOff: [[Math.floor(k / 4), k % 4]] }).logits, ids).loss);
    const hk = here.reduce((b, x, k) => (x > here[b] ? k : b), 0);
    const worst = HEAD_STATS.reduce((b, x, k) => (x.off > HEAD_STATS[b].off ? k : b), 0);
    const least = HEAD_STATS.reduce((b, x, k) => (x.off < HEAD_STATS[b].off ? k : b), 0);
    s(7, 'Switch One Off', { ...base, kind: 'off', hk },
        `Replace one head's output with zeros and measure the damage. On this sentence the head that matters most is ${headName(hk)}: without it the loss goes from ${num(sc, 3)} to ${num(here[hk], 3)}. Over ${STAT_STORIES} stories the loss is ${num(BASE_LOSS, 3)} with every head; without ${headName(worst)} it is ${num(HEAD_STATS[worst].off, 3)}, more than double, while without ${headName(least)} it is ${num(HEAD_STATS[least].off, 3)}, so that head barely matters. Heads are not interchangeable.`);
    s(8, 'Same Cost', { ...base, kind: 'cost' },
        `Four heads cost nothing extra. W_Q, W_K, W_V and W_O are [64, 64] whether they serve one head of 64 or four of 16: ${4 * (D * D + D)} numbers per layer either way. The split changes what the numbers can do, not how many there are — four independent weight patterns per token instead of one.`);
    return steps;
}

const predictFor = (step, next) => (next && step.ask ? step.ask : null);

function formulaFor(step) {
    if (!step) return null;
    if (step.kind === 'split' || step.kind === 'head-setup') return String.raw`Q_h = Q_{[:,\ 16h+1\,:\,16h+16]}, \quad K_h,\ V_h \text{ likewise}`;
    if (step.kind === 'head') return String.raw`\text{head}_{${step.h + 1}} = \text{softmax}\!\left(\frac{Q_{${step.h + 1}} K_{${step.h + 1}}^\top}{\sqrt{16}} + M\right) V_{${step.h + 1}} \;\in\; \mathbb{R}^{${step.T} \times 16}`;
    if (step.kind === 'concat') return String.raw`\text{concat}(\text{head}_1, \dots, \text{head}_4) \;\in\; \mathbb{R}^{${step.T} \times 64}`;
    if (step.kind === 'mix') return String.raw`\text{MultiHead} = \text{concat}(\text{head}_1, \dots, \text{head}_4)\, W_O = \sum_{h=1}^{4} \text{head}_h\, W_O^{(h)}`;
    if (step.kind === 'cost') return String.raw`4 \times (64 \times 64 + 64) = ${4 * (D * D + D)}`;
    return null;
}

const quizQuestions = [
    {
        question: 'How do the four heads of a 64-wide layer get their queries?',
        options: [
            'Each head has its own [64, 64] W_Q, four times the parameters',
            'Q is computed once with a [64, 64] matrix and sliced into four blocks of 16 columns',
            'The heads share one query and differ only in their keys',
            'Each head reads a different quarter of the tokens',
        ],
        correct: 1,
        explanation: 'One [64, 64] projection, then a column split: head 1 gets columns 1–16, head 2 columns 17–32, and so on. Every head still sees every token.',
    },
    {
        question: 'What happens to the four heads\' outputs?',
        options: [
            'They are averaged',
            'Only the head with the largest weights is kept',
            'They are concatenated back to [T, 64] and multiplied by W_O',
            'They are added to the queries of the next head',
        ],
        correct: 2,
        explanation: 'concat(head₁, …, head₄) is [T, 64]; W_O mixes it. Equivalently, each head writes through its own 16 rows of W_O and the four contributions add up.',
    },
    {
        question: 'Why use four heads of 16 rather than one head of 64?',
        options: [
            'It has fewer parameters',
            'It gives each token four separate weight patterns, so it can attend to several things at once, for the same parameter count',
            'It removes the need for the causal mask',
            'It makes softmax unnecessary',
        ],
        correct: 1,
        explanation: 'The parameter count is the same. What changes is that each head computes its own softmax, so a token can put most of one head\'s weight on a name and most of another\'s on a nearby word.',
    },
];

const codeExample = `import torch

T, d, h = 14, 64, 4
mha = torch.nn.MultiheadAttention(embed_dim=d, num_heads=h, batch_first=True)
print(sum(p.numel() for p in mha.parameters()))   # W_Q, W_K, W_V, W_O and biases
x = torch.randn(1, T, d)
causal = torch.triu(torch.ones(T, T, dtype=torch.bool), 1)
out, weights = mha(x, x, x, attn_mask=causal, average_attn_weights=False)
print(out.shape, weights.shape)   # one [T, T] weight matrix per head
# 16640
# torch.Size([1, 14, 64]) torch.Size([1, 4, 14, 14])`;

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
const HEAD_COLORS = ['#818cf8', '#38bdf8', '#34d399', '#fbbf24'];
const labels = (tokens) => tokens.map(t => clean(t.text));

function Box({ title, shape, names, children }) {
    return (
        <div className="min-w-0">
            <Caption>{title} {shape && <ShapeTag shape={shape} names={names} />}</Caption>
            <div className="overflow-x-auto max-w-full">{children}</div>
        </div>
    );
}

function StatsTable({ highlight = [] }) {
    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-xs font-mono">
                <thead>
                    <tr className="text-slate-500 text-left">
                        <th className="py-1 pr-2 font-normal">head</th><th className="pr-2 font-normal">prev</th><th className="pr-2 font-normal">self</th>
                        <th className="pr-2 font-normal">first</th><th className="pr-2 font-normal">looks back</th><th className="pr-2 font-normal">top weight</th><th className="font-normal">loss if off</th>
                    </tr>
                </thead>
                <tbody>
                    {HEAD_STATS.map((x, k) => (
                        <tr key={k} className={`border-t border-slate-800 ${highlight.includes(k) ? 'text-amber-200' : 'text-slate-300'}`}>
                            <td className="py-1 pr-2" style={{ color: HEAD_COLORS[k % 4] }}>{headName(k)}</td>
                            <td className="pr-2">{pct(x.prev)}</td><td className="pr-2">{pct(x.self)}</td><td className="pr-2">{pct(x.first)}</td>
                            <td className="pr-2">{num(x.dist, 1)}</td><td className="pr-2">{num(x.top, 2)}</td>
                            <td>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="inline-block h-1.5 rounded bg-rose-400" style={{ width: `${Math.max(2, (x.off - BASE_LOSS) * 150)}px` }} />{num(x.off, 3)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2">{STAT_STORIES} stories; loss with every head on: {num(BASE_LOSS, 3)}.</p>
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    const L = labels(step.tokens);
    switch (step.kind) {
        case 'one':
            return <div className="w-full"><Box title="Layer 1, head 4 — one weight pattern per token" shape={[step.T, step.T]} names={['T', 'T']}><Heatmap data={step.W} rowLabels={L} colLabels={L} scale="sequential" domain={[0, 1]} cellSize={22} /></Box></div>;
        case 'split':
            return (
                <div className="w-full space-y-2">
                    <Caption>Q for layer 1 <ShapeTag shape={[step.T, 64]} names={['T', 'd']} /> sliced into four heads</Caption>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map(h => (
                            <div key={h} className="rounded-lg p-1.5 border" style={{ borderColor: HEAD_COLORS[h] }}>
                                <div className="text-[11px] mb-1" style={{ color: HEAD_COLORS[h] }}>head {h + 1} · {RANGES[h]}</div>
                                <div className="overflow-x-auto"><Heatmap data={cols(step.Q, h * HD, (h + 1) * HD)} rowLabels={h === 0 ? L : undefined} scale="diverging" domain={[-3, 3]} cellSize={8} ariaLabel={`Head ${h + 1} queries`} /></div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'head-setup':
            return (
                <div className="w-full space-y-2">
                    <Caption>Heads already shown and the next one</Caption>
                    <div className="flex flex-wrap gap-2">
                        {[0, 1, 2, 3].map(h => (
                            <span key={h} className={`px-3 py-1.5 rounded-lg border text-xs font-mono ${h === step.h ? 'text-white' : 'text-slate-500 border-slate-700'}`} style={h === step.h ? { borderColor: HEAD_COLORS[h] } : undefined}>head {h + 1}</span>
                        ))}
                    </div>
                </div>
            );
        case 'head':
            return (
                <div className="w-full grid md:grid-cols-[auto_1fr] gap-4 items-start">
                    <Box title={`Head ${step.h + 1}: Q columns ${step.h * HD + 1}–${(step.h + 1) * HD}`} shape={[step.T, HD]} names={['T', 'dₕ']}>
                        <Heatmap data={step.Qh} scale="diverging" domain={[-3, 3]} cellSize={9} ariaLabel="This head's queries" />
                    </Box>
                    <Box title={`Head ${step.h + 1} weights`} shape={[step.T, step.T]} names={['T', 'T']}>
                        <Heatmap data={step.W} rowLabels={L} colLabels={L} scale="sequential" domain={[0, 1]} cellSize={20} ariaLabel={`Head ${step.h + 1} weights`} />
                    </Box>
                </div>
            );
        case 'concat':
            return (
                <div className="w-full space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {step.outs.map((o, h) => (
                            <div key={h} className="rounded-lg p-1.5 border" style={{ borderColor: HEAD_COLORS[h] }}>
                                <div className="text-[11px] mb-1" style={{ color: HEAD_COLORS[h] }}>head {h + 1} output [{step.T}, 16]</div>
                                <div className="overflow-x-auto"><Heatmap data={o} scale="diverging" domain={[-1.5, 1.5]} cellSize={8} ariaLabel={`Head ${h + 1} output`} /></div>
                            </div>
                        ))}
                    </div>
                    <Box title="Joined" shape={[step.T, 64]} names={['T', 'd']}><Heatmap data={step.concat} rowLabels={L} scale="diverging" domain={[-1.5, 1.5]} cellSize={8} ariaLabel="Concatenated heads" /></Box>
                </div>
            );
        case 'mix':
            return (
                <div className="w-full space-y-3">
                    <Box title="After W_O" shape={[step.T, 64]} names={['T', 'd']}><Heatmap data={step.out} rowLabels={L} scale="diverging" domain={[-1.5, 1.5]} cellSize={8} ariaLabel="Attention output" /></Box>
                    <div className="max-w-md">
                        <Caption>Size of each head&apos;s contribution for &quot;{clean(step.tokens[step.T - 1].text)}&quot;</Caption>
                        <ProbBars items={step.contrib.map((c, h) => ({ label: `head ${h + 1}`, p: c }))} digits={2} accent="#818cf8" max={Math.max(...step.contrib)} ariaLabel="Head contributions" />
                    </div>
                </div>
            );
        case 'stats': return <StatsTable />;
        case 'off': return <StatsTable highlight={[step.hk]} />;
        case 'cost':
            return (
                <div className="w-full grid sm:grid-cols-2 gap-4 text-sm">
                    {[['One head of 64', '[64, 64]', 1], ['Four heads of 16', '[64, 64], sliced', 4]].map(([n, shape, h]) => (
                        <div key={n} className="rounded-lg border border-slate-700 p-4 space-y-1">
                            <div className="text-slate-200 font-semibold">{n}</div>
                            <div className="font-mono text-xs text-slate-400">W_Q, W_K, W_V, W_O: {shape}</div>
                            <div className="font-mono text-xs text-slate-400">weight patterns per token: {h}</div>
                            <div className="font-mono text-xs text-indigo-300">{(4 * (D * D + D)).toLocaleString('en-US')} numbers</div>
                        </div>
                    ))}
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
    const [off, setOff] = useState([]);
    const ids = useMemo(() => model.tokenizer.encode(text).slice(0, 40), [model, text]);
    const tokens = tokensOf(model, ids);
    const T = ids.length;
    const run = useMemo(() => forwardWith(model, ids, { headsOff: off.map(k => [Math.floor(k / 4), k % 4]) }), [model, ids, off]);
    const full = useMemo(() => (off.length ? forwardWith(model, ids) : run), [model, ids, off, run]);
    const sc = nextTokenScore(run.logits, ids), sc0 = nextTokenScore(full.logits, ids);
    const probs = (r) => softmax(Array.from(r.logits.data.subarray((T - 1) * r.logits.cols, T * r.logits.cols)));
    const p = probs(run);
    const top = p.map((x, id) => ({ id, p: x })).sort((a, b) => b.p - a.p).slice(0, 5);
    const toggle = (k) => setOff(o => (o.includes(k) ? o.filter(x => x !== k) : [...o, k]));
    const L = labels(tokens);
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Sentence:</span>
                    {PRESETS.map(pr => (
                        <button key={pr.label} onClick={() => setText(pr.text)} aria-pressed={text === pr.text}
                            className={`text-xs px-2.5 py-1 rounded-lg border ${text === pr.text ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-400 hover:border-indigo-500'}`}>{pr.label}</button>
                    ))}
                    <button onClick={() => { setText(generateStories(1, 500 + seed)[0]); setSeed(x => x + 1); }}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500"><Shuffle className="h-3.5 w-3.5" />Random story</button>
                </div>
                <TokenStrip tokens={tokens} size="sm" />
                <Segmented options={[0, 1, 2].map(l => [l, `Layer ${l + 1}`])} value={layer} onChange={setLayer} accent="indigo" ariaLabel="Layer" />
                <div className="grid sm:grid-cols-2 gap-3">
                    {run.blocks[layer].heads.map((h, k) => {
                        const isOff = off.includes(layer * 4 + k);
                        return (
                            <div key={k} className={`rounded-lg p-2 border ${isOff ? 'opacity-40' : ''}`} style={{ borderColor: HEAD_COLORS[k] }}>
                                <div className="text-[11px] mb-1" style={{ color: HEAD_COLORS[k] }}>head {k + 1}{isOff ? ' (off)' : ''}</div>
                                <div className="overflow-x-auto"><Heatmap data={withFuture(toRows(h.weights))} rowLabels={k % 2 === 0 ? L : undefined} scale="sequential" domain={[0, 1]} cellSize={Math.max(8, Math.min(16, Math.floor(260 / T)))} ariaLabel={`Layer ${layer + 1} head ${k + 1} weights`} /></div>
                            </div>
                        );
                    })}
                </div>
                <div className="max-w-md">
                    <Caption>Next token after the last one</Caption>
                    <ProbBars items={top.map(x => ({ label: clean(tokText(model, x.id)), p: x.p }))} chosen={0} accent="#818cf8" />
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Unplug className="h-4 w-4 text-amber-400" />Break it: switch heads off</h3>
                <div className="flex flex-wrap gap-1.5">
                    {HEAD_STATS.map((_, k) => (
                        <button key={k} onClick={() => toggle(k)} aria-pressed={off.includes(k)}
                            className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${off.includes(k) ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-amber-500'}`}>{headName(k)}</button>
                    ))}
                    {off.length > 0 && <button onClick={() => setOff([])} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                {off.length > 0 && (
                    <BreakNote>
                        With {off.map(headName).join(', ')} off, the loss on this text is {num(sc.loss, 3)} against {num(sc0.loss, 3)} with every head. Over {STAT_STORIES} stories, single heads range from {headName(HEAD_STATS.reduce((b, x, k) => (x.off > HEAD_STATS[b].off ? k : b), 0))} (loss {num(Math.max(...HEAD_STATS.map(x => x.off)), 3)}) to heads whose removal changes almost nothing.
                    </BreakNote>
                )}
                <StatsTable highlight={off} />
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function MultiHeadAttentionPage() {
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
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Multi-Head Attention</h1>
                    <p className="text-indigo-50 max-w-3xl">
                        Split 64 numbers into four heads of 16, let each attend on its own, join them and mix with W_O. The tiny GPT&apos;s real heads side by side — and what it loses when you switch one off.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/transformers/causal-masking" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Causal Masking</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'All twelve heads', MousePointer2]]} mode={mode}
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

                    <InCode title="Multi-head attention in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="Four steps" icon={LayoutGrid}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-slate-200">Project</span>: Q, K, V = X W, each [T, 64].</li>
                            <li><span className="text-slate-200">Split</span>: four column blocks of 16.</li>
                            <li><span className="text-slate-200">Attend</span>: softmax(QₕKₕᵀ / √16 + M) Vₕ, per head.</li>
                            <li><span className="text-slate-200">Join and mix</span>: concat to [T, 64], then × W_O.</li>
                        </ul>
                    </Card>

                    <Misconception claim="Four heads means four times the parameters.">
                        <p>The tiny GPT&apos;s W_Q is one [64, 64] matrix, and so are W_K, W_V and W_O: {(4 * (D * D + D)).toLocaleString('en-US')} numbers per layer, exactly what a single 64-wide head would use. The heads are slices, not copies — and they are far from equal: switching off {headName(0)} takes the loss from {num(BASE_LOSS, 3)} to {num(HEAD_STATS[0].off, 3)}, switching off {headName(9)} leaves it at {num(HEAD_STATS[9].off, 3)}.</p>
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
