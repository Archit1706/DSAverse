"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2, Shuffle,
    Gauge, Grid2x2, Calculator, SlidersHorizontal, LineChart, Scale, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── data, the model and the counting ─────────────────────
   One feature x, normal with mean SEP for positives and 0 for negatives.
   A logistic regression is fitted to 300 training points by Newton's
   method, then scores a separate test set it never saw. Everything else
   on the page is counting: which test points land on each side of a
   threshold t, and the ratios of those counts. */

const N_TRAIN = 300;
const N_TEST = 120;
const PREVALENCE = 0.25;
const RARE_N = 200;
const RARE_PREVALENCE = 0.05;
const SEP = 1.5;
const DEFAULT_SEED = 4;
const T0 = 0.5;
const MOVES = 6;
const STUDY_RUNS = 200;
const COL = { pos: '#fb923c', neg: '#38bdf8', t: '#facc15', cross: '#f8fafc' };

const ACTS = [
    { id: 1, label: 'Scores', icon: Gauge },
    { id: 2, label: 'Confusion', icon: Grid2x2 },
    { id: 3, label: 'Metrics', icon: Calculator },
    { id: 4, label: 'Threshold', icon: SlidersHorizontal },
    { id: 5, label: 'Curves', icon: LineChart },
    { id: 6, label: 'Imbalance', icon: Scale },
];

const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const tn = (v, d = 2) => f(v, d).replace('−', '-');
const pct = (x) => `${(100 * x).toFixed(1)}%`;
const show = (v, d = 3) => (v === null ? '—' : f(v, d));
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

function drawSet(rng, n, positives, sep) {
    return Array.from({ length: n }, (_, i) => { const y = i < positives ? 1 : 0; return { x: rng.normal(y ? sep : 0, 1), y }; });
}
/** Logistic regression on one feature by Newton's method, with a whisper of ridge so it cannot diverge. */
function fitLogistic(pts, ridge = 1e-3, iters = 30) {
    let w = 0, b = 0;
    for (let it = 0; it < iters; it++) {
        let gw = ridge * w, gb = 0, hww = ridge, hwb = 0, hbb = 1e-9;
        for (const p of pts) {
            const q = sigmoid(w * p.x + b), r = q * (1 - q);
            gw += (q - p.y) * p.x; gb += q - p.y;
            hww += r * p.x * p.x; hwb += r * p.x; hbb += r;
        }
        const det = hww * hbb - hwb * hwb;
        w -= (hbb * gw - hwb * gb) / det;
        b -= (hww * gb - hwb * gw) / det;
    }
    return { w, b };
}
/** A trained model and the scores it gives a fresh test set. */
function makeTest(seed, { n = N_TEST, prevalence = PREVALENCE, sep = SEP } = {}) {
    const rng = createRng(seed);
    const model = fitLogistic(drawSet(rng, N_TRAIN, Math.round(N_TRAIN * prevalence), sep));
    const test = drawSet(rng, n, Math.max(1, Math.round(n * prevalence)), sep);
    return { model, items: test.map((p, id) => ({ id, s: sigmoid(model.w * p.x + model.b), y: p.y })) };
}

/** Predicted yes when the score is at least t. */
function confusion(items, t) {
    const cm = { tp: 0, fp: 0, fn: 0, tn: 0 };
    for (const { s, y } of items) {
        if (s >= t) { if (y) cm.tp++; else cm.fp++; } else if (y) cm.fn++; else cm.tn++;
    }
    return cm;
}
function metrics({ tp, fp, fn, tn }) {
    const n = tp + fp + fn + tn;
    const precision = tp + fp ? tp / (tp + fp) : null;
    const recall = tp + fn ? tp / (tp + fn) : null;
    const f1 = precision === null || recall === null ? null : precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return { n, accuracy: (tp + tn) / n, precision, recall, f1, specificity: fp + tn ? tn / (fp + tn) : null, fpr: fp + tn ? fp / (fp + tn) : null };
}
/** (FPR, TPR) at every threshold, from "everything yes" down to "nothing yes", read off the ranking. */
function rocCurve(items) {
    const sorted = [...items].sort((a, b) => b.s - a.s);
    const P = items.filter(i => i.y).length, N = items.length - P;
    const pts = [{ fpr: 0, tpr: 0 }];
    let tp = 0, fp = 0;
    sorted.forEach((it, k) => {
        if (it.y) tp++; else fp++;
        if (k === sorted.length - 1 || sorted[k + 1].s !== it.s) pts.push({ fpr: fp / N, tpr: tp / P });
    });
    return pts;
}
const trapezoid = (pts) => pts.slice(1).reduce((a, p, i) => a + (p.fpr - pts[i].fpr) * (p.tpr + pts[i].tpr) / 2, 0);
/** (recall, precision) for every cut down the ranking, and average precision Σ (Rₖ − Rₖ₋₁) Pₖ. */
function prCurve(items) {
    const sorted = [...items].sort((a, b) => b.s - a.s);
    const P = items.filter(i => i.y).length;
    const pts = [];
    let tp = 0, ap = 0, lastR = 0;
    sorted.forEach((it, k) => {
        if (it.y) tp++;
        if (k === sorted.length - 1 || sorted[k + 1].s !== it.s) {
            const r = tp / P, p = tp / (k + 1);
            ap += (r - lastR) * p;
            lastR = r;
            pts.push({ recall: r, precision: p });
        }
    });
    return { pts, ap };
}

