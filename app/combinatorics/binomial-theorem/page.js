"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, ListTree, Square, Box,
} from 'lucide-react';
import Plane2D, { Polygon, Point, Label, Segment } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import Tex, { texNum } from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Multiplying out (a + b)ⁿ means picking a or b from each of the n factors.
   A pick is a string like "aba"; it contributes a^(n−k) b^k where k is its
   number of b's, and exactly C(n, k) strings have k b's. */
const binom = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
/** All 2ⁿ picks as arrays of 0 (took a) and 1 (took b), in binary order. */
const allPicks = (n) => Array.from({ length: 2 ** n }, (_, m) => Array.from({ length: n }, (_, i) => (m >> (n - 1 - i)) & 1));
const bCount = (pick) => pick.reduce((s, x) => s + x, 0);
const pickText = (pick) => pick.map(x => (x ? 'b' : 'a')).join('');
/** The first pick in binary order with k b's: a…ab…b. */
const firstWithK = (n, k) => Array.from({ length: n }, (_, i) => (i >= n - k ? 1 : 0));
const termValue = (n, k, a, b) => binom(n, k) * a ** (n - k) * b ** k;
const expansionValue = (n, a, b) => Array.from({ length: n + 1 }, (_, k) => termValue(n, k, a, b)).reduce((s, x) => s + x, 0);
/** a²b as plain text: exponents as superscripts, 1s dropped. */
const sup = (k) => String(k).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');
const monoText = (n, k) => `${n - k > 0 ? `a${n - k > 1 ? sup(n - k) : ''}` : ''}${k > 0 ? `b${k > 1 ? sup(k) : ''}` : ''}` || '1';

/** The 8 blocks of the (a + b)³ cube: which side (a or b) each spans on x, y, z. */
const cubeBlocks = (a, b) => {
    const out = [];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let l = 0; l < 2; l++) {
        const span = (t) => (t ? b : a), start = (t) => (t ? a : 0);
        out.push({ ijk: [i, j, l], k: i + j + l, origin: [start(i), start(j), start(l)], size: [span(i), span(j), span(l)] });
    }
    return out;
};

