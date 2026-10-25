"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { FunctionPlot, Polygon, Segment, MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   A region spun around the x-axis. Each shape gives an outer radius R(x)
   and an inner radius r(x) (0 for a solid with no hole), and its exact
   volume in closed form. A slice of thickness Δx is a disk of volume
   πR²Δx, or a washer of volume π(R² − r²)Δx. */
const SHAPES = [
    {
        id: 'cone', name: 'Cone', region: 'y = x/2 from 0 to 3', outerTex: String.raw`\tfrac{x}{2}`,
        R: (x) => x / 2, r: () => 0, a: 0, b: 3,
        exact: Math.PI * 1.5 ** 2 * 3 / 3, formula: 'πr²h/3 with r = 1.5, h = 3',
        xRange: [-0.4, 3.4], yRange: [-1.9, 1.9],
    },
    {
        id: 'sphere', name: 'Sphere', region: 'y = √(2.25 − x²) from −1.5 to 1.5', outerTex: String.raw`\sqrt{2.25 - x^2}`,
        R: (x) => Math.sqrt(Math.max(0, 2.25 - x * x)), r: () => 0, a: -1.5, b: 1.5,
        exact: (4 / 3) * Math.PI * 1.5 ** 3, formula: '4πr³/3 with r = 1.5',
        xRange: [-1.9, 1.9], yRange: [-1.9, 1.9],
    },
    {
        id: 'paraboloid', name: 'Paraboloid', region: 'y = √x from 0 to 2.5', outerTex: String.raw`\sqrt{x}`,
        R: (x) => Math.sqrt(Math.max(0, x)), r: () => 0, a: 0, b: 2.5,
        exact: Math.PI * 2.5 ** 2 / 2, formula: 'πh²/2 with h = 2.5',
        xRange: [-0.4, 2.9], yRange: [-1.9, 1.9],
    },
    {
        id: 'washer', name: 'Washer solid', region: 'between y = √x and y = x/2 from 0 to 4', outerTex: String.raw`\sqrt{x}`, innerTex: String.raw`\tfrac{x}{2}`,
        R: (x) => Math.sqrt(Math.max(0, x)), r: (x) => x / 2, a: 0, b: 4,
        exact: (8 * Math.PI) / 3, formula: 'π∫(x − x²/4) dx = 8π/3',
        xRange: [-0.4, 4.4], yRange: [-2.3, 2.3],
    },
];

/** n slices with midpoint radii: the disk (or washer) method's sum. */
const slices = (s, n) => {
    const dx = (s.b - s.a) / n;
    return Array.from({ length: n }, (_, i) => {
        const x0 = s.a + i * dx, m = x0 + dx / 2;
        const R = s.R(m), r = s.r(m);
        return { i, x0, x1: x0 + dx, m, R, r, dx, vol: Math.PI * (R * R - r * r) * dx };
    });
};
const sliceSum = (s, n) => slices(s, n).reduce((t, q) => t + q.vol, 0);

const num = (x, d = 3) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 3);

/* The tour: per shape, the slice counts shown, which slice is asked about,
   and where the exact-volume question comes. */
