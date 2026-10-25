"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Square, Box,
} from 'lucide-react';
import Plane2D, { Vector, Segment, Polygon, Point, MappedGrid, MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import MatrixInput from '@/components/math/MatrixInput';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────── */
const combo = (c1, a, c2, b) => a.map((x, i) => c1 * x + c2 * b[i]);
const det2 = (a, b) => a[0] * b[1] - a[1] * b[0];
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const len = (u) => Math.sqrt(u.reduce((s, x) => s + x * x, 0));
const near0 = (x) => Math.abs(x) < 1e-9;
/** Which coefficients reach t: solve c₁a + c₂b = t by Cramer's rule, or null when a and b are parallel. */
const solveCombo = (a, b, t) => {
    const d = det2(a, b);
    if (near0(d)) return null;
    return [det2(t, b) / d, det2(a, t) / d];
};
/** What a and b span in the plane: 'plane', 'line' or 'point'. */
const spanKind2 = (a, b) => (!near0(det2(a, b)) ? 'plane' : near0(len(a)) && near0(len(b)) ? 'point' : 'line');
/** What u and v span in 3D: 'plane', 'line' or 'point'. */
const spanKind3 = (u, v) => (len(cross(u, v)) > 1e-9 ? 'plane' : near0(len(u)) && near0(len(v)) ? 'point' : 'line');
const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const tuple = (u) => `(${u.map(num).join(', ')})`;

const SPAN_LABELS = ['A line', 'The whole plane'];
/** Targets with whole-number answers, so the arithmetic stays out of the way. */
const TARGET_PRESETS = [
    { a: [2, 1], b: [-1, 1], t: [4, -1] },
    { a: [1, 1], b: [1, -1], t: [3, 1] },
    { a: [2, 0], b: [1, 2], t: [0, 4] },
    { a: [-1, 2], b: [2, 1], t: [3, 4] },
];
/** Two lines and two planes, ordered so each answer sits in each button twice. */
const SPAN_PRESETS = [
    { a: [1, 2], b: [-2, -4] },
    { a: [1, 2], b: [2, 1] },
    { a: [3, -1], b: [-1.5, 0.5] },
    { a: [0, 2], b: [1, 0.5] },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    const push = (s) => steps.push({ show: [], c: [1, 1], ...s });
    const A = [2, 1], B = [-1, 1];
    push({ kind: 'opening', dim: 2, a: A, b: B, c: [0, 0],
        explanation: 'Two vectors, a = (2, 1) in amber and b = (−1, 1) in purple. A linear combination scales each by a number and adds: c₁a + c₂b. Which points can we reach?' });
    [[[1, 1], 'c₁ = 1, c₂ = 1: walk a, then b from its tip, and land at (1, 2).'],
        [[2, -1], 'c₁ = 2, c₂ = −1: two copies of a, then one of b backwards — (5, 1).'],
        [[-1, 1.5], 'c₁ = −1, c₂ = 1.5: back along a, then one and a half copies of b — (−3.5, 0.5). Coefficients can be negative or fractional.'],
    ].forEach(([c, text]) => push({ kind: 'teach', dim: 2, a: A, b: B, c, show: ['combo'], explanation: text }));
    push({ kind: 'teach', dim: 2, a: A, b: B, c: [-1, 1.5], show: ['combo', 'lattice'],
        explanation: 'The violet grid marks every combination with whole-number coefficients — a skewed copy of graph paper built from a and b. Fractions fill in the gaps between its lines.' });
    push({ kind: 'teach', dim: 2, a: A, b: B, c: [1, 1], show: ['combo', 'lattice', 'span'],
        explanation: 'Because a and b point in different directions, that grid covers the whole plane: every point is some c₁a + c₂b. The set of everything reachable is the span, and here it is all of ℝ².' });
    push({ kind: 'teach', dim: 2, a: A, b: B, c: [1, 1], t: [1, 2], show: ['combo', 'lattice', 'target'],
        explanation: 'To reach a particular target t = (1, 2), solve two equations: 2c₁ − c₂ = 1 and c₁ + c₂ = 2. They give c₁ = 1, c₂ = 1 — the first combination we tried.' });
    const D = [-3, -1.5];
    push({ kind: 'teach', dim: 2, a: A, b: D, c: [1, 1], show: ['combo', 'span'],
        explanation: 'Now make b = (−3, −1.5), which is −1.5a. Both arrows lie on one line through the origin, and every combination stays on it. The span has collapsed to a line.' });
    push({ kind: 'teach', dim: 2, a: A, b: D, c: [1, 1], t: [1, 2], show: ['combo', 'span', 'target'],
        explanation: 'The target (1, 2) is off that line, so no choice of c₁ and c₂ reaches it. In numbers: det [a b] = 2·(−1.5) − 1·(−3) = 0, and the equations have no solution.' });

    for (let i = 0; i < 4; i++) {
        const T = TARGET_PRESETS[i];
        push({ kind: 'target-intro', dim: 2, a: T.a, b: T.b, t: T.t, c: [0, 0], show: ['target', 'span'], slot: (i * 3 + 1) % 4, presetIndex: i,
            explanation: `a = ${tuple(T.a)}, b = ${tuple(T.b)}. Which c₁ and c₂ reach t = ${tuple(T.t)}?` });
        const c = solveCombo(T.a, T.b, T.t);
        push({ kind: 'target', dim: 2, a: T.a, b: T.b, t: T.t, c, show: ['combo', 'target', 'lattice'], presetIndex: i,
            explanation: `c₁ = ${num(c[0])}, c₂ = ${num(c[1])}: ${num(c[0])}·${tuple(T.a)} + ${num(c[1])}·${tuple(T.b)} = ${tuple(T.t)}. Cramer's rule gives them directly: c₁ = det [t b] / det [a b], c₂ = det [a t] / det [a b].` });
        const S = SPAN_PRESETS[i];
        push({ kind: 'span-intro', dim: 2, a: S.a, b: S.b, c: [0, 0], rotate: Math.floor(i / 2) % 2, presetIndex: i,
            explanation: `a = ${tuple(S.a)}, b = ${tuple(S.b)}. Is their span a line or the whole plane?` });
        const kind = spanKind2(S.a, S.b);
        push({ kind: 'span', dim: 2, a: S.a, b: S.b, c: [1, 1], show: ['span', 'combo'], presetIndex: i,
            explanation: kind === 'plane'
                ? `det [a b] = ${num(det2(S.a, S.b))}, not 0: a and b point in different directions, so together they reach the whole plane.`
                : `det [a b] = 0: b is ${num(S.b[0] / S.a[0])} times a, so both lie on one line through the origin, and so does every combination. The span is a line.` });
    }

    const U = [2, 0, 0.5], V = [0, 2, 1];
    push({ kind: 'teach', dim: 3, a: U, b: V, c: [1, 1], show: ['span'],
        explanation: 'Up to 3D. u = (2, 0, 0.5) and v = (0, 2, 1) point in different directions, so their combinations fill a flat plane through the origin — not all of space.' });
    [[[1, 1], 'c₁ = 1, c₂ = 1 lands at (2, 2, 1.5), on the plane. Orbit the scene: the pink tip never leaves the violet sheet.'],
        [[-1, 0.5], 'c₁ = −1, c₂ = 0.5 lands at (−2, 1, 0): somewhere else on the same plane. Any mix of u and v stays in it.'],
    ].forEach(([c, text]) => push({ kind: 'teach', dim: 3, a: U, b: V, c, show: ['span', 'combo'], explanation: text }));
    push({ kind: 'teach', dim: 3, a: U, b: V, c: [1, 1], t: [0, 0, 3], show: ['span', 'combo', 'target'],
        explanation: `The point (0, 0, 3) is off the plane, so no mix of u and v reaches it — two vectors can never span 3D. The plane's normal is u × v = ${tuple(cross(U, V))}; a point is reachable only if it is perpendicular to that.` });
    const W = [-1, 0, -0.25];
    push({ kind: 'teach', dim: 3, a: U, b: W, c: [1, 1], show: ['span', 'combo'],
        explanation: 'Make v = (−1, 0, −0.25), which is −0.5u. Now u × v = 0, both arrows lie on one line, and the span collapses from a plane to that line.' });
    push({ kind: 'closing', dim: 2, a: A, b: B, c: [1, 1], show: ['combo', 'lattice', 'span'],
        explanation: 'The span of some vectors is everything their combinations reach: a line, a plane, or more. Switch to Explore — slide c₁ and c₂, drag the vectors, and line them up to watch the span collapse.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   "Which coefficients reach t?" offers the classic slips: the two
   coefficients swapped, the target's own coordinates, and one sign flipped.
   "A line or the whole plane?" has fixed labels, so the presets carry two of
   each and the order rotates so each answer sits in each button twice. */
const predictFor = (step) => {
    if (!step) return null;
    if (step.kind === 'target-intro') {
        const c = solveCombo(step.a, step.b, step.t);
        const seen = new Set([tuple(c)]);
        const wrong = [];
        for (const w of [[c[1], c[0]], step.t, [c[0], -c[1]], [-c[0], c[1]], [c[0] + 1, c[1]]]) {
            if (wrong.length === 3) break;
            if (seen.has(tuple(w))) continue;
            seen.add(tuple(w));
            wrong.push(w);
        }
        wrong.splice(step.slot, 0, c);
        return {
            question: `a = ${tuple(step.a)}, b = ${tuple(step.b)}. Which (c₁, c₂) reach t = ${tuple(step.t)}?`,
            options: wrong.map(tuple),
            correct: step.slot,
            because: `${num(c[0])}·${tuple(step.a)} + ${num(c[1])}·${tuple(step.b)} = ${tuple(step.t)}. Check each coordinate: that is two equations in c₁ and c₂.`,
        };
    }
    if (step.kind === 'span-intro') {
        const options = step.rotate ? [SPAN_LABELS[1], SPAN_LABELS[0]] : [...SPAN_LABELS];
        const kind = spanKind2(step.a, step.b);
        return {
            question: `a = ${tuple(step.a)}, b = ${tuple(step.b)}. Is their span a line or the whole plane?`,
            options,
            correct: options.indexOf(kind === 'plane' ? SPAN_LABELS[1] : SPAN_LABELS[0]),
            because: kind === 'plane'
                ? `det [a b] = ${num(det2(step.a, step.b))} ≠ 0: they point in different directions.`
                : 'det [a b] = 0: one is a multiple of the other, so they share a line.',
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'a = (1, 2) and b = (2, 4). What is their span?',
        options: ['The whole plane', 'A line through the origin', 'Just the two points a and b', 'A parallelogram'],
        correct: 1,
        explanation: 'b = 2a, so both lie on the same line through the origin, and every c₁a + c₂b = (c₁ + 2c₂)a stays on it. The span is that line.',
    },
    {
        question: 'Which coefficients write (5, 1) as c₁(1, 1) + c₂(1, −1)?',
        options: ['(3, 2)', '(2, 3)', '(5, 1)', '(1, 5)'],
        correct: 0,
        explanation: 'c₁ + c₂ = 5 and c₁ − c₂ = 1, so c₁ = 3 and c₂ = 2. Check: 3(1, 1) + 2(1, −1) = (5, 1). (2, 3) swaps them and gives (5, −1).',
    },
    {
        question: 'Two vectors in 3D point in different directions. What is their span?',
        options: ['All of 3D space', 'A line', 'A plane through the origin', 'A cube'],
        correct: 2,
        explanation: 'Two independent directions fill a flat sheet through the origin. Reaching every point of 3D takes a third vector that sticks out of that plane.',
    },
];

const codeExample = `import numpy as np

a = np.array([2, 1])
b = np.array([-1, 1])
print(1 * a + 1 * b)            # [1 2] -- a linear combination

A = np.column_stack([a, b])     # a and b as columns
print(np.linalg.det(A))         # 3.0 -- not 0, so they span the whole plane
print(np.linalg.solve(A, [4, -1]))   # [ 1. -2.] -- the mix that reaches (4, -1)

# Parallel vectors span only a line
print(np.linalg.matrix_rank(np.column_stack([a, -1.5 * a])))   # 1

# In 3D, two vectors span a plane whose normal is their cross product
u = np.array([2, 0, 0.5])
v = np.array([0, 2, 1])
print(np.cross(u, v))           # [-1.  -2.   4.]`;

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
                    className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-violet-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

const SPAN_COLOR = '#8b5cf6';
const clampC = (x) => Math.min(3, Math.max(-3, Math.round(x * 4) / 4));

export default function LinearCombinationsAndSpanPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [tab, setTab] = useState(2);
    const [a, setA] = useState([2, 1]);
    const [b, setB] = useState([-1, 1]);
    const [u, setU] = useState([2, 0, 0.5]);
    const [v, setV] = useState([0, 2, 1]);
    const [c, setC] = useState([1, 1]);
    const [lattice, setLattice] = useState(true);
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
    const dim = guided ? step.dim : tab;
    const show = guided ? step.show : ['combo', 'span', ...(lattice ? ['lattice'] : [])];
    const has = (k) => show.includes(k);
    const C = guided ? step.c : c;
    const hideNumbers = guided && predict.hideExplanation;

    const goExplore = (nextTab) => {
        if (guided) {
            if (step.dim === 2) { setA(step.a); setB(step.b); } else { setU(step.a); setV(step.b); }
            setC(step.c);
            setMode('explore'); setIsPlaying(false);
        }
        if (nextTab) setTab(nextTab);
    };

    /* 2D */
    const A = guided && step.dim === 2 ? step.a : a;
    const B = guided && step.dim === 2 ? step.b : b;
    const kind2 = spanKind2(A, B);
    const part1 = combo(C[0], A, 0, B);
    const res2 = combo(C[0], A, C[1], B);
    const lineDir = len(A) > 1e-9 ? A : B;
    const lineFar = len(lineDir) > 1e-9 ? 9 / len(lineDir) : 0;
    const latticeMap = useCallback(([x, y]) => combo(x, A, y, B), [A, B]);
    const target = guided && step.dim === 2 ? step.t : null;
    // Dragging the pink tip asks which coefficients reach that point.
    const dragResult = (p) => {
        goExplore(2);
        const sol = solveCombo(A, B, p);
        if (sol) setC(sol.map(clampC));
        else if (len(lineDir) > 1e-9) {
            const along = (p[0] * lineDir[0] + p[1] * lineDir[1]) / (lineDir[0] ** 2 + lineDir[1] ** 2);
            setC(len(A) > 1e-9 ? [clampC(along), 0] : [0, clampC(along)]);
        }
    };

    /* 3D */
    const U = guided && step.dim === 3 ? step.a : u;
    const Vv = guided && step.dim === 3 ? step.b : v;
    const kind3 = spanKind3(U, Vv);
    const normal = cross(U, Vv);
    const res3 = combo(C[0], U, C[1], Vv);
    const part13 = combo(C[0], U, 0, Vv);
    const dir3 = len(U) > 1e-9 ? U : Vv;
    const target3 = guided && step.dim === 3 ? step.t : null;

    const formula2 = useMemo(() => {
        const CA = MATH_COLORS.a, CB = MATH_COLORS.b, R = MATH_COLORS.result;
        const col = (p) => String.raw`\begin{bmatrix} ${fmt(p[0])} \\ ${fmt(p[1])} \end{bmatrix}`;
        return String.raw`${fmt(C[0])}\,\textcolor{${CA}}{${col(A)}} + ${C[1] < 0 ? `(${fmt(C[1])})` : fmt(C[1])}\,\textcolor{${CB}}{${col(B)}} = \textcolor{${R}}{${col(res2)}}`
            + String.raw` \qquad \det[\mathbf{a}\;\mathbf{b}] = ${fmt(det2(A, B))}`;
    }, [A, B, C, res2]);
    const formula3 = useMemo(() => {
        const col = (p) => String.raw`\begin{bmatrix} ${fmt(p[0])} \\ ${fmt(p[1])} \\ ${fmt(p[2])} \end{bmatrix}`;
        return String.raw`${fmt(C[0])}\,${col(U)} + ${C[1] < 0 ? `(${fmt(C[1])})` : fmt(C[1])}\,${col(Vv)} = \textcolor{${MATH_COLORS.result}}{${col(res3)}} \qquad \mathbf{u}\times\mathbf{v} = ${col(normal)}`;
    }, [C, U, Vv, res3, normal]);

    const exploreNote = dim === 2
        ? kind2 === 'plane'
            ? `det [a b] = ${num(det2(A, B))} ≠ 0, so a and b span the whole plane: drag the pink tip anywhere and the sliders find the mix that reaches it.`
            : kind2 === 'line' ? 'a and b lie on one line through the origin, so every combination does too — the span is a line. Drag one of them off the line to open up the plane.'
                : 'Both vectors are zero, so the only point reachable is the origin.'
        : kind3 === 'plane'
            ? `u and v span a plane through the origin with normal u × v = ${tuple(normal)}. Every c₁u + c₂v lies on it.`
            : kind3 === 'line' ? 'u and v are parallel, so u × v = 0 and the span is just a line.' : 'Both vectors are zero: the span is the origin alone.';

    const comboShown = has('combo');

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/linear-algebra" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Linear Algebra
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Linear Combinations and Span</h1>
                    <p className="text-violet-100 max-w-3xl">
                        Scale some vectors and add them up. Everything you can reach that way is their span — the whole plane, a flat sheet in 3D, or just a line when the vectors line up.
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
                                        onClick={() => { if (key === 'explore') goExplore(step.dim); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Dimension">
                                {[[2, '2D: two vectors', Square], [3, '3D: a plane', Box]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={dim === key}
                                        onClick={() => goExplore(key)}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${dim === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {dim === 2 ? (
                            <Plane2D xRange={[-5, 5]} yRange={[-5, 5]} ariaLabel="Vectors a and b, a combination of them, and the set they span">
                                {has('span') && kind2 === 'plane' && (
                                    <Polygon points={[[-5, -5], [5, -5], [5, 5], [-5, 5]]} fill={SPAN_COLOR} fillOpacity={0.07} strokeWidth={0} />
                                )}
                                {has('lattice') && kind2 === 'plane' && <MappedGrid map={latticeMap} range={8} color={SPAN_COLOR} opacity={0.4} />}
                                {has('span') && kind2 === 'line' && (
                                    <Segment from={[-lineFar * lineDir[0], -lineFar * lineDir[1]]} to={[lineFar * lineDir[0], lineFar * lineDir[1]]} color={SPAN_COLOR} width={9} opacity={0.35} />
                                )}
                                {target && <Point at={target} color="#e2e8f0" r={6} label="t" />}
                                {comboShown && (
                                    <>
                                        <Vector to={part1} color={MATH_COLORS.a} width={2.5} dashed opacity={0.8} />
                                        <Vector from={part1} to={res2} color={MATH_COLORS.b} width={2.5} dashed opacity={0.8} />
                                    </>
                                )}
                                <Vector to={B} color={MATH_COLORS.b} width={3} label="b" onDrag={(p) => { goExplore(2); setB(p); }} snap={0.25} />
                                <Vector to={A} color={MATH_COLORS.a} width={3} label="a" onDrag={(p) => { goExplore(2); setA(p); }} snap={0.25} />
                                {comboShown && (
                                    <Vector to={res2} color={MATH_COLORS.result} width={3.5} label={`${num(C[0])}a ${C[1] < 0 ? '−' : '+'} ${num(Math.abs(C[1]))}b`} labelOffset={[8, 18]} onDrag={dragResult}
                                        ariaLabel={`Drag the combination's tip, now at (${num(res2[0])}, ${num(res2[1])})`} />
                                )}
                            </Plane2D>
                        ) : (
                            <Scene3D height={420} ariaLabel="Vectors u and v in 3D, a combination of them, and the plane they span"
                                fallback={<p className="text-sm text-slate-300 font-mono">span: {kind3}, u × v = {tuple(normal)}</p>}>
                                {(P) => (
                                    <>
                                        {has('span') && kind3 === 'plane' && <P.Plane3D normal={normal} d={0} size={7} color={SPAN_COLOR} opacity={0.22} />}
                                        {has('span') && kind3 === 'line' && (
                                            <P.Line3D points={[dir3.map(x => (-4.5 * x) / len(dir3)), dir3.map(x => (4.5 * x) / len(dir3))]} color={SPAN_COLOR} width={5} />
                                        )}
                                        <P.Arrow3D to={U} color={MATH_COLORS.a} label="u" />
                                        <P.Arrow3D to={Vv} color={MATH_COLORS.b} label="v" />
                                        {comboShown && (
                                            <>
                                                <P.Line3D points={[[0, 0, 0], part13]} color={MATH_COLORS.a} width={2} dashed />
                                                <P.Line3D points={[part13, res3]} color={MATH_COLORS.b} width={2} dashed />
                                                <P.Arrow3D to={res3} color={MATH_COLORS.result} label="c₁u + c₂v" />
                                            </>
                                        )}
                                        {target3 && <P.Point3D at={target3} color="#e2e8f0" size={0.1} label="unreachable" />}
                                    </>
                                )}
                            </Scene3D>
                        )}

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="violet" />
                                <span className="text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-violet-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ParamSlider label="c₁" value={c[0]} onChange={(x) => setC(([, y]) => [x, y])} min={-3} max={3} step={0.25} accent="violet" format={num} />
                                <ParamSlider label="c₂" value={c[1]} onChange={(y) => setC(([x]) => [x, y])} min={-3} max={3} step={0.25} accent="violet" format={num} />
                                {dim === 2 && (
                                    <label className="flex items-center gap-2 text-xs text-slate-400">
                                        <input type="checkbox" checked={lattice} onChange={e => setLattice(e.target.checked)} className="accent-violet-500" />
                                        Show the whole-number grid of combinations
                                    </label>
                                )}
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="violet" />}

                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-violet-400 mt-0.5 flex-shrink-0" />
                            <p className="text-violet-200 text-sm leading-relaxed">
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
                                {dim === 2 ? (
                                    <>
                                        <MatrixInput label="a" value={[[A[0]], [A[1]]]} step={0.25} columnColors={[MATH_COLORS.a]}
                                            onChange={(m) => { goExplore(2); setA([m[0][0], m[1][0]]); }} />
                                        <MatrixInput label="b" value={[[B[0]], [B[1]]]} step={0.25} columnColors={[MATH_COLORS.b]}
                                            onChange={(m) => { goExplore(2); setB([m[0][0], m[1][0]]); }} />
                                    </>
                                ) : (
                                    <>
                                        <MatrixInput label="u" value={U.map(x => [x])} step={0.25} columnColors={[MATH_COLORS.a]}
                                            onChange={(m) => { goExplore(3); setU(m.map(r => r[0])); }} />
                                        <MatrixInput label="v" value={Vv.map(x => [x])} step={0.25} columnColors={[MATH_COLORS.b]}
                                            onChange={(m) => { goExplore(3); setV(m.map(r => r[0])); }} />
                                    </>
                                )}
                                <MatrixInput label="(c₁, c₂)" value={[[C[0]], [C[1]]]} step={0.25} min={-3} max={3} columnColors={[MATH_COLORS.result]}
                                    onChange={(m) => { goExplore(dim); setC([m[0][0], m[1][0]]); }} />
                            </div>
                            {comboShown ? (
                                <div className="text-slate-100 text-sm sm:text-base">
                                    <Tex block>{dim === 2 ? formula2 : formula3}</Tex>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">The combination appears once the tour reaches it.</p>
                            )}
                            <p className="text-xs text-slate-500">
                                {dim === 2
                                    ? 'det [a b] ≠ 0 means a and b point in different directions, so their span is the whole plane; det = 0 means they share a line.'
                                    : 'u × v is perpendicular to the plane u and v span. When it is the zero vector, u and v are parallel and the span is a line.'}
                            </p>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">What can two vectors reach?</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-violet-300 font-semibold">Different directions, 2D</span> — the whole plane.</li>
                            <li><span className="text-violet-300 font-semibold">Same line</span> — only that line.</li>
                            <li><span className="text-violet-300 font-semibold">Different directions, 3D</span> — a plane through the origin, never all of space.</li>
                            <li><span className="text-pink-400 font-semibold">Reaching a target</span> — solving for c₁ and c₂ is solving a linear system.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-violet-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
