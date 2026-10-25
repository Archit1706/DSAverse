"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Vector, Segment, Polygon, Label, Point, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import MatrixInput from '@/components/math/MatrixInput';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────── */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const norm = (a) => Math.sqrt(dot(a, a));
const scale = (k, p) => [k * p[0], k * p[1]];
/** The angle between a and b in degrees, 0 to 180. */
const angleDeg = (a, b) => {
    const d = norm(a) * norm(b);
    if (d < 1e-12) return 0;
    return (Math.acos(Math.min(1, Math.max(-1, dot(a, b) / d))) * 180) / Math.PI;
};
/** The foot of the perpendicular from b's tip onto the line through a. */
const shadowPoint = (a, b) => (norm(a) < 1e-12 ? [0, 0] : scale(dot(a, b) / dot(a, a), a));
const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const deg = (x) => `${texNum(x, 1)}°`;
const pair = ([x, y]) => `(${num(x)}, ${num(y)})`;
/** A factor in a product: (−2) rather than −2. */
const par = (x) => (x < 0 ? `(${num(x)})` : num(x));
const signOf = (x) => (Math.abs(x) < 1e-9 ? 'Zero' : x > 0 ? 'Positive' : 'Negative');

const SIGN_LABELS = ['Positive', 'Zero', 'Negative'];
/** Two of each sign, so no answer is right more often than the others. */
const SIGN_PRESETS = [
    { a: [2, 2], b: [3, -1] },
    { a: [3, 1], b: [-1, 3] },
    { a: [1, 3], b: [2, -2] },
    { a: [-2, 1], b: [1, 2] },
    { a: [3, 0], b: [-1, 2] },
    { a: [-1, -2], b: [1, -3] },
];
const VALUE_PRESETS = [
    { a: [2, -1], b: [3, 2] },
    { a: [-1, 3], b: [2, 1.5] },
    { a: [-2, -1], b: [3, -2] },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    const push = (s) => steps.push({ show: [], ...s });
    const A = [3, 1], B = [1, 2];
    push({ kind: 'opening', a: A, b: B,
        explanation: 'Two vectors, a = (3, 1) and b = (1, 2). The dot product a · b turns them into a single number. There are two ways to get it, and the point of this page is that they always agree.' });
    push({ kind: 'teach', a: A, b: B, show: ['value'],
        explanation: 'The quick way: multiply matching components and add. a · b = 3 × 1 + 1 × 2 = 5. Just arithmetic — but what does 5 mean?' });
    push({ kind: 'teach', a: A, b: B, show: ['angle'],
        explanation: 'The angle between them is 45°. |a| = √10 ≈ 3.16 and |b| = √5 ≈ 2.24.' });
    push({ kind: 'teach', a: A, b: B, show: ['angle', 'shadow'],
        explanation: 'Shine a light straight down onto a\'s line. b casts a shadow on it of length |b| cos θ = 2.24 × cos 45° ≈ 1.58. That green segment is how much of b points along a.' });
    push({ kind: 'teach', a: A, b: B, show: ['angle', 'shadow', 'value'],
        explanation: 'Multiply the shadow by a\'s length: 1.58 × 3.16 ≈ 5. The same 5 as before. So a · b = |a||b| cos θ: the shadow of one vector on the other, times the other\'s length.' });
    push({ kind: 'teach', a: A, b: [-1, 3], show: ['angle', 'shadow', 'sign', 'value'],
        explanation: 'Turn b to (−1, 3), at right angles to a. Its shadow shrinks to a single point, so a · b = −3 + 3 = 0. Perpendicular vectors always have dot product 0 — the dashed line marks every such direction.' });
    push({ kind: 'teach', a: A, b: [-2, 1], show: ['angle', 'shadow', 'sign', 'value'],
        explanation: 'Turn b past the dashed line to (−2, 1). Now its shadow falls behind the origin, pointing against a, so a · b = −6 + 1 = −5 is negative. The shaded side is where a · b > 0.' });

    let signIndex = 0, valueIndex = 0;
    const order = ['value', 'sign', 'sign', 'value', 'sign', 'sign', 'value', 'sign', 'sign'];
    order.forEach((type) => {
        if (type === 'sign') {
            const i = signIndex++;
            const { a, b } = SIGN_PRESETS[i];
            push({ kind: 'sign-intro', a, b, rotate: (i * 2 + 1) % 3, presetIndex: i,
                explanation: `a = ${pair(a)} and b = ${pair(b)}. Is a · b positive, zero or negative?` });
            const d = dot(a, b);
            push({ kind: 'sign', a, b, show: ['angle', 'shadow', 'sign', 'value'], presetIndex: i,
                explanation: `a · b = ${par(a[0])} × ${par(b[0])} + ${par(a[1])} × ${par(b[1])} = ${num(d)}: ${signOf(d).toLowerCase()}. The angle is ${deg(angleDeg(a, b))}, ${d > 1e-9 ? 'less than 90°, so b\'s shadow falls along a' : d < -1e-9 ? 'more than 90°, so b\'s shadow falls behind the origin' : 'exactly 90°, so b casts no shadow on a at all'}.` });
        } else {
            const i = valueIndex++;
            const { a, b } = VALUE_PRESETS[i];
            push({ kind: 'value-intro', a, b, slot: (i * 3 + 1) % 4, presetIndex: i,
                explanation: `a = ${pair(a)} and b = ${pair(b)}. What is a · b?` });
            const d = dot(a, b);
            push({ kind: 'value', a, b, show: ['angle', 'shadow', 'value'], presetIndex: i,
                explanation: `a · b = ${par(a[0])} × ${par(b[0])} + ${par(a[1])} × ${par(b[1])} = ${num(d)}. Check it with the picture: |a||b| cos θ = ${num(norm(a))} × ${num(norm(b))} × cos ${deg(angleDeg(a, b))} ≈ ${num(norm(a) * norm(b) * Math.cos((angleDeg(a, b) * Math.PI) / 180))}.` });
        }
    });
    push({ kind: 'closing', a: A, b: B, show: ['angle', 'shadow', 'sign', 'value'],
        explanation: 'Positive: roughly the same direction. Zero: perpendicular. Negative: roughly opposite. Switch to Explore and swing b around a to watch the sign change at the dashed line.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Two questions. "Positive, zero or negative?" uses fixed labels, so the six
   presets carry two of each sign and the labels are rotated so each answer
   lands in each button equally often. "What is a · b?" offers the classic
   slips: cross-multiplying, subtracting the second product, and |a||b| with
   the cos θ forgotten. */
const predictFor = (step) => {
    if (!step) return null;
    const { a, b } = step;
    const d = dot(a, b);
    if (step.kind === 'sign-intro') {
        const options = SIGN_LABELS.map((_, i) => SIGN_LABELS[(i + step.rotate) % 3]);
        return {
            question: `a = ${pair(a)}, b = ${pair(b)}. Is a · b positive, zero or negative?`,
            options,
            correct: options.indexOf(signOf(d)),
            because: `${par(a[0])} × ${par(b[0])} + ${par(a[1])} × ${par(b[1])} = ${num(d)}. ${d > 1e-9 ? 'The angle is under 90°.' : d < -1e-9 ? 'The angle is over 90°.' : 'The vectors are perpendicular.'}`,
        };
    }
    if (step.kind === 'value-intro') {
        const candidates = [
            a[0] * b[1] + a[1] * b[0],      // cross-multiplied
            a[0] * b[0] - a[1] * b[1],      // subtracted the second product
            norm(a) * norm(b),               // forgot cos θ
            a[0] + b[0] + a[1] + b[1],
            d + 1,
        ];
        const seen = new Set([num(d)]);
        const wrong = [];
        for (const c of candidates) {
            if (wrong.length === 3) break;
            if (seen.has(num(c))) continue;
            seen.add(num(c));
            wrong.push(c);
        }
        const ordered = [...wrong];
        ordered.splice(step.slot, 0, d);
        return {
            question: `a = ${pair(a)}, b = ${pair(b)}. What is a · b?`,
            options: ordered.map(num),
            correct: step.slot,
            because: `Multiply matching components and add: ${par(a[0])} × ${par(b[0])} + ${par(a[1])} × ${par(b[1])} = ${num(a[0] * b[0])} + ${par(a[1] * b[1])} = ${num(d)}.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'Two non-zero vectors have a · b = 0. What does that tell you?',
        options: ['They point the same way', 'One is longer than the other', 'They are perpendicular', 'They lie on the same line'],
        correct: 2,
        explanation: 'a · b = |a||b| cos θ, and with neither length 0 that forces cos θ = 0, so θ = 90°. Neither casts any shadow on the other.',
    },
    {
        question: 'a = (2, −1) and b = (1, 4). What is a · b?',
        options: ['−2', '7', '9', '2'],
        correct: 0,
        explanation: '2 × 1 + (−1) × 4 = 2 − 4 = −2. Negative, so the angle between them is more than 90°. 7 comes from cross-multiplying, 2 × 4 + (−1) × 1.',
    },
    {
        question: '|a| = 4, |b| = 3, and the angle between them is 60°. What is a · b?',
        options: ['12', '6', '10.4', '7'],
        correct: 1,
        explanation: '|a||b| cos θ = 4 × 3 × cos 60° = 12 × 0.5 = 6. Twelve would be right only if they pointed the same way; 10.4 uses sin 60° instead of cos.',
    },
];

const codeExample = `import numpy as np

a = np.array([3, 1])
b = np.array([1, 2])

print(a @ b)            # 5 -- a1*b1 + a2*b2
print(np.dot(a, b))     # 5, the same thing

# The geometric version: |a| |b| cos(theta)
cos_theta = (a @ b) / (np.linalg.norm(a) * np.linalg.norm(b))
print(np.degrees(np.arccos(cos_theta)))   # 45.0

shadow = (a @ b) / np.linalg.norm(a)      # b's shadow on a
print(shadow * np.linalg.norm(a))         # 5.0 -- shadow times length

print(np.array([3, 1]) @ np.array([-1, 3]))   # 0 -- perpendicular`;

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

/** The part of the plane's square where n · p ≥ 0 (one Sutherland–Hodgman pass). */
function halfPlane(n, r = 5) {
    const square = [[-r, -r], [r, -r], [r, r], [-r, r]];
    const out = [];
    for (let i = 0; i < square.length; i++) {
        const p = square[i], q = square[(i + 1) % square.length];
        const dp = dot(n, p), dq = dot(n, q);
        if (dp >= 0) out.push(p);
        if ((dp >= 0) !== (dq >= 0)) {
            const t = dp / (dp - dq);
            out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
        }
    }
    return out;
}

/** The arc from a's direction to b's, the short way round. */
function AngleArc({ a, b, radius = 0.8, color }) {
    const { toScreen } = usePlane();
    if (norm(a) < 1e-9 || norm(b) < 1e-9) return null;
    const t0 = Math.atan2(a[1], a[0]);
    let t1 = Math.atan2(b[1], b[0]);
    let d = t1 - t0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    t1 = t0 + d;
    const pts = [];
    for (let i = 0; i <= 24; i++) {
        const t = t0 + (d * i) / 24;
        pts.push(toScreen([radius * Math.cos(t), radius * Math.sin(t)]).join(','));
    }
    const mid = t0 + d / 2;
    const [lx, ly] = toScreen([(radius + 0.45) * Math.cos(mid), (radius + 0.45) * Math.sin(mid)]);
    return (
        <g>
            <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} />
            <text x={lx} y={ly + 4} fontSize={12} fontWeight={700} fill={color} textAnchor="middle">θ</text>
        </g>
    );
}

const EXPLORE_PRESETS = [
    { name: 'Same direction', a: [3, 1], b: [1.5, 0.5] },
    { name: 'Acute', a: [3, 1], b: [1, 2] },
    { name: 'Perpendicular', a: [3, 1], b: [-1, 3] },
    { name: 'Opposite', a: [3, 1], b: [-3, -1] },
];

export default function DotProductPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1300);
    const [a, setA] = useState([3, 1]);
    const [b, setB] = useState([1, 2]);
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
    const A = guided ? step.a : a;
    const B = guided ? step.b : b;
    const show = guided ? step.show : ['angle', 'shadow', 'sign', 'value'];
    const has = (k) => show.includes(k);
    const d = dot(A, B);
    const theta = angleDeg(A, B);
    const foot = shadowPoint(A, B);
    const shadowLen = norm(A) < 1e-12 ? 0 : d / norm(A);
    const hideNumbers = guided && predict.hideExplanation;
    const tone = Math.abs(d) < 1e-9 ? '#e2e8f0' : d > 0 ? MATH_COLORS.i : MATH_COLORS.negative;

    const takeOver = () => {
        if (guided) { setA(step.a); setB(step.b); setMode('explore'); setIsPlaying(false); }
    };
    const dragA = (p) => { takeOver(); setA(p); };
    const dragB = (p) => { takeOver(); setB(p); };

    const formula = useMemo(() => {
        const CA = MATH_COLORS.a, CB = MATH_COLORS.b;
        const p = (x) => (x < 0 ? `(${fmt(x)})` : fmt(x));
        return String.raw`\textcolor{${CA}}{\mathbf{a}} \cdot \textcolor{${CB}}{\mathbf{b}} = \textcolor{${CA}}{${p(A[0])}}\,\textcolor{${CB}}{${p(B[0])}} + \textcolor{${CA}}{${p(A[1])}}\,\textcolor{${CB}}{${p(B[1])}} = \mathbf{${fmt(d)}}`;
    }, [A, B, d]);
    const formulaGeo = useMemo(() => String.raw`|\mathbf{a}|\,|\mathbf{b}|\cos\theta = ${fmt(norm(A))} \times ${fmt(norm(B))} \times \cos ${texNum(theta, 1)}^\circ = \mathbf{${fmt(norm(A) * norm(B) * Math.cos((theta * Math.PI) / 180))}}`, [A, B, theta]);

    const exploreNote = norm(A) < 1e-9 || norm(B) < 1e-9
        ? 'One of the vectors is the zero vector, so the dot product is 0 and there is no angle to speak of.'
        : `a · b = ${num(d)} and θ = ${deg(theta)}. ${d > 1e-9 ? 'b leans the same way as a: its shadow falls along a, so the product is positive.' : d < -1e-9 ? 'b leans away from a: its shadow falls behind the origin, so the product is negative.' : 'b is perpendicular to a: no shadow at all, so the product is 0.'}`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/vectors" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Vectors
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Dot Product</h1>
                    <p className="text-sky-100 max-w-3xl">
                        Multiply matching components and add — or take one vector&apos;s shadow on the other and multiply by the other&apos;s length. Two recipes, one number, and its sign tells you which way they lean.
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
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag a and b, or type their components'}
                            </span>
                        </div>

                        <Plane2D xRange={[-5, 5]} yRange={[-5, 5]} ariaLabel="Vectors a and b, the angle between them and b's shadow on a">
                            {has('sign') && norm(A) > 1e-9 && (
                                <>
                                    <Polygon points={halfPlane(A)} fill={MATH_COLORS.i} fillOpacity={0.06} strokeWidth={0} />
                                    <Segment from={scale(9 / norm(A), [-A[1], A[0]])} to={scale(-9 / norm(A), [-A[1], A[0]])} color="#94a3b8" width={1.5} dashed />
                                </>
                            )}
                            {has('shadow') && norm(A) > 1e-9 && (
                                <>
                                    <Segment from={scale(-9 / norm(A), A)} to={scale(9 / norm(A), A)} color="#475569" width={1} />
                                    <Segment from={B} to={foot} color="#94a3b8" width={1.5} dashed />
                                    <Segment from={[0, 0]} to={foot} color={tone} width={6} opacity={0.85} />
                                    <Point at={foot} color={tone} r={4} />
                                </>
                            )}
                            {has('angle') && <AngleArc a={A} b={B} color={MATH_COLORS.area} />}
                            <Vector to={B} color={MATH_COLORS.b} width={3} label="b" onDrag={dragB} snap={0.25} />
                            <Vector to={A} color={MATH_COLORS.a} width={3} label="a" onDrag={dragA} snap={0.25} />
                            {has('value') && (
                                <Label at={[-4.8, 4.5]} color={tone} size={15} weight={700}>{`a · b = ${num(d)}`}</Label>
                            )}
                        </Plane2D>

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
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {EXPLORE_PRESETS.map(p => (
                                    <button key={p.name} onClick={() => { setA(p.a); setB(p.b); }}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-sky-500">{p.name}</button>
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
                                <MatrixInput label="a" value={[[A[0]], [A[1]]]} step={0.25} columnColors={[MATH_COLORS.a]}
                                    onChange={(n) => { takeOver(); setA([n[0][0], n[1][0]]); }} />
                                <MatrixInput label="b" value={[[B[0]], [B[1]]]} step={0.25} columnColors={[MATH_COLORS.b]}
                                    onChange={(n) => { takeOver(); setB([n[0][0], n[1][0]]); }} />
                                {has('angle') && (
                                    <div className="text-sm text-slate-400 space-y-0.5">
                                        <div>θ = <span className="font-mono text-yellow-300">{deg(theta)}</span></div>
                                        <div>shadow = <span className="font-mono" style={{ color: tone }}>{num(shadowLen)}</span></div>
                                    </div>
                                )}
                            </div>
                            {has('value') ? (
                                <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                    <Tex block>{formula}</Tex>
                                    {has('angle') && <Tex block>{formulaGeo}</Tex>}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">The value appears once the tour reaches it.</p>
                            )}
                            <p className="text-xs text-slate-500">
                                The two lines are the same number reached two ways. The thick segment on a&apos;s line is b&apos;s shadow, |b| cos θ: green when it falls along a, red when it falls behind.
                            </p>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Reading the sign</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-green-400 font-semibold">a · b &gt; 0</span> — angle under 90°: they lean the same way.</li>
                            <li><span className="text-slate-200 font-semibold">a · b = 0</span> — exactly 90°: perpendicular.</li>
                            <li><span className="text-rose-300 font-semibold">a · b &lt; 0</span> — angle over 90°: they lean apart.</li>
                            <li><span className="text-yellow-300 font-semibold">a · a = |a|²</span> — a vector dotted with itself is its length squared.</li>
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
