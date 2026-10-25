"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Vector, MappedGrid, Segment, Polygon, MATH_COLORS } from '@/components/math/Plane2D';
import MatrixInput from '@/components/math/MatrixInput';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   M is stored as rows: [[a, b], [c, d]]. Its columns are (a, c) — where
   î lands — and (b, d) — where ĵ lands. */
const IDENTITY = [[1, 0], [0, 1]];
const apply = (M, [x, y]) => [M[0][0] * x + M[0][1] * y, M[1][0] * x + M[1][1] * y];
const transpose = (M) => [[M[0][0], M[1][0]], [M[0][1], M[1][1]]];
const det = (M) => M[0][0] * M[1][1] - M[0][1] * M[1][0];
const lerpMatrix = (A, B, t) => A.map((row, i) => row.map((v, j) => v + (B[i][j] - v) * t));
const fmt = (x) => texNum(x, 2);
const pair = ([x, y]) => `(${fmt(x)}, ${fmt(y)})`;

/** The vector the guided tour follows through every transformation. */
const V = [2, 1];

const PRESETS = [
    {
        name: 'Shear',
        M: [[1, 1], [0, 1]],
        note: 'î stays where it was and ĵ leans over to (1, 1). The unit square becomes a parallelogram with the same base and height, so area is unchanged.',
    },
    {
        name: 'Rotation by 90°',
        M: [[0, -1], [1, 0]],
        note: 'î turns to point up and ĵ to point left. Lengths and angles survive; only directions change. Every vector turns 90° counter-clockwise.',
    },
    {
        name: 'Stretch',
        M: [[2, 0], [0, 0.5]],
        note: 'Each axis is scaled on its own: x by 2 and y by 0.5. A diagonal matrix never mixes the axes.',
    },
    {
        name: 'Reflection',
        M: [[-1, 0], [0, 1]],
        note: 'î flips to (−1, 0). The plane is mirrored across the y-axis, and going from î to ĵ is now clockwise — the orientation has flipped.',
    },
    {
        name: 'Squash onto a line',
        M: [[1, 2], [0.5, 1]],
        note: 'The second column is exactly twice the first, so î and ĵ land on the same line. The whole plane collapses onto it, and many points land on the same spot — no matrix can undo that.',
    },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    const push = (s) => steps.push(s);
    push({
        kind: 'opening', M: IDENTITY, preset: null,
        explanation: 'This grid is the plane before anything happens. î = (1, 0) is green and ĵ = (0, 1) is red. Every vector is a mix of the two: v = (2, 1) means 2 steps of î plus 1 step of ĵ.',
    });
    PRESETS.forEach((p, presetIndex) => {
        const [a, b] = p.M[0];
        const [c, d] = p.M[1];
        const landed = apply(p.M, V);
        push({
            kind: 'intro', M: IDENTITY, target: p.M, presetIndex,
            explanation: `Next: ${p.name}, M = [[${fmt(a)}, ${fmt(b)}], [${fmt(c)}, ${fmt(d)}]]. Its first column (${fmt(a)}, ${fmt(c)}) is where î will land; its second column (${fmt(b)}, ${fmt(d)}) is where ĵ will land. v = (2, 1) will land at ${pair(landed)}.`,
        });
        [1 / 3, 2 / 3].forEach(t => push({
            kind: 'morph', M: lerpMatrix(IDENTITY, p.M, t), target: p.M, presetIndex, t,
            explanation: `${p.name}: the whole grid moves along with î and ĵ. Grid lines stay straight, parallel and evenly spaced, and the origin stays fixed — that is what makes a transformation linear.`,
        }));
        push({
            kind: 'landed', M: p.M, target: p.M, presetIndex,
            explanation: `v = 2î + 1ĵ, so it lands at 2·(${fmt(a)}, ${fmt(c)}) + 1·(${fmt(b)}, ${fmt(d)}) = ${pair(landed)}. ${p.note}`,
        });
    });
    push({
        kind: 'closing', M: IDENTITY, preset: null,
        explanation: 'That is all a 2×2 matrix is: two columns saying where î and ĵ go. Switch to Explore and drag the arrow tips to build your own.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Asked before each transformation plays: where will v land? The wrong
   answers are the classic slips — using rows instead of columns (Mᵀv),
   multiplying only the diagonal, swapping coordinates — and any that happen
   to coincide with the right answer are replaced from the fallback list. */
const predictFor = (step) => {
    if (!step || step.kind !== 'intro') return null;
    const M = step.target;
    const correct = apply(M, V);
    const key = (p) => pair(p);
    const candidates = [
        apply(transpose(M), V),                  // rows instead of columns
        V,                                       // nothing happens
        [M[0][0] * V[0], M[1][1] * V[1]],        // diagonal only
        [correct[1], correct[0]],                // coordinates swapped
        [-correct[0], -correct[1]],              // sign slip
        [correct[0] + 1, correct[1]],
    ];
    const seen = new Set([key(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (seen.has(key(c))) continue;
        seen.add(key(c));
        wrong.push(c);
    }
    // Where the right answer sits comes from the step, not from a fixed slot.
    const slot = (step.presetIndex * 3 + 1) % 4;
    const ordered = [...wrong];
    ordered.splice(slot, 0, correct);
    const [a, b] = M[0];
    const [c, d] = M[1];
    return {
        question: `Before ${PRESETS[step.presetIndex].name} plays: where will v = (2, 1) land?`,
        options: ordered.map(pair),
        correct: slot,
        because: `Read the columns: î → (${fmt(a)}, ${fmt(c)}) and ĵ → (${fmt(b)}, ${fmt(d)}). v is 2î + 1ĵ, so it lands at 2·(${fmt(a)}, ${fmt(c)}) + 1·(${fmt(b)}, ${fmt(d)}) = ${pair(correct)}.`,
    };
};

const quizQuestions = [
    {
        question: 'What does the first column of a 2×2 matrix tell you?',
        options: ['Where ĵ = (0, 1) lands', 'Where î = (1, 0) lands', 'How far the origin moves', 'The determinant'],
        correct: 1,
        explanation: 'M·(1, 0) picks out the first column, so the first column is exactly where î lands. Likewise the second column is where ĵ lands. Every other vector follows from those two.',
    },
    {
        question: 'A matrix has columns (0, 1) and (−1, 0). What does it do to the plane?',
        options: ['Reflects it across the line y = x', 'Rotates it 90° clockwise', 'Rotates it 90° counter-clockwise', 'Shears it sideways'],
        correct: 2,
        explanation: 'î = (1, 0) goes to (0, 1) — straight up — and ĵ = (0, 1) goes to (−1, 0) — left. Both turned a quarter turn counter-clockwise, and the grid turns with them.',
    },
    {
        question: 'Why can no matrix undo "squash onto a line"?',
        options: [
            'Many different points land on the same spot, so nothing can tell where each one came from',
            'Because one of its entries is zero',
            'Because its determinant is negative',
            'It can: the transpose undoes it',
        ],
        correct: 0,
        explanation: 'Once the whole plane is flattened onto a line, information is gone: (2, 0) and (0, 1) both land on (2, 1). A matrix is a function, and it cannot send one output back to two inputs. That is what determinant 0 means.',
    },
];

const codeExample = `import numpy as np

# The columns of M are where i-hat and j-hat land.
M = np.array([[1, 1],
              [0, 1]])        # a shear: i stays put, j leans to (1, 1)

v = np.array([2, 1])          # v = 2*i + 1*j

print(M @ v)                          # [3 1]
print(2 * M[:, 0] + 1 * M[:, 1])      # [3 1]  -- the same thing, column by column

# Composing transformations is matrix multiplication:
R = np.array([[0, -1],
              [1,  0]])       # rotate 90 degrees counter-clockwise
print(R @ M @ v)              # shear first, then rotate`;

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

export default function MatrixAsATransformationPage() {
    const [mode, setMode] = useState('guided');            // 'guided' | 'explore'
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [M, setM] = useState([[1, 1], [0, 1]]);          // explore-mode matrix
    const [v, setV] = useState(V);                          // explore-mode vector
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

    // The picture shows the tour's matrix while guided, the learner's while exploring.
    const shown = mode === 'guided' ? step.M : M;
    const vec = mode === 'guided' ? V : v;
    const iHat = [shown[0][0], shown[1][0]];
    const jHat = [shown[0][1], shown[1][1]];
    const image = apply(shown, vec);
    const d = det(shown);
    const flat = Math.abs(d) < 1e-9;

    /* Grabbing a handle during the tour switches to Explore, starting from
       whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (mode === 'guided') { setM(step.M.map(r => [...r])); setV(V); setMode('explore'); setIsPlaying(false); }
    };
    const dragI = ([x, y]) => { takeOver(); setM(m => [[x, m[0][1]], [y, m[1][1]]]); };
    const dragJ = ([x, y]) => { takeOver(); setM(m => [[m[0][0], x], [m[1][0], y]]); };
    const dragV = ([x, y]) => { takeOver(); setV([x, y]); };

    const mapPoint = useCallback((p) => apply(shown, p), [shown]);

    const formula = useMemo(() => {
        const [a, b] = shown[0], [c, dd] = shown[1];
        const G = MATH_COLORS.i, R = MATH_COLORS.j;
        return String.raw`\begin{bmatrix} \textcolor{${G}}{${fmt(a)}} & \textcolor{${R}}{${fmt(b)}} \\ \textcolor{${G}}{${fmt(c)}} & \textcolor{${R}}{${fmt(dd)}} \end{bmatrix}`
            + String.raw`\begin{bmatrix} ${fmt(vec[0])} \\ ${fmt(vec[1])} \end{bmatrix}`
            + String.raw` = ${fmt(vec[0])}\textcolor{${G}}{\begin{bmatrix} ${fmt(a)} \\ ${fmt(c)} \end{bmatrix}}`
            + String.raw` + ${fmt(vec[1])}\textcolor{${R}}{\begin{bmatrix} ${fmt(b)} \\ ${fmt(dd)} \end{bmatrix}}`
            + String.raw` = \begin{bmatrix} ${fmt(image[0])} \\ ${fmt(image[1])} \end{bmatrix}`;
    }, [shown, vec, image]);

    const explanation = mode === 'guided'
        ? step.explanation
        : flat
            ? 'The two columns point along the same line, so the whole plane is flattened onto it. The determinant is 0 and the transformation cannot be undone.'
            : `î lands at ${pair(iHat)} and ĵ at ${pair(jHat)}. v = ${fmt(vec[0])}î + ${fmt(vec[1])}ĵ, so it lands at ${pair(image)}.${d < 0 ? ' The determinant is negative: the plane has been flipped over.' : ''}`;

    const square = [[0, 0], iHat, [iHat[0] + jHat[0], iHat[1] + jHat[1]], jHat];

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/linear-algebra" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Linear Algebra
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Matrix as a Transformation</h1>
                    <p className="text-violet-100 max-w-3xl">
                        A matrix is not a table of numbers to multiply. It is a way of moving the whole plane — and its two columns say exactly where î and ĵ go.
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
                                        onClick={() => { setMode(key); setIsPlaying(false); if (key === 'explore') { setM(shown.map(r => [...r])); setV(vec); } }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag the arrow tips, or type into the matrix'}
                            </span>
                        </div>

                        <Plane2D xRange={[-4.5, 4.5]} yRange={[-4.5, 4.5]} ariaLabel="The plane, its transformed grid, î, ĵ and the vector v">
                            <MappedGrid map={mapPoint} range={8} color="#8b5cf6" opacity={0.45} />
                            <Polygon points={square} fill={flat ? MATH_COLORS.negative : d < 0 ? MATH_COLORS.negative : MATH_COLORS.area} fillOpacity={0.18} />
                            <Vector to={vec} color={MATH_COLORS.a} width={2} dashed opacity={0.45} label="v" onDrag={dragV} snap={0.25} />
                            <Segment from={[0, 0]} to={[iHat[0] * vec[0], iHat[1] * vec[0]]} color={MATH_COLORS.i} width={2} dashed opacity={0.7} />
                            <Segment from={[iHat[0] * vec[0], iHat[1] * vec[0]]} to={image} color={MATH_COLORS.j} width={2} dashed opacity={0.7} />
                            <Vector to={image} color={MATH_COLORS.result} label="Mv" />
                            <Vector to={iHat} color={MATH_COLORS.i} label="î" onDrag={dragI} snap={0.25} width={3.5} />
                            <Vector to={jHat} color={MATH_COLORS.j} label="ĵ" onDrag={dragJ} snap={0.25} width={3.5} />
                        </Plane2D>

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
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-violet-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {PRESETS.map(p => (
                                    <button key={p.name} onClick={() => setM(p.M.map(r => [...r]))}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500">{p.name}</button>
                                ))}
                                <button onClick={() => { setM(IDENTITY.map(r => [...r])); setV(V); }}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-violet-500">Identity</button>
                            </div>
                        )}
                    </div>

                    {mode === 'guided' && predict.prompt && <PredictPrompt predict={predict} accent="violet" />}

                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-violet-400 mt-0.5 flex-shrink-0" />
                            <p className="text-violet-200 text-sm leading-relaxed">
                                {mode === 'guided' && predict.hideExplanation ? 'Make your prediction above to reveal this step.' : explanation}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <MatrixInput label="M" value={shown} step={0.25}
                                columnColors={[MATH_COLORS.i, MATH_COLORS.j]}
                                onChange={(next) => { if (mode === 'guided') { setMode('explore'); setIsPlaying(false); setV(V); } setM(next); }} />
                            <div className="text-sm text-slate-400">
                                det M = <span className={`font-mono ${flat ? 'text-rose-300' : d < 0 ? 'text-rose-300' : 'text-yellow-300'}`}>{fmt(d)}</span>
                                <span className="block text-xs text-slate-500">the shaded square&apos;s area, signed</span>
                            </div>
                        </div>
                        <div className="text-slate-100 text-sm sm:text-base">
                            <Tex block>{formula}</Tex>
                        </div>
                        <p className="text-xs text-slate-500">
                            The colours carry the idea: the green column is where î lands, the red column is where ĵ lands, and Mv is just v&apos;s recipe — {fmt(vec[0])} of the green plus {fmt(vec[1])} of the red.
                        </p>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Reading a 2×2 matrix</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-green-400 font-semibold">First column</span> — where î = (1, 0) lands.</li>
                            <li><span className="text-red-400 font-semibold">Second column</span> — where ĵ = (0, 1) lands.</li>
                            <li><span className="text-yellow-300 font-semibold">Determinant</span> — how much areas are scaled; negative means flipped, 0 means squashed flat.</li>
                            <li><span className="text-pink-400 font-semibold">Mv</span> — the same mix of the new î and ĵ that v was of the old ones.</li>
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
