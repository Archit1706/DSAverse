"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, Segment, FunctionPlot, ShadeUnder, Polygon, Label, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   A(x) = ∫ₐˣ f(t) dt, computed from an antiderivative G: A(x) = G(x) − G(a).
   The theorem: A′(x) = f(x), whatever a is. */
const PRESETS = [
    {
        id: 'parabola', name: '(t − 1)(t − 3)', tex: String.raw`(t - 1)(t - 3)`,
        f: (t) => (t - 1) * (t - 3), G: (t) => t ** 3 / 3 - 2 * t * t + 3 * t, df: (t) => 2 * t - 4,
        xRange: [-0.4, 4.9], fReal: [-1.6, 5.6], AReal: [-1.6, 4], aRange: [0, 2],
    },
    {
        id: 'cosine', name: 'cos t', tex: String.raw`\cos t`,
        f: Math.cos, G: Math.sin, df: (t) => -Math.sin(t),
        xRange: [-0.4, 6.7], fReal: [-1.3, 1.3], AReal: [-2.3, 2.3], aRange: [0, 3],
    },
    {
        id: 'decay', name: '2e^(−t/2)', tex: String.raw`2e^{-t/2}`,
        f: (t) => 2 * Math.exp(-t / 2), G: (t) => -4 * Math.exp(-t / 2), df: (t) => -Math.exp(-t / 2),
        xRange: [-0.4, 6.7], fReal: [-0.3, 2.3], AReal: [-3.4, 4.3], aRange: [0, 3],
    },
];

const accumulated = (p, a, x) => p.G(x) - p.G(a);
/** A central-difference slope of A, measured from A alone. */
const slopeOfA = (p, a, x, h = 1e-4) => (accumulated(p, a, x + h) - accumulated(p, a, x - h)) / (2 * h);

const num = (x, d = 3) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 3);

