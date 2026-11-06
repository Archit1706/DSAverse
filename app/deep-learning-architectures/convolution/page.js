"use client";

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Image as ImageIcon, Grid3x3, Calculator, MoveRight, LayoutGrid,
    Footprints, Frame, Share2, CheckCircle, XCircle, Wrench, Eraser,
} from 'lucide-react';
import { rankedChoices, slotOf } from '@/lib/ml/predictChoices';
import { sequential, diverging, inkOn } from '@/components/ml/colors';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import MatrixInput from '@/components/math/MatrixInput';
import ParamSlider from '@/components/math/ParamSlider';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, { useStepPlayback, ExplanationBox, ModeTabs, Misconception, BreakNote, FormulaPanel, Card } from '@/components/ml/TourKit';

/* ── the pictures and kernels ──────────────────────────────
   Small hand-made pictures (brightness 0–3) and the classic hand-written
   kernels, so every multiply-add can be done in your head. Nothing here is
   learned — the next pages show kernels a network learned for itself. */

const PICTURES = {
    bar: [
        [0, 0, 0, 2, 3, 0, 0],
        [0, 0, 1, 3, 3, 0, 0],
        [0, 0, 1, 3, 2, 0, 0],
        [0, 0, 0, 3, 3, 1, 0],
        [0, 0, 0, 2, 3, 1, 0],
        [0, 0, 1, 3, 3, 0, 0],
        [0, 0, 0, 3, 2, 0, 0],
    ],
    tee: [
        [0, 0, 0, 0, 0, 0, 0],
        [3, 3, 3, 3, 3, 3, 2],
        [2, 3, 3, 3, 3, 2, 3],
        [0, 0, 1, 3, 1, 0, 0],
        [0, 0, 0, 3, 0, 0, 0],
        [0, 0, 1, 3, 0, 0, 0],
        [0, 0, 0, 2, 0, 0, 0],
    ],
    slash: [
        [0, 0, 0, 0, 0, 1, 3],
        [0, 0, 0, 0, 1, 3, 1],
        [0, 0, 0, 1, 3, 1, 0],
        [0, 0, 1, 3, 2, 0, 0],
        [0, 1, 3, 1, 0, 0, 0],
        [1, 3, 2, 0, 0, 0, 0],
        [3, 1, 0, 0, 0, 0, 0],
    ],
    dot: [
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0],
        [0, 1, 2, 3, 2, 0, 0],
        [0, 1, 3, 3, 3, 1, 0],
        [0, 0, 2, 3, 2, 1, 0],
        [0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
    ],
};

const KERNELS = {
    vertical: { name: 'Vertical edge', k: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]] },
    horizontal: { name: 'Horizontal edge', k: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]] },
    sharpen: { name: 'Sharpen', k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
    box: { name: 'Box blur (sum)', k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
    diagonal: { name: 'Diagonal', k: [[-1, -1, 2], [-1, 2, -1], [2, -1, -1]] },
    identity: { name: 'Identity', k: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] },
};

const PRESETS = [
    { label: 'Vertical edges of a bar', picture: 'bar', kernel: 'vertical' },
    { label: 'Horizontal edges of a T', picture: 'tee', kernel: 'horizontal' },
    { label: 'Diagonal line detector', picture: 'slash', kernel: 'diagonal' },
    { label: 'Sharpen a blob', picture: 'dot', kernel: 'sharpen' },
];

const ACTS = [
    { id: 1, label: 'Picture', icon: ImageIcon },
    { id: 2, label: 'One window', icon: Calculator },
    { id: 3, label: 'Slide', icon: MoveRight },
    { id: 4, label: 'Feature map', icon: LayoutGrid },
    { id: 5, label: 'Stride', icon: Footprints },
    { id: 6, label: 'Padding', icon: Frame },
    { id: 7, label: 'Shared weights', icon: Share2 },
];

const K = 3;
const sgn = (v) => (v < 0 ? `−${-v}` : String(v));
const par = (v) => (v < 0 ? `(${sgn(v)})` : String(v));

/** The output size along one side: ⌊(n + 2p − k) / s⌋ + 1 (0 if the kernel does not fit). */
const outSize = (n, k, s, p) => (n + 2 * p < k ? 0 : Math.floor((n + 2 * p - k) / s) + 1);

