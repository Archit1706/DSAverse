"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Vector, Segment, Point, MATH_COLORS, usePlane } from '@/components/math/Plane2D';
import MatrixInput from '@/components/math/MatrixInput';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   p is a number ≥ 1, or Infinity for the largest-component norm. */
const pNorm = (v, p) => {
    if (p === Infinity) return Math.max(...v.map(Math.abs));
    if (p === 1) return v.reduce((s, x) => s + Math.abs(x), 0);
    if (p === 2) return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return v.reduce((s, x) => s + Math.abs(x) ** p, 0) ** (1 / p);
};
const normalize = (v, p) => {
    const L = pNorm(v, p);
    return L < 1e-12 ? v.map(() => 0) : v.map(x => x / L);
};
/** The curve ‖x‖ₚ = r, as points around the origin. */
const ballPoints = (p, r = 1, samples = 160) => {
    const pts = [];
    for (let i = 0; i < samples; i++) {
        const t = (2 * Math.PI * i) / samples;
        const d = [Math.cos(t), Math.sin(t)];
        const L = pNorm(d, p);
        pts.push([(r * d[0]) / L, (r * d[1]) / L]);
    }
    return pts;
};
const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const pair = ([x, y]) => `(${num(x)}, ${num(y)})`;
const pName = (p) => (p === Infinity ? '∞' : num(p));
const sub = (p) => (p === Infinity ? '∞' : p === 1 ? '₁' : p === 2 ? '₂' : `${num(p)}`);
const normText = (p) => (p === 1 || p === 2 || p === Infinity ? `‖v‖${sub(p)}` : `‖v‖ with p = ${num(p)}`);

const NORM_COLORS = { 1: MATH_COLORS.b, 2: MATH_COLORS.curve, [Infinity]: MATH_COLORS.curve2 };
const colorOf = (p) => NORM_COLORS[p] ?? '#e2e8f0';

