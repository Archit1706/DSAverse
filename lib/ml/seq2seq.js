/* Encoder–decoder (sequence-to-sequence) networks built from two GRUs in
   ./recurrent.js, with hand-written backpropagation through both.

   Without attention, the encoder reads the source one word at a time and
   its final state is the only thing the decoder receives: the whole
   sentence squeezed into H numbers. With attention (Luong's dot-product
   form), each decoder step also scores every encoder state against its own
   state, softmaxes the scores into weights α, and reads the weighted average
   ctx = Σ αⱼ eⱼ; the output layer sees [h; ctx].

   Words go in as one-hot vectors. The decoder is fed the previous target
   word (teacher forcing) during training, and its own previous guess when
   translating. */

import { createRecurrent, runSequence, backward, zeroGrads, stepLoss, softmax, oneHot, unpackRecurrent } from './recurrent.js';
import { createRng } from '../random.js';

/**
 * A fresh model. `p` is one flat map of every parameter (shared with the
 * two GRUs, so an optimiser over `p` trains them): 'enc.Wz', 'dec.Un', …,
 * plus 'Wo' [V, 2H] and 'bo' [V] when attention is on.
 */
export function createSeq2Seq({ srcVocab, tgtVocab, hidden, attention = false, seed = 1 }) {
    const enc = createRecurrent('gru', { input: srcVocab, hidden, output: 1, seed });
    const dec = createRecurrent('gru', { input: tgtVocab, hidden, output: attention ? 1 : tgtVocab, seed: seed + 1 });
    const model = { kind: 'seq2seq', attention, H: hidden, Vs: srcVocab, Vt: tgtVocab, enc, dec };
    if (attention) {
        const rng = createRng(seed + 2), s = 1 / Math.sqrt(2 * hidden);
        model.Wo = Float64Array.from({ length: tgtVocab * 2 * hidden }, () => (rng.next() * 2 - 1) * s);
        model.bo = new Float64Array(tgtVocab);
    }
    return withFlatParams(model);
}

function withFlatParams(model) {
    const p = {};
    for (const [k, v] of Object.entries(model.enc.p)) p[`enc.${k}`] = v;
    for (const [k, v] of Object.entries(model.dec.p)) p[`dec.${k}`] = v;
    if (model.attention) { p.Wo = model.Wo; p.bo = model.bo; }
    model.p = p;
    return model;
}

export const seq2seqParamCount = (model) => Object.entries(model.p)
    // the GRUs' own readouts that this model never uses
    .filter(([k]) => !(k === 'enc.V' || k === 'enc.c' || (model.attention && (k === 'dec.V' || k === 'dec.c'))))
    .reduce((a, [, v]) => a + v.length, 0);

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/** The output layer of one decoder step: logits, plus the attention it used. */
function readout(model, h, E) {
    if (!model.attention) return null;
    const { H, Vt, Wo, bo } = model;
    const scores = E.map(e => dot(h, e));
    const alpha = softmax(scores);
    const ctx = new Float64Array(H);
    E.forEach((e, j) => { for (let k = 0; k < H; k++) ctx[k] += alpha[j] * e[k]; });
    const logits = Float64Array.from(bo);
    for (let v = 0; v < Vt; v++) {
        let s = 0;
        for (let k = 0; k < H; k++) s += Wo[v * 2 * H + k] * h[k] + Wo[v * 2 * H + H + k] * ctx[k];
        logits[v] += s;
    }
    return { scores, alpha, ctx, logits };
}

/** Encode a source sentence: the encoder run and its states E (one per word). */
export function encode(model, src) {
    const encRun = runSequence(model.enc, src.map(i => oneHot(i, model.Vs)));
    return { encRun, E: encRun.steps.map(s => s.h) };
}

/**
 * Teacher-forced pass: `tgtIn` are the decoder's input ids (start marker,
 * then the target shifted right). Every step's logits, and with attention
 * its scores, weights and context.
 */
export function forward(model, src, tgtIn) {
    const { encRun, E } = encode(model, src);
    const decRun = runSequence(model.dec, tgtIn.map(i => oneHot(i, model.Vt)), { h: E[E.length - 1] });
    const steps = decRun.steps.map(s => {
        const r = readout(model, s.h, E);
        return r ?? { logits: s.y };
    });
    return { encRun, decRun, E, steps };
}

/**
 * Mean cross-entropy per target word over a batch of { src, tgt } pairs
 * (tgt ends with the end marker) and its gradient, keyed like `model.p`.
 */
