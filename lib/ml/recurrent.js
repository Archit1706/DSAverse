/* Small recurrent networks — a plain RNN, an LSTM and a GRU — with a
   hand-written backward pass through time.

   Sizes are tiny (a handful of hidden units, sequences of a few dozen
   steps), so everything is plain loops over Float64Arrays and every
   intermediate is kept: the pages draw the gate values, the hidden state
   and the gradient reaching each time step.

   Parameters live in one object of named Float64Arrays. Each gate g has a
   recurrent matrix W<g> [H, H], an input matrix U<g> [H, I] and a bias
   b<g> [H]; the readout is V [O, H] and c [O]:

     rnn   h = tanh(W h₋ + U x + b)
     lstm  f, i, o = σ(W h₋ + U x + b) per gate,  g = tanh(…)
           c = f ⊙ c₋ + i ⊙ g,  h = o ⊙ tanh(c)
     gru   z, r = σ(W h₋ + U x + b) per gate
           n = tanh(Un x + bn + r ⊙ (Wn h₋)),  h = (1 − z) ⊙ n + z ⊙ h₋

   and every step reads out y = V h + c. */

import { createRng } from '../random.js';

const sigmoid = (x) => 1 / (1 + Math.exp(-x));
export const GATES = { rnn: [''], lstm: ['f', 'i', 'g', 'o'], gru: ['z', 'r', 'n'] };

/** A fresh network with seeded uniform(−1/√fan-in, 1/√fan-in) weights. */
export function createRecurrent(kind, { input, hidden, output, seed = 1 }) {
    if (!GATES[kind]) throw new Error(`recurrent: unknown kind "${kind}"`);
    const rng = createRng(seed);
    const shapes = {};
    for (const g of GATES[kind]) {
        shapes[`W${g}`] = [hidden, hidden];
        shapes[`U${g}`] = [hidden, input];
        shapes[`b${g}`] = [hidden];
    }
    shapes.V = [output, hidden];
    shapes.c = [output];
    const p = {};
    for (const [name, shape] of Object.entries(shapes)) {
        const n = shape.reduce((a, b) => a * b, 1);
        const bias = shape.length === 1;
        const s = 1 / Math.sqrt(name.startsWith('U') ? Math.max(1, input) : hidden);
        p[name] = Float64Array.from({ length: n }, () => (bias ? 0 : (rng.next() * 2 - 1) * s));
    }
    // The usual LSTM trick: start the forget gate open so memory survives early training.
    if (kind === 'lstm') p.bf.fill(1);
    return { kind, I: input, H: hidden, O: output, shapes, p };
}

export const paramCount = (net) => Object.values(net.p).reduce((a, v) => a + v.length, 0);

/** M [rows, cols] · v, added into out. */
function mv(M, rows, cols, v, out) {
    for (let r = 0; r < rows; r++) {
        let s = 0;
        for (let c = 0; c < cols; c++) s += M[r * cols + c] * v[c];
        out[r] += s;
    }
    return out;
}
/** Mᵀ · v for M [rows, cols], added into out (length cols). */
function mtv(M, rows, cols, v, out) {
    for (let r = 0; r < rows; r++) {
        const vr = v[r];
        if (vr === 0) continue;
        for (let c = 0; c < cols; c++) out[c] += M[r * cols + c] * vr;
    }
    return out;
}
/** out [rows, cols] += a ⊗ b. */
function outer(out, a, b) {
    const cols = b.length;
    for (let r = 0; r < a.length; r++) {
        const ar = a[r];
        if (ar === 0) continue;
        for (let c = 0; c < cols; c++) out[r * cols + c] += ar * b[c];
    }
}
const zeros = (n) => new Float64Array(n);

/**
 * Run a sequence. `xs` is an array of input vectors; `state` an optional
 * starting { h, c }. Returns one record per step with everything computed
 * (hPrev, h, y, and per kind the gates), plus the final state.
 *
 * `clamp` pins gates to a constant for a "break it" demo — { f: 0.8 } holds
 * every LSTM forget gate at 0.8, { z: 0 } every GRU update gate at 0. A
 * clamped gate is a constant, so `backward` sends no gradient through it.
 */
