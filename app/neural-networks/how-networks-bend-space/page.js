"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, SlidersHorizontal, Shuffle,
    Shapes, MoveDiagonal, MoveRight, Waves, Layers, Scissors, CircleDot, Box, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { makeDataset } from '@/lib/ml/datasets';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import MatrixInput from '@/components/math/MatrixInput';
import Scene3D from '@/components/math/Scene3D';
import { MATH_COLORS } from '@/components/math/Plane2D';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { AI_COLORS } from '@/components/ml/colors';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the networks ──────────────────────────────────────────
   All three were trained for this page with Adam on 160 points (noise 0.08, data
   seed 5), tanh hidden units and a sigmoid output. The test suite re-runs each
   recipe and gets exactly these numbers.
   moons  2-2-2-1, init seed 16, learning rate 0.02, stopped after 700 steps: the
          first check (every 50 steps) at which the rounded network got all 160
          right. One decimal.
   ring2  2-2-2-2-1, init seed 17, learning rate 0.03, 4,000 steps. Two decimals;
          at one decimal it loses training points.
   ring3  2-3-1, init seed 1, learning rate 0.03, 4,000 steps. Two decimals.
   Each layer is { W: one row per unit, b }, then the readout v · h + c. */
const NETS = {
    moons: {
        layers: [{ W: [[4.4, -0.5], [-1.4, 1.1]], b: [-0.1, 0.1] }, { W: [[1.8, -2.7], [4.1, 5.7]], b: [3.9, -0.2] }],
        v: [5.8, -7.3], c: -4.7, decimals: 1,
    },
    ring2: {
        layers: [
            { W: [[1.16, 0.86], [2.27, 1.27]], b: [0.74, 0.65] },
            { W: [[0.74, -6.42], [-4.61, 2.28]], b: [5.61, 1.87] },
            { W: [[0.51, -20.94], [-5.9, 10.2]], b: [-1.19, 0.46] },
        ],
        v: [9.63, 10.53], c: 9.93, decimals: 2,
    },
    ring3: {
        layers: [{ W: [[4.65, -1.82], [3.86, 3.1], [-0.87, 4.7]], b: [-1.8, 2.19, -1.89] }],
        v: [15.81, -16.2, 16.1], c: 23.76, decimals: 2,
    },
};
const MOONS = makeDataset('moons', { n: 160, noise: 0.08, seed: 5 });
const RING = makeDataset('circles', { n: 160, noise: 0.08, seed: 5 });
const DATA = { moons: MOONS, ring2: RING, ring3: RING };
const N = 160;

/** Snap away float noise so a sum that is exactly 0 on paper is exactly 0 here. */
const snap = (v) => Math.round(v * 1e9) / 1e9;

/** Every keyframe of one point: x, then for each layer W·h, W·h + b and tanh(W·h + b). */
function keyframes(net, x, { squash = true, W1 = null } = {}) {
    const frames = [x];
    let h = x;
    net.layers.forEach((layer, l) => {
        const W = l === 0 && W1 ? W1 : layer.W;
        const lin = W.map(row => snap(row.reduce((s, w, i) => s + w * h[i], 0)));
        const z = lin.map((v, o) => snap(v + layer.b[o]));
        h = squash ? z.map(Math.tanh) : z;
        frames.push(lin, z, h);
    });
    return frames;
}
const lastOf = (a) => a[a.length - 1];
const scoreOf = (net, h) => snap(net.v.reduce((s, w, i) => s + w * h[i], 0) + net.c);
const classOf = (net, x, opts) => (scoreOf(net, lastOf(keyframes(net, x, opts))) > 0 ? 1 : 0);
const rightOn = (net, data, opts) => data.X.filter((x, i) => classOf(net, x, opts) === data.y[i]).length;
const col = (W, j) => W.map(row => row[j]);
const det2 = (W) => snap(W[0][0] * W[1][1] - W[0][1] * W[1][0]);

/** The best any straight line can do on 2D points: 360 directions, every threshold between sorted projections.
    Returns the line n · x = t, with class 1 on the side where n · x > t. */
function bestLine(P, y) {
    let best = { right: -1 };
    for (let a = 0; a < 360; a++) {
        const th = (a * Math.PI) / 180, n = [Math.cos(th), Math.sin(th)];
        const proj = P.map((p, i) => [p[0] * n[0] + p[1] * n[1], y[i]]).sort((p, q) => p[0] - q[0]);
        let right = y.reduce((s, v) => s + v, 0);          // threshold below every point: all called 1
        if (right > best.right) best = { right, n, t: proj[0][0] - 0.01 };
        for (let k = 0; k < proj.length; k++) {
            right += proj[k][1] === 0 ? 1 : -1;               // point k crosses to the class-0 side
            if (k + 1 < proj.length && proj[k + 1][0] === proj[k][0]) continue;
            const t = k + 1 < proj.length ? (proj[k][0] + proj[k + 1][0]) / 2 : proj[k][0] + 0.01;
            if (right > best.right) best = { right, n, t };
        }
    }
    return best;
}
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
/** Convex hull, counter-clockwise (monotone chain). */
function hull(P) {
    const pts = [...P].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length < 3) return pts;
    const lower = [], upper = [];
    for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    for (const p of [...pts].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
const insideHull = (H, q) => H.length >= 3 && H.every((a, i) => cross(a, H[(i + 1) % H.length], q) >= 0);
function pointSegment(q, a, b) {
    const d = [b[0] - a[0], b[1] - a[1]], len = d[0] * d[0] + d[1] * d[1];
    const u = len ? Math.max(0, Math.min(1, ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1]) / len)) : 0;
    return Math.hypot(q[0] - a[0] - u * d[0], q[1] - a[1] - u * d[1]);
}
const segmentsCross = (a, b, c, d) => cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
/** The widest gap any straight line can leave between the classes, as the distance from the line to the
    nearest point: half the shortest distance between the two classes' convex hulls, which is what a
    hard-margin SVM finds. 0 when no line separates them. */
