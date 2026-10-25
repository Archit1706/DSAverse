"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, List, Rows3, Minimize2,
} from 'lucide-react';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Every ordered pick (a k-permutation) belongs to exactly one set (its sorted
   letters), and every set is hit by exactly k! picks — one per ordering.
   So #sets = #picks / k!. */
const LETTERS = 'ABCDEF';
const factorial = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const nPr = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r *= n - i; return r; };
const nCr = (n, k) => (k < 0 || k > n ? 0 : nPr(n, k) / factorial(k));

/** All k-permutations of 0..n−1 in dictionary order. */
const orderedPicks = (n, k) => {
    const out = [];
    const cur = [];
    const used = new Array(n).fill(false);
    const rec = () => {
        if (cur.length === k) { out.push([...cur]); return; }
        for (let i = 0; i < n; i++) {
            if (used[i]) continue;
            used[i] = true; cur.push(i); rec(); cur.pop(); used[i] = false;
        }
    };
    rec();
    return out;
};
/** All k-subsets of 0..n−1 in dictionary order. */
const subsets = (n, k) => {
    const out = [];
    const cur = [];
    const rec = (start) => {
        if (cur.length === k) { out.push([...cur]); return; }
        for (let i = start; i < n; i++) { cur.push(i); rec(i + 1); cur.pop(); }
    };
    rec(0);
    return out;
};
const keyOf = (arr) => arr.join(',');

/**
 * Every ordered pick with where it sits: `index` in the dictionary list,
 * `set` (which subset it belongs to) and `order` (which of that set's k!
 * orderings it is, in dictionary order).
 */