/* The threshold moves: six of them, each from a fresh spot on the axis
   and crossing one to three points of a single class. Raising t takes
   points out of "yes", lowering puts them in; a negative leaving or a
   positive arriving raises precision, the other two lower it. Each move's
   direction and class are drawn at random, independently, so neither
   "raising helps", "a positive crossed, so it went up" nor any pattern in
   the earlier answers beats a coin. (A single walk where each move starts
   where the last stopped was tried first: turning round re-crosses the
   same points and always flips the answer, so "the opposite of last time"
   scored 73%. Forcing two of each kind per tour has the same flaw in a
   milder form.) Thresholds sit halfway between neighbouring scores, both
   ends keep at least one TP and one FP so the change is strict, and starts
   stay between 0.1 and 0.9, where both classes live. */
const KINDS = ['raise-0', 'raise-1', 'lower-0', 'lower-1'];
function thresholdMoves(items, seed) {
    const rng = createRng(seed * 17 + 3);
    const sorted = [...items].sort((a, b) => a.s - b.s);
    const cuts = sorted.slice(1).map((it, i) => (it.s + sorted[i].s) / 2).filter(c => c > 0.04 && c < 0.96);
    const valid = (t) => { const cm = confusion(items, t); return cm.tp >= 1 && cm.fp >= 1; };
    const byKind = Object.fromEntries(KINDS.map(k => [k, []]));
    cuts.forEach((from, i) => {
        if (from < 0.1 || from > 0.9 || !valid(from)) return;
        for (const dir of [1, -1]) {
            for (let j = i + dir, n = 1; j >= 0 && j < cuts.length && n <= 3; j += dir) {
                const to = cuts[j];
                const x = items.filter(it => it.s >= Math.min(from, to) && it.s < Math.max(from, to));
                n = x.length;
                if (n > 3 || !x.every(it => it.y === x[0].y)) break;
                if (Math.abs(to - from) >= 0.005 && valid(to)) byKind[`${dir > 0 ? 'raise' : 'lower'}-${x[0].y}`].push({ from, to });
            }
        }
    });
    const moves = [];
    for (let k = 0; k < MOVES; k++) {
        const open = KINDS.filter(kind => byKind[kind].length);
        if (!open.length) return null;
        const kind = rng.pick(KINDS);
        const use = byKind[kind].length ? kind : rng.pick(open);
        moves.push({ ...rng.pick(byKind[use]), kind: use });
    }
    return moves;
}

/* "High accuracy means a good classifier": screening sets with 5%
   positives, the fitted model at 0.5 against saying no to everyone. */
function accuracyStudy(runs = STUDY_RUNS) {
    let noWins = 0, acc = 0, rec = 0, auc = 0;
    for (let r = 1; r <= runs; r++) {
        const { items } = makeTest(r * 7919, { n: RARE_N, prevalence: RARE_PREVALENCE });
        const m = metrics(confusion(items, T0));
        const always = metrics(confusion(items, Infinity));
        if (always.accuracy >= m.accuracy) noWins++;
        acc += m.accuracy; rec += m.recall; auc += trapezoid(rocCurve(items));
    }
    return { runs, noWins, acc: acc / runs, recall: rec / runs, auc: auc / runs };
}

const COUNT = ['no', 'one', 'two', 'three'];
const some = (n, cls) => `${COUNT[n]} ${cls}${n === 1 ? '' : 's'}`;

