"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, SlidersHorizontal, Shuffle,
    ListOrdered, Undo2, Route, GitFork, ListChecks, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { Value, val } from '@/lib/ml/autograd';
import { createRng, randomSeed } from '@/lib/random';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ComputeGraph from '@/components/ml/ComputeGraph';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the expression ─────────────────────────────────────────
   L = (wx + b − y)², the squared error of a one-weight model, computed by the
   autograd engine in lib/ml/autograd.js. Every operation it runs leaves a
   record: its output, its inputs and its local derivatives, as plain numbers.
   The tour shows those records being written and then replayed newest first,
   which is all a backward pass is. Act 4 adds a penalty λw², so w is used
   twice and its gradient becomes a sum. */

const LAMBDA = 0.5;
const H = 1e-5;
const OP_NAMES = { '×': '×', '+': '+', '−': '−', '^2': 'square' };

/** e = z − y as one recorded operation, written the way the engine writes its own. */
function sub(a, b) {
    const out = new Value(a.data - b.data, [a, b], '−');
    out.locals = [[a, 1], [b, -1]];
    return out;
}

/** Run the code, which records it. Returns the root and the operations in the order their lines ran. */
function record(p, { penalty = false } = {}) {
    const w = val(p.w, 'w'), x = val(p.x, 'x'), b = val(p.b, 'b'), y = val(p.y, 'y');
    const m = w.mul(x).named('m');
    const z = m.add(b).named('z');
    const e = sub(z, y).named('e');
    const L = e.pow(2).named('L');
    if (!penalty) return { root: L, ops: [m, z, e, L] };
    const lam = val(LAMBDA, 'λ');
    const s = w.pow(2).named('s');
    const R = lam.mul(s).named('R');
    const J = L.add(R).named('J');
    return { root: J, ops: [m, z, e, L, s, R, J] };
}

/** The same numbers in plain arithmetic, with no graph anywhere: what the finite-difference checks call. */
const lossOf = (p, penalty = false) => (p.w * p.x + p.b - p.y) ** 2 + (penalty ? LAMBDA * p.w ** 2 : 0);
const slopeOf = (p, key, penalty = false) => (lossOf({ ...p, [key]: p[key] + H }, penalty) - lossOf({ ...p, [key]: p[key] - H }, penalty)) / (2 * H);

/* Box ids are positions in the root's topological order, so they do not depend on
   the engine's global counter and the server and the browser number them alike.
   J's order starts with L's, so the first eight ids are the same in both graphs. */
function structure(root) {
    const order = root.topo();
    const id = new Map(order.map((v, i) => [v, i]));
    const nodes = order.map((v, i) => ({ id: i, label: v.label, op: OP_NAMES[v.op] ?? v.op, leaf: v.children.length === 0 }));
    const edges = [];
    for (const v of order) for (const c of v.children) edges.push({ from: id.get(c), to: id.get(v) });
    return { order, id, nodes, edges };
}
const SHAPES = { L: structure(record({ w: 1, x: 1, b: 1, y: 1 }).root), J: structure(record({ w: 1, x: 1, b: 1, y: 1 }, { penalty: true }).root) };
const GRAPH = { L: { nodes: SHAPES.L.nodes, edges: SHAPES.L.edges }, J: { nodes: SHAPES.J.nodes, edges: SHAPES.J.edges } };
const ID = Object.fromEntries(SHAPES.J.nodes.map(n => [n.label, n.id]));
const PARAMS = new Set([ID.w, ID.b]);
const LEAVES = ['w', 'b', 'x', 'y'];

/** The local rule for one input of a record, in words: ∂m/∂w is "x". */
function ruleOf(v, k) {
    if (v.op === '×') return v.children[1 - k].label;
    if (v.op === '+') return '1';
    if (v.op === '−') return k === 0 ? '1' : '−1';
    return `2${v.children[0].label}`;
}
function opText(v) {
    const [a, b] = v.children.map(c => c.label);
    return v.op === '^2' ? `${v.label} = ${a}²` : `${v.label} = ${a} ${v.op} ${b}`;
}

/** Everything one run of the code gives, by box id: values, the engine's gradients, its backward records and the tape. */
function run(p, { penalty = false } = {}) {
    const { root, ops } = record(p, { penalty });
    const { order, id } = structure(root);
    const byEngineId = new Map(order.map(v => [v.id, v]));
    const records = root.backward().map(r => ({ ...r, from: id.get(byEngineId.get(r.from)), to: id.get(byEngineId.get(r.to)) }));
    return {
        values: Object.fromEntries(order.map((v, i) => [i, v.data])),
        grads: Object.fromEntries(order.map((v, i) => [i, v.grad])),
        records,
        rows: ops.map(v => ({
            id: id.get(v), label: v.label, text: opText(v), value: v.data,
            locals: v.locals.map(([c, l], k) => ({ child: id.get(c), name: `∂${v.label}/∂${c.label}`, rule: ruleOf(v, k), value: l })),
        })),
    };
}

/** The backward pass written out: newest record first, gradient in = gradient out × local, added in.
    The engine's own backward() is the reference; the two flags reproduce the classic bugs on the same records. */
function replay(root, { accumulate = true, newestFirst = true } = {}) {
    const order = root.topo();
    const grad = new Map(order.map(v => [v, 0]));
    grad.set(root, 1);
    for (const v of newestFirst ? [...order].reverse() : order) {
        for (const [child, local] of v.locals) {
            const c = grad.get(v) * local;
            grad.set(child, accumulate ? grad.get(child) + c : c);
        }
    }
    return Object.fromEntries(order.map((v, i) => [i, grad.get(v)]));
}

/* ── numbers as text ───────────────────────────────────────
   Inputs have one decimal, so every value and gradient on the tour is exact at
   four decimals; trailing zeros are dropped. */
