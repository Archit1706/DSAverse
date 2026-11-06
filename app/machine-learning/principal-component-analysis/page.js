"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2, Shuffle,
    ScatterChart, Search, Crosshair, Minimize2, Box, Ruler, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { covariance, pca } from '@/lib/ml/pca';
import Tex, { texMatrix } from '@/components/math/Tex';
import Plane2D, { Point, Segment, Vector, Label } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── data and the maths ────────────────────────────────────
   Forty points stretched along one direction (standard deviation 1.4)
   and squeezed across it (0.45), tilted by an angle the seed picks. The
   variance of the points' shadows on a direction u is uᵀCu, so the whole
   page is about one 2 × 2 matrix C and its eigenvectors, computed by the
   engine's `pca` (Jacobi rotations). */

const N = 40;
const N3 = 60;
const LONG = 1.4;
const THIN = 0.45;
const SPREAD3 = [1.5, 0.8, 0.18];
const OFFSET = [0.8, 0.5];
const DEFAULT_SEED = 3;
const HUNT = 8;
const GRID = 5;
const MIN_TURN = 20;
const SEE_RATIO = 1.15;
const SEE_ANGLE = 12;
const UNIT_SCALE = 10;
const GAP = 1.2;
const PER_CLASS = 30;
const STUDY_RUNS = 200;
const COL = { pt: '#cbd5e1', u: '#facc15', cand: '#f8fafc', pc1: '#a3e635', pc2: '#38bdf8', pc3: '#e879f9', cls: ['#38bdf8', '#fb923c'] };

const ACTS = [
    { id: 1, label: 'Spread', icon: ScatterChart },
    { id: 2, label: 'Hunt', icon: Search },
    { id: 3, label: 'Eigenvectors', icon: Crosshair },
    { id: 4, label: 'Flatten', icon: Minimize2 },
    { id: 5, label: 'Three dimensions', icon: Box },
    { id: 6, label: 'Units', icon: Ruler },
];

const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const tn = (v, d = 2) => f(v, d).replace('−', '-');
const pct = (x) => `${(100 * x).toFixed(1)}%`;
const deg = (a) => `${Math.round(a)}°`;
const rad = (a) => (a * Math.PI) / 180;
const dir = (a) => [Math.cos(rad(a)), Math.sin(rad(a))];
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
/** The angle of a line (not an arrow), in [0°, 180°). */
const angleOf = (v) => (((Math.atan2(v[1], v[0]) * 180) / Math.PI) % 180 + 180) % 180;
/** The smaller angle between two lines, 0°–90°. */
const lineGap = (a, b) => { const d = (((a - b) % 180) + 180) % 180; return Math.min(d, 180 - d); };
/** The variance of the shadows on the line at angle a: uᵀCu. */
const spreadAt = (C, a) => { const [c, s] = dir(a); return c * c * C[0][0] + 2 * c * s * C[0][1] + s * s * C[1][1]; };
const sampleVar = (z) => { const m = z.reduce((s, x) => s + x, 0) / z.length; return z.reduce((s, x) => s + (x - m) ** 2, 0) / (z.length - 1); };
const matVec = (M, v) => M.map(row => dot(row, v));

function cloud(seed, tilt, stretch = LONG / THIN, n = N) {
    const rng = createRng(seed);
    const [c, s] = dir(tilt);
    const thin = LONG / stretch;
    return Array.from({ length: n }, () => {
        const a = rng.normal(0, LONG), b = rng.normal(0, thin);
        return [OFFSET[0] + c * a - s * b, OFFSET[1] + s * a + c * b];
    });
}
const tourTilt = (seed) => createRng(seed * 7 + 3).int(0, 180 / GRID - 1) * GRID;

/** Means, C, components (signs fixed by the engine), variances, explained. */
function analyse(V) {
    const P = pca(V, V[0].length);
    const { C } = covariance(V);
    return { mean: P.mean, C, comps: P.components, lams: P.variances, total: P.total, explained: P.explained, projected: P.projected };
}
const centred = (V, mean) => V.map(p => p.map((x, j) => x - mean[j]));
function standardise(V) {
    const { mean, C } = covariance(V);
    return V.map(p => p.map((x, j) => (x - mean[j]) / Math.sqrt(C[j][j])));
}

/* A sixty-point cloud that is nearly flat in 3D, turned by three seeded angles. */
function cloud3(seed, thick = SPREAD3[2]) {
    const rng = createRng(seed * 31 + 7000);
    const yaw = rng.next() * 2 * Math.PI, pitch = (rng.next() - 0.5) * 1.2, roll = (rng.next() - 0.5) * 1.2;
    const turn = ([x, y, z]) => {
        [y, z] = [y * Math.cos(roll) - z * Math.sin(roll), y * Math.sin(roll) + z * Math.cos(roll)];
        [x, z] = [x * Math.cos(pitch) + z * Math.sin(pitch), -x * Math.sin(pitch) + z * Math.cos(pitch)];
        [x, y] = [x * Math.cos(yaw) - y * Math.sin(yaw), x * Math.sin(yaw) + y * Math.cos(yaw)];
        return [x, y, z];
    };
    return Array.from({ length: N3 }, () => turn([rng.normal(0, SPREAD3[0]), rng.normal(0, SPREAD3[1]), rng.normal(0, thick)]));
}

/* The hunt: nine directions on a 5° grid, each at least MIN_TURN from the
   last, every step's spread visibly different from the one before
   (SEE_RATIO) and its angle to the long axis at least SEE_ANGLE different. Each of the eight "larger or smaller?" answers is paired
   with whether the current spread is above or below the midpoint of the
   two eigenvalues — two of each of the four pairs, in a random order — so
   neither "it went up last time" nor "a low spread can only go up" beats
   a coin. A randomised depth-first search finds such a path. */
