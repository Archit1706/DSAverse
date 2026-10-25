"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, Vector, Segment, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import Scene3D from '@/components/math/Scene3D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Each surface carries its two partial derivatives in closed form. The
   ranges are module constants so the 3D mesh is built once per surface. */
const SURFACES = [
    {
        id: 'hills', name: 'sin x + cos y', R: 3, range: [-3, 3],
        f: (x, y) => Math.sin(x) + Math.cos(y),
        fx: (x) => Math.cos(x), fy: (x, y) => -Math.sin(y),
        tex: String.raw`\sin x + \cos y`, fxTex: String.raw`\cos x`, fyTex: String.raw`-\sin y`,
        fxAt: (x) => String.raw`\cos(${texNum(x, 2)})`, fyAt: (x, y) => String.raw`-\sin(${texNum(y, 2)})`,
        levels: [-1.5, -1, -0.5, 0, 0.5, 1, 1.5],
    },
    {
        id: 'bowl', name: '(x² + 2y²)/5', R: 2.5, range: [-2.5, 2.5],
        f: (x, y) => (x * x + 2 * y * y) / 5,
        fx: (x) => 2 * x / 5, fy: (x, y) => 4 * y / 5,
        tex: String.raw`\tfrac{1}{5}(x^2 + 2y^2)`, fxTex: String.raw`\tfrac{2}{5}x`, fyTex: String.raw`\tfrac{4}{5}y`,
        fxAt: (x) => String.raw`\tfrac{2}{5}(${texNum(x, 2)})`, fyAt: (x, y) => String.raw`\tfrac{4}{5}(${texNum(y, 2)})`,
        levels: [0.25, 0.5, 1, 1.5, 2, 2.5, 3],
    },
    {
        id: 'saddle', name: '(x² − y²)/3', R: 2.5, range: [-2.5, 2.5],
        f: (x, y) => (x * x - y * y) / 3,
        fx: (x) => 2 * x / 3, fy: (x, y) => -2 * y / 3,
        tex: String.raw`\tfrac{1}{3}(x^2 - y^2)`, fxTex: String.raw`\tfrac{2}{3}x`, fyTex: String.raw`-\tfrac{2}{3}y`,
        fxAt: (x) => String.raw`\tfrac{2}{3}(${texNum(x, 2)})`, fyAt: (x, y) => String.raw`-\tfrac{2}{3}(${texNum(y, 2)})`,
        levels: [-1.5, -1, -0.5, -0.15, 0.15, 0.5, 1, 1.5],
    },
];

const gradient = (s, x, y) => [s.fx(x, y), s.fy(x, y)];

/**
 * Marching squares: the level set f = c as a list of segments, sampled on
 * an n × n grid over [−R, R]². Each cell is cut where f − c changes sign
 * along its edges, with the crossing found by linear interpolation.
 */
const contourSegments = (f, R, c, n = 48) => {
    const h = (2 * R) / n;
    const segs = [];
    const v = [];
    for (let i = 0; i <= n; i++) { v.push([]); for (let j = 0; j <= n; j++) v[i].push(f(-R + i * h, -R + j * h) - c); }
    const lerp = (x0, y0, a, x1, y1, b) => { const t = a / (a - b); return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]; };
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const x0 = -R + i * h, y0 = -R + j * h, x1 = x0 + h, y1 = y0 + h;
            const a = v[i][j], b = v[i + 1][j], cc = v[i + 1][j + 1], d = v[i][j + 1];
            const pts = [];
            if ((a > 0) !== (b > 0)) pts.push(lerp(x0, y0, a, x1, y0, b));
            if ((b > 0) !== (cc > 0)) pts.push(lerp(x1, y0, b, x1, y1, cc));
            if ((cc > 0) !== (d > 0)) pts.push(lerp(x1, y1, cc, x0, y1, d));
            if ((d > 0) !== (a > 0)) pts.push(lerp(x0, y1, d, x0, y0, a));
            if (pts.length === 2) segs.push(pts);
            else if (pts.length === 4) {
                // A saddle cell: all four edges are crossed. The value at the
                // centre says which pair of opposite corners is joined.
                const centre = f(x0 + h / 2, y0 + h / 2) - c;
                if ((centre > 0) === (a > 0)) { segs.push([pts[0], pts[1]]); segs.push([pts[2], pts[3]]); }
                else { segs.push([pts[0], pts[3]]); segs.push([pts[1], pts[2]]); }
            }
        }
    }
    return segs;
};

