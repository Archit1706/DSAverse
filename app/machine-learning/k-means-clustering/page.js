"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2, Shuffle,
    Target, Magnet, Move, Repeat, Dice5, TrendingDown, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { makeDataset } from '@/lib/ml/datasets';
import { kmeans, objective, squaredL2 } from '@/lib/ml/vectorIndex';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── data and the algorithm ────────────────────────────────
   Forty-five unlabelled points in three blobs. k-means alternates two
   half-steps — assign every point to its nearest centre, then move every
   centre to the mean of its points — and the engine's `kmeans` records
   both. Run with `iters: 0` it returns just the starting centres. */

const N_POINTS = 45;
const NOISE = 0.1;
const K_TOUR = 3;
const DEFAULT_SEED = 6;
const MAX_ITERS = 50;
const ASK_ITERS = 4;
const TIE_RATIO = 1.15;
const STUDY_STARTS = 200;
const TRAP_RATIO = 1.1;
const K_RANGE = [1, 2, 3, 4, 5, 6, 7, 8];
const RESTARTS = 10;
const NINE = { per: 8, sd: 0.11, at: [-0.8, 0, 0.8] };
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const COLORS = ['#38bdf8', '#fb923c', '#a3e635', '#e879f9', '#facc15', '#f87171', '#2dd4bf', '#a78bfa', '#f472b6'];
const RANGE = [-1.2, 1.2];

const ACTS = [
    { id: 1, label: 'The goal', icon: Target },
    { id: 2, label: 'Assign', icon: Magnet },
    { id: 3, label: 'Update', icon: Move },
    { id: 4, label: 'Repeat', icon: Repeat },
    { id: 5, label: 'Bad start', icon: Dice5 },
    { id: 6, label: 'Choosing k', icon: TrendingDown },
];

const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const tn = (v, d = 2) => f(v, d).replace('−', '-');

/** Nine round blobs on a 3 × 3 grid: where a bad start stops being rare. */
function nineBlobs(seed) {
    const rng = createRng(seed);
    const pts = [];
    [...NINE.at].reverse().forEach(cy => NINE.at.forEach(cx => {
        for (let i = 0; i < NINE.per; i++) pts.push([cx + rng.normal(0, NINE.sd), cy + rng.normal(0, NINE.sd)]);
    }));
    return pts;
}
function makeData(seed, kind = 'blobs') {
    if (kind === 'nine') return nineBlobs(seed);
    return makeDataset(kind, { n: N_POINTS, noise: kind === 'blobs' ? NOISE : 0.1, seed }).X;
}
/** Nearest centre for every point; ties to the lower index, as the engine does. */
const nearest = (V, C) => V.map(v => { let best = 0, bd = Infinity; C.forEach((c, j) => { const d = squaredL2(v, c); if (d < bd) { bd = d; best = j; } }); return best; });
/** One full run: the starting centres and every half-step after them. */
function run(V, k, seed, init) {
    const start = kmeans(V, k, { seed, iters: 0, init }).centroids;
    const res = kmeans(V, k, { seed, iters: MAX_ITERS, init });
    const halves = [];
    let C = start;
    res.history.forEach((h, it) => {
        halves.push({ kind: 'assign', it: it + 1, centroids: C, assign: h.assign, J: h.objectiveAfterAssign });
        halves.push({ kind: 'update', it: it + 1, from: C, centroids: h.centroids, assign: h.assign, J: h.objective });
        C = h.centroids;
    });
    return { start, halves, final: res, J: halves[halves.length - 1].J, iters: res.history.length };
}
/** The lowest J over many starts: the yardstick for "trapped". */
function bestJ(V, k, starts = 40, seed = 97) {
    let best = Infinity;
    for (let s = 0; s < starts; s++) best = Math.min(best, run(V, k, seed + s, 'kmeans++').J);
    return best;
}

/** "k-means finds the best clusters": how often a start ends trapped. */
function trapStudy(V, k = K_TOUR, starts = STUDY_STARTS) {
    const best = bestJ(V, k);
    const count = (init) => { let trapped = 0; for (let s = 1; s <= starts; s++) if (run(V, k, s, init).J > TRAP_RATIO * best) trapped++; return trapped; };
    return { starts, best, random: count('random'), plusplus: count('kmeans++') };
}
/** Restarts: keep the lowest J of `per` k-means++ starts, `groups` times over. */
function restartStudy(V, k, groups = 100, per = RESTARTS) {
    const best = bestJ(V, k);
    let trapped = 0;
    for (let g = 0; g < groups; g++) {
        let low = Infinity;
        for (let r = 0; r < per; r++) low = Math.min(low, run(V, k, 5000 + g * per + r, 'kmeans++').J);
        if (low > TRAP_RATIO * best) trapped++;
    }
    return { groups, per, trapped };
}