const generateSteps = (seed) => {
    const steps = [];
    // A test set with nowhere to make one of the moves draws again (it does not happen in practice).
    let items, moves = null;
    for (let k = 0; !moves && k < 20; k++) {
        ({ items } = makeTest(seed + k * 1000));
        moves = thresholdMoves(items, seed);
    }
    const P = items.filter(i => i.y).length, N = items.length - P;
    const s = (act, extra) => steps.push({ act, actName: ACTS[act - 1].label, items, ...extra });
    const cm0 = confusion(items, T0), m0 = metrics(cm0);

    s(1, {
        explanation: `${items.length} test points: ${P} actually positive (orange) and ${N} negative (blue). A logistic regression fitted to ${N_TRAIN} other points gives each one a score — its estimated chance of being positive. It never saw these ${items.length}. Positives tend to score higher, but the two groups overlap.`,
    });
    s(1, {
        t: T0,
        explanation: `To act on a score, turn it into yes or no: yes when the score is at least the threshold t = ${f(T0)}. That says yes to ${cm0.tp + cm0.fp} points — everything right of the line — and no to the other ${cm0.fn + cm0.tn}.`,
    });
    s(2, {
        t: T0, cm: cm0,
        explanation: `Every point lands in one of four cells. Actually positive and said yes: ${cm0.tp} true positives. Actually negative and said no: ${cm0.tn} true negatives. The cells add up to ${items.length}.`,
    });
    s(2, {
        t: T0, cm: cm0, highlight: ['fp', 'fn'],
        explanation: `The two kinds of mistake, ringed: ${cm0.fp} false positive${cm0.fp === 1 ? '' : 's'} — negatives that scored ${f(T0)} or more — and ${cm0.fn} false negative${cm0.fn === 1 ? '' : 's'}, positives the model scored below the line. Which mistake costs more depends on the job: a missed tumour is not a wasted biopsy.`,
    });
    s(3, {
        t: T0, cm: cm0, metric: 'accuracy',
        explanation: `Accuracy is the share of all points in the right cell: (${cm0.tp} + ${cm0.tn}) / ${items.length} = ${pct(m0.accuracy)}. It treats both mistakes alike and, as act 6 shows, can look excellent while the model is useless.`,
    });
    s(3, {
        t: T0, cm: cm0, metric: 'pr', highlight: ['tp'],
        explanation: `Precision asks: of the ${cm0.tp + cm0.fp} yeses, how many were right? ${cm0.tp} / ${cm0.tp + cm0.fp} = ${show(m0.precision)}. Recall asks: of the ${P} real positives, how many got a yes? ${cm0.tp} / ${P} = ${show(m0.recall)}. Both share the same numerator — the true positives — and differ in what they divide by.`,
    });
    s(3, {
        t: T0, cm: cm0, metric: 'f1',
        explanation: `F1 is their harmonic mean, 2PR / (P + R) = ${show(m0.f1)}: it is dragged towards the smaller of the two, so a model cannot score well by maxing one and ignoring the other. Specificity is recall for the negatives: ${cm0.tn} / ${N} = ${show(m0.specificity)}.`,
    });

    moves.forEach(({ from, to }, k) => {
        const cm = confusion(items, from), m = metrics(cm);
        const moved = items.filter(it => it.s >= Math.min(from, to) && it.s < Math.max(from, to));
        s(4, {
            t: from, next: to, crossing: moved.map(it => it.id), cm,
            explanation: `${k === 0 ? 'Now move the threshold.' : 'A fresh spot on the axis.'} At t = ${f(from, 3)}, precision is ${show(m.precision)} and recall ${show(m.recall)}. Next it moves to the dashed line at ${f(to, 3)}, and the ringed point${moved.length === 1 ? '' : 's'} will cross it.`,
        });
        const cm2 = confusion(items, to), m2 = metrics(cm2);
        const cls = moved[0].y ? 'positive' : 'negative';
        s(4, {
            t: to, cm: cm2, crossing: moved.map(it => it.id), moved: true,
            explanation: `The threshold ${to > from ? 'rose' : 'fell'} to ${f(to, 3)}, so ${some(moved.length, cls)} ${to > from ? 'dropped out of' : 'joined'} the yeses: precision ${show(m.precision)} → ${show(m2.precision)}, recall ${show(m.recall)} → ${show(m2.recall)}.${k === MOVES - 1 ? ' Recall moved only when positives crossed — it counts positives alone. Precision moved every time, up or down depending on which class crossed and which way: raising t tends to trade recall for precision, but not smoothly.' : ''}`,
        });
    });

    const roc = rocCurve(items), auc = trapezoid(roc);
    let pairs = 0;
    for (const a of items) if (a.y) for (const b of items) if (!b.y) pairs += a.s > b.s ? 1 : a.s === b.s ? 0.5 : 0;
    s(5, {
        t: T0, cm: cm0, roc, auc,
        explanation: `Every threshold at once. The ROC curve plots recall (the true-positive rate) against the false-positive rate as t sweeps from 1 down to 0; t = ${f(T0)} is the ringed point. The area under it, AUC = ${f(auc, 3)}, has a plain meaning: pick a random positive and a random negative, and the positive scores higher ${pct(auc)} of the time — ${pairs} of the ${P * N} pairs.`,
    });
    const pr = prCurve(items);
    s(5, {
        t: T0, cm: cm0, roc, auc, pr,
        explanation: `The precision–recall curve shows the same sweep from the yes side. Its baseline is the share of positives, ${pct(P / items.length)} — the precision random guessing gets at any threshold — and its area, average precision, is ${f(pr.ap, 3)}.`,
    });

    const rare = makeTest(seed + 50000, { n: RARE_N, prevalence: RARE_PREVALENCE });
    const rP = rare.items.filter(i => i.y).length;
    const none = metrics(confusion(rare.items, Infinity));
    s(6, {
        items: rare.items, t: 1.01, cm: confusion(rare.items, Infinity), rare: true,
        explanation: `A screening test: ${RARE_N} people, ${rP} with the condition. A "model" that says no to everyone is right about all ${RARE_N - rP} who are healthy — accuracy ${pct(none.accuracy)} — and finds none of the ${rP}. Recall 0.`,
    });
    const rcm = confusion(rare.items, T0), rm = metrics(rcm);
    const rroc = rocCurve(rare.items), rauc = trapezoid(rroc), rpr = prCurve(rare.items);
    s(6, {
        items: rare.items, t: T0, cm: rcm, rare: true, roc: rroc, auc: rauc, pr: rpr,
        explanation: `The real model, same kind and same overlap as before, at t = ${f(T0)}: accuracy ${pct(rm.accuracy)}${rm.accuracy <= none.accuracy ? ' — no better than saying no to everyone' : ` — ${f(100 * (rm.accuracy - none.accuracy), 1)} points above saying no to everyone`}, recall ${show(rm.recall)}. Its AUC is ${f(rauc, 3)}: AUC compares each positive with each negative, so it does not depend on how many there are of each — though with only ${rP} positives it wobbles from one set to the next. Average precision is ${f(rpr.ap, 3)} against a baseline of ${pct(rP / RARE_N)} — with rare positives, the precision–recall view tells the truth and accuracy hides it.`,
    });
    s(6, {
        items: rare.items, t: T0, cm: rcm, rare: true, roc: rroc, auc: rauc, pr: rpr, done: true,
        explanation: 'Switch to Explore: drag the threshold, change how rare the positives are and how well the classes separate, and try saying no to everyone.',
    });
    return steps;
};

