"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2, Shuffle,
    Sigma, Activity, Ruler, Navigation, TrendingDown, Scale, Slash, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { makeDataset } from '@/lib/ml/datasets';
import { useTrainer } from '@/lib/ml/useTrainer';
import DecisionField from '@/components/ml/DecisionField';
import TrainingCurve from '@/components/ml/TrainingCurve';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { AI_COLORS } from '@/components/ml/colors';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the model ─────────────────────────────────────────────
   Two features, one linear score z = w₁x₁ + w₂x₂ + b, squashed by the
   sigmoid into p = P(class 1). Trained by full-batch gradient descent on the
   mean binary cross-entropy. The tour starts from a deliberately bad guess:
   the trained direction turned by 100–140°, so some points begin
   confidently wrong. */

const N_POINTS = 30;
const DEFAULT_SEED = 5;
const RATE = 2;
const SNAPSHOTS = [1, 3, 10, 30, 100, 400];
const Z_EDGES = [-Math.log(3), 0, Math.log(3)];      // σ(z) = 0.25, 0.5, 0.75
const EDGE_MARGIN = 0.15;
const BUCKET_LABELS = ['Below 0.25', '0.25 to 0.5', '0.5 to 0.75', 'Above 0.75'];
const STUDY = { n: 200, steps: 2000, seed: 3 };

const ACTS = [
    { id: 1, label: 'Scores', icon: Sigma },
    { id: 2, label: 'Squash', icon: Activity },
    { id: 3, label: 'Cross-entropy', icon: Ruler },
    { id: 4, label: 'Gradient', icon: Navigation },
    { id: 5, label: 'Training', icon: TrendingDown },
    { id: 6, label: 'Log-odds', icon: Scale },
    { id: 7, label: 'Straight lines', icon: Slash },
];

const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const fp = (v, d = 2) => (v < 0 ? `(${f(v, d)})` : f(v, d));
const tn = (v, d = 2) => f(v, d).replace('−', '-');
const pct = (v) => `${Math.round(v * 100)}%`;
const round1 = (v) => Math.round(v * 10) / 10;

const sigmoid = (z) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));
const scoreOf = (m, p) => m.w[0] * p.x + m.w[1] * p.y + m.b;
/** −ln P(true class), computed from z so it stays finite when p rounds to 0 or 1. */
const pointLoss = (z, label) => Math.max(z, 0) - z * label + Math.log1p(Math.exp(-Math.abs(z)));
const bucketOf = (p) => (p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3);

/* 'separable' is the linear set with no noise, so the classes never overlap. */
function makeKind(seed, kind, n) {
    const d = makeDataset(kind === 'separable' ? 'linear' : kind, { n, noise: kind === 'linear' ? 0.22 : kind === 'separable' ? 0 : 0.08, seed });
    return d.X.map(([x, y], i) => ({ x, y, label: d.y[i] }));
}
const makeData = (seed) => makeKind(seed, 'linear', N_POINTS);
const sizeOf = (kind) => (kind === 'linear' ? N_POINTS : kind === 'separable' ? 40 : 60);

function lossOf(m, pts, l2 = 0) {
    const data = pts.reduce((s, p) => s + pointLoss(scoreOf(m, p), p.label), 0) / pts.length;
    return data + 0.5 * l2 * (m.w[0] ** 2 + m.w[1] ** 2);
}
function gradOf(m, pts, l2 = 0) {
    let g1 = 0, g2 = 0, gb = 0;
    for (const p of pts) {
        const e = sigmoid(scoreOf(m, p)) - p.label;
        g1 += e * p.x; g2 += e * p.y; gb += e;
    }
    const n = pts.length;
    return { w: [g1 / n + l2 * m.w[0], g2 / n + l2 * m.w[1]], b: gb / n };
}
function gdStep(m, pts, rate = RATE, l2 = 0) {
    const g = gradOf(m, pts, l2);
    return { w: [m.w[0] - rate * g.w[0], m.w[1] - rate * g.w[1]], b: m.b - rate * g.b };
}
function train(m, pts, steps, rate = RATE, l2 = 0) {
    let cur = m;
    for (let i = 0; i < steps; i++) cur = gdStep(cur, pts, rate, l2);
    return cur;
}
const accuracyOf = (m, pts) => pts.filter(p => (scoreOf(m, p) >= 0 ? 1 : 0) === p.label).length / pts.length;
const norm = (m) => Math.hypot(m.w[0], m.w[1]);

