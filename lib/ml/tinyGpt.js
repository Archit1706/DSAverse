/* The tiny GPT, run in the browser.

   A 3-layer, 4-head decoder with 64-dimensional embeddings and a 640-token
   vocabulary (about 195,000 parameters), trained by scripts/ml on stories
   from lib/ml/stories.js. Its weights ship as float16 in
   public/models/tiny-gpt/ and are fetched only by pages that use it.

   forward() mirrors the PyTorch model in scripts/ml/train_tiny_gpt.py line
   for line — the same pre-LayerNorm block, the same tanh-GELU, the output
   layer tied to the token embeddings — and returns every intermediate the
   Transformers and Language Models pages draw: embeddings, Q, K and V, each
   head's scores and weights, the feed-forward activations and the logits.
   A property test checks the logits and attention against PyTorch's. */

import {
    mat, matmul, add, scale, map, transpose, sliceCols, concatCols,
    softmaxRows, layerNormRows, gelu, softmax, row,
} from './tensor.js';
import { makeTokenizer } from './bpe.js';

export const TINY_GPT_BASE = '/models/tiny-gpt';

function halfToFloat(h) {
    const sign = h & 0x8000 ? -1 : 1;
    const exp = (h >> 10) & 0x1f;
    const frac = h & 0x3ff;
    if (exp === 0) return sign * 2 ** -14 * (frac / 1024);
    if (exp === 31) return frac ? NaN : sign * Infinity;
    return sign * 2 ** (exp - 15) * (1 + frac / 1024);
}

/** Assemble a model from its manifest, weight bytes and tokenizer file. */
export function buildTinyGpt(manifest, buffer, tokenizerJson) {
    const view = new DataView(buffer);
    const tensors = {};
    for (const { name, shape, offset } of manifest.tensors) {
        const [r, c] = shape.length === 2 ? shape : [1, shape[0]];
        const m = mat(r, c);
        for (let i = 0; i < r * c; i++) m.data[i] = halfToFloat(view.getUint16((offset + i) * 2, true));
        tensors[name] = m;
    }
    // The output layer is the embedding matrix transposed (weight tying).
    tensors.wteT = transpose(tensors.wte);
    return {
        config: manifest.config,
        params: manifest.params,
        training: manifest.training,
        tensors,
        tokenizer: makeTokenizer(tokenizerJson.merges),
    };
}

let pending = null;

/** Fetch and build the model once per page load. A failed fetch can be retried. */
export function loadTinyGpt(base = TINY_GPT_BASE) {
    if (!pending) {
        const get = (file, kind) => fetch(`${base}/${file}`).then(r => {
            if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
            return r[kind]();
        });
        pending = Promise.all([get('model.json', 'json'), get('weights.bin', 'arrayBuffer'), get('tokenizer.json', 'json')])
            .then(([manifest, buffer, tok]) => buildTinyGpt(manifest, buffer, tok))
            .catch(err => { pending = null; throw err; });
    }
    return pending;
}

const vec = (m) => m.data;

/** Run the model on token ids. With capture, every intermediate is kept;
    without it, only the last position's logits are computed, for speed.
    `unscaled` drops the 1/√d_k on the attention scores — a deliberate
    break, for pages that show why the scaling is there. */
