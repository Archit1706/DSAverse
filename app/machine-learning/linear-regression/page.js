"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2, Shuffle,
    TrendingUp, Mountain, Navigation, TrendingDown, Calculator, Equal, CheckCircle, XCircle, Lightbulb,
    AlertTriangle, Wrench, Zap,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { useTrainer } from '@/lib/ml/useTrainer';
import Plane2D, { Point, Segment, FunctionPlot } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import TrainingCurve from '@/components/ml/TrainingCurve';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── data, loss and the two routes ─────────────────────────
   Ten points (one decimal each) and the line ŷ = w·x + b. The mean squared
   error is a quadratic in (w, b), so its surface is a bowl with one bottom.
   Gradient descent rolls down it; the normal equations XᵀXθ = Xᵀy jump
   straight to the bottom. The tour starts the ball from four corners of the
   bowl and shows every run arriving at the same line the formula gives. */

const N = 10;
const DEFAULT_SEED = 14;
const GD_RATE = 0.05;
const RUN_STEPS = 40;
const W_RANGE = [-1, 2];
const B_RANGE = [-2.5, 3.5];
const CORNER = { dw: 0.7, db: 1.6 };
const MOVES = ['Tilt up and lift', 'Tilt up and lower', 'Tilt down and lift', 'Tilt down and lower'];

const ACTS = [
    { id: 1, label: 'The model', icon: TrendingUp },
    { id: 2, label: 'The bowl', icon: Mountain },
    { id: 3, label: 'Gradient', icon: Navigation },
    { id: 4, label: 'Descent', icon: TrendingDown },
    { id: 5, label: 'Closed form', icon: Calculator },
    { id: 6, label: 'Same line', icon: Equal },
];

const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const fp = (v, d = 2) => (v < 0 ? `(${f(v, d)})` : f(v, d));
const tn = (v, d = 2) => f(v, d).replace('−', '-');
const plusTex = (v, d = 2) => (v < 0 ? `- ${tn(-v, d)}` : `+ ${tn(v, d)}`);
/** Signed terms as plain text: [[5.68, 'w²'], [−0.54, 'wb']] → "5.68w² − 0.54wb". */
const polyText = (terms) => terms.map(([c, name], i) => {
    const body = name === 'b²' && Math.abs(c) === 1 ? name : `${f(Math.abs(c))}${name}`;
    if (i === 0) return c < 0 ? `−${body}` : body;
    return `${c < 0 ? '−' : '+'} ${body}`;
}).join(' ');
const texMat = (rows, d = 2) => String.raw`\begin{bmatrix} ${rows.map(r => r.map(v => (typeof v === 'number' ? tn(v, d) : v)).join(' & ')).join(String.raw` \\ `)} \end{bmatrix}`;