/** The picture with p rings of zeros around it. */
function padded(img, p) {
    const n = img.length, m = img[0].length;
    return Array.from({ length: n + 2 * p }, (_, i) => Array.from({ length: m + 2 * p }, (_, j) => {
        const r = i - p, c = j - p;
        return r >= 0 && r < n && c >= 0 && c < m ? img[r][c] : 0;
    }));
}

/** The nine (pixel, weight) pairs under the window whose top-left is (r, c) in padded coordinates. */
function windowTerms(xp, kernel, r, c) {
    const terms = [];
    for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) terms.push({ a, b, x: xp[r + a][c + b], w: kernel[a][b] });
    return terms;
}
const sumTerms = (terms) => terms.reduce((s, t) => s + t.x * t.w, 0);

/** Every output value: a sliding dot product with the same kernel at each position. */
function convolve(img, kernel, s, p) {
    const xp = padded(img, p);
    const H = outSize(img.length, K, s, p), W = outSize(img[0].length, K, s, p);
    return Array.from({ length: H }, (_, i) => Array.from({ length: W }, (_, j) => sumTerms(windowTerms(xp, kernel, i * s, j * s))));
}

/** Which input pixels (unpadded) at least one window covers. */
function coverage(n, m, s, p) {
    const seen = Array.from({ length: n }, () => Array(m).fill(false));
    const H = outSize(n, K, s, p), W = outSize(m, K, s, p);
    for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) {
        for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) {
            const r = i * s + a - p, c = j * s + b - p;
            if (r >= 0 && r < n && c >= 0 && c < m) seen[r][c] = true;
        }
    }
    return seen;
}

const describeSum = (terms) => terms.map(t => `${t.x}×${par(t.w)}`).join(' + ');
const texTerm = (t) => `${t.x}\\cdot ${t.w < 0 ? `(${t.w})` : t.w}`;

