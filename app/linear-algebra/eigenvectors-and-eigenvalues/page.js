"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Vector, Segment, Point, MATH_COLORS, usePlane } from '@/components/math/Plane2D';
import MatrixInput from '@/components/math/MatrixInput';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   2×2 matrices as rows. An eigenvector stays on its own line through the
   origin: Av = λv. */
const EPS = 1e-9;
const apply = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
const dot = (u, v) => u[0] * v[0] + u[1] * v[1];
const cross2 = (u, v) => u[0] * v[1] - u[1] * v[0];
const norm = (u) => Math.hypot(u[0], u[1]);
const unit = (u) => { const L = norm(u); return L < EPS ? [0, 0] : [u[0] / L, u[1] / L]; };
const atAngle = (deg) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)].map(x => (Math.abs(x) < 1e-12 ? 0 : x));
/** v lies on its own line after A: Av is parallel to v. */
const staysOnLine = (M, v) => Math.abs(cross2(v, apply(M, v))) < 1e-9 * Math.max(1, norm(apply(M, v)));

/** Real eigenpairs of a 2×2 matrix, from the characteristic equation λ² − (tr)λ + det = 0. */
const eigen2 = (M) => {
    const [[a, b], [c, d]] = M;
    const tr = a + d, det = a * d - b * c;
    const disc = tr * tr - 4 * det;
    if (disc < -1e-12) return { tr, det, disc, pairs: [] };
    const root = Math.sqrt(Math.max(disc, 0));
    const lambdas = root < 1e-12 ? [tr / 2] : [(tr + root) / 2, (tr - root) / 2];
    const pairs = [];
    for (const lam of lambdas) {
        if (Math.abs(b) < EPS && Math.abs(c) < EPS && Math.abs(a - d) < EPS) {
            // λI: every direction is an eigenvector; report the axes
            pairs.push({ lambda: lam, v: [1, 0] }, { lambda: lam, v: [0, 1] });
            continue;
        }
        let v;
        if (Math.abs(b) > EPS) v = [b, lam - a];
        else if (Math.abs(c) > EPS) v = [lam - d, c];
        else v = Math.abs(lam - a) < Math.abs(lam - d) ? [1, 0] : [0, 1];
        pairs.push({ lambda: lam, v: unit(v) });
    }
    return { tr, det, disc, pairs };
};

/** k rounds of power iteration from v0: multiply by A, rescale to length 1. */
const powerIterate = (M, v0, k) => {
    const out = [];
    let v = unit(v0);
    for (let i = 0; i < k; i++) {
        v = unit(apply(M, v));
        out.push({ v, estimate: dot(v, apply(M, v)) });
    }
    return out;
};

const fmt = (x) => texNum(x, 2);
/** For plain text — explanations, options, labels — with a true minus sign. */
const num = (x) => fmt(x).replace('-', '−');
const pair = ([x, y]) => `(${num(x)}, ${num(y)})`;
const rowsText = (M) => `[${M.map(r => `(${r.map(num).join(', ')})`).join(', ')}]`;
const deg = (x) => `${texNum(x, 1)}°`;
const angleOf = (v) => { let t = (Math.atan2(v[1], v[0]) * 180) / Math.PI; if (t < 0) t += 180; if (t >= 180) t -= 180; return t; };

