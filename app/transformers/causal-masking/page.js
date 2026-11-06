"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, ArrowRightToLine, Eye, Triangle, CircleSlash, Pencil, Layers, Unplug as UnplugIcon,
    CheckCircle, XCircle, Wrench, Unplug, Shuffle, EyeOff,
} from 'lucide-react';
import { loadTinyGpt } from '@/lib/ml/tinyGpt';
import { forwardWith, nextTokenScore } from '@/lib/ml/gptVariants';
import { toRows } from '@/lib/ml/tensor';
import { generateStories } from '@/lib/ml/stories';
import useLoaded from '@/lib/ml/useLoaded';
import Heatmap from '@/components/ml/Heatmap';
import TokenStrip from '@/components/ml/TokenStrip';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card, Segmented,
} from '@/components/ml/TourKit';

/* ── what the mask is for ──────────────────────────────────
   A GPT is trained to predict token i + 1 at every position i, all in one
   pass. The causal mask (scores above the diagonal set to −∞) is what stops
   position i from reading token i + 1, its own answer. The page runs the
   tiny GPT with and without it (lib/ml/gptVariants.js) and edits tokens to
   show which outputs can change. */

const LAYER = 0;
const HEAD = 3;

const PRESETS = [
    { label: 'Mia … She found', text: 'One day, Mia went to the park. She found a red ball' },
    { label: 'Ruby saw a cat', text: 'After lunch, Ruby saw a cat in the kitchen.' },
    { label: 'Ben and Zoe', text: 'One day, Ben and Zoe went to the farm. Ben was happy.' },
    { label: 'Leo and a dog', text: 'After lunch, Leo played with a big dog. He' },
];
/* Single-token words used as edits. */
const SWAPS = [' dog', ' cat', ' ball', ' park', ' happy', ' sad', ' red', ' big', ' box', ' kite', ' farm'];

/* Measured over 100 generated stories (seed 11, 5,859 predictions) and
   checked by the test suite: next-token loss and accuracy with and without
   the mask, and how many earlier outputs change when the last token of each
   story is edited. */
const CAUSAL = {
    stories: 100, tokens: 5859,
    loss: [0.332, 5.119], acc: [0.864, 0.404],
    changed: [0, 5859],
};

