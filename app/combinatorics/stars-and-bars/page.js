"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   A distribution of identical items into k bins is a list of k counts. Write
   the counts as stars, separated by k − 1 bars: (2, 1, 2) is **|*|**. Every
   distribution gives one row and every row of n stars and k − 1 bars gives
   one distribution, so counting distributions is choosing which k − 1 of the
   n + k − 1 positions hold bars. */
const binom = (n, k) => { if (k < 0 || n < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
/** Bar positions for a list of counts: bar j sits after the first j + 1 bins. */
const barsOf = (counts) => {
    const bars = [];
    let pos = 0;
    for (let j = 0; j < counts.length - 1; j++) { pos += counts[j]; bars.push(pos + j); }
    return bars;
};
/** Counts from bar positions in a row of `stars` stars and bars.length bars. */
const countsOf = (bars, stars) => {
    const m = stars + bars.length;
    const counts = [];
    let prev = -1;
    for (const b of [...bars, m]) { counts.push(b - prev - 1); prev = b; }
    return counts;
};
const rowText = (counts) => counts.map(c => '*'.repeat(c)).join('|');
const countText = (counts) => `(${counts.join(', ')})`;
/** Every way to place `bars` bars among `m` positions, in dictionary order. */
const barSets = (m, bars) => {
    const out = [];
    const cur = [];
    const rec = (start) => {
        if (cur.length === bars) { out.push([...cur]); return; }
        for (let i = start; i < m; i++) { cur.push(i); rec(i + 1); cur.pop(); }
    };
    rec(0);
    return out;
};
/** Dictionary position of a bar set among all of barSets(m, bars.length). */
const rankBars = (bars, m) => {
    let r = 0, prev = -1;
    const t = bars.length;
    bars.forEach((b, j) => {
        for (let v = prev + 1; v < b; v++) r += binom(m - v - 1, t - j - 1);
        prev = b;
    });
    return r;
};
/** The number of distributions: free items into k bins, after any compulsory one each. */
const countDistributions = (n, k, atLeastOne) => (atLeastOne ? binom(n - 1, k - 1) : binom(n + k - 1, k - 1));

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (n, k, counts, explanation, extra = {}) => steps.push({
        n, k, counts, atLeastOne: false, hideCounts: false, list: false, question: null, ask: null, explanation, ...extra,
    });

    push(5, 3, [2, 1, 2], 'Five identical cookies, three kids. Only how many each kid gets matters — the cookies cannot be told apart. Kid 1 gets 2, kid 2 gets 1, kid 3 gets 2: draw it as 5 stars split by 2 bars, **|*|**.');
    push(5, 3, [2, 1, 2], 'Next distribution: kid 1 gets nothing, kid 2 gets 4, kid 3 gets 1. Which row of stars and bars is it?',
        { question: 'encode', target: [0, 4, 1], ask: ask++ });
    push(5, 3, [0, 4, 1], '|****|* — a bar at the very start means kid 1 got nothing. Empty bins are allowed: two bars can sit side by side, or at either end.');
    push(5, 3, [1, 0, 4], 'Read it the other way: this row is *||****. What does each kid get?',
        { question: 'decode', hideCounts: true, ask: ask++ });
    push(5, 3, [1, 0, 4], '(1, 0, 4): one star before the first bar, none between the bars, four after. Every row decodes to exactly one distribution, and every distribution encodes to exactly one row.');
    push(5, 3, [2, 1, 2], 'So count rows instead. A row has 5 + 2 = 7 positions, and it is fixed once you say which 2 of them hold bars.',
        { question: 'count', ask: ask++ });
    push(5, 3, [2, 1, 2], 'C(7, 2) = 21 rows, so 21 ways to share the cookies — all of them are listed below. In general n identical items into k bins: C(n + k − 1, k − 1).', { list: true });
    push(5, 3, [2, 1, 2], 'New rule: every kid must get at least one cookie, so rows with a bar at either end, or two bars side by side, no longer count.', { question: 'countAtLeastOne', ask: ask++ });
    push(5, 3, [2, 1, 2], 'Hand each kid one cookie first; that leaves 2 to share with no rule at all. 2 stars and 2 bars: C(4, 2) = 6. In general C(n − 1, k − 1) — the bars go into the n − 1 gaps between the stars, at most one per gap.',
        { atLeastOne: true, list: true });
    push(6, 4, [1, 3, 0, 2], 'Six identical balls into four boxes, empty boxes allowed: 6 stars and 3 bars.', { question: 'count', ask: ask++ });
    push(6, 4, [1, 3, 0, 2], '6 + 3 = 9 positions, 3 of them bars: C(9, 3) = 84 distributions.', { list: true });
    push(4, 3, [2, 0, 2], 'The same count answers equations: how many solutions does x₁ + x₂ + x₃ = 4 have in whole numbers ≥ 0? Each solution is a way to share 4 units among 3 variables.',
        { question: 'count', ask: ask++ });
    push(4, 3, [2, 0, 2], 'C(4 + 2, 2) = C(6, 2) = 15 solutions; (2, 0, 2) is one of them. Asking for xᵢ ≥ 1 instead would give C(3, 2) = 3.', { list: true });
    push(4, 3, [2, 0, 2], 'Identical items, distinct bins: count the rows of stars and bars. Switch to Explore and drag the bars, use + and − under each bin, or click any row in the list.', { list: true });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Encode a distribution as a row, decode a row as a distribution, and count.
   Wrong rows and tuples are other orderings of the same counts, so the
   options all have the right number of stars. Wrong counts are the off-by-one
   slips: C(n + k − 1, k), C(n + k − 2, k − 1), C(n, k − 1), and kⁿ, which
   would treat the items as different. */
const permutationsOf = (arr) => {
    if (arr.length <= 1) return [arr];
    const out = [];
    arr.forEach((x, i) => { for (const rest of permutationsOf([...arr.slice(0, i), ...arr.slice(i + 1)])) out.push([x, ...rest]); });
    return out;
};
const predictFor = (step) => {
    if (!step || !step.question) return null;
    const { n, k } = step;
    let correct, candidates, question, because;
    if (step.question === 'encode' || step.question === 'decode') {
        const target = step.question === 'encode' ? step.target : step.counts;
        const label = step.question === 'encode' ? rowText : countText;
        correct = label(target);
        candidates = permutationsOf(target).map(label);
        question = step.question === 'encode'
            ? `Which row encodes kid 1: ${target[0]}, kid 2: ${target[1]}, kid 3: ${target[2]}?`
            : `The row is ${rowText(target)}. How many cookies does each kid get?`;
        because = step.question === 'encode'
            ? `Write each kid's count as stars and put a bar between kids: ${target.map(c => (c ? '*'.repeat(c) : '(none)')).join(', ')} gives ${correct}.`
            : `Count the stars before the first bar, between the bars, and after the last: ${correct}.`;
    } else if (step.question === 'countAtLeastOne') {
        correct = countDistributions(n, k, true);
        candidates = [countDistributions(n, k, false), binom(n - 1, k), binom(n, k - 1), binom(n - 2, k - 1)];
        question = `${n} cookies, ${k} kids, at least one each. How many distributions?`;
        because = `Give each kid one first, leaving ${n - k} to share freely: C(${n - k} + ${k - 1}, ${k - 1}) = C(${n - 1}, ${k - 1}) = ${correct}.`;
    } else {
        correct = countDistributions(n, k, false);
        candidates = [binom(n + k - 1, k), binom(n + k - 2, k - 1), binom(n, k - 1), k ** n];
        question = `${n} identical items into ${k} bins (empty bins allowed). How many distributions?`;
        because = `${n} stars and ${k - 1} bars fill ${n + k - 1} positions; choose the ${k - 1} bar positions: C(${n + k - 1}, ${k - 1}) = ${correct}.`;
    }
    const seen = new Set([String(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        const key = String(c);
        if (key === '0' || seen.has(key)) continue;
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
        question: 'In how many ways can 10 identical candies be shared among 4 children, if a child may get none?',
        options: ['210', '286', '84', '1,048,576'],
        correct: 1,
        explanation: '10 stars and 3 bars make 13 positions; choose the 3 bar positions: C(13, 3) = 286. 4¹⁰ = 1,048,576 would treat the candies as different.',
    },
    {
        question: 'How many solutions does x₁ + x₂ + x₃ = 7 have in positive integers (each xᵢ ≥ 1)?',
        options: ['36', '21', '15', '35'],
        correct: 2,
        explanation: 'Give each variable 1 first, leaving 4 to share with no restriction: C(4 + 2, 2) = 15. Equivalently, place 2 bars in the 6 gaps between 7 stars: C(6, 2) = 15.',
    },
    {
        question: 'Why does a row of n stars and k − 1 bars count distributions of identical items into k bins?',
        options: [
            'Because the stars are arranged in order',
            'Each row decodes to exactly one distribution and each distribution to exactly one row, so the two counts are equal',
            'Because bars are identical too, so we divide by k!',
            'It only works when no bin is empty',
        ],
        correct: 1,
        explanation: 'The stars between consecutive bars are a bin\'s count. Matching the two sets one-to-one means counting either one counts the other — and rows are easy to count: choose the bar positions.',
    },
];

const codeExample = `from itertools import combinations
from math import comb

def distributions(n, k):
    """Every way to share n identical items among k bins."""
    m = n + k - 1                       # positions in the row
    for bars in combinations(range(m), k - 1):
        counts, prev = [], -1
        for b in (*bars, m):
            counts.append(b - prev - 1) # stars between consecutive bars
            prev = b
        yield tuple(counts)

ways = list(distributions(5, 3))
print(len(ways), comb(5 + 3 - 1, 3 - 1))    # 21 21
print(ways[:4])     # (0, 0, 5), (0, 1, 4), (0, 2, 3), (0, 3, 2)

# At least one each: hand out k first, then share the rest
print(comb(5 - 1, 3 - 1))                   # 6`;

/* ── picture ───────────────────────────────────────────── */

const W = 640;
const BIN_COLORS = ['#e879f9', '#38bdf8', '#fbbf24', '#4ade80', '#f87171', '#a78bfa'];

function StarShape({ x, y, r, fill, opacity = 1 }) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        pts.push(`${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`);
    }
    return <polygon points={pts.join(' ')} fill={fill} opacity={opacity} />;
}

/**
 * The row of stars and bars, and the bins it encodes. Bars can be dragged
 * (pointer or arrow keys) to any position between their neighbours; the
 * + and − under each bin add or remove a star there.
 */
function StarsAndBarsRow({ k, free, atLeastOne, hideCounts, onBars, onBin }) {
    const svgRef = useRef(null);
    const drag = useRef(null);
    const stars = free.reduce((a, b) => a + b, 0);
    const bars = barsOf(free);
    const m = stars + k - 1;
    const sp = Math.min(56, (W - 60) / Math.max(m, 1));
    const x0 = W / 2 - ((m - 1) * sp) / 2;
    const xOf = (pos) => x0 + pos * sp;
    const rowY = 70;
    const barSet = new Set(bars);

    const toPos = (clientX) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const pt = svg.createSVGPoint();
        pt.x = clientX; pt.y = 0;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        return Math.round((p.x - x0) / sp);
    };
    const moveBar = (j, pos) => {
        const lo = j === 0 ? 0 : bars[j - 1] + 1;
        const hi = j === bars.length - 1 ? m - 1 : bars[j + 1] - 1;
        const clamped = Math.min(Math.max(pos, lo), hi);
        if (clamped === bars[j]) return;
        const next = [...bars];
        next[j] = clamped;
        onBars(next);
    };

    // stars are numbered left to right; which bin does each belong to?
    let starIndex = 0;
    const cells = [];
    for (let pos = 0; pos < m; pos++) {
        const x = xOf(pos);
        if (barSet.has(pos)) {
            const j = bars.indexOf(pos);
            cells.push(
                <g key={`bar${j}`} transform={`translate(${x}, ${rowY})`}
                    onPointerDown={onBars ? (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = j; } : undefined}
                    onPointerMove={onBars ? (e) => { if (drag.current === j) { const p = toPos(e.clientX); if (p !== null) moveBar(j, p); } } : undefined}
                    onPointerUp={onBars ? (e) => { drag.current = null; e.currentTarget.releasePointerCapture?.(e.pointerId); } : undefined}
                    onKeyDown={onBars ? (e) => {
                        if (e.key === 'ArrowLeft') { e.preventDefault(); moveBar(j, pos - 1); }
                        if (e.key === 'ArrowRight') { e.preventDefault(); moveBar(j, pos + 1); }
                    } : undefined}
                    tabIndex={onBars ? 0 : undefined} role={onBars ? 'slider' : undefined}
                    aria-label={onBars ? `Bar ${j + 1}, at position ${pos + 1} of ${m}` : undefined}
                    aria-valuenow={onBars ? pos + 1 : undefined}
                    style={{ cursor: onBars ? 'ew-resize' : 'default', touchAction: 'none' }} className="focus:outline-none">
                    <rect x={-16} y={-34} width={32} height={68} fill="transparent" />
                    <rect x={-3.5} y={-28} width={7} height={56} rx={3} fill="#f8fafc" />
                </g>
            );
        } else {
            const bin = countsOf(bars, stars).findIndex((_, b) => {
                const start = b === 0 ? 0 : bars[b - 1] + 1;
                const end = b === bars.length ? m : bars[b];
                return pos >= start && pos < end;
            });
            cells.push(<StarShape key={`s${starIndex}`} x={x} y={rowY} r={Math.min(15, sp * 0.4)} fill={BIN_COLORS[bin % BIN_COLORS.length]} />);
            starIndex++;
        }
    }

    // bins: the stretch of the row between consecutive bars
    const counts = countsOf(bars, stars);
    const binW = (W - 40) / k;
    const bins = counts.map((c, b) => {
        const start = b === 0 ? 0 : bars[b - 1] + 1;
        const end = b === bars.length ? m : bars[b];
        const xa = c > 0 ? xOf(start) - sp * 0.35 : xOf(start) - sp * 0.5;
        const xb = c > 0 ? xOf(end - 1) + sp * 0.35 : xOf(start) - sp * 0.5;
        const shown = c + (atLeastOne ? 1 : 0);
        const bx = 20 + b * binW + binW / 2;
        return (
            <g key={`bin${b}`}>
                <path d={`M ${xa} ${rowY + 40} L ${xa} ${rowY + 48} L ${xb} ${rowY + 48} L ${xb} ${rowY + 40}`} fill="none" stroke={BIN_COLORS[b % BIN_COLORS.length]} strokeWidth={2} />
                <line x1={(xa + xb) / 2} y1={rowY + 48} x2={bx} y2={rowY + 88} stroke={BIN_COLORS[b % BIN_COLORS.length]} strokeWidth={1} opacity={0.5} />
                <rect x={bx - binW / 2 + 6} y={rowY + 88} width={binW - 12} height={62} rx={10} fill="#0f172a" stroke={BIN_COLORS[b % BIN_COLORS.length]} strokeWidth={1.5} />
                <text x={bx} y={rowY + 108} textAnchor="middle" fontSize={11} fill="#94a3b8">bin {b + 1}</text>
                <text x={bx} y={rowY + 136} textAnchor="middle" fontSize={22} fontWeight={800} fill={BIN_COLORS[b % BIN_COLORS.length]}>
                    {hideCounts ? '?' : shown}
                </text>
                {atLeastOne && !hideCounts && <text x={bx + 22} y={rowY + 136} fontSize={10} fill="#64748b">(1 + {c})</text>}
                {onBin && (
                    <>
                        <g transform={`translate(${bx - 18}, ${rowY + 168})`} onClick={() => onBin(b, -1)} role="button" tabIndex={0}
                            aria-label={`One fewer in bin ${b + 1}`} style={{ cursor: 'pointer' }} className="focus:outline-none"
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBin(b, -1); } }}>
                            <rect x={-12} y={-11} width={24} height={22} rx={5} fill="#1e293b" stroke="#475569" />
                            <line x1={-5} y1={0} x2={5} y2={0} stroke="#e2e8f0" strokeWidth={2} />
                        </g>
                        <g transform={`translate(${bx + 18}, ${rowY + 168})`} onClick={() => onBin(b, 1)} role="button" tabIndex={0}
                            aria-label={`One more in bin ${b + 1}`} style={{ cursor: 'pointer' }} className="focus:outline-none"
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBin(b, 1); } }}>
                            <rect x={-12} y={-11} width={24} height={22} rx={5} fill="#1e293b" stroke="#475569" />
                            <line x1={-5} y1={0} x2={5} y2={0} stroke="#e2e8f0" strokeWidth={2} />
                            <line x1={0} y1={-5} x2={0} y2={5} stroke="#e2e8f0" strokeWidth={2} />
                        </g>
                    </>
                )}
            </g>
        );
    });
    const H = rowY + (onBin ? 196 : 166);

    return (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${stars} stars and ${k - 1} bars`} className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            <text x={16} y={22} fontSize={12} fill="#94a3b8">
                {stars} {atLeastOne ? 'free ' : ''}stars + {k - 1} bars = {m} positions{onBars ? ' · drag a bar' : ''}
            </text>
            {atLeastOne && <text x={W - 16} y={22} fontSize={12} fill="#fbbf24" textAnchor="end">each bin already holds 1</text>}
            {m === 0 && <text x={W / 2} y={rowY + 4} textAnchor="middle" fontSize={12} fill="#64748b">an empty row: one way, everything is 0</text>}
            {cells}
            {bins}
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

const MAX_N = 10, MAX_K = 6;

export default function StarsAndBarsPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [ex, setEx] = useState({ k: 3, free: [2, 1, 2], atLeastOne: false });   // free = stars in the row, per bin
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

    /* In guided steps with "at least one each", the row shows only the free
       stars: each bin's count minus the one it was handed first. */
    const guidedFree = (s) => (s.atLeastOne ? s.counts.map(c => Math.max(c - 1, 0)) : s.counts);
    const shown = mode === 'guided'
        ? { k: step.k, free: guidedFree(step), atLeastOne: step.atLeastOne }
        : ex;
    const { k, free, atLeastOne } = shown;
    const freeStars = free.reduce((a, b) => a + b, 0);
    const n = freeStars + (atLeastOne ? k : 0);
    const counts = free.map(c => c + (atLeastOne ? 1 : 0));
    const total = countDistributions(n, k, atLeastOne);
    const m = freeStars + k - 1;
    const bars = barsOf(free);
    const rank = rankBars(bars, m);

    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        return { k: step.k, free: guidedFree(step), atLeastOne: step.atLeastOne };
    };
    const update = (fn) => setEx(fn(base()));
    const onBars = (next) => update(s => ({ ...s, free: countsOf(next, s.free.reduce((a, b) => a + b, 0)) }));
    const onBin = (b, d) => update(s => {
        const total = s.free.reduce((a, c) => a + c, 0) + (s.atLeastOne ? s.k : 0);
        if (d > 0 && total >= MAX_N) return s;
        if (d < 0 && s.free[b] === 0) return s;
        return { ...s, free: s.free.map((c, i) => (i === b ? c + d : c)) };
    });
    const setN = (v) => update(s => {
        const need = s.atLeastOne ? s.k : 0;
        const target = Math.max(v - need, 0);
        const f = [...s.free];
        let cur = f.reduce((a, c) => a + c, 0);
        while (cur < target) { f[f.length - 1]++; cur++; }
        for (let i = f.length - 1; cur > target && i >= 0; i--) { while (f[i] > 0 && cur > target) { f[i]--; cur--; } }
        return { ...s, free: f };
    });
    const setK = (v) => update(s => {
        let f = [...s.free];
        if (v < f.length) { const extra = f.slice(v).reduce((a, c) => a + c, 0) + (s.atLeastOne ? f.length - v : 0); f = f.slice(0, v); f[v - 1] += extra; }
        while (f.length < v) f.push(0);
        // with one compulsory item per bin, more bins may push past the item limit
        if (s.atLeastOne) { let over = f.reduce((a, c) => a + c, 0) + v - MAX_N; for (let i = f.length - 1; over > 0 && i >= 0; i--) { while (f[i] > 0 && over > 0) { f[i]--; over--; } } }
        return { ...s, k: v, free: f };
    });
    const toggleAtLeastOne = () => update(s => (s.atLeastOne
        ? { ...s, atLeastOne: false, free: s.free.map(c => c + 1) }
        : { ...s, atLeastOne: true, free: s.free.map(c => Math.max(c - 1, 0)) }));
    const setRank = (r) => update(s => {
        const st = s.free.reduce((a, c) => a + c, 0);
        const all = barSets(st + s.k - 1, s.k - 1);
        return { ...s, free: countsOf(all[Math.min(Math.max(r, 0), all.length - 1)], st) };
    });

    const list = useMemo(() => {
        if (total > 84) return null;
        return barSets(m, k - 1).map(bs => countsOf(bs, freeStars));
    }, [total, m, k, freeStars]);
    const showList = mode === 'explore' || step.list;

    const formula = atLeastOne
        ? String.raw`\binom{n - 1}{k - 1} = \binom{${n} - 1}{${k} - 1} = \binom{${n - 1}}{${k - 1}} = \mathbf{${total}}`
        : String.raw`\binom{n + k - 1}{k - 1} = \binom{${n} + ${k} - 1}{${k} - 1} = \binom{${n + k - 1}}{${k - 1}} = \mathbf{${total}}`;
    const equation = String.raw`${counts.map((c, i) => String.raw`\textcolor{${BIN_COLORS[i % BIN_COLORS.length]}}{${c}}`).join(' + ')} = ${n}`
        + String.raw`\qquad x_1 + \dots + x_{${k}} = ${n},\; x_i \ge ${atLeastOne ? 1 : 0}`;

    const explanation = mode === 'guided' ? step.explanation
        : `The row ${rowText(free) || '(empty)'} gives ${countText(counts)}${atLeastOne ? ' once each bin\'s compulsory item is added back' : ''}. It is row ${rank + 1} of ${total}: ${freeStars} stars and ${k - 1} bars fill ${m} positions, and choosing where the ${k - 1} bars go — C(${m}, ${k - 1}) = ${total} ways — fixes the distribution.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/combinatorics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Combinatorics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Stars and Bars</h1>
                    <p className="text-fuchsia-100 max-w-3xl">
                        Identical items into distinct bins. Line the items up as stars, split them with k − 1 bars, and every distribution becomes a row — so the count is a single binomial coefficient.
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
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag a bar, or use + and − under a bin'}
                            </span>
                        </div>

                        <StarsAndBarsRow k={k} free={free} atLeastOne={atLeastOne}
                            hideCounts={mode === 'guided' && step.hideCounts && predict.hideExplanation}
                            onBars={onBars} onBin={onBin} />

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
                                <button onClick={toggleAtLeastOne} aria-pressed={atLeastOne}
                                    className={`text-xs px-3 py-1.5 rounded-lg border ${atLeastOne ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-500/10' : 'border-slate-700 text-slate-400 hover:border-fuchsia-500'}`}>
                                    At least one in every bin
                                </button>
                                <button onClick={() => setRank(0)}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500">First row</button>
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
                        {!(mode === 'guided' && predict.hideExplanation) && (
                            <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                <Tex block>{formula}</Tex>
                                <Tex block>{equation}</Tex>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ParamSlider label="n (items)" accent="fuchsia" min={atLeastOne ? k : 0} max={MAX_N} value={n} onChange={setN} />
                            <ParamSlider label="k (bins)" accent="fuchsia" min={1} max={MAX_K} value={k} onChange={setK} />
                            <div className="sm:col-span-2">
                                <ParamSlider label="Row number (dictionary order of bar positions)" accent="fuchsia" min={1} max={Math.max(total, 1)} value={rank + 1}
                                    format={(v) => (mode === 'guided' && predict.hideExplanation ? `${v} of ?` : `${v} of ${total}`)} onChange={(v) => setRank(v - 1)} />
                            </div>
                        </div>
                        {showList && list && !(mode === 'guided' && predict.hideExplanation) && (
                            <div>
                                <p className="text-xs text-slate-500 mb-2">All {total} distributions{atLeastOne ? ' (counts include the compulsory one)' : ''}:</p>
                                <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                                    {list.map((c, r) => (
                                        <button key={c.join('-')} onClick={() => setRank(r)}
                                            className={`font-mono text-[11px] px-1.5 py-0.5 rounded border ${r === rank ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white' : 'border-slate-800 text-slate-400 hover:border-slate-600'}`}>
                                            {countText(c.map(x => x + (atLeastOne ? 1 : 0)))}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">When to use it</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-fuchsia-300 font-semibold">Identical items, distinct bins</span> — cookies to kids, votes to candidates, units to variables.</li>
                            <li><span className="text-sky-300 font-semibold">Empty bins allowed</span> — C(n + k − 1, k − 1).</li>
                            <li><span className="text-amber-300 font-semibold">At least one each</span> — C(n − 1, k − 1): bars go in the gaps between stars.</li>
                            <li><span className="text-green-300 font-semibold">Distinct items</span> — not this: each item picks a bin, kⁿ ways.</li>
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
