"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, BookOpen, Calculator, Percent, Blend, Move, Maximize2, Shuffle as ShuffleIcon,
    KeyRound, CheckCircle, XCircle, Wrench, Unplug,
} from 'lucide-react';
import Plane2D, { Vector, Point, Segment, Label } from '@/components/math/Plane2D';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, FormulaPanel, Card,
} from '@/components/ml/TourKit';

/* ── the lookup ────────────────────────────────────────────
   Four hand-set keys and values in two dimensions, small enough to draw and
   to do the arithmetic by hand. A query is scored against every key with a
   dot product, softmax turns the scores into weights, and the output is the
   weighted average of the values. Nothing here is trained: the numbers are
   chosen to make the geometry readable (an illustrative example). */

const KEYS = [[2.4, 0.6], [0.5, 2.0], [-2.2, 1.2], [0.3, -1.2]];
const VALUES = [[3, 0], [0, 3], [-3, 0], [0, -3]];
const KN = ['k₁', 'k₂', 'k₃', 'k₄'];
const VN = ['v₁', 'v₂', 'v₃', 'v₄'];
const TEXK = ['k_1', 'k_2', 'k_3', 'k_4'];
const COLORS = ['#4ade80', '#38bdf8', '#c084fc', '#fb923c'];
const Q_COLOR = '#fbbf24';
const OUT_COLOR = '#f472b6';

const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
const angleDeg = (a, b) => (Math.acos(Math.max(-1, Math.min(1, dot2(a, b) / (len(a) * len(b) || 1)))) * 180) / Math.PI;

/** Scores, softmax weights and the blended value for query q. */
function lookup(q, keys = KEYS, values = VALUES) {
    const scores = keys.map(k => dot2(q, k));
    const m = Math.max(...scores);
    const e = scores.map(s => Math.exp(s - m));
    const Z = e.reduce((a, b) => a + b, 0);
    const weights = e.map(x => x / Z);
    const out = [0, 1].map(d => weights.reduce((a, w, j) => a + w * values[j][d], 0));
    return { scores, weights, out };
}
/** How strongly each key's score can still move the output: ∂out/∂sⱼ = wⱼ (vⱼ − out). */
const pullOf = (r, values = VALUES) => r.weights.map((w, j) => w * len([values[j][0] - r.out[0], values[j][1] - r.out[1]]));
const argmax = (xs) => xs.indexOf(Math.max(...xs));
const nearestByAngle = (q, keys = KEYS) => argmax(keys.map(k => -angleDeg(q, k)));

const num = (v, d = 2) => {
    const r = Math.round(v * 10 ** d) / 10 ** d;
    return `${r < 0 ? '−' : ''}${Math.abs(r).toFixed(d)}`;
};
const tn = (v, d = 2) => num(v, d).replace('−', '-');
const paren = (v, d = 2) => `(${num(v, d)})`;
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const vec = (a, d = 2) => `(${num(a[0], d)}, ${num(a[1], d)})`;

/* The tour's queries, all of length 2. Each key wins twice; in four of the
   eight the winner is not the key nearest the query in angle, because a
   longer key at a wider angle has the larger dot product. */
const QUERIES = [[1.0, 1.73], [1.64, -1.15], [0.68, -1.88], [-0.68, 1.88], [1.29, 1.53], [-0.35, -1.97], [-1.53, -1.29], [0, 2]];
const LENGTH_SCALES = [0.25, 1, 2.5];

const ACTS = [
    { id: 1, label: 'Exact Lookup', icon: BookOpen },
    { id: 2, label: 'Scores', icon: Calculator },
    { id: 3, label: 'Softmax', icon: Percent },
    { id: 4, label: 'Blend', icon: Blend },
    { id: 5, label: 'Move the Query', icon: Move },
    { id: 6, label: 'Length', icon: Maximize2 },
    { id: 7, label: 'Where q, k, v Come From', icon: ShuffleIcon },
];

/* Act 7: one token's embedding and three hand-set projections. */
const X_TOKEN = [1.5, 1];
const W = {
    q: [[1, -0.5], [0.5, 1]],
    k: [[0.6, 0.8], [-0.8, 0.6]],
    v: [[0, 1.2], [-1.2, 0.4]],
};
const project = (x, M) => [x[0] * M[0][0] + x[1] * M[1][0], x[0] * M[0][1] + x[1] * M[1][1]];