export function forward(model, ids, { capture = true, unscaled = false } = {}) {
    const { d, heads, layers, ctx } = model.config;
    if (ids.length === 0) throw new Error('forward: no tokens');
    if (ids.length > ctx) throw new Error(`forward: ${ids.length} tokens exceed the context window of ${ctx}`);
    const t = model.tensors;
    const T = ids.length;
    const hd = d / heads;

    const tokEmb = mat(T, d), posEmb = mat(T, d);
    for (let i = 0; i < T; i++) {
        tokEmb.data.set(t.wte.data.subarray(ids[i] * d, (ids[i] + 1) * d), i * d);
        posEmb.data.set(t.wpe.data.subarray(i * d, (i + 1) * d), i * d);
    }
    let x = add(tokEmb, posEmb);
    const blocks = [];

    for (let l = 0; l < layers; l++) {
        const p = (n) => t[`h${l}.${n}`];
        const ln1 = layerNormRows(x, vec(p('ln1_g')), vec(p('ln1_b')));
        const q = add(matmul(ln1, p('wq')), p('bq'));
        const k = add(matmul(ln1, p('wk')), p('bk'));
        const v = add(matmul(ln1, p('wv')), p('bv'));
        const headTrace = [];
        const outs = [];
        for (let h = 0; h < heads; h++) {
            const qh = sliceCols(q, h * hd, (h + 1) * hd);
            const kh = sliceCols(k, h * hd, (h + 1) * hd);
            const vh = sliceCols(v, h * hd, (h + 1) * hd);
            const scores = scale(matmul(qh, transpose(kh)), unscaled ? 1 : 1 / Math.sqrt(hd));
            for (let i = 0; i < T; i++) for (let j = i + 1; j < T; j++) scores.data[i * T + j] = -Infinity;
            const weights = softmaxRows(scores);
            const out = matmul(weights, vh);
            outs.push(out);
            if (capture) headTrace.push({ q: qh, k: kh, v: vh, scores, weights, out });
        }
        const attnOut = add(matmul(concatCols(outs), p('wo')), p('bo'));
        const resid1 = add(x, attnOut);
        const ln2 = layerNormRows(resid1, vec(p('ln2_g')), vec(p('ln2_b')));
        const ffnPre = add(matmul(ln2, p('w1')), p('b1'));
        const ffnAct = map(ffnPre, gelu);
        const ffnOut = add(matmul(ffnAct, p('w2')), p('b2'));
        const resid2 = add(resid1, ffnOut);
        if (capture) blocks.push({ input: x, ln1, q, k, v, heads: headTrace, attnOut, resid1, ln2, ffnPre, ffnAct, ffnOut, output: resid2 });
        x = resid2;
    }

    const final = layerNormRows(x, vec(t.lnf_g), vec(t.lnf_b));
    if (!capture) {
        const last = mat(1, d);
        last.data.set(final.data.subarray((T - 1) * d, T * d));
        return { logits: matmul(last, t.wteT), lastOnly: true };
    }
    return { ids, tokEmb, posEmb, blocks, final, logits: matmul(final, t.wteT) };
}

/** Logits and probabilities for the token after `ids` (the last ctx tokens are used). */
export function nextToken(model, ids, { temperature = 1 } = {}) {
    const window = ids.slice(-model.config.ctx);
    const { logits } = forward(model, window, { capture: false });
    const lg = row(logits, logits.rows - 1);
    return { logits: lg, probs: softmax(lg, temperature) };
}

/** Keep the k most likely tokens and renormalise. */
export function filterTopK(probs, k) {
    if (!k || k >= probs.length) return probs.slice();
    const keep = new Set(rankTokens(probs).slice(0, k));
    return renormalise(probs.map((p, i) => (keep.has(i) ? p : 0)));
}

/** Keep the smallest set of most likely tokens whose total reaches p (nucleus sampling). */
export function filterTopP(probs, p) {
    if (p >= 1) return probs.slice();
    const order = rankTokens(probs);
    const keep = new Set();
    let total = 0;
    for (const i of order) {
        keep.add(i);
        total += probs[i];
        if (total >= p) break;
    }
    return renormalise(probs.map((q, i) => (keep.has(i) ? q : 0)));
}

/** Token ids sorted most likely first; ties keep the lower id first. */
export function rankTokens(probs) {
    return probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a] || a - b);
}

function renormalise(ps) {
    const s = ps.reduce((a, b) => a + b, 0);
    return ps.map(q => q / s);
}

/** Draw a token from a distribution with a seeded generator (createRng). */
export function sampleToken(probs, rng) {
    let u = rng.next();
    for (let i = 0; i < probs.length; i++) {
        u -= probs[i];
        if (u < 0) return i;
    }
    return rankTokens(probs)[0];
}

/** Autoregressive generation: predict, filter, sample, append, repeat.
    Returns the tokens plus each step's top candidates for playback. */
export function generate(model, promptIds, rng, { maxTokens = 40, temperature = 0.8, topK = 0, topP = 1, greedy = false, stopAtNewline = true } = {}) {
    const ids = [...promptIds];
    const steps = [];
    for (let n = 0; n < maxTokens; n++) {
        const { probs } = nextToken(model, ids, { temperature: greedy ? 1 : temperature });
        let filtered = filterTopK(probs, topK);
        filtered = filterTopP(filtered, topP);
        const chosen = greedy ? rankTokens(probs)[0] : sampleToken(filtered, rng);
        steps.push({
            position: ids.length,
            top: rankTokens(probs).slice(0, 8).map(id => ({ id, p: probs[id], kept: filtered[id] > 0 })),
            chosen,
        });
        ids.push(chosen);
        if (stopAtNewline && model.tokenizer.decode([chosen]).includes('\n')) break;
    }
    return { ids, steps };
}
