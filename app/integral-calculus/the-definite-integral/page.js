"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, Segment, FunctionPlot, ShadeUnder, Polygon, Label, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Each function carries an antiderivative F and its roots, so the signed
   integral and its positive and negative parts are exact. */
const FUNCS = [
    {
        id: 'parabola', name: '0.75(x − 1)(x − 3)', tex: String.raw`\tfrac{3}{4}(x - 1)(x - 3)`,
        f: (x) => 0.75 * (x - 1) * (x - 3), F: (x) => 0.25 * x ** 3 - 1.5 * x * x + 2.25 * x,
        roots: [1, 3], a: 0, b: 4, xRange: [-0.6, 4.6], yRange: [-1.4, 2.8], lim: [0, 4.4],
    },
    {
        id: 'sine', name: '1.5 sin x', tex: String.raw`1.5\sin x`,
        f: (x) => 1.5 * Math.sin(x), F: (x) => -1.5 * Math.cos(x),
        roots: [Math.PI, 2 * Math.PI], a: 0, b: 2 * Math.PI, xRange: [-0.5, 6.9], yRange: [-2, 2], lim: [0, 6.7],
    },
];

const integral = (fn, a, b) => fn.F(b) - fn.F(a);

/** The signed integral split at the roots: Σ of positive pieces and of negative pieces. */
const parts = (fn, a, b) => {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const cuts = [lo, ...fn.roots.filter(r => r > lo && r < hi), hi];
    let pos = 0, neg = 0;
    for (let i = 0; i + 1 < cuts.length; i++) {
        const v = integral(fn, cuts[i], cuts[i + 1]);
        if (v >= 0) pos += v; else neg += v;
    }
    const sign = a <= b ? 1 : -1;      // reversed limits flip every piece
    return { pos: sign * pos, neg: sign * neg, total: integral(fn, a, b), geometric: pos - neg };
};

/** Midpoint Riemann sum, with heights that keep their sign. */
const midpointSum = (fn, a, b, n) => {
    const dx = (b - a) / n;
    let s = 0;
    for (let i = 0; i < n; i++) s += fn.f(a + (i + 0.5) * dx);
    return s * dx;
};

const num = (x, d = 4) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 4);
const signOf = (v) => (Math.abs(v) < 1e-9 ? 'Zero' : v > 0 ? 'Positive' : 'Negative');

const SIGNS = ['Positive', 'Negative', 'Zero'];
/* Six intervals of the parabola, two with each sign of answer. */
const INTERVALS = [[0, 1], [1, 3], [0, 3], [3, 4], [1, 4], [2, 3]];
const TOUR_N = [4, 8, 16, 64];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const fn = FUNCS[0];
    const steps = [];
    const push = (s) => steps.push({ fnIndex: 0, n: 0, a: 0, b: 4, colour: true, ...s });
    push({
        kind: 'opening', colour: false,
        explanation: 'f(x) = 0.75(x − 1)(x − 3) dips below the x-axis between 1 and 3. What should "the area under it" from 0 to 4 mean, when part of it is under the axis?',
    });
    TOUR_N.forEach((n, k) => {
        const S = midpointSum(fn, 0, 4, n);
        push({
            kind: 'riemann', n, k,
            explanation: `${n} midpoint rectangles. Where f is negative the rectangle hangs below the axis and its "area" f(xᵢ)·Δx is negative. Sum = ${num(S)}.${k === TOUR_N.length - 1 ? ' The sums settle on 1: that limit is the definite integral.' : ''}`,
        });
    });
    const p = parts(fn, 0, 4);
    push({
        kind: 'signed',
        explanation: `So the integral is a signed area: the yellow pieces count +${num(p.pos)} and the rose piece ${num(p.neg)}. ∫₀⁴ f(x) dx = ${num(p.pos)} + (${num(p.neg)}) = ${num(p.total)}. The total shaded area, ignoring signs, would be ${num(p.geometric)}.`,
    });
    INTERVALS.forEach(([a, b], i) => {
        push({ kind: 'ask', a, b, colour: false, i, explanation: `Now just from x = ${a} to x = ${b}. Look at how much of the curve is above the axis there, and how much below.` });
        const v = integral(fn, a, b);
        push({
            kind: 'show', a, b, i,
            explanation: `∫${sub(a)}${sup(b)} f(x) dx = F(${b}) − F(${a}) = ${num(v)}: ${signOf(v).toLowerCase()}.${Math.abs(v) < 1e-9 ? ' The piece above and the piece below have exactly the same size, so they cancel.' : ''}`,
        });
    });
    push({
        kind: 'reverse', a: 4, b: 0,
        explanation: `Run the interval backwards, from 4 down to 0, and every Δx is negative: ∫₄⁰ f(x) dx = −∫₀⁴ f(x) dx = ${num(integral(fn, 4, 0))}.`,
    });
    push({
        kind: 'closing',
        explanation: '∫ₐᵇ f(x) dx is the limit of Riemann sums: area above the axis counts positive, area below counts negative, and reversing the limits flips the sign. Switch to Explore to drag a and b.',
    });
    return steps;
};
function sub(n) { return String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[Number(d)] ?? d).join(''); }
function sup(n) { return String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)] ?? d).join(''); }
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each interval's value appears: positive, negative or zero? The
   options keep one order; across the six intervals each is right twice. */
