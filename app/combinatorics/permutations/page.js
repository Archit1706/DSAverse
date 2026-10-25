"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Repeat,
} from 'lucide-react';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   An arrangement is a list of k tile indices from 0..n−1. Without repetition
   they are distinct and slot j has n − j choices; with repetition every slot
   has all n. */
const factorial = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const nPr = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r *= n - i; return r; };
const countArrangements = (n, k, rep) => (rep ? n ** k : nPr(n, k));
const choicesAt = (n, j, rep) => (rep ? n : n - j);
/** 3 → ³, for plain-text powers in explanations. */
const sup = (k) => String(k).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');

/** Position of an arrangement in dictionary order (0-based). */
const rankOf = (arr, n, rep) => {
    const k = arr.length;
    if (rep) return arr.reduce((r, a) => r * n + a, 0);
    const used = new Set();
    let r = 0;
    arr.forEach((a, j) => {
        let smaller = 0;
        for (let t = 0; t < a; t++) if (!used.has(t)) smaller++;
        r += smaller * nPr(n - j - 1, k - j - 1);
        used.add(a);
    });
    return r;
};
/** The arrangement at a dictionary position — the inverse of rankOf. */
const unrank = (r, n, k, rep) => {
    const out = [];
    if (rep) {
        for (let j = k - 1; j >= 0; j--) { out[j] = r % n; r = Math.floor(r / n); }
        return out;
    }
    const free = Array.from({ length: n }, (_, i) => i);
    for (let j = 0; j < k; j++) {
        const block = nPr(n - j - 1, k - j - 1);
        const idx = Math.floor(r / block);
        r %= block;
        out.push(free.splice(idx, 1)[0]);
    }
    return out;
};

const LETTERS = 'ABCDEFGH';
const DIGITS = '0123456789';
const TILE_COLORS = ['#e879f9', '#38bdf8', '#fbbf24', '#4ade80', '#f87171', '#a78bfa', '#fb923c', '#2dd4bf', '#f472b6', '#facc15'];

/* ── guided tour ───────────────────────────────────────── */