const generateSteps = (presetIndex) => {
    const preset = PRESETS[presetIndex];
    const img = PICTURES[preset.picture];
    const { k: kernel, name: kname } = KERNELS[preset.kernel];
    const n = img.length;
    const full = convolve(img, kernel, 1, 0);
    const H = full.length;
    const empty = () => Array.from({ length: H }, () => Array(H).fill(null));

    const steps = [];
    const base = { presetIndex, img, kernel, kname, n };
    const s = (act, data) => steps.push({ ...base, act, actName: ACTS[act - 1].label, stride: 1, pad: 0, ...data });

    s(1, {
        kind: 'picture', out: empty(),
        explanation: `To a network a picture is a grid of numbers: ${n} × ${n} brightness values from 0 (dark) to 3 (bright). Nothing about it says "edge" or "line" — a convolution is how the network finds those.`,
    });
    s(1, {
        kind: 'kernel', out: empty(),
        explanation: `The kernel is a 3 × 3 grid of weights — here a ${kname.toLowerCase()} kernel, written by hand. Negative weights (orange) subtract what is under them and positive ones (blue) add. In a trained network these nine numbers are learned.`,
    });

    const firstTerms = windowTerms(img, kernel, 0, 0);
    s(2, {
        kind: 'products', pos: [0, 0], terms: firstTerms, out: empty(),
        explanation: 'Lay the kernel on the top-left corner. Each weight sits on one pixel; multiply each pair. This is the same multiply-then-add as a dot product, with the 3 × 3 patch and the kernel flattened into two lists of nine numbers.',
    });
    let out = empty();
    out[0][0] = full[0][0];
    s(2, {
        kind: 'sum', pos: [0, 0], terms: firstTerms, out: out.map(r => [...r]),
        explanation: `Add the nine products: ${describeSum(firstTerms)} = ${sgn(full[0][0])}. That single number is the first output: how strongly this corner of the picture matches the kernel's pattern.`,
    });

    // The rest of the first row, then the three most striking remaining windows.
    const visits = [];
    for (let j = 1; j < H; j++) visits.push([0, j]);
    const rest = [];
    for (let i = 1; i < H; i++) for (let j = 0; j < H; j++) rest.push([i, j]);
    rest.sort((a, b) => Math.abs(full[b[0]][b[1]]) - Math.abs(full[a[0]][a[1]]) || a[0] - b[0] || a[1] - b[1]);
    visits.push(...rest.slice(0, 3).sort((a, b) => a[0] - b[0] || a[1] - b[1]));
    for (const [i, j] of visits) {
        const terms = windowTerms(img, kernel, i, j);
        out = out.map(r => [...r]);
        out[i][j] = full[i][j];
        const v = full[i][j];
        const verdict = v === 0 ? 'zero: the pattern is not here at all' : Math.abs(v) >= 6 ? `${v > 0 ? 'a strong positive' : 'a strong negative'} response — the kernel's pattern${v < 0 ? ', reversed,' : ''} is right here` : `a ${v > 0 ? 'weak positive' : 'weak negative'} response`;
        s(3, {
            kind: 'slide', pos: [i, j], terms, out,
            explanation: `${j === 0 || i > 0 ? `Jump to row ${i + 1}, column ${j + 1}` : 'Slide one column right'}. Same nine weights, new pixels: ${describeSum(terms)} = ${sgn(v)} — ${verdict}.`,
        });
    }

    const flat = full.flat();
    const hi = Math.max(...flat), lo = Math.min(...flat);
    s(4, {
        kind: 'map', out: full,
        explanation: `Do it at every position and the outputs form a new ${H} × ${H} grid: the feature map. It is brightest (${sgn(hi)}) where the picture looks most like the kernel and most negative (${sgn(lo)}) where it looks like its opposite. The map is smaller than the picture because a 3 × 3 window fits in only ${H} places along each side: ${n} − 3 + 1 = ${H}.`,
    });

    const strided = convolve(img, kernel, 2, 0);
    s(5, {
        kind: 'stride', stride: 2, out: strided,
        explanation: `Stride is how far the window jumps. With stride 2 it skips every other position, so the map shrinks to ${strided.length} × ${strided.length}: ⌊(${n} − 3) / 2⌋ + 1 = ${strided.length}. Larger strides are a cheap way to shrink a picture — the next page's pooling is another.`,
    });

    const same = convolve(img, kernel, 1, 1);
    s(6, {
        kind: 'padding', pad: 1, out: same,
        explanation: `Padding adds a ring of zeros around the picture before sliding. With padding 1 the window can centre on every pixel, edges included, and the map keeps the picture's size: (${n} + 2 − 3) / 1 + 1 = ${same.length}. Without it, every layer would nibble a pixel off each side.`,
    });

    const positions = H * H;
    s(7, {
        kind: 'shared', out: full,
        explanation: `All ${positions} outputs came from the same 9 weights. A fully connected layer from these ${n * n} pixels to ${positions} outputs would need ${n * n} × ${positions} = ${(n * n * positions).toLocaleString('en-US')} weights, each learned separately. Sharing one kernel means an edge is detected the same way wherever it appears — and the picture can be any size.`,
    });
    return steps;
};

/* ── predict ───────────────────────────────────────────────
   Before each slide: what will the next window (drawn dashed) produce? The
   kernel and every pixel are on screen, so it can be worked out exactly.
   Neighbouring windows overlap, so their outputs are close — offer slips
   such as "add the pixels and ignore the weights" and "guess about what
   the last window gave" would let a reader score without multiplying.
   Instead the wrong answers are what the kernel really outputs at the
   windows around this one, with the previous window's answer always among
   them when it differs. The four are listed in ascending order, and the
   answer's rank comes from a hash of the position — chosen among the ranks
   that leave room for the previous answer on its side, or the previous
   answer would drop off the list and leave this one as the closest. */
const neighbourOutputs = (img, kernel, i, j) => {
    const H = outSize(img.length, K, 1, 0);
    const out = [];
    for (const [di, dj] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, 1], [-1, 1], [1, -1], [0, -2], [0, 2], [-2, 0], [2, 0]]) {
        const a = i + di, b = j + dj;
        if (a >= 0 && b >= 0 && a < H && b < H) out.push(sumTerms(windowTerms(img, kernel, a, b)));
    }
    return out;
};

// Chosen so the four shipped tours are balanced as well as random pictures (the suite prints both).
const PROMPT_SALT = 52;

