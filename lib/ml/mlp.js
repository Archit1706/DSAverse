/* A multi-layer perceptron with a hand-written backward pass.

   autograd.js builds a graph node per number, which is what the
   Backpropagation page wants to draw but far too slow to train a network
   live. This is the same mathematics organised by layer: for each layer,
   deltaᵀ · activations gives the weight gradient, and delta · W times the
   activation's derivative carries the error one layer back. The engine's
   property tests check both against finite differences.

   A network is plain data — { sizes, activation, output, W, b } with each
   W[l] a row-major Float64Array of shape [out, in] — so pages can read any
   weight to colour an edge, and a test can perturb any one of them. */

import { createRng } from '../random.js';
import { sigmoid } from './tensor.js';

export const ACTIVATIONS = {
    relu: { f: (x) => (x > 0 ? x : 0), d: (z) => (z > 0 ? 1 : 0) },
    leakyRelu: { f: (x) => (x > 0 ? x : 0.01 * x), d: (z) => (z > 0 ? 1 : 0.01) },
    tanh: { f: Math.tanh, d: (z, a) => 1 - a * a },
    sigmoid: { f: sigmoid, d: (z, a) => a * (1 - a) },
    linear: { f: (x) => x, d: () => 1 },
};

/** sizes like [2, 4, 4, 1]. output: 'sigmoid' (binary), 'softmax' (classes) or 'linear' (regression). */
export function createMLP(sizes, { activation = 'tanh', output = 'sigmoid', seed = 1, init = 'auto', scale = 1 } = {}) {
    if (!ACTIVATIONS[activation]) throw new Error(`createMLP: unknown activation "${activation}"`);
    const rng = createRng(seed);
    const W = [], b = [];
    for (let l = 0; l < sizes.length - 1; l++) {
        const fanIn = sizes[l], fanOut = sizes[l + 1];
        // He initialisation for ReLU-family layers, Xavier otherwise: both keep
        // the activations' spread roughly constant from layer to layer.
        const kind = init === 'auto' ? (activation.includes('elu') || activation === 'relu' ? 'he' : 'xavier') : init;
        const sd = (kind === 'he' ? Math.sqrt(2 / fanIn) : kind === 'xavier' ? Math.sqrt(1 / fanIn) : 0.1) * scale;
        const w = new Float64Array(fanOut * fanIn);
        for (let i = 0; i < w.length; i++) w[i] = rng.normal(0, sd);
        W.push(w);
        b.push(new Float64Array(fanOut));
    }
    return { sizes: [...sizes], activation, output, W, b };
}

export function cloneMLP(net) {
    return { ...net, sizes: [...net.sizes], W: net.W.map(w => w.slice()), b: net.b.map(v => v.slice()) };
}

/** Forward pass over a batch X (array of input arrays). Returns every layer's
    pre-activations Z and activations A (A[0] is the input), for drawing. */
export function forward(net, X, { dropout = 0, rng = null } = {}) {
    const { sizes, W, b } = net;
    const N = X.length;
    const L = sizes.length - 1;
    const act = ACTIVATIONS[net.activation];
    const A = [Float64Array.from(X.flat())];
    const Z = [null];
    const masks = [null];
    for (let l = 0; l < L; l++) {
        const nIn = sizes[l], nOut = sizes[l + 1];
        const prev = A[l];
        const z = new Float64Array(N * nOut);
        const w = W[l], bias = b[l];
        for (let s = 0; s < N; s++) {
            for (let o = 0; o < nOut; o++) {
                let sum = bias[o];
                for (let i = 0; i < nIn; i++) sum += w[o * nIn + i] * prev[s * nIn + i];
                z[s * nOut + o] = sum;
            }
        }
        const a = new Float64Array(N * nOut);
        const last = l === L - 1;
        let mask = null;
        if (last) {
            if (net.output === 'sigmoid') for (let i = 0; i < a.length; i++) a[i] = sigmoid(z[i]);
            else if (net.output === 'softmax') {
                for (let s = 0; s < N; s++) {
                    let max = -Infinity;
                    for (let o = 0; o < nOut; o++) max = Math.max(max, z[s * nOut + o]);
                    let sum = 0;
                    for (let o = 0; o < nOut; o++) { const e = Math.exp(z[s * nOut + o] - max); a[s * nOut + o] = e; sum += e; }
                    for (let o = 0; o < nOut; o++) a[s * nOut + o] /= sum;
                }
            } else a.set(z);
        } else {
            for (let i = 0; i < a.length; i++) a[i] = act.f(z[i]);
            if (dropout > 0 && rng) {
                // Inverted dropout: survivors are scaled up so the expected
                // activation is unchanged and nothing changes at test time.
                mask = new Float64Array(a.length);
                for (let i = 0; i < a.length; i++) {
                    mask[i] = rng.next() < dropout ? 0 : 1 / (1 - dropout);
                    a[i] *= mask[i];
                }
            }
        }
        Z.push(z);
        A.push(a);
        masks.push(mask);
    }
    return { Z, A, masks, N };
}

