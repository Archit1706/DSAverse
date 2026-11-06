"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2, Shuffle,
    Split, Target, Eye, Layers, Scale, Droplets, CheckCircle, XCircle, Lightbulb, AlertTriangle, Wrench, ArrowRight,
} from 'lucide-react';
import { createRng, randomSeed } from '@/lib/random';
import { fitPolynomial, evalPoly, polyMse } from '@/lib/ml/polyfit';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── part 1: one dataset, three jobs ───────────────────────
   Forty noisy points from a known curve, shuffled into 24 for training, 8 for
   validation and 8 for test. Polynomial degree 0–8 is the knob being chosen. */

const N_POINTS = 40;
const SIZES = { train: 24, val: 8, test: 8 };
const MAX_DEG = 5;
const NOISE = 0.25;
const K_FOLDS = 5;
const DEFAULT_SEED = 7;
const PEEK_RUNS = 300;
const FRESH = 1000;
const SPREAD_RUNS = 100;
const SPREAD_DEGREE = 3;

const ACTS = [
    { id: 1, label: 'Three piles', icon: Split },
    { id: 2, label: 'Choose on validation', icon: Target },
    { id: 3, label: 'Peeking', icon: Eye },
    { id: 4, label: 'K folds', icon: Layers },
    { id: 5, label: 'One split or five', icon: Scale },
    { id: 6, label: 'Leakage', icon: Droplets },
];

const f = (v, d = 2) => {
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};
const tn = (v, d = 2) => f(v, d).replace('−', '-');
const fm = (v) => f(v, v >= 1 ? 2 : 3);
const pct = (v) => `${Math.round(v * 100)}%`;
const r2d = (v) => Math.round(v * 100) / 100;
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };
const argmin = (a) => a.reduce((best, v, i) => (v < a[best] ? i : best), 0);

const truth = (x) => 0.8 * Math.sin(2.6 * x) + 0.25 * x;
const samplePoints = (rng, n) => Array.from({ length: n }, () => { const x = r2d(rng.next() * 2 - 1); return [x, r2d(truth(x) + rng.normal(0, NOISE))]; });

/** Forty points sorted by x, and a shuffled role for each: train, val or test. */
function makeData(seed) {
    const rng = createRng(seed);
    const points = samplePoints(rng, N_POINTS).sort((a, b) => a[0] - b[0]);
    const order = rng.shuffle(points.map((_, i) => i));
    const roles = new Array(N_POINTS);
    order.forEach((idx, rank) => { roles[idx] = rank < SIZES.train ? 'train' : rank < SIZES.train + SIZES.val ? 'val' : 'test'; });
    return { points, roles };
}
const pick = (data, role) => data.points.filter((_, i) => data.roles[i] === role);

/** Every degree fitted on the training pile and scored on all three. */
function degreeTable(data) {
    const train = pick(data, 'train'), val = pick(data, 'val'), test = pick(data, 'test');
    return Array.from({ length: MAX_DEG + 1 }, (_, d) => {
        const c = fitPolynomial(train, d);
        return { d, c, train: polyMse(c, train), val: polyMse(c, val), test: polyMse(c, test) };
    });
}
const choose = (rows, key) => rows[argmin(rows.map(r => r[key]))].d;

/** Many datasets: choose by validation or by test, report the test score, and
    compare with the true error on fresh points. It does not depend on the
    tour's seed, so the default run is computed once and kept. */
let peekCache = null;
const peekStudyOnce = () => (peekCache ??= peekStudy());
function peekStudy(runs = PEEK_RUNS, seed = 99) {
    const rng = createRng(seed);
    const acc = { honestReported: [], honestTrue: [], peekReported: [], peekTrue: [] };
    for (let r = 0; r < runs; r++) {
        const data = makeData(rng.int(1, 1e9));
        const rows = degreeTable(data);
        const fresh = samplePoints(rng, FRESH);
        const dv = choose(rows, 'val'), dt = choose(rows, 'test');
        acc.honestReported.push(rows[dv].test); acc.honestTrue.push(polyMse(rows[dv].c, fresh));
        acc.peekReported.push(rows[dt].test); acc.peekTrue.push(polyMse(rows[dt].c, fresh));
    }
    return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, mean(v)]));
}

/* ── part 2: k-fold cross-validation ─────────────────────── */

/** Fold of each pool point: shuffle, then deal round-robin, so sizes differ by at most one. */
function foldsFor(seed, n, k) {
    const rng = createRng(seed * 7 + 1);
    const folds = new Array(n);
    rng.shuffle(Array.from({ length: n }, (_, i) => i)).forEach((idx, j) => { folds[idx] = j % k; });
    return folds;
}
/** Per-degree validation MSE on every fold, and their mean. */
function cvTable(pool, folds, k, maxDeg = MAX_DEG) {
    return Array.from({ length: maxDeg + 1 }, (_, d) => {
        const perFold = Array.from({ length: k }, (_, j) => {
            const tr = pool.filter((_, i) => folds[i] !== j), va = pool.filter((_, i) => folds[i] === j);
            return polyMse(fitPolynomial(tr, d), va);
        });
        return { d, perFold, mean: mean(perFold) };
    });
}

/** The same 32 points, reshuffled many times: how much does each estimate move? */
function spreadStudy(pool, seed, runs = SPREAD_RUNS) {
    const rng = createRng(seed * 31 + 5);
    const single = [], cv = [], singlePick = [], cvPick = [];
    for (let r = 0; r < runs; r++) {
        const order = rng.shuffle(pool.map((_, i) => i));
        const tr = order.slice(0, SIZES.train).map(i => pool[i]), va = order.slice(SIZES.train).map(i => pool[i]);
        const vals = Array.from({ length: MAX_DEG + 1 }, (_, d) => polyMse(fitPolynomial(tr, d), va));
        single.push(vals[SPREAD_DEGREE]); singlePick.push(argmin(vals));
        const table = cvTable(pool, foldsFor(rng.int(1, 1e9), pool.length, K_FOLDS), K_FOLDS);
        cv.push(table[SPREAD_DEGREE].mean); cvPick.push(argmin(table.map(t => t.mean)));
    }
    const modeShare = (picks) => Math.max(...Array.from({ length: MAX_DEG + 1 }, (_, d) => picks.filter(p => p === d).length)) / runs;
    return { single: { mean: mean(single), sd: sd(single), agree: modeShare(singlePick) }, cv: { mean: mean(cv), sd: sd(cv), agree: modeShare(cvPick) } };
}

/* ── part 3: leakage on pure noise ─────────────────────────
   40 rows, 200 features of standard-normal noise, labels a balanced coin
   flip that has nothing to do with them. Every model's true accuracy is
   exactly 50%. Six pipelines cross-validate a classifier on it; three let
   the validation rows' labels reach the model, three do not. */

