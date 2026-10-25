"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, FunctionPlot, ShadeUnder, Polygon, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Each function carries an antiderivative F, so the exact area F(b) − F(a)
   is known independently of any sum. */
const FUNCS = [
    {
        id: 'half-square', name: 'x²/2', tex: String.raw`\tfrac{1}{2}x^2`,
        f: (x) => x * x / 2, F: (x) => x ** 3 / 6, a: 0, b: 3,
    },
    {
        id: 'wave', name: '1 + x/3 + 0.6 sin 2x', tex: String.raw`1 + \tfrac{x}{3} + 0.6\sin 2x`,
        f: (x) => 1 + x / 3 + 0.6 * Math.sin(2 * x), F: (x) => x + x * x / 6 - 0.3 * Math.cos(2 * x), a: 0, b: 4,
    },
    {
        id: 'decay', name: '3e^(−x/2)', tex: String.raw`3e^{-x/2}`,
        f: (x) => 3 * Math.exp(-x / 2), F: (x) => -6 * Math.exp(-x / 2), a: 0, b: 4,
    },
];

const RULES = { left: 'Left', right: 'Right', mid: 'Midpoint' };
/** Where rectangle i (of n) takes its height. */
const samplePoint = (rule, a, dx, i) => a + (rule === 'left' ? i : rule === 'right' ? i + 1 : i + 0.5) * dx;

const riemann = (fn, a, b, n, rule) => {
    const dx = (b - a) / n;
    let s = 0;
    for (let i = 0; i < n; i++) s += fn.f(samplePoint(rule, a, dx, i));
    return s * dx;
};
const exactArea = (fn, a, b) => fn.F(b) - fn.F(a);

const num = (x, d = 4) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 4);

/* The tour on x²/2 over [0, 3]: each rule at n = 3, then 6 (twice as many
   rectangles), then 18 (three times as many again). */