function widestGap(P, y) {
    const [A, B] = [0, 1].map(c => hull(P.filter((_, i) => y[i] === c)));
    if (A.some(q => insideHull(B, q)) || B.some(q => insideHull(A, q))) return 0;
    const edges = (H) => H.map((a, i) => [a, H[(i + 1) % H.length]]);
    let best = Infinity;
    for (const [a, b] of edges(A)) for (const [c, d] of edges(B)) {
        if (segmentsCross(a, b, c, d)) return 0;
        best = Math.min(best, pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
    }
    return best / 2;
}
const MOON_FRAMES = MOONS.X.map(x => keyframes(NETS.moons, x));
const BEST = {
    input: bestLine(MOONS.X, MOONS.y),
    h1: bestLine(MOON_FRAMES.map(f => f[3]), MOONS.y),
    h2: bestLine(MOON_FRAMES.map(f => f[6]), MOONS.y),
    ring: bestLine(RING.X, RING.y),
};
/** Both hidden spaces are inside the same square (−1, 1)², so these distances compare. */
const GAP = {
    h1: widestGap(MOON_FRAMES.map(f => f[3]), MOONS.y),
    h2: widestGap(MOON_FRAMES.map(f => f[6]), MOONS.y),
    cut: Math.min(...MOON_FRAMES.map((f, i) => ((MOONS.y[i] ? 1 : -1) * scoreOf(NETS.moons, f[6])) / Math.hypot(...NETS.moons.v))),
};

/** The two circles the ring data was drawn from, without noise: inner r = 0.35 (class 0), outer r = 0.85 (class 1). */
const TRUE_PER = 720;
const TRUE_CIRCLES = [0.35, 0.85].map(r => Array.from({ length: TRUE_PER }, (_, i) => {
    const t = (2 * Math.PI * i) / TRUE_PER;
    return [snap(r * Math.cos(t)), snap(r * Math.sin(t))];
}));
const truthWrong = (key) => TRUE_CIRCLES.map((pts, label) => pts.filter(x => classOf(NETS[key], x) !== label).length);
const RING2_TRUTH = truthWrong('ring2');       // [inner wrong, outer wrong] of 720 each
const RING3_TRUTH = truthWrong('ring3');
const RIGHT = { moons: rightOn(NETS.moons, MOONS), ring2: rightOn(NETS.ring2, RING), ring3: rightOn(NETS.ring3, RING) };

/* ── the misconception, measured ───────────────────────────
   80 networks with hidden layers of 2 tanh units (1, 2, 3 or 4 layers, init seeds
   1–20, the ring2 recipe) and 20 with one layer of 3 units, scored on the 1,440
   points of the true circles. Re-run by the test suite (bs-study.mjs). */
const RING_STUDY = { width2: 80, width2Perfect: 0, width2Best: 0.9812, width2MedianLo: 0.817, width2MedianHi: 0.886, width2TrainPerfect: 3, width3: 20, width3Perfect: 15 };

/* ── numbers as text ───────────────────────────────────── */

/** At most d decimals, trailing zeros trimmed, true minus sign. */
const fmt = (v, d = 2) => {
    const s = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(/\.?0+$/, '');
    const out = s === '-0' ? '0' : s;
    return out.startsWith('-') ? `−${out.slice(1)}` : out;
};
const tx = (v, d = 2) => fmt(v, d).replace('−', '-');
const vec = (a, d = 2) => `(${a.map(v => fmt(v, d)).join(', ')})`;
const tvec = (a, d = 2) => String.raw`\begin{pmatrix}${a.map(v => tx(v, d)).join(String.raw`\\`)}\end{pmatrix}`;
const tmat = (rows, d = 2) => String.raw`\begin{pmatrix}${rows.map(r => r.map(v => tx(v, d)).join(' & ')).join(String.raw`\\`)}\end{pmatrix}`;
const tPlusMinus = (v, d = 2) => (v < 0 ? `- ${tx(-v, d)}` : `+ ${tx(v, d)}`);
const SUB = ['₀', '₁', '₂', '₃', '₄'];
const SIGNS = ['Positive', 'Negative'];
const ORD = ['first', 'second'];

/* ── the tour ─────────────────────────────────────────── */

const DEFAULT_SEED = 41;

/* Points P the tour can follow: the 0.1 grid over the moons, off the axes, where every
   prompt has a clear answer (no coordinate within 0.05 of an axis after a stretch, and
   the two coordinates entering a squash differ in size by at least 0.15). */
const TOUR_CANDIDATES = (() => {
    const out = [];
    for (let i = -11; i <= 11; i++) for (let j = -7; j <= 7; j++) {
        if (i === 0 || j === 0) continue;
        const p = [i / 10, j / 10];
        const f = keyframes(NETS.moons, p);
        if (Math.min(...f[1].map(Math.abs), ...f[4].map(Math.abs)) < 0.05) continue;
        if (Math.abs(Math.abs(f[2][0]) - Math.abs(f[2][1])) < 0.15 || Math.abs(Math.abs(f[5][0]) - Math.abs(f[5][1])) < 0.15) continue;
        out.push(p);
    }
    return out;
})();

/* Which prompts get asked. Before a stretch the prompt asks for the sign of one of P's
   coordinates afterwards (s0, s1); before a squash, which coordinate tanh moves further
   (m0, m1). P is drawn uniformly from TOUR_CANDIDATES, and the answers are not uniform
   over it: W₁'s first row is nearly 4.4·x, so "the first coordinate keeps its sign" would
   be right about nine times in ten. Each prompt is therefore asked with a probability set
   by its cell — the coordinate asked about, the answer, and whether "keeps its sign"
   would be right — computed from the candidates' own cell counts so that every cell is
   asked equally often: each answer half the time, and "keeps its sign" right half the
   time. A stretch prompt only asks about a coordinate whose four cells all occur: W₁'s
   first coordinate never changes sign on the candidates, so layer 1 always asks about
   the second. Within a tour the asked answers then tend to alternate (a negative second
   coordinate after W₁ goes with the first coordinate moving further at the end), so a
   prompt whose answer button differs from the last one asked is kept with probability
   ALT, which brings "same button as last time" back to a coin toss. */
function cellsOf(p) {
    const f = keyframes(NETS.moons, p);
    const sign = (c, k) => `${c}${f[k + 1][c] > 0 ? 0 : 1}${(f[k][c] > 0) === (f[k + 1][c] > 0) ? 1 : 0}`;
    return {
        s0: [sign(0, 0), sign(1, 0)],
        m0: [`${Math.abs(f[2][0]) > Math.abs(f[2][1]) ? 0 : 1}`],
        s1: [sign(0, 3), sign(1, 3)],
        m1: [`${Math.abs(f[5][0]) > Math.abs(f[5][1]) ? 0 : 1}`],
    };
}
const PROMPT_KEYS = ['s0', 'm0', 's1', 'm1'];
const ALT = 0.6;
const CELL_COUNTS = (() => {
    const counts = Object.fromEntries(PROMPT_KEYS.map(k => [k, {}]));
    TOUR_CANDIDATES.forEach(p => Object.entries(cellsOf(p)).forEach(([k, cells]) => cells.forEach(cell => { counts[k][cell] = (counts[k][cell] ?? 0) + 1; })));
    return counts;
})();
/** The coordinates each prompt may ask about: for stretch prompts, those whose four cells all occur. */
const COORDS = Object.fromEntries(PROMPT_KEYS.map(k => [k, k[0] === 'm' ? [0]
    : [0, 1].filter(c => ['00', '01', '10', '11'].every(rest => CELL_COUNTS[k][`${c}${rest}`]))]));
const ASK = Object.fromEntries(PROMPT_KEYS.map(k => {
    const usable = Object.entries(CELL_COUNTS[k]).filter(([cell]) => k[0] === 'm' || COORDS[k].includes(Number(cell[0])));
    const least = Math.min(...usable.map(([, n]) => n));
    return [k, Object.fromEntries(usable.map(([cell, n]) => [cell, least / n]))];
}));

function tourPoint(seed) {
    return createRng(seed).pick(TOUR_CANDIDATES);
}
/** For each prompt: which coordinate it is about (stretch prompts pick one at random), and whether it is asked. */
function tourAsks(seed, p) {
    const rng = createRng(seed * 31 + 7);
    const cells = cellsOf(p);
    let last = null;
    return Object.fromEntries(PROMPT_KEYS.map(k => {
        const coord = rng.pick(COORDS[k]);
        const cell = cells[k][coord];
        const answer = k[0] === 's' ? cell[1] : cell[0];
        const ask = rng.chance(ASK[k][cell] * (last !== null && answer !== last ? ALT : 1));
        if (ask) last = answer;
        return [k, { coord, ask }];
    }));
}

const ACTS = [
    { id: 1, label: 'Tangled', icon: Shapes },
    { id: 2, label: 'Stretch', icon: MoveDiagonal },
    { id: 3, label: 'Shift', icon: MoveRight },
    { id: 4, label: 'Squash', icon: Waves },
    { id: 5, label: 'Layer 2', icon: Layers },
    { id: 6, label: 'The cut', icon: Scissors },
    { id: 7, label: 'The ring', icon: CircleDot },
    { id: 8, label: 'Up a dimension', icon: Box },
];

function generateSteps(seed) {
    const net = NETS.moons;
    const P = tourPoint(seed);
    const f = keyframes(net, P);
    const asks = tourAsks(seed, P);
    const [L1, L2] = net.layers;
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, net: 'moons', p: P, ...data, explanation });
    const score = scoreOf(net, f[6]);
    const pClass = score > 0 ? 'orange' : 'blue';
    const dets = NETS.ring2.layers.map(l => det2(l.W));

    s(1, 'Tangled', { kind: 'data', stage: 0, showBest: true },
        `160 points in two interlocking moons, 80 of each colour. No straight line splits them: trying every direction and every offset, the best line (dashed) gets ${BEST.input.right} of ${N} right. The white ring is P = ${vec(P, 1)}, a point this tour follows.`);
    s(1, 'Tangled', { kind: 'plan', stage: 0, showContour: true },
        `A network with two hidden layers of two tanh units gets all ${RIGHT.moons} right; its boundary is the green curve. Each layer does three things to the whole plane, one after another: stretch it with a matrix W, shift it with a vector b, squash it with tanh. The grid shows what each does to every point at once.`);

    const stretchText = (l, before, after, W) => {
        const d = det2(W);
        return `W${SUB[l + 1]} sends î = (1, 0) to its first column ${vec(col(W, 0), 1)} (green) and ĵ = (0, 1) to its second ${vec(col(W, 1), 1)} (red); every other point follows its coordinates, so P = ${vec(before)} lands at ${fmt(before[0])}·${vec(col(W, 0), 1)} + ${fmt(before[1])}·${vec(col(W, 1), 1)} = ${vec(after)}. Grid lines stay straight, parallel and evenly spaced: a matrix cannot bend anything. det W${SUB[l + 1]} = ${fmt(d)}, so areas grow ${fmt(Math.abs(d))}×${d > 0 ? ' and nothing is mirrored' : ' and the plane is mirrored'}.`;
    };
    s(2, 'Stretch', { kind: 'stretch', layer: 0, stage: 1, showColumns: true, ask: asks.s0.ask, coord: asks.s0.coord }, stretchText(0, f[0], f[1], L1.W));
    s(3, 'Shift', { kind: 'shift', layer: 0, stage: 2 },
        `Adding b₁ = ${vec(L1.b, 1)} slides the whole plane by that much: P moves from ${vec(f[1])} to ${vec(f[2])}. Lines are still straight. Stretching and shifting together make an affine map, and any number of affine maps in a row is still one affine map.`);
    s(4, 'Squash', { kind: 'squash', layer: 0, stage: 3, ask: asks.m0.ask },
        `tanh acts on each coordinate on its own and pulls it into (−1, 1). Near 0 it hardly moves anything (tanh 0.2 = 0.197); far out it crushes (tanh 3 = 0.995). P goes from ${vec(f[2])} to ${vec(f[3])}. Distances near the middle survive and distances far out shrink, so straight grid lines come out curved: this is the only bend in the whole layer.`);
    s(4, 'Squash', { kind: 'after1', layer: 0, stage: 3, showBest: true },
        `After one layer the best straight line here already gets ${BEST.h1.right} of ${N}, up from ${BEST.input.right} in the input: one stretch, shift and squash untangled the moons. Only just, though: the widest gap any line can leave between them is ${fmt(GAP.h1, 4)} on each side, in a square 2 wide. The network has a second layer; watch what it does with that.`);

    s(5, 'Layer 2', { kind: 'stretch', layer: 1, stage: 4, showColumns: true, ask: asks.s1.ask, coord: asks.s1.coord }, stretchText(1, f[3], f[4], L2.W));
    s(5, 'Layer 2', { kind: 'shift', layer: 1, stage: 5 },
        `Adding b₂ = ${vec(L2.b, 1)}: P moves from ${vec(f[4])} to ${vec(f[5])}. The shift is large in the first coordinate, which pushes most points far to the right, where tanh will flatten them.`);
    s(5, 'Layer 2', { kind: 'squash', layer: 1, stage: 6, ask: asks.m1.ask },
        `tanh again: P goes from ${vec(f[5])} to ${vec(f[6])}. Every point is now inside the square (−1, 1)², and the widest gap a straight line can leave between the moons has grown from ${fmt(GAP.h1, 4)} to ${fmt(GAP.h2, 3)} on each side, ${Math.round(GAP.h2 / GAP.h1)} times wider. Same square, so the two compare.`);

    s(6, 'The cut', { kind: 'cut', stage: 6, showCut: true },
        `The output unit computes v · h₂ + c = ${fmt(net.v[0], 1)}h₁ ${net.v[1] < 0 ? '−' : '+'} ${fmt(Math.abs(net.v[1]), 1)}h₂ ${net.c < 0 ? '−' : '+'} ${fmt(Math.abs(net.c), 1)} and calls a point orange when that is above 0. Its zero set is a straight line (green), and all ${RIGHT.moons} points are on their own side of it, the nearest ${fmt(GAP.cut, 3)} away. For P it is ${fmt(score)}, so P is called ${pClass}.`);
    s(6, 'The cut', { kind: 'pullback', stage: 0, showContour: true, hold: 2.5 },
        `Now run both layers backwards. The green points were laid along the straight cut; carried back through two squashes, two shifts and two stretches they trace the curved boundary in the input plane. A network's curved boundary is a straight line in its last layer's space, seen from the input.`);

    s(7, 'The ring', { net: 'ring2', kind: 'ring', stage: 0, showBest: true, showCircles: true },
        `A harder tangle: an inner circle (blue) inside a ring (orange), drawn as dashed curves without noise and as 160 noisy samples. The best straight line gets ${BEST.ring.right} of ${N}. This network has three hidden layers, still two units each.`);
    s(7, 'The ring', { net: 'ring2', kind: 'ringplay', stage: 9, showCircles: true, hold: 3 },
        `All three layers, played through. Every W has a non-zero determinant (${dets.map(d => fmt(d, 1)).join(', ')}), so no layer flattens the plane, and stretching, shifting and tanh never tear it. The outer circle stays one closed loop around the inner one the whole way. The last tanh squeezes hard: it presses the inner circle into the bottom-left corner and the loop against the edges of the square, until most of the inner circle is less than a pixel from the loop, but the loop never opens.`);
    s(7, 'The ring', { net: 'ring2', kind: 'ringcut', stage: 9, showCircles: true, showCut: true, showWrong: true },
        `The cut gets all ${RIGHT.ring2} training points right. But a straight line cannot leave a closed loop on one side and what it encloses on the other, so it must cross the outer circle somewhere: ${RING2_TRUTH[1]} of its ${TRUE_PER} points (red) land on the blue side${RING2_TRUTH[0] ? `, and ${RING2_TRUTH[0]} of the inner circle's on the orange side` : ''}. The line slipped through a gap between samples.`);
    s(7, 'The ring', { net: 'ring2', kind: 'ringback', stage: 0, showCircles: true, showWrong: true, showContour: true, hold: 2.5 },
        `Pulled back to the input, the boundary (green) wraps the inner circle almost all the way round but has to leave a gap, and the red arc is where it crosses the ring. No amount of training fixes this: it comes from the shape of the problem, not the weights.`);

    s(8, 'Up a dimension', { net: 'ring3', kind: 'lift', lift: 1 },
        `Give one hidden layer 3 units instead of 2, and its space is three-dimensional. tanh(W₁x + b₁) lifts the plane into a curved sheet, the inner circle rises away from the ring, and a flat plane (green) separates them: ${RIGHT.ring3} of ${N} training points and ${2 * TRUE_PER - RING3_TRUTH[0] - RING3_TRUTH[1]} of the ${2 * TRUE_PER} points on the true circles. Drag to turn it.`);
    s(8, 'Up a dimension', { net: 'ring3', kind: 'rule', lift: 1 },
        `The rule this page shows: each layer is a stretch, a shift and a squash. The squash is what bends, depth gives more bends, and the last layer only ever draws a straight line (or a flat plane). When the classes are knotted together in a way no bending can undo, the network needs more units per layer — more dimensions to pull them apart in.`);
    return steps;
}