const ACTS = [
    { id: 1, label: 'Next Token Everywhere', icon: ArrowRightToLine },
    { id: 2, label: 'The Leak', icon: Eye },
    { id: 3, label: 'The Triangle', icon: Triangle },
    { id: 4, label: 'Exactly Zero', icon: CircleSlash },
    { id: 5, label: 'Edit a Word', icon: Pencil },
    { id: 6, label: 'One Pass', icon: Layers },
    { id: 7, label: 'Without It', icon: UnplugIcon },
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
const topId = (logits, p) => {
    const row = logits.data.subarray(p * logits.cols, (p + 1) * logits.cols);
    let b = 0;
    for (let c = 1; c < row.length; c++) if (row[c] > row[b]) b = c;
    return b;
};

/** Edit token u (0-based) to another single-token word; which outputs change, and by how much. */
function editEffect(model, ids, u, { mask = true, swapIndex = 0 } = {}) {
    const swaps = SWAPS.map(w => model.tokenizer.encode(w)[0]).filter(id => id !== ids[u]);
    const newId = swaps[swapIndex % swaps.length];
    const edited = ids.slice();
    edited[u] = newId;
    const a = forwardWith(model, ids, { mask }), b = forwardWith(model, edited, { mask });
    const V = a.logits.cols;
    const delta = ids.map((_, p) => {
        let m = 0;
        for (let c = 0; c < V; c++) m = Math.max(m, Math.abs(a.logits.data[p * V + c] - b.logits.data[p * V + c]));
        return m;
    });
    return {
        u, newId, edited, delta,
        before: ids.map((_, p) => topId(a.logits, p)),
        after: ids.map((_, p) => topId(b.logits, p)),
        changed: delta.filter(x => x > 0).length,
    };
}

/* The edit prompts. Each tour asks four questions about an edit, of four
   kinds whose answers sit at four different ranks among the same four
   numbers (T − j + 1, T − j, j − 1, T): with the mask off every output
   changes (the largest); with the mask on, an early edit changes most of
   them (second largest), a late one few (third); and "how many stay
   exactly the same?" after an early edit is the smallest. The kinds come in
   a different order in each tour and the answer's button rotates, so no
   rank, number or button wins more than a quarter of the time. */
const ORDERS = [['off', 'early', 'late', 'same'], ['early', 'same', 'off', 'late'], ['late', 'off', 'same', 'early'], ['same', 'late', 'early', 'off']];
function editPlan(T, p) {
    return ORDERS[p].map((kind, k) => {
        const j = kind === 'early' ? 3 + ((p + k) % 2) : kind === 'same' ? 3 + ((p + k + 1) % 2) : kind === 'late' ? T - 2 - ((p + k) % 2) : T - 3 - (p % 2);
        return { kind, j, k };
    });
}
function editAsk(T, plan, presetIndex, oldText, newText) {
    const { kind, j, k } = plan;
    const vals = [T - j + 1, T - j, j - 1, T];
    const answer = kind === 'off' ? T : kind === 'same' ? j - 1 : T - j + 1;
    const others = vals.filter(v => v !== answer);
    const pos = (k + presetIndex) % 4;
    const ordered = [...others.slice(0, pos), answer, ...others.slice(pos)];
    const edit = `token ${j} ("${clean(oldText)}") becomes "${clean(newText)}"`;
    const question = kind === 'off'
        ? `The mask is switched off and ${edit}. How many of the ${T} outputs change?`
        : kind === 'same'
            ? `With the mask, ${edit}. How many of the ${T} outputs stay exactly the same?`
            : `With the mask, ${edit}. How many of the ${T} outputs can change?`;
    const because = kind === 'off'
        ? `Without the mask every position attends to every token, so token ${j} reaches all ${T} outputs, the earlier ones included.`
        : `Output p reads tokens 1 to p only. Outputs 1 to ${j - 1} never see token ${j}, so ${j - 1} stay identical to the last digit; outputs ${j} to ${T} — ${T - j + 1} of them — read it.`;
    return { question, options: ordered.map(v => `${v} outputs`), correct: pos, because };
}

function generateSteps(model, presetIndex) {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });
    const ids = model.tokenizer.encode(PRESETS[presetIndex].text);
    const T = ids.length;
    const tokens = tokensOf(model, ids);
    const run = forwardWith(model, ids);
    const open = forwardWith(model, ids, { mask: false });
    const base = { tokens, T };

    s(1, 'Next Token Everywhere', { ...base, kind: 'targets' },
        `Training a GPT on this sentence asks ${T - 1} questions at once: after "${clean(tokens[0].text)}" what comes next, after "${clean(tokens[0].text)}${tokens[1].text}" what comes next, and so on. The answers are the input itself, shifted one place left. One forward pass computes every position's prediction together — which only works if position i cannot see token i + 1.`);

    const i = Math.min(T - 2, 5);
    const wOpen = toRows(open.blocks[LAYER].heads[HEAD].weights)[i];
    const futureShare = open.blocks.reduce((a, b) => a + b.heads.reduce((c, h) => {
        let f = 0;
        for (let r = 0; r < T - 1; r++) for (let q = r + 1; q < T; q++) f += h.weights.data[r * T + q];
        return c + f / (T - 1);
    }, 0), 0) / (open.blocks.length * open.blocks[0].heads.length);
    s(2, 'The Leak', { ...base, kind: 'leak', i, w: wOpen },
        `Take the mask away and position ${i + 1}, "${clean(tokens[i].text)}", can attend to the whole sentence — including "${clean(tokens[i + 1].text)}", the very token it is supposed to predict. A model trained like that learns to copy the answer instead of predicting it, and is useless when it has to generate. In this sentence, with the mask removed, the heads put ${pct(futureShare)} of their weight on future tokens on average.`);
    const Mrows = ids.map((_, r) => ids.map((__, c) => (c > r ? -Infinity : 0)));
    s(3, 'The Triangle', { ...base, kind: 'mask', M: Mrows },
        `The mask is a [${T}, ${T}] matrix added to the scores: 0 on and below the diagonal, −∞ above it — ${(T * (T - 1)) / 2} entries. Row i keeps columns 1 to i. The first token sees only itself; the last sees everything.`);
    const W = toRows(run.blocks[LAYER].heads[HEAD].weights);
    const leak = W.reduce((a, r, rr) => a + r.reduce((b, v, c) => b + (c > rr && v !== 0 ? 1 : 0), 0), 0);
    s(4, 'Exactly Zero', { ...base, kind: 'weights', M: withFuture(W) },
        `After softmax, e^(−∞) = 0: the future gets no weight, not a small one. Of the ${(T * (T - 1)) / 2} weights above the diagonal in this head, ${leak} are non-zero. Every row still sums to 1 over the tokens it is allowed to see. Hatched cells are the masked future.`);

    editPlan(T, presetIndex).forEach((plan, k) => {
        const mask = plan.kind !== 'off';
        const e = editEffect(model, ids, plan.j - 1, { mask, swapIndex: k + presetIndex });
        const oldText = tokens[plan.j - 1].text, newText = tokText(model, e.newId);
        s(5, 'Edit a Word', { ...base, kind: 'edit-setup', j: plan.j, mask, oldText, newText, ask: editAsk(T, plan, presetIndex, oldText, newText) },
            `${mask ? 'With the mask on' : 'With the mask switched off'}, token ${plan.j}, "${clean(oldText)}", is about to become "${clean(newText)}". The model runs again on the edited sentence.`);
        const same = T - e.changed;
        s(5, 'Edit a Word', { ...base, kind: 'edit', j: plan.j, mask, e, newText },
            mask
                ? `Outputs 1 to ${plan.j - 1} are identical to the last digit: they never read token ${plan.j}. Outputs ${plan.j} to ${T} change — ${e.changed} of them, by up to ${num(Math.max(...e.delta), 2)} in a logit. ${same} stay the same.`
                : `With the mask off, all ${e.changed} outputs change, the ones before the edit included — the earliest by ${num(e.delta[0], 2)} in a logit. Every prediction could have read a word that comes after it.`);
    });

    const L = Math.max(3, Math.min(T - 2, 6));
    const pre = forwardWith(model, ids.slice(0, L));
    let diff = 0;
    for (let c = 0; c < pre.logits.cols; c++) diff = Math.max(diff, Math.abs(pre.logits.data[(L - 1) * pre.logits.cols + c] - run.logits.data[(L - 1) * run.logits.cols + c]));
    s(6, 'One Pass', { ...base, kind: 'prefix', L, diff, nextTop: topId(run.logits, L - 1) },
        `Run the first ${L} tokens on their own, the way generation sees them, and compare with position ${L} of the full pass: the largest difference across all ${pre.logits.cols} logits is ${diff === 0 ? 'exactly 0' : num(diff, 6)}. Because of the mask, the parallel training pass and token-by-token generation compute the same numbers — which is also what lets a model cache the keys and values of earlier tokens.`);

    const sc = nextTokenScore(run.logits, ids), scU = nextTokenScore(open.logits, ids);
    s(7, 'Without It', { ...base, kind: 'without', lossM: sc.loss, lossU: scU.loss, M: withFuture(W), MU: toRows(open.blocks[LAYER].heads[HEAD].weights) },
        `This model was trained with the mask, so it never learned to use the future. Take the mask away and it is not cheating, it is lost: on this sentence the loss goes from ${num(sc.loss, 3)} to ${num(scU.loss, 3)}. Over ${CAUSAL.stories} stories, ${num(CAUSAL.loss[0], 3)} becomes ${num(CAUSAL.loss[1], 3)} and accuracy falls from ${pct(CAUSAL.acc[0])} to ${pct(CAUSAL.acc[1])}. The mask is part of the model, in training and in use.`);
    return steps;
}

