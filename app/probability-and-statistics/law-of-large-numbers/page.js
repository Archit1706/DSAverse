"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Shuffle,
} from 'lucide-react';
import Tex, { texNum } from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';
import { createRng, randomSeed } from '@/lib/random';

/* ── the maths ─────────────────────────────────────────────
   The running average of n independent draws has mean μ and standard
   deviation σ / √n, so it is squeezed towards μ: about 95% of runs sit
   within μ ± 2σ / √n at any n. Every run is seeded, so stepping back shows
   the same rolls. */
const SOURCES = {
    die: { label: 'Fair die', values: [1, 2, 3, 4, 5, 6], weights: [1, 1, 1, 1, 1, 1], unit: 'roll' },
    coin: { label: 'Coin (1 = heads)', values: [0, 1], weights: [1, 1], unit: 'flip' },
    skewed: { label: 'Skewed', values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], weights: [30, 22, 16, 11, 8, 5, 4, 2, 1, 1], unit: 'draw' },
};
const momentsOf = (src) => {
    const total = src.weights.reduce((a, b) => a + b, 0);
    const ps = src.weights.map(w => w / total);
    const mu = src.values.reduce((s, x, i) => s + x * ps[i], 0);
    const v = src.values.reduce((s, x, i) => s + (x - mu) ** 2 * ps[i], 0);
    return { mu, sigma: Math.sqrt(v), ps };
};
/** One draw by inverting the cumulative distribution. */
const drawFrom = (src, ps, u) => {
    let acc = 0;
    for (let i = 0; i < ps.length; i++) { acc += ps[i]; if (u < acc) return src.values[i]; }
    return src.values[src.values.length - 1];
};
/** `runs` seeded runs of N draws: the draws and the running average after each one. */
const simulateRuns = (sourceKey, N, runs, seed) => {
    const src = SOURCES[sourceKey];
    const { ps } = momentsOf(src);
    return Array.from({ length: runs }, (_, r) => {
        const rng = createRng(seed + 7919 * r);
        const draws = new Float64Array(N), avg = new Float64Array(N);
        let sum = 0;
        for (let i = 0; i < N; i++) { draws[i] = drawFrom(src, ps, rng.next()); sum += draws[i]; avg[i] = sum / (i + 1); }
        return { draws, avg };
    });
};
const bandAt = (sigma, n) => (2 * sigma) / Math.sqrt(n);

/* ── guided tour ───────────────────────────────────────── */

