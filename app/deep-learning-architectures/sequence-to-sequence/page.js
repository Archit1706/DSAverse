"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Languages, BookOpen, Package, PenLine, AlignJustify, LineChart, Eye,
    CheckCircle, XCircle, Wrench, Shuffle, Repeat,
} from 'lucide-react';
import { translate, encode, seq2seqParamCount, loadTranslateModels } from '@/lib/ml/seq2seq';
import { runSequence, softmax, oneHot } from '@/lib/ml/recurrent';
import { SRC_WORDS, TGT_WORDS, BOS, EOS } from '@/lib/ml/sequenceTasks';
import useLoaded from '@/lib/ml/useLoaded';
import { createRng } from '@/lib/random';
import Heatmap from '@/components/ml/Heatmap';
import ProbBars from '@/components/ml/ProbBars';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card,
} from '@/components/ml/TourKit';

/* ── the task ──────────────────────────────────────────────
   A toy translation from an English-like source to a French-like target,
   word for word except that an adjective moves after its noun:
   "the big cat sees a dog" → "le chat grand voit un chien". Sentences are
   one to three clauses joined by "and", at most one adjective per noun.

   Two GRU encoder–decoders with 32 hidden units were trained for this site
   (scripts/ml/train_recurrent.mjs translate). The plain one hands the
   decoder only the encoder's last state; the attention one also lets every
   decoder step look back at every encoder state. Every number on the page
   comes from running them. */

const KIND = {
    the: 'det', a: 'det', red: 'adj', big: 'adj', small: 'adj', old: 'adj',
    cat: 'noun', dog: 'noun', bird: 'noun', fox: 'noun', sees: 'verb', likes: 'verb', chases: 'verb', and: 'conj',
};
const OF_KIND = Object.fromEntries(['det', 'adj', 'noun', 'verb'].map(k => [k, SRC_WORDS.filter(w => KIND[w] === k)]));
const ids = (sentence) => sentence.split(' ').map(w => SRC_WORDS.indexOf(w));
const srcText = (src) => src.map(i => SRC_WORDS[i]).join(' ');
const tgtText = (tgt) => tgt.map(i => TGT_WORDS[i]).join(' ');

/** The reference translation: lexicon ids are shared, so only the adjectives move (after their noun). */
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

const TAIL = ' and the old dog likes a bird and a red cat chases the fox';
const PRESETS = [
    { label: 'the big cat sees a dog', short: 'the big cat sees a dog' },
    { label: 'a small bird likes the old fox', short: 'a small bird likes the old fox' },
    { label: 'the red fox chases a bird', short: 'the red fox chases a bird' },
    { label: 'a dog sees the small cat', short: 'a dog sees the small cat' },
];

const ACTS = [
    { id: 1, label: 'The Task', icon: Languages },
    { id: 2, label: 'The Encoder Reads', icon: BookOpen },
    { id: 3, label: 'One Vector', icon: Package },
    { id: 4, label: 'The Decoder Writes', icon: PenLine },
    { id: 5, label: 'A Longer Sentence', icon: AlignJustify },
    { id: 6, label: 'Quality vs Length', icon: LineChart },
    { id: 7, label: 'Looking Back', icon: Eye },
];

const num = (v, d = 2) => {
    const r = Math.round(v * 10 ** d) / 10 ** d;
    return `${r < 0 ? '−' : ''}${Math.abs(r).toFixed(d)}`;
};
const pct = (v) => `${Math.round(v * 100)}%`;
const run = (model, src) => translate(model, src, { bos: BOS, eos: EOS, maxLen: 40 });
/** Words right at the same position, and whether the whole sentence is right. */
function score(out, want) {
    let right = 0;
    for (let t = 0; t < want.length; t++) if (out[t] === want[t]) right++;
    return { right, words: want.length, exact: out.length === want.length && right === want.length };
}
const rate = (b) => b.right / b.words;

