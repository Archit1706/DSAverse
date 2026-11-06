"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2, Shuffle,
    Database, PenLine, Ruler, Search, TrendingDown, Target, CheckCircle, XCircle, Lightbulb,
    AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { useTrainer } from '@/lib/ml/useTrainer';
import Plane2D, { Point, Segment, FunctionPlot, Label } from '@/components/math/Plane2D';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import TrainingCurve from '@/components/ml/TrainingCurve';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { sequential } from '@/components/ml/colors';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the examples and the model ────────────────────────────
   Twelve examples (x, y), one decimal each so every number on screen can be
   read. The model family is the straight lines ŷ = w·x + b, and the loss is
   the mean squared error. The tour searches that family twice: by hand,
   keeping a change only if the loss falls, and then by gradient descent. */

const N = 12;
const START = { w: -0.3, b: 2.2 };
const GD_RATE = 0.08;
const GD_SHOWN = [1, 2, 3, 5, 10, 20, 50, 120];
const NEW_X = 2.5;
const W_RANGE = [-1.5, 2.5];
const B_RANGE = [-2, 4];
const DEFAULT_SEED = 23;

const ACTS = [
    { id: 1, label: 'Examples', icon: Database },
    { id: 2, label: 'A guess', icon: PenLine },
    { id: 3, label: 'Loss', icon: Ruler },
    { id: 4, label: 'Search', icon: Search },
    { id: 5, label: 'Learn', icon: TrendingDown },
    { id: 6, label: 'Predict', icon: Target },
];

/** Fixed decimals, a real minus sign, and no "−0.00". */
const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const fp = (v, d = 2) => (v < 0 ? `(${f(v, d)})` : f(v, d));
const tn = (v, d = 2) => f(v, d).replace('−', '-');
/** "+ 1.20" or "- 0.40" for the second term of w·x + b. */
const plusTex = (v, d = 2) => (v < 0 ? `- ${tn(-v, d)}` : `+ ${tn(v, d)}`);

