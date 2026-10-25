"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, Segment, Polygon, Label, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Trace the curve (u(t), v(t)) for t from a to b. The rectangle under its
   end point, minus the one under its start, splits along the curve into
   ∫ u dv (between the curve and the v-axis) and ∫ v du (between the curve
   and the u-axis). That is the parts formula, ∫ u dv = [uv] − ∫ v du.
   Each preset has closed forms for both regions. */
const PRESETS = [
    {
        id: 'xcos', label: '∫ x cos x dx', integrand: 'x cos x', uText: 'x', dvText: 'cos x dx', vText: 'sin x', duText: 'dx',
        tex: String.raw`\int_0^{b} x\cos x\,dx`, uTex: 'x', vTex: String.raw`\sin x`,
        u: (t) => t, v: Math.sin, tOfU: (u) => u, a: 0, bRange: [0.2, Math.PI / 2], b0: Math.PI / 2,
        udv: (b) => b * Math.sin(b) + Math.cos(b) - 1, vdu: (b) => 1 - Math.cos(b),
        uPlot: [-0.25, 1.85], vReal: [-0.2, 1.2],
    },
    {
        id: 'ln', label: '∫ ln x dx', integrand: 'ln x', uText: 'ln x', dvText: 'dx', vText: 'x', duText: 'dx/x',
        tex: String.raw`\int_1^{b} \ln x\,dx`, uTex: String.raw`\ln x`, vTex: 'x',
        u: Math.log, v: (t) => t, tOfU: Math.exp, a: 1, bRange: [1.2, Math.E], b0: Math.E,
        udv: (b) => b * Math.log(b) - b + 1, vdu: (b) => b - 1,
        uPlot: [-0.25, 1.25], vReal: [-0.2, 3],
    },
    {
        id: 'xex', label: '∫ x eˣ dx', integrand: 'x eˣ', uText: 'x', dvText: 'eˣ dx', vText: 'eˣ', duText: 'dx',
        tex: String.raw`\int_0^{b} x e^{x}\,dx`, uTex: 'x', vTex: 'e^{x}',
        u: (t) => t, v: Math.exp, tOfU: (u) => u, a: 0, bRange: [0.2, 1.5], b0: 1,
        udv: (b) => (b - 1) * Math.exp(b) + 1, vdu: (b) => Math.exp(b) - 1,
        uPlot: [-0.25, 1.75], vReal: [-0.3, 4.7],
    },
];

/** The rectangle term [uv] from a to b. */
const boundary = (p, b) => p.u(b) * p.v(b) - p.u(p.a) * p.v(p.a);
/* Math.sin, Math.log and friends can differ in the last bit between Node
   and the browser, which shows up as a hydration mismatch once the value
   lands in an SVG attribute. Plain arithmetic is identical on both, so
   coordinates are rounded before they are drawn. */
const snap = (v) => Math.round(v * 1e9) / 1e9;

/** Points of the curve (u(t), v(t)) for t from a to b. */
const curvePoints = (p, b, n = 80) => Array.from({ length: n + 1 }, (_, i) => {
    const t = p.a + ((b - p.a) * i) / n;
    return [snap(p.u(t)), snap(p.v(t))];
});

const num = (x, d = 3) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 4);