const SYMMETRIC = [[2, 1], [1, 2]];
const TRIANGULAR = [[2, 0], [1, -1]];
const ROTATION = [[0, -1], [1, 0]];
const SHEAR = [[1.5, 1], [0, 1.5]];
const POWER_A = [[2, 0.5], [1, 1.5]];
const POWER_B = [[-2, 1], [0, 1]];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let prompt = 0;
    const push = (s) => steps.push({ show: [], ...s });
    const nextSlot = () => (prompt++ * 3 + 1) % 4;
    const sweep = (M, theta) => {
        const v = atAngle(theta), Av = apply(M, v);
        const off = Math.abs(angleOf(Av) - angleOf(v));
        push({ kind: 'sweep', M, v, show: ['image'],
            explanation: norm(Av) < EPS ? `θ = ${deg(theta)}: A sends v to 0.` : `θ = ${deg(theta)}: Av is knocked ${deg(Math.min(off, 180 - off))} off v's line. Not an eigenvector.` });
    };
    const eig = (M, theta, lambda) => {
        const v = atAngle(theta);
        push({ kind: 'eig-intro', M, v, lambda, show: ['image'], slot: nextSlot(),
            explanation: `θ = ${deg(theta)}: v = ${pair(v)}. This one will land back on its own line. By what factor λ does A stretch it?` });
        push({ kind: 'eig', M, v, lambda, show: ['image', 'lines'],
            explanation: `Av = ${pair(apply(M, v))} = ${num(lambda)}·v. An eigenvector, with eigenvalue λ = ${num(lambda)}: A only ${lambda < 0 ? 'flips and stretches it — it points the opposite way along the same line' : Math.abs(lambda) > 1 ? 'stretches it' : Math.abs(lambda) < 1 ? 'shrinks it' : 'leaves it exactly where it was'}.` });
    };
    const evec = (M, correct, wrongs, note) => {
        push({ kind: 'evec-intro', M, v: [1, 0], candidates: wrongs, answer: correct, show: [], slot: nextSlot(),
            explanation: `A = ${rowsText(M)} (rows). Which of these directions does A keep on its own line?` });
        push({ kind: 'evec', M, v: unit(correct), show: ['image', 'lines'],
            explanation: `A${pair(correct)} = ${pair(apply(M, correct))}, a multiple of ${pair(correct)}: an eigenvector. ${note}` });
    };
    const power = (M, v0, intro) => {
        push({ kind: 'power-intro', M, v: unit(v0), show: ['image'], slot: nextSlot(), explanation: intro });
        const run = powerIterate(M, v0, 6);
        run.forEach(({ v, estimate }, i) => push({ kind: 'power', M, v, estimate, iteration: i + 1, show: ['image', ...(i === run.length - 1 ? ['lines'] : [])],
            explanation: `Round ${i + 1}: v ← Av / |Av| = ${pair(v)}. The estimate v · Av = ${num(estimate)}.${i === run.length - 1 ? ' It has settled on the dominant eigenvector, and the estimate on its eigenvalue.' : ''}` }));
    };

    // Act 1: a symmetric matrix, two perpendicular eigen-directions
    push({ kind: 'opening', M: SYMMETRIC, v: [1, 0], show: ['image'],
        explanation: 'A = [(2, 1), (1, 2)] (rows). Put v on the unit circle and look at Av. The faint ellipse is where every unit vector lands. Most vectors get knocked off their own line — sweep v around and watch for the ones that are not.' });
    sweep(SYMMETRIC, 22.5);
    eig(SYMMETRIC, 45, 3);
    [67.5, 90, 112.5].forEach(t => sweep(SYMMETRIC, t));
    eig(SYMMETRIC, 135, 1);
    sweep(SYMMETRIC, 157.5);
    push({ kind: 'lines', M: SYMMETRIC, v: atAngle(45), show: ['image', 'lines'],
        explanation: 'Only two lines survive: along (1, 1) A stretches by 3, along (1, −1) by 1. They are the ellipse\'s long and short axes — for a symmetric matrix the eigenvectors are always perpendicular.' });

    // Act 2: a negative eigenvalue
    push({ kind: 'opening', M: TRIANGULAR, v: [1, 0], show: ['image'],
        explanation: 'A new matrix, A = [(2, 0), (1, −1)]. Its eigenvectors need not be perpendicular, and an eigenvalue can be negative.' });
    evec(TRIANGULAR, [3, 1], [[1, 0], [1, 1], [1, 3], [0, 1], [-1, 2]], 'Its eigenvalue is 2.');
    sweep(TRIANGULAR, 0);
    eig(TRIANGULAR, angleOf([3, 1]), 2);
    [45, 67.5].forEach(t => sweep(TRIANGULAR, t));
    eig(TRIANGULAR, 90, -1);
    sweep(TRIANGULAR, 135);
    push({ kind: 'lines', M: TRIANGULAR, v: atAngle(90), show: ['image', 'lines'],
        explanation: 'Two eigen-directions again, (3, 1) with λ = 2 and (0, 1) with λ = −1 — not at right angles this time. A negative λ means the vector is flipped, but stays on its line.' });

    // Act 3: a rotation has none
    push({ kind: 'opening', M: ROTATION, v: [1, 0], show: ['image'],
        explanation: 'A quarter turn, A = [(0, −1), (1, 0)]. Every vector is turned 90° — so can any stay on its own line?' });
    [0, 45, 90, 135].forEach(t => sweep(ROTATION, t));
    push({ kind: 'none', M: ROTATION, v: atAngle(45), show: ['image'],
        explanation: 'None does: every v is turned a quarter turn off its line. The characteristic equation λ² + 1 = 0 has no real solution. A rotation has no real eigenvectors (its eigenvalues are the complex numbers ±i).' });

    // Act 4: a shear has just one direction
    push({ kind: 'opening', M: SHEAR, v: [1, 0], show: ['image'],
        explanation: 'A = [(1.5, 1), (0, 1.5)]: a stretch by 1.5 plus a shear. Its characteristic equation (λ − 1.5)² = 0 has one repeated root.' });
    eig(SHEAR, 0, 1.5);
    [45, 90, 135].forEach(t => sweep(SHEAR, t));
    push({ kind: 'lines', M: SHEAR, v: atAngle(0), show: ['image', 'lines'],
        explanation: 'A repeated eigenvalue, yet only one eigen-direction: the x-axis. The shear drags every other vector sideways. Such a matrix cannot be diagonalised.' });

    // Act 5 and 6: power iteration
    push({ kind: 'opening', M: POWER_A, v: [0, 1], show: ['image'],
        explanation: 'Real matrices are too big to sweep by hand. Power iteration finds the dominant eigenvector — the one with the largest |λ| — by multiplying by A again and again. A = [(2, 0.5), (1, 1.5)].' });
    evec(POWER_A, [1, -2], [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], 'Its eigenvalue is 1. The other eigenvector, (1, 1), has eigenvalue 2.5.');
    power(POWER_A, [0, 1], 'Start from v = (0, 1) and repeat: multiply by A, then rescale to length 1. Which eigenvalue will the estimate v · Av settle on?');
    power(POWER_B, [1, 1], 'Now A = [(−2, 1), (0, 1)], starting from (1, 1). Its eigenvalues are −2 and 1. Which will power iteration find?');
    push({ kind: 'closing', M: SYMMETRIC, v: atAngle(45), show: ['image', 'lines'],
        explanation: 'Av = λv: eigenvectors keep their line, and λ is the stretch. Switch to Explore — drag v around the circle, or drag the columns of A, and watch for the moment Av lines up.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   "What is λ?" offers the other eigenvalue, the reciprocal and the wrong
   sign. "Which is an eigenvector?" offers three directions A does knock off
   their line. "Which eigenvalue will power iteration find?" offers the
   smaller one, the size of the dominant one without its sign, and the trace.
   Every correct answer in the tour is different, so no label is right twice. */
const pickWrong = (correct, candidates, label) => {
    const seen = new Set([label(correct)]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (!c || seen.has(label(c))) continue;
        seen.add(label(c));
        wrong.push(c);
    }
    return wrong;
};

const predictFor = (step) => {
    if (!step) return null;
    const { M } = step;
    const { tr, det, pairs } = eigen2(M);
    if (step.kind === 'eig-intro') {
        const lam = step.lambda;
        const other = pairs.map(p => p.lambda).find(l => Math.abs(l - lam) > 1e-9);
        const ordered = pickWrong(lam, [other, -lam, Math.abs(lam) > EPS ? 1 / lam : null, lam + 1, tr, det], num);
        ordered.splice(step.slot, 0, lam);
        return {
            question: `A = ${rowsText(M)}, v = ${pair(step.v)} stays on its line. What is λ?`,
            options: ordered.map(num),
            correct: step.slot,
            because: `Av = ${pair(apply(M, step.v))}, which is ${num(lam)} times v.`,
        };
    }
    if (step.kind === 'evec-intro') {
        const wrong = [];
        for (const c of step.candidates) {
            if (wrong.length === 3) break;
            if (!staysOnLine(M, c)) wrong.push(c);
        }
        wrong.splice(step.slot, 0, step.answer);
        return {
            question: `A = ${rowsText(M)}. Which of these is an eigenvector of A?`,
            options: wrong.map(pair),
            correct: step.slot,
            because: `A${pair(step.answer)} = ${pair(apply(M, step.answer))}: a multiple of ${pair(step.answer)}. The others come out pointing in new directions.`,
        };
    }
    if (step.kind === 'power-intro') {
        const dominant = pairs.reduce((best, p) => (Math.abs(p.lambda) > Math.abs(best.lambda) ? p : best)).lambda;
        const other = pairs.map(p => p.lambda).find(l => Math.abs(l - dominant) > 1e-9);
        const ordered = pickWrong(dominant, [other, Math.abs(dominant), -dominant, tr, det, dominant + 1], num);
        ordered.splice(step.slot, 0, dominant);
        return {
            question: `A = ${rowsText(M)}. Power iteration's estimate will settle on which eigenvalue?`,
            options: ordered.map(num),
            correct: step.slot,
            because: `Each multiplication scales the λ = ${num(dominant)} part by ${num(Math.abs(dominant))} and the other by only ${num(Math.abs(other))}, so the dominant direction wins — sign included.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'Av = 3v for some non-zero v. What does A do to v?',
        options: ['Rotates it by 3 radians', 'Stretches it to 3 times its length, on the same line', 'Adds 3 to each component', 'Nothing'],
        correct: 1,
        explanation: 'That is exactly what an eigenvector with eigenvalue 3 means: A keeps v on its own line through the origin and only scales it, here by 3.',
    },
    {
        question: 'Why does a 90° rotation of the plane have no real eigenvectors?',
        options: [
            'Because its determinant is 0',
            'Because it has no inverse',
            'Because it turns every non-zero vector off its own line',
            'Because it doubles every length',
        ],
        correct: 2,
        explanation: 'An eigenvector must stay on its own line. A quarter turn moves every direction to the perpendicular one, so none qualifies; λ² + 1 = 0 has no real roots.',
    },
    {
        question: 'A has eigenvalues 0.5 and −3. Repeated multiplication by A (power iteration) settles on the eigenvector for which?',
        options: ['0.5', '3', 'Neither — it never settles', '−3'],
        correct: 3,
        explanation: 'Each round multiplies the −3 component by 3 in size and the 0.5 component by 0.5, so the −3 direction takes over. The estimate tends to −3 itself: the vector flips each round, but stays on the line.',
    },
];

const codeExample = `import numpy as np

A = np.array([[2, 1],
              [1, 2]], dtype=float)
lams, vecs = np.linalg.eig(A)
print(lams)                     # [3. 1.]
for lam, v in zip(lams, vecs.T):
    print(np.allclose(A @ v, lam * v))   # True, True -- Av = lambda v

# Power iteration: multiply, rescale, repeat
B = np.array([[2, 0.5],
              [1, 1.5]])
v = np.array([0.0, 1.0])
for _ in range(20):
    v = B @ v
    v /= np.linalg.norm(v)
print(v, v @ B @ v)             # ~[0.707 0.707], ~2.5 -- the dominant pair

print(np.linalg.eig(np.array([[0, -1], [1, 0]]))[0])   # [0.+1.j 0.-1.j] -- a rotation`;

/* ── page ──────────────────────────────────────────────── */

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
                    className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-violet-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/** A closed curve: the unit circle, or its image under A. */
function Loop({ M = [[1, 0], [0, 1]], color, width = 1.5, dashed = false, opacity = 1 }) {
    const { toScreen } = usePlane();
    const pts = [];
    for (let i = 0; i < 120; i++) {
        const t = (2 * Math.PI * i) / 120;
        pts.push(toScreen(apply(M, [Math.cos(t), Math.sin(t)])).map(x => x.toFixed(2)).join(','));
    }
    return <polygon points={pts.join(' ')} fill="none" stroke={color} strokeWidth={width} opacity={opacity} strokeDasharray={dashed ? '5 4' : undefined} />;
}

const EIGEN_COLORS = ['#34d399', '#fbbf24'];

export default function EigenvectorsAndEigenvaluesPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1300);
    const [A, setA] = useState(SYMMETRIC);
    const [theta, setTheta] = useState(30);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[currentStep];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const guided = mode === 'guided';
    const M = guided ? step.M : A;
    const info = useMemo(() => eigen2(M), [M]);
    /* Explore moves v in whole degrees, which can miss an eigen-direction such
       as 18.43°; within a degree of one, v snaps onto it exactly. */
    const v = useMemo(() => {
        const rawV = guided ? step.v : atAngle(theta);
        const near = guided ? null : info.pairs.find(p => Math.abs(cross2(rawV, p.v)) < Math.sin(Math.PI / 180));
        return near ? (dot(rawV, near.v) >= 0 ? near.v : [-near.v[0], -near.v[1]]) : rawV;
    }, [guided, step, theta, info]);
    const show = guided ? step.show : ['image', 'lines'];
    const has = (k) => show.includes(k);
    const Av = apply(M, v);
    const aligned = staysOnLine(M, v) && norm(Av) > EPS;
    const lam = aligned ? dot(Av, v) / dot(v, v) : null;
    // While a λ question is open, Av would give the answer away.
    const hideAv = guided && (step.kind === 'eig-intro' || step.kind === 'evec-intro');
    const hideNumbers = guided && predict.hideExplanation;

    const takeOver = () => {
        if (guided) {
            setA(step.M.map(r => [...r]));
            setTheta(Math.round(((Math.atan2(step.v[1], step.v[0]) * 180) / Math.PI + 360) % 360));
            setMode('explore'); setIsPlaying(false);
        }
    };
    const dragV = (p) => { takeOver(); const t = (Math.atan2(p[1], p[0]) * 180) / Math.PI; setTheta(Math.round((t + 360) % 360)); };
    const onCircle = useCallback((p) => unit(norm(p) < EPS ? [1, 0] : p), []);
    const dragCol = (j) => (p) => { takeOver(); setA(m => m.map((r, i) => r.map((x, k) => (k === j ? p[i] : x)))); };

    const charTex = useMemo(() => {
        const roots = info.pairs.length === 0 ? String.raw`\text{no real roots}`
            : [...new Set(info.pairs.map(p => fmt(p.lambda)))].map(l => String.raw`\lambda = ${l}`).join(', \\; ');
        return String.raw`\det(A - \lambda I) = \lambda^2 - (${fmt(info.tr)})\lambda + (${fmt(info.det)}) = 0 \;\Rightarrow\; ${roots}`;
    }, [info]);
    const avTex = useMemo(() => String.raw`A\mathbf{v} = \begin{bmatrix} ${fmt(M[0][0])} & ${fmt(M[0][1])} \\ ${fmt(M[1][0])} & ${fmt(M[1][1])} \end{bmatrix}\begin{bmatrix} ${fmt(v[0])} \\ ${fmt(v[1])} \end{bmatrix} = \begin{bmatrix} ${fmt(Av[0])} \\ ${fmt(Av[1])} \end{bmatrix}${aligned ? String.raw` = ${fmt(lam)}\,\mathbf{v}` : ''}`, [M, v, Av, aligned, lam]);

    const exploreNote = aligned
        ? `Lined up: Av = ${num(lam)}·v. This v is an eigenvector with eigenvalue ${num(lam)}.`
        : info.pairs.length === 0
            ? 'This matrix turns every direction off its line — no real eigenvectors. Try a rotation-free matrix.'
            : `Av is off v's line. Drag v toward one of the dashed eigen-line${info.pairs.length > 1 ? 's' : ''} (λ = ${[...new Set(info.pairs.map(p => num(p.lambda)))].join(', ')}) and watch it line up.`;

    const lineFar = 9;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/linear-algebra" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Linear Algebra
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Eigenvectors and Eigenvalues</h1>
                    <p className="text-violet-100 max-w-3xl">
                        Most vectors get knocked off their line when a matrix acts. Eigenvectors do not: Av = λv. Sweep a vector around the circle and catch the moments it lines up.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                                {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={mode === key}
                                        onClick={() => { if (key === 'explore' && guided) takeOver(); else { setMode(key); setIsPlaying(false); } }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag v around the circle, or drag the columns of A'}
                            </span>
                        </div>

                        <Plane2D xRange={[-3.5, 3.5]} yRange={[-3.5, 3.5]} grid={0.5} ariaLabel="A unit vector v, its image Av, and the matrix's eigen-lines">
                            {has('lines') && info.pairs.map((p, i) => (
                                <Segment key={i} from={[-lineFar * p.v[0], -lineFar * p.v[1]]} to={[lineFar * p.v[0], lineFar * p.v[1]]}
                                    color={EIGEN_COLORS[i % 2]} width={1.5} dashed opacity={0.8} />
                            ))}
                            <Loop color="#64748b" width={1.2} />
                            {has('image') && <Loop M={M} color="#8b5cf6" width={1.2} dashed opacity={0.7} />}
                            {!guided && (
                                <>
                                    <Vector to={[M[0][0], M[1][0]]} color={MATH_COLORS.i} width={1.5} dashed opacity={0.6} label="î′" onDrag={dragCol(0)} snap={0.25} />
                                    <Vector to={[M[0][1], M[1][1]]} color={MATH_COLORS.j} width={1.5} dashed opacity={0.6} label="ĵ′" onDrag={dragCol(1)} snap={0.25} />
                                </>
                            )}
                            {!hideAv && <Vector to={Av} color={aligned ? '#34d399' : MATH_COLORS.result} width={3.5} label={aligned ? `Av = ${num(lam)}v` : 'Av'} />}
                            <Vector to={v} color={aligned && !hideAv ? '#34d399' : MATH_COLORS.a} width={3} label="v" onDrag={dragV} constrain={onCircle}
                                ariaLabel={`Drag v around the unit circle, now at angle ${Math.round(angleOf(v))} degrees`} />
                            {aligned && !hideAv && <Point at={v} color="#34d399" r={5} />}
                        </Plane2D>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="violet" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-violet-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-3">
                                <ParamSlider label="θ, the direction of v" value={theta} onChange={setTheta} min={0} max={359} step={1} accent="violet" format={(x) => `${x}°`} />
                                <div className="flex flex-wrap items-center gap-2">
                                    {[['Symmetric', SYMMETRIC], ['Negative λ', TRIANGULAR], ['Rotation', ROTATION], ['Shear', SHEAR]].map(([name, P]) => (
                                        <button key={name} onClick={() => setA(P.map(r => [...r]))}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-500">{name}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="violet" />}

                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-violet-400 mt-0.5 flex-shrink-0" />
                            <p className="text-violet-200 text-sm leading-relaxed">
                                {guided ? (predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation) : exploreNote}
                            </p>
                        </div>
                    </div>

                    {hideNumbers ? (
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-sm text-slate-500">
                            The numbers are hidden until you answer the prediction.
                        </div>
                    ) : (
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <MatrixInput label="A" value={M} step={0.25} columnColors={[MATH_COLORS.i, MATH_COLORS.j]}
                                    onChange={(next) => { takeOver(); setA(next); }} />
                                {guided && step.kind === 'power' && (
                                    <div className="text-sm text-slate-400">round {step.iteration}: estimate <span className="font-mono text-violet-300">{num(step.estimate)}</span></div>
                                )}
                            </div>
                            <div className="text-slate-100 text-sm sm:text-base space-y-1">
                                {!hideAv && <Tex block>{avTex}</Tex>}
                                {(!guided || has('lines')) && <Tex block>{charTex}</Tex>}
                            </div>
                            <p className="text-xs text-slate-500">
                                The dashed violet ellipse is where the whole unit circle lands. Eigenvectors are the directions where the circle and its image line up through the origin.
                            </p>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Av = λv</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-emerald-300 font-semibold">Eigenvector</span> — a direction A keeps on its own line.</li>
                            <li><span className="text-violet-300 font-semibold">Eigenvalue λ</span> — the stretch along it; negative means flipped.</li>
                            <li><span className="text-slate-200 font-semibold">Finding λ</span> — solve det(A − λI) = 0.</li>
                            <li><span className="text-rose-300 font-semibold">Rotations</span> — no real eigenvectors at all.</li>
                            <li><span className="text-amber-300 font-semibold">Power iteration</span> — multiply and rescale; the largest |λ| wins.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-violet-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