function badGuess(pts, seed) {
    const rng = createRng(seed * 17 + 5);
    const target = train({ w: [0, 0], b: 0 }, pts, 400);
    const angle = Math.atan2(target.w[1], target.w[0]) + (rng.chance(0.5) ? 1 : -1) * (100 + 40 * rng.next()) * Math.PI / 180;
    return { w: [round1(3 * Math.cos(angle)), round1(3 * Math.sin(angle))], b: round1(rng.next() - 0.5) };
}

/** Train on the two rings and on a separable set: how good can a straight boundary get? */
function linearLimit() {
    const rings = makeKind(STUDY.seed, 'circles', STUDY.n);
    const flat = makeKind(STUDY.seed, 'linear', STUDY.n);
    const mr = train({ w: [0, 0], b: 0 }, rings, STUDY.steps);
    const ml = train({ w: [0, 0], b: 0 }, flat, STUDY.steps);
    const ones = rings.filter(p => p.label === 1).length / rings.length;
    return { rings: accuracyOf(mr, rings), linear: accuracyOf(ml, flat), majority: Math.max(ones, 1 - ones), steps: STUDY.steps, n: STUDY.n };
}

const generateSteps = (pts, seed) => {
    const steps = [];
    const s = (act, data) => steps.push({ act, actName: ACTS[act - 1].label, pts, ...data });
    const rng = createRng(seed * 7 + 1);
    const m0 = badGuess(pts, seed);
    const zs = pts.map(p => scoreOf(m0, p));
    const show = rng.int(0, pts.length - 1);
    const sp = pts[show];

    s(1, {
        model: m0, panel: 'field',
        explanation: `${pts.length} points with two features each, in two classes — blue (0) and orange (1). Logistic regression scores every point with one linear formula, z = w₁x₁ + w₂x₂ + b, and calls z = 0 the boundary. This first guess, w = (${f(m0.w[0], 1)}, ${f(m0.w[1], 1)}) and b = ${f(m0.b, 1)}, is a bad one on purpose.`,
    });
    s(1, {
        model: m0, panel: 'field', highlight: show,
        explanation: `The highlighted point is at (${f(sp.x)}, ${f(sp.y)}): z = ${f(m0.w[0], 1)} × ${fp(sp.x)} + ${fp(m0.w[1], 1)} × ${fp(sp.y)} + ${fp(m0.b, 1)} = ${f(zs[show], 3)}. A score can be any number. The colours show it everywhere at once: strong far from the line, pale near it.`,
    });

    /* Act 2: the sigmoid. One highlighted point per probability range, in a
       seeded order; none within 0.15 of a range edge in z. */
    s(2, {
        model: m0, panel: 'sigmoid',
        explanation: 'The sigmoid σ(z) = 1 / (1 + e^−z) squashes any score into a probability between 0 and 1: z = 0 gives exactly 0.5, large positive scores approach 1, large negative ones approach 0. p = σ(z) is the model’s probability that the point is orange.',
    });
    const byBucket = [[], [], [], []];
    zs.forEach((z, i) => { if (Z_EDGES.every(e => Math.abs(z - e) > EDGE_MARGIN)) byBucket[bucketOf(sigmoid(z))].push(i); });
    const picks = rng.shuffle(byBucket.filter(b => b.length).map(b => rng.pick(b)));
    for (const i of picks) {
        const z = zs[i], p = sigmoid(z);
        s(2, {
            model: m0, panel: 'sigmoid', highlight: i, bucketQuestion: { index: i, z }, bucket: bucketOf(p),
            explanation: `This point scores z = ${f(z, 3)}, so p = σ(${f(z, 3)}) = 1 / (1 + e^${fp(-z, 3)}) = ${f(p, 3)} — ${BUCKET_LABELS[bucketOf(p)].toLowerCase()}. ${p > 0.5 ? `The model says orange with ${pct(p)} confidence.` : `The model says blue with ${pct(1 - p)} confidence.`} It is really ${pts[i].label === 1 ? 'orange' : 'blue'}.`,
        });
    }

    /* Act 3: cross-entropy. */
    const losses = pts.map((p, i) => pointLoss(zs[i], p.label));
    const L0 = losses.reduce((a, b) => a + b, 0) / pts.length;
    const worst = losses.indexOf(Math.max(...losses));
    const wp = sigmoid(zs[worst]);
    const pTrue = pts[worst].label === 1 ? wp : 1 - wp;
    s(3, {
        model: m0, panel: 'loss',
        explanation: `Each point is charged −ln of the probability the model gave its true class: −ln p for orange points, −ln(1 − p) for blue ones. The mean over all ${pts.length} points is the binary cross-entropy: L = ${f(L0, 3)}. A model that always said 0.5 would score ln 2 = 0.693.`,
    });
    s(3, {
        model: m0, panel: 'loss', highlight: worst,
        explanation: `The costliest point is ${pts[worst].label === 1 ? 'orange' : 'blue'}, but the model gives its class only ${f(pTrue, 3)}: it is charged −ln ${f(pTrue, 3)} = ${f(losses[worst], 3)}, ${f(losses[worst] / L0, 1)} times the average. Confident mistakes are what cross-entropy punishes hardest.`,
    });

    /* Act 4: the gradient and one step. */
    const g = gradOf(m0, pts);
    const m1 = gdStep(m0, pts);
    s(4, {
        model: m0, panel: 'field', grad: g, arrows: true,
        explanation: `The gradient has a famously simple form: ∂L/∂w₁ = mean of (p − y)·x₁, ∂L/∂w₂ = mean of (p − y)·x₂, ∂L/∂b = mean of (p − y). Each point pushes in proportion to how wrong it is, p − y. Here ∇L = (${f(g.w[0], 3)}, ${f(g.w[1], 3)}, ${f(g.b, 3)}).`,
    });
    s(4, {
        model: m1, prev: m0, panel: 'field', grad: g,
        explanation: `One step with η = ${RATE}: w₁ = ${f(m0.w[0], 1)} − ${RATE} × ${fp(g.w[0], 3)} = ${f(m1.w[0], 3)}, w₂ = ${f(m0.w[1], 1)} − ${RATE} × ${fp(g.w[1], 3)} = ${f(m1.w[1], 3)}, b = ${f(m0.b, 1)} − ${RATE} × ${fp(g.b, 3)} = ${f(m1.b, 3)}. The loss falls from ${f(L0, 3)} to ${f(lossOf(m1, pts), 3)}.`,
    });

    /* Act 5: training snapshots. */
    let m = m0, done = 0;
    const curve = [{ x: 0, y: L0 }];
    for (const at of SNAPSHOTS) {
        while (done < at) { m = gdStep(m, pts); done++; curve.push({ x: done, y: lossOf(m, pts) }); }
        const acc = accuracyOf(m, pts);
        s(5, {
            model: m, panel: 'field', curve: curve.slice(), stepCount: done,
            explanation: `After ${done} step${done === 1 ? '' : 's'}: loss ${f(lossOf(m, pts), 4)}, ${pct(acc)} of points classified correctly. ${done === SNAPSHOTS[SNAPSHOTS.length - 1]
                ? `The boundary has swung round to w = (${f(m.w[0], 2)}, ${f(m.w[1], 2)}), b = ${f(m.b, 2)}. ${acc < 1 ? 'The points it still gets wrong sit among the other class: cross-entropy settles for a boundary that is confident about most points rather than chasing the last few.' : 'Every point is on its correct side now; from here the loss can only fall by sharpening the boundary (try Perfectly separable in Explore).'}`
                : done < 10 ? 'The boundary is turning towards the gap between the classes.' : 'Now it is mostly sharpening: the colours deepen as the scores grow.'}`,
        });
    }

    /* Act 6: log-odds. */
    const trained = m;
    const k = rng.int(0, pts.length - 1);
    const kp = sigmoid(scoreOf(trained, pts[k]));
    s(6, {
        model: trained, panel: 'field', highlight: k,
        explanation: `Undo the sigmoid and the score is the log-odds: z = ln(p / (1 − p)). For the highlighted point p = ${f(kp, 3)}, so the odds are ${f(kp / (1 - kp), 3)} and ln of that is ${f(Math.log(kp / (1 - kp)), 3)} — exactly its score. Logistic regression is linear regression on the log-odds.`,
    });
    s(6, {
        model: trained, panel: 'field',
        explanation: `So each weight has a reading. These features span about 2 units, so take a step of 0.1: 0.1 more of x₁ adds ${f(0.1 * trained.w[0], 3)} to the log-odds, multiplying the odds of orange by e^${fp(0.1 * trained.w[0], 3)} = ${f(Math.exp(0.1 * trained.w[0]), 2)}; 0.1 more of x₂ multiplies them by e^${fp(0.1 * trained.w[1], 3)} = ${f(Math.exp(0.1 * trained.w[1]), 2)}.`,
    });

    /* Act 7: the boundary is always a line. */
    const rings = makeKind(seed, 'circles', 60);
    const mr = train({ w: [0, 0], b: 0 }, rings, 400);
    const ones = rings.filter(p => p.label === 1).length / rings.length;
    s(7, {
        pts: rings, model: mr, panel: 'field',
        explanation: `The sigmoid is curved, but the boundary is where z = 0 — and z is linear, so the boundary is always a straight line. Train the same model on two rings for 400 steps: ${pct(accuracyOf(mr, rings))} accuracy, where always guessing one class scores ${pct(Math.max(ones, 1 - ones))}; the best a line can do is shave off part of the ring. Loss ${f(lossOf(mr, rings), 3)}, against ${f(Math.log(2), 3)} for a coin toss. No setting of three numbers can draw a circle.`,
    });
    s(7, {
        model: trained, panel: 'field', done: true,
        explanation: 'Curved boundaries need new features (x₁², x₂²) or a hidden layer — which is exactly what a neural network adds. Switch to Explore to train it yourself, add points, and break it.',
    });
    return steps;
};