/* ── predict ─────────────────────────────────────────────
   On each threshold step: once the ringed points cross the dashed line,
   does precision rise or fall? It needs both the direction of the move and
   the class of the crossing points — see thresholdMoves for the balance. */
const predictFor = (step, next) => {
    if (step.next === undefined || !next || next.t !== step.next) return null;
    const before = metrics(step.cm).precision, after = metrics(next.cm).precision;
    const moved = step.items.filter(it => step.crossing.includes(it.id));
    const raise = step.next > step.t;
    return {
        question: `The threshold ${raise ? 'rises' : 'falls'} to the dashed line and the ringed point${moved.length === 1 ? '' : 's'} cross${moved.length === 1 ? 'es' : ''} it. Does precision rise or fall?`,
        options: ['Rises', 'Falls'],
        correct: after > before ? 0 : 1,
        because: `${some(moved.length, moved[0].y ? 'positive' : 'negative').replace(/^one/, 'A').replace(/^t/, 'T')} ${raise ? 'left' : 'joined'} the yeses, so precision went ${show(before)} → ${show(after)}.`,
    };
};

function formulaFor(step) {
    const cm = step.cm;
    if (step.pr && step.done === undefined && !step.rare) return String.raw`\text{AP} = \sum_k (R_k - R_{k-1})\,P_k = ${tn(step.pr.ap, 3)}, \qquad \text{baseline} = \tfrac{P}{n}`;
    if (step.roc && !step.rare) return String.raw`\text{AUC} = \Pr(s_+ > s_-) = ${tn(step.auc, 3)}`;
    if (step.rare && cm) {
        const m = metrics(cm);
        return String.raw`\text{accuracy} = \frac{TP + TN}{n} = \frac{${cm.tp} + ${cm.tn}}{${m.n}} = ${tn(100 * m.accuracy, 1)}\%, \qquad \text{recall} = \frac{${cm.tp}}{${cm.tp + cm.fn}} = ${tn(m.recall, 2)}`;
    }
    if (!cm) return String.raw`\hat y = \begin{cases} 1 & s \ge t \\ 0 & s < t \end{cases}`;
    const m = metrics(cm);
    if (step.metric === 'accuracy') return String.raw`\text{accuracy} = \frac{TP + TN}{n} = \frac{${cm.tp} + ${cm.tn}}{${m.n}} = ${tn(m.accuracy, 3)}`;
    if (step.metric === 'f1') return String.raw`F_1 = \frac{2PR}{P + R} = \frac{2 \times ${tn(m.precision, 3)} \times ${tn(m.recall, 3)}}{${tn(m.precision, 3)} + ${tn(m.recall, 3)}} = ${tn(m.f1, 3)}`;
    if (step.metric === 'pr' || step.act === 4) {
        return String.raw`P = \frac{TP}{TP + FP} = \frac{${cm.tp}}{${cm.tp + cm.fp}} = ${tn(m.precision, 3)}, \qquad R = \frac{TP}{TP + FN} = \frac{${cm.tp}}{${cm.tp + cm.fn}} = ${tn(m.recall, 3)}`;
    }
    return String.raw`TP + FP + FN + TN = ${cm.tp} + ${cm.fp} + ${cm.fn} + ${cm.tn} = ${m.n}`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'A condition affects 1% of people. A test that says "no" to everyone has what accuracy?',
        options: ['1%', '50%', '99%', 'It is undefined'],
        correct: 2,
        explanation: 'It is right about the 99% who are healthy and wrong about the 1% who are not: 99% accurate, recall 0. With rare positives, accuracy rewards doing nothing.',
    },
    {
        question: 'You raise the classification threshold. What can happen to recall?',
        options: ['It can only rise', 'It can only fall or stay the same', 'It always rises with precision', 'It is unaffected by the threshold'],
        correct: 1,
        explanation: 'A higher threshold only removes points from the yeses, so true positives can only drop or stay. Precision has no such rule: it rises when a negative leaves and falls when a positive does.',
    },
    {
        question: 'A classifier has an ROC AUC of 0.85. What does that mean?',
        options: [
            'It is 85% accurate',
            'A random positive scores higher than a random negative 85% of the time',
            'Its precision is 0.85',
            '85% of points score above 0.5',
        ],
        correct: 1,
        explanation: 'AUC measures ranking, not any one threshold: it equals the fraction of positive–negative pairs that the scores put in the right order.',
    },
];

