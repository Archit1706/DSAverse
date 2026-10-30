/* Loaders for the real embedding data the Language Models and RAG pages use.

   Word vectors: a subset of GloVe 6B (100 dimensions, public domain) — the
   8,000 most frequent words plus every word the pages need — stored as int8
   with one scale per word (public/data/ml/glove.*). Quantising keeps 98.9%
   of each word's five nearest neighbours.

   Sentence embeddings: all-MiniLM-L6-v2 vectors for the RAG corpus (a frozen
   snapshot of DSAverse's own page descriptions), the labelled queries and the
   demo sentences, plus a cross-encoder's scores for reranking
   (public/data/ml/rag-*). Those were computed offline; a query the learner
   types is embedded live with averaged word vectors instead, and the pages
   say so. */

const BASE = '/data/ml';

function dequantize(bytes, scales, dims) {
    const n = scales.length;
    const out = new Float64Array(n * dims);
    const q = new Int8Array(bytes);
    for (let i = 0; i < n; i++) for (let j = 0; j < dims; j++) out[i * dims + j] = q[i * dims + j] * scales[i];
    return out;
}

function normaliseRows(data, n, dims) {
    const out = new Float64Array(data.length);
    for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < dims; j++) s += data[i * dims + j] ** 2;
        const inv = s ? 1 / Math.sqrt(s) : 0;
        for (let j = 0; j < dims; j++) out[i * dims + j] = data[i * dims + j] * inv;
    }
    return out;
}

const WORDS = /[a-z]+(?:'[a-z]+)?/g;
export const textWords = (text) => text.toLowerCase().match(WORDS) ?? [];

export function buildWordVectors(json, buffer) {
    const { dims, words, ranks, scales } = json;
    const n = words.length;
    const raw = dequantize(buffer, scales, dims);
    const unit = normaliseRows(raw, n, dims);
    const index = new Map(words.map((w, i) => [w, i]));
    const row = (data, i) => data.subarray(i * dims, (i + 1) * dims);
    // Zipf's law estimate of a word's probability from its frequency rank,
    // for SIF weighting (rare words count for more than "the").
    const harmonic = Math.log(400000) + 0.5772;
    const prob = (i) => 1 / ((ranks[i] + 1) * harmonic);

    const wv = {
        dims, words, ranks, index,
        has: (w) => index.has(w),
        /** The word's vector (a view; copy before changing it), or null. */
        vector: (w) => (index.has(w) ? row(raw, index.get(w)) : null),
        unitVector: (w) => (index.has(w) ? row(unit, index.get(w)) : null),
        /** The k words with the highest cosine similarity to vec. */
        nearest(vec, k = 10, exclude = new Set()) {
            let norm = 0;
            for (let j = 0; j < dims; j++) norm += vec[j] * vec[j];
            norm = Math.sqrt(norm) || 1;
            const top = [];
            for (let i = 0; i < n; i++) {
                if (exclude.has(words[i])) continue;
                let s = 0;
                for (let j = 0; j < dims; j++) s += unit[i * dims + j] * vec[j];
                s /= norm;
                if (top.length < k || s > top[top.length - 1].sim) {
                    top.push({ word: words[i], sim: s });
                    top.sort((a, b) => b.sim - a.sim);
                    if (top.length > k) top.pop();
                }
            }
            return top;
        },
        /** a is to b as c is to ? — the words nearest b − a + c (cosine, on unit vectors). */
        analogy(a, b, c, k = 5) {
            const va = wv.unitVector(a), vb = wv.unitVector(b), vc = wv.unitVector(c);
            if (!va || !vb || !vc) return null;
            const target = new Float64Array(dims);
            for (let j = 0; j < dims; j++) target[j] = vb[j] - va[j] + vc[j];
            return { target, results: wv.nearest(target, k, new Set([a, b, c])) };
        },
        /** Average the word vectors of a text — the simple sentence embedding.
            With sif, each word is weighted a / (a + p(word)). */
        embedText(text, { weighting = 'mean' } = {}) {
            const used = [], missing = [];
            const v = new Float64Array(dims);
            let total = 0;
            for (const w of textWords(text)) {
                if (!index.has(w)) { missing.push(w); continue; }
                const i = index.get(w);
                const weight = weighting === 'sif' ? 1e-3 / (1e-3 + prob(i)) : 1;
                for (let j = 0; j < dims; j++) v[j] += weight * raw[i * dims + j];
                total += weight;
                used.push({ word: w, weight });
            }
            if (total) for (let j = 0; j < dims; j++) v[j] /= total;
            return { vector: v, used, missing };
        },
    };
    return wv;
}

export function buildRagData(corpus, minilm, buffer) {
    const { dims, counts, scales } = minilm;
    const all = dequantize(buffer, scales, dims);
    const total = counts.docs + counts.queries + counts.sentences;
    const unit = normaliseRows(all, total, dims);
    const slice = (from, n) => Array.from({ length: n }, (_, i) => unit.slice((from + i) * dims, (from + i + 1) * dims));
    return {
        ...corpus,
        dims,
        models: minilm.models,
        docVectors: slice(0, counts.docs),
        queryVectors: slice(counts.docs, counts.queries),
        sentenceVectors: slice(counts.docs + counts.queries, counts.sentences),
        rerank: minilm.rerank,
    };
}

const memo = new Map();
function once(key, make) {
    if (!memo.has(key)) memo.set(key, make().catch(err => { memo.delete(key); throw err; }));
    return memo.get(key);
}
const get = (url, kind) => fetch(url).then(r => {
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return r[kind]();
});

export function loadWordVectors(base = BASE) {
    return once(`glove:${base}`, () => Promise.all([get(`${base}/glove.json`, 'json'), get(`${base}/glove.bin`, 'arrayBuffer')])
        .then(([json, buf]) => buildWordVectors(json, buf)));
}

export function loadRagData(base = BASE) {
    return once(`rag:${base}`, () => Promise.all([
        get(`${base}/rag-corpus.json`, 'json'), get(`${base}/rag-minilm.json`, 'json'), get(`${base}/rag-minilm.bin`, 'arrayBuffer'),
    ]).then(([corpus, minilm, buf]) => buildRagData(corpus, minilm, buf)));
}