const numD = (v, d) => {
    const s = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(/\.?0+$/, '');
    return (s === '-0' ? '0' : s).replace('-', '−');
};
const num = (v) => numD(v, 4);
const fixed = (v, d) => v.toFixed(d).replace('-', '−');
const pn = (v) => (v < 0 ? `(${num(v)})` : num(v));
const tnum = (v, d = 4) => numD(v, d).replace('−', '-');
const tpn = (v) => (v < 0 ? `(${tnum(v)})` : tnum(v));
const sgn = (v) => (v > 0 ? 'positive' : 'negative');
const TEX = { 'λ': '\\lambda' };
const tl = (label) => TEX[label] ?? label;
const meaning = (g, who) => (g > 0
    ? `raising ${who} would raise the loss, so training will lower it`
    : `raising ${who} would lower the loss, so training will raise it`);

/* ── the tour's numbers and its prompts ────────────────────
   Each tour draws w, x, b and y (one decimal, −2 to 2) from a fixed list of
   candidates. Three prompts can be asked: the sign of ∂L/∂w and of ∂L/∂x when
   the replay crosses m = w × x, and, once w is used twice, the sign of the sum
   of its two gradients. The last is only asked when the two uses disagree in
   sign, so "keep the data path's sign" (the overwrite bug) is right exactly
   half the time.

   Each prompt is asked with a probability set by its cell, so that every cell
   is asked equally often. A sign cell is (sign of e, sign of the other input,
   sign of the input itself), which makes "same sign as the upstream
   gradient", "same sign as the other input", "same sign as the input itself"
   and every fixed answer right half the time. The sum's cell is (answer,
   which path is bigger). */

const TOUR_CANDIDATES = (() => {
    const rng = createRng(31);
    const d = () => rng.int(-20, 20) / 10;
    const out = [];
    while (out.length < 2000) {
        const p = { w: d(), x: d(), b: d(), y: d() };
        const e = p.w * p.x + p.b - p.y, data = 2 * e * p.x, pen = 2 * LAMBDA * p.w;
        if (Math.min(Math.abs(p.w), Math.abs(p.x)) < 0.3 || Math.abs(e) < 0.2 || Math.abs(e) > 1.5) continue;
        if (Math.abs(data + pen) < 0.1 || Math.abs(Math.abs(data) - Math.abs(pen)) < 0.1) continue;
        out.push(p);
    }
    return out;
})();

const bit = (v) => (v > 0 ? 1 : 0);
function cellsOf(p) {
    const e = p.w * p.x + p.b - p.y, data = 2 * e * p.x, pen = 2 * LAMBDA * p.w;
    return {
        w: `${bit(e)}${bit(p.x)}${bit(p.w)}`,
        x: `${bit(e)}${bit(p.w)}${bit(p.x)}`,
        J: bit(data) === bit(pen) ? null : `${bit(data + pen)}${bit(Math.abs(data) > Math.abs(pen))}`,
    };
}
const PROMPT_KEYS = ['w', 'x', 'J'];
const CELL_COUNTS = (() => {
    const counts = Object.fromEntries(PROMPT_KEYS.map(k => [k, {}]));
    TOUR_CANDIDATES.forEach(p => Object.entries(cellsOf(p)).forEach(([k, cell]) => { if (cell !== null) counts[k][cell] = (counts[k][cell] ?? 0) + 1; }));
    return counts;
})();
const ASK = Object.fromEntries(PROMPT_KEYS.map(k => {
    const least = Math.min(...Object.values(CELL_COUNTS[k]));
    return [k, Object.fromEntries(Object.entries(CELL_COUNTS[k]).map(([cell, n]) => [cell, least / n]))];
}));
const tourValues = (seed) => createRng(seed).pick(TOUR_CANDIDATES);

function tourAsks(seed, p) {
    const rng = createRng(seed * 31 + 7);
    const cells = cellsOf(p);
    return Object.fromEntries(PROMPT_KEYS.map(k => {
        const roll = rng.next();
        return [k, cells[k] !== null && roll < ASK[k][cells[k]]];
    }));
}

/* w = 1.1, x = 0.5, b = 0.6, y = 1.7: the two uses of w pull opposite ways
   (−0.55 through m, +1.1 through the penalty), so dropping either flips the
   sign, and all three prompts are asked. */
const DEFAULT_SEED = 165;

const ACTS = [
    { id: 1, label: 'Record', icon: ListOrdered },
    { id: 2, label: 'Replay', icon: Undo2 },
    { id: 3, label: 'The path', icon: Route },
    { id: 4, label: 'Used twice', icon: GitFork },
    { id: 5, label: 'The rules', icon: ListChecks },
];