function why(q, r) {
    const win = argmax(r.scores), near = nearestByAngle(q);
    const a = angleDeg(q, KEYS[win]);
    if (win === near) {
        return `${KN[win]} is the nearest key in direction (${Math.round(a)}° from q) and wins: q · ${KN[win]} = |q| |${KN[win]}| cos θ = ${num(len(q))} × ${num(len(KEYS[win]))} × cos ${Math.round(a)}° = ${num(r.scores[win])}.`;
    }
    const b = angleDeg(q, KEYS[near]);
    return `${KN[near]} is nearer in direction (${Math.round(b)}° against ${Math.round(a)}°), but ${KN[win]} is longer (${num(len(KEYS[win]))} against ${num(len(KEYS[near]))}). A dot product counts both: ${num(len(q))} × ${num(len(KEYS[win]))} × cos ${Math.round(a)}° = ${num(r.scores[win])} beats ${num(len(q))} × ${num(len(KEYS[near]))} × cos ${Math.round(b)}° = ${num(r.scores[near])}.`;
}

function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });

    s(1, 'Exact Lookup', { kind: 'dict' },
        'A Python dictionary is a lookup: give it a key and it returns that key\'s value. The query has to equal a key exactly — "k₃" returns v₃, and anything else is a KeyError. Attention is the same lookup made soft: every key gets a score for how well it matches the query, and the answer is a blend of all the values, mixed by those scores.');

    QUERIES.forEach((q, n) => {
        const r = lookup(q);
        const win = argmax(r.scores);
        if (n === 0) {
            s(2, 'Scores', { kind: 'place', q, n },
                `Here are four keys and a query q = ${vec(q)}, drawn as arrows. Each key belongs to one value, kept on the right. Before any numbers: which key will match the query best?`);
            s(2, 'Scores', { kind: 'score', q, r, n, showWeights: false },
                `The match is a dot product, q · k = qₓkₓ + q_yk_y. It is large when k points the same way as q and when k is long. ${why(q, r)} A key at right angles to q scores 0, and one pointing away scores below 0.`);
            s(3, 'Softmax', { kind: 'score', q, r, n, showWeights: true },
                `Softmax turns the four scores into weights: raise e to each score and divide by the total. Every weight is positive and they add up to 1. ${KN[win]} gets ${pct(r.weights[win])}; the lowest score, ${KN[argmax(r.scores.map(x => -x))]}, still gets ${pct(Math.min(...r.weights))}. Nothing is ever exactly 0 — the lookup is soft.`);
            s(4, 'Blend', { kind: 'blend', q, r, n },
                `The output is the weighted average of the values: out = Σ wⱼ vⱼ = ${vec(r.out)}. It lies inside the shape the four values make, pulled hardest toward ${VN[win]}. This is the whole of attention: score, softmax, blend.`);
            return;
        }
        s(5, 'Move the Query', { kind: 'place', q, n },
            `A new query, q = ${vec(q)}, still of length 2. Look at the angles and at the lengths of the keys.`);
        s(5, 'Move the Query', { kind: 'blend', q, r, n },
            `${why(q, r)} It takes ${pct(r.weights[win])} of the weight, and the output moves to ${vec(r.out)}.`);
    });

    const base = QUERIES[7];
    LENGTH_SCALES.forEach((c, i) => {
        const q = [base[0] * c, base[1] * c];
        const r = lookup(q);
        const win = argmax(r.scores);
        const text = i === 0
            ? `The same direction, a quarter of the length: q = ${vec(q)}. Every score shrinks by four, the scores bunch together, and the weights flatten — ${KN[win]} now gets only ${pct(r.weights[win])}. A short query barely chooses; the output ${vec(r.out)} sits near the plain average of the values.`
            : i === 1
                ? `Length 2 again: ${KN[win]} takes ${pct(r.weights[win])}.`
                : `Two and a half times longer: q = ${vec(q)}. The scores spread out and softmax turns sharp: ${KN[win]} takes ${pct(r.weights[win])}. Push further and the soft lookup becomes the hard one from the start of the tour. The winner never changes — only how decisively it wins. Scaled dot-product attention divides by √d to keep this under control.`;
        s(6, 'Length', { kind: 'blend', q, r, n: `x${c}`, range: 5.5 }, text);
    });

    const qx = project(X_TOKEN, W.q), kx = project(X_TOKEN, W.k), vx = project(X_TOKEN, W.v);
    s(7, 'Where q, k, v Come From', { kind: 'project', x: X_TOKEN, qx, kx, vx },
        `In a transformer nobody places the arrows by hand. Every token's vector x is multiplied by three learned matrices: q = x W_Q asks "what am I looking for?", k = x W_K says "what do I contain?", v = x W_V is what it hands over if chosen. Here x = ${vec(X_TOKEN, 1)} gives q = ${vec(qx)}, k = ${vec(kx)} and v = ${vec(vx)} — three different vectors from one token.`);
    s(7, 'Where q, k, v Come From', { kind: 'shapes' },
        'With T tokens the vectors become matrices: Q = XW_Q, K = XW_K and V = XW_V, each with one row per token. In the tiny GPT on the next pages, X is [T, 64] and each head\'s W_Q, W_K and W_V are [64, 16]. Every token is a query, a key and a value at once — that is self-attention.');
    return steps;
}

