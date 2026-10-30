/* Vector search, from the exact scan to the indexes vector databases use.

   - bruteForce: compare the query with every vector. Exact, and O(N·d).
   - IVF: cluster the vectors with k-means, then search only the nprobe
     clusters whose centroids are closest. With nprobe = nlist it is exact.
   - HNSW: a layered proximity graph. Search drops in at the sparse top
     layer, walks greedily towards the query, and descends; the bottom layer
     holds every vector.
   - PQ: split each vector into m sub-vectors and replace each with the id of
     its nearest codebook centroid — m bytes per vector. Distances come from
     a small lookup table built once per query (asymmetric distance).

   Every search can return a trace, so the RAG pages replay the real search
   rather than an animation of one. Sizes here are hundreds or a few
   thousand vectors, so sorted arrays stand in for heaps. */

import { createRng } from '../random.js';

export function squaredL2(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
    return s;
}

export function innerProduct(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
}

/** A distance where smaller is closer, for every metric. */
export function distance(a, b, metric = 'l2') {
    if (metric === 'l2') return squaredL2(a, b);
    if (metric === 'ip') return -innerProduct(a, b);
    if (metric === 'cosine') {
        const d = Math.sqrt(innerProduct(a, a) * innerProduct(b, b));
        return d === 0 ? 1 : 1 - innerProduct(a, b) / d;
    }
    throw new Error(`distance: unknown metric "${metric}"`);
}

// Insert into a list kept sorted by dist (then id), trimmed to `cap`.
function insertSorted(list, item, cap = Infinity) {
    let i = list.length;
    while (i > 0 && (list[i - 1].dist > item.dist || (list[i - 1].dist === item.dist && list[i - 1].id > item.id))) i--;
    list.splice(i, 0, item);
    if (list.length > cap) list.pop();
    return i;
}

/** Exact k nearest neighbours by scanning everything. */
export function bruteForce(vectors, q, k, { metric = 'l2', trace = false } = {}) {
    const top = [];
    const steps = [];
    for (let id = 0; id < vectors.length; id++) {
        const dist = distance(vectors[id], q, metric);
        // Ids only increase, so a tie with the current k-th never displaces it.
        const entered = top.length < k || dist < top[top.length - 1].dist;
        if (entered) insertSorted(top, { id, dist }, k);
        if (trace) steps.push({ id, dist, entered, top: top.map(t => t.id) });
    }
    return { results: top, comparisons: vectors.length, steps };
}

/** k-means with k-means++ seeding (or random), recording every iteration. */
export function kmeans(vectors, k, { seed = 1, iters = 25, init = 'kmeans++' } = {}) {
    const rng = createRng(seed);
    const n = vectors.length;
    let centroids;
    if (init === 'random') {
        centroids = rng.shuffle(vectors.map((_, i) => i)).slice(0, k).map(i => [...vectors[i]]);
    } else {
        // k-means++: each new centre is drawn with probability proportional to
        // its squared distance from the nearest centre chosen so far.
        centroids = [[...vectors[rng.int(0, n - 1)]]];
        while (centroids.length < k) {
            const d2 = vectors.map(v => Math.min(...centroids.map(c => squaredL2(v, c))));
            const total = d2.reduce((s, x) => s + x, 0);
            let u = rng.next() * total, pick = n - 1;
            for (let i = 0; i < n; i++) { u -= d2[i]; if (u <= 0) { pick = i; break; } }
            centroids.push([...vectors[pick]]);
        }
    }
    const history = [];
    let assign = new Array(n).fill(-1);
    for (let it = 0; it < iters; it++) {
        const next = vectors.map(v => {
            let best = 0, bd = Infinity;
            centroids.forEach((c, j) => { const dd = squaredL2(v, c); if (dd < bd) { bd = dd; best = j; } });
            return best;
        });
        const changed = next.some((a, i) => a !== assign[i]);
        assign = next;
        const objAfterAssign = objective(vectors, centroids, assign);
        centroids = centroids.map((c, j) => {
            const members = vectors.filter((_, i) => assign[i] === j);
            if (members.length === 0) return c;   // an empty cluster keeps its centre
            return c.map((_, dIdx) => members.reduce((s, m) => s + m[dIdx], 0) / members.length);
        });
        history.push({ assign: [...assign], centroids: centroids.map(c => [...c]), objectiveAfterAssign: objAfterAssign, objective: objective(vectors, centroids, assign) });
        if (!changed) break;
    }
    return { centroids, assign, history };
}

