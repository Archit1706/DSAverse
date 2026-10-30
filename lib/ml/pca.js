/* Principal component analysis.

   pca(rows, k) centres the data, forms the covariance matrix and takes its
   eigenvectors, ordered by eigenvalue: the first is the direction the data
   varies most along, each next one the most-varying direction at right
   angles to those before. That is the whole of the Principal Component
   Analysis page's story, and the reason it links to Eigenvectors.

   The eigenvectors come from the cyclic Jacobi method — rotate away one
   off-diagonal entry at a time until the matrix is diagonal. It is short,
   needs no library, and unlike power iteration with deflation it stays
   accurate when two variances are nearly equal or the data is flat in some
   direction. A page that wants to animate power iteration can call
   powerIteration() for the first component.

   Signs are fixed so the largest-magnitude entry of each component is
   positive; otherwise a projection could flip between runs. */

/** Column means and the covariance matrix (divided by n − 1) of `rows`. */
export function covariance(rows) {
    const n = rows.length, d = rows[0].length;
    const mean = new Array(d).fill(0);
    for (const r of rows) for (let j = 0; j < d; j++) mean[j] += r[j] / n;
    const C = Array.from({ length: d }, () => new Array(d).fill(0));
    for (const r of rows) {
        for (let a = 0; a < d; a++) {
            const da = r[a] - mean[a];
            for (let b = a; b < d; b++) C[a][b] += (da * (r[b] - mean[b])) / Math.max(1, n - 1);
        }
    }
    for (let a = 0; a < d; a++) for (let b = 0; b < a; b++) C[a][b] = C[b][a];
    return { mean, C };
}

/**
 * Eigenvalues and eigenvectors of a symmetric matrix (array of rows), by
 * cyclic Jacobi rotations. Returns [{ value, vector }] sorted by value,
 * largest first; vectors are unit length and mutually orthogonal.
 */
export function eigSym(S, { maxSweeps = 60, tol = 1e-24 } = {}) {
    const n = S.length;
    const A = S.map(r => r.slice());
    const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < maxSweeps; sweep++) {
        let off = 0, diag = 0;
        for (let p = 0; p < n; p++) {
            diag += A[p][p] ** 2;
            for (let q = p + 1; q < n; q++) off += A[p][q] ** 2;
        }
        if (off <= tol * Math.max(1, diag)) break;
        for (let p = 0; p < n; p++) {
            for (let q = p + 1; q < n; q++) {
                const apq = A[p][q];
                if (Math.abs(apq) < 1e-300) continue;
                /* The rotation angle that zeroes A[p][q]. */
                const theta = (A[q][q] - A[p][p]) / (2 * apq);
                const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
                const c = 1 / Math.sqrt(t * t + 1), s = t * c;
                for (let k = 0; k < n; k++) {
                    const akp = A[k][p], akq = A[k][q];
                    A[k][p] = c * akp - s * akq;
                    A[k][q] = s * akp + c * akq;
                }
                for (let k = 0; k < n; k++) {
                    const apk = A[p][k], aqk = A[q][k];
                    A[p][k] = c * apk - s * aqk;
                    A[q][k] = s * apk + c * aqk;
                }
                for (let k = 0; k < n; k++) {
                    const vkp = V[k][p], vkq = V[k][q];
                    V[k][p] = c * vkp - s * vkq;
                    V[k][q] = s * vkp + c * vkq;
                }
            }
        }
    }
    return A.map((_, i) => ({ value: A[i][i], vector: V.map(r => r[i]) }))
        .sort((a, b) => b.value - a.value);
}

/**
 * The first principal direction by power iteration — multiply by the
 * covariance and renormalise until the vector stops turning. Returns the
 * vector after every iteration, for pages that animate it.
 */
export function powerIteration(C, { iters = 30, start } = {}) {
    let v = start ?? C.map((_, i) => (i === 0 ? 1 : 0.5));
    const trail = [];
    for (let it = 0; it < iters; it++) {
        const w = C.map(row => row.reduce((s, x, j) => s + x * v[j], 0));
        const n = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1;
        v = w.map(x => x / n);
        trail.push({ vector: v, value: n });
    }
    return trail;
}

/**
 * The top `k` principal components of `rows` (equal-length number arrays).
 *
 * Returns { mean, components (k unit vectors), variances (eigenvalues,
 * descending), explained (fraction of total variance per component), total,
 * project(row) → k numbers, projected }.
 */
export function pca(rows, k = 2) {
    const { mean, C } = covariance(rows);
    const total = C.reduce((s, row, i) => s + row[i], 0);
    const pairs = eigSym(C).slice(0, Math.min(k, mean.length));
    const components = pairs.map(({ vector }) => {
        let big = 0;
        for (let j = 1; j < vector.length; j++) if (Math.abs(vector[j]) > Math.abs(vector[big])) big = j;
        return vector[big] < 0 ? vector.map(x => -x) : vector;
    });
    const variances = pairs.map(p => Math.max(0, p.value));
    const project = (r) => components.map(v => v.reduce((s, x, j) => s + x * (r[j] - mean[j]), 0));
    return {
        mean,
        components,
        variances,
        total,
        explained: variances.map(l => (total > 0 ? l / total : 0)),
        project,
        projected: rows.map(project),
    };
}