const NOISE_ROWS = 40;
const NOISE_FEATURES = 200;
const KEEP = 10;
const NOISE_RUNS = 30;
const BEST_OF = 20;
const ABOUT_HALF = 0.56;
const CLEARLY_ABOVE = 0.6;
const LEAK_OPTIONS = ['About 50%', 'Clearly above 50%'];

function noiseSet(rng, rows = NOISE_ROWS, p = NOISE_FEATURES) {
    const X = Array.from({ length: rows }, () => Float64Array.from({ length: p }, () => rng.normal()));
    const y = rng.shuffle(Array.from({ length: rows }, (_, i) => i % 2));
    return { X, y };
}
/** |mean of class 1 − mean of class 0| per feature, over the given rows. */
function featureScores(X, y, rows) {
    const p = X[0].length, s = new Float64Array(p), n = [0, 0];
    for (const r of rows) n[y[r]]++;
    for (const r of rows) { const w = y[r] ? 1 / n[1] : -1 / n[0]; const xr = X[r]; for (let j = 0; j < p; j++) s[j] += w * xr[j]; }
    return s.map(Math.abs);
}
const topK = (scores, k) => Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a] || a - b).slice(0, k);
const randomFeatures = (rng, p, k) => rng.shuffle(Array.from({ length: p }, (_, j) => j)).slice(0, k);

function centroidCorrect(X, y, train, test, feats) {
    const c = [new Float64Array(feats.length), new Float64Array(feats.length)], n = [0, 0];
    for (const r of train) { n[y[r]]++; feats.forEach((j, q) => { c[y[r]][q] += X[r][j]; }); }
    for (const k of [0, 1]) for (let q = 0; q < feats.length; q++) c[k][q] /= n[k];
    let right = 0;
    for (const r of test) {
        let d0 = 0, d1 = 0;
        feats.forEach((j, q) => { d0 += (X[r][j] - c[0][q]) ** 2; d1 += (X[r][j] - c[1][q]) ** 2; });
        if ((d1 < d0 ? 1 : 0) === y[r]) right++;
    }
    return right;
}
function nearestNeighbourCorrect(X, y, train, test, feats) {
    let right = 0;
    for (const r of test) {
        let best = Infinity, label = 0;
        for (const t of train) { let d = 0; for (const j of feats) d += (X[r][j] - X[t][j]) ** 2; if (d < best) { best = d; label = y[t]; } }
        if (label === y[r]) right++;
    }
    return right;
}
/** k-fold accuracy; featsFor(trainRows) chooses the features each round may use. */
function cvAccuracy(X, y, folds, k, featsFor, classify = centroidCorrect) {
    let right = 0;
    for (let j = 0; j < k; j++) {
        const train = [], test = [];
        folds.forEach((fj, r) => (fj === j ? test : train).push(r));
        right += classify(X, y, train, test, featsFor(train));
    }
    return right / folds.length;
}
const dealFolds = (rng, n, k) => { const folds = new Array(n); rng.shuffle(Array.from({ length: n }, (_, i) => i)).forEach((r, j) => { folds[r] = j % k; }); return folds; };
const allRows = (n) => Array.from({ length: n }, (_, i) => i);

const PIPELINES = [
    {
        id: 'select-all', leaky: true, name: 'Pick features using all 40 labels, then cross-validate',
        boxes: ['All 40 rows', 'Keep the 10 features that best separate the two labels', 'Split into 5 folds', 'Nearest centroid on those 10'], leakBox: 1,
        why: 'The 10 features were chosen because they happen to separate the labels of all 40 rows — including every validation fold. Each fold is scored on features picked by looking at its own answers.',
        run(rng) {
            const { X, y } = noiseSet(rng);
            const feats = topK(featureScores(X, y, allRows(NOISE_ROWS)), KEEP);
            return cvAccuracy(X, y, dealFolds(rng, NOISE_ROWS, K_FOLDS), K_FOLDS, () => feats);
        },
    },
    {
        id: 'select-inside', leaky: false, name: "Split first, then pick features using each fold's training labels",
        boxes: ['All 40 rows', 'Split into 5 folds', 'Keep the 10 features that best separate the training rows', 'Nearest centroid on those 10'],
        why: 'The same feature picking, but redone inside every round from the training rows only. The held-out fold never influences what the model sees, so the score is the honest one: chance.',
        run(rng) {
            const { X, y } = noiseSet(rng);
            return cvAccuracy(X, y, dealFolds(rng, NOISE_ROWS, K_FOLDS), K_FOLDS, (train) => topK(featureScores(X, y, train), KEEP));
        },
    },
    {
        id: 'duplicates', leaky: true, name: 'Store each row twice, then cross-validate',
        boxes: ['20 rows, each stored twice', 'Split the 40 copies into 5 folds', '1-nearest neighbour on 10 random features'], leakBox: 1,
        why: 'Most held-out rows have their identical twin in the training folds, at distance 0. The nearest neighbour simply looks up the answer. Duplicates, near-duplicates and the same patient twice all leak this way.',
        run(rng) {
            const base = noiseSet(rng, NOISE_ROWS / 2);
            const X = [...base.X, ...base.X], y = [...base.y, ...base.y];
            const feats = randomFeatures(rng, NOISE_FEATURES, KEEP);
            return cvAccuracy(X, y, dealFolds(rng, NOISE_ROWS, K_FOLDS), K_FOLDS, () => feats, nearestNeighbourCorrect);
        },
    },
    {
        id: 'best-of', leaky: true, name: `Try ${BEST_OF} feature sets, report the best score`,
        boxes: ['All 40 rows', 'Split into 5 folds', `Score ${BEST_OF} random sets of 10 features`, 'Report the highest of the 20'], leakBox: 3,
        why: `Each of the ${BEST_OF} scores is an honest estimate, but they scatter around 50% by chance, and reporting the highest picks the luckiest. Choosing on a score makes that score optimistic — which is why the final number has to come from a test set used once.`,
        run(rng) {
            const { X, y } = noiseSet(rng);
            const folds = dealFolds(rng, NOISE_ROWS, K_FOLDS);
            let best = 0;
            for (let t = 0; t < BEST_OF; t++) { const feats = randomFeatures(rng, NOISE_FEATURES, KEEP); best = Math.max(best, cvAccuracy(X, y, folds, K_FOLDS, () => feats)); }
            return best;
        },
    },
    {
        id: 'standardise', leaky: false, name: 'Rescale features using all 40 rows, then cross-validate',
        boxes: ['All 40 rows', 'Rescale each feature to mean 0, spread 1', 'Split into 5 folds', 'Pick 10 features inside each fold; nearest centroid'],
        why: 'Rescaling uses all 40 rows, but never their labels: it cannot make one class look different from the other. Strictly it should also be fitted on the training rows only, yet the measured cost here is nil — what leaks is label information.',
        run(rng) {
            const { X, y } = noiseSet(rng);
            const p = NOISE_FEATURES;
            for (let j = 0; j < p; j++) {
                const col = X.map(r => r[j]); const m = mean(col), s = sd(col) || 1;
                for (const r of X) r[j] = (r[j] - m) / s;
            }
            return cvAccuracy(X, y, dealFolds(rng, NOISE_ROWS, K_FOLDS), K_FOLDS, (train) => topK(featureScores(X, y, train), KEEP));
        },
    },
    {
        id: 'random-features', leaky: false, name: 'Pick 10 features at random, then cross-validate',
        boxes: ['All 40 rows', 'Keep 10 features chosen at random', 'Split into 5 folds', 'Nearest centroid on those 10'],
        why: 'Choosing before the split is harmless when the choice ignores the labels. No information about the held-out answers reaches the model.',
        run(rng) {
            const { X, y } = noiseSet(rng);
            const feats = randomFeatures(rng, NOISE_FEATURES, KEEP);
            return cvAccuracy(X, y, dealFolds(rng, NOISE_ROWS, K_FOLDS), K_FOLDS, () => feats);
        },
    },
];
const PIPE = Object.fromEntries(PIPELINES.map(p => [p.id, p]));