const predictFor = (step, next) => {
    if (!next || next.kind !== 'slide') return null;
    const [i, j] = next.pos;
    const v = sumTerms(next.terms);
    const adjacent = step.pos && Math.abs(step.pos[0] - i) + Math.abs(step.pos[1] - j) === 1;
    const prev = adjacent ? sumTerms(step.terms) : null;
    const slips = [prev, ...neighbourOutputs(next.img, next.kernel, i, j), next.terms.reduce((a, t) => a + t.x, 0), -v].filter(x => x !== null);
    const h = slotOf(next.presetIndex, i, j, PROMPT_SALT);
    const slot = prev === null || prev === v ? h : prev < v ? 1 + (h % 3) : h % 3;
    const { options, correct } = rankedChoices(v, slips, { slot, step: 1, fmt: sgn });
    return {
        question: `The kernel moves to row ${i + 1}, column ${j + 1} (dashed outline). What will this window output?`,
        options,
        correct,
        because: `Multiply each pixel by the weight on top of it and add: ${describeSum(next.terms)} = ${sgn(v)}.`,
    };
};

/** The formula for the step on screen, with its live values. */
function formulaFor(step) {
    const n = step.n;
    if (step.kind === 'picture' || step.kind === 'kernel') return String.raw`y(i, j) = \sum_{a=0}^{2}\sum_{b=0}^{2} w(a, b)\; x(i + a,\, j + b)`;
    if (step.kind === 'products' || step.kind === 'sum' || step.kind === 'slide') {
        const [i, j] = step.pos;
        const shown = step.terms.filter(t => t.w !== 0);
        const body = shown.length ? shown.map(texTerm).join(' + ') : '0';
        const v = sumTerms(step.terms);
        return step.kind === 'products'
            ? String.raw`y(${i + 1}, ${j + 1}) = ${body} = \;?`
            : String.raw`y(${i + 1}, ${j + 1}) = ${body} = ${v}`;
    }
    if (step.kind === 'map') return String.raw`\text{output} = \left\lfloor \frac{n - k}{s} \right\rfloor + 1 = \left\lfloor \frac{${n} - 3}{1} \right\rfloor + 1 = ${outSize(n, 3, 1, 0)}`;
    if (step.kind === 'stride') return String.raw`\left\lfloor \frac{n + 2p - k}{s} \right\rfloor + 1 = \left\lfloor \frac{${n} + 0 - 3}{2} \right\rfloor + 1 = ${outSize(n, 3, 2, 0)}`;
    if (step.kind === 'padding') return String.raw`\left\lfloor \frac{n + 2p - k}{s} \right\rfloor + 1 = \left\lfloor \frac{${n} + 2 - 3}{1} \right\rfloor + 1 = ${outSize(n, 3, 1, 1)}`;
    const H = outSize(n, 3, 1, 0);
    return String.raw`\underbrace{3 \times 3}_{\text{kernel}} = 9 \text{ weights} \quad\text{vs}\quad \underbrace{${n * n} \times ${H * H}}_{\text{dense}} = ${n * n * H * H} \text{ weights}`;
}

/* ── quiz and code ──────────────────────────────────────── */

const quizQuestions = [
    {
        question: 'A 3×3 kernel slides over a 28×28 image with stride 1 and no padding. How big is the output?',
        options: ['28×28', '26×26', '25×25', '9×9'],
        correct: 1,
        explanation: 'A 3-wide window fits in 28 − 3 + 1 = 26 places along each side: ⌊(n + 2p − k) / s⌋ + 1 = ⌊(28 + 0 − 3) / 1⌋ + 1 = 26.',
    },
    {
        question: 'Why does a convolutional layer need so few weights compared with a fully connected one?',
        options: [
            'It only looks at the brightest pixels',
            'It uses the same small kernel at every position, so the weights are shared',
            'It rounds its weights to whole numbers',
            'It skips the bias term',
        ],
        correct: 1,
        explanation: 'One 3×3 kernel is 9 weights however large the image is. A dense layer gives every input–output pair its own weight, which for images runs into millions.',
    },
    {
        question: 'What does padding 1 do for a 3×3 kernel with stride 1?',
        options: [
            'Makes the kernel 4×4',
            'Doubles the output size',
            'Adds a ring of zeros so the output keeps the input’s size and edge pixels get their own windows',
            'Blurs the image before the convolution',
        ],
        correct: 2,
        explanation: 'With a ring of zeros the window can be centred on every pixel, edges included: ⌊(n + 2 − 3) / 1⌋ + 1 = n. That is why most CNN layers use padding 1 with 3×3 kernels.',
    },
];

