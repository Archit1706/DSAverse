"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Square, Box,
} from 'lucide-react';
import Plane2D, { Vector, Segment, Point, Polygon, MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import MatrixInput from '@/components/math/MatrixInput';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Works for any dimension: vectors are plain arrays. */
const dot = (u, v) => u.reduce((s, x, i) => s + x * v[i], 0);
const scale = (k, u) => u.map(x => k * x);
const add = (u, v) => u.map((x, i) => x + v[i]);
const sub = (u, v) => u.map((x, i) => x - v[i]);
const norm = (u) => Math.sqrt(dot(u, u));
/** The projection of b onto the line through a: (a · b / a · a) a. */
const projLine = (a, b) => (dot(a, a) < 1e-12 ? a.map(() => 0) : scale(dot(a, b) / dot(a, a), a));
/** The projection of b onto the plane through the origin with normal n: b minus its part along n. */
const projPlane = (n, b) => sub(b, projLine(n, b));
const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const tuple = (u) => `(${u.map(num).join(', ')})`;

const LINE_PRESETS = [
    { a: [3, 1], b: [1, 2] },
    { a: [1, 2], b: [3, -1] },
    { a: [2, -1], b: [-1, 3] },
    { a: [-1, -1], b: [3, 1] },
];
const PLANE_PRESETS = [
    { n: [0, 0, 1], b: [2, 1, 3] },
    { n: [1, 1, 1], b: [2, 0, 1] },
    { n: [1, 0, 1], b: [1, 2, 3] },
    { n: [0, 2, 1], b: [1, 3, -1] },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    const push = (s) => steps.push({ show: [], ...s });
    let prompt = 0;
    const A = [4, 1], B = [1, 3];
    const pA = projLine(A, B);
    push({ kind: 'opening', dim: 2, a: A, b: B,
        explanation: 'The dashed line runs through the origin along a = (4, 1). Projecting b = (1, 3) onto it means finding the point on the line closest to b\'s tip.' });
    push({ kind: 'teach', dim: 2, a: A, b: B, show: ['drop'],
        explanation: 'Drop a perpendicular from b\'s tip to the line. The closest point is where it lands: any other point on the line is further away, because it would be the long side of a right triangle.' });
    push({ kind: 'teach', dim: 2, a: A, b: B, show: ['drop', 'proj'],
        explanation: `That point is a multiple of a, and the dot product says which: p = (a · b / a · a) a = (7 / 17) a = ${tuple(pA)}. The fraction is how many copies of a fit in b's shadow.` });
    push({ kind: 'teach', dim: 2, a: A, b: B, show: ['drop', 'proj', 'residual'],
        explanation: `What is left over, r = b − p = ${tuple(sub(B, pA))}, is at right angles to the line: r · a = ${num(dot(sub(B, pA), A))}. Every projection splits b into a part along the line and a part perpendicular to it.` });
    push({ kind: 'teach', dim: 2, a: A, b: pA, show: ['drop', 'proj', 'again'],
        explanation: `Project p itself: it is already on the line, so nothing moves — the projection of ${tuple(pA)} is ${tuple(projLine(A, pA))}. Projecting twice is the same as projecting once.` });
    const Bn = [-3, 1];
    push({ kind: 'teach', dim: 2, a: A, b: Bn, show: ['drop', 'proj', 'residual'],
        explanation: `If b leans away from a, a · b is negative (here −11), so the fraction is negative and p = ${tuple(projLine(A, Bn))} points the opposite way along the line.` });
    LINE_PRESETS.forEach(({ a, b }, i) => {
        push({ kind: 'line-intro', dim: 2, a, b, slot: (prompt++ * 3 + 1) % 4, presetIndex: i,
            explanation: `a = ${tuple(a)} and b = ${tuple(b)}. Where does b's projection onto a's line land?` });
        const p = projLine(a, b);
        push({ kind: 'line', dim: 2, a, b, show: ['drop', 'proj', 'residual'], presetIndex: i,
            explanation: `a · b = ${num(dot(a, b))} and a · a = ${num(dot(a, a))}, so p = (${num(dot(a, b))} / ${num(dot(a, a))}) a = ${tuple(p)}. The leftover ${tuple(sub(b, p))} is perpendicular to a.` });
    });
    const N0 = [0, 0, 1], B0 = [1, 2, 3];
    push({ kind: 'opening', dim: 3, n: N0, b: B0,
        explanation: 'Now a plane in 3D. A plane through the origin is set by its normal n — the blue arrow, perpendicular to it. Here n = (0, 0, 1), so the plane is the floor.' });
    push({ kind: 'teach', dim: 3, n: N0, b: B0, show: ['drop', 'proj'],
        explanation: 'Projecting b = (1, 2, 3) onto the floor drops it straight down: p = (1, 2, 0). Only the height — the part of b along n — is removed.' });
    const N1 = [1, 1, 2], B1 = [2, -1, 3];
    push({ kind: 'teach', dim: 3, n: N1, b: B1, show: ['drop', 'proj'],
        explanation: `Tilt the plane: n = (1, 1, 2). The recipe is the same — find b's part along n, (b · n / n · n) n = (7 / 6) n, and subtract it: p = ${tuple(projPlane(N1, B1))}.` });
    push({ kind: 'teach', dim: 3, n: N1, b: B1, show: ['drop', 'proj', 'residual'],
        explanation: `The leftover b − p = ${tuple(sub(B1, projPlane(N1, B1)))} lies along n, so it is perpendicular to every direction in the plane. Orbit the scene: the dashed drop meets the plane square on.` });
    PLANE_PRESETS.forEach(({ n, b }, i) => {
        push({ kind: 'plane-intro', dim: 3, n, b, slot: (prompt++ * 3 + 1) % 4, presetIndex: i,
            explanation: `The plane has normal n = ${tuple(n)} and b = ${tuple(b)}. Where does b's projection onto the plane land?` });
        const p = projPlane(n, b);
        push({ kind: 'plane', dim: 3, n, b, show: ['drop', 'proj', 'residual'], presetIndex: i,
            explanation: `b · n = ${num(dot(b, n))} and n · n = ${num(dot(n, n))}, so b's part along n is ${tuple(projLine(n, b))}. Subtract it: p = ${tuple(p)}, and p · n = ${num(dot(p, n))} — it lies in the plane.` });
    });
    push({ kind: 'closing', dim: 3, n: N1, b: B1, show: ['drop', 'proj', 'residual'],
        explanation: 'Onto a line: keep the part along the line. Onto a plane: remove the part along the normal. Either way the leftover is perpendicular. Switch to Explore to try your own.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each projection lands: where? For a line the slips are forgetting to
   divide by a · a, dividing by |a| only once, projecting a onto b instead, or
   giving the perpendicular leftover. For a plane they are giving the part along
   n instead of removing it, adding it, forgetting to divide by n · n, or just
   flattening z whatever the plane. */
const pickWrong = (correct, candidates) => {
    const seen = new Set([tuple(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (seen.has(tuple(c))) continue;
        seen.add(tuple(c));
        wrong.push(c);
    }
    return wrong;
};

const predictFor = (step) => {
    if (!step) return null;
    if (step.kind === 'line-intro') {
        const { a, b } = step;
        const p = projLine(a, b);
        const ordered = pickWrong(p, [
            scale(dot(a, b), a),                // forgot to divide
            scale(dot(a, b) / norm(a), a),      // divided once
            projLine(b, a),                     // projected a onto b
            sub(b, p),                          // the leftover
            add(p, [1, 0]),
        ]);
        ordered.splice(step.slot, 0, p);
        return {
            question: `a = ${tuple(a)}, b = ${tuple(b)}. Where does b's projection onto a's line land?`,
            options: ordered.map(tuple),
            correct: step.slot,
            because: `p = (a · b / a · a) a = (${num(dot(a, b))} / ${num(dot(a, a))}) × ${tuple(a)} = ${tuple(p)}.`,
        };
    }
    if (step.kind === 'plane-intro') {
        const { n, b } = step;
        const p = projPlane(n, b);
        const ordered = pickWrong(p, [
            projLine(n, b),                     // kept the part along n
            add(b, projLine(n, b)),             // added it
            sub(b, scale(dot(b, n), n)),        // forgot to divide by n · n
            [b[0], b[1], 0],                    // flattened z regardless
            add(p, [0, 0, 1]),
        ]);
        ordered.splice(step.slot, 0, p);
        return {
            question: `Plane normal n = ${tuple(n)}, b = ${tuple(b)}. Where does b's projection onto the plane land?`,
            options: ordered.map(tuple),
            correct: step.slot,
            because: `Remove b's part along n: b − (b · n / n · n) n = ${tuple(b)} − (${num(dot(b, n))} / ${num(dot(n, n))}) × ${tuple(n)} = ${tuple(p)}.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'Project b onto a line to get p, then project p onto the same line. What do you get?',
        options: ['The zero vector', 'A vector twice as long as p', 'b again', 'p itself'],
        correct: 3,
        explanation: 'p already lies on the line, so the closest point on the line to p is p. Projections are idempotent: doing one twice is the same as doing it once.',
    },
    {
        question: 'a = (2, 0) and b = (3, 4). Where does b\'s projection onto the line through a land?',
        options: ['(3, 0)', '(6, 0)', '(0, 4)', '(1.5, 0)'],
        correct: 0,
        explanation: 'a · b = 6 and a · a = 4, so p = (6 / 4)(2, 0) = (3, 0). Projecting onto the x-axis just keeps the x-component. (6, 0) forgets to divide by a · a.',
    },
    {
        question: 'After projecting b onto a line or a plane, how does the leftover b − p sit relative to that line or plane?',
        options: ['Parallel to it', 'Perpendicular to it', 'At 45° to it', 'It depends on b'],
        correct: 1,
        explanation: 'The projection is the closest point, and the shortest way from a point to a line or plane meets it at a right angle. So b − p is always perpendicular.',
    },
];

const codeExample = `import numpy as np

# Onto a line through the origin
a = np.array([3, 1])
b = np.array([1, 2])
p = (a @ b) / (a @ a) * a
print(p)                  # [1.5 0.5]
print((b - p) @ a)        # 0.0 -- the leftover is perpendicular

P = np.outer(a, a) / (a @ a)     # the projection as a matrix
print(np.allclose(P @ P, P))     # True -- projecting twice changes nothing

# Onto a plane through the origin with normal n
n = np.array([1, 1, 2])
v = np.array([2, -1, 3])
p3 = v - (v @ n) / (n @ n) * n
print(p3, p3 @ n)         # the shadow on the plane, and 0.0`;

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

/** A small square marking the right angle between the line and the drop. */
function rightAngle(foot, along, up, size = 0.28) {
    const ua = norm(along) > 1e-9 ? scale(size / norm(along), along) : [0, 0];
    const uu = norm(up) > 1e-9 ? scale(size / norm(up), up) : [0, 0];
    return [foot, add(foot, ua), add(add(foot, ua), uu), add(foot, uu)];
}

export default function VectorProjectionPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [tab, setTab] = useState(2);
    const [a, setA] = useState([4, 1]);
    const [b2, setB2] = useState([1, 3]);
    const [n, setN] = useState([1, 1, 2]);
    const [b3, setB3] = useState([2, -1, 3]);
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
    const show = guided ? step.show : ['drop', 'proj', 'residual'];
    const has = (k) => show.includes(k);
    const hideNumbers = guided && predict.hideExplanation;

    const goExplore = (nextTab) => {
        if (guided) {
            if (step.dim === 2) { setA(step.a); setB2(step.b); } else { setN(step.n); setB3(step.b); }
            setMode('explore'); setIsPlaying(false);
        }
        if (nextTab) setTab(nextTab);
    };

    /* 2D */
    const A = guided && step.dim === 2 ? step.a : a;
    const B2 = guided && step.dim === 2 ? step.b : b2;
    const p2 = projLine(A, B2);
    const r2 = sub(B2, p2);
    const far = norm(A) > 1e-9 ? 9 / norm(A) : 0;

    /* 3D */
    const N = guided && step.dim === 3 ? step.n : n;
    const B3 = guided && step.dim === 3 ? step.b : b3;
    const p3 = projPlane(N, B3);
    const along = projLine(N, B3);

    const formula2 = useMemo(() => {
        const R = MATH_COLORS.result;
        return String.raw`\operatorname{proj}_{\mathbf{a}}\mathbf{b} = \frac{\mathbf{a}\cdot\mathbf{b}}{\mathbf{a}\cdot\mathbf{a}}\,\mathbf{a} = \frac{${fmt(dot(A, B2))}}{${fmt(dot(A, A))}}\begin{bmatrix} ${fmt(A[0])} \\ ${fmt(A[1])} \end{bmatrix} = \textcolor{${R}}{\begin{bmatrix} ${fmt(p2[0])} \\ ${fmt(p2[1])} \end{bmatrix}}`;
    }, [A, B2, p2]);
    const formula2r = useMemo(() => String.raw`\mathbf{r} = \mathbf{b} - \mathbf{p} = (${fmt(r2[0])}, ${fmt(r2[1])}), \qquad \mathbf{r}\cdot\mathbf{a} = ${fmt(dot(r2, A))}`, [r2, A]);
    const formula3 = useMemo(() => {
        const R = MATH_COLORS.result;
        const col = (u) => String.raw`\begin{bmatrix} ${fmt(u[0])} \\ ${fmt(u[1])} \\ ${fmt(u[2])} \end{bmatrix}`;
        return String.raw`\mathbf{p} = \mathbf{b} - \frac{\mathbf{b}\cdot\mathbf{n}}{\mathbf{n}\cdot\mathbf{n}}\,\mathbf{n} = ${col(B3)} - \frac{${fmt(dot(B3, N))}}{${fmt(dot(N, N))}}${col(N)} = \textcolor{${R}}{${col(p3)}}`;
    }, [B3, N, p3]);
    const formula3r = useMemo(() => String.raw`\mathbf{p}\cdot\mathbf{n} = ${fmt(dot(p3, N))} \qquad \mathbf{b} - \mathbf{p} = (${fmt(along[0])}, ${fmt(along[1])}, ${fmt(along[2])}) \parallel \mathbf{n}`, [p3, N, along]);

    const exploreNote = dim === 2
        ? norm(A) < 1e-9 ? 'a is the zero vector, so there is no line to project onto.'
            : `p = ${tuple(p2)} is the point on a's line closest to b. The leftover ${tuple(r2)} is perpendicular to a${dot(A, B2) < 0 ? ', and since a · b < 0, p points against a' : ''}.`
        : norm(N) < 1e-9 ? 'n is the zero vector, so it does not pick out a plane.'
            : `p = ${tuple(p3)} lies in the plane (p · n = ${num(dot(p3, N))}). What was removed, ${tuple(along)}, points along n.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/vectors" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Vectors
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Vector Projection</h1>
                    <p className="text-sky-100 max-w-3xl">
                        The closest point on a line or a plane is found by dropping a perpendicular. The dot product says where it lands, and what is left over is always at right angles.
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
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Dimension">
                                {[[2, '2D: onto a line', Square], [3, '3D: onto a plane', Box]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={dim === key}
                                        onClick={() => goExplore(key)}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${dim === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {dim === 2 ? (
                            <Plane2D xRange={[-5, 5]} yRange={[-5, 5]} ariaLabel="Vector b, the line through a, and b's projection onto it">
                                {far > 0 && <Segment from={scale(-far, A)} to={scale(far, A)} color="#64748b" width={1.5} dashed />}
                                {has('drop') && (
                                    <>
                                        <Polygon points={rightAngle(p2, A, r2)} fill="none" fillOpacity={0} stroke="#94a3b8" strokeWidth={1.2} />
                                        <Segment from={B2} to={p2} color="#94a3b8" width={1.5} dashed />
                                        <Point at={p2} color={MATH_COLORS.result} r={4} />
                                    </>
                                )}
                                {has('residual') && norm(r2) > 1e-9 && (
                                    <Vector from={p2} to={B2} color={MATH_COLORS.negative} width={2} label="r" opacity={0.85} />
                                )}
                                <Vector to={A} color={MATH_COLORS.a} width={3} label="a" onDrag={(p) => { goExplore(2); setA(p); }} snap={0.25} />
                                {has('proj') && <Vector to={p2} color={MATH_COLORS.result} width={4} label="p" />}
                                <Vector to={B2} color={MATH_COLORS.b} width={3} label={has('again') ? 'p (again)' : 'b'} onDrag={(p) => { goExplore(2); setB2(p); }} snap={0.25} />
                            </Plane2D>
                        ) : (
                            <Scene3D height={420} ariaLabel="A plane through the origin, its normal n, a vector b and b's projection onto the plane"
                                fallback={<p className="text-sm text-slate-300 font-mono">{has('proj') ? `p = ${tuple(p3)}` : `n = ${tuple(N)}, b = ${tuple(B3)}`}</p>}>
                                {(P) => (
                                    <>
                                        {norm(N) > 1e-9 && <P.Plane3D normal={N} d={0} size={7} color="#38bdf8" opacity={0.16} />}
                                        <P.Arrow3D to={N.map(x => x * 1.2 / Math.max(norm(N), 1e-9))} color={MATH_COLORS.k} label="n" />
                                        <P.Arrow3D to={B3} color={MATH_COLORS.b} label="b" />
                                        {has('proj') && <P.Arrow3D to={p3} color={MATH_COLORS.result} label="p" />}
                                        {has('drop') && <P.Line3D points={[B3, p3]} color="#94a3b8" width={2} dashed />}
                                        {has('drop') && <P.Point3D at={p3} color={MATH_COLORS.result} size={0.07} />}
                                        {has('residual') && norm(along) > 1e-9 && (
                                            <>
                                                <P.Arrow3D from={p3} to={B3} color={MATH_COLORS.negative} radius={0.02} />
                                                <P.Label3D at={add(scale(0.5, add(p3, B3)), [0.45, -0.45, 0])} color={MATH_COLORS.negative} size={11}>b − p</P.Label3D>
                                            </>
                                        )}
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
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="sky" />
                                <span className="text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-sky-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {(dim === 2 ? LINE_PRESETS : PLANE_PRESETS).map((p, i) => (
                                    <button key={i} onClick={() => { if (dim === 2) { setA(p.a); setB2(p.b); } else { setN(p.n); setB3(p.b); } }}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-sky-500">
                                        {dim === 2 ? `onto ${tuple(p.a)}` : `normal ${tuple(p.n)}`}
                                    </button>
                                ))}
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
                                {dim === 2 ? (
                                    <>
                                        <MatrixInput label="a" value={[[A[0]], [A[1]]]} step={0.25} columnColors={[MATH_COLORS.a]}
                                            onChange={(m) => { goExplore(2); setA([m[0][0], m[1][0]]); }} />
                                        <MatrixInput label="b" value={[[B2[0]], [B2[1]]]} step={0.25} columnColors={[MATH_COLORS.b]}
                                            onChange={(m) => { goExplore(2); setB2([m[0][0], m[1][0]]); }} />
                                    </>
                                ) : (
                                    <>
                                        <MatrixInput label="n" value={N.map(x => [x])} step={0.25} columnColors={[MATH_COLORS.k]}
                                            onChange={(m) => { goExplore(3); setN(m.map(r => r[0])); }} />
                                        <MatrixInput label="b" value={B3.map(x => [x])} step={0.25} columnColors={[MATH_COLORS.b]}
                                            onChange={(m) => { goExplore(3); setB3(m.map(r => r[0])); }} />
                                    </>
                                )}
                            </div>
                            {has('proj') ? (
                                <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                    <Tex block>{dim === 2 ? formula2 : formula3}</Tex>
                                    {has('residual') && <Tex block>{dim === 2 ? formula2r : formula3r}</Tex>}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">The projection appears once the tour reaches it.</p>
                            )}
                            <p className="text-xs text-slate-500">
                                {dim === 2
                                    ? 'The fraction a · b / a · a is how many copies of a make up b\'s shadow. Dividing by a · a rather than |a| is what makes it work for an a of any length.'
                                    : 'Projecting onto a plane is projecting onto its normal and then subtracting: p = b − proj_n b.'}
                            </p>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Every projection</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-pink-400 font-semibold">p</span> — the closest point on the line or plane.</li>
                            <li><span className="text-rose-300 font-semibold">b − p</span> — the leftover, always perpendicular.</li>
                            <li><span className="text-slate-200 font-semibold">Twice = once</span> — projecting p again leaves it where it is.</li>
                            <li><span className="text-sky-300 font-semibold">Onto a plane</span> — remove the part of b along the normal.</li>
                        </ul>
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
