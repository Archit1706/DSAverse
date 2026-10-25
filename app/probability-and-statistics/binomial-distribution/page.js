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
   A ball meets n pegs and goes right at each with probability p. Its bin is
   its number of rights, k. A particular path with k rights has probability
   pᵏ (1 − p)ⁿ⁻ᵏ, and C(n, k) paths lead to bin k. */
const binom = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
const pmf = (n, p, k) => binom(n, k) * p ** k * (1 - p) ** (n - k);
/**
 * Drops `count` balls with a seeded generator. Ball i's path is a list of
 * 0 (left) and 1 (right); runs with the same seed share their first balls,
 * so 10 balls are the start of 1000.
 */
const simulate = (n, p, count, seed) => {
    const rng = createRng(seed);
    const bins = new Array(n + 1).fill(0);
    const paths = [];
    for (let b = 0; b < count; b++) {
        const path = [];
        for (let r = 0; r < n; r++) path.push(rng.chance(p) ? 1 : 0);
        bins[path.reduce((a, x) => a + x, 0)]++;
        paths.push(path);
    }
    return { bins, paths };
};
const rightsOf = (path) => path.reduce((a, x) => a + x, 0);
/** 8 → ⁸, for plain-text powers. */
const sup = (k) => String(k).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');
const binNumber = (label) => Number(label.replace('bin ', ''));
const modeOf = (n, p) => { let best = 0; for (let k = 1; k <= n; k++) if (pmf(n, p, k) > pmf(n, p, best) + 1e-12) best = k; return best; };

/* ── guided tour ───────────────────────────────────────── */

