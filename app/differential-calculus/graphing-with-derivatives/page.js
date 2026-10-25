"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, Segment, FunctionPlot, ShadeUnder, Label, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Each preset carries f, f′ and f″ in closed form, the y-range each plot
   needs, and its critical and inflection points worked out by hand. */
const S3 = Math.sqrt(3);
const PRESETS = [
    {
        id: 'quartic', name: 'x⁴/8 − 3x²/4',
        f: (x) => x ** 4 / 8 - 3 * x * x / 4,
        d1: (x) => (x ** 3 - 3 * x) / 2,
        d2: (x) => (3 * x * x - 3) / 2,
        tex: [String.raw`\tfrac{1}{8}x^4 - \tfrac{3}{4}x^2`, String.raw`\tfrac{1}{2}(x^3 - 3x)`, String.raw`\tfrac{3}{2}(x^2 - 1)`],
        xRange: [-2.3, 2.3], yRanges: [[-1.35, 0.45], [-2.9, 2.9], [-1.9, 6.6]],
        events: [
            { x: -S3, type: 'min' }, { x: -1, type: 'inflection' }, { x: 0, type: 'max' },
            { x: 1, type: 'inflection' }, { x: S3, type: 'min' },
        ],
    },
    {
        id: 'cubic', name: 'x³/3 − x',
        f: (x) => x ** 3 / 3 - x,
        d1: (x) => x * x - 1,
        d2: (x) => 2 * x,
        tex: [String.raw`\tfrac{1}{3}x^3 - x`, String.raw`x^2 - 1`, String.raw`2x`],
        xRange: [-2.2, 2.2], yRanges: [[-1.5, 1.5], [-1.3, 4], [-4.6, 4.6]],
        events: [{ x: -1, type: 'max' }, { x: 0, type: 'inflection' }, { x: 1, type: 'min' }],
    },
    {
        id: 'sine', name: 'sin x',
        f: Math.sin, d1: Math.cos, d2: (x) => -Math.sin(x),
        tex: [String.raw`\sin x`, String.raw`\cos x`, String.raw`-\sin x`],
        xRange: [-3.4, 3.4], yRanges: [[-1.25, 1.25], [-1.25, 1.25], [-1.25, 1.25]],
        events: [
            { x: -Math.PI, type: 'inflection' }, { x: -Math.PI / 2, type: 'min' }, { x: 0, type: 'inflection' },
            { x: Math.PI / 2, type: 'max' }, { x: Math.PI, type: 'inflection' },
        ],
    },
];

const num = (x, d = 3) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 3);
const EPS = 1e-9;

/** What f is doing at x, read only from the signs of f′ and f″. */
const shapeAt = (p, x) => {
    const s1 = p.d1(x), s2 = p.d2(x);
    return {
        rising: s1 > EPS ? true : s1 < -EPS ? false : null,
        bendingUp: s2 > EPS ? true : s2 < -EPS ? false : null,
    };
};
const SHAPES = ['Rises, bending up', 'Rises, bending down', 'Falls, bending up', 'Falls, bending down'];
const shapeLabel = ({ rising, bendingUp }) => `${rising ? 'Rises' : 'Falls'}, bending ${bendingUp ? 'up' : 'down'}`;
const EVENT_LABELS = { min: 'Local minimum', max: 'Local maximum', inflection: 'Inflection point' };

