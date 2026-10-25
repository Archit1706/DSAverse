"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Dices, Coins,
} from 'lucide-react';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   A sample space Ω lists every outcome; here they are equally likely, so an
   event E — any set of outcomes — has P(E) = |E| / |Ω|. Unions,
   intersections and complements are just the set operations on those lists. */
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
/** 6/36 → "1/6"; 0 and 1 stay whole. */
const frac = (num, den) => {
    if (num === 0) return '0';
    if (num === den) return '1';
    const g = gcd(num, den);
    return `${num / g}/${den / g}`;
};
/** "6/36 = 1/6", or just "5/36" when it does not reduce. */
const fracText = (num, den) => (frac(num, den) === `${num}/${den}` ? `${num}/${den}` : `${num}/${den} = ${frac(num, den)}`);

const diceSpace = () => {
    const out = [];
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) out.push({ key: `${a},${b}`, dice: [a, b] });
    return out;
};
const coinSpace = (n) => Array.from({ length: 2 ** n }, (_, m) => {
    const s = Array.from({ length: n }, (_, i) => ((m >> (n - 1 - i)) & 1 ? 'T' : 'H')).join('');
    return { key: s, coins: s };
});
const heads = (s) => [...s].filter(c => c === 'H').length;

const DICE_EVENTS = {
    sum7: { label: 'sum is 7', test: (o) => o.dice[0] + o.dice[1] === 7 },
    firstEven: { label: 'first die is even', test: (o) => o.dice[0] % 2 === 0 },
    doubles: { label: 'doubles', test: (o) => o.dice[0] === o.dice[1] },
    sum8: { label: 'sum is 8', test: (o) => o.dice[0] + o.dice[1] === 8 },
    high: { label: 'sum is 10 or more', test: (o) => o.dice[0] + o.dice[1] >= 10 },
    six: { label: 'at least one 6', test: (o) => o.dice[0] === 6 || o.dice[1] === 6 },
};
const COIN_EVENTS = {
    atLeast2H: { label: 'at least 2 heads', test: (o) => heads(o.coins) >= 2 },
    atLeast1H: { label: 'at least one head', test: (o) => heads(o.coins) >= 1 },
    firstH: { label: 'first coin is heads', test: (o) => o.coins[0] === 'H' },
    exactly1H: { label: 'exactly one head', test: (o) => heads(o.coins) === 1 },
    allSame: { label: 'all the same', test: (o) => new Set(o.coins).size === 1 },
};
const spaceOf = (exp, nCoins) => (exp === 'dice' ? diceSpace() : coinSpace(nCoins));
const eventsOf = (exp) => (exp === 'dice' ? DICE_EVENTS : COIN_EVENTS);
/** The set of outcome keys an event holds. */
const keysOf = (space, test) => new Set(space.filter(test).map(o => o.key));
/** The outcome keys picked out by a view: A, B, A ∪ B, A ∩ B or the complement of A. */
const viewKeys = (space, A, B, view) => {
    const all = space.map(o => o.key);
    if (view === 'A') return new Set(all.filter(k => A.has(k)));
    if (view === 'B') return new Set(all.filter(k => B.has(k)));
    if (view === 'union') return new Set(all.filter(k => A.has(k) || B.has(k)));
    if (view === 'inter') return new Set(all.filter(k => A.has(k) && B.has(k)));
    if (view === 'compA') return new Set(all.filter(k => !A.has(k)));
    return new Set();
};

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (exp, A, B, view, explanation, extra = {}) => steps.push({ exp, nCoins: 3, A, B, view, explanation, question: null, ask: null, ...extra });
    push('dice', null, null, 'none', 'Roll two dice, one red and one blue. Each cell of the grid is one outcome — (red, blue) — and the number in it is the sum. There are 6 × 6 = 36 outcomes, all equally likely, so each has probability 1/36.');
    push('dice', null, null, 'none', 'An event is a set of outcomes. Event A: "the sum is 7".', { question: 'count', target: 'sum7', ask: ask++ });
    push('dice', 'sum7', null, 'A', 'A is the diagonal (1,6), (2,5), (3,4), (4,3), (5,2), (6,1): 6 outcomes. P(A) = 6/36 = 1/6. No other sum has as many — 7 is the most likely total.');
    push('dice', 'sum7', 'firstEven', 'B', 'Event B: "the red die is even" — three whole rows, 18 outcomes, P(B) = 18/36 = 1/2.',
        { question: 'inter', ask: ask++ });
    push('dice', 'sum7', 'firstEven', 'inter', 'A ∩ B — both at once — is where the diagonal crosses the even rows: (2,5), (4,3) and (6,1). P(A ∩ B) = 3/36 = 1/12.',
        { question: 'union', ask: ask++ });
    push('dice', 'sum7', 'firstEven', 'union', 'A ∪ B — either one, or both — has 6 + 18 − 3 = 21 outcomes. Adding |A| and |B| counts the 3 shared outcomes twice, so they are subtracted once: P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = 21/36.');
    push('dice', 'sum7', 'firstEven', 'compA', 'The complement Aᶜ — "the sum is not 7" — is everything outside A: 36 − 6 = 30 outcomes, so P(Aᶜ) = 1 − 1/6 = 5/6.');
    push('dice', 'doubles', 'sum8', 'B', 'New events: A is "doubles" (the main diagonal), B is "the sum is 8".', { question: 'inter', ask: ask++ });
    push('dice', 'doubles', 'sum8', 'inter', 'Only (4,4) is both a double and a sum of 8, so P(A ∩ B) = 1/36. Two events can be small and still overlap in a single outcome.');
    push('coins', null, null, 'none', 'Three coins: each flip branches into H or T, so the tree has 2 × 2 × 2 = 8 leaves, each with probability 1/8.');
    push('coins', null, null, 'none', 'Event A: "at least 2 heads".', { question: 'count', target: 'atLeast2H', ask: ask++ });
    push('coins', 'atLeast2H', null, 'A', 'HHH, HHT, HTH and THH: 4 of the 8 leaves, so P(A) = 4/8 = 1/2.');
    push('coins', null, null, 'none', '"At least one head" has seven outcomes and is tedious to list. Its complement, "no heads", is a single leaf.', { question: 'complement', target: 'atLeast1H', ask: ask++ });
    push('coins', 'atLeast1H', null, 'compA', 'The complement is TTT alone, probability 1/8, so P(at least one head) = 1 − 1/8 = 7/8. "At least one" questions are almost always easiest through the complement.');
    push('coins', 'atLeast1H', null, 'A', 'Outcomes, events as sets, and probabilities as counts over the sample space. Switch to Explore: pick events, combine them, or click outcomes to build an event of your own.');
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Counting outcomes: an event's size (±1, double, the complement), an
   intersection (each set alone, their sum), a union (the sum without the
   overlap removed), and a complement probability. */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    const space = spaceOf(step.exp, step.nCoins);
    const ev = eventsOf(step.exp);
    const total = space.length;
    let correct, candidates, question, because;
    if (step.question === 'count') {
        const E = keysOf(space, ev[step.target].test);
        correct = E.size;
        candidates = [correct - 1, correct + 1, 2 * correct, total - correct];
        question = `How many of the ${total} outcomes are in "${ev[step.target].label}"?`;
        because = `Count them on the ${step.exp === 'dice' ? 'grid' : 'tree'}: ${correct}, so the probability is ${correct}/${total} = ${frac(correct, total)}.`;
    } else if (step.question === 'inter' || step.question === 'union') {
        const A = keysOf(space, ev[step.A].test), B = keysOf(space, ev[step.B].test);
        const both = [...A].filter(k => B.has(k)).length;
        if (step.question === 'inter') {
            correct = both;
            candidates = [A.size, B.size, A.size + B.size, both + 1];
            question = `How many outcomes are in both "${ev[step.A].label}" and "${ev[step.B].label}"?`;
            because = `Only the outcomes in both sets count: ${both} of them.`;
        } else {
            correct = A.size + B.size - both;
            candidates = [A.size + B.size, B.size, correct + 1, correct - 1];
            question = `How many outcomes are in "${ev[step.A].label}" or "${ev[step.B].label}" (or both)?`;
            because = `${A.size} + ${B.size} counts the ${both} shared outcomes twice: ${A.size} + ${B.size} − ${both} = ${correct}.`;
        }
    } else {
        const E = keysOf(space, ev[step.target].test);
        correct = frac(E.size, total);
        candidates = [frac(total - E.size, total), frac(3, 8), frac(1, 2), `${E.size - 1}/${total}`];
        question = `Using the complement, what is P("${ev[step.target].label}")?`;
        because = `Its complement has ${total - E.size} outcome${total - E.size === 1 ? '' : 's'}: 1 − ${frac(total - E.size, total)} = ${correct}.`;
    }
    const seen = new Set([String(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        const key = String(c);
        if ((typeof c === 'number' && c < 0) || seen.has(key)) continue;
        seen.add(key);
        wrong.push(key);
    }
    const slot = (step.ask * 3 + 1) % 4;
    const ordered = [...wrong];
    ordered.splice(slot, 0, String(correct));
    return { question, options: ordered, correct: slot, because };
};

const quizQuestions = [
    {
        question: 'Two dice are rolled. What is the probability that the sum is 4?',
        options: ['1/12', '1/9', '1/6', '4/36 = 1/9'],
        correct: 0,
        explanation: 'The outcomes (1,3), (2,2) and (3,1) give 4: 3 of 36, so 3/36 = 1/12. (1,3) and (3,1) are different outcomes, since the dice can be told apart.',
    },
    {
        question: 'P(A) = 0.5, P(B) = 0.4 and P(A ∩ B) = 0.2. What is P(A ∪ B)?',
        options: ['0.9', '0.2', '0.7', '1.1'],
        correct: 2,
        explanation: 'P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = 0.5 + 0.4 − 0.2 = 0.7. Simply adding would count the overlap twice.',
    },
    {
        question: 'Four coins are flipped. What is the probability of at least one tail?',
        options: ['1/4', '15/16', '1/2', '4/16'],
        correct: 1,
        explanation: 'The complement, "no tails", is the single outcome HHHH out of 2⁴ = 16. So P(at least one tail) = 1 − 1/16 = 15/16.',
    },
];

const codeExample = `from itertools import product
from fractions import Fraction

omega = list(product(range(1, 7), repeat=2))    # 36 outcomes (red, blue)

A = {o for o in omega if sum(o) == 7}            # the sum is 7
B = {o for o in omega if o[0] % 2 == 0}          # the red die is even

P = lambda E: Fraction(len(E), len(omega))
print(P(A), P(B))                # 1/6 1/2
print(P(A & B))                  # 1/12   intersection
print(P(A | B))                  # 7/12   union = 21/36
print(P(A) + P(B) - P(A & B))    # 7/12   the same, by inclusion-exclusion
print(1 - P(A))                  # 5/6    complement`;

/* ── pictures ──────────────────────────────────────────── */

const W = 640;
const A_COLOR = '#e11d48', B_COLOR = '#0284c7', AB_COLOR = '#7c3aed';
const cellColor = (inA, inB) => (inA && inB ? AB_COLOR : inA ? A_COLOR : inB ? B_COLOR : '#1e293b');

function Pips({ n, x, y, size, color }) {
    const s = size, q = s / 4;
    const spots = {
        1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
        5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
    }[n];
    return (
        <g transform={`translate(${x}, ${y})`}>
            <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s / 5} fill={color} />
            {spots.map(([dx, dy], i) => <circle key={i} cx={dx * q} cy={dy * q} r={s / 11} fill="#f8fafc" />)}
        </g>
    );
}

