/* The tiny GPT's forward pass with switches, for the Transformers pages.
   lib/ml/tinyGpt.js runs the model as trained; these functions run the same
   weights with one piece taken out or swapped, so a page can show what that
   piece was doing: no causal mask, no position embeddings, no ÷√d, no
   residual connection, a chosen set of heads switched off. With every
   switch at its default, `forwardWith` returns exactly what tinyGpt's
   `forward` returns (the Transformers suites check that).

   Also here: plain-array attention for hand-sized examples, and the two
   position schemes the model does not use — sinusoidal encodings (the
   original Transformer) and rotary embeddings (RoPE, most modern LLMs). */
import {
    mat, add, matmul, transpose, scale, sliceCols, concatCols, softmaxRows, layerNormRows, map, gelu, softmax, dot,
} from './tensor.js';

const vec = (m) => Array.from(m.data);

/**
 * forwardWith(model, ids, options) → the same trace as tinyGpt.forward:
 * { ids, tokEmb, posEmb, blocks: [{ input, ln1, q, k, v, heads: [{ q, k, v, scores, weights, out }],
 *   attnOut, resid1, ln2, ffnPre, ffnAct, ffnOut, output }], final, logits }.
 *
 * options:
 *   mask       true   causal mask (scores above the diagonal set to −∞)
 *   positions  true   add the learned position embeddings
 *   scaled     true   divide scores by √(head size)
 *   residual   true   add each sublayer's output back to its input
 *   headsOff   []     [layer, head] pairs whose output is replaced by zeros
 *   layers     all    how many blocks to run
 */
export function forwardWith(model, ids, { mask = true, positions = true, scaled = true, residual = true, headsOff = [], layers } = {}) {
    const { d, heads, ctx } = model.config;
    const L = layers ?? model.config.layers;
    if (ids.length === 0) throw new Error('forwardWith: no tokens');
    if (ids.length > ctx) throw new Error(`forwardWith: ${ids.length} tokens exceed the context window of ${ctx}`);
    const t = model.tensors;
    const T = ids.length, hd = d / heads;
    const off = new Set(headsOff.map(([l, h]) => `${l}.${h}`));

    const tokEmb = mat(T, d), posEmb = mat(T, d);
    for (let i = 0; i < T; i++) {
        tokEmb.data.set(t.wte.data.subarray(ids[i] * d, (ids[i] + 1) * d), i * d);
        if (positions) posEmb.data.set(t.wpe.data.subarray(i * d, (i + 1) * d), i * d);
    }
    let x = add(tokEmb, posEmb);
    const blocks = [];
    for (let l = 0; l < L; l++) {
        const p = (n) => t[`h${l}.${n}`];
        const ln1 = layerNormRows(x, vec(p('ln1_g')), vec(p('ln1_b')));
        const q = add(matmul(ln1, p('wq')), p('bq'));
        const k = add(matmul(ln1, p('wk')), p('bk'));
        const v = add(matmul(ln1, p('wv')), p('bv'));
        const trace = [], outs = [];
        for (let h = 0; h < heads; h++) {
            const qh = sliceCols(q, h * hd, (h + 1) * hd), kh = sliceCols(k, h * hd, (h + 1) * hd), vh = sliceCols(v, h * hd, (h + 1) * hd);
            const scores = scale(matmul(qh, transpose(kh)), scaled ? 1 / Math.sqrt(hd) : 1);
            if (mask) for (let i = 0; i < T; i++) for (let j = i + 1; j < T; j++) scores.data[i * T + j] = -Infinity;
            const weights = softmaxRows(scores);
            const out = off.has(`${l}.${h}`) ? mat(T, hd) : matmul(weights, vh);
            outs.push(out);
            trace.push({ q: qh, k: kh, v: vh, scores, weights, out });
        }
        const attnOut = add(matmul(concatCols(outs), p('wo')), p('bo'));
        const resid1 = residual ? add(x, attnOut) : attnOut;
        const ln2 = layerNormRows(resid1, vec(p('ln2_g')), vec(p('ln2_b')));
        const ffnPre = add(matmul(ln2, p('w1')), p('b1'));
        const ffnAct = map(ffnPre, gelu);
        const ffnOut = add(matmul(ffnAct, p('w2')), p('b2'));
        const output = residual ? add(resid1, ffnOut) : ffnOut;
        blocks.push({ input: x, ln1, q, k, v, heads: trace, attnOut, resid1, ln2, ffnPre, ffnAct, ffnOut, output });
        x = output;
    }
    const final = layerNormRows(x, vec(t.lnf_g), vec(t.lnf_b));
    return { ids, tokEmb, posEmb, blocks, final, logits: matmul(final, t.wteT) };
}

/** Mean next-token cross-entropy and accuracy of a logits matrix against ids. */
export function nextTokenScore(logits, ids) {
    let loss = 0, right = 0;
    const n = ids.length - 1;
    for (let i = 0; i < n; i++) {
        const p = softmax(Array.from(logits.data.subarray(i * logits.cols, (i + 1) * logits.cols)));
        loss -= Math.log(Math.max(p[ids[i + 1]], 1e-300));
        let best = 0;
        for (let c = 1; c < p.length; c++) if (p[c] > p[best]) best = c;
        if (best === ids[i + 1]) right++;
    }
    return { loss: loss / n, accuracy: right / n, n };
}

/**
 * Attention on plain arrays: queries Q (T×d), keys K (S×d), values V (S×e).
 * Returns { scores, weights, out } as arrays of rows. `mask` keeps key j for
 * query i only when j ≤ i; masked scores are −∞ and their weights exactly 0.
 */
export function attend(Q, K, V, { scaled = true, mask = false } = {}) {
    const dk = K[0]?.length ?? 1;
    const scores = Q.map((q, i) => K.map((k, j) => (mask && j > i ? -Infinity : dot(q, k) / (scaled ? Math.sqrt(dk) : 1))));
    const weights = scores.map(r => softmax(r));
    const out = weights.map(w => V[0].map((_, c) => w.reduce((a, wj, j) => a + wj * V[j][c], 0)));
    return { scores, weights, out };
}

/** Sinusoidal position encoding (Vaswani et al. 2017): PE(p, 2i) = sin(p / 10000^(2i/d)), PE(p, 2i+1) = cos(…). */
export function sinusoidal(p, d, base = 10000) {
    const out = new Array(d);
    for (let i = 0; i < d; i += 2) {
        const w = 1 / base ** (i / d);
        out[i] = Math.sin(p * w);
        if (i + 1 < d) out[i + 1] = Math.cos(p * w);
    }
    return out;
}

/** Rotary position embedding: rotate each pair (x₂ᵢ, x₂ᵢ₊₁) by angle p·θᵢ, θᵢ = base^(−2i/d). */
export function rope(x, p, base = 10000) {
    const d = x.length, out = new Array(d);
    for (let i = 0; i < d; i += 2) {
        const a = p / base ** (i / d), c = Math.cos(a), s = Math.sin(a);
        out[i] = x[i] * c - x[i + 1] * s;
        out[i + 1] = x[i] * s + x[i + 1] * c;
    }
    return out;
}