/** Loss and gradients for a batch. Y holds 0/1 labels ('sigmoid'), class
    indices ('softmax') or target numbers ('linear'). l2 adds λ/2·Σw². */
export function lossAndGrads(net, X, Y, { l2 = 0, dropout = 0, rng = null } = {}) {
    const { sizes, W } = net;
    const L = sizes.length - 1;
    const cache = forward(net, X, { dropout, rng });
    const { Z, A, masks, N } = cache;
    const nOut = sizes[L];
    const out = A[L];
    let dataLoss = 0;
    let delta = new Float64Array(N * nOut);
    for (let s = 0; s < N; s++) {
        if (net.output === 'sigmoid') {
            const p = out[s], y = Y[s], z = Z[L][s];
            // Binary cross-entropy from the logit, which stays finite when p
            // rounds to exactly 0 or 1.
            dataLoss += Math.max(z, 0) - z * y + Math.log1p(Math.exp(-Math.abs(z)));
            delta[s] = (p - y) / N;
        } else if (net.output === 'softmax') {
            const y = Y[s];
            dataLoss += -Math.log(Math.max(out[s * nOut + y], 1e-300));
            for (let o = 0; o < nOut; o++) delta[s * nOut + o] = (out[s * nOut + o] - (o === y ? 1 : 0)) / N;
        } else {
            const ys = Array.isArray(Y[s]) ? Y[s] : [Y[s]];
            for (let o = 0; o < nOut; o++) {
                const d = out[s * nOut + o] - ys[o];
                dataLoss += d * d;
                delta[s * nOut + o] = (2 * d) / N;
            }
        }
    }
    dataLoss /= N;
    let reg = 0;
    if (l2 > 0) for (const w of W) for (let i = 0; i < w.length; i++) reg += 0.5 * l2 * w[i] * w[i];

    const gradW = new Array(L), gradB = new Array(L);
    const act = ACTIVATIONS[net.activation];
    for (let l = L - 1; l >= 0; l--) {
        const nIn = sizes[l], nO = sizes[l + 1];
        const prev = A[l];
        const gw = new Float64Array(nO * nIn), gb = new Float64Array(nO);
        for (let s = 0; s < N; s++) {
            for (let o = 0; o < nO; o++) {
                const d = delta[s * nO + o];
                if (d === 0) continue;
                gb[o] += d;
                for (let i = 0; i < nIn; i++) gw[o * nIn + i] += d * prev[s * nIn + i];
            }
        }
        if (l2 > 0) for (let i = 0; i < gw.length; i++) gw[i] += l2 * W[l][i];
        gradW[l] = gw;
        gradB[l] = gb;
        if (l > 0) {
            const next = new Float64Array(N * nIn);
            const w = W[l];
            for (let s = 0; s < N; s++) {
                for (let i = 0; i < nIn; i++) {
                    let sum = 0;
                    for (let o = 0; o < nO; o++) sum += delta[s * nO + o] * w[o * nIn + i];
                    const idx = s * nIn + i;
                    // A[l] includes the dropout scaling, so recover the plain
                    // activation before asking for the derivative.
                    const m = masks[l] ? masks[l][idx] : 1;
                    const aPlain = m === 0 ? act.f(Z[l][idx]) : A[l][idx] / m;
                    next[idx] = sum * act.d(Z[l][idx], aPlain) * m;
                }
            }
            delta = next;
        }
    }
    return { loss: dataLoss + reg, dataLoss, gradW, gradB, cache };
}