/* The tour: three end points on ∫ x cos x, then the two other integrals. */
const TOUR = [
    { preset: 0, bs: [0.8, 1.2, Math.PI / 2] },
    { preset: 1, bs: [2, Math.E] },
    { preset: 2, bs: [0.6, 1.2] },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let q = 0;
    const p0 = PRESETS[0];
    const push = (s) => steps.push({ regions: true, reveal: true, ...s });
    push({
        kind: 'opening', preset: 0, b: p0.b0, regions: false, curveOnly: true,
        explanation: '∫ x cos x dx: a product, and no substitution untangles it. Integration by parts picks u = x and dv = cos x dx, so du = dx and v = sin x. Now draw the curve traced by (u, v) = (x, sin x) as x runs from 0 to π/2.',
    });
    push({
        kind: 'rectangle', preset: 0, b: p0.b0, regions: false,
        explanation: `The curve ends at (u, v) = (${num(p0.u(p0.b0))}, ${num(p0.v(p0.b0))}). The rectangle under that point has area uv = ${num(boundary(p0, p0.b0))}.`,
    });
    push({
        kind: 'split', preset: 0, b: p0.b0,
        explanation: `The curve cuts the rectangle in two. Below it (blue) is ∫ v du = ∫ sin x dx = ${num(p0.vdu(p0.b0))}. Left of it (orange) is ∫ u dv = ∫ x cos x dx — the integral we want. Together they make the rectangle: ∫ u dv + ∫ v du = uv.`,
    });
    TOUR.forEach(({ preset, bs }, ti) => {
        const p = PRESETS[preset];
        if (ti > 0) {
            push({
                kind: 'newPreset', preset, b: p.bRange[0], regions: false,
                explanation: `${p.label}: take u = ${p.uText} and dv = ${p.dvText}, so du = ${p.duText} and v = ${p.vText}. The curve is (u, v) = (${p.uText}, ${p.vText}), starting at x = ${num(p.a)}.`,
            });
        }
        bs.forEach((b) => {
            push({
                kind: 'ask', preset, b, reveal: false,
                explanation: `End the integral at x = ${num(b)}. The rectangle is uv = ${num(boundary(p, b))} and the blue region ∫ v du is ${num(p.vdu(b))}.`,
            });
            push({
                kind: 'show', preset, b, q: q++,
                explanation: `So the orange region is ∫ u dv = uv − ∫ v du = ${num(boundary(p, b))} − ${num(p.vdu(b))} = ${num(p.udv(b))}: that is ${p.label.replace('dx', '')} from ${num(p.a)} to ${num(b)}.`,
            });
        });
    });
    push({
        kind: 'closing', preset: 1, b: Math.E,
        explanation: '∫ u dv = uv − ∫ v du is the product rule read backwards: d(uv) = u dv + v du. It pays off when ∫ v du is easier than the integral you started with. Switch to Explore and drag the end of the curve.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before the orange region's value appears: what is ∫ u dv? The wrong
   answers add instead of subtracting, take the rectangle alone, or take the
   blue region alone. */
const predictFor = (step, next) => {
    if (!step || !next || step.kind !== 'ask' || next.kind !== 'show') return null;
    const p = PRESETS[next.preset];
    const uv = boundary(p, next.b), blue = p.vdu(next.b);
    const correct = uv - blue;
    const seen = new Set([num(correct)]);
    const wrong = [];
    for (const w of [uv + blue, uv, blue, blue - uv, correct / 2]) {
        if (wrong.length < 3 && !seen.has(num(w))) { seen.add(num(w)); wrong.push(w); }
    }
    const slot = (next.q * 3 + 1) % 4;
    const options = [...wrong];
    options.splice(slot, 0, correct);
    return {
        question: `uv = ${num(uv)} and ∫ v du = ${num(blue)}. What is the orange region, ∫ u dv?`,
        options: options.map(v => num(v)), correct: slot,
        because: `The two regions fill the rectangle: ∫ u dv = uv − ∫ v du = ${num(uv)} − ${num(blue)} = ${num(correct)}.`,
    };
};

const quizQuestions = [
    {
        question: 'For ∫ x eˣ dx, which choice of u makes integration by parts work?',
        options: ['u = eˣ, dv = x dx', 'u = x, dv = eˣ dx', 'u = x eˣ, dv = dx', 'u = 1, dv = x eˣ dx'],
        correct: 1,
        explanation: 'With u = x, du = dx, and v = eˣ: ∫ x eˣ dx = x eˣ − ∫ eˣ dx = x eˣ − eˣ + C. Choosing u = eˣ would leave ∫ (x²/2) eˣ dx — harder than the start.',
    },
    {
        question: 'Integration by parts comes from which differentiation rule?',
        options: ['The chain rule', 'The power rule', 'The product rule', 'The quotient rule'],
        correct: 2,
        explanation: 'd(uv) = u dv + v du. Integrate both sides: uv = ∫ u dv + ∫ v du, and rearrange. In the picture, the two regions fill the rectangle uv.',
    },
    {
        question: '∫₁ᵉ ln x dx with u = ln x, dv = dx. What is the answer?',
        options: ['e', '1', 'e − 1', '0'],
        correct: 1,
        explanation: '[x ln x]₁ᵉ − ∫₁ᵉ x · (1/x) dx = (e·1 − 0) − (e − 1) = 1.',
    },
];

const codeExample = `import numpy as np

def simpson(f, a, b, n=1000):
    x = np.linspace(a, b, n + 1)
    w = np.ones(n + 1); w[1:-1:2] = 4; w[2:-1:2] = 2
    return (b - a) / n / 3 * np.sum(w * f(x))

b = np.pi / 2
# u = x, dv = cos x dx  ->  du = dx, v = sin x
direct = simpson(lambda x: x * np.cos(x), 0, b)
by_parts = b * np.sin(b) - simpson(np.sin, 0, b)   # [uv] - integral of v du
print(direct, by_parts)                             # both pi/2 - 1 = 0.5708

# u = ln x, dv = dx  ->  du = dx/x, v = x
e = np.e
print(simpson(np.log, 1, e), e * 1 - (e - 1))       # both 1.0`;

/* ── page ──────────────────────────────────────────────── */

const HEIGHT_RATIO = 0.75;

function Ticks({ ur, vr, ys }) {
    const { toScreen } = usePlane();
    const out = [];
    const [ox, oy] = toScreen([0, 0]);
    for (let u = 0.5; u <= ur[1] + 1e-9; u += 0.5) {
        const [sx] = toScreen([u, 0]);
        out.push(<line key={`gu${u}`} x1={sx} y1={toScreen([0, vr[1] * ys])[1]} x2={sx} y2={toScreen([0, vr[0] * ys])[1]} stroke={MATH_COLORS.grid} />);
        out.push(<text key={`u${u}`} x={sx} y={oy + 13} fontSize={10} textAnchor="middle" fill={MATH_COLORS.text}>{num(u, 1)}</text>);
    }
    const step = vr[1] - vr[0] > 3 ? 1 : 0.5;
    for (let v = step; v <= vr[1] + 1e-9; v += step) {
        const [, sy] = toScreen([0, v * ys]);
        out.push(<line key={`gv${v}`} x1={toScreen([ur[0], 0])[0]} y1={sy} x2={toScreen([ur[1], 0])[0]} y2={sy} stroke={MATH_COLORS.grid} />);
        out.push(<text key={`v${v}`} x={ox - 4} y={sy + 4} fontSize={10} textAnchor="end" fill={MATH_COLORS.text}>{num(v, 1)}</text>);
    }
    out.push(<text key="ul" x={toScreen([ur[1], 0])[0] - 4} y={oy - 6} fontSize={12} textAnchor="end" fill={MATH_COLORS.text} fontWeight={700}>u</text>);
    out.push(<text key="vl" x={ox + 6} y={toScreen([0, vr[1] * ys])[1] + 14} fontSize={12} fill={MATH_COLORS.text} fontWeight={700}>v</text>);
    return <g>{out}</g>;
}

function PartsPicture({ p, b, regions, curveOnly, reveal, onDrag }) {
    const ys = (HEIGHT_RATIO * (p.uPlot[1] - p.uPlot[0])) / (p.vReal[1] - p.vReal[0]);
    const S = ([u, v]) => [u, ys * v];
    const pts = curvePoints(p, b).map(S);
    const [U1, V1] = [snap(p.u(b)), snap(p.v(b))];
    const [U0, V0] = [snap(p.u(p.a)), snap(p.v(p.a))];
    const below = [[U0, 0], ...pts, [U1, 0]];          // ∫ v du
    const left = [[0, ys * V0], ...pts, [0, ys * V1]];  // ∫ u dv
    const curvePath = pts;
    return (
        <Plane2D xRange={p.uPlot} yRange={[p.vReal[0] * ys, p.vReal[1] * ys]} grid={0} tickLabels={false} ariaLabel={`The curve (u, v) = (${p.uText}, ${p.vText}) and the two regions of integration by parts`}>
            <Ticks ur={p.uPlot} vr={p.vReal} ys={ys} />
            {!curveOnly && (
                <Polygon points={[[0, 0], [U1, 0], [U1, ys * V1], [0, ys * V1]]} fill="#94a3b8" fillOpacity={regions ? 0.04 : 0.15} stroke="#e2e8f0" strokeWidth={1.2} />
            )}
            {regions && <Polygon points={below} fill={MATH_COLORS.k} fillOpacity={0.4} strokeWidth={0} />}
            {regions && <Polygon points={left} fill={MATH_COLORS.curve2} fillOpacity={reveal ? 0.45 : 0.12} strokeWidth={0} />}
            {curvePath.slice(1).map((q, i) => <Segment key={i} from={curvePath[i]} to={q} color={MATH_COLORS.a} width={3} />)}
            {regions && (
                <>
                    <Label at={[U1 * 0.62, ys * V1 * 0.22]} anchor="middle" color="#93c5fd" size={13} weight={700}>∫ v du</Label>
                    <Label at={[U1 * 0.22, ys * (V0 + (V1 - V0) * 0.8)]} anchor="middle" color="#fdba74" size={13} weight={700}>∫ u dv</Label>
                </>
            )}
            <Point at={S([U0, V0])} color={MATH_COLORS.a} r={4} />
            <Point at={S([U1, V1])} color={MATH_COLORS.result} r={6} label={`(${num(U1, 2)}, ${num(V1, 2)})`} labelOffset={[-70, -10]}
                onDrag={onDrag} snap={0.01}
                constrain={([u]) => { const t = Math.min(Math.max(p.tOfU(u), p.bRange[0]), p.bRange[1]); return S([p.u(t), p.v(t)]); }}
                ariaLabel={`End of the curve at x = ${num(b)}; drag along the curve`} />
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

export default function IntegrationByPartsPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [preset, setPreset] = useState(0);        // explore-mode state
    const [b, setB] = useState(1.2);
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
    const regions = guided ? step.regions : true;
    const reveal = guided ? step.reveal : true;
    const curveOnly = guided ? Boolean(step.curveOnly) : false;

    /* Grabbing the end point during the tour switches to Explore, starting
       from whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setPreset(step.preset); setB(step.b);
        setMode('explore'); setIsPlaying(false);
    };
    const drag = ([u]) => { takeOver(); setB(Math.min(Math.max(p.tOfU(u), p.bRange[0]), p.bRange[1])); };

    const uv = boundary(p, B), blue = p.vdu(B), orange = p.udv(B);
    const hide = guided && predict.hideExplanation;
    const showOrange = reveal && !hide;
    const formula = String.raw`${p.tex.replace('{b}', `{${fmt(B)}}`)} =\int u\,dv = \big[uv\big] - \int v\,du = ${fmt(uv)} - ${fmt(blue)} = ${showOrange ? fmt(orange) : '\\;?'}`;
    const setup = String.raw`u = ${p.uTex},\quad v = ${p.vTex},\quad \text{curve } (u, v) \text{ for } x \text{ from } ${fmt(p.a)} \text{ to } ${fmt(B)}`;

    const exploreNote = `Rectangle uv = ${num(uv)}. Blue, ∫ v du = ${num(blue)}. Orange, ∫ u dv = ${num(orange)} — and ${num(blue)} + ${num(orange)} = ${num(blue + orange)}, the rectangle. Drag the end of the curve: the split changes, the sum never does.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/integral-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Integral Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Integration by Parts</h1>
                    <p className="text-teal-50 max-w-3xl">
                        Draw the curve (u, v). The rectangle under its end point splits into two regions — ∫ u dv on one side, ∫ v du on the other — and that is the whole formula.
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
                                {guided ? `${p.label} · step ${currentStep + 1} of ${stepHistory.length}` : 'Drag the end of the curve'}
                            </span>
                        </div>

                        <PartsPicture p={p} b={B} regions={regions} curveOnly={curveOnly} reveal={showOrange || !regions || !guided} onDrag={drag} />
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                            <span><span className="text-amber-400 font-semibold">—</span> the curve (u, v) = ({p.uText}, {p.vText})</span>
                            <span><span className="text-blue-400 font-semibold">■</span> ∫ v du</span>
                            <span><span className="text-orange-400 font-semibold">■</span> ∫ u dv</span>
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
                                            {q.label}
                                        </button>
                                    ))}
                                </div>
                                <ParamSlider label="Upper limit b" value={b} onChange={setB} min={p.bRange[0]} max={p.bRange[1]} step={0.01} accent="teal" format={(v) => num(v, 2)} />
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
                        <Tex block>{setup}</Tex>
                        <Tex block>{formula}</Tex>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Choosing u and dv</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-teal-300 font-semibold">u</span> — something that gets simpler when differentiated (x, ln x).</li>
                            <li><span className="text-teal-300 font-semibold">dv</span> — something you can integrate (cos x dx, eˣ dx, dx).</li>
                            <li><span className="text-orange-300 font-semibold">∫ u dv</span> = <span className="text-slate-200">uv</span> − <span className="text-blue-300 font-semibold">∫ v du</span>, and the new integral should be easier.</li>
                            <li><span className="text-slate-200 font-semibold">The picture</span> — two regions that together fill the rectangle uv.</li>
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