function makeData(seed) {
    const rng = createRng(seed);
    const pts = [];
    for (let i = 0; i < N; i++) {
        const x = Math.round((rng.next() * 8 - 4) * 10) / 10;
        pts.push([x, Math.round((0.6 * x + 0.5 + rng.normal(0, 0.6)) * 10) / 10]);
    }
    return pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

const lossOf = (pts, w, b) => pts.reduce((s, [x, y]) => s + (w * x + b - y) ** 2, 0) / pts.length;

function gradOf(pts, w, b) {
    let gw = 0, gb = 0;
    for (const [x, y] of pts) {
        const e = w * x + b - y;
        gw += 2 * e * x;
        gb += 2 * e;
    }
    return { gw: gw / pts.length, gb: gb / pts.length };
}

/** XᵀX, Xᵀy and their solution θ = (w, b), or θ = null when XᵀX is singular (every x equal). */
function normalEquations(pts) {
    let sxx = 0, sx = 0, sxy = 0, sy = 0;
    for (const [x, y] of pts) { sxx += x * x; sx += x; sxy += x * y; sy += y; }
    const n = pts.length;
    const XtX = [[sxx, sx], [sx, n]], Xty = [sxy, sy];
    const det = sxx * n - sx * sx;
    const theta = Math.abs(det) < 1e-9 * Math.max(1, sxx * n) ? null : { w: (n * sxy - sx * sy) / det, b: (sxx * sy - sx * sxy) / det };
    return { XtX, Xty, det, theta };
}

/** L(w, b) = A w² + 2C wb + b² − 2D w − 2E b + F, with these mean statistics. */
function bowlCoefficients(pts) {
    const n = pts.length;
    const m = (fn) => pts.reduce((s, p) => s + fn(p), 0) / n;
    return { A: m(([x]) => x * x), C: m(([x]) => x), D: m(([x, y]) => x * y), E: m(([, y]) => y), F: m(([, y]) => y * y) };
}

function criticalRate(pts) {
    const { A, C } = bowlCoefficients(pts);
    const a = 2 * A, c = 2 * C, d = 2;
    return 2 / ((a + d) / 2 + Math.sqrt(((a - d) / 2) ** 2 + c * c));
}

function runDescent(pts, start, steps, rate = GD_RATE) {
    let { w, b } = start;
    const trail = [[w, b]];
    for (let t = 0; t < steps; t++) {
        const g = gradOf(pts, w, b);
        w -= rate * g.gw;
        b -= rate * g.gb;
        trail.push([w, b]);
    }
    return { w, b, trail };
}

/** Many random starts, each run to convergence: how far apart do they finish? */
function manyStarts(pts, count = 200, seed = 5, steps = 3000) {
    const rng = createRng(seed);
    const target = normalEquations(pts).theta;
    const rate = criticalRate(pts) * 0.5;
    let worst = 0;
    for (let k = 0; k < count; k++) {
        const end = runDescent(pts, { w: rng.next() * 10 - 5, b: rng.next() * 10 - 5 }, steps, rate);
        worst = Math.max(worst, Math.hypot(end.w - target.w, end.b - target.b));
    }
    return { count, worst };
}

const moveIndex = (dw, db) => (dw > 0 ? 0 : 2) + (db > 0 ? 0 : 1);

const generateSteps = (pts, seed) => {
    const steps = [];
    const { theta } = normalEquations(pts);
    const s = (act, data) => steps.push({ act, actName: ACTS[act - 1].label, pts, ...data });
    const k = bowlCoefficients(pts);
    const corners = createRng(seed * 13 + 1).shuffle([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    const startOf = ([sw, sb]) => ({ w: Math.round((theta.w + sw * CORNER.dw) * 10) / 10, b: Math.round((theta.b + sb * CORNER.db) * 10) / 10 });
    const first = startOf(corners[0]);
    const L0 = lossOf(pts, first.w, first.b);

    s(1, {
        line: first, ball: first, trail: [], residuals: true,
        explanation: `Ten points and one line, ŷ = w·x + b, scored by the mean squared error. This line, w = ${f(first.w, 1)} and b = ${f(first.b, 1)}, has loss ${f(L0, 3)}. Linear regression asks for the w and b with the smallest loss — and there are two very different ways to find them.`,
    });
    s(2, {
        line: first, ball: first, trail: [], bowl: true,
        explanation: `Picture every possible line at once: each (w, b) is a point on the floor, and its loss is the height above it. Expand the squares and the loss is a quadratic in w and b — ${polyText([[k.A, 'w²'], [2 * k.C, 'wb'], [1, 'b²'], [-2 * k.D, 'w'], [-2 * k.E, 'b'], [k.F, '']])} — so the surface is a bowl.`,
    });
    s(2, {
        line: first, ball: first, trail: [], bowl: true, bottom: true,
        explanation: `A bowl like this has exactly one lowest point. Its w² coefficient, ${f(k.A)}, is the mean of x² and its b² coefficient is 1, so it is ${k.A > 1.5 ? 'much steeper in the w direction than in b — a long, narrow valley' : 'about as steep in w as in b'}. The purple dot marks the bottom: the line we are looking for.`,
    });
    const g0 = gradOf(pts, first.w, first.b);
    s(3, {
        line: first, ball: first, trail: [], grad: g0, arrow: true,
        explanation: `At any point the gradient (∂L/∂w, ∂L/∂b) points straight uphill. Here it is (${f(g0.gw, 3)}, ${f(g0.gb, 3)}). Gradient descent steps the other way: w ← w − η·∂L/∂w and b ← b − η·∂L/∂b, with η = ${GD_RATE}.`,
    });

    let lastEnd = null;
    corners.forEach((corner, ci) => {
        const start = startOf(corner);
        const run = runDescent(pts, start, RUN_STEPS);
        const g = gradOf(pts, start.w, start.b);
        const after = { w: run.trail[1][0], b: run.trail[1][1] };
        s(4, {
            line: start, ball: start, trail: [run.trail[0]], startIndex: ci, residuals: true,
            explanation: ci === 0
                ? `Start the ball here: w = ${f(start.w, 1)}, b = ${f(start.b, 1)}, loss ${f(lossOf(pts, start.w, start.b), 3)}. Look at the residuals: is the line too flat or too steep, too high or too low?`
                : `Start ${ci + 1}: a different corner of the bowl, w = ${f(start.w, 1)}, b = ${f(start.b, 1)}, loss ${f(lossOf(pts, start.w, start.b), 3)}.`,
        });
        s(4, {
            line: after, ball: after, prev: start, grad: g, trail: run.trail.slice(0, 2), startIndex: ci, firstStep: true, residuals: true,
            move: moveIndex(after.w - start.w, after.b - start.b),
            explanation: `One step: w = ${f(start.w, 1)} − ${GD_RATE} × ${fp(g.gw, 3)} = ${f(after.w, 3)} and b = ${f(start.b, 1)} − ${GD_RATE} × ${fp(g.gb, 3)} = ${f(after.b, 3)}. ${MOVES[moveIndex(after.w - start.w, after.b - start.b)]}: the loss falls to ${f(lossOf(pts, after.w, after.b), 3)}.`,
        });
        const end = { w: run.w, b: run.b };
        lastEnd = end;
        s(4, {
            line: end, ball: end, trail: run.trail, startIndex: ci,
            explanation: `${RUN_STEPS} steps later the ball is at w = ${f(end.w, 3)}, b = ${f(end.b, 3)}, loss ${f(lossOf(pts, end.w, end.b), 4)}. ${Math.abs(end.w - theta.w) < Math.abs(start.w - theta.w) / 20 ? 'The slope is settled; b, the shallow direction of the valley, is still creeping in.' : 'Still on its way down.'}${ci === corners.length - 1 ? ' Four starts, one bottom.' : ''}`,
        });
    });

    const { XtX, Xty, det } = normalEquations(pts);
    s(5, {
        line: lastEnd, ball: lastEnd, matrices: 'X',
        explanation: `Now the other route. Stack the inputs into a matrix X with a row (xᵢ, 1) per point — shape [${N}, 2] — so that the predictions are X·θ with θ = (w, b). The answers y are a column of ${N}.`,
    });
    s(5, {
        line: lastEnd, ball: lastEnd, matrices: 'XtX',
        explanation: `At the bottom of the bowl both partial derivatives are zero. Written with matrices, that is XᵀX·θ = Xᵀy: the normal equations. XᵀX is [2, 2] whatever the number of points — Σx² = ${f(XtX[0][0])}, Σx = ${f(XtX[0][1])} and n = ${N} — and Xᵀy holds Σxy = ${f(Xty[0])} and Σy = ${f(Xty[1])}.`,
    });
    s(5, {
        line: theta, ball: theta, matrices: 'solve', exact: true,
        explanation: `Solve the 2 × 2 system: det(XᵀX) = ${f(XtX[0][0])} × ${N} − ${fp(XtX[0][1])}² = ${f(det)}, so w = ${f(theta.w, 4)} and b = ${f(theta.b, 4)}. No steps, no step size — one small linear solve.`,
    });
    const far = runDescent(pts, startOf(corners[corners.length - 1]), 2000);
    const gap = Math.max(Math.abs(far.w - theta.w), Math.abs(far.b - theta.b));
    s(6, {
        line: { w: far.w, b: far.b }, ball: { w: far.w, b: far.b }, exact: true, trail: far.trail.filter((_, i) => i % 20 === 0),
        explanation: `Run gradient descent for 2000 steps and it agrees with the formula to within ${gap < 1e-9 ? '10⁻⁹' : gap.toExponential(1)}: w = ${f(far.w, 4)}, b = ${f(far.b, 4)}. The two lines are one line. The formula wins for two parameters; gradient descent wins when there are millions, when XᵀX is too big to solve — and it is the route every neural network takes.`,
    });
    s(6, {
        line: theta, ball: theta, exact: true, done: true,
        explanation: 'Switch to Explore and drag the points. The dashed formula line jumps instantly; press Train and watch gradient descent chase it across a bowl that reshapes as you drag.',
    });
    return steps;
};

/* ── predict ───────────────────────────────────────────────
   Before the first step from each corner: which way will the line move?
   The residuals on screen answer it — a line too flat for the points tilts
   up, a line mostly above them drops. The four corners are visited in a
   seeded order, so each answer comes up once per tour and no button or
   position is safe. */
const predictFor = (step, next) => {
    if (!next || next.act !== 4 || !next.firstStep) return null;
    const { prev, grad } = next;
    return {
        question: `Gradient descent takes its first step from w = ${f(prev.w, 1)}, b = ${f(prev.b, 1)}. Which way does the line move?`,
        options: MOVES,
        correct: next.move,
        because: `∂L/∂w = ${f(grad.gw, 3)}, so w moves by −${GD_RATE} × ${fp(grad.gw, 3)} = ${f(-GD_RATE * grad.gw, 3)}; ∂L/∂b = ${f(grad.gb, 3)}, so b moves by ${f(-GD_RATE * grad.gb, 3)}. A line too flat for the points tilts up; a line sitting mostly above them drops.`,
    };
};

/** The formula for the step on screen, with its live values. */
function formulaFor(step) {
    const { pts } = step;
    const { w, b } = step.line;
    if (step.act === 1) return String.raw`L(w, b) = \frac{1}{${pts.length}}\sum_{i=1}^{${pts.length}} (w x_i + b - y_i)^2 = L(${tn(w, 1)},\, ${tn(b, 1)}) = ${tn(lossOf(pts, w, b), 3)}`;
    if (step.act === 2) {
        const k = bowlCoefficients(pts);
        return String.raw`L(w,b) = \overline{x^2}\,w^2 + 2\bar x\,wb + b^2 - 2\overline{xy}\,w - 2\bar y\,b + \overline{y^2} = ${tn(k.A)}w^2 ${plusTex(2 * k.C)}wb + b^2 ${plusTex(-2 * k.D)}w ${plusTex(-2 * k.E)}b ${plusTex(k.F)}`;
    }
    if (step.act === 3) return String.raw`\nabla L = \left(\frac{\partial L}{\partial w}, \frac{\partial L}{\partial b}\right) = \left(\tfrac{2}{n}\textstyle\sum r_i x_i,\; \tfrac{2}{n}\sum r_i\right) = (${tn(step.grad.gw, 3)},\; ${tn(step.grad.gb, 3)})`;
    if (step.act === 4 && step.firstStep) {
        return String.raw`\begin{bmatrix} w \\ b \end{bmatrix} \leftarrow \begin{bmatrix} ${tn(step.prev.w, 1)} \\ ${tn(step.prev.b, 1)} \end{bmatrix} - ${GD_RATE}\begin{bmatrix} ${tn(step.grad.gw, 3)} \\ ${tn(step.grad.gb, 3)} \end{bmatrix} = \begin{bmatrix} ${tn(w, 3)} \\ ${tn(b, 3)} \end{bmatrix}`;
    }
    if (step.act === 4) return String.raw`(w, b) = (${tn(w, 3)},\; ${tn(b, 3)}), \quad L = ${tn(lossOf(pts, w, b), 4)}`;
    const { XtX, Xty, theta } = normalEquations(pts);
    if (step.matrices === 'X') return String.raw`X = ${texMat([[tn(pts[0][0], 1), 1], [tn(pts[1][0], 1), 1], [String.raw`\vdots`, String.raw`\vdots`], [tn(pts[pts.length - 1][0], 1), 1]])}, \quad \hat{\mathbf y} = X\theta, \quad \theta = \begin{bmatrix} w \\ b \end{bmatrix}`;
    if (step.matrices === 'XtX') return String.raw`X^{\top}X = \begin{bmatrix} \sum x_i^2 & \sum x_i \\ \sum x_i & n \end{bmatrix} = ${texMat(XtX)}, \quad X^{\top}\mathbf y = ${texMat(Xty.map(v => [v]))}`;
    if (step.matrices === 'solve') return String.raw`\theta = (X^{\top}X)^{-1}X^{\top}\mathbf y = ${texMat(XtX)}^{-1}${texMat(Xty.map(v => [v]))} = \begin{bmatrix} ${tn(theta.w, 4)} \\ ${tn(theta.b, 4)} \end{bmatrix}`;
    return String.raw`\theta_{\text{GD}} = (${tn(w, 4)},\, ${tn(b, 4)}) \;=\; \theta_{\text{formula}} = (${tn(theta.w, 4)},\, ${tn(theta.b, 4)})`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'Why does gradient descent on linear regression’s mean squared error always reach the same line, wherever it starts?',
        options: [
            'Because it is always started at w = 0, b = 0',
            'Because the loss is a quadratic in w and b — a bowl with a single lowest point',
            'Because the data has no noise',
            'Because the learning rate shrinks automatically',
        ],
        correct: 1,
        explanation: 'Expanding the squares gives a quadratic in (w, b) with positive curvature, so there is one minimum and no other valleys to get stuck in. (With a step size past 2/λ it would not converge at all — but it would not converge somewhere else either.)',
    },
    {
        question: 'For a line fit, X has one row (xᵢ, 1) per point. With 1,000 points, what shape is XᵀX?',
        options: ['[1000, 1000]', '[1000, 2]', '[2, 2]', '[2, 1000]'],
        correct: 2,
        explanation: 'Xᵀ is [2, 1000] and X is [1000, 2], so XᵀX is [2, 2] — Σx², Σx, Σx and n. The normal equations are a 2 × 2 system however many points there are.',
    },
    {
        question: 'Every point has exactly the same x. What happens to the normal equations?',
        options: [
            'Nothing — they still give one best line',
            'XᵀX becomes singular (determinant 0): infinitely many lines tie for best',
            'The best line becomes vertical',
            'Gradient descent stops working but the formula still works',
        ],
        correct: 1,
        explanation: 'With every x equal, Σx²·n = (Σx)², so det(XᵀX) = 0. Any line through (x, mean of y) fits equally well — the bowl becomes a trough with a flat valley floor. Gradient descent still slides down to some line on that floor.',
    },
];

const codeExample = `import numpy as np

# The ten points from the guided tour
x = np.array([-3.9, -3.5, -2.4, -1.3, -1.2, -0.6, -0.4, 1.2, 2.1, 3.5])
y = np.array([-2.5, -1.4, -1.3, 1.3, -0.3, 0.3, -0.5, 1.3, 2.7, 2.4])

X = np.column_stack([x, np.ones_like(x)])     # [10, 2]: a row (x, 1) per point
theta = np.linalg.solve(X.T @ X, X.T @ y)      # the normal equations
print(theta.round(4))                          # [0.658  0.6277]

w, b = 0.0, 0.0                                # the other route
for _ in range(2000):
    r = w * x + b - y
    w -= 0.05 * np.mean(2 * r * x)
    b -= 0.05 * np.mean(2 * r)
print(round(w, 4), round(b, 4))                # 0.658 0.6277`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the bowl and closed-form acts, then retry.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-lime-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── pictures ───────────────────────────────────────────── */

const GD_COLOR = '#a3e635';
const EXACT_COLOR = '#c084fc';
const DATA = '#38bdf8';
const RESID = '#fb7185';

function FitPlane({ pts, line, exact, residuals, onDrag }) {
    const ok = line && Number.isFinite(line.w) && Number.isFinite(line.b) && Math.abs(line.w) < 1e6;
    return (
        <Plane2D xRange={[-5, 5]} yRange={[-3.5, 4.5]} grid={1} ariaLabel="The points, the gradient-descent line and the closed-form line">
            {residuals && ok && pts.map(([x, y], i) => (
                <Segment key={`r${i}`} from={[x, y]} to={[x, line.w * x + line.b]} color={RESID} width={1.5} dashed />
            ))}
            {exact && <FunctionPlot f={(x) => exact.w * x + exact.b} color={EXACT_COLOR} width={2.5} dashed />}
            {ok && <FunctionPlot f={(x) => line.w * x + line.b} color={GD_COLOR} width={3} />}
            {pts.map(([x, y], i) => (
                <Point key={i} at={[x, y]} color={DATA} r={5.5} onDrag={onDrag ? (p) => onDrag(i, p) : undefined} snap={0.1}
                    ariaLabel={`Drag point ${i + 1}, at (${x}, ${y})`} />
            ))}
        </Plane2D>
    );
}

/* The bowl in 3D. Scene x and y map the window W_RANGE × B_RANGE onto
   [−3, 3]; height is the loss, scaled so the window's highest corner sits
   at 3.5. Recomputed whenever the points move. */
const sx = (w) => -3 + ((w - W_RANGE[0]) / (W_RANGE[1] - W_RANGE[0])) * 6;
const sy = (b) => -3 + ((b - B_RANGE[0]) / (B_RANGE[1] - B_RANGE[0])) * 6;

function Bowl({ pts, ball, trail = [], exact, arrow }) {
    const zDiv = useMemo(() => Math.max(...[[W_RANGE[0], B_RANGE[0]], [W_RANGE[0], B_RANGE[1]], [W_RANGE[1], B_RANGE[0]], [W_RANGE[1], B_RANGE[1]]]
        .map(([w, b]) => lossOf(pts, w, b))) / 3.5, [pts]);
    const surface = useCallback((x, y) => lossOf(pts, W_RANGE[0] + ((x + 3) / 6) * (W_RANGE[1] - W_RANGE[0]), B_RANGE[0] + ((y + 3) / 6) * (B_RANGE[1] - B_RANGE[0])) / zDiv, [pts, zDiv]);
    const inside = (p) => p && Number.isFinite(p.w) && Number.isFinite(p.b) && p.w >= W_RANGE[0] && p.w <= W_RANGE[1] && p.b >= B_RANGE[0] && p.b <= B_RANGE[1];
    const at = (p, lift = 0.09) => [sx(p.w), sy(p.b), lossOf(pts, p.w, p.b) / zDiv + lift];
    const path = trail.filter(([w, b]) => inside({ w, b })).map(([w, b]) => at({ w, b }, 0.05));
    let arrowTo = null;
    if (arrow && inside(ball)) {
        const g = gradOf(pts, ball.w, ball.b);
        const len = Math.hypot(g.gw, g.gb) || 1;
        const next = { w: ball.w - (0.35 * g.gw) / len, b: ball.b - (0.9 * g.gb) / len };
        arrowTo = at(next, 0.12);
    }
    return (
        <Scene3D height={340} distance={12} axisSize={4} ariaLabel="The loss surface over every line: slope w and intercept b across the floor, loss upwards"
            fallback={<p className="text-sm text-slate-300 font-mono">{ball && inside(ball) ? `L(${f(ball.w)}, ${f(ball.b)}) = ${f(lossOf(pts, ball.w, ball.b), 3)}` : ''}</p>}>
            {(P) => (
                <>
                    <P.Surface3D f={surface} xRange={[-3, 3]} yRange={[-3, 3]} segments={36} low="#1e3a8a" high="#a3e635" opacity={0.75} />
                    {path.length > 1 && <P.Line3D points={path} color="#f8fafc" width={2} />}
                    {exact && <P.Point3D at={at(exact, 0.05)} color={EXACT_COLOR} size={0.12} />}
                    {inside(ball) && <P.Point3D at={at(ball, 0.13)} color="#facc15" size={0.16} />}
                    {arrowTo && <P.Arrow3D from={at(ball, 0.13)} to={arrowTo} color="#f472b6" />}
                    <P.Label3D at={[3.4, -0.5, 0]} color="#a3e635">w</P.Label3D>
                    <P.Label3D at={[-0.5, 3.4, 0]} color="#a3e635">b</P.Label3D>
                    <P.Label3D at={[0.4, 0, 3.9]} color="#a3e635">loss</P.Label3D>
                </>
            )}
        </Scene3D>
    );
}

function MatrixPanel({ pts, which }) {
    const { XtX, Xty, theta } = normalEquations(pts);
    const cell = 'px-2 py-0.5 text-right font-mono text-xs tabular-nums';
    const Mat = ({ label, rows, names, shape }) => (
        <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold text-lime-200">{label}</span><ShapeTag names={names} shape={shape} /></div>
            <table className="border-l-2 border-r-2 border-slate-500 rounded"><tbody>
                {rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={`${cell} text-slate-200`}>{typeof v === 'number' ? f(v, 2) : v}</td>)}</tr>)}
            </tbody></table>
        </div>
    );
    return (
        <div className="flex flex-wrap items-start gap-5">
            <Mat label="X" rows={pts.map(([x]) => [x, 1])} names={['n', '2']} shape={[pts.length, 2]} />
            <Mat label="y" rows={pts.map(([, y]) => [y])} names={['n', '1']} shape={[pts.length, 1]} />
            {which !== 'X' && <Mat label="XᵀX" rows={XtX} names={['2', '2']} shape={[2, 2]} />}
            {which !== 'X' && <Mat label="Xᵀy" rows={Xty.map(v => [v])} names={['2', '1']} shape={[2, 1]} />}
            {which === 'solve' && theta && <Mat label="θ = (w, b)" rows={[[theta.w], [theta.b]]} names={['2', '1']} shape={[2, 1]} />}
        </div>
    );
}