function runPipeline(id, seed, runs = NOISE_RUNS) {
    const rng = createRng(seed);
    const accs = Array.from({ length: runs }, () => PIPE[id].run(rng));
    return { id, accs, mean: mean(accs) };
}
/** A pipeline's verdict counts only when its measured mean is clearly on one side. */
const clearVerdict = (pipe, result) => (pipe.leaky ? result.mean >= CLEARLY_ABOVE : result.mean <= ABOUT_HALF);

/* ── tour ───────────────────────────────────────────────── */

const generateSteps = (seed) => {
    const steps = [];
    const data = makeData(seed);
    const s = (act, extra) => steps.push({ act, actName: ACTS[act - 1].label, data, ...extra });
    const rows = degreeTable(data);
    const dv = choose(rows, 'val'), dt = choose(rows, 'test');

    s(1, { view: 'points', roles: false, explanation: `Forty noisy measurements of one curve. We want a polynomial that predicts new measurements well, and an honest number for how well — two different jobs.` });
    s(1, {
        view: 'points', roles: true,
        explanation: `Shuffle, then deal: ${SIZES.train} points to train on (filled), ${SIZES.val} to choose with (validation, hollow orange), ${SIZES.test} locked away (test, hollow pink). Training fits the coefficients; validation picks the degree; test is opened once, at the very end, to report the result.`,
    });

    s(2, {
        view: 'points', roles: true, degree: dv, chart: ['train', 'val'], rows, mark: dv,
        explanation: `Each degree from 0 to ${MAX_DEG} is fitted on the ${SIZES.train} training points and scored on the ${SIZES.val} validation points. Training error keeps falling; validation error is lowest at degree ${dv} (MSE ${fm(rows[dv].val)}). That is the choice.`,
    });
    s(2, {
        view: 'points', roles: true, degree: dv, chart: ['train', 'val'], rows, mark: dv, testShown: true,
        explanation: `Only now is the test pile opened, for degree ${dv} alone: test MSE ${fm(rows[dv].test)}. That is the number to report. Nothing was chosen by looking at it, so it is an honest estimate of the error on new data. ${rows[dv].test > rows[dv].val ? `It is worse than the validation score of ${fm(rows[dv].val)}: partly the luck of ${SIZES.test} points, partly because the winner of a contest has usually been flattered by the rows that judged it.` : `It happens to beat the validation score of ${fm(rows[dv].val)} — with ${SIZES.test} points, luck runs both ways.`}`,
    });

    const peek = peekStudyOnce();
    s(3, {
        view: 'points', roles: true, degree: dt, chart: ['train', 'val', 'test'], rows, mark: dt,
        explanation: dt === dv
            ? `Suppose we had scored every degree on the test pile instead. Here the test set would pick the same degree, ${dt} — but that is luck, and the habit is what matters: once the test set chooses, its score is no longer a fair estimate.`
            : `Suppose we had scored every degree on the test pile and kept the best: degree ${dt}, test MSE ${fm(rows[dt].test)} — better-looking than the honest ${fm(rows[dv].test)}. But choosing by the test set makes its score optimistic.`,
    });
    s(3, {
        view: 'peek', peek,
        explanation: `Measured over ${PEEK_RUNS} datasets, with the true error taken on ${FRESH} fresh points each time. Choosing by validation: reported test MSE ${fm(peek.honestReported)} against a true ${fm(peek.honestTrue)} — fair. Choosing by test: reported ${fm(peek.peekReported)} against a true ${fm(peek.peekTrue)} — it promises ${pct(1 - peek.peekReported / peek.peekTrue)} less error than it delivers.`,
    });

    const pool = [...pick(data, 'train'), ...pick(data, 'val')].sort((a, b) => a[0] - b[0]);
    const folds = foldsFor(seed, pool.length, K_FOLDS);
    const cv = cvTable(pool, folds, K_FOLDS);
    const dcv = argmin(cv.map(r => r.mean));
    for (let j = 0; j < K_FOLDS; j++) {
        const size = folds.filter(x => x === j).length;
        s(4, {
            view: 'folds', pool, folds, round: j, degree: dv, foldMse: cv[dv].perFold[j],
            explanation: j === 0
                ? `With only ${pool.length} points to learn from, setting 8 aside for validation is expensive, and which 8 is luck. Instead: deal the ${pool.length} points into ${K_FOLDS} folds. Round 1 trains on four folds (${pool.length - size} points) and validates on the fifth (${size}): degree ${dv} scores ${fm(cv[dv].perFold[j])}.`
                : `Round ${j + 1}: fold ${j + 1} is held out, the other ${pool.length - size} points train. Degree ${dv} scores ${fm(cv[dv].perFold[j])} on it.${j === K_FOLDS - 1 ? ' Every point has now been validated exactly once.' : ''}`,
        });
    }
    s(4, {
        view: 'cv', pool, folds, cv, mark: dcv,
        explanation: `Averaging the ${K_FOLDS} rounds for every degree gives the cross-validation curve; the dots are the single folds. Its lowest mean is degree ${dcv} (${fm(cv[dcv].mean)}). For that degree the single folds range from ${fm(Math.min(...cv[dcv].perFold))} to ${fm(Math.max(...cv[dcv].perFold))} — any one of them alone would have been a noisy guide.`,
    });

    const spread = spreadStudy(pool, seed);
    s(5, {
        view: 'spread', spread,
        explanation: `Reshuffle the same ${pool.length} points ${SPREAD_RUNS} times. A single ${SIZES.train}/${SIZES.val} split estimates degree ${SPREAD_DEGREE}'s error with a spread of ±${fm(spread.single.sd)}; ${K_FOLDS}-fold cross-validation, ±${fm(spread.cv.sd)}. Picking the degree, the single split lands on its own most common choice ${pct(spread.single.agree)} of the time; ${K_FOLDS}-fold, ${pct(spread.cv.agree)}. ${spread.cv.agree > spread.single.agree ? 'Five rounds cost five fits and buy a steadier answer.' : 'Five rounds buy a steadier estimate of the error, but on these points the choice of degree is a close call: even the averaged score flips between degrees from one deal to the next.'}`,
    });

    /* Act 6: the leakage lab. Each pipeline gets a picture-only step and a
       result step; the order is seeded, and only clear verdicts are asked,
       as many leaky as honest. */
    const results = PIPELINES.map(p => ({ pipe: p, result: runPipeline(p.id, seed * 17 + PIPELINES.indexOf(p)) }));
    const clear = results.filter(r => clearVerdict(r.pipe, r.result));
    const nAsk = Math.min(clear.filter(r => r.pipe.leaky).length, clear.filter(r => !r.pipe.leaky).length);
    const rng = createRng(seed * 13 + 3);
    const asked = new Set([...rng.shuffle(clear.filter(r => r.pipe.leaky)).slice(0, nAsk), ...rng.shuffle(clear.filter(r => !r.pipe.leaky)).slice(0, nAsk)].map(r => r.pipe.id));
    s(6, {
        view: 'noise',
        explanation: `A harder trap. ${NOISE_ROWS} rows of ${NOISE_FEATURES} random numbers, and labels from a coin flip that has nothing to do with them. No model can beat 50% on new rows. So any pipeline whose cross-validated accuracy comes out well above 50% is fooling itself.`,
    });
    for (const { pipe, result } of rng.shuffle(results)) {
        s(6, { view: 'pipeline', pipe, revealed: false, ask: asked.has(pipe.id), explanation: `Pipeline: ${pipe.name.toLowerCase()}. Every model's true accuracy here is 50%. Run it ${NOISE_RUNS} times on fresh noise and average.` });
        s(6, {
            view: 'pipeline', pipe, revealed: true, result, ask: asked.has(pipe.id),
            explanation: `Average cross-validated accuracy ${pct(result.mean)} over ${NOISE_RUNS} runs${pipe.leaky ? ' — on pure noise.' : '.'} ${pipe.why}`,
        });
    }
    s(6, {
        view: 'recap',
        explanation: 'The rule behind all six: anything that looks at the answers of the rows you will score on — choosing features, choosing among models, copies of those rows — must happen inside the training side of the split. Switch to Explore to try it.',
    });
    return steps;
};

