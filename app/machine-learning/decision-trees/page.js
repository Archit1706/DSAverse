"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2, Shuffle,
    Droplets, Scissors, GitFork, Layers, Footprints, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { makeDataset } from '@/lib/ml/datasets';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { AI_COLORS } from '@/components/ml/colors';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── data and the tree ─────────────────────────────────────
   Thirty training points from two interleaved moons, three hundred more
   for validation. A split asks "is feature f ≤ t?"; every t halfway
   between neighbouring values of f is tried, and the one with the lowest
   size-weighted Gini impurity wins. Then the same again in each half. */

const N_TRAIN = 30;
const N_VAL = 300;
const NOISE = 0.2;
const DEFAULT_SEED = 5;
const TOUR_DEPTH = 3;
const DEPTHS = [1, 2, 3, 4, 5, 6, 8];
const XOR_N = 40;
const XOR_NOISE = 0.25;
const STUDY_RUNS = 200;
const ASK_MARGIN = 0.02;
const ASK_PER_SIDE = 2;
const LEAN = 2;
const OPEN_NO = 2;
const PURE_DAMP = 0.3;
const FEATURES = ['x', 'y'];
const FEATURE_NAMES = { x: 'x₁', y: 'x₂' };
const FEATURE_TEX = { x: 'x_1', y: 'x_2' };
const CLASS_NAMES = ['Blue', 'Orange', 'Green'];
const RANGE = [-1.3, 1.3];

const ACTS = [
    { id: 1, label: 'Impurity', icon: Droplets },
    { id: 2, label: 'One split', icon: Scissors },
    { id: 3, label: 'Grow', icon: GitFork },
    { id: 4, label: 'Depth', icon: Layers },
    { id: 5, label: 'Greedy', icon: Footprints },
];

const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const tn = (v, d = 2) => f(v, d).replace('−', '-');
const pct = (v) => `${Math.round(v * 100)}%`;
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sum = (a) => a.reduce((s, v) => s + v, 0);

const toPoints = ({ X, y }) => X.map(([x, yy], i) => ({ x, y: yy, label: y[i] }));
function makeData(seed, kind = 'moons') {
    const n = kind === 'xor' ? XOR_N : N_TRAIN;
    const noise = kind === 'xor' ? XOR_NOISE : NOISE;
    return {
        kind,
        train: toPoints(makeDataset(kind, { n, noise, seed })),
        val: toPoints(makeDataset(kind, { n: N_VAL, noise, seed: seed + 7919 })),
    };
}
const classCount = (pts) => Math.max(...pts.map(p => p.label)) + 1;

/** Gini impurity: the chance two picks (with replacement) from the group disagree. */
const gini = (counts) => { const n = sum(counts); return n ? 1 - counts.reduce((s, c) => s + (c / n) ** 2, 0) : 0; };
const tally = (pts, idx, classes) => { const c = new Array(classes).fill(0); for (const i of idx) c[pts[i].label]++; return c; };
const majority = (counts) => counts.indexOf(Math.max(...counts));

/** Every threshold on one feature, left to right: halfway between neighbouring distinct values. */
function scanFeature(pts, idx, feat, classes, minLeaf = 1) {
    const order = [...idx].sort((a, b) => pts[a][feat] - pts[b][feat] || a - b);
    const total = tally(pts, idx, classes);
    const left = new Array(classes).fill(0);
    const n = order.length, out = [];
    for (let j = 0; j < n - 1; j++) {
        left[pts[order[j]].label]++;
        const v = pts[order[j]][feat], w = pts[order[j + 1]][feat];
        if (v === w) continue;
        const nl = j + 1, nr = n - nl;
        if (nl < minLeaf || nr < minLeaf) continue;
        const right = total.map((c, k) => c - left[k]);
        out.push({ f: feat, t: (v + w) / 2, left: [...left], right, weighted: (nl * gini(left) + nr * gini(right)) / n });
    }
    return out;
}
/** The candidate with the lowest weighted Gini; ties go to the earlier one (x₁ first, then smaller t). */
function bestSplit(pts, idx, classes, minLeaf = 1) {
    let best = null;
    for (const feat of FEATURES) for (const c of scanFeature(pts, idx, feat, classes, minLeaf)) if (!best || c.weighted < best.weighted - 1e-12) best = c;
    return best;
}

/** Grow greedily. Stops at a pure node, at maxDepth, or when no split leaves minLeaf on each side. */
function grow(pts, { maxDepth = Infinity, minLeaf = 1, classes = classCount(pts) } = {}) {
    let id = 0;
    const build = (idx, depth, box) => {
        const counts = tally(pts, idx, classes);
        const node = { id: id++, idx, counts, gini: gini(counts), label: majority(counts), depth, box };
        if (node.gini > 1e-12 && depth < maxDepth) {
            const s = bestSplit(pts, idx, classes, minLeaf);
            if (s) {
                node.split = s;
                const [x0, x1, y0, y1] = box;
                const cut = Math.min(Math.max(s.t, s.f === 'x' ? x0 : y0), s.f === 'x' ? x1 : y1);
                node.left = build(idx.filter(i => pts[i][s.f] <= s.t), depth + 1, s.f === 'x' ? [x0, cut, y0, y1] : [x0, x1, y0, cut]);
                node.right = build(idx.filter(i => pts[i][s.f] > s.t), depth + 1, s.f === 'x' ? [cut, x1, y0, y1] : [x0, x1, cut, y1]);
            }
        }
        return node;
    };
    const root = build(pts.map((_, i) => i), 0, [RANGE[0], RANGE[1], RANGE[0], RANGE[1]]);
    /* Breadth-first rank of every internal node: the order the tour grows them in. */
    const queue = [root];
    let rank = 0;
    while (queue.length) {
        const node = queue.shift();
        if (node.split) { node.bfs = rank++; queue.push(node.left, node.right); }
    }
    root.internal = rank;
    return root;
}
const route = (node, p) => { while (node.split) node = p[node.split.f] <= node.split.t ? node.left : node.right; return node; };
const accuracy = (root, pts) => pts.filter(p => route(root, p).label === p.label).length / pts.length;
const leaves = (node) => (node.split ? [...leaves(node.left), ...leaves(node.right)] : [node]);
const depthOf = (node) => (node.split ? 1 + Math.max(depthOf(node.left), depthOf(node.right)) : 0);
/** The tree as the tour shows it after `shown` breadth-first splits. */
function prune(node, shown) {
    if (!node.split || node.bfs >= shown) { const { split, left, right, ...leaf } = node; return leaf; }
    return { ...node, left: prune(node.left, shown), right: prune(node.right, shown) };
}

