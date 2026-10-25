"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, Segment, FunctionPlot, Polygon, Label, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Two curves f and g, each with an antiderivative, so ∫(f − g) is exact on
   any piece. The area between them is ∫|f − g|: find where they cross, and
   on each piece integrate top minus bottom. */
const PRESETS = [
    {
        id: 'line-parabola', fName: 'x + 2', gName: 'x²', fTex: 'x + 2', gTex: 'x^2',
        f: (x) => x + 2, g: (x) => x * x, F: (x) => x * x / 2 + 2 * x, G: (x) => x ** 3 / 3,
        a: -1, b: 2, lim: [-2, 3], xRange: [-2.3, 3.3], yRange: [-0.6, 5.6],
    },
    {
        id: 'sin-cos', fName: 'sin x', gName: 'cos x', fTex: String.raw`\sin x`, gTex: String.raw`\cos x`,
        f: Math.sin, g: Math.cos, F: (x) => -Math.cos(x), G: Math.sin,
        a: 0, b: 2 * Math.PI, lim: [0, 2 * Math.PI], xRange: [-0.4, 6.7], yRange: [-1.6, 1.6],
    },
    {
        id: 'root-square', fName: '√x', gName: 'x²', fTex: String.raw`\sqrt{x}`, gTex: 'x^2',
        f: Math.sqrt, g: (x) => x * x, F: (x) => (2 / 3) * x ** 1.5, G: (x) => x ** 3 / 3,
        a: 0, b: 1, lim: [0, 1.5], xRange: [-0.2, 1.7], yRange: [-0.2, 1.5],
    },
];

/** Where f − g changes sign on [a, b], by scanning and then bisecting. */
const crossings = (p, a, b, n = 600) => {
    const h = (x) => p.f(x) - p.g(x);
    const out = [];
    let x0 = a, y0 = h(a);
    for (let i = 1; i <= n; i++) {
        const x1 = a + ((b - a) * i) / n, y1 = h(x1);
        if (y0 === 0) out.push(x0);
        else if (y0 * y1 < 0) {
            let lo = x0, hi = x1;
            for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (h(lo) * h(m) <= 0) hi = m; else lo = m; }
            out.push((lo + hi) / 2);
        }
        x0 = x1; y0 = y1;
    }
    if (h(b) === 0 && !out.some(x => Math.abs(x - b) < 1e-9)) out.push(b);
    return out.filter((x, i) => i === 0 || Math.abs(x - out[i - 1]) > 1e-9);
};

const diffIntegral = (p, a, b) => (p.F(b) - p.F(a)) - (p.G(b) - p.G(a));
/** The pieces between crossings, each with which curve is on top and its area. */
const pieces = (p, a, b) => {
    const cuts = [a, ...crossings(p, a, b).filter(x => x > a + 1e-9 && x < b - 1e-9), b];
    return cuts.slice(0, -1).map((x0, i) => {
        const x1 = cuts[i + 1];
        const signed = diffIntegral(p, x0, x1);
        return { x0, x1, fOnTop: signed >= 0, area: Math.abs(signed) };
    });
};
const areaBetween = (p, a, b) => pieces(p, a, b).reduce((s, q) => s + q.area, 0);

const num = (x, d = 3) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 4);

