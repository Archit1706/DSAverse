"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, Dumbbell, Shuffle,
    ArrowRight, Sprout, Undo2, ScanSearch, TrendingDown, CheckCircle, XCircle, SlidersHorizontal,
    ChevronDown, Wrench, AlertTriangle, Lightbulb,
} from 'lucide-react';
import { val } from '@/lib/ml/autograd';
import {
    createMLP, cloneMLP, forward, lossAndGrads, createOptimizer, accuracy,
    flatParams, setFlatParams, flatGrads,
} from '@/lib/ml/mlp';
import { makeDataset } from '@/lib/ml/datasets';
import { useTrainer } from '@/lib/ml/useTrainer';
import { createRng, randomSeed } from '@/lib/random';
import ComputeGraph from '@/components/ml/ComputeGraph';
import NetworkDiagram from '@/components/ml/NetworkDiagram';
import DecisionField from '@/components/ml/DecisionField';
import LossChart from '@/components/ml/LossChart';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the guided example ────────────────────────────────────
   One input, two tanh hidden units, one output, squared-error loss — small
   enough to print every number, big enough to have a branch (x feeds both
   hidden units) and a saturated unit (h₂ sits near −1, where tanh is flat).
   The graph is built by lib/ml/autograd.js, and the steps replay the
   records its backward() returns. */

const DEFAULTS = { x: 1.5, y: 0.5, w1: 0.8, b1: -0.5, w2: -1.2, b2: 0.3, v1: 1.1, v2: 0.7 };
const PARAM_KEYS = ['w1', 'b1', 'w2', 'b2', 'v1', 'v2'];
const LEARNING_RATE = 0.5;
const H = 1e-5;

const ACTS = [
    { id: 1, label: 'Forward', icon: ArrowRight },
    { id: 2, label: 'Seed', icon: Sprout },
    { id: 3, label: 'Backward', icon: Undo2 },
    { id: 4, label: 'Check', icon: ScanSearch },
    { id: 5, label: 'Update', icon: TrendingDown },
];

const OP_NAMES = { '+': '+', '×': '×', tanh: 'tanh', '^2': 'x²' };
const TEX = {
    x: 'x', 'w₁': 'w_1', 'b₁': 'b_1', 'w₂': 'w_2', 'b₂': 'b_2', 'v₁': 'v_1', 'v₂': 'v_2',
    'w₁x': 'w_1x', 'z₁': 'z_1', 'h₁': 'h_1', 'w₂x': 'w_2x', 'z₂': 'z_2', 'h₂': 'h_2',
    'v₁h₁': 'v_1h_1', 'v₂h₂': 'v_2h_2', 'ŷ': '\\hat y', 'ŷ − y': '(\\hat y - y)', '−y': '(-y)', L: 'L',
};

/** 4 decimals, a real minus sign, and no "−0.0000". */
const f = (v, d = 4) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const fp = (v) => (v < 0 ? `(${f(v)})` : f(v));
const tn = (v, d = 4) => f(v, d).replace('−', '-');

function buildNetwork(p) {
    const x = val(p.x, 'x');
    const w1 = val(p.w1, 'w₁'), b1 = val(p.b1, 'b₁'), w2 = val(p.w2, 'w₂'), b2 = val(p.b2, 'b₂');
    const v1 = val(p.v1, 'v₁'), v2 = val(p.v2, 'v₂');
    const h1 = w1.mul(x).named('w₁x').add(b1).named('z₁').tanh().named('h₁');
    const h2 = w2.mul(x).named('w₂x').add(b2).named('z₂').tanh().named('h₂');
    const yhat = v1.mul(h1).named('v₁h₁').add(v2.mul(h2).named('v₂h₂')).named('ŷ');
    const err = yhat.add(val(-p.y, '−y')).named('ŷ − y');
    const loss = err.pow(2).named('L');
    return { loss, params: { w1, b1, w2, b2, v1, v2 }, x };
}

/* The same loss in plain arithmetic, with no autograd anywhere — what the
   Check act's finite differences call, so the check is independent. */
function lossOf(p) {
    const h1 = Math.tanh(p.w1 * p.x + p.b1), h2 = Math.tanh(p.w2 * p.x + p.b2);
    return (p.v1 * h1 + p.v2 * h2 - p.y) ** 2;
}

