"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Type, KeyRound, Calculator, Percent, Blend, Grid3x3, LayoutGrid, CheckCircle, XCircle,
    Lightbulb, AlertTriangle, RefreshCw, Loader2,
} from 'lucide-react';
import { loadTinyGpt, forward } from '@/lib/ml/tinyGpt';
import { get, row, dot, argmax, softmax } from '@/lib/ml/tensor';
import useLoaded from '@/lib/ml/useLoaded';
import Heatmap from '@/components/ml/Heatmap';
import TokenStrip from '@/components/ml/TokenStrip';
import ShapeTag from '@/components/ml/ShapeTag';
import ProbBars from '@/components/ml/ProbBars';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the head this page follows ────────────────────────────
   The tiny GPT (lib/ml/tinyGpt.js) has 3 layers of 4 heads. Layer 1's
   fourth head is the one with a nameable job: it looks back at the story's
   main character. Measured over 300 generated stories, when the query
   token is a pronoun its strongest weight lands on the right name 63% of
   the time, with 0.61 of its weight there on average; it does the same at
   a full stop, where a name or pronoun usually comes next. The presets are
   sentences where that shows clearly — and the Explore tab lets a learner
   find where it does not. */

const LAYER = 0;
const HEAD = 3;
const MAX_TOKENS = 40;
const NAMES = new Set(['Mia', 'Sam', 'Leo', 'Ava', 'Noah', 'Zoe', 'Max', 'Lily', 'Ben', 'Ella', 'Omar', 'Nina', 'Theo', 'Ruby', 'Kai', 'Iris']);
const PRONOUNS = new Set(['She', 'He', 'she', 'he']);

const PRESETS = [
    { label: 'Mia … She', text: 'One day, Mia went to the park. She found a red ball' },
    { label: 'Zoe and Ben … She', text: 'One day, Zoe and Ben went to the farm. Zoe was happy. She' },
    { label: 'Ben and Zoe … He', text: 'One day, Ben and Zoe went to the farm. Ben was happy. He' },
    { label: 'Ruby, a cat … She', text: 'After lunch, Ruby saw a cat in the kitchen. The cat was hungry. She' },
];

const ACTS = [
    { id: 1, label: 'Tokens', icon: Type },
    { id: 2, label: 'Q, K, V', icon: KeyRound },
    { id: 3, label: 'Scores', icon: Calculator },
    { id: 4, label: 'Softmax', icon: Percent },
    { id: 5, label: 'Blend', icon: Blend },
    { id: 6, label: 'Every token', icon: Grid3x3 },
    { id: 7, label: 'Heads', icon: LayoutGrid },
];

const clean = (t) => (t.trim() === '' ? '␣' : t.trim());
const quote = (t) => `“${clean(t)}”`;
const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const pct = (w) => `${Math.round(w * 100)}%`;
const texNum = (v, d = 2) => f(v, d).replace('−', '-');
const texTok = (t) => `\\text{${clean(t).replace(/[\\{}$&#%_^~]/g, c => `\\${c}`)}}`;

function tokensOf(model, ids) {
    return ids.map(id => ({ id, text: model.tokenizer.tokenText(id) ?? model.tokenizer.tokenLabel(id) }));
}

/** The largest weight row i gives any one token. */
const topWeight = (h, i) => Math.max(...row(h.weights, i).slice(0, i + 1));

/** The rows the "Every token" act visits besides the focus: this head's
    most decisive row, its most spread out and one in between, so the act
    shows the range a head really has — then walked left to right. Never
    the first four positions, which have too few earlier tokens to choose
    between. */
function otherQueries(h, T, focus) {
    const pool = [];
    for (let i = 4; i < T; i++) if (i !== focus) pool.push({ i, top: topWeight(h, i) });
    const byTop = [...pool].sort((a, b) => a.top - b.top || a.i - b.i);
    const picked = byTop.length <= 3 ? byTop : [byTop[0], byTop[Math.floor((byTop.length - 1) / 2)], byTop[byTop.length - 1]];
    return picked.map(p => p.i).sort((a, b) => a - b);
}

