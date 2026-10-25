"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   A discrete random variable is a list of values x with probabilities p(x)
   that add to 1. E[X] = ∑ x p(x) is the point where bars of weight p(x)
   placed at x balance; Var(X) = ∑ (x − μ)² p(x) is the weighted mean squared
   distance from that point. */
const mean = (xs, ps) => xs.reduce((s, x, i) => s + x * ps[i], 0);
const variance = (xs, ps) => { const m = mean(xs, ps); return xs.reduce((s, x, i) => s + (x - m) ** 2 * ps[i], 0); };
/**
 * Sets bar i to probability h and rescales the others so they still sum to
 * 1 − h, keeping their proportions (or sharing equally if they were all 0).
 */
const setBar = (ps, i, h) => {
    const target = Math.min(Math.max(h, 0), 1);
    const rest = ps.reduce((s, p, j) => (j === i ? s : s + p), 0);
    return ps.map((p, j) => {
        if (j === i) return target;
        if (rest > 1e-12) return (p * (1 - target)) / rest;
        return (1 - target) / (ps.length - 1);
    });
};
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const binomPs = (n) => { const out = [1]; for (let k = 1; k <= n; k++) out.push((out[k - 1] * (n - k + 1)) / k); return out.map(c => c / 2 ** n); };

const PRESETS = {
    fair: { label: 'Fair die', xs: range(1, 6), ps: Array(6).fill(1 / 6) },
    loaded: { label: 'Loaded die', xs: range(1, 6), ps: [0.1, 0.1, 0.1, 0.1, 0.1, 0.5] },
    twoDice: { label: 'Sum of two dice', xs: range(2, 12), ps: [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map(c => c / 36) },
    narrow: { label: '3 or 4', xs: range(1, 6), ps: [0, 0, 0.5, 0.5, 0, 0] },
    wide: { label: '1 or 6', xs: range(1, 6), ps: [0.5, 0, 0, 0, 0, 0.5] },
    lottery: { label: 'Lottery ticket', xs: range(0, 10), ps: [0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1] },
    coins: { label: 'Heads in 4 flips', xs: range(0, 4), ps: binomPs(4) },
};
const fmt = (x) => texNum(x, 2);

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (preset, explanation, extra = {}) => steps.push({ preset, xs: PRESETS[preset].xs, ps: PRESETS[preset].ps, hideMean: false, hideSpread: true, explanation, question: null, ask: null, ...extra });
    push('fair', 'A fair die is a random variable X taking the values 1 to 6, each with probability 1/6. Picture each probability as a weight standing on a beam at its value.',
        { hideMean: true, question: 'mean', ask: ask++ });
    push('fair', 'The beam balances at 3.5: E[X] = (1 + 2 + 3 + 4 + 5 + 6) × 1/6 = 3.5. The expected value is a centre of mass — and here it is a value the die can never show.');
    push('loaded', 'A loaded die: 6 comes up half the time, every other face 1/10 of the time. The weight has shifted right.',
        { hideMean: true, question: 'mean', ask: ask++ });
    push('loaded', 'E[X] = (1 + 2 + 3 + 4 + 5) × 0.1 + 6 × 0.5 = 1.5 + 3 = 4.5. Each value pulls on the beam in proportion to its probability.');
    push('twoDice', 'The sum of two fair dice: 2 to 12, with 7 the most likely (6 of the 36 rolls).',
        { hideMean: true, question: 'mean', ask: ask++ });
    push('twoDice', 'It balances at 7. No need to add up eleven terms: expectation is additive, E[X + Y] = E[X] + E[Y] = 3.5 + 3.5 = 7.');
    push('narrow', '"3 or 4, equally likely" balances at 3.5, exactly like the fair die — but all of the weight is close to the middle. The bracket under the beam is one standard deviation each side: σ = 0.5.',
        { hideSpread: false });
    push('wide', '"1 or 6, equally likely" also balances at 3.5. The variance is the average squared distance from the balance point.',
        { hideSpread: true, question: 'variance', ask: ask++ });
    push('wide', 'Both values are 2.5 from the middle, so Var(X) = 2.5² × 0.5 + 2.5² × 0.5 = 6.25 and σ = 2.5. Same mean, very different risk — the mean alone cannot tell them apart.',
        { hideSpread: false });
    push('lottery', 'A lottery ticket: nothing 90% of the time, 10 the other 10%.', { hideMean: true, question: 'mean', ask: ask++ });
    push('lottery', 'E[X] = 0 × 0.9 + 10 × 0.1 = 1. If the ticket costs more than 1 you lose on average, even though you never win exactly 1. σ = 3: the spread dwarfs the mean.',
        { hideSpread: false });
    push('fair', 'Back to the fair die.', { hideSpread: true, question: 'variance', ask: ask++ });
    push('fair', 'Var(X) = ∑ (x − 3.5)² / 6 = (6.25 + 2.25 + 0.25 + 0.25 + 2.25 + 6.25) / 6 = 35/12 ≈ 2.92, so σ ≈ 1.71.', { hideSpread: false });
    push('fair', 'E[X] is where the distribution balances; Var(X) is how widely its weight is spread around that point. Switch to Explore and drag the bars to make your own distribution.', { hideSpread: false });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Where it balances (not the middle of the range, not the most likely value,
   not half a step either side), and the variance (not σ, not the mean, not
   E[X²] — the usual slips). */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    const { xs, ps } = step;
    const m = mean(xs, ps), v = variance(xs, ps);
    let correct, candidates, question, because;
    if (step.question === 'mean') {
        correct = m;
        const mode = xs[ps.indexOf(Math.max(...ps))];
        candidates = [(xs[0] + xs[xs.length - 1]) / 2, mode, m + 0.5, m - 0.5, xs[xs.length - 1], 2 * m];
        question = `Where does the beam balance? That is, what is E[X] for "${PRESETS[step.preset].label}"?`;
        because = `E[X] = ∑ x · p(x) = ${xs.map((x, i) => (ps[i] > 0 ? `${x} × ${fmt(ps[i])}` : null)).filter(Boolean).join(' + ')} = ${fmt(m)}.`;
    } else {
        correct = v;
        const ex2 = xs.reduce((s, x, i) => s + x * x * ps[i], 0);
        candidates = [Math.sqrt(v), m, ex2, 2 * v];
        question = `What is the variance Var(X) for "${PRESETS[step.preset].label}"? (The mean is ${fmt(m)}.)`;
        because = `Var(X) = ∑ (x − ${fmt(m)})² p(x) = ${fmt(v)}; its square root, σ = ${fmt(Math.sqrt(v))}, is the standard deviation.`;
    }
    const seen = new Set([fmt(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (seen.has(fmt(c))) continue;
        seen.add(fmt(c));
        wrong.push(c);
    }
    const slot = (step.ask * 3 + 1) % 4;
    const ordered = [...wrong];
    ordered.splice(slot, 0, correct);
    return { question, options: ordered.map(fmt), correct: slot, because };
};

const quizQuestions = [
    {
        question: 'A game pays 5 with probability 0.2 and 0 otherwise. What is the expected payout?',
        options: ['2.5', '0.2', '1', '5'],
        correct: 2,
        explanation: 'E[X] = 5 × 0.2 + 0 × 0.8 = 1. On average, over many plays, the game pays 1 per play.',
    },
    {
        question: 'Two distributions both have mean 10. One has variance 1, the other variance 25. What does that tell you?',
        options: [
            'The second is centred further right',
            'The second is spread out much more widely around 10',
            'They are the same distribution',
            'The second is more likely to equal 10',
        ],
        correct: 1,
        explanation: 'Variance measures spread around the mean, not location. σ = 1 versus σ = 5: values of the second typically land five times as far from 10.',
    },
    {
        question: 'X is the roll of a fair die and Y is the roll of another. What is E[X + Y]?',
        options: ['7', '12', '3.5', '6'],
        correct: 0,
        explanation: 'Expectation is additive: E[X + Y] = E[X] + E[Y] = 3.5 + 3.5 = 7, with no need to list the 36 outcomes.',
    },
];

const codeExample = `from fractions import Fraction

# A distribution as {value: probability}
die = {x: Fraction(1, 6) for x in range(1, 7)}

def E(dist):
    return sum(x * p for x, p in dist.items())

def Var(dist):
    mu = E(dist)
    return sum((x - mu) ** 2 * p for x, p in dist.items())

print(E(die), Var(die))            # 7/2 35/12

loaded = {1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1, 6: 0.5}
print(round(E(loaded), 2))         # 4.5

lottery = {0: 0.9, 10: 0.1}
print(E(lottery), Var(lottery) ** 0.5)   # 1.0 3.0`;

/* ── picture ───────────────────────────────────────────── */

const W = 640, H = 330, LEFT = 50, RIGHT = 610, BEAM = 262, TOP = 30;

/**
 * Bars standing on a beam, a fulcrum at E[X] and a bracket of ±σ. Each bar
 * can be dragged up or down (or nudged with the arrow keys); the others
 * rescale so the probabilities still add to 1.
 */
function BalanceBeam({ xs, ps, hideMean, hideSpread, onBar }) {
    const svgRef = useRef(null);
    const drag = useRef(null);
    const lo = xs[0] - 0.6, hi = xs[xs.length - 1] + 0.6;
    const X = (x) => LEFT + ((x - lo) / (hi - lo)) * (RIGHT - LEFT);
    const yMax = Math.max(0.3, Math.min(1, Math.ceil((Math.max(...ps) + 0.05) * 10) / 10));
    const Y = (p) => BEAM - (p / yMax) * (BEAM - TOP);
    const m = mean(xs, ps), sd = Math.sqrt(variance(xs, ps));
    const barW = Math.min(36, ((RIGHT - LEFT) / xs.length) * 0.6);
    const toP = (clientY) => {
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = 0; pt.y = clientY;
        const y = pt.matrixTransform(svg.getScreenCTM().inverse()).y;
        return Math.round(((BEAM - y) / (BEAM - TOP)) * yMax * 100) / 100;
    };
    return (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="A distribution as weights on a balance beam" className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            {[0.25, 0.5, 0.75, 1].map(f => f * yMax).map(p => (
                <g key={p}>
                    <line x1={LEFT} y1={Y(p)} x2={RIGHT} y2={Y(p)} stroke="#1e293b" />
                    <text x={LEFT - 6} y={Y(p) + 4} fontSize={10} fill="#64748b" textAnchor="end">{texNum(p, 2)}</text>
                </g>
            ))}
            {xs.map((x, i) => (
                <g key={x} onPointerDown={onBar ? (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = i; onBar(i, toP(e.clientY)); } : undefined}
                    onPointerMove={onBar ? (e) => { if (drag.current === i) onBar(i, toP(e.clientY)); } : undefined}
                    onPointerUp={onBar ? (e) => { drag.current = null; e.currentTarget.releasePointerCapture?.(e.pointerId); } : undefined}
                    onKeyDown={onBar ? (e) => {
                        if (e.key === 'ArrowUp') { e.preventDefault(); onBar(i, ps[i] + 0.01); }
                        if (e.key === 'ArrowDown') { e.preventDefault(); onBar(i, ps[i] - 0.01); }
                    } : undefined}
                    tabIndex={onBar ? 0 : undefined} role={onBar ? 'slider' : undefined} aria-label={onBar ? `P(X = ${x})` : undefined}
                    aria-valuenow={onBar ? Math.round(ps[i] * 100) / 100 : undefined}
                    style={{ cursor: onBar ? 'ns-resize' : 'default', touchAction: 'none' }} className="focus:outline-none">
                    <rect x={X(x) - barW / 2 - 6} y={TOP - 10} width={barW + 12} height={BEAM - TOP + 10} fill="transparent" />
                    <rect x={X(x) - barW / 2} y={Y(ps[i])} width={barW} height={Math.max(BEAM - Y(ps[i]), 0)} rx={4}
                        fill="#e11d48" fillOpacity={0.8} stroke="#fda4af" strokeWidth={1} style={{ transition: 'y .2s ease, height .2s ease' }} />
                    {ps[i] > 0.004 && <text x={X(x)} y={Y(ps[i]) - 5} fontSize={10} fill="#fecdd3" textAnchor="middle">{texNum(ps[i], 3)}</text>}
                    <text x={X(x)} y={BEAM + 16} fontSize={12} fontWeight={700} fill="#e2e8f0" textAnchor="middle">{x}</text>
                </g>
            ))}
            <rect x={LEFT} y={BEAM} width={RIGHT - LEFT} height={4} fill="#94a3b8" rx={2} />
            {!hideMean && (
                <g style={{ transform: `translateX(${X(m)}px)`, transition: 'transform .35s ease' }}>
                    <polygon points={`0,${BEAM + 4} -13,${BEAM + 34} 13,${BEAM + 34}`} fill="#fbbf24" />
                    <text x={0} y={BEAM + 50} fontSize={12} fontWeight={700} fill="#fbbf24" textAnchor="middle">E[X] = {fmt(m)}</text>
                </g>
            )}
            {!hideMean && !hideSpread && sd > 1e-9 && (
                <g>
                    <line x1={X(m - sd)} y1={BEAM + 62} x2={X(m + sd)} y2={BEAM + 62} stroke="#38bdf8" strokeWidth={2} />
                    <line x1={X(m - sd)} y1={BEAM + 56} x2={X(m - sd)} y2={BEAM + 68} stroke="#38bdf8" strokeWidth={2} />
                    <line x1={X(m + sd)} y1={BEAM + 56} x2={X(m + sd)} y2={BEAM + 68} stroke="#38bdf8" strokeWidth={2} />
                    <text x={X(m + sd) + 6} y={BEAM + 66} fontSize={11} fill="#7dd3fc">σ = {fmt(sd)}</text>
                </g>
            )}
            {hideMean && <text x={W / 2} y={BEAM + 44} fontSize={12} fill="#64748b" textAnchor="middle">where does it balance?</text>}
        </svg>
    );
}

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
                    className="text-sm px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-rose-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

const texSum = (xs, ps, term) => {
    const parts = xs.map((x, i) => (ps[i] > 1e-9 ? term(x, ps[i]) : null)).filter(Boolean);
    return parts.length > 7 ? [...parts.slice(0, 3), String.raw`\cdots`, ...parts.slice(-2)].join(' + ') : parts.join(' + ');
};

export default function RandomVariablesAndExpectationPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1700);
    const [ex, setEx] = useState({ preset: 'loaded', xs: PRESETS.loaded.xs, ps: PRESETS.loaded.ps });
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[currentStep];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
    const hiding = mode === 'guided' && predict.hideExplanation;

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const { xs, ps } = mode === 'guided' ? step : ex;
    const m = mean(xs, ps), v = variance(xs, ps);
    // The tour reveals the balance point and the σ bracket one step after asking about them.
    const hideMean = mode === 'guided' && step.hideMean;
    const hideSpread = mode === 'guided' && step.hideSpread;

    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        return { preset: step.preset, xs: step.xs, ps: [...step.ps] };
    };
    const onBar = (i, h) => { const b = base(); setEx({ ...b, preset: null, ps: setBar(b.ps, i, h) }); };

    const formula = String.raw`E[X] = \sum x\,p(x) = ${texSum(xs, ps, (x, p) => String.raw`${x}(${texNum(p, 3)})`)} = \mathbf{${texNum(m, 3)}}`
        + String.raw` \\[6pt] \operatorname{Var}(X) = \sum (x - \mu)^2 p(x) = \mathbf{${texNum(v, 3)}}, \quad \sigma = \sqrt{${texNum(v, 3)}} = ${texNum(Math.sqrt(v), 3)}`;

    const explanation = mode === 'guided' ? step.explanation
        : `This distribution balances at E[X] = ${fmt(m)}, with variance ${fmt(v)} (σ = ${fmt(Math.sqrt(v))}). ${v < 0.5 ? 'Nearly all the weight sits close to the balance point.' : v > 4 ? 'The weight is spread far from the balance point — large deviations are common.' : 'Drag a bar: making a value more likely pulls the balance point towards it.'} The probabilities always add to 1, so raising one bar lowers the others.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/probability-and-statistics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Probability and Statistics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Random Variables and Expectation</h1>
                    <p className="text-rose-100 max-w-3xl">
                        A random variable attaches a number to every outcome. Its expected value is where the distribution balances; its variance says how far the weight sits from that point.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                                {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={mode === key}
                                        onClick={() => { if (key === 'explore') setEx(base()); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag any bar up or down'}
                            </span>
                        </div>

                        <BalanceBeam xs={xs} ps={ps} hideMean={hideMean} hideSpread={hideSpread} onBar={onBar} />

                        {mode === 'guided' ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="rose" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-rose-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {Object.entries(PRESETS).map(([key, p]) => (
                                    <button key={key} onClick={() => setEx({ preset: key, xs: p.xs, ps: [...p.ps] })} aria-pressed={ex.preset === key}
                                        className={`text-xs px-3 py-1.5 rounded-lg border ${ex.preset === key ? 'border-rose-500 text-rose-200 bg-rose-500/10' : 'border-slate-700 text-slate-300 hover:border-rose-500'}`}>{p.label}</button>
                                ))}
                                <button onClick={() => setEx(s => ({ ...s, preset: null, ps: s.xs.map(() => 1 / s.xs.length) }))}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-rose-500">Make uniform</button>
                            </div>
                        )}
                    </div>

                    {mode === 'guided' && predict.prompt && <PredictPrompt predict={predict} accent="rose" />}

                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                            <p className="text-rose-200 text-sm leading-relaxed">
                                {hiding ? 'Make your prediction above to reveal this step.' : explanation}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                        <div className="text-slate-100 text-sm sm:text-base">
                            {hiding ? <p className="text-sm text-slate-500">The formula is hidden until you answer.</p> : <Tex block>{formula}</Tex>}
                        </div>
                        <p className="text-xs text-slate-500">
                            Each term x·p(x) is a weight times its distance from 0 — the beam&apos;s turning force. The balance point is where the forces on the two sides cancel.
                        </p>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Reading a distribution</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-rose-300 font-semibold">p(x)</span> — the probability of each value; they add to 1.</li>
                            <li><span className="text-amber-300 font-semibold">E[X] = ∑ x p(x)</span> — the balance point, the long-run average.</li>
                            <li><span className="text-sky-300 font-semibold">Var(X) = ∑ (x − μ)² p(x)</span> — spread around it; σ = √Var is in the same units as X.</li>
                            <li><span className="text-green-300 font-semibold">Linearity</span> — E[X + Y] = E[X] + E[Y], always.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-rose-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