function generateSteps(seed) {
    const p = tourValues(seed);
    const asks = tourAsks(seed, p);
    const A = run(p), B = run(p, { penalty: true });
    const v = A.values, gA = A.grads, gB = B.grads;
    const e = v[ID.e], gw = gA[ID.w];
    const leaves = (vals, extra = []) => Object.fromEntries([ID.w, ID.x, ID.b, ID.y, ...extra].map(i => [i, vals[i]]));
    const steps = [];
    const s = (act, data) => steps.push({ act, actName: ACTS[act - 1].label, ...data });
    const label = (i) => SHAPES.J.nodes[i].label;

    /* One backward record as a step: which tape row and which of its local derivatives it uses. */
    const replayStep = (G, r, grad, before, extra) => {
        const row = G.rows.findIndex(x => x.id === r.from);
        return {
            activeEdge: { from: r.to, to: r.from }, tapeActive: row, tapeLocal: G.rows[row].locals.findIndex(l => l.child === r.to),
            rec: { parent: label(r.from), child: label(r.to), upstream: r.upstream, local: r.local, contribution: r.contribution, total: r.total, before },
            grad, ...extra,
        };
    };

    // Act 1 — record
    s(1, {
        kind: 'intro', graph: 'L', data: leaves(v), grad: {}, rows: [], tapeActive: -1, p,
        explanation: `Four numbers: a weight w = ${num(p.w)}, a bias b = ${num(p.b)}, an input x = ${num(p.x)} and its target y = ${num(p.y)}. Four lines of code compute L = (wx + b − y)², the squared error of a one-weight model. As each line runs, the autograd engine computes the value and also writes a record on a tape. The dashed boxes mark where those records will go; nothing is there until its line has run.`,
    });
    const recordText = [
        (r) => `Line 1 runs: m = w × x = ${pn(p.w)} × ${pn(p.x)} = ${num(r.value)}. The record keeps the output, both inputs, and the local derivatives: how m moves when one input moves on its own. For a product that is the other input, so ∂m/∂w = x = ${num(p.x)} and ∂m/∂x = w = ${num(p.w)}. They are plain numbers, known now because w and x are known now.`,
        (r) => `Line 2: z = m + b = ${num(v[ID.m])} + ${pn(p.b)} = ${num(r.value)}. Both of addition's local derivatives are 1: nudge m or b by a little and z moves by the same little.`,
        (r) => `Line 3: e = z − y = ${num(v[ID.z])} − ${pn(p.y)} = ${num(r.value)}, the error. ∂e/∂z = 1 and ∂e/∂y = −1: raising the target lowers the error.`,
        (r) => `Line 4: L = e² = ${pn(e)}² = ${num(r.value)}, with ∂L/∂e = 2e = ${num(2 * e)}. That is the whole tape: four records. None of them knows the formula (wx + b − y)², or anything about the others. Each knows its own inputs and its own local rule.`,
    ];
    A.rows.forEach((row, k) => {
        const shown = { ...leaves(v), ...Object.fromEntries(A.rows.slice(0, k + 1).map(r => [r.id, r.value])) };
        s(1, {
            kind: 'record', graph: 'L', data: shown, grad: {}, rows: A.rows.slice(0, k + 1), tapeActive: k, row, formulaRows: [k],
            activeNodes: [row.id, ...row.locals.map(l => l.child)],
            explanation: recordText[k](row),
        });
    });

    // Act 2 — replay
    let grad = { [ID.L]: 1 };
    s(2, {
        kind: 'seed', graph: 'L', data: v, grad, rows: A.rows, tapeActive: 3, activeNodes: [ID.L], root: 'L',
        explanation: 'Now replay the tape backwards, newest record first, starting from ∂L/∂L = 1. Each record turns the gradient of its output into gradients for its inputs: gradient in = gradient out × local derivative, added to whatever that input already holds. Newest first, because a record may pass its gradient on only once every record that used its output has added to it, and those were all written later.',
    });
    const childNote = (child, total) => ({
        e: ' The square\'s local derivative 2e was stored on line 4.',
        z: ' Subtraction passes the gradient to z unchanged.',
        y: ' Subtraction flips the sign for y. y is data, so nothing will use this number; this engine works it out anyway (PyTorch skips inputs that do not ask for a gradient).',
        m: ' Addition passes it on unchanged.',
        b: ` b is a parameter and this is its whole gradient: ${meaning(total, 'b')}.`,
        w: ` w is a parameter: ${meaning(total, 'w')}.`,
        x: ' x is the input, so nothing trains it, but in a deeper network x would be the layer below\'s output and this number would keep flowing down.',
    })[child] ?? '';
    A.records.forEach(r => {
        grad = { ...grad, [r.to]: r.total };
        const child = label(r.to), parent = label(r.from);
        s(2, {
            kind: 'replay', graph: 'L', data: v, rows: A.rows, root: 'L',
            ...replayStep(A, r, grad, undefined, { promptKey: child === 'w' || child === 'x' ? child : null, ask: child === 'w' ? asks.w : child === 'x' ? asks.x : false }),
            explanation: `${parent} → ${child}: ∂L/∂${child} = ∂L/∂${parent} × ∂${parent}/∂${child} = ${pn(r.upstream)} × ${pn(r.local)} = ${num(r.contribution)}.${childNote(child, r.total)}`,
        });
    });

    // Act 3 — the path
    const L0 = v[ID.L], L1 = lossOf({ ...p, w: p.w + 0.01 });
    s(3, {
        kind: 'path', graph: 'L', data: v, grad: gA, rows: A.rows, tapeActive: -1, activeNodes: [ID.L, ID.e, ID.z, ID.m, ID.w], e, x: p.x, gw,
        explanation: `Every gradient is a product of local derivatives along a path back from L. For w the path is L → e → z → m → w, so ∂L/∂w = 2e · 1 · 1 · x, which is the textbook derivative 2(wx + b − y)·x: here ${pn(2 * e)} · 1 · 1 · ${pn(p.x)} = ${num(gw)}. The engine never wrote that formula down. It multiplied numbers it had stored, one per record, in the order it met them.`,
    });
    s(3, {
        kind: 'nudge', graph: 'L', data: v, grad: gA, rows: A.rows, tapeActive: -1, activeNodes: [ID.w, ID.L], L0, L1, gw, x: p.x,
        explanation: `What the number means: ∂L/∂w is a slope. Move w by +0.01 and L goes from ${numD(L0, 6)} to ${numD(L1, 6)}, a change of ${numD(L1 - L0, 6)}. The slope predicts 0.01 × ${pn(gw)} = ${numD(0.01 * gw, 6)}; the remaining 0.0001·x² = ${numD(0.0001 * p.x * p.x, 6)} is the curve bending away from its tangent. To lower L, w has to move against the sign of its gradient, so here it should go ${gw < 0 ? 'up' : 'down'}.`,
    });

    // Act 4 — used twice
    const bv = B.values, sV = bv[ID.s], RV = bv[ID.R], JV = bv[ID.J];
    const untilS = { ...bv };
    delete untilS[ID.R]; delete untilS[ID.J];
    s(4, {
        kind: 'record', graph: 'J', data: untilS, grad: {}, rows: B.rows.slice(0, 5), tapeActive: 4, row: B.rows[4], formulaRows: [4], activeNodes: [ID.s, ID.w],
        explanation: `Add a penalty for large weights, λw² with λ = ${LAMBDA} (weight decay, which a later page covers). Line 5: s = w² = ${pn(p.w)}² = ${num(sV)}, with ∂s/∂w = 2w = ${num(2 * p.w)}. w now feeds two records, m and s: two arrows leave it.`,
    });
    s(4, {
        kind: 'record', graph: 'J', data: bv, grad: {}, rows: B.rows, tapeActive: 6, row: B.rows[6], formulaRows: [5, 6], activeNodes: [ID.R, ID.J, ID['λ'], ID.s, ID.L],
        explanation: `Lines 6 and 7: R = λ × s = ${LAMBDA} × ${num(sV)} = ${num(RV)}, and the total J = L + R = ${num(L0)} + ${num(RV)} = ${num(JV)}. Seven records now, and the first four are exactly the ones from before: recording the penalty did not touch them.`,
    });
    const R = B.records;
    grad = { [ID.J]: 1, [ID.L]: R[0].total, [ID.R]: R[1].total };
    s(4, {
        kind: 'split', graph: 'J', data: bv, grad, rows: B.rows, tapeActive: 6, activeNodes: [ID.J, ID.L, ID.R], root: 'J',
        explanation: 'Replay from ∂J/∂J = 1. J = L + R hands 1 to both: ∂J/∂L = 1 and ∂J/∂R = 1.',
    });
    grad = { ...grad, [ID['λ']]: R[2].total, [ID.s]: R[3].total };
    s(4, {
        kind: 'scale', graph: 'J', data: bv, grad, rows: B.rows, tapeActive: 5, activeNodes: [ID.R, ID['λ'], ID.s], root: 'J',
        explanation: `R = λ × s, so ∂J/∂s = 1 × λ = ${num(R[3].total)} and ∂J/∂λ = 1 × s = ${num(R[2].total)}. λ is a constant, so that one goes unused.`,
    });
    const pen = R[4].total;
    grad = { ...grad, [ID.w]: pen };
    s(4, {
        kind: 'replay', graph: 'J', data: bv, rows: B.rows, root: 'J',
        ...replayStep(B, R[4], grad, undefined, {}),
        explanation: `s → w: ∂J/∂w = ∂J/∂s × ∂s/∂w = ${num(R[4].upstream)} × ${pn(R[4].local)} = ${num(pen)}, w's gradient from the penalty alone (with λ = ${LAMBDA}, exactly w). The record for m has not been replayed yet, so this is not the whole story.`,
    });
    for (const r of R.slice(5, 10)) grad = { ...grad, [r.to]: r.total };
    s(4, {
        kind: 'old', graph: 'J', data: bv, grad, rows: B.rows, tapeActive: 3, activeNodes: [ID.L, ID.e, ID.z, ID.y, ID.b, ID.m], root: 'J', e,
        explanation: `Records 4 back to 2 replay exactly as in act 2, because ∂J/∂L = 1 hands them the same starting gradient: ∂J/∂e = ${num(grad[ID.e])}, ∂J/∂z = ${num(grad[ID.z])}, ∂J/∂y = ${num(grad[ID.y])}, ∂J/∂b = ${num(grad[ID.b])} and ∂J/∂m = ${num(grad[ID.m])}.`,
    });
    const rw = R[10], data = rw.contribution, total = rw.total;
    grad = { ...grad, [ID.w]: total };
    const agree = bit(data) === bit(pen);
    s(4, {
        kind: 'replay', graph: 'J', data: bv, rows: B.rows, root: 'J',
        ...replayStep(B, rw, grad, pen, { promptKey: 'J', ask: asks.J }),
        explanation: `m → w, the second use: ∂J/∂w += ∂J/∂m × ∂m/∂w = ${pn(rw.upstream)} × ${pn(rw.local)} = ${num(data)}, added to the ${num(pen)} already there: ${num(pen)} + ${pn(data)} = ${num(total)}. ${agree
            ? 'Both uses push w the same way, so the sum is bigger than either.'
            : `The two uses pull w opposite ways and the ${Math.abs(data) > Math.abs(pen) ? 'data' : 'penalty'} pulls harder, so ∂J/∂w is ${sgn(total)}.`}`,
    });
    grad = { ...grad, [ID.x]: R[11].total };
    s(4, {
        kind: 'replay', graph: 'J', data: bv, rows: B.rows, root: 'J',
        ...replayStep(B, R[11], grad, undefined, {}),
        explanation: `m → x: ∂J/∂x = ${pn(R[11].upstream)} × ${pn(R[11].local)} = ${num(R[11].contribution)}. x is used once, so it gets one contribution. The tape is fully replayed.`,
    });
    const fd = slopeOf(p, 'w', true);
    s(4, {
        kind: 'check', graph: 'J', data: bv, grad: gB, rows: B.rows, tapeActive: -1, activeNodes: [ID.w], fd, pen, dataPath: data, total, root: 'J',
        explanation: `Check it a completely different way: rerun the plain arithmetic with w nudged by ±0.00001. The slope is ${fixed(fd, 6)}, which is the sum ${num(total)} (gap ${Math.abs(fd - total).toExponential(0)}). The data path alone, ${num(data)}, is off by ${num(Math.abs(pen))}${bit(data) !== bit(total) ? ' and has the wrong sign' : ''}; the penalty path alone, ${num(pen)}, is off by ${num(Math.abs(data))}. A value used twice gets the sum of what both uses send back.`,
    });

    // Act 5 — the rules
    s(5, {
        kind: 'rules', graph: 'J', data: bv, grad: gB, rows: B.rows, tapeActive: -1, root: 'J', e, x: p.x, w: p.w, total,
        explanation: 'That is a computational graph. Recording: every operation stores its output and its local derivatives as it runs. Replaying: newest record first, gradient in += gradient out × local derivative. A value used in several places collects the sum. PyTorch works the same way: a tensor\'s grad_fn is its record, loss.backward() is the replay, and .grad adds up, which is why a training loop zeroes it before every backward pass.',
    });
    return steps;
}