const layoutPicks = (n, k) => {
    const sets = subsets(n, k);
    const setIndex = new Map(sets.map((s, i) => [keyOf(s), i]));
    const seen = new Map();
    const picks = orderedPicks(n, k).map((p, index) => {
        const set = setIndex.get(keyOf([...p].sort((a, b) => a - b)));
        const order = seen.get(set) ?? 0;
        seen.set(set, order + 1);
        return { p, index, set, order };
    });
    return { sets, picks };
};
const lettersOf = (arr) => arr.map(i => LETTERS[i]).join('') || '∅';
const setText = (arr) => `{${arr.map(i => LETTERS[i]).join(', ')}}`;

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (n, k, phase, explanation, extra = {}) =>
        steps.push({ n, k, phase, explanation, spot: null, question: null, ask: null, ...extra });

    push(5, 3, 'list', 'Choose a team of 3 from 5 people, A to E. A team has no order: ABC and CBA are the same team. Start from what the last page counts — ordered picks. There are P(5, 3) = 5 × 4 × 3 = 60 of them, listed here in dictionary order.',
        { question: 'orderings', spot: [0, 1, 2], ask: ask++ });
    push(5, 3, 'spot', 'The team {A, B, C} appears 6 times, scattered through the list: ABC, ACB, BAC, BCA, CAB and CBA. Three people can be ordered 3 × 2 × 1 = 3! = 6 ways, and the ordered list contains every one of them.',
        { spot: [0, 1, 2] });
    push(5, 3, 'color', 'Colour every pick by its team. Each colour appears exactly 6 times — every team of 3 is counted once per ordering, and every team has the same 3! orderings.',
        { question: 'rows', ask: ask++ });
    push(5, 3, 'grouped', 'Slide each pick into its team\'s row. Every row holds the 6 orderings of one team, and the 60 picks fill 60 / 6 = 10 rows exactly.');
    push(5, 3, 'collapsed', 'Now forget the order inside each row: its 6 picks are the same team, so each row collapses to one set. C(5, 3) = P(5, 3) / 3! = 60 / 6 = 10 teams.');
    push(5, 3, 'formula', 'Write it with factorials: P(5, 3) = 5! / 2!, and dividing by 3! gives C(5, 3) = 5! / (3! · 2!) = 120 / (6 · 2) = 10. The k! removes the order inside the team; the (n − k)! removes the order of the people left out.');
    push(6, 2, 'list', 'Pairs this time: 2 from 6 people, A to F. There are P(6, 2) = 6 × 5 = 30 ordered picks.',
        { question: 'orderings', spot: [0, 1], ask: ask++ });
    push(6, 2, 'spot', 'AB and BA — the pair {A, B} appears twice, because two people can be ordered 2! = 2 ways.',
        { spot: [0, 1] });
    push(6, 2, 'color', 'Coloured by pair, every colour appears twice.',
        { question: 'rows', ask: ask++ });
    push(6, 2, 'grouped', 'Each row holds one pair\'s 2 orderings, and the 30 picks fill 30 / 2 = 15 rows.');
    push(6, 2, 'collapsed', 'C(6, 2) = 30 / 2! = 15 pairs — the number of handshakes when 6 people all shake hands once.');
    push(4, 3, 'list', 'Choose 3 of 4: P(4, 3) = 4 × 3 × 2 = 24 ordered picks.',
        { question: 'sets', ask: ask++ });
    push(4, 3, 'collapsed', '24 / 3! = 4 teams. There is a shortcut: choosing the 3 who are in is the same as choosing the 1 who is out, so C(4, 3) = C(4, 1) = 4. In general C(n, k) = C(n, n − k).');
    push(6, 3, 'list', 'One more: 3 from 6. There are P(6, 3) = 6 × 5 × 4 = 120 ordered picks.',
        { question: 'sets', ask: ask++ });
    push(6, 3, 'grouped', 'Grouped into rows of 3! = 6 orderings, the 120 picks fill 20 rows.');
    push(6, 3, 'collapsed', 'C(6, 3) = 120 / 6 = 20 teams. The middle of the row, k = n / 2, always has the most sets — 20 is the largest number in row 6 of Pascal\'s triangle.');
    push(6, 3, 'closing', 'Combinations count sets; permutations count ordered lists. Every set of k is k! ordered lists, so C(n, k) = P(n, k) / k! = n! / (k! (n − k)!). Switch to Explore to pick your own set and change views.');
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Three questions: how many orderings does one set have (k!), how many rows
   will the grouped picks fill (nPr / k!), and how many sets in all. Wrong
   answers: k instead of k!, nPr / k, forgetting to divide, nᵏ. */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    const { n, k } = step;
    const P = nPr(n, k), f = factorial(k), C = nCr(n, k);
    let correct, candidates, question, because;
    if (step.question === 'orderings') {
        correct = f;
        candidates = [k, k * k, 1, n, f + 1];
        question = `How many of the ${P} ordered picks use exactly the letters ${setText(step.spot)}?`;
        because = `Those ${k} letters can be put in order ${Array.from({ length: k }, (_, i) => k - i).join(' × ')} = ${k}! = ${f} ways, and the list has every ordering.`;
    } else if (step.question === 'rows') {
        correct = C;
        candidates = [P / k, P, P - f, n * k, P / 2];
        question = `Every team appears ${f} times. Grouped one team per row, how many rows will the ${P} picks fill?`;
        because = `${P} picks in rows of ${f}: ${P} / ${f} = ${C} rows, one per set.`;
    } else {
        correct = C;
        candidates = [P, n, n ** k, P / k];
        question = `How many different sets of ${k} can be chosen from ${n}?`;
        because = `${P} ordered picks, and each set is ${k}! = ${f} of them: ${P} / ${f} = ${C}.`;
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
        question: 'A pizza place offers 8 toppings. How many different 3-topping pizzas can you order? (The order the toppings go on does not matter.)',
        options: ['336', '56', '24', '512'],
        correct: 1,
        explanation: 'P(8, 3) = 336 ordered picks, and each pizza is 3! = 6 of them: 336 / 6 = 56 = C(8, 3).',
    },
    {
        question: 'Why is C(n, k) equal to P(n, k) divided by k!?',
        options: [
            'Each set of k items appears k! times among the ordered picks — once per ordering',
            'Because a set of k items has k! subsets',
            'Dividing by k! removes picks that repeat an item',
            'Because order matters in a combination',
        ],
        correct: 0,
        explanation: 'Ordered picks overcount sets by exactly the number of ways to order k items, which is k!. Every set is overcounted by the same amount, so dividing fixes the count.',
    },
    {
        question: 'Which of these equals C(10, 7)?',
        options: ['P(10, 3)', 'C(7, 3)', 'C(10, 3)', '10! / 7!'],
        correct: 2,
        explanation: 'Choosing the 7 who are in is the same as choosing the 3 who are out, so C(10, 7) = C(10, 3) = 120. In general C(n, k) = C(n, n − k).',
    },
];