function huntPath(C, l1, l2, phi, seed) {
    const rng = createRng(seed * 13 + 5);
    const mid = (l1 + l2) / 2;
    const level = (a) => (spreadAt(C, a) > mid ? 'H' : 'L');
    const angles = Array.from({ length: 180 / GRID }, (_, i) => i * GRID);
    const follows = { LU: 'HL', LD: 'L', HU: 'H', HD: 'HL' };
    for (let attempt = 0; attempt < 60; attempt++) {
        let combos = null;
        for (let t = 0; t < 500 && !combos; t++) {
            const c = rng.shuffle(['LU', 'LU', 'LD', 'LD', 'HU', 'HU', 'HD', 'HD']);
            if (c.every((x, i) => i === 0 || follows[c[i - 1]].includes(x[0]))) combos = c;
        }
        if (!combos) continue;
        const path = [];
        let budget = 3000;
        const ok = (prev, next, i) => {
            const a = spreadAt(C, prev), b = spreadAt(C, next);
            const up = combos[i][1] === 'U';
            return lineGap(prev, next) >= MIN_TURN && !path.includes(next)
                && Math.abs(lineGap(next, phi) - lineGap(prev, phi)) >= SEE_ANGLE
                && (up ? b > a * SEE_RATIO : a > b * SEE_RATIO)
                && (i + 1 >= HUNT || level(next) === combos[i + 1][0]);
        };
        const dfs = (i) => {
            if (--budget < 0) return false;
            if (i === HUNT) return true;
            for (const next of rng.shuffle([...angles])) {
                if (!ok(path[i], next, i)) continue;
                path.push(next);
                if (dfs(i + 1)) return true;
                path.pop();
            }
            return false;
        };
        for (const start of rng.shuffle(angles.filter(a => level(a) === combos[0][0]))) {
            path.length = 0;
            path.push(start);
            if (dfs(0)) return { path: [...path], combos };
        }
    }
    return null;
}

/* "The top component carries the most useful information": two classes,
   GAP apart in a random direction, inside clouds like the tour's. How
   often does a single threshold on PC1 beat one on PC2? */
function bestThreshold(z, y) {
    const idx = z.map((_, i) => i).sort((a, b) => z[a] - z[b]);
    const ones = y.reduce((s, v) => s + v, 0);
    let best = 0, leftOnes = 0;
    for (let k = 0; k <= z.length; k++) {
        if (k > 0) leftOnes += y[idx[k - 1]];
        const acc = (k - leftOnes + (ones - leftOnes)) / z.length;
        best = Math.max(best, acc, 1 - acc);
    }
    return best;
}
function labelled(seed, gapAngle, tilt, stretch = LONG / THIN) {
    const rng = createRng(seed);
    const [c, s] = dir(tilt), [gc, gs] = dir(gapAngle);
    const thin = LONG / stretch;
    const X = [], y = [];
    for (let k = 0; k < 2; k++) {
        for (let i = 0; i < PER_CLASS; i++) {
            const a = rng.normal(0, LONG), b = rng.normal(0, thin), h = (k ? 0.5 : -0.5) * GAP;
            X.push([c * a - s * b + h * gc, s * a + c * b + h * gs]);
            y.push(k);
        }
    }
    return { X, y };
}
function labelStudy(runs = STUDY_RUNS) {
    let pc1Better = 0, sum1 = 0, sum2 = 0;
    for (let r = 1; r <= runs; r++) {
        const rng = createRng(r * 101);
        const { X, y } = labelled(r * 977 + 1, rng.next() * 180, rng.next() * 180);
        const P = analyse(X);
        const a1 = bestThreshold(P.projected.map(p => p[0]), y), a2 = bestThreshold(P.projected.map(p => p[1]), y);
        if (a1 > a2) pc1Better++;
        sum1 += a1; sum2 += a2;
    }
    return { runs, pc1Better, acc1: sum1 / runs, acc2: sum2 / runs };
}

