"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Vector, Point, Segment, Polygon, Label, MATH_COLORS } from '@/components/math/Plane2D';
import MatrixInput from '@/components/math/MatrixInput';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   A vector is its components. Drawn from a tail T, its tip H is T + v, and
   reading it back is v = H − T: where the arrow is drawn never matters. */
const ORIGIN = [0, 0];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const length = ([x, y]) => Math.sqrt(x * x + y * y);
const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const pair = ([x, y]) => `(${num(x)}, ${num(y)})`;
/** A number squared: (−1.5)² rather than −1.5², in TeX and in plain text. */
const sq = (x) => (x < 0 ? `(${fmt(x)})^2` : `${fmt(x)}^2`);
const sqText = (x) => (x < 0 ? `(${num(x)})²` : `${num(x)}²`);
/** "=" when the rounded value is exact, "≈" when it is not. */
const eqText = (x) => (Math.abs(Math.round(x * 100) / 100 - x) < 1e-9 ? '=' : '≈');

/** Vectors whose length the tour asks about. (0, −3) lies on an axis on purpose. */
const LENGTH_PRESETS = [[3, 4], [-1.5, 2], [-2, -3], [4, -1], [0, -3]];

/** Arrows drawn away from the origin, read back as tip − tail. */
const TAIL_TIP_PRESETS = [
    { tail: [-3, -1], tip: [1, 2] },
    { tail: [2, 3], tip: [-1, 1] },
    { tail: [1, -3], tip: [3, 0.5] },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let prompt = 0;   // how many predict-worthy steps so far: drives the answer slot
    const push = (s) => steps.push({ components: false, magnitude: false, labels: false, ...s });
    push({
        kind: 'opening', tail: ORIGIN, comp: [3, 2],
        explanation: 'This arrow starts at the origin and its tip sits at the point (3, 2). Those two numbers are the whole vector: v = (3, 2). An arrow and a list of numbers are two ways of writing the same thing.',
    });
    push({
        kind: 'walk', tail: ORIGIN, comp: [3, 2], walk: 'x',
        explanation: 'Read the numbers as directions. The first component says: walk 3 units along the x-axis. That green leg is 3î, three copies of the unit vector î = (1, 0).',
    });
    push({
        kind: 'walk', tail: ORIGIN, comp: [3, 2], components: true,
        explanation: 'The second component says: then walk 2 units up. That red leg is 2ĵ. Together they reach the tip, so v = 3î + 2ĵ. Every 2D vector is some amount of î plus some amount of ĵ.',
    });
    push({
        kind: 'length', tail: ORIGIN, comp: [3, 2], components: true, magnitude: true,
        explanation: 'The two legs meet at a right angle, so the arrow is the hypotenuse of a right triangle. Pythagoras gives its length: |v| = √(3² + 2²) = √13 ≈ 3.61.',
    });
    push({
        kind: 'moved', tail: [-3, -1], comp: [3, 2], components: true, labels: true,
        explanation: 'Slide the arrow so its tail sits at (−3, −1). Its tip is now at (0, 1) — but it is the same vector: tip − tail = (0 − (−3), 1 − (−1)) = (3, 2). A vector has a length and a direction, not a position.',
    });
    LENGTH_PRESETS.forEach((v, index) => {
        push({
            kind: 'length-intro', tail: ORIGIN, comp: v, components: true, presetIndex: index, slot: (prompt++ * 3 + 1) % 4,
            explanation: `Next: v = ${pair(v)}. Its legs are ${num(Math.abs(v[0]))} across and ${num(Math.abs(v[1]))} ${v[1] < 0 ? 'down' : 'up'}. Lengths of legs are never negative, whatever the signs of the components.`,
        });
        push({
            kind: 'length', tail: ORIGIN, comp: v, components: true, magnitude: true, presetIndex: index,
            explanation: `|v| = √(${sqText(v[0])} + ${sqText(v[1])}) = √${num(v[0] * v[0] + v[1] * v[1])} ${eqText(length(v))} ${num(length(v))}. Squaring makes both signs positive, which is why the direction of each leg does not matter.${v[0] === 0 ? ' With one component 0 the arrow lies along an axis, and its length is just the size of the other component.' : ''}`,
        });
    });
    TAIL_TIP_PRESETS.forEach(({ tail, tip }, index) => {
        const v = sub(tip, tail);
        push({
            kind: 'tailtip-intro', tail, comp: v, labels: true, presetIndex: index, slot: (prompt++ * 3 + 1) % 4,
            explanation: `This arrow starts at T = ${pair(tail)} and ends at H = ${pair(tip)}. Which vector is it?`,
        });
        push({
            kind: 'tailtip', tail, comp: v, components: true, labels: true, presetIndex: index,
            explanation: `v = H − T = ${pair(tip)} − ${pair(tail)} = ${pair(v)}. Count it on the grid: the green leg goes ${num(Math.abs(v[0]))} ${v[0] < 0 ? 'left' : 'right'} and the red leg ${num(Math.abs(v[1]))} ${v[1] < 0 ? 'down' : 'up'}. The same arrow drawn from the origin would end at ${pair(v)}.`,
        });
    });
    push({
        kind: 'closing', tail: ORIGIN, comp: [3, 2], components: true, magnitude: true,
        explanation: 'That is all a vector is: components you can type, or an arrow you can drag, and the length comes from Pythagoras. Switch to Explore and drag the tip — or the tail.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Two questions: before a length is revealed, how long is the arrow; and for
   an arrow drawn away from the origin, which vector is it. The wrong answers
   are the classic slips — adding the legs, forgetting the square root, taking
   the larger leg; reading off the tip, or subtracting the wrong way round.
   Any that coincide with the right answer are replaced from further down the
   list. The answer's slot comes from the step, not a fixed position. */
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
    if (step.kind === 'length-intro') {
        const [x, y] = step.comp;
        const correct = length(step.comp);
        const wrong = pickWrong(correct, [
            Math.abs(x) + Math.abs(y),          // added the legs
            x * x + y * y,                       // forgot the square root
            Math.max(Math.abs(x), Math.abs(y)),  // took the longer leg
            Math.abs(x) * Math.abs(y),
            x + y,
            correct + 1,
        ], fmt);
        const ordered = [...wrong];
        ordered.splice(step.slot, 0, correct);
        return {
            question: `v = ${pair(step.comp)}. How long is the arrow?`,
            options: ordered.map(num),
            correct: step.slot,
            because: `The legs are ${num(Math.abs(x))} and ${num(Math.abs(y))} and meet at a right angle, so |v| = √(${sqText(x)} + ${sqText(y)}) = √${num(x * x + y * y)} ${eqText(correct)} ${num(correct)}.`,
        };
    }
    if (step.kind === 'tailtip-intro') {
        const tail = step.tail;
        const tip = add(step.tail, step.comp);
        const correct = step.comp;
        const wrong = pickWrong(correct, [
            sub(tail, tip),    // subtracted the wrong way round
            tip,               // read off the tip as if the tail were the origin
            tail,
            add(tip, tail),
            [correct[1], correct[0]],
        ], pair);
        const ordered = [...wrong];
        ordered.splice(step.slot, 0, correct);
        return {
            question: `An arrow from T = ${pair(tail)} to H = ${pair(tip)}. Which vector is it?`,
            options: ordered.map(pair),
            correct: step.slot,
            because: `A vector is how far you travel, so subtract where you started from where you finished: H − T = ${pair(tip)} − ${pair(tail)} = ${pair(correct)}.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'An arrow starts at (1, 2) and ends at (4, 6). Which vector is it?',
        options: ['(4, 6)', '(3, 4)', '(5, 8)', '(−3, −4)'],
        correct: 1,
        explanation: 'A vector is the displacement, tip minus tail: (4 − 1, 6 − 2) = (3, 4). (4, 6) is only where the tip happens to be; drawn from the origin, this arrow would end at (3, 4).',
    },
    {
        question: 'How long is the vector v = (−6, 8)?',
        options: ['2', '14', '10', '100'],
        correct: 2,
        explanation: 'Its legs are 6 and 8, so |v| = √(6² + 8²) = √100 = 10. The minus sign does not shorten anything: squaring makes it positive. 14 adds the legs, and 100 forgets the square root.',
    },
    {
        question: 'Two arrows have the same length and point the same way, but start at different points. Are they the same vector?',
        options: [
            'Yes — a vector records only a length and a direction',
            'No — their tails are different',
            'Only if one of them starts at the origin',
            'Only if they overlap',
        ],
        correct: 0,
        explanation: 'Both have the same tip − tail, so they have the same components and are the same vector. Where an arrow is drawn is a choice of picture, not part of the vector.',
    },
];

const codeExample = `import numpy as np

v = np.array([3, 2])          # the arrow from the origin to (3, 2)
print(v[0], v[1])             # 3 2 -- its components

# Its length, by Pythagoras
print(np.sqrt(v[0]**2 + v[1]**2))   # 3.605...
print(np.linalg.norm(v))            # the same number

# An arrow from tail T to tip H is the vector H - T
T = np.array([-3, -1])
H = np.array([0, 1])
print(H - T)                  # [3 2] -- the same vector, drawn somewhere else`;

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

const EXPLORE_PRESETS = [
    { name: '(3, 4)', comp: [3, 4] },
    { name: '(−4, 1)', comp: [-4, 1] },
    { name: '(2, −3)', comp: [2, -3] },
    { name: '(0, 2.5)', comp: [0, 2.5] },
];

export default function VectorsAndCoordinatesPage() {
    const [mode, setMode] = useState('guided');            // 'guided' | 'explore'
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1300);
    const [tail, setTail] = useState(ORIGIN);              // explore-mode tail
    const [comp, setComp] = useState([3, 2]);              // explore-mode components
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
    const T = guided ? step.tail : tail;
    const v = guided ? step.comp : comp;
    const H = add(T, v);
    const corner = [H[0], T[1]];
    const showComponents = guided ? step.components || step.walk === 'x' : true;
    const showY = guided ? step.components : true;
    const showMagnitude = guided ? step.magnitude : true;
    const showLabels = guided ? step.labels : T[0] !== 0 || T[1] !== 0;
    const len = length(v);
    // While a prediction is open, the numbers panel would give the answer away.
    const hideNumbers = guided && predict.hideExplanation;

    /* Grabbing a handle during the tour switches to Explore, starting from
       whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (guided) { setTail(step.tail); setComp(step.comp); setMode('explore'); setIsPlaying(false); }
    };
    const dragTip = (p) => { const t = guided ? step.tail : tail; takeOver(); setComp(sub(p, t)); };
    // Moving the tail carries the whole arrow: the components do not change.
    const dragTail = (p) => { takeOver(); setTail(p); };
    const keepTipOnPlane = useCallback(([x, y]) => {
        const c = guided ? step.comp : comp;
        return [Math.min(Math.max(x, -5 - Math.min(c[0], 0)), 5 - Math.max(c[0], 0)),
            Math.min(Math.max(y, -5 - Math.min(c[1], 0)), 5 - Math.max(c[1], 0))];
    }, [guided, step, comp]);

    const formula = useMemo(() => {
        const G = MATH_COLORS.i, R = MATH_COLORS.j;
        const parts = [];
        if (T[0] !== 0 || T[1] !== 0) {
            parts.push(String.raw`\mathbf{v} = H - T = (${fmt(H[0])}, ${fmt(H[1])}) - (${fmt(T[0])}, ${fmt(T[1])})`);
        }
        parts.push(String.raw`\mathbf{v} = \begin{bmatrix} \textcolor{${G}}{${fmt(v[0])}} \\ \textcolor{${R}}{${fmt(v[1])}} \end{bmatrix} = \textcolor{${G}}{${fmt(v[0])}}\,\hat{\imath} + \textcolor{${R}}{${fmt(v[1])}}\,\hat{\jmath}`);
        return parts.join(String.raw` \qquad `);
    }, [T, H, v]);
    const lengthFormula = useMemo(() => {
        const G = MATH_COLORS.i, R = MATH_COLORS.j;
        return String.raw`|\mathbf{v}| = \sqrt{\textcolor{${G}}{${sq(v[0])}} + \textcolor{${R}}{${sq(v[1])}}} = \sqrt{${fmt(v[0] * v[0] + v[1] * v[1])}} ${eqText(len) === '=' ? '=' : String.raw`\approx`} \mathbf{${fmt(len)}}`;
    }, [v, len]);

    const explanation = guided
        ? step.explanation
        : len < 1e-9
            ? 'Tip and tail coincide: this is the zero vector, (0, 0). It has length 0 and no direction at all.'
            : `v = ${pair(v)}: ${num(Math.abs(v[0]))} ${v[0] < 0 ? 'left' : 'right'} and ${num(Math.abs(v[1]))} ${v[1] < 0 ? 'down' : 'up'}, length ${num(len)}.${T[0] !== 0 || T[1] !== 0 ? ` It is drawn from ${pair(T)}, but tip − tail is still ${pair(v)}: moving the tail moved the whole arrow.` : ''}`;

    const mid = [(T[0] + H[0]) / 2, (T[1] + H[1]) / 2];
    const normal = len > 1e-9 ? [-v[1] / len, v[0] / len] : [0, 0];

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/vectors" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Vectors
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Vectors and Coordinates</h1>
                    <p className="text-sky-100 max-w-3xl">
                        An arrow you can drag and a pair of numbers you can type are the same object. Move one and watch the other follow — and get the length for free from Pythagoras.
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
                                        onClick={() => { if (key === 'explore' && guided) { setTail(step.tail); setComp(step.comp); } setMode(key); setIsPlaying(false); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag the tip or the tail, or type the components'}
                            </span>
                        </div>

                        <Plane2D xRange={[-5, 5]} yRange={[-5, 5]} ariaLabel="A vector drawn as an arrow, with its x and y components">
                            {showMagnitude && showY && (
                                <Polygon points={[T, corner, H]} fill={MATH_COLORS.area} fillOpacity={0.12} strokeWidth={0} />
                            )}
                            {showComponents && Math.abs(v[0]) > 1e-9 && (
                                <>
                                    <Segment from={T} to={corner} color={MATH_COLORS.i} width={3} dashed />
                                    <Label at={[(T[0] + corner[0]) / 2, T[1]]} anchor="middle" dy={v[1] >= 0 ? 18 : -8} color={MATH_COLORS.i} weight={700}>
                                        {`x = ${num(v[0])}`}
                                    </Label>
                                </>
                            )}
                            {showY && Math.abs(v[1]) > 1e-9 && (
                                <>
                                    <Segment from={corner} to={H} color={MATH_COLORS.j} width={3} dashed />
                                    <Label at={[H[0], (corner[1] + H[1]) / 2]} anchor={v[0] >= 0 ? 'start' : 'end'} dx={v[0] >= 0 ? 8 : -8} dy={4} color={MATH_COLORS.j} weight={700}>
                                        {`y = ${num(v[1])}`}
                                    </Label>
                                </>
                            )}
                            {showMagnitude && len > 1e-9 && (
                                <Label at={[mid[0] + normal[0] * 0.45, mid[1] + normal[1] * 0.45]} anchor="middle" dy={4} color={MATH_COLORS.area} weight={700}>
                                    {`|v| = ${num(len)}`}
                                </Label>
                            )}
                            {showLabels && (
                                <>
                                    <Label at={T} dx={-8} dy={18} anchor="end" color={MATH_COLORS.text}>{`T ${pair(T)}`}</Label>
                                    <Label at={H} dx={10} dy={-10} color={MATH_COLORS.a}>{`H ${pair(H)}`}</Label>
                                </>
                            )}
                            <Vector from={T} to={H} color={MATH_COLORS.a} width={3.5} label={showLabels ? undefined : 'v'} onDrag={dragTip} snap={0.25}
                                ariaLabel={`Drag the tip of v, now at (${num(H[0])}, ${num(H[1])})`} />
                            <Point at={T} color="#e2e8f0" r={5} onDrag={dragTail} snap={0.25} constrain={keepTipOnPlane}
                                ariaLabel={`Drag the tail of v, now at (${num(T[0])}, ${num(T[1])})`} />
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
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-sky-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {EXPLORE_PRESETS.map(p => (
                                    <button key={p.name} onClick={() => { setComp(p.comp); setTail(ORIGIN); }}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-sky-500">{p.name}</button>
                                ))}
                                <button onClick={() => setTail(ORIGIN)} disabled={tail[0] === 0 && tail[1] === 0}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-sky-500 disabled:opacity-40">Tail back to the origin</button>
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
                            <MatrixInput label="v" value={[[v[0]], [v[1]]]} step={0.25} min={-10} max={10}
                                columnColors={[MATH_COLORS.a]}
                                onChange={(next) => { takeOver(); setComp([next[0][0], next[1][0]]); }} />
                            <div className="text-sm text-slate-400">
                                |v| = <span className="font-mono text-yellow-300">{showMagnitude ? num(len) : '?'}</span>
                                <span className="block text-xs text-slate-500">tail at {pair(T)}, tip at {pair(H)}</span>
                            </div>
                        </div>
                        <div className="text-slate-100 text-sm sm:text-base space-y-1">
                            <Tex block>{formula}</Tex>
                            {showMagnitude && <Tex block>{lengthFormula}</Tex>}
                        </div>
                        <p className="text-xs text-slate-500">
                            Green is how far across, red is how far up. Typing a component moves the tip; dragging the tip retypes the components.
                        </p>
                    </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">One vector, two views</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-amber-300 font-semibold">The arrow</span> — a length and a direction, drawn anywhere.</li>
                            <li><span className="text-green-400 font-semibold">x component</span> — how far across, in copies of î = (1, 0).</li>
                            <li><span className="text-red-400 font-semibold">y component</span> — how far up, in copies of ĵ = (0, 1).</li>
                            <li><span className="text-yellow-300 font-semibold">Length</span> — √(x² + y²), the hypotenuse of the legs.</li>
                            <li><span className="text-slate-200 font-semibold">From T to H</span> — the vector is H − T, wherever T is.</li>
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
