"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Package, Layers, Calculator, Blend, Grid3x3, LineChart, Eye,
    CheckCircle, XCircle, Wrench, Unplug, Shuffle,
} from 'lucide-react';
import { encode, seq2seqParamCount, loadTranslateModels } from '@/lib/ml/seq2seq';
import { runSequence, softmax, oneHot } from '@/lib/ml/recurrent';
import { SRC_WORDS, TGT_WORDS, BOS, EOS, translateExample } from '@/lib/ml/sequenceTasks';
import useLoaded from '@/lib/ml/useLoaded';
import { createRng } from '@/lib/random';
import Heatmap from '@/components/ml/Heatmap';
import ProbBars from '@/components/ml/ProbBars';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { sequential, inkOn } from '@/components/ml/colors';
import Tex from '@/components/math/Tex';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card,
} from '@/components/ml/TourKit';

/* ── the models ────────────────────────────────────────────
   The two toy translators from Sequence-to-Sequence (public/models/recurrent/
   translate.json): GRU encoder–decoders with 32 hidden units, one plain, one
   with Luong's dot-product attention. At every output step the attention
   decoder scores each encoder state against its own state, eₜⱼ = hₜ · hⱼ,
   turns the scores into weights with softmax, reads the weighted average
   cₜ = Σ αₜⱼ hⱼ, and predicts the next word from [hₜ; cₜ]. The decoding loop
   is written out here (rather than calling translate) so the break-it can
   replace the weights; with real weights it matches translate exactly. */

const KIND = {
    the: 'det', a: 'det', red: 'adj', big: 'adj', small: 'adj', old: 'adj',
    cat: 'noun', dog: 'noun', bird: 'noun', fox: 'noun', sees: 'verb', likes: 'verb', chases: 'verb', and: 'conj',
};
const OF_KIND = Object.fromEntries(['det', 'adj', 'noun', 'verb'].map(k => [k, SRC_WORDS.filter(w => KIND[w] === k)]));
const ids = (sentence) => sentence.split(' ').map(w => SRC_WORDS.indexOf(w));
const tgtText = (tgt) => tgt.map(i => TGT_WORDS[i]).join(' ');

/** The reference translation: ids are shared, so only the adjectives move (after their noun). */
function referenceOf(src) {
    const out = [];
    let held = [];
    for (const i of src) {
        const k = KIND[SRC_WORDS[i]];
        if (k === 'adj') held.push(i);
        else if (k === 'noun') { out.push(i, ...held); held = []; }
        else out.push(i);
    }
    return out;
}
/** Where each target word comes from in the source. */
function alignmentOf(src) {
    const align = [];
    let held = [];
    src.forEach((i, j) => {
        const k = KIND[SRC_WORDS[i]];
        if (k === 'adj') held.push(j);
        else if (k === 'noun') { align.push(j, ...held); held = []; }
        else align.push(j);
    });
    return align;
}
function score(out, want) {
    let right = 0;
    for (let t = 0; t < want.length; t++) if (out[t] === want[t]) right++;
    return { right, words: want.length, exact: out.length === want.length && right === want.length };
}
const rate = (b) => b.right / b.words;

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/**
 * Greedy decoding, step by step. With attention, every step records its
 * scores, weights, context and probabilities; `uniform` replaces the weights
 * by 1/S (the break-it). Without attention the decoder reads only its state.
 */
function decode(model, src, { uniform = false, maxLen = 40 } = {}) {
    const { E } = encode(model, src);
    const { H, Vt } = model;
    let h = E[E.length - 1], prev = BOS;
    const out = [], steps = [];
    for (let t = 0; t < maxLen; t++) {
        const r = runSequence(model.dec, [oneHot(prev, Vt)], { h });
        h = r.h;
        let logits, scores = null, alpha = null, ctx = null;
        if (model.attention) {
            scores = E.map(e => dot(h, e));
            alpha = uniform ? E.map(() => 1 / E.length) : softmax(scores);
            ctx = new Float64Array(H);
            E.forEach((e, j) => { for (let k = 0; k < H; k++) ctx[k] += alpha[j] * e[k]; });
            logits = Float64Array.from(model.bo);
            for (let v = 0; v < Vt; v++) {
                let s = 0;
                for (let k = 0; k < H; k++) s += model.Wo[v * 2 * H + k] * h[k] + model.Wo[v * 2 * H + H + k] * ctx[k];
                logits[v] += s;
            }
        } else logits = r.steps[0].y;
        const probs = softmax(logits);
        let best = 0;
        for (let v = 1; v < probs.length; v++) if (probs[v] > probs[best]) best = v;
        steps.push({ h: Array.from(h), scores, alpha, ctx: ctx && Array.from(ctx), probs, word: best });
        if (best === EOS) break;
        out.push(best);
        prev = best;
    }
    return { ids: out, steps, E };
}