function predictFor(step, next) {
    if (!next || !next.ask || !next.rec) return null;
    const r = next.rec;
    const correct = r.total > 0 ? 0 : 1;
    if (next.promptKey === 'J') {
        return {
            question: `w already holds ∂J/∂w = ${num(r.before)} from the penalty. Next the replay reaches w through m, which adds ∂J/∂m × x. Will ∂J/∂w end up positive or negative?`,
            options: ['Positive', 'Negative'],
            correct,
            because: `${pn(r.upstream)} × ${pn(r.local)} = ${num(r.contribution)}, and ${num(r.before)} + ${pn(r.contribution)} = ${num(r.total)}. The two uses pull w opposite ways and the ${Math.abs(r.contribution) > Math.abs(r.before) ? 'data' : 'penalty'} pulls harder.`,
        };
    }
    const other = r.child === 'w' ? 'x' : 'w';
    return {
        question: `Next the replay reaches ${r.child} through m = w × x. Will ∂L/∂${r.child} be positive or negative?`,
        options: ['Positive', 'Negative'],
        correct,
        because: `∂L/∂m = ${num(r.upstream)}, times the local derivative ∂m/∂${r.child} = ${other} = ${num(r.local)}: ${pn(r.upstream)} × ${pn(r.local)} = ${num(r.contribution)}, ${sgn(r.total)}.${r.child === 'w' ? ` Raising w would ${r.total > 0 ? 'raise' : 'lower'} the loss.` : ''}`,
    };
}