/* Starting seeds for the tour: a random start that converges to the best J
   after at least four iterations, and one that ends trapped. */
function tourStarts(V, seed) {
    const best = bestJ(V, K_TOUR);
    let good = null, trapped = null;
    for (let t = 0; t < 400 && (!good || !trapped); t++) {
        const s = seed * 1000 + t;
        const r = run(V, K_TOUR, s, 'random');
        if (!good && r.iters >= 4 && r.J < 1.001 * best) good = s;
        if (!trapped && r.J > 1.5 * best) trapped = s;
    }
    return { good: good ?? seed, trapped, best };
}

/* For a prompt: a point whose nearest centre is clear but not obvious (the
   runner-up is within 1.6× the distance, and more than TIE_RATIO away, so
   the eye can tell). In the first iteration `want` is the answer letter, from
   a shuffled rotation; after that the question is whether the point switches,
   and `want` says which answer this prompt should have. Points whose own
   centre has just moved away from them are preferred for both answers, so
   "it switches because its centre left" is no better than a coin; in the
   first iteration, points where judging only left–right or only up–down
   distance gives a wrong answer are preferred, so both shortcuts fail
   often enough to stay near chance. */
function pickAsk(V, C, prevAssign, want, prevC) {
    const scored = V.map((v, i) => {
        const d = C.map(c => Math.sqrt(squaredL2(v, c)));
        const order = d.map((x, j) => j).sort((a, b) => d[a] - d[b]);
        const away = prevAssign ? squaredL2(v, C[prevAssign[i]]) > squaredL2(v, prevC[prevAssign[i]]) : true;
        const byAxis = (a) => C.reduce((b, c, j) => (Math.abs(v[a] - c[a]) < Math.abs(v[a] - C[b][a]) ? j : b), 0);
        const misleads = (byAxis(0) !== order[0]) + (byAxis(1) !== order[0]);
        return { i, near: order[0], ratio: d[order[1]] / d[order[0]], away: away && (prevAssign !== null || misleads === 2), half: prevAssign !== null || misleads >= 1 };
    }).filter(p => p.ratio > TIE_RATIO);
    const hit = (p) => (prevAssign ? (p.near !== prevAssign[p.i]) === want : p.near === want);
    const tiers = [(p) => hit(p) && p.ratio < 1.6 && p.away, (p) => hit(p) && p.ratio < 1.6 && p.half, (p) => hit(p) && p.ratio < 1.6, hit, (p) => p.ratio < 1.6, () => true];
    for (const tier of tiers) {
        const c = scored.filter(tier);
        if (c.length) return c.reduce((a, p) => (Math.abs(p.ratio - 1.3) < Math.abs(a.ratio - 1.3) ? p : a)).i;
    }
    return null;
}

