"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, ArrowRightLeft,
} from 'lucide-react';
import Plane2D, { Vector, MappedGrid, MATH_COLORS } from '@/components/math/Plane2D';
import MatrixInput from '@/components/math/MatrixInput';
import Tex, { texNum, texMatrix } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Matrices are rows. (AB)ᵢⱼ is row i of A times column j of B, and
   (AB)v = A(Bv): B acts first. */
const ID = [[1, 0], [0, 1]];
const mul = (A, B) => A.map((row, i) => B[0].map((_, j) => row.reduce((s, x, k) => s + x * B[k][j], 0)));
const apply = (M, v) => M.map(row => row.reduce((s, x, k) => s + x * v[k], 0));
const lerp = (P, Q, t) => P.map((row, i) => row.map((x, j) => x + (Q[i][j] - x) * t));
const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const pair = ([x, y]) => `(${num(x)}, ${num(y)})`;
/** A factor in a product: (−1) rather than −1. */
const par = (x) => (x < 0 ? `(${num(x)})` : num(x));
const rowText = (M) => `[${M.map(r => `(${r.map(num).join(', ')})`).join(', ')}]`;
/** Entry (i, j) of AB written out: a·b + c·d. */
const entryWorking = (A, B, i, j) => A[i].map((x, k) => `${par(x)}·${par(B[k][j])}`).join(' + ');