function describeForward(v) {
    const [a, b] = v.children;
    const name = (n) => n.label;
    if (v.op === '×') return `${name(v)} = ${name(a)} × ${name(b)} = ${fp(a.data)} × ${fp(b.data)} = ${f(v.data)}`;
    if (v.op === '+') return `${name(v)} = ${name(a)} + ${name(b)} = ${f(a.data)} + ${fp(b.data)} = ${f(v.data)}`;
    if (v.op === 'tanh') return `${name(v)} = tanh(${name(a)}) = tanh(${f(a.data)}) = ${f(v.data)}`;
    return `${name(v)} = (${name(a)})² = ${fp(a.data)}² = ${f(v.data)}`;
}

/** Why the local derivative is what it is, in words, for one edge. */
function localRule(parent, child) {
    if (parent.op === '+') return 'Addition passes the gradient through unchanged: the local derivative of a + b with respect to either input is 1.';
    if (parent.op === '×') {
        const other = parent.children[0] === child ? parent.children[1] : parent.children[0];
        return `For a product, the local derivative with respect to one input is the other input: ∂(${parent.label})/∂${child.label} = ${other.label} = ${f(other.data)}.`;
    }
    if (parent.op === 'tanh') return `tanh′(z) = 1 − tanh²(z) = 1 − ${fp(parent.data)}² = ${f(1 - parent.data ** 2)}.`;
    return `The derivative of u² is 2u = 2 × ${fp(child.data)} = ${f(2 * child.data)}.`;
}