/* ── predict ───────────────────────────────────────────────
   Before each highlighted point's reveal: which probability range does its
   score land in? The score is in the question and the sigmoid curve is on
   screen. Each range comes up at most once per tour, in a seeded order. */
const predictFor = (step, next) => {
    if (!next || !next.bucketQuestion) return null;
    const { z } = next.bucketQuestion;
    return {
        question: `This point’s score is z = ${f(z, 3)}. Which range is its probability p = σ(z) in?`,
        options: BUCKET_LABELS,
        correct: next.bucket,
        because: `σ(${f(z, 3)}) = ${f(sigmoid(z), 3)}. The edges sit at z = −1.10 (p = 0.25), z = 0 (p = 0.5) and z = 1.10 (p = 0.75), since σ(ln 3) = 3/4.`,
    };
};

/** The formula for the step on screen, with its live values. */
function formulaFor(step) {
    const { model: m, pts } = step;
    const h = step.highlight;
    if (step.panel === 'sigmoid' && h !== undefined) {
        const z = scoreOf(m, pts[h]);
        return String.raw`p = \sigma(z) = \frac{1}{1 + e^{-z}} = \frac{1}{1 + e^{${tn(-z, 3)}}} = ${tn(sigmoid(z), 4)}`;
    }
    if (step.panel === 'loss') {
        return String.raw`L = -\frac{1}{${pts.length}}\sum_{i} \big[y_i \ln p_i + (1 - y_i)\ln(1 - p_i)\big] = ${tn(lossOf(m, pts), 4)}`;
    }
    if (step.prev) {
        const g = step.grad;
        return String.raw`\begin{bmatrix} w_1 \\ w_2 \\ b \end{bmatrix} \leftarrow \begin{bmatrix} ${tn(step.prev.w[0], 1)} \\ ${tn(step.prev.w[1], 1)} \\ ${tn(step.prev.b, 1)} \end{bmatrix} - ${RATE}\begin{bmatrix} ${tn(g.w[0], 3)} \\ ${tn(g.w[1], 3)} \\ ${tn(g.b, 3)} \end{bmatrix} = \begin{bmatrix} ${tn(m.w[0], 3)} \\ ${tn(m.w[1], 3)} \\ ${tn(m.b, 3)} \end{bmatrix}`;
    }
    if (step.grad) return String.raw`\nabla L = \tfrac1n\textstyle\sum (p_i - y_i)\,(x_{i1},\, x_{i2},\, 1) = (${tn(step.grad.w[0], 3)},\; ${tn(step.grad.w[1], 3)},\; ${tn(step.grad.b, 3)})`;
    if (step.act === 6 && h !== undefined) {
        const p = sigmoid(scoreOf(m, pts[h]));
        return String.raw`z = \ln\frac{p}{1 - p} = \ln\frac{${tn(p, 3)}}{${tn(1 - p, 3)}} = ${tn(Math.log(p / (1 - p)), 3)}`;
    }
    if (h !== undefined) {
        const p = pts[h];
        return String.raw`z = w_1x_1 + w_2x_2 + b = (${tn(m.w[0], 1)})(${tn(p.x)}) + (${tn(m.w[1], 1)})(${tn(p.y)}) + (${tn(m.b, 1)}) = ${tn(scoreOf(m, p), 3)}`;
    }
    return String.raw`p = \sigma(${tn(m.w[0], 2)}\,x_1 ${m.w[1] < 0 ? '-' : '+'} ${tn(Math.abs(m.w[1]), 2)}\,x_2 ${m.b < 0 ? '-' : '+'} ${tn(Math.abs(m.b), 2)}), \quad L = ${tn(lossOf(m, pts), 4)}, \quad \text{accuracy} = ${Math.round(accuracyOf(m, pts) * 100)}\%`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'A logistic-regression model gives a point the score z = 0. What probability does it assign to class 1?',
        options: ['0', '0.5', '1', 'It depends on the learning rate'],
        correct: 1,
        explanation: 'σ(0) = 1 / (1 + e⁰) = 1/2. The decision boundary is exactly the set of points with z = 0, where the model is undecided.',
    },
    {
        question: 'Why can plain logistic regression not separate a ring of class-1 points around a cluster of class-0 points?',
        options: [
            'The sigmoid saturates and the gradient vanishes',
            'Its boundary is where w·x + b = 0, which is always a straight line',
            'Cross-entropy cannot be used with circular data',
            'It needs more training steps',
        ],
        correct: 1,
        explanation: 'The sigmoid only turns the score into a probability; the boundary p = 0.5 is z = 0, and z is linear in x. Curved boundaries need extra features such as x₁² and x₂², or a hidden layer.',
    },
    {
        question: 'A trained model has weight w₁ = 0.7 on feature x₁. What does one more unit of x₁ do to the odds of class 1?',
        options: ['Adds 0.7 to the probability', 'Multiplies the odds by e^0.7 ≈ 2.0', 'Multiplies the probability by 0.7', 'Nothing unless x₂ also changes'],
        correct: 1,
        explanation: 'The score is the log-odds, z = ln(p / (1 − p)). Adding 0.7 to the log-odds multiplies the odds by e^0.7 ≈ 2.01. The change in probability itself depends on where the point started.',
    },
];