const K_COLORS = ['#fbbf24', '#4ade80', '#38bdf8', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf', '#f87171', '#e2e8f0'];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (view, n, explanation, extra = {}) => steps.push({
        view, n, a: 2, b: 1, grouped: false, explode: 0, highlightK: null, question: null, ask: null, explanation, ...extra,
    });
    push('square', 2, '(a + b)² is the area of a square with side a + b. Split each side into a piece of length a and a piece of length b, and the square falls into four rectangles.');
    push('square', 2, 'One a × a square, one b × b square, and two a × b rectangles: (a + b)² = a² + 2ab + b². The 2 is there because there are two ways to get ab — across the top or up the side.', { highlightK: 1 });
    push('strings', 2, 'The same thing without pictures: (a + b)(a + b) means picking a or b from each bracket and multiplying. The picks are aa, ab, ba and bb — 2 × 2 = 4 of them. ab and ba give the same term, so ab has coefficient 2.');
    push('strings', 3, 'Three brackets now: (a + b)(a + b)(a + b). Each pick is a string of three letters, one per bracket, so there are 2³ = 8 picks.',
        { question: 'coef', k: 1, ask: ask++ });
    push('strings', 3, 'Group the picks by how many b\'s they contain. Exactly one b: aab, aba and baa — 3 of them. Choosing which of the 3 brackets gives the b is choosing 1 of 3, so there are C(3, 1) = 3. The groups are 1, 3, 3, 1: (a + b)³ = a³ + 3a²b + 3ab² + b³.',
        { grouped: true, highlightK: 1 });
    push('cube', 3, 'In three dimensions it is a volume. A cube with side a + b, cut at a along each axis, splits into 8 blocks — one for each pick, since every block chooses a or b along x, y and z.');
    push('cube', 3, 'Pull the blocks apart: one a × a × a cube, three a × a × b slabs, three a × b × b bars and one b × b × b cube. 1 + 3 + 3 + 1 = 8 blocks, and the counts are row 3 of Pascal\'s triangle.', { explode: 1 });
    push('strings', 4, 'Four brackets, 2⁴ = 16 picks.', { question: 'coef', k: 2, ask: ask++ });
    push('strings', 4, 'Two b\'s out of four brackets: choose which 2 brackets give the b — C(4, 2) = 6 ways. Grouped: 1, 4, 6, 4, 1. So (a + b)⁴ = a⁴ + 4a³b + 6a²b² + 4ab³ + b⁴.',
        { grouped: true, highlightK: 2 });
    push('strings', 5, 'Five brackets, 32 picks.', { question: 'coef', k: 2, ask: ask++ });
    push('strings', 5, 'C(5, 2) = 10 picks have exactly two b\'s, so the a³b² term has coefficient 10. In general the coefficient of aⁿ⁻ᵏbᵏ in (a + b)ⁿ is C(n, k): the number of ways to choose which k of the n brackets supply a b.',
        { grouped: true, highlightK: 2 });
    push('strings', 6, 'Set a = b = 1. Every pick is then worth 1, so (1 + 1)ⁿ simply counts the picks.', { question: 'sum', a: 1, b: 1, ask: ask++ });
    push('strings', 6, '(1 + 1)⁶ = 2⁶ = 64 = 1 + 6 + 15 + 20 + 15 + 6 + 1. The theorem gives the row-sum identity of Pascal\'s triangle for free.',
        { grouped: true, a: 1, b: 1 });
    push('strings', 6, '(a + b)ⁿ = ∑ C(n, k) aⁿ⁻ᵏ bᵏ, k from 0 to n. Each term counts the picks with k b\'s. Switch to Explore: click the brackets to build a pick, slide n, a and b, or open the square and the cube.',
        { grouped: true });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   How many picks contain exactly k b's (C(n, k) against n·k, k + 1, 2ⁿ and
   near misses), and what (1 + 1)ⁿ adds up to (2ⁿ against n², 2ⁿ⁻¹ and the
   middle coefficient). */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    const { n } = step;
    let correct, candidates, question, because;
    if (step.question === 'coef') {
        const k = step.k;
        correct = binom(n, k);
        candidates = [n * k, n - k, k + 1, 2 ** n, correct + 1, n];
        question = `Of the ${2 ** n} picks, how many contain exactly ${k} b${k === 1 ? '' : '\'s'}? That is the coefficient of ${monoText(n, k)}.`;
        because = `Choose which ${k} of the ${n} brackets give a b: C(${n}, ${k}) = ${correct}.`;
    } else {
        correct = 2 ** n;
        candidates = [n * n, 2 ** (n - 1), binom(n, Math.floor(n / 2)), n + 1];
        question = `With a = b = 1, what do all the coefficients of (a + b)${sup(n)} add up to?`;
        because = `Every pick is worth 1 × 1 × … = 1, so the sum counts the picks: 2${sup(n)} = ${correct}.`;
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
        question: 'What is the coefficient of a²b³ in (a + b)⁵?',
        options: ['5', '6', '15', '10'],
        correct: 3,
        explanation: 'Choose which 3 of the 5 brackets supply a b: C(5, 3) = 10. The other 2 brackets supply a.',
    },
    {
        question: 'Why does (a + b)³ have 8 terms before like terms are collected?',
        options: [
            'Because 3 × 3 = 9, minus one',
            'Each of the 3 brackets contributes either a or b, giving 2 × 2 × 2 = 8 picks',
            'Because the cube has 8 corners',
            'Because 1 + 3 + 3 + 1 = 8 is a coincidence',
        ],
        correct: 1,
        explanation: 'Multiplying out takes one term from every bracket. Two choices per bracket and three brackets give 2³ = 8 picks — the 8 blocks of the cube — which group into 1 + 3 + 3 + 1.',
    },
    {
        question: 'Expand (x + 1)⁴. What is the coefficient of x²?',
        options: ['4', '6', '2', '1'],
        correct: 1,
        explanation: 'With a = x and b = 1 the x² term is C(4, 2) x² · 1² = 6x². Setting b = 1 leaves the binomial coefficients as the coefficients of the polynomial.',
    },
];