/* Measured on page load: over 200 test sentences (1–3 clauses, seed 12),
   how often each output word's largest weight lands on the source word it
   translates, and the mean of that largest weight. */
function measureAlignment(model) {
    const r = createRng(12);
    let n = 0, hit = 0, top = 0;
    for (let t = 0; t < 200; t++) {
        const ex = translateExample(r, { clauses: 1 + (t % 3), maxAdj: 1 });
        const al = alignmentOf(ex.src);
        decode(model, ex.src).steps.forEach((st, u) => {
            if (u >= al.length) return;
            const m = Math.max(...st.alpha);
            n++; top += m;
            if (st.alpha.indexOf(m) === al[u]) hit++;
        });
    }
    return { n, hit: hit / n, top: top / n };
}

/* Three-clause test sentences with the weights spread evenly (the break-it),
   measured with the shipped weights and checked by the test suite. */
const UNIFORM_RATE = 0.118;

/* Each tour asks about four output steps (asks: their positions in the output),
   chosen offline from seeded three-clause sentences: see the comment above
   WEIGHT_CUTS. The test suite checks every one against the shipped model. */
const PRESETS = [
    { label: 'the old cat sees a big bird …', text: 'the old cat sees a big bird and the big bird likes a dog and the bird likes the big cat', asks: [6, 9, 16, 18] },
    { label: 'a big bird chases a dog …', text: 'a big bird chases a dog and the red dog likes the old bird and the dog likes a bird', asks: [2, 16, 17, 19] },
    { label: 'the old fox likes a small bird …', text: 'the old fox likes a small bird and the small cat chases the dog and a red cat chases the bird', asks: [3, 4, 15, 19] },
    { label: 'the big bird chases the dog …', text: 'the big bird chases the dog and the cat chases the dog and the bird sees a red cat', asks: [8, 11, 15, 18] },
];

const ACTS = [
    { id: 1, label: 'One Vector', icon: Package },
    { id: 2, label: 'Every State', icon: Layers },
    { id: 3, label: 'Score and Weigh', icon: Calculator },
    { id: 4, label: 'The Context', icon: Blend },
    { id: 5, label: 'Alignment', icon: Grid3x3 },
    { id: 6, label: 'Length', icon: LineChart },
];

const num = (v, d = 2) => {
    const r = Math.round(v * 10 ** d) / 10 ** d;
    return `${r < 0 && r !== 0 ? '−' : ''}${Math.abs(r).toFixed(d)}`;
};
const texNum = (v, d = 2) => num(v, d).replace('−', '-');
const pct = (v) => `${Math.round(v * 100)}%`;
const pct1 = (v) => `${(v * 100).toFixed(1)}%`;
const q = (w) => `"${w}"`;

/* The prompt: before the weights are shown, how much will the top score take?
   Buckets at the quartiles of the model's top weights (they are peaked here:
   median 0.95), each asked step at least 0.004 from a bucket edge, so the
   two-decimal scores on screen settle it. Each tour asks one step per bucket,
   in an order that differs between the four sentences (a Latin square), so no
   fixed button or question number scores above 25%. Word kind leaks on its
   own — over 400 three-clause sentences a top-scoring determiner lands under
   95% in 86% of steps — so the asked steps were searched for across the four
   tours: the natural rule (determiner or and lowest, adjective or verb
   second, noun third) scores 31%. Only nouns, verbs and adjectives ever reach
   the top bucket, so some kind must repeat an answer; the best rule fitted to
   these 16 answers after the fact reaches 37.5%. */