/** The formula for the step on screen, with its live values. */
function formulaFor(step) {
    const d = (top, bottom) => String.raw`\frac{\partial ${tl(top)}}{\partial ${tl(bottom)}}`;
    const v = step.data;
    switch (step.kind) {
        case 'intro': {
            const { w, x, b, y } = step.p;
            return String.raw`L = (wx + b - y)^2 = \big(${tpn(w)}\cdot${tpn(x)} + ${tpn(b)} - ${tpn(y)}\big)^2`;
        }
        case 'record': {
            const name = (i) => tl(SHAPES.J.nodes[i].label);
            const lines = step.formulaRows.map(k => {
                const r = step.rows[k], op = SHAPES.J.nodes[r.id].op;
                const [a, b] = r.locals.map(l => l.child);
                const sym = { '×': String.raw`\times`, '+': '+', '−': '-' }[op];
                const lhs = op === 'square'
                    ? String.raw`${tl(r.label)} = ${name(a)}^2 = ${tpn(v[a])}^2`
                    : String.raw`${tl(r.label)} = ${name(a)} ${sym} ${name(b)} = ${tpn(v[a])} ${sym} ${tpn(v[b])}`;
                const locals = r.locals.map(l => {
                    const rule = l.rule.replace('−', '-').replace('λ', String.raw`\lambda`);
                    return `${d(r.label, SHAPES.J.nodes[l.child].label)} = ${rule === tnum(l.value) ? rule : `${rule} = ${tnum(l.value)}`}`;
                }).join(String.raw`,\quad `);
                return String.raw`${lhs} = ${tnum(r.value)}\\ ${locals}`;
            });
            return String.raw`\begin{gathered}${lines.join(String.raw`\\[4pt] `)}\end{gathered}`;
        }
        case 'seed': return String.raw`${d('L', 'L')} = 1`;
        case 'replay': {
            const r = step.rec;
            const lhs = d(step.root, r.child);
            const op = r.before === undefined ? '=' : String.raw`\mathrel{+}=`;
            const main = String.raw`${lhs} ${op} \underbrace{${d(step.root, r.parent)}}_{${tnum(r.upstream)}} \cdot \underbrace{${d(r.parent, r.child)}}_{${tnum(r.local)}} = ${tnum(r.contribution)}`;
            return r.before === undefined ? main : String.raw`\begin{gathered}${main}\\ ${lhs} = ${tnum(r.before)} + ${tpn(r.contribution)} = ${tnum(r.total)}\end{gathered}`;
        }
        case 'split': return String.raw`${d('J', 'L')} = ${d('J', 'R')} = 1 \cdot 1 = 1`;
        case 'scale': return String.raw`${d('J', 's')} = 1 \cdot \lambda = ${tnum(step.grad[ID.s])}, \quad ${d('J', 'λ')} = 1 \cdot s = ${tnum(step.grad[ID['λ']])}`;
        case 'old': return String.raw`${d('J', 'm')} = ${d('J', 'L')}\cdot${d('L', 'e')}\cdot${d('e', 'z')}\cdot${d('z', 'm')} = 1 \cdot ${tpn(2 * step.e)} \cdot 1 \cdot 1 = ${tnum(step.grad[ID.m])}`;
        case 'path': return String.raw`\begin{gathered}${d('L', 'w')} = \underbrace{${d('L', 'e')}}_{2e} \cdot \underbrace{${d('e', 'z')}}_{1} \cdot \underbrace{${d('z', 'm')}}_{1} \cdot \underbrace{${d('m', 'w')}}_{x} = 2(wx + b - y)\,x \\ = ${tpn(2 * step.e)}\cdot 1 \cdot 1 \cdot ${tpn(step.x)} = ${tnum(step.gw)}\end{gathered}`;
        case 'nudge': return String.raw`\begin{gathered}L(w + 0.01) - L(w) = ${tnum(step.L1, 6)} - ${tnum(step.L0, 6)} = ${tnum(step.L1 - step.L0, 6)} \\ \approx 0.01 \cdot ${d('L', 'w')} = 0.01 \cdot ${tpn(step.gw)} = ${tnum(0.01 * step.gw, 6)}\end{gathered}`;
        case 'check': return String.raw`\begin{gathered}\frac{J(w + h) - J(w - h)}{2h} = ${step.fd.toFixed(6)} \\ ${d('J', 'w')} = ${tnum(step.pen)} + ${tpn(step.dataPath)} = ${tnum(step.total)}\end{gathered}`;
        case 'rules': return String.raw`\begin{gathered}${d('J', 'w')} = \underbrace{2(wx + b - y)\,x}_{\text{through } m} + \underbrace{2\lambda w}_{\text{through } s} \\ = ${tpn(2 * step.e)}\cdot${tpn(step.x)} + 2\cdot${LAMBDA}\cdot${tpn(step.w)} = ${tnum(step.total)}\end{gathered}`;
        default: return '';
    }
}