const codeExample = `import numpy as np

X = np.array([[-0.8, 0.3], [-0.4, -0.6], [0.1, -0.2],    # six points, two features
              [0.2, 0.7], [0.6, 0.1], [0.9, -0.5]])
y = np.array([0, 0, 0, 1, 1, 1])

w, b = np.zeros(2), 0.0
for _ in range(500):
    p = 1 / (1 + np.exp(-(X @ w + b)))                  # [6] probabilities
    w -= 2.0 * X.T @ (p - y) / len(y)                   # mean (p − y)·x
    b -= 2.0 * np.mean(p - y)

print(w.round(3), round(b, 3))                          # [11.521  6.896] -2.844
print(p.round(3))                                       # [0.    0.    0.044 0.986 0.991 0.983]
# These six are separable: train longer and w keeps growing (see Break it).
# PyTorch: nn.Linear(2, 1) trained with nn.BCEWithLogitsLoss() is the same model.`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the sigmoid and log-odds acts, then retry.'}
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

const RANGE = [-1.2, 1.2];
const BOX = 360;
/* Every coordinate written into SVG is rounded: Math.exp can differ in its
   last bit between the server and the browser, which breaks hydration. */
const r2 = (v) => Math.round(v * 100) / 100;
const toBox = (x, y) => [r2(((x - RANGE[0]) / (RANGE[1] - RANGE[0])) * BOX), r2(((RANGE[1] - y) / (RANGE[1] - RANGE[0])) * BOX)];