const codeExample = `import torch
import torch.nn.functional as F

image = torch.tensor([[0, 0, 0, 2, 3, 0, 0],
                      [0, 0, 1, 3, 3, 0, 0],
                      [0, 0, 1, 3, 2, 0, 0],
                      [0, 0, 0, 3, 3, 1, 0],
                      [0, 0, 0, 2, 3, 1, 0],
                      [0, 0, 1, 3, 3, 0, 0],
                      [0, 0, 0, 3, 2, 0, 0]], dtype=torch.float32)
kernel = torch.tensor([[-1, 0, 1],
                       [-1, 0, 1],
                       [-1, 0, 1]], dtype=torch.float32)

# conv2d wants [batch, channels, height, width] and [out, in, kh, kw]
y = F.conv2d(image[None, None], kernel[None, None], stride=1, padding=0)
print(y.shape)        # torch.Size([1, 1, 5, 5])
print(y[0, 0, 0])     # tensor([ 2.,  8.,  6., -8., -8.]) - the tour's first row

# stride 2 and padding 1 change only the window positions, never the weights
print(F.conv2d(image[None, None], kernel[None, None], stride=2, padding=1).shape)
# torch.Size([1, 1, 4, 4])`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Step through the tour once more and try again.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-yellow-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── grids ──────────────────────────────────────────────── */

const MONO = 'var(--font-jetbrains-mono), monospace';

/**
 * A grid of numbers as cells. `kind` 'pixel' uses the sequential scale
 * (0–3 brightness); 'signed' the diverging one. `pad` draws that many outer
 * rings as padding; `win` outlines a window; `unseen` hatches pixels no
 * window covers.
 */
function CellGrid({ grid, kind = 'pixel', pad = 0, win = null, wins = null, ghost = null, unseen = null, selected = null, onCell, cell = 34, max, label, ariaLabel }) {
    const R = grid.length, C = R ? grid[0].length : 0;
    const vals = grid.flat().filter(v => v !== null);
    const m = max ?? Math.max(1, ...vals.map(Math.abs));
    const W = C * cell, H = R * cell;
    const fill = (v) => (kind === 'pixel' ? sequential(v / 3) : diverging(v / m));
    const ink = (v) => (kind === 'pixel' ? inkOn(v / 3) : inkOn(v / m, 'diverging'));
    return (
        <div className="min-w-0">
            {label && <div className="text-xs text-slate-400 mb-1.5 flex flex-wrap items-center gap-2">{label}</div>}
            <svg viewBox={`-2 -2 ${W + 4} ${H + 4}`} style={{ width: '100%', maxWidth: W + 4 }} role={onCell ? 'grid' : 'img'} aria-label={ariaLabel} className="block select-none">
                <defs>
                    <pattern id="conv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="6" height="6" fill="#0b1120" />
                        <line x1="0" y1="0" x2="0" y2="6" stroke="#7f1d1d" strokeWidth="2" />
                    </pattern>
                </defs>
                {grid.map((row, i) => row.map((v, j) => {
                    const isPad = i < pad || j < pad || i >= R - pad || j >= C - pad;
                    const hidden = unseen && !isPad && unseen[i - pad]?.[j - pad] === false;
                    const isSel = selected && selected[0] === i && selected[1] === j;
                    return (
                        <g key={`${i}-${j}`} onClick={onCell ? () => onCell(i, j) : undefined} style={onCell ? { cursor: 'pointer' } : undefined}>
                            <rect x={j * cell + 1} y={i * cell + 1} width={cell - 2} height={cell - 2} rx="3"
                                fill={v === null ? '#0f172a' : hidden ? 'url(#conv-hatch)' : isPad ? '#111827' : fill(v)}
                                stroke={isPad ? '#334155' : isSel ? '#f8fafc' : 'none'} strokeDasharray={isPad ? '3 3' : undefined} strokeWidth={isSel ? 2 : 1} />
                            {v !== null && (
                                <text x={j * cell + cell / 2} y={i * cell + cell / 2 + 4} fontSize={cell >= 30 ? 12 : 10} textAnchor="middle"
                                    fill={isPad ? '#64748b' : hidden ? '#fca5a5' : ink(v)} fontFamily={MONO} pointerEvents="none">{sgn(v)}</text>
                            )}
                        </g>
                    );
                }))}
                {(wins ?? (win ? [win] : [])).map(([r, c], k) => (
                    <rect key={k} x={c * cell} y={r * cell} width={K * cell} height={K * cell} rx="4" fill="none"
                        stroke={k === 0 || !wins ? '#fde047' : '#a16207'} strokeWidth={k === 0 || !wins ? 3 : 1.5} pointerEvents="none"
                        style={{ transition: 'x 0.35s ease, y 0.35s ease' }} />
                ))}
                {ghost && (
                    <rect x={ghost[1] * cell} y={ghost[0] * cell} width={K * cell} height={K * cell} rx="4" fill="none"
                        stroke="#fde047" strokeWidth="2" strokeDasharray="5 4" pointerEvents="none" />
                )}
            </svg>
        </div>
    );
}