const generateSteps = (p) => {
    const net = buildNetwork(p);
    const order = net.loss.topo();
    /* Node ids are positions in topological order, not the engine's global
       counters, so the server and the browser number them the same way. */
    const index = new Map(order.map((v, i) => [v.id, i]));
    const byId = new Map(order.map(v => [v.id, v]));
    const nodes = order.map((v, i) => ({ id: i, label: v.label, op: OP_NAMES[v.op] ?? v.op, leaf: v.children.length === 0 }));
    const edges = [];
    for (const v of order) for (const c of v.children) edges.push({ from: index.get(c.id), to: index.get(v.id) });
    const params = new Set(Object.values(net.params).map(v => index.get(v.id)));
    const allData = Object.fromEntries(order.map((v, i) => [i, v.data]));
    const leafData = Object.fromEntries(order.filter(v => v.children.length === 0).map(v => [index.get(v.id), v.data]));
    const lossIdx = index.get(net.loss.id);
    const L0 = net.loss.data;

    const steps = [];
    const s = (act, data) => steps.push({ nodes, edges, params, act, actName: ACTS[act - 1].label, ...data });

    // Act 1 — forward
    s(1, {
        data: leafData, grad: {},
        explanation: `A network with one input and two hidden units. x = ${f(p.x)} goes in, and we want ŷ to come out as y = ${f(p.y)}. The amber boxes are the six parameters training can change. Every box is one operation the autograd engine recorded as it ran — this is its real graph, not a drawing of one.`,
    });
    const groups = [
        ['Hidden unit 1', ['w₁x', 'z₁', 'h₁']],
        ['Hidden unit 2', ['w₂x', 'z₂', 'h₂']],
        ['The output', ['v₁h₁', 'v₂h₂', 'ŷ']],
        ['The loss', ['ŷ − y', 'L']],
    ];
    let shown = { ...leafData };
    for (const [title, labels] of groups) {
        const vs = labels.map(l => order.find(v => v.label === l));
        shown = { ...shown, ...Object.fromEntries(vs.map(v => [index.get(v.id), v.data])) };
        const tail = title === 'The loss'
            ? ` The loss is ${f(L0)}: how far ŷ is from y, squared. Every intermediate value stays stored, because the backward pass is about to need them.`
            : '';
        s(1, {
            data: shown, grad: {}, activeNodes: vs.map(v => index.get(v.id)), forward: vs.map(v => v.label),
            explanation: `${title}: ${vs.map(describeForward).join('; ')}.${tail}`,
        });
    }

    // Act 2 — seed
    let grad = { [lossIdx]: 1 };
    s(2, {
        data: allData, grad, activeNodes: [lossIdx],
        explanation: 'Backpropagation starts at the end. ∂L/∂L = 1: nudge L by a tiny amount and L changes by exactly that amount. From here every gradient flows right to left, against the arrows, one edge at a time.',
    });

    // Act 3 — backward, one step per chain-rule application
    const records = net.loss.backward();
    const received = new Map();
    records.forEach((r, k) => {
        const parent = byId.get(r.from), child = byId.get(r.to);
        const ci = index.get(child.id), pi = index.get(parent.id);
        const before = received.get(ci);
        received.set(ci, r.total);
        grad = { ...grad, [ci]: r.total };
        let extra = '';
        if (before !== undefined) {
            extra += ` ${child.label} feeds two operations, so its gradient is the sum of both paths: ${f(before)} + ${fp(r.contribution)} = ${f(r.total)}.`;
        }
        if (parent.op === 'tanh' && Math.abs(r.local) < 0.35) {
            extra += ` ${parent.label} is close to ±1, where tanh is nearly flat, so only ${Math.round(Math.abs(r.local) * 100)}% of the gradient gets through — a saturated unit learns slowly.`;
        }
        if (params.has(ci)) {
            extra += Math.abs(r.total) < 1e-12
                ? ` ${child.label} is a parameter, but it has no effect on the loss right now, so it gets no gradient.`
                : ` ${child.label} is a parameter and this is its final gradient: ${r.total > 0 ? 'raising it would raise the loss, so training will lower it' : 'raising it would lower the loss, so training will raise it'}.`;
        } else if (child.label === '−y') {
            extra += ' −y comes from the data, so its gradient is computed and never used.';
        } else if (child.label === 'x' && before !== undefined) {
            extra += ' x is the input, so nothing here trains it — but in a deeper network x would be the previous layer\'s output, and this summed gradient is what would flow on into it.';
        }
        s(3, {
            data: allData, grad, activeEdge: { from: ci, to: pi }, recordIndex: k,
            record: {
                parentLabel: parent.label, childLabel: child.label, parentTex: TEX[parent.label], childTex: TEX[child.label],
                upstream: r.upstream, local: r.local, contribution: r.contribution, total: r.total, before,
                rule: localRule(parent, child),
            },
            explanation: `${parent.label} → ${child.label}: ∂L/∂${child.label} ${before === undefined ? '=' : '+='} upstream × local = ${f(r.upstream)} × ${fp(r.local)} = ${f(r.contribution)}. ${localRule(parent, child)}${extra}`,
        });
    });

    // Act 4 — check every gradient against finite differences
    const checks = [...PARAM_KEYS, 'x'].map(key => {
        const node = key === 'x' ? net.x : net.params[key];
        const up = { ...p, [key]: p[key] + H }, dn = { ...p, [key]: p[key] - H };
        return { label: node.label, backprop: node.grad, numeric: (lossOf(up) - lossOf(dn)) / (2 * H) };
    });
    const worst = Math.max(...checks.map(c => Math.abs(c.backprop - c.numeric)));
    s(4, {
        data: allData, grad, checks, activeNodes: [...params],
        explanation: `Now check every gradient a completely different way: nudge one number by h = 0.00001 each way, rerun the forward pass, and measure the slope (L(w + h) − L(w − h)) / 2h. The largest disagreement is ${worst.toExponential(1)} — rounding. But this check needed 2 forward passes per number, ${2 * checks.length} in all, while backprop got every gradient from one backward sweep.`,
    });

    // Act 5 — use the gradients
    const next = { ...p };
    for (const key of PARAM_KEYS) next[key] = p[key] - LEARNING_RATE * net.params[key].grad;
    const after = buildNetwork(next);
    const afterData = Object.fromEntries(after.loss.topo().map((v, i) => [i, v.data]));
    const L1 = after.loss.data;
    const update = PARAM_KEYS.map(key => ({ label: net.params[key].label, before: p[key], grad: net.params[key].grad, after: next[key] }));
    const verdict = L1 < L0
        ? `Rerun the forward pass and the loss falls from ${f(L0)} to ${f(L1)}.`
        : `Rerun the forward pass and the loss rises from ${f(L0)} to ${f(L1)}: the step overshot. Gradients say which way is downhill, not how far — a smaller learning rate would have helped.`;
    s(5, {
        data: afterData, grad: {}, update, L0, L1, activeNodes: [...params, lossIdx],
        explanation: `Gradients are only directions; gradient descent uses them. Each parameter moves a small step against its own gradient: w ← w − η·∂L/∂w with η = ${LEARNING_RATE}. ${verdict}`,
    });
    s(5, {
        data: afterData, grad: {}, update, L0, L1, done: true,
        explanation: 'That is one training step: forward, backward, update. Training is this loop run thousands of times over many examples. Switch to "Train a network" to watch it learn XOR — and to break it on purpose.',
    });
    return steps;
};

/* ── predict ───────────────────────────────────────────────
   Before each backward step: how much does this edge add to the child's
   gradient? Everything needed is on screen — the parent's gradient is final
   (reverse topological order) and the local derivative comes from values in
   the boxes. The wrong answers are the classic slips: forgetting the local
   derivative, a sign error, forgetting the upstream gradient, adding
   instead of multiplying. The sign slip (−c) always comes second, so the
   options are never all on the answer's side of zero and "pick the most
   negative" cannot score. The right answer's position rotates with the
   step. */
