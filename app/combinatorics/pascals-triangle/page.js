"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
   The triangle is built by addition alone — each entry is the sum of the two
   above it, with 1s down both edges. That it also equals C(n, k) is the
   content of Pascal's rule: choosing k from n either includes the last item
   (k − 1 more from n − 1) or does not (k from n − 1). */
const MAX_ROWS = 13;   // rows 0..12
const buildTriangle = (rows) => {
    const T = [];
    for (let n = 0; n < rows; n++) {
        const row = [1];
        for (let k = 1; k < n; k++) row.push(T[n - 1][k - 1] + T[n - 1][k]);
        if (n > 0) row.push(1);
        T.push(row);
    }
    return T;
};
const TRI = buildTriangle(MAX_ROWS + 1);   // one spare row for the hockey stick's blade
const C = (n, k) => (k < 0 || k > n ? 0 : TRI[n][k]);
const rowSum = (n) => TRI[n].reduce((a, b) => a + b, 0);
/** The hockey stick ending at (n, k): C(k, k) + C(k + 1, k) + … + C(n, k). */
const hockeyCells = (n, k) => Array.from({ length: n - k + 1 }, (_, i) => [k + i, k]);
const hockeySum = (n, k) => hockeyCells(n, k).reduce((s, [a, b]) => s + C(a, b), 0);
/** 3 → ³, for plain-text powers in explanations. */
const sup = (k) => String(k).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');

const OVERLAYS = [['recurrence', 'Sum of two above'], ['symmetry', 'Mirror image'], ['hockey', 'Hockey stick'], ['rowsum', 'Row sum'], ['odd', 'Odd entries']];
const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };

/** What the explore picture highlights for a selected cell under each overlay. */
const exploreMarks = (n, k, overlay) => {
    if (overlay === 'recurrence') return { highlight: [[n, k]], accent: n > 0 && k > 0 && k < n ? [[n - 1, k - 1], [n - 1, k]] : [], sumCell: null };
    if (overlay === 'symmetry') return { highlight: [[n, k], [n, n - k]], accent: [], sumCell: null };
    if (overlay === 'hockey') return { highlight: [], accent: hockeyCells(n, k), sumCell: [n + 1, k + 1] };
    if (overlay === 'rowsum') return { highlight: TRI[n].map((_, j) => [n, j]), accent: [], sumCell: null };
    return { highlight: [[n, k]], accent: [], sumCell: null };
};

/* ── guided tour ───────────────────────────────────────── */