/* The eight compass directions, measured from +x counter-clockwise. */
const DIRECTIONS = ['→ east (+x)', '↗ north-east', '↑ north (+y)', '↖ north-west', '← west (−x)', '↙ south-west', '↓ south (−y)', '↘ south-east'];
const directionIndex = ([gx, gy]) => ((Math.round(Math.atan2(gy, gx) / (Math.PI / 4)) % 8) + 8) % 8;

const num = (x, d = 3) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 3);
const pt = ([x, y]) => `(${num(x, 2)}, ${num(y, 2)})`;

/* Points the tour visits on sin x + cos y, chosen so the gradient points
   cleanly along a compass direction — seven different ones. */
const TOUR_POINTS = [[0, -1.57], [2, 0.3], [-1.5, 1.2], [0.2, 3], [-2.8, -0.2], [-1.57, -1.2], [2.36, -0.79]];
const START = [1, -0.6];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const s = SURFACES[0];
    const steps = [];
    let q = 0;
    const push = (o) => steps.push({ surface: 0, sliceX: false, sliceY: false, grad: false, level: false, field: false, ...o });
    const [x0, y0] = START;
    const [gx, gy] = gradient(s, x0, y0);
    push({ kind: 'opening', p: START, explanation: `z = sin x + cos y: a landscape of hills and hollows. Its contour map, on the right, shows the same thing from above — each ring is a height. P sits at (${num(x0)}, ${num(y0)}), height ${num(s.f(x0, y0))}.` });
    push({ kind: 'sliceX', p: START, sliceX: true, explanation: `Freeze y at ${num(y0)} and walk in the x-direction: the green curve is that slice of the surface. Its slope at P is the partial derivative ∂f/∂x = cos x = ${num(gx)}.` });
    push({ kind: 'sliceY', p: START, sliceX: true, sliceY: true, explanation: `Now freeze x at ${num(x0)} and walk in y: the red slice. Its slope is ∂f/∂y = −sin y = ${num(gy)}. Two slopes, one for each direction you can walk.` });
    push({ kind: 'gradient', p: START, sliceX: true, sliceY: true, grad: true, explanation: `Put the two slopes together as a vector: ∇f = (∂f/∂x, ∂f/∂y) = (${num(gx)}, ${num(gy)}). It points in the direction of steepest climb, and its length ${num(Math.hypot(gx, gy))} is how steep that climb is.` });
    push({ kind: 'level', p: START, grad: true, level: true, explanation: 'The white curve is the contour through P: walking along it, the height does not change. The gradient crosses it at a right angle — no part of the steepest climb is wasted going sideways.' });
    TOUR_POINTS.forEach((p, k) => {
        push({ kind: 'move', p, k, explanation: `P moves to ${pt(p)}, height ${num(s.f(...p))}. Read the contours around it: which way is uphill?` });
        const g = gradient(s, ...p);
        push({ kind: 'reveal', p, k, grad: true, level: true, q: q++, explanation: `∇f${pt(p)} = (cos ${num(p[0], 2)}, −sin ${num(p[1], 2)}) = (${num(g[0])}, ${num(g[1])}): it points ${DIRECTIONS[directionIndex(g)].slice(2)}, straight across the contour and up the slope.` });
    });
    push({ kind: 'flat', p: [Math.PI / 2, 0], grad: true, level: true, explanation: 'At (π/2, 0), the top of a hill (height 2), both partial derivatives are 0: ∇f = (0, 0). Every walk away from a peak, a valley or a saddle starts out level.' });
    push({ kind: 'closing', p: START, grad: true, level: true, field: true, explanation: 'The small arrows are ∇f everywhere: always perpendicular to the contours, long where they crowd together, vanishing at the tops and bottoms. Switch to Explore to drag P and try the bowl and the saddle.' });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before the gradient appears at a new point: which way will it point? The
   wrong answers are downhill (the opposite way) and the two directions along
   the contour, where the height does not change. */