/** The part of the box nearer to centre j than to any other: the box clipped by one half-plane per rival. */
function voronoiCell(C, j) {
    let poly = [[RANGE[0], RANGE[0]], [RANGE[1], RANGE[0]], [RANGE[1], RANGE[1]], [RANGE[0], RANGE[1]]];
    const [cx, cy] = C[j];
    C.forEach(([ox, oy], o) => {
        if (o === j || poly.length === 0) return;
        if (ox === cx && oy === cy) { if (o < j) poly = []; return; }
        /* Keep points p with (p − m)·(o − c) ≤ 0, m the midpoint. */
        const nx = ox - cx, ny = oy - cy, mx = (cx + ox) / 2, my = (cy + oy) / 2;
        const side = ([px, py]) => (px - mx) * nx + (py - my) * ny;
        const out = [];
        poly.forEach((p, i) => {
            const q = poly[(i + 1) % poly.length];
            const sp = side(p), sq = side(q);
            if (sp <= 0) out.push(p);
            if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
                const t = sp / (sp - sq);
                out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
            }
        });
        poly = out;
    });
    return poly;
}
const polygonArea = (poly) => Math.abs(poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

const generateSteps = (seed) => {
    const steps = [];
    const V = makeData(seed);
    const starts = tourStarts(V, seed);
    const tour = run(V, K_TOUR, starts.good, 'random');
    const s = (act, extra) => steps.push({ act, actName: ACTS[act - 1].label, V, k: K_TOUR, ...extra });
    const jTrail = [];
    const rng = createRng(seed * 31 + 7);
    const firstLetter = rng.pick([0, 1, 2]);
    const switches = rng.shuffle([true, false, true, false]);

    s(1, {
        centroids: null, assign: null,
        explanation: `${N_POINTS} points and no labels. Clustering asks for k groups; k-means describes each group by a centre and scores a choice of centres by J — the sum of squared distances from every point to its own centre. Low J means tight groups. Here k = ${K_TOUR}.`,
    });
    s(1, {
        centroids: tour.start, assign: null,
        explanation: `Start by dropping ${K_TOUR} centres — A, B and C — on ${K_TOUR} points picked at random. Nothing is assigned yet, so J is not defined: it needs to know which centre each point belongs to.`,
    });

    let prevAssign = null, prevCentroids = null, asked = 0;
    for (let h = 0; h < tour.halves.length; h += 2) {
        const a = tour.halves[h], u = tour.halves[h + 1];
        const act = a.it === 1 ? 2 : 4;
        const changed = prevAssign ? a.assign.filter((c, i) => c !== prevAssign[i]).length : N_POINTS;
        const converged = prevAssign && changed === 0;
        if (asked < ASK_ITERS && !converged) {
            const ask = pickAsk(V, a.centroids, prevAssign, prevAssign ? switches[a.it - 2] : firstLetter, prevCentroids);
            if (ask !== null) {
                s(act, {
                    centroids: a.centroids, assign: prevAssign, highlight: ask, askJoin: true, noCells: true, it: a.it, jTrail: [...jTrail],
                    explanation: `Iteration ${a.it}, assign: every point is about to go to its nearest centre${prevAssign ? ' — the centres have moved since the colours were given' : ''}. Look at the ringed point${prevAssign ? `, currently with ${LETTERS[prevAssign[ask]]}` : ''}.`,
                });
                asked++;
            }
        }
        jTrail.push({ kind: 'assign', J: a.J, it: a.it });
        const hi = steps[steps.length - 1]?.askJoin && steps[steps.length - 1].it === a.it ? steps[steps.length - 1].highlight : undefined;
        const dists = hi !== undefined ? a.centroids.map(c => Math.sqrt(squaredL2(V[hi], c))) : null;
        s(act, {
            centroids: a.centroids, assign: a.assign, highlight: hi, joined: hi !== undefined ? a.assign[hi] : undefined, it: a.it, J: a.J, jTrail: [...jTrail], half: 'assign',
            explanation: converged
                ? `Iteration ${a.it}, assign: not a single point changes centre. The centres will not move either, so k-means has converged after ${a.it - 1} full iterations, at J = ${f(a.J, 3)}.`
                : `Iteration ${a.it}, assign: ${prevAssign ? `${changed} point${changed === 1 ? '' : 's'} switch${changed === 1 ? 'es' : ''} centre` : 'every point takes the colour of its nearest centre'}; the shaded cells show which centre owns each part of the plane. ${hi !== undefined ? `The ringed point is ${dists.map((d, j) => `${f(d)} from ${LETTERS[j]}`).join(', ')}, so it joins ${LETTERS[a.assign[hi]]}${prevAssign ? (a.assign[hi] !== prevAssign[hi] ? `, switching from ${LETTERS[prevAssign[hi]]}` : ', staying where it was') : ''}. ` : ''}J = ${f(a.J, 3)}${prevAssign ? `, down from ${f(jTrail[jTrail.length - 2].J, 3)}` : ''}.`,
        });
        if (converged) break;
        jTrail.push({ kind: 'update', J: u.J, it: u.it });
        const counts = u.centroids.map((_, j) => a.assign.filter(c => c === j).length);
        const moves = u.centroids.map((c, j) => Math.sqrt(squaredL2(c, a.centroids[j])));
        s(a.it === 1 ? 3 : 4, {
            centroids: u.centroids, from: a.centroids, assign: a.assign, it: u.it, J: u.J, jTrail: [...jTrail], half: 'update', counts,
            explanation: `Iteration ${u.it}, update: each centre moves to the mean of its ${counts.join(', ')} points — ${moves.map((m, j) => `${LETTERS[j]} by ${f(m)}`).join(', ')}. The mean is the spot with the smallest summed squared distance to a group, so J can only fall: ${f(a.J, 3)} → ${f(u.J, 3)}.`,
        });
        prevAssign = a.assign;
        prevCentroids = a.centroids;
    }

    /* Act 5: a trapped start. */
    if (starts.trapped !== null) {
        const bad = run(V, K_TOUR, starts.trapped, 'random');
        const firstSizes = (() => { const owners = nearest(V, bad.start); return [0, 1, 2].map(j => owners.filter(c => c === j).length); })();
        const badSizes = [0, 1, 2].map(j => bad.final.assign.filter(c => c === j).length);
        const rate = trapStudy(V);
        const n = bad.iters - 1;
        s(5, {
            centroids: bad.start, assign: null, trap: true,
            explanation: `Same points, a different random start: the first assignment would give the centres ${firstSizes.join(', ')} points. Watch where this one ends.`,
        });
        s(5, {
            centroids: bad.final.centroids, assign: bad.final.assign, J: bad.J, trap: true,
            explanation: `Converged after ${n} iteration${n === 1 ? '' : 's'} with groups of ${badSizes.join(', ')} and J = ${f(bad.J, 3)} — ${f(bad.J / starts.best, 1)} times the best J found (${f(starts.best, 3)}). Every half-step still lowered J; it ran downhill into the wrong valley, and no single point wants to move. On three well-separated blobs this is rare: ${rate.random} of ${rate.starts} random starts end trapped. The misconception card measures nine blobs, where it is not.`,
        });
    }
    const pp = Array.from({ length: 20 }, (_, i) => run(V, K_TOUR, 500 + i, 'kmeans++').J);
    const ppGood = pp.filter(j => j <= TRAP_RATIO * starts.best).length;
    s(5, {
        centroids: tour.final.centroids, assign: tour.final.assign, J: tour.J, trap: false,
        explanation: `Two fixes, used together in practice. k-means++ spreads the starting centres out: each new one is drawn with probability proportional to its squared distance from the centres already chosen. And restarts: run several starts and keep the lowest J. On these points, ${ppGood} of 20 k-means++ starts reached the best J.`,
    });

    /* Act 6: choosing k. */
    const elbow = K_RANGE.map(k => ({ k, J: Math.min(...Array.from({ length: RESTARTS }, (_, r) => run(V, k, 900 + r, 'kmeans++').J)) }));
    s(6, {
        centroids: tour.final.centroids, assign: tour.final.assign, elbow,
        explanation: `How many clusters? J for k = 1 to ${K_RANGE[K_RANGE.length - 1]}, best of ${RESTARTS} starts each: ${elbow.map(e => f(e.J, 2)).join(', ')}. J keeps falling as k grows — with one centre per point it is 0 — so "lowest J" always says "more clusters". Look instead for the elbow, where adding a centre stops buying much: here at k = ${K_TOUR}, from ${f(elbow[1].J, 2)} to ${f(elbow[2].J, 2)}, then only to ${f(elbow[3].J, 2)}.`,
    });
    s(6, {
        centroids: tour.final.centroids, assign: tour.final.assign, elbow, done: true,
        explanation: 'Switch to Explore: step the two half-steps yourself, change k, try random and k-means++ starts on nine blobs, and give it two moons — shapes that are not round blobs.',
    });
    return steps;
};

/* ── predict ─────────────────────────────────────────────
   On each picture step before an assignment, about the ringed point. In the
   first iteration: which centre does it join? (the letter rotates through a
   shuffled choice). After that: does it switch centre or stay? — a yes/no
   question, because with three letters "it stays" and "it moves to the
   nearest other centre" would each beat a third whatever the balance. The
   answer is the nearest centre; the picture step draws no cells, which
   would give it away. */
const predictFor = (step, next) => {
    if (!step.askJoin || !next || next.joined === undefined) return null;
    const because = `It is ${step.centroids.map((c, j) => `${f(Math.sqrt(squaredL2(step.V[step.highlight], c)))} from ${LETTERS[j]}`).join(', ')}.`;
    if (step.assign) {
        const own = step.assign[step.highlight];
        return {
            question: `Does the ringed point switch centre, or stay with ${LETTERS[own]}?`,
            options: ['It switches', `It stays with ${LETTERS[own]}`],
            correct: next.joined !== own ? 0 : 1,
            because: `${because} Nearest is ${LETTERS[next.joined]}.`,
        };
    }
    return {
        question: 'Which centre does the ringed point join?',
        options: LETTERS.slice(0, step.centroids.length),
        correct: next.joined,
        because,
    };
};

function formulaFor(step) {
    if (step.elbow) return String.raw`J(k):\; ${step.elbow.map(e => String.raw`${e.k}\!:\,${tn(e.J, 2)}`).join(String.raw`,\; `)}`;
    if (step.half === 'update') {
        const j = step.counts.indexOf(Math.max(...step.counts));
        const c = step.centroids[j];
        return String.raw`\mu_${LETTERS[j]} = \frac{1}{n_${LETTERS[j]}} \sum_{i \in ${LETTERS[j]}} x_i = \frac{1}{${step.counts[j]}} \sum x_i = (${tn(c[0])},\ ${tn(c[1])}), \qquad J = ${tn(step.J, 3)}`;
    }
    if (step.highlight !== undefined && step.joined !== undefined) {
        const v = step.V[step.highlight];
        const parts = step.centroids.map((c, j) => String.raw`\|x - \mu_${LETTERS[j]}\|^2 = ${tn(squaredL2(v, c), 3)}`);
        return String.raw`${parts.join(String.raw`,\quad `)} \;\Rightarrow\; ${LETTERS[step.joined]}`;
    }
    if (step.J !== undefined) return String.raw`J = \sum_{i=1}^{${N_POINTS}} \|x_i - \mu_{c(i)}\|^2 = ${tn(step.J, 3)}`;
    return String.raw`J = \sum_{i=1}^{n} \|x_i - \mu_{c(i)}\|^2, \qquad c(i) = \arg\min_j \|x_i - \mu_j\|^2`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'During one k-means iteration, what can happen to the objective J (the sum of squared distances to assigned centres)?',
        options: ['It can rise or fall', 'It can only fall or stay the same', 'It always reaches the global minimum', 'It only changes in the update step'],
        correct: 1,
        explanation: 'Re-assigning each point to its nearest centre cannot increase its distance, and moving a centre to the mean of its points minimises their summed squared distance. Both half-steps lower J or leave it — which is why k-means always stops.',
    },
    {
        question: 'Two runs of k-means on the same data end with different J. Why?',
        options: [
            'One of them has a bug',
            'k-means converges to a local minimum that depends on the starting centres',
            'The data changed between runs',
            'J is random',
        ],
        correct: 1,
        explanation: 'Every start runs downhill to the nearest valley. A bad start (two centres in one blob) gets trapped. k-means++ starts and several restarts, keeping the lowest J, are the standard fix.',
    },
    {
        question: 'Why can you not choose k by picking the one with the lowest J?',
        options: [
            'Because J is not defined for large k',
            'Because J keeps falling as k grows — down to 0 with one centre per point',
            'Because J rises with k',
            'Because k must be even',
        ],
        correct: 1,
        explanation: 'More centres always fit at least as well. Look for the elbow where an extra centre stops buying much, or use a separate criterion.',
    },
];