const generateSteps = (seed) => {
    const steps = [];
    const V = cloud(seed, tourTilt(seed));
    const A = analyse(V);
    const Vc = centred(V, A.mean);
    const [l1, l2] = A.lams;
    const [v1, v2] = A.comps;
    const phi = angleOf(v1);
    const hunt = huntPath(A.C, l1, l2, phi, seed);
    const s = (act, extra) => steps.push({ act, actName: ACTS[act - 1].label, A, phi, data: Vc, ...extra });

    s(1, {
        data: V, raw: true,
        explanation: `${N} points with two features, x₁ and x₂, and no labels. Their mean is (${f(A.mean[0])}, ${f(A.mean[1])}). Spread is measured by variance: ${f(A.C[0][0], 3)} along x₁ and ${f(A.C[1][1], 3)} along x₂, ${f(A.total, 3)} in total. PCA asks which direction holds the most of it.`,
    });
    s(1, {
        cov: true,
        explanation: `First subtract the mean, so the cloud sits on the origin. The covariance matrix C collects the spread: its diagonal holds the two variances, and the off-diagonal ${f(A.C[0][1], 3)} is ${A.C[0][1] > 0 ? 'positive — x₁ and x₂ tend to rise together' : 'negative — as x₁ rises, x₂ tends to fall'}. The spread in any direction can be worked out from these numbers.`,
    });

    const tried = [];
    if (hunt) {
        hunt.path.forEach((a, i) => {
            const v = spreadAt(A.C, a);
            tried.push({ a, v });
            const best = tried.reduce((p, q) => (q.v > p.v ? q : p));
            const cand = i < HUNT ? hunt.path[i + 1] : undefined;
            const next = cand !== undefined ? ` Next try: the dashed line at ${deg(cand)}.` : ` That makes ${tried.length} directions tried.`;
            s(2, {
                u: a, feet: true, cand, tried: [...tried], spread: v,
                explanation: i === 0
                    ? `Pick a direction u — here ${deg(a)} from the x₁ axis — and drop every point straight onto the line through it. The variance of those ${N} shadows is the spread along u, uᵀCu = ${f(v, 3)}. The aim is the direction where it is largest.${next}`
                    : `At ${deg(a)} the spread is ${f(v, 3)}, ${v > tried[i - 1].v ? 'more' : 'less'} than the ${f(tried[i - 1].v, 3)} before. Best so far: ${f(best.v, 3)} at ${deg(best.a)}.${next}`,
            });
        });
    }

    const best = tried.length ? tried.reduce((p, q) => (q.v > p.v ? q : p)) : null;
    const miss = best ? Math.round(lineGap(best.a, phi)) : 0;
    s(3, {
        u: phi, curve: true, tried, pcs: 1,
        explanation: `Every direction at once: the curve is the spread for every angle. It peaks at ${deg(phi)} with ${f(l1, 3)}${best ? ` — the best of the ${tried.length} tries (${deg(best.a)}, ${f(best.v, 3)}) was ${miss === 0 ? 'within a degree of it' : `${miss}° off`}` : ''}. The direction of that peak is the first principal component, v₁.`,
    });
    const Cv = matVec(A.C, v1);
    s(3, {
        u: phi, curve: true, tried, pcs: 1, eig: true,
        explanation: `Why an eigenvector: multiply C by v₁ = (${f(v1[0], 3)}, ${f(v1[1], 3)}) and you get (${f(Cv[0], 3)}, ${f(Cv[1], 3)}) — the same direction, ${f(l1, 3)} times as long. So Cv₁ = λ₁v₁, and the eigenvalue λ₁ is exactly the spread along v₁. Any other direction comes back turned, except the one at right angles.`,
    });
    s(3, {
        u: phi, curve: true, tried, pcs: 2, trace: true,
        explanation: `That one is the second component v₂, at ${deg((phi + 90) % 180)}, where the curve bottoms out at λ₂ = ${f(l2, 3)}. The eigenvalues add up to the total variance, the sum of C's diagonal: ${f(l1, 3)} + ${f(l2, 3)} = ${f(l1 + l2, 3)}. v₁ alone carries ${pct(l1 / A.total)} of it.`,
    });

    const z = Vc.map(p => dot(p, v1));
    const resid = Vc.reduce((acc, p, i) => acc + (p[0] - z[i] * v1[0]) ** 2 + (p[1] - z[i] * v1[1]) ** 2, 0);
    s(4, {
        u: phi, pcs: 1, flatten: true, resid,
        explanation: `Keep only v₁: replace each point by its shadow on the v₁ line. Every point moves at right angles to the line, and the squared distances moved add up to ${f(resid, 3)} — which is (n − 1)λ₂ = ${N - 1} × ${f(l2, 3)}. What is thrown away is exactly the spread along v₂; ${pct(l1 / A.total)} is kept.`,
    });
    s(4, {
        u: phi, pcs: 1, flatten: true, strip: z, resid,
        explanation: `Each point is now one number, z = v₁ · (x − x̄): ${z.slice(0, 4).map(v => f(v)).join(', ')}, and so on. The ${N} z's have variance ${f(sampleVar(z), 3)}, which is λ₁. Two columns became one: [${N}, 2] → [${N}, 1].`,
    });

    const W = cloud3(seed);
    const B = analyse(W);
    const kept2 = (B.lams[0] + B.lams[1]) / B.total;
    s(5, {
        scene: { W, B, arrows: 0, plane: false, flat: false },
        explanation: `Now ${N3} points in three dimensions. C is 3 × 3, with three eigenvectors at right angles to each other and variances ${B.lams.map(v => f(v, 3)).join(', ')}. Drag to turn the cloud: from most angles it looks like a blob, but edge-on it is nearly flat.`,
    });
    s(5, {
        scene: { W, B, arrows: 3, plane: true, flat: false },
        explanation: `v₁ (green) and v₂ (blue) span the plane the cloud nearly lies in; v₃ (pink) sticks out of it and carries only ${pct(B.explained[2])} of the variance. Keeping two components keeps ${pct(kept2)}.`,
    });
    s(5, {
        scene: { W, B, arrows: 2, plane: true, flat: true }, proj: B.projected,
        explanation: `Flatten onto that plane: [${N3}, 3] → [${N3}, 2]. The second picture is the new two-feature data, z₁ and z₂. ${pct(kept2)} of the spread survives, and the squared distances moved sum to (n − 1)λ₃ = ${f((N3 - 1) * B.lams[2], 3)}.`,
    });

    const Vu = V.map(p => [p[0], p[1] * UNIT_SCALE]);
    const U = analyse(Vu);
    const phiU = angleOf(U.comps[0]);
    s(6, {
        data: centred(Vu, U.mean), A2: U, u: phiU, pcs: 1, units: true,
        explanation: `Now record x₂ in centimetres instead of metres: every x₂ is multiplied by ${UNIT_SCALE}. The points are the same, but x₂'s variance grows ${UNIT_SCALE * UNIT_SCALE}-fold, to ${f(U.C[1][1], 2)}. v₁ swings from ${deg(phi)} to ${deg(phiU)} — ${Math.round(lineGap(phiU, 90))}° from the x₂ axis — and claims ${pct(U.explained[0])} of the variance. PCA follows whichever feature has the biggest numbers.`,
    });
    const S1 = analyse(standardise(V)), S2 = analyse(standardise(Vu));
    s(6, {
        data: standardise(Vu), A2: S2, u: angleOf(S2.comps[0]), pcs: 1, standard: true, same: angleOf(S1.comps[0]),
        explanation: `The fix: standardise first — subtract each feature's mean and divide by its standard deviation, so each has variance 1. Then the units stop mattering: in metres or in centimetres, v₁ lands at ${deg(angleOf(S1.comps[0]))} and keeps ${pct(S1.explained[0])}. (On standardised data C is the correlation matrix, so in two dimensions v₁ always sits at 45° or 135°.)`,
    });
    s(6, {
        data: Vc, u: phi, pcs: 2, done: true,
        explanation: 'Switch to Explore: drag u yourself and watch its spread on the curve, change the tilt and the stretch, measure x₂ in centimetres, colour the points by class, and flatten a 3D cloud of your own thickness.',
    });
    return steps;
};

