"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, SlidersHorizontal, Shuffle,
    Footprints, Wind, Scale, Combine, Flag, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench,
    Map as MapIcon, Box, ChartLine,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import Tex from '@/components/math/Tex';
import Plane2D, { Point, Vector, usePlane } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import TrainingCurve from '@/components/ml/TrainingCurve';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the ravine ────────────────────────────────────────────
   f(x, y) = 0.01x² + 2y²: curvature 0.02 along x and 4 across y, 200 times
   more. Its steep and shallow directions are exactly the axes. The turned
   version is the same valley rotated 45°: f evaluated at the point turned
   back, so a start turned with it sits at the same height. */
const A = 0.01, B = 2;
const C45 = Math.SQRT1_2;
const turn = ([x, y]) => [C45 * x - C45 * y, C45 * x + C45 * y];
const unturn = ([x, y]) => [C45 * x + C45 * y, -C45 * x + C45 * y];
const SURFACES = {
    aligned: { f: ([x, y]) => A * x * x + B * y * y, grad: ([x, y]) => [2 * A * x, 2 * B * y] },
    turned: {
        f: (p) => { const [u, w] = unturn(p); return A * u * u + B * w * w; },
        grad: (p) => { const [u, w] = unturn(p); const gu = 2 * A * u, gw = 2 * B * w; return [C45 * gu - C45 * gw, C45 * gu + C45 * gw]; },
    },
};

const OPTIMIZERS = [
    { key: 'sgd', name: 'SGD', color: '#38bdf8', accent: 'sky' },
    { key: 'momentum', name: 'Momentum', color: '#fb923c', accent: 'orange' },
    { key: 'rmsprop', name: 'RMSProp', color: '#a3e635', accent: 'lime' },
    { key: 'adam', name: 'Adam', color: '#e879f9', accent: 'fuchsia' },
];
const COLOR = Object.fromEntries(OPTIMIZERS.map(o => [o.key, o.color]));
const NAME = Object.fromEntries(OPTIMIZERS.map(o => [o.key, o.name]));
const PROSE = { sgd: 'SGD', momentum: 'momentum', rmsprop: 'RMSProp', adam: 'Adam' };
const DEFAULTS = {
    sgd: { lr: 0.45 },
    momentum: { lr: 0.15, mu: 0.9 },
    rmsprop: { lr: 0.03, beta: 0.99 },
    adam: { lr: 0.1, beta1: 0.9, beta2: 0.999 },
};
const EPS = 1e-8;
const TOL = 1e-3;          // the floor: a loss under this…
const STAY = 50;           // …for this many steps in a row, so a swing passing through it does not count
const HORIZON = 600;       // the latest step a run may reach the floor at
const LONG = 1200;         // every run goes this far, to see which ones stay on the floor
const BOX = 4;            // a path that leaves [−4, 4]² is drawn up to the edge only

/** One optimizer from `start`: state 0 is the start, state t follows update t. Each state holds the
    point, the gradient there, the optimizer's buffers after the update and the move that got there.
    The update rules are torch.optim's (SGD with momentum, RMSprop, Adam). */
function descend(key, hp, start, steps, surface = 'aligned') {
    const S = SURFACES[surface];
    let p = [...start];
    const m = [0, 0], v = [0, 0];
    const out = [{ t: 0, p: [...p], g: S.grad(p), m: [0, 0], v: [0, 0], mh: [0, 0], vh: [0, 0], move: [0, 0], loss: S.f(p) }];
    for (let t = 1; t <= steps; t++) {
        const g = out[t - 1].g;
        const move = [0, 0], mh = [0, 0], vh = [0, 0];
        for (let i = 0; i < 2; i++) {
            if (key === 'sgd') move[i] = -hp.lr * g[i];
            else if (key === 'momentum') { m[i] = hp.mu * m[i] + g[i]; move[i] = -hp.lr * m[i]; }
            else if (key === 'rmsprop') { v[i] = hp.beta * v[i] + (1 - hp.beta) * g[i] * g[i]; move[i] = (-hp.lr * g[i]) / (Math.sqrt(v[i]) + EPS); }
            else {
                m[i] = hp.beta1 * m[i] + (1 - hp.beta1) * g[i];
                v[i] = hp.beta2 * v[i] + (1 - hp.beta2) * g[i] * g[i];
                mh[i] = m[i] / (1 - hp.beta1 ** t);
                vh[i] = v[i] / (1 - hp.beta2 ** t);
                move[i] = (-hp.lr * mh[i]) / (Math.sqrt(vh[i]) + EPS);
            }
        }
        p = [p[0] + move[0], p[1] + move[1]];
        if (!(Math.abs(p[0]) < 1e6 && Math.abs(p[1]) < 1e6)) break;
        out.push({ t, p, g: S.grad(p), m: [...m], v: [...v], mh, vh, move, loss: S.f(p) });
    }
    return out;
}

/** The first step, at most HORIZON, from which the loss stays under TOL for STAY steps in a row:
    when the run reaches the floor. null if it never does (or blew up first). */
function reachStep(trace) {
    let run = 0;
    for (let k = 0; k < trace.length; k++) {
        run = trace[k].loss < TOL ? run + 1 : 0;
        if (run === STAY) return k - STAY + 1 <= HORIZON ? k - STAY + 1 : null;
    }
    return null;
}

/** The first step after reaching the floor at which the loss is back at TOL or above; null if the
    run stays on the floor for as long as it was run. */
function leaveStep(trace, reach) {
    if (reach === null) return null;
    for (let k = reach; k < trace.length; k++) if (trace[k].loss >= TOL) return k;
    return null;
}

/** The part of a path inside the drawing box (a run that blows up is cut where it leaves). */
function visible(points) {
    const out = [];
    for (const p of points) {
        if (Math.abs(p[0]) > BOX || Math.abs(p[1]) > BOX) break;
        out.push(p);
    }
    return out;
}

/* ── numbers ───────────────────────────────────────────── */

const numD = (v, d) => {
    const s = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(/\.?0+$/, '');
    return (s === '-0' ? '0' : s).replace('-', '−');
};
const num = (v) => numD(v, 4);
/** Small buffers (v starts near 10⁻⁵) keep three significant digits instead of rounding to 0. */
const sig = (v) => {
    const a = Math.abs(v);
    if (a === 0 || a >= 0.01) return num(v);
    return numD(v, Math.min(9, 2 - Math.floor(Math.log10(a))));
};
const pn = (v) => (v < 0 ? `(${num(v)})` : num(v));
const pt = ([x, y], f = num) => `(${f(x)}, ${f(y)})`;
const tex = (s) => s.replace(/−/g, '-');
const tpt = (p, f = num) => tex(`\\left(${f(p[0])},\\ ${f(p[1])}\\right)`);
const reachText = (s) => (s === null ? `not within ${HORIZON} steps` : `at step ${s}`);
const dir = (dy) => (dy > 0 ? 'up' : 'down');

