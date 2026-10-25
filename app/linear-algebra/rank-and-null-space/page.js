"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import { MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import MatrixInput from '@/components/math/MatrixInput';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum, texMatrix } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────── */
const EPS = 1e-9;
const clean = (x) => (Math.abs(x) < EPS ? 0 : Math.round(x * 1e12) / 1e12);
const ID = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const apply = (M, v) => M.map(row => row.reduce((s, x, k) => s + x * v[k], 0));
const col = (M, j) => M.map(r => r[j]);
const lerp = (P, Q, t) => P.map((row, i) => row.map((x, j) => x + (Q[i][j] - x) * t));
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const norm = (u) => Math.sqrt(u.reduce((s, x) => s + x * x, 0));

/** Row reduction: the reduced matrix, its pivot columns, the rank and a null-space basis. */
const analyse = (A) => {
    const M = A.map(r => [...r]);
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
    const free = [0, 1, 2].filter(c => !pivots.includes(c));
    const nullBasis = free.map(f => {
        const v = [0, 0, 0];
        v[f] = 1;
        pivots.forEach((c, i) => { v[c] = clean(-M[i][f]); });
        return v;
    });
    return { R: M, pivots, rank: pivots.length, nullBasis };
};
/** The columns that carry a pivot: a basis for the column space. */
const columnBasis = (A) => analyse(A).pivots.map(c => col(A, c));

const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const triple = (u) => `(${u.map(num).join(', ')})`;
const rowsText = (M) => `[${M.map(r => `(${r.map(num).join(', ')})`).join(', ')}]`;
const SPACE = ['the origin', 'a line', 'a plane', 'all of 3D space'];

