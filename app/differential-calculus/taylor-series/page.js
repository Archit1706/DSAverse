"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, Segment, FunctionPlot, Polygon, Label, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Maclaurin series (Taylor series about 0). coef(n) is f⁽ⁿ⁾(0) / n!:
     sin x       = x − x³/3! + x⁵/5! − …        (odd powers only)
     eˣ          = 1 + x + x²/2! + x³/3! + …
     ln(1 + x)   = x − x²/2 + x³/3 − …           (only for −1 < x ≤ 1) */
const factorial = (n) => { let p = 1; for (let k = 2; k <= n; k++) p *= k; return p; };

const FUNCS = [
    {
        id: 'sin', name: 'sin x', tex: String.raw`\sin x`, f: Math.sin,
        atText: (v) => `sin(${v})`, texAt: (v) => String.raw`\sin(${v})`,
        coef: (n) => (n % 2 === 0 ? 0 : (((n - 1) / 2) % 2 === 0 ? 1 : -1) / factorial(n)),
        denom: (n) => factorial(n), denomTex: (n) => `${n}!`,
        tour: [1, 3, 5, 7, 9, 11, 13], maxN: 25, radius: Infinity,
        xRange: [-7, 7], yReal: [-3, 3], probes: [1, 3, 6],
    },
    {
        id: 'exp', name: 'eˣ', tex: 'e^x', f: Math.exp,
        atText: (v) => `e^(${v})`, texAt: (v) => `e^{${v}}`,
        coef: (n) => 1 / factorial(n),
        denom: (n) => factorial(n), denomTex: (n) => `${n}!`,
        tour: [0, 1, 2, 3, 4, 8], maxN: 20, radius: Infinity,
        xRange: [-4, 3], yReal: [-2, 12], probes: [-2, 1, 2.5],
    },
    {
        id: 'ln', name: 'ln(1 + x)', tex: String.raw`\ln(1 + x)`, f: Math.log1p,
        atText: (v) => `ln(1 + ${v})`, texAt: (v) => String.raw`\ln(1 + ${v})`,
        coef: (n) => (n === 0 ? 0 : (n % 2 ? 1 : -1) / n),
        denom: (n) => n, denomTex: (n) => `${n}`,
        tour: [1, 2, 3, 4, 5, 6, 10, 16, 24], maxN: 30, radius: 1,
        xRange: [-1.5, 3], yReal: [-3, 2.5], probes: [0.5, 0.9, 1.5],
    },
];

/** P_N(x) = Σ_{n ≤ N} coef(n)·xⁿ. */
const partialSum = (fn, N, x) => {
    let s = 0, p = 1;
    for (let n = 0; n <= N; n++) { s += fn.coef(n) * p; p *= x; }
    return s;
};
/** The next N after N with a non-zero term. */
const nextTermIndex = (fn, N) => { let n = N + 1; while (fn.coef(n) === 0) n++; return n; };

