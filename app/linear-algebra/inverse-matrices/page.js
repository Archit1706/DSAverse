"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Square, Box, ListOrdered,
} from 'lucide-react';
import Plane2D, { Vector, Polygon, MappedGrid, MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import MatrixInput from '@/components/math/MatrixInput';
import Tex, { texNum, texMatrix } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Matrices are rows. Gauss–Jordan on [A | I]: whatever row operations turn A
   into I, applied to I, build A⁻¹. */
const EPS = 1e-9;
/** Rounds away float noise, finer than EPS so the rounding cannot fake a pivot. */
const clean = (x) => (Math.abs(x) < EPS ? 0 : Math.round(x * 1e12) / 1e12);
const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
const mul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, x, k) => s + x * B[k][j], 0)));
const apply = (M, v) => M.map(row => row.reduce((s, x, k) => s + x * v[k], 0));
const lerp = (P, Q, t) => P.map((row, i) => row.map((x, j) => x + (Q[i][j] - x) * t));
const det = (M) => (M.length === 2
    ? M[0][0] * M[1][1] - M[0][1] * M[1][0]
    : M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]));
const col = (M, j) => M.map(r => r[j]);
/** A non-zero vector a singular 2×2 matrix sends to 0. */
const nullVec2 = (A) => {
    if (Math.abs(A[0][0]) > EPS || Math.abs(A[0][1]) > EPS) return [-A[0][1], A[0][0]];
    if (Math.abs(A[1][0]) > EPS || Math.abs(A[1][1]) > EPS) return [-A[1][1], A[1][0]];
    return [1, 0];
};

/** A⁻¹ by Gauss–Jordan, or null when A is singular. */
const inverse = (A) => {
    const n = A.length;
    const M = A.map((row, i) => [...row, ...identity(n)[i]]);
    for (let c = 0; c < n; c++) {
        let p = c;
        while (p < n && Math.abs(M[p][c]) < EPS) p++;
        if (p === n) return null;
        [M[p], M[c]] = [M[c], M[p]];
        const f = M[c][c];
        M[c] = M[c].map(x => x / f);
        for (let k = 0; k < n; k++) {
            if (k === c) continue;
            const m = M[k][c];
            M[k] = M[k].map((x, j) => x - m * M[c][j]);
        }
    }
    return M.map(row => row.slice(n).map(clean));
};

const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const ROW = ['R₁', 'R₂', 'R₃'];
const rowsText = (M) => `[${M.map(r => `(${r.map(num).join(', ')})`).join(', ')}]`;
const opText = (k, r, m) => `${ROW[k]} ← ${ROW[k]} ${m < 0 ? '+' : '−'} ${num(Math.abs(m))}·${ROW[r]}`;