const codeExample = `import numpy as np
from sklearn.cluster import KMeans
from sklearn.datasets import make_blobs

grid = [[x, y] for y in (0.8, 0, -0.8) for x in (-0.8, 0, 0.8)]
X, _ = make_blobs([8] * 9, centers=grid, cluster_std=0.11, random_state=6)   # [72, 2]

def J(k, init, n_init, seed):
    return KMeans(k, init=init, n_init=n_init, random_state=seed).fit(X).inertia_

best = min(J(9, "k-means++", 10, s) for s in range(20))                  # 1.55
for init, n_init in [("random", 1), ("k-means++", 1), ("k-means++", 10)]:
    trapped = sum(J(9, init, n_init, s) > 1.1 * best for s in range(200))
    print(init, n_init, trapped, "of 200 trapped")
# random     1  165 of 200 trapped
# k-means++  1    9 of 200 trapped   (sklearn's greedy k-means++ tries several
# k-means++ 10    0 of 200 trapped    candidates per centre; the page's tries one)

print([round(J(k, "k-means++", 10, 0), 2) for k in range(1, 13)])       # the elbow
# [63.52, 39.11, 23.77, 15.17, 10.97, 8.37, 6.0, 3.69, 1.55, 1.37, 1.21, 1.13]`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the bad-start and choosing-k acts, then retry.'}
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
const sx = (x) => r2(((x - RANGE[0]) / (RANGE[1] - RANGE[0])) * BOX);
const sy = (y) => r2(((RANGE[1] - y) / (RANGE[1] - RANGE[0])) * BOX);