const SEED = 7, SEED_TILT = 11;

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (n, p, count, seed, explanation, extra = {}) => steps.push({ n, p, count, seed, explanation, inFlight: false, highlightBin: null, showExpected: false, question: null, ask: null, ...extra });
    push(8, 0.5, 0, SEED, 'A Galton board with 8 rows of pegs. A ball dropped at the top hits one peg per row and bounces left or right — each with probability 1/2, independently of every other bounce.');
    push(8, 0.5, 1, SEED, 'The first ball is on its way. Its path is drawn in white.', { inFlight: true, question: 'bin', ask: ask++ });
    const first = rightsOf(simulate(8, 0.5, 1, SEED).paths[0]);
    push(8, 0.5, 1, SEED, `It lands in bin ${first}: ${first} rights and ${8 - first} lefts. The bin counts how many bounces went right, not when they happened — any order of the same bounces ends in the same place.`);
    push(8, 0.5, 1, SEED, 'So how many different paths end in bin 2?', { question: 'paths', k: 2, ask: ask++ });
    push(8, 0.5, 1, SEED, 'A path to bin 2 is a choice of which 2 of the 8 rows bounce right: C(8, 2) = 28 of the 2⁸ = 256 equally likely paths. P(bin 2) = 28/256 ≈ 0.109.', { highlightBin: 2 });
    push(8, 0.5, 10, SEED, 'Ten balls. Too few to see a pattern yet.');
    push(8, 0.5, 100, SEED, 'A hundred balls: the middle bins are filling fastest.', { question: 'expected', k: 4, total: 1000, ask: ask++ });
    push(8, 0.5, 1000, SEED, 'A thousand balls, with the expected counts 1000 × C(8, k)/256 marked in white: bin 4 expects 1000 × 70/256 ≈ 273. The pile follows the binomial distribution, give or take random wobble.',
        { showExpected: true, highlightBin: 4 });
    push(8, 0.3, 0, SEED_TILT, 'Tilt the board: now each bounce goes right only 30% of the time, and left 70%.', { question: 'mode', ask: ask++ });
    push(8, 0.3, 1000, SEED_TILT, 'The pile shifts left and peaks at bin 2. P(X = k) = C(8, k) 0.3ᵏ 0.7⁸⁻ᵏ: the C(8, k) still counts paths, but paths with fewer rights are now each more likely.',
        { showExpected: true, highlightBin: 2 });
    push(8, 0.3, 1000, SEED_TILT, 'Its mean is np = 8 × 0.3 = 2.4 and its variance np(1 − p) = 1.68 (σ ≈ 1.30). Each bounce is a Bernoulli trial with mean p and variance p(1 − p), and n independent ones add up.',
        { showExpected: true });
    push(8, 0.3, 1000, SEED_TILT, 'n independent trials, each a success with probability p: the number of successes is Binomial(n, p). Switch to Explore to change n and p, drop more balls, and click a bin.',
        { showExpected: true });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   The bin from a path's moves (its mirror image and its neighbours as wrong
   answers); paths into a bin (C(n, k) against n(n − 1), nk and 2ᵏ); an
   expected count (against an even split); and the most likely bin. */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    const { n, p } = step;
    let correct, candidates, question, because;
    if (step.question === 'bin') {
        const path = simulate(n, p, 1, step.seed).paths[0];
        const k = rightsOf(path);
        correct = `bin ${k}`;
        candidates = [`bin ${n - k}`, `bin ${k + 1}`, `bin ${k - 1}`, `bin ${Math.floor(n / 2)}`, `bin ${k + 2}`, `bin ${k - 2}`].filter(c => binNumber(c) >= 0 && binNumber(c) <= n);
        question = `Its bounces are ${path.map(x => (x ? 'R' : 'L')).join(' ')}. Which bin does it land in? (Bins are numbered 0 to ${n} from the left.)`;
        because = `Count the rights: ${k} R${k === 1 ? '' : 's'}, so bin ${k}. Each right moves it half a bin right of the middle, each left half a bin left.`;
    } else if (step.question === 'paths') {
        correct = String(binom(n, step.k));
        candidates = [String(n * (n - 1)), String(n * step.k), String(2 ** step.k), String(n)];
        question = `How many different left/right paths lead to bin ${step.k}?`;
        because = `Choose which ${step.k} of the ${n} bounces go right: C(${n}, ${step.k}) = ${correct}.`;
    } else if (step.question === 'expected') {
        const e = step.total * pmf(n, p, step.k);
        correct = String(Math.round(e));
        candidates = [String(Math.round(step.total / (n + 1))), String(Math.round(step.total / n)), String(step.total / 2), String(Math.round(e / 2))];
        question = `Out of ${step.total} balls, about how many should land in bin ${step.k}?`;
        because = `${step.total} × C(${n}, ${step.k}) / 2${sup(n)} = ${step.total} × ${binom(n, step.k)}/${2 ** n} ≈ ${correct}.`;
    } else {
        const k = modeOf(n, p);
        correct = `bin ${k}`;
        candidates = [`bin ${Math.floor(n / 2)}`, `bin ${k + 1}`, `bin ${k - 1}`, `bin ${k + 2}`, `bin ${k - 2}`].filter(c => binNumber(c) >= 0 && binNumber(c) <= n);
        question = `With p = ${p}, which bin will be the most common?`;
        because = `The peak sits near np = ${texNum(n * p, 2)}: bin ${k} has the largest C(${n}, k) ${p}ᵏ ${texNum(1 - p, 2)}${sup(n)}⁻ᵏ.`;
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
        question: 'A fair coin is flipped 10 times. What is the probability of exactly 3 heads?',
        options: ['3/10', '120/1024', '1/8', '10/1024'],
        correct: 1,
        explanation: 'C(10, 3) = 120 sequences have exactly 3 heads, and each has probability (1/2)¹⁰ = 1/1024. So 120/1024 ≈ 0.117.',
    },
    {
        question: 'X is Binomial(n = 20, p = 0.25). What are its mean and variance?',
        options: ['Mean 5, variance 3.75', 'Mean 5, variance 5', 'Mean 0.25, variance 0.1875', 'Mean 20, variance 5'],
        correct: 0,
        explanation: 'Mean np = 20 × 0.25 = 5; variance np(1 − p) = 5 × 0.75 = 3.75.',
    },
    {
        question: 'Why does the binomial formula contain C(n, k)?',
        options: [
            'It is a normalising constant with no meaning',
            'Because the trials are dependent',
            'It counts the different orders in which the k successes can occur, each with the same probability',
            'Because the outcome is a combination of n and p',
        ],
        correct: 2,
        explanation: 'Every sequence with k successes has probability pᵏ (1 − p)ⁿ⁻ᵏ, and there are C(n, k) such sequences — the paths into bin k.',
    },
];

const codeExample = `import random
from math import comb
from collections import Counter

def galton(n, p, balls, seed=7):
    rng = random.Random(seed)
    # each ball: n bounces, count the rights
    return Counter(sum(rng.random() < p for _ in range(n)) for _ in range(balls))

n, p, balls = 8, 0.5, 1000
bins = galton(n, p, balls)
for k in range(n + 1):
    expected = balls * comb(n, k) * p**k * (1 - p)**(n - k)
    print(k, bins[k], round(expected))      # observed vs expected

print(n * p, n * p * (1 - p))               # mean 4.0, variance 2.0`;