/** The stretches between consecutive events, for the tour. */
const stretchesOf = (p) => {
    const xs = [p.xRange[0] + 0.1, ...p.events.map(e => e.x), p.xRange[1] - 0.1];
    return xs.slice(0, -1).map((a, i) => ({ a, b: xs[i + 1], end: p.events[i] ?? null, mid: (a + xs[i + 1]) / 2 }));
};

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const p = PRESETS[0];
    const steps = [];
    const stretches = stretchesOf(p);
    steps.push({
        kind: 'opening', x0: stretches[0].a, passed: 0,
        explanation: 'Three plots on one x-axis: f on top, its slope f′ in the middle, and f″ — the slope of the slope — at the bottom. The top curve is drawn only as far as the cursor. Read the two lower plots to say what f will do next.',
    });
    stretches.forEach((st, i) => {
        const sh = shapeAt(p, st.mid);
        steps.push({
            kind: 'stretch', x0: st.b, from: st.a, stretchIndex: i, passed: i, shape: sh,
            explanation: `From x = ${num(st.a, 2)} to ${num(st.b, 2)}: f′ is ${sh.rising ? 'positive' : 'negative'}, so f ${sh.rising ? 'rises' : 'falls'}; f″ is ${sh.bendingUp ? 'positive' : 'negative'}, so f bends ${sh.bendingUp ? 'up, like a cup' : 'down, like a cap'}.${st.end ? ` At x = ${num(st.b, 2)} the cursor reaches a special point.` : ''}`,
        });
        if (st.end) {
            const e = st.end;
            const why = e.type === 'inflection'
                ? `f″ crosses zero here, so the bending flips from ${sh.bendingUp ? 'up to down' : 'down to up'}. That is an inflection point — and f′ has a ${sh.bendingUp ? 'peak' : 'dip'} there, its own turning point.`
                : `f′ crosses zero here, from ${sh.rising ? '+ to −' : '− to +'}: f stops ${sh.rising ? 'rising and starts falling' : 'falling and starts rising'}. That is a local ${e.type === 'max' ? 'maximum' : 'minimum'}, and f″ = ${num(p.d2(e.x), 2)} ${e.type === 'max' ? '< 0 agrees: bending down at a peak' : '> 0 agrees: bending up in a valley'}.`;
            steps.push({ kind: 'event', x0: e.x, eventIndex: i, passed: i + 1, type: e.type, explanation: `x = ${num(e.x, 2)}: ${why}` });
        }
    });
    steps.push({
        kind: 'closing', x0: p.xRange[1] - 0.1, passed: p.events.length,
        explanation: 'f′ = 0 marks the candidates for peaks and valleys; f″ tells you which (negative: peak, positive: valley). f″ = 0 with a sign change marks where the bending flips. Switch to Explore to drag the cursor or try another function.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each stretch is drawn: what will f do on it? Before each special
   point is named: which kind is it? The options keep one fixed order, and
   the tour's answers are spread across it — no shape is right more than
   twice in six, no kind of point more than twice in five — so neither a
   favourite button nor a favourite answer pays. */

const predictFor = (step, next) => {
    if (!step || !next) return null;
    const p = PRESETS[0];
    if (next.kind === 'stretch') {
        const truth = shapeLabel(next.shape);
        const options = SHAPES;
        return {
            question: `From x = ${num(next.from, 2)} to ${num(next.x0, 2)}, read f′ and f″. What will f do?`,
            options, correct: options.indexOf(truth),
            because: `f′ is ${next.shape.rising ? 'above' : 'below'} zero there, so f ${next.shape.rising ? 'rises' : 'falls'}; f″ is ${next.shape.bendingUp ? 'above' : 'below'} zero, so it bends ${next.shape.bendingUp ? 'up' : 'down'}.`,
        };
    }
    if (next.kind === 'event') {
        const truth = EVENT_LABELS[next.type];
        const options = Object.values(EVENT_LABELS);
        const e = p.events[next.eventIndex];
        return {
            question: `The cursor is at x = ${num(e.x, 2)}. What kind of point is this?`,
            options, correct: options.indexOf(truth),
            because: next.type === 'inflection'
                ? 'f″ changes sign here while f′ does not: the bending flips but f keeps going the same way.'
                : `f′ changes sign here (${next.type === 'max' ? '+ to −' : '− to +'}), so f turns around: a local ${next.type === 'max' ? 'maximum' : 'minimum'}.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'On an interval, f′ > 0 and f″ < 0. What does the graph of f look like there?',
        options: ['Falling, bending up', 'Rising, bending down', 'Rising, bending up', 'Flat'],
        correct: 1,
        explanation: 'f′ > 0 means f is increasing. f″ < 0 means f′ is decreasing — the slope is getting smaller — so the curve rises ever more gently, bending down like the top of a hill.',
    },
    {
        question: 'f′(2) = 0 and f″(2) = 5. What is at x = 2?',
        options: ['A local maximum', 'A local minimum', 'An inflection point', 'Nothing can be said'],
        correct: 1,
        explanation: 'The tangent is flat, and the curve bends up (f″ > 0), so x = 2 sits at the bottom of a cup: a local minimum. This is the second-derivative test.',
    },
    {
        question: 'Where does f′ reach its own peak or valley?',
        options: ['Where f has a maximum', 'Where f crosses zero', 'At an inflection point of f', 'Where f″ is largest'],
        correct: 2,
        explanation: 'f′ turns around where its slope, f″, changes sign — and that is exactly an inflection point of f. The steepest point of an S-shaped curve is its inflection point.',
    },
];

const codeExample = `import numpy as np

f   = lambda x: x**4 / 8 - 3 * x**2 / 4
df  = lambda x: (x**3 - 3 * x) / 2       # f'
d2f = lambda x: (3 * x**2 - 3) / 2       # f''

# Critical points: f'(x) = 0  ->  x (x^2 - 3) = 0
crit = np.roots([1, 0, -3, 0])            # x^3 - 3x
for c in sorted(crit.real):
    kind = "min" if d2f(c) > 0 else "max" if d2f(c) < 0 else "?"
    print(f"x = {c:+.3f}  f = {f(c):+.3f}  {kind}")   # second-derivative test

# Inflection points: f''(x) = 0 with a sign change -> x = -1, 1
for c in (-1, 1):
    print(c, np.sign(d2f(c - 0.01)), np.sign(d2f(c + 0.01)))`;

/* ── page ──────────────────────────────────────────────── */

const PLOT_WORLD_HEIGHT = 1.25;   // each plot is this many x-units tall

/* The plots squeeze y by `ys`, so Plane2D's own tick labels are off; these
   label the real values. The shared x-axis is labelled once, under the
   bottom plot. */
function YTicks({ ys, lo, hi, xLeft, xRange, xLabels }) {
    const { toScreen } = usePlane();
    const step = hi - lo > 6 ? 2 : hi - lo > 3 ? 1 : 0.5;
    const out = [];
    if (xLabels) {
        const [, bottom] = toScreen([0, lo * ys]);
        for (let x = Math.ceil(xRange[0]); x <= xRange[1]; x++) {
            const [sx] = toScreen([x, 0]);
            out.push(<text key={`x${x}`} x={sx} y={bottom - 5} fontSize={10} textAnchor="middle" fill={MATH_COLORS.text}>{num(x, 0)}</text>);
        }
    }
    for (let y = Math.ceil(lo / step) * step; y <= hi + 1e-9; y += step) {
        if (Math.abs(y) < 1e-9) continue;
        const [, sy] = toScreen([0, y * ys]);
        const [sx] = toScreen([xLeft, 0]);
        out.push(<text key={y} x={sx + 4} y={sy + 4} fontSize={10} fill={MATH_COLORS.text}>{num(y, 1)}</text>);
    }
    return <g>{out}</g>;
}

function StackPlot({ p, which, x0, upTo, showEvents, onDrag }) {
    const fn = [p.f, p.d1, p.d2][which];
    const [lo, hi] = p.yRanges[which];
    const ys = PLOT_WORLD_HEIGHT / (hi - lo);
    const color = [MATH_COLORS.curve, MATH_COLORS.curve2, MATH_COLORS.b][which];
    const name = ['f', 'f′', 'f″'][which];
    // rounded: powers and sines can differ in their last bit between server and browser
    const scaled = (x) => Math.round(ys * fn(x) * 1e9) / 1e9;
    const domainEnd = upTo ?? p.xRange[1];
    return (
        <Plane2D xRange={p.xRange} yRange={[lo * ys, hi * ys]} grid={0} tickLabels={false}
            ariaLabel={`Plot of ${name}(x) for f(x) = ${p.name}`}>
            {which > 0 && <ShadeUnder f={scaled} from={p.xRange[0]} to={p.xRange[1]} color={which === 1 ? MATH_COLORS.i : MATH_COLORS.k} negativeColor={which === 1 ? MATH_COLORS.j : MATH_COLORS.curve2} opacity={0.16} />}
            <YTicks ys={ys} lo={lo} hi={hi} xLeft={p.xRange[0]} xRange={p.xRange} xLabels={which === 2} />
            {showEvents.map(e => (
                <Segment key={`e${e.x}`} from={[e.x, lo * ys]} to={[e.x, hi * ys]}
                    color={e.type === 'inflection' ? MATH_COLORS.b : MATH_COLORS.a} width={1.2} dashed opacity={0.7} />
            ))}
            <FunctionPlot f={scaled} domain={[p.xRange[0], which === 0 ? domainEnd : p.xRange[1]]} color={color} />
            {which === 0 && showEvents.map(e => (
                <Label key={`l${e.x}`} at={[e.x, ys * p.f(e.x)]} anchor="middle" dy={e.type === 'max' ? -10 : 18}
                    color={e.type === 'inflection' ? MATH_COLORS.b : MATH_COLORS.a} size={11} weight={700}>
                    {e.type === 'inflection' ? 'inflection' : e.type}
                </Label>
            ))}
            <Segment from={[x0, lo * ys]} to={[x0, hi * ys]} color="#e2e8f0" width={1} opacity={0.5} />
            <Point at={[x0, scaled(x0)]} color={color} r={5} onDrag={onDrag} snap={0.01}
                constrain={([x]) => { const c = Math.min(Math.max(x, p.xRange[0] + 0.05), p.xRange[1] - 0.05); return [c, ys * fn(c)]; }}
                ariaLabel={`Cursor on ${name} at x = ${num(x0, 2)}; drag to move it`} />
            <Label at={[p.xRange[1], hi * ys]} anchor="end" dx={-6} dy={16} color={color} size={13} weight={700}>{`${name}(x)`}</Label>
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

export default function GraphingWithDerivativesPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [presetIndex, setPresetIndex] = useState(0);     // explore-mode state
    const [x0, setX0] = useState(0.5);
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
    const p = PRESETS[guided ? 0 : presetIndex];
    const X = guided ? step.x0 : x0;
    const upTo = guided ? step.x0 : null;
    // In the tour a special point is marked only once it has been named.
    const shownEvents = guided ? p.events.slice(0, step.passed) : p.events;

    /* Grabbing a cursor during the tour switches to Explore, starting from
       whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setPresetIndex(0); setX0(step.x0);
        setMode('explore'); setIsPlaying(false);
    };
    const drag = ([x]) => { takeOver(); setX0(x); };

    const v0 = p.f(X), v1 = p.d1(X), v2 = p.d2(X);
    const sh = shapeAt(p, X);
    const formula = useMemo(() => String.raw`f(x) = ${p.tex[0]}, \quad f'(x) = ${p.tex[1]}, \quad f''(x) = ${p.tex[2]}`, [p]);
    const values = String.raw`f(${fmt(X)}) = ${fmt(v0)}, \quad f'(${fmt(X)}) = \textcolor{${v1 >= 0 ? MATH_COLORS.i : MATH_COLORS.j}}{${fmt(v1)}}, \quad f''(${fmt(X)}) = \textcolor{${v2 >= 0 ? MATH_COLORS.k : MATH_COLORS.curve2}}{${fmt(v2)}}`;

    const readout = sh.rising === null
        ? `f′ = 0 here: the tangent is flat.${sh.bendingUp === null ? '' : sh.bendingUp ? ' f″ > 0, so this is a valley — a local minimum.' : ' f″ < 0, so this is a peak — a local maximum.'}`
        : `f′ ${sh.rising ? '> 0: f is rising' : '< 0: f is falling'}; ${sh.bendingUp === null ? 'f″ = 0: the bending is about to flip' : sh.bendingUp ? 'f″ > 0: bending up' : 'f″ < 0: bending down'}.`;
    const exploreNote = `At x = ${num(X, 2)}: ${readout} Drag the cursor on any of the three plots — they share one x.`;
    const hide = guided && predict.hideExplanation;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/differential-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Differential Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Graphing with Derivatives</h1>
                    <p className="text-emerald-50 max-w-3xl">
                        f′ says whether f rises or falls; f″ says which way it bends. Stack all three on one x-axis and every peak, valley and inflection point lines up.
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
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag the cursor on any plot'}
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            {[0, 1, 2].map(which => (
                                <StackPlot key={`${p.id}-${which}`} p={p} which={which} x0={X} upTo={upTo} showEvents={shownEvents} onDrag={drag} />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                            <span><span className="text-green-400 font-semibold">■</span> f′ &gt; 0 (f rises)</span>
                            <span><span className="text-red-400 font-semibold">■</span> f′ &lt; 0 (f falls)</span>
                            <span><span className="text-blue-400 font-semibold">■</span> f″ &gt; 0 (bends up)</span>
                            <span><span className="text-orange-400 font-semibold">■</span> f″ &lt; 0 (bends down)</span>
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
                                    {PRESETS.map((q, i) => (
                                        <button key={q.id} onClick={() => { setPresetIndex(i); setX0(v => Math.min(Math.max(v, q.xRange[0] + 0.05), q.xRange[1] - 0.05)); }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === presetIndex ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-slate-700 text-slate-300 hover:border-emerald-500'}`}>
                                            f(x) = {q.name}
                                        </button>
                                    ))}
                                </div>
                                <ParamSlider label="Cursor x" value={x0} onChange={setX0} min={p.xRange[0] + 0.05} max={p.xRange[1] - 0.05} step={0.01} accent="emerald" format={(v) => num(v, 2)} />
                                <div className="flex flex-wrap gap-2">
                                    {p.events.map(e => (
                                        <button key={e.x} onClick={() => setX0(e.x)}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-emerald-500">
                                            Jump to {e.type === 'inflection' ? 'inflection' : `local ${e.type}`} at {num(e.x, 2)}
                                        </button>
                                    ))}
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
                        <Tex block>{formula}</Tex>
                        <Tex block>{values}</Tex>
                        {!hide && <p className="text-sm text-slate-300">{readout}</p>}
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Reading the signs</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-green-300 font-semibold">f′ &gt; 0</span> — f rises. <span className="text-red-300 font-semibold">f′ &lt; 0</span> — f falls.</li>
                            <li><span className="text-blue-300 font-semibold">f″ &gt; 0</span> — bends up (cup). <span className="text-orange-300 font-semibold">f″ &lt; 0</span> — bends down (cap).</li>
                            <li><span className="text-amber-300 font-semibold">f′ = 0, sign change</span> — a local maximum (+ to −) or minimum (− to +).</li>
                            <li><span className="text-purple-300 font-semibold">f″ = 0, sign change</span> — an inflection point, where f′ peaks or dips.</li>
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