/** The 36 outcomes of two dice, red down the side and blue across the top. */
function DiceGrid({ A, B, result, onCell }) {
    const cell = 64, x0 = 120, y0 = 56;
    return (
        <svg viewBox={`0 0 ${W} ${y0 + 6 * cell + 16}`} width="100%" role="img" aria-label="The 36 outcomes of two dice" className="block select-none">
            <rect x={0} y={0} width={W} height={y0 + 6 * cell + 16} fill="#020617" rx={8} />
            <text x={x0 + 3 * cell} y={18} textAnchor="middle" fontSize={11} fill="#60a5fa">blue die</text>
            <text x={30} y={y0 + 3 * cell} textAnchor="middle" fontSize={11} fill="#f87171" transform={`rotate(-90, 30, ${y0 + 3 * cell})`}>red die</text>
            {[1, 2, 3, 4, 5, 6].map(v => <Pips key={`t${v}`} n={v} x={x0 + (v - 0.5) * cell} y={y0 - 22} size={24} color="#1d4ed8" />)}
            {[1, 2, 3, 4, 5, 6].map(v => <Pips key={`l${v}`} n={v} x={x0 - 26} y={y0 + (v - 0.5) * cell} size={24} color="#b91c1c" />)}
            {diceSpace().map(o => {
                const [a, b] = o.dice;
                const inA = A.has(o.key), inB = B.has(o.key), inR = result.has(o.key);
                const dim = result.size > 0 && !inR;
                return (
                    <g key={o.key} transform={`translate(${x0 + (b - 1) * cell}, ${y0 + (a - 1) * cell})`}
                        onClick={onCell ? () => onCell(o.key) : undefined} style={{ cursor: onCell ? 'pointer' : 'default' }}>
                        <rect x={3} y={3} width={cell - 6} height={cell - 6} rx={8} fill={cellColor(inA, inB)}
                            fillOpacity={dim ? 0.18 : inA || inB ? 0.85 : 1} stroke={inR ? '#ffffff' : '#334155'} strokeWidth={inR ? 2.5 : 1}
                            style={{ transition: 'fill-opacity .3s ease, stroke .3s ease' }} />
                        <text x={cell / 2} y={cell / 2 + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={dim ? '#475569' : '#f8fafc'}>{a + b}</text>
                    </g>
                );
            })}
        </svg>
    );
}

/** The coin tree: n levels of H/T branching, one leaf per outcome. */
function CoinTree({ n, A, B, result, onLeaf }) {
    const space = coinSpace(n);
    const L = space.length;
    const top = 30, levelH = 62;
    const H = top + n * levelH + 70;
    const leafX = (j) => 30 + ((j + 0.5) * (W - 60)) / L;
    const xAt = (level, t) => { const span = L / 2 ** level; return leafX(t * span + span / 2 - 0.5); };
    const lines = [];
    for (let level = 1; level <= n; level++) {
        for (let t = 0; t < 2 ** level; t++) {
            const parent = Math.floor(t / 2);
            const isH = t % 2 === 0;
            lines.push(
                <g key={`${level}-${t}`}>
                    <line x1={xAt(level - 1, parent)} y1={top + (level - 1) * levelH} x2={xAt(level, t)} y2={top + level * levelH}
                        stroke={isH ? '#fbbf24' : '#94a3b8'} strokeWidth={1.6} opacity={0.8} />
                    {2 ** level <= 16 && (
                        <text x={(xAt(level - 1, parent) + xAt(level, t)) / 2 + (isH ? -8 : 8)} y={top + (level - 0.45) * levelH}
                            textAnchor="middle" fontSize={11} fontWeight={700} fill={isH ? '#fbbf24' : '#94a3b8'}>{isH ? 'H' : 'T'}</text>
                    )}
                </g>
            );
        }
    }
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`The ${L} outcomes of ${n} coins`} className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            {lines}
            <circle cx={xAt(0, 0)} cy={top} r={5} fill="#f1f5f9" />
            {space.map((o, j) => {
                const inA = A.has(o.key), inB = B.has(o.key), inR = result.has(o.key);
                const dim = result.size > 0 && !inR;
                const w = Math.min(64, (W - 60) / L - 4);
                return (
                    <g key={o.key} transform={`translate(${leafX(j)}, ${top + n * levelH + 26})`}
                        onClick={onLeaf ? () => onLeaf(o.key) : undefined} style={{ cursor: onLeaf ? 'pointer' : 'default' }}>
                        <rect x={-w / 2} y={-14} width={w} height={28} rx={6} fill={cellColor(inA, inB)}
                            fillOpacity={dim ? 0.18 : inA || inB ? 0.85 : 1} stroke={inR ? '#ffffff' : '#334155'} strokeWidth={inR ? 2.5 : 1} />
                        <text y={4} textAnchor="middle" fontSize={Math.min(12, w / (n * 0.75))} fontWeight={700} fontFamily="ui-monospace, monospace"
                            fill={dim ? '#475569' : '#f8fafc'}>{o.coins}</text>
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

const VIEWS = [['A', 'A'], ['B', 'B'], ['union', 'A ∪ B'], ['inter', 'A ∩ B'], ['compA', 'Aᶜ']];
const texFrac = (num, den) => String.raw`\tfrac{${num}}{${den}}`;

export default function SampleSpacesAndEventsPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [ex, setEx] = useState({ exp: 'dice', nCoins: 3, A: [...keysOf(diceSpace(), DICE_EVENTS.sum7.test)], aName: 'sum7', B: 'firstEven', view: 'union' });
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

    const exp = mode === 'guided' ? step.exp : ex.exp;
    const nCoins = mode === 'guided' ? step.nCoins : ex.nCoins;
    const space = useMemo(() => spaceOf(exp, nCoins), [exp, nCoins]);
    const ev = eventsOf(exp);
    const A = useMemo(() => (mode === 'guided'
        ? (step.A ? keysOf(space, ev[step.A].test) : new Set())
        : new Set(ex.A)), [mode, step, space, ev, ex.A]);
    const B = useMemo(() => (mode === 'guided'
        ? (step.B ? keysOf(space, ev[step.B].test) : new Set())
        : (ex.B ? keysOf(space, ev[ex.B].test) : new Set())), [mode, step, space, ev, ex.B]);
    const view = mode === 'guided' ? step.view : ex.view;
    const result = viewKeys(space, A, B, view);
    const total = space.length;
    const nA = A.size, nB = B.size, nAB = [...A].filter(k => B.has(k)).length;
    const nU = nA + nB - nAB;
    const aLabel = mode === 'guided' ? (step.A ? ev[step.A].label : '—') : ex.aName ? ev[ex.aName]?.label ?? 'your event' : 'your event';
    const bLabel = mode === 'guided' ? (step.B ? ev[step.B].label : '—') : ex.B ? ev[ex.B].label : '—';

    /* Clicking an outcome during the tour switches to Explore with the tour's
       events, so the picture does not jump; the click then edits A. */
    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        const a = step.A ?? (step.exp === 'dice' ? 'sum7' : 'atLeast2H');
        return { exp: step.exp, nCoins: step.nCoins, A: [...keysOf(spaceOf(step.exp, step.nCoins), eventsOf(step.exp)[a].test)], aName: a, B: step.B ?? (step.exp === 'dice' ? 'firstEven' : 'firstH'), view: step.view === 'none' ? 'A' : step.view };
    };
    const update = (fn) => setEx(fn(base()));
    const onOutcome = (key) => update(s => ({ ...s, A: s.A.includes(key) ? s.A.filter(k => k !== key) : [...s.A, key], aName: null }));
    const setExp = (e) => update(s => {
        const evs = eventsOf(e);
        const first = Object.keys(evs)[0];
        return { ...s, exp: e, A: [...keysOf(spaceOf(e, s.nCoins), evs[first].test)], aName: first, B: Object.keys(evs)[1], view: 'A' };
    });
    const setA = (name) => update(s => ({ ...s, A: [...keysOf(spaceOf(s.exp, s.nCoins), eventsOf(s.exp)[name].test)], aName: name }));
    const setN = (v) => update(s => ({ ...s, nCoins: v, A: s.aName ? [...keysOf(coinSpace(v), COIN_EVENTS[s.aName].test)] : [] }));

    const formula = (() => {
        const pA = texFrac(nA, total), pB = texFrac(nB, total), pAB = texFrac(nAB, total);
        if (view === 'B') return String.raw`P(B) = \frac{|B|}{|\Omega|} = ${pB} = ${frac(nB, total).replace(/(\d+)\/(\d+)/, String.raw`\tfrac{$1}{$2}`)}`;
        if (view === 'inter') return String.raw`P(A \cap B) = \frac{|A \cap B|}{|\Omega|} = ${pAB}`;
        if (view === 'union') return String.raw`P(A \cup B) = P(A) + P(B) - P(A \cap B) = ${pA} + ${pB} - ${pAB} = \mathbf{${texFrac(nU, total)}}`;
        if (view === 'compA') return String.raw`P(A^c) = 1 - P(A) = 1 - ${pA} = \mathbf{${texFrac(total - nA, total)}}`;
        if (view === 'A') return String.raw`P(A) = \frac{|A|}{|\Omega|} = \mathbf{${pA}}`;
        return String.raw`|\Omega| = ${exp === 'dice' ? String.raw`6 \times 6` : Array(nCoins).fill(2).join(String.raw` \times `)} = ${total}, \quad P(\text{each outcome}) = ${texFrac(1, total)}`;
    })();

    const explanation = mode === 'guided' ? step.explanation
        : `A (${aLabel}) has ${nA} outcomes and B (${bLabel}) has ${nB}; they share ${nAB}. ${{
            A: `P(A) = ${fracText(nA, total)}.`,
            B: `P(B) = ${fracText(nB, total)}.`,
            union: `A ∪ B has ${nA} + ${nB} − ${nAB} = ${nU} outcomes: P = ${fracText(nU, total)}.`,
            inter: `A ∩ B has ${nAB}: P = ${fracText(nAB, total)}.${nAB === 0 ? ' A and B cannot happen together — they are mutually exclusive.' : ''}`,
            compA: `Aᶜ has ${total} − ${nA} = ${total - nA}: P = ${fracText(total - nA, total)}.`,
        }[view]} Click outcomes to add them to A or take them out.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/probability-and-statistics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Probability and Statistics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Sample Spaces and Events</h1>
                    <p className="text-rose-100 max-w-3xl">
                        List every outcome and probability becomes counting. An event is just a set of outcomes — and union, intersection and complement are the set operations you already know.
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
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Experiment">
                                {[['dice', 'Two dice', Dices], ['coins', 'Coins', Coins]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={exp === key} onClick={() => setExp(key)}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${exp === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {exp === 'dice'
                            ? <DiceGrid A={A} B={B} result={result} onCell={onOutcome} />
                            : <CoinTree n={nCoins} A={A} B={B} result={result} onLeaf={onOutcome} />}

                        <div className="flex flex-wrap gap-3 text-xs mt-3">
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-sm" style={{ background: A_COLOR }} />A: {aLabel}</span>
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-sm" style={{ background: B_COLOR }} />B: {bLabel}</span>
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-sm" style={{ background: AB_COLOR }} />both</span>
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-sm border-2 border-white" />the event shown</span>
                        </div>

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
                                <span className="text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-rose-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-3 mt-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500 w-14">Event A</span>
                                    {Object.entries(ev).map(([key, e]) => (
                                        <button key={key} onClick={() => setA(key)} aria-pressed={ex.aName === key}
                                            className={`text-xs px-2.5 py-1 rounded-lg border ${ex.aName === key ? 'border-rose-500 text-rose-200 bg-rose-500/10' : 'border-slate-700 text-slate-400 hover:border-rose-500'}`}>{e.label}</button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500 w-14">Event B</span>
                                    {Object.entries(ev).map(([key, e]) => (
                                        <button key={key} onClick={() => setEx(s => ({ ...s, B: key }))} aria-pressed={ex.B === key}
                                            className={`text-xs px-2.5 py-1 rounded-lg border ${ex.B === key ? 'border-sky-500 text-sky-200 bg-sky-500/10' : 'border-slate-700 text-slate-400 hover:border-sky-500'}`}>{e.label}</button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500 w-14">Show</span>
                                    {VIEWS.map(([key, label]) => (
                                        <button key={key} onClick={() => setEx(s => ({ ...s, view: key }))} aria-pressed={ex.view === key}
                                            className={`text-xs px-2.5 py-1 rounded-lg border font-mono ${ex.view === key ? 'border-white/60 text-white bg-white/10' : 'border-slate-700 text-slate-400 hover:border-slate-400'}`}>{label}</button>
                                    ))}
                                </div>
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
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                            {[['|A|', nA], ['|B|', nB], ['|A ∩ B|', nAB], ['|A ∪ B|', nU], ['|Aᶜ|', total - nA]].map(([label, v]) => (
                                <div key={label} className="rounded-lg bg-slate-800/60 border border-slate-700/50 px-2 py-2">
                                    <div className="text-[11px] text-slate-500 font-mono">{label}</div>
                                    <div className="text-sm font-bold text-slate-100 tabular-nums">{hiding ? '?' : `${v} / ${total}`}</div>
                                </div>
                            ))}
                        </div>
                        {exp === 'coins' && (
                            <ParamSlider label="Number of coins" accent="rose" min={1} max={4} value={nCoins} onChange={setN} />
                        )}
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The vocabulary</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-rose-300 font-semibold">Sample space Ω</span> — every possible outcome, listed once.</li>
                            <li><span className="text-sky-300 font-semibold">Event</span> — a set of outcomes; it happens if the outcome is in it.</li>
                            <li><span className="text-violet-300 font-semibold">A ∩ B, A ∪ B</span> — both, and at least one: P(A ∪ B) = P(A) + P(B) − P(A ∩ B).</li>
                            <li><span className="text-amber-300 font-semibold">Complement Aᶜ</span> — everything else: P(Aᶜ) = 1 − P(A).</li>
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