const SEED = 5, N_TOUR = 2000;

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (source, n, explanation, extra = {}) => steps.push({ source, n, N: N_TOUR, runs: 5, seed: SEED, explanation, question: null, ask: null, ...extra });
    push('die', 1, 'Five people each roll a fair die, again and again, and keep track of their average so far. After one roll, the average is just that roll — anywhere from 1 to 6.');
    push('die', 10, 'After 10 rolls the averages still wander a long way from each other. The dashed line is the mean of one roll, μ = 3.5.');
    push('die', 100, 'After 100 rolls they are bunching up. The shaded band is μ ± 2σ/√n: about 95% of runs should be inside it. With σ ≈ 1.71, at n = 100 it is ±0.34.',
        { question: 'band', target: 400, ask: ask++ });
    push('die', 400, 'At n = 400 the band is ±0.17 — half as wide, with four times the rolls. The width shrinks like 1/√n.',
        { question: 'sixes', target: 2000, ask: ask++ });
    const sixes = simulateRuns('die', N_TOUR, 1, SEED)[0].draws.filter(x => x === 6).length;
    push('die', 2000, `After 2,000 rolls every run is within a few hundredths of 3.5 — the law of large numbers: the average of many independent draws settles on the expected value. The first run rolled ${sixes} sixes, close to the expected 2,000 / 6 ≈ 333; the bars below show every face settling on 1/6.`);
    push('coin', 2000, 'The same with coin flips, counting heads as 1: the proportion of heads settles on 0.5. The band at n = 2,000 is ±0.022.',
        { question: 'quadruple', ask: ask++ });
    push('coin', 2000, 'To halve the band you need 4 times as many flips — 8,000. Precision is expensive: each extra decimal place of accuracy costs 100 times more data.');
    push('coin', 2000, 'Suppose the first ten flips were all heads.', { question: 'fallacy', ask: ask++ });
    push('coin', 2000, 'Still 1/2: the next flip is heads with probability 1/2, because the coin has no memory. The law of large numbers does not make tails "due" — those ten extra heads are not cancelled, just diluted by thousands of ordinary flips.');
    push('skewed', 2000, 'It works for lopsided distributions too, as long as the mean exists. Switch to Explore: change the source, the number of runs and the seed, and click the chart to move through the rolls.');
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   The band at 4n (half, not a quarter or the same), where the runs settle
   (μ, not the middle face or the most likely face), how many flips halve the
   band, and the gambler's fallacy. */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    const { mu, sigma } = momentsOf(SOURCES[step.source]);
    let correct, candidates, question, because;
    if (step.question === 'band') {
        const now = bandAt(sigma, step.n), then = bandAt(sigma, step.target);
        correct = `±${texNum(then, 2)}`;
        candidates = [`±${texNum(now / 4, 3)}`, `±${texNum(now, 2)}`, `±${texNum(now * 2, 2)}`];
        question = `At n = ${step.n} the band is ±${texNum(now, 2)}. How wide will it be at n = ${step.target}?`;
        because = `${step.target} is 4 times ${step.n}, and the band scales with 1/√n: ±${texNum(now, 2)} / √4 = ±${texNum(then, 2)}.`;
    } else if (step.question === 'sixes') {
        correct = `about ${Math.round(step.target / 6)}`;
        candidates = [`exactly ${Math.round(step.target / 6)}`, `about ${Math.round(step.target / 3)}`, `about ${Math.round(step.target / 10)}`];
        question = `By ${step.target.toLocaleString('en-US')} rolls, how many sixes would you expect the first run to have?`;
        because = `Each roll is a six with probability 1/6, so about ${step.target.toLocaleString('en-US')} / 6 ≈ ${Math.round(step.target / 6)} — about, not exactly: the count still wobbles by tens, even though the share settles.`;
    } else if (step.question === 'quadruple') {
        correct = '8,000';
        candidates = ['4,000', '2,828', '16,000'];
        question = 'How many flips would it take to make the band half as wide as it is at 2,000?';
        because = 'The band is 2σ/√n. Halving it means doubling √n, which means 4 times the flips: 4 × 2,000 = 8,000.';
    } else {
        correct = 'Still 1/2';
        candidates = ['Less than 1/2 — tails are due', 'More than 1/2 — the coin is on a streak', 'It depends on how many flips are left'];
        question = 'After ten heads in a row, what is the chance the next flip is heads?';
        because = 'The flips are independent: the coin cannot remember the streak. The average still converges, by swamping the streak rather than reversing it.';
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
        question: 'What does the law of large numbers say about the average of many fair die rolls?',
        options: [
            'It will eventually equal exactly 3.5',
            'It gets closer and closer to 3.5 as the number of rolls grows',
            'It alternates above and below 3.5',
            'Each face comes up exactly n/6 times',
        ],
        correct: 1,
        explanation: 'The running average converges to the expected value 3.5. It need not ever equal 3.5 exactly, and the counts of each face still fluctuate — only their proportions settle.',
    },
    {
        question: 'A poll of 400 people has a margin of error of about ±5%. Roughly how many people are needed for ±2.5%?',
        options: ['800', '1,600', '200', '1,000'],
        correct: 1,
        explanation: 'The margin shrinks like 1/√n. Halving it needs √n to double, so n must be multiplied by 4: 4 × 400 = 1,600.',
    },
    {
        question: 'A roulette wheel has landed on red eight times in a row. Which statement is right?',
        options: [
            'Black is now more likely, to even things out',
            'Red is now more likely, because it is on a streak',
            'The next spin has the same chances as always; the law of large numbers works by dilution, not correction',
            'The law of large numbers no longer applies',
        ],
        correct: 2,
        explanation: 'Spins are independent. Over many more spins the streak becomes a negligible share of the total — the long-run proportion still settles, without any compensating run.',
    },
];

const codeExample = `import random
from statistics import mean, pstdev

rng = random.Random(5)
rolls = [rng.randint(1, 6) for _ in range(2000)]

running = []
total = 0
for n, x in enumerate(rolls, start=1):
    total += x
    running.append(total / n)

for n in (1, 10, 100, 400, 2000):
    print(n, round(running[n - 1], 3))     # wanders, then settles near 3.5

sigma = pstdev(range(1, 7))                # 1.708
print([round(2 * sigma / n ** 0.5, 3) for n in (100, 400)])   # band: 0.342, 0.171`;

/* ── picture ───────────────────────────────────────────── */

const W = 640, H = 300, PL = 42, PR = 622, PT = 18, PB = 258;
const RUN_COLORS = ['#fb7185', '#38bdf8', '#fbbf24', '#4ade80', '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c', '#e879f9', '#94a3b8'];

/**
 * Running averages against n on a log axis, the band μ ± 2σ/√n, and a cursor
 * at the current n. Paths are drawn only up to the cursor; clicking or
 * dragging on the chart moves it.
 */