/** Greedy decoding from a given starting state: the plain decoder sees nothing else. */
function decodeFrom(model, h0, maxLen = 40) {
    let h = h0, prev = BOS;
    const out = [];
    for (let t = 0; t < maxLen; t++) {
        const r = runSequence(model.dec, [oneHot(prev, model.Vt)], { h });
        h = r.h;
        const p = softmax(r.steps[0].y);
        let best = 0;
        for (let v = 1; v < p.length; v++) if (p[v] > p[best]) best = v;
        if (best === EOS) break;
        out.push(best);
        prev = best;
    }
    return out;
}

/** Top entries of a distribution over target words, for the bars. */
const topK = (probs, k = 5) => Array.from(probs, (p, v) => ({ v, p })).sort((a, b) => b.p - a.p).slice(0, k);

function generateSteps(file, presetIndex) {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, presetIndex, ...data, explanation });
    const { plain, attention } = file.nets;
    const src = ids(PRESETS[presetIndex].short);
    const want = referenceOf(src);
    const H = plain.H;
    const { E } = encode(plain, src);
    const tr = run(plain, src);
    const T = src.length;

    s(1, 'The Task', { kind: 'task', src, want, align: alignmentOf(src) },
        `A toy translation: "${srcText(src)}" becomes "${tgtText(want)}". The words translate one for one, but an adjective moves after its noun, so the output cannot be written while the input is still being read — "${TGT_WORDS[want[1]]}" is needed before the word that came before it. An encoder–decoder reads the whole sentence first, then writes.`);

    s(2, 'The Encoder Reads', { kind: 'encode', src, E },
        `The encoder is a GRU. It reads "${srcText(src)}" one word at a time, each word a one-hot vector of ${SRC_WORDS.length}, and updates its ${H}-number state after every word. Each row of the heatmap is the state after one word: ${T} rows of ${H}.`);

    s(3, 'One Vector', { kind: 'vector', src, last: E[T - 1] },
        `Only the last row goes on. These ${H} numbers start the decoder, and in this plain model they are all it ever sees of the source: the whole sentence, squeezed into one vector.`);

    tr.steps.forEach((st, u) => {
        const word = st.word;
        const wantWord = u < want.length ? want[u] : EOS;
        const p = st.probs[word];
        s(4, 'The Decoder Writes', { kind: 'decode', src, want, u, written: tr.steps.slice(0, u + 1).map(x => x.word), bars: topK(st.probs), word, wantWord },
            `${u === 0 ? 'The decoder is another GRU, started from that vector. It is fed the start marker <s> and outputs a probability for each of the 16 target words. ' : `It is fed the word it just wrote, "${TGT_WORDS[tr.steps[u - 1].word]}", and runs one more step. `}It writes "${TGT_WORDS[word]}" with probability ${num(p)}${word === wantWord ? '' : ` — the reference says "${TGT_WORDS[wantWord]}"`}.${word === EOS ? ` The end marker: ${tr.ids.length} words written${score(tr.ids, want).exact ? ', every one right.' : '.'}` : ''}`);
    });

    const long = ids(PRESETS[presetIndex].short + TAIL);
    const longWant = referenceOf(long);
    const longOut = run(plain, long).ids;
    const sc = score(longOut, longWant);
    const firstLen = want.length;
    const firstRight = longOut.slice(0, firstLen).every((w, t) => w === longWant[t]);
    s(5, 'A Longer Sentence', { kind: 'long', src: long, want: longWant, out: longOut },
        `Now the same clause with two more after it: ${long.length} words in. The vector is still ${H} numbers. The plain model gets ${sc.right} of ${sc.words} words right. ${firstRight ? 'The first clause still comes out correctly' : 'Even the first clause, which it translated perfectly on its own, now comes out wrong'}, but the later clauses dissolve into frequent words like "${TGT_WORDS[mostCommonWrong(longOut, longWant)]}": the sentence did not fit.`);

    const byC = file.evaluation.plain.byClauses, att = file.evaluation.attention.byClauses;
    s(6, 'Quality vs Length', { kind: 'quality', evaluation: file.evaluation },
        `Measured over ${byC[1].sentences * 3} test sentences: with one clause the plain model gets ${pct(rate(byC[1]))} of words right and ${pct(byC[1].exact / byC[1].sentences)} of sentences entirely right. With two clauses, ${pct(rate(byC[2]))} of words and ${pct(byC[2].exact / byC[2].sentences)} of sentences; with three, ${pct(rate(byC[3]))} and ${pct(byC[3].exact / byC[3].sentences)}. Quality falls with length because the vector does not grow.`);

    const at = run(attention, long);
    const attScore = score(at.ids, longWant);
    s(7, 'Looking Back', { kind: 'attention', src: long, out: at.ids, want: longWant, alpha: at.steps.map(x => Array.from(x.alpha)) },
        `The fix: let every decoder step look back at all ${long.length} encoder states, score each against its own state, and read a weighted average of them. The same-sized network with this attention gets ${attScore.right} of ${attScore.words} words right here, and ${pct(rate(att[3]))} of words on three-clause test sentences. Each row of the heatmap is one output word; it puts its weight on the source word it translates — including the jumps where adjectives move. That is where transformers begin.`);
    return steps;
}
function mostCommonWrong(out, want) {
    const c = {};
    out.forEach((w, t) => { if (w !== want[t]) c[w] = (c[w] ?? 0) + 1; });
    return Number(Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? out[0]);
}