const WEIGHT_CUTS = [0.9, 0.95, 0.975];
const WEIGHT_BUCKETS = ['Under 90%', '90% to 95%', '95% to 97.5%', 'Over 97.5%'];
const EDGE = 0.004;
const bucketOf = (w) => WEIGHT_CUTS.filter(c => w >= c).length;

function generateSteps(file, presetIndex) {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, presetIndex, ...data, explanation });
    const { plain, attention } = file.nets;
    const src = ids(PRESETS[presetIndex].text);
    const want = referenceOf(src);
    const S = src.length, H = attention.H;
    const pl = decode(plain, src), at = decode(attention, src);
    const sp = score(pl.ids, want), sa = score(at.ids, want);

    s(1, 'One Vector', { kind: 'plain', src, want, out: pl.ids, last: Array.from(pl.E[S - 1]) },
        `Three clauses, ${S} words. The plain encoder–decoder squeezes them into one vector of ${H} numbers and decodes from that alone: ${sp.right} of ${sp.words} words come out right. Across 400 three-clause test sentences it averages ${pct(rate(file.evaluation.plain.byClauses[3]))}, and not one sentence is entirely right.`);
    s(2, 'Every State', { kind: 'states', src, E: at.E.map(e => Array.from(e)) },
        `The fix keeps every encoder state: one row of ${H} numbers per source word, ${S} rows in all, shape [${S}, ${H}]. Row j still mixes in everything read before word j, but it is dominated by word j itself. The decoder will choose, at every step, which rows to read.`);

    const positions = PRESETS[presetIndex].asks;
    positions.forEach((u, k) => {
        const st = at.steps[u];
        const top = st.alpha.indexOf(Math.max(...st.alpha));
        const written = at.ids.slice(0, u);
        s(3, 'Score and Weigh', { kind: 'score', src, u, written, scores: st.scores, k },
            `${k === 0 ? 'Every output step starts the same way. ' : ''}The decoder has written ${written.length} word${written.length === 1 ? '' : 's'}${written.length ? `, ending "${TGT_WORDS[written.at(-1)]}"` : ''}. Its state hₜ is scored against every encoder state by a dot product, eₜⱼ = hₜ · hⱼ: ${S} scores, one per source word. The highest is ${num(st.scores[top])}, for ${q(SRC_WORDS[src[top]])}.`);
        const sorted = [...st.scores].sort((a, b) => b - a);
        s(3, 'Score and Weigh', { kind: 'weigh', src, u, written, scores: st.scores, alpha: st.alpha, word: st.word, k },
            `Softmax turns the scores into weights that add up to 1. ${q(SRC_WORDS[src[top]])} leads the next score by ${num(sorted[0] - sorted[1])} and takes ${pct1(st.alpha[top])} of the weight. The decoder then writes ${q(TGT_WORDS[st.word])}${KIND[SRC_WORDS[src[top]]] && st.word === src[top] ? `, the translation of ${q(SRC_WORDS[src[top]])}` : ''}.`);
    });

    const u = positions.at(-1) ?? 1, st = at.steps[u];
    const bars = Array.from(st.probs, (p, v) => ({ v, p })).sort((a, b) => b.p - a.p).slice(0, 5);
    s(4, 'The Context', { kind: 'context', src, u, alpha: st.alpha, ctx: st.ctx, h: st.h, bars, word: st.word },
        `The weights mix the encoder states into one context vector, cₜ = Σⱼ αₜⱼ hⱼ — ${H} numbers again, but built for this step: with ${pct(Math.max(...st.alpha))} on one word, it is almost that word's state. The decoder joins it to its own state, [hₜ; cₜ] of ${2 * H} numbers, and a linear layer turns that into scores for the ${TGT_WORDS.length} target words. ${q(TGT_WORDS[st.word])} wins with ${pct(bars[0].p)}.`);

    const m = measureAlignment(attention);
    s(5, 'Alignment', { kind: 'alignment', src, out: at.ids, want, alpha: at.steps.map(x => x.alpha) },
        `All ${at.steps.length} output steps at once: row t is where output word t looked. It runs down the diagonal and steps sideways exactly where an adjective moves after its noun. Nobody told the model which word translates which; it learned to look there because that is what predicts the next word. Over ${m.n.toLocaleString('en-US')} output words of 200 test sentences, the largest weight lands on the right source word ${pct1(m.hit)} of the time, with ${pct(m.top)} of the weight on average. This sentence: ${sa.right} of ${sa.words} words right.`);
    const pb = file.evaluation.plain.byClauses, ab = file.evaluation.attention.byClauses;
    s(6, 'Length', { kind: 'quality', evaluation: file.evaluation },
        `Words right by source length, 1,200 test sentences. The plain model: ${pct(rate(pb[1]))}, ${pct(rate(pb[2]))} and ${pct(rate(pb[3]))} with one, two and three clauses. With attention: ${pct(rate(ab[1]))}, ${pct(rate(ab[2]))} and ${pct(rate(ab[3]))}, with ${(seq2seqParamCount(attention) - seq2seqParamCount(plain)).toLocaleString('en-US')} more parameters. The decoder no longer has to remember the sentence; it can look it up. A transformer keeps the look-up and drops the recurrence.`);
    return steps;
}