function RunningAverageChart({ runs, mu, sigma, yRange, n, N, onCursor }) {
    const svgRef = useRef(null);
    const dragging = useRef(false);
    const lx = (k) => PL + (Math.log10(k) / Math.log10(N)) * (PR - PL);
    const [y0, y1] = yRange;
    const Y = (v) => PB - ((v - y0) / (y1 - y0)) * (PB - PT);
    const clampY = (v) => Math.min(Math.max(v, y0), y1);
    const samples = [];
    for (let i = 0; i <= 260; i++) samples.push(Math.max(1, Math.round(N ** (i / 260))));
    const ks = [...new Set(samples)].filter(k => k <= n);
    const band = [];
    const bandKs = [...new Set(samples)];
    for (const k of bandKs) band.push(`${lx(k).toFixed(1)},${Y(clampY(mu + bandAt(sigma, k))).toFixed(1)}`);
    for (const k of [...bandKs].reverse()) band.push(`${lx(k).toFixed(1)},${Y(clampY(mu - bandAt(sigma, k))).toFixed(1)}`);
    const toN = (e) => {
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const q = pt.matrixTransform(svg.getScreenCTM().inverse());
        const f = Math.min(Math.max((q.x - PL) / (PR - PL), 0), 1);
        return Math.max(1, Math.round(N ** f));
    };
    const ticks = [1, 10, 100, 1000, 10000].filter(t => t <= N);
    return (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Running averages against the number of draws" className="block select-none"
            style={{ touchAction: onCursor ? 'none' : undefined, cursor: onCursor ? 'ew-resize' : 'default' }}
            onPointerDown={onCursor ? (e) => { dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); onCursor(toN(e)); } : undefined}
            onPointerMove={onCursor ? (e) => { if (dragging.current) onCursor(toN(e)); } : undefined}
            onPointerUp={onCursor ? () => { dragging.current = false; } : undefined}>
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            <polygon points={band.join(' ')} fill="#e11d48" fillOpacity={0.14} stroke="#e11d48" strokeOpacity={0.35} />
            {[y0, (y0 + y1) / 2, y1].map(v => (
                <text key={v} x={PL - 6} y={Y(v) + 4} fontSize={10} fill="#64748b" textAnchor="end">{texNum(v, 1)}</text>
            ))}
            {ticks.map(t => (
                <g key={t}>
                    <line x1={lx(t)} y1={PT} x2={lx(t)} y2={PB} stroke="#1e293b" />
                    <text x={lx(t)} y={PB + 15} fontSize={10} fill="#64748b" textAnchor="middle">{t.toLocaleString('en-US')}</text>
                </g>
            ))}
            <line x1={PL} y1={Y(mu)} x2={PR} y2={Y(mu)} stroke="#f8fafc" strokeDasharray="6 5" opacity={0.6} />
            <text x={PR - 4} y={Y(mu) - 6} fontSize={11} fill="#f8fafc" textAnchor="end">μ = {texNum(mu, 2)}</text>
            {runs.map((run, r) => (
                <polyline key={r} points={ks.map(k => `${lx(k).toFixed(1)},${Y(clampY(run.avg[k - 1])).toFixed(1)}`).join(' ')}
                    fill="none" stroke={RUN_COLORS[r % RUN_COLORS.length]} strokeWidth={r === 0 ? 2.2 : 1.4} opacity={r === 0 ? 1 : 0.75} />
            ))}
            <line x1={lx(n)} y1={PT} x2={lx(n)} y2={PB} stroke="#fda4af" strokeWidth={1.5} />
            <text x={Math.min(lx(n) + 5, PR - 70)} y={PT + 12} fontSize={11} fontWeight={700} fill="#fda4af">n = {n.toLocaleString('en-US')}</text>
            <text x={(PL + PR) / 2} y={H - 8} fontSize={10} fill="#64748b" textAnchor="middle">number of draws (log scale)</text>
        </svg>
    );
}