/* No predict prompts on this page, deliberately. The decoder's right next
   word is fixed by one rule — the noun jumps ahead of its adjective — so the
   only step that tests the idea always has the same kind of answer. Every
   four-option set tried leaked it: "first noun" 41%, "first adjective" 44%,
   "not yet written" 55%, and "earliest untranslated source word" solves the
   adjective steps outright. Measured over 970 prompts on random sentences. */

function formulaFor(step) {
    switch (step.kind) {
        case 'encode': return String.raw`e_t = \mathrm{GRU}(e_{t-1},\, x_t), \quad e_t \in \mathbb{R}^{32}`;
        case 'vector':
        case 'long': return String.raw`h_0 = e_T \quad \text{(the decoder's only view of the source)}`;
        case 'decode': return String.raw`h_u = \mathrm{GRU}(h_{u-1},\, y_{u-1}), \quad p(y_u) = \mathrm{softmax}(V h_u + c)`;
        case 'attention': return String.raw`\alpha_{uj} = \mathrm{softmax}_j(h_u \cdot e_j), \quad c_u = \textstyle\sum_j \alpha_{uj}\, e_j, \quad p(y_u) = \mathrm{softmax}(W_o[h_u;\, c_u] + b_o)`;
        default: return null;
    }
}

/* Explore: a random sentence from the grammar, and the sentence whose vector the break-it swaps in. */
function randomSentence(rng, clauses) {
    const np = () => [rng.pick(OF_KIND.det), ...(rng.next() < 0.5 ? [rng.pick(OF_KIND.adj)] : []), rng.pick(OF_KIND.noun)];
    const words = [];
    for (let c = 0; c < clauses; c++) {
        if (c) words.push('and');
        words.push(...np(), rng.pick(OF_KIND.verb), ...np());
    }
    return ids(words.join(' '));
}
const SWAP_WITH = ids('a fox likes the bird');