/* ── predict ─────────────────────────────────────────────
   On each hunt step: will the dashed direction spread the shadows more or
   less than the current one? It is decided by the picture — which line
   runs closer to the cloud's long axis — and every candidate differs from
   the current spread by at least 15%, so the eye can tell. See huntPath
   for the balance. */
const predictFor = (step, next) => {
    if (step.cand === undefined || !next || next.spread === undefined) return null;
    const up = next.spread > step.spread;
    return {
        question: `Next try: the dashed line at ${deg(step.cand)}. Will its spread be larger or smaller than ${f(step.spread, 3)}?`,
        options: ['Larger', 'Smaller'],
        correct: up ? 0 : 1,
        because: `Along ${deg(step.cand)} it is ${f(next.spread, 3)}. That line is ${Math.round(lineGap(step.cand, step.phi))}° from the cloud's long axis; the current one is ${Math.round(lineGap(step.u, step.phi))}° from it.`,
    };
};

function formulaFor(step) {
    const C = (step.A2 ?? step.A).C;
    if (step.raw) return String.raw`\bar x = \tfrac{1}{${N}} \textstyle\sum_i x_i = (${tn(step.A.mean[0])},\ ${tn(step.A.mean[1])})`;
    if (step.cov) return String.raw`C = \tfrac{1}{n-1} X_c^\top X_c = ${texMatrix(C, 3)}`;
    if (step.scene) {
        const B = step.scene.B;
        return String.raw`\begin{gathered} C = ${texMatrix(B.C, 2)} \\ \lambda = ${B.lams.map(v => tn(v, 3)).join(',\\ ')}, \quad \tfrac{\lambda_1+\lambda_2}{\lambda_1+\lambda_2+\lambda_3} = ${tn(100 * (B.lams[0] + B.lams[1]) / B.total, 1)}\% \end{gathered}`;
    }
    if (step.standard) return String.raw`\tilde x_j = \frac{x_j - \bar x_j}{s_j}, \quad C = ${texMatrix(C, 3)}`;
    if (step.units) return String.raw`\operatorname{var}(${UNIT_SCALE}\,x_2) = ${UNIT_SCALE * UNIT_SCALE}\operatorname{var}(x_2) = ${tn(C[1][1], 2)}, \quad C = ${texMatrix(C, 2)}`;
    const [l1, l2] = step.A.lams;
    if (step.strip) return String.raw`z_i = v_1 \cdot (x_i - \bar x), \qquad \operatorname{var}(z) = \lambda_1 = ${tn(l1, 3)}`;
    if (step.flatten) return String.raw`\sum_i \|x_i - \hat x_i\|^2 = (n-1)\lambda_2 = ${N - 1} \times ${tn(l2, 3)} = ${tn(step.resid, 3)}, \qquad \text{kept} = \tfrac{\lambda_1}{\lambda_1+\lambda_2} = ${tn(100 * l1 / step.A.total, 1)}\%`;
    if (step.eig) {
        const v1 = step.A.comps[0];
        return String.raw`C v_1 = ${texMatrix(C, 3)} ${texMatrix([[v1[0]], [v1[1]]], 3)} = ${texMatrix(matVec(C, v1).map(x => [x]), 3)} = ${tn(l1, 3)}\, v_1`;
    }
    if (step.trace) return String.raw`\lambda_1 + \lambda_2 = ${tn(l1, 3)} + ${tn(l2, 3)} = ${tn(C[0][0], 3)} + ${tn(C[1][1], 3)} = \operatorname{tr} C`;
    if (step.curve) return String.raw`\max_{\|u\|=1} u^\top C u = \lambda_1 = ${tn(l1, 3)} \;\text{ at } ${Math.round(step.phi)}^\circ`;
    if (step.feet) {
        const a = Math.round(step.u);
        return String.raw`\begin{aligned} u^\top C u &= ${tn(C[0][0], 3)}\cos^2 ${a}^\circ + ${tn(C[1][1], 3)}\sin^2 ${a}^\circ \\ &\quad + 2(${tn(C[0][1], 3)})\cos ${a}^\circ \sin ${a}^\circ = ${tn(step.spread, 3)} \end{aligned}`;
    }
    return String.raw`C v = \lambda v, \qquad C = \tfrac{1}{n-1} X_c^\top X_c`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'What is the first principal component of a data set?',
        options: [
            'The direction along which the data varies the most',
            'The feature with the largest mean',
            'The direction that best separates the labels',
            'Always the x₁ axis',
        ],
        correct: 0,
        explanation: 'It is the unit vector u that maximises uᵀCu — the eigenvector of the covariance matrix with the largest eigenvalue. PCA never sees labels, so it need not separate classes at all.',
    },
    {
        question: 'One feature is re-recorded in centimetres instead of metres (×10), and PCA is run again without standardising. What happens?',
        options: [
            'Nothing — PCA does not depend on units',
            'v₁ swings towards that feature, because its variance grew 100-fold',
            'v₁ swings away from that feature',
            'Every eigenvalue grows 10-fold and the directions stay put',
        ],
        correct: 1,
        explanation: 'Multiplying a feature by 10 multiplies its variance by 100, and PCA chases variance. Standardising each feature to variance 1 first removes the dependence on units.',
    },
    {
        question: 'In Cv₁ = λ₁v₁, what does λ₁ measure?',
        options: ['The variance of the data along v₁', 'The length of v₁', 'The mean of the data', 'The angle of v₁'],
        correct: 0,
        explanation: 'v₁ has length 1, and v₁ᵀCv₁ = λ₁v₁ᵀv₁ = λ₁: the eigenvalue is the spread along its eigenvector. The eigenvalues add up to the total variance.',
    },
];