/* ── the guided tour ───────────────────────────────────────
   Each tour starts the four optimizers from one seeded point and runs them
   at the defaults. The prompt sits in the momentum act, on a step where the
   velocity carried over and the push from the slope disagree about y; one
   such step per tour is asked. Across y the motion is linear in the start,
   so these clashes always fall on the same steps (2, 3, 6 and 7): the
   velocity wins the first and third, the push the second and fourth, and
   the start's sign decides up or down. Picking one at random keeps both
   "follow the velocity" and "follow the slope" at a coin toss. */
const TOUR_STEPS = { sgd: 3, momentum: 8, rmsprop: 3, adam: 3 };

function tourOf(seed) {
    const rng = createRng(seed * 31 + 7);
    const sx = rng.pick([-1, 1]), sy = rng.pick([-1, 1]);
    const start = [(sx * rng.int(20, 27)) / 10, (sy * rng.int(4, 12)) / 10];
    const traces = Object.fromEntries(OPTIMIZERS.map(o => [o.key, descend(o.key, DEFAULTS[o.key], start, LONG)]));
    const clashes = [];
    for (let k = 1; k < TOUR_STEPS.momentum; k++) {
        const s = traces.momentum[k];
        if (s.m[1] * s.g[1] < 0) clashes.push(k);
    }
    const reach = Object.fromEntries(OPTIMIZERS.map(o => [o.key, reachStep(traces[o.key])]));
    const leave = Object.fromEntries(OPTIMIZERS.map(o => [o.key, leaveStep(traces[o.key], reach[o.key])]));
    return { start, traces, reach, leave, clashes, askAt: clashes.length ? rng.pick(clashes) : null };
}

const DEFAULT_SEED = 163;     // starts at (−2.6, 1.1), the snippet's point; asks at the first overshoot

const ACTS = [
    { id: 1, label: 'SGD', icon: Footprints },
    { id: 2, label: 'Momentum', icon: Wind },
    { id: 3, label: 'RMSProp', icon: Scale },
    { id: 4, label: 'Adam', icon: Combine },
    { id: 5, label: 'The race', icon: Flag },
];

const pathOf = (trace, upto) => trace.slice(0, upto + 1).map(s => s.p);

