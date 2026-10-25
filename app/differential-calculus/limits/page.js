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
   Every case approaches the same point, a = 1, so the three pictures differ
   only in what f does there. */
const A = 1;
const CASES = [
    {
        id: 'hole',
        name: 'Removable hole',
        text: '(x² − 1)/(x − 1)',
        tex: String.raw`f(x) = \dfrac{x^2 - 1}{x - 1}`,
        f: (x) => (x * x - 1) / (x - 1),
        left: 2, right: 2, valueAtA: null,
        note: 'At x = 1 this is 0/0, so f(1) does not exist. Everywhere else it equals x + 1.',
    },
    {
        id: 'jump',
        name: 'Jump',
        text: 'x + 0.5 for x < 1, and x − 1.5 for x ≥ 1',
        tex: String.raw`f(x) = \begin{cases} x + 0.5 & x < 1 \\ x - 1.5 & x \ge 1 \end{cases}`,
        f: (x) => (x < A ? x + 0.5 : x - 1.5),
        left: 1.5, right: -0.5, valueAtA: -0.5,
        note: 'Two straight pieces that do not meet. f(1) = −0.5 belongs to the right-hand piece.',
    },
    {
        id: 'asymptote',
        name: 'Vertical asymptote',
        text: '1/(x − 1)²',
        tex: String.raw`f(x) = \dfrac{1}{(x - 1)^2}`,
        f: (x) => 1 / ((x - 1) * (x - 1)),
        left: Infinity, right: Infinity, valueAtA: null,
        note: 'Dividing by a number close to 0 gives a huge number, and (x − 1)² gets as close to 0 as you like.',
    },
];

/** Plain-text number: Unicode minus, ∞ for the infinities. */
const num = (x, d = 3) => {
    if (x === Infinity) return '+∞';
    if (x === -Infinity) return '−∞';
    if (!Number.isFinite(x)) return 'undefined';
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 3);

/** f at x, or null where f is undefined (0/0 at the hole). */
const evalAt = (c, x) => {
    const y = c.f(x);
    return Number.isFinite(y) ? y : null;
};

/**
 * Does every x with 0 < |x − a| < δ give |f(x) − L| < ε? Checked by sampling
 * both sides densely, right up to (but never at) a. `worst` is the largest
 * deviation found.
 */
const bandCheck = (c, L, eps, delta, n = 2000) => {
    let worst = 0;
    for (let i = 1; i < n; i++) {
        const t = (delta * i) / n;
        for (const x of [A - t, A + t]) {
            const y = c.f(x);
            const dev = Number.isFinite(y) ? Math.abs(y - L) : Infinity;
            if (dev > worst) worst = dev;
        }
    }
    return { ok: worst < eps, worst };
};

const HS = [0.5, 0.1, 0.01];

/* The ε–δ challenges, in the order the tour plays them: a δ that works, a δ
   that is too wide, the δ that fixes it, a tighter ε, then the jump, where
   no δ is narrow enough. */
