"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Tex, { texNum } from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   N(μ, σ²) has density e^(−(x − μ)² / 2σ²) / (σ√(2π)). Areas under it come
   from Φ, the standard normal CDF, after converting to z = (x − μ) / σ. Φ is
   built from erf (Abramowitz and Stegun 7.1.26, error below 1.5 × 10⁻⁷ —
   far finer than the four decimals shown). */
const SQRT2PI = Math.sqrt(2 * Math.PI);
const density = (x, mu, sigma) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * SQRT2PI);
const erf = (x) => {
    const s = Math.sign(x), a = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * a);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
    return s * y;
};
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const zOf = (x, mu, sigma) => (x - mu) / sigma;
/** P(a ≤ X ≤ b) for X ~ N(μ, σ²). */
const areaBetween = (a, b, mu, sigma) => Phi(zOf(Math.max(a, b), mu, sigma)) - Phi(zOf(Math.min(a, b), mu, sigma));
const pct1 = (x) => `${texNum(x * 100, 1)}%`;
const XMIN = -8, XMAX = 8;

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (explanation, extra = {}) => steps.push({ mu: 0, sigma: 1, a: -1, b: 1, shade: false, bands: 0, point: null, explanation, question: null, ask: null, ...extra });
    push('The standard normal distribution: mean μ = 0, standard deviation σ = 1. The total area under the curve is 1, and the area over any stretch of the axis is the probability of landing there.');
    push('The two handles sit one standard deviation either side of the mean, at −1 and +1.', { question: 'share', ask: ask++ });
    push('68.3% of the area lies within one σ of the mean — about two thirds. The other third is split between the two tails, about 16% on each side.', { shade: true, bands: 1 });
    push('Now move the handles out to −2 and +2.', { a: -2, b: 2, question: 'share', ask: ask++ });
    push('95.4% lies within two standard deviations. Only about 1 value in 22 lands further out.', { a: -2, b: 2, shade: true, bands: 2 });
    push('And 99.7% within three. Together that is the 68–95–99.7 rule: one, two and three standard deviations from the mean, for any normal distribution.', { a: -3, b: 3, shade: true, bands: 3 });
    push('Change μ to 2. The whole curve slides right without changing shape: the mean is the centre, and nothing else.', { mu: 2, a: 1, b: 3, shade: true, bands: 1 });
    push('Back to μ = 0, and double the spread to σ = 2.', { sigma: 2, a: -2, b: 2, question: 'peak', ask: ask++ });
    push('The peak drops from 0.40 to 0.20 — half as high — because the curve is twice as wide and its area must still be exactly 1. Within ±1σ, now −2 to 2, there is still 68.3%.', { sigma: 2, a: -2, b: 2, shade: true, bands: 1 });
    push('A test has scores with μ = 1 and σ = 2. How unusual is a score of 4? Measure it in standard deviations: its z-score.', { mu: 1, sigma: 2, a: 4, b: 8, point: 4, question: 'z', ask: ask++ });
    push('z = (4 − 1) / 2 = 1.5: one and a half standard deviations above the mean. The area to its right is 1 − Φ(1.5) ≈ 6.7%, so only about 1 score in 15 is higher.', { mu: 1, sigma: 2, a: 4, b: 8, point: 4, shade: true });
    push('Every normal distribution is the standard one, shifted by μ and stretched by σ. Convert to z and one table — Φ — gives every area. Switch to Explore: drag the peak to set μ and σ, and drag the two handles.', { a: -1.5, b: 2, shade: true });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   The share within ±1σ and ±2σ (the rule's three numbers against each other
   and one tail's worth), the peak height when σ doubles, and a z-score
   (against forgetting to subtract μ, forgetting to divide by σ, and
   dividing by σ²). */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    let correct, candidates, question, because;
    if (step.question === 'share') {
        const k = Math.round(step.b);
        const table = { 1: '68%', 2: '95%', 3: '99.7%' };
        correct = table[k];
        candidates = k === 1 ? ['50%', '95%', '34%'] : ['68%', '99.7%', '90%'];
        question = `What share of the area lies between ${step.a} and ${step.b} — within ${k} σ of the mean?`;
        because = `Φ(${k}) − Φ(−${k}) = ${pct1(areaBetween(-k, k, 0, 1))}, which the rule rounds to ${correct}.`;
    } else if (step.question === 'peak') {
        correct = 'half as high';
        candidates = ['the same height', 'twice as high', 'a quarter as high'];
        question = 'With σ = 2 instead of 1, how high is the peak of the curve?';
        because = `The peak is 1 / (σ√(2π)): ${texNum(density(0, 0, 1), 3)} for σ = 1 and ${texNum(density(0, 0, 2), 3)} for σ = 2. Twice as wide, half as high, same area.`;
    } else {
        const z = zOf(step.point, step.mu, step.sigma);
        correct = texNum(z, 2);
        candidates = [texNum(step.point / step.sigma, 2), texNum(step.point - step.mu, 2), texNum((step.point - step.mu) / step.sigma ** 2, 2), texNum(z + 1, 2)];
        question = `With μ = ${step.mu} and σ = ${step.sigma}, what is the z-score of ${step.point}?`;
        because = `z = (x − μ) / σ = (${step.point} − ${step.mu}) / ${step.sigma} = ${correct}.`;
    }
    const seen = new Set([correct]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (seen.has(c)) continue;
        seen.add(c);
        wrong.push(c);
    }
    const slot = (step.ask * 3 + 1) % 4;
    const ordered = [...wrong];
    ordered.splice(slot, 0, correct);
    return { question, options: ordered, correct: slot, because };
};

