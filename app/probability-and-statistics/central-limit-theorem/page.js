"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
   Draw n values from a population with mean μ and standard deviation σ and
   average them. Whatever the population's shape, the average has mean μ and
   standard deviation σ / √n, and for large n its distribution is close to
   normal. The populations live on 0..9; a sample mean is (sum) / n, so the
   histogram groups whole sums to avoid aliasing. */
const SHAPES = {
    skewed: { label: 'Skewed', weights: [30, 22, 16, 11, 8, 5, 4, 2, 1, 1] },
    uniform: { label: 'Uniform', weights: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    ushape: { label: 'U-shaped', weights: [20, 10, 5, 3, 2, 2, 3, 5, 10, 20] },
};
const VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const population = (shape) => {
    const w = SHAPES[shape].weights;
    const total = w.reduce((a, b) => a + b, 0);
    const ps = w.map(x => x / total);
    const mu = VALUES.reduce((s, x, i) => s + x * ps[i], 0);
    const sigma = Math.sqrt(VALUES.reduce((s, x, i) => s + (x - mu) ** 2 * ps[i], 0));
    return { ps, mu, sigma };
};
const drawValue = (ps, u) => { let acc = 0; for (let i = 0; i < ps.length; i++) { acc += ps[i]; if (u < acc) return i; } return ps.length - 1; };
/** M sample sums of size n, seeded. The means are sums / n. */
const sampleSums = (shape, n, M, seed) => {
    const { ps } = population(shape);
    const rng = createRng(seed);
    const sums = new Int32Array(M);
    for (let m = 0; m < M; m++) { let s = 0; for (let i = 0; i < n; i++) s += drawValue(ps, rng.next()); sums[m] = s; }
    return sums;
};
/** Bins of g consecutive sums each, sized so the bell is drawn with ~4 bins per σ/√n. */
const binning = (n, sigma) => Math.max(1, Math.round((sigma * Math.sqrt(n)) / 4));
const histogram = (sums, n, sigma) => {
    const g = binning(n, sigma);
    const nb = Math.floor((9 * n) / g) + 1;
    const counts = new Array(nb).fill(0);
    for (const s of sums) counts[Math.floor(s / g)]++;
    return { g, counts, width: g / n, centre: (b) => (g * b + (g - 1) / 2) / n };
};
const normalDensity = (x, mu, sd) => Math.exp(-((x - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
const summary = (sums, n) => {
    const M = sums.length;
    let s = 0; for (const v of sums) s += v / n;
    const mean = s / M;
    let v2 = 0, v3 = 0; for (const v of sums) { const d = v / n - mean; v2 += d * d; v3 += d * d * d; }
    const sd = Math.sqrt(v2 / M);
    return { mean, sd, skew: sd > 0 ? v3 / M / sd ** 3 : 0 };
};

/* ── guided tour ───────────────────────────────────────── */

const SEED = 3, M_TOUR = 2000;

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (shape, n, explanation, extra = {}) => steps.push({ shape, n, M: M_TOUR, seed: SEED, showNormal: false, showBand: false, explanation, question: null, ask: null, ...extra });
    const pop = population('skewed');
    push('skewed', 1, `A lopsided population on 0 to 9: small values are common, big ones rare. Its mean is μ = ${texNum(pop.mu, 2)} and its standard deviation σ = ${texNum(pop.sigma, 2)}. Take a "sample" of size 1, 2,000 times — the histogram is just the population again.`);
    push('skewed', 2, 'Now average 2 draws at a time, 2,000 times. Already less lopsided: a big value is often paired with a small one.',
        { question: 'spread', target: 4, ask: ask++ });
    push('skewed', 4, `With n = 4 the spread of the means is σ/√4 = σ/2 ≈ ${texNum(pop.sigma / 2, 2)}: half of what a single draw has. The skew is fading.`, { showNormal: true });
    push('skewed', 10, 'n = 10. The white curve is the normal distribution with mean μ and standard deviation σ/√n — the central limit theorem\'s prediction.',
        { showNormal: true, question: 'centre', ask: ask++ });
    push('skewed', 30, `n = 30: the means pile up in a bell centred on μ = ${texNum(pop.mu, 2)} — not on the population's most common value, 0. The population was nothing like normal; the averages are.`, { showNormal: true });
    push('skewed', 30, 'The shaded band is μ ± 2σ/√n.', { showNormal: true, question: 'band', ask: ask++ });
    push('skewed', 30, 'About 95% of the 2,000 means fall inside μ ± 2σ/√n, exactly as for a normal distribution. This is why a sample average comes with a ±2 standard error margin.', { showNormal: true, showBand: true });
    push('ushape', 30, 'A U-shaped population, piled up at both ends and nearly empty in the middle — and the means of 30 still form a bell in the middle, where the population has almost nothing.', { showNormal: true });
    push('ushape', 1, `For the U-shaped population, a single draw has σ ≈ ${texNum(population('ushape').sigma, 2)}.`, { question: 'third', ask: ask++ });
    push('ushape', 9, 'n = 9: √9 = 3, so the spread of the means is a third of a single draw\'s. To divide the spread by k you need k² times the sample size.', { showNormal: true });
    push('skewed', 30, 'Averages of independent draws are approximately normal with mean μ and standard deviation σ/√n, whatever the population looks like (as long as σ is finite). Switch to Explore to try other shapes, sample sizes and seeds.', { showNormal: true, showBand: true });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   How the spread scales (1/√n, not 1/n), where the means centre (μ, not the
   population's mode or the middle of the range), the share within ±2σ/√n,
   and the sample size that divides the spread by 3. */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    const { mu } = population(step.shape);
    let correct, candidates, question, because;
    if (step.question === 'spread') {
        correct = 'half as wide';
        candidates = ['a quarter as wide', 'the same width', 'twice as wide'];
        question = `Compared with single draws, how spread out will the means of ${step.target} draws be?`;
        because = `The spread of a mean is σ/√n: √${step.target} = 2, so half as wide.`;
    } else if (step.question === 'centre') {
        correct = texNum(mu, 2);
        candidates = ['0', '4.5', '1'];
        question = 'With n = 30, where will the histogram of means be centred?';
        because = `On the population mean μ = ${texNum(mu, 2)}: averaging does not move the centre, it only narrows the spread.`;
    } else if (step.question === 'band') {
        correct = 'about 95%';
        candidates = ['about 68%', 'about 50%', 'all of them'];
        question = 'What share of the 2,000 sample means should land inside μ ± 2σ/√n?';
        because = 'The means are nearly normal with standard deviation σ/√n, and a normal distribution has about 95% within two standard deviations.';
    } else {
        correct = '9';
        candidates = ['3', '27', '6'];
        question = 'What sample size makes the spread of the means a third of a single draw\'s?';
        because = 'σ/√n = σ/3 needs √n = 3, so n = 9.';
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
        question: 'A population has mean 50 and standard deviation 12. What is the standard deviation of the mean of a sample of 36?',
        options: ['12', '2', '1/3', '6'],
        correct: 1,
        explanation: 'σ/√n = 12/√36 = 12/6 = 2. The sample mean is six times less spread out than a single value.',
    },
    {
        question: 'Which statement is what the central limit theorem says?',
        options: [
            'Large samples from any population look normal',
            'The population becomes normal if you sample enough',
            'The distribution of the sample mean is approximately normal for large n, whatever the population\'s shape',
            'Every average equals μ',
        ],
        correct: 2,
        explanation: 'It is about the sampling distribution of the mean, not about the data. A big sample from a skewed population is still skewed; its average is what becomes normal.',
    },
    {
        question: 'To cut the standard error of a sample mean by a factor of 4, how must the sample size change?',
        options: ['Multiply it by 16', 'Multiply it by 4', 'Multiply it by 2', 'Divide it by 4'],
        correct: 0,
        explanation: 'The standard error is σ/√n. Dividing it by 4 needs √n to grow by 4, so n grows by 16.',
    },
];

const codeExample = `import random
from statistics import mean, pstdev

values  = range(10)
weights = [30, 22, 16, 11, 8, 5, 4, 2, 1, 1]          # a skewed population
rng = random.Random(3)

def sample_means(n, m=2000):
    return [mean(rng.choices(values, weights, k=n)) for _ in range(m)]

mu = sum(v * w for v, w in zip(values, weights)) / sum(weights)
for n in (1, 4, 30):
    means = sample_means(n)
    print(n, round(mean(means), 2), round(pstdev(means), 3))
# the centre stays near mu = 1.99; the spread falls like sigma / sqrt(n)`;

/* ── pictures ──────────────────────────────────────────── */

const W = 640, PL = 40, PR = 622;
const X = (x) => PL + ((x + 0.5) / 10) * (PR - PL);

/** The population, small, as a reminder of what is being sampled. */
function PopulationBars({ ps, mu, hideCentre }) {
    const H = 92, base = 74, maxP = Math.max(...ps);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="The population distribution" className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            <text x={12} y={16} fontSize={11} fill="#94a3b8">population</text>
            {ps.map((p, i) => (
                <g key={i}>
                    <rect x={X(i) - 16} y={base - (p / maxP) * 52} width={32} height={(p / maxP) * 52} rx={3} fill="#64748b" fillOpacity={0.8} />
                    <text x={X(i)} y={base + 13} fontSize={10} fill="#64748b" textAnchor="middle">{i}</text>
                </g>
            ))}
            {!hideCentre && <line x1={X(mu)} y1={18} x2={X(mu)} y2={base} stroke="#fbbf24" strokeDasharray="4 3" />}
        </svg>
    );
}

/**
 * The histogram of sample means on the same 0–9 axis, with the normal curve
 * the theorem predicts and, optionally, the μ ± 2σ/√n band. Clicking a bar
 * selects it.
 */
function MeansHistogram({ hist, M, mu, sd, showNormal, showBand, hideCentre, selected, onBar }) {
    const H = 260, base = 222, top = 20;
    const expected = (b) => M * hist.width * normalDensity(hist.centre(b), mu, sd);
    let maxC = Math.max(...hist.counts);
    if (showNormal) for (let b = 0; b < hist.counts.length; b++) maxC = Math.max(maxC, expected(b));
    const Y = (c) => base - (c / maxC) * (base - top);
    const pxPerUnit = (PR - PL) / 10;
    const barW = Math.max(hist.width * pxPerUnit - 1, 1);
    const curve = [];
    if (showNormal) for (let i = 0; i <= 300; i++) { const x = -0.5 + (10 * i) / 300; curve.push(`${X(x).toFixed(1)},${Y(M * hist.width * normalDensity(x, mu, sd)).toFixed(1)}`); }
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Histogram of sample means" className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            {showBand && <rect x={X(mu - 2 * sd)} y={top} width={X(mu + 2 * sd) - X(mu - 2 * sd)} height={base - top} fill="#e11d48" fillOpacity={0.12} />}
            {hist.counts.map((c, b) => (
                <rect key={b} x={X(hist.centre(b)) - barW / 2} y={Y(c)} width={barW} height={base - Y(c)}
                    fill={selected === b ? '#fda4af' : '#e11d48'} fillOpacity={0.8}
                    onClick={onBar ? () => onBar(b) : undefined} style={{ cursor: onBar ? 'pointer' : 'default' }} />
            ))}
            {showNormal && <polyline points={curve.join(' ')} fill="none" stroke="#f8fafc" strokeWidth={2} />}
            <line x1={PL} y1={base} x2={PR} y2={base} stroke="#64748b" />
            {VALUES.map(v => <text key={v} x={X(v)} y={base + 14} fontSize={10} fill="#64748b" textAnchor="middle">{v}</text>)}
            {!hideCentre && (
                <g>
                    <line x1={X(mu)} y1={top} x2={X(mu)} y2={base} stroke="#fbbf24" strokeDasharray="4 3" />
                    <text x={X(mu) + 5} y={top + 12} fontSize={11} fill="#fbbf24">μ = {texNum(mu, 2)}</text>
                </g>
            )}
            <text x={W - 10} y={H - 8} fontSize={10} fill="#64748b" textAnchor="end">sample mean</text>
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

export default function CentralLimitTheoremPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1800);
    const [ex, setEx] = useState({ shape: 'skewed', n: 10, M: M_TOUR, seed: SEED, bar: null, showBand: true });
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
    const { shape, n, M, seed } = s;
    const pop = population(shape);
    const sums = useMemo(() => sampleSums(shape, n, M, seed), [shape, n, M, seed]);
    const hist = useMemo(() => histogram(sums, n, pop.sigma), [sums, n, pop.sigma]);
    const stats = useMemo(() => summary(sums, n), [sums, n]);
    const se = pop.sigma / Math.sqrt(n);
    const inBand = useMemo(() => { let c = 0; for (const v of sums) if (Math.abs(v / n - pop.mu) <= 2 * se) c++; return c / sums.length; }, [sums, n, pop.mu, se]);
    const bar = mode === 'explore' && ex.bar !== null && ex.bar < hist.counts.length ? ex.bar : null;

    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        return { shape: step.shape, n: step.n, M: step.M, seed: step.seed, bar: null, showBand: step.showBand };
    };
    const update = (fn) => setEx(fn(base()));

    const formula = String.raw`\bar{X}_{${n}} \approx N\!\left(\mu, \tfrac{\sigma^2}{n}\right), \quad \mu = ${texNum(pop.mu, 3)}, \quad \frac{\sigma}{\sqrt{n}} = \frac{${texNum(pop.sigma, 3)}}{\sqrt{${n}}} = \mathbf{${texNum(se, 3)}}`
        + String.raw` \\[6pt] \text{simulated: mean } ${texNum(stats.mean, 3)}, \;\text{sd } ${texNum(stats.sd, 3)}, \;\text{skewness } ${texNum(stats.skew, 2)}, \;\text{within } \pm 2\sigma/\sqrt{n}\text{: } ${texNum(inBand * 100, 1)}\%`;

    const explanation = mode === 'guided' ? step.explanation : bar !== null
        ? `Means from ${texNum((hist.g * bar) / n, 2)} to ${texNum((hist.g * bar + hist.g - 1) / n, 2)}: ${hist.counts[bar]} of ${M.toLocaleString('en-US')} samples, against ${texNum(M * hist.width * normalDensity(hist.centre(bar), pop.mu, se), 1)} predicted by the normal curve.`
        : `${M.toLocaleString('en-US')} samples of size ${n}. Their means average ${texNum(stats.mean, 3)} (μ = ${texNum(pop.mu, 3)}) with spread ${texNum(stats.sd, 3)} (σ/√n = ${texNum(se, 3)}), and their skewness is ${texNum(stats.skew, 2)} (a normal curve has 0). Click a bar to compare it with the curve.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/probability-and-statistics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Probability and Statistics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Central Limit Theorem</h1>
                    <p className="text-rose-100 max-w-3xl">
                        Average a few draws from any distribution, again and again. The averages pile up into a bell curve centred on μ, narrowing like σ/√n — even when the population looks nothing like a bell.
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
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : `seed ${ex.seed} · n = ${n}`}
                            </span>
                        </div>

                        <PopulationBars ps={pop.ps} mu={pop.mu} hideCentre={hiding} />
                        <div className="h-2" />
                        <MeansHistogram hist={hist} M={M} mu={pop.mu} sd={se}
                            showNormal={mode === 'explore' || step.showNormal} showBand={mode === 'explore' ? ex.showBand : step.showBand}
                            hideCentre={hiding} selected={bar} onBar={(b) => update(x => ({ ...x, bar: b }))} />

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
                                {Object.entries(SHAPES).map(([key, sh]) => (
                                    <button key={key} onClick={() => setEx(x => ({ ...x, shape: key, bar: null }))} aria-pressed={ex.shape === key}
                                        className={`text-xs px-3 py-1.5 rounded-lg border ${ex.shape === key ? 'border-rose-500 text-rose-200 bg-rose-500/10' : 'border-slate-700 text-slate-300 hover:border-rose-500'}`}>{sh.label}</button>
                                ))}
                                <button onClick={() => setEx(x => ({ ...x, showBand: !x.showBand }))} aria-pressed={ex.showBand}
                                    className={`text-xs px-3 py-1.5 rounded-lg border ${ex.showBand ? 'border-rose-500 text-rose-200 bg-rose-500/10' : 'border-slate-700 text-slate-400 hover:border-rose-500'}`}>±2σ/√n band</button>
                                <button onClick={() => setEx(x => ({ ...x, seed: randomSeed(), bar: null }))}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-500">
                                    <Shuffle className="h-3.5 w-3.5" />New samples
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ParamSlider label="n (sample size)" accent="rose" min={1} max={50} value={n} onChange={(v) => update(x => ({ ...x, n: v, bar: null }))} />
                            <ParamSlider label="Number of samples" accent="rose" min={200} max={5000} step={100} value={M} format={(v) => v.toLocaleString('en-US')}
                                onChange={(v) => update(x => ({ ...x, M: v }))} />
                        </div>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The theorem, in parts</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-amber-300 font-semibold">Centre</span> — the sample mean averages to μ, for every n.</li>
                            <li><span className="text-sky-300 font-semibold">Spread</span> — its standard deviation is σ/√n, the standard error.</li>
                            <li><span className="text-rose-300 font-semibold">Shape</span> — for large n it is close to normal, whatever the population.</li>
                            <li><span className="text-green-300 font-semibold">Why it matters</span> — μ ± 2σ/√n is a 95% range for an average, from any data.</li>
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