function generateSteps(seed) {
    const T = tourOf(seed);
    const { start, traces: tr, reach, leave } = T;
    const onFloor = (keys) => keys.map(k => `${NAME[k]} ${reachText(reach[k])}`).join(', ');
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, state: data.opt ? tr[data.opt][data.k] : null, explanation });
    const g0 = tr.sgd[0].g;
    const faded = (keys, upto = 60) => keys.map(key => ({ key, upto, faded: true }));

    /* Act 1: SGD */
    s(1, 'SGD', {
        kind: 'intro', opt: null, paths: [], current: [], arrows: [],
        tex: tex(String.raw`\begin{gathered} f(x, y) = 0.01x^2 + 2y^2 \\ \nabla f = (0.02x,\ 4y) = ${tpt(g0)} \end{gathered}`),
    }, `A loss shaped like a ravine: f(x, y) = 0.01x² + 2y², steep across y (curvature 4) and almost flat along x (curvature 0.02, 200 times less). The minimum is at (0, 0). All four optimizers start at ${pt(start)}, loss ${num(tr.sgd[0].loss)}, where the gradient is ${pt(g0)}: ${Math.round(Math.abs(g0[1] / g0[0]))} times more of it points across the ravine than along it.`);
    for (let k = 1; k <= TOUR_STEPS.sgd; k++) {
        const a = tr.sgd[k - 1], b = tr.sgd[k];
        const note = k === 1
            ? ` y overshoots the floor to the other wall: every step multiplies y by 1 − 0.45 × 4 = −0.8, and x by only 1 − 0.45 × 0.02 = 0.991.`
            : k === 2 ? ' Back across the floor, 0.8 times as far out.' : ` Three steps in, x has moved ${num(b.p[0] - start[0])} in total.`;
        s(1, 'SGD', {
            kind: 'sgd', opt: 'sgd', k, paths: [{ key: 'sgd', upto: k }], current: ['sgd'], arrows: [],
            tex: tex(String.raw`\begin{gathered} \theta_${k} = \theta_${k - 1} - \eta\,\nabla f(\theta_${k - 1}) \\ = ${tpt(a.p)} - 0.45\,${tpt(a.g)} = ${tpt(b.p)} \end{gathered}`),
        }, `SGD step ${k}: θ moves by −η∇f with η = 0.45, so x moves ${num(b.move[0])} and y moves ${num(b.move[1])}.${note} Now at ${pt(b.p)}, loss ${num(b.loss)}.`);
    }
    const sgd60 = tr.sgd[60];
    s(1, 'SGD', {
        kind: 'summary', opt: 'sgd', k: 60, paths: [{ key: 'sgd', upto: 60 }], current: ['sgd'], arrows: [],
        tex: tex(String.raw`x_{60} = ${num(start[0])} \times 0.991^{60} = ${num(sgd60.p[0])} \qquad \text{on the floor from step } ${reach.sgd ?? '-'}`),
    }, `After 60 steps the zig-zag across y has died down (y = ${sig(sgd60.p[1])}), but x is still at ${num(sgd60.p[0])}. Call a run on the floor once its loss stays under 0.001 (inside the dashed yellow ring) for 50 steps in a row: SGD gets there ${reachText(reach.sgd)}. A bigger η would speed x up, but y's factor 1 − 4η leaves (−1, 1) at η = 0.5: the steep direction caps the learning rate for both.`);

    /* Act 2: momentum */
    const M = DEFAULTS.momentum;
    const arrowsAt = (st) => {
        const carry = [-M.lr * M.mu * st.m[0], -M.lr * M.mu * st.m[1]];
        const push = [-M.lr * st.g[0], -M.lr * st.g[1]];
        const list = [];
        if (st.t > 0) list.push({ from: st.p, to: [st.p[0] + carry[0], st.p[1] + carry[1]], color: COLOR.momentum, label: 'carry' });
        list.push({ from: st.p, to: [st.p[0] + push[0], st.p[1] + push[1]], color: '#e2e8f0', label: 'push' });
        return list;
    };
    s(2, 'Momentum', {
        kind: 'idea', opt: 'momentum', k: 0, paths: faded(['sgd']), current: [], arrows: arrowsAt(tr.momentum[0]),
        tex: String.raw`\begin{gathered} m \leftarrow \mu m + \nabla f(\theta) \qquad \theta \leftarrow \theta - \eta\, m \\ \mu = 0.9,\ \eta = 0.15 \end{gathered}`,
    }, 'Momentum keeps a velocity m. Each step adds the gradient to 0.9 times the old velocity, m ← 0.9m + ∇f, then moves θ ← θ − 0.15m. A gradient that keeps its sign piles up: m heads for ∇f / (1 − 0.9), ten times the gradient. One that flips sign each step mostly cancels. SGD\'s first 60 steps stay faded on the map for comparison.');
    for (let k = 1; k <= TOUR_STEPS.momentum; k++) {
        const a = tr.momentum[k - 1], b = tr.momentum[k];
        let note = '';
        if (k === 1) note = ' The two arrows at the ball are the next step\'s parts: the velocity carried over, −0.15 × 0.9 × m (orange), and the push from the slope here, −0.15 × ∇f (white). Their sum is the next move.';
        else if (a.m[1] * a.g[1] < 0) note = Math.sign(b.m[1]) === Math.sign(a.m[1])
            ? ` The carried velocity beat the push: y kept going ${dir(b.move[1])}.`
            : ` The push beat the carried velocity: y turned ${dir(b.move[1])}.`;
        if (b.m[1] * b.g[1] < 0) note += ' Now the two arrows disagree about y.';
        s(2, 'Momentum', {
            kind: 'mom', opt: 'momentum', k, paths: [...faded(['sgd']), { key: 'momentum', upto: k }], current: ['momentum'], arrows: arrowsAt(b),
            ask: T.askAt === k, clash: b.m[1] * b.g[1] < 0,
            tex: tex(String.raw`\begin{gathered} m_${k} = 0.9\, m_${k - 1} + \nabla f(\theta_${k - 1}) \\ = 0.9\,${tpt(a.m)} + ${tpt(a.g)} \\ = ${tpt(b.m)} \\ \theta_${k} = \theta_${k - 1} - 0.15\, m_${k} = ${tpt(b.p)} \end{gathered}`),
        }, `Step ${k}: m = 0.9 × ${pt(a.m)} + ${pt(a.g)} = ${pt(b.m)}, so θ moves by −0.15 × m = ${pt(b.move)} to ${pt(b.p)}, loss ${num(b.loss)}.${note}`);
    }
    const mom60 = tr.momentum[60], ten = tr.momentum[10], sgdTen = tr.sgd[10];
    s(2, 'Momentum', {
        kind: 'summary', opt: 'momentum', k: 60, paths: [...faded(['sgd']), { key: 'momentum', upto: 60 }], current: ['momentum'], arrows: [],
        tex: tex(String.raw`\text{after 10 steps: } |\Delta x| = ${num(Math.abs(ten.p[0] - start[0]))} \text{ (momentum) vs } ${num(Math.abs(sgdTen.p[0] - start[0]))} \text{ (SGD)}`),
    }, `Along x the gradient never changed sign, so the velocity built up: by step 10, m_x was ${numD(ten.m[0] / ten.g[0], 1)} times the gradient there and x had covered ${num(Math.abs(ten.p[0] - start[0]))}, against SGD's ${num(Math.abs(sgdTen.p[0] - start[0]))}. Across y the overshoots cancel and shrink. After 60 steps momentum is at ${pt(mom60.p)}, loss ${sig(mom60.loss)}. On the floor: ${onFloor(['momentum', 'sgd'])}.`);

    /* Act 3: RMSProp */
    s(3, 'RMSProp', {
        kind: 'idea', opt: 'rmsprop', k: 0, paths: faded(['sgd', 'momentum']), current: [], arrows: [],
        tex: String.raw`\begin{gathered} v \leftarrow \beta v + (1 - \beta)\,(\nabla f)^2 \qquad \theta \leftarrow \theta - \eta\, \frac{\nabla f}{\sqrt{v} + \varepsilon} \\ \beta = 0.99,\ \eta = 0.03 \end{gathered}`,
    }, 'RMSProp gives each coordinate its own step size. It keeps a running average of each coordinate\'s squared gradient, v ← 0.99v + 0.01(∇f)², and divides that coordinate\'s gradient by √v before stepping: θ ← θ − 0.03 ∇f / (√v + ε). A coordinate with big gradients takes small steps; one with small gradients takes big ones.');
    for (let k = 1; k <= TOUR_STEPS.rmsprop; k++) {
        const a = tr.rmsprop[k - 1], b = tr.rmsprop[k];
        const note = k === 1
            ? ` On the first step v = 0.01(∇f)², so √v = 0.1|∇f| and every coordinate moves 0.03 / 0.1 = 0.3, whatever its gradient: x moves as far as y although its gradient is ${Math.round(Math.abs(a.g[1] / a.g[0]))} times smaller.`
            : ` x moves ${num(Math.abs(b.move[0]))} and y ${num(Math.abs(b.move[1]))}: ${Math.abs(b.move[0]) > Math.abs(b.move[1]) ? 'the flat direction is now taking the bigger steps' : 'the steep direction takes the bigger step'}.`;
        s(3, 'RMSProp', {
            kind: 'rms', opt: 'rmsprop', k, paths: [...faded(['sgd', 'momentum']), { key: 'rmsprop', upto: k }], current: ['rmsprop'], arrows: [],
            tex: tex(String.raw`\begin{gathered} v_${k} = 0.99\, v_${k - 1} + 0.01\,(\nabla f)^2 = ${tpt(b.v, sig)} \\ \Delta\theta = -0.03\, \frac{\nabla f}{\sqrt{v_${k}} + \varepsilon} \\ = -0.03\,\left(\frac{${tex(num(a.g[0]))}}{${tex(sig(Math.sqrt(b.v[0])))}},\ \frac{${tex(num(a.g[1]))}}{${tex(sig(Math.sqrt(b.v[1])))}}\right) = ${tpt(b.move)} \end{gathered}`),
        }, `Step ${k}: v = 0.99 × ${pt(a.v, sig)} + 0.01 × ∇f² = ${pt(b.v, sig)}, so θ moves by ${pt(b.move)} to ${pt(b.p)}, loss ${num(b.loss)}.${note}`);
    }
    const rmsTen = tr.rmsprop[10];
    s(3, 'RMSProp', {
        kind: 'summary', opt: 'rmsprop', k: 60, paths: [...faded(['sgd', 'momentum']), { key: 'rmsprop', upto: 60 }], current: ['rmsprop'], arrows: [],
        tex: tex(String.raw`\text{after 10 steps: } |\Delta x| = ${num(Math.abs(rmsTen.p[0] - start[0]))} \text{ (RMSProp) vs } ${num(Math.abs(ten.p[0] - start[0]))} \text{ (momentum)}`),
    }, `After 10 steps RMSProp's x had covered ${num(Math.abs(rmsTen.p[0] - start[0]))}, momentum's ${num(Math.abs(ten.p[0] - start[0]))}. Dividing by √v undoes the 200-fold difference in curvature, because here the steep and the flat directions are exactly the two coordinates. On the floor: ${onFloor(['rmsprop', 'momentum', 'sgd'])}. Whether each one stays there is the race's last question.`);

    /* Act 4: Adam */
    s(4, 'Adam', {
        kind: 'idea', opt: 'adam', k: 0, paths: faded(['sgd', 'momentum', 'rmsprop']), current: [], arrows: [],
        tex: String.raw`\begin{gathered} m \leftarrow 0.9\, m + 0.1\, \nabla f \qquad v \leftarrow 0.999\, v + 0.001\, (\nabla f)^2 \\ \hat m = \frac{m}{1 - 0.9^t} \qquad \hat v = \frac{v}{1 - 0.999^t} \qquad \theta \leftarrow \theta - 0.1\, \frac{\hat m}{\sqrt{\hat v} + \varepsilon} \end{gathered}`,
    }, 'Adam combines the two: a velocity m like momentum\'s (an average, with weight 0.1 on the new gradient) and RMSProp\'s v (weight 0.001). Both start at 0, which would distort the first steps, so Adam divides them by 1 − 0.9ᵗ and 1 − 0.999ᵗ on step t. Then θ ← θ − 0.1 m̂ / (√v̂ + ε).');
    for (let k = 1; k <= TOUR_STEPS.adam; k++) {
        const a = tr.adam[k - 1], b = tr.adam[k];
        const note = k === 1
            ? ' The correction turns m = 0.1∇f into m̂ = ∇f and v = 0.001(∇f)² into v̂ = (∇f)², so m̂ / √v̂ = ±1 and each coordinate moves 0.1, whatever its gradient. Without it the step would be 0.1 × 0.1 / √0.001 = 0.316 per coordinate, 3.16 times as far.'
            : ` m̂ averages this gradient with the last ${k === 2 ? 'one' : 'ones'}, so y's step is ${num(Math.abs(b.move[1]))} and x's ${num(Math.abs(b.move[0]))}.`;
        s(4, 'Adam', {
            kind: 'adam', opt: 'adam', k, paths: [...faded(['sgd', 'momentum', 'rmsprop']), { key: 'adam', upto: k }], current: ['adam'], arrows: [],
            tex: tex(String.raw`\begin{gathered} \hat m_${k} = \frac{${tpt(b.m, sig)}}{1 - 0.9^${k}} = ${tpt(b.mh, sig)} \\ \hat v_${k} = \frac{${tpt(b.v, sig)}}{1 - 0.999^${k}} = ${tpt(b.vh, sig)} \\ \Delta\theta = -0.1\, \frac{\hat m_${k}}{\sqrt{\hat v_${k}} + \varepsilon} = ${tpt(b.move)} \end{gathered}`),
        }, `Step ${k}: m̂ = ${pt(b.mh, sig)} and v̂ = ${pt(b.vh, sig)}, so θ moves by ${pt(b.move)} to ${pt(b.p)}, loss ${num(b.loss)}.${note}`);
    }
    const crossings = tr.adam.slice(1, 61).filter((st, i) => st.p[1] * tr.adam[i].p[1] < 0).length;
    const adamTen = tr.adam[10];
    s(4, 'Adam', {
        kind: 'summary', opt: 'adam', k: 60, paths: [...faded(['sgd', 'momentum', 'rmsprop']), { key: 'adam', upto: 60 }], current: ['adam'], arrows: [],
        tex: String.raw`\theta \leftarrow \theta - \eta\, \frac{\hat m}{\sqrt{\hat v} + \varepsilon}`,
    }, `Like momentum, Adam overshoots the floor and swings back, because m̂ remembers past gradients: y changed sign ${crossings} times in the first 60 steps. Like RMSProp, it does not crawl along x: it covered ${num(Math.abs(adamTen.p[0] - start[0]))} in 10 steps, SGD ${num(Math.abs(sgdTen.p[0] - start[0]))}. On the floor: ${onFloor(['adam'])}.`);

    /* Act 5: the race */
    const all = OPTIMIZERS.map(o => o.key);
    const at = (k) => OPTIMIZERS.map(o => `${o.name} ${sig(tr[o.key][k].loss)}`).join(', ');
    const twoByTwo = (title, cells) => String.raw`\begin{gathered} \text{${title}} \\ ${cells.slice(0, 2).join(String.raw`\qquad `)} \\ ${cells.slice(2).join(String.raw`\qquad `)} \end{gathered}`;
    s(5, 'The race', {
        kind: 'race', opt: null, k: 20, paths: all.map(key => ({ key, upto: 20 })), current: all, arrows: [],
        tex: tex(twoByTwo('loss after 20 steps', OPTIMIZERS.map(o => String.raw`\text{${o.name}}\ ${sig(tr[o.key][20].loss)}`))),
    }, `All four from the same start, 20 steps in. Losses: ${at(20)}.`);
    const order = [...OPTIMIZERS].sort((p, q) => (reach[p.key] ?? Infinity) - (reach[q.key] ?? Infinity));
    const S = (k) => reach[k] ?? Infinity;
    const edge = Math.max(S('rmsprop'), S('adam')) < Math.min(S('momentum'), S('sgd'));
    s(5, 'The race', {
        kind: 'race', opt: null, k: 80, paths: all.map(key => ({ key, upto: 80 })), current: all, arrows: [],
        tex: twoByTwo('on the floor from step', order.map(o => String.raw`\text{${o.name}}\ ${reach[o.key] ?? String.raw`\text{not by } ${HORIZON}`}`)),
    }, `Step 80. On the floor (under 0.001 for 50 steps in a row): ${onFloor(order.map(o => o.key))}. ${edge ? "The two per-coordinate methods finish first, because this ravine's steep and flat directions are exactly the x and y axes." : "From this start the per-coordinate methods do not both finish first, even though this ravine's steep and flat directions are exactly the axes they rescale."}`);
    /* Reaching the floor is not staying on it: run on to LONG. */
    const stayers = all.filter(k => reach[k] !== null && leave[k] === null);
    const listed = stayers.map(k => PROSE[k]).join(', ').replace(/, ([^,]*)$/, ' and $1');
    const stayed = stayers.length ? `${listed[0].toUpperCase()}${listed.slice(1)} stay${stayers.length === 1 ? 's' : ''} on the floor. ` : '';
    const study = `Over ${STAY_STUDY.n.toLocaleString('en-US')} starts RMSProp climbed back out in all ${STAY_STUDY.rmsprop.toLocaleString('en-US')} (median step ${STAY_STUDY.rmspropMedian}); Adam's v keeps 0.999 of itself, so it forgets ten times more slowly and the same thing happens to Adam only around step ${STAY_STUDY.adamMedian.toLocaleString('en-US')}. It is one reason training runs shrink η over time.`;
    const rr = reach.rmsprop, rl = leave.rmsprop, rt = tr.rmsprop;
    if (rr !== null && rl !== null) {
        let peakAt = rr, effAt = rr, crossAt = null;
        const eff = (k) => DEFAULTS.rmsprop.lr / (Math.sqrt(rt[k].v[1]) + EPS);
        for (let k = rr; k < rt.length; k++) if (rt[k].loss > rt[peakAt].loss) peakAt = k;
        for (let k = rr; k <= rl; k++) {
            if (eff(k) > eff(effAt)) effAt = k;
            if (crossAt === null && eff(k) > 0.5) crossAt = k;
        }
        s(5, 'The race', {
            kind: 'stay', opt: null, k: LONG, paths: all.map(key => ({ key, upto: LONG })), current: all, arrows: [], chart: true,
            tex: tex(String.raw`\begin{gathered} \text{RMSProp, step } ${effAt}\text{:}\quad \frac{\eta}{\sqrt{v_y}} = \frac{0.03}{${sig(Math.sqrt(rt[effAt].v[1]))}} = ${num(eff(effAt))} > \frac{2}{4} = 0.5 \\ \text{back over 0.001 at step } ${rl},\ \text{peak } ${sig(rt[peakAt].loss)} \text{ at step } ${peakAt} \end{gathered}`),
        }, `Run all four on to step ${LONG.toLocaleString('en-US')}. ${stayed}RMSProp does not: its loss is back over 0.001 at step ${rl} and peaks at ${sig(rt[peakAt].loss)} at step ${peakAt}. On the floor the gradients are tiny, and v, which keeps 0.99 of itself each step, forgets the big early ones, so the step size across y, η / √v, grows. At step ${crossAt} it passed 0.5, the same limit that capped SGD in act 1, and by step ${effAt} it was 0.03 / ${sig(Math.sqrt(rt[effAt].v[1]))} = ${num(eff(effAt))}. Past that limit each jump across y lands further out than the last. y started so close to 0 that the loss shows it only at step ${rl}, and the climb stops once the gradients are big enough to rebuild v. η never shrinks, so this repeats instead of settling. ${study}`);
    } else {
        s(5, 'The race', {
            kind: 'stay', opt: null, k: LONG, paths: all.map(key => ({ key, upto: LONG })), current: all, arrows: [], chart: true,
            tex: String.raw`\frac{\eta}{\sqrt{v}}\ \text{grows as } v \text{ forgets}`,
        }, `Run all four on to step ${LONG.toLocaleString('en-US')}. ${stayed}${study}`);
    }

    s(5, 'The race', {
        kind: 'wrap', opt: null, k: 80, paths: all.map(key => ({ key, upto: 80 })), current: all, arrows: [],
        tex: String.raw`\begin{gathered} \text{SGD: } \theta \leftarrow \theta - \eta\, \nabla f \qquad \text{Momentum: adds a velocity} \\ \text{RMSProp: divides by } \sqrt{v} \qquad \text{Adam: both} \end{gathered}`,
    }, 'Real loss surfaces are not lined up with the axes. In Explore, "Turn the ravine 45°" turns this same valley and the start with it: SGD and momentum take exactly as many steps as before, while RMSProp and Adam lose most of their edge, because dividing each coordinate by its own √v only helps when the steep direction is a coordinate.');
    return steps;
}

