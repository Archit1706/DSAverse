/* Seeded toy datasets for the training pages.

   Every set lives roughly in [-1, 1] × [-1, 1], so a Plane2D with the same
   range shows any of them, and the same seed always draws the same points —
   which is what lets a training run be replayed and property-tested.

   Classification sets return { X, y, classes }; 'line' and 'curve' are
   regression sets with y holding the target number for each x. */

import { createRng } from '../random.js';

export const DATASETS = {
    moons: { name: 'Two moons', classes: 2 },
    circles: { name: 'Circles', classes: 2 },
    spiral: { name: 'Spiral', classes: 2 },
    xor: { name: 'XOR', classes: 2 },
    blobs: { name: 'Blobs', classes: 3 },
    linear: { name: 'Linearly separable', classes: 2 },
    line: { name: 'Noisy line', classes: 0 },
    curve: { name: 'Noisy curve', classes: 0 },
};

export function makeDataset(kind, { n = 200, noise = 0.1, seed = 7 } = {}) {
    const rng = createRng(seed);
    const X = [], y = [];
    const jitter = () => rng.normal(0, noise);
    const push = (px, py, label) => { X.push([round(px), round(py)]); y.push(label); };

    switch (kind) {
        case 'moons':
            for (let i = 0; i < n; i++) {
                const label = i % 2;
                const t = Math.PI * rng.next();
                // The classic pair (cos t, sin t) and (1 − cos t, ½ − sin t),
                // centred on the origin and scaled into the unit square.
                const sign = label === 0 ? 1 : -1;
                push(sign * 0.6 * (Math.cos(t) - 0.5) + jitter(), sign * 0.6 * (Math.sin(t) - 0.25) + jitter(), label);
            }
            break;
        case 'circles':
            for (let i = 0; i < n; i++) {
                const label = i % 2;
                const r = label === 0 ? 0.35 : 0.85;
                const t = 2 * Math.PI * rng.next();
                push(r * Math.cos(t) + jitter(), r * Math.sin(t) + jitter(), label);
            }
            break;
        case 'spiral':
            for (let i = 0; i < n; i++) {
                const label = i % 2;
                const t = 0.25 + 3.4 * rng.next();
                const r = t / 3.8;
                const a = t * 1.9 + label * Math.PI;
                push(r * Math.cos(a) + jitter() * 0.5, r * Math.sin(a) + jitter() * 0.5, label);
            }
            break;
        case 'xor':
            for (let i = 0; i < n; i++) {
                const px = rng.next() * 1.8 - 0.9, py = rng.next() * 1.8 - 0.9;
                const label = (px > 0) !== (py > 0) ? 1 : 0;
                push(px + jitter() * 0.3, py + jitter() * 0.3, label);
            }
            break;
        case 'blobs': {
            const centres = [[-0.5, 0.45], [0.55, 0.4], [0, -0.55]];
            for (let i = 0; i < n; i++) {
                const label = i % 3;
                const [cx, cy] = centres[label];
                push(cx + rng.normal(0, 0.12 + noise), cy + rng.normal(0, 0.12 + noise), label);
            }
            break;
        }
        case 'linear':
            for (let i = 0; i < n; i++) {
                const label = i % 2;
                const along = rng.next() * 1.8 - 0.9;
                const off = (label === 0 ? -1 : 1) * (0.15 + 0.4 * rng.next());
                push(along * 0.8 + off * 0.6 + jitter(), along * 0.6 - off * 0.8 + jitter(), label);
            }
            break;
        case 'line':
            for (let i = 0; i < n; i++) {
                const px = rng.next() * 1.8 - 0.9;
                push(px, 0.6 * px + 0.1 + jitter(), null);
                y[y.length - 1] = X[X.length - 1][1];
            }
            return { X: X.map(([px]) => [px]), y, classes: 0, points: X };
        case 'curve':
            for (let i = 0; i < n; i++) {
                const px = rng.next() * 1.8 - 0.9;
                push(px, 0.7 * Math.sin(3 * px) + jitter(), null);
                y[y.length - 1] = X[X.length - 1][1];
            }
            return { X: X.map(([px]) => [px]), y, classes: 0, points: X };
        default:
            throw new Error(`makeDataset: unknown kind "${kind}"`);
    }
    return { X, y, classes: DATASETS[kind].classes };
}

/** Split into train and validation sets, deterministically from the seed. */
export function splitDataset({ X, y }, valFraction = 0.25, seed = 11) {
    const idx = createRng(seed).shuffle(X.map((_, i) => i));
    const cut = Math.round(X.length * (1 - valFraction));
    const pick = (ids) => ({ X: ids.map(i => X[i]), y: ids.map(i => y[i]) });
    return { train: pick(idx.slice(0, cut)), val: pick(idx.slice(cut)) };
}

// Four decimals is plenty for a picture and keeps SVG attributes identical
// between the server render and the browser.
function round(v) { return Math.round(v * 1e4) / 1e4; }