/* The best depth-2 tree by brute force: every root split, and under it the
   best single split (or none) on each side, all scored by training errors. */
function errorsOf(counts) { return sum(counts) - Math.max(...counts); }
function bestStump(pts, idx, classes) {
    let best = { errors: errorsOf(tally(pts, idx, classes)), split: null };
    for (const feat of FEATURES) for (const c of scanFeature(pts, idx, feat, classes)) {
        const e = errorsOf(c.left) + errorsOf(c.right);
        if (e < best.errors) best = { errors: e, split: c };
    }
    return best;
}
function bestDepth2(pts, classes = classCount(pts)) {
    const all = pts.map((_, i) => i);
    let best = null;
    for (const feat of FEATURES) for (const c of scanFeature(pts, all, feat, classes)) {
        const L = all.filter(i => pts[i][c.f] <= c.t), R = all.filter(i => pts[i][c.f] > c.t);
        const l = bestStump(pts, L, classes), r = bestStump(pts, R, classes);
        if (!best || l.errors + r.errors < best.errors) best = { errors: l.errors + r.errors, root: c, l, r };
    }
    /* Rebuild it as an ordinary tree so it draws and routes like the greedy one. */
    const make = (idx, depth, box, split, sub) => {
        const counts = tally(pts, idx, classes);
        const node = { idx, counts, gini: gini(counts), label: majority(counts), depth, box };
        if (split) {
            node.split = split;
            const [x0, x1, y0, y1] = box;
            const cut = Math.min(Math.max(split.t, split.f === 'x' ? x0 : y0), split.f === 'x' ? x1 : y1);
            const bl = split.f === 'x' ? [x0, cut, y0, y1] : [x0, x1, y0, cut], br = split.f === 'x' ? [cut, x1, y0, y1] : [x0, x1, cut, y1];
            node.left = make(idx.filter(i => pts[i][split.f] <= split.t), depth + 1, bl, sub?.[0]?.split, null);
            node.right = make(idx.filter(i => pts[i][split.f] > split.t), depth + 1, br, sub?.[1]?.split, null);
        }
        return node;
    };
    const root = make(all, 0, [RANGE[0], RANGE[1], RANGE[0], RANGE[1]], best.root, [best.l, best.r]);
    let rank = 0;
    const q = [root];
    while (q.length) { const node = q.shift(); if (node.split) { node.bfs = rank++; q.push(node.left, node.right); } }
    root.internal = rank;
    return root;
}

/** An XOR sample for the tour where greedy depth 2 visibly loses: the first of up to
    twelve seeded draws with a validation gap of ten points, else the widest gap. */
function xorExample(seed) {
    let pick = null;
    for (let t = 0; t < 12; t++) {
        const data = makeData(seed + 101 * t, 'xor');
        const greedy = grow(data.train, { maxDepth: 2 }), brute = bestDepth2(data.train);
        const ex = { data, greedy, brute, tries: t + 1, gap: accuracy(brute, data.val) - accuracy(greedy, data.val) };
        if (!pick || ex.gap > pick.gap) pick = ex;
        if (ex.gap >= 0.1) return ex;
    }
    return pick;
}

/** "Trees find the best tree": greedy depth 2 against the brute-force best depth 2 on XOR. */
function greedyStudy(runs = STUDY_RUNS, seed = 31) {
    const rng = createRng(seed);
    const greedy = [], brute = [];
    let worse = 0;
    for (let r = 0; r < runs; r++) {
        const data = makeData(rng.int(1, 1e9), 'xor');
        const g = accuracy(grow(data.train, { maxDepth: 2 }), data.val), b = accuracy(bestDepth2(data.train), data.val);
        greedy.push(g); brute.push(b);
        if (g < b - 0.05) worse++;
    }
    return { runs, greedy: mean(greedy), brute: mean(brute), worse };
}

/* Thresholds for the prompts: points in the root scan (x₁ then x₂) where the
   candidate beats the best so far, or fails to, by at least ASK_MARGIN.
   Equal numbers of each. Records cluster early in a scan, so asking in scan
   order would let "yes first, then no" score; the order of yes and no is
   drawn at random from the arrangements this scan can realise. */
const arrangements = (n) => {
    const out = [];
    const rec = (str, y, no) => {
        if (y === n && no === n) { out.push(str); return; }
        if (y < n) rec(str + 'Y', y + 1, no);
        if (no < n) rec(str + 'N', y, no + 1);
    };
    rec('', 0, 0);
    return out;
};
function pickScanPrompts(scan, seed) {
    const rng = createRng(seed * 7 + 3);
    const pool = { Y: [], N: [] };
    let best = Infinity;
    scan.forEach((c, j) => {
        if (j > 0) {
            if (c.weighted < best - ASK_MARGIN) pool.Y.push(j);
            else if (c.weighted > best + ASK_MARGIN) pool.N.push(j);
        }
        best = Math.min(best, c.weighted);
    });
    const n = Math.min(ASK_PER_SIDE, pool.Y.length, pool.N.length);
    /* Can `pattern` still be laid out after index `after`? Taking the earliest fit each time decides it. */
    const fits = (pattern, after) => {
        let a = after;
        for (const ch of pattern) { const j = pool[ch].find(v => v > a); if (j === undefined) return false; a = j; }
        return true;
    };
    /* Some scans cannot put a no before a yes, which forces "yes, yes, no, no";
       to keep "yes first" at a coin overall, arrangements that open with no
       are tried first more often (weighted shuffle). */
    const opensNo = (p) => [...p.slice(0, n)].filter(ch => ch === 'N').length;
    const order = arrangements(n).map(p => ({ p, key: rng.next() ** (1 / (1 + OPEN_NO * opensNo(p))) })).sort((a, b) => b.key - a.key).map(o => o.p);
    for (const pattern of order) {
        if (!fits(pattern, 0)) continue;
        const out = [];
        let after = 0;
        [...pattern].forEach((ch, k) => {
            /* Lean yes towards later candidates and no towards earlier ones, and yes
               away from candidates with a pure side, so neither where a candidate sits
               in the scan nor "one side is pure" says much about the answer. */
            const ok = pool[ch].filter(j => j > after && fits(pattern.slice(k + 1), j));
            const pureSide = (j) => gini(scan[j].left) < 1e-12 || gini(scan[j].right) < 1e-12;
            const weight = (j) => (ch === 'Y' ? j + 1 : scan.length - j) ** LEAN * ((ch === 'Y') === pureSide(j) ? PURE_DAMP : 1);
            let r = rng.next() * sum(ok.map(weight));
            after = ok.find(j => (r -= weight(j)) <= 0) ?? ok[ok.length - 1];
            out.push(after);
        });
        return out;
    }
    return [];
}