const codeExample = `from itertools import product
from collections import Counter
from math import comb

n = 4
picks = list(product('ab', repeat=n))   # one letter from each bracket
print(len(picks))                        # 2 ** 4 = 16

by_b = Counter(p.count('b') for p in picks)
print([by_b[k] for k in range(n + 1)])   # [1, 4, 6, 4, 1]
print([comb(n, k) for k in range(n + 1)])

# Check the expansion numerically
a, b = 2, 1
print(sum(comb(n, k) * a ** (n - k) * b ** k for k in range(n + 1)))   # 81
print((a + b) ** n)                                                     # 81`;

/* ── pictures ──────────────────────────────────────────── */

const W = 640;

/**
 * The n brackets on top and every pick below. Ungrouped, the picks sit in
 * binary order; grouped, each slides into the column of its number of b's.
 * Clicking a bracket flips the current pick's letter there; clicking a chip
 * makes it the current pick.
 */
function PickColumns({ n, grouped, highlightK, pick, onBracket, onChip }) {
    const picks = useMemo(() => allPicks(n), [n]);
    const cols = n + 1;
    const colW = (W - 24) / cols;
    const maxCol = binom(n, Math.floor(n / 2));
    const rowsUngrouped = Math.ceil(picks.length / cols);
    const top = 96;
    const chipH = Math.min(22, 320 / Math.max(grouped ? maxCol : rowsUngrouped, 1));
    const chipW = Math.min(colW - 8, 16 + n * 9);
    const H = top + 320 + 36;
    const withText = chipH >= 12;
    const pickKey = pick ? pickText(pick) : null;
    const seen = new Array(cols).fill(0);
    const brW = Math.min(76, (W - 40) / n);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`The ${picks.length} picks of (a + b) to the ${n}`} className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            {Array.from({ length: n }, (_, i) => {
                const x = W / 2 + (i - (n - 1) / 2) * brW;
                const letter = pick ? (pick[i] ? 'b' : 'a') : null;
                return (
                    <g key={`br${i}`} transform={`translate(${x}, 34)`} onClick={onBracket ? () => onBracket(i) : undefined}
                        role={onBracket ? 'button' : undefined} tabIndex={onBracket ? 0 : undefined}
                        aria-label={onBracket ? `Bracket ${i + 1}: take ${letter === 'a' ? 'b' : 'a'} instead` : undefined}
                        onKeyDown={onBracket ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBracket(i); } } : undefined}
                        style={{ cursor: onBracket ? 'pointer' : 'default' }} className="focus:outline-none">
                        <rect x={-brW / 2 + 4} y={-18} width={brW - 8} height={36} rx={8} fill="#0f172a" stroke="#475569" />
                        <text x={-brW / 2 + 12} y={6} fontSize={Math.min(16, brW / 4.6)} fill="#64748b">(</text>
                        <text x={-brW / 4 + 2} y={6} textAnchor="middle" fontSize={Math.min(16, brW / 4.6)} fontWeight={700} fill={letter === 'a' ? K_COLORS[0] : '#94a3b8'}>a</text>
                        <text x={0} y={6} textAnchor="middle" fontSize={Math.min(14, brW / 5)} fill="#64748b">+</text>
                        <text x={brW / 4 - 2} y={6} textAnchor="middle" fontSize={Math.min(16, brW / 4.6)} fontWeight={700} fill={letter === 'b' ? '#f0abfc' : '#94a3b8'}>b</text>
                        <text x={brW / 2 - 14} y={6} fontSize={Math.min(16, brW / 4.6)} fill="#64748b">)</text>
                        {letter && <rect x={(letter === 'a' ? -brW / 4 + 2 : brW / 4 - 2) - 9} y={-12} width={18} height={24} rx={5} fill="none" stroke="#ffffff" strokeWidth={1.5} />}
                    </g>
                );
            })}
            <text x={W / 2} y={76} textAnchor="middle" fontSize={11} fill="#64748b">
                {onBracket ? 'click a bracket to switch its letter' : `${picks.length} picks: one letter from each bracket`}
            </text>
            {grouped && Array.from({ length: cols }, (_, k) => (
                <g key={`hd${k}`}>
                    <text x={12 + k * colW + colW / 2} y={top - 2} textAnchor="middle" fontSize={11} fontWeight={700}
                        fill={highlightK === k ? '#ffffff' : K_COLORS[k % K_COLORS.length]}>
                        {binom(n, k)}{n <= 6 ? ` ${monoText(n, k)}` : ''}
                    </text>
                </g>
            ))}
            {picks.map((p, idx) => {
                const k = bCount(p);
                let col, row;
                if (grouped) { col = k; row = seen[k]++; } else { col = idx % cols; row = Math.floor(idx / cols); }
                const x = 12 + col * colW + (colW - chipW) / 2;
                const y = top + 8 + row * chipH;
                const text = pickText(p);
                const hot = text === pickKey || (highlightK !== null && k === highlightK);
                const color = K_COLORS[k % K_COLORS.length];
                return (
                    <g key={text} onClick={onChip ? () => onChip(p) : undefined}
                        style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform .7s ease', cursor: onChip ? 'pointer' : 'default' }}>
                        <rect width={chipW} height={Math.max(chipH - 3, 2)} rx={Math.min(5, chipH / 3)} fill={color}
                            fillOpacity={hot ? 0.95 : grouped ? 0.55 : 0.35} stroke={text === pickKey ? '#ffffff' : 'none'} strokeWidth={2} />
                        {withText && (
                            <text x={chipW / 2} y={chipH / 2 + 2} textAnchor="middle" fontSize={Math.min(12, chipH * 0.6)} fontWeight={700}
                                fontFamily="ui-monospace, monospace" fill="#020617">{text}</text>
                        )}
                    </g>
                );
            })}
            <text x={W - 12} y={H - 12} textAnchor="end" fontSize={12} fontWeight={700} fill="#f0abfc">
                {grouped ? Array.from({ length: cols }, (_, k) => binom(n, k)).join(' + ') + ` = ${2 ** n}` : `2${sup(n)} = ${2 ** n} picks`}
            </text>
        </svg>
    );
}