const codeExample = `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (confusion_matrix, accuracy_score, precision_score,
                             recall_score, f1_score, roc_auc_score, average_precision_score)

rng = np.random.default_rng(4)
def draw(n, pos):                       # one feature; positives shifted by 1.5
    y = np.r_[np.ones(pos), np.zeros(n - pos)].astype(int)
    return (rng.normal(size=n) + 1.5 * y)[:, None], y

model = LogisticRegression().fit(*draw(300, 75))
X, y = draw(120, 30)                    # a test set the model never saw
s = model.predict_proba(X)[:, 1]        # scores
yhat = (s >= 0.5).astype(int)           # threshold t = 0.5

print(confusion_matrix(y, yhat))        # [[87  3]    rows: actual 0, actual 1
                                        #  [19 11]]   columns: said no, said yes
for metric in (accuracy_score, precision_score, recall_score, f1_score):
    print(metric.__name__, round(metric(y, yhat), 3))
# accuracy_score 0.817, precision_score 0.786, recall_score 0.367, f1_score 0.5
print(round(roc_auc_score(y, s), 3), round(average_precision_score(y, s), 3))   # 0.873 0.696

X, y = draw(200, 10)                    # rare positives: 5%
print(accuracy_score(y, np.zeros(200, int)))             # 0.95   saying no to everyone
yhat = model.predict(X)
print(accuracy_score(y, yhat), recall_score(y, yhat))    # 0.905 0.3   less accurate, yet it finds 3 of the 10`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the threshold and imbalance acts, then retry.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-lime-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── pictures ───────────────────────────────────────────── */

const r2 = (v) => Math.round(v * 100) / 100;
const cellOf = (it, t) => (it.s >= t ? (it.y ? 'tp' : 'fp') : it.y ? 'fn' : 'tn');

/** Rows for a dot plot at exact scores: each dot takes the lowest row where
    it clears the previous dot by a diameter. Dots shrink until the taller side
    fits in about 100 px, and only then do the rows squeeze together. */
function swarm(items, px) {
    let lay;
    for (const rad of [3.6, 3, 2.4, 1.8]) {
        const gap = 2 * rad + 0.6, last = { 0: [], 1: [] }, row = new Map();
        for (const it of [...items].sort((a, b) => a.s - b.s)) {
            const x = px(it.s), rows = last[it.y];
            let k = rows.findIndex(lx => x - lx >= gap);
            if (k < 0) { k = rows.length; rows.push(x); } else rows[k] = x;
            row.set(it.id, k);
        }
        lay = { rad, gap, row, pos: last[1].length, neg: last[0].length };
        if (Math.max(lay.pos, lay.neg) * gap <= 100) break;
    }
    const dy = Math.min(lay.gap, 100 / Math.max(lay.pos, lay.neg, 1));
    return { ...lay, dy, rad: Math.min(lay.rad, dy / 2 + 0.8) };
}