const generateSteps = (seed) => {
    const steps = [];
    const data = makeData(seed);
    const pts = data.train;
    const classes = classCount(pts);
    const tree = grow(pts, { maxDepth: TOUR_DEPTH });
    const s = (act, extra) => steps.push({ act, actName: ACTS[act - 1].label, data, shown: 0, ...extra });
    const rootCounts = tree.counts;
    const cnt = (c) => c.map((v, i) => `${v} ${CLASS_NAMES[i].toLowerCase()}`).join(', ');

    /* Act 1: impurity. */
    s(1, {
        view: 'tree', tree,
        explanation: `Thirty labelled points: ${cnt(rootCounts)}. A decision tree classifies by asking yes/no questions about one feature at a time. To pick a question it needs a score for how mixed a group is. Gini impurity is the chance that two points drawn at random (with replacement) disagree: 1 − Σ pₖ². Here 1 − (${f(rootCounts[0] / N_TRAIN)}² + ${f(rootCounts[1] / N_TRAIN)}²) = ${f(tree.gini, 2)}.`,
    });
    s(1, {
        view: 'impurity', groups: [[8, 0], [6, 2], [4, 4]],
        explanation: 'Gini is 0 for a pure group and largest when the classes are evenly mixed — 0.5 for two classes. A group of 6 and 2 sits in between at 1 − (0.75² + 0.25²) = 0.375. A good question leaves two groups that are each close to pure.',
    });

    /* Act 2: scan every threshold at the root. */
    const scan = [...scanFeature(pts, tree.idx, 'x', classes), ...scanFeature(pts, tree.idx, 'y', classes)];
    const nx = scan.filter(c => c.f === 'x').length;
    const asks = pickScanPrompts(scan, seed);
    s(2, {
        view: 'scan', scan, upto: -1,
        explanation: `A question has the form "is x₁ ≤ t?" (or x₂). Only thresholds halfway between neighbouring values matter — ${nx} on x₁, ${scan.length - nx} on x₂. Each is scored by the Gini of its two sides, weighted by how many points land on each side. The tree scans them all and keeps the lowest.`,
    });
    for (const j of asks) {
        const c = scan[j];
        const best = Math.min(...scan.slice(0, j).map(o => o.weighted));
        const bestJ = scan.findIndex(o => o.weighted === best);
        const nl = sum(c.left), nr = sum(c.right);
        s(2, {
            view: 'scan', scan, upto: j - 1, cand: j, bestJ, askBeat: true,
            explanation: `Candidate ${FEATURE_NAMES[c.f]} ≤ ${f(c.t)}: ${nl} points on the left (Gini ${f(gini(c.left), 3)}), ${nr} on the right (Gini ${f(gini(c.right), 3)}). The best so far scores ${f(best, 3)}.`,
        });
        const beats = c.weighted < best;
        s(2, {
            view: 'scan', scan, upto: j, cand: j, bestJ: beats ? j : bestJ, beats,
            explanation: `Weighted: (${nl}/${N_TRAIN})·${f(gini(c.left), 3)} + (${nr}/${N_TRAIN})·${f(gini(c.right), 3)} = ${f(c.weighted, 3)}. ${beats ? `Lower than ${f(best, 3)} — this becomes the best so far.` : `Not lower than ${f(best, 3)} — the best so far stays.`}`,
        });
    }
    const root = tree.split;
    const rootJ = scan.findIndex(c => c.f === root.f && c.t === root.t);
    s(2, {
        view: 'scan', scan, upto: scan.length - 1, cand: rootJ, bestJ: rootJ, final: true,
        explanation: `After all ${scan.length} candidates the winner is ${FEATURE_NAMES[root.f]} ≤ ${f(root.t)}, weighted Gini ${f(root.weighted, 3)}: impurity falls from ${f(tree.gini, 3)} by ${f(tree.gini - root.weighted, 3)}. That is the root question.`,
    });

    /* Act 3: grow breadth-first. */
    const order = [];
    (function walk(q) { while (q.length) { const node = q.shift(); if (node.split) { order.push(node); q.push(node.left, node.right); } } })([tree]);
    order.forEach((node, n) => {
        const sp = node.split;
        s(3, {
            view: 'tree', tree, shown: n + 1, active: node.id,
            explanation: n === 0
                ? `The root splits the 30 points on ${FEATURE_NAMES[sp.f]} ≤ ${f(sp.t)}. Each side is a smaller problem of exactly the same kind, so the tree runs the same scan inside each one.`
                : `Depth ${node.depth}, ${node.idx.length} points (${cnt(node.counts)}), Gini ${f(node.gini, 3)}: best question ${FEATURE_NAMES[sp.f]} ≤ ${f(sp.t)}, leaving ${f(sp.weighted, 3)} — a drop of ${f(node.gini - sp.weighted, 3)}.`,
        });
    });
    const tourLeaves = leaves(tree);
    const pureLeaves = tourLeaves.filter(l => l.gini < 1e-12).length;
    s(3, {
        view: 'tree', tree, shown: order.length, accs: { train: accuracy(tree, pts), val: accuracy(tree, data.val) },
        explanation: `Depth ${TOUR_DEPTH} reached: ${tourLeaves.length} leaves, ${pureLeaves} of them pure. Each leaf predicts its majority class, so the plane is tiled with boxes. Training accuracy ${pct(accuracy(tree, pts))}, validation ${pct(accuracy(tree, data.val))}.`,
    });

    /* Act 4: depth. */
    const full = grow(pts);
    const depthRows = DEPTHS.map(d => { const t = grow(pts, { maxDepth: d }); return { d, leaves: leaves(t).length, train: accuracy(t, pts), val: accuracy(t, data.val) }; });
    const fullRow = { d: depthOf(full), leaves: leaves(full).length, train: accuracy(full, pts), val: accuracy(full, data.val) };
    const stump = grow(pts, { maxDepth: 1 });
    s(4, {
        view: 'tree', tree: stump, shown: 1, accs: { train: accuracy(stump, pts), val: accuracy(stump, data.val) },
        explanation: `Depth 1 — a single question, two boxes: training ${pct(accuracy(stump, pts))}, validation ${pct(accuracy(stump, data.val))}. Too blunt for two curved moons.`,
    });
    s(4, {
        view: 'tree', tree: full, shown: full.internal, accs: { train: fullRow.train, val: fullRow.val }, deep: true,
        explanation: `No depth limit: the tree keeps splitting until every leaf is pure — depth ${fullRow.d}, ${fullRow.leaves} leaves for ${N_TRAIN} points. Training accuracy ${pct(fullRow.train)}; validation ${pct(fullRow.val)}. The thin boxes around single points are noise, memorised.`,
    });
    const bestRow = depthRows.reduce((a, r) => (r.val > a.val ? r : a), depthRows[0]);
    s(4, {
        view: 'depth', depthRows, fullRow, bestD: bestRow.d, tree: grow(pts, { maxDepth: bestRow.d }), shown: Infinity,
        explanation: `Training accuracy climbs to ${pct(fullRow.train)} as the depth limit rises; validation peaks at depth ${bestRow.d} (${pct(bestRow.val)}). Depth is the dial here, like the polynomial degree and k on the previous pages — set on validation data.`,
    });

    /* Act 5: greedy is short-sighted. */
    const ex = xorExample(seed);
    const xd = ex.data, xg = ex.greedy, xb = ex.brute;
    const allX = xd.train.map((_, i) => i);
    const xs = [...scanFeature(xd.train, allX, 'x', 2), ...scanFeature(xd.train, allX, 'y', 2)];
    const xRoot = xg.split;
    const centre = xs.filter(c => c.f === 'x').reduce((a, c) => (Math.abs(c.t) < Math.abs(a.t) ? c : a));
    const start = gini(tally(xd.train, allX, 2));
    const gAcc = { train: accuracy(xg, xd.train), val: accuracy(xg, xd.val) }, bAcc = { train: accuracy(xb, xd.train), val: accuracy(xb, xd.val) };
    s(5, {
        view: 'scan', xor: true, data: xd, scan: xs, upto: xs.length - 1, cand: xs.indexOf(centre), bestJ: xs.findIndex(c => c.f === xRoot.f && c.t === xRoot.t),
        explanation: `A new set: XOR, where a point is orange when x₁ and x₂ have opposite signs. The natural first question is x₁ ≤ ${f(centre.t)} (yellow) — yet scored on its own it leaves Gini ${f(centre.weighted, 3)}, against ${f(start, 3)} before: both halves are still mixed (${centre.left.join(' and ')} on the left, ${centre.right.join(' and ')} on the right), and its value only appears one question later. The scan takes the lowest score, ${FEATURE_NAMES[xRoot.f]} ≤ ${f(xRoot.t)} (dashed, ${f(xRoot.weighted, 3)}).`,
    });
    s(5, {
        view: 'tree', xor: true, data: xd, tree: xg, shown: xg.internal, accs: gAcc,
        explanation: `The greedy depth-2 tree: ${pct(gAcc.train)} on its training points, ${pct(gAcc.val)} on new ones. Each question was the best available at that moment; nothing in the score could see what the next question would make possible.`,
    });
    s(5, {
        view: 'tree', xor: true, data: xd, tree: xb, shown: xb.internal, accs: bAcc, brute: true,
        explanation: `Now try every depth-2 tree outright: every root question, and the best follow-up on each side. The winner asks ${FEATURE_NAMES[xb.split.f]} ≤ ${f(xb.split.t)} first — ${pct(bAcc.train)} on training, ${pct(bAcc.val)} on new points, ${Math.round((bAcc.val - gAcc.val) * 100)} points better. ${ex.tries > 1 ? `Not every XOR sample goes this badly (this is draw ${ex.tries}); the misconception box counts how often over ${STUDY_RUNS}.` : `The misconception box counts how often this happens over ${STUDY_RUNS} samples.`}`,
    });
    s(5, {
        view: 'tree', tree, shown: tree.internal, done: true,
        explanation: 'Switch to Explore: change the data, the depth limit and the smallest leaf, click to add points, and try greedy on XOR yourself.',
    });
    return steps;
};

