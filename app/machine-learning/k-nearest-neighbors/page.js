"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2, Shuffle,
    Ruler, Vote, LayoutGrid, SlidersHorizontal, Scale, Axis3d, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench, Star,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { makeDataset } from '@/lib/ml/datasets';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import DecisionField from '@/components/ml/DecisionField';
import { AI_COLORS } from '@/components/ml/colors';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── data and the classifier ───────────────────────────────
   Forty training points from two interleaved moons, and three hundred more
   from the same source for validation. k-NN stores the training points and,
   for a query, takes a vote among the k closest. `scale` multiplies each
   feature before distances are taken: [1, 1] is the plain plane, [10, 1] is
   "x recorded in millimetres". */

const N_TRAIN = 40;
const N_VAL = 300;
const NOISE = 0.25;
const DEFAULT_SEED = 3;
const RANKS_SHOWN = 7;
const K_STEPS = [1, 5, 15, 39];
const K_MAX = 39;
const UNIT_SCALE = 10;
const DIMS = [2, 10, 100, 1000];
const NOISE_FEATURES = [0, 5, 20, 80];
const STUDY_K = 7;
const CLASS_NAMES = ['Blue', 'Orange', 'Green'];
const RANGE = [-1.3, 1.3];

const ACTS = [
    { id: 1, label: 'Distance', icon: Ruler },
    { id: 2, label: 'Vote', icon: Vote },
    { id: 3, label: 'The map', icon: LayoutGrid },
    { id: 4, label: 'Choosing k', icon: SlidersHorizontal },
    { id: 5, label: 'Units', icon: Scale },
    { id: 6, label: 'Many dimensions', icon: Axis3d },
];

const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const tn = (v, d = 2) => f(v, d).replace('−', '-');
const pct = (v) => `${Math.round(v * 100)}%`;
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

const toPoints = ({ X, y }) => X.map(([x, yy], i) => ({ x, y: yy, label: y[i] }));
function makeData(seed, kind = 'moons') {
    return {
        kind,
        train: toPoints(makeDataset(kind, { n: N_TRAIN, noise: NOISE, seed })),
        val: toPoints(makeDataset(kind, { n: N_VAL, noise: NOISE, seed: seed + 7919 })),
    };
}
const classCount = (pts) => Math.max(...pts.map(p => p.label)) + 1;

const dist = (a, b, scale = [1, 1]) => Math.hypot((a.x - b.x) * scale[0], (a.y - b.y) * scale[1]);
/** Training points by distance from q, nearest first; equal distances go to the lower index. */
function neighbours(pts, q, scale = [1, 1]) {
    return pts.map((p, i) => ({ i, d: dist(p, q, scale) })).sort((a, b) => a.d - b.d || a.i - b.i);
}
/** Votes among the k nearest. A tied vote goes to the tied class whose member is nearest. */
function vote(pts, nb, k, classes = 2) {
    const counts = new Array(classes).fill(0);
    for (let r = 0; r < k; r++) counts[pts[nb[r].i].label]++;
    const top = Math.max(...counts);
    const winner = pts[nb.slice(0, k).find(n => counts[pts[n.i].label] === top).i].label;
    return { counts, winner, tie: counts.filter(c => c === top).length > 1 };
}
/** Accuracy on `test` for each k in `ks`; each query's neighbours are sorted once. */
function accuracies(train, test, ks, scale = [1, 1]) {
    const classes = classCount(train);
    const right = ks.map(() => 0);
    for (const q of test) {
        const nb = neighbours(train, q, scale);
        ks.forEach((k, j) => { if (vote(train, nb, Math.min(k, train.length), classes).winner === q.label) right[j]++; });
    }
    return right.map(r => r / test.length);
}
const accuracy = (train, test, k, scale) => accuracies(train, test, [k], scale)[0];
/** 1 / standard deviation of each feature over the training points. */
function standardScale(pts) {
    const sdOf = (key) => { const m = mean(pts.map(p => p[key])); return Math.sqrt(mean(pts.map(p => (p[key] - m) ** 2))); };
    return [1 / sdOf('x'), 1 / sdOf('y')];
}

/* Queries for the vote prompts: grid points at least 0.05 from every
   training point where the top-k vote is not unanimous, two of each winner.
   Any rule that ignores k would otherwise score: copying the nearest
   point's colour, or counting a fixed window (the top 3, the top 5, all
   seven drawn). So each winner gets one k = 3 and one k = 5 query, where
   possible ones on which the top 3 and the top 5 disagree, and one query
   agrees with both the nearest point and the top-7 majority and the other
   with neither, or one with each. Every fixed window lands near a coin. */