export function seq2seqLossAndGrads(model, batch, bos) {
    const { H, Vt, attention } = model;
    const gEnc = zeroGrads(model.enc), gDec = zeroGrads(model.dec);
    const gWo = attention ? new Float64Array(model.Wo.length) : null, gbo = attention ? new Float64Array(Vt) : null;
    const total = batch.reduce((a, ex) => a + ex.tgt.length, 0);
    const w = 1 / total;
    let loss = 0;
    for (const ex of batch) {
        const tgtIn = [bos, ...ex.tgt.slice(0, -1)];
        const fw = forward(model, ex.src, tgtIn);
        const { E } = fw;
        const dE = E.map(() => new Float64Array(H));
        const dys = [], dhExtra = [];
        fw.steps.forEach((st, t) => {
            const r = stepLoss(st.logits, ex.tgt[t], 'xent', w);
            loss += r.loss;
            if (!attention) { dys.push(r.dy); dhExtra.push(null); return; }
            dys.push(null);
            const h = fw.decRun.steps[t].h;
            const dh = new Float64Array(H), dctx = new Float64Array(H);
            for (let v = 0; v < Vt; v++) {
                const g = r.dy[v];
                gbo[v] += g;
                for (let k = 0; k < H; k++) {
                    gWo[v * 2 * H + k] += g * h[k];
                    gWo[v * 2 * H + H + k] += g * st.ctx[k];
                    dh[k] += g * model.Wo[v * 2 * H + k];
                    dctx[k] += g * model.Wo[v * 2 * H + H + k];
                }
            }
            const dAlpha = E.map(e => dot(dctx, e));
            const mean = st.alpha.reduce((a, al, j) => a + al * dAlpha[j], 0);
            E.forEach((e, j) => {
                const ds = st.alpha[j] * (dAlpha[j] - mean);
                for (let k = 0; k < H; k++) {
                    dE[j][k] += st.alpha[j] * dctx[k] + ds * h[k];
                    dh[k] += ds * e[k];
                }
            });
            dhExtra.push(dh);
        });
        const { dh0 } = backward(model.dec, fw.decRun, dys, gDec, { dhExtra });
        backward(model.enc, fw.encRun, E.map(() => null), gEnc, { dhFinal: dh0, dhExtra: attention ? dE : null });
    }
    const grads = {};
    for (const [k, v] of Object.entries(gEnc)) grads[`enc.${k}`] = v;
    for (const [k, v] of Object.entries(gDec)) grads[`dec.${k}`] = v;
    if (attention) { grads.Wo = gWo; grads.bo = gbo; }
    return { loss, grads };
}

/**
 * Greedy translation: feed back the most likely word until the end marker
 * or `maxLen` words. Returns the ids (without the end marker) and every
 * step's probabilities, decoder state and attention weights.
 */
export function translate(model, src, { bos, eos, maxLen = 40 }) {
    const { E } = encode(model, src);
    let h = E[E.length - 1];
    let prev = bos;
    const out = [], steps = [];
    for (let t = 0; t < maxLen; t++) {
        const r = runSequence(model.dec, [oneHot(prev, model.Vt)], { h });
        h = r.h;
        const ro = readout(model, h, E);
        const logits = ro ? ro.logits : r.steps[0].y;
        const probs = softmax(logits);
        let best = 0;
        for (let v = 1; v < probs.length; v++) if (probs[v] > probs[best]) best = v;
        steps.push({ h, probs, alpha: ro?.alpha ?? null, scores: ro?.scores ?? null, word: best });
        if (best === eos) break;
        out.push(best);
        prev = best;
    }
    return { ids: out, steps, E };
}

/** JSON form, as scripts/ml/train_recurrent.mjs writes it. */
export function packSeq2Seq(model) {
    const pk = (net) => ({ kind: net.kind, input: net.I, hidden: net.H, output: net.O, params: Object.fromEntries(Object.entries(net.p).map(([k, v]) => [k, Array.from(v)])) });
    return {
        kind: 'seq2seq', attention: model.attention, hidden: model.H, srcVocab: model.Vs, tgtVocab: model.Vt,
        enc: pk(model.enc), dec: pk(model.dec),
        ...(model.attention ? { Wo: Array.from(model.Wo), bo: Array.from(model.bo) } : {}),
    };
}

export function unpackSeq2Seq(json) {
    const model = { kind: 'seq2seq', attention: json.attention, H: json.hidden, Vs: json.srcVocab, Vt: json.tgtVocab, enc: unpackRecurrent(json.enc), dec: unpackRecurrent(json.dec) };
    if (json.attention) {
        if (json.Wo.length !== json.tgtVocab * 2 * json.hidden || json.bo.length !== json.tgtVocab) throw new Error('seq2seq: attention readout has the wrong size');
        model.Wo = Float64Array.from(json.Wo);
        model.bo = Float64Array.from(json.bo);
    }
    return withFlatParams(model);
}

const pendingFiles = {};
/**
 * Load public/models/recurrent/translate.json with both models unpacked:
 * { ...file, nets: { plain, attention } }. Memoised, and dropped on failure
 * so a retry fetches again.
 */
export function loadTranslateModels(url = '/models/recurrent/translate.json') {
    if (!pendingFiles[url]) {
        pendingFiles[url] = fetch(url)
            .then(r => { if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); })
            .then(file => ({ ...file, nets: Object.fromEntries(Object.entries(file.models).map(([k, m]) => [k, unpackSeq2Seq(m)])) }))
            .catch(err => { delete pendingFiles[url]; throw err; });
    }
    return pendingFiles[url];
}