/** The segment of w·x + b = 0 inside the visible square, or null. */
function boundarySegment(m) {
    const [a, c] = m.w, b = m.b;
    const [lo, hi] = RANGE;
    const out = [];
    if (Math.abs(c) > 1e-9) for (const x of [lo, hi]) { const y = -(a * x + b) / c; if (y >= lo && y <= hi) out.push([x, y]); }
    if (Math.abs(a) > 1e-9) for (const y of [lo, hi]) { const x = -(c * y + b) / a; if (x >= lo && x <= hi) out.push([x, y]); }
    return out.length >= 2 ? [out[0], out[out.length - 1]] : null;
}

/* DecisionField draws the probability field and the points; this overlay
   adds the boundary z = 0, the weight vector, and per-point gradient pushes. */
function ModelField({ model, pts, highlight, arrows, onAddPoint, version }) {
    const predict = useCallback((x, y) => sigmoid(model.w[0] * x + model.w[1] * y + model.b), [model]);
    const seg = boundarySegment(model);
    const points = pts.map(p => ({ x: p.x, y: p.y, label: p.label, wrong: (scoreOf(model, p) >= 0 ? 1 : 0) !== p.label }));
    const len = Math.hypot(model.w[0], model.w[1]);
    let normal = null;
    if (seg && len > 1e-9) {
        const mid = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2];
        const tip = [mid[0] + (0.35 * model.w[0]) / len, mid[1] + (0.35 * model.w[1]) / len];
        normal = [toBox(...mid), toBox(...tip)];
    }
    return (
        <div className="relative">
            <DecisionField predict={predict} points={points} version={version} highlight={highlight ?? null} onAddPoint={onAddPoint}
                ariaLabel="The model's probability of orange over the plane, with the points" />
            <svg viewBox={`0 0 ${BOX} ${BOX}`} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                <defs><marker id="lr-tip" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#f8fafc" /></marker></defs>
                {seg && <line x1={toBox(...seg[0])[0]} y1={toBox(...seg[0])[1]} x2={toBox(...seg[1])[0]} y2={toBox(...seg[1])[1]} stroke="#f8fafc" strokeWidth="2.5" strokeDasharray="7 5" />}
                {normal && <line x1={normal[0][0]} y1={normal[0][1]} x2={normal[1][0]} y2={normal[1][1]} stroke="#f8fafc" strokeWidth="2" markerEnd="url(#lr-tip)" />}
                {arrows && pts.map((p, i) => {
                    const e = sigmoid(scoreOf(model, p)) - p.label;
                    if (Math.abs(e) < 0.05) return null;
                    const [x0, y0] = toBox(p.x, p.y);
                    const [x1, y1] = toBox(p.x - 0.25 * e * p.x, p.y - 0.25 * e * p.y);
                    return <line key={i} x1={x0} y1={y0} x2={x1 + (x1 === x0 && y1 === y0 ? 0.01 : 0)} y2={y1} stroke="#facc15" strokeWidth={1 + 2 * Math.abs(e)} opacity="0.8" />;
                })}
            </svg>
        </div>
    );
}

