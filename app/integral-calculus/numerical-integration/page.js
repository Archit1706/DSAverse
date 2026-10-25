"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { FunctionPlot, Polygon, Label, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Three rules on n equal pieces of [a, b]:
     trapezoid  (Δx/2)[f₀ + 2f₁ + … + 2fₙ₋₁ + fₙ]          error ∝ 1/n²
     midpoint   Δx[f(m₁) + … + f(mₙ)]                      error ∝ 1/n²
     Simpson    (Δx/3)[f₀ + 4f₁ + 2f₂ + … + 4fₙ₋₁ + fₙ]    error ∝ 1/n⁴ (n even) */
const FUNCS = [
    { id: 'sin', name: 'sin x on [0, π]', tex: String.raw`\int_0^{\pi} \sin x\,dx`, f: Math.sin, a: 0, b: Math.PI, exact: 2, yReal: [-0.15, 1.15] },
    { id: 'exp', name: 'eˣ on [0, 1]', tex: String.raw`\int_0^{1} e^{x}\,dx`, f: Math.exp, a: 0, b: 1, exact: Math.E - 1, yReal: [-0.2, 2.9] },
    {
        id: 'arctan', name: '1/(1 + x²) on [0, 1]', tex: String.raw`\int_0^{1} \frac{dx}{1 + x^2}`, f: (x) => 1 / (1 + x * x), a: 0, b: 1, exact: Math.PI / 4, yReal: [-0.1, 1.15],
        // Simpson's leading error term is proportional to f‴(b) − f‴(a); here f‴(0) = f‴(1) = 0.
        note: 'Simpson does even better than 1/n⁴ here — about 1/n⁶ — because its leading error term depends on f‴ at the two ends, and for 1/(1 + x²) both are 0.',
    },
];

const trapezoid = (fn, n) => {
    const h = (fn.b - fn.a) / n;
    let s = (fn.f(fn.a) + fn.f(fn.b)) / 2;
    for (let i = 1; i < n; i++) s += fn.f(fn.a + i * h);
    return s * h;
};
const midpoint = (fn, n) => {
    const h = (fn.b - fn.a) / n;
    let s = 0;
    for (let i = 0; i < n; i++) s += fn.f(fn.a + (i + 0.5) * h);
    return s * h;
};
const simpson = (fn, n) => {
    const m = n % 2 ? n + 1 : n;   // Simpson needs an even number of pieces
    const h = (fn.b - fn.a) / m;
    let s = fn.f(fn.a) + fn.f(fn.b);
    for (let i = 1; i < m; i++) s += fn.f(fn.a + i * h) * (i % 2 ? 4 : 2);
    return (s * h) / 3;
};
const RULES = [
    { id: 'trap', name: 'Trapezoid', run: trapezoid, order: 2, color: '#fbbf24' },
    { id: 'mid', name: 'Midpoint', run: midpoint, order: 2, color: '#38bdf8' },
    { id: 'simp', name: 'Simpson', run: simpson, order: 4, color: '#f472b6' },
];
const errorOf = (fn, rule, n) => Math.abs(RULES.find(r => r.id === rule).run(fn, n) - fn.exact);

const SHRINK = ['About 1/4', 'About 1/9', 'About 1/16', 'About 1/81'];
const SHRINK_VALUES = [1 / 4, 1 / 9, 1 / 16, 1 / 81];
const nearestShrink = (ratio) => {
    let best = 0;
    SHRINK_VALUES.forEach((v, i) => { if (Math.abs(Math.log(ratio / v)) < Math.abs(Math.log(ratio / SHRINK_VALUES[best]))) best = i; });
    return best;
};

const num = (x, d = 5) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const sci = (x) => (x === 0 ? '0' : x < 1e-3 ? x.toExponential(2).replace('-', '−') : num(x, 5));
const fmt = (x) => texNum(x, 6);