/* The answers to every prompt below differ, so no label is right twice. */
const PRESETS = [
    { name: '2×2', A: [[4, 2], [3, 2]] },
    { name: '2×2 with a swap', A: [[0, 2], [-1, 1]] },
    { name: '3×3', A: [[1, 2, 0], [0, 1, 1], [1, 0, 1]] },
    { name: 'No inverse', A: [[2, 1], [3, 1.5]] },
];
const V2 = [1, -1];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = (presets = PRESETS) => {
    const steps = [];
    let prompt = 0;
    presets.forEach((pr, pi) => {
        const A = pr.A, n = A.length;
        const I = identity(n);
        let M = A.map((row, i) => [...row, ...I[i]]);
        const push = (s) => steps.push({ preset: pi, name: pr.name, n, A, M: M.map(r => [...r]), active: [], shown: A, ...s });
        push({ kind: 'inv-intro', shown: I,
            explanation: `${presets.length > 1 ? `${pr.name}: ` : ''}A = ${rowsText(A)}. Write it next to the identity, [A | I], and row-reduce until the left half is I. Every operation is applied to the whole row, so the right half records them all.` });
        push({ kind: 'teach',
            explanation: `This is what A does: it carries the grid${n === 3 ? ' and the unit cube' : ''} to a new shape, with its columns as the new axes. A⁻¹, if it exists, is the move that puts everything back.` });
        let singular = false;
        for (let c = 0; c < n; c++) {
            let p = c;
            while (p < n && Math.abs(M[p][c]) < EPS) p++;
            if (p === n) { singular = true; break; }
            if (p !== c) {
                [M[p], M[c]] = [M[c], M[p]];
                push({ kind: 'swap', active: [c, p],
                    explanation: `The pivot spot in column ${c + 1} holds 0, so swap ${ROW[c]} and ${ROW[p]}. The right half swaps too.` });
            }
            for (let k = c + 1; k < n; k++) {
                if (Math.abs(M[k][c]) < EPS) continue;
                const a = M[k][c], piv = M[c][c];
                const m = a / piv;
                push({ kind: 'elim-intro', active: [k, c], pivot: [c, c], slot: (prompt++ * 3 + 1) % 4,
                    explanation: `Clear the ${num(a)} below the pivot ${num(piv)}: subtract a multiple of ${ROW[c]} from ${ROW[k]}.` });
                M[k] = M[k].map((x, j) => clean(x - m * M[c][j]));
                push({ kind: 'elim', active: [k, c],
                    explanation: `${opText(k, c, m)}, with multiple ${num(a)} / ${num(piv)} = ${num(m)}. The right half picks up the same change.` });
            }
        }
        if (singular) {
            push({ kind: 'singular', active: [n - 1],
                explanation: `The left half has a row of zeros: there is no pivot to turn into 1, so the left side can never become I. A has no inverse — det A = ${num(det(A))}.` });
            const nv = n === 2 ? nullVec2(A) : null;
            [0, 1].forEach(t => push({ kind: 'squash', shown: lerp(I, A, t),
                explanation: t < 1 ? 'Watch why. Here is the plane before A acts…'
                    : nv
                        ? `…and after: squashed flat. Different points land on the same spot — (1, 0) and ${`(${[1 + nv[0], nv[1]].map(num).join(', ')})`} both go to ${`(${apply(A, [1, 0]).map(num).join(', ')})`} — so no matrix can send them back to two different places.`
                        : '…and after: squashed flat. Different points land on the same spot, so no matrix can send them back to where they came from.' }));
            return;
        }
        for (let q = n - 1; q >= 0; q--) {
            if (Math.abs(M[q][q] - 1) > EPS) {
                const piv = M[q][q];
                push({ kind: 'scale-intro', active: [q], pivot: [q, q], slot: (prompt++ * 3 + 1) % 4,
                    explanation: `Make the pivot in ${ROW[q]} equal to 1. It is ${num(piv)} now: multiply the row by what?` });
                M[q] = M[q].map(x => clean(x / piv));
                push({ kind: 'scale', active: [q],
                    explanation: `${ROW[q]} ← ${num(1 / piv)}·${ROW[q]}: 1 / ${num(piv)} = ${num(1 / piv)}, and the pivot is now 1.` });
            }
            for (let k = q - 1; k >= 0; k--) {
                if (Math.abs(M[k][q]) < EPS) continue;
                const m = M[k][q];
                M[k] = M[k].map((x, j) => clean(x - m * M[q][j]));
                push({ kind: 'back', active: [k, q],
                    explanation: `Clear above the pivot: ${opText(k, q, m)}.` });
            }
        }
        const Ainv = M.map(row => row.slice(n));
        push({ kind: 'inverse',
            explanation: `The left half is I, so the right half is A⁻¹ = ${rowsText(Ainv)}. Check: A·A⁻¹ = ${rowsText(mul(A, Ainv).map(r => r.map(clean)))}, the identity.` });
        if (n === 2) {
            push({ kind: 'undo', shown: lerp(A, I, 0.5), Ainv,
                explanation: `Now the picture. A had moved the grid; applying A⁻¹ afterwards starts carrying it back…` });
            push({ kind: 'undo', shown: I, Ainv,
                explanation: `…all the way to where it began. A⁻¹A = I: v went to Av = (${apply(A, V2).map(num).join(', ')}) and comes straight back to (${V2.map(num).join(', ')}).` });
        } else {
            push({ kind: 'undo', shown: lerp(A, I, 0.5), Ainv,
                explanation: 'In 3D the same: A turned the unit cube into a slanted box, and A⁻¹ squeezes it back…' });
            push({ kind: 'undo', shown: I, Ainv,
                explanation: `…into the unit cube. The box had volume det A = ${num(det(A))}, so A⁻¹ scales volume by 1 / ${num(det(A))}.` });
        }
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   "What multiple?" offers the fraction upside down, the wrong sign and the
   bare entry. "Multiply the row by what?" offers the pivot itself, the wrong
   sign and 1 / (pivot + 1). Duplicates are replaced from further down. */
const pickWrong = (correct, candidates) => {
    const seen = new Set([num(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (!Number.isFinite(c) || seen.has(num(c))) continue;
        seen.add(num(c));
        wrong.push(c);
    }
    return wrong;
};

const predictFor = (step) => {
    if (!step) return null;
    if (step.kind === 'elim-intro') {
        const [k, c] = step.active;
        const a = step.M[k][c], piv = step.M[c][c];
        const m = a / piv;
        const ordered = pickWrong(m, [piv / a, -m, a, m + 1, m - 1]);
        ordered.splice(step.slot, 0, m);
        return {
            question: `To clear the ${num(a)} in ${ROW[k]} using the pivot ${num(piv)} in ${ROW[c]}: subtract what multiple of ${ROW[c]}?`,
            options: ordered.map(num),
            correct: step.slot,
            because: `Entry ÷ pivot: ${num(a)} / ${num(piv)} = ${num(m)}.`,
        };
    }
    if (step.kind === 'scale-intro') {
        const [q] = step.active;
        const piv = step.M[q][q];
        const correct = 1 / piv;
        const ordered = pickWrong(correct, [piv, -correct, 1 / (piv + 1), 2 / piv, correct + 1]);
        ordered.splice(step.slot, 0, correct);
        return {
            question: `The pivot in ${ROW[q]} is ${num(piv)}. Multiply the row by what to make it 1?`,
            options: ordered.map(num),
            correct: step.slot,
            because: `${num(piv)} × (1 / ${num(piv)}) = 1, so multiply by ${num(correct)}.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'Which matrix has no inverse? (Each is written as its two rows.)',
        options: ['(1, 0), (0, 2)', '(2, 4), (1, 2)', '(0, 1), (1, 0)', '(1, 1), (0, 1)'],
        correct: 1,
        explanation: 'Its second row is half its first, so det = 2·2 − 4·1 = 0: it squashes the plane onto a line, and nothing can undo that. The others have determinants 2, −1 and 1.',
    },
    {
        question: 'A rotates the plane 90° counter-clockwise. What does A⁻¹ do?',
        options: ['Rotates 90° counter-clockwise again', 'Rotates 90° clockwise', 'Reflects across the x-axis', 'Nothing'],
        correct: 1,
        explanation: 'A⁻¹ must undo A, so it turns everything back: 90° clockwise. Doing A then A⁻¹ leaves every vector where it started.',
    },
    {
        question: 'Row-reducing [A | I] ends with [I | B]. What is B?',
        options: ['A', 'Aᵀ', 'A⁻¹', 'det A times I'],
        correct: 2,
        explanation: 'The row operations that turned A into I amount to multiplying by A⁻¹. Applied to I on the right, they leave A⁻¹ · I = A⁻¹ there.',
    },
];

const codeExample = `import numpy as np

A = np.array([[4, 2],
              [3, 2]], dtype=float)
A_inv = np.linalg.inv(A)
print(A_inv)                  # [[ 1.  -1. ]
                              #  [-1.5  2. ]]
print(A @ A_inv)              # the identity

v = np.array([1, -1])
print(A_inv @ (A @ v))        # [ 1. -1.] -- A moves v, A^-1 puts it back

# Gauss-Jordan by hand: row-reduce [A | I]
M = np.hstack([A, np.eye(2)])
M[1] -= 0.75 * M[0]           # clear below the first pivot
M[1] /= M[1, 1]               # make the second pivot 1
M[0] -= M[0, 1] * M[1]        # clear above it
M[0] /= M[0, 0]               # make the first pivot 1
print(M[:, 2:])               # the right half is A^-1`;

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

/** [A | I] as a table, the active rows outlined and the right half in pink. */
function AugmentedTable({ M, n, active }) {
    return (
        <div className="overflow-x-auto">
            <table className="font-mono text-sm border-separate border-spacing-x-1 border-spacing-y-1">
                <tbody>
                    {M.map((row, i) => (
                        <tr key={i} className={active[0] === i ? 'bg-violet-500/15' : active.length > 1 && active[1] === i ? 'bg-slate-700/40' : ''}>
                            <td className="pr-2 text-xs text-slate-400">{ROW[i]}{active[0] === i ? ' ←' : ''}</td>
                            {row.map((x, j) => (
                                <td key={j} className={`w-14 text-right px-1 ${j === n ? 'border-l border-slate-500 pl-2' : ''} ${j < n ? 'text-slate-100' : 'text-pink-300'}`}>{num(x)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function InverseMatricesPage() {
    const [mode, setMode] = useState('guided');
    const [custom, setCustom] = useState(null);
    const stepHistory = useMemo(() => (custom ? generateSteps([{ name: 'Your matrix', A: custom }]) : STEPS), [custom]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [tab, setTab] = useState(2);
    const [A2, setA2] = useState(PRESETS[0].A);
    const [A3, setA3] = useState(PRESETS[2].A);
    const [v, setV] = useState(V2);
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
    const n = guided ? step.n : tab;
    const A = guided ? step.A : (n === 2 ? A2 : A3);
    const Ainv = useMemo(() => inverse(A), [A]);
    const shown = guided ? step.shown : A;
    const vec = guided ? V2 : v;
    const hideNumbers = guided && predict.hideExplanation;
    const dA = det(A);

    const goExplore = (nextTab) => {
        if (guided) {
            if (step.n === 2) setA2(step.A); else setA3(step.A);
            setMode('explore'); setIsPlaying(false);
        }
        if (nextTab) setTab(nextTab);
    };
    const runCustom = () => { setCustom((n === 2 ? A2 : A3).map(r => [...r])); setCurrentStep(0); setMode('guided'); setIsPlaying(false); };
    const backToTour = () => { setCustom(null); setCurrentStep(0); setIsPlaying(false); };

    const map = useCallback((p) => apply(shown, p), [shown]);
    const dragCol = (j) => (p) => { goExplore(2); setA2(M => M.map((r, i) => r.map((x, k) => (k === j ? p[i] : x)))); };
    const iHat = [shown[0][0], shown[1]?.[0] ?? 0], jHat = [shown[0][1], shown[1]?.[1] ?? 0];

    const formula = useMemo(() => {
        if (!Ainv) return String.raw`\det A = ${fmt(dA)} \;\Rightarrow\; A^{-1}\text{ does not exist}`;
        return String.raw`A^{-1} = ${texMatrix(Ainv)} \qquad A\,A^{-1} = ${texMatrix(mul(A, Ainv).map(r => r.map(clean)))} = I`;
    }, [A, Ainv, dA]);
    const formulaV = useMemo(() => {
        if (n !== 2 || !Ainv) return null;
        const Av = apply(A, vec);
        return String.raw`A\mathbf{v} = (${fmt(Av[0])}, ${fmt(Av[1])}) \qquad A^{-1}(A\mathbf{v}) = (${fmt(apply(Ainv, Av)[0])}, ${fmt(apply(Ainv, Av)[1])}) = \mathbf{v}`;
    }, [n, A, Ainv, vec]);

    const exploreNote = Ainv
        ? `det A = ${num(dA)}, so A can be undone: A⁻¹ = ${rowsText(Ainv)}. Press "Row-reduce [A | I]" to watch Gauss–Jordan find it.`
        : `det A = 0: A flattens ${n === 2 ? 'the plane onto a line' : 'space onto a plane or a line'}, so no inverse exists. Row reduction will hit a row of zeros.`;
    const showInverse = guided ? ['inverse', 'undo'].includes(step.kind) : true;
    const undoing = guided && step.kind === 'undo';
    const Av = apply(A, vec);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/linear-algebra" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Linear Algebra
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Inverse Matrices</h1>
                    <p className="text-violet-100 max-w-3xl">
                        Row-reduce [A | I] until the left side is I, and the right side is A⁻¹. Then watch A⁻¹ do its job: put the plane back exactly where A found it.
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
                                        onClick={() => { if (key === 'explore') goExplore(step.n); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Size">
                                {[[2, '2×2', Square], [3, '3×3', Box]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={n === key}
                                        onClick={() => goExplore(key)}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${n === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {n === 2 ? (
                            <Plane2D xRange={[-5, 5]} yRange={[-5, 5]} ariaLabel="The grid after A, and A inverse carrying it back">
                                <MappedGrid map={map} range={8} color="#8b5cf6" opacity={0.45} />
                                <Polygon points={[[0, 0], iHat, [iHat[0] + jHat[0], iHat[1] + jHat[1]], jHat]} fill={Math.abs(det(shown)) < 1e-9 ? MATH_COLORS.negative : MATH_COLORS.area} fillOpacity={0.2} />
                                <Vector to={vec} color={MATH_COLORS.a} width={2} dashed opacity={0.6} label="v" onDrag={(p) => { goExplore(2); setV(p); }} snap={0.25} />
                                <Vector to={apply(shown, vec)} color={MATH_COLORS.result} width={3} label={undoing ? 'A⁻¹Av' : 'Av'} />
                                <Vector to={iHat} color={MATH_COLORS.i} width={3.5} label="î′" onDrag={dragCol(0)} snap={0.25} />
                                <Vector to={jHat} color={MATH_COLORS.j} width={3.5} label="ĵ′" onDrag={dragCol(1)} snap={0.25} />
                            </Plane2D>
                        ) : (
                            <Scene3D height={420} ariaLabel="The unit cube, and the box A turns it into"
                                fallback={<p className="text-sm text-slate-300 font-mono">det A = {num(dA)}</p>}>
                                {(P) => (
                                    <>
                                        <P.Parallelepiped a={[1, 0, 0]} b={[0, 1, 0]} c={[0, 0, 1]} color="#475569" opacity={0.08} />
                                        <P.Parallelepiped a={col(shown, 0)} b={col(shown, 1)} c={col(shown, 2)} color={Math.abs(det(shown)) < 1e-9 ? '#fb7185' : '#a78bfa'} opacity={0.3} />
                                        <P.Arrow3D to={col(shown, 0)} color={MATH_COLORS.i} label="î′" />
                                        <P.Arrow3D to={col(shown, 1)} color={MATH_COLORS.j} label="ĵ′" />
                                        <P.Arrow3D to={col(shown, 2)} color={MATH_COLORS.k} label="k̂′" />
                                    </>
                                )}
                            </Scene3D>
                        )}

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
                                <span className="text-xs text-slate-500">{step.name} · step {currentStep + 1} of {stepHistory.length}</span>
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
                                {PRESETS.filter(p => p.A.length === n).map(p => (
                                    <button key={p.name} onClick={() => (n === 2 ? setA2(p.A) : setA3(p.A))}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500">{p.name}</button>
                                ))}
                                <button onClick={runCustom}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 ml-auto">
                                    <ListOrdered className="h-3.5 w-3.5" />Row-reduce [A | I]
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

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                        {guided ? <AugmentedTable M={step.M} n={step.n} active={step.active} /> : (
                            <MatrixInput label="A" value={A} step={0.25}
                                columnColors={[MATH_COLORS.i, MATH_COLORS.j, MATH_COLORS.k]}
                                onChange={(next) => (n === 2 ? setA2(next) : setA3(next))} />
                        )}
                        {hideNumbers ? (
                            <p className="text-sm text-slate-500">The working is hidden until you answer the prediction.</p>
                        ) : showInverse ? (
                            <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                <Tex block>{formula}</Tex>
                                {formulaV && <Tex block>{formulaV}</Tex>}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">det A = {num(dA)}{Math.abs(dA) < EPS ? ' — watch for a row of zeros.' : '. A⁻¹ appears in the right half once the left half is I.'}</p>
                        )}
                        {!guided && n === 2 && (
                            <p className="text-xs text-slate-500">Av = ({Av.map(num).join(', ')}). Drag î′ and ĵ′ to change A; the inverse updates as you go.</p>
                        )}
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">About A⁻¹</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-violet-300 font-semibold">Undo</span> — A⁻¹A = AA⁻¹ = I.</li>
                            <li><span className="text-pink-400 font-semibold">[A | I] → [I | A⁻¹]</span> — the row operations are A⁻¹, applied to I.</li>
                            <li><span className="text-yellow-300 font-semibold">det A ≠ 0</span> — exactly when an inverse exists.</li>
                            <li><span className="text-slate-200 font-semibold">2×2 shortcut</span> — swap a and d, negate b and c, divide by ad − bc.</li>
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