/** (a + b)² as a square split at a on both axes, with a and b as drag handles on the bottom edge. */
function AreaSquare({ a, b, highlightK, onA, onB }) {
    const s = a + b;
    const regions = [
        { k: 0, pts: [[0, 0], [a, 0], [a, a], [0, a]], label: 'a²', at: [a / 2, a / 2], v: a * a },
        { k: 1, pts: [[a, 0], [s, 0], [s, a], [a, a]], label: 'ab', at: [a + b / 2, a / 2], v: a * b },
        { k: 1, pts: [[0, a], [a, a], [a, s], [0, s]], label: 'ab', at: [a / 2, a + b / 2], v: a * b },
        { k: 2, pts: [[a, a], [s, a], [s, s], [a, s]], label: 'b²', at: [a + b / 2, a + b / 2], v: b * b },
    ];
    return (
        <Plane2D xRange={[-0.6, 5]} yRange={[-0.8, 5]} ariaLabel="A square of side a + b split into a², two ab rectangles and b²">
            {regions.map((r, i) => (
                <Polygon key={i} points={r.pts} fill={K_COLORS[r.k]} fillOpacity={highlightK === null || highlightK === r.k ? 0.45 : 0.12} />
            ))}
            {regions.map((r, i) => (
                <Label key={`l${i}`} at={r.at} anchor="middle" dy={0} color="#f8fafc" size={14} weight={700}>{r.label}</Label>
            ))}
            {regions.map((r, i) => (
                <Label key={`v${i}`} at={r.at} anchor="middle" dy={16} color="#cbd5e1" size={11}>{`= ${texNum(r.v, 3)}`}</Label>
            ))}
            <Segment from={[0, -0.4]} to={[a, -0.4]} color={K_COLORS[0]} width={3} />
            <Segment from={[a, -0.4]} to={[s, -0.4]} color="#f0abfc" width={3} />
            <Label at={[a / 2, -0.4]} anchor="middle" dy={-6} color={K_COLORS[0]} size={12} weight={700}>{`a = ${texNum(a, 2)}`}</Label>
            <Label at={[a + b / 2, -0.4]} anchor="middle" dy={-6} color="#f0abfc" size={12} weight={700}>{`b = ${texNum(b, 2)}`}</Label>
            <Point at={[a, -0.4]} color={K_COLORS[0]} r={6} onDrag={onA} snap={0.25} constrain={([x]) => [x, -0.4]} ariaLabel={`Drag to change a, now ${a}`} />
            <Point at={[s, -0.4]} color="#f0abfc" r={6} onDrag={onB} snap={0.25} constrain={([x]) => [x, -0.4]} ariaLabel={`Drag to change b, now ${b}`} />
        </Plane2D>
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

const texMono = (n, k) => {
    const pa = n - k, pb = k;
    const A = pa === 0 ? '' : pa === 1 ? 'a' : `a^{${pa}}`;
    const B = pb === 0 ? '' : pb === 1 ? 'b' : `b^{${pb}}`;
    return A + B || '1';
};
/** The expansion, coloured by number of b's, then the same terms with the numbers in. */
const texExpansion = (n, a, b) => {
    const ks = Array.from({ length: n + 1 }, (_, k) => k);
    const sym = ks.map(k => String.raw`\textcolor{${K_COLORS[k % K_COLORS.length]}}{${binom(n, k) === 1 ? '' : binom(n, k)}${texMono(n, k)}}`).join(' + ');
    const nums = ks.map(k => texNum(termValue(n, k, a, b), 3)).join(' + ');
    return String.raw`(a + b)^{${n}} = ${sym}` + String.raw` \\[4pt] (${texNum(a, 2)} + ${texNum(b, 2)})^{${n}} = ${nums} = \mathbf{${texNum(expansionValue(n, a, b), 3)}}`;
};

const VIEWS = [['strings', 'Picks', ListTree], ['square', 'Area (n = 2)', Square], ['cube', 'Cube (n = 3)', Box]];

export default function BinomialTheoremPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [ex, setEx] = useState({ view: 'strings', n: 3, a: 2, b: 1, pick: [0, 1, 0], grouped: true, explode: 0.6 });
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

    const shown = mode === 'guided' ? step : ex;
    const { view, n, a, b } = shown;
    const k = mode === 'guided' ? step.highlightK : bCount(ex.pick);

    /* Touching the picture during the tour switches to Explore with the
       tour's view and numbers, so nothing jumps. */
    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        const kk = Math.min(step.highlightK ?? step.k ?? 1, step.n);
        return { view: step.view, n: step.n, a: step.a, b: step.b, pick: firstWithK(step.n, kk), grouped: step.grouped || step.view !== 'strings', explode: step.explode || 0.6 };
    };
    const update = (fn) => setEx(fn(base()));
    const setView = (v) => update(s => {
        const n2 = v === 'square' ? 2 : v === 'cube' ? 3 : s.n;
        const pick = s.pick.length === n2 ? s.pick : firstWithK(n2, Math.min(bCount(s.pick), n2));
        return { ...s, view: v, n: n2, pick, a: v === 'cube' ? Math.min(s.a, 2) : s.a, b: v === 'cube' ? Math.min(s.b, 2) : s.b };
    });
    const setN = (v) => update(s => ({ ...s, view: 'strings', n: v, pick: firstWithK(v, Math.min(bCount(s.pick), v)) }));
    const setK = (v) => update(s => ({ ...s, pick: firstWithK(s.n, v) }));
    const onBracket = (i) => update(s => ({ ...s, pick: s.pick.map((x, j) => (j === i ? 1 - x : x)) }));
    const onChip = (p) => update(s => ({ ...s, pick: [...p] }));
    const maxSide = view === 'cube' ? 2 : 3;
    // The square must fit its plane (a + b ≤ 4.5) and the cube its scene (sides ≤ 2).
    const setA = (v) => update(s => ({ ...s, a: Math.min(Math.max(v, 0.25), maxSide, s.view === 'square' ? 4.5 - s.b : Infinity) }));
    const setB = (v) => update(s => ({ ...s, b: Math.min(Math.max(v, 0.25), maxSide, s.view === 'square' ? 4.5 - s.a : Infinity) }));

    const explanation = mode === 'guided' ? step.explanation : view === 'square'
        ? `The square has side ${texNum(a + b, 2)}, so its area is ${texNum((a + b) ** 2, 3)}. Its pieces: a² = ${texNum(a * a, 3)}, two ab rectangles of ${texNum(a * b, 3)} each, and b² = ${texNum(b * b, 3)}. Drag the two dots to change a and b.`
        : view === 'cube'
            ? `The cube has side ${texNum(a + b, 2)}: volume ${texNum((a + b) ** 3, 3)}. Its 8 blocks are the 8 picks from (a + b)(a + b)(a + b), one letter per axis: 1 a³, 3 a²b, 3 ab² and 1 b³.`
            : `The pick ${pickText(ex.pick)} takes ${k} b${k === 1 ? '' : '\'s'} and ${n - k} a${n - k === 1 ? '' : '\'s'}, giving ${monoText(n, k)}. C(${n}, ${k}) = ${binom(n, k)} picks give that same term — one for each way to choose which ${k} of the ${n} brackets supply the b.`;

    const blocks = useMemo(() => cubeBlocks(a, b), [a, b]);
    const explode = mode === 'guided' ? step.explode : ex.explode;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/combinatorics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Combinatorics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Binomial Theorem</h1>
                    <p className="text-fuchsia-100 max-w-3xl">
                        Multiplying out (a + b)ⁿ means picking a or b from every bracket. The coefficient of aⁿ⁻ᵏbᵏ counts the picks with k b&apos;s — and that is C(n, k).
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
                            <div className="inline-flex flex-wrap rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="View">
                                {VIEWS.map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={view === key} onClick={() => setView(key)}
                                        className={`flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5 rounded-md transition-colors ${view === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {view === 'strings' && (
                            <PickColumns n={n} grouped={mode === 'guided' ? step.grouped : ex.grouped} highlightK={mode === 'guided' ? step.highlightK : null}
                                pick={mode === 'explore' ? ex.pick : null} onBracket={onBracket} onChip={onChip} />
                        )}
                        {view === 'square' && (
                            <AreaSquare a={a} b={b} highlightK={mode === 'guided' ? step.highlightK : null}
                                onA={([x]) => update(s => ({ ...s, a: Math.min(Math.max(x, 0.25), 4.5 - s.b) }))}
                                onB={([x]) => update(s => ({ ...s, b: Math.min(Math.max(x - s.a, 0.25), 4.5 - s.a) }))} />
                        )}
                        {view === 'cube' && (
                            <Scene3D height={420} distance={10} axisSize={3} grid={false} ariaLabel="A cube of side a + b cut into 8 blocks"
                                fallback={<p className="text-sm text-slate-300 font-mono">({texNum(a, 2)} + {texNum(b, 2)})³ = {texNum((a + b) ** 3, 3)}</p>}>
                                {(P) => (
                                    <>
                                        {blocks.map((bl) => {
                                            // The camera looks at the origin, so the cube is centred on it.
                                            const centre = -(a + b + explode * 0.6) / 2;
                                            const off = bl.ijk.map(t => t * explode * 0.6);
                                            const o = bl.origin.map((v, i) => v + off[i] + centre);
                                            return (
                                                <P.Parallelepiped key={bl.ijk.join('')} origin={o}
                                                    a={[bl.size[0], 0, 0]} b={[0, bl.size[1], 0]} c={[0, 0, bl.size[2]]}
                                                    color={K_COLORS[bl.k]} opacity={0.42} />
                                            );
                                        })}
                                        <P.Label3D at={[a / 2 - (a + b + explode * 0.6) / 2, -(a + b + explode * 0.6) / 2 - 0.4, -(a + b + explode * 0.6) / 2]} color={K_COLORS[0]}>a</P.Label3D>
                                        <P.Label3D at={[a + b / 2 + explode * 0.3 - (a + b) / 2, -(a + b + explode * 0.6) / 2 - 0.4, -(a + b + explode * 0.6) / 2]} color="#f0abfc">b</P.Label3D>
                                    </>
                                )}
                            </Scene3D>
                        )}

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
                                <span className="text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-fuchsia-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                {view === 'strings' && (
                                    <button onClick={() => setEx(s => ({ ...s, grouped: !s.grouped }))} aria-pressed={ex.grouped}
                                        className={`text-xs px-3 py-1.5 rounded-lg border ${ex.grouped ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-500/10' : 'border-slate-700 text-slate-400 hover:border-fuchsia-500'}`}>
                                        Group by number of b&apos;s
                                    </button>
                                )}
                                {view === 'cube' && (
                                    <div className="w-56">
                                        <ParamSlider label="Pull the blocks apart" accent="fuchsia" min={0} max={1} step={0.05} value={ex.explode}
                                            format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setEx(s => ({ ...s, explode: v }))} />
                                    </div>
                                )}
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
                                ? <p className="text-sm text-slate-500">The expansion is hidden until you answer.</p>
                                : <Tex block>{texExpansion(n, a, b)}</Tex>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ParamSlider label="n (brackets)" accent="fuchsia" min={1} max={8} value={n} onChange={setN}
                                hint={view !== 'strings' ? 'Moving n switches back to the picks view' : undefined} />
                            <ParamSlider label="k (b's in the pick)" accent="fuchsia" min={0} max={n} value={k ?? 0} onChange={setK} />
                            <ParamSlider label="a" accent="fuchsia" min={0.25} max={maxSide} step={0.25} value={a} onChange={setA} />
                            <ParamSlider label="b" accent="fuchsia" min={0.25} max={maxSide} step={0.25} value={b} onChange={setB} />
                        </div>
                        <p className="text-xs text-slate-500">
                            Each term is coloured by its number of b&apos;s, as in the picture. The second line puts the numbers in: the terms always add up to (a + b)ⁿ.
                        </p>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Reading the expansion</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-fuchsia-300 font-semibold">2ⁿ picks</span> — one letter from each of n brackets.</li>
                            <li><span className="text-sky-300 font-semibold">C(n, k)</span> — the picks with k b&apos;s, all giving aⁿ⁻ᵏbᵏ.</li>
                            <li><span className="text-amber-300 font-semibold">Coefficients</span> — row n of Pascal&apos;s triangle.</li>
                            <li><span className="text-green-300 font-semibold">a = b = 1</span> — every pick is worth 1, so the coefficients sum to 2ⁿ.</li>
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