const generateSteps = (model, presetIndex) => {
    const text = PRESETS[presetIndex].text;
    const ids = model.tokenizer.encode(text);
    const run = forward(model, ids);
    const tokens = tokensOf(model, ids);
    const T = ids.length;
    const { d, heads } = model.config;
    const hd = d / heads;
    const hh = run.blocks[LAYER].heads[HEAD];
    const weightsRow = (i) => Array.from({ length: T }, (_, j) => (j <= i ? get(hh.weights, i, j) : null));
    const scoresRow = (i) => Array.from({ length: T }, (_, j) => get(hh.scores, i, j));
    const rawDot = (i, j) => dot(row(hh.q, i), row(hh.k, j));

    let focus = T - 1;
    for (let i = T - 1; i >= 0; i--) if (PRONOUNS.has(tokens[i].text.trim())) { focus = i; break; }
    const fw = weightsRow(focus).map(w => w ?? -1);
    const top = argmax(fw);
    const contrast = top === focus ? argmax(fw.map((w, j) => (j === top ? -1 : w))) : focus;
    const ft = tokens[focus].text, tt = tokens[top].text;

    const steps = [];
    const base = { run, tokens, T, d, hd, heads, presetIndex };
    const s = (act, data) => steps.push({ ...base, act, actName: ACTS[act - 1].label, ...data });

    s(1, {
        kind: 'tokens',
        explanation: `The sentence becomes ${T} tokens. Each token's row of X is its token embedding plus its position embedding — ${T} rows of ${d} numbers, so X has shape [${T}, ${d}]. Self-attention is how each row gets to borrow information from the rows before it.`,
    });
    s(2, {
        kind: 'qkv',
        explanation: `Layer 1 normalises each row (LayerNorm), then multiplies by three learned matrices: Q = X·W_Q, K = X·W_K and V = X·W_V, each [${T}, ${d}]. The ${d} columns are cut into ${heads} heads of ${hd}, and every head attends on its own. This tour follows head ${HEAD + 1}.`,
    });
    s(2, {
        kind: 'head',
        explanation: `Head ${HEAD + 1}'s slice: Q, K and V, each [${T}, ${hd}]. A token's query says what it is looking for, its key says what it can be found by, and its value is what it hands over if it is picked.`,
    });
    const dotStep = (j, lead) => {
        const raw = rawDot(focus, j), score = raw / Math.sqrt(hd);
        s(3, {
            kind: 'dot', query: focus, key: j, raw, score,
            explanation: `${lead} Multiply the query of ${quote(ft)} by the key of ${quote(tokens[j].text)}, entry by entry, and add: q · k = ${f(raw)}. Divide by √${hd} = ${Math.sqrt(hd)} to get the score: ${f(score)}.`,
        });
    };
    dotStep(top, `Follow one token: ${quote(ft)}, at position ${focus + 1}. Which earlier token should it borrow from?`);
    dotStep(contrast, `Now the same with ${quote(tokens[contrast].text)}${contrast === focus ? ' — its own key' : ''}.`);
    s(3, {
        kind: 'row', query: focus,
        explanation: `Do that against every token up to ${quote(ft)}: ${focus + 1} scores. Tokens after it get no score at all — in a GPT a token may only look back, so those cells are set to −∞ (the causal mask). The highest score is ${f(get(hh.scores, focus, top))}, for ${quote(tt)}.`,
    });
    const foundName = NAMES.has(clean(tt)) && PRONOUNS.has(clean(ft));
    s(4, {
        kind: 'softmax', query: focus,
        explanation: `Softmax turns the scores into weights that are positive and add up to 1: w = e^score / Σ e^score. The biggest score, for ${quote(tt)}, takes ${pct(fw[top])} of the weight${foundName ? ` — ${quote(ft)} has found the person it refers to` : ''}. Softmax never changes the order; it decides how decisive the winner is.`,
    });
    const terms = fw.map((w, j) => [w, j]).filter(([w]) => w >= 0).sort((a, b) => b[0] - a[0]);
    s(5, {
        kind: 'blend', query: focus,
        explanation: fw[top] > 0.6
            ? `The output for ${quote(ft)} is the weighted average of the value vectors: ${terms.slice(0, 3).map(([w, j]) => `${f(w)} × v(${clean(tokens[j].text)})`).join(' + ')} + …. With ${pct(fw[top])} on ${quote(tt)} it is almost exactly the value of ${quote(tt)}: information about ${clean(tt)} has been copied to the position of ${quote(ft)}, where the next word is predicted.`
            : `The output for ${quote(ft)} is the weighted average of the value vectors: ${terms.slice(0, 3).map(([w, j]) => `${f(w)} × v(${clean(tokens[j].text)})`).join(' + ')} + …. No single token dominates, so the output is a genuine blend.`,
    });
    s(6, {
        kind: 'matrix', query: focus,
        explanation: `Every token does this at once. Stack the queries and it is three matrix products: scores = QKᵀ/√${hd} is [${T}, ${T}], mask, softmax each row, then weights × V gives [${T}, ${hd}] — one blended row per token. The highlighted row is the one you just followed; next come this head's most decisive row, its most spread out, and one in between. Click any cell to see its arithmetic.`,
    });
    otherQueries(hh, T, focus).forEach((i) => {
        const w = weightsRow(i).map(x => x ?? -1);
        const best = argmax(w);
        const qt = tokens[i].text, bt = tokens[best].text;
        s(6, {
            kind: 'row', query: i,
            explanation: `Another row: ${quote(qt)} at position ${i + 1}, scored against the ${i + 1} tokens it can see.`,
        });
        let tail = '.';
        if (NAMES.has(clean(bt)) && best !== i) tail = ' — this head points at a name again.';
        else if (best === i) tail = ' — mostly itself.';
        if (w[best] < 0.5) tail += ' No token gets half the weight: the output is a blend.';
        s(6, {
            kind: 'softmax', query: i,
            explanation: `${quote(qt)} puts ${pct(w[best])} of its weight on ${quote(bt)}${tail}`,
        });
    });
    s(7, {
        kind: 'heads',
        explanation: `Layer 1 runs ${heads} heads side by side, each with its own W_Q, W_K and W_V, so each learns a different pattern. Head ${HEAD + 1}'s pattern — pointing at the main character — is the easiest to put into words; most heads, in most models, are much harder to describe. Their four [${T}, ${hd}] outputs are joined back into [${T}, ${d}], mixed by W_O and added to each token's row. Switch to Explore to try your own sentences.`,
    });
    return steps;
};