/* ── predict ─────────────────────────────────────────────
   On each pipeline's picture-only step: will its average accuracy on pure
   noise come out near 50% or clearly above? Decided by whether label
   information from the scored rows can reach the model, which the pipeline
   diagram shows. Asked only when the measured mean is clearly on one side,
   as many leaky as honest per tour. */
const predictFor = (step, next) => {
    if (step.view !== 'pipeline' || step.revealed || !step.ask || !next?.revealed) return null;
    const leaky = next.pipe.leaky;
    return {
        question: `Labels are pure noise, so the true accuracy is 50%. What will this pipeline's cross-validated accuracy average?`,
        options: LEAK_OPTIONS,
        correct: leaky ? 1 : 0,
        because: `It averaged ${pct(next.result.mean)}. ${leaky ? `Step ${next.pipe.leakBox + 1} lets the scored rows' answers reach the model.` : 'Nothing the model sees depends on the held-out labels.'}`,
    };
};

function formulaFor(step) {
    if (step.view === 'folds' || step.view === 'cv') {
        const row = step.view === 'cv' ? step.cv[step.mark] : null;
        if (row) return String.raw`\text{CV}(d{=}${row.d}) = \tfrac{1}{${K_FOLDS}}\textstyle\sum_{j=1}^{${K_FOLDS}} \text{MSE}_j = \tfrac{1}{${K_FOLDS}}(${row.perFold.map(v => tn(v, 3)).join(' + ')}) = ${tn(row.mean, 3)}`;
        return String.raw`\text{MSE}_{${step.round + 1}} = \tfrac{1}{n_{${step.round + 1}}}\textstyle\sum_{i \in \text{fold } ${step.round + 1}} (\hat y_i - y_i)^2 = ${tn(step.foldMse, 3)}`;
    }
    if (step.view === 'peek') return String.raw`\text{optimism} = \overline{\text{true}} - \overline{\text{reported}} = ${tn(step.peek.peekTrue, 3)} - ${tn(step.peek.peekReported, 3)} = ${tn(step.peek.peekTrue - step.peek.peekReported, 3)}`;
    if (step.view === 'spread') return String.raw`\sigma_{\text{one split}} = ${tn(step.spread.single.sd, 3)}, \qquad \sigma_{${K_FOLDS}\text{-fold}} = ${tn(step.spread.cv.sd, 3)}`;
    if (step.view === 'pipeline' && step.revealed) return String.raw`\text{accuracy} = \tfrac{\#\text{correct}}{${NOISE_ROWS}}, \qquad \text{mean of } ${NOISE_RUNS} \text{ runs} = ${tn(step.result.mean * 100, 1)}\%`;
    if (step.view === 'pipeline' || step.view === 'noise' || step.view === 'recap') return String.raw`X \in \mathbb{R}^{${NOISE_ROWS} \times ${NOISE_FEATURES}}, \quad y \in \{0, 1\}^{${NOISE_ROWS}}, \quad P(\hat y = y) = 0.5 \text{ for every model}`;
    if (step.rows && step.degree !== undefined) {
        const r = step.rows[step.degree];
        return String.raw`d = ${step.degree}: \quad \text{MSE}_{\text{train}} = ${tn(r.train, 3)}, \quad \text{MSE}_{\text{val}} = ${tn(r.val, 3)}${step.testShown || step.chart?.includes('test') ? String.raw`, \quad \text{MSE}_{\text{test}} = ${tn(r.test, 3)}` : ''}`;
    }
    return String.raw`${N_POINTS} = \underbrace{${SIZES.train}}_{\text{train}} + \underbrace{${SIZES.val}}_{\text{validation}} + \underbrace{${SIZES.test}}_{\text{test}}`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'You compare 30 models and keep the one with the best validation score. Why is that validation score now an optimistic estimate of its error?',
        options: [
            'Validation sets are always too small to trust',
            'Picking the best of many noisy scores favours the model that got lucky on those particular rows',
            'The model was trained on the validation set',
            'It is not optimistic — validation scores are unbiased whatever you do with them',
        ],
        correct: 1,
        explanation: 'Each score is noisy. The maximum of 30 noisy scores sits above the typical one, so the winner\'s score overstates it. That is why the final number comes from a test set that played no part in the choice.',
    },
    {
        question: 'In 5-fold cross-validation on 40 rows, how many times is each row used for validation?',
        options: ['Never', 'Exactly once', 'Five times', 'It depends on the random split'],
        correct: 1,
        explanation: 'Each round holds out one of the five folds, and every row belongs to exactly one fold — so every row is validated exactly once and trains in the other four rounds.',
    },
    {
        question: 'On pure-noise labels, a pipeline keeps the 10 features most related to the label using all rows, then cross-validates. What happens?',
        options: [
            'About 50% accuracy: cross-validation corrects for it',
            'Accuracy well above 50%, because the features were chosen using the held-out rows\' labels',
            'Accuracy well below 50%',
            'The pipeline fails to run',
        ],
        correct: 1,
        explanation: 'The selection already looked at every label, including those of each validation fold. On this page it averages over 80% on data where nothing can be predicted. Selection must happen inside each fold.',
    },
];