const TOUR = [
    { shape: 0, ns: [4, 8, 32], disk: { n: 4, i: 2 } },
    { shape: 1, ns: [8, 32], disk: { n: 8, i: 5 } },
    { shape: 2, ns: [8, 32], disk: { n: 8, i: 3 } },
    { shape: 3, ns: [8, 32], disk: { n: 8, i: 2 } },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let q = 0;
    const push = (o) => steps.push({ n: 0, focus: null, solid: false, exactShown: false, ...o });
    push({
        kind: 'opening', shape: 0,
        explanation: 'Take the region under y = x/2 from x = 0 to 3 — a right triangle — and spin it around the x-axis. It sweeps out a cone. How much space does it fill?',
    });
    push({ kind: 'spin', shape: 0, solid: true, explanation: 'The cone, base radius 1.5 and length 3. Drag the 3D view to look at it from the side or end on.' });
    TOUR.forEach(({ shape, ns, disk }, ti) => {
        const s = SHAPES[shape];
        if (ti > 0) {
            push({
                kind: 'newShape', shape, solid: true,
                explanation: s.id === 'washer'
                    ? 'A region with a gap: between y = √x (outer) and y = x/2 (inner), from 0 to 4. Spun around the x-axis it leaves a hollow core, so each slice is a washer — a disk with a hole.'
                    : `${s.name}: spin the region ${s.region}.`,
            });
        }
        // one slice, up close
        const sl = slices(s, disk.n)[disk.i];
        push({
            kind: 'diskAsk', shape, n: disk.n, focus: disk.i,
            explanation: `Cut the solid into ${disk.n} slices. Slice ${disk.i + 1} is ${num(sl.dx)} thick, at x = ${num(sl.m)}: outer radius ${num(sl.R)}${s.id === 'washer' ? `, inner radius ${num(sl.r)}` : ''}.`,
        });
        push({
            kind: 'diskShow', shape, n: disk.n, focus: disk.i, q: q++,
            explanation: s.id === 'washer'
                ? `A washer: π(R² − r²)Δx = π(${num(sl.R)}² − ${num(sl.r)}²)(${num(sl.dx)}) = ${num(sl.vol)}.`
                : `A disk is a short cylinder: πr²Δx = π(${num(sl.R)})²(${num(sl.dx)}) = ${num(sl.vol)}.`,
        });
        ns.forEach((n, k) => {
            const S = sliceSum(s, n);
            push({
                kind: 'sum', shape, n,
                explanation: `${n} ${s.id === 'washer' ? 'washers' : 'disks'}: total ${num(S)}.${k === ns.length - 1 ? ' As the slices get thinner the sum settles on the integral.' : ''}`,
            });
        });
        push({
            kind: 'exactAsk', shape, n: ns[ns.length - 1],
            explanation: `So the volume is ∫ π${s.id === 'washer' ? '(R² − r²)' : 'R²'} dx over [${num(s.a)}, ${num(s.b)}].`,
        });
        push({
            kind: 'exactShow', shape, n: ns[ns.length - 1], exactShown: true, solid: true, q: q++,
            explanation: Math.abs(sliceSum(s, ns[0]) - s.exact) < 1e-9
                ? `Exactly ${num(s.exact)} — the formula ${s.formula}. Here even ${ns[0]} slices were exact: the slice area πR² = πx is a straight line in x, so each midpoint slice's overshoot and undershoot cancel.`
                : `Exactly ${num(s.exact)} — the formula ${s.formula}. With ${ns[ns.length - 1]} slices the sum was off by only ${num(Math.abs(sliceSum(s, ns[ns.length - 1]) - s.exact), 4)}.`,
        });
    });
    push({
        kind: 'closing', shape: 1, n: 16, solid: true, exactShown: true,
        explanation: 'Every volume of revolution is the same recipe: slice perpendicular to the axis, write the area of one slice, πR² or π(R² − r²), and integrate it along the axis. Switch to Explore to change the shape and the number of slices.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before a slice's volume appears: πR²Δx, against 2πRΔx (the band around
   its edge), πRΔx and R²Δx. Before each shape's exact volume: the formula's
   value, against the enclosing cylinder and half or a third of it. */
const pickWrong = (correct, candidates) => {
    const seen = new Set([num(correct)]);
    const wrong = [];
    for (const w of candidates) if (wrong.length < 3 && Number.isFinite(w) && !seen.has(num(w))) { seen.add(num(w)); wrong.push(w); }
    return wrong;
};

const predictFor = (step, next) => {
    if (!step || !next) return null;
    const s = SHAPES[next.shape];
    if (step.kind === 'diskAsk' && next.kind === 'diskShow') {
        const sl = slices(s, next.n)[next.focus];
        const correct = sl.vol;
        const wrong = pickWrong(correct, [2 * Math.PI * sl.R * sl.dx, Math.PI * sl.R * sl.dx, (sl.R * sl.R - sl.r * sl.r) * sl.dx, Math.PI * (sl.R - sl.r) ** 2 * sl.dx, correct * 2]);
        const slot = (next.q * 3 + 1) % 4;
        const options = [...wrong];
        options.splice(slot, 0, correct);
        return {
            question: s.id === 'washer'
                ? `Washer ${next.focus + 1}: outer radius ${num(sl.R)}, inner radius ${num(sl.r)}, thickness ${num(sl.dx)}. What is its volume?`
                : `Disk ${next.focus + 1}: radius ${num(sl.R)}, thickness ${num(sl.dx)}. What is its volume?`,
            options: options.map(v => num(v)), correct: slot,
            because: s.id === 'washer'
                ? `Outer disk minus the hole: π(${num(sl.R)}² − ${num(sl.r)}²) × ${num(sl.dx)} = ${num(correct)}.`
                : `Area of the circular face times thickness: π × ${num(sl.R)}² × ${num(sl.dx)} = ${num(correct)}.`,
        };
    }
    if (step.kind === 'exactAsk' && next.kind === 'exactShow') {
        const correct = s.exact;
        const len = s.b - s.a;
        let maxR = 0;
        for (let k = 0; k <= 100; k++) maxR = Math.max(maxR, s.R(s.a + (len * k) / 100));
        const cylinder = Math.PI * maxR * maxR * len;
        const wrong = pickWrong(correct, [cylinder, cylinder / 2, cylinder / 3, (2 * cylinder) / 3, correct * 2]);
        const slot = (next.q * 3 + 1) % 4;
        const options = [...wrong];
        options.splice(slot, 0, correct);
        return {
            question: `What is the exact volume of the ${s.name.toLowerCase()}?`,
            options: options.map(v => num(v)), correct: slot,
            because: `∫ π${s.id === 'washer' ? '(R² − r²)' : 'R²'} dx = ${num(correct)}, i.e. ${s.formula}. The enclosing cylinder would be ${num(cylinder)}.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'The region under y = x from 0 to 2 is spun around the x-axis. Which integral gives the volume?',
        options: ['∫₀² x dx', '∫₀² πx² dx', '∫₀² 2πx dx', '∫₀² πx dx'],
        correct: 1,
        explanation: 'Each slice is a disk of radius y = x, area πx². Integrate the area along the axis: ∫₀² πx² dx = 8π/3 — a cone with r = h = 2.',
    },
    {
        question: 'Why does a washer have volume π(R² − r²)Δx and not π(R − r)²Δx?',
        options: [
            'They are the same',
            'A washer is a disk of radius R with a disk of radius r removed, so the areas subtract, not the radii',
            'Because r is always 0',
            'Because the thickness is squared',
        ],
        correct: 1,
        explanation: 'Area of the face = πR² − πr². Subtracting radii first, π(R − r)², would give the area of a smaller disk, not of a ring.',
    },
    {
        question: 'Doubling the radius of every disk (keeping the length) multiplies the volume by…',
        options: ['2', '4', '8', 'π'],
        correct: 1,
        explanation: 'Each slice\'s volume is πR²Δx, so doubling R multiplies every slice — and the total — by 4.',
    },
];

const codeExample = `import numpy as np

def volume(R, a, b, n, r=lambda x: 0 * x):
    """Disk / washer method with midpoint radii."""
    dx = (b - a) / n
    m = a + (np.arange(n) + 0.5) * dx
    return np.sum(np.pi * (R(m)**2 - r(m)**2) * dx)

cone = lambda x: x / 2                         # r = 1.5, h = 3
for n in [4, 8, 32, 256]:
    print(n, volume(cone, 0, 3, n))            # -> pi * 1.5**2 * 3 / 3 = 7.0686

sphere = lambda x: np.sqrt(2.25 - x**2)        # r = 1.5
print(volume(sphere, -1.5, 1.5, 1000), 4 / 3 * np.pi * 1.5**3)

# washer: between sqrt(x) and x/2 on [0, 4]
print(volume(np.sqrt, 0, 4, 1000, r=lambda x: x / 2), 8 * np.pi / 3)`;

/* ── page ──────────────────────────────────────────────── */

const SLICE_COLORS = ['#2dd4bf', '#22d3ee'];

/** The region and the slices seen side-on, in the xy-plane. */
function SidePicture({ s, n, focus }) {
    const sl = n > 0 ? slices(s, n) : [];
    const outline = (sign) => {
        const pts = [];
        for (let i = 0; i <= 120; i++) { const x = s.a + ((s.b - s.a) * i) / 120; pts.push([x, sign * s.R(x)]); }
        return pts;
    };
    const top = outline(1);
    const innerTop = [];
    for (let i = 0; i <= 120; i++) { const x = s.a + ((s.b - s.a) * i) / 120; innerTop.push([x, s.r(x)]); }
    return (
        <Plane2D xRange={s.xRange} yRange={s.yRange} ariaLabel={`${s.name}: the region ${s.region} and its slices, seen side-on`}>
            <Polygon points={[...top, ...innerTop.slice().reverse()]} fill={MATH_COLORS.area} fillOpacity={0.3} />
            <Polygon points={[...outline(-1), ...innerTop.map(([x, y]) => [x, -y]).reverse()]} fill={MATH_COLORS.area} fillOpacity={0.08} strokeWidth={0.5} />
            {sl.map((q) => (
                <g key={q.i}>
                    <Polygon points={[[q.x0, q.r], [q.x1, q.r], [q.x1, q.R], [q.x0, q.R]]} fill={q.i === focus ? MATH_COLORS.result : SLICE_COLORS[q.i % 2]} fillOpacity={q.i === focus ? 0.75 : 0.3} strokeWidth={0.8} />
                    <Polygon points={[[q.x0, -q.r], [q.x1, -q.r], [q.x1, -q.R], [q.x0, -q.R]]} fill={q.i === focus ? MATH_COLORS.result : SLICE_COLORS[q.i % 2]} fillOpacity={q.i === focus ? 0.5 : 0.15} strokeWidth={0.5} />
                </g>
            ))}
            <FunctionPlot f={s.R} domain={[s.a, s.b]} color={MATH_COLORS.curve} />
            {s.id === 'washer' && <FunctionPlot f={s.r} domain={[s.a, s.b]} color={MATH_COLORS.curve2} />}
            <Segment from={[s.xRange[0], 0]} to={[s.xRange[1], 0]} color="#e2e8f0" width={1.5} dashed opacity={0.6} />
        </Plane2D>
    );
}

function SolidScene({ s, n, focus, solid }) {
    const sl = n > 0 ? slices(s, n) : [];
    const ROT = [0, 0, -Math.PI / 2];   // lathe and cylinder axes are local y; turn them onto x
    return (
        <Scene3D height={360} distance={11} axisSize={3}
            ariaLabel={`The ${s.name.toLowerCase()} formed by spinning ${s.region} around the x-axis`}
            fallback={<p className="text-sm text-slate-300 font-mono">{n > 0 ? `${n} slices: ${num(sliceSum(s, n))}` : ''} exact: {num(s.exact)}</p>}>
            {(T) => {
                const V2 = (r, h) => new T.THREE.Vector2(r, h);
                const profile = [];
                const steps = 64;
                for (let i = 0; i <= steps; i++) { const x = s.a + ((s.b - s.a) * i) / steps; profile.push(V2(Math.max(s.R(x), 0.0001), x)); }
                for (let i = steps; i >= 0; i--) { const x = s.a + ((s.b - s.a) * i) / steps; profile.push(V2(Math.max(s.r(x), 0.0001), x)); }
                profile.push(profile[0].clone());
                const regionPts = [];
                for (let i = 0; i <= 60; i++) { const x = s.a + ((s.b - s.a) * i) / 60; regionPts.push([x, 0, s.R(x)]); }
                for (let i = 60; i >= 0; i--) { const x = s.a + ((s.b - s.a) * i) / 60; regionPts.push([x, 0, s.r(x)]); }
                return (
                    <>
                        <T.Polygon3D points={regionPts} color="#facc15" opacity={0.45} />
                        {solid && (
                            <mesh rotation={ROT}>
                                <latheGeometry args={[profile, 64]} />
                                <meshStandardMaterial color="#14b8a6" transparent opacity={sl.length ? 0.12 : 0.45} side={T.THREE.DoubleSide} depthWrite={false} />
                            </mesh>
                        )}
                        {sl.map(q => (
                            <mesh key={q.i} rotation={ROT}>
                                <latheGeometry args={[[V2(Math.max(q.r, 0.0001), q.x0), V2(q.R, q.x0), V2(q.R, q.x1), V2(Math.max(q.r, 0.0001), q.x1), V2(Math.max(q.r, 0.0001), q.x0)], 40]} />
                                <meshStandardMaterial color={q.i === focus ? '#f472b6' : (q.i % 2 ? '#22d3ee' : '#2dd4bf')}
                                    transparent opacity={focus === null || q.i === focus ? 0.85 : 0.3} side={T.THREE.DoubleSide} />
                            </mesh>
                        ))}
                        <T.Line3D points={[[s.a - 0.6, 0, 0], [s.b + 0.6, 0, 0]]} color="#e2e8f0" width={2} dashed />
                    </>
                );
            }}
        </Scene3D>
    );
}

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
                    className="text-sm px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-teal-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function VolumesOfRevolutionPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [shape, setShape] = useState(0);          // explore-mode state
    const [n, setN] = useState(8);
    const [solid, setSolid] = useState(true);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[currentStep];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(c => c + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const guided = mode === 'guided';
    const s = SHAPES[guided ? step.shape : shape];
    const N = guided ? step.n : n;
    const focus = guided ? step.focus : null;
    const showSolid = guided ? step.solid : solid;
    const hide = guided && predict.hideExplanation;
    const exactShown = !guided || step.exactShown;

    const takeOver = () => {
        if (!guided) return;
        setShape(step.shape); setN(Math.max(1, step.n || 8)); setSolid(step.solid);
        setMode('explore'); setIsPlaying(false);
    };

    const S = N > 0 ? sliceSum(s, N) : null;
    const fs = focus !== null && N > 0 ? slices(s, N)[focus] : null;
    const areaTex = s.id === 'washer' ? String.raw`\pi\big(R(x)^2 - r(x)^2\big)` : String.raw`\pi R(x)^2`;
    const radiiTex = s.id === 'washer' ? String.raw`R(x) = ${s.outerTex},\; r(x) = ${s.innerTex}` : String.raw`R(x) = ${s.outerTex}`;
    const sumLine = S !== null ? String.raw`\sum_{i=1}^{${N}} ${s.id === 'washer' ? String.raw`\pi(R_i^2 - r_i^2)` : String.raw`\pi R_i^2`}\,\Delta x = ${fmt(S)}` : null;
    const exactLine = String.raw`V = \int_{${fmt(s.a)}}^{${fmt(s.b)}} ${areaTex}\,dx = ${exactShown && !hide ? fmt(s.exact) : String.raw`\;?`}`;
    const sliceLine = fs && (!guided || step.kind !== 'diskAsk') && !hide
        ? String.raw`\text{slice } ${focus + 1}: \; \pi(${fmt(fs.R)}^2${s.id === 'washer' ? ` - ${fmt(fs.r)}^2` : ''})(${fmt(fs.dx)}) = ${fmt(fs.vol)}`
        : null;

    const exploreNote = `${s.name}: ${n} ${s.id === 'washer' ? 'washers' : 'disks'} add up to ${num(S)}; the exact volume is ${num(s.exact)} (${s.formula}). Error ${num(Math.abs(S - s.exact), 4)} — more slices, smaller error.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/integral-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Integral Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Volumes of Revolution</h1>
                    <p className="text-teal-50 max-w-3xl">
                        Spin a region around an axis and it sweeps out a solid. Slice it into disks or washers, add up their volumes, and the sum becomes an integral.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                                {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={mode === key}
                                        onClick={() => { if (key === 'explore') takeOver(); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {guided ? `${s.name} · step ${currentStep + 1} of ${stepHistory.length}` : 'Pick a shape and a number of slices'}
                            </span>
                        </div>

                        <SolidScene s={s} n={N} focus={focus} solid={showSolid} />
                        <div className="mt-3">
                            <p className="text-xs text-slate-500 mb-1">Side view: the region ({s.region}) and the slices</p>
                            <div className="rounded-lg overflow-hidden border border-slate-800"><SidePicture s={s} n={N} focus={focus} /></div>
                        </div>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(c => Math.max(c - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(v => !v)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(c => Math.min(c + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="teal" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-teal-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    {SHAPES.map((q, i) => (
                                        <button key={q.id} onClick={() => setShape(i)}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === shape ? 'border-teal-500 text-teal-300 bg-teal-500/10' : 'border-slate-700 text-slate-300 hover:border-teal-500'}`}>
                                            {q.name}
                                        </button>
                                    ))}
                                    <button onClick={() => setSolid(v => !v)} aria-pressed={solid}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${solid ? 'border-slate-500 text-slate-200' : 'border-slate-700 text-slate-500'}`}>Show the solid</button>
                                </div>
                                <ParamSlider label="Slices n" value={n} onChange={setN} min={1} max={64} step={1} accent="teal" />
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="teal" />}

                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-teal-400 mt-0.5 flex-shrink-0" />
                            <p className="text-teal-200 text-sm leading-relaxed">
                                {guided ? (hide ? 'Make your prediction above to reveal this step.' : step.explanation) : exploreNote}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-3 text-slate-100 text-sm sm:text-base">
                        <Tex block>{radiiTex}</Tex>
                        {sliceLine && <Tex block>{sliceLine}</Tex>}
                        {sumLine && <Tex block>{sumLine}</Tex>}
                        <Tex block>{exactLine}</Tex>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Disks and washers</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-teal-300 font-semibold">Disk</span> — a solid slice: volume πR²Δx.</li>
                            <li><span className="text-cyan-300 font-semibold">Washer</span> — a slice with a hole: π(R² − r²)Δx.</li>
                            <li><span className="text-amber-300 font-semibold">Integral</span> — V = ∫ π(R² − r²) dx along the axis.</li>
                            <li><span className="text-slate-200 font-semibold">Check</span> — cone πr²h/3, sphere 4πr³/3, paraboloid πh²/2.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(v => !v)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-teal-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