const predictFor = (step, next) => {
    if (!step || !next || next.kind !== 'reveal' || step.kind !== 'move') return null;
    const s = SURFACES[next.surface];
    const d = directionIndex(gradient(s, ...next.p));
    const wrong = [(d + 4) % 8, (d + 2) % 8, (d + 6) % 8].map(i => DIRECTIONS[i]);
    const slot = (next.q * 3 + 1) % 4;
    const options = [...wrong];
    options.splice(slot, 0, DIRECTIONS[d]);
    const g = gradient(s, ...next.p);
    return {
        question: `At P = ${pt(next.p)}, which way does the gradient ∇f point?`,
        options, correct: slot,
        because: `∂f/∂x = ${num(g[0])} and ∂f/∂y = ${num(g[1])}, so ∇f points ${DIRECTIONS[d].slice(2)} — uphill and across the contour. ${DIRECTIONS[(d + 4) % 8].slice(2)} is downhill; the other two run along the contour.`,
    };
};

const quizQuestions = [
    {
        question: 'For f(x, y) = x²y, what is ∂f/∂x?',
        options: ['2x', '2xy', 'x²', '2x + y'],
        correct: 1,
        explanation: 'Treat y as a constant and differentiate in x: x²y has derivative 2x·y. (∂f/∂y, holding x fixed, would be x².)',
    },
    {
        question: 'At a point on a contour map, how is the gradient ∇f oriented?',
        options: [
            'Along the contour line',
            'Perpendicular to the contour, pointing uphill',
            'Perpendicular to the contour, pointing downhill',
            'Always towards the origin',
        ],
        correct: 1,
        explanation: 'Along a contour the height is constant, so the slope in that direction is 0. The steepest climb is at right angles to it, and ∇f points that way — uphill.',
    },
    {
        question: '∇f = (3, 4) at a point. What is the steepest rate of increase of f there?',
        options: ['3', '4', '5', '7'],
        correct: 2,
        explanation: 'The steepest slope is the length of the gradient: √(3² + 4²) = 5, in the direction (3, 4)/5. Walking straight along x would only give a slope of 3.',
    },
];

const codeExample = `import numpy as np

f  = lambda x, y: np.sin(x) + np.cos(y)
fx = lambda x, y: np.cos(x)          # hold y fixed, differentiate in x
fy = lambda x, y: -np.sin(y)         # hold x fixed, differentiate in y

x0, y0 = 1.0, -0.6
grad = np.array([fx(x0, y0), fy(x0, y0)])
print(grad, np.linalg.norm(grad))    # direction and steepness of the climb

# Check each partial with a finite difference
h = 1e-6
print((f(x0 + h, y0) - f(x0 - h, y0)) / (2 * h), grad[0])
print((f(x0, y0 + h) - f(x0, y0 - h)) / (2 * h), grad[1])

# The gradient is perpendicular to the contour: the contour's
# direction (-fy, fx) has zero dot product with it
tangent = np.array([-grad[1], grad[0]])
print(grad @ tangent)                # 0.0`;

/* ── page ──────────────────────────────────────────────── */

const LEVEL_COLORS = ['#1d4ed8', '#2563eb', '#0ea5e9', '#14b8a6', '#84cc16', '#eab308', '#f59e0b', '#f97316'];

function ContourPath({ segs, color, width = 1.4, opacity = 0.9 }) {
    const { toScreen } = usePlane();
    const d = segs.map(([a, b]) => {
        const [x1, y1] = toScreen(a), [x2, y2] = toScreen(b);
        return `M${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`;
    }).join('');
    return <path d={d} fill="none" stroke={color} strokeWidth={width} opacity={opacity} strokeLinecap="round" />;
}