/** Before a stretch: is one of P's coordinates positive or negative afterwards? Before a squash: which coordinate does tanh move further? */
function predictFor(step, next) {
    if (!next || !next.ask || next.net !== 'moons') return null;
    const net = NETS.moons;
    const f = keyframes(net, next.p);
    const l = next.layer;
    if (next.kind === 'stretch') {
        const before = f[3 * l], after = f[3 * l + 1];
        const W = net.layers[l].W, c = next.coord;
        return {
            question: `P is at ${vec(before)}. W${SUB[l + 1]} sends î to ${vec(col(W, 0), 1)} and ĵ to ${vec(col(W, 1), 1)}, so P goes to ${fmt(before[0])}·${vec(col(W, 0), 1)} + ${fmt(before[1])}·${vec(col(W, 1), 1)}. Is its ${ORD[c]} coordinate positive or negative afterwards?`,
            options: SIGNS,
            correct: after[c] > 0 ? 0 : 1,
            because: `The ${ORD[c]} coordinate is (${fmt(before[0])})(${fmt(W[c][0], 1)}) + (${fmt(before[1])})(${fmt(W[c][1], 1)}) = ${fmt(after[c])}, so it is ${after[c] > 0 ? 'positive' : 'negative'}. P lands at ${vec(after)}.`,
        };
    }
    if (next.kind === 'squash') {
        const z = f[3 * l + 2], h = f[3 * l + 3];
        const moved = z.map((v, i) => Math.abs(v - h[i]));
        return {
            question: `P is at z = ${vec(z)}. tanh pulls each coordinate toward 0, into (−1, 1). Which coordinate moves further?`,
            options: ['The first', 'The second'],
            correct: Math.abs(z[0]) > Math.abs(z[1]) ? 0 : 1,
            because: `tanh ${fmt(z[0])} = ${fmt(h[0], 3)} (moves ${fmt(moved[0], 3)}) and tanh ${fmt(z[1])} = ${fmt(h[1], 3)} (moves ${fmt(moved[1], 3)}). tanh barely changes small numbers and flattens big ones, so the coordinate farther from 0 moves more.`,
        };
    }
    return null;
}