const predictFor = (step, next) => {
    if (!next || step.kind !== 'score' || next.kind !== 'weigh' || next.u !== step.u) return null;
    const sc = step.scores, top = sc.indexOf(Math.max(...sc));
    const rest = sc.reduce((a, v, j) => (j === top ? a : a + Math.exp(v - sc[top])), 0);
    const w = next.alpha[top];
    const sorted = [...sc].sort((a, b) => b - a);
    return {
        question: `Softmax is next. ${q(SRC_WORDS[step.src[top]])} has the top score. How much of the weight will it get?`,
        options: WEIGHT_BUCKETS,
        correct: bucketOf(w),
        because: `It leads the runner-up by ${num(sorted[0] - sorted[1])}. Every other word adds e^(its score − ${num(sc[top])}) to the denominator; those add up to ${num(rest, 3)}, so the top weight is 1 / (1 + ${num(rest, 3)}) = ${pct1(w)}. A lead of 3 is a factor of 20; a lead of 5, a factor of 150.`,
    };
};

function formulaFor(step) {
    if (step.kind === 'score') {
        const top = step.scores.indexOf(Math.max(...step.scores));
        return String.raw`e_{t,j} = h_t \cdot h_j, \qquad e_{t,\,\text{${SRC_WORDS[step.src[top]]}}} = ${texNum(step.scores[top])}`;
    }
    if (step.kind === 'weigh') {
        const top = step.alpha.indexOf(Math.max(...step.alpha));
        return String.raw`\alpha_{t,j} = \frac{e^{e_{t,j}}}{\sum_k e^{e_{t,k}}}, \qquad \alpha_{t,\,\text{${SRC_WORDS[step.src[top]]}}} = ${texNum(step.alpha[top], 3)}`;
    }
    if (step.kind === 'context') return String.raw`c_t = \sum_j \alpha_{t,j}\, h_j, \qquad \text{logits} = W_o\,[h_t;\, c_t] + b_o \;\in\; \mathbb{R}^{${TGT_WORDS.length}}`;
    if (step.kind === 'states') return String.raw`H_{\text{enc}} = [h_1, \dots, h_{${step.src.length}}] \;\in\; \mathbb{R}^{${step.src.length} \times ${step.E[0].length}}`;
    return null;
}

/* Explore: a random sentence from the grammar. */
function randomSentence(rng, clauses) {
    const np = () => [rng.pick(OF_KIND.det), ...(rng.next() < 0.5 ? [rng.pick(OF_KIND.adj)] : []), rng.pick(OF_KIND.noun)];
    const words = [];
    for (let c = 0; c < clauses; c++) {
        if (c) words.push('and');
        words.push(...np(), rng.pick(OF_KIND.verb), ...np());
    }
    return ids(words.join(' '));
}

