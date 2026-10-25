"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, Vector, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   A long, narrow valley: loss(x, y) = 0.1x² + 0.4y². Its curvatures are
   0.2 across x and 0.8 across y, so one step multiplies x by (1 − 0.2η)
   and y by (1 − 0.8η). The y factor leaves (−1, 1) once η > 2/0.8 = 2.5:
   past that learning rate every step overshoots further than the last. */
const A = 0.1, B = 0.4;
const loss = (x, y) => A * x * x + B * y * y;
const grad = (x, y) => [2 * A * x, 2 * B * y];
const LAMBDA_MAX = 2 * B;
const STABLE_LIMIT = 2 / LAMBDA_MAX;
const RANGE = [-3.2, 3.2];
const R = 3.2;

/** The descent path: start, then each step x ← x − η∇loss(x), until it leaves the map. */
const descend = (start, eta, steps) => {
    const path = [start];
    for (let k = 0; k < steps; k++) {
        const [x, y] = path[path.length - 1];
        const [gx, gy] = grad(x, y);
        const next = [x - eta * gx, y - eta * gy];
        path.push(next);
        if (Math.abs(next[0]) > R || Math.abs(next[1]) > R) break;
    }
    return path;
};

const num = (x, d = 3) => {
    if (!Number.isFinite(x)) return 'undefined';
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 3);
const pt = ([x, y]) => `(${num(x, 2)}, ${num(y, 2)})`;