const quizQuestions = [
    {
        question: 'In a plain encoder–decoder, what does the decoder receive from the source sentence?',
        options: [
            'Every encoder state, one per source word',
            'Only the encoder\'s final state, a fixed-size vector',
            'The source words themselves, one per step',
            'A count of the source words',
        ],
        correct: 1,
        explanation: 'The encoder\'s last state starts the decoder and is all it sees of the source. Here that is 32 numbers, whatever the sentence length.',
    },
    {
        question: 'The plain model here gets 100% of words right on one-clause sentences and 44% on three-clause ones. Why does length hurt?',
        options: [
            'Long sentences use words it has never seen',
            'The decoder runs out of output steps',
            'More words have to fit into the same 32 numbers',
            'Training only used one-clause sentences',
        ],
        correct: 2,
        explanation: 'Training used one to three clauses and every word is in the vocabulary. The bottleneck is the fixed-size vector: it does not grow with the sentence.',
    },
    {
        question: 'Why can\'t this translation be written word by word while reading the source?',
        options: [
            'Because the target vocabulary is larger',
            'Because the adjective moves after its noun, so a later source word is needed first',
            'Because the decoder needs a start marker',
            'Because GRUs can only read left to right',
        ],
        correct: 1,
        explanation: '"the big cat" becomes "le chat grand": "chat" comes from a source word after "big". The model has to read ahead, which is why the encoder reads the whole sentence before the decoder writes.',
    },
];