const num = (x, d = 4) => {
    if (!Number.isFinite(x)) return x > 0 ? '∞' : '−∞';
    if (Math.abs(x) >= 1e5) return x.toExponential(2).replace('-', '−');
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n) => String(n).split('').map(d => SUP[Number(d)]).join('');
const xPow = (n) => (n === 0 ? '1' : n === 1 ? 'x' : `x${sup(n)}`);
/** A term as plain text, e.g. "− x⁵/120". */
const termText = (sign, n, denom) => `${sign < 0 ? '−' : '+'} ${denom === 1 ? xPow(n) : `${xPow(n)}/${denom}`}`;
const termOf = (fn, n) => termText(Math.sign(fn.coef(n)), n, fn.denom(n));
const texTerm = (fn, n, first) => {
    const c = fn.coef(n);
    const sign = c < 0 ? '-' : first ? '' : '+';
    const pow = n === 0 ? '1' : n === 1 ? 'x' : `x^{${n}}`;
    const d = fn.denom(n);
    return d === 1 ? `${sign} ${pow}` : String.raw`${sign} \frac{${pow}}{${fn.denomTex(n)}}`;
};
const texSeries = (fn, N) => {
    const terms = [];
    for (let n = 0; n <= N; n++) if (fn.coef(n) !== 0) terms.push(n);
    if (!terms.length) return '0';
    const shown = terms.length > 6 ? [...terms.slice(0, 4), null, terms[terms.length - 1]] : terms;
    return shown.map((n, i) => (n === null ? String.raw`+ \cdots` : texTerm(fn, n, i === 0))).join(' ');
};

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let q = 0;
    steps.push({
        kind: 'opening', fnIndex: 0, N: 1, probe: 1,
        explanation: 'A Taylor polynomial copies a function using only what happens at one point: its value, its slope, its curvature, and so on. Each new term matches one more derivative at x = 0, and the copy hugs the curve over a wider range.',
    });
    FUNCS.forEach((fn, fnIndex) => {
        fn.tour.forEach((N, k) => {
            const probe = fn.probes[0];
            const err = Math.abs(fn.f(probe) - partialSum(fn, N, probe));
            // Late in the ln tour several terms are added at once; those steps are not asked about.
            const jump = k > 0 && N !== nextTermIndex(fn, fn.tour[k - 1]);
            const added = k === 0 ? `Start with ${termOf(fn, N).replace(/^\+ /, '')}` : jump ? `Jump ahead: every term up to x${sup(N)}` : `Add ${termOf(fn, N)}`;
            const extra = fn.id === 'ln'
                ? N >= 6 ? ` Inside −1 < x ≤ 1 the polynomials close in on the curve; past x = 1 they peel away, wilder with every term. At x = 1.5 the error is ${num(Math.abs(fn.f(1.5) - partialSum(fn, N, 1.5)), 3)}.` : ''
                : N >= fn.tour[fn.tour.length - 1] ? ' Keep adding terms and the match spreads as far as you like — this series converges for every x.' : '';
            steps.push({
                kind: k === 0 ? 'start' : jump ? 'jump' : 'term', fnIndex, N, probe, k, q: k === 0 || jump ? null : q++,
                explanation: `${fn.name}: ${added}. Now P(${num(probe)}) = ${num(partialSum(fn, N, probe), 6)} against ${fn.atText(num(probe))} = ${num(fn.f(probe), 6)}, an error of ${num(err, 6)}.${extra}`,
            });
        });
    });
    steps.push({
        kind: 'radius', fnIndex: 2, N: 24, probe: 1.5,
        explanation: 'ln(1 + x) has a radius of convergence of 1: the series only works for −1 < x ≤ 1. At x = −1 the function itself goes to −∞, and that wall caps how far from 0 the series can reach — on the other side as well.',
    });
    steps.push({
        kind: 'closing', fnIndex: 0, N: 9, probe: 3,
        explanation: 'Calculators evaluate sin, eˣ and ln with polynomials like these. Switch to Explore to pick N yourself and drag the probe to see the error anywhere.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each new term: which term comes next? The wrong answers flip the
   sign, divide by n where n! belongs (or the reverse), or take the wrong
   power — for sin x, the even power that is missing. */
const predictFor = (step, next) => {
    if (!step || !next || next.kind !== 'term') return null;
    const fn = FUNCS[next.fnIndex];
    const n = next.N;
    const sign = Math.sign(fn.coef(n));
    const truth = termOf(fn, n);
    const wrongDenom = fn.id === 'ln' ? factorial(n) : n;
    const candidates = [
        termText(-sign, n, fn.denom(n)),
        termText(sign, n, wrongDenom),
        termText(sign, n + 1, fn.id === 'ln' ? n + 1 : factorial(n + 1)),
        termText(-sign, n, wrongDenom),
        termText(sign, n - 1, fn.id === 'ln' ? n - 1 : factorial(n - 1)),
    ];
    const wrong = [];
    for (const c of candidates) if (c !== truth && !wrong.includes(c) && wrong.length < 3) wrong.push(c);
    const slot = (next.q * 3 + 1) % 4;
    const options = [...wrong];
    options.splice(slot, 0, truth);
    return {
        question: `${fn.name} so far: P = ${texFree(fn, step.N)}. Which term comes next?`,
        options, correct: slot,
        because: fn.id === 'ln'
            ? `The xⁿ term of ln(1 + x) is ±xⁿ/n, with signs alternating: ${truth}.`
            : fn.id === 'sin'
                ? `sin x keeps only odd powers, with alternating signs, each over n!: ${truth} (${n}! = ${factorial(n)}).`
                : `Every term of eˣ is +xⁿ/n!: ${truth} (${n}! = ${factorial(n)}).`,
    };
};
/** The polynomial so far in plain text, for the prompt. */
function texFree(fn, N) {
    const parts = [];
    for (let n = 0; n <= N; n++) if (fn.coef(n) !== 0) parts.push(termOf(fn, n));
    const s = parts.length > 4 ? [...parts.slice(0, 3), '…', parts[parts.length - 1]].join(' ') : parts.join(' ');
    return s.replace(/^\+ /, '');
}

const quizQuestions = [
    {
        question: 'Which polynomial is the Taylor polynomial of eˣ about 0 up to x³?',
        options: ['1 + x + x² + x³', '1 + x + x²/2 + x³/6', 'x + x²/2 + x³/3', '1 − x + x²/2 − x³/6'],
        correct: 1,
        explanation: 'Every derivative of eˣ is eˣ, which is 1 at x = 0, so the xⁿ coefficient is 1/n!: 1 + x + x²/2! + x³/3! = 1 + x + x²/2 + x³/6.',
    },
    {
        question: 'Why does the Taylor series of sin x have no x², x⁴, … terms?',
        options: [
            'Because sin x is odd: sin(−x) = −sin x, so only odd powers can appear',
            'Because those terms are too small to matter',
            'Because the series is cut off early',
            'Because sin x has no second derivative',
        ],
        correct: 0,
        explanation: 'The even derivatives of sin x at 0 are ±sin 0 = 0, so their coefficients vanish. That matches sin being an odd function: a sum of odd powers is odd too.',
    },
    {
        question: 'The series x − x²/2 + x³/3 − … for ln(1 + x) is summed at x = 2. What happens as more terms are added?',
        options: ['It converges to ln 3', 'It converges, but slowly', 'The partial sums swing more and more wildly — it diverges', 'It converges to 0'],
        correct: 2,
        explanation: 'The terms are ±2ⁿ/n, which grow without bound, so the partial sums cannot settle. The radius of convergence is 1: the series only represents ln(1 + x) for −1 < x ≤ 1.',
    },
];

const codeExample = `import math

def taylor_sin(x, N):
    """x - x^3/3! + x^5/5! - ... up to x^N"""
    return sum((-1)**k * x**(2*k + 1) / math.factorial(2*k + 1)
               for k in range((N + 1) // 2))

for N in [1, 3, 5, 7, 9]:
    print(N, taylor_sin(3.0, N), math.sin(3.0))
# the error at x = 3 falls fast once N passes about 3

def taylor_ln1p(x, N):
    return sum((-1)**(n + 1) * x**n / n for n in range(1, N + 1))

for N in [5, 10, 20, 40]:
    print(N, taylor_ln1p(0.5, N), taylor_ln1p(1.5, N))
# x = 0.5 settles on ln 1.5; x = 1.5 blows up (radius of convergence 1)`;

/* ── page ──────────────────────────────────────────────── */

const yScaleOf = (fn) => (0.8 * (fn.xRange[1] - fn.xRange[0])) / (fn.yReal[1] - fn.yReal[0]);

/* Plane2D's own grid and tick labels count world units, and this plot
   squeezes y by `ys`, so it turns them off and draws the real values here. */
function ScaledTicks({ xRange, yReal, ys }) {
    const { toScreen } = usePlane();
    const stepFor = (span) => (span > 12 ? 2 : span > 4 ? 1 : 0.5);
    const [ox, oy] = toScreen([0, 0]);
    const top = toScreen([0, yReal[1] * ys])[1], bottom = toScreen([0, yReal[0] * ys])[1];
    const left = toScreen([xRange[0], 0])[0], right = toScreen([xRange[1], 0])[0];
    const out = [];
    const sx0 = stepFor(xRange[1] - xRange[0]);
    for (let x = Math.ceil(xRange[0] / sx0) * sx0; x <= xRange[1] + 1e-9; x += sx0) {
        const [sx] = toScreen([x, 0]);
        out.push(<line key={`gx${x}`} x1={sx} y1={top} x2={sx} y2={bottom} stroke={MATH_COLORS.grid} />);
        if (Math.abs(x) > 1e-9) out.push(<text key={`tx${x}`} x={sx} y={oy + 14} fontSize={10} textAnchor="middle" fill={MATH_COLORS.text}>{num(x, 1)}</text>);
    }
    const sy0 = stepFor(yReal[1] - yReal[0]);
    for (let y = Math.ceil(yReal[0] / sy0) * sy0; y <= yReal[1] + 1e-9; y += sy0) {
        const [, sy] = toScreen([0, y * ys]);
        out.push(<line key={`gy${y}`} x1={left} y1={sy} x2={right} y2={sy} stroke={MATH_COLORS.grid} />);
        if (Math.abs(y) > 1e-9) out.push(<text key={`ty${y}`} x={ox - 5} y={sy + 4} fontSize={10} textAnchor="end" fill={MATH_COLORS.text}>{num(y, 1)}</text>);
    }
    return <g>{out}</g>;
}

function TaylorPlot({ fn, N, probe, onDrag }) {
    const ys = yScaleOf(fn);
    // Rounded so the server and the browser agree to the last digit (Math.sin
    // can differ in its final bit between the two, and this lands in SVG attributes).
    const fx = Math.round(fn.f(probe) * 1e9) / 1e9, px = Math.round(partialSum(fn, N, probe) * 1e9) / 1e9;
    const yMin = fn.yReal[0] * ys, yMax = fn.yReal[1] * ys;
    const clampY = (y) => Math.min(Math.max(y, yMin + 0.05), yMax - 0.05);
    return (
        <Plane2D xRange={fn.xRange} yRange={[yMin, yMax]} grid={0} tickLabels={false} ariaLabel={`${fn.name} and its Taylor polynomial of degree ${N}`}>
            <ScaledTicks xRange={fn.xRange} yReal={fn.yReal} ys={ys} />
            {Number.isFinite(fn.radius) && (
                <Polygon points={[[-fn.radius, yMin], [fn.radius, yMin], [fn.radius, yMax], [-fn.radius, yMax]]}
                    fill={MATH_COLORS.i} fillOpacity={0.07} strokeWidth={0} />
            )}
            {Number.isFinite(fn.radius) && (
                <>
                    <Segment from={[-fn.radius, yMin]} to={[-fn.radius, yMax]} color={MATH_COLORS.i} width={1} dashed opacity={0.6} />
                    <Segment from={[fn.radius, yMin]} to={[fn.radius, yMax]} color={MATH_COLORS.i} width={1} dashed opacity={0.6} />
                    <Label at={[0, yMax]} anchor="middle" dy={14} color={MATH_COLORS.i} size={11}>converges for −1 &lt; x ≤ 1</Label>
                </>
            )}
            <FunctionPlot f={(x) => ys * fn.f(x)} domain={fn.id === 'ln' ? [-0.999, fn.xRange[1]] : undefined} color={MATH_COLORS.curve} width={3} />
            <FunctionPlot f={(x) => ys * partialSum(fn, N, x)} color={MATH_COLORS.curve2} width={2.5} samples={500} />
            {fn.id !== 'ln' || probe > -1 ? (
                <>
                    <Segment from={[probe, clampY(ys * fx)]} to={[probe, clampY(ys * px)]} color={MATH_COLORS.negative} width={2} />
                    <Point at={[probe, clampY(ys * fx)]} color={MATH_COLORS.curve} r={4} />
                </>
            ) : null}
            <Point at={[probe, clampY(ys * px)]} color={MATH_COLORS.curve2} r={4} />
            <Point at={[probe, 0]} color={MATH_COLORS.a} r={6} label={`x = ${num(probe, 2)}`} labelOffset={[8, 18]}
                onDrag={onDrag} snap={0.01} constrain={([x]) => [x, 0]}
                ariaLabel={`Probe at x = ${num(probe, 2)}; drag along the x-axis`} />
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

export default function TaylorSeriesPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1300);
    const [fnIndex, setFnIndex] = useState(0);        // explore-mode state
    const [N, setN] = useState(5);
    const [probe, setProbe] = useState(2);
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
    const NN = guided ? step.N : N;
    const P = guided ? step.probe : probe;

    /* Grabbing the probe during the tour switches to Explore, starting from
       whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setFnIndex(step.fnIndex); setN(step.N); setProbe(step.probe);
        setMode('explore'); setIsPlaying(false);
    };

    const fx = fn.id === 'ln' && P <= -1 ? -Infinity : fn.f(P);
    const px = partialSum(fn, NN, P);
    const series = useMemo(() => texSeries(fn, NN), [fn, NN]);
    const nextN = nextTermIndex(fn, NN);
    const hide = guided && predict.hideExplanation;

    const errRows = fn.probes.map(x => ({ x, err: Math.abs(fn.f(x) - partialSum(fn, NN, x)) }));
    const outside = Number.isFinite(fn.radius) && (P > fn.radius || P <= -fn.radius);
    const exploreNote = outside
        ? `x = ${num(P, 2)} is outside the radius of convergence. Push N up: instead of closing in, P_N(x) swings further from ${fn.name} each time.`
        : `With terms up to x${sup(NN)}, the error at x = ${num(P, 2)} is ${num(Math.abs(fx - px), 6)}. The next term would be ${termOf(fn, nextN)}.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/differential-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Differential Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Taylor Series</h1>
                    <p className="text-emerald-50 max-w-3xl">
                        Copy a function with a polynomial, one derivative at a time. sin x and eˣ give way everywhere; ln(1 + x) only inside a radius of 1.
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
                                {guided ? `${fn.name} · step ${currentStep + 1} of ${stepHistory.length}` : 'Drag the probe, or change N'}
                            </span>
                        </div>

                        <TaylorPlot fn={fn} N={NN} probe={P} onDrag={([x]) => { takeOver(); setProbe(+x.toFixed(2)); }} />
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                            <span><span className="text-sky-400 font-semibold">—</span> f(x) = {fn.name}</span>
                            <span><span className="text-orange-400 font-semibold">—</span> Taylor polynomial, terms up to x{sup(NN)}</span>
                            <span><span className="text-rose-400 font-semibold">|</span> error at the probe</span>
                        </div>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(v => !v)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
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
                                        <button key={g.id} onClick={() => { setFnIndex(i); setN(n => Math.min(n, g.maxN)); setProbe(g.probes[1]); }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === fnIndex ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-slate-700 text-slate-300 hover:border-emerald-500'}`}>
                                            f(x) = {g.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ParamSlider label="Highest power N" value={N} onChange={setN} min={0} max={fn.maxN} step={1} accent="emerald" />
                                    <ParamSlider label="Probe x" value={probe} onChange={setProbe} min={fn.xRange[0]} max={fn.xRange[1]} step={0.01} accent="emerald" format={(v) => num(v, 2)} />
                                </div>
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="emerald" />}

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p className="text-emerald-200 text-sm leading-relaxed">
                                {guided ? (hide ? 'Make your prediction above to reveal this step.' : step.explanation) : exploreNote}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-3 text-slate-100 text-sm sm:text-base">
                        <Tex block>{String.raw`${fn.tex} \approx ${series}`}</Tex>
                        <Tex block>{String.raw`P(${texNum(P, 2)}) = ${texNum(px, 6)}, \quad ${fn.texAt(texNum(P, 2))} = ${texNum(fx, 6)}, \quad |\text{error}| = ${texNum(Math.abs(fx - px), 6)}`}</Tex>
                        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                            {errRows.map(r => (
                                <div key={r.x} className="rounded-md border border-slate-800 px-2 py-1.5">
                                    <span className="block text-slate-500 font-sans">error at x = {num(r.x, 2)}</span>
                                    <span className={Number.isFinite(fn.radius) && r.x > fn.radius ? 'text-rose-300' : 'text-emerald-300'}>{num(r.err, 6)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The three series</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-sky-300 font-semibold">sin x</span> = x − x³/3! + x⁵/5! − … for every x.</li>
                            <li><span className="text-sky-300 font-semibold">eˣ</span> = 1 + x + x²/2! + x³/3! + … for every x.</li>
                            <li><span className="text-sky-300 font-semibold">ln(1 + x)</span> = x − x²/2 + x³/3 − … only for −1 &lt; x ≤ 1.</li>
                            <li><span className="text-emerald-300 font-semibold">In general</span> the xⁿ coefficient is f⁽ⁿ⁾(0)/n!, so P matches f and its first N derivatives at 0.</li>
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
