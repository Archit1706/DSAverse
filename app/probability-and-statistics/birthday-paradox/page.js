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
   P(no two of n people share a birthday) = 365/365 × 364/365 × … ×
   (365 − n + 1)/365: each new person must avoid every birthday taken so
   far. The answer is the complement. Birthdays are taken as uniform over 365
   days, ignoring 29 February and seasonal bunching. */
const DAYS = 365;
const noMatch = (n) => { let p = 1; for (let i = 0; i < n; i++) p *= (DAYS - i) / DAYS; return p; };
const exactShared = (n) => 1 - noMatch(n);
const pairs = (n) => (n * (n - 1)) / 2;
/** The usual approximation: each of the C(n, 2) pairs matches with probability 1/365. */
const approxShared = (n) => 1 - Math.exp(-pairs(n) / DAYS);
/** The smallest n whose chance of a shared birthday reaches p. */
const peopleFor = (p) => { let n = 1; while (exactShared(n) < p) n++; return n; };
/** One room: n seeded birthdays (0–364). */
const roomOf = (n, seed) => { const rng = createRng(seed); return Array.from({ length: n }, () => rng.int(0, DAYS - 1)); };
const hasMatch = (days) => { const seen = new Set(); for (const d of days) { if (seen.has(d)) return true; seen.add(d); } return false; };
/** The share of `trials` seeded rooms of n people that contain a shared birthday. */
const simulateShare = (n, trials, seed) => {
    const rng = createRng(seed + n * 1009);
    let hits = 0;
    const seen = new Uint8Array(DAYS);
    for (let t = 0; t < trials; t++) {
        seen.fill(0);
        for (let i = 0; i < n; i++) { const d = rng.int(0, DAYS - 1); if (seen[d]) { hits++; break; } seen[d] = 1; }
    }
    return hits / trials;
};
const pct = (x, d = 1) => `${texNum(x * 100, d)}%`;
const SIM_NS = [5, 10, 15, 20, 23, 25, 30, 35, 40, 45, 50, 57, 60, 70, 80, 90, 100];

/* ── guided tour ───────────────────────────────────────── */