const predictFor = (step, next) => (next && step.ask ? step.ask : null);

function formulaFor(step) {
    if (!step) return null;
    if (step.kind === 'mask') return String.raw`M_{ij} = \begin{cases} 0 & j \le i \\ -\infty & j > i \end{cases}, \qquad A = \text{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}} + M\right)`;
    if (step.kind === 'weights') return String.raw`e^{-\infty} = 0 \;\Rightarrow\; A_{ij} = 0 \ \text{ for } j > i, \qquad \sum_{j \le i} A_{ij} = 1`;
    if (step.kind === 'edit' && step.mask) return String.raw`\text{out}_p = f(x_1, \dots, x_p) \;\Rightarrow\; \text{an edit at } j = ${step.j} \text{ reaches } p = ${step.j}, \dots, ${step.T}`;
    if (step.kind === 'prefix') return String.raw`\max_c \left| \text{logits}^{(1..${step.L})}_{${step.L},c} - \text{logits}^{(1..${step.T})}_{${step.L},c} \right| = ${step.diff === 0 ? '0' : step.diff.toExponential(1)}`;
    if (step.kind === 'targets') return String.raw`\mathcal{L} = -\frac{1}{T-1} \sum_{i=1}^{T-1} \log p(x_{i+1} \mid x_1, \dots, x_i)`;
    return null;
}