const predictFor = (step, next) => {
    if (!next || next.act !== 3 || !next.record) return null;
    const { upstream: u, local: l, contribution: c, parentLabel, childLabel, rule } = next.record;
    const key = (v) => f(v, 3);
    const correct = key(c);
    const seen = new Set([correct]);
    const wrong = [];
    for (const v of [u, -c, l, u + l, 2 * c, c / 2, c + 0.5, c - 0.5, c + 1, c - 1]) {
        const k = key(v);
        if (seen.has(k)) continue;
        seen.add(k);
        wrong.push(k);
        if (wrong.length === 3) break;
    }
    const slot = (next.recordIndex * 3 + 1) % 4;
    const options = [...wrong];
    options.splice(slot, 0, correct);
    return {
        question: `Next the gradient crosses from ${parentLabel} back to ${childLabel}. How much does it add to ∂L/∂${childLabel}?`,
        options,
        correct: slot,
        because: `Upstream ∂L/∂${parentLabel} = ${f(u)}, times local ∂${parentLabel}/∂${childLabel} = ${f(l)}, gives ${f(c)}. ${rule}`,
    };
};

/** The formula for the step on screen, with its live values. */
function formulaFor(step) {
    if (step.act === 3) {
        const r = step.record;
        const lhs = String.raw`\frac{\partial L}{\partial ${r.childTex}}`;
        const op = r.before === undefined ? '=' : String.raw`\mathrel{+}=`;
        return String.raw`${lhs} ${op} \underbrace{\frac{\partial L}{\partial ${r.parentTex}}}_{${tn(r.upstream)}} \cdot \underbrace{\frac{\partial ${r.parentTex}}{\partial ${r.childTex}}}_{${tn(r.local)}} = ${tn(r.contribution)}`
            + (r.before === undefined ? '' : String.raw`\quad\Rightarrow\quad ${lhs} = ${tn(r.before)} + ${tn(r.contribution)} = ${tn(r.total)}`);
    }
    if (step.act === 2) return String.raw`\frac{\partial L}{\partial L} = 1`;
    if (step.act === 5 && step.update) {
        const w = step.update[0];
        return String.raw`w_1 \leftarrow w_1 - \eta\,\frac{\partial L}{\partial w_1} = ${tn(w.before)} - ${LEARNING_RATE}\cdot(${tn(w.grad)}) = ${tn(w.after)}`;
    }
    if (step.act === 4) return String.raw`\frac{\partial L}{\partial w} \approx \frac{L(w+h) - L(w-h)}{2h}, \quad h = 10^{-5}`;
    return String.raw`L = (\hat y - y)^2, \quad \hat y = v_1 \tanh(w_1x + b_1) + v_2 \tanh(w_2x + b_2)`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'During backpropagation a node receives ∂L/∂out from the node above it. What does it send back to each of its inputs?',
        options: [
            '∂L/∂out multiplied by the node’s local derivative with respect to that input',
            '∂L/∂out unchanged, to every input',
            'Its own forward value',
            '∂L/∂out divided by the number of inputs',
        ],
        correct: 0,
        explanation: 'That is the chain rule: ∂L/∂input = ∂L/∂out · ∂out/∂input. Each operation only needs to know its own local derivative — 1 for addition, the other input for a product, 1 − tanh² for tanh.',
    },
    {
        question: 'The input x feeds two hidden units. How is ∂L/∂x found?',
        options: [
            'Take the larger of the two paths’ gradients',
            'Multiply the two paths’ gradients',
            'Add the gradients arriving along both paths',
            'Average the two paths’ gradients',
        ],
        correct: 2,
        explanation: 'Nudging x changes the loss through both hidden units at once, and the two effects add up. That is why autograd uses += rather than = when it stores a gradient.',
    },
    {
        question: 'A network has 1 million parameters. How much work does backpropagation need to get every gradient, compared with nudging each parameter in turn?',
        options: [
            'The same: one pass per parameter either way',
            'Backprop: about one forward and one backward pass in total; nudging: about 2 million forward passes',
            'Backprop is slower, because it stores every intermediate value',
            'Nudging is exact and backprop is only an approximation',
        ],
        correct: 1,
        explanation: 'The backward pass reuses the stored forward values and visits each operation once, so it costs about as much as a forward pass whatever the number of parameters. Finite differences need two passes per parameter — useful as a check, hopeless for training.',
    },
];