function KmeansPlane({ V, centroids, assign, highlight, from, onClick, cells = true }) {
    const handle = (e) => {
        if (!onClick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        onClick(Math.round((RANGE[0] + ((e.clientX - rect.left) / rect.width) * (RANGE[1] - RANGE[0])) * 1000) / 1000,
            Math.round((RANGE[1] - ((e.clientY - rect.top) / rect.height) * (RANGE[1] - RANGE[0])) * 1000) / 1000);
    };
    return (
        <svg viewBox={`0 0 ${BOX} ${BOX}`} className="w-full rounded-lg border border-slate-700 bg-slate-950" role="img"
            aria-label="Points, centres and the cells each centre owns" onClick={handle} style={onClick ? { cursor: 'crosshair' } : undefined}>
            {cells && centroids && assign && centroids.map((_, j) => {
                const cell = voronoiCell(centroids, j);
                return cell.length > 2 && <polygon key={j} points={cell.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} fill={COLORS[j]} opacity="0.1" stroke={COLORS[j]} strokeOpacity="0.35" />;
            })}
            <line x1={sx(0)} x2={sx(0)} y1="0" y2={BOX} stroke="#1e293b" />
            <line y1={sy(0)} y2={sy(0)} x1="0" x2={BOX} stroke="#1e293b" />
            {V.map(([x, y], i) => (
                <circle key={i} cx={sx(x)} cy={sy(y)} r="4.5" fill={assign ? COLORS[assign[i]] : '#94a3b8'} stroke="#0f172a" strokeWidth="1" />
            ))}
            {highlight !== undefined && <circle cx={sx(V[highlight][0])} cy={sy(V[highlight][1])} r="10" fill="none" stroke="#f8fafc" strokeWidth="2.5" />}
            {from && centroids && centroids.map((c, j) => (
                <line key={`m${j}`} x1={sx(from[j][0])} y1={sy(from[j][1])} x2={sx(c[0])} y2={sy(c[1])} stroke={COLORS[j]} strokeWidth="2" strokeDasharray="4 3" />
            ))}
            {from && from.map((c, j) => <circle key={`o${j}`} cx={sx(c[0])} cy={sy(c[1])} r="6" fill="none" stroke={COLORS[j]} strokeWidth="1.5" strokeDasharray="2 2" />)}
            {centroids && centroids.map((c, j) => (
                <g key={j} style={{ transform: `translate(${sx(c[0])}px, ${sy(c[1])}px)`, transition: 'transform 0.5s ease' }}>
                    <rect x="-9" y="-9" width="18" height="18" rx="3" transform="rotate(45)" fill={COLORS[j]} stroke="#0f172a" strokeWidth="2" />
                    <text y="4" fontSize="11" fontWeight="800" textAnchor="middle" fill="#0f172a">{LETTERS[j]}</text>
                </g>
            ))}
        </svg>
    );
}

function JChart({ trail }) {
    const W = 420, H = 150, L = 44, B = 24, T = 10;
    if (!trail || trail.length === 0) return <p className="text-xs text-slate-500">J appears after the first assignment.</p>;
    const hi = Math.max(...trail.map(t => t.J)), lo = Math.min(...trail.map(t => t.J));
    const pad = Math.max((hi - lo) * 0.1, hi * 0.02);
    const px = (i) => r2(L + (trail.length === 1 ? 0.5 : i / (trail.length - 1)) * (W - L - 12));
    const py = (j) => r2(T + (1 - (j - (lo - pad)) / (hi - lo + 2 * pad)) * (H - T - B));
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="J after every half-step">
            {[hi, lo].map((j, n) => <g key={n}><line x1={L} x2={W - 12} y1={py(j)} y2={py(j)} stroke="#1e293b" /><text x={L - 6} y={py(j) + 4} fontSize="10" textAnchor="end" fill="#64748b">{f(j, 2)}</text></g>)}
            <path d={trail.map((t, i) => `${i ? 'L' : 'M'}${px(i)},${py(t.J)}`).join(' ')} fill="none" stroke="#a3e635" strokeWidth="2" />
            {trail.map((t, i) => <circle key={i} cx={px(i)} cy={py(t.J)} r="3.5" fill={t.kind === 'assign' ? '#38bdf8' : '#fb923c'} />)}
            <text x={L} y={H - 6} fontSize="10" fill="#38bdf8">● after assign</text>
            <text x={L + 92} y={H - 6} fontSize="10" fill="#fb923c">● after update</text>
        </svg>
    );
}