const SEED = 42, TRIALS = 500;

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (n, explanation, extra = {}) => steps.push({ n, seed: SEED, trials: TRIALS, explanation, question: null, ask: null, ...extra });
    push(10, `Ten people in a room. The chance that some two of them share a birthday is ${pct(exactShared(10))} — the curve at n = 10. The dots are 500 simulated rooms for each size.`,
        { question: 'p23', ask: ask++ });
    push(23, `With 23 people it is ${pct(exactShared(23))}: about 51%, better than a coin flip. Most people guess far more are needed, because they imagine someone sharing their own birthday — that takes about 253 others for even odds.`,
        { question: 'pairs', ask: ask++ });
    push(23, `23 people make C(23, 2) = 253 pairs, and every pair is a chance for a match. 253 chances of 1 in 365 add up quickly: 1 − e^(−253/365) ≈ 50%, close to the exact ${pct(exactShared(23))}.`);
    push(30, `At 30 people, ${pct(exactShared(30))}. The room below is one seeded draw of 30 birthdays, with any matches linked.`,
        { question: 'p99', ask: ask++ });
    push(57, `57 people already give ${pct(exactShared(57), 2)} — past the 99% mark, where 56 gave ${pct(exactShared(56), 2)}. The pairs grow like n², so the chance of avoiding every match collapses fast.`,
        { question: 'p366', ask: ask++ });
    push(100, `With 366 people a match is certain — 100% — by the pigeonhole principle: 366 people, 365 possible birthdays. Long before that it is practically certain anyway: 100 people give ${pct(exactShared(100), 5)}.`);
    push(23, 'Compute the complement — no match at all — as a product of shrinking chances, then subtract from 1. The same arithmetic tells you how soon hash values collide. Switch to Explore and drag along the curve.');
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   The chance at 23 (against the n/365 guess and its relatives), the number
   of pairs (against n, 2·pairs and n − 1), how many people reach 99%, and
   the certainty at 366. */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    let correct, candidates, question, because;
    if (step.question === 'p23') {
        correct = 'about 51%';
        candidates = ['about 6%', 'about 23%', 'about 97%'];
        question = 'With 23 people in the room, what is the chance that two share a birthday?';
        because = `1 − (365 × 364 × … × 343) / 365²³ = ${pct(exactShared(23))}. 23/365 ≈ 6% would be the chance that one particular person matches one other.`;
    } else if (step.question === 'pairs') {
        correct = String(pairs(23));
        candidates = ['23', String(23 * 22), '22'];
        question = 'How many different pairs of people are there among 23?';
        because = `Each of the 23 can pair with 22 others, and each pair is counted twice that way: 23 × 22 / 2 = ${pairs(23)}.`;
    } else if (step.question === 'p99') {
        correct = String(peopleFor(0.99));
        candidates = ['183', '100', '365'];
        question = 'How many people do you need for a 99% chance of a shared birthday?';
        because = `The curve passes 99% at n = ${peopleFor(0.99)}: ${pct(exactShared(peopleFor(0.99) - 1), 2)} at ${peopleFor(0.99) - 1}, ${pct(exactShared(peopleFor(0.99)), 2)} at ${peopleFor(0.99)}.`;
    } else {
        correct = '100%';
        candidates = ['99.9%', '50%', 'about 63%'];
        question = 'With 366 people, what is the chance of a shared birthday?';
        because = 'There are only 365 possible birthdays, so 366 people cannot all differ: a match is certain.';
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
        question: 'Why is a shared birthday likely with only 23 people?',
        options: [
            'Birthdays cluster in a few months',
            'There are 253 pairs, and any pair can match',
            '23 is close to half of 365',
            'Each person has a 50% chance of matching you',
        ],
        correct: 1,
        explanation: 'The question is about any pair, not about you. 23 people form 253 pairs, and that many 1-in-365 chances make a match more likely than not.',
    },
    {
        question: 'How is the exact probability computed most easily?',
        options: [
            'Add 1/365 once for every person',
            'Multiply 1/365 by the number of pairs',
            'Compute the chance that all birthdays differ, 365/365 × 364/365 × …, and subtract it from 1',
            'Divide n by 365',
        ],
        correct: 2,
        explanation: 'Counting "at least one match" directly means handling many overlapping cases. Its complement, "all different", is one product of shrinking fractions.',
    },
    {
        question: 'A hash function has 1,000,000 possible outputs. Roughly how many random inputs give a 50% chance of a collision?',
        options: ['500,000', 'About 1,200', '1,000,000', 'About 50'],
        correct: 1,
        explanation: 'The birthday bound: a collision becomes likely at about √(2 ln 2 × N) ≈ 1.18√N inputs, here about 1,180. That is why hash outputs need twice as many bits as you might expect.',
    },
];

const codeExample = `import random

def p_shared(n, days=365):
    p_all_differ = 1.0
    for i in range(n):
        p_all_differ *= (days - i) / days
    return 1 - p_all_differ

print(round(p_shared(23), 4))     # 0.5073
print(round(p_shared(57), 4))     # 0.9901

def simulate(n, trials=10_000, seed=42):
    rng = random.Random(seed)
    hits = 0
    for _ in range(trials):
        days = [rng.randrange(365) for _ in range(n)]
        hits += len(set(days)) < n           # a repeat means a shared birthday
    return hits / trials

print(simulate(23))               # close to 0.507`;

/* ── pictures ──────────────────────────────────────────── */

const W = 640, H = 290, PL = 44, PR = 622, PT = 16, PB = 250, NMAX = 100;
const X = (n) => PL + (n / NMAX) * (PR - PL);
const Y = (p) => PB - p * (PB - PT);

/**
 * The exact curve, the simulated dots, and a handle on the curve at n.
 * Dragging anywhere on the chart (or the arrow keys on the handle) moves n.
 */