const codeExample = `import torch

x, y = torch.tensor(1.5), torch.tensor(0.5)
w1, b1, w2, b2, v1, v2 = (torch.tensor(v, requires_grad=True)
                          for v in (0.8, -0.5, -1.2, 0.3, 1.1, 0.7))

# Forward: PyTorch records the same graph this page steps through.
h1 = torch.tanh(w1 * x + b1)
h2 = torch.tanh(w2 * x + b2)
y_hat = v1 * h1 + v2 * h2
loss = (y_hat - y) ** 2

loss.backward()      # backpropagation: fills .grad on every parameter
print(w1.grad)       # tensor(-0.9820), the number the guided tour reaches

with torch.no_grad():                     # one step of gradient descent
    for p in (w1, b1, w2, b2, v1, v2):
        p -= 0.5 * p.grad
        p.grad = None`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Step through the backward act again and retry.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-orange-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── the training lab ────────────────────────────────────── */

const XOR = makeDataset('xor', { n: 120, noise: 0.15, seed: 7 });
const XOR_POINTS = XOR.X.map(([x, y], i) => ({ x, y, label: XOR.y[i] }));
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n) => String(n).split('').map(d => SUB[Number(d)]).join('');

function paramNames(hidden) {
    const names = [];
    for (let o = 0; o < hidden; o++) for (let i = 0; i < 2; i++) names.push(`w x${sub(i + 1)}→h${sub(o + 1)}`);
    for (let o = 0; o < hidden; o++) names.push(`b h${sub(o + 1)}`);
    for (let o = 0; o < hidden; o++) names.push(`w h${sub(o + 1)}→out`);
    names.push('b out');
    return names;
}

const LAB_DEFAULTS = { hidden: 4, activation: 'tanh', equalInit: false, logLr: 0 };