/* ── predict ─────────────────────────────────────────────
   During the root scan: will this candidate beat the best so far? The
   side sizes and Gini values are on screen; only the weighted sum is
   hidden. Asked only when the answer clears ASK_MARGIN, equal numbers
   of yes and no per tour. */
const predictFor = (step, next) => {
    if (!step.askBeat || !next || next.beats === undefined) return null;
    const c = step.scan[step.cand];
    return {
        question: `Does ${FEATURE_NAMES[c.f]} ≤ ${f(c.t)} beat the best so far (${f(step.scan[step.bestJ].weighted, 3)})?`,
        options: ['Yes, lower', 'No'],
        correct: next.beats ? 0 : 1,
        because: `Weighted Gini ${f(c.weighted, 3)} against ${f(step.scan[step.bestJ].weighted, 3)}.`,
    };
};

function formulaFor(step) {
    if (step.view === 'impurity') return String.raw`G = 1 - \sum_k p_k^2: \quad G(8, 0) = 0, \quad G(6, 2) = 1 - (0.75^2 + 0.25^2) = 0.375, \quad G(4, 4) = 0.5`;
    if (step.view === 'scan' && step.cand !== undefined) {
        const c = step.scan[step.cand];
        const n = sum(c.left) + sum(c.right), nl = sum(c.left), nr = sum(c.right);
        const g = (cs) => { const m = sum(cs); return String.raw`1 - \left(${cs.map(v => String.raw`\left(\tfrac{${v}}{${m}}\right)^2`).join(' + ')}\right)`; };
        if (step.askBeat) return String.raw`G_L = ${g(c.left)} = ${tn(gini(c.left), 3)}, \quad G_R = ${g(c.right)} = ${tn(gini(c.right), 3)}`;
        return String.raw`G_{\text{split}} = \tfrac{${nl}}{${n}} \cdot ${tn(gini(c.left), 3)} + \tfrac{${nr}}{${n}} \cdot ${tn(gini(c.right), 3)} = ${tn(c.weighted, 3)} \quad (${FEATURE_TEX[c.f]} \le ${tn(c.t)})`;
    }
    if (step.view === 'scan') return String.raw`G_{\text{split}}(t) = \tfrac{n_L}{n}\,G_L + \tfrac{n_R}{n}\,G_R, \quad \text{for every } t \text{ on } x_1 \text{ and } x_2`;
    if (step.view === 'depth') return String.raw`\text{best depth} = ${step.bestD}: \quad \text{acc}_{\text{val}} = ${tn(step.depthRows.find(r => r.d === step.bestD).val * 100, 1)}\%, \quad \text{no limit: } ${tn(step.fullRow.val * 100, 1)}\%`;
    if (step.accs) return String.raw`\text{acc}_{\text{train}} = ${tn(step.accs.train * 100, 1)}\%, \quad \text{acc}_{\text{val}} = ${tn(step.accs.val * 100, 1)}\%`;
    if (step.active !== undefined) {
        const node = (function find(n) { if (!n) return null; if (n.id === step.active) return n; return find(n.left) || find(n.right); })(step.tree);
        return String.raw`\Delta G = G_{\text{node}} - G_{\text{split}} = ${tn(node.gini, 3)} - ${tn(node.split.weighted, 3)} = ${tn(node.gini - node.split.weighted, 3)}`;
    }
    const c = step.tree.counts, n = sum(c);
    return String.raw`G = 1 - \left(${c.map(v => String.raw`\left(\tfrac{${v}}{${n}}\right)^2`).join(' + ')}\right) = ${tn(step.tree.gini, 3)}`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'A leaf holds 6 blue and 2 orange points. What is its Gini impurity?',
        options: ['0.375', '0.25', '0.5', '0.625'],
        correct: 0,
        explanation: 'p = 6/8 = 0.75 and 2/8 = 0.25, so G = 1 − (0.75² + 0.25²) = 1 − 0.625 = 0.375.',
    },
    {
        question: 'With no depth limit, why does a tree reach 100% training accuracy (when no two identical points disagree)?',
        options: [
            'Because Gini impurity is always 0',
            'It keeps splitting until every leaf is pure, so each training point lands in a box of its own class',
            'Because the root split is always perfect',
            'Because it averages many trees',
        ],
        correct: 1,
        explanation: 'Splitting continues while any leaf is mixed. In the end every training point sits in a pure box — memorised, noise included, which is why depth is limited and chosen on validation data.',
    },
    {
        question: 'On XOR data, the first split x₁ ≤ 0 barely lowers the Gini impurity, yet it is the right first question. What does that show?',
        options: [
            'Gini is the wrong measure for two classes',
            'Greedy growth scores each split on its own and cannot see that a dull split makes the next one perfect',
            'XOR cannot be learned by any tree',
            'The threshold should be the median',
        ],
        correct: 1,
        explanation: 'Each split is chosen for the impurity drop it gives right now. x₁ ≤ 0 leaves two 50/50 halves, so it scores nothing until x₂ ≤ 0 follows. A depth-2 tree found by brute force gets it; greedy growth often does not.',
    },
];

