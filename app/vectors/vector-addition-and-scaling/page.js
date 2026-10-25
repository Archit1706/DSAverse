"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Vector, Segment, Polygon, Label, MATH_COLORS } from '@/components/math/Plane2D';
import MatrixInput from '@/components/math/MatrixInput';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────── */
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const scale = (k, p) => [k * p[0], k * p[1]];
const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const pair = ([x, y]) => `(${num(x)}, ${num(y)})`;
/** What an operation produces: a + b, a − b, or k·a. */
const resultOf = ({ op, a, b, k }) => (op === 'add' ? add(a, b) : op === 'sub' ? sub(a, b) : scale(k, a));
const opName = (op, k) => (op === 'add' ? 'a + b' : op === 'sub' ? 'a − b' : `${num(k)}a`);

/** The operations the tour asks about, after it has taught each one. */
const PROMPT_PRESETS = [
    { op: 'add', a: [-2, 3], b: [3, -1] },
    { op: 'scale', a: [1, 2], k: -1.5 },
    { op: 'sub', a: [1, 3], b: [-2, 1] },
    { op: 'add', a: [2, -2], b: [-1, -1.5] },
    { op: 'scale', a: [-2, 1], k: -0.5 },
    { op: 'sub', a: [-1, -2], b: [2, 1] },
    { op: 'add', a: [-3, -1], b: [1, -2] },
    { op: 'scale', a: [1.5, -1], k: 2 },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let prompt = 0;
    const push = (s) => steps.push({ b: [0, 0], k: 1, ...s });
    const A = [3, 1], B = [1, 2];
    push({ kind: 'opening', op: 'add', a: A, b: B, stage: 'vectors',
        explanation: 'Two vectors: a = (3, 1) in amber and b = (1, 2) in purple, both drawn from the origin. What should a + b mean?' });
    push({ kind: 'teach', op: 'add', a: A, b: B, stage: 'tiptotail',
        explanation: 'Walk along a, then from where it ends, walk along b. Slide b so its tail sits on a\'s tip — tip to tail. You finish at (4, 3).' });
    push({ kind: 'teach', op: 'add', a: A, b: B, stage: 'both',
        explanation: 'Now go the other way: b first, then a. You finish at the same point. The two routes are the sides of a parallelogram, so a + b = b + a — the order never matters.' });
    push({ kind: 'teach', op: 'add', a: A, b: B, stage: 'result',
        explanation: 'a + b is the parallelogram\'s diagonal from the origin. In numbers you just add matching components: (3 + 1, 1 + 2) = (4, 3).' });
    const S = [2, 1];
    [[2, 'Same direction, twice as long: 2a = (4, 2). Each component doubles.'],
        [0.5, 'A scalar between 0 and 1 shrinks: 0.5a = (1, 0.5), half the length, same direction.'],
        [-1, 'A negative scalar flips the arrow: −1a = (−2, −1) has the same length but points the opposite way.'],
        [-2, 'Flip and stretch together: −2a = (−4, −2). Every multiple of a lies on the same line through the origin — the dashed line.'],
    ].forEach(([k, text]) => push({ kind: 'teach', op: 'scale', a: S, k, stage: 'result', explanation: text }));
    push({ kind: 'teach', op: 'sub', a: A, b: B, stage: 'opposite',
        explanation: 'Subtraction is adding the opposite. Flip b to get −b = (−1, −2), then lay it tip to tail on a.' });
    push({ kind: 'teach', op: 'sub', a: A, b: B, stage: 'result',
        explanation: 'a − b = a + (−b) = (3 − 1, 1 − 2) = (2, −1). Look at the dashed pink copy: a − b is also the arrow from b\'s tip to a\'s tip — the parallelogram\'s other diagonal.' });
    PROMPT_PRESETS.forEach((p, presetIndex) => {
        const r = resultOf(p);
        const intro = p.op === 'scale'
            ? `Next: a = ${pair(p.a)} and k = ${num(p.k)}. Where does ka land?`
            : `Next: a = ${pair(p.a)} and b = ${pair(p.b)}. Where does ${opName(p.op)} land?`;
        push({ kind: 'intro', ...p, stage: 'vectors', presetIndex, slot: (prompt++ * 3 + 1) % 4, explanation: intro });
        const how = p.op === 'add'
            ? `Add matching components: (${num(p.a[0])} + ${num(p.b[0])}, ${num(p.a[1])} + ${num(p.b[1])}) = ${pair(r)}. Tip to tail lands in the same place.`
            : p.op === 'sub'
                ? `a + (−b) = (${num(p.a[0])} − ${num(p.b[0])}, ${num(p.a[1])} − ${num(p.b[1])}) = ${pair(r)} — the arrow from b's tip to a's tip.`
                : `Multiply each component by ${num(p.k)}: ${pair(r)}. ${p.k < 0 ? 'The sign flips the direction' : 'Same direction'}, and the length is ${num(Math.abs(p.k))} times a's.`;
        push({ kind: 'result', ...p, stage: 'result', presetIndex, explanation: `${opName(p.op, p.k)} = ${pair(r)}. ${how}` });
    });
    push({ kind: 'closing', op: 'add', a: A, b: B, stage: 'result',
        explanation: 'Adding is tip to tail, scaling stretches along a line through the origin, and subtracting adds the opposite. Switch to Explore and drag a and b.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each result: where does it land? Wrong answers are the usual slips —
   subtracting the wrong way round, mixing up components, multiplying the
   components together, scaling only one component or adding k instead of
   multiplying. Duplicates of the right answer are replaced from further down. */
const predictFor = (step) => {
    if (!step || step.kind !== 'intro') return null;
    const { op, a, b, k } = step;
    const correct = resultOf(step);
    const candidates = op === 'add'
        ? [sub(a, b), sub(b, a), [a[0] * b[0], a[1] * b[1]], [a[0] + b[1], a[1] + b[0]], [a[0] + a[1], b[0] + b[1]], add(correct, [1, 0])]
        : op === 'sub'
            ? [sub(b, a), add(a, b), [a[0] - b[1], a[1] - b[0]], [a[0] + b[0], a[1] - b[1]], add(correct, [0, 1])]
            : [[k * a[0], a[1]], [a[0] + k, a[1] + k], scale(-k, a), [a[0], k * a[1]], add(correct, [1, 1])];
    const seen = new Set([pair(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (seen.has(pair(c))) continue;
        seen.add(pair(c));
        wrong.push(c);
    }
    const ordered = [...wrong];
    ordered.splice(step.slot, 0, correct);
    const question = op === 'scale'
        ? `a = ${pair(a)}, k = ${num(k)}. Where does ka land?`
        : `a = ${pair(a)}, b = ${pair(b)}. Where does ${opName(op)} land?`;
    const because = op === 'add'
        ? `Components add one by one: (${num(a[0])} + ${num(b[0])}, ${num(a[1])} + ${num(b[1])}) = ${pair(correct)}.`
        : op === 'sub'
            ? `Subtract matching components, a's minus b's: (${num(a[0])} − ${num(b[0])}, ${num(a[1])} − ${num(b[1])}) = ${pair(correct)}.`
            : `Both components are multiplied by ${num(k)}: (${num(k)} × ${num(a[0])}, ${num(k)} × ${num(a[1])}) = ${pair(correct)}.`;
    return { question, options: ordered.map(pair), correct: step.slot, because };
};

const quizQuestions = [
    {
        question: 'a = (2, 5) and b = (−1, 3). What is a − b?',
        options: ['(1, 8)', '(3, 2)', '(−3, −2)', '(1, 2)'],
        correct: 1,
        explanation: 'Subtract matching components: (2 − (−1), 5 − 3) = (3, 2). (−3, −2) is b − a, the same arrow pointing the other way.',
    },
    {
        question: 'What does multiplying a vector by −2 do to it?',
        options: [
            'Halves its length and keeps its direction',
            'Keeps its length and turns it by 90°',
            'Halves its length and reverses it',
            'Doubles its length and reverses its direction',
        ],
        correct: 3,
        explanation: 'The size of the scalar, 2, stretches the arrow to twice its length; the minus sign points it the opposite way. It stays on the same line through the origin.',
    },
    {
        question: 'a and b are drawn from the origin as two sides of a parallelogram. Which diagonal is a + b?',
        options: [
            'The one from the origin to the far corner',
            'The one joining the tips of a and b',
            'Neither — a + b is one of the sides',
            'It depends on whether you add a or b first',
        ],
        correct: 0,
        explanation: 'Going a then b, or b then a, both end at the far corner, so a + b is the diagonal from the origin. The other diagonal, from b\'s tip to a\'s, is a − b.',
    },
];

const codeExample = `import numpy as np

a = np.array([3, 1])
b = np.array([1, 2])

print(a + b)           # [4 3] -- tip to tail
print(b + a)           # [4 3] -- either order
print(2 * a)           # [6 2] -- same direction, twice as long
print(-1.5 * a)        # [-4.5 -1.5] -- flipped and stretched
print(a - b)           # [ 2 -1]
print(a + (-1) * b)    # the same: subtracting is adding the opposite`;

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
                    className="text-sm px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-sky-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

const OPS = [['add', 'a + b'], ['sub', 'a − b'], ['scale', 'k · a']];
const vec = (v) => String.raw`\begin{bmatrix} ${fmt(v[0])} \\ ${fmt(v[1])} \end{bmatrix}`;

export default function VectorAdditionAndScalingPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1300);
    const [op, setOp] = useState('add');
    const [a, setA] = useState([3, 1]);
    const [b, setB] = useState([1, 2]);
    const [k, setK] = useState(2);
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
    const cur = guided ? step : { op, a, b, k, stage: 'result' };
    const stage = cur.stage;
    const r = resultOf(cur);
    const hideNumbers = guided && predict.hideExplanation;

    const takeOver = () => {
        if (guided) {
            setOp(step.op); setA(step.a); if (step.op !== 'scale') setB(step.b); else setK(step.k);
            setMode('explore'); setIsPlaying(false);
        }
    };
    const dragA = (p) => { takeOver(); setA(p); };
    const dragB = (p) => { takeOver(); setB(p); };

    const formula = useMemo(() => {
        const A = MATH_COLORS.a, B = MATH_COLORS.b, R = MATH_COLORS.result;
        if (cur.op === 'add') {
            return String.raw`\textcolor{${A}}{\mathbf{a}} + \textcolor{${B}}{\mathbf{b}} = \textcolor{${A}}{${vec(cur.a)}} + \textcolor{${B}}{${vec(cur.b)}} = \begin{bmatrix} ${fmt(cur.a[0])} + ${fmt(cur.b[0])} \\ ${fmt(cur.a[1])} + ${fmt(cur.b[1])} \end{bmatrix} = \textcolor{${R}}{${vec(r)}}`;
        }
        if (cur.op === 'sub') {
            return String.raw`\textcolor{${A}}{\mathbf{a}} - \textcolor{${B}}{\mathbf{b}} = \textcolor{${A}}{${vec(cur.a)}} + \textcolor{${B}}{${vec(scale(-1, cur.b))}} = \textcolor{${R}}{${vec(r)}}`;
        }
        return String.raw`${fmt(cur.k)}\,\textcolor{${A}}{\mathbf{a}} = ${fmt(cur.k)}\textcolor{${A}}{${vec(cur.a)}} = \begin{bmatrix} ${fmt(cur.k)} \times ${fmt(cur.a[0])} \\ ${fmt(cur.k)} \times ${fmt(cur.a[1])} \end{bmatrix} = \textcolor{${R}}{${vec(r)}}`;
    }, [cur.op, cur.a, cur.b, cur.k, r]);

    const exploreNote = cur.op === 'add'
        ? `a + b = ${pair(r)}. Lay b on a's tip, or a on b's: both reach the far corner of the parallelogram.`
        : cur.op === 'sub'
            ? `a − b = ${pair(r)}: a plus the flipped −b, which is also the arrow from b's tip to a's tip.`
            : k === 0
                ? '0a is the zero vector: every arrow shrinks to the origin.'
                : `${num(k)}a = ${pair(r)}: ${Math.abs(k) > 1 ? 'longer' : Math.abs(k) < 1 ? 'shorter' : 'the same length'}${k < 0 ? ' and flipped' : ''}, but still on a's line through the origin.`;
    const explanation = guided ? step.explanation : exploreNote;

    /* what is drawn */
    const showB = cur.op !== 'scale';
    const lineDir = cur.a;
    const far = Math.hypot(...lineDir) > 1e-9 ? 12 / Math.hypot(...lineDir) : 0;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/vectors" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Vectors
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Vector Addition and Scaling</h1>
                    <p className="text-sky-100 max-w-3xl">
                        Add by walking tip to tail, scale by stretching along a line through the origin, and subtract by adding the opposite. Every rule is a picture first and arithmetic second.
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
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Operation">
                                {OPS.map(([key, label]) => (
                                    <button key={key} role="tab" aria-selected={cur.op === key}
                                        onClick={() => { takeOver(); setOp(key); }}
                                        className={`text-sm px-3 py-1.5 rounded-md transition-colors font-mono ${cur.op === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Plane2D xRange={[-5, 5]} yRange={[-5, 5]} ariaLabel="Vectors a and b and the result of combining them">
                            {cur.op === 'scale' && far > 0 && (
                                <Segment from={scale(-far, lineDir)} to={scale(far, lineDir)} color="#475569" width={1.5} dashed />
                            )}
                            {cur.op === 'add' && (stage === 'both' || stage === 'result') && (
                                <Polygon points={[[0, 0], cur.a, r, cur.b]} fill={MATH_COLORS.result} fillOpacity={0.08} strokeWidth={0} />
                            )}
                            {cur.op === 'add' && stage !== 'vectors' && (
                                <Vector from={cur.a} to={r} color={MATH_COLORS.b} width={2.5} dashed opacity={0.75} />
                            )}
                            {cur.op === 'add' && (stage === 'both' || stage === 'result') && (
                                <Vector from={cur.b} to={r} color={MATH_COLORS.a} width={2.5} dashed opacity={0.75} />
                            )}
                            {cur.op === 'sub' && stage !== 'vectors' && (
                                <>
                                    <Vector to={scale(-1, cur.b)} color={MATH_COLORS.b} width={2} dashed opacity={0.5} label="−b" />
                                    <Vector from={cur.a} to={r} color={MATH_COLORS.b} width={2.5} dashed opacity={0.75} />
                                </>
                            )}
                            {cur.op === 'sub' && stage === 'result' && (
                                <Vector from={cur.b} to={cur.a} color={MATH_COLORS.result} width={2} dashed opacity={0.6} />
                            )}
                            {stage === 'result' && (
                                <Vector to={r} color={MATH_COLORS.result} width={3.5} label={opName(cur.op, cur.k)} />
                            )}
                            {showB && (
                                <Vector to={cur.b} color={MATH_COLORS.b} width={3} label="b" onDrag={dragB} snap={0.25} />
                            )}
                            <Vector to={cur.a} color={MATH_COLORS.a} width={3} label="a" onDrag={dragA} snap={0.25} />
                            {stage === 'tiptotail' && (
                                <Label at={r} dx={8} dy={-8} color={MATH_COLORS.result} weight={700}>{pair(r)}</Label>
                            )}
                        </Plane2D>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="sky" />
                                <span className="text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-sky-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {op === 'scale' && (
                                    <ParamSlider label="k" value={k} onChange={setK} min={-3} max={3} step={0.25} accent="sky"
                                        format={num} hint="Negative k flips a; |k| > 1 stretches it, |k| < 1 shrinks it." />
                                )}
                                <p className="text-xs text-slate-500">Drag the tips of a{op !== 'scale' ? ' and b' : ''}, or type their components below.</p>
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="sky" />}

                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sky-200 text-sm leading-relaxed">
                                {guided && predict.hideExplanation ? 'Make your prediction above to reveal this step.' : explanation}
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
                                <MatrixInput label="a" value={[[cur.a[0]], [cur.a[1]]]} step={0.25} columnColors={[MATH_COLORS.a]}
                                    onChange={(n) => { takeOver(); setA([n[0][0], n[1][0]]); }} />
                                {showB && (
                                    <MatrixInput label="b" value={[[cur.b[0]], [cur.b[1]]]} step={0.25} columnColors={[MATH_COLORS.b]}
                                        onChange={(n) => { takeOver(); setB([n[0][0], n[1][0]]); }} />
                                )}
                                {!showB && (
                                    <div className="text-sm text-slate-400">k = <span className="font-mono text-slate-100">{num(cur.k)}</span></div>
                                )}
                            </div>
                            <div className="text-slate-100 text-sm sm:text-base">
                                {stage === 'result' || !guided ? <Tex block>{formula}</Tex> : (
                                    <p className="text-sm text-slate-500">The result appears once the tour reaches it.</p>
                                )}
                            </div>
                            <p className="text-xs text-slate-500">
                                Each component is handled on its own: x with x, y with y. That is why the picture rules and the arithmetic always agree.
                            </p>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The rules, as pictures</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-pink-400 font-semibold">a + b</span> — walk a, then b from its tip. Order does not matter.</li>
                            <li><span className="text-slate-200 font-semibold">ka, k &gt; 1</span> — longer, same direction.</li>
                            <li><span className="text-slate-200 font-semibold">ka, 0 &lt; k &lt; 1</span> — shorter, same direction.</li>
                            <li><span className="text-slate-200 font-semibold">ka, k &lt; 0</span> — flipped, then stretched by |k|.</li>
                            <li><span className="text-pink-400 font-semibold">a − b</span> — a + (−b): the arrow from b&apos;s tip to a&apos;s tip.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-sky-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
