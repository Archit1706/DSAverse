/**
 * Polynomial least squares for the Machine Learning pages.
 *
 *   const c = fitPolynomial(points, 3);          // points: [[x, y], …]
 *   evalPoly(c, 0.5); polyMse(c, points);
 *
 * Coefficients are in increasing order, c[k] multiplies x^k. With a penalty
 * λ > 0 the fit minimises MSE + λ·Σ_{k≥1} c_k² (the constant is not
 * penalised). It is solved by Householder QR on the stacked system
 * [X; √(nλ)·I] c ≈ [y; 0], whose squared residual is n·(MSE + λ‖c‖²): QR
 * keeps degree-11 fits accurate where the normal equations would lose half
 * their digits.
 */

/** Least squares by Householder QR: the x minimising ‖Ax − b‖. A has at least as many rows as columns. */
export function lstsq(A, b) {
    const m = A.length, n = A[0].length;
    const R = A.map(r => r.slice()), y = b.slice();
    for (let k = 0; k < n; k++) {
        let s = 0;
        for (let i = k; i < m; i++) s += R[i][k] ** 2;
        const norm = Math.sqrt(s);
        if (norm === 0) continue;
        const alpha = R[k][k] > 0 ? -norm : norm;
        const v = new Array(m).fill(0);
        v[k] = R[k][k] - alpha;
        for (let i = k + 1; i < m; i++) v[i] = R[i][k];
        let vv = 0;
        for (let i = k; i < m; i++) vv += v[i] * v[i];
        if (vv === 0) continue;
        for (let j = k; j < n; j++) {
            let dot = 0;
            for (let i = k; i < m; i++) dot += v[i] * R[i][j];
            const c = (2 * dot) / vv;
            for (let i = k; i < m; i++) R[i][j] -= c * v[i];
        }
        let dot = 0;
        for (let i = k; i < m; i++) dot += v[i] * y[i];
        const c = (2 * dot) / vv;
        for (let i = k; i < m; i++) y[i] -= c * v[i];
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let s = y[i];
        for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j];
        x[i] = Math.abs(R[i][i]) < 1e-300 ? 0 : s / R[i][i];
    }
    return x;
}

export function fitPolynomial(points, degree, lambda = 0) {
    const n = points.length;
    const A = points.map(([x]) => Array.from({ length: degree + 1 }, (_, k) => x ** k));
    const b = points.map(p => p[1]);
    if (lambda > 0) {
        for (let k = 1; k <= degree; k++) {
            const row = new Array(degree + 1).fill(0);
            row[k] = Math.sqrt(lambda * n);
            A.push(row);
            b.push(0);
        }
    }
    return lstsq(A, b);
}

/** Horner's rule. */
export const evalPoly = (c, x) => c.reduceRight((acc, ck) => acc * x + ck, 0);

export const polyMse = (c, points) => points.reduce((s, [x, y]) => s + (evalPoly(c, x) - y) ** 2, 0) / points.length;