/* ── picture ───────────────────────────────────────────── */

const W = 640;

/**
 * The board (pegs in a triangle) above the bins. The latest ball's path is
 * drawn; bars count the balls in each bin, white ticks mark the expected
 * count. Clicking a bin selects it.
 */
function GaltonBoard({ n, p, sim, inFlight, highlightBin, selectedBin, showExpected, onBin }) {
    const count = sim.paths.length;
    const dx = Math.min(46, 560 / (n + 1));
    const dy = Math.min(30, 210 / n);
    const cx = W / 2, top = 30;
    const boardBottom = top + n * dy;
    const binTop = boardBottom + 16, binH = 170;
    const H = binTop + binH + 40;
    const pegX = (r, j) => cx + (j - r / 2) * dx;
    const binX = (k) => cx + (k - n / 2) * dx;
    const expected = Array.from({ length: n + 1 }, (_, k) => count * pmf(n, p, k));
    const scaleMax = Math.max(1, ...sim.bins, ...(showExpected ? expected : [0]));
    const barH = (c) => (c / scaleMax) * (binH - 12);
    const last = count ? sim.paths[count - 1] : null;
    const pathPts = [];
    if (last) {
        let rights = 0;
        pathPts.push([cx, top - 16]);
        for (let r = 0; r < n; r++) { pathPts.push([pegX(r, rights), top + r * dy - 6]); rights += last[r]; }
        pathPts.push([binX(rights), inFlight ? boardBottom - 4 : binTop + binH - 14]);
    }
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Galton board with ${n} rows and ${count} balls`} className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            <text x={14} y={18} fontSize={11} fill="#94a3b8">{n} rows · right with probability {texNum(p, 2)} · {count.toLocaleString('en-US')} {count === 1 ? 'ball' : 'balls'}</text>
            {Array.from({ length: n }, (_, r) => Array.from({ length: r + 1 }, (_, j) => (
                <circle key={`${r}-${j}`} cx={pegX(r, j)} cy={top + r * dy} r={3.2} fill="#64748b" />
            )))}
            {pathPts.length > 0 && <polyline points={pathPts.map(q => q.join(',')).join(' ')} fill="none" stroke="#f8fafc" strokeWidth={2} strokeLinejoin="round" opacity={0.85} />}
            {last && inFlight && <circle cx={pathPts[pathPts.length - 1][0]} cy={pathPts[pathPts.length - 1][1]} r={6} fill="#fb7185" />}
            <line x1={binX(0) - dx / 2} y1={binTop + binH} x2={binX(n) + dx / 2} y2={binTop + binH} stroke="#475569" strokeWidth={2} />
            {Array.from({ length: n + 1 }, (_, k) => {
                const c = inFlight ? 0 : sim.bins[k];
                const hot = highlightBin === k || selectedBin === k;
                return (
                    <g key={`b${k}`} onClick={onBin ? () => onBin(k) : undefined} style={{ cursor: onBin ? 'pointer' : 'default' }}>
                        <rect x={binX(k) - dx / 2 + 1} y={binTop} width={dx - 2} height={binH} fill="transparent" />
                        <line x1={binX(k) - dx / 2} y1={binTop} x2={binX(k) - dx / 2} y2={binTop + binH} stroke="#1e293b" />
                        <rect x={binX(k) - dx * 0.38} y={binTop + binH - barH(c)} width={dx * 0.76} height={barH(c)} rx={3}
                            fill={hot ? '#fb7185' : '#e11d48'} fillOpacity={hot ? 0.95 : 0.7} style={{ transition: 'y .35s ease, height .35s ease' }} />
                        {showExpected && (
                            <line x1={binX(k) - dx * 0.45} y1={binTop + binH - barH(expected[k])} x2={binX(k) + dx * 0.45} y2={binTop + binH - barH(expected[k])}
                                stroke="#f8fafc" strokeWidth={2} />
                        )}
                        <text x={binX(k)} y={binTop + binH + 14} fontSize={11} fontWeight={700} fill={hot ? '#fecdd3' : '#94a3b8'} textAnchor="middle">{k}</text>
                        {count > 0 && !inFlight && <text x={binX(k)} y={binTop + binH + 28} fontSize={9.5} fill="#64748b" textAnchor="middle">{c}</text>}
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

export default function BinomialDistributionPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1700);
    const [ex, setEx] = useState({ n: 8, p: 0.5, count: 500, seed: SEED, k: 4 });
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
    const { n, p, count, seed } = s;
    const sim = useMemo(() => simulate(n, p, count, seed), [n, p, count, seed]);
    const k = mode === 'guided' ? (step.highlightBin ?? step.k ?? Math.round(n * p)) : ex.k;
    const kk = Math.min(k, n);

    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        return { n: step.n, p: step.p, count: Math.max(step.count, 1), seed: step.seed, k: Math.min(kk, step.n) };
    };
    const update = (fn) => setEx(fn(base()));

    const prob = pmf(n, p, kk);
    const observed = count ? sim.bins[kk] / count : 0;
    const formula = String.raw`P(X = ${kk}) = \binom{${n}}{${kk}}\, ${texNum(p, 2)}^{${kk}}\, ${texNum(1 - p, 2)}^{${n - kk}} = ${binom(n, kk)} \times ${texNum(p ** kk, 5)} \times ${texNum((1 - p) ** (n - kk), 5)} = \mathbf{${texNum(prob, 4)}}`
        + String.raw` \\[6pt] \text{observed: } \tfrac{${sim.bins[kk]}}{${count}} = ${texNum(observed, 4)}, \qquad E[X] = np = ${texNum(n * p, 2)}, \; \operatorname{Var}(X) = np(1-p) = ${texNum(n * p * (1 - p), 3)}`;

    const explanation = mode === 'guided' ? step.explanation
        : `${count.toLocaleString('en-US')} balls with n = ${n}, p = ${texNum(p, 2)}. Bin ${kk} holds ${sim.bins[kk]} of them (${texNum(observed * 100, 1)}%), against ${texNum(prob * 100, 1)}% expected. ${count < 200 ? 'With few balls the pile is lumpy; drop more and it settles onto the white ticks.' : 'The observed shares settle onto the formula as the number of balls grows.'} Click any bin to read its formula.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/probability-and-statistics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Probability and Statistics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Binomial Distribution</h1>
                    <p className="text-rose-100 max-w-3xl">
                        Count the successes in n independent trials. On a Galton board every peg is a trial and every bin is a count — and the pile of balls takes the shape of C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ.
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
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : `seed ${ex.seed} · click a bin`}
                            </span>
                        </div>

                        <GaltonBoard n={n} p={p} sim={sim} inFlight={mode === 'guided' && step.inFlight}
                            highlightBin={mode === 'guided' ? step.highlightBin : null} selectedBin={mode === 'explore' ? kk : null}
                            showExpected={mode === 'explore' || step.showExpected} onBin={(b) => update(x => ({ ...x, k: b }))} />

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
                                <button onClick={() => setEx(x => ({ ...x, seed: randomSeed() }))}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-500">
                                    <Shuffle className="h-3.5 w-3.5" />New balls
                                </button>
                                {[1, 10, 100, 1000].map(c => (
                                    <button key={c} onClick={() => setEx(x => ({ ...x, count: c }))}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-500">{c.toLocaleString('en-US')} {c === 1 ? 'ball' : 'balls'}</button>
                                ))}
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
                            <ParamSlider label="n (rows of pegs)" accent="rose" min={1} max={12} value={n}
                                onChange={(v) => update(x => ({ ...x, n: v, k: Math.min(x.k, v) }))} />
                            <ParamSlider label="p (chance of right)" accent="rose" min={0.05} max={0.95} step={0.05} value={p}
                                onChange={(v) => update(x => ({ ...x, p: v }))} />
                            <ParamSlider label="Balls" accent="rose" min={1} max={2000} step={1} value={count}
                                format={(v) => v.toLocaleString('en-US')} onChange={(v) => update(x => ({ ...x, count: v }))} />
                        </div>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Binomial(n, p)</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-rose-300 font-semibold">Setting</span> — n independent trials, each a success with probability p.</li>
                            <li><span className="text-sky-300 font-semibold">P(X = k)</span> — C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ: orders times the chance of one order.</li>
                            <li><span className="text-amber-300 font-semibold">Mean</span> — np. <span className="text-amber-300 font-semibold">Variance</span> — np(1 − p).</li>
                            <li><span className="text-green-300 font-semibold">Large n</span> — the pile looks more and more like a bell curve: the normal distribution, next.</li>
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