export function runSequence(net, xs, state = {}, { clamp = null } = {}) {
    const { kind, I, H, O, p } = net;
    const pin = (rec, g, v) => {
        if (clamp && clamp[g] !== undefined) { (rec.clamped ??= {})[g] = true; return v.map(() => clamp[g]); }
        return v;
    };
    let h = state.h ? Float64Array.from(state.h) : zeros(H);
    let c = state.c ? Float64Array.from(state.c) : zeros(H);
    const steps = [];
    for (const xIn of xs) {
        const x = xIn instanceof Float64Array ? xIn : Float64Array.from(xIn);
        const rec = { x, hPrev: h, cPrev: c };
        if (kind === 'rnn') {
            const a = mv(p.U, H, I, x, mv(p.W, H, H, h, Float64Array.from(p.b)));
            h = a.map(Math.tanh);
        } else if (kind === 'lstm') {
            const pre = {};
            for (const g of GATES.lstm) pre[g] = mv(p[`U${g}`], H, I, x, mv(p[`W${g}`], H, H, h, Float64Array.from(p[`b${g}`])));
            rec.f = pin(rec, 'f', pre.f.map(sigmoid)); rec.i = pin(rec, 'i', pre.i.map(sigmoid));
            rec.o = pin(rec, 'o', pre.o.map(sigmoid)); rec.g = pre.g.map(Math.tanh);
            c = rec.f.map((f, k) => f * rec.cPrev[k] + rec.i[k] * rec.g[k]);
            rec.tc = c.map(Math.tanh);
            h = rec.o.map((o, k) => o * rec.tc[k]);
        } else {
            rec.z = pin(rec, 'z', mv(p.Uz, H, I, x, mv(p.Wz, H, H, h, Float64Array.from(p.bz))).map(sigmoid));
            rec.r = pin(rec, 'r', mv(p.Ur, H, I, x, mv(p.Wr, H, H, h, Float64Array.from(p.br))).map(sigmoid));
            rec.m = mv(p.Wn, H, H, h, zeros(H));
            rec.n = mv(p.Un, H, I, x, Float64Array.from(p.bn)).map((v, k) => Math.tanh(v + rec.r[k] * rec.m[k]));
            h = rec.n.map((n, k) => (1 - rec.z[k]) * n + rec.z[k] * rec.hPrev[k]);
        }
        rec.h = h;
        rec.c = c;
        rec.y = mv(p.V, O, H, h, Float64Array.from(p.c));
        steps.push(rec);
    }
    return { steps, h, c };
}