function predictFor(step, next) {
    if (!step || !next || !step.ask || next.kind !== 'mom') return null;
    const M = DEFAULTS.momentum;
    const st = step.state, move = next.state.move;
    const mNew = M.mu * st.m[1] + st.g[1];
    const up = move[1] > 0;
    const velocityWins = Math.sign(mNew) === Math.sign(st.m[1]);
    return {
        question: 'The carried velocity (orange) and the push from the slope (white) point opposite ways in y. Which way will the ball move in y on the next step?',
        options: ['Up', 'Down'],
        correct: up ? 0 : 1,
        because: `m_y becomes 0.9 × ${pn(st.m[1])} + ${pn(st.g[1])} = ${num(mNew)}: the ${velocityWins ? 'carried velocity' : 'push from the slope'} is bigger, so y moves ${dir(move[1])} by ${num(Math.abs(move[1]))}.`,
    };
}

/* ── the measured misconception ────────────────────────────
   1,000 seeded starts (x between ±2 and ±2.7, y between ±0.4 and ±1.2), each
   run at the defaults on the ravine and on the ravine turned 45° with the
   start turned too. Median step at which each reaches the floor (under 0.001
   for 50 steps in a row, by step 600); every run reached it. sameSteps
   counts the starts where SGD and momentum reach it at exactly the same step
   both ways. Adam's best learning rate on the turned ravine is searched over
   0.1–5 in steps of 0.05 (the first of the ties).
   STAY_STUDY runs the same aligned starts on: how many climb back over 0.001
   after reaching the floor, by step 1,200, and for Adam by step 20,000, with
   the median and range of the step where they do. Both are rerun with the
   engine's own optimizers by the test suite. */