const STEPS = generateSteps();

const predictFor = (step, next) => {
    if (!next || step.kind !== 'place' || next.n !== step.n || !next.r) return null;
    const win = argmax(next.r.scores);
    return {
        question: 'Which key has the largest dot product with the query?',
        options: KN,
        correct: win,
        because: why(step.q, next.r),
    };
};

function formulaFor(step) {
    if (step.kind === 'score' && !step.showWeights) {
        const j = argmax(step.r.scores);
        return String.raw`q \cdot ${TEXK[j]} = ${paren(step.q[0]).replace('−', '-')}${paren(KEYS[j][0], 1).replace('−', '-')} + ${paren(step.q[1]).replace('−', '-')}${paren(KEYS[j][1], 1).replace('−', '-')} = ${tn(step.r.scores[j])}`;
    }
    if (step.kind === 'score') {
        const j = argmax(step.r.scores);
        return String.raw`w_j = \frac{e^{q \cdot k_j}}{\sum_i e^{q \cdot k_i}}, \qquad w_{${j + 1}} = \frac{e^{${tn(step.r.scores[j])}}}{${step.r.scores.map(x => `e^{${tn(x)}}`).join(' + ')}} = ${tn(step.r.weights[j], 3)}`;
    }
    if (step.kind === 'blend') {
        return String.raw`\text{out} = \sum_j w_j v_j = (${tn(step.r.out[0])},\ ${tn(step.r.out[1])})`;
    }
    if (step.kind === 'project') return String.raw`q = xW_Q,\quad k = xW_K,\quad v = xW_V`;
    if (step.kind === 'shapes') return String.raw`Q = XW_Q,\ K = XW_K,\ V = XW_V \;\in\; \mathbb{R}^{T \times 16}`;
    return null;
}

/* For the misconception card: query directions all round the circle, length 2. */
function measureNearest(keys = KEYS) {
    let differ = 0, top = 0;
    const N = 360;
    for (let a = 0; a < N; a++) {
        const t = (a * Math.PI) / 180, q = [2 * Math.cos(t), 2 * Math.sin(t)];
        const r = lookup(q, keys);
        if (argmax(r.scores) !== nearestByAngle(q, keys)) differ++;
        top += Math.max(...r.weights);
    }
    return { differ: differ / N, top: top / N };
}

const quizQuestions = [
    {
        question: 'What does the score q · k reward?',
        options: [
            'Only the angle between q and k',
            'A key that points the same way as the query and is long',
            'A key whose tip is closest to the query\'s tip',
            'The key that was added most recently',
        ],
        correct: 1,
        explanation: 'q · k = |q| |k| cos θ: the angle matters through cos θ, and the key\'s length multiplies it. A longer key at a wider angle can beat a shorter key pointing nearly the same way.',
    },
    {
        question: 'After softmax, what is the output of the lookup?',
        options: [
            'The value of the highest-scoring key, exactly',
            'The sum of all the values',
            'A weighted average of all the values, with weights that are positive and add up to 1',
            'The query itself, rescaled',
        ],
        correct: 2,
        explanation: 'out = Σ wⱼ vⱼ with every wⱼ > 0 and Σ wⱼ = 1, so the output lies inside the shape the values make, pulled toward the values of the best-matching keys.',
    },
    {
        question: 'The query is made three times longer without turning it. What happens?',
        options: [
            'A different key wins',
            'The same key wins, and its weight moves closer to 1',
            'All weights become equal',
            'Nothing — softmax ignores scale',
        ],
        correct: 1,
        explanation: 'Every score triples, so their order is unchanged but the gaps between them triple. Softmax turns larger gaps into sharper weights: the lookup heads toward a hard, one-key lookup.',
    },
];