const codeExample = `import numpy as np
from sklearn.datasets import make_moons
from sklearn.tree import DecisionTreeClassifier, export_text

X, y = make_moons(30, noise=0.3, random_state=5)        # [30, 2]
for depth in [1, 3, None]:                               # None = grow until pure
    tree = DecisionTreeClassifier(max_depth=depth, random_state=0).fit(X, y)
    print(depth, tree.get_n_leaves(), tree.score(X, y))
# 1 2 0.8
# 3 5 0.9
# None 7 1.0       every training point in a pure leaf

print(export_text(DecisionTreeClassifier(max_depth=1).fit(X, y), feature_names=["x1", "x2"]))
# |--- x2 <= 0.44
# |   |--- class: 1
# |--- x2 >  0.44
# |   |--- class: 0

for depth in [1, 2, 3, None]:                            # validation, mean of 50 datasets
    accs = []
    for s in range(50):
        X, y = make_moons(30, noise=0.3, random_state=s)
        Xv, yv = make_moons(300, noise=0.3, random_state=s + 1000)
        accs.append(DecisionTreeClassifier(max_depth=depth, random_state=0).fit(X, y).score(Xv, yv))
    print(depth, round(np.mean(accs), 3))
# 1 0.769   2 0.839   3 0.833   None 0.813`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the scan and greedy acts, then retry.'}
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

const BOX = 360;
const r2 = (v) => Math.round(v * 100) / 100;
const sx = (x) => r2(((x - RANGE[0]) / (RANGE[1] - RANGE[0])) * BOX);
const sy = (y) => r2(((RANGE[1] - y) / (RANGE[1] - RANGE[0])) * BOX);

/* The plane tiled by the tree's leaves (coloured by majority, stronger when
   purer), the split lines, the points, and an optional candidate line. */