const codeExample = `import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(3)
t = np.radians(35)
R = np.array([[np.cos(t), -np.sin(t)], [np.sin(t), np.cos(t)]])
X = rng.normal(size=(40, 2)) * [1.4, 0.45] @ R.T + [0.8, 0.5]       # [40, 2]

C = np.cov(X, rowvar=False)                    # [2, 2], divides by n - 1
lam, V = np.linalg.eigh(C)                     # ascending order
print(lam[::-1].round(3), lam.sum().round(3), np.trace(C).round(3))
# [2.381 0.242] 2.623 2.623

p = PCA(2).fit(X)
print(p.explained_variance_ratio_.round(3))    # [0.908 0.092]
angle = lambda v: np.degrees(np.arctan2(v[1], v[0])) % 180
print(angle(p.components_[0]).round(1))        # 32.4

Xcm = X * [1, 10]                              # x2 in centimetres
print(angle(PCA(1).fit(Xcm).components_[0]).round(1))      # 83.5
Z = StandardScaler().fit_transform(Xcm)        # standardise first
print(PCA(2).fit(Z).explained_variance_ratio_.round(3))   # [0.894 0.106], as in metres`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the eigenvector and units acts, then retry.'}
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

const reach = (pts) => {
    const m = Math.max(...pts.flat().map(Math.abs));
    return Math.max(2, Math.ceil((m * 1.15) / (m > 6 ? 2 : 0.5)) * (m > 6 ? 2 : 0.5));
};

function CloudPlane({ pts, R, u, cand, feet, pcs, comps, lams, flatten, classes, onDragU, ariaLabel }) {
    const ud = u !== undefined ? dir(u) : null;
    const arm = R * 0.62;
    const grid = R > 6 ? Math.ceil(R / 5) : 1;
    return (
        <Plane2D xRange={[-R, R]} yRange={[-R, R]} grid={grid} ariaLabel={ariaLabel}>
            {ud && <Segment from={[-R * ud[0], -R * ud[1]]} to={[R * ud[0], R * ud[1]]} color={COL.u} width={1.5} opacity={0.7} />}
            {cand !== undefined && (() => { const c = dir(cand); return <Segment from={[-R * c[0], -R * c[1]]} to={[R * c[0], R * c[1]]} color={COL.cand} width={1.5} dashed />; })()}
            {(feet || flatten) && ud && pts.map((p, i) => {
                const t = dot(p, ud);
                return <Segment key={`r${i}`} from={p} to={[t * ud[0], t * ud[1]]} color={COL.u} width={1} opacity={0.35} />;
            })}
            {pts.map((p, i) => <Point key={i} at={p} r={3.5} color={classes ? COL.cls[classes[i]] : COL.pt} />)}
            {(feet || flatten) && ud && pts.map((p, i) => {
                const t = dot(p, ud);
                return <Point key={`f${i}`} at={[t * ud[0], t * ud[1]]} r={flatten ? 3.5 : 2.2} color={COL.u} />;
            })}
            {pcs >= 1 && comps && <Vector to={[comps[0][0] * 2 * Math.sqrt(lams[0]), comps[0][1] * 2 * Math.sqrt(lams[0])]} color={COL.pc1} label="v₁" />}
            {pcs >= 2 && comps && <Vector to={[comps[1][0] * 2 * Math.sqrt(lams[1]), comps[1][1] * 2 * Math.sqrt(lams[1])]} color={COL.pc2} label="v₂" />}
            {onDragU && ud && (
                <Vector to={[arm * ud[0], arm * ud[1]]} color={COL.u} label="u" onDrag={(p) => onDragU(angleOf(p))}
                    constrain={([x, y]) => { const n = Math.hypot(x, y) || 1; return [(arm * x) / n, (arm * y) / n]; }}
                    ariaLabel={`Drag u to turn the direction, now at ${Math.round(u)} degrees`} />
            )}
        </Plane2D>
    );
}

