"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, ListOrdered,
} from 'lucide-react';
import { MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import MatrixInput from '@/components/math/MatrixInput';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   A system is its augmented matrix [A | b], three rows of four numbers. Each
   row is a plane: a₁x + a₂y + a₃z = b. */
const EPS = 1e-9;
const copy = (M) => M.map(r => [...r]);
/** Rounds away float noise so 0.1 + 0.2 shows as 0.3 and −0 never appears. Rounding
    finer than EPS matters: at 1e-9 the rounding itself left residues as big as EPS,
    and a dependent row could pass for a pivot. */
const clean = (x) => (Math.abs(x) < EPS ? 0 : Math.round(x * 1e12) / 1e12);
const dot3 = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const isZeroRow = (row) => row.slice(0, 3).every(x => Math.abs(x) < EPS);

/** Reduced row echelon form by Gauss–Jordan, and the pivot columns. */
const rref = (M0) => {
    const M = copy(M0);
    const pivots = [];
    let r = 0;
    for (let c = 0; c < 3 && r < 3; c++) {
        let p = r;
        while (p < 3 && Math.abs(M[p][c]) < EPS) p++;
        if (p === 3) continue;
        [M[p], M[r]] = [M[r], M[p]];
        const f = M[r][c];
        M[r] = M[r].map(x => clean(x / f));
        for (let k = 0; k < 3; k++) {
            if (k === r || Math.abs(M[k][c]) < EPS) continue;
            const m = M[k][c];
            M[k] = M[k].map((x, j) => clean(x - m * M[r][j]));
        }
        pivots.push(c);
        r++;
    }
    return { R: M, pivots };
};

/** What the system's solution set is: a point, a line, a plane, everything, or nothing. */
const solveSystem = (M) => {
    const { R, pivots } = rref(M);
    if (R.some(row => isZeroRow(row) && Math.abs(row[3]) > EPS)) return { kind: 'none', rank: pivots.length };
    const free = [0, 1, 2].filter(c => !pivots.includes(c));
    const point = [0, 0, 0];
    pivots.forEach((c, i) => { point[c] = R[i][3]; });
    const dirs = free.map(f => {
        const d = [0, 0, 0];
        d[f] = 1;
        pivots.forEach((c, i) => { d[c] = clean(-R[i][f]); });
        return d;
    });
    const kind = free.length === 0 ? 'point' : free.length === 1 ? 'line' : free.length === 2 ? 'plane' : 'all';
    return { kind, rank: pivots.length, point: point.map(clean), dirs };
};
const COUNT_LABELS = ['Exactly one', 'None', 'Infinitely many'];
const countLabel = (sol) => (sol.kind === 'point' ? COUNT_LABELS[0] : sol.kind === 'none' ? COUNT_LABELS[1] : COUNT_LABELS[2]);

const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const triple = (u) => `(${u.map(num).join(', ')})`;
const ROW = ['R₁', 'R₂', 'R₃'];
/** a₁x + a₂y + a₃z = b written out, as plain text. */
const eqText = (row) => {
    const terms = [];
    ['x', 'y', 'z'].forEach((v, i) => {
        if (Math.abs(row[i]) < EPS) return;
        const c = Math.abs(Math.abs(row[i]) - 1) < EPS ? '' : num(Math.abs(row[i]));
        terms.push(`${terms.length ? (row[i] < 0 ? ' − ' : ' + ') : row[i] < 0 ? '−' : ''}${c}${v}`);
    });
    return `${terms.length ? terms.join('') : '0'} = ${num(row[3])}`;
};
/** "R₂ ← R₂ − 1.5·R₁", or "+" when the multiple is negative. */
const opText = (k, r, m) => `${ROW[k]} ← ${ROW[k]} ${m < 0 ? '+' : '−'} ${num(Math.abs(m))}·${ROW[r]}`;

/* Three systems: one solution, none, and a whole line of them. Their
   multipliers are all different, so no answer repeats across the tour. */
const SYSTEMS = [
    { name: 'One solution', rotate: 1, M: [[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]] },
    { name: 'No solution', rotate: 0, M: [[1, 2, -1, 3], [3, 7, 1, 4], [-2, -3, 6, -8]] },
    { name: 'Infinitely many', rotate: 2, M: [[2, 4, -2, 2], [1, 3, 1, 4], [-1, 0, 5, 5]] },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = (systems = SYSTEMS) => {
    const steps = [];
    let prompt = 0;
    systems.forEach((sys, si) => {
        let M = copy(sys.M);
        const sol = solveSystem(sys.M);
        const push = (s) => steps.push({ sys: si, name: sys.name, M: copy(M), sol, active: [], ...s });
        push({ kind: 'sys-intro',
            explanation: `${systems.length > 1 ? `System ${si + 1}: ` : ''}${M.map(eqText).join(';  ')}. Each equation is a plane in 3D — green, red and blue. A solution is a point on all three at once. Row operations change the planes but never that common point.` });
        const pivots = [];
        let r = 0;
        for (let c = 0; c < 3 && r < 3; c++) {
            let p = r;
            while (p < 3 && Math.abs(M[p][c]) < EPS) p++;
            if (p === 3) continue;
            if (p !== r) {
                [M[p], M[r]] = [M[r], M[p]];
                push({ kind: 'swap', active: [r, p],
                    explanation: `Column ${c + 1} needs a non-zero pivot in row ${r + 1}, so swap ${ROW[r]} and ${ROW[p]}. Swapping two equations changes nothing about their solutions.` });
            }
            for (let k = r + 1; k < 3; k++) {
                if (Math.abs(M[k][c]) < EPS) continue;
                const a = M[k][c], piv = M[r][c];
                const m = a / piv;
                push({ kind: 'elim-intro', active: [k, r], pivot: [r, c], m, slot: (prompt++ * 3 + 1) % 4,
                    explanation: `Clear the ${num(a)} in ${ROW[k]}, column ${c + 1}, using the pivot ${num(piv)} in ${ROW[r]}. Subtract the right multiple of ${ROW[r]} from ${ROW[k]}.` });
                M[k] = M[k].map((x, j) => clean(x - m * M[r][j]));
                push({ kind: 'elim', active: [k, r], pivot: [r, c], m,
                    explanation: `${opText(k, r, m)}: the multiple is ${num(a)} / ${num(piv)} = ${num(m)}. ${ROW[k]} is now ${eqText(M[k])} — a different plane, through the same common points.` });
            }
            pivots.push([r, c]);
            r++;
        }
        const contradiction = M.findIndex(row => isZeroRow(row) && Math.abs(row[3]) > EPS);
        push({ kind: 'ref',
            explanation: `Row echelon form: each pivot sits to the right of the one above, with zeros below. ${contradiction >= 0
                ? `${ROW[contradiction]} now reads 0 = ${num(M[contradiction][3])}.`
                : `There ${pivots.length === 1 ? 'is 1 pivot' : `are ${pivots.length} pivots`} for 3 unknowns.`}` });
        push({ kind: 'count-intro', rotate: sys.rotate ?? 0,
            explanation: 'Read the echelon form: how many solutions does this system have?' });
        push({ kind: 'count',
            explanation: sol.kind === 'point'
                ? 'Exactly one: three pivots, one per unknown, so back substitution pins down x, y and z. The three planes meet at a single point.'
                : sol.kind === 'none'
                    ? `None: a row of zeros equal to ${num(M[contradiction][3])} says 0 = ${num(M[contradiction][3])}, which no x, y, z can satisfy. The planes meet in pairs, but never all three at once.`
                    : `Infinitely many: only ${sol.rank} pivot${sol.rank === 1 ? '' : 's'} for 3 unknowns, and no contradiction, so ${3 - sol.rank === 1 ? 'one unknown is free. The planes share a whole line' : 'the unknowns without pivots are free'}.` });
        if (sol.kind !== 'none') {
            for (let q = pivots.length - 1; q >= 0; q--) {
                const [pr, pc] = pivots[q];
                if (Math.abs(M[pr][pc] - 1) > EPS) {
                    const f = M[pr][pc];
                    M[pr] = M[pr].map(x => clean(x / f));
                    push({ kind: 'scale', active: [pr],
                        explanation: `Divide ${ROW[pr]} by ${num(f)} so its pivot is 1: ${eqText(M[pr])}.` });
                }
                for (let k = pr - 1; k >= 0; k--) {
                    if (Math.abs(M[k][pc]) < EPS) continue;
                    const m = M[k][pc];
                    M[k] = M[k].map((x, j) => clean(x - m * M[pr][j]));
                    push({ kind: 'back', active: [k, pr], m,
                        explanation: `Clear above the pivot: ${opText(k, pr, m)}. ${ROW[k]} is now ${eqText(M[k])}.` });
                }
            }
        }
        push({ kind: 'solution',
            explanation: sol.kind === 'point'
                ? `Reduced row echelon form reads off the answer: x = ${num(sol.point[0])}, y = ${num(sol.point[1])}, z = ${num(sol.point[2])}. That is the pink point where all three planes meet — the same point as before any row operation.`
                : sol.kind === 'line'
                    ? `Reduced form: every solution is ${triple(sol.point)} + s·${triple(sol.dirs[0])} for any number s. That is the pink line the three planes share.`
                    : sol.kind === 'plane'
                        ? 'Reduced form leaves two unknowns free: every point of one plane is a solution.'
                        : sol.kind === 'all' ? 'Every row is 0 = 0: every point in space is a solution.'
                            : 'Stop here: one contradiction is enough. There is no solution, and no amount of further elimination can produce one.' });
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   "What multiple of the pivot row?" offers the classic slips: the fraction
   upside down, the wrong sign, and the entry without dividing by the pivot.
   "How many solutions?" has fixed labels, one system for each, rotated so
   each lands in a different button. */
const predictFor = (step) => {
    if (!step) return null;
    if (step.kind === 'elim-intro') {
        const [k, r] = step.active;
        const [, c] = step.pivot;
        const a = step.M[k][c], p = step.M[r][c];
        const m = a / p;
        const seen = new Set([num(m)]);
        const wrong = [];
        for (const w of [p / a, -m, a, m + 1, m - 1, 2 * m]) {
            if (wrong.length === 3) break;
            if (seen.has(num(w))) continue;
            seen.add(num(w));
            wrong.push(w);
        }
        wrong.splice(step.slot, 0, m);
        return {
            question: `To clear the ${num(a)} in ${ROW[k]} with the pivot ${num(p)} in ${ROW[r]}: subtract what multiple of ${ROW[r]}?`,
            options: wrong.map(num),
            correct: step.slot,
            because: `The multiple is entry ÷ pivot = ${num(a)} / ${num(p)} = ${num(m)}, so ${ROW[k]} − ${num(m)}·${ROW[r]} has a 0 in column ${c + 1}.`,
        };
    }
    if (step.kind === 'count-intro') {
        const options = COUNT_LABELS.map((_, i) => COUNT_LABELS[(i + step.rotate) % 3]);
        return {
            question: 'From the echelon form: how many solutions does this system have?',
            options,
            correct: options.indexOf(countLabel(step.sol)),
            because: step.sol.kind === 'point' ? 'A pivot in every column: one solution.'
                : step.sol.kind === 'none' ? 'A row reads 0 = (not 0): a contradiction, so no solution.'
                    : 'Fewer pivots than unknowns and no contradiction: a free unknown, so infinitely many.',
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'Which of these can change the solutions of a system?',
        options: ['Swapping two rows', 'Multiplying a row by 3', 'Adding 2 × row 1 to row 2', 'Multiplying a row by 0'],
        correct: 3,
        explanation: 'Swapping, scaling by a non-zero number and adding a multiple of another row can all be undone, so they keep the solutions. Multiplying by 0 wipes an equation out and cannot be undone.',
    },
    {
        question: 'Elimination produces the row [0 0 0 | 5]. What does that mean?',
        options: ['x = 5', 'There are infinitely many solutions', 'There is no solution: it says 0 = 5', 'z = 5'],
        correct: 2,
        explanation: 'The row means 0x + 0y + 0z = 5, which nothing satisfies. One contradiction is enough: the planes have no point in common.',
    },
    {
        question: 'Three planes meet at exactly one point. After elimination, how many pivots are there?',
        options: ['2', '3', '1', '0'],
        correct: 1,
        explanation: 'One solution needs a pivot in every column: three pivots for three unknowns, so back substitution fixes each of x, y and z.',
    },
];

const codeExample = `import numpy as np

A = np.array([[ 2,  1, -1],
              [-3, -1,  2],
              [-2,  1,  2]], dtype=float)
b = np.array([8, -11, -3], dtype=float)
print(np.linalg.solve(A, b))           # [ 2.  3. -1.]

# The same by hand. (This system needs no row swaps; in general
# you would swap in a non-zero pivot first.)
M = np.column_stack([A, b])
for c in range(3):
    for r in range(c + 1, 3):
        M[r] -= (M[r, c] / M[c, c]) * M[c]    # clear below the pivot

x = np.zeros(3)
for r in reversed(range(3)):                  # back substitution
    x[r] = (M[r, 3] - M[r, r + 1:3] @ x[r + 1:]) / M[r, r]
print(x)                                      # [ 2.  3. -1.]`;

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
                    className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-violet-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

const ROW_COLORS = [MATH_COLORS.i, MATH_COLORS.j, MATH_COLORS.k];
const ROW_TEXT = ['text-green-400', 'text-red-400', 'text-blue-400'];

/** The part of a line inside the box |x|, |y|, |z| ≤ r, as its two end points. */
function clipLine(p0, d, r = 4.5) {
    let lo = -1e6, hi = 1e6;
    for (let i = 0; i < 3; i++) {
        if (Math.abs(d[i]) < EPS) { if (Math.abs(p0[i]) > r) return null; continue; }
        const a = (-r - p0[i]) / d[i], b = (r - p0[i]) / d[i];
        lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
    }
    return lo < hi ? [p0.map((x, i) => x + lo * d[i]), p0.map((x, i) => x + hi * d[i])] : null;
}

/** The augmented matrix, each row in its plane's colour, the active rows outlined. */
function Augmented({ M, active }) {
    return (
        <div className="overflow-x-auto">
            <table className="font-mono text-sm border-separate border-spacing-x-1 border-spacing-y-1">
                <tbody>
                    {M.map((row, i) => {
                        const target = active[0] === i, source = active.length > 1 && active[1] === i;
                        return (
                            <tr key={i} className={target ? 'bg-violet-500/15' : source ? 'bg-slate-700/40' : ''}>
                                <td className={`pr-2 text-xs ${ROW_TEXT[i]}`}>{ROW[i]}{target ? ' ←' : ''}</td>
                                {row.map((x, j) => (
                                    <td key={j} className={`w-14 text-right px-1 ${j === 3 ? 'border-l border-slate-500 pl-2' : ''} ${ROW_TEXT[i]}`}>{num(x)}</td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function GaussianEliminationPage() {
    const [mode, setMode] = useState('guided');
    const [custom, setCustom] = useState(null);          // a system typed in Explore, stepped through in Guided
    const stepHistory = useMemo(() => (custom ? generateSteps([{ name: 'Your system', rotate: 0, M: custom }]) : STEPS), [custom]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [system, setSystem] = useState(SYSTEMS[0].M);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const guided = mode === 'guided';
    const M = guided ? step.M : system;
    const sol = useMemo(() => (guided ? step.sol : solveSystem(system)), [guided, step, system]);
    const active = guided ? step.active : [];
    const hideNumbers = guided && predict.hideExplanation;
    // The solution set never changes under row operations, so it is drawn on every step.
    const focus = sol.kind === 'none' || sol.kind === 'all' ? [0, 0, 0] : sol.point;
    const solLine = sol.kind === 'line' ? clipLine(sol.point, sol.dirs[0]) : null;
    // Shown once the count is revealed, so the picture does not answer the count question early.
    const showSolution = guided ? ['count', 'scale', 'back', 'solution'].includes(step.kind) : true;

    const goExplore = () => {
        if (guided) { setSystem(copy(step.M)); setMode('explore'); setIsPlaying(false); }
    };
    const runCustom = () => { setCustom(copy(system)); setCurrentStep(0); setMode('guided'); setIsPlaying(false); };
    const backToTour = () => { setCustom(null); setCurrentStep(0); setIsPlaying(false); };

    const solutionTex = useMemo(() => {
        if (sol.kind === 'point') return String.raw`x = ${fmt(sol.point[0])}, \quad y = ${fmt(sol.point[1])}, \quad z = ${fmt(sol.point[2])}`;
        if (sol.kind === 'line') {
            const col = (u) => String.raw`\begin{bmatrix} ${fmt(u[0])} \\ ${fmt(u[1])} \\ ${fmt(u[2])} \end{bmatrix}`;
            return String.raw`\begin{bmatrix} x \\ y \\ z \end{bmatrix} = ${col(sol.point)} + s\,${col(sol.dirs[0])}`;
        }
        if (sol.kind === 'none') return String.raw`0 = c \neq 0 \;\Rightarrow\; \text{no solution}`;
        if (sol.kind === 'plane') return String.raw`\text{two free unknowns: a whole plane of solutions}`;
        return String.raw`\text{every point is a solution}`;
    }, [sol]);
    const augTex = useMemo(() => String.raw`\left[\begin{array}{rrr|r} ${M.map((row, i) => row.map(x => String.raw`\textcolor{${ROW_COLORS[i]}}{${fmt(x)}}`).join(' & ')).join(String.raw` \\ `)} \end{array}\right]`, [M]);

    const exploreNote = sol.kind === 'point'
        ? `The three planes meet at one point, ${triple(sol.point)}. Press "Eliminate step by step" to watch row operations find it.`
        : sol.kind === 'line' ? `The planes share a whole line: ${triple(sol.point)} + s·${triple(sol.dirs[0])}.`
            : sol.kind === 'none' ? 'There is no point on all three planes: elimination will end with a row that says 0 = (something non-zero).'
                : sol.kind === 'plane' ? 'All three equations describe the same plane, so every point on it is a solution.'
                    : 'Every coefficient is zero: every point in space solves this.';

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/linear-algebra" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Linear Algebra
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Gaussian Elimination</h1>
                    <p className="text-violet-100 max-w-3xl">
                        Each equation is a plane, and solving the system is finding where all three meet. Row operations swap one plane for another — but never move the meeting point.
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
                                        onClick={() => { if (key === 'explore') goExplore(); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {guided ? `${step.name} · step ${currentStep + 1} of ${stepHistory.length}` : 'Type the system; drag the scene to orbit'}
                            </span>
                        </div>

                        <Scene3D height={420} distance={12} ariaLabel="The three planes of the system and the points they share"
                            fallback={<p className="text-sm text-slate-300 font-mono">{countLabel(sol)}{sol.kind === 'point' ? `: ${triple(sol.point)}` : ''}</p>}>
                            {(P) => (
                                <>
                                    {M.map((row, i) => {
                                        const n = row.slice(0, 3);
                                        const nn = dot3(n, n);
                                        if (nn < EPS) return null;
                                        const shift = (dot3(n, focus) - row[3]) / nn;
                                        const centre = focus.map((x, j) => x - shift * n[j]);
                                        return <P.Plane3D key={i} normal={n} point={centre} size={7} color={ROW_COLORS[i]} opacity={active.includes(i) ? 0.3 : 0.17} />;
                                    })}
                                    {showSolution && sol.kind === 'point' && <P.Point3D at={sol.point} color={MATH_COLORS.result} size={0.13} label={triple(sol.point)} />}
                                    {showSolution && solLine && <P.Line3D points={solLine} color={MATH_COLORS.result} width={4} />}
                                </>
                            )}
                        </Scene3D>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="violet" />
                                {custom && (
                                    <button onClick={backToTour} className="text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500">Back to the tour</button>
                                )}
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-violet-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {SYSTEMS.map(s => (
                                    <button key={s.name} onClick={() => setSystem(copy(s.M))}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500">{s.name}</button>
                                ))}
                                <button onClick={runCustom}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 ml-auto">
                                    <ListOrdered className="h-3.5 w-3.5" />Eliminate step by step
                                </button>
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="violet" />}

                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-violet-400 mt-0.5 flex-shrink-0" />
                            <p className="text-violet-200 text-sm leading-relaxed">
                                {guided ? (predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation) : exploreNote}
                            </p>
                        </div>
                    </div>

                    {hideNumbers ? (
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-3">
                            <Augmented M={M} active={active} />
                            <p className="text-sm text-slate-500">The working is hidden until you answer the prediction.</p>
                        </div>
                    ) : (
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                            {guided ? <Augmented M={M} active={active} /> : (
                                <MatrixInput label="[A | b]" value={system} step={0.5} min={-20} max={20}
                                    columnColors={['#e2e8f0', '#e2e8f0', '#e2e8f0', MATH_COLORS.a]}
                                    onChange={(next) => setSystem(next.map(r => r.map(clean)))} />
                            )}
                            <ul className="space-y-0.5 text-sm font-mono">
                                {M.map((row, i) => <li key={i} className={ROW_TEXT[i]}>{eqText(row)}</li>)}
                            </ul>
                            <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                <Tex block>{augTex}</Tex>
                                {showSolution && <Tex block>{solutionTex}</Tex>}
                            </div>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Row operations</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-violet-300 font-semibold">Swap</span> two rows.</li>
                            <li><span className="text-violet-300 font-semibold">Scale</span> a row by a non-zero number.</li>
                            <li><span className="text-violet-300 font-semibold">Add</span> a multiple of one row to another.</li>
                            <li><span className="text-pink-400 font-semibold">None of them</span> changes the solutions — every one can be undone.</li>
                        </ul>
                        <h3 className="text-xs font-semibold text-slate-300 mt-4 mb-2">Reading the echelon form</h3>
                        <ul className="space-y-1 text-xs text-slate-400">
                            <li>A pivot in every column: exactly one solution.</li>
                            <li>A row 0 = (non-zero): no solution.</li>
                            <li>Otherwise, fewer pivots than unknowns: infinitely many.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-violet-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