const TURN_STUDY = {
    n: 1000,
    sgd: [222, 222], momentum: [70, 70], rmsprop: [31, 363], adam: [61, 330],
    sameSteps: 1000, adamBestLr: 0.9, adamBest: 76,
};
const STAY_STUDY = {
    n: 1000,
    rmsprop: 1000, rmspropMedian: 732, rmspropRange: [485, 868], othersBy1200: 0,
    adamBy: 20000, adam: 1000, adamMedian: 6501, adamRange: [4829, 7558],
};

const quizQuestions = [
    {
        question: 'On the ravine f = 0.01x² + 2y², why can\'t plain SGD simply use a bigger learning rate to move faster along the floor?',
        options: [
            'A bigger learning rate makes the gradient smaller',
            'The steep direction caps it: once 1 − 4η leaves (−1, 1), at η = 0.5, each jump across the ravine lands further out than the last',
            'The gradient along the floor is exactly zero',
            'PyTorch limits the learning rate to 0.5',
        ],
        correct: 1,
        explanation: 'One learning rate serves both directions. Across y each step multiplies y by 1 − 4η, which diverges past η = 0.5; along x it multiplies x by 1 − 0.02η, which at η = 0.45 is still 0.991. Safe for y means slow for x.',
    },
    {
        question: 'Momentum updates m ← 0.9m + ∇f. If the gradient stays at the same value g for many steps, what does m approach?',
        options: [
            'g',
            '0.9g',
            'It grows without limit',
            'g / (1 − 0.9) = 10g',
        ],
        correct: 3,
        explanation: 'The fixed point of m = 0.9m + g is m = g / 0.1 = 10g. A direction where the gradient keeps its sign effectively gets ten times the learning rate, which is why momentum crosses the flat floor so much faster than SGD.',
    },
    {
        question: 'Turn the same ravine 45°, start included. What happens to Adam at its default settings?',
        options: [
            'It slows down a lot (median 61 → 330 steps), because it rescales each coordinate separately and now both coordinates see the same mix of steep and flat',
            'Nothing changes: Adam adapts to any shape',
            'It speeds up, because both coordinates now have large gradients',
            'It diverges',
        ],
        correct: 0,
        explanation: 'Adam divides each coordinate by its own √v̂. When the steep direction is a coordinate, that evens the ravine out; when it runs diagonally, both coordinates mix steep and flat and there is nothing for per-coordinate scaling to fix. SGD and momentum take exactly the same number of steps either way.',
    },
];

const codeExample = `import torch

def loss(p):                         # the ravine: steep across y, almost flat along x
    return 0.01 * p[0] ** 2 + 2 * p[1] ** 2

def run(make, steps):
    p = torch.tensor([-2.6, 1.1], requires_grad=True)
    opt = make([p])
    for _ in range(steps):
        opt.zero_grad()
        loss(p).backward()
        opt.step()
    return p.detach()

print(run(lambda ps: torch.optim.SGD(ps, lr=0.45), 1))                # tensor([-2.5766, -0.8800])
print(run(lambda ps: torch.optim.SGD(ps, lr=0.15, momentum=0.9), 2))  # tensor([-2.5774, -0.4180])
print(run(lambda ps: torch.optim.RMSprop(ps, lr=0.03, alpha=0.99), 1))  # tensor([-2.3000,  0.8000])
print(run(lambda ps: torch.optim.Adam(ps, lr=0.1), 1))                # tensor([-2.5000,  1.0000])  -> each moved lr
`;