/** Twelve examples, sorted by x. 'straight' follows a line plus noise; 'curved' a parabola. */
function makeData(seed, shape = 'straight') {
    const rng = createRng(seed);
    const pts = [];
    for (let i = 0; i < N; i++) {
        const x = Math.round((rng.next() * 8 - 4) * 10) / 10;
        const trend = shape === 'curved' ? 0.3 * x * x - 1.2 : 0.5 * x + 1;
        pts.push([x, Math.round((trend + rng.normal(0, 0.5)) * 10) / 10]);
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

/** The least-squares line, in closed form. */
function bestLine(pts) {
    const n = pts.length;
    const mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
    let sxy = 0, sxx = 0;
    for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
    const w = sxx > 0 ? sxy / sxx : 0;
    return { w, b: my - w * mx };
}

/** The least-squares parabola a·x² + c·x + d, by the 3×3 normal equations. */
function bestParabola(pts) {
    const A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    for (const [x, y] of pts) {
        const r = [x * x, x, 1];
        for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) A[i][j] += r[i] * r[j]; A[i][3] += r[i] * y; }
    }
    for (let c = 0; c < 3; c++) {
        let p = c;
        for (let r = c + 1; r < 3; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        [A[c], A[p]] = [A[p], A[c]];
        for (let r = 0; r < 3; r++) {
            if (r === c || A[c][c] === 0) continue;
            const k = A[r][c] / A[c][c];
            for (let j = c; j < 4; j++) A[r][j] -= k * A[c][j];
        }
    }
    const coef = A.map((row, i) => (row[i] === 0 ? 0 : row[3] / row[i]));
    const at = (x) => coef[0] * x * x + coef[1] * x + coef[2];
    return { coef, at, loss: pts.reduce((s, [x, y]) => s + (at(x) - y) ** 2, 0) / pts.length };
}

/** Largest step size before plain gradient descent on this loss overshoots: 2 / λmax of the Hessian. */
function criticalRate(pts) {
    const n = pts.length;
    const a = 2 * pts.reduce((s, p) => s + p[0] * p[0], 0) / n, c = 2 * pts.reduce((s, p) => s + p[0], 0) / n, d = 2;
    const lmax = (a + d) / 2 + Math.sqrt(((a - d) / 2) ** 2 + c * c);
    return 2 / lmax;
}

const describeMove = ({ param, from, to }) => (param === 'w'
    ? `${to > from ? 'tilt the line up' : 'tilt the line down'}: w from ${f(from)} to ${f(to)}`
    : `${to > from ? 'lift the line' : 'lower the line'}: b from ${f(from)} to ${f(to)}`);

const generateSteps = (pts, seed) => {
    const steps = [];
    const s = (act, data) => steps.push({ act, actName: ACTS[act - 1].label, pts, ...data });
    const L0 = lossOf(pts, START.w, START.b);
    const first = pts[0];
    const r0 = START.w * first[0] + START.b - first[1];

    s(1, {
        line: null, trail: [],
        explanation: `Twelve examples, each an input x and the answer y that came with it. Nobody wrote down the rule that turns x into y. Machine learning is finding a rule like that from the examples alone, so it can answer an x it has never seen.`,
    });
    s(2, {
        line: { ...START }, trail: [[START.w, START.b]],
        explanation: `First choose a family of rules with knobs to turn. Here it is every straight line ŷ = w·x + b: w tilts the line, b lifts it. Start from a guess, w = ${f(START.w)} and b = ${f(START.b)}. For x = ${f(first[0], 1)} it predicts ŷ = ${f(START.w * first[0] + START.b)} — the answer was ${f(first[1], 1)}.`,
    });
    s(3, {
        line: { ...START }, residuals: true, trail: [[START.w, START.b]],
        explanation: `Each dashed segment is a residual: the prediction minus the answer, r = ŷ − y. For the first example r = ${f(START.w * first[0] + START.b)} − ${fp(first[1], 1)} = ${f(r0)}. Some predictions are too high, some too low.`,
    });
    s(3, {
        line: { ...START }, residuals: true, lossShown: true, loss: L0, trail: [[START.w, START.b]],
        explanation: `Square every residual, so misses above and below both count, and average them: the mean squared error, L = ${f(L0, 3)}. That single number is the loss — how bad this line is on these examples. Every line has one; the map on the right colours each (w, b) by its loss, brightest where it is lowest.`,
    });

    // Act 4 — search by hand: change one knob, keep it only if the loss falls.
    let best = { ...START }, bestLoss = L0;
    const trail = [[best.w, best.b]];
    s(4, {
        line: { ...best }, residuals: true, loss: bestLoss, trail: [...trail],
        explanation: 'Learning means searching that map for the lowest point. Try it by hand: change one knob at a time, measure the loss, and keep the change only if the loss fell.',
    });
    const want = createRng(seed * 7 + 3).shuffle([true, true, true, false, false, false]);
    const tried = new Set();
    want.forEach((improve, k) => {
        const param = k % 2 === 0 ? 'w' : 'b';
        const g = gradOf(pts, best.w, best.b);
        const downhill = (param === 'w' ? g.gw : g.gb) > 0 ? -1 : 1;
        const base = param === 'w' ? 0.4 : 0.8;
        const at = (dir, size) => ({ ...best, [param]: Math.round((best[param] + dir * size) * 100) / 100 });
        const fresh = (c) => !tried.has(`${c.w},${c.b}`);
        let cand = null;
        // An improving try moves downhill, shrinking until it clearly helps;
        // a worsening one moves uphill. Never the same guess twice.
        if (improve) cand = [base, base / 2, base / 4].map(sz => at(downhill, sz)).find(c => fresh(c) && lossOf(pts, c.w, c.b) < bestLoss * 0.9) ?? null;
        if (!cand) cand = [base, base * 1.5, base / 2, base * 2].map(sz => at(-downhill, sz)).find(fresh) ?? at(-downhill, base * 3);
        tried.add(`${cand.w},${cand.b}`);
        const L = lossOf(pts, cand.w, cand.b);
        const improved = L < bestLoss;
        const move = { param, from: best[param], to: cand[param] };
        s(4, {
            line: { ...best }, guess: cand, guessLoss: L, bestLoss, improved, move, residuals: true, loss: bestLoss,
            trail: [...trail, [cand.w, cand.b]], tryIndex: k,
            explanation: improved
                ? `Try: ${describeMove(move)}. The loss falls from ${f(bestLoss, 3)} to ${f(L, 3)}, so keep it — the solid line moves there.`
                : `Try: ${describeMove(move)}. The loss rises from ${f(bestLoss, 3)} to ${f(L, 3)}, so throw it away and keep the old line.`,
        });
        if (improved) { best = cand; bestLoss = L; trail.push([best.w, best.b]); }
    });

    // Act 5 — gradient descent from where the hand search stopped.
    const g0 = gradOf(pts, best.w, best.b);
    s(5, {
        line: { ...best }, residuals: true, loss: bestLoss, trail: [...trail], grad: g0, gdIntro: true,
        explanation: `Guessing works, slowly. Calculus does better: the gradient says which way each knob should turn and how hard. Here ∂L/∂w = ${f(g0.gw, 3)} and ∂L/∂b = ${f(g0.gb, 3)}. Gradient descent turns each knob a little against its gradient, w ← w − η·∂L/∂w, with step size η = ${GD_RATE}.`,
    });
    let { w, b } = best;
    const gdTrail = [[w, b]];
    const history = [{ x: 0, y: bestLoss }];
    for (let t = 1; t <= GD_SHOWN[GD_SHOWN.length - 1]; t++) {
        const g = gradOf(pts, w, b);
        const prev = { w, b };
        w -= GD_RATE * g.gw;
        b -= GD_RATE * g.gb;
        const L = lossOf(pts, w, b);
        gdTrail.push([w, b]);
        history.push({ x: t, y: L });
        if (!GD_SHOWN.includes(t)) continue;
        const exact = bestLine(pts);
        const gap = Math.max(Math.abs(w - exact.w), Math.abs(b - exact.b));
        let explanation;
        if (t === 1) explanation = `Step 1: w = ${f(prev.w)} − ${GD_RATE} × ${fp(g.gw, 3)} = ${f(w, 3)} and b = ${f(prev.b)} − ${GD_RATE} × ${fp(g.gb, 3)} = ${f(b, 3)}. The loss falls to ${f(L, 3)}.`;
        else if (t === GD_SHOWN[GD_SHOWN.length - 1]) explanation = `After ${t} steps: w = ${f(w, 3)}, b = ${f(b, 3)}, loss ${f(L, 4)}. The least-squares formula gives the best line directly — w = ${f(exact.w, 3)}, b = ${f(exact.b, 3)} — and gradient descent has arrived within ${gap < 0.001 ? '0.001' : f(gap, 3)} of it.`;
        else explanation = `Step ${t}: w = ${f(w, 3)}, b = ${f(b, 3)}, loss ${f(L, 4)}. ${t <= 5 ? 'Each step recomputes the gradient at the new line and moves again.' : 'The steps shrink on their own: near the bottom the slope, and so the gradient, is small.'}`;
        s(5, {
            line: { w, b }, residuals: true, loss: L, trail: [...trail, ...gdTrail.slice(1)], grad: g, prev, t, history: [...history],
            explanation,
        });
    }
    s(6, {
        line: { w, b }, newX: NEW_X, loss: lossOf(pts, w, b), trail: [...trail, ...gdTrail.slice(1)], history: [...history],
        explanation: `Learning is over and the knobs are fixed: w = ${f(w)}, b = ${f(b)}. Now the model answers an x it never saw: x = ${NEW_X} gives ŷ = ${f(w)} × ${NEW_X} + ${fp(b)} = ${f(w * NEW_X + b)}.`,
    });
    s(6, {
        line: { w, b }, newX: NEW_X, loss: lossOf(pts, w, b), trail: [...trail, ...gdTrail.slice(1)], history: [...history], done: true,
        explanation: 'That is machine learning in miniature: a family of models (lines), a loss that scores them (mean squared error), and a search for the member with the lowest loss (gradient descent). A neural network or a language model has the same three pieces — with millions or billions of knobs instead of two. Switch to Explore and turn the knobs yourself.',
    });
    return steps;
};

/* ── predict ───────────────────────────────────────────────
   Before each hand-search guess: will the loss go down or up? The move is
   described in the question and the residuals are on screen, so it can be
   judged by eye. Which guesses improve is a seeded shuffle of three and
   three, so neither button is the safe answer and no alternation shows. */
const PREDICT_OPTIONS = ['Down: a better line', 'Up: a worse line'];

const predictFor = (step, next) => {
    if (!next || next.act !== 4 || !next.move) return null;
    const { move, guessLoss, bestLoss, improved, pts } = next;
    let hint;
    if (move.param === 'w') {
        const b = next.line.b;
        const sxx = pts.reduce((s2, [x]) => s2 + x * x, 0);
        const wOpt = pts.reduce((s2, [x, y]) => s2 + (y - b) * x, 0) / sxx;
        hint = `With b held at ${f(b)}, the best tilt is w = ${f(wOpt)}.`;
    } else {
        const w = next.line.w;
        const bOpt = pts.reduce((s2, [x, y]) => s2 + (y - w * x), 0) / pts.length;
        hint = `With w held at ${f(w)}, the best height is b = ${f(bOpt)}.`;
    }
    return {
        question: `Next guess — ${describeMove(move)}. Will the loss go down or up?`,
        options: PREDICT_OPTIONS,
        correct: improved ? 0 : 1,
        because: `L goes from ${f(bestLoss, 3)} to ${f(guessLoss, 3)}. ${hint} A move towards it lowers the loss unless it overshoots by too much; a move away from it always raises it.`,
    };
};

/** The formula for the step on screen, with its live values. */
function formulaFor(step) {
    const { pts } = step;
    if (step.act === 1) return String.raw`\{(x_i,\, y_i)\}_{i=1}^{${pts.length}}, \qquad (x_1, y_1) = (${tn(pts[0][0], 1)},\, ${tn(pts[0][1], 1)})`;
    const { w, b } = step.line;
    if (step.act === 2) return String.raw`\hat y = w\,x + b = ${tn(w)}\,x ${plusTex(b)}`;
    if (step.act === 3 && !step.lossShown) {
        const [x, y] = pts[0];
        return String.raw`r_1 = \hat y_1 - y_1 = (${tn(w)} \cdot ${fp(x, 1).replace('−', '-')} ${plusTex(b)}) - ${fp(y, 1).replace('−', '-')} = ${tn(w * x + b - y)}`;
    }
    if (step.act === 3 || (step.act === 4 && !step.move)) {
        const r = pts.map(([x, y]) => (w * x + b - y) ** 2);
        return String.raw`L = \frac{1}{${pts.length}} \sum_{i=1}^{${pts.length}} r_i^2 = \frac{1}{${pts.length}}\left(${tn(r[0], 3)} + ${tn(r[1], 3)} + \cdots + ${tn(r[r.length - 1], 3)}\right) = ${tn(step.loss, 3)}`;
    }
    if (step.act === 4) {
        return String.raw`L(w = ${tn(step.guess.w)},\, b = ${tn(step.guess.b)}) = ${tn(step.guessLoss, 3)} \;${step.improved ? '<' : '>'}\; ${tn(step.bestLoss, 3)} = L(\text{best so far})`;
    }
    if (step.act === 5 && step.gdIntro) {
        return String.raw`\frac{\partial L}{\partial w} = \frac{2}{n}\sum_i r_i x_i = ${tn(step.grad.gw, 3)}, \qquad \frac{\partial L}{\partial b} = \frac{2}{n}\sum_i r_i = ${tn(step.grad.gb, 3)}`;
    }
    if (step.act === 5) {
        const { prev, grad } = step;
        return String.raw`w \leftarrow ${tn(prev.w, 3)} - ${GD_RATE}\cdot(${tn(grad.gw, 3)}) = ${tn(w, 3)}, \qquad b \leftarrow ${tn(prev.b, 3)} - ${GD_RATE}\cdot(${tn(grad.gb, 3)}) = ${tn(b, 3)}`;
    }
    return String.raw`\hat y = ${tn(w)} \cdot ${NEW_X} ${plusTex(b)} = ${tn(w * NEW_X + b)}`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'What does “learning” mean for a model like ŷ = w·x + b?',
        options: [
            'Memorising every example so it can be looked up later',
            'Searching for the values of w and b that make the loss on the examples small',
            'Choosing between a straight line and a curve',
            'Writing down the rule that produced the data',
        ],
        correct: 1,
        explanation: 'The family (straight lines) is chosen in advance; learning searches inside it. The loss scores each setting of the knobs, and the search — by hand, or by gradient descent — looks for the lowest score.',
    },
    {
        question: 'A line has a mean squared error of exactly 0 on its twelve examples. What does that tell you?',
        options: [
            'It will predict new examples perfectly',
            'Its slope is 0',
            'It passes through every one of the twelve examples',
            'The examples have no noise',
        ],
        correct: 2,
        explanation: 'MSE is an average of squared residuals, and a sum of squares is 0 only if every term is 0. It says nothing about examples the line has not seen.',
    },
    {
        question: 'Gradient descent runs with a step size η that is far too large. What happens?',
        options: [
            'It reaches the best line in fewer steps',
            'Each step overshoots the bottom, and the loss can grow without limit',
            'The gradient becomes zero',
            'It finds a different best line',
        ],
        correct: 1,
        explanation: 'The gradient only says which way is downhill. Step too far and you land higher up the other side; past 2/λ (λ the steepest curvature) every step lands higher than the last.',
    },
];