function TrainLab() {
    const [hidden, setHidden] = useState(LAB_DEFAULTS.hidden);
    const [activation, setActivation] = useState(LAB_DEFAULTS.activation);
    const [equalInit, setEqualInit] = useState(LAB_DEFAULTS.equalInit);
    const [logLr, setLogLr] = useState(LAB_DEFAULTS.logLr);
    const [seed, setSeed] = useState(1);
    const [edgeMode, setEdgeMode] = useState('weights');
    const [probe, setProbe] = useState([0.5, -0.5]);
    const [check, setCheck] = useState(null);
    const lr = 10 ** logLr;

    const trainer = useTrainer({
        init: () => {
            const net = createMLP([2, hidden, 1], { activation, output: 'sigmoid', seed });
            if (equalInit) for (const w of net.W) w.fill(0.5);
            return { net, opt: createOptimizer(net, { type: 'sgd', lr: 1 }), last: null };
        },
        step: (state) => {
            state.opt.lr = lr;
            const r = lossAndGrads(state.net, XOR.X, XOR.y);
            state.opt.step(r);
            state.last = r;
            return { loss: r.loss };
        },
        deps: [hidden, activation, equalInit, seed],
        maxStepsPerFrame: 3,
    });
    const { net, last } = trainer.state;

    useEffect(() => { setCheck(null); }, [hidden, activation, equalInit, seed]);

    const predictBatch = useCallback((grid) => {
        const { A } = forward(net, grid);
        return A[A.length - 1];
    }, [net]);
    const acc = accuracy(net, XOR.X, XOR.y);
    const probeActs = forward(net, [probe]).A.map(a => Array.from(a));
    const lossNow = trainer.history.length ? trainer.history[trainer.history.length - 1].loss : null;
    const nParams = 4 * hidden + 1;

    const runCheck = () => {
        const flat = flatParams(net);
        const grads = flatGrads(lossAndGrads(net, XOR.X, XOR.y));
        const names = paramNames(hidden);
        const picks = createRng(trainer.steps + 11).shuffle(flat.map((_, i) => i)).slice(0, 5).sort((a, b) => a - b);
        const clone = cloneMLP(net);
        const lossWith = (i, d) => { const q = flat.slice(); q[i] += d; setFlatParams(clone, q); return lossAndGrads(clone, XOR.X, XOR.y).loss; };
        setCheck({
            step: trainer.steps,
            rows: picks.map(i => ({ name: names[i], backprop: grads[i], numeric: (lossWith(i, H) - lossWith(i, -H)) / (2 * H) })),
        });
    };

    const broken = [];
    if (lr > 8) broken.push(`Learning rate ${lr.toFixed(1)}: each step jumps clean over the valley the gradient points into, so the loss bounces instead of falling. The gradients are still correct — the step is too big.`);
    if (activation === 'linear') broken.push('No nonlinearity: a stack of linear layers is just one linear layer, so the boundary can only ever be a straight line — and no line separates XOR. Backprop is working perfectly; the model cannot express the answer.');
    if (equalInit) broken.push('Every weight starts at 0.5: each hidden unit computes the same thing, receives the same gradient and makes the same update, forever. The units never become different, so the network acts like it has one hidden unit.');

    /* A too-high learning rate leaves the weights scrambled, so repairing
       also starts again from fresh weights. */
    const repair = () => { setHidden(LAB_DEFAULTS.hidden); setActivation(LAB_DEFAULTS.activation); setEqualInit(false); setLogLr(0); trainer.reset(); };

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h2 className="text-white font-semibold">A 2-{hidden}-1 network learning XOR</h2>
                    <SourceChip kind="live">Trained live in your browser · same seed, same curve</SourceChip>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <DecisionField predictBatch={predictBatch} points={XOR_POINTS} version={trainer.steps}
                            onAddPoint={(x, y) => setProbe([x, y])} ariaLabel="The network's decision field over the XOR data" />
                        <p className="text-[11px] text-slate-500 mt-1.5">Blue and orange are the two classes; colour strength is the network&apos;s confidence. Click anywhere to send that point through the network.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {[['step', trainer.steps], ['loss', lossNow === null ? '—' : lossNow.toFixed(4)], ['accuracy', `${Math.round(acc * 100)}%`]].map(([k, v]) => (
                                <div key={k} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
                                    <div className="font-mono text-sm text-slate-100 tabular-nums">{v}</div>
                                </div>
                            ))}
                        </div>
                        <LossChart logY series={[{ name: 'training loss', color: '#fb923c', points: trainer.history.map(h => ({ x: h.step, y: h.loss })) }]} />
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={trainer.toggle}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500">
                                {trainer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{trainer.running ? 'Pause' : 'Train'}
                            </button>
                            <button onClick={() => trainer.stepOnce(1)} aria-label="One training step"
                                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><SkipForward className="h-4 w-4" /></button>
                            <button onClick={trainer.reset} aria-label="Reset the weights"
                                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                            <button onClick={() => setSeed(randomSeed())} aria-label="New random starting weights" title="New random starting weights"
                                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ParamSlider label="Learning rate η" value={logLr} onChange={setLogLr} min={-1.5} max={1.5} step={0.05} accent="orange"
                        format={() => lr.toFixed(lr < 1 ? 2 : 1)} hint="Log scale, 0.03 to 30" />
                    <label className="block">
                        <span className="block text-sm font-medium text-slate-300 mb-1">Hidden units</span>
                        <select value={hidden} onChange={e => setHidden(Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200">
                            {[2, 3, 4, 8].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="block text-sm font-medium text-slate-300 mb-1">Activation</span>
                        <select value={activation} onChange={e => setActivation(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200">
                            <option value="tanh">tanh</option>
                            <option value="relu">ReLU</option>
                            <option value="linear">none (linear)</option>
                        </select>
                    </label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => setLogLr(Math.log10(20))} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500">Learning rate too high</button>
                    <button onClick={() => setActivation('linear')} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500">No nonlinearity</button>
                    <button onClick={() => setEqualInit(true)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500">Every weight equal</button>
                    <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
                {broken.length > 0 && (
                    <div className="space-y-2">
                        {broken.map(msg => (
                            <p key={msg} className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{msg}</p>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-white">
                        Inside the network at ({probe[0].toFixed(2)}, {probe[1].toFixed(2)})
                    </h3>
                    <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900 text-xs" role="tablist" aria-label="Colour edges by">
                        {[['weights', 'Weights'], ['gradients', 'Gradients']].map(([k, label]) => (
                            <button key={k} role="tab" aria-selected={edgeMode === k} onClick={() => setEdgeMode(k)}
                                className={`px-2.5 py-1 rounded-md ${edgeMode === k ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{label}</button>
                        ))}
                    </div>
                </div>
                <NetworkDiagram sizes={[2, hidden, 1]} weights={net.W}
                    edgeValues={edgeMode === 'gradients' && last ? last.gradW : undefined}
                    activations={probeActs} layerNames={['input', 'hidden', 'output']}
                    nodeLabels={[['x₁', 'x₂'], [], ['p']]} ariaLabel="The network's weights and activations" />
                <p className="text-[11px] text-slate-500 mt-1">
                    {edgeMode === 'weights'
                        ? 'Edges: blue positive, orange negative, thicker is bigger. Nodes show each unit’s output for the clicked point.'
                        : last ? 'Edges show ∂L/∂w from the last backward pass — the direction each weight is about to move against.' : 'Train for a step to see the gradients.'}
                </p>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-white">Check backprop on this network</h3>
                    <button onClick={runCheck} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-orange-500">
                        <ScanSearch className="h-3.5 w-3.5" />Check 5 gradients now
                    </button>
                </div>
                {check ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono tabular-nums">
                            <thead>
                                <tr className="text-slate-500 text-left">
                                    <th className="font-normal py-1 pr-3">parameter</th><th className="font-normal pr-3">backprop</th>
                                    <th className="font-normal pr-3">finite difference</th><th className="font-normal">gap</th>
                                </tr>
                            </thead>
                            <tbody>
                                {check.rows.map(r => (
                                    <tr key={r.name} className="border-t border-slate-800 text-slate-200">
                                        <td className="py-1 pr-3 text-slate-300">{r.name}</td>
                                        <td className="pr-3">{r.backprop.toFixed(6)}</td>
                                        <td className="pr-3">{r.numeric.toFixed(6)}</td>
                                        <td className="text-emerald-300">{Math.abs(r.backprop - r.numeric).toExponential(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-[11px] text-slate-500 mt-2">
                            At step {check.step}. Checking all {nParams} parameters this way would cost {2 * nParams} forward passes over the data; backprop got all {nParams} from one forward and one backward pass.
                        </p>
                    </div>
                ) : (
                    <p className="text-xs text-slate-500">Pause anywhere and check: five random parameters, backprop&apos;s gradient against a finite difference computed by rerunning the network.</p>
                )}
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

const SLIDERS = [
    ['x', 'x (input)'], ['y', 'y (target)'], ['w1', 'w₁'], ['b1', 'b₁'], ['w2', 'w₂'], ['b2', 'b₂'], ['v1', 'v₁'], ['v2', 'v₂'],
];

export default function BackpropagationPage() {
    const [mode, setMode] = useState('guided');            // 'guided' | 'train'
    const [values, setValues] = useState(DEFAULTS);
    const [showSliders, setShowSliders] = useState(false);
    const stepHistory = useMemo(() => generateSteps(values), [values]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
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

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/neural-networks" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Neural Networks
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Backpropagation</h1>
                    <p className="text-orange-100 max-w-3xl">
                        How a network finds out which way to adjust every one of its weights: the chain rule, run backwards through the graph of operations, one edge at a time.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Derivative Rules', '/differential-calculus/derivative-rules'], ['Partial Derivatives and Gradients', '/differential-calculus/partial-derivatives-and-gradients'], ['Gradient Descent', '/differential-calculus/gradient-descent']].map(([name, href]) => (
                            <Link key={href} href={href} className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">{name}</Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                        {[['guided', 'Step through it', Compass], ['train', 'Train a network', Dumbbell]].map(([key, label, Icon]) => (
                            <button key={key} role="tab" aria-selected={mode === key}
                                onClick={() => { setMode(key); setIsPlaying(false); }}
                                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                <Icon className="h-4 w-4" />{label}
                            </button>
                        ))}
                    </div>
                    {mode === 'guided' && <SourceChip kind="live">Every number computed in your browser</SourceChip>}
                </div>

                {mode === 'guided' && (
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 overflow-hidden">
                        <div className="flex flex-wrap gap-1.5 px-4 pt-4" role="tablist" aria-label="Acts">
                            {ACTS.map(act => {
                                const Icon = act.icon;
                                const tone = act.id === step.act
                                    ? 'bg-orange-500/20 text-orange-200 border-orange-500/50'
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
                            <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all" style={{ width: `${(currentStep / (stepHistory.length - 1)) * 100}%` }} />
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                                <span>Act {step.act} of {ACTS.length} · {step.actName}</span>
                                <span>step {currentStep + 1} of {stepHistory.length}</span>
                            </div>
                            <ComputeGraph nodes={step.nodes} edges={step.edges} data={step.data} grad={step.grad}
                                activeEdge={step.activeEdge} activeNodes={step.activeNodes} params={step.params}
                                ariaLabel="Computation graph of a one-input, two-hidden-unit network and its squared-error loss" />
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-2">
                                <span>Top line: the value. <span className="text-sky-400">∂ blue</span> / <span className="text-orange-400">∂ orange</span>: a positive / negative gradient ∂L/∂(that box).</span>
                                <span><span className="text-amber-400">Amber outline</span>: a parameter.</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="orange" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-orange-500" />
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4 min-w-0">
                        {mode === 'guided' ? (
                            <>
                                {predict.prompt && <PredictPrompt predict={predict} accent="orange" />}

                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                                    <div className="flex items-start gap-2">
                                        <Info className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-orange-200 text-sm leading-relaxed">
                                            {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                                    <div className="text-slate-100 text-sm sm:text-base">
                                        <Tex block>{formulaFor(step)}</Tex>
                                    </div>
                                    {step.checks && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs font-mono tabular-nums">
                                                <thead>
                                                    <tr className="text-slate-500 text-left">
                                                        <th className="font-normal py-1 pr-3">number</th><th className="font-normal pr-3">backprop</th>
                                                        <th className="font-normal pr-3">finite difference</th><th className="font-normal">gap</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {step.checks.map(c => (
                                                        <tr key={c.label} className="border-t border-slate-800 text-slate-200">
                                                            <td className="py-1 pr-3">∂L/∂{c.label}</td>
                                                            <td className="pr-3">{c.backprop.toFixed(8)}</td>
                                                            <td className="pr-3">{c.numeric.toFixed(8)}</td>
                                                            <td className="text-emerald-300">{Math.abs(c.backprop - c.numeric).toExponential(1)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {step.update && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs font-mono tabular-nums">
                                                <thead>
                                                    <tr className="text-slate-500 text-left">
                                                        <th className="font-normal py-1 pr-3">parameter</th><th className="font-normal pr-3">before</th>
                                                        <th className="font-normal pr-3">gradient</th><th className="font-normal">after</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {step.update.map(u => (
                                                        <tr key={u.label} className="border-t border-slate-800 text-slate-200">
                                                            <td className="py-1 pr-3">{u.label}</td><td className="pr-3">{f(u.before)}</td>
                                                            <td className={`pr-3 ${u.grad > 0 ? 'text-sky-300' : u.grad < 0 ? 'text-orange-300' : ''}`}>{f(u.grad)}</td>
                                                            <td>{f(u.after)}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="border-t border-slate-700 text-slate-100">
                                                        <td className="py-1 pr-3">loss L</td><td className="pr-3">{f(step.L0)}</td><td className="pr-3" />
                                                        <td className={step.L1 < step.L0 ? 'text-emerald-300' : 'text-rose-300'}>{f(step.L1)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <div className="border-t border-slate-800 pt-3">
                                        <button onClick={() => setShowSliders(s => !s)} aria-expanded={showSliders}
                                            className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white">
                                            <SlidersHorizontal className="h-4 w-4 text-orange-400" />Change the numbers
                                            <ChevronDown className={`h-4 w-4 transition-transform ${showSliders ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showSliders && (
                                            <div className="mt-3 space-y-3">
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                                                    {SLIDERS.map(([key, label]) => (
                                                        <ParamSlider key={key} label={label} value={values[key]} min={-2} max={2} step={0.1} accent="orange"
                                                            format={(v) => f(v, 1)} onChange={(v) => setValues(old => ({ ...old, [key]: v }))} />
                                                    ))}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                                    <button onClick={() => setValues(DEFAULTS)} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500">Original numbers</button>
                                                    <button onClick={() => setValues(v => ({ ...v, x: 0 }))} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500">Try x = 0</button>
                                                    <button onClick={() => setValues(v => ({ ...v, w2: 2, b2: 1.5 }))} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500">Saturate h₂</button>
                                                    <span className="text-slate-500">The whole tour recomputes; you stay on the same step.</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <TrainLab />
                        )}

                        <InCode title="The same network in PyTorch" code={codeExample} />
                    </div>

                    <aside className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-white mb-3">The whole backward pass in five rules</h2>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><span className="text-orange-300 font-semibold">Every edge:</span> gradient in = upstream × local.</li>
                                <li><span className="text-slate-200 font-semibold">a + b</span> — local derivative 1: passes the gradient through.</li>
                                <li><span className="text-slate-200 font-semibold">a × b</span> — local derivative is the other input.</li>
                                <li><span className="text-slate-200 font-semibold">tanh(z)</span> — local derivative 1 − tanh²(z): near ±1, almost nothing gets through.</li>
                                <li><span className="text-orange-300 font-semibold">Branches:</span> a value used twice adds up the gradients from both uses.</li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                            <p className="text-sm text-slate-300 mb-2">&ldquo;To find a weight&apos;s gradient, nudge that weight and rerun the network.&rdquo;</p>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                That is finite differences — the Check act does exactly it, and it needs two forward passes for every parameter. Backprop reuses the values stored on the way forward and gets every gradient in one backward sweep. For a 7-billion-parameter model that is the difference between 14 billion forward passes and the work of about three.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