const quizQuestions = [
    {
        question: 'With attention, what does the decoder get at each output step that a plain encoder–decoder does not?',
        options: [
            'A weighted average of all the encoder states, with weights it computes afresh for that step',
            'A larger final encoder state',
            'The correct previous word, even at test time',
            'A second encoder that reads the sentence backwards',
        ],
        correct: 0,
        explanation: 'The plain decoder sees the source only through the encoder\'s last state. With attention it scores every encoder state against its own state, softmaxes the scores and reads the weighted average — a different mix for every output word.',
    },
    {
        question: 'Where do the attention weights for one output step come from?',
        options: [
            'They are fixed numbers learned once for each source position',
            'The decoder\'s current state is scored against each encoder state, and softmax turns the scores into weights',
            'They are the encoder\'s gate values',
            'They count how often each source word appeared in training',
        ],
        correct: 1,
        explanation: 'Here the score is a dot product, eₜⱼ = hₜ · hⱼ. Softmax makes the weights positive and sum to 1. Because hₜ changes every step, so do the weights.',
    },
    {
        question: 'Why does the plain model get worse on longer sentences while the attention model does not?',
        options: [
            'Longer sentences use rarer words',
            'The attention model has far more parameters',
            'The plain model must fit the whole sentence into one fixed-size vector; attention can read any encoder state directly',
            'The attention model was trained only on long sentences',
        ],
        correct: 2,
        explanation: 'Both have 32 hidden units, and attention adds only 512 parameters. The difference is access: the plain decoder must remember the sentence in 32 numbers, the attention decoder looks it up whenever it needs a word.',
    },
];

const codeExample = `import torch
import torch.nn.functional as F

E = torch.randn(1, 20, 32)        # encoder states: one per source word
h = torch.randn(1, 32)            # decoder state at this output step
W_o = torch.nn.Linear(64, 16)     # [h; context] -> scores for 16 target words

scores = (E @ h.unsqueeze(-1)).squeeze(-1)    # [1, 20]: h · h_j for every j
alpha = F.softmax(scores, dim=-1)              # [1, 20]: weights that sum to 1
context = (alpha.unsqueeze(-1) * E).sum(dim=1) # [1, 32]: the weighted average
logits = W_o(torch.cat([h, context], dim=-1))  # [1, 16]
print(round(alpha.sum().item(), 6), context.shape, logits.shape)
# 1.0 torch.Size([1, 32]) torch.Size([1, 16])`;

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

function Chips({ words, marks, highlight = null, onClick }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {words.map((w, i) => {
                const m = marks?.[i];
                const tone = m === 'wrong' ? 'border-red-500 bg-red-500/30 text-red-200'
                    : m === 'right' ? 'border-green-500/60 bg-green-500/10 text-green-200'
                        : highlight === i ? 'border-indigo-300 bg-indigo-400 text-slate-900' : 'border-slate-600 bg-slate-800 text-slate-100';
                const cls = `px-2 py-1 rounded-md border font-mono text-xs ${tone}`;
                return onClick
                    ? <button key={i} onClick={() => onClick(i)} className={`${cls} hover:border-indigo-400`} aria-label={`Change "${w}"`}>{w}</button>
                    : <span key={i} className={cls}>{w}</span>;
            })}
        </div>
    );
}
const marksFor = (out, want) => out.map((w, t) => (w === want[t] ? 'right' : 'wrong'));

/** Source words with a number under each: scores, or weights tinted by size. */
function ValueChips({ src, values, weights = false }) {
    const top = values.indexOf(Math.max(...values));
    const lo = Math.min(...values), hi = Math.max(...values);
    return (
        <div className="flex flex-wrap gap-1.5">
            {src.map((w, j) => {
                const t = weights ? values[j] : (values[j] - lo) / (hi - lo || 1);
                return (
                    <div key={j} className={`rounded-md px-1.5 py-1 text-center min-w-[3.25rem] border ${j === top ? 'border-indigo-300' : 'border-slate-700'}`}
                        style={{ background: sequential(t), color: inkOn(t) }}>
                        <div className="font-mono text-[11px] leading-tight">{SRC_WORDS[w]}</div>
                        <div className="font-mono text-[11px] font-semibold">{weights ? (values[j] >= 0.0005 ? pct1(values[j]) : '0%') : num(values[j])}</div>
                    </div>
                );
            })}
        </div>
    );
}