const BANDS = [
    { caseIndex: 0, L: 2, eps: 1, delta: 1 },
    { caseIndex: 0, L: 2, eps: 0.5, delta: 1 },
    { caseIndex: 0, L: 2, eps: 0.5, delta: 0.5 },
    { caseIndex: 0, L: 2, eps: 0.1, delta: 0.1 },
    { caseIndex: 1, L: 1.5, eps: 0.5, delta: 0.5 },
    { caseIndex: 1, L: 1.5, eps: 0.5, delta: 0.1 },
];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    const push = (s) => steps.push({ probe: null, side: null, L: null, eps: null, delta: null, left: [], right: [], ...s });
    push({
        kind: 'opening', caseIndex: 0,
        explanation: 'A limit asks where f(x) is heading as x gets close to a — not what f(a) happens to be. Here a = 1. We will walk towards it from the left and from the right, three different ways.',
    });
    CASES.forEach((c, caseIndex) => {
        const left = [], right = [];
        push({ kind: 'intro', caseIndex, explanation: `${c.name}: f(x) = ${c.text}. ${c.note}` });
        HS.forEach((h, k) => {
            const x = A - h;
            left.push([x, evalAt(c, x)]);
            const tail = k === HS.length - 1 ? ` From the left, f(x) is heading to ${num(c.left)}.` : '';
            push({
                kind: 'left', caseIndex, probe: x, side: 'left', k, left: [...left],
                explanation: `From the left: x = ${num(x)}, ${num(h)} short of 1, gives f(x) = ${num(evalAt(c, x))}.${tail}`,
            });
        });
        HS.forEach((h, k) => {
            const x = A + h;
            right.push([x, evalAt(c, x)]);
            const tail = k === HS.length - 1 ? ` From the right, f(x) is heading to ${num(c.right)}.` : '';
            push({
                kind: 'right', caseIndex, probe: x, side: 'right', k, left: [...left], right: [...right],
                explanation: `From the right: x = ${num(x)}, ${num(h)} past 1, gives f(x) = ${num(evalAt(c, x))}.${tail}`,
            });
        });
        const verdict = {
            hole: 'Both sides head to 2, so lim x→1 f(x) = 2 — even though f(1) does not exist. The hole is "removable": defining f(1) = 2 would fill it.',
            jump: 'The left side heads to 1.5 and the right side to −0.5. They disagree, so lim x→1 f(x) does not exist — even though f(1) = −0.5 is perfectly defined.',
            asymptote: 'Both sides grow without bound. No number L is being approached, so there is no limit; we write lim x→1 f(x) = +∞ to say how it fails.',
        }[c.id];
        push({ kind: 'verdict', caseIndex, left: [...left], right: [...right], explanation: verdict });
    });
    push({
        kind: 'bandIntro', caseIndex: 0, L: 2,
        explanation: '"Close" is vague, so here is the precise version. A challenger picks a tolerance ε > 0: the green band L ± ε. You must answer with a δ > 0 so that every x within δ of 1 (except 1 itself) has f(x) inside the band.',
    });
    BANDS.forEach((b, bandIndex) => {
        const c = CASES[b.caseIndex];
        const { ok, worst } = bandCheck(c, b.L, b.eps, b.delta);
        const base = { caseIndex: b.caseIndex, L: b.L, eps: b.eps, delta: b.delta, bandIndex };
        push({
            ...base, kind: 'band',
            explanation: `${c.name}, candidate L = ${num(b.L)}. The challenger picks ε = ${num(b.eps)}, so the band is ${num(b.L - b.eps)} < y < ${num(b.L + b.eps)}. Try δ = ${num(b.delta)}: the blue strip is every x with 0 < |x − 1| < ${num(b.delta)}.`,
        });
        const why = ok
            ? `Every point of the graph above the strip stays inside the band, so δ = ${num(b.delta)} answers ε = ${num(b.eps)}.`
            : b.caseIndex === 1
                ? `The right-hand piece sits near −0.5, a full 2 below the band, however thin the strip is. No δ can answer this ε — which is exactly what "the limit is not 1.5" means.`
                : `Near the edges of the strip f(x) gets ${num(worst, 2)} away from 2, outside the band. δ is too wide for this ε.`;
        push({ ...base, kind: 'bandResult', ok, worst, explanation: why });
    });
    push({
        kind: 'closing', caseIndex: 0, L: 2, eps: 0.25, delta: 0.25,
        explanation: 'For the hole, δ = ε answers every challenge, so lim x→1 f(x) = 2 in the precise sense. For the jump, a small enough ε defeats every δ. Switch to Explore to set ε, δ and L yourself.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Three questions: where one side is heading (asked before that side's walk
   starts), whether the limit exists (asked before the verdict), and whether
   a proposed δ answers an ε (asked before the result is coloured in).

   The one-sided answers are 2, 1.5 and +∞ from the left and 2, −0.5 and +∞
   from the right. '2' and '+∞' are each right a third of the time, so both
   are offered on every one-sided prompt — otherwise their mere presence
   would give them away. */
const ONE_SIDED_FILLERS = ['1.5', '−0.5', '−∞', '0', '1'];
const VERDICT_OPTIONS = ['The limit is 2', 'The limit is 1.5', 'No limit: the two sides disagree', 'No limit: f(x) grows without bound'];

const placeAt = (correct, wrong, slot) => {
    const ordered = [...wrong];
    ordered.splice(slot, 0, correct);
    return { options: ordered, correct: slot };
};

const predictFor = (step, next) => {
    if (!step || !next) return null;
    const c = CASES[step.caseIndex];
    // Before a side's walk: the intro step (left) or the last left step (right).
    if ((next.kind === 'left' || next.kind === 'right') && next.k === 0) {
        const side = next.kind;
        const truth = num(side === 'left' ? c.left : c.right);
        const promptIndex = step.caseIndex * 2 + (side === 'right' ? 1 : 0);
        const wrong = ['2', '+∞'].filter(l => l !== truth);
        for (let i = 0; wrong.length < 3; i++) {
            const l = ONE_SIDED_FILLERS[(promptIndex + i) % ONE_SIDED_FILLERS.length];
            if (l !== truth && !wrong.includes(l)) wrong.push(l);
        }
        const slot = (promptIndex * 3 + 1) % 4;
        return {
            question: `${c.name}. As x → 1 from the ${side}, what value is f(x) heading towards?`,
            ...placeAt(truth, wrong, slot),
            because: side === 'left'
                ? `Read the graph just left of x = 1: f(0.99) = ${num(evalAt(c, 0.99))}, so from the left f(x) → ${truth}.`
                : `Read the graph just right of x = 1: f(1.01) = ${num(evalAt(c, 1.01))}, so from the right f(x) → ${truth}.`,
        };
    }
    if (next.kind === 'verdict') {
        const truth = { hole: VERDICT_OPTIONS[0], jump: VERDICT_OPTIONS[2], asymptote: VERDICT_OPTIONS[3] }[c.id];
        const slot = (step.caseIndex * 3 + 2) % 4;
        return {
            question: `Left: f(x) → ${num(c.left)}. Right: f(x) → ${num(c.right)}. So what is lim x→1 f(x)?`,
            ...placeAt(truth, VERDICT_OPTIONS.filter(o => o !== truth), slot),
            because: c.id === 'hole'
                ? 'Both sides agree on 2. What happens at x = 1 itself never matters to a limit.'
                : c.id === 'jump'
                    ? 'A limit needs both sides to head to the same number. 1.5 and −0.5 are different.'
                    : 'Both sides agree, but on growing without bound — there is no number L, so no limit.',
        };
    }
    if (step.kind === 'band' && next.kind === 'bandResult') {
        const truth = next.ok ? 'Yes, it stays inside the band' : 'No, part of it escapes';
        const other = next.ok ? 'No, part of it escapes' : 'Yes, it stays inside the band';
        return {
            question: `ε = ${num(step.eps)}, δ = ${num(step.delta)}. Does every point above the blue strip stay inside the green band?`,
            ...placeAt(truth, [other], step.bandIndex % 2),
            because: next.ok
                ? `Inside the strip f(x) is within ${num(step.delta)} of ${num(step.L)}, and that is no more than ε = ${num(step.eps)}.`
                : step.caseIndex === 1
                    ? 'The right-hand piece is near −0.5, nowhere near the band, however thin the strip.'
                    : `The strip is wider than the band allows: at its edges f(x) is about ${num(next.worst, 2)} from ${num(step.L)}.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'f(x) = (x² − 4)/(x − 2) is undefined at x = 2. What is lim x→2 f(x)?',
        options: ['It does not exist, because f(2) is undefined', '0', '4', '2'],
        correct: 2,
        explanation: 'For x ≠ 2, (x² − 4)/(x − 2) = x + 2, which heads to 4 from both sides. The missing point at x = 2 is a removable hole; it does not stop the limit from existing.',
    },
    {
        question: 'As x → 3 from the left f(x) → 5, from the right f(x) → 5, and f(3) = 9. What is lim x→3 f(x)?',
        options: ['9', '5', 'It does not exist', '7'],
        correct: 1,
        explanation: 'Both one-sided limits agree on 5, so the limit is 5. The value f(3) = 9 is irrelevant to the limit — it only tells you f is not continuous at 3.',
    },
    {
        question: 'In the ε–δ definition of lim x→a f(x) = L, what has to happen?',
        options: [
            'You choose δ first, then show some ε works',
            'For every ε > 0 the challenger picks, you can answer with a δ > 0 that keeps f(x) within ε of L',
            'ε and δ must always be equal',
            'f(a) must equal L',
        ],
        correct: 1,
        explanation: 'The challenger moves first and can pick any tolerance ε, however small. The limit is L when you can always reply with a δ that keeps every x within δ of a (other than a itself) inside L ± ε. δ = ε happens to work for f(x) = x + 1, but usually δ depends on ε in some other way.',
    },
];

const codeExample = `def f(x):
    return (x**2 - 1) / (x - 1)    # 0/0 at x = 1

# Walk towards 1 from both sides:
for h in [0.5, 0.1, 0.01, 0.001, 1e-6]:
    print(f"h={h:<8} left: {f(1 - h):.6f}   right: {f(1 + h):.6f}")
# both columns head to 2, so lim x->1 f(x) = 2

# epsilon-delta: for this f, |f(x) - 2| = |x - 1|, so delta = eps works.
def answers(eps, delta, L=2, a=1, n=10_000):
    xs = [a + s * delta * i / n for i in range(1, n) for s in (-1, 1)]
    return all(abs(f(x) - L) < eps for x in xs)

print(answers(0.5, 0.5))   # True
print(answers(0.5, 1.0))   # False: delta too wide`;

/* ── page ──────────────────────────────────────────────── */

const X_RANGE = [-1.5, 3.5];
const Y_RANGE = [-2, 3];

/** A hollow circle: a point that is missing from the graph. */
function OpenDot({ at, color }) {
    const { toScreen } = usePlane();
    const [sx, sy] = toScreen(at);
    return <circle cx={sx} cy={sy} r={5.5} fill="#020617" stroke={color} strokeWidth={2.5} />;
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

export default function LimitsPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1300);
    const [caseIndex, setCaseIndex] = useState(0);         // explore-mode state
    const [probe, setProbe] = useState(0.8);
    const [L, setL] = useState(2);
    const [eps, setEps] = useState(0.5);
    const [delta, setDelta] = useState(0.5);
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
    const ci = guided ? step.caseIndex : caseIndex;
    const c = CASES[ci];
    const shownProbe = guided ? step.probe : probe;
    const hasBand = !guided || step.eps !== null;
    const bandL = guided ? step.L : L;
    const bandEps = guided ? step.eps : eps;
    const bandDelta = guided ? step.delta : delta;
    const band = hasBand ? { L: bandL, eps: bandEps, delta: bandDelta } : null;
    // Guided band steps leave the verdict uncoloured until the result step.
    const hideVerdict = guided && step.kind === 'band';
    const result = useMemo(() => {
        if (!hasBand || hideVerdict) return null;
        return bandCheck(c, bandL, bandEps, bandDelta, 800);
    }, [hasBand, hideVerdict, c, bandL, bandEps, bandDelta]);

    /* Grabbing a control during the tour switches to Explore, starting from
       whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setCaseIndex(step.caseIndex);
        setProbe(step.probe ?? 0.8);
        if (step.eps !== null) { setL(step.L); setEps(step.eps); setDelta(step.delta); }
        else { setL(Number.isFinite(CASES[step.caseIndex].left) ? CASES[step.caseIndex].left : 2); }
        setMode('explore'); setIsPlaying(false);
    };

    const probeY = shownProbe === null ? null : evalAt(c, shownProbe);
    const clampY = (y) => Math.min(Math.max(y, Y_RANGE[0] + 0.15), Y_RANGE[1] - 0.15);
    const bandColor = result ? (result.ok ? MATH_COLORS.i : MATH_COLORS.negative) : MATH_COLORS.a;

    const tableLeft = guided ? step.left : [];
    const tableRight = guided ? step.right : [];

    const formulaProbe = shownProbe === null
        ? null
        : probeY === null
            ? String.raw`f(${fmt(shownProbe)}) \text{ is undefined } (0/0)`
            : String.raw`f(${fmt(shownProbe)}) = ${fmt(probeY)}, \quad |x - 1| = ${fmt(Math.abs(shownProbe - A))}`;
    const formulaSides = String.raw`\lim_{x \to 1^-} f(x) = ${texNum(c.left, 2)}, \qquad \lim_{x \to 1^+} f(x) = ${texNum(c.right, 2)}`;
    const formulaBand = band
        ? String.raw`0 < |x - 1| < ${fmt(band.delta)} \;\Longrightarrow\; |f(x) - ${fmt(band.L)}| < ${fmt(band.eps)}`
            + (result ? String.raw`\quad ${result.ok ? String.raw`\textcolor{#4ade80}{\checkmark}` : String.raw`\textcolor{#fb7185}{\times}`}` : '')
        : null;
    const showSides = !guided || ['verdict', 'bandIntro', 'band', 'bandResult', 'closing'].includes(step.kind);

    const worstShown = result && Number.isFinite(result.worst) ? Math.floor(result.worst * 1000) / 1000 : null;
    const exploreNote = (() => {
        const sides = `From the left f(x) → ${num(c.left)}; from the right f(x) → ${num(c.right)}.`;
        if (!result) return sides;
        if (result.ok) return `${sides} With δ = ${num(delta)}, every f(x) stays within ${num(eps)} of ${num(L)} (the farthest is ${num(worstShown)}). Shrink ε and see whether some δ still answers it.`;
        return `${sides} Some x within δ = ${num(delta)} of 1 sends f(x) ${worstShown === null ? 'off to infinity' : `${num(worstShown)} away from ${num(L)}`} — outside the band. ${c.id === 'hole' ? 'Make δ smaller.' : c.id === 'jump' ? 'For a small ε, no δ will work for any L.' : 'No L and δ can hold an unbounded function.'}`;
    })();

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/differential-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Differential Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Limits</h1>
                    <p className="text-emerald-50 max-w-3xl">
                        Where is f(x) heading as x closes in on a point? Walk in from both sides, meet a hole, a jump and an asymptote, then pin &quot;close&quot; down with an ε–δ band.
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
                                        onClick={() => { if (key === 'explore') takeOver(); else { setMode('guided'); } }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {guided ? `${c.name} · step ${currentStep + 1} of ${stepHistory.length}` : 'Drag the probe on the x-axis, or use the sliders'}
                            </span>
                        </div>

                        <Plane2D xRange={X_RANGE} yRange={Y_RANGE} ariaLabel={`Graph of f(x) = ${c.text} near x = 1`}>
                            {band && (
                                <>
                                    <Polygon points={[[A - band.delta, Y_RANGE[0]], [A + band.delta, Y_RANGE[0]], [A + band.delta, Y_RANGE[1]], [A - band.delta, Y_RANGE[1]]]}
                                        fill={MATH_COLORS.k} fillOpacity={0.12} strokeWidth={0} />
                                    <Polygon points={[[X_RANGE[0], band.L - band.eps], [X_RANGE[1], band.L - band.eps], [X_RANGE[1], band.L + band.eps], [X_RANGE[0], band.L + band.eps]]}
                                        fill={MATH_COLORS.i} fillOpacity={0.12} strokeWidth={0} />
                                    <Segment from={[X_RANGE[0], band.L]} to={[X_RANGE[1], band.L]} color={MATH_COLORS.i} width={1} dashed opacity={0.7} />
                                    <Label at={[X_RANGE[0] + 0.08, band.L + band.eps]} dy={-5} color={MATH_COLORS.i} size={12}>{`L + ε = ${num(band.L + band.eps)}`}</Label>
                                    <Label at={[A + band.delta, Y_RANGE[0]]} dx={4} dy={-8} color={MATH_COLORS.k} size={12}>{`1 + δ`}</Label>
                                </>
                            )}
                            {c.id === 'asymptote' && <Segment from={[A, Y_RANGE[0]]} to={[A, Y_RANGE[1]]} color={MATH_COLORS.axis} width={1.5} dashed />}
                            <FunctionPlot f={c.f} domain={[X_RANGE[0], A - 1e-4]} color={MATH_COLORS.curve} />
                            <FunctionPlot f={c.f} domain={[A + 1e-4, X_RANGE[1]]} color={MATH_COLORS.curve} />
                            {band && (
                                <>
                                    <FunctionPlot f={c.f} domain={[A - band.delta, A - 1e-4]} color={bandColor} width={4} samples={150} />
                                    <FunctionPlot f={c.f} domain={[A + 1e-4, A + band.delta]} color={bandColor} width={4} samples={150} />
                                </>
                            )}
                            {c.id === 'hole' && <OpenDot at={[A, 2]} color={MATH_COLORS.curve} />}
                            {c.id === 'jump' && (
                                <>
                                    <OpenDot at={[A, 1.5]} color={MATH_COLORS.curve} />
                                    <Point at={[A, -0.5]} color={MATH_COLORS.curve} r={5} />
                                </>
                            )}
                            {[...tableLeft, ...tableRight].map(([x, y]) => (
                                y !== null && y > Y_RANGE[0] && y < Y_RANGE[1] && <Point key={`t${x}`} at={[x, y]} color={MATH_COLORS.a} r={3} />
                            ))}
                            {shownProbe !== null && (
                                <>
                                    {probeY !== null && <Segment from={[shownProbe, 0]} to={[shownProbe, clampY(probeY)]} color={MATH_COLORS.a} width={1.5} dashed />}
                                    {probeY !== null && <Point at={[shownProbe, clampY(probeY)]} color={MATH_COLORS.a} r={5}
                                        label={probeY > Y_RANGE[1] - 0.15 ? `f = ${num(probeY, 1)} (off the top)` : `f = ${num(probeY)}`}
                                        labelOffset={shownProbe > A ? [8, -8] : [-8, -10]} />}
                                </>
                            )}
                            <Point at={[shownProbe ?? A, 0]} color={MATH_COLORS.result} r={6}
                                label={shownProbe === null ? 'a = 1' : `x = ${num(shownProbe)}`} labelOffset={[8, 18]}
                                onDrag={([x]) => { takeOver(); setProbe(Math.abs(x - A) < 1e-9 ? A + 0.01 : x); }}
                                constrain={([x]) => [x, 0]} snap={0.01}
                                ariaLabel={`Probe on the x-axis at ${num(shownProbe ?? A)}; drag or use the arrow keys`} />
                        </Plane2D>

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
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
                            <div className="mt-4 space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    {CASES.map((k, i) => (
                                        <button key={k.id} onClick={() => { setCaseIndex(i); setL(Number.isFinite(k.left) ? k.left : 2); }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === caseIndex ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-slate-700 text-slate-300 hover:border-emerald-500'}`}>
                                            {k.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ParamSlider label="Probe x" value={probe} onChange={(x) => setProbe(Math.abs(x - A) < 1e-9 ? A + 0.01 : x)} min={-1.5} max={3.5} step={0.01} accent="emerald" format={num} />
                                    <ParamSlider label="Candidate limit L" value={L} onChange={setL} min={-1} max={3} step={0.05} accent="emerald" format={num} />
                                    <ParamSlider label="ε (band half-height)" value={eps} onChange={setEps} min={0.05} max={1.5} step={0.05} accent="emerald" format={num} />
                                    <ParamSlider label="δ (strip half-width)" value={delta} onChange={setDelta} min={0.01} max={1.5} step={0.01} accent="emerald" format={num} />
                                </div>
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="emerald" />}

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p className="text-emerald-200 text-sm leading-relaxed">
                                {guided ? (predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation) : exploreNote}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-3 text-slate-100 text-sm sm:text-base">
                        <Tex block>{c.tex}</Tex>
                        {formulaProbe && <Tex block>{formulaProbe}</Tex>}
                        {showSides && <Tex block>{formulaSides}</Tex>}
                        {formulaBand && <Tex block>{formulaBand}</Tex>}
                        {guided && (tableLeft.length > 0 || tableRight.length > 0) && (
                            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                {[['From the left', tableLeft], ['From the right', tableRight]].map(([title, rows]) => (
                                    <div key={title}>
                                        <p className="text-slate-500 font-sans mb-1">{title}</p>
                                        {rows.map(([x, y]) => (
                                            <div key={x} className="flex justify-between border-b border-slate-800 py-0.5">
                                                <span className="text-slate-400">x = {num(x)}</span>
                                                <span className="text-amber-300">f = {num(y)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">When does a limit exist?</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-sky-300 font-semibold">Both sides agree</span> — the left and right limits are the same number L.</li>
                            <li><span className="text-amber-300 font-semibold">f(a) does not matter</span> — a hole or a different value at a changes nothing.</li>
                            <li><span className="text-rose-300 font-semibold">A jump</span> — the sides disagree, so there is no limit.</li>
                            <li><span className="text-rose-300 font-semibold">An asymptote</span> — f grows without bound; no number is approached.</li>
                            <li><span className="text-green-300 font-semibold">ε–δ</span> — every tolerance ε can be met by some δ.</li>
                        </ul>
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