function ElbowChart({ elbow, k }) {
    const W = 420, H = 170, L = 40, B = 24, T = 10;
    const hi = Math.max(...elbow.map(e => e.J));
    const px = (kk) => r2(L + ((kk - 1) / (elbow.length - 1)) * (W - L - 12));
    const py = (j) => r2(T + (1 - j / hi) * (H - T - B));
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Best J against k">
            {[0, hi / 2, hi].map((j, n) => <g key={n}><line x1={L} x2={W - 12} y1={py(j)} y2={py(j)} stroke="#1e293b" /><text x={L - 6} y={py(j) + 4} fontSize="10" textAnchor="end" fill="#64748b">{f(j, 1)}</text></g>)}
            <path d={elbow.map((e, i) => `${i ? 'L' : 'M'}${px(e.k)},${py(e.J)}`).join(' ')} fill="none" stroke="#a3e635" strokeWidth="2.5" />
            {elbow.map(e => <g key={e.k}><circle cx={px(e.k)} cy={py(e.J)} r={e.k === k ? 7 : 3.5} fill={e.k === k ? 'none' : '#a3e635'} stroke="#facc15" strokeWidth={e.k === k ? 2 : 0} /><text x={px(e.k)} y={H - 6} fontSize="10" textAnchor="middle" fill={e.k === k ? '#e2e8f0' : '#64748b'}>{e.k}</text></g>)}
            <text x="2" y={H - 6} fontSize="10" fill="#94a3b8">k</text>
        </svg>
    );
}

/* ── explore ────────────────────────────────────────────── */

