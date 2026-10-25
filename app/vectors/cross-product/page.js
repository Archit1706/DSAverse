"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, ArrowRightLeft,
} from 'lucide-react';
import { MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import MatrixInput from '@/components/math/MatrixInput';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────── */
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const norm = (u) => Math.sqrt(dot(u, u));
const add = (u, v) => [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
const scale = (k, u) => [k * u[0], k * u[1], k * u[2]];
const angleDeg = (u, v) => {
    const d = norm(u) * norm(v);
    if (d < 1e-12) return 0;
    return (Math.acos(Math.min(1, Math.max(-1, dot(u, v) / d))) * 180) / Math.PI;
};
const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const triple = (u) => `(${num(u[0])}, ${num(u[1])}, ${num(u[2])})`;
const near0 = (x) => Math.abs(x) < 1e-9;
/** Which way a × b points for vectors in the xy-plane. */
const directionOf = (a, b) => {
    const z = cross(a, b)[2];
    return near0(z) ? 'Zero — a and b are parallel' : z > 0 ? 'Up (+z)' : 'Down (−z)';
};
const DIRECTION_LABELS = ['Up (+z)', 'Zero — a and b are parallel', 'Down (−z)'];

/** In the xy-plane, so "up or down" is the whole question. Two of each answer. */
const DIRECTION_PRESETS = [
    { a: [1, -1, 0], b: [1, 2, 0] },
    { a: [1, 2, 0], b: [-1.5, -3, 0] },
    { a: [2, 1, 0], b: [0.5, -1, 0] },
    { a: [2, 0, 0], b: [-3, 0, 0] },
    { a: [-1, 2, 0], b: [1, 0.5, 0] },
    { a: [-2, 1, 0], b: [-1, -1, 0] },
];
const LENGTH_PRESETS = [
    { a: [2, 0, 0], b: [1, 2, 0] },
    { a: [1, 1, 0], b: [0, 2, 2] },
    { a: [0, 2, 1], b: [1.5, 0, 0] },
];
const COMPONENT_PRESETS = [
    { a: [1, 1, 0.5], b: [-1, 1, 1] },
    { a: [1, -1, 1], b: [1, 1, 0] },
    { a: [0, 1, 2], b: [1, 0, 1] },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    const push = (s) => steps.push({ swap: false, show: ['area'], ...s });
    const A = [2, 0, 0], B = [0, 2, 0];
    push({ kind: 'opening', a: A, b: B,
        explanation: 'In 3D there is a product of two vectors that gives another vector. Start simple: a = (2, 0, 0) along x and b = (0, 2, 0) along y. They span a 2 × 2 square, shaded yellow.' });
    push({ kind: 'teach', a: A, b: B, show: ['area', 'result'],
        explanation: 'a × b = (0, 0, 4). It stands straight up — perpendicular to a and to b at once — and its length, 4, is exactly the area of the square they span.' });
    push({ kind: 'teach', a: A, b: B, show: ['area', 'result', 'curl'],
        explanation: 'Which way up? The right-hand rule: curl the fingers of your right hand from a toward b, along the white arc, and your thumb points along a × b. Here the curl is counter-clockwise seen from above, so the thumb points up.' });
    push({ kind: 'teach', a: A, b: B, swap: true, show: ['area', 'result', 'curl'],
        explanation: 'Swap the order. Curling from b toward a turns the other way, so b × a = (0, 0, −4) points down. The cross product is anti-commutative: b × a = −(a × b).' });
    [30, 60, 90, 150, 180].forEach((phi) => {
        const t = (phi * Math.PI) / 180;
        const b = [2 * Math.cos(t), 2 * Math.sin(t), 0].map(x => (near0(x) ? 0 : x));
        const len = norm(cross(A, b));
        push({ kind: 'sweep', a: A, b, show: ['area', 'result', 'curl'], phi,
            explanation: phi === 90
                ? `At 90° the parallelogram is the full square and |a × b| = 2 × 2 × sin 90° = 4, as large as it can get.`
                : phi === 180
                    ? 'At 180° b points straight back along a. The parallelogram is squashed flat, so a × b = 0: parallel vectors have no cross product.'
                    : `Turn b to ${phi}° from a. The parallelogram ${phi < 90 ? 'is thinner' : 'leans over'}, and |a × b| = |a||b| sin θ = 2 × 2 × sin ${phi}° = ${num(len)}.` });
    });
    const G = [2, 1, 0], H = [0, 1, 1.5];
    push({ kind: 'teach', a: G, b: H, show: ['area', 'result'],
        explanation: `For vectors in any direction, a pattern of products gives the components: (a₂b₃ − a₃b₂, a₃b₁ − a₁b₃, a₁b₂ − a₂b₁). With a = ${triple(G)} and b = ${triple(H)} that is ${triple(cross(G, H))}.` });
    push({ kind: 'teach', a: G, b: H, show: ['area', 'result', 'curl'],
        explanation: `Check it is perpendicular: a · (a × b) = ${num(dot(G, cross(G, H)))} and b · (a × b) = ${num(dot(H, cross(G, H)))}. Orbit the scene — the pink arrow stands square to the yellow parallelogram from every side.` });

    const order = ['dir', 'len', 'dir', 'comp', 'dir', 'len', 'dir', 'comp', 'dir', 'len', 'dir', 'comp'];
    const count = { dir: 0, len: 0, comp: 0 };
    order.forEach((type) => {
        const i = count[type]++;
        const { a, b } = (type === 'dir' ? DIRECTION_PRESETS : type === 'len' ? LENGTH_PRESETS : COMPONENT_PRESETS)[i];
        const c = cross(a, b);
        if (type === 'dir') {
            push({ kind: 'dir-intro', a, b, rotate: (i * 2 + 1) % 3, presetIndex: i,
                explanation: `a = ${triple(a)} and b = ${triple(b)}, both flat in the xy-plane. Does a × b point up, down, or is it zero?` });
            const dir = directionOf(a, b);
            push({ kind: 'dir', a, b, show: ['area', 'result', 'curl'], presetIndex: i,
                explanation: `a × b = ${triple(c)}. ${dir.startsWith('Zero') ? 'a and b lie on one line, so they span no area and the cross product is the zero vector.' : `Curling from a to b is ${c[2] > 0 ? 'counter-clockwise from above, so the thumb points up' : 'clockwise from above, so the thumb points down'}.`}` });
        } else if (type === 'len') {
            push({ kind: 'len-intro', a, b, slot: (i * 3 + 1) % 4, presetIndex: i,
                explanation: `a = ${triple(a)} and b = ${triple(b)}. How long is a × b — that is, how big is the yellow parallelogram?` });
            push({ kind: 'len', a, b, show: ['area', 'result', 'curl'], presetIndex: i,
                explanation: `a × b = ${triple(c)}, so |a × b| = ${num(norm(c))}. The same number is |a||b| sin θ = ${num(norm(a))} × ${num(norm(b))} × sin ${texNum(angleDeg(a, b), 1)}°: the parallelogram's base times its height.` });
        } else {
            push({ kind: 'comp-intro', a, b, slot: (i * 3 + 2) % 4, presetIndex: i,
                explanation: `a = ${triple(a)} and b = ${triple(b)}. Which vector is a × b?` });
            push({ kind: 'comp', a, b, show: ['area', 'result', 'curl'], presetIndex: i,
                explanation: `a × b = (${num(a[1])}·${num(b[2])} − ${num(a[2])}·${num(b[1])}, ${num(a[2])}·${num(b[0])} − ${num(a[0])}·${num(b[2])}, ${num(a[0])}·${num(b[1])} − ${num(a[1])}·${num(b[0])}) = ${triple(c)}. It is perpendicular to both: a · (a × b) = ${num(dot(a, c))}, b · (a × b) = ${num(dot(b, c))}.` });
        }
    });
    push({ kind: 'closing', a: G, b: H, show: ['area', 'result', 'curl'],
        explanation: 'Perpendicular to both, as long as the parallelogram is large, and pointing where your right thumb does. Switch to Explore to type your own vectors and swap their order.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Three questions. "Up, down or zero?" for flat vectors uses fixed labels, so
   the six presets carry two of each and the labels rotate. "How long?" offers
   |a||b| (sin θ forgotten), a · b (the wrong product) and |a| + |b|. "Which
   vector?" offers b × a (order swapped), the middle component without its
   sign flip, and the component-by-component product. */
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
    const { a, b } = step;
    const c = cross(a, b);
    if (step.kind === 'dir-intro') {
        const options = DIRECTION_LABELS.map((_, i) => DIRECTION_LABELS[(i + step.rotate) % 3]);
        return {
            question: `a = ${triple(a)}, b = ${triple(b)}. Does a × b point up, down, or is it zero?`,
            options,
            correct: options.indexOf(directionOf(a, b)),
            because: `For flat vectors only the z-component survives: a₁b₂ − a₂b₁ = ${num(a[0])}·${num(b[1])} − ${num(a[1])}·${num(b[0])} = ${num(c[2])}.`,
        };
    }
    if (step.kind === 'len-intro') {
        const correct = norm(c);
        const ordered = pickWrong(correct, [norm(a) * norm(b), dot(a, b), norm(a) + norm(b), correct + 1, correct * 2], num);
        ordered.splice(step.slot, 0, correct);
        return {
            question: `a = ${triple(a)}, b = ${triple(b)}. How long is a × b?`,
            options: ordered.map(num),
            correct: step.slot,
            because: `a × b = ${triple(c)}, whose length is ${num(correct)} — the area of the parallelogram, |a||b| sin θ with θ = ${texNum(angleDeg(a, b), 1)}°.`,
        };
    }
    if (step.kind === 'comp-intro') {
        const ordered = pickWrong(c, [
            cross(b, a),                                                          // order swapped
            [a[1] * b[2] - a[2] * b[1], a[0] * b[2] - a[2] * b[0], a[0] * b[1] - a[1] * b[0]],   // middle sign not flipped
            [a[0] * b[0], a[1] * b[1], a[2] * b[2]],                              // multiplied matching components
            add(c, [1, 0, 0]),
        ], triple);
        ordered.splice(step.slot, 0, c);
        return {
            question: `a = ${triple(a)}, b = ${triple(b)}. Which vector is a × b?`,
            options: ordered.map(triple),
            correct: step.slot,
            because: `(a₂b₃ − a₃b₂, a₃b₁ − a₁b₃, a₁b₂ − a₂b₁) = ${triple(c)}. Dot it with a and with b: both give 0, the check that it is perpendicular.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'a × b = (0, 0, 6). What is b × a?',
        options: ['(0, 0, 6)', '(0, 0, −6)', '(6, 0, 0)', '(0, 0, 0)'],
        correct: 1,
        explanation: 'Swapping the order reverses the curl of your fingers, so the thumb points the other way: b × a = −(a × b) = (0, 0, −6). Same length, opposite direction.',
    },
    {
        question: '|a| = 3, |b| = 4, and a and b point along the same line. What is |a × b|?',
        options: ['12', '7', '0', '1'],
        correct: 2,
        explanation: 'Parallel vectors span a parallelogram with no area, and |a||b| sin 0° = 0. The cross product of parallel vectors is the zero vector — the opposite of the dot product, which is largest here.',
    },
    {
        question: 'Which statement about a × b is always true?',
        options: [
            'It points along a',
            'Its length is |a||b|',
            'It equals b × a',
            'It is perpendicular to both a and b',
        ],
        correct: 3,
        explanation: 'a · (a × b) = 0 and b · (a × b) = 0 for every a and b. Its length is |a||b| only when a and b are perpendicular, and swapping the order flips its sign.',
    },
];

const codeExample = `import numpy as np

a = np.array([2, 0, 0])
b = np.array([0, 2, 0])

c = np.cross(a, b)
print(c)                  # [0 0 4] -- straight up
print(np.cross(b, a))     # [ 0  0 -4] -- the order matters
print(c @ a, c @ b)       # 0 0 -- perpendicular to both

# Its length is the area of the parallelogram a and b span
print(np.linalg.norm(c))  # 4.0
theta = np.arccos(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))
print(np.linalg.norm(a) * np.linalg.norm(b) * np.sin(theta))   # 4.0`;

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

/** Points on the arc from u's direction toward v's, in the plane they span. */
function curlArc(u, v, radius = 0.75) {
    const nu = norm(u);
    if (nu < 1e-9 || norm(cross(u, v)) < 1e-9) return null;
    const e1 = scale(1 / nu, u);
    const perp = add(v, scale(-dot(v, e1), e1));
    const e2 = scale(1 / norm(perp), perp);
    const theta = (angleDeg(u, v) * Math.PI) / 180;
    const pts = [];
    for (let i = 0; i <= 28; i++) {
        const t = (theta * i) / 28;
        pts.push(add(scale(radius * Math.cos(t), e1), scale(radius * Math.sin(t), e2)));
    }
    return pts;
}

const EXPLORE_PRESETS = [
    { name: 'x and y', a: [2, 0, 0], b: [0, 2, 0] },
    { name: 'Tilted', a: [2, 1, 0], b: [0, 1, 1.5] },
    { name: 'Nearly parallel', a: [2, 1, 0], b: [2, 1.4, 0.2] },
    { name: 'Parallel', a: [1, 1, 1], b: [-1.5, -1.5, -1.5] },
];

export default function CrossProductPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [a, setA] = useState([2, 1, 0]);
    const [b, setB] = useState([0, 1, 1.5]);
    const [swap, setSwap] = useState(false);
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
    const swapped = guided ? step.swap : swap;
    const show = guided ? step.show : ['area', 'result', 'curl'];
    const has = (k) => show.includes(k);
    // The product drawn: a × b, or b × a when the order is swapped.
    const [first, second] = swapped ? [B, A] : [A, B];
    const c = cross(first, second);
    const area = norm(c);
    const theta = angleDeg(A, B);
    const arc = useMemo(() => curlArc(first, second), [first, second]);
    const hideNumbers = guided && predict.hideExplanation;
    const name = swapped ? 'b × a' : 'a × b';

    const takeOver = () => {
        if (guided) { setA(step.a); setB(step.b); setSwap(step.swap); setMode('explore'); setIsPlaying(false); }
    };

    const formula = useMemo(() => {
        const [u, v] = [first, second];
        const p = (x) => (x < 0 ? `(${fmt(x)})` : fmt(x));
        const U = swapped ? 'b' : 'a', V = swapped ? 'a' : 'b';
        return String.raw`\mathbf{${U}} \times \mathbf{${V}} = \begin{bmatrix} ${p(u[1])}\cdot${p(v[2])} - ${p(u[2])}\cdot${p(v[1])} \\ ${p(u[2])}\cdot${p(v[0])} - ${p(u[0])}\cdot${p(v[2])} \\ ${p(u[0])}\cdot${p(v[1])} - ${p(u[1])}\cdot${p(v[0])} \end{bmatrix} = \textcolor{${MATH_COLORS.result}}{\begin{bmatrix} ${fmt(c[0])} \\ ${fmt(c[1])} \\ ${fmt(c[2])} \end{bmatrix}}`;
    }, [first, second, c, swapped]);
    const formulaLen = useMemo(() => String.raw`|\mathbf{a} \times \mathbf{b}| = ${fmt(area)} \qquad |\mathbf{a}|\,|\mathbf{b}|\sin\theta = ${fmt(norm(A))} \times ${fmt(norm(B))} \times \sin ${texNum(theta, 1)}^\circ = ${fmt(norm(A) * norm(B) * Math.sin((theta * Math.PI) / 180))}`, [area, A, B, theta]);
    const formulaPerp = useMemo(() => String.raw`\mathbf{a} \cdot (\mathbf{a} \times \mathbf{b}) = ${fmt(dot(A, cross(A, B)))} \qquad \mathbf{b} \cdot (\mathbf{a} \times \mathbf{b}) = ${fmt(dot(B, cross(A, B)))}`, [A, B]);

    const exploreNote = area < 1e-9
        ? 'a and b lie on one line (or one of them is zero), so they span no area and the cross product is the zero vector.'
        : `${name} = ${triple(c)}, length ${num(area)} — the area of the yellow parallelogram. It is perpendicular to both a and b, and ${swapped ? 'with the order swapped it points the other way from a × b' : 'swapping the order would flip it'}.`;

    const resultShown = has('result');
    const centre = scale(0.5, add(A, B));

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/vectors" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Vectors
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Cross Product</h1>
                    <p className="text-sky-100 max-w-3xl">
                        Two vectors in 3D make a third that stands perpendicular to both, as long as the parallelogram they span is large, pointing where your right thumb points. Orbit it and see.
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
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Type the components; drag the scene to orbit'}
                            </span>
                        </div>

                        <Scene3D height={420} ariaLabel="Vectors a and b, the parallelogram they span, and their cross product"
                            fallback={<p className="text-sm text-slate-300 font-mono">{resultShown ? `${name} = ${triple(c)}, |${name}| = ${num(area)}` : `a = ${triple(A)}, b = ${triple(B)}`}</p>}>
                            {(P) => (
                                <>
                                    {has('area') && area > 1e-9 && (
                                        <P.Polygon3D points={[[0, 0, 0], A, add(A, B), B]} color={MATH_COLORS.area} opacity={0.28} />
                                    )}
                                    <P.Arrow3D to={A} color={MATH_COLORS.a} label="a" />
                                    <P.Arrow3D to={B} color={MATH_COLORS.b} label="b" />
                                    {resultShown && (
                                        <P.Arrow3D to={c} color={MATH_COLORS.result} label={name} />
                                    )}
                                    {has('curl') && arc && (
                                        <>
                                            <P.Line3D points={arc} color="#e2e8f0" width={2.5} />
                                            <P.Arrow3D from={arc[arc.length - 4]} to={arc[arc.length - 1]} color="#e2e8f0" radius={0.012} headLength={0.16} headRadius={0.06} />
                                        </>
                                    )}
                                    {has('area') && resultShown && area > 1e-9 && (
                                        <P.Label3D at={centre} color={MATH_COLORS.area} size={11}>{`area ${num(area)}`}</P.Label3D>
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
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {EXPLORE_PRESETS.map(p => (
                                    <button key={p.name} onClick={() => { setA(p.a); setB(p.b); }}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-sky-500">{p.name}</button>
                                ))}
                                <button onClick={() => setSwap(s => !s)} aria-pressed={swap}
                                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${swap ? 'border-pink-500 text-pink-300 bg-pink-500/10' : 'border-slate-700 text-slate-300 hover:border-sky-500'}`}>
                                    <ArrowRightLeft className="h-3.5 w-3.5" />{swap ? 'Showing b × a' : 'Swap the order'}
                                </button>
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
                                <MatrixInput label="a" value={A.map(x => [x])} step={0.25} columnColors={[MATH_COLORS.a]}
                                    onChange={(n) => { takeOver(); setA(n.map(r => r[0])); }} />
                                <MatrixInput label="b" value={B.map(x => [x])} step={0.25} columnColors={[MATH_COLORS.b]}
                                    onChange={(n) => { takeOver(); setB(n.map(r => r[0])); }} />
                                <div className="text-sm text-slate-400 space-y-0.5">
                                    <div>θ = <span className="font-mono text-slate-100">{texNum(theta, 1)}°</span></div>
                                    <div>area = <span className="font-mono text-yellow-300">{resultShown ? num(area) : '?'}</span></div>
                                </div>
                            </div>
                            {resultShown ? (
                                <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                    <Tex block>{formula}</Tex>
                                    <Tex block>{formulaLen}</Tex>
                                    <Tex block>{formulaPerp}</Tex>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">The cross product appears once the tour reaches it.</p>
                            )}
                            <p className="text-xs text-slate-500">
                                Each component of a × b leaves out one axis: the x-component uses only y and z, and so on round the cycle x → y → z → x. That cycle is where the right-hand rule comes from.
                            </p>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Three facts about a × b</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-pink-400 font-semibold">Direction</span> — perpendicular to a and b, chosen by the right-hand rule.</li>
                            <li><span className="text-yellow-300 font-semibold">Length</span> — |a||b| sin θ, the area of the parallelogram.</li>
                            <li><span className="text-slate-200 font-semibold">Order</span> — b × a = −(a × b). Parallel vectors give 0.</li>
                            <li><span className="text-sky-300 font-semibold">Contrast</span> — the dot product is largest for parallel vectors; the cross product vanishes there.</li>
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