const codeExample = `import numpy as np

q = np.array([1.0, 1.73])                       # the query
K = np.array([[2.4, 0.6], [0.5, 2.0],           # four keys, one per row
              [-2.2, 1.2], [0.3, -1.2]])
V = np.array([[3, 0], [0, 3], [-3, 0], [0, -3]], dtype=float)

scores = K @ q                                  # q · k_j for every key
w = np.exp(scores - scores.max())
w /= w.sum()                                    # softmax: positive, sums to 1
out = w @ V                                     # the weighted average of the values
print(scores.round(2), w.round(3), out.round(2))
# [ 3.44  3.96 -0.12 -1.78] [0.368 0.62  0.01  0.002] [1.07 1.85]`;

function QuizPanel({ quizState, setQuizState }) {
    const qq = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Step through the tour once more and try again.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white">Retake</button>
            </div>
        );
    }
    const answer = (idx) => {
        if (quizState.answered) return;
        const right = idx === qq.correct;
        setQuizState(st => ({ ...st, selected: idx, answered: true, score: right ? st.score + 1 : st.score }));
    };
    const next = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(st => ({ ...st, complete: true }));
        else setQuizState(st => ({ ...st, current: st.current + 1, selected: null, answered: false }));
    };
    return (
        <div>
            <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
            <p className="text-sm text-slate-200 mb-3 leading-relaxed">{qq.question}</p>
            <div className="space-y-2">
                {qq.options.map((opt, i) => {
                    let tone = 'border-slate-700 text-slate-300 hover:border-indigo-500';
                    if (quizState.answered) {
                        if (i === qq.correct) tone = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) tone = 'border-red-500 bg-red-500/10 text-red-300';
                        else tone = 'border-slate-800 text-slate-500';
                    }
                    return (
                        <button key={i} onClick={() => answer(i)} disabled={quizState.answered}
                            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${tone}`}>{opt}</button>
                    );
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className={`flex items-center gap-1.5 text-sm font-medium mb-1 ${quizState.selected === qq.correct ? 'text-green-400' : 'text-red-400'}`}>
                        {quizState.selected === qq.correct ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {quizState.selected === qq.correct ? 'Correct' : 'Not quite'}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{qq.explanation}</p>
                    <button onClick={next} className="text-sm px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'Finish' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── pictures ────────────────────────────────────────────── */
const Caption = ({ children }) => <div className="text-xs text-slate-400 mb-1.5 flex flex-wrap items-center gap-1.5">{children}</div>;

function KeyPlane({ q, keys = KEYS, weights, onDragQ, onDragKey, range = 3.5 }) {
    return (
        <Plane2D xRange={[-range, range]} yRange={[-range, range]} grid={1} width={360} ariaLabel="Keys and the query">
            {keys.map((k, j) => (
                <Vector key={j} to={k} color={COLORS[j]} width={weights ? 2 + 4 * weights[j] : 3} opacity={weights ? 0.35 + 0.65 * weights[j] : 1}
                    label={KN[j]} onDrag={onDragKey ? (p) => onDragKey(j, p) : undefined} snap={onDragKey ? 0.1 : undefined} ariaLabel={`Key ${KN[j]}`} />
            ))}
            {q && <Vector to={q} color={Q_COLOR} width={3.5} label="q" onDrag={onDragQ} snap={onDragQ ? 0.05 : undefined} ariaLabel="Query q" />}
        </Plane2D>
    );
}

function ValuePlane({ r, values = VALUES }) {
    return (
        <Plane2D xRange={[-3.5, 3.5]} yRange={[-3.5, 3.5]} grid={1} width={360} ariaLabel="Values and the blended output">
            {r && values.map((v, j) => <Segment key={`s${j}`} from={r.out} to={v} color={COLORS[j]} width={1 + 5 * r.weights[j]} opacity={0.2 + 0.8 * r.weights[j]} />)}
            {values.map((v, j) => <Point key={j} at={v} color={COLORS[j]} r={6} label={VN[j]} />)}
            {r && <Point at={r.out} color={OUT_COLOR} r={6} label="out" />}
        </Plane2D>
    );
}

function ScoreTable({ q, r, showScores = true, showWeights = true, keys = KEYS }) {
    return (
        <div className="space-y-1.5">
            {keys.map((k, j) => (
                <div key={j} className="grid grid-cols-[2rem_1fr_4.5rem] sm:grid-cols-[2rem_1fr_4rem_7rem] items-center gap-2 text-xs font-mono">
                    <span style={{ color: COLORS[j] }} className="font-semibold">{KN[j]}</span>
                    <span className="text-slate-400 truncate">
                        {showScores ? <>{paren(q[0])}{paren(k[0], 1)} + {paren(q[1])}{paren(k[1], 1)}</> : <>{vec(k, 1)}, length {num(len(k))}</>}
                    </span>
                    <span className="text-right text-slate-100">{showScores ? num(r.scores[j]) : ''}</span>
                    {showWeights && (
                        <span className="hidden sm:flex items-center gap-1.5">
                            <span className="h-2 rounded bg-slate-800 flex-1 overflow-hidden"><span className="block h-full" style={{ width: `${100 * r.weights[j]}%`, background: COLORS[j] }} /></span>
                            <span className="w-11 text-right text-slate-300">{pct(r.weights[j])}</span>
                        </span>
                    )}
                </div>
            ))}
            {showWeights && (
                <div className="sm:hidden flex flex-wrap gap-x-3 text-xs font-mono text-slate-400">
                    {r.weights.map((w, j) => <span key={j}><span style={{ color: COLORS[j] }}>{KN[j]}</span> {pct(w)}</span>)}
                </div>
            )}
        </div>
    );
}

function DictScene() {
    return (
        <div className="w-full grid sm:grid-cols-2 gap-6 items-center">
            <div className="font-mono text-sm bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-1">
                <div className="text-slate-500">table = {'{'}</div>
                {KN.map((k, j) => (
                    <div key={k} className={`pl-4 ${j === 2 ? 'text-white' : 'text-slate-400'}`}>
                        <span style={{ color: COLORS[j] }}>&quot;{k}&quot;</span>: {VN[j]},{j === 2 && <span className="ml-2 text-xs text-indigo-300">matched</span>}
                    </div>
                ))}
                <div className="text-slate-500">{'}'}</div>
                <div className="pt-2 text-slate-300">table[&quot;k₃&quot;] <span className="text-slate-500">→</span> v₃</div>
                <div className="text-slate-300">table[&quot;k₅&quot;] <span className="text-slate-500">→</span> <span className="text-red-300">KeyError</span></div>
            </div>
            <div className="text-sm text-slate-400 space-y-2">
                <p><span className="text-slate-200">Hard lookup:</span> one exact match, one value, or nothing.</p>
                <p><span className="text-slate-200">Soft lookup:</span> every key matches a little; the answer is a blend of every value.</p>
            </div>
        </div>
    );
}

function ProjectScene({ step }) {
    const items = [['x', step.x, '#e2e8f0'], ['q', step.qx, Q_COLOR], ['k', step.kx, COLORS[1]], ['v', step.vx, COLORS[0]]];
    return (
        <div className="w-full grid sm:grid-cols-2 gap-4 items-center">
            <div className="max-w-[300px] w-full mx-auto">
                <Plane2D xRange={[-3, 3]} yRange={[-3, 3]} grid={1} width={300} ariaLabel="One token projected to a query, a key and a value">
                    {items.map(([n, v, c]) => <Vector key={n} to={v} color={c} width={n === 'x' ? 4 : 3} label={n} dashed={n === 'x'} />)}
                </Plane2D>
            </div>
            <div className="space-y-2 text-xs font-mono">
                {[['q = x W_Q', step.qx, W.q, Q_COLOR], ['k = x W_K', step.kx, W.k, COLORS[1]], ['v = x W_V', step.vx, W.v, COLORS[0]]].map(([name, v, M, c]) => (
                    <div key={name} className="flex flex-wrap items-center gap-2">
                        <span style={{ color: c }} className="w-20">{name}</span>
                        <span className="text-slate-500">W = [{M.map(row => `[${row.map(x => num(x, 1)).join(', ')}]`).join(', ')}]</span>
                        <span className="text-slate-200">→ {vec(v)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ShapesScene() {
    const rows = [['X', [14, 64], 'token vectors'], ['W_Q, W_K, W_V', [64, 16], 'learned, one set per head'], ['Q, K, V', [14, 16], 'one row per token'], ['QKᵀ', [14, 14], 'every query against every key']];
    return (
        <div className="w-full space-y-2">
            {rows.map(([n, sh, note]) => (
                <div key={n} className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-mono text-slate-100 w-32">{n}</span>
                    <ShapeTag shape={sh} names={n === 'QKᵀ' ? ['T', 'T'] : n.startsWith('W') ? ['d', 'dₕ'] : ['T', n === 'X' ? 'd' : 'dₕ']} />
                    <span className="text-xs text-slate-500">{note}</span>
                </div>
            ))}
            <p className="text-xs text-slate-500 pt-1">For a 14-token sentence in the tiny GPT: d = 64, dₕ = 16 per head.</p>
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.kind === 'dict') return <DictScene />;
    if (step.kind === 'project') return <ProjectScene step={step} />;
    if (step.kind === 'shapes') return <ShapesScene />;
    const r = step.r;
    return (
        <div className="w-full space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="max-w-[360px] w-full mx-auto">
                    <Caption>Keys and the query q = {vec(step.q)}</Caption>
                    <KeyPlane q={step.q} weights={step.kind === 'blend' || step.showWeights ? r.weights : null} range={step.range ?? 3.5} />
                </div>
                <div className="max-w-[360px] w-full mx-auto">
                    <Caption>Values{step.kind === 'blend' ? <> and the output <span style={{ color: OUT_COLOR }}>out = {vec(r.out)}</span></> : ''}</Caption>
                    <ValuePlane r={step.kind === 'blend' ? r : null} />
                </div>
            </div>
            <div>
                <Caption>{step.kind === 'place' ? 'The keys' : step.kind === 'score' && !step.showWeights ? 'Scores q · kⱼ' : 'Scores q · kⱼ and weights after softmax'}</Caption>
                <ScoreTable q={step.q} r={r} showScores={step.kind !== 'place'} showWeights={step.kind === 'blend' || Boolean(step.showWeights)} />
            </div>
        </div>
    );
}

/* ── explore ─────────────────────────────────────────────── */
function Explore({ initialQ }) {
    const [q, setQ] = useState(initialQ);
    const [keys, setKeys] = useState(KEYS);
    const [scale, setScale] = useState(1);
    const qs = [q[0] * scale, q[1] * scale];
    const r = lookup(qs, keys);
    const base = lookup(q, keys);
    const pull = pullOf(r), pull1 = pullOf(base);
    const win = argmax(r.scores), near = nearestByAngle(q, keys);
    const broken = scale !== 1;
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <p className="text-xs text-slate-400">Drag the query <span style={{ color: Q_COLOR }}>q</span> or any key. The scores, weights and the output follow.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="max-w-[360px] w-full mx-auto">
                        <Caption>Keys and the query (length {num(len(q))})</Caption>
                        <KeyPlane q={q} keys={keys} weights={r.weights} onDragQ={setQ} onDragKey={(j, p) => setKeys(ks => ks.map((k, i) => (i === j ? p : k)))} />
                    </div>
                    <div className="max-w-[360px] w-full mx-auto">
                        <Caption>Values and the output <span style={{ color: OUT_COLOR }}>out = {vec(r.out)}</span></Caption>
                        <ValuePlane r={r} />
                    </div>
                </div>
                <ScoreTable q={qs} r={r} keys={keys} />
                <p className="text-xs text-slate-400">
                    {win === near
                        ? <>{KN[win]} wins and is also the nearest key in direction.</>
                        : <>{KN[win]} wins although {KN[near]} is nearer in direction: it is longer ({num(len(keys[win]))} against {num(len(keys[near]))}).</>}
                </p>
                <div className="overflow-x-auto"><Tex block>{String.raw`q \cdot ${TEXK[win]} = ${paren(qs[0]).replace('−', '-')}${paren(keys[win][0]).replace('−', '-')} + ${paren(qs[1]).replace('−', '-')}${paren(keys[win][1]).replace('−', '-')} = ${tn(r.scores[win])}, \qquad w_{${win + 1}} = ${tn(r.weights[win], 3)}`}</Tex></div>
                <button onClick={() => { setQ(initialQ); setKeys(KEYS); setScale(1); }} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500">Reset the arrows</button>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Unplug className="h-4 w-4 text-amber-400" />Break it: change the query&apos;s length</h3>
                <p className="text-xs text-slate-400">Multiply every score by the same factor — what a longer or shorter query does.</p>
                <ParamSlider label="Score scale" value={scale} onChange={setScale} min={0} max={6} step={0.25} accent="indigo" format={(v) => `×${v.toFixed(2)}`} />
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setScale(0)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-amber-500">×0: no question</button>
                    <button onClick={() => setScale(5)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-amber-500">×5: a hard lookup</button>
                    {broken && <button onClick={() => setScale(1)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                {broken && (
                    <BreakNote>
                        {scale === 0
                            ? <>With every score 0, every weight is 25% and the output is the plain average of the values, whatever the query. Attention without a question.</>
                            : <>
                                {KN[argmax(r.scores)]} takes {pct(Math.max(...r.weights))} of the weight. How much each score can still move the output, |wⱼ (vⱼ − out)|:{' '}
                                {pull.map((p, j) => <span key={j} className="font-mono">{j ? ', ' : ''}{KN[j]} {num(p, 3)}</span>)}
                                {' '}(at ×1: {pull1.map((p, j) => <span key={j} className="font-mono">{j ? ', ' : ''}{num(p, 3)}</span>)}).
                                {scale > 1 ? ' The losing keys barely matter any more, so training could hardly move them. Large scores are what √d is there to prevent.' : ''}
                            </>}
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function QueryKeyValuePage() {
    const [mode, setMode] = useState('guided');
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const play = useStepPlayback(STEPS, 2200);
    const step = play.step;
    const predict = usePredict(STEPS, play.current, predictFor, play.pause);
    const [exploreQ, setExploreQ] = useState(QUERIES[0]);
    const toExplore = () => { setExploreQ(step?.q && Math.abs(len(step.q) - 2) < 0.01 ? step.q : QUERIES[0]); setMode('explore'); play.pause(); };
    const tex = step ? formulaFor(step) : null;
    const nearest = useMemo(() => measureNearest(), []);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/transformers" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Transformers
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Query, Key and Value</h1>
                    <p className="text-indigo-50 max-w-3xl">
                        Attention is a dictionary lookup made soft. Score a query against every key, turn the scores into weights, and blend the values. Four keys on a plane are enough to see all of it.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/transformers/why-attention" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Why Attention</Link>
                        <Link href="/vectors/dot-product" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Dot Product</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Drag the arrows', MousePointer2]]} mode={mode}
                            setMode={(m) => (m === 'explore' ? toExplore() : setMode(m))} accent="indigo" />
                        <SourceChip kind="illustrative">Hand-set keys and values, two numbers each</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore initialQ={exploreQ} />
                    ) : (
                        <>
                            <TourPlayer acts={ACTS} steps={STEPS} play={play} predict={predict} accent="indigo" minHeight="min-h-[420px]">
                                <VisualizationPanel step={step} />
                            </TourPlayer>
                            {predict.prompt && <PredictPrompt predict={predict} accent="indigo" />}
                            <ExplanationBox text={step?.explanation} predict={predict} accent="indigo" />
                            {tex && <FormulaPanel><div className="overflow-x-auto"><Tex block>{tex}</Tex></div></FormulaPanel>}
                        </>
                    )}

                    <InCode title="The same lookup in NumPy" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="Three roles" icon={KeyRound}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="font-mono" style={{ color: Q_COLOR }}>query</span>: what this position is looking for.</li>
                            <li><span className="font-mono" style={{ color: COLORS[1] }}>key</span>: what each position offers to be matched on.</li>
                            <li><span className="font-mono" style={{ color: COLORS[0] }}>value</span>: what each position hands over when it is chosen.</li>
                            <li className="pt-1 border-t border-slate-800"><span className="font-mono text-slate-200">out = Σ softmax(q · kⱼ) vⱼ</span></li>
                        </ul>
                    </Card>

                    <Misconception claim="Attention picks the key closest to the query.">
                        <p>It scores every key with a dot product, which counts length as well as direction, and then blends. Turn a length-2 query all the way round these four keys: for {pct(nearest.differ)} of directions the best-scoring key is not the nearest in direction, and the top key takes {pct(nearest.top)} of the weight on average — the rest still flows in from the others.</p>
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