/** Every test point as a dot at its exact score, positives above the axis and negatives below. */
function ScoreStrip({ items, t, next, crossing = [], highlight = [], onPick }) {
    const W = 560, L = 14, R = 14;
    const px = (s) => r2(L + s * (W - L - R));
    const { row, pos, neg, dy, rad } = swarm(items, px);
    const mid = r2(16 + pos * dy + 3), bottom = r2(mid + 3 + neg * dy);
    const H = r2(bottom + 30);
    const pick = (e) => {
        if (!onPick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const s = (((e.clientX - rect.left) / rect.width) * W - L) / (W - L - R);
        onPick(Math.round(Math.min(Math.max(s, 0), 1) * 100) / 100);
    };
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Test points placed by score: positives above the axis, negatives below"
            onClick={pick} style={onPick ? { cursor: 'crosshair' } : undefined}>
            {t !== undefined && t <= 1 && <rect x={px(t)} y="12" width={r2(px(1) - px(t))} height={r2(bottom - 10)} fill={COL.t} opacity="0.07" />}
            <line x1={L} x2={W - R} y1={mid} y2={mid} stroke="#334155" />
            {[0, 0.25, 0.5, 0.75, 1].map(v => <text key={v} x={px(v)} y={H - 4} fontSize="10" textAnchor="middle" fill="#64748b">{v}</text>)}
            <text x={L} y="10" fontSize="10" fill={COL.pos}>actually positive</text>
            <text x={W - R} y={r2(bottom + 12)} fontSize="10" textAnchor="end" fill={COL.neg}>actually negative</text>
            <text x={W - R} y="10" fontSize="10" textAnchor="end" fill="#64748b">score →</text>
            {items.map(it => {
                const k = row.get(it.id);
                const cy = r2(it.y ? mid - 3 - (k + 0.5) * dy : mid + 3 + (k + 0.5) * dy);
                const ringed = crossing.includes(it.id) || highlight.includes(cellOf(it, t ?? 2));
                return (
                    <g key={it.id}>
                        <circle cx={px(it.s)} cy={cy} r={rad} fill={it.y ? COL.pos : COL.neg} opacity={t === undefined || it.s >= t ? 1 : 0.5} />
                        {ringed && <circle cx={px(it.s)} cy={cy} r={r2(rad + 2.4)} fill="none" stroke={COL.cross} strokeWidth="1.5" />}
                    </g>
                );
            })}
            {t !== undefined && t <= 1 && <line x1={px(t)} x2={px(t)} y1="12" y2={r2(bottom + 2)} stroke={COL.t} strokeWidth="2" />}
            {next !== undefined && <line x1={px(next)} x2={px(next)} y1="12" y2={r2(bottom + 2)} stroke={COL.cross} strokeWidth="1.5" strokeDasharray="4 3" />}
        </svg>
    );
}

function ConfusionGrid({ cm, highlight = [] }) {
    const cell = (key, label, tone) => (
        <div className={`rounded-lg border p-2 text-center ${highlight.includes(key) ? 'ring-2 ring-white/70' : ''} ${tone}`}>
            <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
            <div className="font-mono text-lg">{cm[key]}</div>
        </div>
    );
    return (
        <div className="text-xs">
            <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 items-center">
                <span />
                <span className="text-center text-slate-400">said yes</span>
                <span className="text-center text-slate-400">said no</span>
                <span className="text-right pr-1" style={{ color: COL.pos }}>positive</span>
                {cell('tp', 'TP', 'border-emerald-600/50 bg-emerald-500/10 text-emerald-200')}
                {cell('fn', 'FN', 'border-amber-600/50 bg-amber-500/10 text-amber-200')}
                <span className="text-right pr-1" style={{ color: COL.neg }}>negative</span>
                {cell('fp', 'FP', 'border-rose-600/50 bg-rose-500/10 text-rose-200')}
                {cell('tn', 'TN', 'border-slate-600/60 bg-slate-800/60 text-slate-200')}
            </div>
        </div>
    );
}

function MetricTiles({ cm }) {
    const m = metrics(cm);
    return (
        <div className="grid grid-cols-3 gap-1.5 text-center">
            {[['accuracy', m.accuracy], ['precision', m.precision], ['recall', m.recall], ['F1', m.f1], ['specificity', m.specificity], ['FPR', m.fpr]].map(([label, v]) => (
                <div key={label} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="font-mono text-sm text-slate-100">{show(v)}</div>
                </div>
            ))}
        </div>
    );
}

function CurveChart({ kind, pts, here, baseline, area }) {
    const S = 200, L = 30, B = 26, T = 8;
    const px = (v) => r2(L + v * (S - L - 8));
    const py = (v) => r2(T + (1 - v) * (S - T - B));
    const xy = kind === 'roc' ? pts.map(p => [p.fpr, p.tpr]) : pts.map(p => [p.recall, p.precision]);
    return (
        <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                <span>{kind === 'roc' ? 'ROC curve' : 'Precision–recall'}</span>
                <span className="font-mono">{kind === 'roc' ? 'AUC' : 'AP'} {f(area, 3)}</span>
            </div>
            <svg viewBox={`0 0 ${S} ${S}`} width="100%" role="img" aria-label={kind === 'roc' ? 'Recall against false-positive rate for every threshold' : 'Precision against recall for every threshold'}>
                <rect x={L} y={T} width={S - L - 8} height={S - T - B} fill="none" stroke="#1e293b" />
                {kind === 'roc'
                    ? <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke="#334155" strokeDasharray="3 3" />
                    : <line x1={px(0)} y1={py(baseline)} x2={px(1)} y2={py(baseline)} stroke="#334155" strokeDasharray="3 3" />}
                <path d={(kind === 'pr' ? [[0, xy[0][1]], ...xy] : xy).map(([x, y], i) => `${i ? 'L' : 'M'}${px(x)},${py(y)}`).join(' ')} fill="none" stroke="#a3e635" strokeWidth="2" />
                {here && <circle cx={px(here[0])} cy={py(here[1])} r="5" fill="none" stroke={COL.t} strokeWidth="2" />}
                <text x={px(0.5)} y={S - 6} fontSize="10" textAnchor="middle" fill="#64748b">{kind === 'roc' ? 'false-positive rate' : 'recall'}</text>
                <text x="10" y={py(0.5)} fontSize="10" textAnchor="middle" fill="#64748b" transform={`rotate(-90 10 ${py(0.5)})`}>{kind === 'roc' ? 'recall' : 'precision'}</text>
                {[0, 1].map(v => <text key={v} x={px(v)} y={S - 14} fontSize="9" textAnchor="middle" fill="#475569">{v}</text>)}
            </svg>
        </div>
    );
}

