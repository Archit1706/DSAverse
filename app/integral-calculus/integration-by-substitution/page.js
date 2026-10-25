"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, FunctionPlot, Polygon, Label, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   ∫ f(u(x)) u′(x) dx = ∫ f(u) du. Each preset has the integrand g(x) =
   f(u(x))·u′(x) on the x side, the substitution u(x), and on the u side f
   with its antiderivative Fu. */
const PRESETS = [
    {
        id: 'square', label: '2x cos(x²)', uText: 'x²',
        gTex: String.raw`2x\cos(x^2)`, uTex: 'x^2', fTex: String.raw`\cos u`,
        g: (x) => 2 * x * Math.cos(x * x), u: (x) => x * x, du: (x) => 2 * x, f: Math.cos, Fu: Math.sin,
        bRange: [0.2, 1.75], b0: 1.5, xPlot: [-0.15, 1.9], gReal: [-3.7, 1.6], uPlot: [-0.2, 3.3], fReal: [-1.2, 1.2], fDomain: [0, 3.3],
    },
    {
        id: 'linear', label: '2e^(−2x)', uText: '2x',
        gTex: String.raw`2e^{-2x}`, uTex: '2x', fTex: String.raw`e^{-u}`,
        g: (x) => 2 * Math.exp(-2 * x), u: (x) => 2 * x, du: () => 2, f: (u) => Math.exp(-u), Fu: (u) => -Math.exp(-u),
        bRange: [0.2, 2], b0: 1, xPlot: [-0.15, 2.15], gReal: [-0.2, 2.2], uPlot: [-0.2, 4.3], fReal: [-0.2, 1.2], fDomain: [0, 4.3],
    },
    {
        id: 'rational', label: '2x/(1 + x²)', uText: '1 + x²',
        gTex: String.raw`\dfrac{2x}{1 + x^2}`, uTex: '1 + x^2', fTex: String.raw`\dfrac{1}{u}`,
        g: (x) => (2 * x) / (1 + x * x), u: (x) => 1 + x * x, du: (x) => 2 * x, f: (u) => 1 / u, Fu: Math.log,
        bRange: [0.2, 2.5], b0: 1.5, xPlot: [-0.15, 2.65], gReal: [-0.2, 1.2], uPlot: [-0.2, 7.5], fReal: [-0.2, 1.2], fDomain: [0.85, 7.5],
    },
];

/** Composite Simpson on [a, b]: the direct, x-side integral. */
const simpson = (fn, a, b, n = 200) => {
    const h = (b - a) / n;
    let s = fn(a) + fn(b);
    for (let i = 1; i < n; i++) s += fn(a + i * h) * (i % 2 ? 4 : 2);
    return (s * h) / 3;
};

/** The N equal strips of [0, b] and where u sends each of them. */
const strips = (p, b, N) => Array.from({ length: N }, (_, k) => {
    const x0 = (b * k) / N, x1 = (b * (k + 1)) / N;
    const u0 = p.u(x0), u1 = p.u(x1);
    return { k, x0, x1, u0, u1, areaX: simpson(p.g, x0, x1, 400), areaU: p.Fu(u1) - p.Fu(u0) };
});

const num = (x, d = 3) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 4);
const interval = (a, b) => `[${num(a)}, ${num(b)}]`;