function KernelGrid({ kernel, cell = 34 }) {
    return <CellGrid grid={kernel} kind="signed" cell={cell} max={Math.max(1, ...kernel.flat().map(Math.abs))} ariaLabel="The 3 by 3 kernel" />;
}

/** The nine products of one window, laid out as the window is. */
function Products({ terms, reveal = true }) {
    const total = sumTerms(terms);
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1 w-fit font-mono text-xs">
                {terms.map((t, k) => (
                    <span key={k} className={`px-2 py-1 rounded border text-center tabular-nums ${t.w === 0 || t.x === 0 ? 'border-slate-800 text-slate-500' : t.x * t.w > 0 ? 'border-sky-700 text-sky-200 bg-sky-500/10' : 'border-orange-700 text-orange-200 bg-orange-500/10'}`}>
                        {t.x}×{par(t.w)} = {sgn(t.x * t.w)}
                    </span>
                ))}
            </div>
            {reveal && <div className="text-sm text-slate-300 font-mono">sum = <span className="text-yellow-200 font-semibold">{sgn(total)}</span></div>}
        </div>
    );
}

/** The step's picture. */
function VisualizationPanel({ step, ghost = null }) {
    const { img, kernel, n, out } = step;
    const xp = padded(img, step.pad);
    const H = out.length;
    const win = step.pos ? [step.pos[0] * step.stride, step.pos[1] * step.stride] : null;
    const allWins = step.kind === 'stride' || step.kind === 'padding'
        ? Array.from({ length: H * H }, (_, q) => [Math.floor(q / H) * step.stride, (q % H) * step.stride])
        : null;
    return (
        <div className="space-y-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.3fr)_auto_minmax(0,1fr)] gap-4 items-start">
                <CellGrid grid={xp} pad={step.pad} win={win} wins={allWins} ghost={ghost}
                    cell={xp.length > 8 ? 28 : 34}
                    label={<>picture{step.pad ? ` with padding ${step.pad}` : ''} <ShapeTag names={['H', 'W']} shape={[xp.length, xp.length]} /></>}
                    ariaLabel="The input picture" />
                <div className={step.kind === 'picture' ? 'opacity-30' : ''}>
                    <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-2">kernel <ShapeTag shape={[3, 3]} /></div>
                    <KernelGrid kernel={kernel} cell={30} />
                </div>
                <CellGrid grid={out} kind="signed" cell={H > 5 ? 28 : 34}
                    max={Math.max(1, ...convolve(img, kernel, 1, 0).flat().map(Math.abs))}
                    selected={step.pos && step.kind !== 'products' ? step.pos : null}
                    label={<>feature map <ShapeTag names={['H′', 'W′']} shape={[H, H]} /></>}
                    ariaLabel="The output feature map" />
            </div>
            {step.terms && <Products terms={step.terms} reveal={step.kind !== 'products'} />}
        </div>
    );
}