const GUIDED_ROWS = 11;   // the tour lays out rows 0..10 from the start, so cells never move

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (rows, explanation, extra = {}) => steps.push({
        rows, explanation, partial: null, highlight: [], accent: [], sumCell: null, overlay: 'none', question: null, ask: null, ...extra,
    });

    push(1, 'Row 0 is a single 1. Every row after it starts and ends with 1, and every number in between is the sum of the two numbers just above it.');
    push(2, 'Row 1: 1 1. Nothing sits between the edges yet.');
    push(3, 'Row 2: 1, then 1 + 1 = 2, then 1.', { highlight: [[2, 1]], accent: [[1, 0], [1, 1]] });
    push(4, 'Row 3: 1, then 1 + 2 = 3, then 2 + 1 = 3, then 1.', { highlight: [[3, 1], [3, 2]] });
    push(4, 'Row 4 is half built: 1, 4, and then a gap. The two numbers above the gap are highlighted.',
        { partial: { n: 4, upto: 2 }, accent: [[3, 1], [3, 2]], question: 'cell', target: [4, 2], ask: ask++ });
    push(5, 'Row 4: 1 4 6 4 1. The 6 came from 3 + 3.', { highlight: [[4, 2]], accent: [[3, 1], [3, 2]] });
    push(5, 'Row 5 so far: 1, 5, and a gap below 4 and 6.',
        { partial: { n: 5, upto: 2 }, accent: [[4, 1], [4, 2]], question: 'cell', target: [5, 2], ask: ask++ });
    push(6, 'Row 5: 1 5 10 10 5 1.', { highlight: [[5, 2]], accent: [[4, 1], [4, 2]] });
    push(6, 'Row 6 so far: 1, 6, 15, and a gap in the middle, below the two 10s.',
        { partial: { n: 6, upto: 3 }, accent: [[5, 2], [5, 3]], question: 'cell', target: [6, 3], ask: ask++ });
    push(11, 'Row 6 is 1 6 15 20 15 6 1, the 20 from 10 + 10. The rest follows the same rule, down to row 10. Only addition was used — no factorials anywhere.', { highlight: [[6, 3]], accent: [[5, 2], [5, 3]] });
    push(11, 'Yet every entry is a binomial coefficient: the number in row n, position k — both counted from 0 — is C(n, k). Here C(6, 2) = 15: choose 2 of 6. Pascal\'s rule says why: a choice of 2 from 6 either includes the sixth person (1 more from the other 5: C(5, 1) = 5 ways) or does not (2 from the other 5: C(5, 2) = 10 ways), and 5 + 10 = 15.',
        { highlight: [[6, 2]], accent: [[5, 1], [5, 2]], overlay: 'locate', question: 'locate', target: [7, 3], ask: ask++ });
    push(11, 'C(7, 3) is row 7, position 3: 35. Off-by-one is the usual slip — the top row is row 0 and every row starts at position 0.',
        { highlight: [[7, 3]], overlay: 'locate' });
    push(11, 'Each row reads the same backwards: C(7, 2) = C(7, 5) = 21. Choosing the 2 who are in is the same as choosing the 5 who are out, so C(n, k) = C(n, n − k).',
        { highlight: [[7, 2], [7, 5]], overlay: 'symmetry' });
    push(11, 'A diagonal: 1, 3, 6, 10, 15, 21 — the entries C(2, 2) to C(7, 2). Add them up.',
        { accent: hockeyCells(7, 2), overlay: 'hockey', question: 'hockey', target: [7, 2], ask: ask++ });
    push(11, '1 + 3 + 6 + 10 + 15 + 21 = 56 = C(8, 3), the entry just below and to the right of the last one. The shape is a hockey stick, and the identity holds for every diagonal: C(k, k) + C(k + 1, k) + … + C(n, k) = C(n + 1, k + 1).',
        { accent: hockeyCells(7, 2), sumCell: [8, 3], overlay: 'hockey' });
    push(11, 'Row 5 adds up to 1 + 5 + 10 + 10 + 5 + 1 = 32 = 2⁵. Row n lists how many subsets of n items have size 0, 1, …, n, and n items have 2ⁿ subsets in all — each item is in or out.',
        { highlight: TRI[5].map((_, k) => [5, k]), overlay: 'rowsum', question: 'rowsum', target: [6, 0], ask: ask++ });
    push(11, 'Row 6: 1 + 6 + 15 + 20 + 15 + 6 + 1 = 64 = 2⁶. Each row doubles the last, because every entry is passed down to two children.',
        { highlight: TRI[6].map((_, k) => [6, k]), overlay: 'rowsum' });
    push(11, 'One rule — add the two above — and it carries C(n, k), its symmetry, the hockey stick and the powers of 2. Switch to Explore: click any cell and choose which identity to light up.');
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   What fills the gap (the sum of the two above, not their product or a
   neighbour); where C(7, 3) is (off-by-one neighbours); what a diagonal adds
   up to (the entries around the blade); and a row sum (2ⁿ against n², 2ⁿ − 1
   and the previous power). */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    let correct, candidates, question, because;
    const [n, k] = step.target;
    if (step.question === 'cell') {
        const a = C(n - 1, k - 1), b = C(n - 1, k);
        correct = a + b;
        candidates = [a * b, a, a + b + 1, a + b - 1];
        question = `What number goes in the gap in row ${n}?`;
        because = `Add the two numbers above it: ${a} + ${b} = ${correct}.`;
    } else if (step.question === 'locate') {
        correct = C(n, k);
        candidates = [C(n, k - 1), C(n - 1, k), C(n + 1, k), C(n, k + 1)];
        question = `Using the same rule, what is C(${n}, ${k})?`;
        because = `Count rows from 0 at the top and positions from 0 at the left: row ${n}, position ${k} holds ${correct}.`;
    } else if (step.question === 'hockey') {
        correct = hockeySum(n, k);
        candidates = [correct - 1, C(n + 1, k), C(n, k + 1), 2 * C(n, k)];
        question = 'What do the highlighted diagonal entries add up to?';
        because = `${hockeyCells(n, k).map(([a, b]) => C(a, b)).join(' + ')} = ${correct}, which is C(${n + 1}, ${k + 1}) — the entry just past the end of the diagonal, one step to the right.`;
    } else {
        correct = rowSum(n);
        candidates = [rowSum(n - 1), n * n, correct - 1, correct + n];
        question = `What does row ${n} add up to?`;
        because = `Every row doubles the one before: row ${n - 1} sums to ${rowSum(n - 1)}, so row ${n} sums to ${correct} = 2${sup(n)}.`;
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
        question: 'Row 8 of Pascal\'s triangle begins 1, 8, 28, 56, 70, … What is C(8, 3)?',
        options: ['28', '70', '56', '8'],
        correct: 2,
        explanation: 'Counting positions from 0, the entries are C(8, 0) = 1, C(8, 1) = 8, C(8, 2) = 28 and C(8, 3) = 56.',
    },
    {
        question: 'What do the entries of row 10 add up to?',
        options: ['1024', '100', '512', '110'],
        correct: 0,
        explanation: 'Row n counts the subsets of n items by size, and n items have 2ⁿ subsets, so row 10 sums to 2¹⁰ = 1024.',
    },
    {
        question: 'Why does every entry equal the sum of the two above it, as C(n, k) = C(n − 1, k − 1) + C(n − 1, k)?',
        options: [
            'Because factorials add',
            'Because the triangle is symmetric',
            'A choice of k from n either includes a particular item (k − 1 more from the other n − 1) or leaves it out (k from the other n − 1)',
            'It only holds for the first few rows',
        ],
        correct: 2,
        explanation: 'Split the choices by one item: those containing it and those that do not. The two groups do not overlap, so by the addition rule their counts add.',
    },
];