const codeExample = `import numpy as np

# The twelve examples from the guided tour
x = np.array([-3.3, -3.3, -2.3, -2.2, -1.6, -1.4, -0.2, 1.2, 1.9, 2.6, 3.6, 3.9])
y = np.array([-1.4, -0.6, -1.6, -0.8, -0.7, -0.6, 0.8, 2.0, 0.8, 1.9, 2.7, 3.4])

w, b, lr = -0.3, 2.2, 0.08            # a bad first guess and a step size
for step in range(500):
    r = w * x + b - y                 # residuals
    loss = np.mean(r ** 2)            # mean squared error
    w -= lr * np.mean(2 * r * x)      # gradient descent on both knobs
    b -= lr * np.mean(2 * r)

print(round(w, 3), round(b, 3))       # 0.605 0.547
print(np.polyfit(x, y, 1).round(3))   # [0.605 0.547]: the closed form agrees`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Step through the search and learn acts again, then retry.'}
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

const LINE = '#a3e635';
const GUESS = '#facc15';
const DATA = '#38bdf8';
const RESID = '#fb7185';

/** The examples, the current line (and a trial line), residuals, and a prediction. */
function FitPlane({ pts, line, guess, residuals, newX, curve }) {
    return (
        <Plane2D xRange={[-5, 5]} yRange={[-3, 4]} grid={1} ariaLabel="The twelve examples and the model's line">
            {residuals && line && pts.map(([x, y], i) => (
                <Segment key={`r${i}`} from={[x, y]} to={[x, line.w * x + line.b]} color={RESID} width={1.5} dashed />
            ))}
            {curve && <FunctionPlot f={curve} color="#c084fc" width={2} dashed />}
            {guess && <FunctionPlot f={(x) => guess.w * x + guess.b} color={GUESS} width={2.5} dashed />}
            {line && <FunctionPlot f={(x) => line.w * x + line.b} color={LINE} width={3} />}
            {pts.map(([x, y], i) => <Point key={i} at={[x, y]} color={DATA} r={5} />)}
            {newX !== undefined && line && (
                <>
                    <Segment from={[newX, -3]} to={[newX, line.w * newX + line.b]} color="#f8fafc" width={1} dashed />
                    <Point at={[newX, line.w * newX + line.b]} color="#f8fafc" r={6} label={`ŷ = ${f(line.w * newX + line.b)}`} />
                    <Label at={[newX, -3]} dy={-6} dx={4} color="#cbd5e1" size={12}>x = {newX}</Label>
                </>
            )}
        </Plane2D>
    );
}