/** Output of the network for one input — what a decision-boundary field samples. */
export function predict(net, x) {
    const { A } = forward(net, [x]);
    return Array.from(A[A.length - 1]);
}

export function accuracy(net, X, Y) {
    if (X.length === 0) return 0;
    const { A } = forward(net, X);
    const out = A[A.length - 1];
    const k = net.sizes[net.sizes.length - 1];
    let right = 0;
    for (let s = 0; s < X.length; s++) {
        if (net.output === 'sigmoid') right += (out[s] >= 0.5 ? 1 : 0) === Y[s] ? 1 : 0;
        else {
            let best = 0;
            for (let o = 1; o < k; o++) if (out[s * k + o] > out[s * k + best]) best = o;
            right += best === Y[s] ? 1 : 0;
        }
    }
    return right / X.length;
}

/** SGD, momentum, RMSProp or Adam, updating the network in place. */
export function createOptimizer(net, { type = 'sgd', lr = 0.1, momentum = 0.9, beta1 = 0.9, beta2 = 0.999, eps = 1e-8 } = {}) {
    const zeros = () => ({ W: net.W.map(w => new Float64Array(w.length)), b: net.b.map(v => new Float64Array(v.length)) });
    const m = zeros(), v = zeros();
    let t = 0;
    const update = (param, grad, mBuf, vBuf) => {
        for (let i = 0; i < param.length; i++) {
            const g = grad[i];
            if (type === 'sgd') param[i] -= lr * g;
            else if (type === 'momentum') { mBuf[i] = momentum * mBuf[i] + g; param[i] -= lr * mBuf[i]; }
            else if (type === 'rmsprop') { vBuf[i] = beta2 * vBuf[i] + (1 - beta2) * g * g; param[i] -= (lr * g) / (Math.sqrt(vBuf[i]) + eps); }
            else if (type === 'adam') {
                mBuf[i] = beta1 * mBuf[i] + (1 - beta1) * g;
                vBuf[i] = beta2 * vBuf[i] + (1 - beta2) * g * g;
                const mh = mBuf[i] / (1 - beta1 ** t), vh = vBuf[i] / (1 - beta2 ** t);
                param[i] -= (lr * mh) / (Math.sqrt(vh) + eps);
            } else throw new Error(`optimizer: unknown type "${type}"`);
        }
    };
    return {
        type,
        get lr() { return lr; },
        set lr(x) { lr = x; },
        step({ gradW, gradB }) {
            t++;
            for (let l = 0; l < net.W.length; l++) {
                update(net.W[l], gradW[l], m.W[l], v.W[l]);
                update(net.b[l], gradB[l], m.b[l], v.b[l]);
            }
        },
    };
}

/** Every parameter in one array, weights then biases layer by layer. */
export function flatParams(net) {
    const out = [];
    for (let l = 0; l < net.W.length; l++) out.push(...net.W[l], ...net.b[l]);
    return out;
}

export function setFlatParams(net, flat) {
    let k = 0;
    for (let l = 0; l < net.W.length; l++) {
        for (let i = 0; i < net.W[l].length; i++) net.W[l][i] = flat[k++];
        for (let i = 0; i < net.b[l].length; i++) net.b[l][i] = flat[k++];
    }
}

export function flatGrads({ gradW, gradB }) {
    const out = [];
    for (let l = 0; l < gradW.length; l++) out.push(...gradW[l], ...gradB[l]);
    return out;
}