const codeExample = `import torch
import torch.nn as nn

class Seq2Seq(nn.Module):
    def __init__(self, src_vocab=14, tgt_vocab=16, d=32):
        super().__init__()
        self.enc = nn.GRU(src_vocab, d, batch_first=True)
        self.dec = nn.GRU(tgt_vocab, d, batch_first=True)
        self.out = nn.Linear(d, tgt_vocab)

    def forward(self, src, tgt_in):              # one-hot: [B, T, 14], [B, U, 16]
        _, h = self.enc(src)                     # h: [1, B, 32], the last state only
        states, _ = self.dec(tgt_in, h)          # the decoder starts from it
        return self.out(states)                  # [B, U, 16] scores per word

m = Seq2Seq()
print(sum(p.numel() for p in m.parameters()))   # 9936: PyTorch keeps two biases per GRU gate`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">{quizState.score === quizQuestions.length ? 'All correct.' : 'Step through the tour once more and try again.'}</p>
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
                    return <button key={i} onClick={() => answer(i)} disabled={quizState.answered} className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${tone}`}>{opt}</button>;
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className={`flex items-center gap-1.5 text-sm font-medium mb-1 ${quizState.selected === q.correct ? 'text-green-400' : 'text-red-400'}`}>
                        {quizState.selected === q.correct ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {quizState.selected === q.correct ? 'Correct' : 'Not quite'}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{q.explanation}</p>
                    <button onClick={next} className="text-sm px-4 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">
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
                        : highlight === i ? 'border-yellow-300 bg-yellow-400 text-slate-900' : 'border-slate-600 bg-slate-800 text-slate-100';
                const cls = `px-2 py-1 rounded-md border font-mono text-xs ${tone}`;
                return onClick
                    ? <button key={i} onClick={() => onClick(i)} className={`${cls} hover:border-yellow-400`} aria-label={`Change "${w}"`}>{w}</button>
                    : <span key={i} className={cls}>{w}</span>;
            })}
        </div>
    );
}
const marksFor = (out, want) => out.map((w, t) => (w === want[t] ? 'right' : 'wrong'));

/** Source words above, target words below, a line from each target word to its source. */
function AlignmentDiagram({ src, want, align }) {
    const n = Math.max(src.length, want.length), W = Math.max(360, n * 74), step = W / n;
    const x = (i) => Math.round((step * (i + 0.5)) * 100) / 100;
    return (
        <svg viewBox={`0 0 ${W} 130`} width="100%" role="img" aria-label="Which source word each target word translates">
            {align.map((j, u) => (
                <line key={u} x1={x(j)} y1="34" x2={x(u)} y2="96" stroke={j === u ? '#475569' : '#facc15'} strokeWidth={j === u ? 1.5 : 2.2} />
            ))}
            {src.map((w, j) => <text key={`s${j}`} x={x(j)} y="24" textAnchor="middle" fontSize="14" fill="#e2e8f0" fontFamily="monospace">{SRC_WORDS[w]}</text>)}
            {want.map((w, u) => <text key={`t${u}`} x={x(u)} y="116" textAnchor="middle" fontSize="14" fill="#fde68a" fontFamily="monospace">{TGT_WORDS[w]}</text>)}
        </svg>
    );
}

function QualityChart({ evaluation }) {
    const lens = Object.keys(evaluation.plain.byLength).map(Number).sort((a, b) => a - b);
    const W = 560, H = 210, L = 40, R = 12, T = 12, B = 34;
    const x = (len) => Math.round((L + ((len - lens[0]) / (lens.at(-1) - lens[0])) * (W - L - R)) * 100) / 100;
    const y = (v) => Math.round((T + (1 - v) * (H - T - B)) * 100) / 100;
    const line = (name, color) => lens.map(len => `${x(len)},${y(rate(evaluation[name].byLength[len]))}`).join(' ');
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
                <polyline fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="5 4" points={line('attention')} />
                <polyline fill="none" stroke="#facc15" strokeWidth="2.2" points={line('plain')} />
                {lens.map(len => <circle key={len} cx={x(len)} cy={y(rate(evaluation.plain.byLength[len]))} r="3" fill="#facc15" />)}
            </svg>
            <div className="flex flex-wrap gap-x-4 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-yellow-400" />plain: one vector</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-cyan-400" />with attention</span>
                <span className="text-slate-500">share of words right, 1,200 test sentences</span>
            </div>
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    switch (step.kind) {
        case 'task':
            return <div className="w-full"><AlignmentDiagram src={step.src} want={step.want} align={step.align} /></div>;
        case 'encode':
            return (
                <div className="w-full space-y-2">
                    <Caption>Encoder states, one row per word read <ShapeTag shape={[step.src.length, step.E[0].length]} /></Caption>
                    <div className="overflow-x-auto max-w-full">
                        <Heatmap data={step.E.map(r => Array.from(r))} rowLabels={step.src.map(i => SRC_WORDS[i])} scale="diverging" domain={[-1, 1]} cellSize={14} ariaLabel="Encoder states" />
                    </div>
                </div>
            );
        case 'vector':
            return (
                <div className="w-full space-y-3">
                    <Caption>The last state: everything the decoder gets <ShapeTag shape={[1, step.last.length]} /></Caption>
                    <div className="overflow-x-auto max-w-full">
                        <Heatmap data={[Array.from(step.last)]} rowLabels={[`after "${SRC_WORDS[step.src.at(-1)]}"`]} scale="diverging" domain={[-1, 1]} cellSize={16} ariaLabel="Final encoder state" />
                    </div>
                    <Chips words={step.src.map(i => SRC_WORDS[i])} />
                </div>
            );
        case 'decode':
            return (
                <div className="w-full grid sm:grid-cols-2 gap-4 items-start">
                    <div className="space-y-3">
                        <Caption>Source (seen only through the vector)</Caption>
                        <Chips words={step.src.map(i => SRC_WORDS[i])} />
                        <Caption>Written so far</Caption>
                        <Chips words={step.written.map(w => TGT_WORDS[w])} highlight={step.u} />
                    </div>
                    <div>
                        <Caption>Step {step.u + 1}: the five most likely words <ShapeTag shape={[1, TGT_WORDS.length]} /></Caption>
                        <ProbBars items={step.bars.map(b => ({ label: TGT_WORDS[b.v], p: b.p }))} chosen={0} accent="#facc15" />
                    </div>
                </div>
            );
        case 'long':
            return (
                <div className="w-full space-y-3">
                    <Caption>Source, {step.src.length} words</Caption>
                    <Chips words={step.src.map(i => SRC_WORDS[i])} />
                    <Caption>Reference</Caption>
                    <Chips words={step.want.map(w => TGT_WORDS[w])} />
                    <Caption>Plain model (green right, red wrong)</Caption>
                    <Chips words={step.out.map(w => TGT_WORDS[w])} marks={marksFor(step.out, step.want)} />
                </div>
            );
        case 'quality': return <div className="w-full"><QualityChart evaluation={step.evaluation} /></div>;
        case 'attention':
            return (
                <div className="w-full space-y-2">
                    <Chips words={step.out.map(w => TGT_WORDS[w])} marks={marksFor(step.out, step.want)} />
                    <Caption>Attention weights: each output word (row) over the source words (columns) <ShapeTag shape={[step.alpha.length, step.src.length]} /></Caption>
                    <div className="overflow-x-auto max-w-full">
                        <Heatmap data={step.alpha} rowLabels={step.alpha.map((_, u) => (u < step.out.length ? TGT_WORDS[step.out[u]] : '</s>'))}
                            colLabels={step.src.map(i => SRC_WORDS[i])} scale="sequential" domain={[0, 1]} cellSize={18} ariaLabel="Attention weights" />
                    </div>
                </div>
            );
        default: return null;
    }
}

/* ── explore: build a sentence ───────────────────────────── */

function Explore({ file, initial }) {
    const [src, setSrc] = useState(initial);
    const [seed, setSeed] = useState(1);
    const [swapped, setSwapped] = useState(false);
    const want = useMemo(() => referenceOf(src), [src]);
    const plainOut = useMemo(() => (swapped
        ? decodeFrom(file.nets.plain, encode(file.nets.plain, SWAP_WITH).E.at(-1))
        : run(file.nets.plain, src).ids), [file, src, swapped]);
    const attOut = useMemo(() => run(file.nets.attention, src).ids, [file, src]);
    const cycle = (i) => {
        const w = SRC_WORDS[src[i]], k = KIND[w];
        if (k === 'conj') return;
        const list = OF_KIND[k];
        const next = list[(list.indexOf(w) + 1) % list.length];
        setSrc(s => s.map((x, j) => (j === i ? SRC_WORDS.indexOf(next) : x)));
    };
    const fresh = (clauses) => { setSrc(randomSentence(createRng(seed * 31 + clauses), clauses)); setSeed(s => s + 1); };
    const sp = score(plainOut, want), sa = score(attOut, want);
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">New sentence:</span>
                    {[1, 2, 3].map(c => (
                        <button key={c} onClick={() => fresh(c)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-yellow-500">
                            <Shuffle className="h-3.5 w-3.5" />{c} clause{c > 1 ? 's' : ''}
                        </button>
                    ))}
                </div>
                <div>
                    <Caption>Source, {src.length} words (click a word to swap it for another of its kind)</Caption>
                    <Chips words={src.map(i => SRC_WORDS[i])} onClick={cycle} />
                </div>
                <div>
                    <Caption>Reference</Caption>
                    <Chips words={want.map(w => TGT_WORDS[w])} />
                </div>
                <div>
                    <Caption>Plain model{swapped ? ' (given another sentence\'s vector)' : ''}: {sp.right} of {sp.words} words right</Caption>
                    <Chips words={plainOut.map(w => TGT_WORDS[w])} marks={marksFor(plainOut, want)} />
                </div>
                <div>
                    <Caption>With attention: {sa.right} of {sa.words} words right</Caption>
                    <Chips words={attOut.map(w => TGT_WORDS[w])} marks={marksFor(attOut, want)} />
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Repeat className="h-4 w-4 text-amber-400" />Break it: swap the vector</h3>
                <p className="text-xs text-slate-400">Start the plain decoder from the encoding of a different sentence, &quot;{srcText(SWAP_WITH)}&quot;, instead of this one.</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSwapped(v => !v)} aria-pressed={swapped}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${swapped ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-amber-500'}`}>
                        <Repeat className="h-3.5 w-3.5" />{swapped ? 'Vector swapped' : 'Swap the vector'}
                    </button>
                    {swapped && <button onClick={() => setSwapped(false)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                {swapped && (
                    <BreakNote>
                        The decoder now writes &quot;{tgtText(plainOut)}&quot;, a translation of the other sentence, whatever you type above. It has no other view of the source: those {file.nets.plain.H} numbers are the whole message.
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function SequenceToSequencePage() {
    const loaded = useLoaded(() => loadTranslateModels());
    const file = loaded.data;
    const [mode, setMode] = useState('guided');
    const [presetIndex, setPresetIndex] = useState(0);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const stepHistory = useMemo(() => (file ? generateSteps(file, presetIndex) : []), [file, presetIndex]);
    const play = useStepPlayback(stepHistory, 1700);
    const step = play.step;
    const [exploreKey, setExploreKey] = useState(0);
    const toExplore = () => { setExploreKey(k => k + 1); setMode('explore'); play.pause(); };
    const tex = step ? formulaFor(step) : null;
    const byC = file?.evaluation.plain.byClauses;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/deep-learning-architectures" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Deep Learning Architectures
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Sequence-to-Sequence</h1>
                    <p className="text-yellow-50 max-w-3xl">
                        One network reads a sentence, another writes its translation, and between them sits a single vector of 32 numbers. Watch a trained encoder–decoder translate, and see what happens when the sentence no longer fits.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/deep-learning-architectures/lstm-and-gru" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">LSTM and GRU</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Translate your own', MousePointer2]]} mode={mode}
                            setMode={(m) => (m === 'explore' ? (file ? toExplore() : null) : setMode(m))} accent="yellow" />
                        <SourceChip kind="toy">Trained for this site · GRU encoder–decoder · {file ? seq2seqParamCount(file.nets.plain).toLocaleString('en-US') : '9,744'} numbers</SourceChip>
                    </div>

                    {loaded.error ? (
                        <LoadError error={loaded.error} onRetry={loaded.retry} accent="yellow" what="The trained translators" />
                    ) : !file ? (
                        <LoadingCard text="Loading the trained translators (180 KB)…" />
                    ) : mode === 'explore' ? (
                        <Explore key={exploreKey} file={file} initial={ids(PRESETS[presetIndex].short)} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Sentence:</span>
                                {PRESETS.map((pr, k) => (
                                    <button key={pr.label} onClick={() => { setPresetIndex(k); play.pause(); }} aria-pressed={presetIndex === k}
                                        className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${presetIndex === k ? 'border-yellow-400 bg-yellow-500/15 text-yellow-100' : 'border-slate-700 text-slate-400 hover:border-yellow-500'}`}>{pr.label}</button>
                                ))}
                            </div>
                            <TourPlayer acts={ACTS} steps={stepHistory} play={play} accent="yellow" minHeight="min-h-[300px]">
                                <VisualizationPanel step={step} />
                            </TourPlayer>
                            <ExplanationBox text={step?.explanation} accent="yellow" />
                            {tex && <FormulaPanel><div className="overflow-x-auto"><Tex block>{tex}</Tex></div></FormulaPanel>}
                        </>
                    )}

                    <InCode title="The same model in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="Two networks, one message" icon={Package}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="font-mono text-slate-200">Encoder</span>: a GRU that reads the source, one word at a time.</li>
                            <li><span className="font-mono text-slate-200">Vector</span>: its last state, 32 numbers for any sentence.</li>
                            <li><span className="font-mono text-slate-200">Decoder</span>: a GRU started from that vector, writing one word per step and reading back what it wrote.</li>
                            <li>Training feeds the decoder the right previous word (teacher forcing); translating feeds it its own.</li>
                        </ul>
                    </Card>

                    <Misconception claim="The encoder's final state is a summary that holds the whole sentence.">
                        {byC ? (
                            <p>It holds what fits in 32 numbers. On 1,200 test sentences the plain model gets {pct(rate(byC[1]))} of words right with one clause, {pct(rate(byC[2]))} with two and {pct(rate(byC[3]))} with three — and not one sentence of two or more clauses entirely right ({pct((byC[2].exact + byC[3].exact) / (byC[2].sentences + byC[3].sentences))}). With attention, the same-sized network gets {pct(rate(file.evaluation.attention.byClauses[3]))} of three-clause words right.</p>
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