function TreeField({ pts, tree, cand, best, onClick, activeId }) {
    const tiles = tree ? leaves(tree) : [];
    const lines = [];
    (function walk(node) {
        if (!node || !node.split) return;
        const [x0, x1, y0, y1] = node.box;
        const t = Math.min(Math.max(node.split.t, node.split.f === 'x' ? x0 : y0), node.split.f === 'x' ? x1 : y1);
        lines.push({ key: `${node.id ?? lines.length}-${node.depth}`, active: node.id === activeId, ...(node.split.f === 'x' ? { x1: sx(t), x2: sx(t), y1: sy(y1), y2: sy(y0) } : { x1: sx(x0), x2: sx(x1), y1: sy(t), y2: sy(t) }) });
        walk(node.left); walk(node.right);
    })(tree);
    const handle = (e) => {
        if (!onClick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = RANGE[0] + ((e.clientX - rect.left) / rect.width) * (RANGE[1] - RANGE[0]);
        const y = RANGE[1] - ((e.clientY - rect.top) / rect.height) * (RANGE[1] - RANGE[0]);
        onClick(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
    };
    const candLine = (c, key, dashed) => c && (c.f === 'x'
        ? <line key={key} x1={sx(c.t)} x2={sx(c.t)} y1="0" y2={BOX} stroke={dashed ? '#94a3b8' : '#facc15'} strokeWidth="2" strokeDasharray={dashed ? '5 4' : undefined} />
        : <line key={key} y1={sy(c.t)} y2={sy(c.t)} x1="0" x2={BOX} stroke={dashed ? '#94a3b8' : '#facc15'} strokeWidth="2" strokeDasharray={dashed ? '5 4' : undefined} />);
    return (
        <svg viewBox={`0 0 ${BOX} ${BOX}`} className="w-full rounded-lg border border-slate-700 bg-slate-950" role="img"
            aria-label="Training points and the tree's boxes" onClick={handle} style={onClick ? { cursor: 'crosshair' } : undefined}>
            {tiles.map((leaf, i) => {
                const [x0, x1, y0, y1] = leaf.box;
                const purity = sum(leaf.counts) ? Math.max(...leaf.counts) / sum(leaf.counts) : 0;
                return <rect key={i} x={sx(x0)} y={sy(y1)} width={r2(sx(x1) - sx(x0))} height={r2(sy(y0) - sy(y1))}
                    fill={AI_COLORS.classes[leaf.label]} opacity={r2(0.08 + 0.3 * Math.max(0, (purity - 0.5) * 2))} />;
            })}
            <line x1={sx(0)} x2={sx(0)} y1="0" y2={BOX} stroke="#1e293b" />
            <line y1={sy(0)} y2={sy(0)} x1="0" x2={BOX} stroke="#1e293b" />
            {lines.map(l => <line key={l.key} x1={l.x1} x2={l.x2} y1={l.y1} y2={l.y2} stroke={l.active ? '#facc15' : '#e2e8f0'} strokeWidth={l.active ? 2.5 : 1.5} opacity="0.85" />)}
            {candLine(best, 'best', true)}
            {candLine(cand, 'cand', false)}
            {pts.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="5" fill={AI_COLORS.classes[p.label]} stroke="#0f172a" strokeWidth="1.2" />)}
        </svg>
    );
}

/* The tree itself: leaves spread evenly, parents centred over children.
   Nodes below `maxDepth` collapse into a "+n" stub. */
function TreeDiagram({ tree, activeId, maxDepth = 3 }) {
    const NW = 92, NH = 42, VG = 70;
    const placed = [];
    const edges = [];
    let col = 0;
    const countInternal = (n) => (n.split ? 1 + countInternal(n.left) + countInternal(n.right) : 0);
    (function place(node, parent) {
        const collapsed = node.split && node.depth >= maxDepth;
        let x;
        if (!node.split || collapsed) x = col++ * NW + NW / 2;
        else { const a = place(node.left, node), b = place(node.right, node); x = (a + b) / 2; }
        placed.push({ node, x, y: node.depth * VG + 8, collapsed, hidden: collapsed ? countInternal(node) : 0 });
        return x;
    })(tree, null);
    const byNode = new Map(placed.map(p => [p.node, p]));
    for (const p of placed) if (p.node.split && !p.collapsed) for (const child of [p.node.left, p.node.right]) edges.push([p, byNode.get(child), child === p.node.left]);
    const W = Math.max(col * NW, NW), H = Math.max(...placed.map(p => p.y)) + NH + 8;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W * 1.1 }} className="mx-auto block" role="img" aria-label="The decision tree">
            {edges.map(([a, b, isLeft], i) => (
                <g key={i}>
                    <line x1={r2(a.x)} y1={a.y + NH} x2={r2(b.x)} y2={b.y} stroke="#475569" strokeWidth="1.5" />
                    <text x={r2((a.x + b.x) / 2 + (isLeft ? -6 : 6))} y={r2((a.y + NH + b.y) / 2)} fontSize="10" textAnchor={isLeft ? 'end' : 'start'} fill="#94a3b8">{isLeft ? 'yes' : 'no'}</text>
                </g>
            ))}
            {placed.map(({ node, x, y, collapsed, hidden }, i) => {
                const active = node.id !== undefined && node.id === activeId;
                const leaf = !node.split;
                return (
                    <g key={i} transform={`translate(${r2(x - NW / 2 + 4)},${y})`}>
                        <rect width={NW - 8} height={NH} rx="6" fill={leaf ? AI_COLORS.classes[node.label] : '#1e293b'} fillOpacity={leaf ? 0.22 : 1}
                            stroke={active ? '#facc15' : leaf ? AI_COLORS.classes[node.label] : '#475569'} strokeWidth={active ? 2.5 : 1.2} />
                        <text x={(NW - 8) / 2} y="17" fontSize="11.5" fontWeight="600" textAnchor="middle" fill="#f1f5f9">
                            {collapsed ? `+${hidden} more split${hidden === 1 ? '' : 's'}` : leaf ? CLASS_NAMES[node.label] : `${FEATURE_NAMES[node.split.f]} ≤ ${f(node.split.t)}`}
                        </text>
                        <text x={(NW - 8) / 2} y="33" fontSize="10" textAnchor="middle" fill="#94a3b8">{node.counts.join(' · ')} · G {f(node.gini, 2)}</text>
                    </g>
                );
            })}
        </svg>
    );
}

/* Weighted Gini against threshold for the root scan, x₁ then x₂. */
function ScanChart({ scan, upto, cand, bestJ }) {
    const W = 420, H = 170, L = 38, B = 28, T = 10;
    const nx = scan.filter(c => c.f === 'x').length;
    const hi = Math.max(0.55, ...scan.map(c => c.weighted));
    const px = (j) => r2(L + (j / Math.max(1, scan.length - 1)) * (W - L - 10));
    const py = (g) => r2(T + (1 - g / hi) * (H - T - B));
    const seg = (from, to) => scan.slice(from, to + 1).map((c, i) => `${i ? 'L' : 'M'}${px(from + i)},${py(c.weighted)}`).join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Weighted Gini for every threshold">
            {[0, 0.25, 0.5].map(g => <g key={g}><line x1={L} x2={W - 10} y1={py(g)} y2={py(g)} stroke="#1e293b" /><text x={L - 6} y={py(g) + 4} fontSize="10" textAnchor="end" fill="#64748b">{g}</text></g>)}
            <line x1={r2((px(nx - 1) + px(nx)) / 2)} x2={r2((px(nx - 1) + px(nx)) / 2)} y1={T} y2={H - B} stroke="#334155" strokeDasharray="3 3" />
            <text x={r2((L + px(nx - 1)) / 2)} y={H - 10} fontSize="10.5" textAnchor="middle" fill="#94a3b8">thresholds on x₁ →</text>
            <text x={r2((px(nx) + W - 10) / 2)} y={H - 10} fontSize="10.5" textAnchor="middle" fill="#94a3b8">thresholds on x₂ →</text>
            {upto >= 0 && <path d={seg(0, Math.min(upto, nx - 1))} fill="none" stroke={AI_COLORS.classes[0]} strokeWidth="2" />}
            {upto >= nx && <path d={seg(nx, upto)} fill="none" stroke={AI_COLORS.classes[2]} strokeWidth="2" />}
            {bestJ !== undefined && bestJ <= Math.max(upto, cand ?? -1) && <circle cx={px(bestJ)} cy={py(scan[bestJ].weighted)} r="6" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 2" />}
            {cand !== undefined && <line x1={px(cand)} x2={px(cand)} y1={T} y2={H - B} stroke="#facc15" strokeWidth="1.5" opacity="0.8" />}
            {cand !== undefined && cand <= upto && <circle cx={px(cand)} cy={py(scan[cand].weighted)} r="4.5" fill="#facc15" />}
        </svg>
    );
}