const PODIUM = { n: 5, k: 3, rep: false, labels: LETTERS, slotNames: ['Gold', 'Silver', 'Bronze'] };
const SHELF = { n: 4, k: 4, rep: false, labels: LETTERS, slotNames: ['1st', '2nd', '3rd', '4th'] };
const PIN = { n: 10, k: 3, rep: true, labels: DIGITS, slotNames: ['1st', '2nd', '3rd'] };
const OFFICERS = { n: 6, k: 2, rep: false, labels: LETTERS, slotNames: ['President', 'Treasurer'] };

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (sc, kind, filled, explanation, extra = {}) =>
        steps.push({ ...sc, kind, filled, explanation, focus: null, question: null, ask: null, ...extra });

    push(PODIUM, 'opening', [], 'Five runners, A to E, race for gold, silver and bronze. A podium is an ordered list of three different runners: A-B-C and B-A-C are different podiums. Fill the medals one at a time.');
    push(PODIUM, 'choose', [], 'Gold first. Nobody has a medal yet, so any of the 5 runners can take it.', { focus: 0 });
    push(PODIUM, 'place', [2], 'C wins gold. C cannot also win silver, so the pool for the next medal is one runner smaller.');
    push(PODIUM, 'choose', [2], 'Silver next. Whoever won gold is out of the running.', { focus: 1, question: 'slot', ask: ask++ });
    push(PODIUM, 'place', [2, 0], 'A wins silver. Every one of the 5 gold winners could be paired with any of the 4 runners left, so the first two medals can go 5 × 4 = 20 ways.');
    push(PODIUM, 'choose', [2, 0], 'Bronze last. Two runners already have medals.', { focus: 2, question: 'slot', ask: ask++ });
    push(PODIUM, 'place', [2, 0, 4], 'E wins bronze. By the counting principle the podium can be filled 5 × 4 × 3 = 60 ways — the choices shrink by one at each slot because a runner cannot be used twice.');
    push(PODIUM, 'formula', [2, 0, 4], 'Where the factorials come from: 5 × 4 × 3 is 5! = 5 × 4 × 3 × 2 × 1 with its tail 2 × 1 cut off. The tail is (5 − 3)!, so P(5, 3) = 5! / (5 − 3)! = 120 / 2 = 60.');
    push(SHELF, 'opening', [], 'Four books, A to D, go on a shelf with four places. Every book is used, so the question is only the order.', { question: 'total', ask: ask++ });
    push(SHELF, 'place', [1, 3, 0, 2], '4 × 3 × 2 × 1 = 4! = 24 orders. Arranging all n items is the case k = n: P(n, n) = n! / 0! = n!, since 0! is defined to be 1 — there is exactly one way to arrange nothing.');
    push(PIN, 'opening', [], 'A PIN is 3 digits from 0 to 9, and now repeats are allowed: 7-7-2 is a valid PIN. Choosing a digit does not use it up.');
    push(PIN, 'place', [7], '7 goes first. With repetition the tile stays in the pool — it was copied, not moved.');
    push(PIN, 'choose', [7], 'The second digit, with a 7 already in the first place.', { focus: 1, question: 'slot', ask: ask++ });
    push(PIN, 'place', [7, 7], 'Another 7 — allowed. Every slot of a PIN has all 10 digits to choose from.');
    push(PIN, 'choose', [7, 7], 'The third digit has 10 choices too.', { focus: 2, question: 'total', ask: ask++ });
    push(PIN, 'place', [7, 7, 2], '10 × 10 × 10 = 10³ = 1000 PINs. With repetition the count is nᵏ. Forbid repeats and it drops to 10 × 9 × 8 = 720 = P(10, 3).');
    push(OFFICERS, 'opening', [], 'A club of 6 elects a president and a treasurer, and one person cannot hold both posts. The two posts are different, so order matters.', { question: 'total', ask: ask++ });
    push(OFFICERS, 'place', [3, 0], '6 × 5 = 30 = 6! / 4! = 720 / 24. Swapping the two people gives a different result — D as president with A as treasurer is not A with D — which is exactly what makes this a permutation.');
    push(OFFICERS, 'closing', [3, 0], 'k slots from n items: n × (n − 1) × … × (n − k + 1) = n! / (n − k)! without repetition, nᵏ with it. Switch to Explore: click tiles to fill slots, click a slot to clear it, and slide through every arrangement in dictionary order.');
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Two questions: how many choices does this slot have, and how many
   arrangements are there in all. The wrong answers are forgetting that a
   used item is gone (or, with repetition, that it is not), the running
   product, nᵏ in place of nPr, and adding instead of multiplying. */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    const { n, k, rep } = step;
    let correct, candidates, question, because;
    if (step.question === 'slot') {
        const j = step.focus;
        correct = choicesAt(n, j, rep);
        const soFar = nPr(n, j);
        candidates = rep ? [n - j, n * n, n * (n - 1)] : [n, soFar * (n - j), n - j - 1, n - j + 1];
        question = `How many choices are there for slot ${j + 1} (${step.slotNames[j]})?`;
        because = rep
            ? `Repeats are allowed, so the digits already used are still available: all ${n} choices, every time.`
            : `${j} of the ${n} have been placed and none can be used again, so ${n} − ${j} = ${correct} are left.`;
    } else {
        correct = countArrangements(n, k, rep);
        const sum = Array.from({ length: k }, (_, j) => n - j).reduce((a, b) => a + b, 0);
        candidates = rep ? [nPr(n, k), n * k, n ** (k - 1)] : [n ** k, sum, n * k, nPr(n, k) / factorial(k)];
        question = `How many different arrangements are there in all, with ${k} slots and ${n} choices${rep ? ' (repeats allowed)' : ''}?`;
        because = rep
            ? `Every slot has all ${n} choices: ${Array(k).fill(n).join(' × ')} = ${n}${sup(k)} = ${correct}.`
            : `The choices shrink by one per slot: ${Array.from({ length: k }, (_, j) => n - j).join(' × ')} = ${n}! / ${n - k}! = ${correct}.`;
    }
    const seen = new Set([correct]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (!Number.isInteger(c) || c < 1 || seen.has(c)) continue;
        seen.add(c);
        wrong.push(c);
    }
    const slot = (step.ask * 3 + 1) % 4;
    const ordered = [...wrong];
    ordered.splice(slot, 0, correct);
    return { question, options: ordered.map(String), correct: slot, because };
};

