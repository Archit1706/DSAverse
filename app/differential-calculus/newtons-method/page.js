"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, Segment, FunctionPlot, Label, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Newton's step: follow the tangent at xₙ down to the x-axis,
   xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ). */
const CASES = [
    {
        id: 'sqrt2', name: 'x² − 2', tex: 'x^2 - 2', dtex: '2x',
        f: (x) => x * x - 2, df: (x) => 2 * x,
        root: Math.SQRT2, x0: 3, steps: 4, ask: 4,
        xRange: [-0.6, 3.6], yReal: [-2.4, 7.6],
        note: 'Its positive root is √2 ≈ 1.41421356. Start far away, at x₀ = 3.',
    },
    {
        id: 'cycle', name: 'x³ − 2x + 2', tex: 'x^3 - 2x + 2', dtex: '3x^2 - 2',
        f: (x) => x ** 3 - 2 * x + 2, df: (x) => 3 * x * x - 2,
        root: -1.7692923542386314, x0: 0, steps: 4, ask: 2,
        xRange: [-2.4, 1.9], yReal: [-3.2, 4.6],
        note: 'One real root, near −1.77. Start at x₀ = 0 and see what the tangents do.',
    },
    {
        id: 'cubic-good', name: 'x³ − 2x + 2', tex: 'x^3 - 2x + 2', dtex: '3x^2 - 2',
        f: (x) => x ** 3 - 2 * x + 2, df: (x) => 3 * x * x - 2,
        root: -1.7692923542386314, x0: -2, steps: 3, ask: 3,
        xRange: [-2.4, 1.9], yReal: [-3.2, 4.6],
        note: 'The same function, started at x₀ = −2, on the steep side of the root.',
    },
    {
        id: 'arctan', name: 'arctan x', tex: String.raw`\arctan x`, dtex: String.raw`\frac{1}{1 + x^2}`,
        f: Math.atan, df: (x) => 1 / (1 + x * x),
        root: 0, x0: 1.5, steps: 4, ask: 4,
        xRange: [-6, 6], yReal: [-1.9, 1.9],
        note: 'Its root is plainly x = 0. But the curve flattens out far from 0, so tangents there are shallow.',
    },
];

const newtonStep = (c, x) => x - c.f(x) / c.df(x);

/** x₀, x₁, … up to n steps; stops early on a flat tangent or a runaway. */
const iterates = (c, x0, n) => {
    const xs = [x0];
    for (let i = 0; i < n; i++) {
        const x = xs[xs.length - 1];
        const d = c.df(x);
        if (!Number.isFinite(d) || Math.abs(d) < 1e-12 || Math.abs(x) > 1e6) break;
        xs.push(newtonStep(c, x));
    }
    return xs;
};

/** How many decimal digits of xₙ agree with the root. */
const correctDigits = (x, root) => {
    const e = Math.abs(x - root);
    if (e === 0) return 16;
    return Math.max(0, Math.floor(-Math.log10(e)));
};