export function objective(vectors, centroids, assign) {
    let s = 0;
    for (let i = 0; i < vectors.length; i++) s += squaredL2(vectors[i], centroids[assign[i]]);
    return s;
}

/** Inverted file index: nlist k-means cells, each holding its members' ids. */
export function buildIVF(vectors, nlist, { seed = 1, iters = 25 } = {}) {
    const { centroids, assign } = kmeans(vectors, nlist, { seed, iters });
    const lists = centroids.map(() => []);
    assign.forEach((c, id) => lists[c].push(id));
    return { centroids, lists, assign };
}

export function searchIVF(index, vectors, q, k, nprobe, { metric = 'l2' } = {}) {
    const cells = index.centroids
        .map((c, id) => ({ id, dist: squaredL2(c, q) }))
        .sort((a, b) => a.dist - b.dist || a.id - b.id)
        .slice(0, nprobe)
        .map(c => c.id);
    const top = [];
    let comparisons = 0;
    for (const cell of cells) {
        for (const id of index.lists[cell]) {
            comparisons++;
            insertSorted(top, { id, dist: distance(vectors[id], q, metric) }, k);
        }
    }
    return { results: top, probed: cells, comparisons: comparisons + index.centroids.length };
}

/** Build an HNSW graph by inserting vectors one at a time. */
export function buildHNSW(vectors, { M = 6, efConstruction = 32, seed = 1, metric = 'l2' } = {}) {
    const rng = createRng(seed);
    const mL = 1 / Math.log(M);
    const levels = [];
    const neighbors = [];   // neighbors[id][layer] = ids
    let entry = -1, maxLevel = -1;
    const dist = (a, b) => distance(vectors[a], vectors[b], metric);

    for (let id = 0; id < vectors.length; id++) {
        const level = Math.floor(-Math.log(1 - rng.next()) * mL);
        levels.push(level);
        neighbors.push(Array.from({ length: level + 1 }, () => []));
        if (entry === -1) { entry = id; maxLevel = level; continue; }
        let eps = [{ id: entry, dist: dist(id, entry) }];
        for (let lc = maxLevel; lc > level; lc--) eps = searchLayer(vectors, neighbors, vectors[id], eps, 1, lc, metric).found;
        for (let lc = Math.min(maxLevel, level); lc >= 0; lc--) {
            const found = searchLayer(vectors, neighbors, vectors[id], eps, efConstruction, lc, metric).found;
            const cap = lc === 0 ? 2 * M : M;
            const chosen = found.filter(f => f.id !== id).slice(0, M);
            neighbors[id][lc] = chosen.map(c => c.id);
            for (const c of chosen) {
                const list = neighbors[c.id][lc];
                list.push(id);
                if (list.length > cap) {
                    // Keep the closest when a node gains too many links.
                    list.sort((a, b) => dist(c.id, a) - dist(c.id, b) || a - b);
                    list.length = cap;
                }
            }
            eps = found;
        }
        if (level > maxLevel) { maxLevel = level; entry = id; }
    }
    return { levels, neighbors, entry, maxLevel, M, metric };
}

