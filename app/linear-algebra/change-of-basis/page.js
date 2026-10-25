"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Vector, MappedGrid, Point, MATH_COLORS } from '@/components/math/Plane2D';
import MatrixInput from '@/components/math/MatrixInput';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   B holds the basis vectors as its columns: b₁ = (B₁₁, B₂₁), b₂ = (B₁₂, B₂₂).
   B-coordinates c mean "c₁ of b₁ plus c₂ of b₂", so v = Bc and c = B⁻¹v. */
const EPS = 1e-9;
const apply = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
const det = (M) => M[0][0] * M[1][1] - M[0][1] * M[1][0];
const inv = (M) => {
    const d = det(M);
    if (Math.abs(d) < EPS) return null;
    return [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]];
};
const toBasis = (B, v) => { const I = inv(B); return I ? apply(I, v) : null; };
const fromBasis = (B, c) => apply(B, c);
const columns = (B) => [[B[0][0], B[1][0]], [B[0][1], B[1][1]]];
const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const pair = ([x, y]) => `(${num(x)}, ${num(y)})`;
const basisText = (B) => { const [b1, b2] = columns(B); return `b₁ = ${pair(b1)}, b₂ = ${pair(b2)}`; };

const B1 = [[2, -1], [1, 1]];
const B2 = [[1, 1], [0, 1]];
const B3 = [[1, -1], [1, 1]];
const B4 = [[2, 0], [0, 0.5]];
/** Standard coordinates in, B-coordinates out. */
const TO_B = [
    { B: B1, v: [4, -1] },
    { B: B2, v: [3, 2] },
    { B: B3, v: [0, 2] },
    { B: B4, v: [3, -1] },
];
/** B-coordinates in, standard coordinates out. */
const FROM_B = [
    { B: B1, c: [2, 1] },
    { B: B2, c: [-2, 1] },
    { B: B3, c: [0.5, 1.5] },
    { B: B4, c: [1, 4] },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let prompt = 0;
    const push = (s) => steps.push({ show: [], ...s });
    const V = [1, 2];
    push({ kind: 'opening', B: B1, v: V, show: ['std'],
        explanation: 'v = (1, 2) in the usual coordinates: 1 step along î, 2 along ĵ. Those numbers depend on the grid you measure with. Change the grid and the same arrow gets different numbers.' });
    push({ kind: 'teach', B: B1, v: V, show: ['std', 'bgrid'],
        explanation: 'A new basis: b₁ = (2, 1) in amber and b₂ = (−1, 1) in purple. The violet grid is built from them, the way the usual grid is built from î and ĵ.' });
    push({ kind: 'teach', B: B1, v: V, show: ['bgrid', 'walk'],
        explanation: 'On the new grid, v is 1 step along b₁ and then 1 step along b₂. So its B-coordinates are [v]_B = (1, 1). Same arrow, new numbers.' });
    push({ kind: 'teach', B: B1, v: V, show: ['bgrid', 'walk', 'coords'],
        explanation: 'Going from B-coordinates to standard ones is just the combination: v = 1·b₁ + 1·b₂ = B·(1, 1), where B has b₁ and b₂ as its columns. B converts B-coordinates into standard coordinates.' });
    push({ kind: 'teach', B: B1, v: [4, -1], show: ['bgrid', 'walk', 'coords'],
        explanation: `The other way needs B⁻¹: [v]_B = B⁻¹v. For v = (4, −1), B⁻¹v = ${pair(toBasis(B1, [4, -1]))} — 1 along b₁ and −2 along b₂. Count it on the violet grid.` });
    for (let i = 0; i < 4; i++) {
        const T = TO_B[i];
        const c = toBasis(T.B, T.v);
        push({ kind: 'to-intro', B: T.B, v: T.v, show: ['std', 'bgrid'], slot: (prompt++ * 3 + 1) % 4, presetIndex: i,
            explanation: `Basis ${basisText(T.B)}. v = ${pair(T.v)} in standard coordinates. What are its B-coordinates?` });
        push({ kind: 'to', B: T.B, v: T.v, show: ['bgrid', 'walk', 'coords'], presetIndex: i,
            explanation: `[v]_B = B⁻¹v = ${pair(c)}: ${num(c[0])} of b₁ plus ${num(c[1])} of b₂ lands exactly on ${pair(T.v)}.` });
        const F = FROM_B[i];
        const w = fromBasis(F.B, F.c);
        push({ kind: 'from-intro', B: F.B, v: w, c: F.c, show: ['bgrid'], slot: (prompt++ * 3 + 1) % 4, presetIndex: i,
            explanation: `Basis ${basisText(F.B)}. A vector has B-coordinates ${pair(F.c)}. Where is it, in standard coordinates?` });
        push({ kind: 'from', B: F.B, v: w, c: F.c, show: ['std', 'bgrid', 'walk', 'coords'], presetIndex: i,
            explanation: `B·${pair(F.c)} = ${num(F.c[0])}·${pair(columns(F.B)[0])} + ${num(F.c[1])}·${pair(columns(F.B)[1])} = ${pair(w)}.` });
    }
    push({ kind: 'closing', B: B1, v: V, show: ['std', 'bgrid', 'walk', 'coords'],
        explanation: 'One vector, two sets of coordinates: v = B[v]_B and [v]_B = B⁻¹v. Switch to Explore — drag b₁, b₂ or v, or type either set of coordinates.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Converting into B-coordinates, the classic slip is multiplying by B instead
   of B⁻¹; also keeping the standard numbers, or swapping the two. Converting
   out, it is using B⁻¹, keeping the B-numbers, or pairing c₁ with b₂. */
const pickWrong = (correct, candidates) => {
    const seen = new Set([pair(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (!c || seen.has(pair(c))) continue;
        seen.add(pair(c));
        wrong.push(c);
    }
    return wrong;
};

const predictFor = (step) => {
    if (!step) return null;
    if (step.kind === 'to-intro') {
        const c = toBasis(step.B, step.v);
        const ordered = pickWrong(c, [apply(step.B, step.v), step.v, [c[1], c[0]], [c[0], -c[1]], [c[0] + 1, c[1]]]);
        ordered.splice(step.slot, 0, c);
        return {
            question: `Basis ${basisText(step.B)}. What are the B-coordinates of v = ${pair(step.v)}?`,
            options: ordered.map(pair),
            correct: step.slot,
            because: `Solve c₁b₁ + c₂b₂ = v, which is c = B⁻¹v = ${pair(c)}. Check: ${num(c[0])}·${pair(columns(step.B)[0])} + ${num(c[1])}·${pair(columns(step.B)[1])} = ${pair(step.v)}.`,
        };
    }
    if (step.kind === 'from-intro') {
        const w = fromBasis(step.B, step.c);
        const [b1, b2] = columns(step.B);
        const ordered = pickWrong(w, [toBasis(step.B, step.c), step.c, [step.c[0] * b2[0] + step.c[1] * b1[0], step.c[0] * b2[1] + step.c[1] * b1[1]], [w[1], w[0]], [w[0] + 1, w[1]]]);
        ordered.splice(step.slot, 0, w);
        return {
            question: `Basis ${basisText(step.B)}. A vector has B-coordinates ${pair(step.c)}. What are its standard coordinates?`,
            options: ordered.map(pair),
            correct: step.slot,
            because: `B-coordinates are a recipe: ${num(step.c[0])} of b₁ plus ${num(step.c[1])} of b₂ = ${pair(w)}. That is Bc.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'Basis b₁ = (1, 0), b₂ = (1, 1). A vector has B-coordinates (2, 3). What are its standard coordinates?',
        options: ['(2, 3)', '(5, 3)', '(−1, 3)', '(3, 5)'],
        correct: 1,
        explanation: '2 of b₁ plus 3 of b₂: 2(1, 0) + 3(1, 1) = (5, 3). Converting out of a basis is multiplying by B, whose columns are b₁ and b₂.',
    },
    {
        question: 'To turn standard coordinates into B-coordinates, you multiply by…',
        options: ['B', 'Bᵀ', 'B⁻¹', 'det B'],
        correct: 2,
        explanation: 'v = B[v]_B, so [v]_B = B⁻¹v. Multiplying by B goes the other way — from B-coordinates to standard ones.',
    },
    {
        question: 'Why can b₁ = (1, 2) and b₂ = (2, 4) not be a basis for the plane?',
        options: ['They are not unit vectors', 'They are not perpendicular', 'They lie on one line, so they cannot reach every point', 'b₂ is longer than b₁'],
        correct: 2,
        explanation: 'b₂ = 2b₁, so every combination lies on one line: most points have no B-coordinates at all, and det B = 0 means B⁻¹ does not exist. A basis need not be unit-length or perpendicular.',
    },
];

const codeExample = `import numpy as np

B = np.array([[2, -1],
              [1,  1]], dtype=float)   # columns: b1 = (2, 1), b2 = (-1, 1)
v = np.array([1, 2])

c = np.linalg.solve(B, v)     # v's coordinates in basis B
print(c)                      # [1. 1.] -- v = 1*b1 + 1*b2
print(B @ c)                  # [1. 2.] -- back to standard coordinates
print(np.linalg.inv(B) @ v)   # [1. 1.] -- the same, via the inverse`;

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

const PRESET_BASES = [['Skewed', B1], ['Shear', B2], ['Turned', B3], ['Stretched', B4]];

export default function ChangeOfBasisPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [B, setB] = useState(B1);
    const [v, setV] = useState([1, 2]);
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
    const Bm = guided ? step.B : B;
    const vec = guided ? step.v : v;
    const show = guided ? step.show : ['std', 'bgrid', 'walk', 'coords'];
    const has = (k) => show.includes(k);
    const [b1, b2] = columns(Bm);
    const c = toBasis(Bm, vec);
    const isBasis = c !== null;
    const hideNumbers = guided && predict.hideExplanation;
    // In "from" questions the target vector is the answer, so it stays hidden until revealed.
    const hideV = guided && step.kind === 'from-intro';
    const map = useCallback((p) => apply(Bm, p), [Bm]);

    const takeOver = () => {
        if (guided) { setB(step.B.map(r => [...r])); setV(step.v); setMode('explore'); setIsPlaying(false); }
    };
    const dragB = (j) => (p) => { takeOver(); setB(M => M.map((r, i) => r.map((x, k) => (k === j ? p[i] : x)))); };

    const formula = useMemo(() => {
        if (!isBasis) return String.raw`\det B = 0: \text{ not a basis}`;
        const CA = MATH_COLORS.a, CB = MATH_COLORS.b, R = MATH_COLORS.result;
        return String.raw`\textcolor{${R}}{\begin{bmatrix} ${fmt(vec[0])} \\ ${fmt(vec[1])} \end{bmatrix}} = \begin{bmatrix} \textcolor{${CA}}{${fmt(b1[0])}} & \textcolor{${CB}}{${fmt(b2[0])}} \\ \textcolor{${CA}}{${fmt(b1[1])}} & \textcolor{${CB}}{${fmt(b2[1])}} \end{bmatrix}\begin{bmatrix} ${fmt(c[0])} \\ ${fmt(c[1])} \end{bmatrix}`
            + String.raw` \qquad [\mathbf{v}]_B = B^{-1}\mathbf{v} = \begin{bmatrix} ${fmt(c[0])} \\ ${fmt(c[1])} \end{bmatrix}`;
    }, [isBasis, vec, b1, b2, c]);

    const exploreNote = !isBasis
        ? 'b₁ and b₂ lie on one line, so they are not a basis: they cannot reach most points, and B has no inverse. Drag one of them off the line.'
        : `In standard coordinates v = ${pair(vec)}; in basis B it is ${pair(c)} — ${num(c[0])} steps along b₁ and ${num(c[1])} along b₂.`;

    const part1 = isBasis ? [c[0] * b1[0], c[0] * b1[1]] : null;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/linear-algebra" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Linear Algebra
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Change of Basis</h1>
                    <p className="text-violet-100 max-w-3xl">
                        Coordinates are directions for walking along a grid. Swap the grid and the same arrow gets new numbers — B converts one way, and B⁻¹ converts back.
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
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag b₁, b₂ or v, or type either set of coordinates'}
                            </span>
                        </div>

                        <Plane2D xRange={[-5, 5]} yRange={[-5, 5]} ariaLabel="A vector on the standard grid and on a second grid built from b1 and b2">
                            {has('bgrid') && isBasis && <MappedGrid map={map} range={10} color="#8b5cf6" opacity={0.5} />}
                            {has('std') && !hideV && (
                                <>
                                    <Vector to={[vec[0], 0]} color={MATH_COLORS.i} width={2} dashed opacity={0.6} />
                                    <Vector from={[vec[0], 0]} to={vec} color={MATH_COLORS.j} width={2} dashed opacity={0.6} />
                                </>
                            )}
                            {has('walk') && isBasis && !hideV && (
                                <>
                                    <Vector to={part1} color={MATH_COLORS.a} width={2.5} dashed opacity={0.85} />
                                    <Vector from={part1} to={vec} color={MATH_COLORS.b} width={2.5} dashed opacity={0.85} />
                                </>
                            )}
                            <Vector to={b1} color={MATH_COLORS.a} width={3.5} label="b₁" onDrag={dragB(0)} snap={0.25} />
                            <Vector to={b2} color={MATH_COLORS.b} width={3.5} label="b₂" onDrag={dragB(1)} snap={0.25} />
                            {!hideV && <Vector to={vec} color={MATH_COLORS.result} width={3} label="v" onDrag={(p) => { takeOver(); setV(p); }} snap={0.25} />}
                            {has('coords') && isBasis && !hideV && (
                                <Point at={vec} color={MATH_COLORS.result} r={4} label={`[v]_B = ${pair(c)}`} labelOffset={[10, 18]} />
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
                                {PRESET_BASES.map(([name, P]) => (
                                    <button key={name} onClick={() => setB(P.map(r => [...r]))}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500">{name}</button>
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
                                <MatrixInput label="B" value={Bm} step={0.25} columnColors={[MATH_COLORS.a, MATH_COLORS.b]}
                                    onChange={(next) => { takeOver(); setB(next); }} />
                                {!hideV && (
                                    <MatrixInput label="v" value={[[vec[0]], [vec[1]]]} step={0.25} columnColors={[MATH_COLORS.result]}
                                        onChange={(m) => { takeOver(); setV([m[0][0], m[1][0]]); }} />
                                )}
                                {isBasis && !hideV && (
                                    <MatrixInput label="[v]_B" value={[[c[0]], [c[1]]]} step={0.25} columnColors={['#e2e8f0']}
                                        onChange={(m) => { takeOver(); setV(fromBasis(Bm, [m[0][0], m[1][0]])); }} />
                                )}
                            </div>
                            {(!guided || has('coords')) && !hideV ? (
                                <div className="text-slate-100 text-sm sm:text-base"><Tex block>{formula}</Tex></div>
                            ) : (
                                <p className="text-sm text-slate-500">The conversion appears once the tour reaches it.</p>
                            )}
                            <p className="text-xs text-slate-500">
                                Type into [v]_B and v moves; type into v and [v]_B updates. The columns of B are b₁ and b₂, written in standard coordinates.
                            </p>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Converting</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-pink-400 font-semibold">B-coordinates → standard</span> — multiply by B: v = B[v]_B.</li>
                            <li><span className="text-violet-300 font-semibold">Standard → B-coordinates</span> — multiply by B⁻¹: [v]_B = B⁻¹v.</li>
                            <li><span className="text-amber-300 font-semibold">A basis</span> — b₁, b₂ that reach every point: det B ≠ 0.</li>
                            <li><span className="text-slate-200 font-semibold">Why bother</span> — in the right basis (often eigenvectors) a matrix becomes simple.</li>
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
