"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Square, Box, Plus, Minus,
} from 'lucide-react';
import Plane2D, { Point, Segment, Polygon, Label, MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Fitting y ≈ mx + c to points (xᵢ, yᵢ) is solving Ax ≈ b with
   A = [x 1] (a column of x-values and a column of ones) and b = y.
   The normal equations AᵀA [m c]ᵀ = Aᵀb give the best fit. */
const EPS = 1e-9;
const sum = (a) => a.reduce((s, x) => s + x, 0);
/** The least-squares line through the points, or null when every x is the same. */
const fitLine = (pts) => {
    const n = pts.length;
    const sx = sum(pts.map(p => p[0])), sy = sum(pts.map(p => p[1]));
    const sxx = sum(pts.map(p => p[0] * p[0])), sxy = sum(pts.map(p => p[0] * p[1]));
    const d = sxx * n - sx * sx;
    if (Math.abs(d) < EPS) return null;
    return { m: (sxy * n - sx * sy) / d, c: (sxx * sy - sx * sxy) / d, normal: { sxx, sx, n, sxy, sy } };
};
const residuals = (pts, m, c) => pts.map(([x, y]) => y - (m * x + c));
const sse = (pts, m, c) => sum(residuals(pts, m, c).map(r => r * r));
/** The line through the first and last points, a tempting but worse fit. */
const endpointsLine = (pts) => {
    const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1];
    const m = (y1 - y0) / (x1 - x0);
    return { m, c: y0 - m * x0 };
};
/** x regressed on y, then solved for y: the classic wrong way round. */
const reversedLine = (pts) => {
    const f = fitLine(pts.map(([x, y]) => [y, x]));
    if (!f || Math.abs(f.m) < EPS) return null;
    return { m: 1 / f.m, c: -f.c / f.m };
};
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dot = (u, v) => u.reduce((s, x, i) => s + x * v[i], 0);

const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const triple = (u) => `(${u.map(num).join(', ')})`;
const lineText = ({ m, c }) => `y = ${num(m)}x ${c < 0 ? '−' : '+'} ${num(Math.abs(c))}`;