// Best-first search within one layer, returning the ef closest nodes found.
function searchLayer(vectors, neighbors, q, entryPoints, ef, layer, metric, trace = null) {
    const visited = new Set(entryPoints.map(e => e.id));
    const candidates = entryPoints.map(e => ({ ...e }));
    candidates.sort((a, b) => a.dist - b.dist || a.id - b.id);
    const found = candidates.map(c => ({ ...c })).slice(0, ef);
    let computed = 0;
    while (candidates.length) {
        const c = candidates.shift();
        const worst = found[found.length - 1];
        if (found.length >= ef && c.dist > worst.dist) break;
        if (trace) trace.push({ layer, at: c.id, dist: c.dist });
        for (const nb of neighbors[c.id][layer] ?? []) {
            if (visited.has(nb)) continue;
            visited.add(nb);
            const dist = distance(vectors[nb], q, metric);
            computed++;
            const w = found[found.length - 1];
            if (found.length < ef || dist < w.dist) {
                insertSorted(candidates, { id: nb, dist });
                insertSorted(found, { id: nb, dist }, ef);
            }
        }
    }
    return { found, computed };
}

/** Search an HNSW graph: greedy descent through the upper layers, then a
    best-first search with beam width ef on layer 0. */
export function searchHNSW(index, vectors, q, k, ef = 16, { trace = false } = {}) {
    const { neighbors, entry, maxLevel, metric } = index;
    const steps = trace ? [] : null;
    let computed = 1;
    let eps = [{ id: entry, dist: distance(vectors[entry], q, metric) }];
    for (let lc = maxLevel; lc > 0; lc--) {
        const r = searchLayer(vectors, neighbors, q, eps, 1, lc, metric, steps);
        computed += r.computed;
        eps = r.found;
    }
    const r = searchLayer(vectors, neighbors, q, eps, Math.max(ef, k), 0, metric, steps);
    computed += r.computed;
    return { results: r.found.slice(0, k), comparisons: computed, steps };
}

/** Product quantisation: m codebooks of ksub centroids over dims/m-sized slices. */
export function trainPQ(vectors, m, ksub = 16, { seed = 1, iters = 20 } = {}) {
    const dim = vectors[0].length;
    if (dim % m !== 0) throw new Error(`trainPQ: ${dim} dimensions do not split into ${m} equal sub-vectors`);
    const dsub = dim / m;
    const codebooks = [];
    for (let j = 0; j < m; j++) {
        const sub = vectors.map(v => v.slice(j * dsub, (j + 1) * dsub));
        codebooks.push(kmeans(sub, Math.min(ksub, sub.length), { seed: seed + j, iters }).centroids);
    }
    return { m, ksub, dsub, codebooks };
}

export function encodePQ(pq, v) {
    return pq.codebooks.map((book, j) => {
        const sub = v.slice(j * pq.dsub, (j + 1) * pq.dsub);
        let best = 0, bd = Infinity;
        book.forEach((c, i) => { const d = squaredL2(sub, c); if (d < bd) { bd = d; best = i; } });
        return best;
    });
}

export function decodePQ(pq, codes) {
    return codes.flatMap((c, j) => pq.codebooks[j][c]);
}

/** Squared distance from each query slice to every centroid in its codebook. */
export function adcTable(pq, q) {
    return pq.codebooks.map((book, j) => {
        const sub = q.slice(j * pq.dsub, (j + 1) * pq.dsub);
        return book.map(c => squaredL2(sub, c));
    });
}

/** Approximate squared distance: m table lookups added up. */
export function adcDistance(table, codes) {
    let s = 0;
    for (let j = 0; j < codes.length; j++) s += table[j][codes[j]];
    return s;
}

export function searchPQ(pq, codes, q, k) {
    const table = adcTable(pq, q);
    const top = [];
    codes.forEach((c, id) => insertSorted(top, { id, dist: adcDistance(table, c) }, k));
    return { results: top, table };
}

/** Fraction of the true top-k that an approximate search found. */
export function recallAtK(approx, exact) {
    const truth = new Set(exact.map(r => r.id));
    return approx.filter(r => truth.has(r.id)).length / exact.length;
}