const MAP_COLS = 40, MAP_ROWS = 30, MAP_W = 320, MAP_H = 240;
const mapX = (w) => Math.round(((w - W_RANGE[0]) / (W_RANGE[1] - W_RANGE[0])) * MAP_W * 100) / 100;
const mapY = (b) => Math.round(((B_RANGE[1] - b) / (B_RANGE[1] - B_RANGE[0])) * MAP_H * 100) / 100;

/** Every line as one cell of a map: (w, b), coloured by its loss. Brightest is lowest. */
function LossMap({ pts, current, guess, trail = [], onPick }) {
    const cells = useMemo(() => {
        const logs = [];
        for (let r = 0; r < MAP_ROWS; r++) {
            for (let c = 0; c < MAP_COLS; c++) {
                const w = W_RANGE[0] + ((c + 0.5) / MAP_COLS) * (W_RANGE[1] - W_RANGE[0]);
                const b = B_RANGE[1] - ((r + 0.5) / MAP_ROWS) * (B_RANGE[1] - B_RANGE[0]);
                logs.push(Math.log(lossOf(pts, w, b)));
            }
        }
        const lo = Math.min(...logs), hi = Math.max(...logs);
        return logs.map(v => sequential(1 - (v - lo) / (hi - lo || 1)));
    }, [pts]);
    const best = useMemo(() => bestLine(pts), [pts]);
    const cw = MAP_W / MAP_COLS, ch = MAP_H / MAP_ROWS;
    const clamp = (p) => [Math.min(MAP_W, Math.max(0, mapX(p[0]))), Math.min(MAP_H, Math.max(0, mapY(p[1])))];
    const click = (e) => {
        if (!onPick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const w = W_RANGE[0] + ((e.clientX - rect.left) / rect.width) * (W_RANGE[1] - W_RANGE[0]);
        const b = B_RANGE[1] - ((e.clientY - rect.top) / rect.height) * (B_RANGE[1] - B_RANGE[0]);
        onPick(Math.round(w * 100) / 100, Math.round(b * 100) / 100);
    };
    return (
        <figure>
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" role="img" onClick={click}
                aria-label="Loss of every line: slope w across, height b up; brighter is lower loss"
                className="block rounded-lg border border-slate-700" style={onPick ? { cursor: 'crosshair' } : undefined}>
                {cells.map((fill, k) => (
                    <rect key={k} x={Math.round((k % MAP_COLS) * cw * 100) / 100} y={Math.round(Math.floor(k / MAP_COLS) * ch * 100) / 100}
                        width={cw + 0.4} height={ch + 0.4} fill={fill} />
                ))}
                <line x1={mapX(0)} x2={mapX(0)} y1={0} y2={MAP_H} stroke="#0f172a" strokeOpacity="0.5" />
                <line x1={0} x2={MAP_W} y1={mapY(0)} y2={mapY(0)} stroke="#0f172a" strokeOpacity="0.5" />
                {trail.length > 1 && (
                    <polyline fill="none" stroke="#f8fafc" strokeWidth="1.5" strokeOpacity="0.8"
                        points={trail.map(p => clamp(p).join(',')).join(' ')} />
                )}
                <g stroke="#0f172a" strokeWidth="2">
                    <line x1={mapX(best.w) - 5} x2={mapX(best.w) + 5} y1={mapY(best.b) - 5} y2={mapY(best.b) + 5} />
                    <line x1={mapX(best.w) - 5} x2={mapX(best.w) + 5} y1={mapY(best.b) + 5} y2={mapY(best.b) - 5} />
                </g>
                {guess && <circle cx={clamp([guess.w, guess.b])[0]} cy={clamp([guess.w, guess.b])[1]} r="5" fill={GUESS} stroke="#0f172a" strokeWidth="1.5" />}
                {current && <circle cx={clamp([current.w, current.b])[0]} cy={clamp([current.w, current.b])[1]} r="6" fill={LINE} stroke="#0f172a" strokeWidth="2" />}
            </svg>
            <figcaption className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>w (tilt) {W_RANGE[0]} → {W_RANGE[1]} · b (height) {B_RANGE[0]} ↑ {B_RANGE[1]}</span>
                <span>× = lowest loss</span>
            </figcaption>
        </figure>
    );
}

/* ── explore ────────────────────────────────────────────── */

function Explore({ initial, seed, setSeed }) {
    const [shape, setShape] = useState('straight');
    const [start, setStart] = useState(initial);
    const [logLr, setLogLr] = useState(Math.log10(0.02));
    const lr = 10 ** logLr;
    const pts = useMemo(() => makeData(seed, shape), [seed, shape]);
    const crit = criticalRate(pts);

    const trainer = useTrainer({
        init: () => ({ w: start.w, b: start.b, trail: [[start.w, start.b]] }),
        step: (st) => {
            const g = gradOf(pts, st.w, st.b);
            st.w -= lr * g.gw;
            st.b -= lr * g.gb;
            if (st.trail.length < 1500) st.trail.push([st.w, st.b]);
            return { loss: lossOf(pts, st.w, st.b) };
        },
        deps: [start, pts],
        maxStepsPerFrame: 1,
        maxSteps: 4000,
    });
    const { w, b, trail } = trainer.state;
    const loss = lossOf(pts, w, b);
    const diverged = !Number.isFinite(loss) || loss > 1e4;
    useEffect(() => { if (diverged && trainer.running) trainer.pause(); }, [diverged, trainer]);

    const exact = bestLine(pts);
    const parabola = bestParabola(pts);
    const setW = (v) => setStart({ w: v, b: Number.isFinite(b) ? Math.round(b * 100) / 100 : 0 });
    const setB = (v) => setStart({ w: Number.isFinite(w) ? Math.round(w * 100) / 100 : 0, b: v });
    const repair = () => { setShape('straight'); setLogLr(Math.log10(0.02)); setStart({ ...START }); };

    const broken = [];
    if (lr > crit) broken.push(`Step size ${f(lr, 3)} is past ${f(crit, 3)} = 2/λ, where λ is the steepest curvature of this loss. Each step jumps over the bottom of the valley and lands higher up the far side, so the loss grows instead of falling. The gradient is still right — the steps are too big.`);
    if (shape === 'curved') broken.push(`Curved examples, straight-line family. Gradient descent still works perfectly: it finds the best line, loss ${f(lossOf(pts, exact.w, exact.b), 3)}, and stops. No amount of training gets lower, because no straight line fits a bend. The dashed purple parabola — a different family — reaches ${f(parabola.loss, 3)}.`);

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-3 min-w-0">
                        <FitPlane pts={pts} line={diverged ? null : { w, b }} residuals={!diverged} curve={shape === 'curved' ? parabola.at : undefined} />
                    </div>
                    <div className="md:col-span-2 space-y-3 min-w-0">
                        <LossMap pts={pts} current={diverged ? null : { w, b }} trail={trail} onPick={(pw, pb) => setStart({ w: pw, b: pb })} />
                        <p className="text-[11px] text-slate-500">Click the map to jump to any line.</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-4">
                    {[['w', diverged ? '—' : f(w, 3)], ['b', diverged ? '—' : f(b, 3)], ['loss', diverged ? 'diverged' : f(loss, 4)]].map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                            <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
                            <div className="font-mono text-sm text-slate-100 tabular-nums">{v}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ParamSlider label="w — tilt" value={Number.isFinite(w) ? Math.max(W_RANGE[0], Math.min(W_RANGE[1], w)) : 0} onChange={setW}
                        min={W_RANGE[0]} max={W_RANGE[1]} step={0.01} accent="lime" format={() => (diverged ? '—' : f(w))} />
                    <ParamSlider label="b — height" value={Number.isFinite(b) ? Math.max(B_RANGE[0], Math.min(B_RANGE[1], b)) : 0} onChange={setB}
                        min={B_RANGE[0]} max={B_RANGE[1]} step={0.01} accent="lime" format={() => (diverged ? '—' : f(b))} />
                </div>
                <div className="text-slate-100 text-sm">
                    <Tex block>{diverged
                        ? String.raw`L \to \infty`
                        : String.raw`L(${tn(w)},\, ${tn(b)}) = \frac{1}{${pts.length}}\sum_i (${tn(w)}\,x_i ${plusTex(b)} - y_i)^2 = ${tn(loss, 4)}`}</Tex>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={trainer.toggle} disabled={diverged}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500 disabled:opacity-40">
                        {trainer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{trainer.running ? 'Pause' : 'Learn'}
                    </button>
                    <button onClick={() => trainer.stepOnce(1)} disabled={diverged} aria-label="One gradient step"
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                    <button onClick={() => setStart({ ...START })} aria-label="Back to the first guess"
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                    <button onClick={() => setSeed(randomSeed())} aria-label="New examples" title="New examples"
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                    <span className="text-xs text-slate-500 ml-1">{trainer.steps} steps</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <ParamSlider label="Step size η" value={logLr} onChange={setLogLr} min={-3} max={Math.log10(0.3)} step={0.01} accent="lime"
                        format={() => f(lr, 3)} hint={`Log scale. This loss overshoots past ${f(crit, 3)}.`} />
                    <TrainingCurve logY series={[{ name: 'loss', color: LINE, points: trainer.history.map(h => ({ x: h.step, y: h.loss })) }]} height={130} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => setLogLr(Math.log10(Math.min(0.3, crit * 1.15)))} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500">Step size too big</button>
                    <button onClick={() => setShape('curved')} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500">Curved examples</button>
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

export default function WhatIsMachineLearningPage() {
    const [mode, setMode] = useState('guided');            // 'guided' | 'explore'
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const pts = useMemo(() => makeData(seed), [seed]);
    const stepHistory = useMemo(() => generateSteps(pts, seed), [pts, seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [explore, setExplore] = useState({ start: { ...START }, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

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
    /* Explore starts from the line on screen, so switching never jumps. */
    const toExplore = (picked) => {
        const line = picked ?? step.line ?? START;
        setExplore(e => ({ start: { w: Math.round(line.w * 100) / 100, b: Math.round(line.b * 100) / 100 }, key: e.key + 1 }));
        setMode('explore');
        setIsPlaying(false);
    };
    const reseed = (s) => { setSeed(s); setCurrentStep(0); setIsPlaying(false); };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/machine-learning" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Machine Learning
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">What Is Machine Learning?</h1>
                    <p className="text-lime-50 max-w-3xl">
                        Fit a line to twelve points by hand, then let gradient descent do it. Learning is a search: for the knob settings that make one number, the loss, as small as it can be.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/80">Builds on</span>
                        {[['Gradient Descent', '/differential-calculus/gradient-descent'], ['Least Squares', '/linear-algebra/least-squares']].map(([name, href]) => (
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
                        <SourceChip kind="live">Fitted live in your browser · seeded example data</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={explore.key} initial={explore.start} seed={seed} setSeed={setSeed} />
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
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                        <div className="md:col-span-3 min-w-0">
                                            <FitPlane pts={step.pts} line={step.line} guess={step.guess} residuals={step.residuals} newX={step.newX} />
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-1.5">
                                                <span><span className="text-sky-400">●</span> examples</span>
                                                <span><span className="text-lime-400">—</span> the model&apos;s line</span>
                                                {step.guess && <span><span className="text-yellow-400">- -</span> the guess being tried</span>}
                                                {step.residuals && <span><span className="text-rose-400">- -</span> residuals</span>}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-3 min-w-0">
                                            <LossMap pts={step.pts} current={step.line} guess={step.guess} trail={step.trail} onPick={(w, b) => toExplore({ w, b })} />
                                            {step.history && (
                                                <TrainingCurve logY series={[{ name: 'loss', color: LINE, points: step.history }]} height={120} />
                                            )}
                                        </div>
                                    </div>
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
                                        <button onClick={() => reseed(randomSeed())} aria-label="New examples" title="New examples"
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

                    <InCode title="The same search in NumPy" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Every learner has three pieces</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-lime-300 font-semibold">A model family</span> — rules with knobs: here every line ŷ = w·x + b.</li>
                            <li><span className="text-lime-300 font-semibold">A loss</span> — one number for how wrong a setting is: the mean squared error.</li>
                            <li><span className="text-lime-300 font-semibold">A search</span> — a way to find low-loss settings: trial and error, or gradient descent.</li>
                        </ul>
                    </div>

                    <Misconception />

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>
                </aside>
            </div>
        </div>
    );
}

/* The numbers here are computed from the seeded curved examples, not typed in. */
function Misconception() {
    const pts = useMemo(() => makeData(DEFAULT_SEED, 'curved'), []);
    const line = bestLine(pts);
    const lineLoss = lossOf(pts, line.w, line.b);
    const parabola = bestParabola(pts);
    return (
        <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
            <p className="text-sm text-slate-300 mb-2">&ldquo;Train long enough and the computer will work out the right answer.&rdquo;</p>
            <p className="text-sm text-slate-400 leading-relaxed">
                It only ever searches the family it was given. On a set of curved examples the best straight line has loss {f(lineLoss, 3)}, and gradient descent reaches exactly that and stops — a million more steps change nothing. A parabola gets to {f(parabola.loss, 3)}. Choosing the family is a human decision; try &ldquo;Curved examples&rdquo; in Explore.
            </p>
        </div>
    );
}