/* Two pairs whose products share no entries, so no answer repeats. */
const SHEAR = [[1, 2], [0, 1]];
const ROTATE = [[0, -1], [1, 0]];
const PAIR2_A = [[1, -1], [1, 1]];
const PAIR2_B = [[1, 0.5], [0.5, 2.5]];
const V = [2, 1];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let prompt = 0;
    const ALL = ['00', '01', '10', '11'];
    const push = (s) => steps.push({ entry: null, filled: s.kind === 'compose' || s.kind === 'compose-intro' ? (s.order === 'AB' || (s.show ?? []).includes('final') ? ALL : []) : [], show: ['v'], order: 'AB', ...s });
    const entryActs = (A, B, intro) => {
        const AB = mul(A, B);
        const filled = [];
        push({ kind: 'teach', A, B, M: AB, filled: [], explanation: intro });
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                push({ kind: 'entry-intro', A, B, M: AB, entry: [i, j], filled: [...filled], slot: (prompt++ * 3 + 1) % 4,
                    explanation: `Entry (${i + 1}, ${j + 1}) of AB: row ${i + 1} of A, (${A[i].map(num).join(', ')}), times column ${j + 1} of B, (${B.map(r => num(r[j])).join(', ')}). Multiply matching numbers and add.` });
                filled.push(`${i}${j}`);
                push({ kind: 'entry', A, B, M: AB, entry: [i, j], filled: [...filled],
                    explanation: `(AB)${i + 1}${j + 1} = ${entryWorking(A, B, i, j)} = ${num(AB[i][j])}.` });
            }
        }
        return AB;
    };
    const AB = entryActs(SHEAR, ROTATE,
        'A = [(1, 2), (0, 1)] is a shear and B = [(0, −1), (1, 0)] is a quarter turn. Each entry of AB comes from one row of A and one column of B — four entries, four row-times-column products.');
    push({ kind: 'teach', A: SHEAR, B: ROTATE, M: AB, filled: ['00', '01', '10', '11'], show: ['v', 'columns'],
        explanation: `Read AB by columns: its first column ${pair([AB[0][0], AB[1][0]])} is A applied to B's first column (0, 1), and its second ${pair([AB[0][1], AB[1][1]])} is A applied to B's second column (−1, 0). AB sends î where B sends it, then on through A.` });

    // The picture: AB means B first, then A.
    const Bv = apply(ROTATE, V), ABv = apply(AB, V);
    push({ kind: 'compose-intro', A: SHEAR, B: ROTATE, M: ID, order: 'AB', slot: (prompt++ * 3 + 1) % 4,
        explanation: 'Now as pictures. AB means: do B first, then A. Follow v = (2, 1) — rotate a quarter turn, then shear. Where does it land?' });
    push({ kind: 'compose', A: SHEAR, B: ROTATE, M: lerp(ID, ROTATE, 0.5), order: 'AB', show: ['v'],
        explanation: 'B turns the whole grid a quarter turn counter-clockwise…' });
    push({ kind: 'compose', A: SHEAR, B: ROTATE, M: ROTATE, order: 'AB', show: ['v', 'mid'],
        explanation: `…so v lands at Bv = ${pair(Bv)}.` });
    push({ kind: 'compose', A: SHEAR, B: ROTATE, M: mul(lerp(ID, SHEAR, 0.5), ROTATE), order: 'AB', show: ['v', 'mid'],
        explanation: 'Then A shears the already-rotated grid sideways…' });
    push({ kind: 'compose', A: SHEAR, B: ROTATE, M: AB, order: 'AB', show: ['v', 'mid', 'final'],
        explanation: `…and A(Bv) = ${pair(ABv)}. That is exactly ABv: the product matrix does both moves in one step, and its columns are where î and ĵ end up.` });

    const BA = mul(ROTATE, SHEAR);
    const Av = apply(SHEAR, V), BAv = apply(BA, V);
    push({ kind: 'compose-intro', A: SHEAR, B: ROTATE, M: ID, order: 'BA', slot: (prompt++ * 3 + 1) % 4,
        explanation: 'Swap the order: BA means shear first, then rotate. Same two moves, opposite order. Where does v land now?' });
    push({ kind: 'compose', A: SHEAR, B: ROTATE, M: lerp(ID, SHEAR, 0.5), order: 'BA', show: ['v'],
        explanation: 'This time A shears the grid first…' });
    push({ kind: 'compose', A: SHEAR, B: ROTATE, M: SHEAR, order: 'BA', show: ['v', 'mid'],
        explanation: `…sending v to Av = ${pair(Av)}.` });
    push({ kind: 'compose', A: SHEAR, B: ROTATE, M: mul(lerp(ID, ROTATE, 0.5), SHEAR), order: 'BA', show: ['v', 'mid'],
        explanation: 'Then B turns the sheared grid a quarter turn…' });
    push({ kind: 'compose', A: SHEAR, B: ROTATE, M: BA, order: 'BA', show: ['v', 'mid', 'final'],
        explanation: `…and v lands at BAv = ${pair(BAv)}, not ${pair(ABv)}. BA = ${rowText(BA)} but AB = ${rowText(AB)}: AB ≠ BA. Order matters because shearing a rotated grid is not rotating a sheared one.` });

    entryActs(PAIR2_A, PAIR2_B,
        'A second pair, for practice: A = [(1, −1), (1, 1)] turns and stretches, B = [(1, 0.5), (0.5, 2.5)] stretches along a slant. Same rule — row of A, column of B.');
    push({ kind: 'closing', A: SHEAR, B: ROTATE, M: AB, filled: ['00', '01', '10', '11'], show: ['v', 'mid', 'final', 'columns'],
        explanation: 'Row times column gives each number; one map after another gives the meaning. Switch to Explore to edit A and B, drag their columns, and flip the order.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   "What is entry (i, j)?" offers the classic slips: row times row, column
   times column, the entry of BA instead, and multiplying the two (i, j)
   entries. "Where does v land?" offers the other order, and each matrix on
   its own. Duplicates of the right answer are replaced from further down. */
const pickWrong = (correct, candidates, label) => {
    const seen = new Set([label(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (seen.has(label(c))) continue;
        seen.add(label(c));
        wrong.push(c);
    }
    return wrong;
};

const predictFor = (step) => {
    if (!step) return null;
    if (step.kind === 'entry-intro') {
        const { A, B } = step;
        const [i, j] = step.entry;
        const correct = mul(A, B)[i][j];
        const ordered = pickWrong(correct, [
            A[i][0] * B[j][0] + A[i][1] * B[j][1],     // row times row
            A[0][i] * B[0][j] + A[1][i] * B[1][j],     // column times column
            mul(B, A)[i][j],                           // the other order
            A[i][j] * B[i][j],                         // matching entries
            correct + 1, correct - 1,
        ], num);
        ordered.splice(step.slot, 0, correct);
        return {
            question: `A = ${rowText(A)}, B = ${rowText(B)} (rows). What is entry (${i + 1}, ${j + 1}) of AB?`,
            options: ordered.map(num),
            correct: step.slot,
            because: `Row ${i + 1} of A times column ${j + 1} of B: ${entryWorking(A, B, i, j)} = ${num(correct)}.`,
        };
    }
    if (step.kind === 'compose-intro') {
        const { A, B, order } = step;
        const product = order === 'AB' ? mul(A, B) : mul(B, A);
        const other = order === 'AB' ? mul(B, A) : mul(A, B);
        const correct = apply(product, V);
        const ordered = pickWrong(correct, [apply(other, V), apply(B, V), apply(A, V), V], pair);
        ordered.splice(step.slot, 0, correct);
        const [first, second] = order === 'AB' ? ['B', 'A'] : ['A', 'B'];
        return {
            question: `${order} means ${first} first, then ${second}. Where does v = (2, 1) land?`,
            options: ordered.map(pair),
            correct: step.slot,
            because: `${first}v = ${pair(apply(order === 'AB' ? B : A, V))}, and then ${second} sends that to ${pair(correct)}.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'A is 2×3 and B is 3×4. What shape is AB?',
        options: ['3×3', '2×4', '4×2', 'AB is not defined'],
        correct: 1,
        explanation: 'Each row of A (length 3) meets each column of B (length 3), so the inner sizes match. AB has one row per row of A and one column per column of B: 2×4.',
    },
    {
        question: 'Applied to a vector, what does AB do?',
        options: ['Applies A, then B', 'Applies B, then A', 'Applies both at once, in either order', 'Multiplies matching entries'],
        correct: 1,
        explanation: '(AB)v = A(Bv): B acts on v first, then A acts on the result. It reads right to left, like function composition f(g(x)).',
    },
    {
        question: 'A has rows (1, 2) and (3, 4); B has rows (0, 1) and (1, 0). What is the first row of AB?',
        options: ['(1, 2)', '(3, 4)', '(2, 1)', '(0, 1)'],
        correct: 2,
        explanation: 'Row 1 of A is (1, 2). Times column 1 of B, (0, 1): 0 + 2 = 2. Times column 2, (1, 0): 1 + 0 = 1. So the first row is (2, 1) — B swaps A\'s columns.',
    },
];

const codeExample = `import numpy as np

A = np.array([[1, 2],
              [0, 1]])      # a shear
B = np.array([[0, -1],
              [1,  0]])     # a quarter turn

AB = A @ B
print(AB)                   # [[ 2 -1]
                            #  [ 1  0]]
print(A[0, :] @ B[:, 0])    # 2 -- entry (1, 1): row 1 of A times column 1 of B

v = np.array([2, 1])
print(AB @ v, A @ (B @ v))  # [3 2] [3 2] -- AB means B first, then A
print(B @ A @ v)            # [-1  4] -- the other order lands elsewhere
print(np.array_equal(A @ B, B @ A))   # False`;

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

const ALL_ENTRIES = ['00', '01', '10', '11'];

/** One matrix as a 2×2 block of cells, with a row or column picked out. */
function MatrixCells({ label, M, row = null, colIdx = null, cell = null, hidden = () => false, tone = 'violet' }) {
    const ring = tone === 'pink' ? 'ring-pink-400 bg-pink-500/20 text-pink-100' : 'ring-violet-400 bg-violet-500/20 text-violet-100';
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-300">{label}</span>
            <div className="grid grid-cols-2 gap-1 px-1.5 py-1 border-l-2 border-r-2 border-slate-500 rounded">
                {M.map((r, i) => r.map((x, j) => {
                    const on = row === i || colIdx === j || (cell && cell[0] === i && cell[1] === j);
                    return (
                        <span key={`${i}${j}`} className={`w-11 text-center font-mono text-sm rounded px-1 py-0.5 transition-colors ${on ? `ring-1 ${ring}` : 'text-slate-200'}`}>
                            {hidden(i, j) ? '?' : num(x)}
                        </span>
                    );
                }))}
            </div>
        </div>
    );
}

export default function MatrixMultiplicationPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [A, setA] = useState(SHEAR);
    const [B, setB] = useState(ROTATE);
    const [order, setOrder] = useState('AB');
    const [dragWhich, setDragWhich] = useState('B');
    const [v, setV] = useState(V);
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

    const guided = mode === 'guided';
    const mA = guided ? step.A : A;
    const mB = guided ? step.B : B;
    const ord = guided ? step.order : order;
    const product = ord === 'AB' ? mul(mA, mB) : mul(mB, mA);
    const firstM = ord === 'AB' ? mB : mA;
    const shown = guided ? step.M : product;
    const vec = guided ? V : v;
    const show = guided ? step.show : ['v', 'mid', 'final', 'columns'];
    const has = (k) => show.includes(k);
    const mid = apply(firstM, vec);
    const fin = apply(product, vec);
    const hideNumbers = guided && predict.hideExplanation;
    const iHat = [shown[0][0], shown[1][0]], jHat = [shown[0][1], shown[1][1]];

    const takeOver = () => {
        if (guided) { setA(step.A); setB(step.B); setOrder(step.order); setV(V); setMode('explore'); setIsPlaying(false); }
    };
    const map = useCallback((p) => apply(shown, p), [shown]);
    const mapFirst = useCallback((p) => apply(firstM, p), [firstM]);
    // Dragging a column of A or B edits that matrix.
    const editing = dragWhich === 'A' ? mA : mB;
    const setEditing = dragWhich === 'A' ? setA : setB;
    const dragCol = (j) => (p) => { takeOver(); setEditing(M => M.map((r, i) => r.map((x, k) => (k === j ? p[i] : x)))); };

    const entry = guided ? step.entry : null;
    const filled = guided ? step.filled : ALL_ENTRIES;
    const productLabel = ord === 'AB' ? 'AB' : 'BA';

    const formula = useMemo(() => {
        const [L, R] = ord === 'AB' ? [mA, mB] : [mB, mA];
        const head = String.raw`${ord === 'AB' ? 'AB' : 'BA'} = ${texMatrix(L)}${texMatrix(R)} = \begin{bmatrix} ${product.map((r, i) => r.map((x, j) => (filled.includes(`${i}${j}`) ? fmt(x) : '?')).join(' & ')).join(String.raw` \\ `)} \end{bmatrix}`;
        if (entry) {
            const [i, j] = entry;
            const done = filled.includes(`${i}${j}`);
            const terms = L[i].map((x, k) => String.raw`(${fmt(x)})(${fmt(R[k][j])})`).join(' + ');
            return head + String.raw` \qquad (AB)_{${i + 1}${j + 1}} = ${terms}${done ? ` = ${fmt(product[i][j])}` : ''}`;
        }
        return head;
    }, [ord, mA, mB, product, entry, filled]);
    const formulaV = useMemo(() => String.raw`${productLabel}\,\mathbf{v} = ${ord === 'AB' ? 'A' : 'B'}\big(${ord === 'AB' ? 'B' : 'A'}\mathbf{v}\big) = ${ord === 'AB' ? 'A' : 'B'}\begin{bmatrix} ${fmt(mid[0])} \\ ${fmt(mid[1])} \end{bmatrix} = \textcolor{${MATH_COLORS.result}}{\begin{bmatrix} ${fmt(fin[0])} \\ ${fmt(fin[1])} \end{bmatrix}}`, [productLabel, ord, mid, fin]);

    const other = ord === 'AB' ? mul(mB, mA) : mul(mA, mB);
    const commute = other.every((r, i) => r.every((x, j) => Math.abs(x - product[i][j]) < 1e-9));
    const exploreNote = `${productLabel}v = ${pair(fin)}: ${ord === 'AB' ? 'B' : 'A'} first sends v to ${pair(mid)}, then ${ord === 'AB' ? 'A' : 'B'} finishes the job. ${commute ? 'These two matrices happen to commute: the other order lands in the same place.' : `The other order would land at ${pair(apply(other, vec))}.`}`;

    const showMid = has('mid');

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/linear-algebra" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Linear Algebra
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Matrix Multiplication</h1>
                    <p className="text-violet-100 max-w-3xl">
                        Row times column gives the numbers. One transformation followed by another gives the meaning — and explains why AB and BA are different.
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
                                        onClick={() => { if (key === 'explore' && guided) takeOver(); else { setMode(key); setIsPlaying(false); } }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : `Drag ${dragWhich}'s columns or v, or type the entries`}
                            </span>
                        </div>

                        {!hideNumbers && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                                <MatrixCells label={ord === 'AB' ? 'A' : 'B'} M={ord === 'AB' ? mA : mB} row={entry ? entry[0] : null} />
                                <MatrixCells label={ord === 'AB' ? 'B' : 'A'} M={ord === 'AB' ? mB : mA} colIdx={entry ? entry[1] : null} />
                                <span className="text-slate-500">=</span>
                                <MatrixCells label={productLabel} M={product} cell={entry} tone="pink" hidden={(i, j) => !filled.includes(`${i}${j}`)} />
                            </div>
                        )}

                        <Plane2D xRange={[-5, 5]} yRange={[-5, 5]} ariaLabel="The grid after the matrices act, and the path of v through them">
                            {!guided && <MappedGrid map={mapFirst} range={8} color="#64748b" opacity={0.25} />}
                            <MappedGrid map={map} range={8} color="#8b5cf6" opacity={0.45} />
                            {has('v') && <Vector to={vec} color={MATH_COLORS.a} width={2.5} label="v" dashed={has('final')} opacity={has('final') ? 0.6 : 1}
                                onDrag={(p) => { takeOver(); setV(p); }} snap={0.25} />}
                            {showMid && <Vector to={mid} color={MATH_COLORS.b} width={2.5} label={`${ord === 'AB' ? 'B' : 'A'}v`} dashed={has('final')} opacity={0.8} />}
                            {has('final') && <Vector to={fin} color={MATH_COLORS.result} width={3.5} label={`${productLabel}v`} />}
                            {has('columns') && (
                                <>
                                    <Vector to={iHat} color={MATH_COLORS.i} width={3} label="î′" />
                                    <Vector to={jHat} color={MATH_COLORS.j} width={3} label="ĵ′" />
                                </>
                            )}
                            {!guided && (
                                <>
                                    <Vector to={[editing[0][0], editing[1][0]]} color={MATH_COLORS.i} width={2} dashed label={`${dragWhich}î`} onDrag={dragCol(0)} snap={0.25} />
                                    <Vector to={[editing[0][1], editing[1][1]]} color={MATH_COLORS.j} width={2} dashed label={`${dragWhich}ĵ`} onDrag={dragCol(1)} snap={0.25} />
                                </>
                            )}
                        </Plane2D>

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
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-violet-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => setOrder(o => (o === 'AB' ? 'BA' : 'AB'))}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500">
                                    <ArrowRightLeft className="h-3.5 w-3.5" />Showing {order} — switch to {order === 'AB' ? 'BA' : 'AB'}
                                </button>
                                <span className="text-xs text-slate-500 ml-2">Drag the columns of</span>
                                {['A', 'B'].map(k => (
                                    <button key={k} onClick={() => setDragWhich(k)} aria-pressed={dragWhich === k}
                                        className={`text-xs px-3 py-1.5 rounded-lg border font-mono ${dragWhich === k ? 'border-violet-500 bg-violet-500/15 text-violet-200' : 'border-slate-700 text-slate-300 hover:border-violet-500'}`}>{k}</button>
                                ))}
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
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-sm text-slate-500">
                            The numbers are hidden until you answer the prediction.
                        </div>
                    ) : (
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <MatrixInput label="A" value={mA} step={0.25} columnColors={[MATH_COLORS.i, MATH_COLORS.j]}
                                    onChange={(m) => { takeOver(); setA(m); }} />
                                <MatrixInput label="B" value={mB} step={0.25} columnColors={[MATH_COLORS.i, MATH_COLORS.j]}
                                    onChange={(m) => { takeOver(); setB(m); }} />
                                <MatrixInput label="v" value={[[vec[0]], [vec[1]]]} step={0.25} columnColors={[MATH_COLORS.a]}
                                    onChange={(m) => { takeOver(); setV([m[0][0], m[1][0]]); }} />
                            </div>
                            <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                <Tex block>{formula}</Tex>
                                {(has('final') || !guided) && <Tex block>{formulaV}</Tex>}
                            </div>
                            <p className="text-xs text-slate-500">
                                Read AB right to left: B acts first. Its columns are A applied to B&apos;s columns — where î and ĵ end up after both moves.
                            </p>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Two views of AB</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-violet-300 font-semibold">Numbers</span> — entry (i, j) is row i of A times column j of B.</li>
                            <li><span className="text-pink-400 font-semibold">Picture</span> — do B, then A: (AB)v = A(Bv).</li>
                            <li><span className="text-green-400 font-semibold">Columns</span> — column j of AB is A times column j of B.</li>
                            <li><span className="text-slate-200 font-semibold">Order</span> — AB ≠ BA in general; but (AB)C = A(BC) always.</li>
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