/* ── predict ───────────────────────────────────────────────
   Asked before each softmax: how much of the weight will the top score
   take? Which token wins is never in doubt (softmax keeps the order, and
   this head nearly always picks a name), so that question would answer
   itself. How decisively it wins is the real skill: it depends only on the
   gaps between the scores on screen, e^gap. Rows whose answer sits within
   0.04 of a bucket edge are skipped — the one-decimal scores cannot settle
   them. */
const WEIGHT_CUTS = [0.3, 0.6, 0.9];
const WEIGHT_BUCKETS = ['Under 30%', '30% to 60%', '60% to 90%', 'Over 90%'];

const predictFor = (step, next) => {
    if (!next || next.kind !== 'softmax' || step.kind !== 'row' || step.query !== next.query) return null;
    const i = next.query;
    const scores = Array.from({ length: i + 1 }, (_, j) => get(next.run.blocks[LAYER].heads[HEAD].scores, i, j));
    const best = argmax(scores);
    const rest = scores.reduce((a, s, j) => (j === best ? a : a + Math.exp(s - scores[best])), 0);
    const w = 1 / (1 + rest);
    if (WEIGHT_CUTS.some(c => Math.abs(w - c) < 0.04)) return null;
    const gap = scores[best] - Math.max(...scores.filter((_, j) => j !== best));
    return {
        question: `Softmax is next. ${quote(next.tokens[best].text)} has the top score in this row. How much of the weight from ${quote(next.tokens[i].text)} will it get?`,
        options: WEIGHT_BUCKETS,
        correct: WEIGHT_CUTS.filter(c => w >= c).length,
        because: `It leads the runner-up by ${f(gap, 1)}. Each other token adds e^(its score − ${f(scores[best], 1)}) to the denominator; here those add up to ${f(rest)}, so the top weight is 1 / (1 + ${f(rest)}) = ${pct(w)}. A lead of 1 is a factor of e ≈ 2.7; a lead of 3, a factor of 20.`,
    };
};