function pickQueries(pts, seed) {
    const rng = createRng(seed * 41 + 17);
    const cands = [];
    for (let gx = -11; gx <= 11; gx++) for (let gy = -11; gy <= 11; gy++) {
        const q = { x: gx / 10, y: gy / 10 };
        const nb = neighbours(pts, q);
        if (nb[0].d < 0.05) continue;
        const seven = vote(pts, nb, RANKS_SHOWN).winner;
        const by = { 3: vote(pts, nb, 3), 5: vote(pts, nb, 5) };
        for (const k of [3, 5]) {
            const v = by[k];
            if (Math.max(...v.counts) === k || v.tie) continue;
            cands.push({ q, k, winner: v.winner, nearest: pts[nb[0].i].label, seven, other: by[8 - k].winner });
        }
    }
    const chosen = [];
    const free = (c) => !chosen.some(x => x.q === c.q);
    for (const winner of [0, 1]) {
        const pool = cands.filter(c => c.winner === winner);
        const ks = rng.shuffle([3, 5]);
        const kinds = rng.chance(0.5) ? [[false, false], [true, true]] : [[false, true], [true, false]];
        kinds.forEach(([nearAgrees, sevenAgrees], j) => {
            const tiers = [
                (c) => c.k === ks[j] && c.other !== winner && (c.nearest === winner) === nearAgrees && (c.seven === winner) === sevenAgrees,
                (c) => c.k === ks[j] && c.other !== winner && (c.nearest === winner) === nearAgrees,
                (c) => c.k === ks[j] && c.other !== winner,
                (c) => c.k === ks[j],
                () => true,
            ];
            for (const tier of tiers) {
                const from = pool.filter(c => free(c) && tier(c));
                if (from.length) { chosen.push(rng.pick(from)); break; }
            }
        });
    }
    const keep = Math.min(...[0, 1].map(w => chosen.filter(c => c.winner === w).length));
    return rng.shuffle([0, 1].flatMap(w => chosen.filter(c => c.winner === w).slice(0, keep)));
}

/** Random points in the unit cube: how much nearer is the nearest than the farthest? */
function concentration(d, n = 200, queries = 30, seed = 5) {
    const rng = createRng(seed + d);
    const P = Array.from({ length: n }, () => Float64Array.from({ length: d }, () => rng.next()));
    const ratios = [];
    for (let q = 0; q < queries; q++) {
        const Q = Float64Array.from({ length: d }, () => rng.next());
        let lo = Infinity, hi = 0;
        for (const p of P) { let s = 0; for (let j = 0; j < d; j++) s += (p[j] - Q[j]) ** 2; const dd = Math.sqrt(s); lo = Math.min(lo, dd); hi = Math.max(hi, dd); }
        ratios.push(lo / hi);
    }
    return mean(ratios);
}
/** Validation accuracy when m features of pure noise (same spread as the data) are appended. */
function noiseFeatureAccuracy(data, m, k = STUDY_K, seed = 11) {
    const rng = createRng(seed + m);
    const extend = (pts) => pts.map(p => ({ ...p, z: Float64Array.from({ length: m }, () => rng.normal(0, 0.6)) }));
    const tr = extend(data.train), va = extend(data.val);
    const d2 = (a, b) => { let s = (a.x - b.x) ** 2 + (a.y - b.y) ** 2; for (let j = 0; j < m; j++) s += (a.z[j] - b.z[j]) ** 2; return s; };
    let right = 0;
    for (const q of va) {
        const nb = tr.map((p, i) => ({ i, d: d2(p, q) })).sort((a, b) => a.d - b.d || a.i - b.i);
        if (vote(tr, nb, k).winner === q.label) right++;
    }
    return right / va.length;
}

/** "k-NN has no training, so it cannot overfit": k = 1 against the best k, over many datasets. */
function overfitStudy(count = 100, seed = 23) {
    const rng = createRng(seed);
    const one = [], best = [], trainOne = [];
    for (let t = 0; t < count; t++) {
        const data = makeData(rng.int(1, 1e9));
        trainOne.push(accuracy(data.train, data.train, 1));
        const accs = accuracies(data.train, data.val, [1, 3, 5, 7, 9, 11, 15, 21]);
        one.push(accs[0]); best.push(Math.max(...accs));
    }
    return { count, trainOne: mean(trainOne), one: mean(one), best: mean(best) };
}

