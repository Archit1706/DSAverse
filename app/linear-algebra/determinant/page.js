"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Square, Box,
} from 'lucide-react';
import Plane2D, { Vector, Polygon, Label, MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import MatrixInput from '@/components/math/MatrixInput';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Matrices are stored as rows; their columns are where the basis vectors land. */
const ID2 = [[1, 0], [0, 1]];
const ID3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const col = (M, j) => M.map(r => r[j]);
const det2 = (M) => M[0][0] * M[1][1] - M[0][1] * M[1][0];
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dot = (u, v) => u.reduce((s, x, i) => s + x * v[i], 0);
/** det [a b c] = a · (b × c), the signed volume of the parallelepiped they span. */
const det3 = (M) => dot(col(M, 0), cross(col(M, 1), col(M, 2)));
const lerpMatrix = (A, B, t) => A.map((row, i) => row.map((v, j) => v + (B[i][j] - v) * t));
const fmt = (x) => texNum(x, 2);
const near0 = (x) => Math.abs(x) < 1e-9;

const PRESETS_2D = [
    { name: 'Stretch', M: [[3, 0], [0, 1]], note: 'Widening by 3 and leaving the height alone triples every area.' },
    { name: 'Shear', M: [[1, 1.5], [0, 1]], note: 'The square leans into a parallelogram with the same base and height, so the area — and the determinant — is still 1.' },
    { name: 'Mix', M: [[2, 1], [1, 2]], note: 'Neither column lies on an axis now, but the rule still holds: ad − bc = 4 − 1 = 3, and the parallelogram is three times the square.' },
    { name: 'Swap î and ĵ', M: [[0, 1], [1, 0]], note: 'The area is still 1, but going from î to ĵ is now clockwise. The plane has been flipped over, and the determinant records that with a minus sign.' },
    { name: 'Flatten', M: [[2, 1], [4, 2]], note: 'The second column is half the first, so both lie on one line. The square collapses to a segment with no area: det = 0, and the matrix has no inverse.' },
];

const PRESETS_3D = [
    { name: 'Stretch', M: [[2, 0, 0], [0, 1, 0], [0, 0, 1.5]], note: 'A diagonal matrix scales each axis: 2 × 1 × 1.5 = 3 times the volume of the cube.' },
    { name: 'Shear', M: [[1, 1, 0], [0, 1, 0], [0, 0, 1]], note: 'The cube slants, but its base and height are unchanged, so the volume stays 1.' },
    { name: 'Tilt', M: [[1, 0.5, 0.3], [0.2, 1.2, 0], [0, 0.4, 1.5]], note: 'With every column tilted, only a · (b × c) gives the volume directly: the area of the b, c face times the height of a above it.' },
    { name: 'Mirror', M: [[1, 0, 0], [0, 1, 0], [0, 0, -1]], note: 'k̂ flips to point down. The volume is unchanged, but the shape is mirrored — a right hand would become a left hand — so the sign is negative.' },
    { name: 'Collapse', M: [[1, 0, 1], [0, 1, 1], [0, 0, 0]], note: 'The third column is the sum of the first two, so all three lie in the xy-plane. The box flattens into a sheet with no volume: det = 0.' },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    steps.push({
        kind: 'opening', dim: 2, M: ID2,
        explanation: 'Start with the unit square: î and ĵ, area 1. Any matrix moves it to a parallelogram spanned by its two columns. The determinant is that parallelogram\'s area — with a sign.',
    });
    PRESETS_2D.forEach((p, idx) => {
        const d = det2(p.M);
        steps.push({ kind: 'intro', dim: 2, M: ID2, target: p.M, index: idx,
            explanation: `Next: ${p.name}, columns (${fmt(p.M[0][0])}, ${fmt(p.M[1][0])}) and (${fmt(p.M[0][1])}, ${fmt(p.M[1][1])}). Its determinant is ad − bc = ${fmt(d)}.` });
        steps.push({ kind: 'morph', dim: 2, M: lerpMatrix(ID2, p.M, 0.5), target: p.M, index: idx,
            explanation: `${p.name}: the square is carried along with î and ĵ. Watch its area as it moves.` });
        steps.push({ kind: 'landed', dim: 2, M: p.M, target: p.M, index: idx,
            explanation: `det = (${fmt(p.M[0][0])})(${fmt(p.M[1][1])}) − (${fmt(p.M[0][1])})(${fmt(p.M[1][0])}) = ${fmt(d)}. ${p.note}` });
    });
    steps.push({
        kind: 'opening', dim: 3, M: ID3,
        explanation: 'The same idea one dimension up. Three columns span a slanted box — a parallelepiped — from the unit cube. The determinant is its volume, with a sign. Drag to look at it from any side.',
    });
    PRESETS_3D.forEach((p, idx) => {
        const d = det3(p.M);
        steps.push({ kind: 'intro', dim: 3, M: ID3, target: p.M, index: idx + PRESETS_2D.length,
            explanation: `Next in 3D: ${p.name}. Its determinant is a · (b × c) = ${fmt(d)}.` });
        steps.push({ kind: 'morph', dim: 3, M: lerpMatrix(ID3, p.M, 0.5), target: p.M, index: idx + PRESETS_2D.length,
            explanation: `${p.name}: the cube is carried along with î, ĵ and k̂.` });
        steps.push({ kind: 'landed', dim: 3, M: p.M, target: p.M, index: idx + PRESETS_2D.length,
            explanation: `det = ${fmt(d)}. ${p.note}` });
    });
    steps.push({
        kind: 'closing', dim: 3, M: ID3,
        explanation: 'Positive: space is scaled. Negative: scaled and mirrored. Zero: flattened, and nothing can undo it. Switch to Explore to try your own matrices.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each matrix plays: what will the determinant be? The wrong answers
   are the usual slips — adding instead of subtracting, multiplying only the
   diagonal, dropping the sign. Duplicates of the right answer are replaced. */
const predictFor = (step) => {
    if (!step || step.kind !== 'intro') return null;
    const M = step.target;
    const is2 = step.dim === 2;
    const correct = is2 ? det2(M) : det3(M);
    const diagonal = is2 ? M[0][0] * M[1][1] : M[0][0] * M[1][1] * M[2][2];
    const plusSlip = is2 ? M[0][0] * M[1][1] + M[0][1] * M[1][0] : null;
    const trace = is2 ? M[0][0] + M[1][1] : M[0][0] + M[1][1] + M[2][2];
    const candidates = [plusSlip, diagonal, -correct, trace, correct + 1, correct - 1, correct + 2]
        .filter(x => x !== null);
    const seen = new Set([fmt(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (seen.has(fmt(c))) continue;
        seen.add(fmt(c));
        wrong.push(c);
    }
    const slot = (step.index * 3 + 1) % 4;
    const ordered = [...wrong];
    ordered.splice(slot, 0, correct);
    const name = (is2 ? PRESETS_2D : PRESETS_3D)[is2 ? step.index : step.index - PRESETS_2D.length].name;
    return {
        question: is2
            ? `${name}: columns (${fmt(M[0][0])}, ${fmt(M[1][0])}) and (${fmt(M[0][1])}, ${fmt(M[1][1])}). What is the determinant?`
            : `${name} in 3D. What is the determinant — the signed volume of the box?`,
        options: ordered.map(fmt),
        correct: slot,
        because: is2
            ? `ad − bc = (${fmt(M[0][0])})(${fmt(M[1][1])}) − (${fmt(M[0][1])})(${fmt(M[1][0])}) = ${fmt(correct)}.`
            : `a · (b × c) = ${fmt(correct)}. ${(PRESETS_3D[step.index - PRESETS_2D.length]).note}`,
    };
};

const quizQuestions = [
    {
        question: 'A matrix has determinant 6. A shape of area 5 goes through it. What is the new area?',
        options: ['11', '5', '30', '6'],
        correct: 2,
        explanation: 'The determinant is the factor every area is multiplied by — not just the unit square\'s. 5 × 6 = 30.',
    },
    {
        question: 'A 2×2 matrix has determinant −1. What does that tell you?',
        options: [
            'Areas are unchanged, but the plane is flipped over',
            'Areas shrink to nothing',
            'Every vector points the opposite way',
            'The matrix cannot be undone',
        ],
        correct: 0,
        explanation: '|det| = 1 means areas keep their size; the minus sign means orientation reversed — î to ĵ turns the other way, like a mirror image. Only det = 0 makes a matrix impossible to undo.',
    },
    {
        question: 'For a 3×3 matrix, det [a b c] = 0. What does the box spanned by a, b and c look like?',
        options: ['A cube', 'Flat — the three columns lie in one plane (or on one line)', 'Twice as tall as the unit cube', 'Turned inside out'],
        correct: 1,
        explanation: 'Zero volume means the box has collapsed: one column is a combination of the others, so all three lie in a plane or on a line. Space is squashed and the matrix has no inverse.',
    },
];

const codeExample = `import numpy as np

A = np.array([[2, 1],
              [1, 2]])
print(np.linalg.det(A))        # 3.0 -- the unit square's image has area 3

# In 3D the determinant is the scalar triple product a . (b x c):
M = np.array([[1, 0.5, 0.3],
              [0.2, 1.2, 0.0],
              [0.0, 0.4, 1.5]])
a, b, c = M[:, 0], M[:, 1], M[:, 2]
print(np.linalg.det(M))                 # signed volume of the parallelepiped
print(np.dot(a, np.cross(b, c)))        # the same number

# Columns that lie in one plane give a flat box, and no inverse:
S = np.array([[1, 0, 1],
              [0, 1, 1],
              [0, 0, 0]])
print(np.linalg.det(S))        # 0.0`;

/* ── page ──────────────────────────────────────────────── */

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white mt-2">Retake</button>
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

export default function DeterminantPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1300);
    const [tab, setTab] = useState(2);                         // explore-mode dimension
    const [A, setA] = useState([[2, 1], [1, 2]]);             // explore 2×2
    const [B, setB] = useState([[1, 0.5, 0.3], [0.2, 1.2, 0], [0, 0.4, 1.5]]);   // explore 3×3
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

    const dim = mode === 'guided' ? step.dim : tab;
    const M2 = mode === 'guided' && step.dim === 2 ? step.M : A;
    const M3 = mode === 'guided' && step.dim === 3 ? step.M : B;
    const d2 = det2(M2);
    const d3 = det3(M3);

    const goExplore = (nextTab) => {
        if (mode === 'guided') {
            if (step.dim === 2) setA(step.M.map(r => [...r])); else setB(step.M.map(r => [...r]));
            setMode('explore'); setIsPlaying(false);
        }
        if (nextTab) setTab(nextTab);
    };

    /* 2D picture */
    const i2 = col(M2, 0), j2 = col(M2, 1);
    const square = [[0, 0], i2, [i2[0] + j2[0], i2[1] + j2[1]], j2];
    const centre = [(i2[0] + j2[0]) / 2, (i2[1] + j2[1]) / 2];
    const tone2 = near0(d2) ? MATH_COLORS.negative : d2 < 0 ? MATH_COLORS.negative : MATH_COLORS.area;

    /* 3D picture */
    const a3 = col(M3, 0), b3 = col(M3, 1), c3 = col(M3, 2);
    const bc = cross(b3, c3);
    const tone3 = near0(d3) ? '#fb7185' : d3 < 0 ? '#fb7185' : '#a78bfa';

    const formula2 = useMemo(() => String.raw`\det\begin{bmatrix} ${fmt(M2[0][0])} & ${fmt(M2[0][1])} \\ ${fmt(M2[1][0])} & ${fmt(M2[1][1])} \end{bmatrix}`
        + String.raw` = (${fmt(M2[0][0])})(${fmt(M2[1][1])}) - (${fmt(M2[0][1])})(${fmt(M2[1][0])}) = \mathbf{${fmt(d2)}}`, [M2, d2]);
    const formula3 = useMemo(() => String.raw`\det[\,\mathbf{a}\;\mathbf{b}\;\mathbf{c}\,] = \mathbf{a}\cdot(\mathbf{b}\times\mathbf{c})`
        + String.raw` = (${fmt(a3[0])}, ${fmt(a3[1])}, ${fmt(a3[2])})\cdot(${fmt(bc[0])}, ${fmt(bc[1])}, ${fmt(bc[2])}) = \mathbf{${fmt(d3)}}`, [a3, bc, d3]);

    const exploreNote = dim === 2
        ? near0(d2) ? 'The columns lie on one line, so the square collapses: no area, and the matrix has no inverse.'
            : `The unit square becomes a parallelogram of area ${fmt(Math.abs(d2))}.${d2 < 0 ? ' The sign is negative because î → ĵ now turns clockwise: the plane is flipped.' : ''}`
        : near0(d3) ? 'The three columns lie in one plane, so the box is flat: no volume, and no inverse.'
            : `The unit cube becomes a box of volume ${fmt(Math.abs(d3))}.${d3 < 0 ? ' The sign is negative: the box is a mirror image of the cube.' : ''}`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/linear-algebra" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Linear Algebra
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Determinant</h1>
                    <p className="text-violet-100 max-w-3xl">
                        Not a formula to memorise — the factor by which a matrix scales area in 2D and volume in 3D. Negative means flipped. Zero means squashed flat.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                                {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={mode === key}
                                        onClick={() => { if (key === 'explore') goExplore(step.dim); else { setMode('guided'); } }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Dimension">
                                {[[2, '2D: area', Square], [3, '3D: volume', Box]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={dim === key}
                                        onClick={() => goExplore(key)}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${dim === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {dim === 2 ? (
                            <Plane2D xRange={[-2.5, 4.5]} yRange={[-2.5, 4.5]} ariaLabel="The unit square and its image under the matrix">
                                <Polygon points={[[0, 0], [1, 0], [1, 1], [0, 1]]} fill="#475569" fillOpacity={0.15} strokeWidth={1} />
                                <Polygon points={square} fill={tone2} fillOpacity={0.3} />
                                {!near0(d2) && (
                                    <Label at={centre} anchor="middle" dy={4} color={tone2} size={14} weight={700}>
                                        {d2 < 0 ? `area ${fmt(Math.abs(d2))} (flipped)` : `area ${fmt(d2)}`}
                                    </Label>
                                )}
                                <Vector to={i2} color={MATH_COLORS.i} label="î" width={3.5} snap={0.25}
                                    onDrag={([x, y]) => { goExplore(2); setA(m => [[x, m[0][1]], [y, m[1][1]]]); }} />
                                <Vector to={j2} color={MATH_COLORS.j} label="ĵ" width={3.5} snap={0.25}
                                    onDrag={([x, y]) => { goExplore(2); setA(m => [[m[0][0], x], [m[1][0], y]]); }} />
                            </Plane2D>
                        ) : (
                            <Scene3D height={420} ariaLabel="The unit cube and the parallelepiped spanned by the matrix columns"
                                fallback={<p className="text-sm text-slate-300 font-mono">det = {fmt(d3)}</p>}>
                                {(P) => (
                                    <>
                                        <P.Parallelepiped a={[1, 0, 0]} b={[0, 1, 0]} c={[0, 0, 1]} color="#475569" opacity={0.08} />
                                        <P.Parallelepiped a={a3} b={b3} c={c3} color={tone3} opacity={0.32} />
                                        <P.Arrow3D to={a3} color={MATH_COLORS.i} label="a" />
                                        <P.Arrow3D to={b3} color={MATH_COLORS.j} label="b" />
                                        <P.Arrow3D to={c3} color={MATH_COLORS.k} label="c" />
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
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="violet" />
                                <span className="text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-violet-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {(dim === 2 ? PRESETS_2D : PRESETS_3D).map(p => (
                                    <button key={p.name} onClick={() => (dim === 2 ? setA(p.M.map(r => [...r])) : setB(p.M.map(r => [...r])))}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500">{p.name}</button>
                                ))}
                                <button onClick={() => (dim === 2 ? setA(ID2.map(r => [...r])) : setB(ID3.map(r => [...r])))}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-violet-500">Identity</button>
                            </div>
                        )}
                    </div>

                    {mode === 'guided' && predict.prompt && <PredictPrompt predict={predict} accent="violet" />}

                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-violet-400 mt-0.5 flex-shrink-0" />
                            <p className="text-violet-200 text-sm leading-relaxed">
                                {mode === 'guided'
                                    ? (predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation)
                                    : exploreNote}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                        {dim === 2 ? (
                            <MatrixInput label="A" value={M2} step={0.25} columnColors={[MATH_COLORS.i, MATH_COLORS.j]}
                                onChange={(next) => { goExplore(2); setA(next); }} />
                        ) : (
                            <MatrixInput label="M" value={M3} step={0.25} columnColors={[MATH_COLORS.i, MATH_COLORS.j, MATH_COLORS.k]}
                                onChange={(next) => { goExplore(3); setB(next); }} />
                        )}
                        <div className="text-slate-100 text-sm sm:text-base">
                            <Tex block>{dim === 2 ? formula2 : formula3}</Tex>
                        </div>
                        <p className="text-xs text-slate-500">
                            {dim === 2
                                ? 'ad − bc is the area of the parallelogram: the big rectangle (a + b)(c + d) minus the corner pieces that are not inside it.'
                                : 'b × c is perpendicular to the face spanned by b and c, with length equal to that face\'s area. Dotting with a multiplies by a\'s height above the face — base times height.'}
                        </p>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">What the sign means</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-yellow-300 font-semibold">det &gt; 0</span> — space is scaled, orientation kept.</li>
                            <li><span className="text-rose-300 font-semibold">det &lt; 0</span> — scaled and mirrored: î → ĵ turns the other way.</li>
                            <li><span className="text-rose-300 font-semibold">det = 0</span> — flattened onto a line or plane. No inverse exists.</li>
                            <li><span className="text-slate-300 font-semibold">det(AB) = det(A)·det(B)</span> — doing two scalings multiplies them.</li>
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