/* ── the misconception, measured ───────────────────────────
   1,000 random settings of w, x, b and y between −2 and 2, with the penalty:
   the engine's summed gradient for w against a finite-difference slope, and
   the overwrite bug (keep only the path replayed last) against the same. */
const REUSE_STUDY = (() => {
    const rng = createRng(2026);
    const n = 1000, misses = [];
    let worst = 0, flips = 0;
    for (let i = 0; i < n; i++) {
        const p = { w: rng.next() * 4 - 2, x: rng.next() * 4 - 2, b: rng.next() * 4 - 2, y: rng.next() * 4 - 2 };
        const { root } = record(p, { penalty: true });
        root.backward();
        const fd = slopeOf(p, 'w', true);
        worst = Math.max(worst, Math.abs(root.topo()[ID.w].grad - fd));
        const last = replay(root, { accumulate: false })[ID.w];
        misses.push(Math.abs(last - fd) / Math.abs(fd));
        if (bit(last) !== bit(fd)) flips++;
    }
    misses.sort((a, b) => a - b);
    return { n, worst, medianMiss: misses[n / 2], flips };
})();

const quizQuestions = [
    {
        question: 'As the forward pass runs, what does each operation record for the backward pass?',
        options: [
            'Its output, its inputs and its local derivatives, as numbers',
            'The whole formula of the loss, to differentiate later',
            'Nothing: the backward pass reruns the forward pass',
            'Only the final value of the loss',
        ],
        correct: 0,
        explanation: 'A product records the other input, addition records 1, a square records 2u, all as numbers computed from values known at that moment. The backward pass only multiplies and adds what was stored.',
    },
    {
        question: 'Why is the tape replayed newest record first?',
        options: [
            'The newest record always has the largest gradient',
            'Reading a list backwards is faster',
            'A record may pass its gradient on only after every record that used its output has added to it, and those came later',
            'Gradients have to alternate in sign along the tape',
        ],
        correct: 2,
        explanation: 'Every use of a value was recorded after the value itself. Replaying in reverse order guarantees each record holds its complete gradient before handing it on. Replay oldest first and every record passes on 0.',
    },
    {
        question: 'w feeds two records. Replaying them sends w −1.1 and then 0.8. What is ∂J/∂w?',
        options: ['0.8, the last one to arrive', '−0.3', '−1.1, the first one to arrive', '−0.88, their product'],
        correct: 1,
        explanation: 'Nudging w changes J through both uses at once, and the two effects add: −1.1 + 0.8 = −0.3. That is why a backward pass adds into a gradient (+=) instead of assigning it.',
    },
];

const codeExample = `import torch

w = torch.tensor(1.1, requires_grad=True)
b = torch.tensor(0.6, requires_grad=True)
x, y = torch.tensor(0.5), torch.tensor(1.7)

L = (w * x + b - y) ** 2          # every operation leaves a record: grad_fn
names, f = [], L.grad_fn
while f is not None:               # walk the tape, newest record first
    names.append(type(f).__name__)
    f = f.next_functions[0][0] if f.next_functions else None
print(names)  # ['PowBackward0', 'SubBackward0', 'AddBackward0', 'MulBackward0', 'AccumulateGrad']

L.backward()                       # the replay
print(w.grad, b.grad)  # tensor(-0.5500) tensor(-1.1000)

w.grad = b.grad = None
J = (w * x + b - y) ** 2 + 0.5 * w ** 2   # now w is used twice
J.backward()
print(w.grad)  # tensor(0.5500)  -> -0.55 through m, plus 1.1 through the penalty

J = (w * x + b - y) ** 2 + 0.5 * w ** 2
J.backward()                       # .grad was not zeroed, so this adds to it
print(w.grad)  # tensor(1.1000)  -> why training loops call zero_grad()`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Step through the replay again and retry.'}
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

/* ── the tape ─────────────────────────────────────────────── */