const START = [-2.6, 1.5];
const BEHAVIOURS = [
    'Creep slowly towards the minimum',
    'Converge smoothly and quickly',
    'Zigzag across the valley but still converge',
    'Bounce further out each step: diverge',
];
const PRESETS = [
    { eta: 0.3, behaviour: 0, note: 'Each step multiplies x by 0.94: after 8 steps the ball has covered barely a third of the way. Safe, but slow — training like this wastes compute.' },
    { eta: 1.2, behaviour: 1, note: 'y shrinks by 0.04 per step and x by 0.76: the ball drops onto the valley floor at once and rolls along it to the minimum.' },
    { eta: 2.3, behaviour: 2, note: 'y is multiplied by 1 − 0.8 × 2.3 = −0.84 each step: the ball jumps to the other wall every time, but lands a little lower, so it still settles.' },
    { eta: 2.8, behaviour: 3, note: 'y is multiplied by 1 − 0.8 × 2.8 = −1.24: each jump lands higher up the opposite wall than the last. The loss grows without bound — training has diverged.' },
];
const STEPS_PER_PRESET = 8;

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    steps.push({
        kind: 'opening', eta: PRESETS[0].eta, path: [START], presetIndex: 0,
        explanation: `A loss surface: low is good. Training a model means walking downhill on it. Gradient descent looks at the slope where it stands, ∇loss, and takes a step the other way, scaled by the learning rate η. The ball starts at ${pt(START)}, loss ${num(loss(...START))}.`,
    });
    PRESETS.forEach((p, presetIndex) => {
        const full = descend(START, p.eta, STEPS_PER_PRESET);
        steps.push({
            kind: 'intro', eta: p.eta, path: [START], presetIndex,
            explanation: `Learning rate η = ${num(p.eta)}. Each step moves by −${num(p.eta)} × ∇loss: x is multiplied by 1 − 0.2η = ${num(1 - 0.2 * p.eta)}, and y by 1 − 0.8η = ${num(1 - 0.8 * p.eta)}.`,
        });
        for (let k = 1; k < full.length; k++) {
            const [x, y] = full[k];
            const off = Math.abs(x) > R || Math.abs(y) > R;
            steps.push({
                kind: 'descent', eta: p.eta, path: full.slice(0, k + 1), presetIndex, k,
                explanation: off
                    ? `Step ${k}: the ball is thrown to ${pt(full[k])}, off the map. The loss is ${num(loss(x, y))} and climbing.`
                    : `Step ${k}: the ball lands at ${pt(full[k])}, loss ${num(loss(x, y))}${loss(x, y) < loss(...full[k - 1]) ? ', lower than before' : ', higher than before'}.`,
            });
        }
        steps.push({ kind: 'summary', eta: p.eta, path: full, presetIndex, explanation: `η = ${num(p.eta)}: ${p.note}` });
    });
    steps.push({
        kind: 'limitIntro', eta: 2.5, path: [START], presetIndex: 3,
        explanation: 'So somewhere between 2.3 and 2.8 the descent stops working. The steep direction decides it: across y the curvature is 0.8, and one step multiplies y by 1 − 0.8η.',
    });
    steps.push({
        kind: 'limit', eta: 2.5, path: descend(START, 2.5, STEPS_PER_PRESET), presetIndex: 3,
        explanation: `The factor 1 − 0.8η stays inside (−1, 1) only while η < 2/0.8 = ${num(STABLE_LIMIT)}. At exactly 2.5 it is −1: the ball bounces between the same two heights for ever. In general the limit is 2 divided by the steepest curvature.`,
    });
    steps.push({
        kind: 'closing', eta: 1.2, path: descend(START, 1.2, 20), presetIndex: 1,
        explanation: 'This is how neural networks learn: the loss lives over millions of weights instead of two, but every update is this step. Too small a learning rate wastes time; too large, and training blows up. Switch to Explore to try your own.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each learning rate plays: what will the descent do? Each of the
   four behaviours is the answer exactly once, in a fixed option order.
   After its first step: where will y land next — computed from ∇loss, with
   the slips of not moving, overshooting by exactly y, and using the x
   curvature. Then one question on the stability limit. */
const predictFor = (step, next) => {
    if (!step || !next) return null;
    if (step.kind === 'descent' && step.k === 1 && next.kind === 'descent') {
        const [, y] = step.path[step.path.length - 1];
        const eta = step.eta;
        const correct = y - eta * 2 * B * y;
        const seen = new Set([num(correct, 2)]);
        const wrong = [];
        for (const w of [y, -y, y - eta * 2 * A * y, y + eta * 2 * B * y, correct / 2]) {
            if (wrong.length < 3 && !seen.has(num(w, 2))) { seen.add(num(w, 2)); wrong.push(w); }
        }
        const slot = (step.presetIndex * 3 + 1) % 4;
        const options = [...wrong];
        options.splice(slot, 0, correct);
        return {
            question: `The ball is at y = ${num(y, 2)} with η = ${num(eta)}. Where will y be after the next step?`,
            options: options.map(v => `y = ${num(v, 2)}`), correct: slot,
            because: `∂loss/∂y = 0.8y = ${num(0.8 * y, 3)}, so y ← ${num(y, 2)} − ${num(eta)} × ${num(0.8 * y, 3)} = ${num(correct, 2)}.`,
        };
    }
    if (step.kind === 'intro' && next.kind === 'descent') {
        const p = PRESETS[step.presetIndex];
        return {
            question: `η = ${num(p.eta)}. What will gradient descent do from here?`,
            options: BEHAVIOURS, correct: p.behaviour,
            because: `Per step, y is multiplied by 1 − 0.8η = ${num(1 - 0.8 * p.eta)} and x by ${num(1 - 0.2 * p.eta)}. ${BEHAVIOURS[p.behaviour]}.`,
        };
    }
    if (step.kind === 'limitIntro' && next.kind === 'limit') {
        const options = ['η < 0.8', 'η < 1.25', `η < ${num(STABLE_LIMIT)}`, 'η < 5'];
        return {
            question: 'The steepest curvature is 0.8. Up to which learning rate does gradient descent still converge?',
            options, correct: 2,
            because: '|1 − 0.8η| < 1 means 0 < η < 2/0.8 = 2.5. (1.25 = 1/0.8 is the rate that kills y in one step; 5 would be the limit for the gentle x-direction alone.)',
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'Gradient descent updates a parameter with w ← w − η·∂L/∂w. Why the minus sign?',
        options: [
            'The gradient points uphill, so stepping against it lowers the loss',
            'It keeps η positive',
            'It makes the steps smaller over time',
            'Without it the loss would be negative',
        ],
        correct: 0,
        explanation: 'The gradient is the direction of steepest increase. To decrease the loss, step the opposite way: −∇L.',
    },
    {
        question: 'On loss = 0.4y², what does one step with learning rate η do to y?',
        options: ['y ← y − 0.4η', 'y ← y(1 − 0.8η)', 'y ← y(1 + 0.8η)', 'y ← 0.8ηy'],
        correct: 1,
        explanation: 'dL/dy = 0.8y, so y ← y − η·0.8y = y(1 − 0.8η). The step converges while |1 − 0.8η| < 1, i.e. 0 < η < 2.5, and oscillates in sign once η > 1.25.',
    },
    {
        question: 'Training loss starts rising and soon becomes enormous. What is the most likely fix?',
        options: ['Increase the learning rate', 'Decrease the learning rate', 'Train for more steps', 'Start from a different random seed'],
        correct: 1,
        explanation: 'Exploding loss is the signature of η above the stability limit 2/λmax: each step overshoots the valley by more than the last. A smaller learning rate brings every factor |1 − λη| back below 1.',
    },
];

const codeExample = `import numpy as np

def loss(w):            # a narrow valley: curvature 0.2 in x, 0.8 in y
    return 0.1 * w[0]**2 + 0.4 * w[1]**2

def grad(w):
    return np.array([0.2 * w[0], 0.8 * w[1]])

def descend(eta, steps=8, w0=(-2.6, 1.5)):
    w = np.array(w0, dtype=float)
    for _ in range(steps):
        w = w - eta * grad(w)          # the whole algorithm
    return w, loss(w)

for eta in [0.3, 1.2, 2.3, 2.8]:
    print(eta, descend(eta))
# 0.3 creeps, 1.2 converges, 2.3 zigzags but settles, 2.8 blows up
# stability limit: 2 / (largest curvature) = 2 / 0.8 = 2.5`;

/* ── page ──────────────────────────────────────────────── */

const LEVELS = [0.05, 0.15, 0.3, 0.5, 0.8, 1.2, 1.8, 2.6, 3.6];
const LEVEL_COLORS = ['#1d4ed8', '#2563eb', '#0284c7', '#0ea5e9', '#14b8a6', '#84cc16', '#eab308', '#f59e0b', '#f97316'];
const SURFACE_RANGE = [-3, 3];

/* The contours are ellipses x²/(c/A) + y²/(c/B) = 1, drawn exactly. */
function ContourEllipses() {
    const { toScreen, scale } = usePlane();
    const [cx, cy] = toScreen([0, 0]);
    return (
        <g>
            {LEVELS.map((c, i) => (
                <ellipse key={c} cx={cx} cy={cy} rx={Math.sqrt(c / A) * scale} ry={Math.sqrt(c / B) * scale}
                    fill="none" stroke={LEVEL_COLORS[i]} strokeWidth={1.3} opacity={0.85} />
            ))}
        </g>
    );
}

function PathLine({ path, color }) {
    const { toScreen } = usePlane();
    const d = path.map((p, i) => {
        const clamped = [Math.min(Math.max(p[0], -R * 1.2), R * 1.2), Math.min(Math.max(p[1], -R * 1.2), R * 1.2)];
        const [sx, sy] = toScreen(clamped);
        return `${i ? 'L' : 'M'}${sx.toFixed(1)},${sy.toFixed(1)}`;
    }).join('');
    return <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />;
}

function ContourMap({ path, eta, showNext, onDragStart }) {
    const cur = path[path.length - 1];
    const inMap = Math.abs(cur[0]) <= R && Math.abs(cur[1]) <= R;
    const [gx, gy] = grad(...cur);
    const step = [-eta * gx, -eta * gy];
    return (
        <Plane2D xRange={RANGE} yRange={RANGE} width={420} ariaLabel="Contour map of the loss with the descent path">
            <ContourEllipses />
            <PathLine path={path} color={MATH_COLORS.a} />
            {path.slice(1, -1).map((p, i) => Math.abs(p[0]) <= R && Math.abs(p[1]) <= R && <Point key={i} at={p} color={MATH_COLORS.a} r={3} />)}
            {showNext && inMap && Math.hypot(...step) > 1e-3 && (
                <Vector from={cur} to={[cur[0] + step[0], cur[1] + step[1]]} color={MATH_COLORS.result} width={2} dashed label="−η∇" />
            )}
            {inMap && <Point at={cur} color={MATH_COLORS.result} r={6} />}
            <Point at={path[0]} color={MATH_COLORS.a} r={6} label="start" onDrag={onDragStart} snap={0.05}
                ariaLabel={`Starting point ${pt(path[0])}; drag to move it`} />
        </Plane2D>
    );
}

function LossChart({ path }) {
    const W = 280, H = 90, pad = 4;
    const ls = path.map(p => loss(...p));
    const top = Math.max(ls[0] * 1.6, 0.5);
    const xs = (i) => pad + (i * (W - 2 * pad)) / Math.max(STEPS_PER_PRESET, path.length - 1);
    const ys = (v) => H - pad - (Math.min(v, top) / top) * (H - 2 * pad);
    const d = ls.map((v, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join('');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Loss after each step" className="block">
            <rect x={0} y={0} width={W} height={H} fill="#020617" />
            <line x1={pad} y1={ys(ls[0])} x2={W - pad} y2={ys(ls[0])} stroke="#334155" strokeDasharray="4 3" />
            <path d={d} fill="none" stroke="#f472b6" strokeWidth={2} />
            {ls.map((v, i) => <circle key={i} cx={xs(i)} cy={ys(v)} r={2.5} fill={v > top ? '#fb7185' : '#f472b6'} />)}
            <text x={W - pad} y={12} textAnchor="end" fontSize={10} fill="#94a3b8">{`loss ${num(ls[ls.length - 1])}`}</text>
        </svg>
    );
}

function LossScene({ path }) {
    const lift = 0.05;
    const onSurface = path.filter(p => Math.abs(p[0]) <= 3 && Math.abs(p[1]) <= 3);
    const pts = onSurface.map(([x, y]) => [x, y, loss(x, y) + lift]);
    const cur = path[path.length - 1];
    const curOn = Math.abs(cur[0]) <= 3 && Math.abs(cur[1]) <= 3;
    return (
        <Scene3D height={340} distance={16} axisSize={3.4}
            ariaLabel="The loss surface with the ball's path"
            fallback={<p className="text-sm text-slate-300 font-mono">loss = {num(loss(...cur))} after {path.length - 1} steps</p>}>
            {(T) => (
                <>
                    <T.Surface3D f={loss} xRange={SURFACE_RANGE} yRange={SURFACE_RANGE} segments={40} opacity={0.75} />
                    {pts.length > 1 && <T.Line3D points={pts} color={MATH_COLORS.a} width={3} />}
                    {pts.slice(0, -1).map((p, i) => <T.Point3D key={i} at={p} color={MATH_COLORS.a} size={0.05} />)}
                    {curOn && <T.Point3D at={[cur[0], cur[1], loss(...cur) + 0.13]} color={MATH_COLORS.result} size={0.14} />}
                    <T.Point3D at={[0, 0, 0.02]} color={MATH_COLORS.i} size={0.07} label="min" />
                </>
            )}
        </Scene3D>
    );
}

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
                    className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-emerald-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function GradientDescentPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
    const [eta, setEta] = useState(1.2);            // explore-mode state
    const [start, setStart] = useState(START);
    const [count, setCount] = useState(12);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[currentStep];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(c => c + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const guided = mode === 'guided';
    const ETA = guided ? step.eta : eta;
    const path = useMemo(() => (guided ? step.path : descend(start, eta, count)), [guided, step, start, eta, count]);
    const cur = path[path.length - 1];
    const prev = path.length > 1 ? path[path.length - 2] : null;

    /* Grabbing the start or a slider during the tour switches to Explore,
       starting from whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setEta(step.eta); setStart(step.path[0]); setCount(Math.max(STEPS_PER_PRESET, step.path.length - 1));
        setMode('explore'); setIsPlaying(false);
    };

    const fx = 1 - 2 * A * ETA, fy = 1 - 2 * B * ETA;
    const shown = prev ?? cur;
    const g = grad(...shown);
    const after = prev ? cur : [shown[0] - ETA * g[0], shown[1] - ETA * g[1]];
    const formula = String.raw`\begin{pmatrix} x \\ y \end{pmatrix} \leftarrow \begin{pmatrix} ${fmt(shown[0])} \\ ${fmt(shown[1])} \end{pmatrix} - ${fmt(ETA)}\begin{pmatrix} ${fmt(g[0])} \\ ${fmt(g[1])} \end{pmatrix} = \begin{pmatrix} ${fmt(after[0])} \\ ${fmt(after[1])} \end{pmatrix}`;
    const factors = String.raw`x \times (1 - 0.2\eta) = x \times \textcolor{${Math.abs(fx) < 1 ? MATH_COLORS.i : MATH_COLORS.negative}}{${fmt(fx)}}, \qquad y \times (1 - 0.8\eta) = y \times \textcolor{${Math.abs(fy) < 1 ? MATH_COLORS.i : MATH_COLORS.negative}}{${fmt(fy)}}`;
    const hide = guided && predict.hideExplanation;

    const behaviourOf = (e) => (Math.abs(1 - 2 * B * e) >= 1 ? 3 : 1 - 2 * B * e < 0 ? 2 : Math.max(Math.abs(1 - 2 * A * e), Math.abs(1 - 2 * B * e)) > 0.9 ? 0 : 1);
    const exploreNote = (() => {
        const b = behaviourOf(eta);
        const msgs = [
            `η = ${num(eta)} is safe but slow: the slowest factor is ${num(Math.max(Math.abs(fx), Math.abs(fy)))}, so each step removes less than a tenth of the remaining distance.`,
            `η = ${num(eta)} converges smoothly: both factors are between 0 and 1. The gentle x-direction (factor ${num(fx)}) sets the pace.`,
            `η = ${num(eta)} overshoots in y (factor ${num(fy)} is negative), so the ball zigzags — but |${num(fy)}| < 1, so it still settles.`,
            `η = ${num(eta)} is past the limit 2/0.8 = 2.5: |1 − 0.8η| = ${num(Math.abs(fy))} ≥ 1, so every step overshoots further. Diverged.`,
        ];
        return `${msgs[b]} Loss after ${path.length - 1} steps: ${num(loss(...cur))}.`;
    })();

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/differential-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Differential Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Gradient Descent</h1>
                    <p className="text-emerald-50 max-w-3xl">
                        The algorithm that trains neural networks: feel the slope, step downhill, repeat. The learning rate decides whether that walk crawls, converges, zigzags or blows up.
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
                                        onClick={() => { if (key === 'explore') takeOver(); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {guided ? `η = ${num(ETA)} · step ${currentStep + 1} of ${stepHistory.length}` : 'Drag the start, or slide the learning rate'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Loss surface: loss = 0.1x² + 0.4y²</p>
                                <LossScene path={path} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">The same walk on the contour map</p>
                                <div className="rounded-lg overflow-hidden border border-slate-700/60">
                                    <ContourMap path={path} eta={ETA} showNext={!guided || step.kind !== 'intro'}
                                        onDragStart={([x, y]) => { takeOver(); setStart([x, y]); }} />
                                </div>
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-xs text-slate-500 mb-1">Loss after each step</p>
                            <div className="rounded-lg overflow-hidden border border-slate-800"><LossChart path={path} /></div>
                        </div>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(c => Math.max(c - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(v => !v)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(c => Math.min(c + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="emerald" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-emerald-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    {PRESETS.map(p => (
                                        <button key={p.eta} onClick={() => setEta(p.eta)}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${p.eta === eta ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-slate-700 text-slate-300 hover:border-emerald-500'}`}>
                                            η = {num(p.eta)}
                                        </button>
                                    ))}
                                    <button onClick={() => setStart(START)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-emerald-500">Reset start</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ParamSlider label="Learning rate η" value={eta} onChange={setEta} min={0.05} max={3} step={0.05} accent="emerald" format={(v) => num(v, 2)}
                                        hint="Stable while η < 2/0.8 = 2.5" />
                                    <ParamSlider label="Steps" value={count} onChange={setCount} min={1} max={40} step={1} accent="emerald" />
                                </div>
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="emerald" />}

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p className="text-emerald-200 text-sm leading-relaxed">
                                {guided ? (hide ? 'Make your prediction above to reveal this step.' : step.explanation) : exploreNote}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-3 text-slate-100 text-sm sm:text-base">
                        <Tex block>{String.raw`\nabla \text{loss}(x, y) = (0.2x,\; 0.8y)`}</Tex>
                        <Tex block>{formula}</Tex>
                        {!hide && <Tex block>{factors}</Tex>}
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Choosing the learning rate</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li className={guided && !hide && step.kind !== 'intro' && step.presetIndex === 0 ? 'text-slate-200' : ''}><span className="text-sky-300 font-semibold">Too small</span> — every step is safe, but the walk takes for ever.</li>
                            <li className={guided && !hide && step.kind !== 'intro' && step.presetIndex === 1 ? 'text-slate-200' : ''}><span className="text-green-300 font-semibold">Well chosen</span> — fast, smooth progress to the minimum.</li>
                            <li className={guided && !hide && step.kind !== 'intro' && step.presetIndex === 2 ? 'text-slate-200' : ''}><span className="text-amber-300 font-semibold">Large</span> — zigzags across the steep direction but still settles.</li>
                            <li className={guided && !hide && step.kind !== 'intro' && step.presetIndex === 3 ? 'text-slate-200' : ''}><span className="text-rose-300 font-semibold">Too large</span> — past 2/λmax every step overshoots further: divergence.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(v => !v)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-emerald-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