function DepthChart({ rows, full, best }) {
    const W = 420, H = 180, L = 40, B = 26, T = 10;
    const xs = [...rows.map(r => r.d), 'no limit'];
    const px = (i) => r2(L + (i / (xs.length - 1)) * (W - L - 30));
    const py = (a) => r2(T + (1 - (a - 0.5) / 0.5) * (H - T - B));
    const all = [...rows, full];
    const line = (key) => all.map((r, i) => `${i ? 'L' : 'M'}${px(i)},${py(r[key])}`).join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Accuracy against the depth limit">
            {[0.5, 0.75, 1].map(a => <g key={a}><line x1={L} x2={W - 30} y1={py(a)} y2={py(a)} stroke="#1e293b" /><text x={L - 6} y={py(a) + 4} fontSize="10" textAnchor="end" fill="#64748b">{a * 100}%</text></g>)}
            {xs.map((d, i) => <text key={d} x={px(i)} y={H - 8} fontSize="10" textAnchor="middle" fill={d === best ? '#e2e8f0' : '#64748b'}>{d}</text>)}
            <path d={line('train')} fill="none" stroke={AI_COLORS.classes[0]} strokeWidth="2.5" />
            <path d={line('val')} fill="none" stroke={AI_COLORS.classes[1]} strokeWidth="2.5" />
            {(() => { const i = rows.findIndex(r => r.d === best); return <circle cx={px(i)} cy={py(rows[i].val)} r="7" fill="none" stroke="#facc15" strokeWidth="2" />; })()}
            <text x={W - 14} y={T + 10} fontSize="10" textAnchor="end" fill={AI_COLORS.classes[0]}>training</text>
            <text x={W - 14} y={T + 24} fontSize="10" textAnchor="end" fill={AI_COLORS.classes[1]}>validation</text>
            <text x="4" y={H - 8} fontSize="10" fill="#94a3b8">depth</text>
        </svg>
    );
}

function ImpurityGroups({ groups }) {
    return (
        <div className="grid grid-cols-3 gap-3">
            {groups.map((g, gi) => (
                <div key={gi} className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-3 text-center">
                    <svg viewBox="0 0 100 50" width="100%" aria-hidden="true">
                        {g.flatMap((c, k) => Array.from({ length: c }, () => k)).map((k, i) => (
                            <circle key={i} cx={14 + (i % 4) * 24} cy={14 + Math.floor(i / 4) * 22} r="8" fill={AI_COLORS.classes[k]} />
                        ))}
                    </svg>
                    <div className="text-xs text-slate-400 mt-1">{g.join(' and ')}</div>
                    <div className="font-mono text-sm text-slate-100">G = {f(gini(g), 3)}</div>
                </div>
            ))}
        </div>
    );
}

function CountsRow({ label, counts }) {
    return (
        <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{label}</span>
            <span className="font-mono">
                {counts.map((c, i) => <span key={i} className="ml-2" style={{ color: AI_COLORS.classes[i] }}>{c} {CLASS_NAMES[i].toLowerCase()}</span>)}
                <span className="ml-2 text-slate-300">G {f(gini(counts), 3)}</span>
            </span>
        </div>
    );
}

/* ── explore ────────────────────────────────────────────── */

const KINDS = [['moons', 'Moons'], ['xor', 'XOR'], ['circles', 'Circles'], ['blobs', 'Three blobs']];
const NO_LIMIT = 12;