function Tape({ rows, active = -1, local = -1, replaying = false }) {
    return (
        <div>
            <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-white">The tape</h3>
                <span className="text-[11px] text-slate-500">{replaying ? 'replayed bottom to top' : 'written top to bottom'}</span>
            </div>
            {rows.length === 0 ? (
                <p className="text-xs text-slate-500 border border-dashed border-slate-700 rounded-lg px-3 py-4 text-center">Empty: no line has run yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono tabular-nums">
                        <thead>
                            <tr className="text-slate-500 text-left">
                                <th className="font-normal py-1 pr-2">#</th><th className="font-normal pr-3">record</th>
                                <th className="font-normal pr-3">value</th><th className="font-normal">local derivatives</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, k) => (
                                <tr key={row.id} className={`border-t border-slate-800 align-top transition-colors ${k === active ? 'bg-orange-500/10 text-slate-100' : 'text-slate-400'}`}>
                                    <td className="py-1.5 pr-2 text-slate-500">{k + 1}</td>
                                    <td className="py-1.5 pr-3 whitespace-nowrap">{row.text}</td>
                                    <td className="py-1.5 pr-3">{num(row.value)}</td>
                                    <td className="py-1">
                                        <div className="flex flex-wrap gap-1">
                                            {row.locals.map((l, j) => (
                                                <span key={l.name} className={`px-1.5 py-0.5 rounded border whitespace-nowrap ${k === active && j === local ? 'border-orange-400 bg-orange-500/15 text-orange-200' : 'border-slate-700'}`}>
                                                    {l.name} = {l.rule === num(l.value) ? l.rule : `${l.rule} = ${num(l.value)}`}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const GRAPH_NOTE = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-2">
        <span>Top line: the value. <span className="text-sky-400">∂ blue</span> / <span className="text-orange-400">∂ orange</span>: a positive / negative gradient of the loss with respect to that box.</span>
        <span><span className="text-amber-400">Amber outline</span>: a parameter training would change.</span>
    </div>
);

/* ── explore ──────────────────────────────────────────────── */

const DEFAULT_VALUES = tourValues(DEFAULT_SEED);

function Lab() {
    const [p, setP] = useState(DEFAULT_VALUES);
    const [penalty, setPenalty] = useState(true);
    const [bug, setBug] = useState(null);           // null | 'overwrite' | 'order'

    const res = useMemo(() => {
        const r = run(p, { penalty });
        const grads = bug ? replay(record(p, { penalty }).root, bug === 'overwrite' ? { accumulate: false } : { newestFirst: false }) : r.grads;
        const checks = LEAVES.map(key => ({ key, replay: grads[ID[key]], numeric: slopeOf(p, key, penalty) }));
        return { ...r, grads, checks };
    }, [p, penalty, bug]);

    const root = penalty ? 'J' : 'L';
    const e = p.w * p.x + p.b - p.y, dataPath = 2 * e * p.x, pen = 2 * LAMBDA * p.w;
    const wrong = res.checks.filter(c => Math.abs(c.replay - c.numeric) > 1e-6).length;
    const formula = penalty
        ? String.raw`\begin{gathered}\frac{\partial J}{\partial w} = 2(wx + b - y)\,x + 2\lambda w \\ = ${tpn(2 * e)}\cdot${tpn(p.x)} + 2\cdot${LAMBDA}\cdot${tpn(p.w)} = ${tnum(dataPath)} + ${tpn(pen)} = ${tnum(dataPath + pen)}\end{gathered}`
        : String.raw`\frac{\partial L}{\partial w} = 2(wx + b - y)\,x = ${tpn(2 * e)}\cdot${tpn(p.x)} = ${tnum(dataPath)}`;

    const message = bug === 'overwrite'
        ? `Overwrite instead of add: every record now sets its inputs' gradients with = instead of +=. Only w is used twice, so only w goes wrong: it keeps the path replayed last, through m (${num(dataPath)}), and loses the penalty's ${num(pen)}. The finite difference disagrees by exactly that much.`
        : bug === 'order'
            ? `Replay oldest first: each record hands on its output's gradient before any later record has added to it, so it hands on 0. Only the last record, ${root}, has its gradient (1) in time, and only its inputs get anything. Every leaf ends at 0. The records are right; the order is wrong.`
            : null;

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 className="text-white font-semibold">{penalty ? 'J = (wx + b − y)² + λw²' : 'L = (wx + b − y)²'}, live</h2>
                    <SourceChip kind="live">Recorded and replayed in your browser</SourceChip>
                </div>
                <ComputeGraph nodes={GRAPH[root].nodes} edges={GRAPH[root].edges} data={res.values} grad={res.grads} params={PARAMS} minWidth={560}
                    ariaLabel={`Computation graph of ${root} with every value and gradient`} />
                {GRAPH_NOTE}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mt-4">
                    {[['w', 'w (weight)'], ['b', 'b (bias)'], ['x', 'x (input)'], ['y', 'y (target)']].map(([key, name]) => (
                        <ParamSlider key={key} label={name} value={p[key]} min={-2} max={2} step={0.1} accent="orange"
                            format={(v) => num(v)} onChange={(v) => setP(old => ({ ...old, [key]: Math.round(v * 10) / 10 }))} />
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <button onClick={() => { setPenalty(on => !on); if (penalty && bug === 'overwrite') setBug(null); }} aria-pressed={penalty}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${penalty ? 'border-orange-500 bg-orange-500/15 text-orange-200' : 'border-slate-700 text-slate-300 hover:border-orange-500'}`}>
                        Penalty λw² {penalty ? 'on' : 'off'}
                    </button>
                    <button onClick={() => setP(DEFAULT_VALUES)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500">Tour&apos;s numbers</button>
                    <span className="text-[11px] text-slate-500">λ = {LAMBDA}</span>
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => { setPenalty(true); setBug('overwrite'); }} disabled={bug === 'overwrite'}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500 disabled:opacity-40">Overwrite instead of add</button>
                    <button onClick={() => setBug('order')} disabled={bug === 'order'}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500 disabled:opacity-40">Replay oldest first</button>
                    <button onClick={() => setBug(null)} disabled={!bug}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500 disabled:opacity-40">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
                {message && <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{message}</p>}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono tabular-nums">
                        <thead>
                            <tr className="text-slate-500 text-left">
                                <th className="font-normal py-1 pr-3">gradient</th><th className="font-normal pr-3">replay</th>
                                <th className="font-normal pr-3">finite difference</th><th className="font-normal">gap</th>
                            </tr>
                        </thead>
                        <tbody>
                            {res.checks.map(c => {
                                const gap = Math.abs(c.replay - c.numeric);
                                return (
                                    <tr key={c.key} className="border-t border-slate-800 text-slate-200">
                                        <td className="py-1 pr-3">∂{root}/∂{c.key}</td>
                                        <td className="pr-3">{fixed(c.replay, 6)}</td>
                                        <td className="pr-3">{fixed(c.numeric, 6)}</td>
                                        <td className={gap > 1e-6 ? 'text-rose-300' : 'text-emerald-300'}>{gap > 1e-6 ? gap.toFixed(4) : gap.toExponential(0)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <p className="text-[11px] text-slate-500 mt-2">
                        {wrong === 0
                            ? 'Every gradient the replay produced matches a slope measured by rerunning the plain arithmetic with that number nudged by ±0.00001.'
                            : `${wrong} of ${LEAVES.length} gradients disagree with the measured slope.`}
                    </p>
                </div>
                <div className="text-slate-100 text-sm sm:text-base overflow-x-auto">
                    <Tex block>{formula}</Tex>
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                <Tape rows={res.rows} />
            </div>
        </div>
    );
}

/* ── page ─────────────────────────────────────────────────── */

const RULES = [
    ['a + b', '1 and 1', '+'],
    ['a − b', '1 and −1', '−'],
    ['a × b', 'b and a', '×'],
    ['u²', '2u', 'square'],
];

export default function ComputationalGraphsPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const stepHistory = useMemo(() => generateSteps(seed), [seed]);
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

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(Math.max(0, stepHistory.findIndex(s => s.act === act))); };
    const activeOp = step.row ? SHAPES.J.nodes[step.row.id].op : step.rec ? SHAPES.J.nodes[ID[step.rec.parent]].op : null;
    const replaying = ['seed', 'replay', 'split', 'scale', 'old'].includes(step.kind);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/neural-networks" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Neural Networks
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Computational Graphs</h1>
                    <p className="text-orange-100 max-w-3xl">
                        How autograd gets a gradient without ever writing a derivative down: each operation records its local derivatives as it runs, and the backward pass replays the records newest first, multiplying as it goes.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Forward Pass', '/neural-networks/forward-pass'], ['Derivative Rules', '/differential-calculus/derivative-rules']].map(([name, href]) => (
                            <Link key={href} href={href} className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">{name}</Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                            {[['guided', 'Guided tour', Compass], ['explore', 'Explore', SlidersHorizontal]].map(([key, label, Icon]) => (
                                <button key={key} role="tab" aria-selected={mode === key} onClick={() => { setMode(key); setIsPlaying(false); }}
                                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                    <Icon className="h-4 w-4" />{label}
                                </button>
                            ))}
                        </div>
                        {mode === 'guided' && <SourceChip kind="live">Every number computed in your browser by the autograd engine</SourceChip>}
                    </div>

                    {mode === 'explore' ? <Lab /> : (
                        <>
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
                                <div className="p-4 sm:p-6 space-y-4">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    <div>
                                        <ComputeGraph nodes={GRAPH[step.graph].nodes} edges={GRAPH[step.graph].edges} data={step.data} grad={step.grad}
                                            activeEdge={step.activeEdge} activeNodes={step.activeNodes} params={PARAMS} minWidth={560}
                                            ariaLabel={step.graph === 'J' ? 'Computation graph of J = (wx + b − y)² + λw²' : 'Computation graph of L = (wx + b − y)²'} />
                                        {GRAPH_NOTE}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
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
                                        <button onClick={() => { setSeed(randomSeed()); setIsPlaying(false); }} aria-label="New numbers" title="New numbers"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                                        <PredictToggle predict={predict} accent="orange" />
                                        <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                            Speed
                                            <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-orange-500" />
                                        </label>
                                    </div>
                                </div>
                            </div>

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
                                <div className="text-slate-100 text-sm sm:text-base overflow-x-auto">
                                    <Tex block>{formulaFor(step)}</Tex>
                                </div>
                                <div className="border-t border-slate-800 pt-4">
                                    <Tape rows={step.rows} active={step.tapeActive} local={step.tapeLocal ?? -1} replaying={replaying} />
                                </div>
                            </div>
                        </>
                    )}

                    <InCode title="The same tape in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-1">Every local rule this graph needs</h2>
                        <p className="text-xs text-slate-500 mb-3">Each record stores these numbers when its line runs.</p>
                        <table className="w-full text-xs">
                            <thead><tr className="text-slate-500"><th className="text-left font-medium pb-1">operation</th><th className="text-left font-medium">local derivatives</th></tr></thead>
                            <tbody>
                                {RULES.map(([name, locals, op]) => (
                                    <tr key={op} className={`border-t border-slate-800 ${mode === 'guided' && activeOp === op ? 'bg-slate-800/60 text-slate-100' : 'text-slate-400'}`}>
                                        <td className="py-1.5 pr-2 font-mono">{name}</td>
                                        <td className="font-mono">{locals}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                            <span className="text-orange-300 font-semibold">Replay:</span> newest record first, gradient in += gradient out × local derivative.
                        </p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;A value gets its gradient from the operation that uses it.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Only when one operation uses it. With the penalty, w feeds two records and its gradient is the sum of both. Over {REUSE_STUDY.n.toLocaleString('en-US')} random settings of w, x, b and y between −2 and 2, the summed gradient matched a measured slope every time (largest gap {REUSE_STUDY.worst.toExponential(0)}). Keeping only the path replayed last, as a backward pass that assigns instead of adding would, missed by a median of {Math.round(REUSE_STUDY.medianMiss * 100)}% and had the wrong sign {REUSE_STUDY.flips} times. Explore&apos;s &ldquo;Overwrite instead of add&rdquo; shows it.
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