/* ── geometry for the picture ──────────────────────────── */

const GRID_BOX = { moons: { x: [-1.4, 1.4], y: [-1.0, 1.0] }, ring2: { x: [-1.2, 1.2], y: [-1.2, 1.2] } };
const GRID_STEP = 0.2;
const GRID_SAMPLES = 40;
const CONTOUR_STEP = 0.025;
const CIRCLE_DRAW = 180;

/** Where the network's score crosses 0 over the grid box, as short segments (marching squares). */
function contourSegments(net, box, opts) {
    const nx = Math.round((box.x[1] - box.x[0]) / CONTOUR_STEP), ny = Math.round((box.y[1] - box.y[0]) / CONTOUR_STEP);
    const at = (i, j) => [box.x[0] + i * CONTOUR_STEP, box.y[0] + j * CONTOUR_STEP];
    const val = [];
    for (let i = 0; i <= nx; i++) { val.push([]); for (let j = 0; j <= ny; j++) val[i].push(scoreOf(net, lastOf(keyframes(net, at(i, j), opts)))); }
    const segs = [], solved = new Map();
    /* Where the score crosses 0 on a grid edge: bisection, then a linear step inside the last
       bracket. A linear step alone lands visibly off the cut once a steep layer has bent the
       score; this lands on it. Each edge is shared by two squares, so it is solved once. */
    const cross = (a, b) => {
        if (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) [a, b] = [b, a];
        const key = `${a}|${b}`;
        if (solved.has(key)) return solved.get(key);
        let p = at(...a), q = at(...b), fp = val[a[0]][a[1]], fq = val[b[0]][b[1]];
        for (let it = 0; it < 30; it++) {
            const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], fm = scoreOf(net, lastOf(keyframes(net, mid, opts)));
            if ((fm > 0) === (fp > 0)) { p = mid; fp = fm; } else { q = mid; fq = fm; }
        }
        const t = fp / (fp - fq), hit = [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
        solved.set(key, hit);
        return hit;
    };
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
        const hits = [];
        for (let e = 0; e < 4; e++) {
            const [a, b] = [corners[e], corners[(e + 1) % 4]];
            if ((val[a[0]][a[1]] > 0) !== (val[b[0]][b[1]] > 0)) hits.push(cross(a, b));
        }
        if (hits.length >= 2) segs.push([hits[0], hits[1]]);
        if (hits.length === 4) segs.push([hits[2], hits[3]]);
    }
    return segs;
}

/** Everything the morph draws, carried through every keyframe at once: one flat array of
    coordinates per keyframe, and index ranges saying which vertices form what. */
function buildScene(key, { squash = true, W1 = null } = {}) {
    const net = NETS[key], data = DATA[key], box = GRID_BOX[key];
    const opts = { squash, W1 };
    const verts = [];
    const add = (p) => { verts.push(p); return verts.length - 1; };
    const points = data.X.map(add);
    const grid = [];
    const gx = Math.round((box.x[1] - box.x[0]) / GRID_STEP), gy = Math.round((box.y[1] - box.y[0]) / GRID_STEP);
    for (let i = 0; i <= gx; i++) {
        const x = box.x[0] + i * GRID_STEP, start = verts.length;
        for (let k = 0; k <= GRID_SAMPLES; k++) add([x, box.y[0] + ((box.y[1] - box.y[0]) * k) / GRID_SAMPLES]);
        grid.push([start, GRID_SAMPLES + 1]);
    }
    for (let j = 0; j <= gy; j++) {
        const y = box.y[0] + j * GRID_STEP, start = verts.length;
        for (let k = 0; k <= GRID_SAMPLES; k++) add([box.x[0] + ((box.x[1] - box.x[0]) * k) / GRID_SAMPLES, y]);
        grid.push([start, GRID_SAMPLES + 1]);
    }
    const contourStart = verts.length;
    contourSegments(net, box, opts).forEach(([p, q]) => { add(p); add(q); });
    const contour = [contourStart, verts.length - contourStart];
    const circles = [];
    if (key === 'ring2') {
        [0.35, 0.85].forEach(r => {
            const start = verts.length;
            for (let k = 0; k <= CIRCLE_DRAW; k++) add([r * Math.cos((2 * Math.PI * k) / CIRCLE_DRAW), r * Math.sin((2 * Math.PI * k) / CIRCLE_DRAW)]);
            circles.push([start, CIRCLE_DRAW + 1]);
        });
    }
    const nFrames = 3 * net.layers.length + 1;
    const frames = Array.from({ length: nFrames }, () => new Float64Array(verts.length * 2));
    verts.forEach((p, i) => keyframes(net, p, opts).forEach((q, k) => { frames[k][2 * i] = q[0]; frames[k][2 * i + 1] = q[1]; }));
    // The view of each keyframe: a square around the data, or the (−1, 1)² square after a squash.
    const views = frames.map((fr, k) => {
        if (squash && k > 0 && k % 3 === 0) return { cx: 0, cy: 0, span: 2.4 };
        let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
        points.forEach(i => { x0 = Math.min(x0, fr[2 * i]); x1 = Math.max(x1, fr[2 * i]); y0 = Math.min(y0, fr[2 * i + 1]); y1 = Math.max(y1, fr[2 * i + 1]); });
        return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, span: Math.max(x1 - x0, y1 - y0, 0.5) * 1.15 };
    });
    // Ring vertices of the true circles that the cut gets wrong.
    const wrong = circles.flatMap(([start, count], label) => {
        const out = [];
        for (let k = 0; k < count - 1; k++) if (classOf(net, verts[start + k], opts) !== label) out.push(start + k);
        return out;
    });
    return { key, net, opts, points, grid, contour, circles, wrong, frames, views, nFrames };
}

const lerp = (a, b, u) => a + (b - a) * u;
/** Positions and view at a fractional stage: every sub-step is a straight-line blend of two keyframes. */
function frameAt(scene, stage) {
    const last = scene.nFrames - 1;
    const s = Math.max(0, Math.min(last, stage));
    const k = Math.min(Math.floor(s), last - 1), u = s - k;
    const A = scene.frames[k], B = scene.frames[k + 1];
    const pos = new Float64Array(A.length);
    for (let i = 0; i < A.length; i++) pos[i] = A[i] + (B[i] - A[i]) * u;
    const va = scene.views[k], vb = scene.views[k + 1];
    return { pos, view: { cx: lerp(va.cx, vb.cx, u), cy: lerp(va.cy, vb.cy, u), span: lerp(va.span, vb.span, u) } };
}
function pointAt(net, x, stage, opts) {
    const f = keyframes(net, x, opts);
    const last = f.length - 1;
    const s = Math.max(0, Math.min(last, stage));
    const k = Math.min(Math.floor(s), last - 1), u = s - k;
    return [lerp(f[k][0], f[k + 1][0], u), lerp(f[k][1], f[k + 1][1], u)];
}
const stageName = (s, layers) => {
    const k = Math.round(s);
    if (k === 0) return 'input';
    const l = Math.ceil(k / 3), part = (k - 1) % 3;
    return `layer ${l} · ${['stretch (W' + SUB[l] + ')', 'shift (+ b' + SUB[l] + ')', 'squash (tanh)'][part]}${k === 3 * layers ? ' · ready to cut' : ''}`;
};