/** Two matrices of each rank, in a mixed order. */
const PRESETS = [
    { name: 'Column 3 = 1 + 2', A: [[1, 0, 1], [0, 1, 1], [1, 1, 2]] },
    { name: 'Every column on one line', A: [[1, 2, -1], [0.5, 1, -0.5], [1, 2, -1]] },
    { name: 'Nothing lost', A: [[1, 0, 1], [0, 1, 1], [1, 1, 3]] },
    { name: 'Another line', A: [[0.5, -1, 1], [0, 0, 0], [1, -2, 2]] },
    { name: 'A shear', A: [[2, 0, 0], [0, 1, 0], [1, 0, 1]] },
    { name: 'Column 3 = 1 − 2·(2)', A: [[2, 1, 0], [1, 0, 1], [0, 1, -2]] },
];
const RANK_LABELS = ['1', '2', '3'];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let prompt = 0;
    const push = (s) => steps.push({ t: 1, show: ['columns', 'box'], ...s });
    push({ kind: 'opening', A: ID, t: 1, show: ['columns', 'box'],
        explanation: 'The identity leaves the unit cube alone: three independent columns, and every point of 3D space is still reachable. Most matrices bend the cube into a slanted box. Some flatten it.' });
    PRESETS.forEach((pr, pi) => {
        const A = pr.A;
        const { rank, nullBasis, R } = analyse(A);
        push({ kind: 'rank-intro', A, t: 0, presetIndex: pi, show: ['columns'],
            explanation: `A = ${rowsText(A)} (rows). Its columns are ${[0, 1, 2].map(j => triple(col(A, j))).join(', ')}. What is its rank — the dimension of everything A can output?` });
        push({ kind: 'squash', A, t: 0.5, presetIndex: pi, show: ['columns', 'box'],
            explanation: 'Apply A to the whole unit cube…' });
        push({ kind: 'squash', A, t: 1, presetIndex: pi, show: ['columns', 'box', 'colspace'],
            explanation: rank === 3
                ? '…and it becomes a slanted box with real volume. Nothing collapsed: the columns point in three independent directions, so the outputs fill all of 3D. Rank 3.'
                : `…and it collapses onto ${SPACE[rank]} — the violet ${rank === 2 ? 'plane' : 'line'}. Every output of A lies there. That is the column space, and its dimension, ${rank}, is the rank.` });
        push({ kind: 'rref', A, presetIndex: pi, show: ['columns', 'box', 'colspace'],
            explanation: `Row reduction agrees: the reduced form ${rowsText(R)} has ${rank} pivot${rank === 1 ? '' : 's'}. Rank = number of pivots = number of independent columns.` });
        if (rank < 3) {
            push({ kind: 'null-intro', A, presetIndex: pi, slot: (prompt++ * 3 + 1) % 4, show: ['columns', 'box', 'colspace'],
                explanation: 'Squashing means some directions are lost: whole lines of input land on the single output 0. Which vector does A send to 0?' });
            push({ kind: 'null', A, presetIndex: pi, show: ['columns', 'box', 'colspace', 'nullspace'],
                explanation: nullBasis.length === 1
                    ? `A·${triple(nullBasis[0])} = (0, 0, 0). The green line is every multiple of it: the null space. It is one-dimensional, so the nullity is 1.`
                    : `A sends ${triple(nullBasis[0])} and ${triple(nullBasis[1])} to 0, and every combination of them: the green plane is the null space. Its dimension, the nullity, is 2.` });
        }
        push({ kind: 'count', A, presetIndex: pi, show: ['columns', 'box', 'colspace', 'nullspace'],
            explanation: `rank + nullity = ${rank} + ${3 - rank} = 3. Every one of the three input dimensions either survives into the output or is crushed into the null space.` });
    });
    push({ kind: 'closing', A: PRESETS[0].A, show: ['columns', 'box', 'colspace', 'nullspace'],
        explanation: 'Rank counts the dimensions that survive; nullity counts the ones that are lost; together they make 3. Switch to Explore to type your own matrix and slide the squash.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   "What is the rank?" — the six presets carry two matrices of each rank, so
   the fixed 1 / 2 / 3 buttons are each right a third of the time. "Which
   vector goes to 0?" offers a null vector against three that are not: the
   null vector nudged, a basis vector, and a column of A. */
const predictFor = (step) => {
    if (!step) return null;
    if (step.kind === 'rank-intro') {
        const { rank } = analyse(step.A);
        return {
            question: `Columns ${[0, 1, 2].map(j => triple(col(step.A, j))).join(', ')}. What is the rank of A?`,
            options: [...RANK_LABELS],
            correct: rank - 1,
            because: rank === 3 ? 'No column is a combination of the others: three independent directions.'
                : rank === 2 ? 'One column is a combination of the other two: they span only a plane.'
                    : 'Every column is a multiple of one direction: they span only a line.',
        };
    }
    if (step.kind === 'null-intro') {
        const { nullBasis } = analyse(step.A);
        const nv = nullBasis[0];
        const label = triple;
        const seen = new Set([label(nv)]);
        const wrong = [];
        for (const c of [[nv[0] + 1, nv[1], nv[2]], [1, 1, 1], col(step.A, 0), [1, 0, 0], [0, 1, 0], [0, 0, 1], [nv[0], -nv[1], nv[2]]]) {
            if (wrong.length === 3) break;
            if (seen.has(label(c)) || norm(apply(step.A, c)) < 1e-9) continue;
            seen.add(label(c));
            wrong.push(c);
        }
        wrong.splice(step.slot, 0, nv);
        return {
            question: `A = ${rowsText(step.A)} (rows). Which vector does A send to (0, 0, 0)?`,
            options: wrong.map(label),
            correct: step.slot,
            because: `A·${triple(nv)} = ${triple(apply(step.A, nv).map(clean))}: each row of A dotted with it gives 0.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'A 3×3 matrix has rank 2. What is the dimension of its null space?',
        options: ['0', '1', '2', '3'],
        correct: 1,
        explanation: 'rank + nullity = 3, so nullity = 3 − 2 = 1: a whole line of inputs is sent to 0.',
    },
    {
        question: 'A sends some non-zero vector to 0. What follows?',
        options: ['A has rank 3', 'det A = 0 and A has no inverse', 'A is the zero matrix', 'A must be a rotation'],
        correct: 1,
        explanation: 'If Av = 0 with v ≠ 0, then v and 0 both land on 0, so A cannot be undone and space has been flattened: det A = 0 and the rank is less than 3. A need not be all zeros.',
    },
    {
        question: 'Everything A outputs lies on one line through the origin. What is A\'s rank?',
        options: ['3', '2', '0', '1'],
        correct: 3,
        explanation: 'The rank is the dimension of the column space — the set of all outputs. A line is one-dimensional, so the rank is 1 and the nullity is 2.',
    },
];

const codeExample = `import numpy as np

A = np.array([[1, 0, 1],
              [0, 1, 1],
              [1, 1, 2]], dtype=float)   # column 3 = column 1 + column 2

print(np.linalg.matrix_rank(A))        # 2 -- space is squashed onto a plane

n = np.array([1, 1, -1])
print(A @ n)                           # [0. 0. 0.] -- n is in the null space

# A null-space basis from the SVD: rows of Vt whose singular value is 0
U, s, Vt = np.linalg.svd(A)
null_basis = Vt[s < 1e-10]
print(np.allclose(A @ null_basis.T, 0))          # True
print(np.linalg.matrix_rank(A) + len(null_basis))   # 3 = rank + nullity`;

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

const COLSPACE = '#8b5cf6';
const NULLSPACE = '#34d399';
const longLine = (d, r = 4.5) => {
    const L = norm(d);
    return L < EPS ? null : [d.map(x => (-r * x) / L), d.map(x => (r * x) / L)];
};

export default function RankAndNullSpacePage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [A, setA] = useState(PRESETS[0].A);
    const [t, setT] = useState(1);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[currentStep];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const tm = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(tm);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const guided = mode === 'guided';
    const M = guided ? step.A : A;
    const tt = guided ? step.t : t;
    const show = guided ? step.show : ['columns', 'box', 'colspace', 'nullspace'];
    const has = (k) => show.includes(k);
    const info = useMemo(() => analyse(M), [M]);
    const shown = lerp(ID, M, tt);
    const hideNumbers = guided && predict.hideExplanation;
    const basis = columnBasis(M);
    const colNormal = info.rank === 2 ? cross(basis[0], basis[1]) : null;
    const nullNormal = info.rank === 1 ? M.find(row => norm(row) > EPS) : null;   // the null space is perpendicular to the rows
    const revealRank = !guided || !['rank-intro', 'squash'].includes(step.kind) || step.t === 1;

    const goExplore = () => {
        if (guided) { setA(step.A.map(r => [...r])); setT(1); setMode('explore'); setIsPlaying(false); }
    };

    const formula = useMemo(() => {
        const nb = info.nullBasis;
        const nullTex = nb.length === 0 ? String.raw`\{\mathbf{0}\}`
            : String.raw`\operatorname{span}\left\{${nb.map(v => String.raw`\begin{bmatrix} ${fmt(v[0])} \\ ${fmt(v[1])} \\ ${fmt(v[2])} \end{bmatrix}`).join(', ')}\right\}`;
        return [
            String.raw`\operatorname{rref}(A) = ${texMatrix(info.R)}`,
            String.raw`\operatorname{rank} A = ${info.rank}, \qquad \operatorname{null} A = ${nullTex}, \qquad ${info.rank} + ${3 - info.rank} = 3`,
        ];
    }, [info]);

    const exploreNote = info.rank === 3
        ? 'Rank 3: the columns point three independent ways, the cube becomes a box with volume, and only 0 goes to 0.'
        : `Rank ${info.rank}: every output lies on ${SPACE[info.rank]} (violet), and the null space (green) is ${info.rank === 2 ? 'a line' : info.rank === 1 ? 'a plane' : 'everything'} of inputs that land on 0. ${info.rank} + ${3 - info.rank} = 3.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/linear-algebra" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Linear Algebra
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Rank and Null Space</h1>
                    <p className="text-violet-100 max-w-3xl">
                        Some matrices squash 3D space flat — onto a plane, or even a line. Rank counts the dimensions that survive; the null space is everything crushed to zero.
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
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Type A and slide the squash; drag to orbit'}
                            </span>
                        </div>

                        <Scene3D height={430} distance={12} ariaLabel="The unit cube under A, the column space and the null space"
                            fallback={<p className="text-sm text-slate-300 font-mono">rank {info.rank}, nullity {3 - info.rank}</p>}>
                            {(P) => (
                                <>
                                    <P.Parallelepiped a={[1, 0, 0]} b={[0, 1, 0]} c={[0, 0, 1]} color="#475569" opacity={0.06} />
                                    {has('box') && <P.Parallelepiped a={col(shown, 0)} b={col(shown, 1)} c={col(shown, 2)} color={COLSPACE} opacity={0.3} />}
                                    {has('colspace') && colNormal && <P.Plane3D normal={colNormal} d={0} size={7} color={COLSPACE} opacity={0.16} />}
                                    {has('colspace') && info.rank === 1 && <P.Line3D points={longLine(basis[0])} color={COLSPACE} width={5} />}
                                    {has('nullspace') && info.rank === 2 && <P.Line3D points={longLine(info.nullBasis[0])} color={NULLSPACE} width={4} />}
                                    {has('nullspace') && nullNormal && <P.Plane3D normal={nullNormal} d={0} size={7} color={NULLSPACE} opacity={0.16} />}
                                    {has('nullspace') && info.nullBasis.map((v, i) => (
                                        <P.Arrow3D key={i} to={v} color={NULLSPACE} label={i === 0 ? 'A n = 0' : undefined} radius={0.03} />
                                    ))}
                                    {has('columns') && (
                                        <>
                                            <P.Arrow3D to={col(shown, 0)} color={MATH_COLORS.i} label="col 1" />
                                            <P.Arrow3D to={col(shown, 1)} color={MATH_COLORS.j} label="col 2" />
                                            <P.Arrow3D to={col(shown, 2)} color={MATH_COLORS.k} label="col 3" />
                                        </>
                                    )}
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
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-violet-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-3">
                                <ParamSlider label="Squash: from I to A" value={t} onChange={setT} min={0} max={1} step={0.05} accent="violet"
                                    format={(x) => `${Math.round(x * 100)}%`} hint="At 0% the cube is untouched; at 100% A has acted in full." />
                                <div className="flex flex-wrap items-center gap-2">
                                    {PRESETS.map(p => (
                                        <button key={p.name} onClick={() => setA(p.A.map(r => [...r]))}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500">{p.name}</button>
                                    ))}
                                </div>
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
                        <div className="flex flex-wrap items-center gap-4">
                            <MatrixInput label="A" value={M} step={0.25} columnColors={[MATH_COLORS.i, MATH_COLORS.j, MATH_COLORS.k]}
                                onChange={(next) => { goExplore(); setA(next); }} />
                            <div className="text-sm text-slate-400 space-y-0.5">
                                <div>rank = <span className="font-mono text-violet-300">{revealRank && !hideNumbers ? info.rank : '?'}</span></div>
                                <div>nullity = <span className="font-mono text-emerald-300">{revealRank && !hideNumbers ? 3 - info.rank : '?'}</span></div>
                            </div>
                        </div>
                        {hideNumbers || !revealRank ? (
                            <p className="text-sm text-slate-500">The row reduction appears once the rank is revealed.</p>
                        ) : (
                            <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                {formula.map((f, i) => <Tex key={i} block>{f}</Tex>)}
                            </div>
                        )}
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">What survives, what is lost</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-violet-300 font-semibold">Column space</span> — every output Av; its dimension is the rank.</li>
                            <li><span className="text-emerald-300 font-semibold">Null space</span> — every v with Av = 0; its dimension is the nullity.</li>
                            <li><span className="text-slate-200 font-semibold">rank + nullity = 3</span> — for any matrix with 3 columns.</li>
                            <li><span className="text-rose-300 font-semibold">Rank &lt; 3</span> — det A = 0, and A has no inverse.</li>
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