function BirthdayChart({ n, sims, onN }) {
    const svgRef = useRef(null);
    const dragging = useRef(false);
    const toN = (e) => {
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const q = pt.matrixTransform(svg.getScreenCTM().inverse());
        return Math.min(Math.max(Math.round(((q.x - PL) / (PR - PL)) * NMAX), 2), NMAX);
    };
    const curve = Array.from({ length: NMAX }, (_, i) => `${X(i + 1).toFixed(1)},${Y(exactShared(i + 1)).toFixed(1)}`).join(' ');
    return (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Probability of a shared birthday against the number of people" className="block select-none"
            style={{ touchAction: onN ? 'none' : undefined }}
            onPointerDown={onN ? (e) => { dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); onN(toN(e)); } : undefined}
            onPointerMove={onN ? (e) => { if (dragging.current) onN(toN(e)); } : undefined}
            onPointerUp={onN ? () => { dragging.current = false; } : undefined}>
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            {[0, 0.25, 0.5, 0.75, 1].map(p => (
                <g key={p}>
                    <line x1={PL} y1={Y(p)} x2={PR} y2={Y(p)} stroke={p === 0.5 ? '#334155' : '#1e293b'} strokeDasharray={p === 0.5 ? '5 4' : undefined} />
                    <text x={PL - 6} y={Y(p) + 4} fontSize={10} fill="#64748b" textAnchor="end">{p * 100}%</text>
                </g>
            ))}
            {[0, 20, 40, 60, 80, 100].map(k => <text key={k} x={X(k)} y={PB + 15} fontSize={10} fill="#64748b" textAnchor="middle">{k}</text>)}
            <polyline points={curve} fill="none" stroke="#fb7185" strokeWidth={2.5} />
            {sims.map(([k, share]) => <circle key={k} cx={X(k)} cy={Y(share)} r={3.6} fill="#38bdf8" stroke="#020617" />)}
            <line x1={X(n)} y1={PT} x2={X(n)} y2={PB} stroke="#fda4af" strokeWidth={1} opacity={0.6} />
            <g tabIndex={onN ? 0 : undefined} role={onN ? 'slider' : undefined} aria-label={onN ? `Number of people, now ${n}` : undefined} aria-valuenow={n}
                onKeyDown={onN ? (e) => { const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (d) { e.preventDefault(); onN(Math.min(Math.max(n + d, 2), NMAX)); } } : undefined}
                className="focus:outline-none" style={{ cursor: onN ? 'ew-resize' : 'default' }}>
                <circle cx={X(n)} cy={Y(exactShared(n))} r={14} fill="transparent" />
                <circle cx={X(n)} cy={Y(exactShared(n))} r={6.5} fill="#f8fafc" stroke="#e11d48" strokeWidth={2.5} />
            </g>
            <text x={Math.min(X(n) + 8, PR - 110)} y={Math.max(Y(exactShared(n)) - 10, PT + 12)} fontSize={12} fontWeight={700} fill="#fecdd3">n = {n}: {pct(exactShared(n))}</text>
            <text x={(PL + PR) / 2} y={H - 6} fontSize={10} fill="#64748b" textAnchor="middle">people in the room</text>
        </svg>
    );
}