/* ── shared pieces ─────────────────────────────────────── */

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Replay the race and retry.'}
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

const CONTOURS = [0.001, 0.005, 0.02, 0.06, 0.15, 0.35, 0.7, 1.4, 2.8, 5.6, 11];

function Polyline({ points, color, width = 2, opacity = 1, dashed = false }) {
    const { toScreen } = usePlane();
    if (points.length < 2) return null;
    const d = points.map((p, i) => { const [sx, sy] = toScreen(p); return `${i ? 'L' : 'M'}${sx} ${sy}`; }).join('');
    return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeOpacity={opacity} strokeDasharray={dashed ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />;
}

/** Level sets of the ravine: ellipses with semi-axes √(c/0.01) and √(c/2), turned with the surface. */
function Contours({ surface }) {
    const rings = useMemo(() => CONTOURS.map(c => {
        const pts = [];
        for (let i = 0; i <= 144; i++) {
            const t = (i / 144) * 2 * Math.PI;
            const p = [Math.sqrt(c / A) * Math.cos(t), Math.sqrt(c / B) * Math.sin(t)];
            pts.push(surface === 'turned' ? turn(p) : p);
        }
        return { c, pts };
    }), [surface]);
    return (
        <g>
            {rings.map(({ c, pts }) => (
                <Polyline key={c} points={pts} color={c === TOL ? '#facc15' : '#475569'} width={c === TOL ? 1.5 : 1} opacity={c === TOL ? 0.9 : 1} dashed={c === TOL} />
            ))}
        </g>
    );
}

/** The contour map: each optimizer's path, the current points and any arrows. */
function RaceMap({ surface = 'aligned', paths, start, arrows = [], onDragStart, yRange = [-1.5, 1.5], ariaLabel }) {
    return (
        <div className="max-w-[640px] mx-auto">
            <Plane2D xRange={[-3, 3]} yRange={yRange} width={480} grid={1} ariaLabel={ariaLabel}>
                <Contours surface={surface} />
                {paths.map(({ key, points, faded }) => (
                    <Polyline key={key} points={points} color={COLOR[key]} width={faded ? 1.5 : 2.2} opacity={faded ? 0.35 : 0.95} />
                ))}
                {arrows.map(a => <Vector key={a.label} from={a.from} to={a.to} color={a.color} width={2.5} />)}
                {paths.filter(p => p.current && p.points.length).map(({ key, points }) => (
                    <Point key={key} at={points[points.length - 1]} color={COLOR[key]} r={5} />
                ))}
                <Point at={start} color="#f8fafc" r={onDragStart ? 6 : 4} onDrag={onDragStart} snap={0.1}
                    ariaLabel={onDragStart ? `Start point at (${num(start[0])}, ${num(start[1])}); drag or use the arrow keys` : undefined} />
            </Plane2D>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Grey rings: equal loss. Dashed yellow ring: loss 0.001, the floor. White dot: the start.
            </p>
        </div>
    );
}

/* The tour draws the strip its paths use, |y| ≤ 1.5, with heights × 0.6 so they
   climb the walls visibly; Explore needs the whole square (a turned start can sit
   anywhere in it) and draws heights × 0.15. Module-level so Surface3D's geometry
   is built once per shape. */
const RANGE = [-3, 3], STRIP = [-1.5, 1.5];
const SHAPES3D = {
    tour: { yRange: STRIP, z: 0.6 },
    full: { yRange: RANGE, z: 0.15 },
};
const HEIGHT = Object.fromEntries(['aligned', 'turned'].flatMap(surface => Object.entries(SHAPES3D).map(([shape, { z }]) =>
    [`${surface}-${shape}`, (x, y) => z * SURFACES[surface].f([x, y])])));

/** The same paths on the surface itself. */
function SurfaceView({ surface = 'aligned', shape = 'tour', paths }) {
    const h = HEIGHT[`${surface}-${shape}`];
    const { yRange, z } = SHAPES3D[shape];
    return (
        <div>
            <Scene3D height={380} grid={false} axisSize={3.2} ariaLabel="The ravine as a 3D surface with each optimizer's path on it"
                fallback={<p className="text-sm text-slate-400">3D needs WebGL, which is not available here. The contour map shows the same paths.</p>}>
                {(P) => (
                    <>
                        <P.Surface3D f={h} xRange={RANGE} yRange={yRange} segments={56} opacity={0.55} />
                        {paths.filter(p => p.points.length > 1).map(({ key, points, faded }) => (
                            <P.Line3D key={key} points={points.map(([x, y]) => [x, y, h(x, y) + 0.04])} color={COLOR[key]} width={faded ? 1.5 : 3.5} />
                        ))}
                        {paths.filter(p => p.current && p.points.length).map(({ key, points }) => {
                            const [x, y] = points[points.length - 1];
                            return <P.Point3D key={key} at={[x, y, h(x, y) + 0.06]} color={COLOR[key]} size={0.1} />;
                        })}
                    </>
                )}
            </Scene3D>
            <p className="text-[11px] text-slate-500 mt-2">Height is the loss × {z}{shape === 'tour' ? ', drawn for |y| ≤ 1.5, where the paths run' : ''}. Drag to turn the view.</p>
        </div>
    );
}

/** Loss against step on a log axis, each run to LONG, with the floor dashed; a loss under 10⁻¹⁵ is
    drawn at 10⁻¹⁵. That bottom puts the axis ticks at 1 and 10⁻¹⁰, labels short enough for the
    chart's margin (a 10⁻⁵ tick prints as 0.00001 and is cut off). */
const LOG_FLOOR = 1e-15;
function FloorChart({ traces, keys = OPTIMIZERS.map(o => o.key) }) {
    const series = [
        ...keys.map(key => ({ name: NAME[key], color: COLOR[key], points: traces[key].map(s => ({ x: s.t, y: Math.max(LOG_FLOOR, s.loss) })) })),
        { name: 'floor', color: '#facc15', dashed: true, points: [{ x: 0, y: TOL }, { x: LONG, y: TOL }] },
    ];
    return (
        <div className="max-w-[640px] mx-auto">
            <TrainingCurve logY series={series} height={240} yMin={LOG_FLOOR} ariaLabel="Loss against step for each optimizer on a log scale, with the 0.001 floor dashed" />
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Loss on a log scale to step {LONG.toLocaleString('en-US')}; the legend shows each loss at the last step. Dashed yellow: 0.001, the floor. A loss under 10⁻¹⁵ is drawn at 10⁻¹⁵.
            </p>
        </div>
    );
}

function ViewToggle({ view, setView, curve = false }) {
    const views = [['map', 'Contour map', MapIcon], ['3d', '3D surface', Box], ...(curve ? [['curve', 'Loss curve', ChartLine]] : [])];
    return (
        <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-950" role="tablist" aria-label="View">
            {views.map(([key, label, Icon]) => (
                <button key={key} role="tab" aria-selected={view === key} onClick={() => setView(key)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${view === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                    <Icon className="h-3.5 w-3.5" />{label}
                </button>
            ))}
        </div>
    );
}

/** θ, ∇f and the optimizer's buffers at the current step. */
function StateTable({ state, opt }) {
    if (!state || !opt) return null;
    const rows = [['θ (where it is)', state.p, num], ['∇f(θ)', state.g, num]];
    if (opt === 'momentum') rows.push(['m (velocity)', state.m, num]);
    if (opt === 'rmsprop') rows.push(['v (mean square)', state.v, sig]);
    if (opt === 'adam') rows.push(['m̂', state.mh, sig], ['v̂', state.vh, sig]);
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
                <thead>
                    <tr className="text-slate-500">
                        <th className="text-left font-medium pb-1 pr-3">{NAME[opt]}, step {state.t}</th>
                        <th className="text-left font-medium pb-1 pr-3">x</th>
                        <th className="text-left font-medium pb-1 pr-3">y</th>
                        <th className="text-left font-medium pb-1"><ShapeTag shape={[2]} label="each" /></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(([label, value, f]) => (
                        <tr key={label} className="border-t border-slate-800 text-slate-300">
                            <td className="py-1 pr-3 text-slate-400">{label}</td>
                            <td className="pr-3">{f(value[0])}</td>
                            <td className="pr-3">{f(value[1])}</td>
                            <td />
                        </tr>
                    ))}
                    <tr className="border-t border-slate-800 text-slate-300">
                        <td className="py-1 pr-3 text-slate-400">loss f(θ)</td>
                        <td className="pr-3" colSpan={3}>{sig(state.loss)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

/* ── explore ───────────────────────────────────────────── */

const LAB_START = [-2.6, 1.1];
const SLIDERS = [
    { key: 'sgd', param: 'lr', label: 'SGD η', min: 0.05, max: 0.6, step: 0.01 },
    { key: 'momentum', param: 'lr', label: 'Momentum η', min: 0.01, max: 0.5, step: 0.01 },
    { key: 'momentum', param: 'mu', label: 'Momentum μ', min: 0, max: 0.99, step: 0.01 },
    { key: 'rmsprop', param: 'lr', label: 'RMSProp η', min: 0.005, max: 0.1, step: 0.005 },
    { key: 'adam', param: 'lr', label: 'Adam η', min: 0.01, max: 1, step: 0.01 },
];

function runAll(hp, start, surface) {
    return Object.fromEntries(OPTIMIZERS.map(o => {
        const trace = descend(o.key, hp[o.key], start, LONG, surface);
        const reach = reachStep(trace);
        return [o.key, { trace, reach, leave: leaveStep(trace, reach) }];
    }));
}

function Lab() {
    const [hp, setHp] = useState(DEFAULTS);
    const [start, setStart] = useState(LAB_START);
    const [surface, setSurface] = useState('aligned');
    const [upto, setUpto] = useState(80);
    const [shown, setShown] = useState(() => new Set(OPTIMIZERS.map(o => o.key)));
    const [view, setView] = useState('map');
    const [broken, setBroken] = useState(null);

    const runs = useMemo(() => runAll(hp, start, surface), [hp, start, surface]);
    const before = useMemo(() => {
        if (broken === 'turn') return runAll(hp, unturn(start), 'aligned');
        if (broken === 'mu') return runAll({ ...hp, momentum: { ...hp.momentum, mu: DEFAULTS.momentum.mu } }, start, surface);
        return null;
    }, [broken, hp, start, surface]);

    const setParam = (key, param, value) => setHp(h => ({ ...h, [key]: { ...h[key], [param]: value } }));
    const toggle = (key) => setShown(s => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
    const turnIt = () => { if (surface === 'turned') return; setSurface('turned'); setStart(p => turn(p).map(v => Math.round(v * 1e6) / 1e6)); setBroken('turn'); };
    const heavy = () => { setParam('momentum', 'mu', 0.99); setBroken('mu'); };
    const repair = () => {
        if (surface === 'turned') setStart(p => unturn(p).map(v => Math.round(v * 1e6) / 1e6));
        setSurface('aligned'); setHp(DEFAULTS); setBroken(null);
    };

    const paths = OPTIMIZERS.filter(o => shown.has(o.key)).map(o => ({
        key: o.key, points: visible(pathOf(runs[o.key].trace, upto)), current: true,
    }));
    const st = (key, r) => (r[key].reach === null ? `not within ${HORIZON}` : `step ${r[key].reach}`);

    let message = null;
    if (broken === 'turn' && before) {
        const same = ['sgd', 'momentum'].every(k => runs[k].reach === before[k].reach);
        message = `Same valley, turned 45°, and the start turned with it. Steps to reach the floor: SGD (${st('sgd', before)} → ${st('sgd', runs)}) and momentum (${st('momentum', before)} → ${st('momentum', runs)}) ${same ? 'get there at exactly the same step' : 'barely change'}: neither looks at the axes. RMSProp goes from ${st('rmsprop', before)} to ${st('rmsprop', runs)} and Adam from ${st('adam', before)} to ${st('adam', runs)}: both coordinates now mix steep and flat, so dividing each by its own √v has nothing to even out.`;
    } else if (broken === 'mu' && before) {
        message = `μ = 0.99: the velocity loses only 1% a step, so the ball keeps swinging across the floor and past the minimum. ${runs.momentum.reach === null ? `Momentum does not reach the floor within ${HORIZON} steps` : `Momentum reaches the floor at step ${runs.momentum.reach}`} (at μ = 0.9: ${st('momentum', before)}). Switch to the loss curve to watch it swing.`;
    }

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                        {OPTIMIZERS.map(o => (
                            <button key={o.key} onClick={() => toggle(o.key)} aria-pressed={shown.has(o.key)}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${shown.has(o.key) ? 'border-slate-600 text-slate-100 bg-slate-800' : 'border-slate-800 text-slate-500'}`}>
                                <span className="h-2 w-2 rounded-full" style={{ background: o.color, opacity: shown.has(o.key) ? 1 : 0.35 }} />{o.name}
                            </button>
                        ))}
                    </div>
                    <ViewToggle view={view} setView={setView} curve />
                </div>
                {view === 'map' && <RaceMap surface={surface} paths={paths} start={start} onDragStart={setStart} yRange={[-3, 3]} ariaLabel="Contour map of the ravine with the four optimizers' paths; the start point can be dragged" />}
                {view === '3d' && <SurfaceView surface={surface} shape="full" paths={paths} />}
                {view === 'curve' && <FloorChart traces={Object.fromEntries(OPTIMIZERS.map(o => [o.key, runs[o.key].trace]))} keys={OPTIMIZERS.filter(o => shown.has(o.key)).map(o => o.key)} />}
                {view !== 'curve' && <ParamSlider label="Steps shown" value={upto} onChange={setUpto} min={1} max={200} step={1} accent="orange" />}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-slate-500">
                                <th className="text-left font-medium pb-1 pr-3">optimizer</th>
                                <th className="text-left font-medium pb-1 pr-3">loss at step {upto}</th>
                                <th className="text-left font-medium pb-1 pr-3">on the floor from</th>
                                <th className="text-left font-medium pb-1">back over 0.001</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono">
                            {OPTIMIZERS.map(o => {
                                const tr = runs[o.key].trace;
                                const s = tr[Math.min(upto, tr.length - 1)];
                                return (
                                    <tr key={o.key} className="border-t border-slate-800 text-slate-300">
                                        <td className="py-1 pr-3 font-sans" style={{ color: o.color }}>{o.name}</td>
                                        <td className="pr-3">{tr.length - 1 < upto ? 'blew up' : sig(s.loss)}</td>
                                        <td className="pr-3">{st(o.key, runs)}</td>
                                        <td>{runs[o.key].reach === null ? '–' : runs[o.key].leave === null ? `no, to step ${LONG.toLocaleString('en-US')}` : `step ${runs[o.key].leave}`}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {SLIDERS.map(sl => (
                        <ParamSlider key={`${sl.key}-${sl.param}`} label={sl.label} value={hp[sl.key][sl.param]}
                            onChange={(v) => setParam(sl.key, sl.param, v)} min={sl.min} max={sl.max} step={sl.step}
                            accent={OPTIMIZERS.find(o => o.key === sl.key).accent} format={(v) => num(v)} />
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={turnIt} disabled={surface === 'turned'}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 disabled:opacity-40">Turn the ravine 45°</button>
                    <button onClick={heavy} disabled={hp.momentum.mu === 0.99}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 disabled:opacity-40">Momentum μ = 0.99</button>
                    <button onClick={repair}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"><Wrench className="h-3.5 w-3.5" />Repair</button>
                </div>
                {message && (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 text-sm text-amber-100 leading-relaxed">{message}</div>
                )}
                <p className="text-xs text-slate-500 leading-relaxed">
                    Drag the white start point (or focus it and use the arrow keys). Every run is recomputed to step {LONG.toLocaleString('en-US')} each time anything changes. A run is on the floor once its loss stays under 0.001 for {STAY} steps in a row, by step {HORIZON} at the latest; the last column says whether it climbs back out before step {LONG.toLocaleString('en-US')}. SGD past η = 0.5 shows the blow-up the steep direction causes.
                </p>
            </div>
        </div>
    );
}

/* ── the page ──────────────────────────────────────────── */

const RULES = [
    { key: 'sgd', lines: [String.raw`\theta \leftarrow \theta - 0.45\, \nabla f`] },
    { key: 'momentum', lines: [String.raw`m \leftarrow 0.9\, m + \nabla f`, String.raw`\theta \leftarrow \theta - 0.15\, m`] },
    { key: 'rmsprop', lines: [String.raw`v \leftarrow 0.99\, v + 0.01\, (\nabla f)^2`, String.raw`\theta \leftarrow \theta - 0.03\, \nabla f / (\sqrt{v} + \varepsilon)`] },
    { key: 'adam', lines: [String.raw`m \leftarrow 0.9\, m + 0.1\, \nabla f`, String.raw`v \leftarrow 0.999\, v + 0.001\, (\nabla f)^2`, String.raw`\theta \leftarrow \theta - 0.1\, \hat m / (\sqrt{\hat v} + \varepsilon)`] },
];

export default function OptimizersPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const tour = useMemo(() => tourOf(seed), [seed]);
    const stepHistory = useMemo(() => generateSteps(seed), [seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [view, setView] = useState('map');
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
    const paths = step.paths.map(({ key, upto, faded }) => ({
        key, faded, points: visible(pathOf(tour.traces[key], upto)), current: step.current.includes(key),
    }));

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/neural-networks" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Neural Networks
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Optimizers</h1>
                    <p className="text-orange-100 max-w-3xl">
                        SGD, momentum, RMSProp and Adam start from the same point on the same narrow ravine. Step through each update rule, then race them, then turn the ravine and see which ones notice.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Gradient Descent', '/differential-calculus/gradient-descent'], ['Backpropagation', '/neural-networks/backpropagation']].map(([name, href]) => (
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
                        <SourceChip kind="live">Every step computed in your browser with torch.optim&apos;s update rules</SourceChip>
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
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}</span>
                                        {!step.chart && <ViewToggle view={view} setView={setView} />}
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>
                                    {step.chart
                                        ? <FloorChart traces={tour.traces} />
                                        : view === 'map'
                                            ? <RaceMap paths={paths} start={tour.start} arrows={step.arrows} ariaLabel="Contour map of the ravine with the optimizers' paths so far" />
                                            : <SurfaceView paths={paths} />}
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
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New start point" title="New start point"
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
                                    <Tex block>{step.tex}</Tex>
                                </div>
                                {step.state && (
                                    <div className="border-t border-slate-800 pt-4">
                                        <StateTable state={step.state} opt={step.opt} />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <InCode title="The same four runs in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-1">The four update rules</h2>
                        <p className="text-xs text-slate-500 mb-3">At the tour&apos;s settings; ε = 10⁻⁸ keeps the division safe.</p>
                        <div className="space-y-2">
                            {RULES.map(r => (
                                <div key={r.key} className={`rounded-lg border px-3 py-2 ${mode === 'guided' && (step.opt === r.key || (!step.opt && step.act === 5)) ? 'border-slate-600 bg-slate-800/60' : 'border-slate-800'}`}>
                                    <div className="flex items-center gap-2 text-xs font-semibold mb-1" style={{ color: COLOR[r.key] }}>
                                        <span className="h-2 w-2 rounded-full" style={{ background: COLOR[r.key] }} />{NAME[r.key]}
                                    </div>
                                    <div className="text-slate-200 text-xs space-y-0.5">
                                        {r.lines.map(line => <div key={line} className="overflow-x-auto overflow-y-hidden py-0.5"><Tex>{line}</Tex></div>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;Adam adapts to the shape of the loss surface.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            It adapts to the axes. Over {TURN_STUDY.n.toLocaleString('en-US')} starts, the ravine turned 45° (start turned with it) left SGD at a median {TURN_STUDY.sgd[1]} steps and momentum at {TURN_STUDY.momentum[1]}, exactly as before for every start, while Adam went from {TURN_STUDY.adam[0]} to {TURN_STUDY.adam[1]} and RMSProp from {TURN_STUDY.rmsprop[0]} to {TURN_STUDY.rmsprop[1]} (median steps to reach the floor). Retuning does not rescue it: over learning rates from 0.1 to 5, Adam&apos;s best there (η = {TURN_STUDY.adamBestLr}) needs {TURN_STUDY.adamBest}, still more than momentum.
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