const VALUE_PRESETS = [
    { v: [-2, 1], p: 1 },
    { v: [1.2, -1.6], p: 2 },
    { v: [-2.5, 1], p: Infinity },
    { v: [1.5, 1.5], p: 2 },
];
const UNIT_PRESETS = [
    { v: [-1.5, 2], p: 2 },
    { v: [2, 2], p: 1 },
    { v: [-1, -2.5], p: Infinity },
    { v: [2.4, -1.8], p: 2 },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    const push = (s) => steps.push({ show: [], levels: [], balls: [], unit: null, ...s });
    let prompt = 0;
    const V = [1.5, 2];
    push({ kind: 'opening', v: V,
        explanation: 'How long is v = (1.5, 2)? That sounds like it has one answer, but "length" is a choice. A norm is a rule for measuring vectors, and different rules suit different jobs.' });
    push({ kind: 'teach', v: V, levels: [2],
        explanation: 'The straight-line length, the L2 norm: ‖v‖₂ = √(1.5² + 2²) = 2.5. The dashed circle is every point exactly 2.5 away from the origin this way.' });
    push({ kind: 'teach', v: V, levels: [1], show: ['taxi'],
        explanation: 'The taxicab length, the L1 norm: walk only along grid lines, 1.5 across and 2 up, so ‖v‖₁ = |1.5| + |2| = 3.5. Every point with taxicab length 3.5 lies on the dashed diamond.' });
    push({ kind: 'teach', v: V, levels: [Infinity],
        explanation: 'The largest-component length, the L∞ norm: ‖v‖∞ = max(|1.5|, |2|) = 2. Points with largest component 2 form the dashed square.' });
    push({ kind: 'teach', v: V, balls: [1, 2, Infinity],
        explanation: 'Now the "unit circles": every point whose length is exactly 1. In L2 it is the familiar circle, in L1 a diamond, in L∞ a square. Same idea, three shapes.' });
    [[2, 'Normalising divides by the length. v / ‖v‖₂ = (1.5, 2) / 2.5 = (0.6, 0.8): same direction, L2 length 1, so it sits on the circle. That is a unit vector.'],
        [1, 'Divide by the L1 length instead: v / 3.5 = (0.43, 0.57). It points the same way but lands on the diamond — a unit vector for the taxicab norm.'],
        [Infinity, 'And v / ‖v‖∞ = v / 2 = (0.75, 1): on the square. Three unit vectors in the same direction, each the right length for its own norm.'],
    ].forEach(([p, text]) => push({ kind: 'teach', v: V, balls: [1, 2, Infinity], unit: p, explanation: text }));
    push({ kind: 'teach', v: V, balls: [1, 2, Infinity], levels: [1, 2, Infinity],
        explanation: 'Notice the nesting: the diamond sits inside the circle, which sits inside the square. So for every vector ‖v‖∞ ≤ ‖v‖₂ ≤ ‖v‖₁ — here 2 ≤ 2.5 ≤ 3.5.' });
    push({ kind: 'teach', v: V, balls: [1, 1.5, 2, 3, 6, Infinity],
        explanation: 'L1, L2 and L∞ are members of one family, ‖v‖ₚ = (|x|ᵖ + |y|ᵖ)^(1/p). As p grows from 1 the unit shape swells from the diamond through the circle toward the square.' });

    const order = ['value', 'unit', 'value', 'unit', 'value', 'unit', 'value', 'unit'];
    const count = { value: 0, unit: 0 };
    order.forEach((type) => {
        const i = count[type]++;
        const { v, p } = (type === 'value' ? VALUE_PRESETS : UNIT_PRESETS)[i];
        if (type === 'value') {
            push({ kind: 'value-intro', v, p, slot: (prompt++ * 3 + 1) % 4, presetIndex: i,
                explanation: `v = ${pair(v)}. What is ${normText(p)}?` });
            push({ kind: 'value', v, p, levels: [p], show: p === 1 ? ['taxi'] : [], presetIndex: i,
                explanation: `${normText(p)} = ${num(pNorm(v, p))}. For comparison ‖v‖₁ = ${num(pNorm(v, 1))}, ‖v‖₂ = ${num(pNorm(v, 2))} and ‖v‖∞ = ${num(pNorm(v, Infinity))}.` });
        } else {
            push({ kind: 'unit-intro', v, p, balls: [p], slot: (prompt++ * 3 + 1) % 4, presetIndex: i,
                explanation: `v = ${pair(v)}. Where does v / ${normText(p)} land?` });
            push({ kind: 'unit', v, p, balls: [p], unit: p, presetIndex: i,
                explanation: `${normText(p)} = ${num(pNorm(v, p))}, so v / ${normText(p)} = ${pair(normalize(v, p))}. It lies on the ${p === 1 ? 'diamond' : p === 2 ? 'circle' : 'square'}: its own ${p === 1 ? 'L1' : p === 2 ? 'L2' : 'L∞'} length is 1.` });
        }
    });
    push({ kind: 'closing', v: V, balls: [1, 2, Infinity], unit: 2,
        explanation: 'A norm decides what "length" means, its unit shape shows the choice, and dividing by it makes a unit vector. Switch to Explore and drag v, or slide p.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   "What is ‖v‖ₚ?" offers the other two norms — the confusion this page is
   about — and the sum of squares (the square root forgotten). "Where does the
   unit vector land?" offers v divided by the other two norms, and by the
   squared length. Duplicates are replaced from further down the list. */
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
    const { v, p } = step;
    const others = [1, 2, Infinity].filter(q => q !== p);
    const squares = v[0] * v[0] + v[1] * v[1];
    if (step.kind === 'value-intro') {
        const correct = pNorm(v, p);
        const ordered = pickWrong(correct, [...others.map(q => pNorm(v, q)), squares, Math.abs(v[0] + v[1]), correct + 1], num);
        ordered.splice(step.slot, 0, correct);
        return {
            question: `v = ${pair(v)}. What is ${normText(p)}?`,
            options: ordered.map(num),
            correct: step.slot,
            because: p === 1 ? `Add the sizes of the components: |${num(v[0])}| + |${num(v[1])}| = ${num(correct)}.`
                : p === 2 ? `Pythagoras: √(${num(v[0])}² + ${num(v[1])}²) = √${num(squares)} = ${num(correct)}.`
                    : `Take the largest component size: max(|${num(v[0])}|, |${num(v[1])}|) = ${num(correct)}.`,
        };
    }
    if (step.kind === 'unit-intro') {
        const correct = normalize(v, p);
        const ordered = pickWrong(correct, [...others.map(q => normalize(v, q)), v.map(x => x / squares), v.map(x => -x / pNorm(v, p))], pair);
        ordered.splice(step.slot, 0, correct);
        return {
            question: `v = ${pair(v)}. Where does v / ${normText(p)} land?`,
            options: ordered.map(pair),
            correct: step.slot,
            because: `${normText(p)} = ${num(pNorm(v, p))}, and dividing each component by it gives ${pair(correct)} — the same direction, length 1 in this norm.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'v = (3, −4). What is its L1 (taxicab) norm?',
        options: ['5', '7', '4', '1'],
        correct: 1,
        explanation: 'L1 adds the sizes of the components: |3| + |−4| = 7. The straight-line L2 length is 5, and the largest component, L∞, is 4.',
    },
    {
        question: 'Why is the L∞ "unit circle" a square?',
        options: [
            'Because squares tile the plane',
            'Because it only counts the x-component',
            'Because max(|x|, |y|) = 1 means one coordinate is ±1 and the other is anywhere between −1 and 1',
            'Because ∞ is not a real number',
        ],
        correct: 2,
        explanation: 'Points where the larger of |x| and |y| is exactly 1 are those on the lines x = ±1 or y = ±1, within the other coordinate\'s range — the four edges of the square from (−1, −1) to (1, 1).',
    },
    {
        question: 'Normalise v = (0, −5) with the L2 norm. What do you get?',
        options: ['(0, 1)', '(0, −5)', '(0, −0.2)', '(0, −1)'],
        correct: 3,
        explanation: '‖v‖₂ = 5, and (0, −5) / 5 = (0, −1). Normalising keeps the direction — still pointing down — and only changes the length to 1. (0, −0.2) divides by 25, the squared length.',
    },
];

const codeExample = `import numpy as np

v = np.array([1.5, 2.0])

print(np.linalg.norm(v, 1))        # 3.5 -- taxicab: |x| + |y|
print(np.linalg.norm(v))           # 2.5 -- straight line: sqrt(x^2 + y^2)
print(np.linalg.norm(v, np.inf))   # 2.0 -- largest component

u = v / np.linalg.norm(v)          # normalise
print(u, np.linalg.norm(u))        # [0.6 0.8] 1.0 -- a unit vector

# The three always come in this order
assert np.linalg.norm(v, np.inf) <= np.linalg.norm(v) <= np.linalg.norm(v, 1)`;

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

/** A closed curve through world points, as an outline. */
function Curve({ points, color, width = 2, dashed = false, opacity = 1 }) {
    const { toScreen } = usePlane();
    const d = points.map(p => toScreen(p).map(x => x.toFixed(2)).join(',')).join(' ');
    return <polygon points={d} fill="none" stroke={color} strokeWidth={width} opacity={opacity}
        strokeDasharray={dashed ? '6 5' : undefined} strokeLinejoin="round" />;
}

const CHIPS = [[1, 'L1'], [2, 'L2'], [Infinity, 'L∞'], ['p', 'Lp']];

export default function NormsAndUnitVectorsPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [v, setV] = useState([1.5, 2]);
    const [chip, setChip] = useState(2);          // which norm Explore normalises with
    const [pCustom, setPCustom] = useState(3);
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
    const p = chip === 'p' ? pCustom : chip;
    const V = guided ? step.v : v;
    const balls = guided ? step.balls : [1, 2, Infinity, ...(chip === 'p' ? [pCustom] : [])];
    const levels = guided ? step.levels : [p];
    const unit = guided ? step.unit : p;
    const show = guided ? step.show : (p === 1 ? ['taxi'] : []);
    const hideNumbers = guided && predict.hideExplanation;
    const n1 = pNorm(V, 1), n2 = pNorm(V, 2), nInf = pNorm(V, Infinity);
    const u = unit === null ? null : normalize(V, unit);

    const takeOver = () => {
        if (guided) {
            setV(step.v);
            if (step.unit !== null) setChip(step.unit);
            setMode('explore'); setIsPlaying(false);
        }
    };
    const ballCache = useMemo(() => new Map(), []);
    const unitBall = (q) => {
        if (!ballCache.has(q)) ballCache.set(q, ballPoints(q));
        return ballCache.get(q);
    };

    const formula = useMemo(() => {
        const C1 = NORM_COLORS[1], C2 = NORM_COLORS[2], CI = NORM_COLORS[Infinity];
        const [x, y] = V;
        const sq = (z) => (z < 0 ? `(${fmt(z)})^2` : `${fmt(z)}^2`);
        return [
            String.raw`\textcolor{${C1}}{\|\mathbf{v}\|_1} = |${fmt(x)}| + |${fmt(y)}| = ${fmt(n1)}`,
            String.raw`\textcolor{${C2}}{\|\mathbf{v}\|_2} = \sqrt{${sq(x)} + ${sq(y)}} = ${fmt(n2)}`,
            String.raw`\textcolor{${CI}}{\|\mathbf{v}\|_\infty} = \max(|${fmt(x)}|, |${fmt(y)}|) = ${fmt(nInf)}`,
        ].join(String.raw` \qquad `);
    }, [V, n1, n2, nInf]);
    const formulaUnit = useMemo(() => {
        if (unit === null) return null;
        const L = pNorm(V, unit);
        const name = unit === Infinity ? String.raw`\infty` : fmt(unit);
        return String.raw`\hat{\mathbf{v}} = \frac{\mathbf{v}}{\|\mathbf{v}\|_{${name}}} = \frac{(${fmt(V[0])}, ${fmt(V[1])})}{${fmt(L)}} = (${fmt(u[0])}, ${fmt(u[1])}), \qquad \|\hat{\mathbf{v}}\|_{${name}} = ${fmt(pNorm(u, unit))}`;
    }, [unit, V, u]);

    const exploreNote = n2 < 1e-9
        ? 'The zero vector has length 0 in every norm, and there is no direction to keep, so it cannot be normalised.'
        : `In this norm v has length ${num(pNorm(V, p))}, so v / ${num(pNorm(V, p))} = ${pair(normalize(V, p))} lands on its unit shape. The order never changes: ‖v‖∞ = ${num(nInf)} ≤ ‖v‖₂ = ${num(n2)} ≤ ‖v‖₁ = ${num(n1)}.`;

    const valueShown = !guided || !/-intro$/.test(step.kind);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/vectors" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Vectors
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Norms and Unit Vectors</h1>
                    <p className="text-sky-100 max-w-3xl">
                        Straight-line, taxicab or largest component: three ways to say how long a vector is, three different &quot;unit circles&quot;, and one way to make any vector length 1.
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
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag v, or pick a norm to normalise with'}
                            </span>
                        </div>

                        <Plane2D xRange={[-3, 3]} yRange={[-3, 3]} grid={0.5} ariaLabel="The vector v, the unit shapes of the L1, L2 and L-infinity norms, and v normalised">
                            {levels.map(q => (
                                <Curve key={`level${q}`} points={ballPoints(q, pNorm(V, q))} color={colorOf(q)} width={1.5} dashed opacity={0.55} />
                            ))}
                            {balls.map(q => (
                                <Curve key={`ball${q}`} points={unitBall(q)} color={colorOf(q)} width={NORM_COLORS[q] ? 2.5 : 1.2} opacity={NORM_COLORS[q] ? 0.95 : 0.5} />
                            ))}
                            {show.includes('taxi') && (
                                <>
                                    <Segment from={[0, 0]} to={[V[0], 0]} color={NORM_COLORS[1]} width={3} dashed />
                                    <Segment from={[V[0], 0]} to={V} color={NORM_COLORS[1]} width={3} dashed />
                                </>
                            )}
                            <Vector to={V} color={MATH_COLORS.a} width={3} label="v" onDrag={(q) => { takeOver(); setV(q); }} snap={0.1} />
                            {u && pNorm(V, 2) > 1e-9 && (
                                <>
                                    <Vector to={u} color={colorOf(unit)} width={4} label="v̂" labelOffset={[-22, -6]} />
                                    <Point at={u} color={colorOf(unit)} r={4} />
                                </>
                            )}
                        </Plane2D>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(x => !x)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
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
                            <div className="mt-4 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500">Normalise with</span>
                                    {CHIPS.map(([key, label]) => (
                                        <button key={label} onClick={() => setChip(key)} aria-pressed={chip === key}
                                            className={`text-xs px-3 py-1.5 rounded-lg border font-mono ${chip === key ? 'border-sky-500 bg-sky-500/15 text-sky-200' : 'border-slate-700 text-slate-300 hover:border-sky-500'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                {chip === 'p' && (
                                    <ParamSlider label="p" value={pCustom} onChange={setPCustom} min={1} max={8} step={0.25} accent="sky"
                                        format={num} hint="p = 1 is the diamond, p = 2 the circle, and large p approaches the square." />
                                )}
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
                                <MatrixInput label="v" value={[[V[0]], [V[1]]]} step={0.1} min={-3} max={3} columnColors={[MATH_COLORS.a]}
                                    onChange={(m) => { takeOver(); setV([m[0][0], m[1][0]]); }} />
                                {!guided && chip === 'p' && (
                                    <div className="text-sm text-slate-400">‖v‖ with p = {num(pCustom)}: <span className="font-mono text-slate-100">{num(pNorm(V, pCustom))}</span></div>
                                )}
                            </div>
                            {valueShown ? (
                                <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                    <Tex block>{formula}</Tex>
                                    {formulaUnit && <Tex block>{formulaUnit}</Tex>}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">The lengths appear once the tour reaches them.</p>
                            )}
                            <p className="text-xs text-slate-500">
                                Purple is L1, blue is L2, orange is L∞. Solid shapes are the unit &quot;circles&quot;; dashed ones pass through v&apos;s tip.
                            </p>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Three norms</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-purple-300 font-semibold">L1</span> — |x| + |y|: walking the grid. Unit shape: a diamond.</li>
                            <li><span className="text-sky-300 font-semibold">L2</span> — √(x² + y²): as the crow flies. Unit shape: a circle.</li>
                            <li><span className="text-orange-300 font-semibold">L∞</span> — max(|x|, |y|): the worst component. Unit shape: a square.</li>
                            <li><span className="text-slate-200 font-semibold">Unit vector</span> — v divided by its length, so its length is 1.</li>
                        </ul>
                        <p className="text-xs text-slate-500 mt-3">Ridge regression penalises the L2 norm of the weights; lasso penalises L1, whose diamond&apos;s corners push weights to exactly 0.</p>
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