function SpreadChart({ C, tried, curve, phi, current, lams }) {
    const W = 420, H = 160, L = 40, B = 24, T = 10;
    const top = lams[0] * 1.12;
    const px = (a) => Math.round((L + (a / 180) * (W - L - 12)) * 100) / 100;
    const py = (v) => Math.round((T + (1 - v / top) * (H - T - B)) * 100) / 100;
    const path = Array.from({ length: 91 }, (_, i) => `${i ? 'L' : 'M'}${px(i * 2)},${py(spreadAt(C, i * 2))}`).join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Spread of the shadows against the angle of u">
            {[0, lams[0]].map((v, n) => <g key={n}><line x1={L} x2={W - 12} y1={py(v)} y2={py(v)} stroke="#1e293b" /><text x={L - 6} y={py(v) + 4} fontSize="10" textAnchor="end" fill="#64748b">{f(v, 2)}</text></g>)}
            {[0, 45, 90, 135, 180].map(a => <text key={a} x={px(a)} y={H - 6} fontSize="10" textAnchor="middle" fill="#64748b">{a}°</text>)}
            {curve && <path d={path} fill="none" stroke={COL.pc1} strokeWidth="2" />}
            {curve && phi !== undefined && <line x1={px(phi)} x2={px(phi)} y1={T} y2={H - B} stroke={COL.pc1} strokeDasharray="3 3" />}
            {tried && tried.map((t, i) => <circle key={i} cx={px(t.a)} cy={py(t.v)} r="4" fill={i === tried.length - 1 && !curve ? COL.u : '#94a3b8'} />)}
            {current !== undefined && <circle cx={px(current)} cy={py(spreadAt(C, current))} r="7" fill="none" stroke={COL.u} strokeWidth="2" />}
        </svg>
    );
}

function Strip({ z, classes, label, acc }) {
    const W = 420, H = 46;
    const m = Math.max(...z.map(Math.abs)) * 1.1 || 1;
    const px = (v) => Math.round((W / 2 + (v / m) * (W / 2 - 10)) * 100) / 100;
    return (
        <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-0.5"><span>{label}</span>{acc !== undefined && <span className="font-mono">best threshold {pct(acc)}</span>}</div>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${label}: each point as one number`}>
                <line x1="8" x2={W - 8} y1={H / 2} y2={H / 2} stroke="#334155" />
                {z.map((v, i) => <circle key={i} cx={px(v)} cy={H / 2 + (classes ? (classes[i] ? 7 : -7) : 0)} r="4" fill={classes ? COL.cls[classes[i]] : COL.u} opacity="0.85" />)}
            </svg>
        </div>
    );
}

function CloudScene({ W, B, arrows, plane, flat, height = 340 }) {
    const pts = flat
        ? B.projected.map(([a, b]) => [0, 1, 2].map(j => B.mean[j] + a * B.comps[0][j] + b * B.comps[1][j]))
        : W;
    const tip = (k) => B.comps[k].map((x, j) => B.mean[j] + x * 2 * Math.sqrt(Math.max(B.lams[k], 0.02)));
    const colors = [COL.pc1, COL.pc2, COL.pc3];
    return (
        <Scene3D height={height} distance={12} axisSize={4} ariaLabel="A cloud of points in three dimensions with its principal components"
            fallback={<p className="text-sm text-slate-300 font-mono">λ = {B.lams.map(v => f(v, 3)).join(', ')} · two components keep {pct((B.lams[0] + B.lams[1]) / B.total)}</p>}>
            {(P) => (
                <>
                    {pts.map((p, i) => <P.Point3D key={i} at={p} color="#e2e8f0" size={0.07} />)}
                    {plane && <P.Plane3D normal={B.comps[2]} point={B.mean} size={8} color={COL.pc1} opacity={0.14} />}
                    {[0, 1, 2].slice(0, arrows).map(k => <P.Arrow3D key={k} from={B.mean} to={tip(k)} color={colors[k]} />)}
                </>
            )}
        </Scene3D>
    );
}

/* ── explore ────────────────────────────────────────────── */