const generateSteps = (seed) => {
    const steps = [];
    const data = makeData(seed);
    const pts = data.train;
    const s = (act, extra) => steps.push({ act, actName: ACTS[act - 1].label, data, k: 1, scale: [1, 1], ...extra });

    const queries = pickQueries(pts, seed);
    const q0 = queries[0]?.q ?? { x: 0, y: 0.2 };
    const nb0 = neighbours(pts, q0);
    const p1 = pts[nb0[0].i];
    s(1, {
        query: q0, ranks: 0,
        explanation: `Forty labelled points: ${CLASS_NAMES[0].toLowerCase()} and ${CLASS_NAMES[1].toLowerCase()}. k-nearest neighbours does no fitting at all — it keeps the points. To classify a new point (the star), it starts by measuring how far the star is from every one of them.`,
    });
    s(1, {
        query: q0, ranks: RANKS_SHOWN,
        explanation: `Ranked by straight-line distance, the closest is ${f(nb0[0].d, 3)} away (${CLASS_NAMES[p1.label].toLowerCase()}), the seventh ${f(nb0[RANKS_SHOWN - 1].d, 3)}. The numbers on the rings are the ranks. Everything that follows depends on this ordering — and so on what "distance" means.`,
    });

    /* Act 2: votes. Each prompt query gets a picture step (ranks shown) and a
       reveal step (vote counted). */
    queries.forEach(({ q, k }, n) => {
        const nb = neighbours(pts, q);
        const v = vote(pts, nb, k);
        s(2, { query: q, ranks: RANKS_SHOWN, k, askVote: true, explanation: `Query ${n + 1}: the ${RANKS_SHOWN} nearest points are ranked. With k = ${k}, only ranks 1 to ${k} vote.` });
        const nearestCls = pts[nb[0].i].label;
        const otherK = 8 - k, otherWinner = vote(pts, nb, otherK).winner;
        const flips = [nearestCls !== v.winner && 'k = 1', otherWinner !== v.winner && `k = ${otherK}`].filter(Boolean);
        s(2, {
            query: q, ranks: k, k, votes: v.counts, winner: v.winner,
            explanation: `Ranks 1–${k}: ${v.counts.map((c, i) => `${c} ${CLASS_NAMES[i].toLowerCase()}`).join(', ')}. The star is called ${CLASS_NAMES[v.winner].toLowerCase()}.${flips.length ? ` With ${flips.join(' or ')} the answer would flip to ${CLASS_NAMES[1 - v.winner].toLowerCase()} — the choice of k decides it.` : ''}`,
        });
    });

    const acc1 = accuracy(pts, data.val, 1);
    s(3, {
        field: true, k: 1,
        explanation: `Run the vote at every spot on the plane and colour it by the winner: that is k-NN's decision map. With k = 1 each training point claims the region closest to it, so a single stray point grows its own island.`,
    });
    s(3, {
        field: true, k: 1, accs: { train: accuracy(pts, pts, 1), val: acc1 },
        explanation: `Scored on its own training points, k = 1 is perfect: ${pct(accuracy(pts, pts, 1))}, because every point's nearest neighbour is itself. On ${N_VAL} new points from the same source it gets ${pct(acc1)}. The islands were noise, memorised.`,
    });

    const ks = Array.from({ length: (K_MAX + 1) / 2 }, (_, j) => 2 * j + 1);
    const trainAccs = accuracies(pts, pts, ks), valAccs = accuracies(pts, data.val, ks);
    const kCurve = ks.map((k, j) => ({ k, train: trainAccs[j], val: valAccs[j] }));
    const bestK = kCurve.reduce((a, r) => (r.val > a.val ? r : a), kCurve[0]);
    /* At k = 39 nearly the whole set votes everywhere: collect the distinct tallies. */
    const tallies = new Set(data.val.map(q => vote(pts, neighbours(pts, q), K_MAX).counts.slice().sort((a, b) => b - a).join(' to ')));
    for (const k of K_STEPS.slice(1)) {
        const row = kCurve.find(r => r.k === k);
        s(4, {
            field: true, k, kCurve, accs: row,
            explanation: k === K_MAX
                ? `k = ${k}: every query polls ${k} of the ${N_TRAIN} points, so the neighbourhood hardly matters any more${tallies.size === 1 ? ` — every one of the ${N_VAL} validation points sees a vote of ${[...tallies][0]}, one way or the other, decided only by which single point is farthest away and left out` : ''}. The boundary flattens into one broad sweep and validation accuracy falls to ${pct(row.val)}. Too smooth: underfitting.`
                : `k = ${k}: the vote is spread over more points, so single strays are outvoted and the map smooths. Training accuracy ${pct(row.train)}, validation ${pct(row.val)}.`,
        });
    }
    s(4, {
        field: true, k: bestK.k, kCurve, accs: bestK, bestK: bestK.k,
        explanation: `Across every odd k from 1 to ${K_MAX}, validation accuracy is highest at k = ${bestK.k} (${pct(bestK.val)}). Small k memorises, large k blurs; k is chosen on validation data, like the degree on the previous pages.`,
    });

    const stretched = [UNIT_SCALE, 1];
    const accStretched = accuracy(pts, data.val, bestK.k, stretched);
    const std = standardScale(pts);
    const accStd = accuracy(pts, data.val, bestK.k, std);
    const nbS = neighbours(pts, q0, stretched);
    const moved = nb0.slice(0, bestK.k).filter(n => !nbS.slice(0, bestK.k).some(m => m.i === n.i)).length;
    s(5, {
        field: true, k: bestK.k, scale: stretched, query: q0, ranks: Math.min(bestK.k, RANKS_SHOWN), accs: { val: accStretched },
        explanation: `Now suppose x had been recorded in millimetres and y in centimetres: every x is ${UNIT_SCALE} times larger, nothing else changes. Distance is now almost all x, so the neighbours are whatever sits in the same vertical strip — ${moved === 0 ? `the star's own ${bestK.k} happen to survive, but across the plane the map turns into vertical bands` : `${moved} of the star's ${bestK.k} neighbours change`}. Validation accuracy: ${pct(accStretched)}, against ${pct(bestK.val)} in the original units.`,
    });
    s(5, {
        field: true, k: bestK.k, scale: std, query: q0, ranks: Math.min(bestK.k, RANKS_SHOWN), accs: { val: accStd },
        explanation: `The fix is to put features on a common scale before measuring distance: divide each by its spread on the training data (standardising). Whatever units they arrived in, each feature now has spread 1, and validation accuracy is ${pct(accStd)} — against ${pct(accStretched)} stretched and ${pct(bestK.val)} in the original units.`,
    });

    const conc = DIMS.map(d => ({ d, ratio: concentration(d) }));
    s(6, {
        dims: conc,
        explanation: `"Nearest" relies on some points being much closer than others. Scatter 200 random points in a cube of d dimensions and measure, from a random query, nearest distance ÷ farthest distance: ${conc.map(c => `${f(c.ratio, 2)} in ${c.d}D`).join(', ')}. In high dimensions everything is roughly equally far away.`,
    });
    const extra = NOISE_FEATURES.map(m => ({ m, acc: noiseFeatureAccuracy(data, m) }));
    s(6, {
        dims: conc, extra,
        explanation: `It bites in practice. Keep the two real features and append features of pure noise: with k = ${STUDY_K}, validation accuracy goes ${extra.map(e => `${pct(e.acc)} (${e.m} extra)`).join(' → ')}. The meaningless dimensions swamp the two that matter. k-NN needs few, relevant, comparably scaled features.`,
    });
    s(6, {
        field: true, k: bestK.k, done: true,
        explanation: 'Switch to Explore: click to move the star or add points, slide k, change the dataset, and stretch the units.',
    });
    return steps;
};