/** The formula for the step on screen, with its live values. */
function formulaFor(step) {
    const { T, d, hd, tokens } = step;
    if (step.kind === 'tokens') return String.raw`X = E_{\text{token}} + E_{\text{position}} \;\in\; \mathbb{R}^{${T} \times ${d}}`;
    if (step.kind === 'qkv') return String.raw`Q = \mathrm{LN}(X)\,W_Q,\quad K = \mathrm{LN}(X)\,W_K,\quad V = \mathrm{LN}(X)\,W_V \qquad [${T},\, ${d}]`;
    if (step.kind === 'head') return String.raw`Q_{${HEAD + 1}},\; K_{${HEAD + 1}},\; V_{${HEAD + 1}} \;\in\; \mathbb{R}^{${T} \times ${hd}}`;
    if (step.kind === 'dot') {
        return String.raw`s = \frac{q_{${texTok(tokens[step.query].text)}} \cdot k_{${texTok(tokens[step.key].text)}}}{\sqrt{${hd}}} = \frac{${texNum(step.raw)}}{${Math.sqrt(hd)}} = ${texNum(step.score)}`;
    }
    if (step.kind === 'row') return String.raw`s_j = \frac{q_i \cdot k_j}{\sqrt{d_k}} \;\; (j \le i), \qquad s_j = -\infty \;\; (j > i)`;
    const hh = step.run.blocks[LAYER].heads[HEAD];
    if (step.kind === 'softmax') {
        const i = step.query;
        const sc = Array.from({ length: i + 1 }, (_, j) => get(hh.scores, i, j));
        const best = argmax(sc);
        const max = sc[best];
        const sum = sc.reduce((a, x) => a + Math.exp(x - max), 0);
        return String.raw`w_{${texTok(tokens[best].text)}} = \frac{e^{${texNum(sc[best])}}}{\sum_{j \le i} e^{s_j}} = \frac{e^{0}}{\sum_{j} e^{s_j - ${texNum(max)}}} = \frac{1}{${texNum(sum, 3)}} = ${texNum(1 / sum, 3)}`;
    }
    if (step.kind === 'blend') {
        const i = step.query;
        const ws = Array.from({ length: i + 1 }, (_, j) => [get(hh.weights, i, j), j]).sort((a, b) => b[0] - a[0]).slice(0, 3);
        return String.raw`\text{out}_{${texTok(tokens[i].text)}} = \sum_{j} w_j\, v_j = ${ws.map(([w, j]) => `${texNum(w)}\\,v_{${texTok(tokens[j].text)}}`).join(' + ')} + \cdots`;
    }
    if (step.kind === 'matrix') return String.raw`\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\!\left(\frac{QK^{\top}}{\sqrt{${hd}}} + M\right) V \qquad [${T},${T}] \cdot [${T},${hd}] = [${T},${hd}]`;
    return String.raw`\mathrm{MultiHead}(X) = \big[\,\text{head}_1;\ \text{head}_2;\ \text{head}_3;\ \text{head}_4\,\big]\, W_O \qquad [${T},${d}]`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'In self-attention, what is the score between token i and an earlier token j?',
        options: [
            'How many words apart the two tokens are',
            'The dot product of i’s query with j’s key, divided by √dₖ',
            'How often the two words appeared together in the training data',
            'The dot product of i’s value with j’s value',
        ],
        correct: 1,
        explanation: 'Each token’s query is compared with every visible token’s key: s = q · k / √dₖ. A large score means the key matches what the query is looking for. Distance plays no direct part — position only enters through the embeddings.',
    },
    {
        question: 'After softmax, what is true of one row of attention weights?',
        options: [
            'Exactly one weight is 1 and the rest are 0',
            'Some weights can be negative',
            'They are positive and add up to 1, so the output is a weighted average of the value vectors',
            'They add up to the number of tokens',
        ],
        correct: 2,
        explanation: 'Softmax makes every weight positive and the row sum to 1. The output is a blend of value vectors — sometimes dominated by one token, as with “She” and “Mia”, often spread over several.',
    },
    {
        question: 'In a GPT-style model, why is the weight from a token to any later token exactly 0?',
        options: [
            'Their scores are set to −∞ before softmax (the causal mask), so a token can never see the future',
            'Later tokens have zero vectors until they are generated',
            'The model learned during training that later words do not matter',
            'Softmax always gives the last positions a weight of 0',
        ],
        correct: 0,
        explanation: 'During training the model predicts every position at once, so position i must not see the token it is trying to predict. Setting those scores to −∞ makes e^score = 0, and the weights come out exactly 0.',
    },
];