const codeExample = `import numpy as np
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.model_selection import cross_val_score
from sklearn.neighbors import NearestCentroid
from sklearn.pipeline import make_pipeline

leaky, honest = [], []
for seed in range(40):
    rng = np.random.default_rng(seed)
    X = rng.normal(size=(40, 200))            # [40, 200] pure noise
    y = rng.permutation([0] * 20 + [1] * 20)  # labels unrelated to X

    X10 = SelectKBest(f_classif, k=10).fit_transform(X, y)       # looked at every label
    leaky.append(cross_val_score(NearestCentroid(), X10, y, cv=5).mean())

    pipe = make_pipeline(SelectKBest(f_classif, k=10), NearestCentroid())
    honest.append(cross_val_score(pipe, X, y, cv=5).mean())     # selection refitted per fold

print(np.mean(leaky).round(3), np.mean(honest).round(3))
# 0.846 0.507    leaky: 85% on pure noise; honest: chance`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Revisit the peeking and leakage acts, then retry.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white">Retake</button>
            </div>
        );
    }
    const answer = (idx) => {
        if (quizState.answered) return;
        const right = idx === q.correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: right ? s.score + 1 : s.score }));
    };
    const next = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };
    return (
        <div>
            <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
            <p className="text-sm text-slate-200 mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let tone = 'border-slate-700 text-slate-300 hover:border-lime-500';
                    if (quizState.answered) {
                        if (i === q.correct) tone = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) tone = 'border-red-500 bg-red-500/10 text-red-300';
                        else tone = 'border-slate-800 text-slate-500';
                    }
                    return (
                        <button key={opt} onClick={() => answer(i)} disabled={quizState.answered}
                            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors flex items-start gap-2 ${tone}`}>
                            {quizState.answered && i === q.correct && <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                            {quizState.answered && i === quizState.selected && i !== q.correct && <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                            <span>{opt}</span>
                        </button>
                    );
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{q.explanation}</p>
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── pictures ───────────────────────────────────────────── */

const C = { train: '#38bdf8', val: '#fb923c', test: '#e879f9', fit: '#a3e635', grey: '#64748b' };
const r2 = (v) => Math.round(v * 100) / 100;

/* Points coloured by role, with an optional fitted curve. x spans 2 units
   and y 4, so this draws its own axes rather than Plane2D's equal units. */
function PointsPlot({ points, roles, coefs, foldOf, round }) {
    const W = 420, H = 280, P = 28, Y = [-2, 2];
    const sx = (x) => r2(P + ((x + 1.05) / 2.1) * (W - 2 * P));
    const sy = (y) => r2(H - P - ((Math.max(-3, Math.min(3, y)) - Y[0]) / (Y[1] - Y[0])) * (H - 2 * P));
    const path = coefs ? Array.from({ length: 211 }, (_, i) => { const x = -1.05 + i / 100; return `${i ? 'L' : 'M'}${sx(x)},${sy(evalPoly(coefs, x))}`; }).join(' ') : null;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Data points by role and the fitted curve">
            <defs><clipPath id="tvt-clip"><rect x={P} y={P - 10} width={W - 2 * P} height={H - 2 * P + 20} /></clipPath></defs>
            {[-2, -1, 0, 1, 2].map(v => <g key={v}><line x1={P} x2={W - P} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? '#334155' : '#1e293b'} /><text x={P - 6} y={sy(v) + 4} fontSize="10" textAnchor="end" fill="#64748b">{v}</text></g>)}
            {[-1, -0.5, 0, 0.5, 1].map(v => <text key={v} x={sx(v)} y={H - 8} fontSize="10" textAnchor="middle" fill="#64748b">{v}</text>)}
            {path && <path d={path} fill="none" stroke={C.fit} strokeWidth="2.5" clipPath="url(#tvt-clip)" />}
            {points.map(([x, y], i) => {
                if (foldOf) {
                    const out = foldOf[i] === round;
                    return <circle key={i} cx={sx(x)} cy={sy(y)} r="4.5" fill={out ? 'none' : C.train} stroke={out ? C.val : '#0f172a'} strokeWidth={out ? 2 : 1} />;
                }
                const role = roles ? roles[i] : null;
                if (!role) return <circle key={i} cx={sx(x)} cy={sy(y)} r="4.5" fill="#94a3b8" stroke="#0f172a" />;
                if (role === 'train') return <circle key={i} cx={sx(x)} cy={sy(y)} r="4.5" fill={C.train} stroke="#0f172a" />;
                return <circle key={i} cx={sx(x)} cy={sy(y)} r="4.5" fill="none" stroke={C[role]} strokeWidth="2" />;
            })}
        </svg>
    );
}

/* MSE per degree, log scale, for whichever piles are named. */
function ErrorChart({ rows, keys, mark, dots }) {
    const W = 420, H = 220, L = 42, B = 26, T = 10;
    const vals = rows.flatMap(r => keys.map(k => r[k])).concat(dots ? rows.flatMap(r => r.perFold) : []).filter(v => v > 0);
    const lo = Math.min(...vals) * 0.8, hi = Math.max(...vals) * 1.25;
    const [a, b] = [Math.log10(lo), Math.log10(hi)];
    const sx = (d) => r2(L + (d / MAX_DEG) * (W - L - 12));
    const sy = (v) => r2(T + (1 - (Math.log10(Math.max(lo, v)) - a) / (b - a || 1)) * (H - T - B));
    const ticks = [0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5].filter(v => v >= lo && v <= hi);
    const names = { train: 'training', val: 'validation', test: 'test', mean: 'CV mean' };
    const color = { train: C.train, val: C.val, test: C.test, mean: C.val };
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Error by degree">
            {ticks.map(v => <g key={v}><line x1={L} x2={W - 12} y1={sy(v)} y2={sy(v)} stroke="#1e293b" /><text x={L - 6} y={sy(v) + 4} fontSize="10" textAnchor="end" fill="#64748b">{v}</text></g>)}
            {rows.map(r => <text key={r.d} x={sx(r.d)} y={H - 8} fontSize="10" textAnchor="middle" fill={r.d === mark ? '#e2e8f0' : '#64748b'}>{r.d}</text>)}
            {dots && rows.map(r => r.perFold.map((v, j) => <circle key={`${r.d}-${j}`} cx={sx(r.d)} cy={sy(v)} r="2.5" fill={C.val} opacity="0.45" />))}
            {keys.map(k => <path key={k} d={rows.map((r, i) => `${i ? 'L' : 'M'}${sx(r.d)},${sy(r[k])}`).join(' ')} fill="none" stroke={color[k]} strokeWidth="2.5" />)}
            {keys.map(k => rows.map(r => <circle key={`${k}${r.d}`} cx={sx(r.d)} cy={sy(r[k])} r="3" fill={color[k]} />))}
            {mark !== undefined && <circle cx={sx(mark)} cy={sy(rows[mark][keys[keys.length - 1]])} r="8" fill="none" stroke="#facc15" strokeWidth="2" />}
            {keys.map((k, i) => <text key={k} x={W - 14} y={T + 10 + 13 * i} fontSize="10" textAnchor="end" fill={color[k]}>{names[k]}</text>)}
            <text x="2" y={H - 8} fontSize="10" fill="#94a3b8">degree</text>
        </svg>
    );
}

/* Rows are rounds, columns are the pool points by x; the held-out fold is orange. */
function FoldGrid({ folds, k, round }) {
    const n = folds.length, cell = 10, gap = 2, W = 34 + n * (cell + gap), H = k * (cell + gap) + 4;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Which points validate in each round">
            {Array.from({ length: k }, (_, j) => (
                <g key={j} opacity={round === undefined || round === j ? 1 : 0.35}>
                    <text x="0" y={j * (cell + gap) + cell - 1} fontSize="9" fill="#94a3b8">R{j + 1}</text>
                    {folds.map((fj, i) => <rect key={i} x={34 + i * (cell + gap)} y={j * (cell + gap)} width={cell} height={cell} rx="2" fill={fj === j ? C.val : C.train} opacity={fj === j ? 1 : 0.55} />)}
                </g>
            ))}
        </svg>
    );
}

function BarPair({ items, max }) {
    return (
        <div className="space-y-2">
            {items.map(({ label, value, color, note }) => (
                <div key={label}>
                    <div className="flex justify-between text-xs mb-0.5"><span className="text-slate-300">{label}</span><span className="font-mono text-slate-100 tabular-nums">{fm(value)}{note ? ` ${note}` : ''}</span></div>
                    <div className="h-2.5 bg-slate-800 rounded-sm overflow-hidden"><div className="h-full rounded-sm" style={{ width: `${r2((value / max) * 100)}%`, background: color }} /></div>
                </div>
            ))}
        </div>
    );
}

function PipelineDiagram({ pipe, revealed }) {
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {pipe.boxes.map((b, i) => {
                const bad = revealed && pipe.leaky && i === pipe.leakBox;
                return (
                    <React.Fragment key={b}>
                        {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />}
                        <span className={`text-xs px-2.5 py-1.5 rounded-lg border ${bad ? 'border-red-500 bg-red-500/15 text-red-200' : 'border-slate-700 bg-slate-800/70 text-slate-200'}`}>
                            <span className="text-slate-500 mr-1">{i + 1}.</span>{b}
                        </span>
                    </React.Fragment>
                );
            })}
        </div>
    );
}

/* Accuracy of every run as a dot on 0–100%, equal scores stacked, with chance marked. */
function AccuracyStrip({ accs, avg }) {
    const W = 420, H = 104, L = 16, R = 16, AXIS = 78;
    const sx = (v) => r2(L + v * (W - L - R));
    const seen = {};
    const dots = accs.map(a => { const key = Math.round(a * 1000); const k = seen[key] = (seen[key] ?? -1) + 1; return { a, k: Math.min(k, 8) }; });
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Accuracy of each run">
            <line x1={L} x2={W - R} y1={AXIS} y2={AXIS} stroke="#334155" />
            {[0, 0.25, 0.5, 0.75, 1].map(v => <text key={v} x={sx(v)} y={AXIS + 18} fontSize="10" textAnchor="middle" fill={v === 0.5 ? '#e2e8f0' : '#64748b'}>{v * 100}%</text>)}
            <line x1={sx(0.5)} x2={sx(0.5)} y1="16" y2={AXIS + 4} stroke="#e2e8f0" strokeDasharray="3 3" />
            {dots.map(({ a, k }, i) => <circle key={i} cx={sx(a)} cy={AXIS - 6 - k * 7} r="3" fill={C.fit} opacity="0.8" />)}
            <line x1={sx(avg)} x2={sx(avg)} y1="16" y2={AXIS + 4} stroke="#facc15" strokeWidth="2.5" />
            <text x={sx(avg)} y="11" fontSize="10" textAnchor={avg > 0.8 ? 'end' : 'start'} dx={avg > 0.8 ? -4 : 4} fill="#facc15">mean {pct(avg)}</text>
        </svg>
    );
}

/* ── explore ────────────────────────────────────────────── */

const FOLD_CHOICES = [2, 3, 5, 8, 10, 32];

function Explore({ initialSeed }) {
    const [seed, setSeed] = useState(initialSeed);
    const [kIdx, setKIdx] = useState(2);
    const [degree, setDegree] = useState(3);
    const [foldSeed, setFoldSeed] = useState(1);
    const [features, setFeatures] = useState(NOISE_FEATURES);
    const [keep, setKeep] = useState(KEEP);
    const [leak, setLeak] = useState(false);
    const [noiseSeed, setNoiseSeed] = useState(5);
    const k = FOLD_CHOICES[kIdx];

    const data = useMemo(() => makeData(seed), [seed]);
    const pool = useMemo(() => [...pick(data, 'train'), ...pick(data, 'val')].sort((a, b) => a[0] - b[0]), [data]);
    const folds = useMemo(() => foldsFor(foldSeed, pool.length, k), [foldSeed, pool, k]);
    const cv = useMemo(() => cvTable(pool, folds, k), [pool, folds, k]);
    const row = cv[degree];
    const best = argmin(cv.map(r => r.mean));

    const lab = useMemo(() => {
        const rng = createRng(noiseSeed);
        const accs = Array.from({ length: 20 }, () => {
            const { X, y } = noiseSet(rng, NOISE_ROWS, features);
            const fold = dealFolds(rng, NOISE_ROWS, K_FOLDS);
            if (leak) { const feats = topK(featureScores(X, y, allRows(NOISE_ROWS)), keep); return cvAccuracy(X, y, fold, K_FOLDS, () => feats); }
            return cvAccuracy(X, y, fold, K_FOLDS, (train) => topK(featureScores(X, y, train), keep));
        });
        return { accs, mean: mean(accs) };
    }, [noiseSeed, features, keep, leak]);
    const repair = () => { setLeak(false); setFeatures(NOISE_FEATURES); setKeep(KEEP); };

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <h2 className="text-sm font-semibold text-white">Cross-validation lab</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="min-w-0 space-y-2">
                        <PointsPlot points={pool} foldOf={folds} round={-1} coefs={fitPolynomial(pool, degree)} />
                        <p className="text-[11px] text-slate-500">The {pool.length} training and validation points; the curve is degree {degree} fitted on all of them.</p>
                    </div>
                    <div className="min-w-0 space-y-2">
                        <ErrorChart rows={cv} keys={['mean']} mark={degree} dots />
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {[['CV mean', fm(row.mean)], ['spread of folds', `±${fm(sd(row.perFold))}`], ['best degree', best]].map(([kk, v]) => (
                                <div key={kk} className="rounded-lg bg-slate-800/70 border border-slate-700/60 py-2 px-1">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{kk}</div>
                                    <div className="font-mono text-sm text-slate-100 tabular-nums">{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <FoldGrid folds={folds} k={Math.min(k, 10)} />
                {k > 10 && <p className="text-[11px] text-slate-500">Showing the first 10 of {k} rounds. With k = {pool.length}, every round holds out a single point: leave-one-out.</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ParamSlider label="Folds k" value={kIdx} onChange={setKIdx} min={0} max={FOLD_CHOICES.length - 1} step={1} accent="lime"
                        format={() => (k === pool.length ? `${k} (leave-one-out)` : String(k))} hint={`${k} fits per degree; each point validated once.`} />
                    <ParamSlider label="Degree d" value={degree} onChange={setDegree} min={0} max={MAX_DEG} step={1} accent="lime" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setFoldSeed(randomSeed())} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500"><Shuffle className="h-3.5 w-3.5" />Deal new folds</button>
                    <button onClick={() => setSeed(randomSeed())} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500"><Shuffle className="h-3.5 w-3.5" />New data</button>
                </div>
                <div className="text-slate-100 text-sm"><Tex block>{String.raw`\text{CV}(d{=}${degree}) = \tfrac{1}{${k}}\textstyle\sum_{j=1}^{${k}} \text{MSE}_j = ${tn(row.mean, 3)}`}</Tex></div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-white">Leakage lab: pure-noise labels</h2>
                    <ShapeTag label="X" names={['rows', 'features']} shape={[NOISE_ROWS, features]} />
                </div>
                <AccuracyStrip accs={lab.accs} avg={lab.mean} />
                <p className="text-sm text-slate-300">
                    {leak ? 'Features picked using every row\'s label, then 5-fold cross-validation' : 'Features picked inside each fold, from its training rows only'}: average {pct(lab.mean)} over 20 runs. True accuracy: 50%.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ParamSlider label="Noise features" value={features} onChange={setFeatures} min={20} max={1000} step={20} accent="lime" />
                    <ParamSlider label="Features kept" value={keep} onChange={setKeep} min={1} max={40} step={1} accent="lime" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Break it:</span>
                    <button onClick={() => setLeak(true)} disabled={leak} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-lime-500 disabled:opacity-40">Pick features before splitting</button>
                    <button onClick={() => setNoiseSeed(randomSeed())} aria-label="New noise" title="New noise" className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                    <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500">
                        <Wrench className="h-3.5 w-3.5" />Repair
                    </button>
                </div>
                {leak && lab.mean >= CLEARLY_ABOVE && (
                    <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                        {pct(lab.mean)} on labels that are coin flips. The more noise features there are to choose from, the better the lucky ones look — slide them up and watch.
                    </p>
                )}
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function TrainValidationTestPage() {
    const [mode, setMode] = useState('guided');
    const [seed, setSeed] = useState(DEFAULT_SEED);
    const stepHistory = useMemo(() => generateSteps(seed), [seed]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1800);
    const [explore, setExplore] = useState({ seed, key: 0 });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const study = useMemo(() => runPipeline('select-all', 2024, 100), []);
    const honest = useMemo(() => runPipeline('select-inside', 2024, 100), []);

    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const jumpToAct = (act) => { setIsPlaying(false); setCurrentStep(stepHistory.findIndex(s => s.act === act)); };
    const toExplore = () => { setExplore(e => ({ seed, key: e.key + 1 })); setMode('explore'); setIsPlaying(false); };

    const rows = step.rows;
    const view = step.view;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/machine-learning" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Machine Learning
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Train, Validation and Test</h1>
                    <p className="text-lime-50 max-w-3xl">
                        Fit on one pile, choose on another, report on a third that was never consulted. Then k-fold cross-validation, and six pipelines on pure-noise labels — three of which score far above chance.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/80">Builds on</span>
                        <Link href="/machine-learning/overfitting-and-underfitting" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Overfitting and Underfitting</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                            {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                <button key={key} role="tab" aria-selected={mode === key}
                                    onClick={() => { if (key === 'explore') toExplore(); else { setMode('guided'); setIsPlaying(false); } }}
                                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-lime-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                    <Icon className="h-4 w-4" />{label}
                                </button>
                            ))}
                        </div>
                        <SourceChip kind="live">Every fit and every cross-validation run computed in your browser · seeded data</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={explore.key} initialSeed={explore.seed} />
                    ) : (
                        <>
                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="flex flex-wrap gap-1.5 px-4 pt-4" role="tablist" aria-label="Acts">
                                    {ACTS.map(act => {
                                        const Icon = act.icon;
                                        const tone = act.id === step.act
                                            ? 'bg-lime-500/20 text-lime-200 border-lime-500/50'
                                            : act.id < step.act ? 'bg-slate-800/60 text-slate-400 border-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300';
                                        return (
                                            <button key={act.id} role="tab" aria-selected={act.id === step.act} onClick={() => jumpToAct(act.id)}
                                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${tone}`}>
                                                <Icon className="h-3.5 w-3.5" />{act.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="h-0.5 bg-slate-800 mt-3">
                                    <div className="h-full bg-gradient-to-r from-lime-500 to-green-500 transition-all" style={{ width: `${(currentStep / (stepHistory.length - 1)) * 100}%` }} />
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                                        <span>Act {step.act} of {ACTS.length} · {step.actName}</span>
                                        <span>step {currentStep + 1} of {stepHistory.length}</span>
                                    </div>

                                    {(view === 'points' || view === 'folds' || view === 'cv') && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                            <div className="min-w-0">
                                                {view === 'points'
                                                    ? <PointsPlot points={step.data.points} roles={step.roles ? step.data.roles : null} coefs={step.degree !== undefined ? rows[step.degree].c : null} />
                                                    : <PointsPlot points={step.pool} foldOf={step.folds} round={view === 'folds' ? step.round : -1}
                                                        coefs={view === 'folds' ? fitPolynomial(step.pool.filter((_, i) => step.folds[i] !== step.round), step.degree) : fitPolynomial(step.pool, step.mark)} />}
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                                                    {view === 'points' && step.roles
                                                        ? <><span style={{ color: C.train }}>● train {SIZES.train}</span><span style={{ color: C.val }}>○ validation {SIZES.val}</span><span style={{ color: C.test }}>○ test {SIZES.test}</span></>
                                                        : view === 'points' ? <span>{N_POINTS} points</span>
                                                            : <><span style={{ color: C.train }}>● training rows</span><span style={{ color: C.val }}>○ held out this round</span></>}
                                                </div>
                                            </div>
                                            <div className="min-w-0 space-y-3">
                                                {view === 'points' && step.chart && <ErrorChart rows={rows} keys={step.chart} mark={step.mark} />}
                                                {view === 'points' && !step.chart && (
                                                    <div className="space-y-2 text-sm text-slate-400">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            <ShapeTag label="train" names={['n', 'x,y']} shape={[SIZES.train, 2]} />
                                                            <ShapeTag label="val" names={['n', 'x,y']} shape={[SIZES.val, 2]} />
                                                            <ShapeTag label="test" names={['n', 'x,y']} shape={[SIZES.test, 2]} />
                                                        </div>
                                                        <p>Training fits the coefficients. Validation chooses between models. Test reports, once.</p>
                                                    </div>
                                                )}
                                                {view === 'folds' && <p className="text-xs text-slate-400">Round {step.round + 1}: degree {step.degree} fitted on {step.folds.filter(x => x !== step.round).length} points, scored on {step.folds.filter(x => x === step.round).length}. MSE {fm(step.foldMse)}.</p>}
                                                {view === 'cv' && <ErrorChart rows={step.cv} keys={['mean']} mark={step.mark} dots />}
                                            </div>
                                            {(view === 'folds' || view === 'cv') && (
                                                <div className="md:col-span-2">
                                                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mb-1"><span>Rounds R1–R{K_FOLDS} (rows) by the {step.pool.length} points in x order (columns)</span><ShapeTag label="folds" names={['rounds', 'points']} shape={[K_FOLDS, step.pool.length]} /></div>
                                                    <FoldGrid folds={step.folds} k={K_FOLDS} round={view === 'folds' ? step.round : undefined} />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {view === 'peek' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Choose by validation, report test</p>
                                                <BarPair max={Math.max(step.peek.peekTrue, step.peek.honestTrue) * 1.1} items={[
                                                    { label: 'reported (test MSE)', value: step.peek.honestReported, color: C.test },
                                                    { label: `true (${FRESH} fresh points)`, value: step.peek.honestTrue, color: '#94a3b8' },
                                                ]} />
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Choose by test, report test</p>
                                                <BarPair max={Math.max(step.peek.peekTrue, step.peek.honestTrue) * 1.1} items={[
                                                    { label: 'reported (test MSE)', value: step.peek.peekReported, color: C.test },
                                                    { label: `true (${FRESH} fresh points)`, value: step.peek.peekTrue, color: '#94a3b8' },
                                                ]} />
                                            </div>
                                            <p className="md:col-span-2 text-xs text-slate-500">Averages over {PEEK_RUNS} datasets of {N_POINTS} points.</p>
                                        </div>
                                    )}

                                    {view === 'spread' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Estimate of degree {SPREAD_DEGREE}&apos;s error, ± spread</p>
                                                <BarPair max={Math.max(step.spread.single.sd, step.spread.cv.sd) * 1.15} items={[
                                                    { label: `one ${SIZES.train}/${SIZES.val} split`, value: step.spread.single.sd, color: C.val },
                                                    { label: `${K_FOLDS}-fold mean`, value: step.spread.cv.sd, color: C.fit },
                                                ]} />
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Picks its most common degree</p>
                                                <BarPair max={1} items={[
                                                    { label: `one ${SIZES.train}/${SIZES.val} split`, value: step.spread.single.agree, color: C.val },
                                                    { label: `${K_FOLDS}-fold mean`, value: step.spread.cv.agree, color: C.fit },
                                                ]} />
                                            </div>
                                            <p className="md:col-span-2 text-xs text-slate-500">{SPREAD_RUNS} reshuffles of the same 32 points.</p>
                                        </div>
                                    )}

                                    {(view === 'noise' || view === 'recap') && (
                                        <div className="space-y-3 text-sm text-slate-300">
                                            <div className="flex flex-wrap gap-1.5">
                                                <ShapeTag label="X" names={['rows', 'features']} shape={[NOISE_ROWS, NOISE_FEATURES]} />
                                                <ShapeTag label="y" names={['rows']} shape={[NOISE_ROWS]} />
                                            </div>
                                            {view === 'recap' ? (
                                                <ul className="space-y-1.5">
                                                    {PIPELINES.map(p => (
                                                        <li key={p.id} className="flex items-start gap-2">
                                                            {p.leaky ? <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" /> : <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />}
                                                            <span>{p.name}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : <p>Each row: {NOISE_FEATURES} standard-normal numbers. Each label: 0 or 1, twenty of each, assigned at random.</p>}
                                        </div>
                                    )}

                                    {view === 'pipeline' && (
                                        <div className="space-y-4">
                                            <p className="text-sm font-semibold text-slate-200">{step.pipe.name}</p>
                                            <PipelineDiagram pipe={step.pipe} revealed={step.revealed} />
                                            {step.revealed
                                                ? <AccuracyStrip accs={step.result.accs} avg={step.result.mean} />
                                                : <p className="text-sm text-slate-500">Run {NOISE_RUNS} times on fresh noise, each run a {K_FOLDS}-fold cross-validation…</p>}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2 mt-4">
                                        <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                        <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                        <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500 disabled:opacity-40">
                                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                        </button>
                                        <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                        <button onClick={() => { setSeed(randomSeed()); setCurrentStep(0); setIsPlaying(false); }} aria-label="New data" title="New data"
                                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Shuffle className="h-4 w-4" /></button>
                                        <PredictToggle predict={predict} accent="lime" />
                                        <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                            Speed
                                            <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-lime-500" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {predict.prompt && <PredictPrompt predict={predict} accent="lime" />}

                            <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-lime-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-lime-200 text-sm leading-relaxed">
                                        {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-slate-100 text-sm sm:text-base overflow-x-auto">
                                <Tex block>{formulaFor(step)}</Tex>
                            </div>
                        </>
                    )}

                    <InCode title="Leaky and honest feature selection in scikit-learn" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Three piles, three jobs</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-sky-300 font-semibold">Training</span> — fits the parameters (the coefficients).</li>
                            <li><span className="text-orange-300 font-semibold">Validation</span> — chooses between models and settings (the degree). Its score becomes optimistic as soon as you choose by it.</li>
                            <li><span className="text-fuchsia-300 font-semibold">Test</span> — opened once, to report. Never used to decide anything.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
                        <p className="text-sm text-slate-300 mb-2">&ldquo;Cross-validation gives an honest score, whatever you did to the data before it.&rdquo;</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            On {NOISE_ROWS} rows of pure noise, picking {KEEP} of {NOISE_FEATURES} features with every label and then cross-validating averaged {pct(study.mean)} accuracy over {study.accs.length} runs — on data where nothing can be predicted. Doing the same selection inside each fold averaged {pct(honest.mean)}.
                        </p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>
                </aside>
            </div>
        </div>
    );
}