/* ── the formula under the picture ─────────────────────── */

function formulaFor(step) {
    const net = NETS[step.net];
    if (step.net === 'moons') {
        const f = keyframes(net, step.p);
        const l = step.layer ?? 0;
        const W = net.layers[l].W, b = net.layers[l].b;
        const n = l + 1;
        switch (step.kind) {
            case 'data': { const { n: d, t } = BEST.input; return String.raw`\text{best line: } ${tx(d[0])}\,x_1 ${tPlusMinus(d[1])}\,x_2 = ${tx(t)} \;\Rightarrow\; ${BEST.input.right} / ${N} \text{ right}`; }
            case 'plan': return String.raw`h_1 = \tanh(W_1 x + b_1), \quad h_2 = \tanh(W_2 h_1 + b_2), \quad \text{orange if } v \cdot h_2 + c > 0`;
            case 'stretch': {
                const before = f[3 * l];
                return String.raw`\begin{gathered} W_${n} = ${tmat(W, 1)}, \quad \det W_${n} = (${tx(W[0][0], 1)})(${tx(W[1][1], 1)}) - (${tx(W[0][1], 1)})(${tx(W[1][0], 1)}) = ${tx(det2(W))} \\ W_${n} P = ${tx(before[0])}${tvec(col(W, 0), 1)} ${tPlusMinus(before[1])}${tvec(col(W, 1), 1)} = ${tvec(f[3 * l + 1])} \end{gathered}`;
            }
            case 'shift': return String.raw`W_${n} P + b_${n} = ${tvec(f[3 * l + 1])} + ${tvec(b, 1)} = ${tvec(f[3 * l + 2])}`;
            case 'squash': return String.raw`h_${n} = \tanh ${tvec(f[3 * l + 2])} = ${tvec(f[3 * l + 3], 3)}`;
            case 'after1': { const { n: d, t } = BEST.h1; return String.raw`\text{best line in } h_1 \text{ space: } ${tx(d[0])}\,h_1 ${tPlusMinus(d[1])}\,h_2 = ${tx(t)} \;\Rightarrow\; ${BEST.h1.right} / ${N}`; }
            case 'cut': return String.raw`v \cdot h_2 + c = (${tx(net.v[0], 1)})(${tx(f[6][0], 3)}) + (${tx(net.v[1], 1)})(${tx(f[6][1], 3)}) ${tPlusMinus(net.c, 1)} = ${tx(scoreOf(net, f[6]))}`;
            default: return String.raw`\{\, x : v \cdot h_2(x) + c = 0 \,\} \text{ is a straight line in } h_2 \text{ space and a curve in } x \text{ space}`;
        }
    }
    if (step.net === 'ring2') {
        if (step.kind === 'ring') { const { n: d, t } = BEST.ring; return String.raw`\text{best line: } ${tx(d[0])}\,x_1 ${tPlusMinus(d[1])}\,x_2 = ${tx(t)} \;\Rightarrow\; ${BEST.ring.right} / ${N}`; }
        if (step.kind === 'ringplay') return String.raw`\det W_1 = ${tx(det2(net.layers[0].W))}, \quad \det W_2 = ${tx(det2(net.layers[1].W))}, \quad \det W_3 = ${tx(det2(net.layers[2].W))}`;
        return String.raw`\text{training points } ${RIGHT.ring2} / ${N}, \qquad \text{true circles } ${2 * TRUE_PER - RING2_TRUTH[0] - RING2_TRUTH[1]} / ${2 * TRUE_PER}`;
    }
    return String.raw`h = \tanh(W_1 x + b_1) \in (-1, 1)^3, \quad W_1 = ${tmat(net.layers[0].W)}, \quad v \cdot h + c = 0 \text{ is a plane}`;
}

const quizQuestions = [
    {
        question: 'A layer computes tanh(Wx + b). Which of its three parts can turn a straight grid line into a curve?',
        options: ['Multiplying by W', 'Adding b', 'Applying tanh', 'None of them: only stacking layers bends lines'],
        correct: 2,
        explanation: 'Multiplying by a matrix and adding a vector keep straight lines straight and parallel lines parallel, however many times you do them. tanh acts on each coordinate separately and flattens big values more than small ones, so a straight line comes out curved.',
    },
    {
        question: 'The last layer separates the classes with a straight line in its own 2D space. What does that line look like back in the input plane?',
        options: ['The same straight line', 'A curve: the line carried back through every layer', 'Always a circle', 'Nothing: it only exists in the last space'],
        correct: 1,
        explanation: 'The boundary in the input plane is every input point that lands exactly on the line. Carried back through each tanh, those points trace a curve, the green boundary on this page. Only a network with no squashing at all would keep it straight.',
    },
    {
        question: 'Why can no network whose hidden layers all have 2 tanh units cut a circle of points off the ring around it?',
        options: [
            'It needs more layers',
            'It needs more training steps',
            'Each layer stretches and squashes the plane without tearing it, so the ring stays a loop around the circle',
            'tanh saturates, so the gradients vanish',
        ],
        correct: 2,
        explanation: 'With an invertible W, stretching, shifting and tanh are all continuous and one-to-one: they bend the plane but never tear it. The ring stays a closed loop with the circle inside, and a straight line cannot leave a loop on one side and what it encloses on the other. Of 80 such networks with 1 to 4 layers, none got every point of the true circles; one layer of 3 units does it by lifting the circle out of the plane.',
    },
];

const codeExample = `import torch

# The moons network from this page (rounded weights)
W1 = torch.tensor([[4.4, -0.5], [-1.4, 1.1]]); b1 = torch.tensor([-0.1, 0.1])
W2 = torch.tensor([[1.8, -2.7], [4.1, 5.7]]);  b2 = torch.tensor([3.9, -0.2])
v = torch.tensor([5.8, -7.3]); c = -4.7

x = torch.tensor([0.5, 0.2])     # a point in the input plane
s = W1 @ x                       # stretch
z = s + b1                       # shift
h1 = torch.tanh(z)               # squash: the only step that bends
h2 = torch.tanh(W2 @ h1 + b2)    # layer 2, all three at once
print(s, z, h1)                  # tensor([ 2.1000, -0.4800]) tensor([ 2.0000, -0.3800]) tensor([ 0.9640, -0.3627])
print(h2, v @ h2 + c)            # tensor([1.0000, 0.9335]) tensor(-5.7147)  -> below 0: blue

# Take the squash out and two layers are one stretch and one shift
print(W2 @ W1, W2 @ b1 + b2)     # tensor([[11.7000, -3.8700], [10.0600,  4.2200]]) tensor([ 3.4500, -0.0400])`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the Squash and The ring acts and retry.'}
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

/* ── pictures ─────────────────────────────────────────── */

const SCENES = { moons: buildScene('moons'), ring2: buildScene('ring2') };
const VIEW = 400;
const r1 = (v) => Math.round(v * 10) / 10;
const CUT_COLOR = '#a3e635';