export function softmax(v) {
    const m = Math.max(...v);
    const e = Array.from(v, x => Math.exp(x - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(x => x / s);
}

/** Gradients shaped like net.p, all zero. */
export const zeroGrads = (net) => Object.fromEntries(Object.entries(net.p).map(([k, v]) => [k, zeros(v.length)]));

/**
 * Backpropagation through time over one run. `dys[t]` is ∂L/∂y at step t
 * (or null); `dhFinal` / `dcFinal` add gradient arriving at the final state
 * from outside (a decoder, say), and `dhExtra[t]` gradient arriving at the
 * state of step t (an attention layer reading every encoder state).
 * Gradients are added into `grads`. Returns
 * ∂L/∂h and ∂L/∂c of the starting state, ∂L/∂h at every step (the
 * gradient reaching each time step, which the pages draw) and ∂L/∂x at
 * every step (how much each input matters to the loss).
 */
export function backward(net, run, dys, grads, { dhFinal = null, dcFinal = null, dhExtra = null } = {}) {
    const { kind, I, H, O, p } = net;
    let dh = dhFinal ? Float64Array.from(dhFinal) : zeros(H);
    let dc = dcFinal ? Float64Array.from(dcFinal) : zeros(H);
    const dhAt = new Array(run.steps.length);
    const dxAt = new Array(run.steps.length);
    for (let t = run.steps.length - 1; t >= 0; t--) {
        const s = run.steps[t];
        const dy = dys[t];
        if (dy) {
            outer(grads.V, dy, s.h);
            for (let k = 0; k < O; k++) grads.c[k] += dy[k];
            mtv(p.V, O, H, dy, dh);
        }
        if (dhExtra?.[t]) for (let k = 0; k < H; k++) dh[k] += dhExtra[t][k];
        dhAt[t] = Float64Array.from(dh);
        const dhPrev = zeros(H);
        const dx = zeros(I);
        if (kind === 'rnn') {
            const da = dh.map((g, k) => g * (1 - s.h[k] * s.h[k]));
            outer(grads.W, da, s.hPrev); outer(grads.U, da, s.x);
            for (let k = 0; k < H; k++) grads.b[k] += da[k];
            mtv(p.W, H, H, da, dhPrev);
            mtv(p.U, H, I, da, dx);
            dc = zeros(H);
        } else if (kind === 'lstm') {
            const dct = dh.map((g, k) => dc[k] + g * s.o[k] * (1 - s.tc[k] * s.tc[k]));
            const da = {
                o: dh.map((g, k) => g * s.tc[k] * s.o[k] * (1 - s.o[k])),
                f: dct.map((g, k) => g * s.cPrev[k] * s.f[k] * (1 - s.f[k])),
                i: dct.map((g, k) => g * s.g[k] * s.i[k] * (1 - s.i[k])),
                g: dct.map((g, k) => g * s.i[k] * (1 - s.g[k] * s.g[k])),
            };
            for (const g of GATES.lstm) {
                if (s.clamped?.[g]) da[g].fill(0);
                outer(grads[`W${g}`], da[g], s.hPrev); outer(grads[`U${g}`], da[g], s.x);
                for (let k = 0; k < H; k++) grads[`b${g}`][k] += da[g][k];
                mtv(p[`W${g}`], H, H, da[g], dhPrev);
                mtv(p[`U${g}`], H, I, da[g], dx);
            }
            dc = dct.map((g, k) => g * s.f[k]);
        } else {
            const dn = dh.map((g, k) => g * (1 - s.z[k]));
            const dz = dh.map((g, k) => g * (s.hPrev[k] - s.n[k]));
            for (let k = 0; k < H; k++) dhPrev[k] += dh[k] * s.z[k];
            const dan = dn.map((g, k) => g * (1 - s.n[k] * s.n[k]));
            outer(grads.Un, dan, s.x);
            mtv(p.Un, H, I, dan, dx);
            for (let k = 0; k < H; k++) grads.bn[k] += dan[k];
            const dm = dan.map((g, k) => g * s.r[k]);
            outer(grads.Wn, dm, s.hPrev);
            mtv(p.Wn, H, H, dm, dhPrev);
            const dar = dan.map((g, k) => g * s.m[k] * s.r[k] * (1 - s.r[k]));
            const daz = dz.map((g, k) => g * s.z[k] * (1 - s.z[k]));
            for (const [g, da] of [['z', daz], ['r', dar]]) {
                if (s.clamped?.[g]) da.fill(0);
                outer(grads[`W${g}`], da, s.hPrev); outer(grads[`U${g}`], da, s.x);
                for (let k = 0; k < H; k++) grads[`b${g}`][k] += da[k];
                mtv(p[`W${g}`], H, H, da, dhPrev);
                mtv(p[`U${g}`], H, I, da, dx);
            }
            dc = zeros(H);
        }
        dxAt[t] = dx;
        dh = dhPrev;
    }
    return { dh0: dh, dc0: dc, dhAt, dxAt };
}

/**
 * Loss and ∂L/∂y for one step's output. `target` is a number array for
 * 'mse' (mean of squared errors over the outputs) or a class index for
 * 'xent' (softmax cross-entropy). `weight` scales both.
 */
export function stepLoss(y, target, mode, weight = 1) {
    if (mode === 'xent') {
        const pr = softmax(y);
        const dy = Float64Array.from(pr, (v, k) => weight * (v - (k === target ? 1 : 0)));
        return { loss: -weight * Math.log(Math.max(pr[target], 1e-12)), dy };
    }
    let loss = 0;
    const dy = zeros(y.length);
    for (let k = 0; k < y.length; k++) {
        const e = y[k] - target[k];
        loss += (weight * e * e) / y.length;
        dy[k] = (2 * weight * e) / y.length;
    }
    return { loss, dy };
}

/**
 * Mean loss and gradients over a batch of { xs, targets } sequences, where
 * targets[t] is null on steps without a target. Each target counts equally.
 */
export function batchLossAndGrads(net, batch, mode = 'mse') {
    const grads = zeroGrads(net);
    let loss = 0, n = 0;
    for (const ex of batch) n += ex.targets.filter(t => t !== null && t !== undefined).length;
    const w = 1 / Math.max(1, n);
    for (const ex of batch) {
        const run = runSequence(net, ex.xs);
        const dys = run.steps.map((s, t) => {
            const tg = ex.targets[t];
            if (tg === null || tg === undefined) return null;
            const r = stepLoss(s.y, tg, mode, w);
            loss += r.loss;
            return r.dy;
        });
        backward(net, run, dys, grads);
    }
    return { loss, grads };
}

/** Scale all gradients down so their global norm is at most `max`. Returns the norm before clipping. */
export function clipGrads(grads, max) {
    let sq = 0;
    for (const g of Object.values(grads)) for (const v of g) sq += v * v;
    const norm = Math.sqrt(sq);
    if (norm > max) for (const g of Object.values(grads)) for (let i = 0; i < g.length; i++) g[i] *= max / norm;
    return norm;
}

/** Adam over a set of parameter objects ({ name: Float64Array }), with an optional frozen list. */
export function createAdam(params, { lr = 0.01, beta1 = 0.9, beta2 = 0.999, eps = 1e-8, frozen = [] } = {}) {
    const m = {}, v = {};
    for (const [k, a] of Object.entries(params)) { m[k] = zeros(a.length); v[k] = zeros(a.length); }
    let t = 0;
    return {
        get lr() { return lr; },
        set lr(x) { lr = x; },
        step(grads) {
            t++;
            for (const [k, a] of Object.entries(params)) {
                if (frozen.includes(k)) continue;
                const g = grads[k];
                for (let i = 0; i < a.length; i++) {
                    m[k][i] = beta1 * m[k][i] + (1 - beta1) * g[i];
                    v[k][i] = beta2 * v[k][i] + (1 - beta2) * g[i] * g[i];
                    a[i] -= (lr * (m[k][i] / (1 - beta1 ** t))) / (Math.sqrt(v[k][i] / (1 - beta2 ** t)) + eps);
                }
            }
        },
    };
}

/** A network from its JSON form ({ kind, input, hidden, output, params }), as scripts/ml/train_recurrent.mjs writes it. */
export function unpackRecurrent({ kind, input, hidden, output, params }) {
    const net = createRecurrent(kind, { input, hidden, output });
    for (const [k, shape] of Object.entries(net.shapes)) {
        const v = params[k];
        if (!v || v.length !== net.p[k].length) throw new Error(`recurrent: ${kind} parameter ${k} should hold ${shape.join('×')} numbers`);
        net.p[k] = Float64Array.from(v);
    }
    return net;
}

/** A deep copy of a network, so a trained one can be kept while another trains. */
export function cloneRecurrent(net) {
    return { ...net, p: Object.fromEntries(Object.entries(net.p).map(([k, v]) => [k, Float64Array.from(v)])) };
}

/** One-hot vector of length n. */
export const oneHot = (k, n) => { const v = zeros(n); if (k >= 0) v[k] = 1; return v; };