const TOUR_RULES = ['left', 'right', 'mid'];
const TOUR_N = [3, 6, 18];
const SHRINK = ['About 1/2', 'About 1/3', 'About 1/4', 'About 1/9'];
const SHRINK_VALUES = [1 / 2, 1 / 3, 1 / 4, 1 / 9];
/** The SHRINK label closest (on a log scale) to an error ratio. */
const nearestShrink = (ratio) => {
    let best = 0;
    SHRINK_VALUES.forEach((v, i) => { if (Math.abs(Math.log(ratio / v)) < Math.abs(Math.log(ratio / SHRINK_VALUES[best]))) best = i; });
    return best;
};

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const fn = FUNCS[0];
    const { a, b } = fn;
    const exact = exactArea(fn, a, b);
    const steps = [];
    let q = 0;
    steps.push({
        kind: 'opening', fnIndex: 0, rule: null, n: 0, a, b,
        explanation: `The area under f(x) = x²/2 from 0 to 3. No formula for areas of curved shapes yet — so fill it with rectangles we can measure. (The true area turns out to be ${num(exact)}.)`,
    });
    TOUR_RULES.forEach((rule) => {
        TOUR_N.forEach((n, k) => {
            const S = riemann(fn, a, b, n, rule);
            const err = Math.abs(S - exact);
            const prev = k ? Math.abs(riemann(fn, a, b, TOUR_N[k - 1], rule) - exact) : null;
            const how = { left: 'its left edge', right: 'its right edge', mid: 'its midpoint' }[rule];
            const note = k === 0
                ? `${RULES[rule]} rule, n = ${n}: each rectangle is Δx = ${num((b - a) / n)} wide and as tall as f at ${how}.`
                : `n = ${n}: the error fell from ${num(prev)} to ${num(err)}, a factor of ${num(err / prev, 3)}.`;
            const lean = rule === 'mid' ? ' The midpoint errs by much less: the bit of each rectangle above the curve nearly cancels the bit below.'
                : S < exact ? ' Every rectangle sits below the rising curve, so the sum is too small.' : ' Every rectangle pokes above the rising curve, so the sum is too big.';
            steps.push({
                kind: 'sum', fnIndex: 0, rule, n, a, b, k, q: q++,
                explanation: `${note} Sum = ${num(S)}, error ${num(err)}.${k === 0 ? lean : ''}`,
            });
        });
    });
    steps.push({
        kind: 'many', fnIndex: 0, rule: 'mid', n: 100, a, b,
        explanation: `With n = 100: left ${num(riemann(fn, a, b, 100, 'left'))}, right ${num(riemann(fn, a, b, 100, 'right'))}, midpoint ${num(riemann(fn, a, b, 100, 'mid'), 6)}. Left and right errors shrink like 1/n; the midpoint error like 1/n² — on the log-log chart, slopes of −1 and −2.`,
    });
    const d = FUNCS[2];
    steps.push({
        kind: 'decreasing', fnIndex: 2, rule: 'left', n: 8, a: d.a, b: d.b,
        explanation: `On a falling curve the roles swap: f(x) = 3e^(−x/2) is highest at each rectangle's left edge, so the left sum overestimates (${num(riemann(d, d.a, d.b, 8, 'left'))} against ${num(exactArea(d, d.a, d.b))}).`,
    });
    steps.push({
        kind: 'closing', fnIndex: 1, rule: 'mid', n: 12, a: FUNCS[1].a, b: FUNCS[1].b,
        explanation: 'Whatever the rule, letting n → ∞ squeezes the error to 0: that limit is the definite integral. Switch to Explore to pick a curve, a rule, an interval and n.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each rule's first sum: its value, against the other rules' values
   and the true area. Before each refinement: by how much will the error
   shrink? The four ratios in a fixed order; across the tour 1/2 and 1/3 are
   each right twice, 1/4 and 1/9 once. */
const predictFor = (step, next) => {
    if (!step || !next || next.kind !== 'sum') return null;
    const fn = FUNCS[next.fnIndex];
    const { a, b, n, rule } = next;
    const exact = exactArea(fn, a, b);
    if (next.k === 0) {
        const correct = riemann(fn, a, b, n, rule);
        const others = ['left', 'right', 'mid'].filter(r => r !== rule).map(r => riemann(fn, a, b, n, r));
        const seen = new Set([num(correct)]);
        const wrong = [];
        for (const w of [...others, exact, (others[0] + others[1]) / 2, correct + 1]) {
            if (wrong.length < 3 && !seen.has(num(w))) { seen.add(num(w)); wrong.push(w); }
        }
        const slot = (next.q + 1) % 4;
        const options = [...wrong];
        options.splice(slot, 0, correct);
        const dx = (b - a) / n;
        const xs = Array.from({ length: n }, (_, i) => samplePoint(rule, a, dx, i));
        return {
            question: `${RULES[rule]} rule with n = ${n} on f(x) = x²/2 over [0, 3]. What is the sum?`,
            options: options.map(v => num(v)), correct: slot,
            because: `Δx = ${num(dx)} and the heights are f(${xs.map(x => num(x)).join('), f(')}) = ${xs.map(x => num(fn.f(x))).join(', ')}. Sum = ${num(dx)} × ${num(correct / dx)} = ${num(correct)}.`,
        };
    }
    const before = Math.abs(riemann(fn, a, b, step.n, rule) - exact);
    const after = Math.abs(riemann(fn, a, b, n, rule) - exact);
    const truth = nearestShrink(after / before);
    const times = n / step.n;
    return {
        question: `${RULES[rule]} rule: n goes from ${step.n} to ${n} (${times === 2 ? 'twice' : times === 3 ? 'three times' : `${num(times)} times`} as many rectangles). The error will shrink to about what fraction?`,
        options: SHRINK, correct: truth,
        because: rule === 'mid'
            ? `Midpoint errors shrink like 1/n²: ${times}× the rectangles gives 1/${times * times} of the error (${num(before)} → ${num(after)}).`
            : `Left and right errors shrink like 1/n: ${times}× the rectangles gives about 1/${times} of the error (${num(before)} → ${num(after)}).`,
    };
};

const quizQuestions = [
    {
        question: 'f is increasing on [a, b]. How does the left Riemann sum compare with the true area?',
        options: ['It is too large', 'It is too small', 'It is exact', 'It depends on n'],
        correct: 1,
        explanation: 'On a rising curve each rectangle takes its height from its left edge, the lowest point of its strip, so every rectangle sits under the curve and the sum underestimates — for every n.',
    },
    {
        question: 'Doubling n cuts the left-sum error roughly in half. What does doubling n do to the midpoint error?',
        options: ['Halves it', 'Cuts it to about a quarter', 'Cuts it to about a tenth', 'Nothing'],
        correct: 1,
        explanation: 'The midpoint rule\'s error is proportional to Δx², i.e. to 1/n². Halving Δx divides the error by 4.',
    },
    {
        question: 'Left sum of f(x) = x² on [0, 2] with n = 2?',
        options: ['1', '2', '4', '8/3'],
        correct: 0,
        explanation: 'Δx = 1, and the left edges are 0 and 1: (f(0) + f(1)) × 1 = 0 + 1 = 1. The true area is 8/3 ≈ 2.67; the sum is far too small because x² is rising.',
    },
];

const codeExample = `import numpy as np

def riemann(f, a, b, n, rule="mid"):
    dx = (b - a) / n
    i = np.arange(n)
    offset = {"left": 0.0, "right": 1.0, "mid": 0.5}[rule]
    return dx * np.sum(f(a + (i + offset) * dx))

f = lambda x: x**2 / 2           # exact area on [0, 3] is 4.5
for n in [3, 6, 12, 24, 48]:
    errs = [abs(riemann(f, 0, 3, n, r) - 4.5) for r in ("left", "right", "mid")]
    print(n, errs)
# left/right errors halve each time n doubles (order 1);
# the midpoint error quarters (order 2).`;

/* ── page ──────────────────────────────────────────────── */

const X_RANGE = [-0.4, 4.4];
const Y_RANGE = [-0.5, 4.8];
const RULE_COLORS = { left: '#fbbf24', right: '#fb7185', mid: '#38bdf8' };

/* Error against n on log-log axes, for all three rules, with the current n marked. */
function ErrorChart({ fn, a, b, n }) {
    const W = 300, H = 150, padL = 34, padB = 20, padT = 8, padR = 8;
    const exact = exactArea(fn, a, b);
    const ns = useMemo(() => Array.from({ length: 60 }, (_, i) => Math.round(10 ** ((i / 59) * Math.log10(200)))).filter((v, i, arr) => i === 0 || v !== arr[i - 1]), []);
    const series = useMemo(() => Object.keys(RULES).map(r => ns.map(k => [k, Math.abs(riemann(fn, a, b, k, r) - exact)])), [fn, a, b, ns, exact]);
    const LX = [0, Math.log10(200)], LY = [-7, 1];
    // Rounded: Math.log10 can differ in its last bit between server and browser.
    const px = (k) => +(padL + ((Math.log10(k) - LX[0]) / (LX[1] - LX[0])) * (W - padL - padR)).toFixed(2);
    const py = (e) => +(padT + (1 - (Math.log10(Math.max(e, 1e-7)) - LY[0]) / (LY[1] - LY[0])) * (H - padT - padB)).toFixed(2);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Error against n on logarithmic axes" className="block">
            <rect x={0} y={0} width={W} height={H} fill="#020617" />
            {[-6, -4, -2, 0].map(e => (
                <g key={e}>
                    <line x1={padL} y1={py(10 ** e)} x2={W - padR} y2={py(10 ** e)} stroke="#1e293b" />
                    <text x={padL - 4} y={py(10 ** e) + 3} fontSize={9} textAnchor="end" fill="#94a3b8">{`1e${e}`.replace('-', '−')}</text>
                </g>
            ))}
            {[1, 10, 100].map(k => (
                <g key={k}>
                    <line x1={px(k)} y1={padT} x2={px(k)} y2={H - padB} stroke="#1e293b" />
                    <text x={px(k)} y={H - 6} fontSize={9} textAnchor="middle" fill="#94a3b8">{`n = ${k}`}</text>
                </g>
            ))}
            {series.map((pts, i) => {
                const r = Object.keys(RULES)[i];
                const d = pts.filter(([, e]) => e > 1e-12).map(([k, e], j) => `${j ? 'L' : 'M'}${px(k).toFixed(1)},${py(e).toFixed(1)}`).join('');
                return <path key={r} d={d} fill="none" stroke={RULE_COLORS[r]} strokeWidth={1.8} />;
            })}
            {n > 0 && <line x1={px(n)} y1={padT} x2={px(n)} y2={H - padB} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.6} />}
        </svg>
    );
}

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
                    className="text-sm px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-teal-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function RiemannSumsPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [fnIndex, setFnIndex] = useState(0);      // explore-mode state
    const [rule, setRule] = useState('mid');
    const [n, setN] = useState(6);
    const [ab, setAb] = useState([0, 3]);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[currentStep];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(c => c + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const guided = mode === 'guided';
    const fn = FUNCS[guided ? step.fnIndex : fnIndex];
    const R = guided ? step.rule : rule;
    const N = guided ? step.n : n;
    const [A, B] = guided ? [step.a, step.b] : ab;
    const exact = exactArea(fn, A, B);
    const S = R ? riemann(fn, A, B, N, R) : null;
    const dx = N > 0 ? (B - A) / N : 0;

    /* Grabbing an end point during the tour switches to Explore, starting
       from whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setFnIndex(step.fnIndex); setRule(step.rule ?? 'mid'); setN(Math.max(1, step.n || 6)); setAb([step.a, step.b]);
        setMode('explore'); setIsPlaying(false);
    };
    const moveA = ([x]) => { takeOver(); setAb(([, b]) => [Math.min(Math.max(x, 0), b - 0.2), b]); };
    const moveB = ([x]) => { takeOver(); setAb(([a]) => [a, Math.max(Math.min(x, 4.2), a + 0.2)]); };

    const rects = [];
    if (R && N > 0) {
        for (let i = 0; i < N; i++) {
            const x0 = A + i * dx, h = fn.f(samplePoint(R, A, dx, i));
            rects.push({ pts: [[x0, 0], [x0 + dx, 0], [x0 + dx, h], [x0, h]], sx: samplePoint(R, A, dx, i), h });
        }
    }

    const formula = (() => {
        if (!R) return String.raw`\text{Area} = \int_{${fmt(A)}}^{${fmt(B)}} ${fn.tex}\,dx = ${fmt(exact)}`;
        const terms = rects.length <= 4
            ? rects.map(r => fmt(r.h)).join(' + ')
            : `${fmt(rects[0].h)} + ${fmt(rects[1].h)} + \\cdots + ${fmt(rects[rects.length - 1].h)}`;
        return String.raw`\sum_{i} f(x_i)\,\Delta x = ${fmt(dx)} \times (${terms}) = ${fmt(S)}`;
    })();
    const exactLine = String.raw`\int_{${fmt(A)}}^{${fmt(B)}} ${fn.tex}\,dx = F(${fmt(B)}) - F(${fmt(A)}) = ${fmt(exact)}, \qquad |\text{error}| = ${S === null ? '0' : texNum(Math.abs(S - exact), 6)}`;
    const hide = guided && predict.hideExplanation;

    const exploreNote = `${RULES[rule]} rule, n = ${n}: sum ${num(S)} against the true ${num(exact)}, error ${num(Math.abs(S - exact), 6)}. ${rule === 'mid' ? 'Double n and the error drops to about a quarter.' : 'Double n and the error roughly halves.'}`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/integral-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Integral Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Riemann Sums</h1>
                    <p className="text-teal-50 max-w-3xl">
                        Measure a curved area with rectangles. Where each one takes its height — left, right or middle — decides how far off the sum is, and how fast it improves.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                                {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={mode === key}
                                        onClick={() => { if (key === 'explore') takeOver(); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {guided ? `${R ? `${RULES[R]} rule, n = ${N} · ` : ''}step ${currentStep + 1} of ${stepHistory.length}` : 'Drag a and b, or change n'}
                            </span>
                        </div>

                        <Plane2D xRange={X_RANGE} yRange={Y_RANGE} ariaLabel={`Area under f(x) = ${fn.name} with ${N} rectangles`}>
                            <ShadeUnder f={fn.f} from={A} to={B} color={MATH_COLORS.area} opacity={R ? 0.12 : 0.3} />
                            {rects.map((r, i) => (
                                <Polygon key={i} points={r.pts} fill={RULE_COLORS[R]} fillOpacity={0.28} stroke={RULE_COLORS[R]} strokeWidth={N > 40 ? 0.5 : 1.2} />
                            ))}
                            <FunctionPlot f={fn.f} domain={[0, 4.4]} color={MATH_COLORS.curve} />
                            {N <= 24 && rects.map((r, i) => <Point key={`s${i}`} at={[r.sx, r.h]} color={RULE_COLORS[R]} r={3} />)}
                            <Point at={[A, 0]} color={MATH_COLORS.a} r={6} label="a" labelOffset={[-4, 18]} onDrag={moveA} snap={0.05}
                                constrain={([x]) => [x, 0]} ariaLabel={`Left end a = ${num(A, 2)}; drag along the x-axis`} />
                            <Point at={[B, 0]} color={MATH_COLORS.a} r={6} label="b" labelOffset={[-4, 18]} onDrag={moveB} snap={0.05}
                                constrain={([x]) => [x, 0]} ariaLabel={`Right end b = ${num(B, 2)}; drag along the x-axis`} />
                        </Plane2D>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(c => Math.max(c - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(v => !v)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(c => Math.min(c + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="teal" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-teal-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    {FUNCS.map((g, i) => (
                                        <button key={g.id} onClick={() => { setFnIndex(i); setAb([g.a, g.b]); }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === fnIndex ? 'border-teal-500 text-teal-300 bg-teal-500/10' : 'border-slate-700 text-slate-300 hover:border-teal-500'}`}>
                                            f(x) = {g.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {Object.entries(RULES).map(([key, label]) => (
                                        <button key={key} onClick={() => setRule(key)}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${key === rule ? 'border-teal-500 text-teal-300 bg-teal-500/10' : 'border-slate-700 text-slate-300 hover:border-teal-500'}`}>
                                            {label} rule
                                        </button>
                                    ))}
                                </div>
                                <ParamSlider label="Number of rectangles n" value={n} onChange={setN} min={1} max={100} step={1} accent="teal" />
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="teal" />}

                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-teal-400 mt-0.5 flex-shrink-0" />
                            <p className="text-teal-200 text-sm leading-relaxed">
                                {guided ? (hide ? 'Make your prediction above to reveal this step.' : step.explanation) : exploreNote}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-3 text-slate-100 text-sm sm:text-base">
                        <Tex block>{formula}</Tex>
                        <Tex block>{exactLine}</Tex>
                        {!hide && (
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Error against n (log scales): <span className="text-amber-300">left</span>, <span className="text-rose-300">right</span>, <span className="text-sky-300">midpoint</span></p>
                                <div className="rounded-lg overflow-hidden border border-slate-800"><ErrorChart fn={fn} a={A} b={B} n={N} /></div>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Three ways to pick a height</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-amber-300 font-semibold">Left</span> — f at the left edge. Too small on a rising curve.</li>
                            <li><span className="text-rose-300 font-semibold">Right</span> — f at the right edge. Too big on a rising curve.</li>
                            <li><span className="text-sky-300 font-semibold">Midpoint</span> — f in the middle. Errors largely cancel: error ∝ 1/n².</li>
                            <li><span className="text-teal-300 font-semibold">As n → ∞</span> — every rule converges to the same number: the integral.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(v => !v)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-teal-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