const predictFor = (step, next) => {
    if (!step || !next || step.kind !== 'ask' || next.kind !== 'show') return null;
    const fn = FUNCS[next.fnIndex];
    const v = integral(fn, next.a, next.b);
    const p = parts(fn, next.a, next.b);
    return {
        question: `Is ∫ from ${next.a} to ${next.b} of f(x) dx positive, negative or zero?`,
        options: SIGNS, correct: SIGNS.indexOf(signOf(v)),
        because: `Above the axis: ${num(p.pos)}. Below: ${num(p.neg)}. Together: ${num(v)}.`,
    };
};

const quizQuestions = [
    {
        question: 'What is the integral of sin x from 0 to 2π?',
        options: ['4', '2', '0', '−2'],
        correct: 2,
        explanation: 'The hump from 0 to π has area 2 above the axis; the trough from π to 2π has area 2 below it, which counts −2. They cancel: 2 + (−2) = 0. The total shaded area, ignoring signs, would be 4.',
    },
    {
        question: '∫₀³ f(x) dx = 5. What is ∫₃⁰ f(x) dx?',
        options: ['5', '−5', '0', '1/5'],
        correct: 1,
        explanation: 'Reversing the limits makes every Δx negative, so the integral changes sign: ∫₃⁰ f = −∫₀³ f = −5.',
    },
    {
        question: '∫₀² f = 3 and ∫₂⁵ f = −1. What is ∫₀⁵ f?',
        options: ['4', '2', '−3', '3'],
        correct: 1,
        explanation: 'Integrals over neighbouring intervals add: ∫₀⁵ f = ∫₀² f + ∫₂⁵ f = 3 + (−1) = 2.',
    },
];

const codeExample = `import numpy as np

f = lambda x: 0.75 * (x - 1) * (x - 3)
F = lambda x: 0.25 * x**3 - 1.5 * x**2 + 2.25 * x     # an antiderivative

def midpoint(f, a, b, n):
    dx = (b - a) / n
    return dx * np.sum(f(a + (np.arange(n) + 0.5) * dx))

for n in [4, 16, 64, 256]:
    print(n, midpoint(f, 0, 4, n))      # -> 1.0, the signed area
print(F(4) - F(0))                       # 1.0 exactly

# pieces: +1 on [0, 1], -1 on [1, 3], +1 on [3, 4]
print(F(1) - F(0), F(3) - F(1), F(4) - F(3))
print(midpoint(f, 4, 0, 64))             # limits reversed: -1.0`;

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