/* ── predict ─────────────────────────────────────────────
   On each picture step of act 2: which class wins the top-k vote? The ranks
   are drawn, so it is a count. Queries are chosen so each class wins equally
   often and, where possible, half the time the single nearest point is on
   the losing side. */
const predictFor = (step, next) => {
    if (!step.askVote || !next || next.winner === undefined) return null;
    return {
        question: `k = ${next.k}: ranks 1 to ${next.k} vote. Which class does the star get?`,
        options: CLASS_NAMES.slice(0, 2),
        correct: next.winner,
        because: `Among ranks 1–${next.k}: ${next.votes.map((c, i) => `${c} ${CLASS_NAMES[i].toLowerCase()}`).join(', ')}.`,
    };
};

function formulaFor(step) {
    const pts = step.data.train;
    if (step.query && step.ranks) {
        const nb = neighbours(pts, step.query, step.scale);
        const p = pts[nb[0].i];
        const [sx, sy] = step.scale;
        const sub = (v) => (v < 0 ? `(${tn(v, 2)})` : tn(v, 2));
        const term = (s, a, b) => (Math.abs(s - 1) < 1e-9 ? String.raw`(${tn(a, 2)} - ${sub(b)})^2` : String.raw`(${tn(s, 2)} \times (${tn(a, 2)} - ${sub(b)}))^2`);
        return String.raw`d_1 = \sqrt{${term(sx, step.query.x, p.x)} + ${term(sy, step.query.y, p.y)}} = ${tn(nb[0].d, 3)}`;
    }
    if (step.dims && step.extra) return String.raw`d^2 = \underbrace{(x - x')^2 + (y - y')^2}_{\text{signal}} + \underbrace{\textstyle\sum_{j=1}^{m} (z_j - z_j')^2}_{\text{noise}}`;
    if (step.dims) return String.raw`\frac{d_{\min}}{d_{\max}} \to 1 \text{ as dimensions grow: } ${step.dims.map(c => String.raw`${tn(c.ratio, 2)}\,(${c.d}\text{D})`).join(',\\; ')}`;
    if (step.accs) {
        const parts = [];
        if (step.accs.train !== undefined) parts.push(String.raw`\text{acc}_{\text{train}} = ${tn(step.accs.train * 100, 1)}\%`);
        parts.push(String.raw`\text{acc}_{\text{val}} = ${tn(step.accs.val * 100, 1)}\%`);
        return String.raw`k = ${step.k}: \quad ${parts.join(String.raw`, \quad `)}`;
    }
    return String.raw`\hat y(q) = \text{majority label among the } k \text{ points nearest } q, \quad k = ${step.k}`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'With k = 1 and no duplicate points, what is k-NN\'s accuracy on its own training points?',
        options: ['About 50%', '100%, because each point\'s nearest neighbour is itself', 'The same as on new data', 'It cannot be measured'],
        correct: 1,
        explanation: 'Each training point finds itself at distance 0 and copies its own label. Perfect training accuracy says nothing about new points — the same lesson as degree 11 on the overfitting page.',
    },
    {
        question: 'Feature x is in millimetres and feature y in metres. What goes wrong with k-NN?',
        options: [
            'Nothing — distances do not depend on units',
            'Distance is dominated by x, so y is almost ignored when choosing neighbours',
            'Distance is dominated by y',
            'The vote becomes a tie',
        ],
        correct: 1,
        explanation: 'A difference of 1 m in y counts the same as 1 mm in x, so x differences swamp y. Standardising each feature (divide by its spread) puts them on equal footing.',
    },
    {
        question: 'As k grows towards the number of training points, k-NN predicts…',
        options: ['the class of the single nearest point', 'almost the same vote everywhere, close to the class balance of the whole training set', 'random classes', 'the same as k = 1'],
        correct: 1,
        explanation: 'When the vote includes nearly every point, every query sees almost the same crowd, so location stops mattering and the boundary flattens — the model underfits.',
    },
];