const num = (x, d = 4) => {
    if (!Number.isFinite(x)) return 'undefined';
    if (Math.abs(x) >= 1e5) return x.toExponential(2).replace('-', '−');
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 4);

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let q = 0;
    steps.push({
        kind: 'opening', caseIndex: 0, xs: [CASES[0].x0], stage: 'axis',
        explanation: 'Newton\'s method finds where f(x) = 0. Stand at a guess xₙ, go up to the curve, and slide down the tangent line until it hits the x-axis. That landing point is the next guess.',
    });
    CASES.forEach((c, caseIndex) => {
        const xs = iterates(c, c.x0, c.steps);
        steps.push({ kind: 'intro', caseIndex, xs: [c.x0], stage: 'axis', explanation: `f(x) = ${c.name}. ${c.note}` });
        for (let n = 0; n < xs.length - 1; n++) {
            const x = xs[n], fx = c.f(x), dfx = c.df(x);
            steps.push({
                kind: 'evaluate', caseIndex, xs: xs.slice(0, n + 1), n, stage: 'curve',
                explanation: `At x${sub(n)} = ${num(x)}: f(x${sub(n)}) = ${num(fx)} and the slope there is f′(x${sub(n)}) = ${num(dfx)}.`,
            });
            const next = xs[n + 1];
            const tail = c.id === 'sqrt2'
                ? ` It now agrees with √2 to ${correctDigits(next, c.root)} decimal places.`
                : c.id === 'cycle' && n >= 1 ? ' Back where it started: the tangents will bounce between 0 and 1 for ever.'
                    : c.id === 'arctan' ? ` |x| has grown from ${num(Math.abs(x), 2)} to ${num(Math.abs(next), 2)}: each shallower tangent throws it further out.`
                        : ` Error now ${num(Math.abs(next - c.root), 6)}.`;
            steps.push({
                kind: 'step', caseIndex, xs: xs.slice(0, n + 2), n, stage: 'tangent', q: q++,
                explanation: `The tangent drops ${num(fx)} with slope ${num(dfx)}, a run of ${num(fx / dfx)}. So x${sub(n + 1)} = ${num(x)} − ${num(fx)} / ${num(dfx)} = ${num(next)}.${tail}`,
            });
        }
        const verdict = {
            sqrt2: `Four steps from a poor guess: ${xs.map(x => num(x, 8)).join(', ')}. Once close, the number of correct digits roughly doubles each time (${xs.map(x => correctDigits(x, c.root)).join(', ')}) — quadratic convergence.`,
            cycle: 'From x₀ = 0 the method never arrives: the tangent at 0 points to 1 and the tangent at 1 points back to 0. Newton\'s method has no guarantee of converging.',
            'cubic-good': `From −2 the same function converges in a few steps to ${num(c.root, 6)}. Where you start decides everything.`,
            arctan: 'The guesses swing from side to side, getting larger each time. Far from 0, arctan is nearly flat, and a nearly flat tangent hits the axis a long way off. Started closer — below about 1.39 — it would converge.',
        }[c.id];
        steps.push({ kind: 'verdict', caseIndex, xs, stage: 'all', explanation: verdict });
    });
    steps.push({
        kind: 'closing', caseIndex: 0, xs: iterates(CASES[0], 3, 4), stage: 'all',
        explanation: 'Near a simple root Newton\'s method is astonishingly fast — it is how calculators take square roots. Far from one it can cycle or run away. Switch to Explore and drag x₀ to find the good and bad starting points.',
    });
    return steps;
};
function sub(n) { return String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]).join(''); }
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   At each point on the curve, before the tangent is drawn: where will it
   hit the x-axis? The wrong answers are the classic slips — adding the
   correction instead of subtracting it, forgetting to divide by the slope,
   and multiplying by it instead. Once a cycle has gone round, its next
   landing point is no longer in doubt, so only its first lap is asked. */
const predictFor = (step, next) => {
    if (!step || !next || next.kind !== 'step') return null;
    const c = CASES[next.caseIndex];
    if (next.n >= c.ask) return null;
    const x = next.xs[next.n], fx = c.f(x), dfx = c.df(x);
    const correct = newtonStep(c, x);
    const seen = new Set([num(correct)]);
    const wrong = [];
    for (const w of [x + fx / dfx, x - fx, x - fx * dfx, x - fx / (2 * dfx), x + fx, correct + 1, correct - 1]) {
        if (wrong.length === 3) break;
        if (!Number.isFinite(w) || seen.has(num(w))) continue;
        seen.add(num(w));
        wrong.push(w);
    }
    const slot = (next.q * 3 + 1) % 4;
    const ordered = [...wrong];
    ordered.splice(slot, 0, correct);
    return {
        question: `f(${num(x)}) = ${num(fx)} and f′(${num(x)}) = ${num(dfx)}. Where will the tangent hit the x-axis?`,
        options: ordered.map(v => num(v)),
        correct: slot,
        because: `x − f(x)/f′(x) = ${num(x)} − ${num(fx)}/${num(dfx)} = ${num(x)} − ${num(fx / dfx)} = ${num(correct)}.`,
    };
};

const quizQuestions = [
    {
        question: 'Newton\'s method on f(x) = x² − 2 from x₀ = 2. What is x₁?',
        options: ['1', '1.5', '1.4142', '3'],
        correct: 1,
        explanation: 'f(2) = 2 and f′(2) = 4, so x₁ = 2 − 2/4 = 1.5. The next step gives 1.4167, then 1.414216 — digits doubling each time.',
    },
    {
        question: 'Near a simple root, the error of Newton\'s method behaves how from one step to the next?',
        options: ['It halves', 'It shrinks by a constant factor', 'It is roughly squared', 'It stays the same'],
        correct: 2,
        explanation: 'eₙ₊₁ ≈ C·eₙ² with C = |f″/(2f′)| at the root. An error of 0.01 becomes about 0.0001, then 0.00000001 — the number of correct digits doubles. That is quadratic convergence.',
    },
    {
        question: 'Which starting point is most likely to make Newton\'s method fail?',
        options: [
            'One very close to the root',
            'One where f′(x₀) is close to 0, so the tangent is nearly flat',
            'One where f(x₀) is large',
            'One to the right of the root',
        ],
        correct: 1,
        explanation: 'The step is f(x)/f′(x). A nearly flat tangent (f′ ≈ 0) makes that step huge, throwing the next guess far away — as with arctan far from 0, or the cycle on x³ − 2x + 2.',
    },
];