const codeExample = `import torch
import torch.nn.functional as F

T, d, d_k = 14, 64, 16                  # tokens, model width, head width
x = torch.randn(T, d)                   # one row per token
W_q, W_k, W_v = (torch.randn(d, d_k) for _ in range(3))

q, k, v = x @ W_q, x @ W_k, x @ W_v     # [T, d_k] each
scores = q @ k.T / d_k ** 0.5           # [T, T]: every query against every key
mask = torch.triu(torch.ones(T, T, dtype=torch.bool), diagonal=1)
scores = scores.masked_fill(mask, float("-inf"))   # no looking ahead
weights = F.softmax(scores, dim=-1)     # each row adds up to 1
out = weights @ v                       # [T, d_k]: each token's blend of values

# PyTorch's fused version computes the same thing:
same = F.scaled_dot_product_attention(q, k, v, is_causal=True)`;

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
                    className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-indigo-500';
                    if (quizState.answered) {
                        if (i === q.correct) tone = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) tone = 'border-red-500 bg-red-500/10 text-red-300';
                        else tone = 'border-slate-800 text-slate-500';
                    }
                    return (
                        <button key={opt} onClick={() => answer(i)} disabled={quizState.answered}
                            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors flex items-start gap-2 ${tone}`}>
                            {quizState.answered && i === q.correct && <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                            {quizState.answered && i === quizState.selected && i !== q.correct && <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                            <span>{opt}</span>
                        </button>
                    );
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{q.explanation}</p>
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── scenes ─────────────────────────────────────────────── */

const labelsOf = (tokens) => tokens.map((t, i) => `${clean(t.text)}·${i + 1}`);

function Caption({ children }) {
    return <p className="text-[11px] text-slate-500 mt-1.5">{children}</p>;
}

/* Softmax turns the masked scores into exact zeros; mark them -Infinity
   again so the heatmap hatches the future instead of colouring it "0". */
const maskedWeights = (h) => Array.from({ length: h.weights.rows }, (_, i) => row(h.weights, i).map((w, j) => (j > i ? -Infinity : w)));

/** The step's picture. Scenes share the forward pass the step carries. */
function VisualizationPanel({ step, onCell }) {
    const { run, tokens, T, d, hd } = step;
    const labels = labelsOf(tokens);
    const blk = run.blocks[LAYER];
    const hh = blk.heads[HEAD];
    const i = step.query;

    if (step.kind === 'tokens') {
        return (
            <div className="space-y-4 w-full">
                <TokenStrip tokens={tokens} ariaLabel="The sentence as tokens" />
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">X = token embedding + position embedding <ShapeTag names={['T', 'd']} shape={[T, d]} /></div>
                <Heatmap data={blk.input} scale="diverging" cellSize={9} showValues={false} ariaLabel="X, one row of 64 numbers per token" />
                <Caption>Row n is token n. Orange is negative, blue positive. Nobody chose these numbers: they were learned in training.</Caption>
            </div>
        );
    }
    if (step.kind === 'qkv') {
        return (
            <div className="space-y-3 w-full">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">Q = LN(X)·W_Q, cut into four heads <ShapeTag names={['T', 'd']} shape={[T, d]} /></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {run.blocks[LAYER].heads.map((h, k) => (
                        <div key={k} className={`rounded-lg p-1.5 border ${k === HEAD ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-800'}`}>
                            <div className={`text-[11px] mb-1 ${k === HEAD ? 'text-indigo-200 font-semibold' : 'text-slate-500'}`}>head {k + 1} · columns {k * hd + 1}–{(k + 1) * hd}</div>
                            <Heatmap data={h.q} scale="diverging" cellSize={8} showValues={false} ariaLabel={`Head ${k + 1}'s queries`} />
                        </div>
                    ))}
                </div>
                <Caption>K and V are cut the same way. Each head works only with its own {hd} columns.</Caption>
            </div>
        );
    }
    if (step.kind === 'head') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                {[['Q', hh.q, 'what each token looks for'], ['K', hh.k, 'what each token can be found by'], ['V', hh.v, 'what each token hands over']].map(([name, m, sub]) => (
                    <div key={name} className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-indigo-200">{name}</span><ShapeTag names={['T', 'dₖ']} shape={m} />
                        </div>
                        <Heatmap data={m} rowLabels={labels} scale="diverging" cellSize={11} showValues={false} ariaLabel={`Head ${HEAD + 1}'s ${name}`} />
                        <Caption>{sub}</Caption>
                    </div>
                ))}
            </div>
        );
    }
    if (step.kind === 'dot') {
        const qv = row(hh.q, i), kv = row(hh.k, step.key);
        return (
            <div className="space-y-3 w-full">
                <Heatmap data={[qv, kv, qv.map((x, n) => x * kv[n])]} scale="diverging" cellSize={34} format={(v) => f(v, 1)}
                    rowLabels={[`q ${clean(tokens[i].text)}`, `k ${clean(tokens[step.key].text)}`, 'q × k']}
                    ariaLabel="The query, the key and their entry-by-entry product" />
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300 font-mono">
                    <span>sum = {f(step.raw)}</span><span className="text-slate-500">÷ √{hd}</span><span className="text-indigo-200">score = {f(step.score)}</span>
                </div>
            </div>
        );
    }
    if (step.kind === 'row' || step.kind === 'softmax') {
        const scores = Array.from({ length: T }, (_, j) => get(hh.scores, i, j));
        const weights = Array.from({ length: T }, (_, j) => (j <= i ? get(hh.weights, i, j) : null));
        return (
            <div className="space-y-3 w-full">
                <TokenStrip tokens={tokens} selected={i} weights={step.kind === 'softmax' ? weights : undefined} showIds={false}
                    ariaLabel={step.kind === 'softmax' ? `Tokens shaded by how much weight ${clean(tokens[i].text)} gives them` : 'The tokens'} />
                <div>
                    <div className="text-xs text-slate-400 mb-1">scores for {quote(tokens[i].text)} — hatched cells are masked</div>
                    <Heatmap data={[scores]} colLabels={labels} scale="diverging" cellSize={36} format={(v) => f(v, 1)} ariaLabel="One row of scores" />
                </div>
                {step.kind === 'softmax' && (
                    <div>
                        <div className="text-xs text-slate-400 mb-1">weights after softmax — they add up to 1</div>
                        <Heatmap data={[weights.map(w => w ?? -Infinity)]} colLabels={labels} scale="sequential" domain={[0, 1]} cellSize={36} ariaLabel="One row of attention weights" />
                    </div>
                )}
            </div>
        );
    }
    if (step.kind === 'blend') {
        const ws = Array.from({ length: i + 1 }, (_, j) => get(hh.weights, i, j));
        const out = row(hh.out, i);
        return (
            <div className="space-y-3 w-full">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">value vectors, each labelled with its weight <ShapeTag names={['dₖ']} shape={[hd]} /></div>
                <Heatmap data={ws.map((_, j) => row(hh.v, j))} rowLabels={ws.map((w, j) => `${f(w)} × ${clean(tokens[j].text)}`)}
                    scale="diverging" cellSize={22} showValues={false} highlightRow={argmax(ws)} ariaLabel="Value vectors with their weights" />
                <div className="text-xs text-slate-400">= the output for {quote(tokens[i].text)}</div>
                <Heatmap data={[out]} rowLabels={[`out ${clean(tokens[i].text)}`]} scale="diverging" cellSize={22} showValues={false} ariaLabel="The blended output" />
            </div>
        );
    }
    if (step.kind === 'matrix') {
        return (
            <div className="space-y-2 w-full">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">attention weights, head {HEAD + 1} <ShapeTag names={['T', 'T']} shape={[T, T]} /></div>
                <Heatmap data={maskedWeights(hh)} rowLabels={labels} colLabels={labels} domain={[0, 1]} cellSize={26}
                    highlightRow={i} onSelect={onCell} ariaLabel="Attention weights: rows are queries, columns are keys" />
                <Caption>Row = the token asking, column = the token it looks at. The upper triangle is the future, masked.</Caption>
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {blk.heads.map((h, k) => (
                <div key={k} className={`rounded-lg p-2 border min-w-0 ${k === HEAD ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-800'}`}>
                    <div className={`text-xs mb-1 ${k === HEAD ? 'text-indigo-200 font-semibold' : 'text-slate-400'}`}>Layer 1 · head {k + 1}{k === HEAD ? ' — the name finder' : ''}</div>
                    <Heatmap data={maskedWeights(h)} domain={[0, 1]} cellSize={12} showValues={false} ariaLabel={`Head ${k + 1}'s attention weights`} />
                </div>
            ))}
        </div>
    );
}