const codeExample = `from itertools import combinations, permutations
from math import comb, perm, factorial

people = 'ABCDE'
teams = list(combinations(people, 3))   # unordered, no repeats
print(len(teams))                        # 10
print(comb(5, 3))                        # 10
print(perm(5, 3) // factorial(3))        # 60 // 6 = 10

# Group the 60 ordered picks by the set of letters they use
groups = {}
for pick in permutations(people, 3):
    groups.setdefault(frozenset(pick), []).append(''.join(pick))
print(len(groups))                          # 10 rows
print(groups[frozenset('ABC')])             # the 3! = 6 orderings of one team`;

/* ── picture ───────────────────────────────────────────── */

const W = 640;
const setHue = (i, total) => Math.round((i / Math.max(total, 1)) * 300);

/**
 * The ordered picks as chips. Their positions come from the phase: dictionary
 * order (list, spot, color), one row per set (grouped), or stacked onto the
 * first chip of each row (collapsed). Chips are keyed by their letters, so a
 * change of phase slides them with a CSS transition instead of re-mounting.
 */
function PickGrid({ n, k, phase, spot, chosen, onPool, onChip }) {
    const { sets, picks } = useMemo(() => layoutPicks(n, k), [n, k]);
    const R = sets.length, K = factorial(k);
    const top = 64;
    const cellW = Math.min(100, (W - 140) / K);
    const cellH = Math.min(32, 440 / R);
    const chipW = Math.min(cellW - 6, 64);
    const chipH = Math.min(cellH - 4, 24);
    const H = top + R * cellH + 16;
    const x0 = 16;
    const spotKey = spot ? keyOf([...spot].sort((a, b) => a - b)) : null;
    const chosenKey = chosen ? keyOf([...chosen].sort((a, b) => a - b)) : null;
    const grouped = phase === 'grouped' || phase === 'collapsed' || phase === 'formula' || phase === 'closing';
    const collapsed = phase === 'collapsed' || phase === 'formula' || phase === 'closing';
    const colored = phase !== 'list' && phase !== 'spot';
    const poolSp = Math.min(46, 300 / n);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${picks.length} ordered picks of ${k} from ${n}, ${R} sets`} className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            <text x={16} y={22} fontSize={12} fill="#94a3b8">{onPool ? 'Your set (click letters):' : `Choose ${k} of ${n}`}</text>
            {Array.from({ length: n }, (_, i) => {
                const inSet = chosen ? chosen.includes(i) : spot ? spot.includes(i) : false;
                const x = 190 + i * poolSp;
                return (
                    <g key={`p${i}`} transform={`translate(${x}, 30)`} onClick={onPool ? () => onPool(i) : undefined}
                        role={onPool ? 'button' : undefined} aria-label={onPool ? `${inSet ? 'Remove' : 'Add'} ${LETTERS[i]}` : undefined}
                        tabIndex={onPool ? 0 : undefined}
                        onKeyDown={onPool ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPool(i); } } : undefined}
                        style={{ cursor: onPool ? 'pointer' : 'default' }} className="focus:outline-none">
                        <circle r={15} fill={inSet ? '#d946ef' : '#0f172a'} stroke={inSet ? '#f5d0fe' : '#475569'} strokeWidth={2} />
                        <text y={5} textAnchor="middle" fontSize={13} fontWeight={700} fill={inSet ? '#ffffff' : '#94a3b8'}>{LETTERS[i]}</text>
                    </g>
                );
            })}
            <text x={W - 16} y={22} fontSize={12} fill="#f0abfc" textAnchor="end" fontWeight={700}>
                {collapsed ? `${R} sets` : grouped ? `${R} rows × ${K}` : `${picks.length} ordered picks`}
            </text>

            {picks.map(({ p, index, set, order }) => {
                const row = grouped ? set : Math.floor(index / K);
                const col = grouped ? (collapsed ? 0 : order) : index % K;
                const x = x0 + col * cellW, y = top + row * cellH;
                const key = keyOf([...p].sort((a, b) => a - b));
                const hit = (spotKey !== null && key === spotKey) || (chosenKey !== null && key === chosenKey);
                const hidden = collapsed && order > 0;
                const fill = colored ? `hsl(${setHue(set, R)} 70% 62%)` : '#1e293b';
                return (
                    <g key={keyOf(p)} onClick={onChip ? () => onChip(set) : undefined}
                        style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform .7s ease, opacity .5s ease', opacity: hidden ? 0 : 1, cursor: onChip ? 'pointer' : 'default' }}>
                        <rect width={collapsed && order === 0 ? Math.max(chipW, 14 + 7.5 * setText(p).length) : chipW} height={chipH} rx={5} fill={fill} fillOpacity={colored ? 0.85 : 1}
                            stroke={hit ? '#ffffff' : colored ? fill : '#334155'} strokeWidth={hit ? 2.5 : 1} />
                        <text x={(collapsed && order === 0 ? Math.max(chipW, 14 + 7.5 * setText(p).length) : chipW) / 2} y={chipH / 2 + 4} textAnchor="middle" fontSize={Math.min(12, chipH * 0.6)} fontWeight={700}
                            fontFamily="ui-monospace, monospace" fill={colored ? '#020617' : hit ? '#ffffff' : '#cbd5e1'}>
                            {collapsed && order === 0 ? setText(p) : lettersOf(p)}
                        </text>
                    </g>
                );
            })}
            {grouped && sets.map((s, i) => (
                <text key={`r${i}`} x={W - 16} y={top + i * cellH + chipH / 2 + 4} textAnchor="end" fontSize={Math.min(11, cellH * 0.55)}
                    fill={`hsl(${setHue(i, R)} 70% 70%)`} style={{ transition: 'opacity .5s ease' }}>
                    {collapsed ? `${K} → 1` : `${K} orderings`}
                </text>
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

const VIEWS = [['list', 'Ordered list', List], ['grouped', 'Grouped by set', Rows3], ['collapsed', 'Sets only', Minimize2]];

export default function CombinationsPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [ex, setEx] = useState({ n: 5, k: 3, view: 'grouped', chosen: [0, 1, 2] });
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

    const n = mode === 'guided' ? step.n : ex.n;
    const k = mode === 'guided' ? step.k : ex.k;
    const P = nPr(n, k), f = factorial(k), C = nCr(n, k);

    /* Clicking the picture during the tour switches to Explore with the
       tour's n and k, so nothing on screen jumps. */
    const base = () => {
        if (mode !== 'guided') return ex;
        const view = ['list', 'spot', 'color'].includes(step.phase) ? 'list' : step.phase === 'grouped' ? 'grouped' : 'collapsed';
        const next = { n: step.n, k: Math.min(step.k, 3), view, chosen: (step.spot ?? subsets(step.n, step.k)[0]).slice(0, 3) };
        setMode('explore'); setIsPlaying(false);
        return next;
    };
    const update = (fn) => setEx(fn(base()));
    const onPool = (i) => update(s => {
        const has = s.chosen.includes(i);
        if (!has && s.chosen.length >= 3) return s;           // the grid shows k up to 3
        const chosen = has ? s.chosen.filter(x => x !== i) : [...s.chosen, i].sort((a, b) => a - b);
        return { ...s, chosen, k: chosen.length };
    });
    const onChip = (setIdx) => update(s => ({ ...s, chosen: subsets(s.n, s.k)[setIdx] ?? s.chosen }));
    const setN = (v) => update(s => {
        const k2 = Math.min(s.k, v, 3);
        const chosen = s.chosen.filter(x => x < v).slice(0, k2);
        const fill = Array.from({ length: v }, (_, i) => i).filter(i => !chosen.includes(i));
        while (chosen.length < k2) chosen.push(fill.shift());
        return { ...s, n: v, k: k2, chosen: chosen.sort((a, b) => a - b) };
    });
    const setK = (v) => update(s => {
        let chosen = s.chosen.slice(0, v);
        const fill = Array.from({ length: s.n }, (_, i) => i).filter(i => !chosen.includes(i));
        while (chosen.length < v) chosen.push(fill.shift());
        chosen = chosen.sort((a, b) => a - b);
        return { ...s, k: v, chosen };
    });

    const formula = String.raw`C(${n}, ${k}) = \frac{P(${n}, ${k})}{${k}!} = \frac{${P}}{${f}} = \mathbf{${C}}`
        + String.raw`\qquad \frac{${n}!}{${k}!\,(${n} - ${k})!} = \frac{${factorial(n)}}{${f} \cdot ${factorial(n - k)}} = ${C}`;

    const explanation = mode === 'guided'
        ? step.explanation
        : `Your set ${setText(ex.chosen)} is one of the ${C} sets of ${k}. Among the ${P} ordered picks it appears ${f} times — once per ordering of its ${k} letters — and so does every other set, which is why ${P} / ${f} = ${C}.${k === 0 ? ' Choosing nothing can happen exactly one way.' : ''}`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/combinatorics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Combinatorics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Combinations</h1>
                    <p className="text-fuchsia-100 max-w-3xl">
                        A combination is a set: order does not matter. Count the ordered picks, notice that every set shows up k! times, and divide — that is all nCr is.
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
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Click letters to build a set, or click any chip'}
                            </span>
                        </div>

                        <PickGrid n={n} k={k} phase={mode === 'guided' ? step.phase : ex.view}
                            spot={mode === 'guided' && step.phase === 'spot' ? step.spot : null}
                            chosen={mode === 'explore' ? ex.chosen : null} onPool={onPool} onChip={onChip} />

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
                                {VIEWS.map(([key, label, Icon]) => (
                                    <button key={key} onClick={() => setEx(s => ({ ...s, view: key }))} aria-pressed={ex.view === key}
                                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${ex.view === key ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-500/10' : 'border-slate-700 text-slate-400 hover:border-fuchsia-500'}`}>
                                        <Icon className="h-3.5 w-3.5" />{label}
                                    </button>
                                ))}
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
                            {mode === 'guided' && predict.hideExplanation
                                ? <p className="text-sm text-slate-500">The formula is hidden until you answer.</p>
                                : <Tex block>{formula}</Tex>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ParamSlider label="n (people)" accent="fuchsia" min={2} max={6} value={n} onChange={setN} />
                            <ParamSlider label="k (chosen)" accent="fuchsia" min={0} max={Math.min(n, 3)} value={Math.min(k, 3)} onChange={setK}
                                hint="The grid shows k up to 3: k = 4 would need 24 orderings per row" />
                        </div>
                        <p className="text-xs text-slate-500">
                            The top fraction is the picture: {P} chips in rows of {f}. The bottom one is the same number written with factorials — k! removes the order inside the set, (n − k)! the order of the ones left out.
                        </p>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Order or no order?</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-fuchsia-300 font-semibold">Permutation</span> — a podium, a password, a schedule: swapping two items gives something new.</li>
                            <li><span className="text-sky-300 font-semibold">Combination</span> — a team, a hand of cards, a pizza&apos;s toppings: only membership matters.</li>
                            <li><span className="text-amber-300 font-semibold">C(n, k) = C(n, n − k)</span> — choosing who is in chooses who is out.</li>
                            <li><span className="text-green-300 font-semibold">C(n, 0) = C(n, n) = 1</span> — one way to take nothing, one way to take everything.</li>
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