function ContourMap({ s, p, showGrad, showLevel, showField, onDrag }) {
    const contours = useMemo(() => s.levels.map(c => contourSegments(s.f, s.R, c)), [s]);
    const through = useMemo(() => (showLevel ? contourSegments(s.f, s.R, s.f(...p), 64) : []), [s, p, showLevel]);
    const g = gradient(s, ...p);
    const glen = Math.hypot(...g);
    const scale = glen > 1e-9 ? Math.min(1.2, 0.9 / Math.max(glen, 0.6)) * 1.0 : 0;
    const field = [];
    if (showField) {
        for (let x = -s.R + 0.5; x <= s.R - 0.4; x += 1) {
            for (let y = -s.R + 0.5; y <= s.R - 0.4; y += 1) {
                const [a, b] = gradient(s, x, y);
                field.push(<Vector key={`${x},${y}`} from={[x, y]} to={[x + 0.35 * a, y + 0.35 * b]} color="#94a3b8" width={1.3} opacity={0.6} />);
            }
        }
    }
    const tangentDir = glen > 1e-9 ? [-g[1] / glen, g[0] / glen] : [0, 0];
    return (
        <Plane2D xRange={[-s.R, s.R]} yRange={[-s.R, s.R]} width={420} ariaLabel={`Contour map of f(x, y) = ${s.name}`}>
            {contours.map((segs, i) => <ContourPath key={i} segs={segs} color={LEVEL_COLORS[Math.round((i * (LEVEL_COLORS.length - 1)) / Math.max(1, s.levels.length - 1))]} />)}
            {showLevel && <ContourPath segs={through} color="#f8fafc" width={2.2} opacity={0.95} />}
            {field}
            {showLevel && glen > 1e-9 && (
                <Segment from={[p[0] - 0.6 * tangentDir[0], p[1] - 0.6 * tangentDir[1]]} to={[p[0] + 0.6 * tangentDir[0], p[1] + 0.6 * tangentDir[1]]}
                    color="#f8fafc" width={1.2} dashed opacity={0.7} />
            )}
            {showGrad && glen > 1e-9 && <Vector from={p} to={[p[0] + scale * g[0], p[1] + scale * g[1]]} color={MATH_COLORS.result} width={3} label="∇f" />}
            <Point at={p} color={MATH_COLORS.a} r={6} label="P" onDrag={onDrag} snap={0.05}
                ariaLabel={`Point P at ${pt(p)}; drag on the map or use the arrow keys`} />
        </Plane2D>
    );
}