const quizQuestions = [
    {
        question: 'Heights are normal with mean 170 cm and standard deviation 10 cm. Roughly what share of people are between 150 cm and 190 cm?',
        options: ['68%', '99.7%', '50%', '95%'],
        correct: 3,
        explanation: '150 and 190 are two standard deviations either side of the mean (z = −2 and +2), and about 95% of a normal distribution lies within two standard deviations.',
    },
    {
        question: 'A score has z-score −1.2. What does that mean?',
        options: [
            'It is 1.2 standard deviations below the mean',
            'It is 1.2 points below the mean',
            'It is in the bottom 1.2%',
            'It is impossible',
        ],
        correct: 0,
        explanation: 'z counts standard deviations from the mean: z = (x − μ) / σ = −1.2 means x = μ − 1.2σ. About 11.5% of values lie below it.',
    },
    {
        question: 'If σ is halved, what happens to the normal curve?',
        options: [
            'It moves left',
            'It gets narrower and its peak twice as high, keeping total area 1',
            'It gets narrower but keeps the same peak height',
            'Nothing changes',
        ],
        correct: 1,
        explanation: 'The peak height is 1 / (σ√(2π)). Halving σ squeezes the curve to half the width, so to keep an area of 1 it must be twice as tall.',
    },
];

const codeExample = `from math import erf, sqrt, exp, pi

def Phi(z):
    """Standard normal CDF."""
    return 0.5 * (1 + erf(z / sqrt(2)))

def prob_between(a, b, mu=0, sigma=1):
    return Phi((b - mu) / sigma) - Phi((a - mu) / sigma)

for k in (1, 2, 3):
    print(k, round(prob_between(-k, k), 4))   # 0.6827, 0.9545, 0.9973

mu, sigma = 1, 2
z = (4 - mu) / sigma                 # 1.5
print(z, round(1 - Phi(z), 4))       # 0.0668 of scores are above 4

density = lambda x: exp(-(x - mu)**2 / (2 * sigma**2)) / (sigma * sqrt(2 * pi))`;

/* ── picture ───────────────────────────────────────────── */

const W = 640, H = 310, PL = 36, PR = 620, BASE = 262, TOPY = 26, YMAX = 0.85;
const X = (x) => PL + ((x - XMIN) / (XMAX - XMIN)) * (PR - PL);
const Y = (y) => BASE - (y / YMAX) * (BASE - TOPY);

/**
 * The bell curve over a fixed axis, so changing μ and σ visibly moves and
 * stretches it. Three handles: the peak (drag sideways for μ, up and down
 * for σ) and the two bounds a and b on the axis.
 */