const quizQuestions = [
    {
        question: 'Eight runners race for gold, silver and bronze. How many different podiums are possible?',
        options: ['24', '512', '56', '336'],
        correct: 3,
        explanation: '8 choices for gold, then 7 for silver, then 6 for bronze: 8 × 7 × 6 = 336 = 8! / 5!. 512 = 8³ would let one runner win two medals, and 56 = C(8, 3) ignores which medal is which.',
    },
    {
        question: 'Why is P(n, k) equal to n! / (n − k)!?',
        options: [
            'n! counts all n items in order; dividing by (n − k)! cuts off the tail of factors for the slots you are not filling',
            'Because each of the k slots is divided among the n items',
            'Dividing by (n − k)! removes the repeated items',
            'It is a definition, with no reason behind it',
        ],
        correct: 0,
        explanation: 'n! = n × (n − 1) × … × 1. Only the first k factors, n down to n − k + 1, are slot choices; the remaining factors multiply to (n − k)!, and dividing by it cancels them.',
    },
    {
        question: 'A 4-letter code uses the letters A to F, and letters may repeat. How many codes are there?',
        options: ['360', '1296', '24', '15'],
        correct: 1,
        explanation: 'With repetition each of the 4 positions has all 6 letters: 6⁴ = 1296. Without repetition it would be 6 × 5 × 4 × 3 = 360.',
    },
];

const codeExample = `from itertools import permutations, product
from math import perm, factorial

runners = 'ABCDE'
podiums = list(permutations(runners, 3))   # ordered, no repeats
print(len(podiums))                         # 60
print(perm(5, 3))                           # 60
print(factorial(5) // factorial(5 - 3))     # 120 // 2 = 60

print(podiums[:3])    # dictionary order: ('A','B','C'), ('A','B','D'), ...

# With repetition: every slot has all n choices
pins = list(product('0123456789', repeat=3))
print(len(pins))      # 10 ** 3 = 1000`;

/* ── picture ───────────────────────────────────────────── */

const W = 640, H = 300;

function SvgButton({ x, y, onClick, label, plus }) {
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } };
    return (
        <g transform={`translate(${x}, ${y})`} onClick={onClick} onKeyDown={onKey}
            role="button" tabIndex={0} aria-label={label} style={{ cursor: 'pointer' }} className="focus:outline-none">
            <rect x={-10} y={-10} width={20} height={20} rx={5} fill="#1e293b" stroke="#475569" />
            <line x1={-4.5} y1={0} x2={4.5} y2={0} stroke="#e2e8f0" strokeWidth={2} />
            {plus && <line x1={0} y1={-4.5} x2={0} y2={4.5} stroke="#e2e8f0" strokeWidth={2} />}
        </g>
    );
}

/**
 * The pool of n tiles above, k slots below. A placed tile is ghosted in the
 * pool when it is used up (no repetition) and stays solid when it is copied
 * (repetition). Above each filled slot: how many choices it had.
 */