function Curves({ items, cm, roc, auc, pr }) {
    const m = metrics(cm);
    const P = items.filter(i => i.y).length;
    return (
        <div className="grid grid-cols-2 gap-3">
            <CurveChart kind="roc" pts={roc} area={auc} here={m.fpr !== null && m.recall !== null ? [m.fpr, m.recall] : null} />
            {pr ? <CurveChart kind="pr" pts={pr.pts} area={pr.ap} baseline={P / items.length} here={m.precision !== null ? [m.recall, m.precision] : null} /> : <div />}
        </div>
    );
}

/* ── explore ────────────────────────────────────────────── */

function Explore({ initialSeed }) {
    const [seed, setSeed] = useState(initialSeed);
    const [t, setT] = useState(T0);
    const [prevalence, setPrevalence] = useState(PREVALENCE);
    const [sep, setSep] = useState(SEP);
    const { items } = useMemo(() => makeTest(seed, { n: RARE_N, prevalence, sep }), [seed, prevalence, sep]);
    const cm = confusion(items, t);
    const roc = useMemo(() => rocCurve(items), [items]);
    const auc = useMemo(() => trapezoid(roc), [roc]);
    const pr = useMemo(() => prCurve(items), [items]);
    const P = items.filter(i => i.y).length;
    const none = metrics(confusion(items, Infinity));
    const m = metrics(cm);
    const sayNo = t > 1;
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <ScoreStrip items={items} t={t} onPick={setT} />
                <p className="text-xs text-slate-500 -mt-2">Click the strip to put the threshold there.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="space-y-3 min-w-0">
                        <ConfusionGrid cm={cm} />
                        <MetricTiles cm={cm} />
                        <div className="flex flex-wrap gap-1.5"><ShapeTag label="scores" names={['n']} shape={[items.length]} /><ShapeTag label="confusion" shape={[2, 2]} /></div>
                    </div>
                    <div className="min-w-0"><Curves items={items} cm={cm} roc={roc} auc={auc} pr={pr} /></div>
                </div>
                <div className="text-slate-100 text-sm overflow-x-auto">
                    <Tex block>{String.raw`P = \frac{${cm.tp}}{${cm.tp} + ${cm.fp}} = ${m.precision === null ? String.raw`\text{undefined}` : tn(m.precision, 3)}, \qquad R = \frac{${cm.tp}}{${cm.tp} + ${cm.fn}} = ${tn(m.recall, 3)}`}</Tex>
                </div>
            </div>
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <ParamSlider label="Threshold t" value={Math.min(t, 1)} onChange={setT} min={0} max={1} step={0.01} accent="lime" format={(v) => (sayNo ? 'above every score' : v.toFixed(2))} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ParamSlider label="Share of positives" value={prevalence} onChange={setPrevalence} min={0.01} max={0.5} step={0.01} accent="lime" format={(v) => `${Math.round(v * 100)}%`} />
                    <ParamSlider label="Separation of the classes" value={sep} onChange={setSep} min={0} max={3} step={0.1} accent="lime" format={(v) => v.toFixed(1)} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setSeed(randomSeed())} aria-label="New data" title="New data" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mx-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => setT(1.01)} disabled={sayNo} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">Say no to everyone</button>
                    <button onClick={() => setPrevalence(0.02)} disabled={prevalence === 0.02} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">Make positives rare (2%)</button>
                    <button onClick={() => { setT(T0); setPrevalence(PREVALENCE); setSep(SEP); }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
                {sayNo && (
                    <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                        No yeses at all: accuracy {pct(none.accuracy)}, recall 0, and precision is undefined (0 / 0). With {P} positive{P === 1 ? '' : 's'} in {items.length}, doing nothing already scores {pct(none.accuracy)}.
                    </p>
                )}
                {!sayNo && prevalence <= 0.05 && (
                    <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                        Rare positives: saying no to everyone would score {pct(none.accuracy)} accuracy; this threshold scores {pct(m.accuracy)}. The ROC area ({f(auc, 3)}) compares each positive with each negative, so the imbalance alone does not move it; average precision ({f(pr.ap, 3)}, against a baseline of {pct(P / items.length)}) shows how hard the few positives are to pick out.
                    </p>
                )}
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function ClassificationMetricsPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const stepHistory = useMemo(() => generateSteps(seed), [seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1800);
    const [explore, setExplore] = useState({ seed, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [study, setStudy] = useState(null);
    useEffect(() => { const t = setTimeout(() => setStudy(accuracyStudy()), 60); return () => clearTimeout(t); }, []);

    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(Math.max(0, stepHistory.findIndex(s => s.act === act))); };
    const toExplore = () => { setExplore(e => ({ seed, key: e.key + 1 })); setMode('explore'); setIsPlaying(false); };
    const hideNumbers = predict.pending;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/machine-learning" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Machine Learning
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Classification Metrics</h1>
                    <p className="text-lime-50 max-w-3xl">
                        Turn a model&apos;s scores into yes or no, count the four kinds of outcome, and watch precision, recall, F1 and the ROC and precision–recall curves move as the threshold slides. Then meet the 95%-accurate test that finds nobody.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/80">Builds on</span>
                        {[['Logistic Regression', '/machine-learning/logistic-regression'], ['Conditional Probability', '/probability-and-statistics/conditional-probability'], ['Bayes’ Theorem', '/probability-and-statistics/bayes-theorem']].map(([name, href]) => (
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
                                    onClick={() => { if (key === 'explore') toExplore(); else { setMode('guided'); setIsPlaying(false); } }}
                                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-lime-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                    <Icon className="h-4 w-4" />{label}
                                </button>
                            ))}
                        </div>
                        <SourceChip kind="live">Logistic regression fitted in your browser · seeded test sets</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={explore.key} initialSeed={explore.seed} />
                    ) : (
                        <>
                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="flex flex-wrap gap-1.5 px-4 pt-4" role="tablist" aria-label="Acts">
                                    {ACTS.map(act => {
                                        const Icon = act.icon;
                                        const tone = act.id === step.act
                                            ? 'bg-lime-500/20 text-lime-200 border-lime-500/50'
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
                                    <div className="h-full bg-gradient-to-r from-lime-500 to-green-500 transition-all" style={{ width: `${(currentStep / (stepHistory.length - 1)) * 100}%` }} />
                                </div>
                                <div className="p-4 sm:p-6 space-y-4">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}{step.t !== undefined && step.t <= 1 ? ` · t = ${f(step.t, step.act === 4 ? 3 : 2)}` : ''}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    <ScoreStrip items={step.items} t={step.t} next={step.next} crossing={step.crossing} highlight={step.highlight} />
                                    {step.cm && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                            <div className="space-y-3 min-w-0">
                                                <ConfusionGrid cm={step.cm} highlight={step.highlight} />
                                                {!hideNumbers && <MetricTiles cm={step.cm} />}
                                            </div>
                                            <div className="min-w-0 space-y-2">
                                                {step.roc
                                                    ? <Curves items={step.items} cm={step.cm} roc={step.roc} auc={step.auc} pr={step.pr} />
                                                    : <p className="text-xs text-slate-500">{step.act === 4 ? 'Watch the precision and recall tiles as the line moves.' : 'The curves appear in act 5.'}</p>}
                                                <div className="flex flex-wrap gap-1.5"><ShapeTag label="scores" names={['n']} shape={[step.items.length]} /><ShapeTag label="confusion" shape={[2, 2]} /></div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                        <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                        <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500 disabled:opacity-40">
                                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                        </button>
                                        <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New data" title="New data"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                                        <PredictToggle predict={predict} accent="lime" />
                                        <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                            Speed
                                            <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-lime-500" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {predict.prompt && <PredictPrompt predict={predict} accent="lime" />}

                            <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-lime-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-lime-200 text-sm leading-relaxed">
                                        {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-slate-100 text-sm sm:text-base overflow-x-auto">
                                <Tex block>{formulaFor(step)}</Tex>
                            </div>
                        </>
                    )}

                    <InCode title="The same metrics in scikit-learn" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Which number answers which question</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-slate-200 font-semibold">Precision</span> — when it says yes, how often is it right?</li>
                            <li><span className="text-slate-200 font-semibold">Recall</span> — of the real positives, how many does it find?</li>
                            <li><span className="text-slate-200 font-semibold">F1</span> — one number that punishes neglecting either.</li>
                            <li><span className="text-slate-200 font-semibold">AUC</span> — how well the scores rank, at every threshold at once.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;High accuracy means a good classifier.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            {study
                                ? <>Not when positives are rare. On {study.runs} seeded screening sets with {Math.round(RARE_PREVALENCE * 100)}% positives, saying no to everyone scored 95.0% accuracy every time and found nobody. The fitted model at t = {f(T0)} averaged {pct(study.acc)} — no more accurate than doing nothing on {study.noWins} of the {study.runs} sets — while finding {pct(study.recall)} of the positives and ranking them well (mean AUC {f(study.auc, 2)}).</>
                                : `Measuring ${STUDY_RUNS} screening sets…`}
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