/** How often each value has come up in the first run, against its probability. */
function FaceCounts({ src, ps, draws, n }) {
    const counts = src.values.map(() => 0);
    for (let i = 0; i < n; i++) counts[src.values.indexOf(draws[i])]++;
    const w = Math.min(54, 560 / src.values.length);
    const maxP = Math.max(...ps, ...counts.map(c => c / n));
    return (
        <svg viewBox={`0 0 ${W} 120`} width="100%" role="img" aria-label="Share of each value in the first run" className="block select-none">
            {src.values.map((v, i) => {
                const x = W / 2 + (i - (src.values.length - 1) / 2) * w;
                const share = counts[i] / n;
                return (
                    <g key={v}>
                        <rect x={x - w * 0.35} y={96 - (share / maxP) * 80} width={w * 0.7} height={(share / maxP) * 80} rx={3} fill="#fb7185" fillOpacity={0.75} />
                        <line x1={x - w * 0.42} x2={x + w * 0.42} y1={96 - (ps[i] / maxP) * 80} y2={96 - (ps[i] / maxP) * 80} stroke="#f8fafc" strokeWidth={2} />
                        <text x={x} y={110} fontSize={10} fill="#94a3b8" textAnchor="middle">{v}</text>
                    </g>
                );
            })}
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

export default function LawOfLargeNumbersPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [ex, setEx] = useState({ source: 'die', n: 2000, N: N_TOUR, runs: 5, seed: SEED });
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
    const { source, n, N, runs, seed } = s;
    const src = SOURCES[source];
    const { mu, sigma, ps } = momentsOf(src);
    const sim = useMemo(() => simulateRuns(source, N, runs, seed), [source, N, runs, seed]);
    const yRange = [src.values[0], src.values[src.values.length - 1]];
    const nn = Math.min(n, N);
    const avg1 = sim[0].avg[nn - 1];
    const inside = sim.filter(r => Math.abs(r.avg[nn - 1] - mu) <= bandAt(sigma, nn)).length;

    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        return { source: step.source, n: step.n, N: step.N, runs: step.runs, seed: step.seed };
    };
    const update = (fn) => setEx(fn(base()));

    const formula = String.raw`\bar{X}_{${nn}} = \frac{1}{${nn}} \sum_{i=1}^{${nn}} X_i = ${texNum(avg1, 3)}, \qquad \mu = ${texNum(mu, 3)}, \quad |\bar{X}_n - \mu| = ${texNum(Math.abs(avg1 - mu), 3)}`
        + String.raw` \\[6pt] \text{band: } \mu \pm \frac{2\sigma}{\sqrt{n}} = ${texNum(mu, 2)} \pm \frac{2 \times ${texNum(sigma, 3)}}{\sqrt{${nn}}} = ${texNum(mu, 2)} \pm ${texNum(bandAt(sigma, nn), 3)}`;

    const explanation = mode === 'guided' ? step.explanation
        : `After ${nn.toLocaleString('en-US')} ${src.unit}s the first run's average is ${texNum(avg1, 3)}, ${texNum(Math.abs(avg1 - mu), 3)} from μ = ${texNum(mu, 2)}; ${inside} of the ${runs} runs are inside the band ±${texNum(bandAt(sigma, nn), 3)}. Click or drag on the chart to move through the ${src.unit}s, or reseed for new runs.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/probability-and-statistics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Probability and Statistics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Law of Large Numbers</h1>
                    <p className="text-rose-100 max-w-3xl">
                        One roll tells you little. The average of thousands settles on the expected value — inside a band that narrows like 1/√n, which is why more data helps, and why it helps slowly.
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
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : `seed ${ex.seed} · click the chart`}
                            </span>
                        </div>

                        <RunningAverageChart runs={sim} mu={mu} sigma={sigma} yRange={yRange} n={nn} N={N}
                            onCursor={(v) => update(x => ({ ...x, n: v }))} />
                        <p className="text-xs text-slate-500 mt-3 mb-1">Share of each value in the first run so far (white ticks: the true probabilities)</p>
                        <FaceCounts src={src} ps={ps} draws={sim[0].draws} n={nn} />

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
                                {Object.entries(SOURCES).map(([key, sc]) => (
                                    <button key={key} onClick={() => setEx(x => ({ ...x, source: key }))} aria-pressed={ex.source === key}
                                        className={`text-xs px-3 py-1.5 rounded-lg border ${ex.source === key ? 'border-rose-500 text-rose-200 bg-rose-500/10' : 'border-slate-700 text-slate-300 hover:border-rose-500'}`}>{sc.label}</button>
                                ))}
                                <button onClick={() => setEx(x => ({ ...x, seed: randomSeed() }))}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-500">
                                    <Shuffle className="h-3.5 w-3.5" />New runs
                                </button>
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <ParamSlider label="n (draws so far)" accent="rose" min={1} max={N} value={nn} format={(v) => v.toLocaleString('en-US')}
                                onChange={(v) => update(x => ({ ...x, n: v }))} />
                            <ParamSlider label="Total draws" accent="rose" min={100} max={5000} step={100} value={N} format={(v) => v.toLocaleString('en-US')}
                                onChange={(v) => update(x => ({ ...x, N: v, n: Math.min(x.n, v) }))} />
                            <ParamSlider label="Runs" accent="rose" min={1} max={10} value={runs} onChange={(v) => update(x => ({ ...x, runs: v }))} />
                        </div>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">What the law says</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-rose-300 font-semibold">Convergence</span> — the running average X̄ₙ approaches μ as n grows.</li>
                            <li><span className="text-sky-300 font-semibold">Speed</span> — its spread is σ/√n: 4× the data for half the error.</li>
                            <li><span className="text-amber-300 font-semibold">Not correction</span> — past results are diluted, never balanced out.</li>
                            <li><span className="text-green-300 font-semibold">Frequencies too</span> — each value&apos;s share settles on its probability.</li>
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
