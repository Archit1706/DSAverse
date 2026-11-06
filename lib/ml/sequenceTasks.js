/* The toy sequence tasks the recurrent models in public/models/recurrent/
   were trained on. The training script, the pages and their tests all build
   sequences here, so a page can only ever show the model data shaped exactly
   like what it learned from.

   Hold a number. Every step brings a random value v in (−1, 1) and a marker
   bit; the marker flags one of the first three steps. From step 4 on, the
   network must keep reporting the flagged value, while new random values
   keep arriving and must be ignored. Storing a real number while ignoring
   later inputs is what gates are for: a plain RNN has no way to switch its
   input off, so the noise leaks in. */

import { createRng } from '../random.js';
import { runSequence, unpackRecurrent } from './recurrent.js';

export const RECURRENT_BASE = '/models/recurrent';
const pending = {};

/**
 * Load a trained file from public/models/recurrent/ (hold.json, …) with its
 * networks unpacked: { ...file, nets: { rnn, lstm, gru } }. Memoised per file,
 * and dropped on failure so a retry fetches again.
 */
export function loadRecurrentFile(name, base = RECURRENT_BASE) {
    const key = `${base}/${name}`;
    if (!pending[key]) {
        pending[key] = fetch(key)
            .then(r => { if (!r.ok) throw new Error(`${key}: HTTP ${r.status}`); return r.json(); })
            .then(file => ({ ...file, nets: Object.fromEntries(Object.entries(file.models).map(([k, m]) => [k, unpackRecurrent(m)])) }))
            .catch(err => { delete pending[key]; throw err; });
    }
    return pending[key];
}

/** Steps before the network has to start reporting (the marker sits in one of them). */
export const HOLD_LEAD = 3;

/**
 * One hold-a-number sequence of length T. `opts` can fix the marker
 * position or the flagged value (the pages' presets and explore controls).
 * Values are rounded to 0.01, which is how the pages print them.
 */
export function holdExample(rng, T, { marker, value } = {}) {
    const p = marker ?? rng.int(0, HOLD_LEAD - 1);
    const vals = Array.from({ length: T }, () => Math.round((rng.next() * 2 - 1) * 100) / 100);
    if (value !== undefined) vals[p] = value;
    return {
        marker: p,
        vals,
        answer: vals[p],
        xs: vals.map((v, t) => [v, t === p ? 1 : 0]),
        targets: vals.map((_, t) => (t >= HOLD_LEAD ? [vals[p]] : null)),
    };
}

/**
 * How well a network holds the number at length T, measured at the final
 * step over n seeded sequences: the share within 0.1 of the flagged value,
 * and the mean absolute error.
 */
export function holdAccuracy(net, T, { n = 300, seed = 99, clamp = null } = {}) {
    const rng = createRng(seed);
    let within = 0, err = 0;
    for (let e = 0; e < n; e++) {
        const ex = holdExample(rng, T);
        const y = runSequence(net, ex.xs, {}, { clamp }).steps[T - 1].y[0];
        const d = Math.abs(y - ex.answer);
        err += d;
        if (d < 0.1) within++;
    }
    return { within: within / n, mae: err / n };
}

/* Translate a toy sentence. A tiny English-like language and a French-like
   one with the same words in a different order: adjectives move after their
   noun ("the big red cat" → "le chat grand rouge"). Each sentence is one to
   three clauses, NP verb NP, joined by "and", so lengths run from 5 to 29
   words — long enough to show a fixed-size summary vector running out of
   room. `align` pairs each target position with the source word it
   translates, which the attention page compares with what the model learned. */

const LEXICON = [
    ['the', 'le', 'det'], ['a', 'un', 'det'],
    ['red', 'rouge', 'adj'], ['big', 'grand', 'adj'], ['small', 'petit', 'adj'], ['old', 'vieux', 'adj'],
    ['cat', 'chat', 'noun'], ['dog', 'chien', 'noun'], ['bird', 'oiseau', 'noun'], ['fox', 'renard', 'noun'],
    ['sees', 'voit', 'verb'], ['likes', 'aime', 'verb'], ['chases', 'chasse', 'verb'],
    ['and', 'et', 'conj'],
];
export const SRC_WORDS = LEXICON.map(w => w[0]);
/** Target vocabulary: the 14 words, then the start and end markers. */
export const TGT_WORDS = [...LEXICON.map(w => w[1]), '<s>', '</s>'];
export const BOS = TGT_WORDS.indexOf('<s>');
export const EOS = TGT_WORDS.indexOf('</s>');
const ofKind = (k) => LEXICON.map((w, i) => (w[2] === k ? i : -1)).filter(i => i >= 0);
const KIND_IDS = { det: ofKind('det'), adj: ofKind('adj'), noun: ofKind('noun'), verb: ofKind('verb') };
const CONJ = SRC_WORDS.indexOf('and');

/**
 * One sentence pair. `clauses` (1–3) and `maxAdj` (adjectives per noun
 * phrase, 0–2) can be fixed; otherwise they are drawn. Word ids are shared:
 * source id i translates to target id i.
 */
export function translateExample(rng, { clauses, maxAdj = 2 } = {}) {
    const nc = clauses ?? rng.int(1, 3);
    const src = [], tgt = [], align = [];
    const np = () => {
        const det = rng.pick(KIND_IDS.det), noun = rng.pick(KIND_IDS.noun);
        const adjs = rng.shuffle(KIND_IDS.adj.slice()).slice(0, rng.int(0, maxAdj));
        const s0 = src.length;
        src.push(det, ...adjs, noun);
        // target order: det, noun, then the adjectives in their source order
        align.push([tgt.length, s0]); tgt.push(det);
        align.push([tgt.length, s0 + 1 + adjs.length]); tgt.push(noun);
        adjs.forEach((a, j) => { align.push([tgt.length, s0 + 1 + j]); tgt.push(a); });
    };
    for (let c = 0; c < nc; c++) {
        if (c > 0) { align.push([tgt.length, src.length]); src.push(CONJ); tgt.push(CONJ); }
        np();
        const v = rng.pick(KIND_IDS.verb);
        align.push([tgt.length, src.length]); src.push(v); tgt.push(v);
        np();
    }
    return {
        src, tgt: [...tgt, EOS], align,
        srcWords: src.map(i => SRC_WORDS[i]), tgtWords: tgt.map(i => TGT_WORDS[i]),
    };
}
