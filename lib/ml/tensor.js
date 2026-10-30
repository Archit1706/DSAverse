/* Small dense matrices for the AI pages.

   Everything the transformer and attention pages show — Q, K, V, attention
   weights, logits — is computed here, so the numbers on screen are the
   numbers the model actually produced. Matrices are row-major
   { rows, cols, data } over a Float64Array: the sizes are tiny (a few
   thousand entries), and double precision keeps the JS forward pass
   comparable with PyTorch's reference output.

   Shape mistakes throw with both shapes in the message, because a silent
   broadcast is exactly the kind of bug these pages exist to explain. */

export function mat(rows, cols, fill = 0) {
    const data = new Float64Array(rows * cols);
    if (fill !== 0) data.fill(fill);
    return { rows, cols, data };
}

export function fromRows(rows) {
    const r = rows.length;
    const c = r ? rows[0].length : 0;
    const m = mat(r, c);
    for (let i = 0; i < r; i++) {
        if (rows[i].length !== c) throw new Error(`fromRows: row ${i} has ${rows[i].length} entries, expected ${c}`);
        for (let j = 0; j < c; j++) m.data[i * c + j] = rows[i][j];
    }
    return m;
}

export function toRows(m) {
    const out = [];
    for (let i = 0; i < m.rows; i++) out.push(Array.from(m.data.subarray(i * m.cols, (i + 1) * m.cols)));
    return out;
}

export const shapeOf = (m) => `[${m.rows}, ${m.cols}]`;

export function get(m, i, j) { return m.data[i * m.cols + j]; }
export function set(m, i, j, x) { m.data[i * m.cols + j] = x; }

export function row(m, i) { return Array.from(m.data.subarray(i * m.cols, (i + 1) * m.cols)); }

export function matmul(a, b) {
    if (a.cols !== b.rows) {
        throw new Error(`matmul: ${shapeOf(a)} × ${shapeOf(b)} — inner sizes ${a.cols} and ${b.rows} differ`);
    }
    const out = mat(a.rows, b.cols);
    const { data: A } = a, { data: B } = b, { data: C } = out;
    const n = a.cols, p = b.cols;
    for (let i = 0; i < a.rows; i++) {
        for (let k = 0; k < n; k++) {
            const aik = A[i * n + k];
            if (aik === 0) continue;
            const bo = k * p, co = i * p;
            for (let j = 0; j < p; j++) C[co + j] += aik * B[bo + j];
        }
    }
    return out;
}

export function transpose(a) {
    const out = mat(a.cols, a.rows);
    for (let i = 0; i < a.rows; i++) {
        for (let j = 0; j < a.cols; j++) out.data[j * a.rows + i] = a.data[i * a.cols + j];
    }
    return out;
}

/** a + b, where b is the same shape or a single row added to every row (a bias). */
export function add(a, b) {
    const out = mat(a.rows, a.cols);
    if (b.rows === a.rows && b.cols === a.cols) {
        for (let i = 0; i < a.data.length; i++) out.data[i] = a.data[i] + b.data[i];
    } else if (b.rows === 1 && b.cols === a.cols) {
        for (let i = 0; i < a.rows; i++) {
            for (let j = 0; j < a.cols; j++) out.data[i * a.cols + j] = a.data[i * a.cols + j] + b.data[j];
        }
    } else {
        throw new Error(`add: ${shapeOf(a)} + ${shapeOf(b)} — shapes do not match and ${shapeOf(b)} is not a row`);
    }
    return out;
}

export function scale(a, s) {
    const out = mat(a.rows, a.cols);
    for (let i = 0; i < a.data.length; i++) out.data[i] = a.data[i] * s;
    return out;
}

export function map(a, f) {
    const out = mat(a.rows, a.cols);
    for (let i = 0; i < a.data.length; i++) out.data[i] = f(a.data[i]);
    return out;
}

/** Columns [from, to) of every row — one attention head's slice of Q, K or V. */
export function sliceCols(a, from, to) {
    const w = to - from;
    const out = mat(a.rows, w);
    for (let i = 0; i < a.rows; i++) {
        for (let j = 0; j < w; j++) out.data[i * w + j] = a.data[i * a.cols + from + j];
    }
    return out;
}

/** Side-by-side join, the inverse of sliceCols: concatenating the heads. */
export function concatCols(parts) {
    const rows = parts[0].rows;
    const cols = parts.reduce((s, p) => s + p.cols, 0);
    const out = mat(rows, cols);
    let off = 0;
    for (const p of parts) {
        if (p.rows !== rows) throw new Error(`concatCols: ${shapeOf(p)} does not have ${rows} rows`);
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < p.cols; j++) out.data[i * cols + off + j] = p.data[i * p.cols + j];
        }
        off += p.cols;
    }
    return out;
}

/** Numerically stable softmax of a plain array, with an optional temperature. */
export function softmax(xs, temperature = 1) {
    if (!(temperature > 0)) throw new Error(`softmax: temperature must be positive, got ${temperature}`);
    let max = -Infinity;
    for (const x of xs) if (x > max) max = x;
    if (max === -Infinity) return xs.map(() => 1 / xs.length);
    const ex = xs.map(x => (x === -Infinity ? 0 : Math.exp((x - max) / temperature)));
    const sum = ex.reduce((s, e) => s + e, 0);
    return ex.map(e => e / sum);
}

/** Row-wise softmax. Entries equal to -Infinity (masked) come out exactly 0. */
export function softmaxRows(a, temperature = 1) {
    const out = mat(a.rows, a.cols);
    for (let i = 0; i < a.rows; i++) {
        const p = softmax(row(a, i), temperature);
        for (let j = 0; j < a.cols; j++) out.data[i * a.cols + j] = p[j];
    }
    return out;
}

/** A [T, T] matrix with -Infinity above the diagonal: token i may not look at j > i. */
export function causalMask(T) {
    const m = mat(T, T);
    for (let i = 0; i < T; i++) for (let j = i + 1; j < T; j++) m.data[i * T + j] = -Infinity;
    return m;
}

/** Normalise each row to mean 0, variance 1, then scale by gamma and shift by beta. */
export function layerNormRows(a, gamma, beta, eps = 1e-5) {
    const out = mat(a.rows, a.cols);
    const n = a.cols;
    for (let i = 0; i < a.rows; i++) {
        let mean = 0;
        for (let j = 0; j < n; j++) mean += a.data[i * n + j];
        mean /= n;
        let v = 0;
        for (let j = 0; j < n; j++) { const d = a.data[i * n + j] - mean; v += d * d; }
        const inv = 1 / Math.sqrt(v / n + eps);
        for (let j = 0; j < n; j++) {
            const g = gamma ? gamma[j] : 1, b = beta ? beta[j] : 0;
            out.data[i * n + j] = (a.data[i * n + j] - mean) * inv * g + b;
        }
    }
    return out;
}

export const relu = (x) => (x > 0 ? x : 0);
export const sigmoid = (x) => (x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x)));
/** GELU, tanh approximation — the form GPT-2 uses and the tiny GPT was trained with. */
export const gelu = (x) => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));

export function argmax(xs) {
    let best = 0;
    for (let i = 1; i < xs.length; i++) if (xs[i] > xs[best]) best = i;
    return best;
}

export function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
}

export function norm(a) { return Math.sqrt(dot(a, a)); }

export function cosine(a, b) {
    const d = norm(a) * norm(b);
    return d === 0 ? 0 : dot(a, b) / d;
}