function BellCurve({ mu, sigma, a, b, shade, bands, point, hideZ, onPeak, onA, onB }) {
    const svgRef = useRef(null);
    const drag = useRef(null);
    const toWorld = (e) => {
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const q = pt.matrixTransform(svg.getScreenCTM().inverse());
        return [XMIN + ((q.x - PL) / (PR - PL)) * (XMAX - XMIN), ((BASE - q.y) / (BASE - TOPY)) * YMAX];
    };
    const curve = [];
    for (let i = 0; i <= 400; i++) { const x = XMIN + ((XMAX - XMIN) * i) / 400; curve.push(`${X(x).toFixed(1)},${Y(density(x, mu, sigma)).toFixed(1)}`); }
    const region = (lo, hi) => {
        const pts = [`${X(lo)},${BASE}`];
        for (let i = 0; i <= 120; i++) { const x = lo + ((hi - lo) * i) / 120; pts.push(`${X(x).toFixed(1)},${Y(density(x, mu, sigma)).toFixed(1)}`); }
        pts.push(`${X(hi)},${BASE}`);
        return pts.join(' ');
    };
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const peakY = density(mu, mu, sigma);
    const handlers = (which, onMove) => ({
        onPointerDown: (e) => { if (!onMove) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = which; },
        onPointerMove: (e) => { if (drag.current === which) onMove(toWorld(e)); },
        onPointerUp: (e) => { drag.current = null; e.currentTarget.releasePointerCapture?.(e.pointerId); },
    });
    const bandColors = ['#e11d48', '#be123c', '#881337'];
    return (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Normal curve with mean ${mu} and standard deviation ${sigma}`} className="block select-none" style={{ touchAction: 'none' }}>
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            {[0.2, 0.4, 0.6, 0.8].map(y => (
                <g key={y}>
                    <line x1={PL} y1={Y(y)} x2={PR} y2={Y(y)} stroke="#1e293b" />
                    <text x={PL - 4} y={Y(y) + 4} fontSize={10} fill="#64748b" textAnchor="end">{y}</text>
                </g>
            ))}
            {bands > 0 && [3, 2, 1].filter(k => k <= bands).map(k => (
                <polygon key={`band${k}`} points={region(mu - k * sigma, mu + k * sigma)} fill={bandColors[k - 1]} fillOpacity={0.28} />
            ))}
            {shade && <polygon points={region(Math.max(lo, XMIN), Math.min(hi, XMAX))} fill="#fb7185" fillOpacity={0.5} />}
            <polyline points={curve.join(' ')} fill="none" stroke="#fda4af" strokeWidth={2.5} />
            <line x1={PL} y1={BASE} x2={PR} y2={BASE} stroke="#64748b" strokeWidth={1.5} />
            {Array.from({ length: XMAX - XMIN + 1 }, (_, i) => XMIN + i).map(x => (
                <g key={`t${x}`}>
                    <line x1={X(x)} y1={BASE} x2={X(x)} y2={BASE + 4} stroke="#64748b" />
                    <text x={X(x)} y={BASE + 16} fontSize={10} fill="#64748b" textAnchor="middle">{x}</text>
                </g>
            ))}
            <line x1={X(mu)} y1={Y(peakY)} x2={X(mu)} y2={BASE} stroke="#fda4af" strokeDasharray="4 4" opacity={0.5} />
            {point !== null && point !== undefined && (
                <g>
                    <line x1={X(point)} y1={TOPY} x2={X(point)} y2={BASE} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="5 4" />
                    <text x={X(point) + 5} y={TOPY + 12} fontSize={11} fill="#fbbf24">x = {point}</text>
                </g>
            )}
            {/* the peak handle: μ sideways, σ up and down */}
            <g {...handlers('peak', onPeak)} style={{ cursor: onPeak ? 'move' : 'default' }}
                tabIndex={onPeak ? 0 : undefined} role={onPeak ? 'button' : undefined}
                aria-label={onPeak ? `Peak of the curve: mean ${mu}, standard deviation ${sigma}. Arrow keys change them.` : undefined}
                onKeyDown={onPeak ? (e) => {
                    const d = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
                    if (!d) return; e.preventDefault(); onPeak(null, [mu + d[0], sigma + d[1]]);
                } : undefined} className="focus:outline-none">
                <circle cx={X(mu)} cy={Y(peakY)} r={16} fill="transparent" />
                <circle cx={X(mu)} cy={Y(peakY)} r={6} fill="#fda4af" stroke="#020617" strokeWidth={1.5} />
            </g>
            {[['a', a, onA], ['b', b, onB]].map(([name, v, cb]) => (
                <g key={name} {...handlers(name, cb ? ([x]) => cb(x) : null)} style={{ cursor: cb ? 'ew-resize' : 'default' }}
                    tabIndex={cb ? 0 : undefined} role={cb ? 'slider' : undefined} aria-label={cb ? `Bound ${name} at ${texNum(v, 2)}` : undefined}
                    aria-valuenow={cb ? v : undefined}
                    onKeyDown={cb ? (e) => {
                        const d = { ArrowLeft: -0.1, ArrowRight: 0.1 }[e.key];
                        if (d === undefined) return; e.preventDefault(); cb(v + d * (e.shiftKey ? 10 : 1));
                    } : undefined} className="focus:outline-none">
                    <circle cx={X(v)} cy={BASE} r={16} fill="transparent" />
                    <circle cx={X(v)} cy={BASE} r={6.5} fill="#f8fafc" stroke="#e11d48" strokeWidth={2} />
                    <text x={X(v)} y={BASE + 32} fontSize={11} fontWeight={700} fill="#fecdd3" textAnchor="middle">{name} = {texNum(v, 2)}</text>
                    {!hideZ && <text x={X(v)} y={BASE + 45} fontSize={10} fill="#94a3b8" textAnchor="middle">z = {texNum(zOf(v, mu, sigma), 2)}</text>}
                </g>
            ))}
            {shade && <text x={X((Math.max(lo, XMIN) + Math.min(hi, XMAX)) / 2)} y={Y(density((lo + hi) / 2, mu, sigma) / 2) + 4} fontSize={13} fontWeight={800} fill="#ffffff" textAnchor="middle">{pct1(areaBetween(lo, hi, mu, sigma))}</text>}
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

const round1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export default function NormalDistributionPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1700);
    const [ex, setEx] = useState({ mu: 0, sigma: 1, a: -1, b: 1, bands: 0 });
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

    const s = mode === 'guided' ? step : ex;
    const { mu, sigma, a, b } = s;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const area = areaBetween(lo, hi, mu, sigma);
    const zLo = zOf(lo, mu, sigma), zHi = zOf(hi, mu, sigma);

    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        return { mu: step.mu, sigma: step.sigma, a: step.a, b: step.b, bands: step.bands };
    };
    const update = (fn) => setEx(fn(base()));
    /* The peak: sideways is μ; its height h fixes σ = 1 / (h√(2π)). The keyboard sends [μ, σ] directly. */
    const onPeak = (world, direct) => update(x => {
        if (direct) return { ...x, mu: clamp(round1(direct[0]), -4, 4), sigma: clamp(round1(direct[1]), 0.5, 3) };
        const [wx, wy] = world;
        return { ...x, mu: clamp(round1(wx), -4, 4), sigma: clamp(round1(1 / (Math.max(wy, 0.05) * SQRT2PI)), 0.5, 3) };
    });
    const setBound = (key) => (v) => update(x => ({ ...x, [key]: clamp(round1(v), XMIN, XMAX) }));

    const formula = String.raw`P(${texNum(lo, 2)} \le X \le ${texNum(hi, 2)}) = \Phi\!\left(\tfrac{${texNum(hi, 2)} - ${texNum(mu, 2)}}{${texNum(sigma, 2)}}\right) - \Phi\!\left(\tfrac{${texNum(lo, 2)} - ${texNum(mu, 2)}}{${texNum(sigma, 2)}}\right)`
        + String.raw` = \Phi(${texNum(zHi, 2)}) - \Phi(${texNum(zLo, 2)}) = ${texNum(Phi(zHi), 4)} - ${texNum(Phi(zLo), 4)} = \mathbf{${texNum(area, 4)}}`
        + String.raw` \\[6pt] f(x) = \frac{1}{\sigma\sqrt{2\pi}}\, e^{-\frac{(x-\mu)^2}{2\sigma^2}}, \quad \text{peak } f(\mu) = \frac{1}{${texNum(sigma, 2)}\sqrt{2\pi}} = ${texNum(density(mu, mu, sigma), 3)}`;

    const explanation = mode === 'guided' ? step.explanation
        : `X ~ N(${texNum(mu, 2)}, ${texNum(sigma, 2)}²). Between ${texNum(lo, 2)} and ${texNum(hi, 2)} — z from ${texNum(zLo, 2)} to ${texNum(zHi, 2)} — lies ${pct1(area)} of the area. Drag the peak sideways to move μ and up or down to change σ; drag the white handles to move the bounds.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/probability-and-statistics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Probability and Statistics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Normal Distribution</h1>
                    <p className="text-rose-100 max-w-3xl">
                        The bell curve: centred at μ, spread by σ, with total area 1. Probabilities are areas, and every area comes from one function once x is converted to a z-score.
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
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag the peak and the two handles'}
                            </span>
                        </div>

                        <BellCurve mu={mu} sigma={sigma} a={a} b={b} shade={mode === 'explore' || (step.shade && !hiding)}
                            bands={mode === 'guided' ? (hiding ? 0 : step.bands) : ex.bands} point={mode === 'guided' ? step.point : null} hideZ={hiding}
                            onPeak={onPeak} onA={setBound('a')} onB={setBound('b')} />

                        {mode === 'guided' ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(x => Math.max(x - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(x => !x)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(x => Math.min(x + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="rose" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-rose-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {[1, 2, 3].map(k => (
                                    <button key={k} onClick={() => setEx(x => ({ ...x, a: round1(x.mu - k * x.sigma), b: round1(x.mu + k * x.sigma), bands: k }))}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-500">μ ± {k}σ</button>
                                ))}
                                <button onClick={() => setEx(x => ({ ...x, bands: x.bands ? 0 : 3 }))} aria-pressed={ex.bands > 0}
                                    className={`text-xs px-3 py-1.5 rounded-lg border ${ex.bands ? 'border-rose-500 text-rose-200 bg-rose-500/10' : 'border-slate-700 text-slate-400 hover:border-rose-500'}`}>68–95–99.7 bands</button>
                                <button onClick={() => setEx({ mu: 0, sigma: 1, a: -1, b: 1, bands: 0 })}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-rose-500">Standard normal</button>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ParamSlider label="μ (mean)" accent="rose" min={-4} max={4} step={0.1} value={mu} onChange={(v) => update(x => ({ ...x, mu: v }))} />
                            <ParamSlider label="σ (standard deviation)" accent="rose" min={0.5} max={3} step={0.1} value={sigma} onChange={(v) => update(x => ({ ...x, sigma: v }))} />
                            <ParamSlider label="a (lower bound)" accent="rose" min={XMIN} max={XMAX} step={0.1} value={a} onChange={setBound('a')} />
                            <ParamSlider label="b (upper bound)" accent="rose" min={XMIN} max={XMAX} step={0.1} value={b} onChange={setBound('b')} />
                        </div>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Rules of thumb</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-rose-300 font-semibold">68–95–99.7</span> — within 1, 2 and 3 σ of the mean.</li>
                            <li><span className="text-sky-300 font-semibold">z = (x − μ) / σ</span> — how many standard deviations from the mean.</li>
                            <li><span className="text-amber-300 font-semibold">Φ(z)</span> — the area to the left of z under the standard curve; Φ(−z) = 1 − Φ(z).</li>
                            <li><span className="text-green-300 font-semibold">Area is 1</span> — wider curves are lower; the peak is 1 / (σ√(2π)).</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(x => !x)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-rose-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