function Explore({ initialSeed }) {
    const [dim, setDim] = useState('2d');
    const [seed, setSeed] = useState(initialSeed);
    const [tilt, setTilt] = useState(tourTilt(initialSeed));
    const [stretch, setStretch] = useState(Math.round((LONG / THIN) * 10) / 10);
    const [u, setU] = useState(0);
    const [units, setUnits] = useState(1);
    const [standard, setStandard] = useState(false);
    const [classes, setClasses] = useState(false);
    const [showPcs, setShowPcs] = useState(false);
    const [thick, setThick] = useState(SPREAD3[2]);
    const [flat, setFlat] = useState(false);

    const { X, y } = useMemo(() => {
        const base = classes ? labelled(seed, tilt + 90, tilt, stretch) : { X: cloud(seed, tilt, stretch), y: null };
        let pts = base.X.map(p => [p[0], p[1] * units]);
        pts = standard ? standardise(pts) : centred(pts, covariance(pts).mean);
        return { X: pts, y: base.y };
    }, [seed, tilt, stretch, units, standard, classes]);
    const A = useMemo(() => analyse(X), [X]);
    const R = useMemo(() => reach(X), [X]);
    const phi = angleOf(A.comps[0]);
    const spread = spreadAt(A.C, u);
    const accs = useMemo(() => (y ? [0, 1].map(k => bestThreshold(A.projected.map(p => p[k]), y)) : null), [A, y]);
    const W3 = useMemo(() => cloud3(seed, thick), [seed, thick]);
    const B3 = useMemo(() => analyse(W3), [W3]);
    const [cu, su] = dir(u);
    const repair = () => { setUnits(1); setStandard(false); setClasses(false); };

    if (dim === '3d') {
        return (
            <div className="space-y-4">
                <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                    <DimToggle dim={dim} setDim={setDim} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div className="min-w-0"><CloudScene W={W3} B={B3} arrows={3} plane flat={flat} /></div>
                        <div className="min-w-0 space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                {B3.lams.map((v, k) => (
                                    <div key={k} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                        <div className="text-[10px] uppercase tracking-wide" style={{ color: [COL.pc1, COL.pc2, COL.pc3][k] }}>λ{['₁', '₂', '₃'][k]}</div>
                                        <div className="font-mono text-sm text-slate-100">{f(v, 3)}</div>
                                        <div className="text-[10px] text-slate-500">{pct(B3.explained[k])}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-slate-300">Two components keep <span className="font-mono text-lime-300">{pct((B3.lams[0] + B3.lams[1]) / B3.total)}</span> of the spread.</p>
                            <ParamSlider label="Thickness across the plane" value={thick} onChange={setThick} min={0.05} max={1.5} step={0.05} accent="lime" format={(v) => v.toFixed(2)} />
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setFlat(v => !v)} className={`text-xs px-3 py-1.5 rounded-lg border ${flat ? 'border-lime-500 text-lime-200 bg-lime-500/10' : 'border-slate-700 text-slate-300 hover:border-lime-500'}`}>{flat ? 'Unflatten' : 'Flatten onto v₁, v₂'}</button>
                                <button onClick={() => setSeed(randomSeed())} aria-label="New data" title="New data" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                            </div>
                            <div className="flex flex-wrap gap-1.5"><ShapeTag label="X" names={['n', 'd']} shape={[N3, 3]} /><ShapeTag label="C" shape={[3, 3]} />{flat && <ShapeTag label="Z" names={['n', 'k']} shape={[N3, 2]} />}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <DimToggle dim={dim} setDim={setDim} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="min-w-0">
                        <CloudPlane pts={X} R={R} u={u} feet pcs={showPcs ? 2 : 0} comps={A.comps} lams={A.lams} classes={y} onDragU={setU}
                            ariaLabel="The centred points, the direction u and the shadows of the points on it" />
                        <p className="text-xs text-slate-500 mt-2">Drag the tip of u (or focus it and use the arrow keys).</p>
                    </div>
                    <div className="min-w-0 space-y-3">
                        <SpreadChart C={A.C} curve phi={showPcs ? phi : undefined} current={u} lams={A.lams} />
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {[['spread along u', f(spread, 3)], ['λ₁ (the most)', f(A.lams[0], 3)], ['u is off v₁ by', deg(lineGap(u, phi))]].map(([label, val]) => (
                                <div key={label} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
                                    <div className="font-mono text-sm text-slate-100">{val}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setU(Math.round(phi * 10) / 10)} className="text-xs px-3 py-1.5 rounded-lg bg-lime-600 text-white hover:bg-lime-500">Snap u to v₁</button>
                            <button onClick={() => setShowPcs(v => !v)} className={`text-xs px-3 py-1.5 rounded-lg border ${showPcs ? 'border-lime-500 text-lime-200 bg-lime-500/10' : 'border-slate-700 text-slate-300 hover:border-lime-500'}`}>{showPcs ? 'Hide' : 'Show'} v₁ and v₂</button>
                        </div>
                        <div className="flex flex-wrap gap-1.5"><ShapeTag label="X" names={['n', 'd']} shape={[X.length, 2]} /><ShapeTag label="C" shape={[2, 2]} /></div>
                    </div>
                </div>
                {y && accs && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Strip z={A.projected.map(p => p[0])} classes={y} label="Shadows on v₁ (most spread)" acc={accs[0]} />
                        <Strip z={A.projected.map(p => p[1])} classes={y} label="Shadows on v₂ (least spread)" acc={accs[1]} />
                    </div>
                )}
                <div className="text-slate-100 text-sm overflow-x-auto">
                    <Tex block>{String.raw`u^\top C u = ${tn(A.C[0][0], 3)}(${tn(cu, 3)})^2 + 2(${tn(A.C[0][1], 3)})(${tn(cu, 3)})(${tn(su, 3)}) + ${tn(A.C[1][1], 3)}(${tn(su, 3)})^2 = ${tn(spread, 3)}`}</Tex>
                </div>
            </div>
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ParamSlider label="Tilt of the cloud" value={tilt} onChange={setTilt} min={0} max={175} step={5} accent="lime" format={(v) => `${v}°`} />
                    <ParamSlider label="Stretch (long ÷ thin)" value={stretch} onChange={setStretch} min={1} max={6} step={0.1} accent="lime" format={(v) => `${v.toFixed(1)}×`} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setSeed(randomSeed())} aria-label="New data" title="New data" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                    <button onClick={() => setStandard(v => !v)} className={`text-xs px-3 py-1.5 rounded-lg border ${standard ? 'border-lime-500 text-lime-200 bg-lime-500/10' : 'border-slate-700 text-slate-300 hover:border-lime-500'}`}>Standardise each feature</button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => setUnits(UNIT_SCALE)} disabled={units === UNIT_SCALE}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">x₂ in centimetres (×{UNIT_SCALE})</button>
                    <button onClick={() => { setClasses(true); setShowPcs(true); }} disabled={classes}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">Two classes, split across the thin direction</button>
                    <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
                {units === UNIT_SCALE && !standard && (
                    <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                        Same points, x₂ in centimetres: its variance is now {f(A.C[1][1], 2)} against {f(A.C[0][0], 2)} for x₁, so v₁ sits {deg(lineGap(phi, 90))} from the x₂ axis and claims {pct(A.explained[0])}. Standardise each feature to undo it.
                    </p>
                )}
                {y && accs && (
                    <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                        The classes are {GAP} apart across the thin direction. Keep only v₁ and a threshold sorts {pct(accs[0])} correctly; keep only v₂ — the component PCA ranks last — and it sorts {pct(accs[1])}. PCA never looks at the labels.
                    </p>
                )}
            </div>
        </div>
    );
}