/** Animate a number toward its target with requestAnimationFrame; jump when `key` changes. */
function useTweened(target, key, duration) {
    const [value, setValue] = useState(target);
    const ref = useRef({ value: target, key });
    useEffect(() => {
        const st = ref.current;
        if (st.key !== key || duration <= 0) {
            st.key = key; st.value = target; setValue(target);
            return undefined;
        }
        const from = st.value;
        if (from === target) return undefined;
        let raf = 0;
        const t0 = performance.now();
        const tick = (now) => {
            const u = Math.min(1, (now - t0) / duration);
            const e = u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2;
            st.value = from + (target - from) * e;
            setValue(st.value);
            if (u < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, key, duration]);
    return value;
}

/** The persistent stage: the input plane's grid, data and boundary carried through every layer. */
function MorphView({ scene, stage, probe = null, showColumns = false, showContour = false, showCut = false, showBest = null, showCircles = false, showWrong = false, onDragColumn = null, ariaLabel }) {
    const svgRef = useRef(null);
    const [drag, setDrag] = useState(null);       // { col, view } while a column arrow is held
    const { pos, view: liveView } = frameAt(scene, stage);
    const view = drag?.view ?? liveView;
    const toS = (x, y) => [r1(((x - view.cx) / view.span) * VIEW + VIEW / 2), r1(VIEW / 2 - ((y - view.cy) / view.span) * VIEW)];
    const at = (i) => toS(pos[2 * i], pos[2 * i + 1]);
    const poly = (start, count) => {
        let d = '';
        for (let k = 0; k < count; k++) { const [x, y] = at(start + k); d += `${k ? 'L' : 'M'}${x} ${y}`; }
        return d;
    };
    const net = scene.net;
    const last = scene.nFrames - 1;
    const layer = Math.min(Math.floor(stage / 3), net.layers.length - 1);
    const inStretch = stage - 3 * layer <= 1 + 1e-9;
    const [ox, oy] = toS(0, 0);
    const W = layer === 0 && scene.opts.W1 ? scene.opts.W1 : net.layers[layer].W;
    const u = Math.max(0, Math.min(1, stage - 3 * layer));
    const tips = [0, 1].map(j => { const e = j === 0 ? [1, 0] : [0, 1]; const w = col(W, j); return [lerp(e[0], w[0], u), lerp(e[1], w[1], u)]; });
    const canDrag = onDragColumn && Math.abs(stage - 1) < 1e-6;
    const sq = stage > 2 ? Math.min(1, stage - 2) : 0;   // the (−1, 1)² square fades in with the first squash

    const toWorld = (clientX, clientY, v) => {
        const svg = svgRef.current;
        const ctm = svg?.getScreenCTM();
        if (!ctm) return null;
        const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
        const p = pt.matrixTransform(ctm.inverse());
        return [v.cx + ((p.x - VIEW / 2) / VIEW) * v.span, v.cy - ((p.y - VIEW / 2) / VIEW) * v.span];
    };
    const moveTo = (j, w) => onDragColumn(j, w.map(c => Math.max(-6, Math.min(6, Math.round(c * 10) / 10))));

    let cutLine = null;
    if (showCut) {
        const nv = Math.hypot(net.v[0], net.v[1]);
        const p0 = [(-net.c * net.v[0]) / (nv * nv), (-net.c * net.v[1]) / (nv * nv)], d = [-net.v[1] / nv, net.v[0] / nv];
        cutLine = [toS(p0[0] - 40 * d[0], p0[1] - 40 * d[1]), toS(p0[0] + 40 * d[0], p0[1] + 40 * d[1])];
    }
    let bestLineEnds = null;
    if (showBest) {
        const { n, t } = showBest;
        const p0 = [n[0] * t, n[1] * t], d = [-n[1], n[0]];
        bestLineEnds = [toS(p0[0] - 40 * d[0], p0[1] - 40 * d[1]), toS(p0[0] + 40 * d[0], p0[1] + 40 * d[1])];
    }
    const probePos = probe ? toS(...pointAt(net, probe, stage, scene.opts)) : null;
    const [contourStart, contourCount] = scene.contour;
    let contourPath = '';
    if (showContour) for (let k = 0; k < contourCount; k += 2) { const [a, b] = at(contourStart + k); const [c, d] = at(contourStart + k + 1); contourPath += `M${a} ${b}L${c} ${d}`; }
    const data = DATA[scene.key];

    return (
        <svg ref={svgRef} viewBox={`0 0 ${VIEW} ${VIEW}`} width="100%" role="img" aria-label={ariaLabel}
            className="block max-w-md mx-auto rounded-lg bg-slate-950 border border-slate-800 touch-none select-none">
            <line x1={0} y1={oy} x2={VIEW} y2={oy} stroke="#334155" strokeWidth={1} />
            <line x1={ox} y1={0} x2={ox} y2={VIEW} stroke="#334155" strokeWidth={1} />
            {sq > 0 && (() => { const [a, b] = toS(-1, 1), [c, d] = toS(1, -1); return <rect x={a} y={b} width={r1(c - a)} height={r1(d - b)} fill="none" stroke="#64748b" strokeDasharray="4 4" opacity={sq} />; })()}
            <path d={scene.grid.map(([s0, c0]) => poly(s0, c0)).join('')} fill="none" stroke="#475569" strokeWidth={0.8} opacity={0.8} />
            {bestLineEnds && <line x1={bestLineEnds[0][0]} y1={bestLineEnds[0][1]} x2={bestLineEnds[1][0]} y2={bestLineEnds[1][1]} stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="6 5" opacity={0.7} />}
            {showCircles && scene.circles.map(([s0, c0], label) => <path key={label} d={poly(s0, c0)} fill="none" stroke={AI_COLORS.classes[label]} strokeWidth={1.6} strokeDasharray="5 4" opacity={0.85} />)}
            {showContour && <path d={contourPath} fill="none" stroke={CUT_COLOR} strokeWidth={2.5} strokeLinecap="round" />}
            {cutLine && Math.abs(stage - last) < 1e-6 && <line x1={cutLine[0][0]} y1={cutLine[0][1]} x2={cutLine[1][0]} y2={cutLine[1][1]} stroke={CUT_COLOR} strokeWidth={2.5} />}
            {scene.points.map((vi, i) => { const [x, y] = at(vi); return <circle key={i} cx={x} cy={y} r={3} fill={AI_COLORS.classes[data.y[i]]} opacity={0.9} />; })}
            {showWrong && scene.wrong.map(vi => { const [x, y] = at(vi); return <circle key={vi} cx={x} cy={y} r={4.5} fill="#ef4444" />; })}
            {showColumns && inStretch && tips.map((tip, j) => {
                const [x, y] = toS(...tip);
                const color = j === 0 ? MATH_COLORS.i : MATH_COLORS.j;
                const ang = Math.atan2(y - oy, x - ox), hl = 9;
                const head = `${x},${y} ${r1(x - hl * Math.cos(ang - 0.4))},${r1(y - hl * Math.sin(ang - 0.4))} ${r1(x - hl * Math.cos(ang + 0.4))},${r1(y - hl * Math.sin(ang + 0.4))}`;
                return (
                    <g key={j}>
                        <line x1={ox} y1={oy} x2={x} y2={y} stroke={color} strokeWidth={3} />
                        <polygon points={head} fill={color} />
                        {canDrag && (
                            <circle cx={x} cy={y} r={11} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.5} tabIndex={0} role="slider"
                                aria-label={`Column ${j + 1} of W₁: where ${j === 0 ? 'î' : 'ĵ'} lands`} aria-valuetext={vec(col(W, j), 1)}
                                style={{ cursor: 'grab' }}
                                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ col: j, view: liveView }); }}
                                onPointerMove={(e) => { if (drag?.col !== j) return; const w = toWorld(e.clientX, e.clientY, drag.view); if (w) moveTo(j, w); }}
                                onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
                                onKeyDown={(e) => {
                                    const step = e.shiftKey ? 1 : 0.1;
                                    const dv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
                                    if (!dv) return;
                                    e.preventDefault();
                                    const w = col(W, j);
                                    moveTo(j, [w[0] + dv[0], w[1] + dv[1]]);
                                }} />
                        )}
                    </g>
                );
            })}
            {probePos && (
                <g>
                    <circle cx={probePos[0]} cy={probePos[1]} r={7} fill="none" stroke="#f8fafc" strokeWidth={2} />
                    <text x={r1(probePos[0] + 10)} y={r1(probePos[1] - 8)} fill="#f8fafc" fontSize={13} fontWeight={600}>P</text>
                </g>
            )}
        </svg>
    );
}

/** The stages of a 2-wide network as a strip of chips, the current one lit. */
function StageStrip({ layers, stage }) {
    const k = Math.round(stage);
    const chips = ['x'];
    for (let l = 1; l <= layers; l++) chips.push(`W${SUB[l]}`, `+ b${SUB[l]}`, 'tanh');
    return (
        <div className="flex flex-wrap items-center justify-center gap-1 text-[11px] font-mono">
            {chips.map((c, i) => (
                <span key={i} className={`px-1.5 py-0.5 rounded border ${i === k ? 'border-orange-500/60 bg-orange-500/15 text-orange-200' : i < k ? 'border-slate-700 text-slate-400' : 'border-slate-800 text-slate-600'}`}>{c}</span>
            ))}
            <span className={`px-1.5 py-0.5 rounded border ${k === 3 * layers ? 'border-lime-500/50 text-lime-300' : 'border-slate-800 text-slate-600'}`}>cut</span>
        </div>
    );
}