const XS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5];
const SLOPE_AT = [1, 2, 4];
const RISE = 'A will rise';
const FALL = 'A will fall';

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const p = PRESETS[0];
    const a = 0;
    const steps = [];
    let q = 0;
    steps.push({
        kind: 'opening', presetIndex: 0, a, x: 0, tangent: false,
        explanation: 'Top: f(t) = (t − 1)(t − 3). Bottom: A(x), the signed area under f from 0 to x. Slide x to the right and keep a running total of the area swept so far.',
    });
    XS.slice(1).forEach((x, i) => {
        const prev = XS[i];
        const A = accumulated(p, a, x);
        const rising = A > accumulated(p, a, prev);
        steps.push({
            kind: 'move', presetIndex: 0, a, x, prev, tangent: false, q: q++,
            explanation: `x = ${num(x)}: A(${num(x)}) = ${num(A)}. On [${num(prev)}, ${num(x)}] f is ${rising ? 'above' : 'below'} the axis, so the strip just swept ${rising ? 'added to' : 'took away from'} the total.`,
        });
        if (SLOPE_AT.includes(x)) {
            steps.push({
                kind: 'tangent', presetIndex: 0, a, x, tangent: true, q: q++,
                explanation: `The tangent to A at x = ${num(x)} has slope ${num(p.f(x))} — and f(${num(x)}) = ${num(p.f(x))}. A grows at exactly the rate f says: each extra Δx adds a strip of height f(x).`,
            });
        }
    });
    steps.push({
        kind: 'theorem', presetIndex: 0, a, x: 2.5, tangent: true, strip: true, derivative: true,
        explanation: 'Why: A(x + h) − A(x) is the thin strip from x to x + h, nearly a rectangle of height f(x). Divide by h and let h → 0: A′(x) = f(x). The dashed curve on top is A′, measured from A alone — it lies right on f.',
    });
    steps.push({
        kind: 'lower', presetIndex: 0, a: 1, x: 2.5, tangent: true, derivative: true,
        explanation: 'Start the area at a = 1 instead. A shifts down by a constant — the area from 0 to 1 — but its slope at every x is unchanged. That is why ∫ₐᵇ f = F(b) − F(a) works with any antiderivative F.',
    });
    steps.push({
        kind: 'closing', presetIndex: 1, a: 0, x: Math.PI / 2, tangent: true,
        explanation: 'For f = cos t the accumulated area is sin x: integrating and differentiating undo each other. Switch to Explore to drag x, move a, and try the other functions.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each move: will the running total rise or fall? (It follows the
   sign of f on the strip about to be swept.) At three points, before the
   tangent appears: what is A's slope? The wrong answers are A's value, the
   slope of f instead of f, and a sign slip. */
const predictFor = (step, next) => {
    if (!step || !next) return null;
    const p = PRESETS[next.presetIndex];
    if (next.kind === 'move') {
        const rising = accumulated(p, next.a, next.x) > accumulated(p, next.a, next.prev);
        const slot = next.q % 2;
        const options = slot === 0 ? [rising ? RISE : FALL, rising ? FALL : RISE] : [rising ? FALL : RISE, rising ? RISE : FALL];
        return {
            question: `x moves from ${num(next.prev)} to ${num(next.x)}. Will the accumulated area A rise or fall?`,
            options, correct: slot,
            because: `On that stretch f is ${rising ? 'positive' : 'negative'}, so the strip adds ${rising ? 'positive' : 'negative'} area: A goes from ${num(accumulated(p, next.a, next.prev))} to ${num(accumulated(p, next.a, next.x))}.`,
        };
    }
    if (next.kind === 'tangent') {
        const x = next.x;
        const correct = p.f(x);
        const seen = new Set([num(correct)]);
        const wrong = [];
        for (const w of [accumulated(p, next.a, x), p.df(x), -correct, correct + 1, correct - 2]) {
            if (wrong.length < 3 && !seen.has(num(w))) { seen.add(num(w)); wrong.push(w); }
        }
        const slot = (SLOPE_AT.indexOf(x) * 3 + 1) % 4;
        const options = [...wrong];
        options.splice(slot, 0, correct);
        return {
            question: `What is the slope of A at x = ${num(x)}?`,
            options: options.map(v => num(v)), correct: slot,
            because: `A′(x) = f(x), so the slope is f(${num(x)}) = ${num(correct)}. A(${num(x)}) = ${num(accumulated(p, next.a, x))} is A's height, and ${num(p.df(x))} is the slope of f, not of A.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'A(x) = ∫₀ˣ t² dt. What is A′(3)?',
        options: ['9', '27', '6', '3'],
        correct: 0,
        explanation: 'By the Fundamental Theorem, A′(x) = f(x) = x², so A′(3) = 9. (A(3) itself is 3³/3 = 9 too here — a coincidence; at x = 2, A′ = 4 but A = 8/3.)',
    },
    {
        question: 'On an interval where f is negative, what is A(x) = ∫ₐˣ f(t) dt doing?',
        options: ['Increasing', 'Decreasing', 'Constant', 'Undefined'],
        correct: 1,
        explanation: 'A′ = f < 0, so A decreases: every strip swept adds negative area.',
    },
    {
        question: 'Why does ∫ₐᵇ f(x) dx = F(b) − F(a) work for ANY antiderivative F?',
        options: [
            'Because all antiderivatives are equal',
            'Because any two antiderivatives differ by a constant, which cancels in F(b) − F(a)',
            'Because F(a) is always 0',
            'It only works for one special F',
        ],
        correct: 1,
        explanation: 'A(x) = ∫ₐˣ f is one antiderivative; any other is A + C. Then F(b) − F(a) = (A(b) + C) − (A(a) + C) = A(b) − A(a) = A(b), since A(a) = 0.',
    },
];

const codeExample = `import numpy as np

f = lambda t: (t - 1) * (t - 3)

# Accumulate the area numerically on a fine grid (cumulative trapezoid rule)
x = np.linspace(0, 4.5, 4501)
dx = x[1] - x[0]
A = np.concatenate([[0], np.cumsum((f(x[1:]) + f(x[:-1])) / 2 * dx)])

# The slope of A is f, everywhere
slope = np.gradient(A, x)
print(np.max(np.abs(slope - f(x))))      # tiny

# And it matches the antiderivative x^3/3 - 2x^2 + 3x
print(A[-1], 4.5**3 / 3 - 2 * 4.5**2 + 3 * 4.5)   # 3.375  3.375`;

/* ── page ──────────────────────────────────────────────── */

const PLOT_HEIGHT = 2.2;   // each plot is this many x-units tall

function Ticks({ xRange, real, ys, xLabels }) {
    const { toScreen } = usePlane();
    const span = real[1] - real[0];
    const step = span > 6 ? 2 : span > 2.5 ? 1 : 0.5;
    const out = [];
    const [ox] = toScreen([0, 0]);
    const left = toScreen([xRange[0], 0])[0], right = toScreen([xRange[1], 0])[0];
    for (let y = Math.ceil(real[0] / step) * step; y <= real[1] + 1e-9; y += step) {
        const [, sy] = toScreen([0, y * ys]);
        out.push(<line key={`g${y}`} x1={left} y1={sy} x2={right} y2={sy} stroke={MATH_COLORS.grid} />);
        if (Math.abs(y) > 1e-9) out.push(<text key={`t${y}`} x={ox - 5} y={sy + 4} fontSize={10} textAnchor="end" fill={MATH_COLORS.text}>{num(y, 1)}</text>);
    }
    if (xLabels) {
        const [, bottom] = toScreen([0, real[0] * ys]);
        for (let x = Math.ceil(xRange[0]); x <= xRange[1]; x++) {
            if (!x) continue;
            const [sx] = toScreen([x, 0]);
            out.push(<text key={`x${x}`} x={sx} y={bottom - 5} fontSize={10} textAnchor="middle" fill={MATH_COLORS.text}>{x}</text>);
        }
    }
    return <g>{out}</g>;
}

function FPlot({ p, a, x, strip, derivative, onDrag }) {
    const ys = PLOT_HEIGHT / (p.fReal[1] - p.fReal[0]);
    const fs = (t) => ys * p.f(t);
    const h = 0.3;
    return (
        <Plane2D xRange={p.xRange} yRange={[p.fReal[0] * ys, p.fReal[1] * ys]} grid={0} tickLabels={false} ariaLabel={`f(t) = ${p.name} with the area from ${num(a)} to ${num(x)} shaded`}>
            <Ticks xRange={p.xRange} real={p.fReal} ys={ys} />
            <ShadeUnder f={fs} from={Math.min(a, x)} to={Math.max(a, x)} color={MATH_COLORS.area} negativeColor={MATH_COLORS.negative} opacity={0.35} />
            {strip && <Polygon points={[[x, 0], [x + h, 0], [x + h, fs(x)], [x, fs(x)]]} fill={MATH_COLORS.result} fillOpacity={0.45} />}
            <FunctionPlot f={fs} color={MATH_COLORS.curve} />
            {derivative && <FunctionPlot f={(t) => ys * slopeOfA(p, a, t)} color={MATH_COLORS.curve2} width={2} dashed />}
            <Segment from={[x, p.fReal[0] * ys]} to={[x, p.fReal[1] * ys]} color="#e2e8f0" width={1} opacity={0.45} />
            <Point at={[a, 0]} color={MATH_COLORS.i} r={4} label="a" labelOffset={[-4, 16]} />
            <Point at={[x, fs(x)]} color={MATH_COLORS.curve} r={5} label={`f(x) = ${num(p.f(x))}`} labelOffset={[8, -8]} />
            <Point at={[x, 0]} color={MATH_COLORS.a} r={6} onDrag={onDrag} snap={0.05} constrain={([t]) => [t, 0]}
                ariaLabel={`Right edge x = ${num(x)}; drag along the axis`} />
            <Label at={[p.xRange[1], p.fReal[1] * ys]} anchor="end" dx={-6} dy={16} color={MATH_COLORS.curve} size={13} weight={700}>f(t)</Label>
        </Plane2D>
    );
}

function APlot({ p, a, x, tangent, traceOnly }) {
    const ys = PLOT_HEIGHT / (p.AReal[1] - p.AReal[0]);
    const As = (t) => ys * accumulated(p, a, t);
    const m = p.f(x);
    const line = (t) => [t, ys * (accumulated(p, a, x) + m * (t - x))];
    return (
        <Plane2D xRange={p.xRange} yRange={[p.AReal[0] * ys, p.AReal[1] * ys]} grid={0} tickLabels={false} ariaLabel={`The accumulated area A(x), with its value ${num(accumulated(p, a, x))} at x = ${num(x)}`}>
            <Ticks xRange={p.xRange} real={p.AReal} ys={ys} xLabels />
            {!traceOnly && <FunctionPlot f={As} domain={[0, p.xRange[1]]} color="#334155" width={1.5} dashed />}
            <FunctionPlot f={As} domain={[Math.min(a, x), Math.max(a, x)]} color={MATH_COLORS.result} width={3} />
            {tangent && <Segment from={line(x - 0.9)} to={line(x + 0.9)} color={MATH_COLORS.i} width={2.5} />}
            <Segment from={[x, p.AReal[0] * ys]} to={[x, p.AReal[1] * ys]} color="#e2e8f0" width={1} opacity={0.45} />
            <Point at={[x, As(x)]} color={MATH_COLORS.result} r={5} label={`A(x) = ${num(accumulated(p, a, x))}`} labelOffset={[8, -8]} />
            <Label at={[p.xRange[1], p.AReal[1] * ys]} anchor="end" dx={-6} dy={16} color={MATH_COLORS.result} size={13} weight={700}>A(x)</Label>
        </Plane2D>
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

export default function FundamentalTheoremPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1300);
    const [presetIndex, setPresetIndex] = useState(0);      // explore-mode state
    const [a, setA] = useState(0);
    const [x, setX] = useState(2);
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
    const p = PRESETS[guided ? step.presetIndex : presetIndex];
    const A0 = guided ? step.a : a;
    const X = guided ? step.x : x;
    const tangent = guided ? step.tangent : true;
    const strip = guided ? Boolean(step.strip) : true;
    const derivative = guided ? Boolean(step.derivative) : true;
    const traceOnly = guided && !['theorem', 'lower', 'closing'].includes(step.kind);

    /* Grabbing x during the tour switches to Explore, starting from whatever
       is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setPresetIndex(step.presetIndex); setA(step.a); setX(step.x);
        setMode('explore'); setIsPlaying(false);
    };
    const dragX = ([t]) => { takeOver(); setX(Math.min(Math.max(t, 0), p.xRange[1] - 0.4)); };

    const h = 0.3;
    const AX = accumulated(p, A0, X);
    const hide = guided && predict.hideExplanation;
    const formula = String.raw`A(x) = \int_{${fmt(A0)}}^{x} ${p.tex}\,dt, \qquad A(${fmt(X)}) = ${fmt(AX)}`;
    const quotient = String.raw`\frac{A(x + h) - A(x)}{h} = \frac{${fmt(accumulated(p, A0, X + h))} - ${fmt(AX)}}{${h}} = ${fmt((accumulated(p, A0, X + h) - AX) / h)} \;\approx\; f(${fmt(X)}) = ${fmt(p.f(X))}`;
    const showSlope = !guided || step.tangent;

    const exploreNote = `At x = ${num(X)} the area so far is A = ${num(AX)} and A is ${p.f(X) > 1e-9 ? 'rising' : p.f(X) < -1e-9 ? 'falling' : 'momentarily flat'} at rate f(x) = ${num(p.f(X))}. The pink strip from x to x + 0.3 is about f(x) × 0.3 = ${num(p.f(X) * h)}. Move a: A shifts up or down, but its slope never changes.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/integral-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Integral Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Fundamental Theorem of Calculus</h1>
                    <p className="text-teal-50 max-w-3xl">
                        Sweep an area along the axis and plot the running total. Its slope at every x is exactly f(x): integration and differentiation undo each other.
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
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag x along the top axis'}
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <FPlot p={p} a={A0} x={X} strip={strip} derivative={derivative} onDrag={dragX} />
                            <APlot p={p} a={A0} x={X} tangent={tangent} traceOnly={traceOnly} />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                            <span><span className="text-sky-400 font-semibold">—</span> f(t)</span>
                            <span><span className="text-pink-400 font-semibold">—</span> A(x), the area so far</span>
                            {tangent && <span><span className="text-green-400 font-semibold">—</span> tangent to A</span>}
                            {derivative && <span><span className="text-orange-400 font-semibold">- -</span> A′(x), measured from A</span>}
                        </div>

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
                                    {PRESETS.map((q, i) => (
                                        <button key={q.id} onClick={() => { setPresetIndex(i); setA(v => Math.min(v, q.aRange[1])); setX(v => Math.min(v, q.xRange[1] - 0.4)); }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === presetIndex ? 'border-teal-500 text-teal-300 bg-teal-500/10' : 'border-slate-700 text-slate-300 hover:border-teal-500'}`}>
                                            f(t) = {q.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ParamSlider label="Right edge x" value={x} onChange={setX} min={0} max={p.xRange[1] - 0.4} step={0.01} accent="teal" format={(v) => num(v, 2)} />
                                    <ParamSlider label="Lower limit a" value={a} onChange={setA} min={p.aRange[0]} max={p.aRange[1]} step={0.05} accent="teal" format={(v) => num(v, 2)} />
                                </div>
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
                        {showSlope && !hide && <Tex block>{quotient}</Tex>}
                        <Tex block>{String.raw`\frac{d}{dx}\int_{a}^{x} f(t)\,dt = f(x) \qquad\text{and}\qquad \int_a^b f(t)\,dt = F(b) - F(a)`}</Tex>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The theorem, two ways</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-pink-300 font-semibold">Part 1</span> — A(x) = ∫ₐˣ f is an antiderivative: A′(x) = f(x).</li>
                            <li><span className="text-teal-300 font-semibold">Part 2</span> — so for any antiderivative F, ∫ₐᵇ f = F(b) − F(a).</li>
                            <li><span className="text-green-300 font-semibold">f &gt; 0</span> — A rises. <span className="text-rose-300 font-semibold">f &lt; 0</span> — A falls.</li>
                            <li><span className="text-amber-300 font-semibold">f = 0</span> — A has a flat tangent: a peak or valley of the running total.</li>
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