const quizQuestions = [
    {
        question: 'What does the causal mask do to the attention scores?',
        options: [
            'Sets every score above the diagonal to −∞, so token i can only attend to tokens 1 to i',
            'Deletes the future tokens from the input',
            'Multiplies the scores below the diagonal by 0',
            'Halves every score',
        ],
        correct: 0,
        explanation: 'All T tokens stay in the input and every row is computed. The mask adds −∞ to the scores where j > i; softmax turns those into weights of exactly 0.',
    },
    {
        question: 'Why must the mask be on during training, not only when generating?',
        options: [
            'It makes training faster',
            'The training targets are the input shifted by one, so without it position i could read token i + 1 — its own answer',
            'Softmax cannot work without it',
            'It stops the weights from growing too large',
        ],
        correct: 1,
        explanation: 'Training predicts every position at once. Without the mask, the answer for position i sits in its own attention window; the model would learn to copy it, then fail at generation, where the next token does not exist yet.',
    },
    {
        question: 'With the mask on, token 5 of a 10-token input is edited. Which outputs can change?',
        options: ['All 10', 'Outputs 1 to 4', 'Outputs 5 to 10', 'Only output 5'],
        correct: 2,
        explanation: 'Output p depends on tokens 1 to p. Outputs 1 to 4 never see token 5 and stay exactly the same; outputs 5 to 10 all read it.',
    },
];

const codeExample = `import torch

torch.manual_seed(0)
T, d = 6, 8
x = torch.randn(T, d)
Wq, Wk, Wv = (torch.randn(d, d) for _ in range(3))

def attend(x, causal):
    s = (x @ Wq) @ (x @ Wk).T / d ** 0.5
    if causal:
        s = s.masked_fill(torch.triu(torch.ones(T, T, dtype=torch.bool), 1), float('-inf'))
    return s.softmax(-1) @ (x @ Wv)

y = x.clone()
y[-1] = torch.randn(d)                 # edit the last token only
for causal in (True, False):
    change = (attend(x, causal) - attend(y, causal)).abs().amax(dim=1)
    print(causal, round(change[:-1].max().item(), 4))   # largest change before the edit
# True 0.0
# False 3.7274`;

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