/** The width-3 network's hidden space, lifted out of the plane by `lift` (0 = the input plane, 1 = tanh(W₁x + b₁)). */
const LIFT_SCALE = 2;
function liftPoint(x, lift) {
    const h = lastOf(keyframes(NETS.ring3, x));
    return [LIFT_SCALE * lerp(x[0], h[0], lift), LIFT_SCALE * lerp(x[1], h[1], lift), LIFT_SCALE * h[2] * lift];
}
const DRAW_CIRCLES = [0.35, 0.85].map(r => Array.from({ length: CIRCLE_DRAW + 1 }, (_, k) => [r * Math.cos((2 * Math.PI * k) / CIRCLE_DRAW), r * Math.sin((2 * Math.PI * k) / CIRCLE_DRAW)]));
function Lift3D({ lift }) {
    const circles = DRAW_CIRCLES.map(pts => pts.map(x => liftPoint(x, lift)));
    const points = RING.X.map(x => liftPoint(x, lift));
    const net = NETS.ring3;
    return (
        <Scene3D height={380} axisSize={2.6} distance={9} ariaLabel="The ring data lifted into the 3-unit hidden layer, with the separating plane"
            fallback={<p className="text-xs text-slate-400">Training points right: {RIGHT.ring3} of {N}. Points of the true circles right: {2 * TRUE_PER - RING3_TRUTH[0] - RING3_TRUTH[1]} of {2 * TRUE_PER}.</p>}>
            {(P) => (
                <>
                    {circles.map((pts, label) => <P.Line3D key={label} points={pts} color={AI_COLORS.classes[label]} width={3} />)}
                    {points.map((p, i) => <P.Point3D key={i} at={p} color={AI_COLORS.classes[RING.y[i]]} size={0.045} />)}
                    {lift > 0.98 && <P.Plane3D normal={net.v} d={-LIFT_SCALE * net.c} size={4.6} color={CUT_COLOR} opacity={0.25} />}
                </>
            )}
        </Scene3D>
    );
}

/* ── explore ──────────────────────────────────────────── */

const EXPLORE_NETS = [['moons', 'Moons · 2 layers of 2'], ['ring2', 'Ring · 3 layers of 2'], ['ring3', 'Ring · 1 layer of 3']];