function Explore({ initialSeed }) {
    const [seed, setSeed] = useState(initialSeed);
    const [kind, setKind] = useState('moons');
    const [maxDepth, setMaxDepth] = useState(TOUR_DEPTH);
    const [minLeaf, setMinLeaf] = useState(1);
    const [clickMode, setClickMode] = useState('0');
    const [added, setAdded] = useState([]);
    const data = useMemo(() => makeData(seed, kind), [seed, kind]);
    const pts = useMemo(() => [...data.train, ...added], [data, added]);
    const classes = classCount(pts);
    const tree = useMemo(() => grow(pts, { maxDepth: maxDepth >= NO_LIMIT ? Infinity : maxDepth, minLeaf, classes }), [pts, maxDepth, minLeaf, classes]);
    const trainAcc = accuracy(tree, pts), valAcc = accuracy(tree, data.val);
    const nLeaves = leaves(tree).length;
    const brute = useMemo(() => (kind === 'xor' && maxDepth === 2 && minLeaf === 1 ? bestDepth2(pts, classes) : null), [kind, maxDepth, minLeaf, pts, classes]);
    const repair = () => { setKind('moons'); setMaxDepth(TOUR_DEPTH); setMinLeaf(1); setAdded([]); };
    const onClick = (x, y) => setAdded(a => [...a, { x, y, label: Number(clickMode) }]);

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="min-w-0">
                        <TreeField pts={pts} tree={tree} onClick={onClick} />
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                            <span className="text-slate-500 mr-1">Click adds:</span>
                            {Array.from({ length: classes }, (_, c) => (
                                <button key={c} onClick={() => setClickMode(String(c))}
                                    className={`px-2.5 py-1 rounded-full border ${clickMode === String(c) ? 'border-lime-500 text-lime-200 bg-lime-500/10' : 'border-slate-700 text-slate-400'}`}>{CLASS_NAMES[c].toLowerCase()}</button>
                            ))}
                        </div>
                    </div>
                    <div className="min-w-0 space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {[['leaves', nLeaves], ['training', pct(trainAcc)], ['validation', pct(valAcc)]].map(([label, val]) => (
                                <div key={label} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
                                    <div className="font-mono text-sm text-slate-100">{val}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5"><ShapeTag label="X" names={['n', 'features']} shape={[pts.length, 2]} /></div>
                        <div className="text-slate-100 text-sm overflow-x-auto">
                            <Tex block>{tree.split
                                ? String.raw`\text{root: } ${FEATURE_TEX[tree.split.f]} \le ${tn(tree.split.t)}, \quad G: ${tn(tree.gini, 3)} \to ${tn(tree.split.weighted, 3)}`
                                : String.raw`\text{no split: } G = ${tn(tree.gini, 3)}`}</Tex>
                        </div>
                        {brute && (
                            <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                                Greedy depth 2 on XOR: {pct(valAcc)} on new points. The best depth-2 tree, found by trying every root question, asks {FEATURE_NAMES[brute.split.f]} ≤ {f(brute.split.t)} first and scores {pct(accuracy(brute, data.val))}.
                            </p>
                        )}
                        {maxDepth >= NO_LIMIT && minLeaf === 1 && (
                            <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                                Grown until pure: {nLeaves} leaves for {pts.length} points, training {pct(trainAcc)}, validation {pct(valAcc)}. Raise the smallest leaf or cap the depth to stop it memorising.
                            </p>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto"><div className="min-w-[420px]"><TreeDiagram tree={tree} maxDepth={4} /></div></div>
            </div>
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap gap-1.5">
                    {KINDS.map(([key, label]) => (
                        <button key={key} onClick={() => { setKind(key); setAdded([]); setClickMode('0'); }}
                            className={`text-xs px-3 py-1.5 rounded-lg border ${kind === key ? 'border-lime-500 text-lime-200 bg-lime-500/10' : 'border-slate-700 text-slate-300 hover:border-lime-500'}`}>{label}</button>
                    ))}
                    <button onClick={() => { setSeed(randomSeed()); setAdded([]); }} aria-label="New data" title="New data" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                </div>
                <ParamSlider label="Depth limit" value={maxDepth} onChange={setMaxDepth} min={1} max={NO_LIMIT} step={1} accent="lime"
                    format={(v) => (v >= NO_LIMIT ? 'none' : String(v))} hint={`Tree depth ${depthOf(tree)}.`} />
                <ParamSlider label="Smallest leaf" value={minLeaf} onChange={setMinLeaf} min={1} max={10} step={1} accent="lime" hint="A split must leave at least this many points on each side." />
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => { setMaxDepth(NO_LIMIT); setMinLeaf(1); }} disabled={maxDepth >= NO_LIMIT && minLeaf === 1} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">Grow until every leaf is pure</button>
                    <button onClick={() => { setKind('xor'); setMaxDepth(2); setMinLeaf(1); setAdded([]); }} disabled={kind === 'xor' && maxDepth === 2 && minLeaf === 1} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">Greedy on XOR, depth 2</button>
                    <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function DecisionTreesPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const stepHistory = useMemo(() => generateSteps(seed), [seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1800);
    const [explore, setExplore] = useState({ seed, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [study, setStudy] = useState(null);
    /* The misconception study grows 400 trees; run it after the first paint. */
    useEffect(() => { const t = setTimeout(() => setStudy(greedyStudy()), 60); return () => clearTimeout(t); }, []);

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
    const toExplore = () => { setExplore(e => ({ seed, key: e.key + 1 })); setMode('explore'); setIsPlaying(false); };
    const pts = step.data.train;
    const shownTree = step.tree ? prune(step.tree, step.shown) : null;
    const cand = step.cand !== undefined ? step.scan[step.cand] : null;
    const best = step.bestJ !== undefined && step.view === 'scan' && !step.final ? step.scan[step.bestJ] : null;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/machine-learning" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Machine Learning
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Decision Trees</h1>
                    <p className="text-lime-50 max-w-3xl">
                        Try every threshold on every feature, keep the question that leaves the purest groups, and repeat inside each group. Watch the scan, the boxes it carves, what an unlimited depth does, and the XOR case where choosing greedily goes wrong.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/80">Builds on</span>
                        {[['Overfitting and Underfitting', '/machine-learning/overfitting-and-underfitting'], ['Binary Search Tree', '/trees/binary-search-tree']].map(([name, href]) => (
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
                        <SourceChip kind="live">Every split searched in your browser · seeded two-moons and XOR data</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={explore.key} initialSeed={explore.seed} />
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
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}{step.xor ? ' · XOR data' : ''}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    {step.view === 'impurity' ? (
                                        <ImpurityGroups groups={step.groups} />
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                            <div className="min-w-0">
                                                <TreeField pts={pts} tree={shownTree} cand={cand} best={best} activeId={step.active} />
                                            </div>
                                            <div className="min-w-0 space-y-3">
                                                {step.view === 'scan' && <ScanChart scan={step.scan} upto={step.upto} cand={step.cand} bestJ={step.bestJ} />}
                                                {step.view === 'scan' && cand && (
                                                    <div className="space-y-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
                                                        <p className="text-xs text-slate-300 font-semibold">{FEATURE_NAMES[cand.f]} ≤ {f(cand.t)}</p>
                                                        <CountsRow label={`left (${sum(cand.left)})`} counts={cand.left} />
                                                        <CountsRow label={`right (${sum(cand.right)})`} counts={cand.right} />
                                                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/60">
                                                            <span className="text-slate-400">weighted Gini</span>
                                                            <span className="font-mono text-slate-100">{step.askBeat ? '?' : f(cand.weighted, 3)}</span>
                                                        </div>
                                                        {best && <div className="flex items-center justify-between text-xs"><span className="text-slate-500">{step.xor ? 'the scan picks (dashed)' : 'best so far (dashed)'}</span><span className="font-mono text-slate-300">{FEATURE_NAMES[best.f]} ≤ {f(best.t)} · {f(best.weighted, 3)}</span></div>}
                                                    </div>
                                                )}
                                                {step.view === 'depth' && <DepthChart rows={step.depthRows} full={step.fullRow} best={step.bestD} />}
                                                {step.accs && (
                                                    <div className="grid grid-cols-2 gap-2 text-center">
                                                        {[['training', step.accs.train], ['validation', step.accs.val]].map(([label, val]) => (
                                                            <div key={label} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                                                <div className="text-[10px] uppercase tracking-wide text-slate-500">{label} accuracy</div>
                                                                <div className="font-mono text-sm text-slate-100">{pct(val)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-1.5"><ShapeTag label="X" names={['n', 'features']} shape={[pts.length, 2]} /></div>
                                            </div>
                                        </div>
                                    )}
                                    {step.view === 'tree' && shownTree && (
                                        <div className="mt-4 overflow-x-auto"><div className="min-w-[420px]"><TreeDiagram tree={shownTree} activeId={step.active} maxDepth={step.deep ? 3 : 4} /></div></div>
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
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New data" title="New data"
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

                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-slate-100 text-sm sm:text-base overflow-x-auto">
                                <Tex block>{formulaFor(step)}</Tex>
                            </div>
                        </>
                    )}

                    <InCode title="The same trees in scikit-learn" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">How a tree grows</h2>
                        <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                            <li>For every feature and every threshold between neighbouring values, score the split by its size-weighted Gini.</li>
                            <li>Keep the lowest. Send each point left (yes) or right (no).</li>
                            <li>Repeat inside each side until a leaf is pure, the depth limit is hit, or no split leaves enough points.</li>
                            <li>A leaf predicts its majority class.</li>
                        </ol>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;The tree-growing algorithm finds the best tree for the data.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            {study
                                ? <>It finds the best <em>next question</em>. Over {study.runs} seeded XOR datasets, greedy depth-2 trees averaged {pct(study.greedy)} on new points; the best depth-2 tree, found by trying every root question, averaged {pct(study.brute)}. Greedy was more than 5 points worse on {study.worse} of {study.runs}.</>
                                : 'Comparing greedy and brute-force depth-2 trees over 200 seeded XOR datasets…'}
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