function DimToggle({ dim, setDim }) {
    return (
        <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-950" role="tablist" aria-label="Dimensions">
            {[['2d', 'Two features'], ['3d', 'Three features']].map(([key, label]) => (
                <button key={key} role="tab" aria-selected={dim === key} onClick={() => setDim(key)}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors ${dim === key ? 'bg-lime-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{label}</button>
            ))}
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function PrincipalComponentAnalysisPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const stepHistory = useMemo(() => generateSteps(seed), [seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1800);
    const [explore, setExplore] = useState({ seed, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [study, setStudy] = useState(null);
    useEffect(() => { const t = setTimeout(() => setStudy(labelStudy()), 60); return () => clearTimeout(t); }, []);

    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
    const R = useMemo(() => reach([...stepHistory[0].data, ...stepHistory[1].data]), [stepHistory]);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(stepHistory.findIndex(s => s.act === act)); };
    const toExplore = () => { setExplore(e => ({ seed, key: e.key + 1 })); setMode('explore'); setIsPlaying(false); };
    const S = step.A2 ?? step.A;
    const planeR = step.units || step.standard ? reach(step.data) : R;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/machine-learning" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Machine Learning
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Principal Component Analysis</h1>
                    <p className="text-lime-50 max-w-3xl">
                        Hunt for the direction a cloud of points spreads most, find that it is an eigenvector of the covariance matrix, and flatten the data onto it — in two dimensions and in three. Then watch a change of units fool it.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/80">Builds on</span>
                        {[['Eigenvectors and Eigenvalues', '/linear-algebra/eigenvectors-and-eigenvalues'], ['Random Variables and Expectation', '/probability-and-statistics/random-variables-and-expectation'], ['Change of Basis', '/linear-algebra/change-of-basis']].map(([name, href]) => (
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
                        <SourceChip kind="live">PCA computed in your browser · seeded synthetic clouds</SourceChip>
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
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start min-h-[340px]">
                                        <div className="min-w-0">
                                            {step.scene
                                                ? <CloudScene {...step.scene} />
                                                : <CloudPlane pts={step.data} R={planeR} u={step.u} cand={step.cand} feet={step.feet} flatten={step.flatten} pcs={step.pcs ?? 0} comps={S.comps} lams={S.lams}
                                                    ariaLabel="The points, the direction u and the shadows of the points on it" />}
                                        </div>
                                        <div className="min-w-0 space-y-3">
                                            {step.proj ? (
                                                <CloudPlane pts={step.proj} R={reach(step.proj)} ariaLabel="The flattened data: each point as two numbers z₁ and z₂" />
                                            ) : (step.feet || step.curve || step.flatten) ? (
                                                <SpreadChart C={step.A.C} tried={step.tried} curve={step.curve || step.flatten} phi={step.feet ? undefined : step.phi} lams={step.A.lams}
                                                    current={step.feet ? step.u : undefined} />
                                            ) : null}
                                            {step.flatten && (
                                                <div className="grid grid-cols-2 gap-2 text-center">
                                                    {[['kept: λ₁', pct(step.A.lams[0] / step.A.total)], ['thrown away: λ₂', pct(step.A.lams[1] / step.A.total)]].map(([label, val]) => (
                                                        <div key={label} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                                            <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
                                                            <div className="font-mono text-sm text-slate-100">{val}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {step.strip && <Strip z={step.strip} label="z = v₁ · (x − x̄), one number per point" />}
                                            {step.scene && (
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    {step.scene.B.lams.map((v, k) => (
                                                        <div key={k} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                                            <div className="text-[10px] uppercase tracking-wide" style={{ color: [COL.pc1, COL.pc2, COL.pc3][k] }}>λ{['₁', '₂', '₃'][k]}</div>
                                                            <div className="font-mono text-sm text-slate-100">{f(v, 3)}</div>
                                                            <div className="text-[10px] text-slate-500">{pct(step.scene.B.explained[k])}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {step.spread !== undefined && (
                                                <div className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2 text-center">
                                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">spread along u at {deg(step.u)}</div>
                                                    <div className="font-mono text-sm text-slate-100">{f(step.spread, 3)}</div>
                                                </div>
                                            )}
                                            {(step.units || step.standard) && (
                                                <div className="grid grid-cols-2 gap-2 text-center">
                                                    {[['v₁ at', deg(step.u)], ['v₁ keeps', pct(S.explained[0])]].map(([label, val]) => (
                                                        <div key={label} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2">
                                                            <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
                                                            <div className="font-mono text-sm text-slate-100">{val}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-1.5">
                                                {step.scene
                                                    ? <><ShapeTag label="X" names={['n', 'd']} shape={[N3, 3]} /><ShapeTag label="C" shape={[3, 3]} />{step.proj && <ShapeTag label="Z" names={['n', 'k']} shape={[N3, 2]} />}</>
                                                    : <><ShapeTag label="X" names={['n', 'd']} shape={[N, 2]} /><ShapeTag label="C" shape={[2, 2]} />{step.strip && <ShapeTag label="z" names={['n', 'k']} shape={[N, 1]} />}</>}
                                            </div>
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

                    <InCode title="The same steps in NumPy and scikit-learn" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">PCA in four lines</h2>
                        <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                            <li><span className="text-slate-200">Centre</span> — subtract each feature&apos;s mean.</li>
                            <li><span className="text-slate-200">Covariance</span> — C = XᵀX / (n − 1).</li>
                            <li><span className="text-slate-200">Eigenvectors</span> — Cv = λv, sorted by λ.</li>
                            <li><span className="text-slate-200">Project</span> — keep the top k: Z = X [v₁ … v_k].</li>
                        </ol>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;The top component keeps the most useful information.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            {study
                                ? <>It keeps the most <em>spread</em>, which is not the same thing. On {study.runs} clouds like the tour&apos;s, split into two classes {GAP} apart in a random direction, a single threshold on v₁ told the classes apart better than one on v₂ in only {study.pc1Better} — on average {pct(study.acc1)} correct against {pct(study.acc2)}. PCA never sees the labels.</>
                                : `Measuring ${STUDY_RUNS} labelled clouds…`}
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