const codeExample = `import math

def newton(f, df, x, steps=6):
    for n in range(steps):
        x = x - f(x) / df(x)
        print(n + 1, x)
    return x

# sqrt(2): digits double each step
newton(lambda x: x*x - 2, lambda x: 2*x, 3.0)
# 1 1.8333  2 1.4621  3 1.41500  4 1.41421378  5 1.41421356237311

# A cycle: x^3 - 2x + 2 from x0 = 0 bounces 0, 1, 0, 1, ...
newton(lambda x: x**3 - 2*x + 2, lambda x: 3*x*x - 2, 0.0, steps=4)

# Divergence: arctan from 1.5 swings further out each time
newton(math.atan, lambda x: 1 / (1 + x*x), 1.5, steps=4)`;

/* ── page ──────────────────────────────────────────────── */

const yScaleOf = (c) => (0.72 * (c.xRange[1] - c.xRange[0])) / (c.yReal[1] - c.yReal[0]);

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

function NewtonPlot({ c, xs, stage, onDragStart }) {
    const ys = yScaleOf(c);
    const inX = (x) => x >= c.xRange[0] && x <= c.xRange[1];
    const last = xs.length - 1;
    const pieces = [];
    for (let n = 0; n < xs.length; n++) {
        const x = xs[n];
        if (!inX(x)) continue;
        const isLast = n === last;
        const showRise = !isLast || stage === 'curve' || stage === 'all';
        if (showRise) pieces.push(<Segment key={`r${n}`} from={[x, 0]} to={[x, ys * c.f(x)]} color={MATH_COLORS.a} width={1.3} dashed opacity={isLast ? 0.9 : 0.45} />);
        if (n < last) {
            const nx = xs[n + 1];
            const end = inX(nx) ? nx : (nx > c.xRange[1] ? c.xRange[1] : c.xRange[0]);
            const slope = c.df(x);
            pieces.push(<Segment key={`t${n}`} from={[x, ys * c.f(x)]} to={[end, ys * (c.f(x) + slope * (end - x))]}
                color={MATH_COLORS.i} width={n === last - 1 ? 2.5 : 1.5} opacity={n === last - 1 ? 1 : 0.45} />);
        }
        if (showRise) pieces.push(<Point key={`c${n}`} at={[x, ys * c.f(x)]} color={MATH_COLORS.i} r={isLast ? 4.5 : 3} />);
    }
    const lastX = xs[last];
    return (
        <Plane2D xRange={c.xRange} yRange={[c.yReal[0] * ys, c.yReal[1] * ys]} grid={0} tickLabels={false} ariaLabel={`Newton's method on f(x) = ${c.name}`}>
            <ScaledTicks xRange={c.xRange} yReal={c.yReal} ys={ys} />
            <FunctionPlot f={(x) => ys * c.f(x)} color={MATH_COLORS.curve} />
            {Number.isFinite(c.root) && inX(c.root) && <Point at={[c.root, 0]} color={MATH_COLORS.result} r={4} />}
            {pieces}
            {xs.map((x, n) => (inX(x) && n > 0 && n < xs.length - 1) && (
                <Label key={`lx${n}`} at={[x, 0]} anchor="middle" dy={n % 2 ? -8 : 16} color={MATH_COLORS.text} size={10}>{`x${sub(n)}`}</Label>
            ))}
            {inX(lastX)
                ? <Label at={[lastX, 0]} anchor="middle" dy={20} color={MATH_COLORS.a} size={12} weight={700}>{`x${sub(last)} = ${num(lastX, 3)}`}</Label>
                : <Label at={[lastX > 0 ? c.xRange[1] : c.xRange[0], 0]} anchor={lastX > 0 ? 'end' : 'start'} dx={lastX > 0 ? -4 : 4} dy={-10} color={MATH_COLORS.negative} size={12} weight={700}>
                    {`x${sub(last)} = ${num(lastX, 2)} (off the chart)`}
                </Label>}
            <Point at={[Math.min(Math.max(xs[0], c.xRange[0]), c.xRange[1]), 0]} color={MATH_COLORS.a} r={6} onDrag={onDragStart} snap={0.01}
                constrain={([x]) => [x, 0]} ariaLabel={`Starting guess x₀ = ${num(xs[0], 2)}; drag along the x-axis`} />
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

/* Explore offers each function once; the two starts of the cubic share it. */
const EXPLORE_CASES = [0, 1, 3];

export default function NewtonsMethodPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [caseIndex, setCaseIndex] = useState(0);        // explore-mode state
    const [x0, setX0] = useState(3);
    const [count, setCount] = useState(4);
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
    const c = CASES[guided ? step.caseIndex : caseIndex];
    const xs = useMemo(() => (guided ? step.xs : iterates(c, x0, count)), [guided, step, c, x0, count]);
    const stage = guided ? step.stage : 'all';

    /* Grabbing x₀ during the tour switches to Explore, starting from whatever
       is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setCaseIndex(step.caseIndex === 2 ? 1 : step.caseIndex);
        setX0(step.xs[0]); setCount(Math.max(1, step.xs.length - 1));
        setMode('explore'); setIsPlaying(false);
    };

    const n = Math.max(0, xs.length - 2);
    const xn = xs[n], fxn = c.f(xn), dfxn = c.df(xn);
    const formula = xs.length > 1
        ? String.raw`x_{${n + 1}} = x_{${n}} - \frac{f(x_{${n}})}{f'(x_{${n}})} = ${fmt(xn)} - \frac{${fmt(fxn)}}{${fmt(dfxn)}} = ${fmt(xs[n + 1])}`
        : String.raw`x_0 = ${fmt(xs[0])}, \quad f(x_0) = ${fmt(c.f(xs[0]))}, \quad f'(x_0) = ${fmt(c.df(xs[0]))}`;
    const hide = guided && predict.hideExplanation;
    const converging = Number.isFinite(c.root) && Math.abs(xs[xs.length - 1] - c.root) < 1e-6;
    const exploreNote = xs.length < count + 1 && Math.abs(c.df(xs[xs.length - 1])) < 1e-12
        ? 'The tangent at this guess is flat: it never meets the x-axis, so Newton\'s method cannot take a step.'
        : converging
            ? `Converged to ${num(c.root, 8)} in ${xs.findIndex(x => Math.abs(x - c.root) < 1e-6)} steps. Drag x₀ further away and see how many more it takes — or whether it gets there at all.`
            : `After ${xs.length - 1} steps the guess is ${num(xs[xs.length - 1])}, still ${num(Math.abs(xs[xs.length - 1] - c.root), 4)} from the root. Look for a cycle, a runaway, or simply too few steps.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/differential-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Differential Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Newton&apos;s Method</h1>
                    <p className="text-emerald-50 max-w-3xl">
                        To solve f(x) = 0, follow the tangent down to the x-axis and repeat. Near a root the digits double every step; from a bad start the guesses cycle or fly away.
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
                                {guided ? `f(x) = ${c.name} · step ${currentStep + 1} of ${stepHistory.length}` : 'Drag x₀ along the x-axis'}
                            </span>
                        </div>

                        <NewtonPlot c={c} xs={xs} stage={stage}
                            onDragStart={([x]) => { takeOver(); setX0(+x.toFixed(2)); }} />

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
                                    {EXPLORE_CASES.map(i => (
                                        <button key={CASES[i].id} onClick={() => { setCaseIndex(i); setX0(CASES[i].x0); }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === caseIndex ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-slate-700 text-slate-300 hover:border-emerald-500'}`}>
                                            f(x) = {CASES[i].name}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ParamSlider label="Starting guess x₀" value={x0} onChange={setX0} min={c.xRange[0]} max={c.xRange[1]} step={0.01} accent="emerald" format={(v) => num(v, 2)} />
                                    <ParamSlider label="Steps" value={count} onChange={setCount} min={1} max={8} step={1} accent="emerald" />
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
                        <Tex block>{String.raw`f(x) = ${c.tex}, \qquad f'(x) = ${c.dtex}`}</Tex>
                        {!hide && <Tex block>{formula}</Tex>}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs font-mono">
                                <thead>
                                    <tr className="text-slate-500 text-left">
                                        <th className="py-1 pr-3 font-sans font-medium">n</th>
                                        <th className="py-1 pr-3 font-sans font-medium">xₙ</th>
                                        <th className="py-1 pr-3 font-sans font-medium">f(xₙ)</th>
                                        <th className="py-1 pr-3 font-sans font-medium">error |xₙ − root|</th>
                                        <th className="py-1 font-sans font-medium">correct digits</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {xs.map((x, i) => (
                                        <tr key={i} className="border-t border-slate-800 text-slate-300">
                                            <td className="py-1 pr-3">{i}</td>
                                            <td className="py-1 pr-3 text-amber-300">{num(x, 8)}</td>
                                            <td className="py-1 pr-3">{num(c.f(x), 6)}</td>
                                            <td className="py-1 pr-3">{num(Math.abs(x - c.root), 8)}</td>
                                            <td className="py-1">{correctDigits(x, c.root)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">When Newton works — and when it does not</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-green-300 font-semibold">Near a simple root</span> — error squared each step: digits double.</li>
                            <li><span className="text-amber-300 font-semibold">Flat tangent</span> — f′ ≈ 0 sends the next guess far away.</li>
                            <li><span className="text-rose-300 font-semibold">Cycles</span> — tangents can point back and forth between two guesses.</li>
                            <li><span className="text-rose-300 font-semibold">Runaway</span> — on curves that flatten out, guesses can grow without bound.</li>
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