const codeExample = `from sklearn.datasets import make_moons
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = make_moons(40, noise=0.25, random_state=3)       # [40, 2]
Xv, yv = make_moons(300, noise=0.25, random_state=4)    # [300, 2]

for k in [1, 7, 39]:
    knn = KNeighborsClassifier(n_neighbors=k).fit(X, y)
    print(k, knn.score(X, y), round(knn.score(Xv, yv), 3))
# 1 1.0 0.893       perfect on its own points
# 7 0.95 0.92
# 39 0.675 0.683    nearly every point votes: underfits

mm = [10, 1]                                              # x in millimetres
knn = KNeighborsClassifier(n_neighbors=7).fit(X * mm, y)
print("x * 10:", round(knn.score(Xv * mm, yv), 3))       # x * 10: 0.773
knn = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=7)).fit(X * mm, y)
print("standardised:", round(knn.score(Xv * mm, yv), 3)) # standardised: 0.903`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the map and units acts, then retry.'}
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

const BOX = 360;
const r2 = (v) => Math.round(v * 100) / 100;
const toBox = (x, y) => [r2(((x - RANGE[0]) / (RANGE[1] - RANGE[0])) * BOX), r2(((RANGE[1] - y) / (RANGE[1] - RANGE[0])) * BOX)];

/* The training points, the star, and lines to its ranked neighbours; with
   `field` the vote is run over the whole plane underneath. */
function KnnField({ pts, k, scale, query, ranks = 0, field, onClick, version }) {
    const classes = classCount(pts);
    const predictBatch = useCallback((grid) => grid.map(([x, y]) => {
        const nb = neighbours(pts, { x, y }, scale);
        const { counts } = vote(pts, nb, Math.min(k, pts.length), classes);
        return counts.map(c => c / Math.min(k, pts.length));
    }), [pts, k, scale, classes]);
    const nb = query ? neighbours(pts, query, scale) : [];
    const points = pts.map(p => ({ x: p.x, y: p.y, label: p.label }));
    return (
        <div className="relative">
            <DecisionField key={field ? 'map' : 'plain'} predictBatch={field ? predictBatch : undefined} points={points}
                version={version} xRange={RANGE} yRange={RANGE} resolution={60} onAddPoint={onClick}
                ariaLabel={field ? `k-NN decision map for k = ${k}` : 'Training points and the query'} />
            <svg viewBox={`0 0 ${BOX} ${BOX}`} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                {query && nb.slice(0, ranks).map((n, r) => {
                    const p = pts[n.i];
                    const [x0, y0] = toBox(query.x, query.y), [x1, y1] = toBox(p.x, p.y);
                    const voting = r < k;
                    return (
                        <g key={n.i}>
                            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={voting ? '#f8fafc' : '#64748b'} strokeWidth={voting ? 1.5 : 1} strokeDasharray={voting ? undefined : '3 3'} opacity="0.85" />
                            <circle cx={x1} cy={y1} r="9" fill="none" stroke={voting ? '#facc15' : '#64748b'} strokeWidth="1.5" />
                            <text x={x1 + 9} y={y1 - 7} fontSize="11" fontWeight="700" fill={voting ? '#facc15' : '#94a3b8'} stroke="#0f172a" strokeWidth="3" paintOrder="stroke">{r + 1}</text>
                        </g>
                    );
                })}
                {query && (() => {
                    const [cx, cy] = toBox(query.x, query.y);
                    const star = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 4.5 : 10; return `${r2(cx + rr * Math.cos(a))},${r2(cy + rr * Math.sin(a))}`; }).join(' ');
                    return <polygon points={star} fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />;
                })()}
            </svg>
        </div>
    );
}