function Explore({ initialSeed }) {
    const [seed, setSeed] = useState(initialSeed);
    const [kind, setKind] = useState('blobs');
    const [k, setK] = useState(K_TOUR);
    const [init, setInit] = useState('kmeans++');
    const [startSeed, setStartSeed] = useState(1);
    const [half, setHalf] = useState(0);
    const [extra, setExtra] = useState([]);
    const V = useMemo(() => [...makeData(seed, kind), ...extra], [seed, kind, extra]);
    const r = useMemo(() => run(V, k, startSeed, init), [V, k, startSeed, init]);
    const best = useMemo(() => bestJ(V, k, 20), [V, k]);
    const shown = Math.min(half, r.halves.length);
    const cur = shown === 0 ? null : r.halves[shown - 1];
    const centroids = cur ? cur.centroids : r.start;
    const assign = cur ? cur.assign : null;
    const done = shown >= r.halves.length;
    const trail = r.halves.slice(0, shown).map(h => ({ kind: h.kind, J: h.J }));
    const reset = (fn) => { fn(); setHalf(0); };
    const trapSeed = useMemo(() => { for (let s = 1; s < 300; s++) if (run(V, k, s, 'random').J > 1.3 * best) return s; return null; }, [V, k, best]);

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="min-w-0">
                        <KmeansPlane V={V} centroids={centroids} assign={assign} from={cur?.kind === 'update' ? cur.from : undefined}
                            onClick={(x, y) => reset(() => setExtra(e => [...e, [x, y]]))} />
                        <p className="text-xs text-slate-500 mt-2">Click the plane to add a point (the run restarts).</p>
                    </div>
                    <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setHalf(h => h + 1)} disabled={done}
                                className="text-sm px-3 py-1.5 rounded-lg bg-lime-600 text-white hover:bg-lime-500 disabled:opacity-40">
                                {cur?.kind === 'assign' ? 'Update centres' : 'Assign points'}
                            </button>
                            <button onClick={() => setHalf(r.halves.length)} disabled={done} className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">Run to the end</button>
                            <button onClick={() => reset(() => setStartSeed(s => s + 1))} className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500">New start</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center">
                            {[['J now', cur ? f(cur.J, 3) : '—'], ['best J (20 starts)', f(best, 3)]].map(([label, val]) => (
                                <div key={label} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
                                    <div className="font-mono text-sm text-slate-100">{val}</div>
                                </div>
                            ))}
                        </div>
                        <JChart trail={trail} />
                        {done && <p className={`text-sm rounded-lg px-3 py-2 border ${r.J > TRAP_RATIO * best ? 'text-amber-200 bg-amber-500/10 border-amber-500/25' : 'text-emerald-200 bg-emerald-500/10 border-emerald-500/25'}`}>
                            Converged after {r.iters - 1} iteration{r.iters === 2 ? '' : 's'} at J = {f(r.J, 3)}
                            {r.J > TRAP_RATIO * best ? ` — ${f(r.J / best, 2)}× the best: trapped. Try a new start or k-means++.`
                                : r.J <= best * 1.0005 ? ' — the best found.' : ` — within ${Math.ceil((r.J / best - 1) * 100)}% of the best found.`}
                        </p>}
                        <div className="flex flex-wrap gap-1.5"><ShapeTag label="X" names={['n', 'd']} shape={[V.length, 2]} /><ShapeTag label="centres" names={['k', 'd']} shape={[k, 2]} /></div>
                    </div>
                </div>
            </div>
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap gap-1.5 items-center">
                    {[['blobs', 'Three blobs', 3], ['nine', 'Nine blobs', 9], ['moons', 'Two moons', 2]].map(([key, label, natural]) => (
                        <button key={key} onClick={() => reset(() => { setKind(key); setK(natural); setExtra([]); })}
                            className={`text-xs px-3 py-1.5 rounded-lg border ${kind === key ? 'border-lime-500 text-lime-200 bg-lime-500/10' : 'border-slate-700 text-slate-300 hover:border-lime-500'}`}>{label}</button>
                    ))}
                    {[['kmeans++', 'k-means++ start'], ['random', 'Random start']].map(([key, label]) => (
                        <button key={key} onClick={() => reset(() => setInit(key))}
                            className={`text-xs px-3 py-1.5 rounded-lg border ${init === key ? 'border-lime-500 text-lime-200 bg-lime-500/10' : 'border-slate-700 text-slate-300 hover:border-lime-500'}`}>{label}</button>
                    ))}
                    <button onClick={() => reset(() => { setSeed(randomSeed()); setExtra([]); })} aria-label="New data" title="New data" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                </div>
                <ParamSlider label="Clusters k" value={k} onChange={(v) => reset(() => setK(v))} min={1} max={9} step={1} accent="lime" />
                <div className="text-slate-100 text-sm overflow-x-auto">
                    <Tex block>{cur ? String.raw`J = \sum_i \|x_i - \mu_{c(i)}\|^2 = ${tn(cur.J, 3)}\quad (\text{after ${cur.kind}, iteration ${cur.it}})` : String.raw`J = \sum_i \|x_i - \mu_{c(i)}\|^2 \quad (\text{assign first})`}</Tex>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => reset(() => { setInit('random'); if (trapSeed) setStartSeed(trapSeed); })} disabled={!trapSeed || (init === 'random' && startSeed === trapSeed)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">A start that gets trapped</button>
                    <button onClick={() => { setKind('moons'); setK(2); setExtra([]); setHalf(MAX_ITERS * 2); }} disabled={kind === 'moons' && k === 2 && done}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">Two moons, k = 2</button>
                    <button onClick={() => reset(() => { setKind('blobs'); setK(K_TOUR); setInit('kmeans++'); setStartSeed(1); setExtra([]); })}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
                {kind === 'moons' && k === 2 && done && (
                    <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                        Two centres can only cut the plane with one straight line — the cells are always convex. The moons interlock, so each cluster takes the tip of the other moon. k-means assumes round, similar-sized blobs.
                    </p>
                )}
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function KMeansClusteringPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const stepHistory = useMemo(() => generateSteps(seed), [seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1800);
    const [explore, setExplore] = useState({ seed, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [study, setStudy] = useState(null);
    /* The misconception study runs about 1,500 starts on nine blobs; after the first paint. */
    useEffect(() => {
        const t = setTimeout(() => { const V9 = nineBlobs(DEFAULT_SEED); setStudy({ ...trapStudy(V9, 9), restarts: restartStudy(V9, 9) }); }, 60);
        return () => clearTimeout(t);
    }, []);

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
    const toExplore = () => { setExplore(e => ({ seed, key: e.key + 1 })); setMode('explore'); setIsPlaying(false); };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/machine-learning" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Machine Learning
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">k-Means Clustering</h1>
                    <p className="text-lime-50 max-w-3xl">
                        Assign each point to its nearest centre, move each centre to its points&apos; mean, repeat. Watch the objective fall at every half-step, a bad start get trapped, and why the lowest J cannot choose k.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/80">Builds on</span>
                        {[['k-Nearest Neighbours', '/machine-learning/k-nearest-neighbors'], ['Norms and Unit Vectors', '/vectors/norms-and-unit-vectors']].map(([name, href]) => (
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
                        <SourceChip kind="live">The engine&apos;s k-means, run in your browser · seeded blobs</SourceChip>
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
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}{step.it ? ` · iteration ${step.it}` : ''}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                        <div className="min-w-0">
                                            <KmeansPlane V={step.V} centroids={step.centroids} assign={step.assign} highlight={step.highlight} from={step.from} cells={!step.noCells && step.half !== 'update'} />
                                        </div>
                                        <div className="min-w-0 space-y-3">
                                            {step.elbow ? <ElbowChart elbow={step.elbow} k={K_TOUR} /> : step.jTrail ? <JChart trail={step.jTrail} /> : null}
                                            {step.J !== undefined && (
                                                <div className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2 text-center">
                                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">J{step.half ? ` after ${step.half}` : ''}</div>
                                                    <div className="font-mono text-sm text-slate-100">{f(step.J, 3)}</div>
                                                </div>
                                            )}
                                            {step.highlight !== undefined && !predict.pending && step.centroids && (
                                                <table className="w-full text-xs font-mono">
                                                    <tbody>
                                                        {step.centroids.map((c, j) => (
                                                            <tr key={j} className={step.joined === j ? 'text-slate-100' : 'text-slate-500'}>
                                                                <td style={{ color: COLORS[j] }}>centre {LETTERS[j]}</td>
                                                                <td className="text-right tabular-nums">distance {f(Math.sqrt(squaredL2(step.V[step.highlight], c)), 3)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                            <div className="flex flex-wrap gap-1.5"><ShapeTag label="X" names={['n', 'd']} shape={[N_POINTS, 2]} />{step.centroids && <ShapeTag label="centres" names={['k', 'd']} shape={[step.centroids.length, 2]} />}</div>
                                        </div>
                                    </div>
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
                        <h2 className="text-sm font-semibold text-white mb-3">Why J never rises</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-slate-200 font-semibold">Assign</span> — a point moves only to a nearer centre, so its term can only shrink.</li>
                            <li><span className="text-slate-200 font-semibold">Update</span> — the mean is the point with the smallest summed squared distance to its group.</li>
                            <li><span className="text-slate-200 font-semibold">Stop</span> — there are finitely many assignments and J never repeats a higher value, so the loop ends.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;k-means finds the best clusters.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            {study
                                ? <>It finds a local minimum, and which one depends on the start. On nine round blobs ({NINE.per * 9} points, k = 9), {study.random} of {study.starts} random starts ended trapped — J more than {TRAP_RATIO}× the best, {f(study.best, 3)}. With k-means++ starts, {study.plusplus} of {study.starts}. Keeping the lowest J of {study.restarts.per} k-means++ starts: {study.restarts.trapped} of {study.restarts.groups}. Run several starts.</>
                                : 'Running about 1,500 starts on nine blobs…'}
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