const codeExample = `from math import comb

def pascal(rows):
    triangle = [[1]]
    for n in range(1, rows):
        above = triangle[-1]
        triangle.append([1] + [above[k - 1] + above[k] for k in range(1, n)] + [1])
    return triangle

T = pascal(11)
print(T[6])                         # [1, 6, 15, 20, 15, 6, 1]
print(T[7][3] == comb(7, 3))        # True: row n, position k is C(n, k)

print(sum(T[6]) == 2 ** 6)          # row sums are powers of 2
print(sum(comb(i, 2) for i in range(2, 8)) == comb(8, 3))   # hockey stick: 56`;

/* ── picture ───────────────────────────────────────────── */

const W = 640;

/**
 * The triangle as circles. `layoutRows` fixes the geometry, so rows can be
 * revealed one at a time without anything moving. Primary highlights are
 * fuchsia, secondary (the two parents, a diagonal) sky, the hockey-stick
 * blade amber; `odd` colours the odd entries instead.
 */
function TriangleStage({ layoutRows, rows, partial, highlight, accent, sumCell, questionCell, mirror, odd, onCell }) {
    const dx = Math.min(50, (W - 40) / layoutRows);
    const dy = dx * 0.86;
    const r = Math.min(19, dx * 0.44);
    const top = r + 14;
    const H = top + (layoutRows - 1) * dy + r + 14;
    const pos = (n, k) => [W / 2 + (k - n / 2) * dx, top + n * dy];
    const has = (list, n, k) => list.some(([a, b]) => a === n && b === k);
    const cells = [];
    const shownRows = partial ? Math.max(rows, partial.n + 1) : rows;
    for (let n = 0; n < shownRows; n++) {
        for (let k = 0; k <= n; k++) {
            const isPartial = partial && n === partial.n && n >= rows;
            const isQuestion = questionCell && questionCell[0] === n && questionCell[1] === k;
            if (isPartial && k >= partial.upto && !isQuestion) continue;
            const [x, y] = pos(n, k);
            const v = C(n, k);
            let fill = '#0f172a', stroke = '#334155', text = '#cbd5e1';
            if (odd) { if (v % 2 === 1) { fill = '#a21caf'; stroke = '#e879f9'; text = '#ffffff'; } else { text = '#475569'; } }
            if (has(accent, n, k)) { fill = '#0369a1'; stroke = '#38bdf8'; text = '#ffffff'; }
            if (has(highlight, n, k)) { fill = '#c026d3'; stroke = '#f5d0fe'; text = '#ffffff'; }
            if (sumCell && sumCell[0] === n && sumCell[1] === k) { fill = '#b45309'; stroke = '#fcd34d'; text = '#ffffff'; }
            if (isQuestion) { fill = '#020617'; stroke = '#ffffff'; text = '#ffffff'; }
            const digits = String(v).length;
            cells.push(
                <g key={`${n}-${k}`} transform={`translate(${x}, ${y})`} onClick={onCell ? () => onCell(n, k) : undefined}
                    style={{ cursor: onCell ? 'pointer' : 'default' }}>
                    <circle r={r} fill={fill} stroke={stroke} strokeWidth={isQuestion ? 2.5 : 1.5} strokeDasharray={isQuestion ? '4 3' : undefined}
                        style={{ transition: 'fill .3s ease, stroke .3s ease' }} />
                    <text y={4} textAnchor="middle" fontSize={Math.min(13, (r * 1.7) / Math.max(digits, 2) + 2)} fontWeight={700} fill={text}>
                        {isQuestion ? '?' : v}
                    </text>
                </g>
            );
        }
    }
    const lines = [];
    // the two parents feeding a highlighted (or questioned) child
    const child = questionCell ?? (highlight.length === 1 && accent.length === 2 ? highlight[0] : null);
    if (child) {
        const [cn, ck] = child;
        for (const [pn, pk] of accent) {
            const [x1, y1] = pos(pn, pk), [x2, y2] = pos(cn, ck);
            lines.push(<line key={`l${pn}-${pk}`} x1={x1} y1={y1 + r} x2={x2} y2={y2 - r} stroke="#38bdf8" strokeWidth={2} />);
        }
    }
    if (mirror) {
        const [, y0] = pos(0, 0);
        lines.push(<line key="mirror" x1={W / 2} y1={y0 - r} x2={W / 2} y2={H - 4} stroke="#f0abfc" strokeWidth={1.5} strokeDasharray="5 5" opacity={0.6} />);
    }
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Pascal's triangle, ${shownRows} rows`} className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            {lines}
            {cells}
            {Array.from({ length: shownRows }, (_, n) => (
                <text key={`rn${n}`} x={8} y={pos(n, 0)[1] + 4} fontSize={10} fill="#475569">{n}</text>
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

const texFor = (n, k, overlay) => {
    if (overlay === 'recurrence') {
        if (k === 0 || k === n) return String.raw`\binom{${n}}{${k}} = 1 \quad \text{(an edge: one way to take none, or all)}`;
        return String.raw`\binom{${n}}{${k}} = \binom{${n - 1}}{${k - 1}} + \binom{${n - 1}}{${k}} = ${C(n - 1, k - 1)} + ${C(n - 1, k)} = \mathbf{${C(n, k)}}`;
    }
    if (overlay === 'symmetry') return String.raw`\binom{${n}}{${k}} = \binom{${n}}{${n} - ${k}} = \binom{${n}}{${n - k}} = \mathbf{${C(n, k)}}`;
    if (overlay === 'hockey') {
        const terms = hockeyCells(n, k).map(([a, b]) => C(a, b));
        return String.raw`\sum_{i=${k}}^{${n}} \binom{i}{${k}} = ${terms.join(' + ')} = \binom{${n + 1}}{${k + 1}} = \mathbf{${hockeySum(n, k)}}`;
    }
    if (overlay === 'rowsum') return String.raw`\sum_{j=0}^{${n}} \binom{${n}}{j} = ${TRI[n].join(' + ')} = 2^{${n}} = \mathbf{${rowSum(n)}}`;
    return String.raw`\binom{${n}}{${k}} = \frac{${n}!}{${k}!\,(${n} - ${k})!} = \frac{${fact(n)}}{${fact(k)} \cdot ${fact(n - k)}} = \mathbf{${C(n, k)}}`;
};

export default function PascalsTrianglePage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [ex, setEx] = useState({ rows: 11, n: 6, k: 2, overlay: 'recurrence' });
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

    /** Keeps the selection on the triangle and, for the hockey stick, room for the blade. */
    const normalise = (s) => {
        const rows = Math.min(Math.max(s.rows, 1), MAX_ROWS);
        let n = Math.min(Math.max(s.n, 0), rows - 1);
        if (s.overlay === 'hockey') n = Math.min(n, rows - 2 < 0 ? 0 : rows - 2);
        const k = Math.min(Math.max(s.k, 0), n);
        return { ...s, rows, n, k };
    };
    const base = () => {
        if (mode !== 'guided') return ex;
        const sel = step.highlight[0] ?? step.target ?? [Math.min(step.rows - 1, 6), Math.min(step.rows - 1, 2)];
        const overlay = step.overlay === 'symmetry' ? 'symmetry' : step.overlay === 'hockey' ? 'hockey' : step.overlay === 'rowsum' ? 'rowsum' : 'recurrence';
        const [n, k] = step.overlay === 'hockey' ? step.target : sel;
        setMode('explore'); setIsPlaying(false);
        return { rows: Math.min(MAX_ROWS, Math.max(step.rows, n + (overlay === 'hockey' ? 2 : 1))), n, k, overlay };
    };
    const update = (fn) => setEx(normalise(fn(base())));
    const onCell = (n, k) => update(s => ({ ...s, n, k }));

    const shown = mode === 'guided' ? null : normalise(ex);
    const marks = shown ? exploreMarks(shown.n, shown.k, shown.overlay) : null;

    const explanation = mode === 'guided' ? step.explanation : (() => {
        const { n, k, overlay } = shown;
        if (overlay === 'recurrence') return k === 0 || k === n
            ? `C(${n}, ${k}) = 1: it sits on an edge, and there is one way to choose none or all.`
            : `C(${n}, ${k}) = ${C(n, k)} is the sum of the two above it: ${C(n - 1, k - 1)} + ${C(n - 1, k)}. The choices of ${k} from ${n} that include the last item number C(${n - 1}, ${k - 1}); those that leave it out number C(${n - 1}, ${k}).`;
        if (overlay === 'symmetry') return `C(${n}, ${k}) = C(${n}, ${n - k}) = ${C(n, k)}: choosing ${k} to include is choosing ${n - k} to leave out. Every row is a palindrome.`;
        if (overlay === 'hockey') return `The diagonal C(${k}, ${k}) to C(${n}, ${k}) adds up to ${hockeySum(n, k)}, which is C(${n + 1}, ${k + 1}) — the blade of the hockey stick, one row down and one step right.`;
        if (overlay === 'rowsum') return `Row ${n} adds up to ${rowSum(n)} = 2${sup(n)}: it counts the subsets of ${n} items by size, and each item is either in or out.`;
        return `Odd entries are coloured. As rows are added they draw Sierpinski's triangle — C(n, k) is odd exactly when every binary digit of k is also set in n.`;
    })();

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/combinatorics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Combinatorics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Pascal&apos;s Triangle</h1>
                    <p className="text-fuchsia-100 max-w-3xl">
                        Built with nothing but addition, yet every entry is a binomial coefficient C(n, k). Its symmetry, its diagonals and its row sums are all counting facts in disguise.
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
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Click any cell'}
                            </span>
                        </div>

                        {mode === 'guided' ? (
                            <TriangleStage layoutRows={GUIDED_ROWS} rows={step.rows} partial={step.partial}
                                highlight={step.highlight} accent={step.accent} sumCell={step.sumCell}
                                questionCell={step.question === 'cell' ? step.target : null}
                                mirror={step.overlay === 'symmetry'} onCell={(n, k) => onCell(n, k)} />
                        ) : (
                            <TriangleStage layoutRows={shown.rows} rows={shown.rows} partial={null}
                                highlight={marks.highlight} accent={marks.accent}
                                sumCell={marks.sumCell && marks.sumCell[0] < shown.rows ? marks.sumCell : null}
                                questionCell={null} mirror={shown.overlay === 'symmetry'} odd={shown.overlay === 'odd'} onCell={onCell} />
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
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-fuchsia-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {OVERLAYS.map(([key, label]) => (
                                    <button key={key} onClick={() => update(s => ({ ...s, overlay: key }))} aria-pressed={shown.overlay === key}
                                        className={`text-xs px-3 py-1.5 rounded-lg border ${shown.overlay === key ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-500/10' : 'border-slate-700 text-slate-400 hover:border-fuchsia-500'}`}>
                                        {label}
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
                        {mode === 'explore' ? (
                            <div className="text-slate-100 text-sm sm:text-base">
                                <Tex block>{texFor(shown.n, shown.k, shown.overlay)}</Tex>
                            </div>
                        ) : (
                            <div className="text-slate-100 text-sm sm:text-base">
                                <Tex block>{String.raw`\binom{n}{k} = \binom{n-1}{k-1} + \binom{n-1}{k}, \qquad \binom{n}{0} = \binom{n}{n} = 1`}</Tex>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <ParamSlider label="Rows shown" accent="fuchsia" min={1} max={MAX_ROWS} value={mode === 'guided' ? step.rows : shown.rows}
                                onChange={(v) => update(s => ({ ...s, rows: v }))} />
                            <ParamSlider label="n (row)" accent="fuchsia" min={0} max={MAX_ROWS - 1} value={mode === 'guided' ? (step.highlight[0] ?? step.target ?? [0])[0] : shown.n}
                                onChange={(v) => update(s => ({ ...s, n: v, rows: Math.max(s.rows, v + (s.overlay === 'hockey' ? 2 : 1)) }))} />
                            <ParamSlider label="k (position)" accent="fuchsia" min={0} max={mode === 'guided' ? MAX_ROWS - 1 : shown.n} value={mode === 'guided' ? (step.highlight[0] ?? step.target ?? [0, 0])[1] : shown.k}
                                onChange={(v) => update(s => ({ ...s, k: v }))} />
                        </div>
                        <p className="text-xs text-slate-500">
                            Rows and positions are counted from 0. Clicking a cell sets n and k; moving the sliders moves the highlight.
                        </p>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Identities in the triangle</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-fuchsia-300 font-semibold">Pascal&apos;s rule</span> — C(n, k) = C(n − 1, k − 1) + C(n − 1, k).</li>
                            <li><span className="text-pink-300 font-semibold">Symmetry</span> — C(n, k) = C(n, n − k).</li>
                            <li><span className="text-sky-300 font-semibold">Hockey stick</span> — C(k, k) + … + C(n, k) = C(n + 1, k + 1).</li>
                            <li><span className="text-amber-300 font-semibold">Row sum</span> — C(n, 0) + … + C(n, n) = 2ⁿ.</li>
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