function SigmoidPanel({ model, pts, highlight }) {
    const W = 360, H = 220, L = 30, B = 24, Z = 6;
    const sx = (z) => L + ((Math.max(-Z, Math.min(Z, z)) + Z) / (2 * Z)) * (W - L - 10);
    const sy = (p) => H - B - p * (H - B - 10);
    const curve = Array.from({ length: 121 }, (_, i) => { const z = -Z + (i / 120) * 2 * Z; return `${i ? 'L' : 'M'}${sx(z).toFixed(2)},${sy(sigmoid(z)).toFixed(2)}`; }).join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="The sigmoid curve with every point placed at its score">
            {[0.25, 0.5, 0.75].map(p => (
                <g key={p}><line x1={L} x2={W - 10} y1={sy(p)} y2={sy(p)} stroke="#1e293b" strokeDasharray="3 3" /><text x={L - 4} y={sy(p) + 3.5} fontSize="10" textAnchor="end" fill="#64748b">{p}</text></g>
            ))}
            {[0, 1].map(p => <text key={p} x={L - 4} y={sy(p) + 3.5} fontSize="10" textAnchor="end" fill="#64748b">{p}</text>)}
            {[-6, -4, -2, 0, 2, 4, 6].map(z => <text key={z} x={sx(z)} y={H - 8} fontSize="10" textAnchor="middle" fill="#64748b">{z}</text>)}
            <line x1={sx(0)} x2={sx(0)} y1={10} y2={H - B} stroke="#334155" />
            <path d={curve} fill="none" stroke="#a3e635" strokeWidth="2.5" />
            {pts.map((p, i) => {
                const z = scoreOf(model, p);
                const hot = i === highlight;
                return <circle key={i} cx={r2(sx(z))} cy={r2(sy(sigmoid(z)))} r={hot ? 7 : 4} fill={AI_COLORS.classes[p.label]} stroke={hot ? AI_COLORS.highlight : '#0f172a'} strokeWidth={hot ? 2.5 : 1} />;
            })}
            <text x={W - 12} y={H - B - 6} fontSize="10" textAnchor="end" fill="#94a3b8">score z</text>
            <text x={L + 4} y={16} fontSize="10" fill="#94a3b8">p = σ(z)</text>
        </svg>
    );
}

function LossBars({ model, pts, highlight }) {
    const losses = pts.map(p => pointLoss(scoreOf(model, p), p.label));
    const max = Math.max(...losses, 1);
    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2"><span>−ln P(true class), one bar per point</span><ShapeTag label="loss" names={['n']} shape={[pts.length]} /></div>
            <div className="flex items-end gap-[2px] h-44 border-b border-slate-700">
                {losses.map((l, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" title={`${f(l, 3)}`}
                        style={{ height: `${r2((l / max) * 100)}%`, background: AI_COLORS.classes[pts[i].label], opacity: i === highlight ? 1 : 0.55, outline: i === highlight ? `2px solid ${AI_COLORS.highlight}` : 'none' }} />
                ))}
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1"><span>mean {f(losses.reduce((a, b) => a + b, 0) / losses.length, 3)}</span><span>ln 2 = 0.693 is a coin toss</span></div>
        </div>
    );
}

/* ── explore ────────────────────────────────────────────── */

const KINDS = [['linear', 'The tour’s points'], ['xor', 'XOR'], ['circles', 'Rings'], ['moons', 'Moons']];