/* ── explore ────────────────────────────────────────────── */

const clone = (g) => g.map(r => [...r]);

function Explore({ initial }) {
    const [img, setImg] = useState(() => clone(initial.img));
    const [kernel, setKernel] = useState(() => clone(initial.kernel));
    const [stride, setStride] = useState(1);
    const [pad, setPad] = useState(0);
    const [sel, setSel] = useState([0, 0]);

    const n = img.length;
    const out = convolve(img, kernel, stride, pad);
    const H = out.length;
    const i = Math.min(sel[0], H - 1), j = Math.min(sel[1], H - 1);
    const xp = padded(img, pad);
    const terms = H ? windowTerms(xp, kernel, i * stride, j * stride) : [];
    const seen = coverage(n, n, stride, pad);
    const unseenCount = seen.flat().filter(x => !x).length;
    const paint = (r, c) => {
        if (r < pad || c < pad || r >= n + pad || c >= n + pad) return;
        setImg(g => g.map((row, a) => row.map((v, b) => (a === r - pad && b === c - pad ? (v + 1) % 4 : v))));
    };
    const repair = () => { setStride(1); setPad(0); };

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4 items-start">
                    <CellGrid grid={xp} pad={pad} win={H ? [i * stride, j * stride] : null} unseen={seen} onCell={paint}
                        cell={xp.length > 8 ? 28 : 34}
                        label={<>picture — click a pixel to change it <ShapeTag names={['H', 'W']} shape={[xp.length, xp.length]} /></>}
                        ariaLabel="The picture; click a pixel to cycle its brightness" />
                    <CellGrid grid={H ? out : [[null]]} kind="signed" selected={[i, j]} onCell={(r, c) => setSel([r, c])} cell={H > 6 ? 26 : 34}
                        label={<>feature map — click a cell <ShapeTag names={['H′', 'W′']} shape={[H, H]} /></>}
                        ariaLabel="The feature map; click a cell to see its arithmetic" />
                </div>
                {H > 0 && (
                    <div className="space-y-2">
                        <Products terms={terms} />
                        <div className="text-slate-100 text-sm"><Tex block>{String.raw`y(${i + 1}, ${j + 1}) = ${terms.filter(t => t.w !== 0).map(texTerm).join(' + ') || '0'} = ${sumTerms(terms)}`}</Tex></div>
                    </div>
                )}
                <div className="flex flex-wrap gap-1.5 text-xs">
                    {Object.entries(PICTURES).map(([key, g]) => (
                        <button key={key} onClick={() => setImg(clone(g))} className="px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-yellow-500">Picture: {key}</button>
                    ))}
                    <button onClick={() => setImg(Array.from({ length: n }, () => Array(n).fill(0)))} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-yellow-500"><Eraser className="h-3.5 w-3.5" />Clear</button>
                </div>
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-6 items-start">
                    <div>
                        <div className="text-sm font-medium text-slate-300 mb-2">Kernel (type to edit)</div>
                        <MatrixInput value={kernel} onChange={setKernel} step={1} digits={0} min={-9} max={9} />
                        <div className="flex flex-wrap gap-1.5 mt-2 max-w-[16rem]">
                            {Object.entries(KERNELS).map(([key, { name, k }]) => (
                                <button key={key} onClick={() => setKernel(clone(k))} className="text-[11px] px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:border-yellow-500">{name}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <ParamSlider label="Stride s" value={stride} onChange={setStride} min={1} max={4} step={1} accent="yellow" />
                        <ParamSlider label="Padding p" value={pad} onChange={setPad} min={0} max={2} step={1} accent="yellow" />
                        <div className="text-slate-100 text-sm">
                            <Tex block>{String.raw`\left\lfloor \frac{n + 2p - k}{s} \right\rfloor + 1 = \left\lfloor \frac{${n} + ${2 * pad} - 3}{${stride}} \right\rfloor + 1 = ${H}`}</Tex>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => { setStride(4); setPad(0); }} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-yellow-500">Break it: stride 4, bigger than the kernel</button>
                            <button onClick={repair} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-300 hover:border-emerald-500"><Wrench className="h-3.5 w-3.5" />Repair</button>
                        </div>
                    </div>
                </div>
                {unseenCount > 0 && (
                    <BreakNote>
                        With stride {stride} the window jumps further than it is wide, so {unseenCount} of the {n * n} pixels (hatched red) are never under any window. Whatever is drawn there cannot change the output at all — paint one and watch the feature map stay the same.
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────── */

export default function ConvolutionPage() {
    const [mode, setMode] = useState('guided');
    const [presetIndex, setPresetIndex] = useState(0);
    const stepHistory = useMemo(() => generateSteps(presetIndex), [presetIndex]);
    const play = useStepPlayback(stepHistory, 1500);
    const step = play.step;
    const predict = usePredict(stepHistory, play.current, predictFor, play.pause);
    const [explore, setExplore] = useState({ key: 0, img: PICTURES.bar, kernel: KERNELS.vertical.k });
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const toExplore = useCallback(() => {
        const p = PRESETS[presetIndex];
        setExplore(e => ({ key: e.key + 1, img: PICTURES[p.picture], kernel: KERNELS[p.kernel].k }));
        setMode('explore');
        play.pause();
    }, [presetIndex, play]);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/deep-learning-architectures" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Deep Learning Architectures
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Convolution</h1>
                    <p className="text-yellow-50 max-w-3xl">
                        A sliding dot product: the same nine weights laid over every patch of the picture in turn. Watch each multiply-add, then edit the kernel, stride and padding yourself.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        {[['Dot Product', '/vectors/dot-product'], ['Forward Pass', '/neural-networks/forward-pass']].map(([name, href]) => (
                            <Link key={href} href={href} className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">{name}</Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]]} mode={mode}
                            setMode={(m) => (m === 'explore' ? toExplore() : setMode(m))} accent="yellow" />
                        <SourceChip kind="illustrative">Hand-made 7×7 pictures and classic kernels · every sum computed live</SourceChip>
                    </div>

                    {mode === 'explore' ? (
                        <Explore key={explore.key} initial={explore} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Example:</span>
                                {PRESETS.map((p, k) => (
                                    <button key={p.label} onClick={() => { setPresetIndex(k); play.pause(); }} aria-pressed={presetIndex === k}
                                        className={`text-xs px-2.5 py-1 rounded-lg border ${presetIndex === k ? 'border-yellow-400 bg-yellow-500/15 text-yellow-100' : 'border-slate-700 text-slate-400 hover:border-yellow-500'}`}>{p.label}</button>
                                ))}
                            </div>
                            <TourPlayer acts={ACTS} steps={stepHistory} play={play} predict={predict} accent="yellow" minHeight="min-h-[360px]">
                                <VisualizationPanel step={step} ghost={predict.pending ? stepHistory[play.current + 1]?.pos ?? null : null} />
                            </TourPlayer>
                            {predict.prompt && <PredictPrompt predict={predict} accent="yellow" />}
                            <ExplanationBox text={step.explanation} predict={predict} accent="yellow" />
                            <FormulaPanel><Tex block>{formulaFor(step)}</Tex></FormulaPanel>
                        </>
                    )}

                    <InCode title="Convolution in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="One convolution, three knobs" icon={Grid3x3}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-slate-200 font-semibold">Kernel k</span> — the weights, the pattern being looked for.</li>
                            <li><span className="text-slate-200 font-semibold">Stride s</span> — how far the window jumps each time.</li>
                            <li><span className="text-slate-200 font-semibold">Padding p</span> — rings of zeros around the picture.</li>
                        </ul>
                        <p className="text-xs text-slate-500 mt-3">Output side = ⌊(n + 2p − k) / s⌋ + 1.</p>
                    </Card>

                    <Misconception claim="A convolution layer learns a separate weight for every pixel.">
                        <p>It learns one small kernel and reuses it everywhere. The first layer of the digit-reading CNN on the next pages has 8 kernels of 3 × 3 plus 8 biases — 80 numbers — applied at all 784 positions of a 28 × 28 image.</p>
                        <p>A fully connected layer producing the same 8 × 28 × 28 outputs would need 784 × 6,272 + 6,272 = 4,923,520 weights.</p>
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