function KChart({ curve, k, best }) {
    const W = 420, H = 190, L = 40, B = 26, T = 10;
    const sx = (kk) => r2(L + ((kk - 1) / (K_MAX - 1)) * (W - L - 12));
    const sy = (a) => r2(T + (1 - (a - 0.4) / 0.6) * (H - T - B));
    const line = (key) => curve.map((r, i) => `${i ? 'L' : 'M'}${sx(r.k)},${sy(r[key])}`).join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Accuracy against k">
            {[0.4, 0.6, 0.8, 1].map(a => <g key={a}><line x1={L} x2={W - 12} y1={sy(a)} y2={sy(a)} stroke="#1e293b" /><text x={L - 6} y={sy(a) + 4} fontSize="10" textAnchor="end" fill="#64748b">{a * 100}%</text></g>)}
            {[1, 5, 10, 15, 20, 25, 30, 35, 39].map(kk => <text key={kk} x={sx(kk)} y={H - 8} fontSize="10" textAnchor="middle" fill={kk === k ? '#e2e8f0' : '#64748b'}>{kk}</text>)}
            <line x1={sx(k)} x2={sx(k)} y1={T} y2={H - B} stroke="#475569" strokeDasharray="3 3" />
            <path d={line('train')} fill="none" stroke={AI_COLORS.classes[0]} strokeWidth="2.5" />
            <path d={line('val')} fill="none" stroke={AI_COLORS.classes[1]} strokeWidth="2.5" />
            {best !== undefined && (() => { const r = curve.find(c => c.k === best); return <circle cx={sx(best)} cy={sy(r.val)} r="7" fill="none" stroke="#facc15" strokeWidth="2" />; })()}
            <text x={W - 14} y={T + 10} fontSize="10" textAnchor="end" fill={AI_COLORS.classes[0]}>training</text>
            <text x={W - 14} y={T + 24} fontSize="10" textAnchor="end" fill={AI_COLORS.classes[1]}>validation</text>
            <text x="2" y={H - 8} fontSize="10" fill="#94a3b8">k</text>
        </svg>
    );
}

function Bars({ items, max, format }) {
    return (
        <div className="space-y-2">
            {items.map(({ label, value, color }) => (
                <div key={label}>
                    <div className="flex justify-between text-xs mb-0.5"><span className="text-slate-300">{label}</span><span className="font-mono text-slate-100 tabular-nums">{format(value)}</span></div>
                    <div className="h-2.5 bg-slate-800 rounded-sm overflow-hidden"><div className="h-full rounded-sm" style={{ width: `${r2((value / max) * 100)}%`, background: color }} /></div>
                </div>
            ))}
        </div>
    );
}