const STRIP_COLORS = ['#2dd4bf', '#f472b6', '#fbbf24', '#a78bfa', '#38bdf8', '#fb923c'];
/* The tour's strips: four on the first integral, two on each of the others. */
const TOUR = [{ preset: 0, N: 4 }, { preset: 1, N: 2 }, { preset: 2, N: 2 }];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let q = 0;
    const push = (s) => steps.push({ N: 0, shown: 0, focus: null, uSide: true, ...s });
    const p0 = PRESETS[0];
    push({
        kind: 'opening', preset: 0, b: p0.b0, uSide: false,
        explanation: `∫ from 0 to 1.5 of 2x·cos(x²) dx. The integrand is awkward, but it contains x² and, beside it, 2x — the derivative of x². That pairing is the signal for a substitution.`,
    });
    push({
        kind: 'substitute', preset: 0, b: p0.b0,
        explanation: 'Let u = x². Then du = 2x dx, and the integrand becomes cos(u) du. The bottom plot is cos u, over u from 0² = 0 to 1.5² = 2.25.',
    });
    TOUR.forEach(({ preset, N }, ti) => {
        const p = PRESETS[preset];
        const b = p.b0;
        const ss = strips(p, b, N);
        if (ti > 0) {
            push({
                kind: 'newPreset', preset, b,
                explanation: preset === 1
                    ? `Now ∫ from 0 to 1 of 2e^(−2x) dx with u = 2x. A linear substitution stretches every strip by the same factor, 2, and halves its height: f(u) = e^(−u).`
                    : `And ∫ from 0 to ${num(b)} of 2x/(1 + x²) dx with u = 1 + x², du = 2x dx: the integrand becomes 1/u, over u from 1 to ${num(p.u(b))}.`,
            });
        }
        ss.forEach((s, k) => {
            push({ kind: 'stripAsk', preset, b, N, shown: k, focus: k, explanation: `Strip ${k + 1} of ${N}: x from ${num(s.x0)} to ${num(s.x1)}, area ${num(s.areaX, 4)}. Where does it land on the u-axis?` });
            push({
                kind: 'stripShow', preset, b, N, shown: k + 1, focus: k, q: q++,
                explanation: `u = ${p.uText} sends it to u from ${num(s.u0)} to ${num(s.u1)}: ${num((s.u1 - s.u0) / (s.x1 - s.x0), 2)} times as wide${preset === 1 ? '' : ' on average'}, and correspondingly shorter. Its area is ${num(s.areaU, 4)} — the same as before.`,
            });
        });
        const total = p.Fu(p.u(b)) - p.Fu(p.u(0));
        push({
            kind: 'total', preset, b, N, shown: N,
            explanation: `Every strip keeps its area, so the totals agree: ∫ from 0 to ${num(b)} of g(x) dx = ∫ from ${num(p.u(0))} to ${num(p.u(b))} of f(u) du = ${num(total, 4)}.`,
        });
    });
    push({
        kind: 'closing', preset: 0, b: 1.5, N: 12, shown: 12,
        explanation: 'du = u′(x) dx is the whole trick: each strip is stretched by u′ and its height divided by u′, so area is preserved. Switch to Explore to change the upper limit and the number of strips.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before a strip's image appears: which u-interval? The wrong answers are
   the classic slips — not transforming the ends at all, stretching by a
   constant guess, or keeping the width and moving only the start. */
const predictFor = (step, next) => {
    if (!step || !next || step.kind !== 'stripAsk' || next.kind !== 'stripShow') return null;
    const p = PRESETS[next.preset];
    const s = strips(p, next.b, next.N)[next.focus];
    const truth = interval(s.u0, s.u1);
    const w = s.x1 - s.x0;
    const candidates = [
        interval(s.x0, s.x1),
        interval(2 * s.x0, 2 * s.x1),
        interval(s.u0, s.u0 + w),
        interval(s.x0 * s.x0, s.x1 * s.x1),
        interval(s.u0, s.u1 + w),
        interval(s.u0 - w, s.u1),
    ];
    const wrong = [];
    for (const c of candidates) if (c !== truth && !wrong.includes(c) && wrong.length < 3) wrong.push(c);
    const slot = (next.q * 3 + 1) % 4;
    const options = [...wrong];
    options.splice(slot, 0, truth);
    return {
        question: `u = ${p.uText}. The strip from x = ${num(s.x0)} to x = ${num(s.x1)} maps to which u-interval?`,
        options, correct: slot,
        because: `Put each end through u: u(${num(s.x0)}) = ${num(s.u0)} and u(${num(s.x1)}) = ${num(s.u1)}.`,
    };
};

const quizQuestions = [
    {
        question: 'To compute ∫ 3x² cos(x³) dx, which substitution turns it into ∫ cos u du?',
        options: ['u = cos x', 'u = 3x²', 'u = x³', 'u = x'],
        correct: 2,
        explanation: 'With u = x³, du = 3x² dx — exactly the factor sitting beside cos(x³). The integral becomes ∫ cos u du = sin u + C = sin(x³) + C.',
    },
    {
        question: '∫₀² 2x e^(x²) dx with u = x². What are the new limits?',
        options: ['0 to 2', '0 to 4', '1 to 4', '0 to √2'],
        correct: 1,
        explanation: 'Each limit goes through u: u(0) = 0 and u(2) = 4. The integral becomes ∫₀⁴ eᵘ du = e⁴ − 1.',
    },
    {
        question: 'Under u = 2x, what happens to a thin strip of width dx and height g(x) = 2e^(−2x)?',
        options: [
            'It becomes twice as wide and half as tall, so its area is unchanged',
            'It becomes twice as wide and keeps its height',
            'It becomes half as wide',
            'Its area doubles',
        ],
        correct: 0,
        explanation: 'du = 2 dx stretches the strip by 2, and the integrand e^(−u) is g(x)/2 — half the height. Width times height is the same, which is why ∫ g dx = ∫ f du.',
    },
];

const codeExample = `import numpy as np

def simpson(f, a, b, n=1000):
    x = np.linspace(a, b, n + 1)
    w = np.ones(n + 1); w[1:-1:2] = 4; w[2:-1:2] = 2
    return (b - a) / n / 3 * np.sum(w * f(x))

b = 1.5
direct = simpson(lambda x: 2 * x * np.cos(x**2), 0, b)    # in x
substituted = simpson(np.cos, 0, b**2)                     # u = x^2, du = 2x dx
print(direct, substituted, np.sin(b**2))                   # all 0.7781...

# One strip, both ways: [1.0, 1.125] in x  ->  [1.0, 1.2656] in u
print(simpson(lambda x: 2 * x * np.cos(x**2), 1.0, 1.125),
      np.sin(1.125**2) - np.sin(1.0))`;

/* ── page ──────────────────────────────────────────────── */

const HEIGHT_RATIO = 0.55;   // each plot's height as a fraction of its width

function Ticks({ xr, real, ys, unit }) {
    const { toScreen } = usePlane();
    const out = [];
    const [ox, oy] = toScreen([0, 0]);
    const xStep = xr[1] - xr[0] > 5 ? 1 : 0.5;
    for (let x = Math.ceil(xr[0] / xStep) * xStep; x <= xr[1] + 1e-9; x += xStep) {
        if (Math.abs(x) < 1e-9) continue;
        const [sx] = toScreen([x, 0]);
        out.push(<text key={`x${x}`} x={sx} y={oy + 13} fontSize={10} textAnchor="middle" fill={MATH_COLORS.text}>{num(x, 1)}</text>);
    }
    const yStep = real[1] - real[0] > 3 ? 1 : 0.5;
    for (let y = Math.ceil(real[0] / yStep) * yStep; y <= real[1] + 1e-9; y += yStep) {
        if (Math.abs(y) < 1e-9) continue;
        const [, sy] = toScreen([0, y * ys]);
        out.push(<text key={`y${y}`} x={ox - 4} y={sy + 4} fontSize={10} textAnchor="end" fill={MATH_COLORS.text}>{num(y, 1)}</text>);
    }
    const [rx] = toScreen([xr[1], 0]);
    out.push(<text key="unit" x={rx - 4} y={oy - 6} fontSize={12} textAnchor="end" fill={MATH_COLORS.text} fontWeight={700}>{unit}</text>);
    return <g>{out}</g>;
}

function SidePlot({ xr, real, fn, domain, from, to, pieces, focus, curveColor, label, endLabel, onDrag, dragAt }) {
    const ys = (HEIGHT_RATIO * (xr[1] - xr[0])) / (real[1] - real[0]);
    const s = (x) => ys * fn(x);
    const shade = (a, b, color, opacity) => {
        const pts = [[a, 0]];
        // rounded: Math.cos can differ in its last bit between server and browser
        for (let i = 0; i <= 40; i++) { const x = a + ((b - a) * i) / 40; pts.push([x, Math.round(s(x) * 1e9) / 1e9]); }
        pts.push([b, 0]);
        return <Polygon points={pts} fill={color} fillOpacity={opacity} strokeWidth={0} />;
    };
    return (
        <Plane2D xRange={xr} yRange={[real[0] * ys, real[1] * ys]} grid={0} tickLabels={false} ariaLabel={label}>
            <Ticks xr={xr} real={real} ys={ys} unit={endLabel} />
            {pieces.length === 0 && to > from && shade(from, to, MATH_COLORS.area, 0.25)}
            {pieces.map(({ a, b, color, k }) => (
                <g key={k}>{shade(a, b, color, k === focus ? 0.7 : 0.35)}</g>
            ))}
            <FunctionPlot f={s} domain={domain} color={curveColor} />
            {onDrag && <Point at={[dragAt, 0]} color={MATH_COLORS.a} r={6} label="b" labelOffset={[-4, 18]} onDrag={onDrag} snap={0.01}
                constrain={([x]) => [x, 0]} ariaLabel={`Upper limit b = ${num(dragAt)}; drag along the x-axis`} />}
            <Label at={[xr[0], real[1] * ys]} dx={6} dy={16} color={curveColor} size={13} weight={700}>{label}</Label>
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

export default function IntegrationBySubstitutionPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [preset, setPreset] = useState(0);        // explore-mode state
    const [b, setB] = useState(1.5);
    const [N, setN] = useState(6);
    const [focus, setFocus] = useState(0);
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
    const p = PRESETS[guided ? step.preset : preset];
    const B = guided ? step.b : b;
    const NN = guided ? step.N : N;
    const shown = guided ? step.shown : N;
    const F = guided ? step.focus : Math.min(focus, N - 1);
    const uSide = guided ? step.uSide : true;
    const ss = NN > 0 ? strips(p, B, NN) : [];
    // On the x side every strip of the tour is drawn; on the u side only those already mapped.
    const xPieces = ss.map(s => ({ a: s.x0, b: s.x1, color: STRIP_COLORS[s.k % STRIP_COLORS.length], k: s.k }));
    const uPieces = ss.slice(0, shown).map(s => ({ a: s.u0, b: s.u1, color: STRIP_COLORS[s.k % STRIP_COLORS.length], k: s.k }));

    /* Grabbing b during the tour switches to Explore, starting from whatever
       is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setPreset(step.preset); setB(step.b); setN(Math.max(1, step.N || 6)); setFocus(step.focus ?? 0);
        setMode('explore'); setIsPlaying(false);
    };
    const dragB = ([x]) => { takeOver(); setB(Math.min(Math.max(x, p.bRange[0]), p.bRange[1])); };

    const direct = simpson(p.g, 0, B);
    const viaU = p.Fu(p.u(B)) - p.Fu(p.u(0));
    const fs = F !== null && F !== undefined && ss[F] ? ss[F] : null;
    const hide = guided && predict.hideExplanation;
    const formula = String.raw`\int_0^{${fmt(B)}} ${p.gTex}\,dx \;\overset{u = ${p.uTex}}{=}\; \int_{${fmt(p.u(0))}}^{${fmt(p.u(B))}} ${p.fTex}\,du = ${fmt(viaU)}`;
    const check = String.raw`\text{direct (Simpson, in } x\text{)}: ${fmt(direct)} \qquad \text{after substituting}: ${fmt(viaU)}`;
    const stripLine = fs && (!guided || step.kind !== 'stripAsk') && !hide
        ? String.raw`[${fmt(fs.x0)}, ${fmt(fs.x1)}] \xrightarrow{\;u\;} [${fmt(fs.u0)}, ${fmt(fs.u1)}], \qquad \text{area } ${fmt(fs.areaX)} = ${fmt(fs.areaU)}`
        : null;

    const exploreNote = fs
        ? `Strip ${F + 1}: x from ${num(fs.x0)} to ${num(fs.x1)} becomes u from ${num(fs.u0)} to ${num(fs.u1)} — ${num((fs.u1 - fs.u0) / (fs.x1 - fs.x0), 2)} times as wide — and keeps its area ${num(fs.areaX, 4)}. In total: ${num(direct, 4)} both ways.`
        : `Both integrals equal ${num(viaU, 4)}.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/integral-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Integral Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Integration by Substitution</h1>
                    <p className="text-teal-50 max-w-3xl">
                        A change of variable stretches the axis. Every thin strip gets wider by u′(x) and shorter by the same factor — so the area, and the integral, come through unchanged.
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
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag b, or change the strips'}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">In x: g(x) = {p.label}</p>
                                <SidePlot xr={p.xPlot} real={p.gReal} fn={p.g} domain={[0, p.xPlot[1]]} from={0} to={B} pieces={xPieces} focus={F}
                                    curveColor={MATH_COLORS.curve} label="g(x)" endLabel="x" onDrag={dragB} dragAt={B} />
                            </div>
                            {uSide && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">In u = {p.uText}: f(u) = {p.id === 'square' ? 'cos u' : p.id === 'linear' ? 'e^(−u)' : '1/u'}</p>
                                    <SidePlot xr={p.uPlot} real={p.fReal} fn={p.f} domain={p.fDomain} from={p.u(0)} to={p.u(B)} pieces={NN > 0 ? uPieces : []} focus={F}
                                        curveColor={MATH_COLORS.curve2} label="f(u)" endLabel="u" />
                                </div>
                            )}
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
                                        <button key={q.id} onClick={() => { setPreset(i); setB(q.b0); }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === preset ? 'border-teal-500 text-teal-300 bg-teal-500/10' : 'border-slate-700 text-slate-300 hover:border-teal-500'}`}>
                                            ∫ {q.label} dx, u = {q.uText}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <ParamSlider label="Upper limit b" value={b} onChange={setB} min={p.bRange[0]} max={p.bRange[1]} step={0.01} accent="teal" format={(v) => num(v, 2)} />
                                    <ParamSlider label="Strips" value={N} onChange={(v) => { setN(v); setFocus(f => Math.min(f, v - 1)); }} min={1} max={16} step={1} accent="teal" />
                                    <ParamSlider label="Highlighted strip" value={Math.min(focus, N - 1) + 1} onChange={(v) => setFocus(v - 1)} min={1} max={N} step={1} accent="teal" />
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
                        <Tex block>{check}</Tex>
                        {stripLine && <Tex block>{stripLine}</Tex>}
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Substituting, step by step</h2>
                        <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                            <li>Spot an inner function <span className="text-teal-300">u(x)</span> whose derivative <span className="text-teal-300">u′(x)</span> also appears.</li>
                            <li>Replace <span className="text-amber-300">u′(x) dx</span> by <span className="text-amber-300">du</span>.</li>
                            <li>Send each limit through u: <span className="text-pink-300">0 → u(0)</span>, <span className="text-pink-300">b → u(b)</span>.</li>
                            <li>Integrate f(u) — usually much easier.</li>
                        </ol>
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
