"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Plane2D, { Point, Segment, FunctionPlot, Polygon, Label, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   A square sheet of side L decimetres. Cut an x-by-x square from each
   corner and fold up the flaps: the box is (L − 2x) wide, (L − 2x) deep and
   x tall. Volumes come out in dm³, which are litres. */
const volume = (L, x) => x * (L - 2 * x) ** 2;
const dVolume = (L, x) => (L - 2 * x) * (L - 6 * x);        // product rule, then factor
const d2Volume = (L, x) => 24 * x - 8 * L;
const bestCut = (L) => L / 6;
const bestVolume = (L) => 2 * L ** 3 / 27;

const num = (x, d = 3) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 3);
const cm = (dm) => `${num(dm * 10, 1)} cm`;

const SHEET = 3;
const TOUR_CUTS = [0.1, 0.25, 0.4, 0.5, 0.6, 0.8, 1.2];
const OTHER_SHEETS = [4, 2];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let q = 0;
    steps.push({
        kind: 'opening', L: SHEET, x: 0.05,
        explanation: 'A 30 cm square sheet of card (3 dm). Cut an x-by-x square from each corner and fold up the four flaps to make an open box. Cut too little and the box is shallow; cut too much and the base vanishes. Which cut holds the most?',
    });
    TOUR_CUTS.forEach((x, i) => {
        const V = volume(SHEET, x);
        const slope = dVolume(SHEET, x);
        const note = Math.abs(slope) < 1e-9
            ? 'The tangent is flat: V′(x) = 0. Neither a slightly smaller nor a slightly larger cut does better.'
            : slope > 0 ? `The tangent slopes up (V′ = ${num(slope, 2)}): a slightly bigger cut would hold more.`
                : `The tangent slopes down (V′ = ${num(slope, 2)}): a slightly smaller cut would hold more.`;
        steps.push({
            kind: 'cut', L: SHEET, x, q: i ? q++ : null, prevX: i ? TOUR_CUTS[i - 1] : null, tangent: true,
            explanation: `Cut x = ${cm(x)}: the base is ${cm(SHEET - 2 * x)} square and the box is ${cm(x)} tall, so V = ${num(x)} × ${num(SHEET - 2 * x)}² = ${num(V)} litres. ${note}`,
        });
    });
    steps.push({
        kind: 'derivative', L: SHEET, x: 0.5, tangent: true, signs: true,
        explanation: `Now without guessing: V(x) = x(3 − 2x)², so V′(x) = (3 − 2x)² − 4x(3 − 2x) = (3 − 2x)(3 − 6x). It is zero at x = 0.5 and at x = 1.5 — but 1.5 leaves no base at all. V′ > 0 before 0.5 and < 0 after (and V″(0.5) = ${num(d2Volume(SHEET, 0.5))} < 0), so x = 0.5 dm = 5 cm is the maximum: 2 litres.`,
    });
    OTHER_SHEETS.forEach((L, j) => {
        steps.push({
            kind: 'resize', L, x: 0.25, tangent: false, signs: false, j,
            explanation: `A different sheet: ${cm(L)} square. The volume curve is the same shape, stretched. Where will its peak be?`,
        });
        steps.push({
            kind: 'resized', L, x: bestCut(L), tangent: true, signs: true, q: q++, j,
            explanation: `V′(x) = (${num(L)} − 2x)(${num(L)} − 6x) = 0 at x = ${num(L)}/6 = ${num(bestCut(L))} dm = ${cm(bestCut(L))}, giving ${num(bestVolume(L))} litres. Whatever the sheet, cut one sixth of its side.`,
        });
    });
    steps.push({
        kind: 'closing', L: SHEET, x: 0.5, tangent: true, signs: true,
        explanation: 'The recipe for any optimisation: write the quantity as a function of one variable, find where its derivative is zero, and check which of those points (and the ends of the range) is best. Switch to Explore to try it by hand.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Before each new cut: will the box hold more or less? Three cuts go up the
   hill and three come down it, so neither answer is a safe habit, and the
   correct button alternates with the step. Before a new sheet's peak is
   shown: where is the best cut? */
const UP = 'It holds more';
const DOWN = 'It holds less';

const predictFor = (step, next) => {
    if (!step || !next) return null;
    if (next.kind === 'cut' && next.prevX !== null) {
        const more = volume(next.L, next.x) > volume(next.L, next.prevX);
        const slot = next.q % 2;
        const options = slot === 0 ? [more ? UP : DOWN, more ? DOWN : UP] : [more ? DOWN : UP, more ? UP : DOWN];
        return {
            question: `The cut grows from ${cm(next.prevX)} to ${cm(next.x)}. Will the box hold more or less?`,
            options, correct: slot,
            because: `V(${num(next.prevX)}) = ${num(volume(next.L, next.prevX))} and V(${num(next.x)}) = ${num(volume(next.L, next.x))}. ${more ? 'Still climbing: the tangent sloped up.' : 'Past the peak: the tangent sloped down.'}`,
        };
    }
    if (next.kind === 'resized') {
        const L = next.L;
        const correct = bestCut(L);
        const seen = new Set([cm(correct)]);
        const wrong = [0.5, L / 4, L / 3, L / 8, L / 5].filter(w => !seen.has(cm(w)) && seen.add(cm(w))).slice(0, 3);
        const slot = (next.q * 3 + 1) % 4;
        const ordered = [...wrong];
        ordered.splice(slot, 0, correct);
        return {
            question: `For a ${cm(L)} sheet, which cut makes the biggest box?`,
            options: ordered.map(x => `x = ${cm(x)}`),
            correct: slot,
            because: `V′(x) = (L − 2x)(L − 6x) vanishes inside the sheet only at x = L/6 = ${cm(correct)}. The best cut scales with the sheet; it is not always 5 cm.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'For V(x) = x(30 − 2x)² (a 30 cm sheet, in cm), which cut gives the largest box?',
        options: ['x = 5 cm', 'x = 7.5 cm', 'x = 10 cm', 'x = 15 cm'],
        correct: 0,
        explanation: 'V′(x) = (30 − 2x)(30 − 6x) is zero at x = 5 and x = 15. x = 15 leaves no base (V = 0), so the maximum is at x = 5 cm: one sixth of the side, giving 5 × 20² = 2000 cm³ = 2 litres.',
    },
    {
        question: 'Why is finding V′(x) = 0 not quite the whole job?',
        options: [
            'Because V′ is never exactly zero',
            'A zero of V′ can be a maximum, a minimum or neither, and the ends of the allowed range must be checked too',
            'Because the derivative of a volume is an area',
            'It is the whole job — every zero of V′ is the answer',
        ],
        correct: 1,
        explanation: 'V′ = 0 gives candidates. Here x = 1.5 dm is also a zero of V′ but it is a minimum (V = 0) at the edge of the range. The sign of V′ on either side — or V″ — says which candidate wins.',
    },
    {
        question: 'At the best cut, what does the tangent line to the volume curve look like?',
        options: ['Vertical', 'Sloping up at 45°', 'Horizontal', 'It does not exist'],
        correct: 2,
        explanation: 'At an interior maximum the curve stops rising and starts falling, so its slope — the derivative — is 0 and the tangent is horizontal.',
    },
];

const codeExample = `import numpy as np

L = 3.0                                   # sheet side in dm (30 cm)
V  = lambda x: x * (L - 2 * x)**2         # litres
dV = lambda x: (L - 2 * x) * (L - 6 * x)  # V'(x)

# Brute force: try a fine grid of cuts
xs = np.linspace(0, L / 2, 10_001)
best = xs[np.argmax(V(xs))]
print(best, V(best))                      # 0.5  2.0

# Calculus: V'(x) = 0 at x = L/6 (and L/2, where the base vanishes)
print(L / 6, dV(L / 6), V(L / 6))         # 0.5  0.0  2.0`;

/* ── page ──────────────────────────────────────────────── */

/* The volume plot is stretched: 1 dm of cut is 1.5 units across, 1 litre
   is 0.5 units up, so sheets from 2 to 4 dm all fit. Tick labels show the
   real values. */
const XS = 1.5, YS = 0.5;
const G_X = [-0.35, 3.15];
const G_Y = [-0.45, 2.75];
const L_MIN = 2, L_MAX = 4;

function GraphTicks() {
    const { toScreen } = usePlane();
    const out = [];
    for (let x = 0.25; x <= 2.001; x += 0.25) {
        const [sx, sy] = toScreen([x * XS, 0]);
        out.push(<line key={`gx${x}`} x1={sx} y1={toScreen([0, G_Y[1]])[1]} x2={sx} y2={sy} stroke={MATH_COLORS.grid} />);
        if (Math.abs(x * 2 - Math.round(x * 2)) < 1e-9) out.push(<text key={`tx${x}`} x={sx} y={sy + 14} fontSize={11} textAnchor="middle" fill={MATH_COLORS.text}>{num(x)}</text>);
    }
    for (let v = 1; v <= 5; v++) {
        const [sx, sy] = toScreen([0, v * YS]);
        out.push(<line key={`gy${v}`} x1={sx} y1={sy} x2={toScreen([G_X[1], 0])[0]} y2={sy} stroke={MATH_COLORS.grid} />);
        out.push(<text key={`ty${v}`} x={sx - 6} y={sy + 4} fontSize={11} textAnchor="end" fill={MATH_COLORS.text}>{v}</text>);
    }
    return <g>{out}</g>;
}

function VolumeGraph({ L, x, tangent, signs, onDrag }) {
    const V = volume(L, x), m = dVolume(L, x);
    const line = (t) => [t * XS, YS * (V + m * (t - x))];
    const half = L / 2;
    const xb = bestCut(L);
    return (
        <Plane2D xRange={G_X} yRange={G_Y} grid={0} tickLabels={false} ariaLabel={`Volume against cut size for a ${num(L)} dm sheet`}>
            <GraphTicks />
            {signs && (
                <>
                    <Polygon points={[[0, -0.2], [xb * XS, -0.2], [xb * XS, -0.1], [0, -0.1]]} fill={MATH_COLORS.i} fillOpacity={0.6} strokeWidth={0} />
                    <Polygon points={[[xb * XS, -0.2], [half * XS, -0.2], [half * XS, -0.1], [xb * XS, -0.1]]} fill={MATH_COLORS.j} fillOpacity={0.6} strokeWidth={0} />
                    <Label at={[xb * XS / 2, -0.2]} anchor="middle" dy={14} color={MATH_COLORS.i} size={11}>V′ &gt; 0</Label>
                    <Label at={[(xb + half) * XS / 2, -0.2]} anchor="middle" dy={14} color={MATH_COLORS.j} size={11}>V′ &lt; 0</Label>
                    <Segment from={[xb * XS, 0]} to={[xb * XS, YS * bestVolume(L)]} color={MATH_COLORS.i} width={1.5} dashed />
                    <Label at={[xb * XS, YS * bestVolume(L)]} anchor="middle" dy={-10} color={MATH_COLORS.i} size={12} weight={700}>{`max ${num(bestVolume(L))} L`}</Label>
                </>
            )}
            <FunctionPlot f={(t) => YS * volume(L, t / XS)} domain={[0, half * XS]} color={MATH_COLORS.curve} />
            {tangent && <Segment from={line(Math.max(0, x - 0.45))} to={line(Math.min(half, x + 0.45))} color={MATH_COLORS.a} width={2.5} />}
            <Segment from={[x * XS, 0]} to={[x * XS, YS * V]} color={MATH_COLORS.a} width={1.2} dashed opacity={0.6} />
            <Point at={[x * XS, YS * V]} color={MATH_COLORS.a} r={6} label={`${num(V)} L`} onDrag={onDrag} snap={0.01}
                constrain={([px]) => { const c = Math.min(Math.max(px / XS, 0.01), half - 0.01); return [c * XS, YS * volume(L, c)]; }}
                ariaLabel={`Cut of ${cm(x)} giving ${num(V)} litres; drag along the curve`} />
            <Label at={[G_X[1], G_Y[1]]} anchor="end" dx={-6} dy={16} color={MATH_COLORS.text} size={12}>volume (litres)</Label>
            <Label at={[G_X[1], 0]} anchor="end" dx={-6} dy={-6} color={MATH_COLORS.text} size={12}>cut x (dm)</Label>
        </Plane2D>
    );
}

/* The flat sheet, seen from above, drawn to scale (4 dm fills the frame). */
function SheetNet({ L, x }) {
    const S = 190 / L_MAX, side = L * S, cut = x * S;
    const o = (200 - side) / 2;
    const corners = [[o, o], [o + side - cut, o], [o, o + side - cut], [o + side - cut, o + side - cut]];
    return (
        <svg viewBox="0 0 200 200" width="100%" role="img" aria-label={`A ${cm(L)} sheet with ${cm(x)} squares cut from each corner`} className="block">
            <rect x={0} y={0} width={200} height={200} fill="#020617" />
            <rect x={o} y={o} width={side} height={side} fill="#1e3a8a" fillOpacity={0.35} stroke="#60a5fa" strokeWidth={1.5} />
            <rect x={o + cut} y={o + cut} width={side - 2 * cut} height={side - 2 * cut} fill="#38bdf8" fillOpacity={0.25} />
            {corners.map(([cx, cy], i) => <rect key={i} x={cx} y={cy} width={cut} height={cut} fill="#020617" stroke="#fb7185" strokeWidth={1.5} strokeDasharray="3 2" />)}
            {[o + cut, o + side - cut].map((p, i) => (
                <g key={i}>
                    <line x1={p} y1={o + cut} x2={p} y2={o + side - cut} stroke="#94a3b8" strokeDasharray="4 3" />
                    <line x1={o + cut} y1={p} x2={o + side - cut} y2={p} stroke="#94a3b8" strokeDasharray="4 3" />
                </g>
            ))}
            <text x={100} y={o - 4} textAnchor="middle" fontSize={11} fill="#94a3b8">{cm(L)}</text>
            <text x={100} y={100 + 4} textAnchor="middle" fontSize={11} fill="#e2e8f0">{`base ${cm(L - 2 * x)}`}</text>
            {cut > 10 && <text x={o + cut / 2} y={o + cut / 2 + 4} textAnchor="middle" fontSize={10} fill="#fb7185">x</text>}
        </svg>
    );
}

/* The folded box, in oblique projection, to the same scale as the sheet. */
function FoldedBox({ L, x }) {
    const S = 150 / L_MAX;
    const w = (L - 2 * x) * S, h = x * S;
    const k = 0.45, ca = Math.cos(Math.PI / 6), sa = Math.sin(Math.PI / 6);
    const P = (X, Y, Z) => [30 + X + k * Y * ca, 170 - Z - k * Y * sa];
    // toFixed: Math.cos can differ in its last bit between server and browser
    const poly = (pts) => pts.map(p => P(...p).map(v => v.toFixed(2)).join(',')).join(' ');
    return (
        <svg viewBox="0 0 200 200" width="100%" role="img" aria-label={`The folded box: ${cm(L - 2 * x)} square base, ${cm(x)} tall`} className="block">
            <rect x={0} y={0} width={200} height={200} fill="#020617" />
            <polygon points={poly([[0, w, 0], [w, w, 0], [w, w, h], [0, w, h]])} fill="#1e3a8a" fillOpacity={0.55} stroke="#60a5fa" />
            <polygon points={poly([[0, 0, 0], [0, w, 0], [0, w, h], [0, 0, h]])} fill="#1e40af" fillOpacity={0.5} stroke="#60a5fa" />
            <polygon points={poly([[0, 0, 0], [w, 0, 0], [w, w, 0], [0, w, 0]])} fill="#38bdf8" fillOpacity={0.3} stroke="#60a5fa" />
            <polygon points={poly([[w, 0, 0], [w, w, 0], [w, w, h], [w, 0, h]])} fill="#1d4ed8" fillOpacity={0.55} stroke="#60a5fa" />
            <polygon points={poly([[0, 0, 0], [w, 0, 0], [w, 0, h], [0, 0, h]])} fill="#2563eb" fillOpacity={0.35} stroke="#93c5fd" />
            <text x={100} y={192} textAnchor="middle" fontSize={11} fill="#e2e8f0">{`${num(volume(L, x))} litres`}</text>
        </svg>
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

export default function OptimizationPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [L, setL] = useState(SHEET);          // explore-mode state
    const [x, setX] = useState(0.3);
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
    const LL = guided ? step.L : L;
    // The cut can never reach half the sheet: there would be no base left.
    const XX = Math.min(Math.max(guided ? step.x : x, 0.01), LL / 2 - 0.01);
    const tangent = guided ? step.tangent ?? false : true;
    const signs = guided ? step.signs ?? false : false;

    /* Grabbing the point during the tour switches to Explore, starting from
       whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setL(step.L); setX(step.x);
        setMode('explore'); setIsPlaying(false);
    };

    const V = volume(LL, XX), dV = dVolume(LL, XX);
    const formula = useMemo(() => String.raw`V(${fmt(XX)}) = ${fmt(XX)}\,(${fmt(LL)} - 2 \cdot ${fmt(XX)})^2 = ${fmt(XX)} \times ${fmt(LL - 2 * XX)}^2 = ${fmt(V)} \text{ litres}`, [LL, XX, V]);
    const formulaD = useMemo(() => String.raw`V'(${fmt(XX)}) = (${fmt(LL)} - 2 \cdot ${fmt(XX)})(${fmt(LL)} - 6 \cdot ${fmt(XX)}) = (${fmt(LL - 2 * XX)})(${fmt(LL - 6 * XX)}) = ${fmt(dV)}`, [LL, XX, dV]);
    const hide = guided && predict.hideExplanation;

    const exploreNote = Math.abs(XX - bestCut(LL)) < 0.006
        ? `You are at the peak: V′ ≈ 0, the tangent is flat, and the box holds ${num(V)} litres — the most a ${cm(LL)} sheet can give.`
        : `${dV > 0 ? 'The tangent slopes up: cut a little more.' : 'The tangent slopes down: cut a little less.'} The best cut for a ${cm(LL)} sheet is L/6 = ${cm(bestCut(LL))}, holding ${num(bestVolume(LL))} litres.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/differential-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Differential Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Optimization</h1>
                    <p className="text-emerald-50 max-w-3xl">
                        Cut squares from the corners of a sheet and fold it into an open box. The biggest box sits exactly where the volume curve&apos;s tangent goes flat.
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
                                {guided ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Drag the point on the curve, or use the sliders'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">The sheet, from above</p>
                                <div className="rounded-lg overflow-hidden border border-slate-800"><SheetNet L={LL} x={XX} /></div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Folded into a box</p>
                                <div className="rounded-lg overflow-hidden border border-slate-800"><FoldedBox L={LL} x={XX} /></div>
                            </div>
                        </div>
                        <VolumeGraph L={LL} x={XX} tangent={tangent} signs={signs && !hide}
                            onDrag={([px]) => { takeOver(); setX(+(px / XS).toFixed(3)); }} />

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(v => !v)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="emerald" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-emerald-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ParamSlider label="Cut x" value={x} onChange={setX} min={0.01} max={L / 2 - 0.01} step={0.01} accent="emerald" format={cm} />
                                <ParamSlider label="Sheet side L" value={L} onChange={(v) => { setL(v); setX(c => Math.min(c, v / 2 - 0.01)); }} min={L_MIN} max={L_MAX} step={0.1} accent="emerald" format={cm} />
                                <button onClick={() => setX(+bestCut(L).toFixed(4))}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-emerald-500 sm:col-span-2 w-fit">
                                    Jump to where V′ = 0
                                </button>
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
                        <Tex block>{formula}</Tex>
                        {!hide && <Tex block>{formulaD}</Tex>}
                        <p className="text-xs text-slate-500">
                            V(x) = x(L − 2x)². By the product and chain rules V′(x) = (L − 2x)² − 4x(L − 2x) = (L − 2x)(L − 6x), which is zero at x = L/6.
                        </p>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The optimisation recipe</h2>
                        <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                            <li>Write the quantity as a function of one variable: <span className="text-sky-300">V(x) = x(L − 2x)²</span>.</li>
                            <li>Find where the derivative is zero: <span className="text-amber-300">V′(x) = 0</span>.</li>
                            <li>Check the candidates and the ends of the range: <span className="text-green-300">V′ changes + to −</span> at a maximum.</li>
                            <li>Answer in the problem&apos;s terms: cut <span className="text-emerald-300">L/6</span> from each corner.</li>
                        </ol>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-emerald-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