function NeighbourTable({ pts, query, k, scale }) {
    const nb = neighbours(pts, query, scale).slice(0, Math.min(Math.max(k, 3), RANKS_SHOWN));
    return (
        <table className="w-full text-xs font-mono">
            <thead><tr className="text-slate-500"><th className="text-left font-normal">rank</th><th className="text-right font-normal">distance</th><th className="text-right font-normal">class</th></tr></thead>
            <tbody>
                {nb.map((n, r) => (
                    <tr key={n.i} className={r < k ? 'text-slate-100' : 'text-slate-500'}>
                        <td>{r + 1}</td><td className="text-right tabular-nums">{f(n.d, 3)}</td>
                        <td className="text-right" style={{ color: AI_COLORS.classes[pts[n.i].label] }}>{CLASS_NAMES[pts[n.i].label]}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/* ── explore ────────────────────────────────────────────── */

const KINDS = [['moons', 'Moons'], ['circles', 'Circles'], ['xor', 'XOR'], ['blobs', 'Three blobs']];

function Explore({ initialSeed, initialK }) {
    const [seed, setSeed] = useState(initialSeed);
    const [kind, setKind] = useState('moons');
    const [k, setK] = useState(initialK);
    const [units, setUnits] = useState('plain');           // plain | mm | standardised
    const [query, setQuery] = useState({ x: 0.1, y: 0.25 });
    const [clickMode, setClickMode] = useState('query');
    const [added, setAdded] = useState([]);
    const data = useMemo(() => makeData(seed, kind), [seed, kind]);
    const pts = useMemo(() => [...data.train, ...added], [data, added]);
    const classes = classCount(pts);
    const scale = useMemo(() => (units === 'mm' ? [UNIT_SCALE, 1] : units === 'standardised' ? standardScale(pts) : [1, 1]), [units, pts]);
    const kk = Math.min(k, pts.length);
    const nb = neighbours(pts, query, scale);
    const v = vote(pts, nb, kk, classes);
    const trainAcc = useMemo(() => accuracy(pts, pts, kk, scale), [pts, kk, scale]);
    const valAcc = useMemo(() => accuracy(pts, data.val, kk, scale), [pts, data, kk, scale]);
    const onClick = (x, y) => {
        if (clickMode === 'query') setQuery({ x, y });
        else setAdded(a => [...a, { x, y, label: Number(clickMode) }]);
    };
    const repair = () => { setUnits('plain'); setAdded([]); setK(initialK); };

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="min-w-0">
                        <KnnField pts={pts} k={kk} scale={scale} query={query} ranks={Math.min(kk, RANKS_SHOWN)} field onClick={onClick} version={pts.length * 1000 + kk + scale[0] + scale[1]} />
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                            <span className="text-slate-500 mr-1">Click:</span>
                            {[['query', 'moves the star'], ...Array.from({ length: classes }, (_, c) => [String(c), `adds ${CLASS_NAMES[c].toLowerCase()}`])].map(([key, label]) => (
                                <button key={key} onClick={() => setClickMode(key)}
                                    className={`px-2.5 py-1 rounded-full border ${clickMode === key ? 'border-lime-500 text-lime-200 bg-lime-500/10' : 'border-slate-700 text-slate-400'}`}>{label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                            <Star className="h-4 w-4 text-slate-100" />
                            <span>star at ({f(query.x, 2)}, {f(query.y, 2)}) →</span>
                            <span className="font-semibold" style={{ color: AI_COLORS.classes[v.winner] }}>{CLASS_NAMES[v.winner]}</span>
                            <span className="text-slate-500 text-xs">({v.counts.map((c, i) => `${c} ${CLASS_NAMES[i].toLowerCase()}`).join(', ')}{v.tie ? '; tie, nearest wins' : ''})</span>
                        </div>
                        <NeighbourTable pts={pts} query={query} k={kk} scale={scale} />
                        <div className="grid grid-cols-2 gap-2 text-center">
                            {[['training accuracy', pct(trainAcc)], ['validation accuracy', pct(valAcc)]].map(([label, val]) => (
                                <div key={label} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
                                    <div className="font-mono text-sm text-slate-100">{val}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5"><ShapeTag label="X" names={['n', 'features']} shape={[pts.length, 2]} /><ShapeTag label="distances" names={['n']} shape={[pts.length]} /></div>
                    </div>
                </div>
            </div>
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap gap-1.5">
                    {KINDS.map(([key, label]) => (
                        <button key={key} onClick={() => { setKind(key); setAdded([]); }}
                            className={`text-xs px-3 py-1.5 rounded-lg border ${kind === key ? 'border-lime-500 text-lime-200 bg-lime-500/10' : 'border-slate-700 text-slate-300 hover:border-lime-500'}`}>{label}</button>
                    ))}
                    <button onClick={() => { setSeed(randomSeed()); setAdded([]); }} aria-label="New data" title="New data" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                </div>
                <ParamSlider label="Neighbours k" value={k} onChange={setK} min={1} max={25} step={1} accent="lime" hint={k % 2 === 0 && classes === 2 ? 'Even k can tie; a tie goes to the nearest of the tied classes.' : `${kk} of ${pts.length} points vote.`} />
                <div className="text-slate-100 text-sm">
                    <Tex block>{String.raw`d = \sqrt{(${tn(scale[0], 2)}\,\Delta x)^2 + (${tn(scale[1], 2)}\,\Delta y)^2}, \quad d_1 = ${tn(nb[0].d, 3)}, \quad d_{${kk}} = ${tn(nb[kk - 1].d, 3)}`}</Tex>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => setUnits('mm')} disabled={units === 'mm'} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">Measure x in millimetres (× {UNIT_SCALE})</button>
                    <button onClick={() => setK(1)} disabled={k === 1} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">k = 1</button>
                    <button onClick={() => setUnits('standardised')} disabled={units === 'standardised'} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">Standardise features</button>
                    <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
                {units === 'mm' && <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">x now counts {UNIT_SCALE}× as much as y in every distance, so the map turns into vertical bands: validation accuracy {pct(valAcc)}. Standardising removes the units entirely.</p>}
                {k === 1 && trainAcc === 1 && <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">k = 1: training accuracy {pct(trainAcc)} — every point votes for itself. Validation: {pct(valAcc)}.</p>}
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function KNearestNeighborsPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const stepHistory = useMemo(() => generateSteps(seed), [seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1800);
    const [explore, setExplore] = useState({ seed, k: 7, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [study, setStudy] = useState(null);
    /* The misconception study scores 100 datasets; run it after the first paint. */
    useEffect(() => { const t = setTimeout(() => setStudy(overfitStudy()), 60); return () => clearTimeout(t); }, []);

    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(stepHistory.findIndex(s => s.act === act)); };
    const toExplore = () => {
        const bestK = stepHistory.find(s => s.bestK)?.bestK ?? 7;
        setExplore(e => ({ seed, k: bestK, key: e.key + 1 }));
        setMode('explore');
        setIsPlaying(false);
    };
    const pts = step.data.train;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/machine-learning" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Machine Learning
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">k-Nearest Neighbours</h1>
                    <p className="text-lime-50 max-w-3xl">
                        Classify a point by asking the k training points closest to it. Watch the vote, the decision map for k = 1 and k = 39, what changing the units does to &ldquo;closest&rdquo;, and why distances stop meaning much in a thousand dimensions.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/80">Builds on</span>
                        {[['Train, Validation and Test', '/machine-learning/train-validation-and-test'], ['Norms and Unit Vectors', '/vectors/norms-and-unit-vectors']].map(([name, href]) => (
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
                        <SourceChip kind="live">Every distance and vote computed in your browser · seeded two-moons data</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={explore.key} initialSeed={explore.seed} initialK={explore.k} />
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
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}{step.field || step.query ? ` · k = ${step.k}` : ''}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    {step.dims ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Nearest ÷ farthest distance, 200 random points</p>
                                                <Bars max={1} format={(v) => f(v, 2)} items={step.dims.map(c => ({ label: `${c.d} dimensions`, value: c.ratio, color: AI_COLORS.classes[0] }))} />
                                            </div>
                                            {step.extra && (
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Validation accuracy, k = {STUDY_K}</p>
                                                    <Bars max={1} format={pct} items={step.extra.map(e => ({ label: `2 real + ${e.m} noise features`, value: e.acc, color: AI_COLORS.classes[1] }))} />
                                                    <div className="mt-2"><ShapeTag label="X" names={['n', '2+m']} shape={[N_TRAIN, 2 + step.extra[step.extra.length - 1].m]} /></div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                            <div className="min-w-0">
                                                <KnnField pts={pts} k={step.k} scale={step.scale} query={step.query} ranks={step.ranks ?? 0} field={step.field} version={currentStep} />
                                            </div>
                                            <div className="min-w-0 space-y-3">
                                                {step.kCurve && <KChart curve={step.kCurve} k={step.k} best={step.bestK} />}
                                                {step.query && step.ranks > 0 && !step.field && (
                                                    predict.pending
                                                        ? <p className="text-sm text-slate-500">Count the colours of ranks 1 to {step.k} on the picture.</p>
                                                        : <NeighbourTable pts={pts} query={step.query} k={step.k} scale={step.scale} />
                                                )}
                                                {step.votes && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        {step.votes.map((c, i) => <span key={i} className="px-2 py-1 rounded-md border border-slate-700 font-mono" style={{ color: AI_COLORS.classes[i] }}>{CLASS_NAMES[i]}: {c}</span>)}
                                                        <span className="text-slate-400">→</span>
                                                        <span className="font-semibold" style={{ color: AI_COLORS.classes[step.winner] }}>{CLASS_NAMES[step.winner]}</span>
                                                    </div>
                                                )}
                                                {step.accs && !step.kCurve && (
                                                    <div className="grid grid-cols-2 gap-2 text-center">
                                                        {[['training', step.accs.train], ['validation', step.accs.val]].filter(([, v]) => v !== undefined).map(([label, val]) => (
                                                            <div key={label} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                                                <div className="text-[10px] uppercase tracking-wide text-slate-500">{label} accuracy</div>
                                                                <div className="font-mono text-sm text-slate-100">{pct(val)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {step.scale[0] !== 1 && <p className="text-xs text-slate-400">Distances use x × {f(step.scale[0], 2)} and y × {f(step.scale[1], 2)}; the picture keeps the original axes.</p>}
                                                <div className="flex flex-wrap gap-1.5"><ShapeTag label="X" names={['n', 'features']} shape={[N_TRAIN, 2]} />{step.query && <ShapeTag label="distances" names={['n']} shape={[N_TRAIN]} />}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 mt-4">
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

                    <InCode title="The same experiments in scikit-learn" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The k dial</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-slate-200 font-semibold">k = 1</span> — every point claims its own patch: perfect on training data, jagged, memorises noise.</li>
                            <li><span className="text-slate-200 font-semibold">Moderate k</span> — strays are outvoted; chosen on validation data.</li>
                            <li><span className="text-slate-200 font-semibold">k near n</span> — every query polls almost the whole set, so location stops mattering: underfitting.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;k-NN doesn&apos;t train anything, so it can&apos;t overfit.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            {study
                                ? <>Over {study.count} seeded two-moons datasets, k = 1 scored {pct(study.trainOne)} on its training points every time, and {pct(study.one)} on new points on average — against {pct(study.best)} for the best k on each dataset. Storing the data is the training, and k = 1 memorises it, noise included.</>
                                : 'Measuring k = 1 against the best k over 100 seeded datasets…'}
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