function SlotStage({ n, k, rep, labels, slotNames, filled, focus, showAllCounts, onTile, onSlot, onN, onK }) {
    const tileSp = Math.min(62, 520 / Math.max(n, 1));
    const tileSize = Math.min(46, tileSp - 8);
    const poolX0 = W / 2 - ((n - 1) * tileSp) / 2;
    const slotSp = Math.min(90, 540 / Math.max(k, 1));
    const slotSize = Math.min(64, slotSp - 12);
    const slotX0 = W / 2 - ((k - 1) * slotSp) / 2;
    const used = new Set(filled);
    const product = Array.from({ length: k }, (_, j) => choicesAt(n, j, rep));
    const shownFactors = showAllCounts ? product : product.slice(0, filled.length);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${n} items filling ${k} slots`} className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            <text x={16} y={24} fontSize={12} fill="#94a3b8">Pool · n = {n}{rep ? ' · repeats allowed' : ''}</text>
            {onN && (
                <>
                    <SvgButton x={W - 60} y={20} onClick={() => onN(-1)} label="One item fewer" />
                    <SvgButton x={W - 30} y={20} onClick={() => onN(1)} label="One item more" plus />
                </>
            )}
            {Array.from({ length: n }, (_, i) => {
                const x = poolX0 + i * tileSp;
                const gone = !rep && used.has(i);
                const click = onTile && !gone && filled.length < k;
                return (
                    <g key={`t${i}`} transform={`translate(${x}, 70)`} onClick={click ? () => onTile(i) : undefined}
                        style={{ cursor: click ? 'pointer' : 'default' }} role={onTile ? 'button' : undefined}
                        aria-label={onTile ? `Place ${labels[i]}` : undefined}>
                        <rect x={-tileSize / 2} y={-tileSize / 2} width={tileSize} height={tileSize} rx={8}
                            fill={gone ? 'transparent' : TILE_COLORS[i % TILE_COLORS.length]} fillOpacity={gone ? 0 : 0.9}
                            stroke={TILE_COLORS[i % TILE_COLORS.length]} strokeWidth={2} strokeDasharray={gone ? '4 4' : undefined}
                            style={{ transition: 'fill-opacity .3s ease' }} />
                        <text x={0} y={6} textAnchor="middle" fontSize={Math.min(18, tileSize * 0.45)} fontWeight={700}
                            fill={gone ? TILE_COLORS[i % TILE_COLORS.length] : '#020617'} opacity={gone ? 0.5 : 1}>{labels[i]}</text>
                    </g>
                );
            })}

            <text x={16} y={140} fontSize={12} fill="#94a3b8">Slots · k = {k}</text>
            {onK && (
                <>
                    <SvgButton x={W - 60} y={136} onClick={() => onK(-1)} label="One slot fewer" />
                    <SvgButton x={W - 30} y={136} onClick={() => onK(1)} label="One slot more" plus />
                </>
            )}
            {Array.from({ length: k }, (_, j) => {
                const x = slotX0 + j * slotSp;
                const tile = filled[j];
                const has = tile !== undefined;
                const isFocus = focus === j;
                const showCount = has || showAllCounts;
                return (
                    <g key={`s${j}`} transform={`translate(${x}, 210)`} onClick={onSlot && has ? () => onSlot(j) : undefined}
                        style={{ cursor: onSlot && has ? 'pointer' : 'default' }}>
                        {showCount && (
                            <text x={0} y={-slotSize / 2 - 10} textAnchor="middle" fontSize={13} fontWeight={700} fill="#f0abfc">
                                {choicesAt(n, j, rep)}
                            </text>
                        )}
                        <rect x={-slotSize / 2} y={-slotSize / 2} width={slotSize} height={slotSize} rx={10}
                            fill={has ? TILE_COLORS[tile % TILE_COLORS.length] : '#0f172a'} fillOpacity={has ? 0.9 : 1}
                            stroke={isFocus ? '#ffffff' : has ? TILE_COLORS[tile % TILE_COLORS.length] : '#475569'}
                            strokeWidth={isFocus ? 3 : 2} strokeDasharray={has ? undefined : '6 4'} />
                        {has && <text x={0} y={8} textAnchor="middle" fontSize={Math.min(22, slotSize * 0.4)} fontWeight={800} fill="#020617">{labels[tile]}</text>}
                        {!has && isFocus && <text x={0} y={8} textAnchor="middle" fontSize={20} fontWeight={700} fill="#ffffff">?</text>}
                        <text x={0} y={slotSize / 2 + 16} textAnchor="middle" fontSize={11} fill="#64748b">{slotNames[j] ?? `slot ${j + 1}`}</text>
                    </g>
                );
            })}
            {k === 0 && <text x={W / 2} y={214} textAnchor="middle" fontSize={13} fill="#64748b">No slots: exactly one arrangement, the empty one.</text>}
            {shownFactors.length > 0 && (
                <text x={W / 2} y={H - 12} textAnchor="middle" fontSize={14} fontWeight={700} fill="#f0abfc">
                    {shownFactors.join(' × ')} = {shownFactors.reduce((a, b) => a * b, 1).toLocaleString('en-US')}
                </text>
            )}
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
                    className="text-sm px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-fuchsia-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/** P(n, k) with the factorial tail cancelled, or nᵏ, with the live numbers. */
const texCount = (n, k, rep) => {
    if (rep) {
        const body = k === 0 ? '1' : Array(k).fill(n).join(String.raw` \times `);
        return String.raw`${n}^{${k}} = ${body} = \mathbf{${n ** k}}`;
    }
    const head = Array.from({ length: k }, (_, j) => n - j);
    const tail = Array.from({ length: n - k }, (_, j) => n - k - j);
    const tailTex = tail.length ? tail.join(String.raw` \times `) : '';
    const numerator = [head.join(String.raw` \times `), tailTex ? String.raw`\cancel{${tailTex}}` : ''].filter(Boolean).join(String.raw` \times `) || '1';
    const denominator = tailTex ? String.raw`\cancel{${tailTex}}` : String.raw`0! = 1`;
    return String.raw`P(${n}, ${k}) = \frac{${n}!}{(${n} - ${k})!} = \frac{${numerator}}{${denominator}} = \mathbf{${nPr(n, k)}}`;
};

export default function PermutationsPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [ex, setEx] = useState({ n: 5, k: 3, rep: false, filled: [2, 0, 4] });   // explore state
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[currentStep];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const shown = mode === 'guided' ? step : { ...ex, labels: ex.n > 8 ? DIGITS : LETTERS, slotNames: [] };
    const { n, k, rep, filled } = shown;
    const total = countArrangements(n, k, rep);
    const complete = filled.length === k;
    const rank = complete ? rankOf(filled, n, rep) : null;

    /* Grabbing the picture during the tour switches to Explore with the
       tour's numbers, so nothing on screen jumps. */
    const base = () => {
        if (mode !== 'guided') return ex;
        const next = { n: step.n, k: Math.min(step.k, step.rep ? 6 : step.n), rep: step.rep, filled: [] };
        next.filled = step.filled.filter(t => t < next.n).slice(0, next.k);
        setMode('explore'); setIsPlaying(false);
        return next;
    };
    /** Keeps the explore state valid: tiles exist, at most k of them, distinct without repetition. */
    const normalise = (s) => {
        const maxK = s.rep ? 6 : s.n;
        const kk = Math.min(Math.max(s.k, 0), maxK);
        let f = s.filled.filter(t => t < s.n);
        if (!s.rep) f = f.filter((t, i) => f.indexOf(t) === i);
        return { ...s, k: kk, filled: f.slice(0, kk) };
    };
    const update = (fn) => { const b = base(); setEx(normalise(fn(b))); };

    const onTile = (i) => update(s => (s.filled.length < s.k && (s.rep || !s.filled.includes(i)) ? { ...s, filled: [...s.filled, i] } : s));
    const onSlot = (j) => update(s => ({ ...s, filled: s.filled.slice(0, j) }));
    const onN = (d) => update(s => ({ ...s, n: Math.min(Math.max(s.n + d, 1), 10) }));
    const onK = (d) => update(s => ({ ...s, k: s.k + d }));
    const setRank = (r) => update(s => ({ ...s, filled: unrank(Math.min(Math.max(r, 0), countArrangements(s.n, s.k, s.rep) - 1), s.n, s.k, s.rep) }));

    // While a prediction is open, nothing below the picture may give the answer away.
    const hiding = mode === 'guided' && predict.hideExplanation;
    const list = useMemo(() => {
        if (total > 120) return null;
        return Array.from({ length: total }, (_, r) => unrank(r, n, k, rep).map(t => shown.labels[t]).join('') || '∅');
    }, [total, n, k, rep, shown.labels]);

    const explanation = mode === 'guided'
        ? step.explanation
        : !complete
            ? `${filled.length} of ${k} slots filled. Slot ${filled.length + 1} has ${choicesAt(n, filled.length, rep)} choices${rep ? ' — repeats are allowed, so nothing is used up' : filled.length === 0 ? ', since nothing has been used yet' : `: the ${filled.length} placed ${filled.length === 1 ? 'item is' : 'items are'} out of the pool`}. Click a tile to place it.`
            : `This arrangement is number ${(rank + 1).toLocaleString('en-US')} of ${total.toLocaleString('en-US')} in dictionary order. ${rep ? `Every slot had all ${n} choices, so there are ${n}${sup(k)}.` : `The slots had ${Array.from({ length: k }, (_, j) => n - j).join(', ') || 'no'} choices, so there are ${total.toLocaleString('en-US')}.`} Click a slot to clear it from there on.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/combinatorics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Combinatorics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Permutations</h1>
                    <p className="text-fuchsia-100 max-w-3xl">
                        An arrangement is a choice for every slot, in order. Without repetition each choice uses an item up, so the options shrink — n, then n − 1, then n − 2 — and the product is n! / (n − k)!.
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
                                        onClick={() => { if (key === 'explore') setEx(normalise(base())); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Click tiles to fill slots; use + and − for n and k'}
                            </span>
                        </div>

                        <SlotStage n={n} k={k} rep={rep} labels={shown.labels} slotNames={shown.slotNames} filled={filled}
                            focus={mode === 'guided' ? step.focus : (complete ? null : filled.length)}
                            showAllCounts={mode === 'explore'} onTile={onTile} onSlot={onSlot} onN={onN} onK={onK} />

                        {mode === 'guided' ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="fuchsia" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-fuchsia-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => update(s => ({ ...s, rep: !s.rep }))} aria-pressed={rep}
                                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${rep ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-500/10' : 'border-slate-700 text-slate-400 hover:border-fuchsia-500'}`}>
                                    <Repeat className="h-3.5 w-3.5" />Repeats allowed
                                </button>
                                <button onClick={() => update(s => ({ ...s, filled: [] }))}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500">Clear slots</button>
                                <button onClick={() => setRank(0)}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500">First arrangement</button>
                            </div>
                        )}
                    </div>

                    {mode === 'guided' && predict.prompt && <PredictPrompt predict={predict} accent="fuchsia" />}

                    <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-fuchsia-400 mt-0.5 flex-shrink-0" />
                            <p className="text-fuchsia-200 text-sm leading-relaxed">
                                {mode === 'guided' && predict.hideExplanation ? 'Make your prediction above to reveal this step.' : explanation}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                        <div className="text-slate-100 text-sm sm:text-base">
                            {hiding ? <p className="text-sm text-slate-500">The formula is hidden until you answer.</p> : <Tex block>{texCount(n, k, rep)}</Tex>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ParamSlider label="n (items)" accent="fuchsia" min={1} max={10} value={n}
                                onChange={(v) => update(s => ({ ...s, n: v }))} />
                            <ParamSlider label="k (slots)" accent="fuchsia" min={0} max={rep ? 6 : n} value={k}
                                onChange={(v) => update(s => ({ ...s, k: v }))} />
                            <div className="sm:col-span-2">
                                <ParamSlider label="Arrangement number (dictionary order)" accent="fuchsia" min={1} max={Math.max(total, 1)}
                                    value={rank === null ? 1 : rank + 1}
                                    format={(v) => (hiding ? '—' : rank === null ? `— of ${total.toLocaleString('en-US')}` : `${v.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}`)}
                                    hint={rank === null ? 'Fill every slot, or slide to jump to an arrangement' : 'Slide to step through every arrangement'}
                                    onChange={(v) => setRank(v - 1)} />
                            </div>
                        </div>
                        {list && !hiding && (
                            <div>
                                <p className="text-xs text-slate-500 mb-2">All {total} arrangements, in dictionary order:</p>
                                <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                                    {list.map((s, r) => (
                                        <button key={`${s}-${r}`} onClick={() => setRank(r)}
                                            className={`font-mono text-[11px] px-1.5 py-0.5 rounded border ${r === rank ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white' : 'border-slate-800 text-slate-400 hover:border-slate-600'}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Two kinds of arrangement</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-fuchsia-300 font-semibold">No repetition</span> — n × (n − 1) × … × (n − k + 1) = n! / (n − k)!.</li>
                            <li><span className="text-sky-300 font-semibold">With repetition</span> — n × n × … × n = nᵏ.</li>
                            <li><span className="text-amber-300 font-semibold">All n items</span> — P(n, n) = n!, because 0! = 1.</li>
                            <li><span className="text-green-300 font-semibold">Order matters</span> — A-B and B-A are different. When it does not, divide by k! — that is the next page.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-fuchsia-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