const HEIGHT_PROBES = [
    { preset: 0, x: 0.5 }, { preset: 0, x: -0.6 }, { preset: 0, x: 1.5 }, { preset: 0, x: 0 },
    { preset: 1, x: 2 }, { preset: 1, x: 5 }, { preset: 1, x: 3.5 },
    { preset: 2, x: 0.5 },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let q = 0;
    const push = (s) => steps.push({ n: 0, probe: null, showCross: true, shade: true, ...s });
    const p0 = PRESETS[0];
    push({
        kind: 'opening', preset: 0, a: -2, b: 3, showCross: false, shade: false,
        explanation: 'The line y = x + 2 and the parabola y = x² cross twice and close off a region. What is its area? First we need to know where it starts and ends.',
    });
    push({
        kind: 'intersect', preset: 0, a: -1, b: 2, shade: false,
        explanation: 'Set them equal: x² = x + 2, so x² − x − 2 = (x − 2)(x + 1) = 0. They cross at x = −1 and x = 2, and between those the line is on top.',
    });
    HEIGHT_PROBES.filter(h => h.preset === 0).forEach((h) => {
        push({ kind: 'probeAsk', preset: 0, a: -1, b: 2, probe: h.x, explanation: `Take one thin vertical strip at x = ${num(h.x)}. How tall is it?` });
        push({
            kind: 'probeShow', preset: 0, a: -1, b: 2, probe: h.x, reveal: true, q: q++,
            explanation: `Top minus bottom: (${num(h.x)} + 2) − (${num(h.x)})² = ${num(p0.f(h.x))} − ${num(p0.g(h.x))} = ${num(p0.f(h.x) - p0.g(h.x))}.`,
        });
    });
    [6, 24].forEach(n => {
        let s = 0; const dx = 3 / n;
        for (let i = 0; i < n; i++) { const x = -1 + (i + 0.5) * dx; s += (p0.f(x) - p0.g(x)) * dx; }
        push({ kind: 'strips', preset: 0, a: -1, b: 2, n, explanation: `${n} strips, each (top − bottom) × Δx: total ${num(s, 4)}.${n === 24 ? ` In the limit, ∫ from −1 to 2 of (x + 2 − x²) dx = ${num(areaBetween(p0, -1, 2), 4)}.` : ''}` });
    });
    const p1 = PRESETS[1];
    const pc = pieces(p1, 0, 2 * Math.PI);
    push({
        kind: 'swap', preset: 1, a: 0, b: 2 * Math.PI,
        explanation: `sin x and cos x on [0, 2π] cross twice, at π/4 and 5π/4, and swap places each time. Integrating sin x − cos x straight across gives ${num(diffIntegral(p1, 0, 2 * Math.PI))}: the pieces where cos is on top count against the piece where sin is.`,
    });
    HEIGHT_PROBES.filter(h => h.preset === 1).forEach((h) => {
        push({ kind: 'probeAsk', preset: 1, a: 0, b: 2 * Math.PI, probe: h.x, explanation: `A strip at x = ${num(h.x)}: sin x = ${num(p1.f(h.x))}, cos x = ${num(p1.g(h.x))}. How tall is it?` });
        push({
            kind: 'probeShow', preset: 1, a: 0, b: 2 * Math.PI, probe: h.x, reveal: true, q: q++,
            explanation: `Whichever is higher minus whichever is lower: ${num(Math.max(p1.f(h.x), p1.g(h.x)))} − (${num(Math.min(p1.f(h.x), p1.g(h.x)))}) = ${num(Math.abs(p1.f(h.x) - p1.g(h.x)))}. Height is never negative.`,
        });
    });
    push({
        kind: 'pieces', preset: 1, a: 0, b: 2 * Math.PI, n: 36,
        explanation: `So split at the crossings and take top minus bottom on each piece: ${pc.map(x => num(x.area)).join(' + ')} = ${num(areaBetween(p1, 0, 2 * Math.PI))} (that is 4√2).`,
    });
    const p2 = PRESETS[2];
    push({
        kind: 'newPair', preset: 2, a: 0, b: 1,
        explanation: 'One more pair: √x and x², which meet at x = 0 and x = 1. Between them √x is on top.',
    });
    HEIGHT_PROBES.filter(h => h.preset === 2).forEach((h) => {
        push({ kind: 'probeAsk', preset: 2, a: 0, b: 1, probe: h.x, explanation: `A strip at x = ${num(h.x)}. How tall is it?` });
        push({
            kind: 'probeShow', preset: 2, a: 0, b: 1, probe: h.x, reveal: true, q: q++,
            explanation: `√${num(h.x)} − (${num(h.x)})² = ${num(p2.f(h.x))} − ${num(p2.g(h.x))} = ${num(p2.f(h.x) - p2.g(h.x))}.`,
        });
    });
    push({
        kind: 'closing', preset: 2, a: 0, b: 1, n: 12,
        explanation: `Adding the strips: ∫₀¹ (√x − x²) dx = 2/3 − 1/3 = 1/3. Switch to Explore to move the interval and see the pieces re-split.`,
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before a strip's height is shown: how tall is it? The wrong answers are
   bottom minus top (negative), the top curve's height alone, and the sum. */
const predictFor = (step, next) => {
    if (!step || !next || step.kind !== 'probeAsk' || next.kind !== 'probeShow') return null;
    const p = PRESETS[next.preset];
    const x = next.probe;
    const top = Math.max(p.f(x), p.g(x)), bottom = Math.min(p.f(x), p.g(x));
    const correct = top - bottom;
    const seen = new Set([num(correct)]);
    const wrong = [];
    for (const w of [bottom - top, top, top + bottom, Math.abs(top) + Math.abs(bottom), correct / 2]) {
        if (wrong.length < 3 && !seen.has(num(w))) { seen.add(num(w)); wrong.push(w); }
    }
    const slot = (next.q * 3 + 1) % 4;
    const options = [...wrong];
    options.splice(slot, 0, correct);
    return {
        question: `At x = ${num(x)}, y = ${p.fName} is ${num(p.f(x))} and y = ${p.gName} is ${num(p.g(x))}. How tall is the strip between them?`,
        options: options.map(v => num(v)), correct: slot,
        because: `Top ${num(top)} minus bottom ${num(bottom)} = ${num(correct)}.`,
    };
};

const quizQuestions = [
    {
        question: 'What is the area between y = x and y = x² from x = 0 to x = 1?',
        options: ['1/2', '1/3', '1/6', '5/6'],
        correct: 2,
        explanation: 'On [0, 1] the line y = x is above y = x². ∫₀¹ (x − x²) dx = 1/2 − 1/3 = 1/6.',
    },
    {
        question: 'Two curves cross inside [a, b]. Why can you not just compute ∫ₐᵇ (f − g) dx?',
        options: [
            'You can — it always gives the area',
            'Where g is on top, f − g is negative and cancels part of the area; you must split at the crossing',
            'Because the integral of a difference is undefined',
            'Because crossings make the curves discontinuous',
        ],
        correct: 1,
        explanation: 'The area is ∫|f − g|. Splitting at each crossing and taking top minus bottom on each piece keeps every strip positive.',
    },
    {
        question: 'y = 4 − x² and y = 0. Where do the limits of integration for the area between them come from?',
        options: ['x = 0 and x = 4', 'x = −2 and x = 2, where 4 − x² = 0', 'x = −4 and x = 4', 'They can be chosen freely'],
        correct: 1,
        explanation: 'The region is closed off where the curves meet: 4 − x² = 0 at x = ±2. The area is ∫ from −2 to 2 of (4 − x²) dx = 32/3.',
    },
];

const codeExample = `import numpy as np

f = lambda x: x + 2          # top
g = lambda x: x**2           # bottom

# Where do they meet?  x^2 - x - 2 = 0
a, b = sorted(np.roots([1, -1, -2]))        # -1, 2

def area_between(f, g, a, b, n=10_000):
    x = np.linspace(a, b, n + 1)
    h = np.abs(f(x) - g(x))                  # top minus bottom, always >= 0
    return np.trapz(h, x)

print(area_between(f, g, a, b))             # 4.5

# Curves that swap places: integrate |sin - cos|, not sin - cos
print(area_between(np.sin, np.cos, 0, 2 * np.pi))   # 5.657 = 4*sqrt(2)`;

/* ── page ──────────────────────────────────────────────── */

const F_COLOR = MATH_COLORS.curve, G_COLOR = MATH_COLORS.curve2;

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

export default function AreaBetweenCurvesPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [preset, setPreset] = useState(0);        // explore-mode state
    const [ab, setAb] = useState([-1, 2]);
    const [n, setN] = useState(12);
    const [probe, setProbe] = useState(0.5);
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
    const [A, B] = guided ? [step.a, step.b] : ab;
    const N = guided ? step.n : n;
    const PR = guided ? step.probe : probe;
    const showCross = guided ? step.showCross : true;
    const shade = guided ? step.shade : true;
    const hide = guided && predict.hideExplanation;
    const revealHeight = !guided || step.kind !== 'probeAsk';

    /* Grabbing a handle during the tour switches to Explore, starting from
       whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setPreset(step.preset); setAb([step.a, step.b]); setN(step.n || 12); setProbe(step.probe ?? (step.a + step.b) / 2);
        setMode('explore'); setIsPlaying(false);
    };
    const clampX = (x) => Math.min(Math.max(x, p.lim[0]), p.lim[1]);
    const moveA = ([x]) => { takeOver(); setAb(([, b]) => [Math.min(clampX(x), b - 0.1), b]); };
    const moveB = ([x]) => { takeOver(); setAb(([a]) => [a, Math.max(clampX(x), a + 0.1)]); };
    const moveProbe = ([x]) => { takeOver(); setProbe(clampX(x)); };

    const pcs = pieces(p, A, B);
    const cross = crossings(p, p.lim[0], p.lim[1]);
    const total = pcs.reduce((s, q) => s + q.area, 0);
    const signed = diffIntegral(p, A, B);
    const regionPoly = (x0, x1) => {
        const top = [], bottom = [];
        for (let i = 0; i <= 60; i++) {
            const x = x0 + ((x1 - x0) * i) / 60;
            top.push([x, Math.max(p.f(x), p.g(x))]);
            bottom.push([x, Math.min(p.f(x), p.g(x))]);
        }
        return [...top, ...bottom.reverse()];
    };
    const strips = [];
    if (N > 0) {
        const dx = (B - A) / N;
        for (let i = 0; i < N; i++) {
            const x0 = A + i * dx, m = x0 + dx / 2;
            const t = Math.max(p.f(m), p.g(m)), bo = Math.min(p.f(m), p.g(m));
            strips.push({ pts: [[x0, bo], [x0 + dx, bo], [x0 + dx, t], [x0, t]], fTop: p.f(m) >= p.g(m) });
        }
    }

    const pieceTex = pcs.map(q => String.raw`\int_{${fmt(q.x0)}}^{${fmt(q.x1)}} (${q.fOnTop ? p.fTex : p.gTex} - ${q.fOnTop ? p.gTex : p.fTex})\,dx`).join(' + ');
    const formula = String.raw`\text{Area} = ${pcs.length > 3 ? String.raw`\sum_{\text{pieces}} \int (\text{top} - \text{bottom})\,dx` : pieceTex} = ${pcs.map(q => fmt(q.area)).join(' + ')} = ${fmt(total)}`;
    const signedLine = String.raw`\int_{${fmt(A)}}^{${fmt(B)}} (f - g)\,dx = ${fmt(signed)} \quad ${Math.abs(signed - total) < 1e-6 ? String.raw`\text{(no crossing inside: same as the area)}` : String.raw`\text{(crossings make pieces cancel)}`}`;
    const probeTop = PR !== null ? Math.max(p.f(PR), p.g(PR)) : null;
    const probeBottom = PR !== null ? Math.min(p.f(PR), p.g(PR)) : null;

    const exploreNote = `On [${num(A, 2)}, ${num(B, 2)}] the curves ${pcs.length > 1 ? `cross ${pcs.length - 1} time${pcs.length > 2 ? 's' : ''}, giving ${pcs.length} pieces` : 'do not cross'}. Area between them: ${num(total, 4)}. Plain ∫(f − g): ${num(signed, 4)}${Math.abs(signed - total) > 1e-6 ? ' — smaller, because pieces where g is on top count negative.' : '.'}`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/integral-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Integral Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Area Between Curves</h1>
                    <p className="text-teal-50 max-w-3xl">
                        Find where the curves meet, then add up thin strips of height top minus bottom — splitting wherever the curves swap places.
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
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag a, b and the probe strip'}
                            </span>
                        </div>

                        <Plane2D xRange={p.xRange} yRange={p.yRange} ariaLabel={`The region between y = ${p.fName} and y = ${p.gName}`}>
                            {shade && N === 0 && pcs.map((q, i) => (
                                <Polygon key={i} points={regionPoly(q.x0, q.x1)} fill={q.fOnTop ? MATH_COLORS.i : MATH_COLORS.result} fillOpacity={0.22} strokeWidth={0} />
                            ))}
                            {strips.map((s, i) => (
                                <Polygon key={`s${i}`} points={s.pts} fill={s.fTop ? MATH_COLORS.i : MATH_COLORS.result} fillOpacity={0.3} strokeWidth={N > 30 ? 0.4 : 1} />
                            ))}
                            <FunctionPlot f={p.f} color={F_COLOR} />
                            <FunctionPlot f={p.g} color={G_COLOR} />
                            {PR !== null && (
                                <>
                                    <Segment from={[PR, probeBottom]} to={[PR, probeTop]} color={MATH_COLORS.a} width={4} />
                                    {revealHeight && !hide && <Label at={[PR, (probeTop + probeBottom) / 2]} dx={8} color={MATH_COLORS.a} size={12} weight={700}>{`height ${num(probeTop - probeBottom)}`}</Label>}
                                    <Point at={[PR, p.yRange[0] + 0.15]} color={MATH_COLORS.a} r={5} onDrag={moveProbe} snap={0.01}
                                        constrain={([x]) => [x, p.yRange[0] + 0.15]} ariaLabel={`Probe strip at x = ${num(PR, 2)}; drag sideways`} />
                                </>
                            )}
                            {showCross && cross.map(x => <Point key={`c${x}`} at={[x, p.f(x)]} color="#f8fafc" r={4} />)}
                            <Point at={[A, 0]} color={MATH_COLORS.a} r={5} label="a" labelOffset={[-4, 16]} onDrag={moveA} snap={0.01}
                                constrain={([x]) => [x, 0]} ariaLabel={`Left end a = ${num(A, 2)}; drag along the axis`} />
                            <Point at={[B, 0]} color={MATH_COLORS.a} r={5} label="b" labelOffset={[-4, 16]} onDrag={moveB} snap={0.01}
                                constrain={([x]) => [x, 0]} ariaLabel={`Right end b = ${num(B, 2)}; drag along the axis`} />
                        </Plane2D>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                            <span><span className="text-sky-400 font-semibold">—</span> f(x) = {p.fName}</span>
                            <span><span className="text-orange-400 font-semibold">—</span> g(x) = {p.gName}</span>
                            <span><span className="text-green-400 font-semibold">■</span> f on top</span>
                            <span><span className="text-pink-400 font-semibold">■</span> g on top</span>
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
                                        <button key={q.id} onClick={() => { setPreset(i); setAb([q.a, q.b]); setProbe((q.a + q.b) / 2); }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === preset ? 'border-teal-500 text-teal-300 bg-teal-500/10' : 'border-slate-700 text-slate-300 hover:border-teal-500'}`}>
                                            {q.fName} and {q.gName}
                                        </button>
                                    ))}
                                    <button onClick={() => setAb(p.id === 'line-parabola' ? [-1, 2] : [p.a, p.b])}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-teal-500">Snap to the crossings</button>
                                </div>
                                <ParamSlider label="Strips n (0 = shade the region)" value={n} onChange={setN} min={0} max={60} step={1} accent="teal" />
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
                        <Tex block>{String.raw`f(x) = ${p.fTex}, \qquad g(x) = ${p.gTex}, \qquad \text{crossings at } x = ${cross.map(x => fmt(x)).join(',\\ ')}`}</Tex>
                        {PR !== null && revealHeight && !hide && (
                            <Tex block>{String.raw`\text{strip at } x = ${fmt(PR)}: \; ${fmt(probeTop)} - (${fmt(probeBottom)}) = ${fmt(probeTop - probeBottom)}`}</Tex>
                        )}
                        <Tex block>{formula}</Tex>
                        <Tex block>{signedLine}</Tex>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Area between two curves</h2>
                        <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                            <li>Find where they meet: solve <span className="text-teal-300">f(x) = g(x)</span>.</li>
                            <li>On each piece, decide which curve is on top.</li>
                            <li>Integrate <span className="text-amber-300">top − bottom</span> on each piece.</li>
                            <li>Add the pieces. Every strip has positive height, so nothing cancels.</li>
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