function Matrix({ title, T, M, L, scale = 'sequential', domain = [0, 1], cellSize = 26, showValues = true, digits = 2, selected, onSelect }) {
    return (
        <div className="min-w-0">
            <Caption>{title} <ShapeTag shape={[T, T]} names={['T', 'T']} /></Caption>
            <div className="overflow-x-auto max-w-full">
                <Heatmap data={M} rowLabels={L} colLabels={L} scale={scale} domain={domain} cellSize={cellSize} showValues={showValues}
                    format={(v) => (v === -Infinity ? '−∞' : num(v, digits))} selected={selected} onSelect={onSelect} ariaLabel={title} />
            </div>
        </div>
    );
}

/** One chip per output position: same (exact zero change) or changed, with the largest logit change. */
function ChangeStrip({ tokens, e, model }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {tokens.map((t, p) => {
                const changed = e.delta[p] > 0;
                const edited = p === e.u;
                return (
                    <div key={p} className={`rounded-md px-1.5 py-1 text-center min-w-[3.5rem] border ${changed ? 'border-amber-400/70 bg-amber-500/15' : 'border-emerald-500/50 bg-emerald-500/10'} ${edited ? 'ring-2 ring-indigo-300' : ''}`}>
                        <div className="font-mono text-[11px] text-slate-200 leading-tight">{p + 1}. {clean(edited ? tokText(model, e.newId) : t.text)}</div>
                        <div className={`font-mono text-[10px] ${changed ? 'text-amber-200' : 'text-emerald-300'}`}>{changed ? `Δ ${num(e.delta[p], 2)}` : 'same'}</div>
                        <div className="font-mono text-[10px] text-slate-500">→{clean(tokText(model, e.after[p]))}</div>
                    </div>
                );
            })}
        </div>
    );
}