function QualityChart({ evaluation }) {
    const lens = Object.keys(evaluation.plain.byLength).map(Number).sort((a, b) => a - b);
    const W = 560, H = 210, L = 40, R = 12, T = 12, B = 34;
    const x = (len) => Math.round((L + ((len - lens[0]) / (lens.at(-1) - lens[0])) * (W - L - R)) * 100) / 100;
    const y = (v) => Math.round((T + (1 - v) * (H - T - B)) * 100) / 100;
    const line = (name) => lens.map(len => `${x(len)},${y(rate(evaluation[name].byLength[len]))}`).join(' ');
    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Share of words translated correctly by source length">
                {[0, 0.25, 0.5, 0.75, 1].map(t => (
                    <g key={t}>
                        <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#1e293b" />
                        <text x={L - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="#64748b">{Math.round(t * 100)}%</text>
                    </g>
                ))}
                {lens.map(len => <text key={len} x={x(len)} y={H - 16} textAnchor="middle" fontSize="10" fill="#64748b">{len}</text>)}
                <text x={L + (W - L - R) / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="#64748b">source words</text>
                <polyline fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" points={line('plain')} />
                <polyline fill="none" stroke="#818cf8" strokeWidth="2.4" points={line('attention')} />
                {lens.map(len => <circle key={len} cx={x(len)} cy={y(rate(evaluation.attention.byLength[len]))} r="3" fill="#818cf8" />)}
            </svg>
            <div className="flex flex-wrap gap-x-4 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-indigo-400" />with attention</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-slate-400" />plain: one vector</span>
            </div>
        </div>
    );
}

function AttentionMap({ src, out, alpha, selected, onSelect }) {
    return (
        <div className="overflow-x-auto max-w-full">
            <Heatmap data={alpha.map(r => Array.from(r))} rowLabels={alpha.map((_, u) => (u < out.length ? TGT_WORDS[out[u]] : '</s>'))}
                colLabels={src.map(i => SRC_WORDS[i])} scale="sequential" domain={[0, 1]} cellSize={18}
                selected={selected} onSelect={onSelect} ariaLabel="Attention weights: output words by source words" />
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    switch (step.kind) {
        case 'plain':
            return (
                <div className="w-full space-y-3">
                    <Caption>Source, {step.src.length} words</Caption>
                    <Chips words={step.src.map(i => SRC_WORDS[i])} />
                    <Caption>All the plain decoder gets <ShapeTag shape={[1, step.last.length]} /></Caption>
                    <div className="overflow-x-auto max-w-full">
                        <Heatmap data={[step.last]} rowLabels={['last state']} scale="diverging" domain={[-1, 1]} cellSize={14} ariaLabel="The final encoder state" />
                    </div>
                    <Caption>Plain model (green right, red wrong)</Caption>
                    <Chips words={step.out.map(w => TGT_WORDS[w])} marks={marksFor(step.out, step.want)} />
                </div>
            );
        case 'states':
            return (
                <div className="w-full space-y-2">
                    <Caption>Every encoder state, one row per source word <ShapeTag shape={[step.src.length, step.E[0].length]} /></Caption>
                    <div className="overflow-x-auto max-w-full">
                        <Heatmap data={step.E} rowLabels={step.src.map(i => SRC_WORDS[i])} scale="diverging" domain={[-1, 1]} cellSize={11} ariaLabel="Encoder states" />
                    </div>
                </div>
            );
        case 'score':
        case 'weigh':
            return (
                <div className="w-full space-y-3">
                    <Caption>Written so far</Caption>
                    <Chips words={[...step.written.map(w => TGT_WORDS[w]), step.kind === 'weigh' ? TGT_WORDS[step.word] : '?']} highlight={step.written.length} />
                    <Caption>{step.kind === 'score' ? 'Scores eₜⱼ = hₜ · hⱼ' : 'Weights αₜⱼ after softmax'} <ShapeTag shape={[1, step.src.length]} /></Caption>
                    <ValueChips src={step.src} values={step.kind === 'score' ? step.scores : step.alpha} weights={step.kind === 'weigh'} />
                </div>
            );
        case 'context':
            return (
                <div className="w-full space-y-3">
                    <Caption>Weights for this step</Caption>
                    <ValueChips src={step.src} values={step.alpha} weights />
                    <div className="overflow-x-auto max-w-full">
                        <Caption>[hₜ; cₜ] <ShapeTag shape={[1, step.h.length + step.ctx.length]} /></Caption>
                        <Heatmap data={[step.h, step.ctx]} rowLabels={['state hₜ', 'context cₜ']} scale="diverging" domain={[-1, 1]} cellSize={12} ariaLabel="Decoder state and context vector" />
                    </div>
                    <div className="max-w-md">
                        <Caption>Next word, five most likely <ShapeTag shape={[1, TGT_WORDS.length]} /></Caption>
                        <ProbBars items={step.bars.map(b => ({ label: TGT_WORDS[b.v], p: b.p }))} chosen={0} accent="#818cf8" />
                    </div>
                </div>
            );
        case 'alignment':
            return (
                <div className="w-full space-y-2">
                    <Chips words={step.out.map(w => TGT_WORDS[w])} marks={marksFor(step.out, step.want)} />
                    <Caption>Attention weights: output words (rows) over source words (columns) <ShapeTag shape={[step.alpha.length, step.src.length]} /></Caption>
                    <AttentionMap src={step.src} out={step.out} alpha={step.alpha} />
                </div>
            );
        case 'quality': return <div className="w-full"><QualityChart evaluation={step.evaluation} /></div>;
        default: return null;
    }
}

/* ── explore ─────────────────────────────────────────────── */
function Explore({ file, initial }) {
    const [src, setSrc] = useState(initial);
    const [seed, setSeed] = useState(1);
    const [uniform, setUniform] = useState(false);
    const [sel, setSel] = useState({ i: 0, j: 0 });
    const want = useMemo(() => referenceOf(src), [src]);
    const plainOut = useMemo(() => decode(file.nets.plain, src).ids, [file, src]);
    const at = useMemo(() => decode(file.nets.attention, src, { uniform }), [file, src, uniform]);
    const cycle = (i) => {
        const w = SRC_WORDS[src[i]], k = KIND[w];
        if (k === 'conj') return;
        const list = OF_KIND[k];
        const next = list[(list.indexOf(w) + 1) % list.length];
        setSrc(s => s.map((x, j) => (j === i ? SRC_WORDS.indexOf(next) : x)));
    };
    const fresh = (clauses) => { setSrc(randomSentence(createRng(seed * 31 + clauses), clauses)); setSeed(s => s + 1); setSel({ i: 0, j: 0 }); };
    const sp = score(plainOut, want), sa = score(at.ids, want);
    const row = Math.min(sel.i, at.steps.length - 1);
    const st = at.steps[row];
    const bars = Array.from(st.probs, (p, v) => ({ v, p })).sort((a, b) => b.p - a.p).slice(0, 4);
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">New sentence:</span>
                    {[1, 2, 3].map(c => (
                        <button key={c} onClick={() => fresh(c)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500">
                            <Shuffle className="h-3.5 w-3.5" />{c} clause{c > 1 ? 's' : ''}
                        </button>
                    ))}
                </div>
                <div><Caption>Source, {src.length} words (click a word to swap it for another of its kind)</Caption><Chips words={src.map(i => SRC_WORDS[i])} onClick={cycle} /></div>
                <div><Caption>Plain model: {sp.right} of {sp.words} words right</Caption><Chips words={plainOut.map(w => TGT_WORDS[w])} marks={marksFor(plainOut, want)} /></div>
                <div><Caption>With attention{uniform ? ' (weights spread evenly)' : ''}: {sa.right} of {sa.words} words right</Caption><Chips words={at.ids.map(w => TGT_WORDS[w])} marks={marksFor(at.ids, want)} /></div>
                <div>
                    <Caption>Attention weights — click a row to inspect that step</Caption>
                    <AttentionMap src={src} out={at.ids} alpha={at.steps.map(x => x.alpha)} selected={{ i: row, j: Math.min(sel.j, src.length - 1) }} onSelect={(i, j) => setSel({ i, j })} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <Caption>Step {row + 1}: scores against each source word</Caption>
                        <ValueChips src={src} values={st.scores} />
                    </div>
                    <div>
                        <Caption>Step {row + 1}: next word</Caption>
                        <ProbBars items={bars.map(b => ({ label: TGT_WORDS[b.v], p: b.p }))} chosen={0} accent="#818cf8" />
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Unplug className="h-4 w-4 text-amber-400" />Break it: spread the attention evenly</h3>
                <p className="text-xs text-slate-400">Keep the scores but ignore them: every source word gets weight 1/{src.length}, so the context is the plain average of the encoder states.</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setUniform(v => !v)} aria-pressed={uniform}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${uniform ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-amber-500'}`}>
                        <Unplug className="h-3.5 w-3.5" />{uniform ? 'Weights spread evenly' : 'Spread the weights evenly'}
                    </button>
                    {uniform && <button onClick={() => setUniform(false)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                {uniform && (
                    <BreakNote>
                        The decoder still runs, but its context no longer points at a word: {sa.right} of {sa.words} words right here. On 400 three-clause test sentences the evenly spread weights get {pct(UNIFORM_RATE)} of words right — worse than the plain model&apos;s {pct(rate(file.evaluation.plain.byClauses[3]))}, because this decoder learned to expect a context that names one word. Attention helps by choosing, not by averaging.
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function WhyAttentionPage() {
    const loaded = useLoaded(() => loadTranslateModels());
    const file = loaded.data;
    const [mode, setMode] = useState('guided');
    const [presetIndex, setPresetIndex] = useState(0);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const stepHistory = useMemo(() => (file ? generateSteps(file, presetIndex) : []), [file, presetIndex]);
    const play = useStepPlayback(stepHistory, 1800);
    const step = play.step;
    const predict = usePredict(stepHistory, play.current, predictFor, play.pause);
    const [exploreKey, setExploreKey] = useState(0);
    const toExplore = () => { setExploreKey(k => k + 1); setMode('explore'); play.pause(); };
    const tex = step ? formulaFor(step) : null;
    const align = useMemo(() => (file ? measureAlignment(file.nets.attention) : null), [file]);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/transformers" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Transformers
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Why Attention</h1>
                    <p className="text-indigo-50 max-w-3xl">
                        A seq2seq decoder has to remember a whole sentence in one vector, and on long sentences it cannot. Give it every encoder state and a way to choose among them, and watch the same small translator read the sentence word by word as it writes.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/deep-learning-architectures/sequence-to-sequence" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Sequence-to-Sequence</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Translate your own', MousePointer2]]} mode={mode}
                            setMode={(m) => (m === 'explore' ? (file ? toExplore() : null) : setMode(m))} accent="indigo" />
                        <SourceChip kind="toy">Trained for this site · GRU encoder–decoder with attention · {file ? seq2seqParamCount(file.nets.attention).toLocaleString('en-US') : '10,256'} numbers</SourceChip>
                    </div>

                    {loaded.error ? (
                        <LoadError error={loaded.error} onRetry={loaded.retry} accent="indigo" what="The trained translators" />
                    ) : !file ? (
                        <LoadingCard text="Loading the trained translators (172 KB)…" />
                    ) : mode === 'explore' ? (
                        <Explore key={exploreKey} file={file} initial={ids(PRESETS[presetIndex].text)} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Sentence:</span>
                                {PRESETS.map((pr, k) => (
                                    <button key={pr.label} onClick={() => { setPresetIndex(k); play.pause(); }} aria-pressed={presetIndex === k}
                                        className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${presetIndex === k ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100' : 'border-slate-700 text-slate-400 hover:border-indigo-500'}`}>{pr.label}</button>
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

                    <InCode title="One attention step in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="One attention step" icon={Eye}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="font-mono text-slate-200">Score</span>: the decoder state against every encoder state, eₜⱼ = hₜ · hⱼ.</li>
                            <li><span className="font-mono text-slate-200">Weigh</span>: softmax, so the weights are positive and add to 1.</li>
                            <li><span className="font-mono text-slate-200">Read</span>: the weighted average of the encoder states, cₜ.</li>
                            <li><span className="font-mono text-slate-200">Write</span>: the next word from [hₜ; cₜ]. A transformer does the same with queries, keys and values, and nothing recurrent.</li>
                        </ul>
                    </Card>

                    <Misconception claim="Attention gives the decoder a better summary of the sentence.">
                        {align ? (
                            <p>It gives it a different reading for every word it writes. Over {align.n.toLocaleString('en-US')} output words of 200 test sentences, the largest weight takes {pct(align.top)} of the total on average and lands on the source word being translated {pct1(align.hit)} of the time. Average the states evenly instead — one summary for every step — and three-clause accuracy drops to {pct(UNIFORM_RATE)}.</p>
                        ) : <p>Measuring once the models have loaded…</p>}
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
