"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, Segment, FunctionPlot, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Each function carries its exact derivative, so the page can show the
   secant slope converging to a number it knows independently. */
const FUNCS = [
    { id: 'half-square', name: 'x²/2', tex: String.raw`\tfrac{1}{2}x^2`, f: (x) => x * x / 2, df: (x) => x, dfText: 'x', dfTex: 'x', xMin: -1.95, xMax: 2.8 },
    { id: 'sine', name: 'sin x', tex: String.raw`\sin x`, f: Math.sin, df: Math.cos, dfText: 'cos x', dfTex: String.raw`\cos x`, xMin: -1.95, xMax: 3.45 },
    { id: 'cubic', name: 'x³/3 − x + 1', tex: String.raw`\tfrac{1}{3}x^3 - x + 1`, f: (x) => x ** 3 / 3 - x + 1, df: (x) => x * x - 1, dfText: 'x² − 1', dfTex: 'x^2 - 1', xMin: -1.95, xMax: 2.5 },
];

/** The difference quotient: the slope of the secant through x and x + h. */
const secantSlope = (fn, x, h) => (fn.f(x + h) - fn.f(x)) / h;

const num = (x, d = 3) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 3);

const X0 = 1;
const H_RIGHT = [1.5, 1, 0.5, 0.25, 0.1, 0.01];
const H_LEFT = [-1, -0.1, -0.01];
const SLOPE_POINTS = [-1.5, -0.5, 0, 1, 2, 3];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    const push = (s) => steps.push({ h: null, tangent: false, slopes: [], derivCurve: false, ...s });
    const fn = FUNCS[0];
    push({
        kind: 'opening', fnIndex: 0, x0: X0,
        explanation: `f(x) = x²/2, and the point P = (1, ${num(fn.f(X0))}). How steep is the curve exactly at P? A slope needs two points, so start with a second point Q, h to the right.`,
    });
    let k = 0;
    for (const h of [...H_RIGHT, ...H_LEFT]) {
        const s = secantSlope(fn, X0, h);
        const first = h === H_LEFT[0];
        push({
            kind: 'secant', fnIndex: 0, x0: X0, h, k: k++,
            explanation: `${first ? 'Now come in from the left, with h negative. ' : ''}h = ${num(h)}: Q = (${num(X0 + h)}, ${num(fn.f(X0 + h))}). The secant through P and Q rises ${num(fn.f(X0 + h) - fn.f(X0))} over a run of ${num(h)}, so its slope is ${num(s)}.`,
        });
    }
    push({
        kind: 'tangent', fnIndex: 0, x0: X0, h: 0.01, tangent: true,
        explanation: `From the right the slopes were ${H_RIGHT.map(h => num(secantSlope(fn, X0, h))).join(', ')}; from the left ${H_LEFT.map(h => num(secantSlope(fn, X0, h))).join(', ')}. Both close in on 1. That limit is the derivative: f′(1) = 1, the slope of the tangent line at P.`,
    });
    FUNCS.slice(0, 2).forEach((g, fnIndex) => {
        const slopes = [];
        push({
            kind: 'traceIntro', fnIndex, x0: SLOPE_POINTS[0], tangent: true, slopes: [],
            explanation: fnIndex === 0
                ? 'The derivative is not one number: every point has its own slope. Slide P along the curve and plot each tangent\'s slope as an orange dot at the same x.'
                : 'Now the same thing on f(x) = sin x. Watch where the tangent is steepest and where it goes flat.',
        });
        SLOPE_POINTS.forEach((x0, j) => {
            slopes.push([x0, g.df(x0)]);
            push({
                kind: 'trace', fnIndex, x0, tangent: true, slopes: [...slopes], j,
                explanation: `At x = ${num(x0)} the tangent to ${g.name} has slope ${num(g.df(x0))}, so the orange dot goes at (${num(x0)}, ${num(g.df(x0))}).${Math.abs(g.df(x0)) < 1e-9 ? ' Slope 0: the tangent is flat here.' : ''}`,
            });
        });
        push({
            kind: 'derivCurve', fnIndex, x0: SLOPE_POINTS[SLOPE_POINTS.length - 1], tangent: true, slopes: [...slopes], derivCurve: true,
            explanation: fnIndex === 0
                ? 'Join the dots: the slopes of x²/2 trace the line f′(x) = x. The derivative is itself a function — the slope at each point.'
                : 'The slopes of sin x trace cos x: steepest (slope 1) at x = 0, flat at the top of the hump near x = 1.57, falling where cos is negative.',
        });
    });
    push({
        kind: 'closing', fnIndex: 2, x0: 1.5, h: 0.5, tangent: true,
        explanation: 'f′(x) = lim h→0 (f(x + h) − f(x))/h. Switch to Explore to drag P and Q on any of the three curves and watch the quotient settle.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each new secant: its slope. Before each new tangent while tracing:
   its slope. The distractors are the usual slips — forgetting to divide by h,
   jumping to the limit early, reading off f(x) instead of the slope, or a
   sign error — and duplicates of the right answer are replaced. */
const pickWrong = (correct, candidates, extra = [0.25, -0.25, 0.5, -0.5, 1, -1]) => {
    const seen = new Set([num(correct)]);
    const wrong = [];
    for (const c of [...candidates, ...extra.map(e => correct + e)]) {
        if (wrong.length === 3) break;
        if (!Number.isFinite(c) || seen.has(num(c))) continue;
        seen.add(num(c));
        wrong.push(c);
    }
    return wrong;
};

const predictFor = (step, next) => {
    if (!step || !next) return null;
    const fn = FUNCS[next.fnIndex];
    if (next.kind === 'secant') {
        const h = next.h;
        const correct = secantSlope(fn, next.x0, h);
        const dy = fn.f(next.x0 + h) - fn.f(next.x0);
        const prev = step.kind === 'secant' ? secantSlope(fn, step.x0, step.h) : 0;
        const wrong = pickWrong(correct, [dy, fn.df(next.x0), prev, fn.f(next.x0 + h) / h]);
        const slot = (next.k * 3 + 1) % 4;
        const ordered = [...wrong];
        ordered.splice(slot, 0, correct);
        return {
            question: `Q moves to h = ${num(h)}. What will the secant's slope be?`,
            options: ordered.map(v => num(v)),
            correct: slot,
            because: `Slope = rise / run = (f(${num(next.x0 + h)}) − f(${num(next.x0)})) / ${num(h)} = ${num(dy)} / ${num(h)} = ${num(correct)}.`,
        };
    }
    if (next.kind === 'trace') {
        const x0 = next.x0;
        const correct = fn.df(x0);
        const prevX = step.kind === 'trace' ? step.x0 : null;
        const wrong = pickWrong(correct, [fn.f(x0), -correct, prevX === null ? NaN : fn.df(prevX), x0]);
        const slot = (next.fnIndex * 2 + next.j * 3 + 2) % 4;
        const ordered = [...wrong];
        ordered.splice(slot, 0, correct);
        return {
            question: `P slides to x = ${num(x0)} on ${fn.name}. What will the tangent's slope be?`,
            options: ordered.map(v => num(v)),
            correct: slot,
            because: `The slope of ${fn.name} at x is ${fn.dfText}, so at x = ${num(x0)} it is ${num(correct)}. f(${num(x0)}) = ${num(fn.f(x0))} is the height, not the slope.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'For f(x) = x² at x = 3, what is the secant slope (f(3 + h) − f(3)) / h with h = 1?',
        options: ['6', '7', '9', '16'],
        correct: 1,
        explanation: '(f(4) − f(3)) / 1 = (16 − 9) / 1 = 7. As h shrinks the secant slope falls towards 6 = 2·3, the derivative. With h = 1 you are still 1 too high: that leftover is exactly h.',
    },
    {
        question: 'f′(2) = 0. What does that tell you about the graph of f?',
        options: ['f(2) = 0', 'The tangent line at x = 2 is horizontal', 'f is undefined at x = 2', 'The graph crosses the x-axis at x = 2'],
        correct: 1,
        explanation: 'f′(2) is the slope of the tangent at x = 2, so a slope of 0 means the tangent is flat there — often a peak, a valley or a pause. It says nothing about the height f(2).',
    },
    {
        question: 'You slide P along y = sin x and plot each tangent\'s slope. Which curve do the dots trace?',
        options: ['sin x', '−sin x', 'cos x', 'tan x'],
        correct: 2,
        explanation: 'The slope of sin x is 1 at x = 0, 0 at the top of the hump (x = π/2) and −1 at x = π — exactly the values of cos x. The derivative of sin x is cos x.',
    },
];

const codeExample = `import numpy as np

def f(x):
    return x**2 / 2

x0 = 1.0
for h in [2, 1, 0.5, 0.1, 0.01, 1e-4]:
    print(h, (f(x0 + h) - f(x0)) / h)   # 2, 1.5, 1.25, 1.05, 1.005, 1.00005 -> 1

# A central difference is far more accurate for the same h:
h = 1e-4
print((f(x0 + h) - f(x0 - h)) / (2 * h))  # 1.0

# The derivative as a function: slopes of sin trace cos.
xs = np.linspace(-2, 3.5, 551)
slopes = np.gradient(np.sin(xs), xs)
print(np.max(np.abs(slopes - np.cos(xs))))   # tiny`;

/* ── page ──────────────────────────────────────────────── */

const X_RANGE = [-2, 3.5];
const Y_RANGE = [-1.5, 4];

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
                    className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-emerald-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/** A line through (x, y) with slope m, drawn across the whole plane. */
function LineThrough({ x, y, m, color, width = 2, dashed = false, opacity = 1 }) {
    const at = (t) => [t, y + m * (t - x)];
    return <Segment from={at(X_RANGE[0])} to={at(X_RANGE[1])} color={color} width={width} dashed={dashed} opacity={opacity} />;
}

export default function TheDerivativePage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1300);
    const [fnIndex, setFnIndex] = useState(0);      // explore-mode state
    const [x0, setX0] = useState(1);
    const [h, setH] = useState(0.5);
    const [showDeriv, setShowDeriv] = useState(false);
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
    const fn = FUNCS[guided ? step.fnIndex : fnIndex];
    const P0 = guided ? step.x0 : x0;
    const hh = guided ? step.h : h;
    const tangent = guided ? step.tangent : true;
    const slopes = guided ? step.slopes : [];
    const derivCurve = guided ? step.derivCurve : showDeriv;

    const fP = fn.f(P0);
    const hasQ = hh !== null && hh !== 0;
    const xQ = hasQ ? P0 + hh : null;
    const fQ = hasQ ? fn.f(xQ) : null;
    const m = hasQ ? secantSlope(fn, P0, hh) : null;
    const mExact = fn.df(P0);

    /* Grabbing a handle during the tour switches to Explore, starting from
       whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setFnIndex(step.fnIndex); setX0(step.x0); setH(step.h ?? 0.5);
        setShowDeriv(step.derivCurve);
        setMode('explore'); setIsPlaying(false);
    };
    const clampX = (x) => Math.min(Math.max(x, fn.xMin), fn.xMax);
    const dragP = ([x]) => { takeOver(); setX0(clampX(x)); };
    const dragQ = ([x]) => {
        takeOver();
        const d = clampX(x) - P0;
        setH(Math.abs(d) < 0.005 ? (d < 0 ? -0.005 : 0.005) : +d.toFixed(3));
    };

    /* While the tour is still tracing slopes, the formula for f′ stays hidden:
       the point is to read each slope off the tangent, not off a formula. */
    const derivKnown = !guided || ['derivCurve', 'closing'].includes(step.kind);
    const formula = useMemo(() => {
        if (!hasQ) return null;
        return String.raw`\frac{f(x_0 + h) - f(x_0)}{h} = \frac{f(${fmt(xQ)}) - f(${fmt(P0)})}{${fmt(hh)}} = \frac{${fmt(fQ)} - ${fmt(fP)}}{${fmt(hh)}} = ${fmt(m)}`;
    }, [hasQ, P0, xQ, hh, fQ, fP, m]);
    const exactLine = derivKnown
        ? String.raw`f(x) = ${fn.tex}, \qquad f'(x) = ${fn.dfTex}, \qquad f'(${fmt(P0)}) = ${fmt(mExact)}`
        : String.raw`f(x) = ${fn.tex}, \qquad \text{tangent slope at } x_0 = ${fmt(P0)}: \; f'(${fmt(P0)}) = ${fmt(mExact)}`;

    const exploreNote = hasQ
        ? `The secant through P and Q has slope ${num(m)}; the tangent at P has slope f′(${num(P0)}) = ${num(mExact)}. The gap is ${num(Math.abs(m - mExact))}${Math.abs(hh) > 0.05 ? ' — drag Q towards P, or shrink h, and watch it close.' : ', nearly gone: this is the limit h → 0 at work.'}`
        : `The tangent at P has slope ${num(mExact)}.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/differential-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Differential Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Derivative</h1>
                    <p className="text-emerald-50 max-w-3xl">
                        A slope needs two points. Bring the second one closer and closer, and the secant becomes the tangent — the slope of the curve at a single point.
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
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag P and Q along the curve'}
                            </span>
                        </div>

                        <Plane2D xRange={X_RANGE} yRange={Y_RANGE} ariaLabel={`Graph of f(x) = ${fn.name} with a secant and tangent at x = ${num(P0)}`}>
                            {derivCurve && <FunctionPlot f={fn.df} color={MATH_COLORS.curve2} width={2} dashed />}
                            <FunctionPlot f={fn.f} color={MATH_COLORS.curve} />
                            {tangent && <LineThrough x={P0} y={fP} m={mExact} color={MATH_COLORS.i} width={2} dashed={hasQ} opacity={hasQ ? 0.7 : 1} />}
                            {hasQ && <LineThrough x={P0} y={fP} m={m} color={MATH_COLORS.a} width={2.5} />}
                            {hasQ && (
                                <>
                                    <Segment from={[P0, fP]} to={[xQ, fP]} color={MATH_COLORS.a} width={1.5} dashed opacity={0.6} />
                                    <Segment from={[xQ, fP]} to={[xQ, fQ]} color={MATH_COLORS.a} width={1.5} dashed opacity={0.6} />
                                </>
                            )}
                            {slopes.map(([x, s]) => <Point key={`s${x}`} at={[x, s]} color={MATH_COLORS.curve2} r={4.5} />)}
                            {hasQ && <Point at={[xQ, fQ]} color={MATH_COLORS.a} label="Q" onDrag={dragQ} snap={0.01}
                                constrain={([x]) => [x, fn.f(x)]} ariaLabel={`Point Q at x = ${num(xQ)}; drag along the curve`} />}
                            <Point at={[P0, fP]} color={MATH_COLORS.i} label="P" onDrag={dragP} snap={0.01}
                                constrain={([x]) => [x, fn.f(x)]} ariaLabel={`Point P at x = ${num(P0)}; drag along the curve`} />
                        </Plane2D>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                            <span><span className="text-sky-400 font-semibold">—</span> f(x) = {fn.name}</span>
                            {hasQ && <span><span className="text-amber-400 font-semibold">—</span> secant through P and Q</span>}
                            {tangent && <span><span className="text-green-400 font-semibold">- -</span> tangent at P</span>}
                            {(derivCurve || slopes.length > 0) && <span><span className="text-orange-400 font-semibold">•</span> {derivKnown ? `f′(x) = ${fn.dfText}` : 'slope of the tangent at each x'}</span>}
                        </div>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="emerald" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-emerald-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    {FUNCS.map((g, i) => (
                                        <button key={g.id} onClick={() => { setFnIndex(i); setX0(v => Math.min(Math.max(v, g.xMin), g.xMax)); }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === fnIndex ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-slate-700 text-slate-300 hover:border-emerald-500'}`}>
                                            f(x) = {g.name}
                                        </button>
                                    ))}
                                    <button onClick={() => setShowDeriv(s => !s)} aria-pressed={showDeriv}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showDeriv ? 'border-orange-500 text-orange-300 bg-orange-500/10' : 'border-slate-700 text-slate-400 hover:border-orange-500'}`}>
                                        {showDeriv ? 'Hide' : 'Show'} f′(x)
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ParamSlider label="x₀ (where P sits)" value={x0} onChange={setX0} min={fn.xMin} max={fn.xMax} step={0.01} accent="emerald" format={num} />
                                    <ParamSlider label="h (how far Q is from P)" value={h} onChange={(v) => setH(v === 0 ? 0.01 : v)} min={-2} max={2} step={0.01} accent="emerald" format={num}
                                        hint="Negative h puts Q to the left of P" />
                                </div>
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="emerald" />}

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p className="text-emerald-200 text-sm leading-relaxed">
                                {guided ? (predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation) : exploreNote}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-3 text-slate-100 text-sm sm:text-base">
                        {formula && <Tex block>{formula}</Tex>}
                        {tangent && <Tex block>{exactLine}</Tex>}
                        <p className="text-xs text-slate-500">
                            The secant slope is rise over run between P and Q. Its limit as h → 0 — when it exists — is the derivative f′(x₀), the slope of the tangent at P.
                        </p>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Reading a derivative</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-amber-300 font-semibold">Secant slope</span> — average rate of change between two points.</li>
                            <li><span className="text-green-300 font-semibold">Tangent slope</span> — the limit as the two points merge: the instantaneous rate.</li>
                            <li><span className="text-orange-300 font-semibold">f′(x)</span> — that slope at every x, which is a function in its own right.</li>
                            <li><span className="text-sky-300 font-semibold">f′ = 0</span> — a flat tangent: a peak, a valley or a pause.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-emerald-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