/* ── explore ────────────────────────────────────────────── */

function Explore({ model, initial }) {
    const [text, setText] = useState(initial.text);
    const [layer, setLayer] = useState(initial.layer);
    const [head, setHead] = useState(initial.head);
    const [sel, setSel] = useState(initial.sel);
    const [unscaled, setUnscaled] = useState(false);

    const allIds = useMemo(() => model.tokenizer.encode(text), [model, text]);
    const ids = allIds.slice(0, MAX_TOKENS);
    const T = ids.length;
    const run = useMemo(() => (ids.length ? forward(model, ids, { unscaled }) : null), [model, ids.join(','), unscaled]); // eslint-disable-line react-hooks/exhaustive-deps
    const scaledRun = useMemo(() => (ids.length && unscaled ? forward(model, ids) : run), [model, ids.join(','), unscaled, run]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!run) {
        return (
            <div className="space-y-3">
                <ExploreInput text={text} setText={setText} />
                <p className="text-sm text-slate-400">Type something to run it through the model.</p>
            </div>
        );
    }
    const tokens = tokensOf(model, ids);
    const labels = labelsOf(tokens);
    const { d, heads } = model.config;
    const hd = d / heads;
    const hh = run.blocks[layer].heads[head];
    const i = Math.min(sel?.i ?? T - 1, T - 1);
    const j = Math.min(sel?.j ?? 0, i);
    const qv = row(hh.q, i), kv = row(hh.k, j);
    const raw = dot(qv, kv);
    const score = get(hh.scores, i, j);
    const rowScores = Array.from({ length: i + 1 }, (_, n) => get(hh.scores, i, n));
    const mx = Math.max(...rowScores);
    const denom = rowScores.reduce((a, x) => a + Math.exp(x - mx), 0);
    const w = get(hh.weights, i, j);
    const weightsRow = Array.from({ length: T }, (_, n) => (n <= i ? get(hh.weights, i, n) : null));
    const probs = softmax(row(run.logits, T - 1));
    const top = probs.map((p, id) => ({ id, p })).sort((a, b) => b.p - a.p).slice(0, 6);
    const normalProbs = softmax(row(scaledRun.logits, T - 1));
    const entropy = (h) => {
        let total = 0;
        for (let r = 1; r < T; r++) for (let c = 0; c <= r; c++) { const x = get(h.weights, r, c); if (x > 0) total -= x * Math.log(x); }
        return total / Math.max(1, T - 1);
    };

    return (
        <div className="space-y-4">
            <ExploreInput text={text} setText={(t) => { setText(t); setSel(null); }} />
            {allIds.length > MAX_TOKENS && <p className="text-xs text-amber-300">Only the first {MAX_TOKENS} of {allIds.length} tokens are shown.</p>}
            <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900 text-xs" role="tablist" aria-label="Layer">
                    {Array.from({ length: model.config.layers }, (_, l) => (
                        <button key={l} role="tab" aria-selected={layer === l} onClick={() => setLayer(l)}
                            className={`px-2.5 py-1 rounded-md ${layer === l ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Layer {l + 1}</button>
                    ))}
                </div>
                <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900 text-xs" role="tablist" aria-label="Head">
                    {Array.from({ length: heads }, (_, h) => (
                        <button key={h} role="tab" aria-selected={head === h} onClick={() => setHead(h)}
                            className={`px-2.5 py-1 rounded-md ${head === h ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Head {h + 1}</button>
                    ))}
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 ml-auto cursor-pointer">
                    <input type="checkbox" checked={unscaled} onChange={e => setUnscaled(e.target.checked)} className="accent-indigo-500" />
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it: drop the ÷√{hd}
                </label>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-slate-400">Layer {layer + 1}, head {head + 1}: rows ask, columns answer</span>
                    <ShapeTag names={['T', 'T']} shape={[T, T]} />
                </div>
                <Heatmap data={maskedWeights(hh)} rowLabels={labels} colLabels={labels} domain={[0, 1]} cellSize={T > 20 ? 18 : 26}
                    selected={{ i, j }} highlightRow={i} onSelect={(r, c) => setSel({ i: r, j: Math.min(c, r) })}
                    ariaLabel={`Attention weights for layer ${layer + 1}, head ${head + 1}`} />
                <p className="text-[11px] text-slate-500 mt-1.5">Click a cell, or use the arrow keys. Average spread of this head on this text: {entropy(hh).toFixed(2)} nats (0 means every token looks at exactly one other).</p>
            </div>

            {unscaled && (
                <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                    Without the ÷√{hd}, every score is {Math.sqrt(hd)}× larger, so softmax piles most of each row&apos;s weight onto its top token and much of the blending is lost — watch the average spread above fall. The model was trained with the scaling, so its next-word guess changes too: {quote(model.tokenizer.tokenText(top[0].id) ?? '')} gets {pct(top[0].p)} now, against {pct(normalProbs[top[0].id])} with it.
                </p>
            )}

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">{quote(tokens[i].text)} → {quote(tokens[j].text)}, step by step</h3>
                <Heatmap data={[qv, kv, qv.map((x, n) => x * kv[n])]} scale="diverging" cellSize={34} format={(v) => f(v, 1)}
                    rowLabels={[`q ${clean(tokens[i].text)}`, `k ${clean(tokens[j].text)}`, 'q × k']} ariaLabel="Query, key and their product" />
                <div className="text-slate-100 text-sm">
                    <Tex block>{String.raw`s = \frac{q \cdot k}{${unscaled ? '1' : `\\sqrt{${hd}}`}} = \frac{${texNum(raw)}}{${unscaled ? 1 : Math.sqrt(hd)}} = ${texNum(score)}, \qquad w = \frac{e^{s - ${texNum(mx)}}}{\sum_{n \le ${i + 1}} e^{s_n - ${texNum(mx)}}} = \frac{${texNum(Math.exp(score - mx), 3)}}{${texNum(denom, 3)}} = ${texNum(w, 3)}`}</Tex>
                </div>
                <div>
                    <div className="text-xs text-slate-400 mb-1.5">Where {quote(tokens[i].text)} looks — click a token to make it the asker</div>
                    <TokenStrip tokens={tokens} selected={i} weights={weightsRow} showIds={false} onSelect={(n) => setSel({ i: n, j: argmax(Array.from({ length: n + 1 }, (_, c) => get(hh.weights, n, c))) })} />
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                <h3 className="text-sm font-semibold text-white mb-2">After all {model.config.layers} layers: the model&apos;s guess for the next token</h3>
                <ProbBars items={top.map(({ id, p }) => ({ label: model.tokenizer.tokenText(id) ?? model.tokenizer.tokenLabel(id), p }))} accent="#818cf8" />
            </div>
        </div>
    );
}

function ExploreInput({ text, setText }) {
    return (
        <div className="space-y-2">
            <input value={text} onChange={e => setText(e.target.value.slice(0, 200))} aria-label="Text to run through the model"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
            <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => (
                    <button key={p.label} onClick={() => setText(p.text)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500">{p.label}</button>
                ))}
            </div>
            <p className="text-[11px] text-slate-500">The model only knows the simple stories it was trained on — names like Mia, Leo, Zoe and Ben, parks, balls, cats. Other text still runs, but its attention means less.</p>
        </div>
    );
}

function Skeleton() {
    return (
        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6 space-y-4" aria-busy="true">
            <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading the tiny GPT — 390 KB of weights, fetched once</div>
            <div className="flex flex-wrap gap-1.5">{Array.from({ length: 12 }, (_, k) => <div key={k} className="h-9 w-14 rounded-md bg-slate-800 animate-pulse" />)}</div>
            <div className="h-64 rounded-lg bg-slate-800/70 animate-pulse" />
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function SelfAttentionPage() {
    const { data: model, error, retry } = useLoaded(loadTinyGpt);
    const [mode, setMode] = useState('guided');            // 'guided' | 'explore'
    const [presetIndex, setPresetIndex] = useState(0);
    const stepHistory = useMemo(() => (model ? generateSteps(model, presetIndex) : []), [model, presetIndex]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1800);
    const [explore, setExplore] = useState({ text: PRESETS[0].text, layer: LAYER, head: HEAD, sel: null, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided' || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(stepHistory.findIndex(s => s.act === act)); };
    const choosePreset = (k) => { setPresetIndex(k); setIsPlaying(false); };

    /* Clicking a cell during the tour switches to Explore on the same
       sentence and head, with that cell selected, so nothing jumps. */
    const takeOver = (i, j) => {
        setExplore(e => ({ text: PRESETS[presetIndex].text, layer: LAYER, head: HEAD, sel: { i, j: Math.min(i, j) }, key: e.key + 1 }));
        setMode('explore');
        setIsPlaying(false);
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/transformers" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Transformers
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Self-Attention</h1>
                    <p className="text-indigo-100 max-w-3xl">
                        Each token rebuilds itself from the tokens it finds relevant. Watch one head of a real, trained model work out who &ldquo;She&rdquo; is — every number computed in your browser.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Dot Product', '/vectors/dot-product'], ['Matrix Multiplication', '/linear-algebra/matrix-multiplication']].map(([name, href]) => (
                            <Link key={href} href={href} className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">{name}</Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                            {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                <button key={key} role="tab" aria-selected={mode === key}
                                    onClick={() => { setMode(key); setIsPlaying(false); }}
                                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                    <Icon className="h-4 w-4" />{label}
                                </button>
                            ))}
                        </div>
                        <SourceChip kind="toy">Tiny GPT · 195K parameters · trained on 12,000 simple stories</SourceChip>
                    </div>

                    {error ? (
                        <div className="bg-slate-900/70 rounded-xl border border-rose-500/30 p-6 space-y-3">
                            <p className="text-sm text-rose-200">The model&apos;s weights could not be loaded ({error.message}).</p>
                            <button onClick={retry} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white">
                                <RefreshCw className="h-4 w-4" />Try again
                            </button>
                        </div>
                    ) : !model || !step ? (
                        <Skeleton />
                    ) : mode === 'explore' ? (
                        <Explore key={explore.key} model={model} initial={explore} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Sentence:</span>
                                {PRESETS.map((p, k) => (
                                    <button key={p.label} onClick={() => choosePreset(k)} aria-pressed={presetIndex === k}
                                        className={`text-xs px-2.5 py-1 rounded-lg border ${presetIndex === k ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-400 hover:border-indigo-500'}`}>{p.label}</button>
                                ))}
                            </div>
                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="flex flex-wrap gap-1.5 px-4 pt-4" role="tablist" aria-label="Acts">
                                    {ACTS.map(act => {
                                        const Icon = act.icon;
                                        const tone = act.id === step.act
                                            ? 'bg-indigo-500/20 text-indigo-100 border-indigo-400/50'
                                            : act.id < step.act ? 'bg-slate-800/60 text-slate-400 border-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300';
                                        return (
                                            <button key={act.id} role="tab" aria-selected={act.id === step.act} onClick={() => jumpToAct(act.id)}
                                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${tone}`}>
                                                <Icon className="h-3.5 w-3.5" />{act.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="h-0.5 bg-slate-800 mt-3">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all" style={{ width: `${(currentStep / (stepHistory.length - 1)) * 100}%` }} />
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    <div className="min-h-[300px] flex items-center">
                                        <VisualizationPanel step={step} onCell={takeOver} />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-4">
                                        <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                        <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                        <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40">
                                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                        </button>
                                        <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                        <PredictToggle predict={predict} accent="indigo" />
                                        <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                            Speed
                                            <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-indigo-500" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {predict.prompt && <PredictPrompt predict={predict} accent="indigo" />}

                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-indigo-200 text-sm leading-relaxed">
                                        {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-slate-100 text-sm sm:text-base">
                                <Tex block>{formulaFor(step)}</Tex>
                            </div>
                        </>
                    )}

                    <InCode title="Self-attention in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">One head, four moves</h2>
                        <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                            <li><span className="text-slate-200">Project</span> each token into a query, a key and a value.</li>
                            <li><span className="text-slate-200">Score</span> every query against every visible key: q · k / √dₖ.</li>
                            <li><span className="text-slate-200">Softmax</span> each row into weights that add up to 1.</li>
                            <li><span className="text-slate-200">Blend</span> the values with those weights.</li>
                        </ol>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            <ShapeTag label="X" names={['T', 'd']} shape={[step?.T ?? 'T', 64]} />
                            <ShapeTag label="Q K V" names={['T', 'dₖ']} shape={[step?.T ?? 'T', 16]} />
                            <ShapeTag label="weights" names={['T', 'T']} shape={[step?.T ?? 'T', step?.T ?? 'T']} />
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;Attention picks the one word that matters.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            It takes a weighted average of every visible token. &ldquo;She&rdquo; putting 98% on &ldquo;Mia&rdquo; is unusually sharp: across 300 stories, the largest weight a token gives any one other token averages between 0.28 and 0.54, depending on the head. Most of the time the output is a genuine blend.
                        </p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>
                </aside>
            </div>
        </div>
    );
}