export default function TheDefiniteIntegralPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [fnIndex, setFnIndex] = useState(0);      // explore-mode state
    const [ab, setAb] = useState([0, 4]);
    const [n, setN] = useState(0);
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
    const [A, B] = guided ? [step.a, step.b] : ab;
    const N = guided ? step.n : n;
    const colour = guided ? step.colour : true;
    const lo = Math.min(A, B), hi = Math.max(A, B);
    const p = parts(fn, A, B);

    /* Grabbing an end point during the tour switches to Explore, starting
       from whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setFnIndex(step.fnIndex); setAb([step.a, step.b]); setN(step.n);
        setMode('explore'); setIsPlaying(false);
    };
    const clampX = (x) => Math.min(Math.max(x, fn.lim[0]), fn.lim[1]);
    const moveA = ([x]) => { takeOver(); setAb(([, b]) => [clampX(x), b]); };
    const moveB = ([x]) => { takeOver(); setAb(([a]) => [a, clampX(x)]); };

    const rects = [];
    if (N > 0) {
        const dx = (B - A) / N;
        for (let i = 0; i < N; i++) {
            const x0 = A + i * dx, h = fn.f(A + (i + 0.5) * dx);
            rects.push({ pts: [[x0, 0], [x0 + dx, 0], [x0 + dx, h], [x0, h]], positive: h * Math.sign(dx) >= 0 });
        }
    }
    const hide = guided && predict.hideExplanation;
    const showValue = !(guided && step.kind === 'ask');
    const formula = String.raw`\int_{${fmt(A)}}^{${fmt(B)}} ${fn.tex}\,dx = F(${fmt(B)}) - F(${fmt(A)}) = ${fmt(p.total)}`;
    const partsLine = String.raw`\textcolor{${MATH_COLORS.area}}{${fmt(p.pos)}} + (\textcolor{${MATH_COLORS.negative}}{${fmt(p.neg)}}) = ${fmt(p.total)}, \qquad \text{total area ignoring signs} = ${fmt(p.geometric)}`;
    const sumLine = N > 0 ? String.raw`\text{midpoint sum, } n = ${N}: \; ${fmt(midpointSum(fn, A, B, N))}` : null;

    const exploreNote = A > B
        ? `a is to the right of b, so the interval runs backwards and the sign flips: ∫ from ${num(A, 2)} to ${num(B, 2)} is ${num(p.total)}, the negative of ∫ from ${num(B, 2)} to ${num(A, 2)}.`
        : `From ${num(A, 2)} to ${num(B, 2)}: ${num(p.pos)} above the axis and ${num(p.neg)} below, so the integral is ${num(p.total)}. ${Math.abs(p.total) < 1e-6 ? 'They cancel exactly.' : ''}`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/integral-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Integral Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Definite Integral</h1>
                    <p className="text-teal-50 max-w-3xl">
                        The limit of Riemann sums is a signed area: above the axis counts positive, below counts negative, and running the interval backwards flips it all.
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
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag a and b — even past each other'}
                            </span>
                        </div>

                        <Plane2D xRange={fn.xRange} yRange={fn.yRange} ariaLabel={`Signed area under f(x) = ${fn.name} from ${num(A, 2)} to ${num(B, 2)}`}>
                            {colour
                                ? <ShadeUnder f={fn.f} from={lo} to={hi} color={MATH_COLORS.area} negativeColor={MATH_COLORS.negative} opacity={N > 0 ? 0.12 : 0.35} />
                                : <ShadeUnder f={fn.f} from={lo} to={hi} color="#64748b" opacity={0.25} />}
                            {rects.map((r, i) => (
                                <Polygon key={i} points={r.pts} fill={r.positive ? MATH_COLORS.area : MATH_COLORS.negative} fillOpacity={0.3} strokeWidth={N > 30 ? 0.5 : 1.2} />
                            ))}
                            <FunctionPlot f={fn.f} color={MATH_COLORS.curve} />
                            {colour && N === 0 && fn.id === 'parabola' && lo <= 0.2 && hi >= 3.8 && (
                                <>
                                    <Label at={[0.45, 0.5]} anchor="middle" color={MATH_COLORS.area} size={14} weight={700}>+1</Label>
                                    <Label at={[2, -0.35]} anchor="middle" color={MATH_COLORS.negative} size={14} weight={700}>−1</Label>
                                    <Label at={[3.55, 0.5]} anchor="middle" color={MATH_COLORS.area} size={14} weight={700}>+1</Label>
                                </>
                            )}
                            <Segment from={[A, fn.yRange[0]]} to={[A, fn.yRange[1]]} color={MATH_COLORS.a} width={1} dashed opacity={0.5} />
                            <Segment from={[B, fn.yRange[0]]} to={[B, fn.yRange[1]]} color={MATH_COLORS.a} width={1} dashed opacity={0.5} />
                            <Point at={[A, 0]} color={MATH_COLORS.a} r={6} label="a" labelOffset={[-4, 18]} onDrag={moveA} snap={0.05}
                                constrain={([x]) => [x, 0]} ariaLabel={`Lower limit a = ${num(A, 2)}; drag along the x-axis`} />
                            <Point at={[B, 0]} color={MATH_COLORS.result} r={6} label="b" labelOffset={[-4, 18]} onDrag={moveB} snap={0.05}
                                constrain={([x]) => [x, 0]} ariaLabel={`Upper limit b = ${num(B, 2)}; drag along the x-axis`} />
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
                                    <button onClick={() => setAb(([a, b]) => [b, a])}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-teal-500">Swap a and b</button>
                                </div>
                                <ParamSlider label="Midpoint rectangles n (0 = none)" value={n} onChange={setN} min={0} max={80} step={1} accent="teal" />
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
                        {showValue && !hide ? (
                            <>
                                <Tex block>{formula}</Tex>
                                <Tex block>{partsLine}</Tex>
                                {sumLine && <Tex block>{sumLine}</Tex>}
                            </>
                        ) : (
                            <Tex block>{String.raw`\int_{${fmt(A)}}^{${fmt(B)}} ${fn.tex}\,dx = \;?`}</Tex>
                        )}
                        <p className="text-xs text-slate-500">F is an antiderivative of f — here F(x) = {fn.id === 'parabola' ? '0.25x³ − 1.5x² + 2.25x' : '−1.5 cos x'} — and why F(b) − F(a) gives the area is the Fundamental Theorem, next in this section.</p>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Rules of signed area</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-yellow-300 font-semibold">Above the axis</span> — counts positive.</li>
                            <li><span className="text-rose-300 font-semibold">Below the axis</span> — counts negative.</li>
                            <li><span className="text-teal-300 font-semibold">Additivity</span> — a to b, plus b to c, equals a to c.</li>
                            <li><span className="text-teal-300 font-semibold">Reversal</span> — from b to a is minus from a to b.</li>
                            <li><span className="text-slate-200 font-semibold">Total area</span> — ∫|f|, which never cancels.</li>
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
