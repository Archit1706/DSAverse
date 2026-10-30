/* Byte-level byte-pair encoding — the tokenizer family GPT models use.

   Text is turned into UTF-8 bytes, so every possible string can be encoded
   with a base vocabulary of 256. Training then repeatedly finds the most
   frequent adjacent pair of tokens and merges it into a new token; encoding
   replays those merges in the order they were learned. The result is
   whole tokens for common words and pieces for rare ones.

   Before counting, text is split into words with GPT-2's pattern (a word
   keeps its leading space), so merges never cross a word boundary. Training
   counts pairs over the distinct words weighted by frequency, which keeps it
   fast enough to run live on the Tokenization page.

   The same code trained the tiny GPT's tokenizer in Node, so the page's
   live tokenizer and the model's vocabulary agree byte for byte. */

const PRETOKEN = /'(?:s|t|re|ve|m|ll|d)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
const encoder = new TextEncoder();
const strictDecoder = new TextDecoder('utf-8', { fatal: true });
const looseDecoder = new TextDecoder('utf-8');

export function pretokenize(text) {
    return text.match(PRETOKEN) ?? [];
}

const pairKey = (a, b) => a * 65536 + b;

/** Learn merges until the vocabulary has `vocabSize` tokens (or no pair repeats).
    With trace, each merge also records the five most frequent pairs it beat. */
export function trainBPE(text, vocabSize, { trace = false } = {}) {
    const counts = new Map();
    for (const w of pretokenize(text)) counts.set(w, (counts.get(w) ?? 0) + 1);
    const words = [...counts].map(([w, n]) => ({ ids: Array.from(encoder.encode(w)), n }));
    const vocab = [];
    for (let i = 0; i < 256; i++) vocab.push(Uint8Array.of(i));
    const merges = [];

    while (vocab.length < vocabSize) {
        const pairs = new Map();
        for (const { ids, n } of words) {
            for (let i = 0; i < ids.length - 1; i++) {
                const k = pairKey(ids[i], ids[i + 1]);
                pairs.set(k, (pairs.get(k) ?? 0) + n);
            }
        }
        if (pairs.size === 0) break;
        // Highest count wins; ties go to the smaller pair key, so training is
        // deterministic and the Node and browser runs agree.
        let bestKey = -1, bestCount = 0;
        for (const [k, c] of pairs) {
            if (c > bestCount || (c === bestCount && k < bestKey)) { bestKey = k; bestCount = c; }
        }
        if (bestCount < 2) break;
        const a = Math.floor(bestKey / 65536), b = bestKey % 65536;
        const id = vocab.length;
        const merged = new Uint8Array(vocab[a].length + vocab[b].length);
        merged.set(vocab[a]);
        merged.set(vocab[b], vocab[a].length);
        vocab.push(merged);
        const record = { a, b, id, count: bestCount };
        if (trace) {
            record.top = [...pairs].sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, 5)
                .map(([k, c]) => ({ a: Math.floor(k / 65536), b: k % 65536, count: c }));
        }
        merges.push(record);
        for (const w of words) w.ids = mergePair(w.ids, a, b, id);
    }
    return { merges, vocab };
}

function mergePair(ids, a, b, id) {
    const out = [];
    for (let i = 0; i < ids.length; i++) {
        if (i < ids.length - 1 && ids[i] === a && ids[i + 1] === b) { out.push(id); i++; }
        else out.push(ids[i]);
    }
    return out;
}

/** A tokenizer from a merge list (objects with a and b, or [a, b] pairs). */
export function makeTokenizer(mergeList) {
    const merges = mergeList.map(m => (Array.isArray(m) ? { a: m[0], b: m[1] } : m));
    const vocab = [];
    for (let i = 0; i < 256; i++) vocab.push(Uint8Array.of(i));
    const rank = new Map();
    merges.forEach(({ a, b }, i) => {
        const merged = new Uint8Array(vocab[a].length + vocab[b].length);
        merged.set(vocab[a]);
        merged.set(vocab[b], vocab[a].length);
        vocab.push(merged);
        rank.set(pairKey(a, b), i);
    });
    const cache = new Map();

    const encodeWord = (word) => {
        const hit = cache.get(word);
        if (hit) return hit;
        let ids = Array.from(encoder.encode(word));
        // Apply the earliest-learned merge present, again and again — the
        // order merges were learned in, not left to right.
        for (;;) {
            let best = -1, bestRank = Infinity;
            for (let i = 0; i < ids.length - 1; i++) {
                const r = rank.get(pairKey(ids[i], ids[i + 1]));
                if (r !== undefined && r < bestRank) { bestRank = r; best = i; }
            }
            if (best < 0) break;
            ids = mergePair(ids, ids[best], ids[best + 1], 256 + bestRank);
        }
        if (cache.size < 50000) cache.set(word, ids);
        return ids;
    };

    const tokenText = (id) => {
        try { return strictDecoder.decode(vocab[id]); }
        catch { return null; }   // part of a multi-byte character
    };

    return {
        vocabSize: vocab.length,
        vocab,
        merges,
        encode(text) { return pretokenize(text).flatMap(encodeWord); },
        decode(ids) {
            const bytes = ids.flatMap(id => Array.from(vocab[id]));
            return looseDecoder.decode(Uint8Array.from(bytes));
        },
        tokenText,
        /** Display form: the text, or hex bytes when the token is part of a character. */
        tokenLabel(id) {
            const t = tokenText(id);
            if (t !== null) return t;
            return Array.from(vocab[id]).map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        },
    };
}