function ExploreLab() {
    const [netKey, setNetKey] = useState('moons');
    const [stage, setStage] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [probe, setProbe] = useState([0.5, 0.2]);
    const [W1, setW1] = useState(null);
    const [noSquash, setNoSquash] = useState(false);
    const [lift, setLift] = useState(1);
    const net = NETS[netKey];
    const flat = netKey !== 'ring3';
    const last = 3 * net.layers.length;
    const opts = useMemo(() => ({ squash: !noSquash, W1: netKey === 'moons' ? W1 : null }), [noSquash, W1, netKey]);
    const scene = useMemo(() => {
        if (!flat) return null;
        return opts.squash && !opts.W1 ? SCENES[netKey] : buildScene(netKey, opts);
    }, [flat, netKey, opts]);
    const right = useMemo(() => rightOn(net, DATA[netKey], opts), [net, netKey, opts]);

    useEffect(() => {
        if (!playing) return undefined;
        let raf = 0, prev = performance.now();
        const tick = (now) => {
            const dt = now - prev; prev = now;
            let done = false;
            setStage(s => { const n = Math.min(last, s + dt / 700); done = n >= last; return n; });
            if (done) setPlaying(false); else raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [playing, last]);

    const choose = (key) => { setNetKey(key); setStage(0); setPlaying(false); setW1(null); setNoSquash(false); };
    const editW1 = (M) => setW1(M.map(row => row.map(v => Math.round(v * 10) / 10)));
    const dragColumn = (j, w) => setW1(prev => { const M = (prev ?? NETS.moons.layers[0].W).map(r => [...r]); M[0][j] = w[0]; M[1][j] = w[1]; return M; });
    const repair = () => { setW1(null); setNoSquash(false); };
    const frames = keyframes(net, probe, opts);

    const broken = [];
    if (flat && noSquash) {
        let M = [[1, 0], [0, 1]], c = [0, 0];
        net.layers.forEach((layer, l) => {
            const Wl = l === 0 && opts.W1 ? opts.W1 : layer.W;
            M = Wl.map(row => [0, 1].map(j => snap(row[0] * M[0][j] + row[1] * M[1][j])));
            c = Wl.map((row, o) => snap(row[0] * c[0] + row[1] * c[1] + layer.b[o]));
        });
        broken.push(`No squash: every layer is a stretch and a shift, so ${net.layers.length === 2 ? 'both' : `all ${net.layers.length}`} layers together are one stretch, ${vec(M[0])} over ${vec(M[1])}, and one shift, ${vec(c)}. The grid stays straight at every stage and the boundary is a straight line. ${right} of ${N} right, down from ${RIGHT[netKey]}; the best possible straight line gets ${netKey === 'moons' ? BEST.input.right : BEST.ring.right}.`);
    }
    if (netKey === 'moons' && W1) {
        const d = det2(W1);
        const row = Math.hypot(...W1[0]) >= Math.hypot(...W1[1]) ? W1[0] : W1[1];
        const flatText = Math.abs(d) < 0.05
            ? `: the stretch flattens the whole plane onto (nearly) one line, so everything after it sees one number per point, ${fmt(row[0], 1)}x₁ ${row[1] < 0 ? '−' : '+'} ${fmt(Math.abs(row[1]), 1)}x₂ (or a multiple of it), and two points with the same value become the same point whatever their colour. No later layer can pull them apart again`
            : d < 0 ? ': the stretch mirrors the plane' : '';
        broken.push(`Your W₁ has determinant ${fmt(d)}${flatText}. The rest of the network was trained for the old W₁, so it now gets ${right} of ${N} right.`);
    }

    return (
        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex flex-wrap rounded-lg border border-slate-700 p-0.5 bg-slate-900 text-xs">
                    {EXPLORE_NETS.map(([key, label]) => (
                        <button key={key} onClick={() => choose(key)} className={`px-3 py-1 rounded-md ${netKey === key ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{label}</button>
                    ))}
                </div>
                <SourceChip kind="toy">Trained for this page, rounded to {net.decimals === 1 ? 'one decimal' : 'two decimals'}</SourceChip>
            </div>

            {flat ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="space-y-2 min-w-0">
                        <StageStrip layers={net.layers.length} stage={stage} />
                        <MorphView scene={scene} stage={stage} probe={probe} showColumns showContour showCut={Math.abs(stage - last) < 1e-6}
                            showCircles={netKey === 'ring2'} showWrong={netKey === 'ring2' && !noSquash}
                            onDragColumn={netKey === 'moons' ? dragColumn : null}
                            ariaLabel={`The ${netKey === 'moons' ? 'moons' : 'ring'} data and grid at stage ${stageName(stage, net.layers.length)}`} />
                        <div className="flex items-center gap-2">
                            <button onClick={() => { if (stage >= last) setStage(0); setPlaying(p => !p); }}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-500">
                                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{playing ? 'Pause' : 'Play the layers'}
                            </button>
                            <input type="range" min={0} max={last} step={0.01} value={stage} aria-label="Stage"
                                onChange={e => { setPlaying(false); setStage(Number(e.target.value)); }} className="flex-1 accent-orange-500" />
                        </div>
                        <p className="text-[11px] text-slate-500">
                            {stageName(stage, net.layers.length)}.{netKey === 'moons' ? ' At W₁ (the second chip) drag the green and red arrow tips to change W₁.' : ''} Red dots on the dashed circles are points the cut gets wrong.
                        </p>
                    </div>
                    <div className="space-y-3 min-w-0">
                        <ParamSlider label="P, first coordinate" value={probe[0]} onChange={(v) => setProbe([v, probe[1]])} min={-1.2} max={1.2} step={0.05} accent="orange" format={(v) => fmt(v)} />
                        <ParamSlider label="P, second coordinate" value={probe[1]} onChange={(v) => setProbe([probe[0], v])} min={-1.2} max={1.2} step={0.05} accent="orange" format={(v) => fmt(v)} />
                        <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-3 text-slate-100 text-sm overflow-x-auto space-y-1">
                            {net.layers.map((layer, l) => (
                                <Tex key={l} block>{String.raw`z_${l + 1} = ${tvec(frames[3 * l + 2])}, \quad h_${l + 1} = ${noSquash ? `z_${l + 1}` : String.raw`\tanh z_${l + 1}`} = ${tvec(frames[3 * l + 3], 3)}`}</Tex>
                            ))}
                            <Tex block>{String.raw`v \cdot h_${net.layers.length} + c = ${tx(scoreOf(net, lastOf(frames)))} \;\Rightarrow\; \text{${scoreOf(net, lastOf(frames)) > 0 ? 'orange' : 'blue'}}`}</Tex>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {net.layers.map((layer, l) => <ShapeTag key={l} label={`W${SUB[l + 1]}`} names={['out', 'in']} shape={[2, 2]} />)}
                            <ShapeTag label="v" names={['in']} shape={[2]} />
                        </div>
                        {netKey === 'moons' && (
                            <div className="space-y-1">
                                <MatrixInput label="W₁" value={W1 ?? NETS.moons.layers[0].W} onChange={editW1} columnColors={[MATH_COLORS.i, MATH_COLORS.j]} step={0.1} digits={1} min={-6} max={6} />
                            </div>
                        )}
                        <p className="text-sm text-slate-300">Training points right: <span className="font-semibold text-white">{right} of {N}</span></p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <Lift3D lift={lift} />
                    <ParamSlider label="Lift from the input plane into the hidden layer" value={lift} onChange={setLift} min={0} max={1} step={0.01} accent="orange" format={(v) => fmt(v)} />
                    <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-3 text-slate-100 text-sm overflow-x-auto">
                        <Tex block>{String.raw`h = \tanh(W_1 x + b_1), \quad W_1 = ${tmat(net.layers[0].W)}, \quad b_1 = ${tvec(net.layers[0].b)}`}</Tex>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <ShapeTag label="W₁" names={['out', 'in']} shape={[3, 2]} />
                        <ShapeTag label="h" names={['units']} shape={[3]} />
                    </div>
                    <p className="text-sm text-slate-300">Training points right: <span className="font-semibold text-white">{RIGHT.ring3} of {N}</span>; points of the true circles right: <span className="font-semibold text-white">{2 * TRUE_PER - RING3_TRUTH[0] - RING3_TRUTH[1]} of {2 * TRUE_PER}</span>. The plane appears once the lift reaches 1.</p>
                </div>
            )}

            {flat && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => setNoSquash(true)} disabled={noSquash}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500 disabled:opacity-40">Remove the squash</button>
                    {netKey === 'moons' && (
                        <button onClick={() => setW1([[4.4, -0.5], [-2.2, 0.25]])} disabled={Boolean(W1)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-orange-500 disabled:opacity-40">Flatten W₁</button>
                    )}
                    <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
            )}
            {broken.map(msg => <p key={msg} className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{msg}</p>)}
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

const PIECES = [
    ['W', 'W (stretch)', 'rotates, scales and shears; lines stay straight', ['stretch']],
    ['b', '+ b (shift)', 'slides everything the same way', ['shift']],
    ['tanh', 'tanh (squash)', 'pulls each coordinate into (−1, 1); the only bend', ['squash', 'after1']],
    ['cut', 'v · h + c', 'one straight cut in the last space', ['cut', 'pullback', 'ringcut', 'ringback']],
    ['width', 'units per layer', 'the dimensions there are to pull apart in', ['ringplay', 'lift', 'rule']],
];

export default function HowNetworksBendSpacePage() {
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
    const hold = step.hold ?? 1;
    const shown = useTweened(step.stage ?? 0, step.net, Math.min(0.85 * speed * hold, 450 * 3 * hold));

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed * hold);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode, hold]);

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(Math.max(0, stepHistory.findIndex(s => s.act === act))); };
    const scene = SCENES[step.net];
    const bestFor = step.showBest ? (step.net === 'ring2' ? BEST.ring : step.kind === 'after1' ? BEST.h1 : BEST.input) : null;
    const tags = {
        stretch: [[`W${SUB[(step.layer ?? 0) + 1]}`, ['out', 'in'], [2, 2]]],
        shift: [[`b${SUB[(step.layer ?? 0) + 1]}`, ['units'], [2]]],
        squash: [[`h${SUB[(step.layer ?? 0) + 1]}`, ['units'], [2]]],
        cut: [['v', ['in'], [2]], ['h₂', ['units'], [2]]],
        lift: [['W₁', ['out', 'in'], [3, 2]], ['h', ['units'], [3]]],
    }[step.kind] ?? [];

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/neural-networks" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Neural Networks
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">How Networks Bend Space</h1>
                    <p className="text-orange-100 max-w-3xl">
                        A trained network does not draw a curve around the data. Each layer stretches, shifts and squashes the whole plane, and after the last one a straight line is enough. Watch every point and every grid line move, then meet a tangle that two units per layer can never undo.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Forward Pass', '/neural-networks/forward-pass'], ['Matrix as a Transformation', '/linear-algebra/matrix-as-a-transformation']].map(([name, href]) => (
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
                        {mode === 'guided' && <SourceChip kind="toy">Trained for this page, rounded</SourceChip>}
                    </div>

                    {mode === 'explore' ? <ExploreLab /> : (
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
                                    <div className="min-h-[420px] flex flex-col justify-center gap-2">
                                        {scene ? (
                                            <>
                                                <StageStrip layers={scene.net.layers.length} stage={shown} />
                                                <MorphView scene={scene} stage={shown} probe={step.net === 'moons' ? step.p : null}
                                                    showColumns={Boolean(step.showColumns)} showContour={Boolean(step.showContour)} showCut={Boolean(step.showCut)}
                                                    showBest={bestFor && Math.abs(shown - (step.stage ?? 0)) < 1e-6 ? bestFor : null}
                                                    showCircles={Boolean(step.showCircles)} showWrong={Boolean(step.showWrong)}
                                                    ariaLabel={`${step.net === 'moons' ? 'Moons' : 'Ring'} data and grid, ${stageName(shown, scene.net.layers.length)}`} />
                                            </>
                                        ) : <Lift3D lift={step.lift ?? 1} />}
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
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="Follow a new point" title="Follow a new point"
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

                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-slate-100 text-sm sm:text-base overflow-x-auto space-y-3">
                                <Tex block>{formulaFor(step)}</Tex>
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {tags.map(([label, names, shape]) => <ShapeTag key={label} label={label} names={names} shape={shape} />)}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <InCode title="One point through the moons network in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The pieces</h2>
                        <table className="w-full text-xs">
                            <thead><tr className="text-slate-500"><th className="text-left font-medium pb-1">piece</th><th className="text-left font-medium">does to the plane</th></tr></thead>
                            <tbody>
                                {PIECES.map(([key, name, does, kinds]) => (
                                    <tr key={key} className={`border-t border-slate-800 ${mode === 'guided' && kinds.includes(step.kind) ? 'bg-slate-800/60 text-slate-100' : 'text-slate-400'}`}>
                                        <td className="py-1.5 pr-2 font-mono whitespace-nowrap">{name}</td>
                                        <td>{does}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;Stack enough layers and a network can untangle anything.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            We trained {RING_STUDY.width2} networks on the ring with hidden layers of 2 units: 1, 2, 3 or 4 layers, 20 seeds each. Not one puts every point of the true circles on the right side; the best gets {(RING_STUDY.width2Best * 100).toFixed(1)}%, and each depth&rsquo;s median is {(RING_STUDY.width2MedianLo * 100).toFixed(0)}–{(RING_STUDY.width2MedianHi * 100).toFixed(0)}%. {RING_STUDY.width2TrainPerfect} of them still score 100% on their 160 training points, by threading the line through a gap between samples. With a single layer of 3 units, {RING_STUDY.width3Perfect} of {RING_STUDY.width3} get every point. Depth adds bends; only width adds room.
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