function VisualizationPanel({ step, model }) {
    if (!step) return null;
    const L = labels(step.tokens);
    switch (step.kind) {
        case 'targets':
            return (
                <div className="w-full space-y-2 overflow-x-auto">
                    <Caption>Input (top) and the target at each position (bottom): the next token</Caption>
                    <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${step.T}, minmax(3rem, auto))` }}>
                        {step.tokens.map((t, p) => <span key={`i${p}`} className="px-1.5 py-1 rounded-md border border-slate-600 bg-slate-800 font-mono text-xs text-slate-100 text-center">{clean(t.text)}</span>)}
                        {step.tokens.map((t, p) => (
                            <span key={`t${p}`} className={`px-1.5 py-1 rounded-md border font-mono text-xs text-center ${p < step.T - 1 ? 'border-indigo-400/50 bg-indigo-500/10 text-indigo-200' : 'border-transparent text-slate-600'}`}>
                                {p < step.T - 1 ? clean(step.tokens[p + 1].text) : '?'}
                            </span>
                        ))}
                    </div>
                </div>
            );
        case 'leak': {
            const ws = step.tokens.map((_, j) => step.w[j]);
            return (
                <div className="w-full space-y-3">
                    <Caption>Layer 1, head 4, mask removed: where position {step.i + 1} looks. Its answer is &quot;{clean(step.tokens[step.i + 1].text)}&quot;.</Caption>
                    <TokenStrip tokens={step.tokens} weights={ws} selected={step.i} size="sm" />
                    <div className="flex flex-wrap gap-3 text-xs font-mono text-slate-400">
                        <span>past and itself: {pct(ws.slice(0, step.i + 1).reduce((a, b) => a + b, 0))}</span>
                        <span className="text-amber-300">future: {pct(ws.slice(step.i + 1).reduce((a, b) => a + b, 0))}</span>
                        <span className="text-amber-200">the answer alone: {pct(ws[step.i + 1])}</span>
                    </div>
                </div>
            );
        }
        case 'mask': return <div className="w-full"><Matrix title="The mask M" T={step.T} M={step.M} L={L} scale="diverging" domain={[-1, 1]} cellSize={24} showValues digits={0} /></div>;
        case 'weights': return <div className="w-full"><Matrix title="Weights, layer 1 head 4 (hatched: masked)" T={step.T} M={step.M} L={L} /></div>;
        case 'edit-setup':
            return (
                <div className="w-full space-y-3">
                    <Caption>Mask {step.mask ? 'on' : 'off'} · token {step.j} is about to change</Caption>
                    <TokenStrip tokens={step.tokens} selected={step.j - 1} size="sm" />
                    <p className="text-sm text-slate-300 font-mono">&quot;{clean(step.oldText)}&quot; → &quot;{clean(step.newText)}&quot;</p>
                </div>
            );
        case 'edit':
            return (
                <div className="w-full space-y-3">
                    <Caption>Mask {step.mask ? 'on' : 'off'} · each output after the edit: <span className="text-emerald-300">same</span> (no change at all) or <span className="text-amber-300">Δ</span> = largest change in any logit, then its top prediction</Caption>
                    <ChangeStrip tokens={step.tokens} e={step.e} model={model} />
                </div>
            );
        case 'prefix':
            return (
                <div className="w-full space-y-3">
                    <Caption>The first {step.L} tokens on their own</Caption>
                    <TokenStrip tokens={step.tokens.slice(0, step.L)} size="sm" />
                    <Caption>The full sentence, position {step.L} highlighted</Caption>
                    <TokenStrip tokens={step.tokens} selected={step.L - 1} size="sm" />
                    <p className="text-sm text-slate-300">Both predict &quot;{clean(tokText(model, step.nextTop))}&quot; next. Largest logit difference: <span className="font-mono text-emerald-300">{step.diff === 0 ? '0' : step.diff.toExponential(1)}</span></p>
                </div>
            );
        case 'without':
            return (
                <div className="w-full grid md:grid-cols-2 gap-4">
                    <Matrix title={`With the mask (loss ${num(step.lossM, 3)})`} T={step.T} M={step.M} L={L} cellSize={16} showValues={false} />
                    <Matrix title={`Without (loss ${num(step.lossU, 3)})`} T={step.T} M={step.MU} L={L} cellSize={16} showValues={false} />
                </div>
            );
        default: return null;
    }
}

/* ── explore ─────────────────────────────────────────────── */
function Explore({ model, initialText }) {
    const [text, setText] = useState(initialText);
    const [seed, setSeed] = useState(1);
    const [mask, setMask] = useState(true);
    const [layer, setLayer] = useState(LAYER);
    const [head, setHead] = useState(HEAD);
    const [edit, setEdit] = useState(null);   // { u, k }
    const ids = useMemo(() => model.tokenizer.encode(text).slice(0, 40), [model, text]);
    const tokens = tokensOf(model, ids);
    const T = ids.length;
    const run = useMemo(() => forwardWith(model, ids, { mask }), [model, ids, mask]);
    const masked = useMemo(() => (mask ? run : forwardWith(model, ids)), [model, ids, mask, run]);
    const e = useMemo(() => (edit && edit.u < T ? editEffect(model, ids, edit.u, { mask, swapIndex: edit.k }) : null), [model, ids, edit, mask, T]);
    const W = toRows(run.blocks[layer].heads[head].weights);
    const sc = nextTokenScore(run.logits, ids), sc0 = nextTokenScore(masked.logits, ids);
    const pick = (u) => setEdit(x => ({ u, k: x && x.u === u ? x.k + 1 : 0 }));
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Sentence:</span>
                    {PRESETS.map(p => (
                        <button key={p.label} onClick={() => { setText(p.text); setEdit(null); }} aria-pressed={text === p.text}
                            className={`text-xs px-2.5 py-1 rounded-lg border ${text === p.text ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-400 hover:border-indigo-500'}`}>{p.label}</button>
                    ))}
                    <button onClick={() => { setText(generateStories(1, 300 + seed)[0]); setSeed(x => x + 1); setEdit(null); }}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500"><Shuffle className="h-3.5 w-3.5" />Random story</button>
                </div>
                <div>
                    <Caption>Click a token to swap it for another word (click again for a different one)</Caption>
                    <TokenStrip tokens={tokens} selected={edit?.u ?? null} onSelect={pick} size="sm" />
                </div>
                {e ? (
                    <div>
                        <Caption>Token {e.u + 1} → &quot;{clean(tokText(model, e.newId))}&quot;: {e.changed} of {T} outputs change{mask ? `; the ${e.u} before it cannot` : ', the earlier ones included'}</Caption>
                        <ChangeStrip tokens={tokens} e={e} model={model} />
                    </div>
                ) : <p className="text-xs text-slate-500">No edit yet.</p>}
                <div className="flex flex-wrap items-center gap-3">
                    <Segmented options={[0, 1, 2].map(l => [l, `Layer ${l + 1}`])} value={layer} onChange={setLayer} accent="indigo" ariaLabel="Layer" />
                    <Segmented options={[0, 1, 2, 3].map(x => [x, `Head ${x + 1}`])} value={head} onChange={setHead} accent="indigo" ariaLabel="Head" />
                </div>
                <Matrix title={`Weights, layer ${layer + 1} head ${head + 1}${mask ? '' : ' (no mask)'}`} T={T} M={mask ? withFuture(W) : W} L={labels(tokens)} cellSize={22} showValues={T <= 14} />
                <p className="text-xs text-slate-400">Next-token loss on this text: {num(sc.loss, 3)}{mask ? '' : ` (with the mask: ${num(sc0.loss, 3)})`}.</p>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Unplug className="h-4 w-4 text-amber-400" />Break it: remove the mask</h3>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setMask(v => !v)} aria-pressed={!mask}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${!mask ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-amber-500'}`}>
                        <EyeOff className="h-3.5 w-3.5" />{mask ? 'Remove the mask' : 'Mask removed'}
                    </button>
                    {!mask && <button onClick={() => setMask(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                {!mask && (
                    <BreakNote>
                        Every row now reaches the end of the sentence, so an edit anywhere changes every output. The model was trained with the mask and does not know what to do with the future: over {CAUSAL.stories} stories its loss goes from {num(CAUSAL.loss[0], 3)} to {num(CAUSAL.loss[1], 3)}, and editing each story&apos;s last token changes {CAUSAL.changed[1].toLocaleString('en-US')} of {CAUSAL.tokens.toLocaleString('en-US')} earlier outputs instead of {CAUSAL.changed[0]}.
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function CausalMaskingPage() {
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
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Causal Masking</h1>
                    <p className="text-indigo-50 max-w-3xl">
                        A GPT learns to predict every next token of a sentence in one pass. A triangle of −∞ is what keeps each position from reading its own answer. Edit a word and watch exactly which predictions can change.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/transformers/scaled-dot-product-attention" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Scaled Dot-Product Attention</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Edit any word', MousePointer2]]} mode={mode}
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
                            <TourPlayer acts={ACTS} steps={stepHistory} play={play} predict={predict} accent="indigo" minHeight="min-h-[300px]">
                                <VisualizationPanel step={step} model={model} />
                            </TourPlayer>
                            {predict.prompt && <PredictPrompt predict={predict} accent="indigo" />}
                            <ExplanationBox text={step?.explanation} predict={predict} accent="indigo" />
                            {tex && <FormulaPanel><div className="overflow-x-auto"><Tex block>{tex}</Tex></div></FormulaPanel>}
                        </>
                    )}

                    <InCode title="Editing the last token, with and without the mask" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="The rule" icon={Triangle}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li>Output p is computed from tokens 1 to p, never from p + 1 onward.</li>
                            <li>Training predicts all T next tokens in one pass; the mask keeps every one of them honest.</li>
                            <li>Generation adds one token at a time and gets the same numbers, so earlier keys and values can be cached.</li>
                        </ul>
                    </Card>

                    <Misconception claim="A GPT reads a sentence one token at a time, left to right.">
                        <p>On a prompt, and in training, it reads all of them at once: one pass, every position in parallel. What makes it behave as if it read left to right is the mask. Run any prefix on its own and its last position matches the full pass exactly — and editing each of {CAUSAL.stories} stories&apos; last token changes {CAUSAL.changed[0]} of {CAUSAL.tokens.toLocaleString('en-US')} earlier outputs.</p>
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