function SurfaceScene({ s, p, sliceX, sliceY, showGrad }) {
    const [x0, y0] = p;
    const z0 = s.f(x0, y0);
    const [gx, gy] = gradient(s, x0, y0);
    const zFloor = useMemo(() => {
        let lo = Infinity;
        for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) lo = Math.min(lo, s.f(-s.R + (2 * s.R * i) / 20, -s.R + (2 * s.R * j) / 20));
        return lo - 0.6;
    }, [s]);
    const xs = useMemo(() => Array.from({ length: 61 }, (_, i) => -s.R + (2 * s.R * i) / 60), [s]);
    const lift = 0.03;
    const slicePtsX = xs.map(x => [x, y0, s.f(x, y0) + lift]);
    const slicePtsY = xs.map(y => [x0, y, s.f(x0, y) + lift]);
    const tx = [1, 0, gx], ty = [0, 1, gy];
    const unit = (v) => { const l = Math.hypot(...v); return v.map(c => (0.9 * c) / l); };
    const ux = unit(tx), uy = unit(ty);
    const glen = Math.hypot(gx, gy);
    const gs = glen > 1e-9 ? Math.min(1.4, 1.1 / Math.max(glen, 0.6)) : 0;
    return (
        <Scene3D height={340} distance={15.5} axisSize={3.2}
            ariaLabel={`The surface z = ${s.name} with P at ${pt(p)}`}
            fallback={<p className="text-sm text-slate-300 font-mono">∂f/∂x = {num(gx)}, ∂f/∂y = {num(gy)}</p>}>
            {(T) => (
                <>
                    <T.Surface3D f={s.f} xRange={s.range} yRange={s.range} segments={44} opacity={0.82} />
                    {sliceX && <T.Line3D points={slicePtsX} color={MATH_COLORS.i} width={3} />}
                    {sliceY && <T.Line3D points={slicePtsY} color={MATH_COLORS.j} width={3} />}
                    {sliceX && <T.Arrow3D from={[x0, y0, z0]} to={[x0 + ux[0], y0 + ux[1], z0 + ux[2]]} color={MATH_COLORS.i} />}
                    {sliceY && <T.Arrow3D from={[x0, y0, z0]} to={[x0 + uy[0], y0 + uy[1], z0 + uy[2]]} color={MATH_COLORS.j} />}
                    <T.Point3D at={[x0, y0, z0]} color={MATH_COLORS.a} size={0.1} label="P" />
                    {showGrad && (
                        <>
                            <T.Line3D points={[[x0, y0, z0], [x0, y0, zFloor]]} color="#94a3b8" width={1} dashed />
                            <T.Point3D at={[x0, y0, zFloor]} color={MATH_COLORS.a} size={0.06} />
                            {glen > 1e-9 && <T.Arrow3D from={[x0, y0, zFloor]} to={[x0 + gs * gx, y0 + gs * gy, zFloor]} color={MATH_COLORS.result} label="∇f" />}
                        </>
                    )}
                </>
            )}
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
                    className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-emerald-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function PartialDerivativesAndGradientsPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [surface, setSurface] = useState(0);        // explore-mode state
    const [p, setP] = useState(START);
    const [showSlices, setShowSlices] = useState(true);
    const [showField, setShowField] = useState(true);
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
    const s = SURFACES[guided ? step.surface : surface];
    const P = guided ? step.p : p;
    const show = guided
        ? { sliceX: step.sliceX, sliceY: step.sliceY, grad: step.grad, level: step.level, field: step.field }
        : { sliceX: showSlices, sliceY: showSlices, grad: true, level: true, field: showField };

    /* Grabbing P during the tour switches to Explore, starting from whatever
       is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setSurface(step.surface); setP(step.p);
        setMode('explore'); setIsPlaying(false);
    };
    const clamp = (v) => Math.min(Math.max(v, -s.R), s.R);

    const [gx, gy] = gradient(s, ...P);
    const glen = Math.hypot(gx, gy);
    const hide = guided && predict.hideExplanation;
    const formulaPartials = String.raw`\frac{\partial f}{\partial x} = ${s.fxTex} = ${s.fxAt(...P)} = \textcolor{${MATH_COLORS.i}}{${fmt(gx)}}, \qquad \frac{\partial f}{\partial y} = ${s.fyTex} = ${s.fyAt(...P)} = \textcolor{${MATH_COLORS.j}}{${fmt(gy)}}`;
    const formulaGrad = String.raw`\nabla f(${texNum(P[0], 2)}, ${texNum(P[1], 2)}) = (${fmt(gx)}, ${fmt(gy)}), \qquad |\nabla f| = \sqrt{(${fmt(gx)})^2 + (${fmt(gy)})^2} = ${fmt(glen)}`;
    const revealGrad = !guided || step.grad;

    const exploreNote = glen < 1e-6
        ? `∇f = (0, 0) at ${pt(P)}: a flat spot — a peak, a valley or a saddle. On the saddle, the origin is flat but neither the top nor the bottom.`
        : `At ${pt(P)} the surface climbs fastest towards ${DIRECTIONS[directionIndex([gx, gy])].slice(2)}, at slope ${num(glen)}. Walking along the white contour, the slope is 0.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/differential-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Differential Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Partial Derivatives and Gradients</h1>
                    <p className="text-emerald-50 max-w-3xl">
                        A surface has a slope in every direction. Slice it along x and along y to get the two partial derivatives; together they make the gradient, the arrow of steepest climb.
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
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag P on the contour map'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">The surface z = {s.name}</p>
                                <SurfaceScene s={s} p={P} sliceX={show.sliceX} sliceY={show.sliceY} showGrad={show.grad} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Contour map, seen from above</p>
                                <div className="rounded-lg overflow-hidden border border-slate-700/60">
                                    <ContourMap s={s} p={P} showGrad={show.grad} showLevel={show.level} showField={show.field}
                                        onDrag={([x, y]) => { takeOver(); setP([clamp(x), clamp(y)]); }} />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                            <span><span className="text-green-400 font-semibold">—</span> x-slice (y fixed): slope ∂f/∂x</span>
                            <span><span className="text-red-400 font-semibold">—</span> y-slice (x fixed): slope ∂f/∂y</span>
                            <span><span className="text-pink-400 font-semibold">→</span> ∇f, steepest climb</span>
                            <span>contours: <span className="text-blue-400">low</span> to <span className="text-orange-400">high</span></span>
                        </div>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(c => Math.max(c - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(v => !v)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(c => Math.min(c + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="emerald" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-emerald-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    {SURFACES.map((q, i) => (
                                        <button key={q.id} onClick={() => { setSurface(i); setP(([x, y]) => [Math.min(Math.max(x, -q.R), q.R), Math.min(Math.max(y, -q.R), q.R)]); }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === surface ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-slate-700 text-slate-300 hover:border-emerald-500'}`}>
                                            z = {q.name}
                                        </button>
                                    ))}
                                    <button onClick={() => setShowSlices(v => !v)} aria-pressed={showSlices}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showSlices ? 'border-slate-500 text-slate-200' : 'border-slate-700 text-slate-500'}`}>Slices</button>
                                    <button onClick={() => setShowField(v => !v)} aria-pressed={showField}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showField ? 'border-slate-500 text-slate-200' : 'border-slate-700 text-slate-500'}`}>Gradient field</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ParamSlider label="x₀" value={p[0]} onChange={(x) => setP(([, y]) => [x, y])} min={-s.R} max={s.R} step={0.05} accent="emerald" format={(v) => num(v, 2)} />
                                    <ParamSlider label="y₀" value={p[1]} onChange={(y) => setP(([x]) => [x, y])} min={-s.R} max={s.R} step={0.05} accent="emerald" format={(v) => num(v, 2)} />
                                </div>
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="emerald" />}

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p className="text-emerald-200 text-sm leading-relaxed">
                                {guided ? (hide ? 'Make your prediction above to reveal this step.' : step.explanation) : exploreNote}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-3 text-slate-100 text-sm sm:text-base">
                        <Tex block>{String.raw`f(x, y) = ${s.tex}, \qquad f(${texNum(P[0], 2)}, ${texNum(P[1], 2)}) = ${fmt(s.f(...P))}`}</Tex>
                        {revealGrad && !hide && <Tex block>{formulaPartials}</Tex>}
                        {revealGrad && !hide && <Tex block>{formulaGrad}</Tex>}
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Partials and the gradient</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-green-300 font-semibold">∂f/∂x</span> — slope walking in x, with y held fixed.</li>
                            <li><span className="text-red-300 font-semibold">∂f/∂y</span> — slope walking in y, with x held fixed.</li>
                            <li><span className="text-pink-300 font-semibold">∇f = (∂f/∂x, ∂f/∂y)</span> — points up the steepest climb; |∇f| is that slope.</li>
                            <li><span className="text-slate-200 font-semibold">Contours</span> — ∇f always crosses them at right angles.</li>
                            <li><span className="text-amber-300 font-semibold">∇f = 0</span> — a peak, a valley or a saddle.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(v => !v)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-emerald-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