/* ── explore ────────────────────────────────────────────── */

function Explore({ initialPts, initialLine }) {
    const [pts, setPts] = useState(initialPts);
    const [start, setStart] = useState(initialLine);
    const [logLr, setLogLr] = useState(Math.log10(0.03));
    const lr = 10 ** logLr;
    const { theta, det } = normalEquations(pts);
    const crit = criticalRate(pts);

    /* Dragging a point does not restart the run: gradient descent keeps
       going from wherever it is, on the reshaped bowl. */
    const trainer = useTrainer({
        init: () => ({ w: start.w, b: start.b, trail: [[start.w, start.b]] }),
        step: (st) => {
            const g = gradOf(pts, st.w, st.b);
            st.w -= lr * g.gw;
            st.b -= lr * g.gb;
            st.trail.push([st.w, st.b]);
            if (st.trail.length > 400) st.trail.splice(0, st.trail.length - 400);
            return { loss: lossOf(pts, st.w, st.b) };
        },
        deps: [start],
        maxStepsPerFrame: 1,
    });
    const { w, b, trail } = trainer.state;
    const loss = lossOf(pts, w, b);
    const diverged = !Number.isFinite(loss) || loss > 1e4;
    useEffect(() => { if (diverged && trainer.running) trainer.pause(); }, [diverged, trainer]);

    const drag = (i, [x, y]) => setPts(old => old.map((p, k) => (k === i ? [x, y] : p)));
    const repair = () => { setPts(initialPts); setLogLr(Math.log10(0.03)); setStart({ ...initialLine }); };

    const broken = [];
    if (lr > crit) broken.push(`Step size ${f(lr, 3)} is past 2/λ = ${f(crit, 3)} for this bowl. Every step overshoots the valley floor and lands higher on the opposite wall — watch the ball leave the bowl. The gradient is fine; the steps are too long.`);
    if (!theta) broken.push('Every point has the same x, so det(XᵀX) = 0 and the normal equations have no single answer: every line through the middle of the points ties for best. The bowl has become a trough with a flat floor. Gradient descent still slides to the floor — to one of the many tied lines.');

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="min-w-0">
                        <FitPlane pts={pts} line={diverged ? null : { w, b }} exact={theta} residuals={!diverged} onDrag={drag} />
                        <p className="text-[11px] text-slate-500 mt-1.5">Drag any point. <span className="text-lime-400">Solid</span>: gradient descent. <span className="text-purple-300">Dashed</span>: the normal equations, recomputed instantly.</p>
                    </div>
                    <div className="min-w-0">
                        <Bowl pts={pts} ball={diverged ? null : { w, b }} trail={trail} exact={theta} />
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mt-4">
                    {[['GD w, b', diverged ? 'diverged' : `${f(w, 3)}, ${f(b, 3)}`], ['formula w, b', theta ? `${f(theta.w, 3)}, ${f(theta.b, 3)}` : 'no single answer'],
                        ['loss', diverged ? '—' : f(loss, 4)], ['steps', trainer.steps]].map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2 px-1">
                            <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
                            <div className="font-mono text-sm text-slate-100 tabular-nums">{v}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="text-slate-100 text-sm">
                    <Tex block>{theta
                        ? String.raw`\theta = (X^{\top}X)^{-1}X^{\top}\mathbf y = ${texMat(normalEquations(pts).XtX)}^{-1}${texMat(normalEquations(pts).Xty.map(v => [v]))} = \begin{bmatrix} ${tn(theta.w, 3)} \\ ${tn(theta.b, 3)} \end{bmatrix}`
                        : String.raw`\det(X^{\top}X) = ${tn(det, 3)} \;\Rightarrow\; \text{no unique } \theta`}</Tex>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={trainer.toggle} disabled={diverged}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500 disabled:opacity-40">
                        {trainer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{trainer.running ? 'Pause' : 'Train'}
                    </button>
                    <button onClick={() => trainer.stepOnce(1)} disabled={diverged} aria-label="One gradient step"
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                    <button onClick={() => setStart({ w: -0.5, b: 3 })} aria-label="Restart from a far corner"
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                    <button onClick={() => { setPts(makeData(randomSeed())); }} aria-label="New points" title="New points"
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                    <button onClick={() => theta && setStart({ w: theta.w, b: theta.b })} disabled={!theta}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-purple-400 disabled:opacity-40">
                        <Zap className="h-3.5 w-3.5 text-purple-300" />Jump to the formula&apos;s answer
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <ParamSlider label="Step size η" value={logLr} onChange={setLogLr} min={-3} max={Math.log10(0.4)} step={0.01} accent="lime"
                        format={() => f(lr, 3)} hint={`Log scale. This bowl overshoots past ${f(crit, 3)}.`} />
                    <TrainingCurve logY series={[{ name: 'loss', color: GD_COLOR, points: trainer.history.map(h => ({ x: h.step, y: h.loss })) }]} height={130} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => setLogLr(Math.log10(Math.min(0.4, crit * 1.12)))} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500">Step size too big</button>
                    <button onClick={() => setPts(old => old.map(([, y]) => [1, y]))} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500">Give every point the same x</button>
                    <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
                {broken.map(msg => (
                    <p key={msg} className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{msg}</p>
                ))}
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function LinearRegressionPage() {
    const [mode, setMode] = useState('guided');            // 'guided' | 'explore'
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const pts = useMemo(() => makeData(seed), [seed]);
    const stepHistory = useMemo(() => generateSteps(pts, seed), [pts, seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [explore, setExplore] = useState({ pts, line: { w: -0.5, b: 3 }, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const many = useMemo(() => manyStarts(makeData(DEFAULT_SEED)), []);

    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(stepHistory.findIndex(s => s.act === act)); };
    /* Explore picks up the points and the line on screen; grabbing a point
       during the tour switches over with that point already moving. */
    const toExplore = (nextPts = pts) => {
        setExplore(e => ({ pts: nextPts, line: { w: step.line.w, b: step.line.b }, key: e.key + 1 }));
        setMode('explore');
        setIsPlaying(false);
    };
    const dragInTour = (i, p) => toExplore(pts.map((q, k) => (k === i ? p : q)));
    const exact = normalEquations(pts).theta;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/machine-learning" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Machine Learning
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Linear Regression</h1>
                    <p className="text-lime-50 max-w-3xl">
                        Two routes to the best line: roll a ball down the loss bowl with gradient descent, or solve the normal equations in one step. They arrive at the same place.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/80">Builds on</span>
                        {[['Least Squares', '/linear-algebra/least-squares'], ['Gradient Descent', '/differential-calculus/gradient-descent'], ['Inverse Matrices', '/linear-algebra/inverse-matrices']].map(([name, href]) => (
                            <Link key={href} href={href} className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">{name}</Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                            {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                <button key={key} role="tab" aria-selected={mode === key}
                                    onClick={() => { if (key === 'explore') toExplore(); else { setMode('guided'); setIsPlaying(false); } }}
                                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-lime-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                    <Icon className="h-4 w-4" />{label}
                                </button>
                            ))}
                        </div>
                        <SourceChip kind="live">Gradient descent runs in your browser · seeded example points</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={explore.key} initialPts={explore.pts} initialLine={explore.line} />
                    ) : (
                        <>
                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="flex flex-wrap gap-1.5 px-4 pt-4" role="tablist" aria-label="Acts">
                                    {ACTS.map(act => {
                                        const Icon = act.icon;
                                        const tone = act.id === step.act
                                            ? 'bg-lime-500/20 text-lime-200 border-lime-500/50'
                                            : act.id < step.act ? 'bg-slate-800/60 text-slate-400 border-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300';
                                        return (
                                            <button key={act.id} role="tab" aria-selected={act.id === step.act} onClick={() => jumpToAct(act.id)}
                                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${tone}`}>
                                                <Icon className="h-3.5 w-3.5" />{act.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="h-0.5 bg-slate-800 mt-3">
                                    <div className="h-full bg-gradient-to-r from-lime-500 to-green-500 transition-all" style={{ width: `${(currentStep / (stepHistory.length - 1)) * 100}%` }} />
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    {step.matrices ? (
                                        <MatrixPanel pts={step.pts} which={step.matrices} />
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="min-w-0">
                                                <FitPlane pts={step.pts} line={step.line} exact={step.exact || step.bottom ? exact : null} residuals={step.residuals} onDrag={dragInTour} />
                                                <p className="text-[11px] text-slate-500 mt-1.5">Grab a point to take over in Explore.</p>
                                            </div>
                                            <div className="min-w-0">
                                                <Bowl pts={step.pts} ball={step.ball} trail={step.trail} exact={step.bottom || step.exact || step.act >= 4 ? exact : null} arrow={step.arrow} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 mt-4">
                                        <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                        <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                        <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500 disabled:opacity-40">
                                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                        </button>
                                        <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New points" title="New points"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                                        <PredictToggle predict={predict} accent="lime" />
                                        <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                            Speed
                                            <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-lime-500" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {predict.prompt && <PredictPrompt predict={predict} accent="lime" />}

                            <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-lime-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-lime-200 text-sm leading-relaxed">
                                        {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-slate-100 text-sm sm:text-base">
                                <Tex block>{formulaFor(step)}</Tex>
                            </div>
                        </>
                    )}

                    <InCode title="Both routes in NumPy" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Two routes, one line</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-lime-300 font-semibold">Gradient descent</span> — step downhill, θ ← θ − η∇L, until the slope is zero. Works for any differentiable model.</li>
                            <li><span className="text-purple-300 font-semibold">Normal equations</span> — set the slope to zero on paper: XᵀXθ = Xᵀy. Exact, but only for models linear in θ, and only while XᵀX is small enough to solve.</li>
                        </ul>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            <ShapeTag label="X" names={['n', '2']} shape={[N, 2]} />
                            <ShapeTag label="XᵀX" names={['2', '2']} shape={[2, 2]} />
                            <ShapeTag label="θ" names={['2', '1']} shape={[2, 1]} />
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;Gradient descent might get stuck somewhere else, so its answer is only approximate.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Not here. The loss is a bowl with one bottom. This page ran gradient descent from {many.count} random starts across the whole (w, b) plane on the tour&apos;s points: every run finished within {many.worst < 1e-9 ? '10⁻⁹' : many.worst.toExponential(1)} of the normal-equations answer. Local minima belong to curvier losses — the neural networks later on.
                        </p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>
                </aside>
            </div>
        </div>
    );
}