const DATASETS = [
    [[-3, -2], [-1, -1], [0, 1], [2, 1.5], [3, 3]],
    [[-3, 2], [-2, 2.5], [0, 0.5], [1, 0], [3, -1.5]],
    [[-2, -3], [-1, 0], [1, 0.5], [2, 2], [3, 1.5]],
    [[-3, 0.5], [-1, 1.5], [0, 1], [2, 2.5], [3, 2]],
];
/** Three points each, so b = (y₁, y₂, y₃) can be drawn in 3D. */
const TRIPLES = [
    [[-1, 1], [0, 2], [2, 2]],
    [[-2, -1], [1, 0.5], [2, 2]],
    [[-1, 2], [1, 0], [2, 1]],
    [[0, -1], [1, 1], [3, 1]],
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let prompt = 0;
    const push = (s) => steps.push({ dim: 2, line: null, show: [], ...s });
    const D = DATASETS[0];
    const best = fitLine(D);
    const flat = { m: 0, c: sum(D.map(p => p[1])) / D.length };
    const ends = endpointsLine(D);
    push({ kind: 'opening', pts: D,
        explanation: 'Five points that almost lie on a line, but not quite: no line passes through all of them. Which line comes closest — and closest in what sense?' });
    push({ kind: 'teach', pts: D, line: flat, show: ['residuals', 'squares'],
        explanation: `Try a flat line at the average height, ${lineText(flat)}. The red segments are the residuals — how far each point sits above or below the line. Least squares adds up their squares, the shaded boxes: ${num(sse(D, flat.m, flat.c))}.` });
    push({ kind: 'teach', pts: D, line: ends, show: ['residuals', 'squares'],
        explanation: `The line through the first and last points, ${lineText(ends)}, does better: total squared error ${num(sse(D, ends.m, ends.c))}. But it lets the middle points pull nothing.` });
    push({ kind: 'teach', pts: D, line: best, show: ['residuals', 'squares'],
        explanation: `The least-squares line, ${lineText(best)}, has the smallest possible total: ${num(sse(D, best.m, best.c))}. No other slope or intercept gives smaller squares.` });
    push({ kind: 'teach', pts: D, line: best, show: ['residuals', 'normal'],
        explanation: `It comes from the normal equations AᵀA [m, c] = Aᵀb, with A's columns the x-values and a column of ones. Here Σx² = ${num(best.normal.sxx)}, Σx = ${num(best.normal.sx)}, n = ${best.normal.n}, Σxy = ${num(best.normal.sxy)}, Σy = ${num(best.normal.sy)}.` });
    const r = residuals(D, best.m, best.c);
    push({ kind: 'teach', pts: D, line: best, show: ['residuals', 'normal'],
        explanation: `Two facts about the best residuals: they add to ${num(sum(r))}, and Σ xᵢrᵢ = ${num(sum(r.map((ri, i) => ri * D[i][0])))}. In vector language, Aᵀr = 0: the residual vector is perpendicular to both columns of A.` });

    DATASETS.slice(1).concat([DATASETS[0]]).forEach((pts, i) => {
        push({ kind: 'line-intro', pts, slot: (prompt++ * 3 + 1) % 4, presetIndex: i,
            explanation: 'New points. Which of these lines is the least-squares fit?' });
        const f = fitLine(pts);
        push({ kind: 'line', pts, line: f, show: ['residuals', 'squares'], presetIndex: i,
            explanation: `${lineText(f)}, with total squared error ${num(sse(pts, f.m, f.c))}. Every other line — including the ones through two of the points — has bigger squares.` });
    });

    const T = TRIPLES[0];
    const tf = fitLine(T);
    push({ kind: 'teach3', pts: T, line: tf, dim: 3, show: ['columns', 'b'],
        explanation: `Now the picture behind it. With three points, b = (y₁, y₂, y₃) = ${triple(T.map(p => p[1]))} is one arrow in 3D, and A has two columns: the x-values ${triple(T.map(p => p[0]))} (green) and the ones (1, 1, 1) (red).` });
    push({ kind: 'teach3', pts: T, line: tf, dim: 3, show: ['columns', 'b', 'plane'],
        explanation: 'Every m·(x-values) + c·(ones) lies on the violet plane — the column space of A. b is off the plane: no exact line exists, which is why the three points are not collinear.' });
    push({ kind: 'teach3', pts: T, line: tf, dim: 3, show: ['columns', 'b', 'plane', 'p', 'r'],
        explanation: `The best we can do is the point p on the plane closest to b: its projection, ${triple(T.map(([x]) => tf.m * x + tf.c))}. Those are the fitted values — the line's heights at the three x's. The residual b − p is perpendicular to the plane.` });
    TRIPLES.forEach((pts, i) => {
        const f = fitLine(pts);
        push({ kind: 'proj-intro', pts, line: f, dim: 3, slot: (prompt++ * 3 + 1) % 4, presetIndex: i, show: ['columns', 'b', 'plane'],
            explanation: `Points ${pts.map(p => `(${num(p[0])}, ${num(p[1])})`).join(', ')}, best line ${lineText(f)}. Where does b = ${triple(pts.map(p => p[1]))} project onto the column space?` });
        push({ kind: 'proj', pts, line: f, dim: 3, presetIndex: i, show: ['columns', 'b', 'plane', 'p', 'r'],
            explanation: `p = A[m, c] = ${triple(pts.map(([x]) => f.m * x + f.c))}: the best line's heights at x = ${pts.map(p => num(p[0])).join(', ')}. The residual ${triple(residuals(pts, f.m, f.c))} is perpendicular to both columns.` });
    });
    push({ kind: 'closing', pts: D, line: best, show: ['residuals', 'squares'],
        explanation: 'Least squares is a projection: the best fit is the point of the column space closest to b, and the leftover is perpendicular. Switch to Explore and drag the points.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   "Which line?" offers lines a learner might reasonably reach for: through the
   first and last points, flat at the average height, and x regressed on y
   (the wrong way round). "Where does b project?" offers b itself, the flat
   average, and the slope part alone without the intercept. */
const pickWrong = (correct, candidates, label) => {
    const seen = new Set([label(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (!c || seen.has(label(c))) continue;
        seen.add(label(c));
        wrong.push(c);
    }
    return wrong;
};

const predictFor = (step) => {
    if (!step) return null;
    if (step.kind === 'line-intro') {
        const f = fitLine(step.pts);
        const mean = sum(step.pts.map(p => p[1])) / step.pts.length;
        const ordered = pickWrong(f, [endpointsLine(step.pts), { m: 0, c: mean }, reversedLine(step.pts), { m: f.m, c: f.c + 1 }], lineText);
        ordered.splice(step.slot, 0, f);
        return {
            question: `Points ${step.pts.map(p => `(${num(p[0])}, ${num(p[1])})`).join(', ')}. Which line is the least-squares fit?`,
            options: ordered.map(lineText),
            correct: step.slot,
            because: `The normal equations give m = ${num(f.m)} and c = ${num(f.c)}. It has the smallest total squared error, ${num(sse(step.pts, f.m, f.c))}.`,
        };
    }
    if (step.kind === 'proj-intro') {
        const { m, c } = step.line;
        const p = step.pts.map(([x]) => m * x + c);
        const mean = sum(step.pts.map(q => q[1])) / step.pts.length;
        const ordered = pickWrong(p, [step.pts.map(q => q[1]), step.pts.map(() => mean), step.pts.map(([x]) => m * x), p.map(v => v + 1)], triple);
        ordered.splice(step.slot, 0, p);
        return {
            question: `Best line ${lineText(step.line)}. Where does b = ${triple(step.pts.map(q => q[1]))} project onto the column space?`,
            options: ordered.map(triple),
            correct: step.slot,
            because: `The projection is A times the best coefficients: m·(x-values) + c·(ones) = ${triple(p)}, the line's heights at each x.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'The least-squares line minimises…',
        options: ['the sum of the residuals', 'the sum of the squared vertical distances to the points', 'the largest distance to any point', 'the number of points off the line'],
        correct: 1,
        explanation: 'It minimises Σ rᵢ², the total area of the squares. The plain sum of residuals is always 0 for the best line, so it cannot tell good lines from bad.',
    },
    {
        question: 'Why is the residual vector perpendicular to the column space of A?',
        options: [
            'The best fit Ax̂ is the projection of b onto the column space, and what a projection leaves over is perpendicular',
            'Because the residuals are all zero',
            'Because A is a square matrix',
            'Because the points lie on a line',
        ],
        correct: 0,
        explanation: 'The closest point of a plane to b is found by dropping a perpendicular. So b − Ax̂ is perpendicular to every column: Aᵀ(b − Ax̂) = 0, which is exactly the normal equations.',
    },
    {
        question: 'When do the normal equations AᵀA x̂ = Aᵀb have exactly one solution for a line fit?',
        options: ['Always', 'Only with exactly two points', 'When the points all lie on one line', 'When at least two points have different x-values'],
        correct: 3,
        explanation: 'If every x is the same, the x-column is a multiple of the ones column, AᵀA is singular, and the best line is vertical — not of the form y = mx + c. Two different x-values make the columns independent.',
    },
];

const codeExample = `import numpy as np

x = np.array([-3, -1, 0, 2, 3], dtype=float)
y = np.array([-2, -1, 1, 1.5, 3])

A = np.column_stack([x, np.ones_like(x)])     # columns: x-values and ones
m, c = np.linalg.solve(A.T @ A, A.T @ y)       # the normal equations
print(m, c)

print(np.linalg.lstsq(A, y, rcond=None)[0])    # the same, the stable way

r = y - A @ np.array([m, c])                   # residuals
print(A.T @ r)                                 # ~[0. 0.] -- perpendicular to both columns
print(r.sum())                                 # ~0.0`;

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

/** One coordinate of one point, typed. Keeps its own text while it is mid-edit ("-", "1."). */
function CoordInput({ value, onChange, label }) {
    const [text, setText] = useState(String(value));
    useEffect(() => { setText(t => (Number(t) === value ? t : String(value))); }, [value]);
    return (
        <input type="number" step={0.25} min={-4.5} max={4.5} value={text} aria-label={label}
            onChange={e => {
                setText(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value.trim() !== '' && Number.isFinite(n)) onChange(Math.min(4.5, Math.max(-4.5, n)));
            }}
            className="w-14 bg-slate-900 border border-slate-700 rounded-md px-1 py-0.5 text-right font-mono text-sm text-inherit focus:outline-none focus:border-slate-400" />
    );
}

export default function LeastSquaresPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [tab, setTab] = useState(2);
    const [pts, setPts] = useState(DATASETS[0]);
    const [squares, setSquares] = useState(true);
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
    const dim = guided ? step.dim : tab;
    const P = guided ? step.pts : pts;
    const fit = useMemo(() => fitLine(P), [P]);
    const line = guided ? step.line : fit;
    const show = guided ? step.show : ['residuals', ...(squares ? ['squares'] : []), 'normal', 'columns', 'b', 'plane', 'p', 'r'];
    const has = (k) => show.includes(k);
    const hideNumbers = guided && predict.hideExplanation;
    const res = line ? residuals(P, line.m, line.c) : [];

    /* 3D: the first three points */
    const T = P.slice(0, 3);
    const fit3 = guided && step.dim === 3 ? step.line : (T.length === 3 ? fitLine(T) : null);
    const xcol = T.map(p => p[0]), ones = [1, 1, 1], bvec = T.map(p => p[1]);
    const pvec = fit3 ? xcol.map(x => fit3.m * x + fit3.c) : null;
    const normal3 = cross(xcol, ones);

    const goExplore = (nextTab) => {
        if (guided) { setPts(step.pts.map(p => [...p])); setMode('explore'); setIsPlaying(false); }
        if (nextTab) setTab(nextTab);
    };
    const dragPoint = (i) => (p) => { goExplore(2); setPts(ps => ps.map((q, k) => (k === i ? p : q))); };
    const addPoint = () => setPts(ps => (ps.length >= 8 ? ps : [...ps, [Math.round((ps.length % 2 ? -1.5 : 1.5) * 4) / 4, 0]]));
    const removePoint = () => setPts(ps => (ps.length <= 3 ? ps : ps.slice(0, -1)));

    const formula = useMemo(() => {
        if (!fit) return String.raw`\text{every } x \text{ is the same: } A^{\mathsf T}A \text{ is singular}`;
        const n = fit.normal;
        return String.raw`\underbrace{\begin{bmatrix} ${fmt(n.sxx)} & ${fmt(n.sx)} \\ ${fmt(n.sx)} & ${n.n} \end{bmatrix}}_{A^{\mathsf T}A}\begin{bmatrix} m \\ c \end{bmatrix} = \underbrace{\begin{bmatrix} ${fmt(n.sxy)} \\ ${fmt(n.sy)} \end{bmatrix}}_{A^{\mathsf T}\mathbf{b}} \;\Rightarrow\; m = ${fmt(fit.m)},\; c = ${fmt(fit.c)}`;
    }, [fit]);
    const formulaR = useMemo(() => {
        if (!fit) return null;
        const r = residuals(P, fit.m, fit.c);
        return String.raw`\textstyle\sum r_i^2 = ${fmt(sse(P, fit.m, fit.c))} \qquad A^{\mathsf T}\mathbf{r} = \left(\sum x_i r_i,\ \sum r_i\right) = (${fmt(sum(r.map((ri, i) => ri * P[i][0])))},\ ${fmt(sum(r))})`;
    }, [fit, P]);

    const exploreNote = !fit
        ? 'Every point has the same x, so no line y = mx + c fits: AᵀA is singular. Drag a point sideways.'
        : dim === 2
            ? `Best line ${lineText(fit)}, total squared error ${num(sse(P, fit.m, fit.c))}. Drag a point and the line re-fits instantly; the residuals always add to 0.`
            : T.length === 3 && fit3
                ? `With the first three points, b = ${triple(bvec)} projects to p = ${triple(pvec)}, and b − p is perpendicular to the violet plane.`
                : 'The 3D view needs three points with at least two different x-values.';

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/linear-algebra" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Linear Algebra
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Least Squares</h1>
                    <p className="text-violet-100 max-w-3xl">
                        When no line passes through every point, take the one with the smallest squared errors. Behind the fit is a projection: b dropped onto the column space of A.
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
                                        onClick={() => { if (key === 'explore') goExplore(step.dim); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="View">
                                {[[2, '2D: the fit', Square], [3, '3D: the projection', Box]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={dim === key}
                                        onClick={() => goExplore(key)}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${dim === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {dim === 2 ? (
                            <Plane2D xRange={[-4.5, 4.5]} yRange={[-4.5, 4.5]} ariaLabel="Data points, a candidate line and its residuals">
                                {line && has('squares') && P.map(([x, y], i) => {
                                    const r = res[i], yl = line.m * x + line.c;
                                    const s = Math.abs(r);
                                    return <Polygon key={`sq${i}`} points={[[x, yl], [x + s, yl], [x + s, y], [x, y]]} fill={MATH_COLORS.negative} fillOpacity={0.12} strokeWidth={0.8} />;
                                })}
                                {line && <Segment from={[-5, line.m * -5 + line.c]} to={[5, line.m * 5 + line.c]} color={MATH_COLORS.result} width={3} />}
                                {line && has('residuals') && P.map(([x, y], i) => (
                                    <Segment key={`r${i}`} from={[x, y]} to={[x, line.m * x + line.c]} color={MATH_COLORS.negative} width={2} />
                                ))}
                                {P.map((p, i) => (
                                    <Point key={i} at={p} color={MATH_COLORS.a} r={5.5} onDrag={dragPoint(i)} snap={0.25}
                                        ariaLabel={`Drag point ${i + 1}, now at (${num(p[0])}, ${num(p[1])})`} />
                                ))}
                                {line && <Label at={[-4.3, 4.1]} color={MATH_COLORS.result} size={14} weight={700}>{lineText(line)}</Label>}
                            </Plane2D>
                        ) : (
                            <Scene3D height={420} distance={12} ariaLabel="b, the column space of A, and b's projection onto it"
                                fallback={<p className="text-sm text-slate-300 font-mono">{pvec ? `p = ${triple(pvec)}` : 'needs three points'}</p>}>
                                {(S) => (
                                    <>
                                        {has('plane') && Math.hypot(...normal3) > EPS && <S.Plane3D normal={normal3} d={0} size={8} color={COLSPACE} opacity={0.16} />}
                                        {has('columns') && (
                                            <>
                                                <S.Arrow3D to={xcol} color={MATH_COLORS.i} label="x-values" />
                                                <S.Arrow3D to={ones} color={MATH_COLORS.j} label="ones" />
                                            </>
                                        )}
                                        {has('b') && <S.Arrow3D to={bvec} color={MATH_COLORS.b} label="b" />}
                                        {has('p') && pvec && <S.Arrow3D to={pvec} color={MATH_COLORS.result} label="p = Ax̂" />}
                                        {has('r') && pvec && <S.Line3D points={[bvec, pvec]} color={MATH_COLORS.negative} width={2.5} dashed />}
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
                                <span className="text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-violet-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={addPoint} disabled={pts.length >= 8}
                                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500 disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Add a point</button>
                                <button onClick={removePoint} disabled={pts.length <= 3}
                                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500 disabled:opacity-40"><Minus className="h-3.5 w-3.5" />Remove one</button>
                                {DATASETS.map((d, i) => (
                                    <button key={i} onClick={() => setPts(d.map(p => [...p]))}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500">Data {i + 1}</button>
                                ))}
                                {dim === 2 && (
                                    <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                        <input type="checkbox" checked={squares} onChange={e => setSquares(e.target.checked)} className="accent-violet-500" />
                                        Show the squares
                                    </label>
                                )}
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
                            <div className="overflow-x-auto">
                                <table className="text-sm font-mono">
                                    <thead>
                                        <tr className="text-xs text-slate-500"><td className="pr-4">x</td>{P.map((p, i) => <td key={i} className="px-1 text-right">{guided ? num(p[0]) : <CoordInput value={p[0]} label={`x of point ${i + 1}`} onChange={(x) => setPts(ps => ps.map((q, k) => (k === i ? [x, q[1]] : q)))} />}</td>)}</tr>
                                    </thead>
                                    <tbody>
                                        <tr className="text-amber-300"><td className="pr-4 text-xs text-slate-500">y</td>{P.map((p, i) => <td key={i} className="px-1 text-right">{guided ? num(p[1]) : <CoordInput value={p[1]} label={`y of point ${i + 1}`} onChange={(y) => setPts(ps => ps.map((q, k) => (k === i ? [q[0], y] : q)))} />}</td>)}</tr>
                                        {line && !(guided && /-intro$/.test(step.kind)) && (
                                            <tr className="text-rose-300"><td className="pr-4 text-xs text-slate-500">r</td>{res.map((r, i) => <td key={i} className="px-2 text-right">{num(r)}</td>)}</tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {(!guided || has('normal') || step.kind === 'closing' || step.kind === 'line' || step.kind === 'proj') && fit ? (
                                <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                    <Tex block>{formula}</Tex>
                                    {formulaR && <Tex block>{formulaR}</Tex>}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">{guided && /-intro$/.test(step.kind) ? 'The fit appears once you answer.' : 'The normal equations appear once the tour reaches them.'}</p>
                            )}
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Two ways to see it</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-pink-400 font-semibold">The fit</span> — the line with the smallest Σ rᵢ².</li>
                            <li><span className="text-violet-300 font-semibold">The projection</span> — Ax̂ is the point of the column space closest to b.</li>
                            <li><span className="text-rose-300 font-semibold">The residual</span> — b − Ax̂, perpendicular to every column.</li>
                            <li><span className="text-slate-200 font-semibold">Normal equations</span> — AᵀA x̂ = Aᵀb says exactly that.</li>
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