function Explore({ initialPts, initialModel }) {
    const [pts, setPts] = useState(initialPts);
    const [kind, setKind] = useState('linear');
    const [logLr, setLogLr] = useState(Math.log10(RATE));
    const [l2, setL2] = useState(0);
    const [addLabel, setAddLabel] = useState(1);
    const [run, setRun] = useState({ start: initialModel, key: 0 });
    const lr = 10 ** logLr;

    const trainer = useTrainer({
        init: () => ({ m: { w: [...run.start.w], b: run.start.b } }),
        step: (st) => {
            st.m = gdStep(st.m, pts, lr, l2);
            return { loss: lossOf(st.m, pts, l2), acc: accuracyOf(st.m, pts) };
        },
        deps: [run],
        maxStepsPerFrame: 4,
    });
    const m = trainer.state.m;
    const loss = lossOf(m, pts, l2), acc = accuracyOf(m, pts);

    const restart = (start = { w: [0, 0], b: 0 }) => setRun(r => ({ start, key: r.key + 1 }));
    const pickKind = (k) => { setKind(k); setPts(k === 'linear' ? initialPts : makeKind(17, k, sizeOf(k))); restart(); };
    const repair = () => { setKind('linear'); setPts(initialPts); setLogLr(Math.log10(RATE)); setL2(0); restart(initialModel); };

    const notes = [];
    if (acc === 1 && l2 === 0 && norm(m) > 8) notes.push(`Every point is classified correctly, yet the loss is still falling and ‖w‖ = ${f(norm(m), 1)} keeps growing. On perfectly separable data the loss can always be lowered by making the boundary sharper, so there is no finite minimum. An L2 penalty (λ > 0) gives the weights a price and stops the climb.`);
    if ((kind === 'circles' || kind === 'xor') && trainer.steps > 200) notes.push(`${pct(acc)} accuracy after ${trainer.steps} steps, loss ${f(loss, 3)} — near the coin-toss ln 2 = 0.693. The boundary is a straight line, and no straight line splits ${kind === 'circles' ? 'a ring from its centre' : 'XOR'}.`);

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="min-w-0">
                        <ModelField model={m} pts={pts} version={trainer.steps * 1000 + pts.length}
                            onAddPoint={(x, y) => setPts(old => [...old, { x, y, label: addLabel }])} />
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
                            Click to add a
                            {[0, 1].map(c => (
                                <button key={c} onClick={() => setAddLabel(c)}
                                    className={`px-2 py-0.5 rounded-full border ${addLabel === c ? 'border-white/60 text-white' : 'border-slate-700 text-slate-400'}`}
                                    style={{ background: addLabel === c ? `${AI_COLORS.classes[c]}55` : undefined }}>{c === 0 ? 'blue' : 'orange'}</button>
                            ))}
                            point.
                        </div>
                    </div>
                    <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                            {KINDS.map(([k, label]) => (
                                <button key={k} onClick={() => pickKind(k)}
                                    className={`text-xs px-2.5 py-1 rounded-full border ${kind === k ? 'border-lime-500/60 bg-lime-500/15 text-lime-200' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>{label}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {[['w₁, w₂', `${f(m.w[0])}, ${f(m.w[1])}`], ['b', f(m.b)], ['‖w‖', f(norm(m))], ['loss', f(loss, 4)], ['accuracy', pct(acc)], ['steps', trainer.steps]].map(([k, v]) => (
                                <div key={k} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2 px-1">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
                                    <div className="font-mono text-sm text-slate-100 tabular-nums">{v}</div>
                                </div>
                            ))}
                        </div>
                        <TrainingCurve logY series={[{ name: 'loss', color: '#a3e635', points: trainer.history.map(h => ({ x: h.step, y: h.loss })) }]} height={120} />
                        <div className="flex flex-wrap gap-1.5">
                            <ShapeTag label="X" names={['n', '2']} shape={[pts.length, 2]} />
                            <ShapeTag label="w" names={['2']} shape={[2]} />
                            <ShapeTag label="p" names={['n']} shape={[pts.length]} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="text-slate-100 text-sm">
                    <Tex block>{String.raw`p = \sigma(${tn(m.w[0], 2)}\,x_1 ${m.w[1] < 0 ? '-' : '+'} ${tn(Math.abs(m.w[1]), 2)}\,x_2 ${m.b < 0 ? '-' : '+'} ${tn(Math.abs(m.b), 2)}), \quad L = ${tn(loss, 4)}${l2 > 0 ? String.raw` \;(\text{incl. } \tfrac{\lambda}{2}\lVert w\rVert^2)` : ''}`}</Tex>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={trainer.toggle} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500">
                        {trainer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{trainer.running ? 'Pause' : 'Train'}
                    </button>
                    <button onClick={() => trainer.stepOnce(1)} aria-label="One gradient step" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><SkipForward className="h-4 w-4" /></button>
                    <button onClick={() => trainer.stepOnce(50)} className="text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">+50 steps</button>
                    <button onClick={() => restart()} aria-label="Restart from zero weights" title="Restart from zero weights" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                    <button onClick={() => { setPts(makeKind(randomSeed(), kind, sizeOf(kind))); restart(); }} aria-label="New points" title="New points"
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ParamSlider label="Step size η" value={logLr} onChange={setLogLr} min={-2} max={Math.log10(30)} step={0.01} accent="lime" format={() => f(lr, 2)} hint="Log scale." />
                    <ParamSlider label="L2 penalty λ" value={l2} onChange={setL2} min={0} max={0.2} step={0.005} accent="lime" format={(v) => f(v, 3)} hint="Adds λ/2·‖w‖² to the loss." />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => { setKind('separable'); setPts(makeKind(9, 'separable', sizeOf('separable'))); setL2(0); restart(); }} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500">Perfectly separable classes</button>
                    <button onClick={() => pickKind('circles')} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500">Ring around a cluster</button>
                    <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
                {notes.map(msg => <p key={msg} className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{msg}</p>)}
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function LogisticRegressionPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const pts = useMemo(() => makeData(seed), [seed]);
    const stepHistory = useMemo(() => generateSteps(pts, seed), [pts, seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [explore, setExplore] = useState({ pts, model: { w: [0, 0], b: 0 }, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const limit = useMemo(() => linearLimit(), []);

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
    /* Explore continues from the tour's points and the model on screen. */
    const toExplore = () => {
        setExplore(e => ({ pts, model: step.pts === pts ? step.model : { w: [0, 0], b: 0 }, key: e.key + 1 }));
        setMode('explore');
        setIsPlaying(false);
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/machine-learning" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Machine Learning
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Logistic Regression</h1>
                    <p className="text-lime-50 max-w-3xl">
                        A linear score, squashed into a probability and trained on cross-entropy. Watch the boundary swing into place, read its weights as odds, and find the one thing it can never draw.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/80">Builds on</span>
                        {[['Loss Functions', '/machine-learning/loss-functions'], ['Linear Regression', '/machine-learning/linear-regression']].map(([name, href]) => (
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
                        <SourceChip kind="live">Trained in your browser · seeded example points</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={explore.key} initialPts={explore.pts} initialModel={explore.model} />
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
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                        <div className="min-w-0">
                                            <ModelField model={step.model} pts={step.pts} highlight={step.highlight} arrows={step.arrows} version={currentStep} />
                                            <p className="text-[11px] text-slate-500 mt-1.5">Dashed: the boundary z = 0. Arrow: w, pointing towards orange.{step.arrows ? ' Yellow: each point’s push, −(p − y)·x.' : ''}</p>
                                        </div>
                                        <div className="min-w-0">
                                            {step.panel === 'sigmoid' && <SigmoidPanel model={step.model} pts={step.pts} highlight={step.highlight} />}
                                            {step.panel === 'loss' && <LossBars model={step.model} pts={step.pts} highlight={step.highlight} />}
                                            {step.panel === 'field' && (step.curve
                                                ? <TrainingCurve logY series={[{ name: 'loss', color: '#a3e635', points: step.curve }]} height={170} />
                                                : <SigmoidPanel model={step.model} pts={step.pts} highlight={step.highlight} />)}
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
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New points" title="New points"
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

                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-slate-100 text-sm sm:text-base">
                                <Tex block>{formulaFor(step)}</Tex>
                            </div>
                        </>
                    )}

                    <InCode title="Logistic regression in NumPy" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The whole model</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-lime-300 font-semibold">Score</span> — z = w·x + b, a linear function of the features.</li>
                            <li><span className="text-lime-300 font-semibold">Probability</span> — p = σ(z); the boundary is z = 0, where p = 0.5.</li>
                            <li><span className="text-lime-300 font-semibold">Loss</span> — mean −ln P(true class), the binary cross-entropy.</li>
                            <li><span className="text-lime-300 font-semibold">Gradient</span> — mean (p − y)·x: each point pushes by how wrong it is.</li>
                        </ul>
                        <p className="text-xs text-slate-500 mt-3">It is a neural network with no hidden layer: one neuron, sigmoid output.</p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;The sigmoid is a curve, so logistic regression can draw curved boundaries.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            The sigmoid bends the probabilities, never the boundary. This page trained it for {limit.steps} steps on {limit.n} points in two rings: {pct(limit.rings)} accuracy, where always guessing the bigger class scores {pct(limit.majority)}. On {limit.n} points split by a line, the same code reaches {pct(limit.linear)}.
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