/* The tour: n changes, and which rule each change asks about. */
const TOUR = [
    { fn: 0, ns: [2, 4, 12, 24, 48], ask: ['trap', 'simp', 'mid', 'simp'] },
    { fn: 1, ns: [2, 6, 12], ask: ['trap', 'simp'] },
    { fn: 2, ns: [2, 6], ask: ['mid'] },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    steps.push({
        kind: 'opening', fnIndex: 0, n: 2,
        explanation: '∫ sin x dx from 0 to π is exactly 2. A computer cannot take a limit, so it settles for a finite rule. Three classic ones, side by side: trapezoids, midpoint rectangles, and Simpson\'s parabolas.',
    });
    TOUR.forEach(({ fn: fi, ns, ask }, ti) => {
        const fn = FUNCS[fi];
        if (ti > 0) steps.push({ kind: 'newFn', fnIndex: fi, n: ns[0], explanation: `Now ${fn.name}, exact value ${num(fn.exact, 6)}. n = ${ns[0]}: errors ${RULES.map(r => `${r.name.toLowerCase()} ${sci(errorOf(fn, r.id, ns[0]))}`).join(', ')}.` });
        ns.slice(1).forEach((n, k) => {
            const prevN = ns[k];
            const rule = ask[k];
            const detail = RULES.map(r => `${r.name.toLowerCase()} ${sci(errorOf(fn, r.id, n))} (×${num(errorOf(fn, r.id, n) / errorOf(fn, r.id, prevN), 3)})`).join(', ');
            steps.push({
                kind: 'refine', fnIndex: fi, n, prevN, rule,
                explanation: `n = ${prevN} → ${n}, ${n / prevN} times as many pieces. Errors now: ${detail}. Trapezoid and midpoint shrink like 1/n², Simpson like 1/n⁴.`,
            });
        });
    });
    steps.push({
        kind: 'closing', fnIndex: 0, n: 16,
        explanation: 'On the log-log chart the three error lines are straight, with slopes −2, −2 and −4. Simpson gets the error on ∫ sin x down to about 10⁻⁶ with n = 32; the trapezoid rule needs about 1000 pieces for the same. Switch to Explore to try the other integrals.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each refinement: by about how much will one rule's error shrink?
   The four ratios keep one order; across the tour 1/4, 1/9 and 1/16 are
   each right twice and 1/81 once. */
const predictFor = (step, next) => {
    if (!step || !next || next.kind !== 'refine') return null;
    const fn = FUNCS[next.fnIndex];
    const rule = RULES.find(r => r.id === next.rule);
    const ratio = errorOf(fn, rule.id, next.n) / errorOf(fn, rule.id, next.prevN);
    const k = next.n / next.prevN;
    return {
        question: `${rule.name} rule: n goes from ${next.prevN} to ${next.n} (${k} times as many pieces). Its error will shrink to about what fraction?`,
        options: SHRINK, correct: nearestShrink(ratio),
        because: `${rule.name} error ∝ 1/n${rule.order === 2 ? '²' : '⁴'}, so ×${k} pieces gives 1/${k ** rule.order} of the error. Measured: ${sci(errorOf(fn, rule.id, next.prevN))} → ${sci(errorOf(fn, rule.id, next.n))}.`,
    };
};

const quizQuestions = [
    {
        question: 'You double n. Roughly what happens to the trapezoid-rule error on a smooth function?',
        options: ['It halves', 'It falls to a quarter', 'It falls to a sixteenth', 'It does not change'],
        correct: 1,
        explanation: 'The trapezoid error is proportional to Δx² ∝ 1/n². Doubling n divides it by 2² = 4.',
    },
    {
        question: 'Why is Simpson\'s rule so much more accurate than the trapezoid rule?',
        options: [
            'It uses more points per piece',
            'It fits a parabola through each pair of pieces, so it is exact for cubics and its error falls like 1/n⁴',
            'It uses the exact antiderivative',
            'It only works for polynomials',
        ],
        correct: 1,
        explanation: 'Each pair of pieces is replaced by the parabola through three points. By symmetry the rule is exact even for cubics, and the error term involves f⁗ and Δx⁴.',
    },
    {
        question: 'On a log-log plot of error against n, the midpoint rule gives a line of slope −2. What slope does Simpson\'s rule give?',
        options: ['−1', '−2', '−3', '−4'],
        correct: 3,
        explanation: 'Error ∝ n⁻ᵖ means log(error) = −p·log n + const: a straight line of slope −p. Simpson has p = 4.',
    },
];

const codeExample = `import numpy as np

def trapezoid(f, a, b, n):
    x = np.linspace(a, b, n + 1); h = (b - a) / n
    return h * (f(x[0]) / 2 + f(x[1:-1]).sum() + f(x[-1]) / 2)

def midpoint(f, a, b, n):
    h = (b - a) / n
    return h * f(a + (np.arange(n) + 0.5) * h).sum()

def simpson(f, a, b, n):          # n even
    x = np.linspace(a, b, n + 1); h = (b - a) / n
    w = np.ones(n + 1); w[1:-1:2] = 4; w[2:-1:2] = 2
    return h / 3 * (w * f(x)).sum()

for n in [2, 4, 8, 16, 32]:
    errs = [abs(rule(np.sin, 0, np.pi, n) - 2) for rule in (trapezoid, midpoint, simpson)]
    print(n, errs)
# each doubling: trapezoid and midpoint errors /4, Simpson /16`;

/* ── page ──────────────────────────────────────────────── */

const HEIGHT_RATIO = 0.6;

function YTicks({ fn, ys }) {
    const { toScreen } = usePlane();
    const span = fn.yReal[1] - fn.yReal[0];
    const step = span > 2 ? 1 : 0.5;
    const out = [];
    for (let y = step; y <= fn.yReal[1] + 1e-9; y += step) {
        const [sx, sy] = toScreen([fn.a, y * ys]);
        out.push(<text key={y} x={sx - 3} y={sy + 3} fontSize={9} textAnchor="end" fill={MATH_COLORS.text}>{num(y, 1)}</text>);
    }
    return <g>{out}</g>;
}

function RulePanel({ fn, rule, n }) {
    const pad = (fn.b - fn.a) * 0.08;
    const xr = [fn.a - pad, fn.b + pad];
    const ys = (HEIGHT_RATIO * (xr[1] - xr[0])) / (fn.yReal[1] - fn.yReal[0]);
    // rounded: Math.sin and Math.exp can differ in their last bit between server and browser
    const s = (x) => Math.round(ys * fn.f(x) * 1e9) / 1e9;
    const h = (fn.b - fn.a) / n;
    const shapes = [];
    if (rule.id === 'trap') {
        for (let i = 0; i < n; i++) {
            const x0 = fn.a + i * h, x1 = x0 + h;
            shapes.push([[x0, 0], [x1, 0], [x1, s(x1)], [x0, s(x0)]]);
        }
    } else if (rule.id === 'mid') {
        for (let i = 0; i < n; i++) {
            const x0 = fn.a + i * h, y = s(x0 + h / 2);
            shapes.push([[x0, 0], [x0 + h, 0], [x0 + h, y], [x0, y]]);
        }
    } else {
        const m = n % 2 ? n + 1 : n, hh = (fn.b - fn.a) / m;
        for (let i = 0; i < m; i += 2) {
            const x0 = fn.a + i * hh, x1 = x0 + hh, x2 = x1 + hh;
            const y0 = s(x0), y1 = s(x1), y2 = s(x2);
            // the parabola through the three points, in Lagrange form
            const q = (x) => y0 * ((x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2)) + y1 * ((x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2)) + y2 * ((x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1));
            const pts = [[x0, 0]];
            for (let k = 0; k <= 16; k++) { const x = x0 + ((x2 - x0) * k) / 16; pts.push([x, q(x)]); }
            pts.push([x2, 0]);
            shapes.push(pts);
        }
    }
    const value = rule.run(fn, n);
    return (
        <div>
            <p className="text-xs mb-1" style={{ color: rule.color }}>{rule.name}: {num(value, 6)}</p>
            <div className="rounded-lg overflow-hidden border border-slate-800">
                <Plane2D xRange={xr} yRange={[fn.yReal[0] * ys, fn.yReal[1] * ys]} grid={0} tickLabels={false} width={300}
                    ariaLabel={`${rule.name} rule with n = ${n} on ${fn.name}`}>
                    <YTicks fn={fn} ys={ys} />
                    {shapes.map((pts, i) => <Polygon key={i} points={pts} fill={rule.color} fillOpacity={0.25} stroke={rule.color} strokeWidth={n > 24 ? 0.5 : 1} />)}
                    <FunctionPlot f={s} domain={[fn.a, fn.b]} color={MATH_COLORS.curve} width={2} />
                    <Label at={[xr[1], fn.yReal[1] * ys]} anchor="end" dx={-4} dy={13} color={MATH_COLORS.text} size={11}>{`error ${sci(Math.abs(value - fn.exact))}`}</Label>
                </Plane2D>
            </div>
        </div>
    );
}

/* Error against n on log-log axes, with the current n marked. */
function ErrorChart({ fn, n }) {
    const W = 320, H = 170, padL = 36, padB = 20, padT = 8, padR = 10;
    const ns = useMemo(() => [2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256], []);
    const series = useMemo(() => RULES.map(r => ns.map(k => [k, errorOf(fn, r.id, k)])), [fn, ns]);
    const LX = [Math.log10(2), Math.log10(256)], LY = [-12, 0];
    // Rounded: Math.log10 can differ in its last bit between server and browser.
    const px = (k) => +(padL + ((Math.log10(k) - LX[0]) / (LX[1] - LX[0])) * (W - padL - padR)).toFixed(2);
    const py = (e) => +(padT + (1 - (Math.log10(Math.max(e, 1e-12)) - LY[0]) / (LY[1] - LY[0])) * (H - padT - padB)).toFixed(2);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Error against n on logarithmic axes for the three rules" className="block">
            <rect x={0} y={0} width={W} height={H} fill="#020617" />
            {[-12, -9, -6, -3, 0].map(e => (
                <g key={e}>
                    <line x1={padL} y1={py(10 ** e)} x2={W - padR} y2={py(10 ** e)} stroke="#1e293b" />
                    <text x={padL - 4} y={py(10 ** e) + 3} fontSize={9} textAnchor="end" fill="#94a3b8">{`1e${e}`.replace('-', '−')}</text>
                </g>
            ))}
            {[2, 8, 32, 128].map(k => (
                <g key={k}>
                    <line x1={px(k)} y1={padT} x2={px(k)} y2={H - padB} stroke="#1e293b" />
                    <text x={px(k)} y={H - 6} fontSize={9} textAnchor="middle" fill="#94a3b8">{`n = ${k}`}</text>
                </g>
            ))}
            {series.map((pts, i) => (
                <g key={RULES[i].id}>
                    <path d={pts.filter(([, e]) => e > 1e-13).map(([k, e], j) => `${j ? 'L' : 'M'}${px(k).toFixed(1)},${py(e).toFixed(1)}`).join('')} fill="none" stroke={RULES[i].color} strokeWidth={1.8} />
                    {pts.filter(([, e]) => e > 1e-13).map(([k, e]) => <circle key={k} cx={px(k)} cy={py(e)} r={2} fill={RULES[i].color} />)}
                </g>
            ))}
            <line x1={px(n)} y1={padT} x2={px(n)} y2={H - padB} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.6} />
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

export default function NumericalIntegrationPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [fnIndex, setFnIndex] = useState(0);      // explore-mode state
    const [n, setN] = useState(4);
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
    const N = guided ? step.n : n;
    const hide = guided && predict.hideExplanation;

    const takeOver = () => {
        if (!guided) return;
        setFnIndex(step.fnIndex); setN(step.n);
        setMode('explore'); setIsPlaying(false);
    };

    const h = (fn.b - fn.a) / N;
    const T = trapezoid(fn, N), M = midpoint(fn, N), S = simpson(fn, N);
    const lines = [
        String.raw`T_{${N}} = \tfrac{\Delta x}{2}\big[f_0 + 2f_1 + \cdots + 2f_{${N - 1}} + f_{${N}}\big] = ${fmt(T)}`,
        String.raw`M_{${N}} = \Delta x\big[f(m_1) + \cdots + f(m_{${N}})\big] = ${fmt(M)}`,
        String.raw`S_{${N}} = \tfrac{\Delta x}{3}\big[f_0 + 4f_1 + 2f_2 + \cdots + 4f_{${N - 1}} + f_{${N}}\big] = ${fmt(S)}`,
        String.raw`${fn.tex} = ${fmt(fn.exact)}, \qquad \Delta x = ${texNum(h, 5)}`,
    ];

    const exploreNote = `n = ${N}: errors ${RULES.map(r => `${r.name.toLowerCase()} ${sci(errorOf(fn, r.id, N))}`).join(', ')}. Double n and watch the first two fall by about 4 and Simpson's by about 16.${fn.note ? ` ${fn.note}` : ''}`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/integral-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Integral Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Numerical Integration</h1>
                    <p className="text-teal-50 max-w-3xl">
                        Most integrals have no formula, so computers use rules. Trapezoids, midpoints and parabolas all converge — but at very different speeds.
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
                                {guided ? `${fn.name}, n = ${N} · step ${currentStep + 1} of ${stepHistory.length}` : 'Change the function and n'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {RULES.map(r => <RulePanel key={r.id} fn={fn} rule={r} n={N} />)}
                        </div>
                        {!hide && (
                            <div className="mt-3">
                                <p className="text-xs text-slate-500 mb-1">Error against n (log scales): <span className="text-amber-300">trapezoid</span>, <span className="text-sky-300">midpoint</span>, <span className="text-pink-300">Simpson</span></p>
                                <div className="rounded-lg overflow-hidden border border-slate-800"><ErrorChart fn={fn} n={N} /></div>
                            </div>
                        )}

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
                                        <button key={g.id} onClick={() => setFnIndex(i)}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === fnIndex ? 'border-teal-500 text-teal-300 bg-teal-500/10' : 'border-slate-700 text-slate-300 hover:border-teal-500'}`}>
                                            {g.name}
                                        </button>
                                    ))}
                                </div>
                                <ParamSlider label="Pieces n (even, for Simpson)" value={n} onChange={setN} min={2} max={64} step={2} accent="teal" />
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

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-2 text-slate-100 text-sm sm:text-base">
                        {lines.map((l, i) => <Tex key={i} block>{l}</Tex>)}
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Error orders</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-amber-300 font-semibold">Trapezoid</span> — straight lines between samples. Error ∝ 1/n².</li>
                            <li><span className="text-sky-300 font-semibold">Midpoint</span> — rectangles at the midpoints. Error ∝ 1/n², about half the trapezoid&apos;s, with the opposite sign.</li>
                            <li><span className="text-pink-300 font-semibold">Simpson</span> — parabolas through pairs of pieces. Error ∝ 1/n⁴.</li>
                            <li><span className="text-slate-200 font-semibold">Log-log slope</span> — error ∝ n⁻ᵖ draws a line of slope −p.</li>
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