/** One room: every person's birthday as a dot on a year-long strip, matches linked. */
function Room({ days }) {
    const H2 = 96, x0 = 20, x1 = W - 20, y = 50;
    const dx = (d) => x0 + (d / (DAYS - 1)) * (x1 - x0);
    const byDay = new Map();
    days.forEach((d, i) => byDay.set(d, [...(byDay.get(d) ?? []), i]));
    const shared = [...byDay.entries()].filter(([, who]) => who.length > 1);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (
        <svg viewBox={`0 0 ${W} ${H2}`} width="100%" role="img" aria-label={`${days.length} birthdays, ${shared.length} shared`} className="block select-none">
            <rect x={0} y={0} width={W} height={H2} fill="#020617" rx={8} />
            <text x={12} y={16} fontSize={11} fill="#94a3b8">one room of {days.length}: {shared.length ? `${shared.length} shared ${shared.length === 1 ? 'birthday' : 'birthdays'}` : 'no shared birthday'}</text>
            <line x1={x0} y1={y} x2={x1} y2={y} stroke="#334155" strokeWidth={2} />
            {months.map((m, i) => <text key={m} x={dx(i * 30.4 + 15)} y={y + 30} fontSize={9} fill="#475569" textAnchor="middle">{m}</text>)}
            {[...byDay.entries()].map(([d, who]) => (
                <g key={d}>
                    {who.map((_, j) => (
                        <circle key={j} cx={dx(d)} cy={y - 8 - j * 9} r={3.8} fill={who.length > 1 ? '#fb7185' : '#64748b'} stroke="#020617" />
                    ))}
                    {who.length > 1 && <circle cx={dx(d)} cy={y} r={6} fill="none" stroke="#fb7185" strokeWidth={1.5} />}
                </g>
            ))}
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

export default function BirthdayParadoxPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1800);
    const [ex, setEx] = useState({ n: 23, seed: SEED, trials: TRIALS });
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
    const { n, seed, trials } = s;
    const sims = useMemo(() => SIM_NS.map(k => [k, simulateShare(k, trials, seed)]), [trials, seed]);
    const room = useMemo(() => roomOf(n, seed + n), [n, seed]);
    const p = exactShared(n);

    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        return { n: step.n, seed: step.seed, trials: step.trials };
    };
    const update = (fn) => setEx(fn(base()));
    const setN = (v) => update(x => ({ ...x, n: v }));

    const factors = n <= 6
        ? Array.from({ length: n }, (_, i) => String.raw`\tfrac{${DAYS - i}}{365}`).join(String.raw` \cdot `)
        : [0, 1, 2].map(i => String.raw`\tfrac{${DAYS - i}}{365}`).join(String.raw` \cdot `) + String.raw` \cdots \tfrac{${DAYS - n + 1}}{365}`;
    const formula = String.raw`P(\text{shared}) = 1 - ${factors} = 1 - ${texNum(noMatch(n), 4)} = \mathbf{${texNum(p, 4)}}`
        + String.raw` \\[6pt] \binom{${n}}{2} = ${pairs(n)} \text{ pairs}, \qquad 1 - e^{-${pairs(n)}/365} = ${texNum(approxShared(n), 4)}`;

    const explanation = mode === 'guided' ? step.explanation
        : `${n} people make ${pairs(n)} pairs. The chance that all ${n} birthdays differ is ${texNum(noMatch(n), 4)}, so a shared birthday has probability ${pct(p, 2)}. ${hasMatch(room) ? 'This seeded room has one.' : 'This seeded room happens to have none.'} Drag along the curve to change n, or reseed for new rooms.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/probability-and-statistics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Probability and Statistics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Birthday Paradox</h1>
                    <p className="text-rose-100 max-w-3xl">
                        In a room of just 23 people, two probably share a birthday. Not a paradox — just more pairs than intuition expects, and a complement that is easy to compute.
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
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : `seed ${ex.seed} · drag along the curve`}
                            </span>
                        </div>

                        {hiding ? (
                            <div className="rounded-lg border border-slate-700/60 bg-[#020617] h-48 flex items-center justify-center text-sm text-slate-500">
                                The curve is hidden until you answer.
                            </div>
                        ) : (
                            <BirthdayChart n={n} sims={sims} onN={setN} />
                        )}
                        <div className="h-2" />
                        <Room days={room} />

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
                                {[10, 23, 30, 57, 70].map(k => (
                                    <button key={k} onClick={() => setEx(x => ({ ...x, n: k }))}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-500">{k} people</button>
                                ))}
                                <button onClick={() => setEx(x => ({ ...x, seed: randomSeed() }))}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-500">
                                    <Shuffle className="h-3.5 w-3.5" />New rooms
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
                            <ParamSlider label="People in the room" accent="rose" min={2} max={NMAX} value={n} onChange={setN} />
                            <ParamSlider label="Simulated rooms per dot" accent="rose" min={100} max={2000} step={100} value={trials}
                                format={(v) => v.toLocaleString('en-US')} onChange={(v) => update(x => ({ ...x, trials: v }))} />
                        </div>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Why it surprises</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-rose-300 font-semibold">Any pair counts</span> — not just pairs that include you.</li>
                            <li><span className="text-sky-300 font-semibold">Pairs grow like n²</span> — 23 people, 253 pairs.</li>
                            <li><span className="text-amber-300 font-semibold">Complement</span> — all different is one product; subtract it from 1.</li>
                            <li><span className="text-green-300 font-semibold">Collisions</span> — hashing N values collides after about √N inputs.</li>
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
