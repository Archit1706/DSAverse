"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import { MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import MatrixInput from '@/components/math/MatrixInput';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   A line is r(t) = p₀ + t d. A plane is every x with n · x = k. */
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const add = (u, v) => [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
const scale = (s, u) => [s * u[0], s * u[1], s * u[2]];
const norm = (u) => Math.sqrt(dot(u, u));
const pointAt = (p0, d, t) => add(p0, scale(t, d));
const near0 = (x) => Math.abs(x) < 1e-9;
/** How a line meets a plane: once at parameter t, never, or everywhere. */
const meet = (p0, d, n, k) => {
    const nd = dot(n, d);
    const gap = k - dot(n, p0);
    if (near0(nd)) return near0(gap) ? { kind: 'everywhere' } : { kind: 'never' };
    const t = gap / nd;
    return { kind: 'once', t, point: pointAt(p0, d, t) };
};
/** Signed distance from S to the plane (positive on the side n points to), and the foot of the perpendicular. */
const distanceToPlane = (S, n, k) => {
    const nn = norm(n);
    if (nn < 1e-12) return { dist: 0, foot: S };
    const signed = (dot(n, S) - k) / nn;
    return { dist: Math.abs(signed), signed, foot: add(S, scale(-(dot(n, S) - k) / (nn * nn), n)) };
};
/** The part of the line inside the box |x|, |y|, |z| ≤ r, as its two end points. */
const clipLine = (p0, d, r = 4.5) => {
    let lo = -1e6, hi = 1e6;
    for (let i = 0; i < 3; i++) {
        if (near0(d[i])) { if (Math.abs(p0[i]) > r) return null; continue; }
        const a = (-r - p0[i]) / d[i], b = (r - p0[i]) / d[i];
        lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
    }
    return lo < hi ? [pointAt(p0, d, lo), pointAt(p0, d, hi)] : null;
};
const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const triple = (u) => `(${num(u[0])}, ${num(u[1])}, ${num(u[2])})`;
/** n · x = k written out: x + y + 2z = 3. */
const planeText = (n, k) => {
    const terms = [];
    ['x', 'y', 'z'].forEach((v, i) => {
        if (near0(n[i])) return;
        const c = Math.abs(n[i]) === 1 ? '' : num(Math.abs(n[i]));
        terms.push(`${terms.length ? (n[i] < 0 ? ' − ' : ' + ') : n[i] < 0 ? '−' : ''}${c}${v}`);
    });
    return `${terms.join('')} = ${num(k)}`;
};

const MEET_LABELS = ['Once', 'Never — they are parallel', 'Everywhere — the line lies in the plane'];
const meetLabel = (m) => (m.kind === 'once' ? MEET_LABELS[0] : m.kind === 'never' ? MEET_LABELS[1] : MEET_LABELS[2]);

const PLANE_A = { n: [0, 0, 1], k: 2 };
const PLANE_B = { n: [1, 1, 2], k: 3 };
const PLANE_C = { n: [2, -1, 1], k: 4 };
const PLANE_D = { n: [2, -1, 2], k: 1 };

/** Two of each answer, ordered so each lands in every button equally often. */
const MEET_PRESETS = [
    { p0: [0, 0, 0], d: [1, 0, 1], ...PLANE_A },
    { p0: [0, 0, 0], d: [1, 1, 0], ...PLANE_A },
    { p0: [0, 0, 2], d: [1, -1, 0], ...PLANE_A },
    { p0: [0, 0, 0], d: [1, 1, -1], ...PLANE_B },
    { p0: [1, 0, 1], d: [2, 0, -1], ...PLANE_B },
    { p0: [0, 0, -1], d: [0, 1, 1], ...PLANE_B },
];
const POINT_PRESETS = [
    { p0: [1, -1, 0], d: [1, 1, 1], t: 2 },
    { p0: [-2, 1, 1], d: [1, -0.5, 1], t: -1 },
];
const HIT_PRESETS = [
    { p0: [1, 1, -1], d: [0, 0.5, 1], n: [1, 1, 1], k: 3 },
    { p0: [1, 0, 0], d: [1, 1, 1], ...PLANE_C },
];
const DIST_PRESETS = [
    { S: [2, 2, 3], ...PLANE_B },
    { S: [1, -2, 1], ...PLANE_D },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    const push = (s) => steps.push({ show: [], p0: null, d: null, t: 0, n: null, k: 0, S: null, ...s });
    const L = { p0: [1, -1, 0], d: [1, 1, 1] };
    push({ kind: 'opening', ...L, show: ['p0', 'dir'],
        explanation: 'A line in 3D needs two things: a point on it, p₀ = (1, −1, 0), and a direction, d = (1, 1, 1). The amber arrow is d, drawn from p₀.' });
    [[1, 'Walk one copy of d from p₀: r(1) = p₀ + 1·d = (2, 0, 1). The parameter t counts how many copies of d you have walked.'],
        [2.5, 'r(2.5) = p₀ + 2.5·d = (3.5, 1.5, 2.5). Larger t, further along.'],
        [-1.5, 'Negative t walks backwards: r(−1.5) = (−0.5, −2.5, −1.5).'],
    ].forEach(([t, text]) => push({ kind: 'teach', ...L, t, show: ['p0', 'dir', 'point'], explanation: text }));
    push({ kind: 'teach', ...L, t: -1.5, show: ['p0', 'dir', 'line'],
        explanation: 'Every t gives one point, and all of them together are the line: r(t) = p₀ + t d. Orbit the scene — from most angles a line through 3D does not pass through the origin, and it does not need to.' });
    push({ kind: 'teach', ...PLANE_A, show: ['plane', 'normal'],
        explanation: 'A plane needs a point and a normal: a direction perpendicular to it. With n = (0, 0, 1), every point whose height is 2 forms a flat plane, written n · x = 2, or simply z = 2.' });
    push({ kind: 'teach', ...PLANE_B, show: ['plane', 'normal'],
        explanation: 'Tilt the normal to n = (1, 1, 2). The plane n · x = 3 is x + y + 2z = 3: the coefficients of x, y and z are the normal. Its point closest to the origin is (0.5, 0.5, 1), a multiple of n.' });
    push({ kind: 'teach', ...PLANE_B, S: [1, 2, 0], show: ['plane', 'normal', 'S'],
        explanation: 'Is (1, 2, 0) on it? 1 + 2 + 2·0 = 3, yes. A point is on the plane exactly when n · x gives k: every step from it within the plane is perpendicular to n.' });
    const H = { p0: [0, 0, -1], d: [0, 1, 1], ...PLANE_B };
    const h = meet(H.p0, H.d, H.n, H.k);
    push({ kind: 'teach', ...H, show: ['plane', 'normal', 'line', 'p0', 'dir'],
        explanation: 'Now both together. Where does r(t) = (0, 0, −1) + t(0, 1, 1) meet x + y + 2z = 3? Put r(t) into the plane\'s equation and solve for t.' });
    push({ kind: 'teach', ...H, t: h.t, show: ['plane', 'normal', 'line', 'hit'],
        explanation: `n · (p₀ + t d) = k gives n · p₀ + t (n · d) = k, so t = (k − n · p₀) / (n · d) = (3 − (−2)) / 3 = ${num(h.t)}. The line crosses the plane at ${triple(h.point)}.` });
    push({ kind: 'teach', p0: [0, 0, 0], d: [1, 1, -1], ...PLANE_B, show: ['plane', 'normal', 'line'],
        explanation: 'If n · d = 0 the line runs parallel to the plane — d is perpendicular to the normal — and the formula would divide by zero. Then the line either misses the plane entirely, as here, or lies in it.' });
    push({ kind: 'teach', S: [1, 1, 3], ...PLANE_A, show: ['plane', 'normal', 'S', 'dist'],
        explanation: 'Last idea: how far is the point S = (1, 1, 3) from the plane z = 2? Drop a perpendicular — along the normal — to the plane. Here the answer is plainly 3 − 2 = 1.' });
    const D = { S: [2, 2, 3], ...PLANE_B };
    const dd = distanceToPlane(D.S, D.n, D.k);
    push({ kind: 'teach', ...D, show: ['plane', 'normal', 'S', 'dist'],
        explanation: `In general: distance = |n · S − k| / |n|. For S = (2, 2, 3) and x + y + 2z = 3 that is |2 + 2 + 6 − 3| / √6 = 7 / 2.45 ≈ ${num(dd.dist)}. Dividing by |n| is what makes the answer independent of how long n is.` });

    const order = ['point', 'meet', 'meet', 'hit', 'meet', 'dist', 'point', 'meet', 'meet', 'hit', 'meet', 'dist'];
    const count = { point: 0, meet: 0, hit: 0, dist: 0 };
    let slotCounter = 0;
    order.forEach((type) => {
        const i = count[type]++;
        if (type === 'meet') {
            const P = MEET_PRESETS[i];
            push({ kind: 'meet-intro', ...P, rotate: (i * 2 + 1) % 3, presetIndex: i, show: ['plane', 'normal', 'line', 'p0', 'dir'],
                explanation: `The line r(t) = ${triple(P.p0)} + t${triple(P.d)} and the plane ${planeText(P.n, P.k)}. How often do they meet?` });
            const m = meet(P.p0, P.d, P.n, P.k);
            push({ kind: 'meet', ...P, t: m.t ?? 0, presetIndex: i, show: ['plane', 'normal', 'line', 'p0', 'dir', 'hit'],
                explanation: m.kind === 'once'
                    ? `n · d = ${num(dot(P.n, P.d))}, not 0, so they meet once: t = (${num(P.k)} − ${num(dot(P.n, P.p0))}) / ${num(dot(P.n, P.d))} = ${num(m.t)}, at ${triple(m.point)}.`
                    : m.kind === 'never'
                        ? `n · d = 0, so the line is parallel to the plane. p₀ gives n · p₀ = ${num(dot(P.n, P.p0))}, not ${num(P.k)}, so p₀ is off the plane — and so is every other point of the line. They never meet.`
                        : `n · d = 0, so the line is parallel to the plane, and n · p₀ = ${num(dot(P.n, P.p0))} = k, so p₀ is on it. A parallel line through a point of the plane lies in it: they meet everywhere.` });
        } else if (type === 'point') {
            const P = POINT_PRESETS[i];
            push({ kind: 'point-intro', ...P, t: 0, at: P.t, slot: (slotCounter++ * 3 + 1) % 4, presetIndex: i, show: ['p0', 'dir', 'line'],
                explanation: `The line r(t) = ${triple(P.p0)} + t${triple(P.d)}. Where is it at t = ${num(P.t)}?` });
            push({ kind: 'point', ...P, presetIndex: i, show: ['p0', 'dir', 'line', 'point'],
                explanation: `r(${num(P.t)}) = ${triple(P.p0)} + ${num(P.t)}·${triple(P.d)} = ${triple(pointAt(P.p0, P.d, P.t))}.` });
        } else if (type === 'hit') {
            const P = HIT_PRESETS[i];
            push({ kind: 'hit-intro', ...P, slot: (slotCounter++ * 3 + 1) % 4, presetIndex: i, show: ['plane', 'normal', 'line', 'p0', 'dir'],
                explanation: `The line r(t) = ${triple(P.p0)} + t${triple(P.d)} and the plane ${planeText(P.n, P.k)}. At what t does the line hit the plane?` });
            const m = meet(P.p0, P.d, P.n, P.k);
            push({ kind: 'hit', ...P, t: m.t, presetIndex: i, show: ['plane', 'normal', 'line', 'hit'],
                explanation: `t = (k − n · p₀) / (n · d) = (${num(P.k)} − ${num(dot(P.n, P.p0))}) / ${num(dot(P.n, P.d))} = ${num(m.t)}, so the line crosses at ${triple(m.point)}.` });
        } else {
            const P = DIST_PRESETS[i];
            push({ kind: 'dist-intro', ...P, slot: (slotCounter++ * 3 + 1) % 4, presetIndex: i, show: ['plane', 'normal', 'S'],
                explanation: `S = ${triple(P.S)} and the plane ${planeText(P.n, P.k)}. How far is S from the plane?` });
            const dd = distanceToPlane(P.S, P.n, P.k);
            push({ kind: 'dist', ...P, presetIndex: i, show: ['plane', 'normal', 'S', 'dist'],
                explanation: `|n · S − k| / |n| = |${num(dot(P.n, P.S))} − ${num(P.k)}| / ${num(norm(P.n))} = ${num(dd.dist)}. The dashed drop runs along the normal and meets the plane at ${triple(dd.foot)}.` });
        }
    });
    push({ kind: 'closing', ...H, t: h.t, S: [2, 2, 3], show: ['plane', 'normal', 'line', 'hit', 'S', 'dist'],
        explanation: 'A line is a point plus multiples of a direction; a plane is everything with n · x = k. Substituting one into the other finds where they meet, and the normal gives distances. Switch to Explore to build your own.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   "How often do they meet?" has fixed labels, so the six presets carry two of
   each answer, rotated so each lands in every button equally often. The number
   questions offer the usual slips: ignoring t or p₀; forgetting n · p₀ or
   flipping the sign when solving for t; forgetting to divide by |n|, or
   dividing by |n|² instead. */
const pickWrong = (correct, candidates, label) => {
    const seen = new Set([label(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (seen.has(label(c))) continue;
        seen.add(label(c));
        wrong.push(c);
    }
    return wrong;
};

const predictFor = (step) => {
    if (!step) return null;
    if (step.kind === 'meet-intro') {
        const options = MEET_LABELS.map((_, i) => MEET_LABELS[(i + step.rotate) % 3]);
        const m = meet(step.p0, step.d, step.n, step.k);
        return {
            question: `r(t) = ${triple(step.p0)} + t${triple(step.d)} and ${planeText(step.n, step.k)}. How often do they meet?`,
            options,
            correct: options.indexOf(meetLabel(m)),
            because: m.kind === 'once'
                ? `n · d = ${num(dot(step.n, step.d))} is not 0, so the line is not parallel to the plane and crosses it exactly once.`
                : `n · d = 0, so the line is parallel to the plane. n · p₀ = ${num(dot(step.n, step.p0))} ${m.kind === 'never' ? `≠ ${num(step.k)}: p₀ is off the plane` : `= ${num(step.k)}: p₀ is on the plane`}.`,
        };
    }
    if (step.kind === 'point-intro') {
        const { p0, d, at } = step;
        const correct = pointAt(p0, d, at);
        const ordered = pickWrong(correct, [add(p0, d), scale(at, d), pointAt(p0, d, -at), add(d, scale(at, p0)), add(correct, [1, 0, 0])], triple);
        ordered.splice(step.slot, 0, correct);
        return {
            question: `r(t) = ${triple(p0)} + t${triple(d)}. Where is it at t = ${num(at)}?`,
            options: ordered.map(triple),
            correct: step.slot,
            because: `Start at p₀ and walk ${num(at)} copies of d: ${triple(p0)} + ${num(at)}·${triple(d)} = ${triple(correct)}.`,
        };
    }
    if (step.kind === 'hit-intro') {
        const { p0, d, n, k } = step;
        const t = (k - dot(n, p0)) / dot(n, d);
        const ordered = pickWrong(t, [k / dot(n, d), -t, (k - dot(n, p0)) / norm(n), (k + dot(n, p0)) / dot(n, d), t + 1], num);
        ordered.splice(step.slot, 0, t);
        return {
            question: `r(t) = ${triple(p0)} + t${triple(d)} and ${planeText(n, k)}. At what t does the line hit the plane?`,
            options: ordered.map(num),
            correct: step.slot,
            because: `Substitute r(t): n · p₀ + t (n · d) = k, so t = (${num(k)} − ${num(dot(n, p0))}) / ${num(dot(n, d))} = ${num(t)}.`,
        };
    }
    if (step.kind === 'dist-intro') {
        const { S, n, k } = step;
        const gap = Math.abs(dot(n, S) - k);
        const correct = gap / norm(n);
        const ordered = pickWrong(correct, [gap, gap / dot(n, n), Math.abs(dot(n, S)) / norm(n), correct + 1], num);
        ordered.splice(step.slot, 0, correct);
        return {
            question: `S = ${triple(S)} and the plane ${planeText(n, k)}. How far is S from the plane?`,
            options: ordered.map(num),
            correct: step.slot,
            because: `|n · S − k| / |n| = |${num(dot(n, S))} − ${num(k)}| / ${num(norm(n))} = ${num(correct)}.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'The line r(t) = (1, 0, 2) + t(0, 3, −1). Where is it at t = 2?',
        options: ['(1, 6, 0)', '(1, 3, 1)', '(0, 6, −2)', '(2, 6, 0)'],
        correct: 0,
        explanation: 'Start at (1, 0, 2) and walk two copies of (0, 3, −1): (1, 0 + 6, 2 − 2) = (1, 6, 0). (0, 6, −2) forgets the starting point.',
    },
    {
        question: 'A line\'s direction d has n · d = 0, where n is a plane\'s normal. What does that tell you?',
        options: [
            'The line is perpendicular to the plane',
            'The line hits the plane exactly once',
            'The line is parallel to the plane: it misses it or lies in it',
            'The line passes through the origin',
        ],
        correct: 2,
        explanation: 'd is perpendicular to the normal, so it runs along the plane\'s directions. The line never crosses the plane: whether it misses or lies in it depends on whether one of its points is on the plane.',
    },
    {
        question: 'How far is the point (0, 0, 5) from the plane z = 2?',
        options: ['5', '2', '7', '3'],
        correct: 3,
        explanation: 'The plane is flat at height 2, so the perpendicular drop is straight down: 5 − 2 = 3. With the formula, n = (0, 0, 1), k = 2: |5 − 2| / 1 = 3.',
    },
];

const codeExample = `import numpy as np

# A line: a point and a direction
p0 = np.array([1, -1, 0])
d = np.array([1, 1, 1])
r = lambda t: p0 + t * d
print(r(2))                    # [3 1 2]

# A plane: n . x = k, here x + y + 2z = 3
n = np.array([1, 1, 2])
k = 3

nd = n @ d
if abs(nd) < 1e-12:
    print('parallel: misses the plane or lies in it')
else:
    t = (k - n @ p0) / nd
    print(t, r(t), n @ r(t))   # where they meet; n . x is k there

# Distance from a point to the plane
S = np.array([2, 2, 3])
print(abs(n @ S - k) / np.linalg.norm(n))   # 2.857...`;

/* ── page ──────────────────────────────────────────────── */

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
                    className="text-sm px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-sky-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

const EXPLORE_DEFAULT = { p0: [0, 0, -1], d: [0, 1, 1], n: [1, 1, 2], k: 3, S: [2, 2, 3], t: 1 };
const LINE_COLOR = MATH_COLORS.a;
const PLANE_COLOR = '#38bdf8';

export default function LinesAndPlanesIn3DPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [ex, setEx] = useState(EXPLORE_DEFAULT);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[currentStep];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const guided = mode === 'guided';
    const cur = guided ? step : ex;
    const show = guided ? step.show : ['p0', 'dir', 'line', 'point', 'plane', 'normal', 'hit', 'S', 'dist'];
    const has = (key) => show.includes(key);
    const hasLine = cur.p0 && cur.d;
    const hasPlane = cur.n && norm(cur.n) > 1e-12;
    const m = hasLine && hasPlane ? meet(cur.p0, cur.d, cur.n, cur.k) : null;
    const seg = hasLine && norm(cur.d) > 1e-12 ? clipLine(cur.p0, cur.d) : null;
    const dd = cur.S && hasPlane ? distanceToPlane(cur.S, cur.n, cur.k) : null;
    const rt = hasLine ? pointAt(cur.p0, cur.d, cur.t) : null;
    const hideNumbers = guided && predict.hideExplanation;
    const planeCentre = hasPlane ? scale(cur.k / dot(cur.n, cur.n), cur.n) : null;
    const nUnit = hasPlane ? scale(1.2 / norm(cur.n), cur.n) : null;

    /* Explore keeps every object; jumping in from the tour keeps what is on screen. */
    const takeOver = () => {
        if (!guided) return;
        setEx({
            p0: step.p0 ?? EXPLORE_DEFAULT.p0, d: step.d ?? EXPLORE_DEFAULT.d,
            n: step.n ?? EXPLORE_DEFAULT.n, k: step.n ? step.k : EXPLORE_DEFAULT.k,
            S: step.S ?? EXPLORE_DEFAULT.S, t: step.t ?? 1,
        });
        setMode('explore'); setIsPlaying(false);
    };
    const setField = (key, value) => { takeOver(); setEx(e => ({ ...e, [key]: value })); };

    const col = (u) => String.raw`\begin{bmatrix} ${fmt(u[0])} \\ ${fmt(u[1])} \\ ${fmt(u[2])} \end{bmatrix}`;
    const formulas = useMemo(() => {
        const out = [];
        if (hasLine && (has('point') || has('line'))) {
            out.push(String.raw`\mathbf{r}(t) = \mathbf{p}_0 + t\,\mathbf{d} = ${col(cur.p0)} + ${cur.t < 0 ? `(${fmt(cur.t)})` : fmt(cur.t)}${col(cur.d)} = ${col(rt)}`);
        }
        if (hasPlane && has('plane')) {
            out.push(String.raw`\mathbf{n}\cdot\mathbf{x} = k: \quad ${fmt(cur.n[0])}x + ${fmt(cur.n[1])}y + ${fmt(cur.n[2])}z = ${fmt(cur.k)}`.replace(/\+ -/g, '- '));
        }
        if (m && has('hit')) {
            out.push(m.kind === 'once'
                ? String.raw`t = \frac{k - \mathbf{n}\cdot\mathbf{p}_0}{\mathbf{n}\cdot\mathbf{d}} = \frac{${fmt(cur.k)} - (${fmt(dot(cur.n, cur.p0))})}{${fmt(dot(cur.n, cur.d))}} = ${fmt(m.t)} \;\Rightarrow\; ${col(m.point)}`
                : String.raw`\mathbf{n}\cdot\mathbf{d} = 0 \text{ and } \mathbf{n}\cdot\mathbf{p}_0 = ${fmt(dot(cur.n, cur.p0))} ${m.kind === 'never' ? String.raw`\neq` : '='} ${fmt(cur.k)}: \text{ ${m.kind === 'never' ? 'never meet' : 'the line lies in the plane'}}`);
        }
        if (dd && has('dist')) {
            out.push(String.raw`\text{distance} = \frac{|\mathbf{n}\cdot\mathbf{S} - k|}{|\mathbf{n}|} = \frac{|${fmt(dot(cur.n, cur.S))} - ${fmt(cur.k)}|}{${fmt(norm(cur.n))}} = ${fmt(dd.dist)}`);
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cur, show, m, dd, rt]);

    // Only Explore has every object at once; tour steps may show a line or a plane alone.
    const exploreNote = guided ? '' : !hasPlane
        ? 'n is the zero vector, so it does not pick out a plane.'
        : norm(cur.d) < 1e-12
            ? 'd is the zero vector, so the "line" is a single point.'
            : `${m.kind === 'once' ? `The line crosses the plane once, at t = ${num(m.t)}: ${triple(m.point)}.` : m.kind === 'never' ? 'The line is parallel to the plane and misses it.' : 'The line lies in the plane.'} S is ${num(dd.dist)} from the plane.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/vectors" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Vectors
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Lines and Planes in 3D</h1>
                    <p className="text-sky-100 max-w-3xl">
                        A line is a point plus a direction; a plane is a point plus a normal. Put one into the other to see where they meet, and use the normal to measure how far a point is from a plane.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                                {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={mode === key}
                                        onClick={() => { if (key === 'explore' && guided) takeOver(); else { setMode(key); setIsPlaying(false); } }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Type the line, plane and point; slide t'}
                            </span>
                        </div>

                        <Scene3D height={440} distance={12} ariaLabel="A line, a plane with its normal, where they meet, and a point's distance to the plane"
                            fallback={<p className="text-sm text-slate-300 font-mono">{m ? `meet: ${meetLabel(m)}` : ''}{dd ? ` · distance ${num(dd.dist)}` : ''}</p>}>
                            {(P) => (
                                <>
                                    {hasPlane && has('plane') && (
                                        <P.Plane3D normal={cur.n} point={planeCentre} size={7} color={PLANE_COLOR} opacity={0.18} />
                                    )}
                                    {hasPlane && has('normal') && (
                                        <P.Arrow3D from={planeCentre} to={add(planeCentre, nUnit)} color={MATH_COLORS.k} label="n" radius={0.03} />
                                    )}
                                    {seg && has('line') && <P.Line3D points={seg} color={LINE_COLOR} width={2.5} />}
                                    {hasLine && has('p0') && <P.Point3D at={cur.p0} color="#e2e8f0" size={0.08} label="p₀" />}
                                    {hasLine && has('dir') && <P.Arrow3D from={cur.p0} to={add(cur.p0, cur.d)} color={LINE_COLOR} label="d" />}
                                    {hasLine && has('point') && (
                                        <>
                                            <P.Line3D points={[cur.p0, rt]} color={LINE_COLOR} width={4} />
                                            <P.Point3D at={rt} color={MATH_COLORS.result} size={0.1} label={`t = ${num(cur.t)}`} />
                                        </>
                                    )}
                                    {m && m.kind === 'once' && has('hit') && (
                                        <P.Point3D at={m.point} color={MATH_COLORS.result} size={0.13} label="meet" />
                                    )}
                                    {cur.S && has('S') && <P.Point3D at={cur.S} color={MATH_COLORS.b} size={0.1} label="S" />}
                                    {dd && has('dist') && (
                                        <>
                                            <P.Line3D points={[cur.S, dd.foot]} color={MATH_COLORS.b} width={2} dashed />
                                            <P.Point3D at={dd.foot} color={MATH_COLORS.b} size={0.06} />
                                            <P.Label3D at={scale(0.5, add(cur.S, dd.foot))} color={MATH_COLORS.b} size={11}>{num(dd.dist)}</P.Label3D>
                                        </>
                                    )}
                                </>
                            )}
                        </Scene3D>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="sky" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-sky-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ParamSlider label="t, the walk along the line" value={ex.t} onChange={(t) => setField('t', t)} min={-4} max={4} step={0.25} accent="sky" format={num} />
                                <ParamSlider label="k, the plane's offset" value={ex.k} onChange={(k) => setField('k', k)} min={-6} max={6} step={0.5} accent="sky" format={num}
                                    hint="Changing k slides the plane along its normal." />
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="sky" />}

                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sky-200 text-sm leading-relaxed">
                                {guided ? (predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation) : exploreNote}
                            </p>
                        </div>
                    </div>

                    {hideNumbers ? (
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-sm text-slate-500">
                            The numbers are hidden until you answer the prediction.
                        </div>
                    ) : (
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                            <div className="flex flex-wrap items-center gap-4">
                                {hasLine && (
                                    <>
                                        <MatrixInput label="p₀" value={cur.p0.map(x => [x])} step={0.5} columnColors={['#e2e8f0']}
                                            onChange={(v) => setField('p0', v.map(r => r[0]))} />
                                        <MatrixInput label="d" value={cur.d.map(x => [x])} step={0.5} columnColors={[LINE_COLOR]}
                                            onChange={(v) => setField('d', v.map(r => r[0]))} />
                                    </>
                                )}
                                {hasPlane && (
                                    <MatrixInput label="n" value={cur.n.map(x => [x])} step={0.5} columnColors={[MATH_COLORS.k]}
                                        onChange={(v) => setField('n', v.map(r => r[0]))} />
                                )}
                                {cur.S && (
                                    <MatrixInput label="S" value={cur.S.map(x => [x])} step={0.5} columnColors={[MATH_COLORS.b]}
                                        onChange={(v) => setField('S', v.map(r => r[0]))} />
                                )}
                            </div>
                            {hasPlane && <p className="text-sm text-slate-400">Plane: <span className="font-mono text-sky-300">{planeText(cur.n, cur.k)}</span></p>}
                            {(guided && /-intro$/.test(step.kind)) ? (
                                <p className="text-sm text-slate-500">The working appears once the tour reaches it.</p>
                            ) : (
                                <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                    {formulas.map((f, i) => <Tex key={i} block>{f}</Tex>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The recipes</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-amber-300 font-semibold">Line</span> — r(t) = p₀ + t d.</li>
                            <li><span className="text-sky-300 font-semibold">Plane</span> — n · x = k, with n perpendicular to it.</li>
                            <li><span className="text-pink-400 font-semibold">Meet</span> — t = (k − n · p₀) / (n · d), unless n · d = 0.</li>
                            <li><span className="text-purple-300 font-semibold">Distance</span> — |n · S − k| / |n|.</li>
                        </ul>
                        <p className="text-xs text-slate-500 mt-3">Ray tracers run the line-meets-plane formula millions of times a frame: every ray from the camera against every surface.</p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-sky-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
