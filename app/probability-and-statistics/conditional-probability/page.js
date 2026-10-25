"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Dices, SquareSplitHorizontal, Filter,
} from 'lucide-react';
import Plane2D, { Polygon, Point, Label, Segment } from '@/components/math/Plane2D';
import Tex, { texNum } from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Conditioning on B throws away every outcome outside B and rescales what is
   left so it sums to 1: P(A | B) = P(A ∩ B) / P(B). On the dice grid that is
   a count inside B; in the area model it is the share of B's strip that A
   covers. */
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (num, den) => { if (num === 0) return '0'; if (num === den) return '1'; const g = gcd(num, den); return `${num / g}/${den / g}`; };
const diceSpace = () => { const out = []; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) out.push({ key: `${a},${b}`, dice: [a, b] }); return out; };
const DICE = diceSpace();

const EVENTS = {
    six: { label: 'at least one 6', test: (o) => o.dice[0] === 6 || o.dice[1] === 6 },
    high: { label: 'sum is 10 or more', test: (o) => o.dice[0] + o.dice[1] >= 10 },
    sum7: { label: 'sum is 7', test: (o) => o.dice[0] + o.dice[1] === 7 },
    firstEven: { label: 'red die is even', test: (o) => o.dice[0] % 2 === 0 },
    doubles: { label: 'doubles', test: (o) => o.dice[0] === o.dice[1] },
    redFour: { label: 'red die shows 4', test: (o) => o.dice[0] === 4 },
};
const keysOf = (test) => new Set(DICE.filter(test).map(o => o.key));
/** |A|, |B|, |A ∩ B| for two sets of outcome keys. */
const counts = (A, B) => ({ a: A.size, b: B.size, ab: [...A].filter(k => B.has(k)).length });

/** The area model: everything follows from P(B), P(A | B) and P(A | Bᶜ). */
const areaModel = (pB, pAgB, pAgNB) => {
    const pAB = pB * pAgB;                 // A ∩ B
    const pANB = (1 - pB) * pAgNB;         // A ∩ Bᶜ
    const pA = pAB + pANB;                 // the law of total probability
    return { pAB, pANB, pA, pBgA: pA > 0 ? pAB / pA : 0 };
};
const round2 = (x) => Math.round(x * 100) / 100;

/* ── guided tour ───────────────────────────────────────── */

const RAIN = { pB: 0.3, pAgB: 0.9, pAgNB: 0.2 };

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const dice = (A, B, cond, explanation, extra = {}) => steps.push({ part: 'dice', A, B, cond, explanation, question: null, ask: null, ...extra });
    const area = (cond, explanation, extra = {}) => steps.push({ part: 'area', ...RAIN, cond, show: 'all', explanation, question: null, ask: null, ...extra });

    dice('high', null, false, 'Two dice. Event A: the sum is 10 or more — 6 of the 36 outcomes, so P(A) = 6/36 = 1/6.');
    dice('high', 'six', false, 'A friend peeks and tells you one thing: at least one die shows a 6. That is event B, outlined in blue.', { question: 'remaining', ask: ask++ });
    dice('high', 'six', true, 'Everything outside B is now impossible, so it drops out. The sample space has shrunk to the 11 outcomes of B, and each of them is now equally likely, with probability 1/11.',
        { question: 'inside', ask: ask++ });
    dice('high', 'six', true, 'Five of those 11 have a sum of 10 or more: (4, 6), (5, 6), (6, 4), (6, 5) and (6, 6). (5, 5) sums to 10 as well, but it has no 6, so the hint ruled it out. P(A | B) = 5/11 ≈ 0.45, far more than the 1/6 you had before the hint.');
    dice('high', 'six', true, 'As a formula: P(A | B) = P(A ∩ B) / P(B) = (5/36) / (11/36) = 5/11. Dividing by P(B) is what rescales the shrunken space so it adds up to 1 again.');
    area(false, 'The same idea with areas. The square is every day of the year (area 1). It rains on 30% of days: B is the left strip, width 0.3. On rainy days 90% of people carry an umbrella (A); on dry days, 20% do.',
        { question: 'joint', ask: ask++ });
    area(false, 'Rain and an umbrella is the bottom-left block: width 0.3, height 0.9, area 0.3 × 0.9 = 0.27. Multiplying a probability by a conditional probability gives a joint one: P(A ∩ B) = P(B) · P(A | B).',
        { show: 'joint' });
    area(false, 'Now count every umbrella, rain or not.', { question: 'total', ask: ask++ });
    area(false, 'Both umbrella blocks: 0.27 + 0.7 × 0.2 = 0.27 + 0.14 = 0.41. Splitting A by whether B happened and adding the pieces is the law of total probability.',
        { show: 'A' });
    area(true, 'Condition on rain: throw away the dry strip and stretch the rainy one to fill the square. The umbrella block now covers 0.27 / 0.3 = 0.9 of it — P(A | B) — exactly the 90% we started from.');
    area(false, 'Turn the question round: given an umbrella, how likely is rain? Out of the 0.41 of umbrella area, 0.27 is rainy: P(B | A) = 0.27 / 0.41 ≈ 0.66. That is not P(A | B) = 0.9 — reversing a conditional changes it, which is what Bayes\' theorem is for.',
        { show: 'A' });
    area(false, 'Given B, divide by P(B): only B\'s part of the space is left. Switch to Explore to choose your own events on the dice grid, or drag the three splits of the square.');
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   How many outcomes survive the hint, how many of those are in A, the joint
   probability as an area (not the conditional, not the marginal), and the
   total probability (not the average of the two conditionals). */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    let correct, candidates, question, because, fmt = String;
    if (step.part === 'dice') {
        const A = keysOf(EVENTS[step.A].test), B = keysOf(EVENTS[step.B].test);
        const c = counts(A, B);
        if (step.question === 'remaining') {
            correct = c.b;
            candidates = [12, 6, 36 - c.b, c.b - 1];
            question = `Once you know "${EVENTS[step.B].label}", how many of the 36 outcomes are still possible?`;
            because = `Six with the red die on 6, six with the blue die on 6, but (6, 6) is counted in both: 6 + 6 − 1 = ${c.b}.`;
        } else {
            correct = c.ab;
            candidates = [c.a, c.ab + 1, c.b - c.ab, c.ab - 1, c.b, c.ab + 2];
            question = `Of the ${c.b} outcomes left, how many also have "${EVENTS[step.A].label}"?`;
            because = `(4, 6), (5, 6), (6, 4), (6, 5) and (6, 6): ${c.ab}. (5, 5) has a big sum but no 6, so it was ruled out.`;
        }
    } else {
        const m = areaModel(step.pB, step.pAgB, step.pAgNB);
        fmt = (x) => texNum(x, 2);
        if (step.question === 'joint') {
            correct = m.pAB;
            candidates = [step.pAgB, step.pB, m.pA, step.pB + step.pAgB - 1];
            question = 'What fraction of all days are rainy and umbrella days?';
            because = `The block is ${step.pB} wide and ${step.pAgB} tall: ${step.pB} × ${step.pAgB} = ${fmt(m.pAB)}.`;
        } else {
            correct = m.pA;
            candidates = [m.pAB, (step.pAgB + step.pAgNB) / 2, step.pAgNB, step.pAgB];
            question = 'What fraction of all days are umbrella days, rain or not?';
            because = `Add the two umbrella blocks: ${fmt(m.pAB)} + ${fmt(1 - step.pB)} × ${step.pAgNB} = ${fmt(m.pAB)} + ${fmt(m.pANB)} = ${fmt(m.pA)}.`;
        }
    }
    const seen = new Set([fmt(correct)]);
    const wrong = [];
    for (const cand of candidates) {
        if (wrong.length === 3) break;
        if (!(cand > 0) || seen.has(fmt(cand))) continue;
        seen.add(fmt(cand));
        wrong.push(cand);
    }
    const slot = (step.ask * 3 + 1) % 4;
    const ordered = [...wrong];
    ordered.splice(slot, 0, correct);
    return { question, options: ordered.map(fmt), correct: slot, because };
};

const quizQuestions = [
    {
        question: 'A card is drawn from a standard deck. Given that it is a face card (J, Q or K), what is the probability that it is a king?',
        options: ['1/13', '1/3', '4/52', '1/4'],
        correct: 1,
        explanation: 'The condition shrinks the space to the 12 face cards, 4 of which are kings: 4/12 = 1/3. Equivalently P(K ∩ face) / P(face) = (4/52) / (12/52).',
    },
    {
        question: 'P(A ∩ B) = 0.12 and P(B) = 0.4. What is P(A | B)?',
        options: ['0.048', '0.52', '0.12', '0.3'],
        correct: 3,
        explanation: 'P(A | B) = P(A ∩ B) / P(B) = 0.12 / 0.4 = 0.3. Of the 0.4 of the space that is B, 0.12 is also A.',
    },
    {
        question: 'Why is P(A | B) usually different from P(B | A)?',
        options: [
            'They divide the same overlap by different totals: P(B) for one, P(A) for the other',
            'They are always equal',
            'Because A and B are independent',
            'P(B | A) is always larger',
        ],
        correct: 0,
        explanation: 'Both start from P(A ∩ B). P(A | B) divides it by P(B), P(B | A) by P(A). They agree only when P(A) = P(B).',
    },
];

const codeExample = `from itertools import product
from fractions import Fraction

omega = list(product(range(1, 7), repeat=2))
A = {o for o in omega if sum(o) >= 10}        # sum is 10 or more
B = {o for o in omega if 6 in o}              # at least one 6

P = lambda E: Fraction(len(E), len(omega))
print(P(A))                     # 1/6 before the hint
print(len(A & B), len(B))       # 5 11: count inside the shrunken space
print(P(A & B) / P(B))          # 5/11 = P(A | B)

# Area model: P(B) = 0.3, P(A|B) = 0.9, P(A|not B) = 0.2
pB, pA_B, pA_nB = 0.3, 0.9, 0.2
pAB = pB * pA_B                         # 0.27
pA = pAB + (1 - pB) * pA_nB             # 0.41  (total probability)
print(round(pAB / pA, 3))               # 0.659 = P(B | A)`;

/* ── pictures ──────────────────────────────────────────── */

const W = 640;
const A_COLOR = '#e11d48', B_COLOR = '#0284c7', AB_COLOR = '#7c3aed';

/** The dice grid; with `cond`, everything outside B fades and B is the new space. */
function CondDiceGrid({ A, B, cond, onCell }) {
    const cell = 64, x0 = 110, y0 = 40;
    return (
        <svg viewBox={`0 0 ${W} ${y0 + 6 * cell + 16}`} width="100%" role="img" aria-label="The 36 outcomes of two dice" className="block select-none">
            <rect x={0} y={0} width={W} height={y0 + 6 * cell + 16} fill="#020617" rx={8} />
            <text x={x0 + 3 * cell} y={20} textAnchor="middle" fontSize={11} fill="#60a5fa">blue die 1 – 6</text>
            <text x={34} y={y0 + 3 * cell} textAnchor="middle" fontSize={11} fill="#f87171" transform={`rotate(-90, 34, ${y0 + 3 * cell})`}>red die 1 – 6</text>
            {DICE.map(o => {
                const [a, b] = o.dice;
                const inA = A.has(o.key), inB = B.has(o.key);
                const gone = cond && !inB;
                const fill = inA && inB ? AB_COLOR : inA ? A_COLOR : '#1e293b';
                return (
                    <g key={o.key} transform={`translate(${x0 + (b - 1) * cell}, ${y0 + (a - 1) * cell})`}
                        onClick={onCell ? () => onCell(o.key) : undefined} style={{ cursor: onCell ? 'pointer' : 'default' }}>
                        <rect x={3} y={3} width={cell - 6} height={cell - 6} rx={8} fill={fill} fillOpacity={gone ? 0.1 : inA ? 0.85 : 1}
                            stroke={inB ? B_COLOR : '#334155'} strokeWidth={inB ? 3 : 1} strokeOpacity={gone ? 0.2 : 1}
                            style={{ transition: 'fill-opacity .4s ease, stroke-opacity .4s ease' }} />
                        <text x={cell / 2} y={cell / 2 - 2} textAnchor="middle" fontSize={11} fill={gone ? '#334155' : '#94a3b8'}>{a},{b}</text>
                        <text x={cell / 2} y={cell / 2 + 14} textAnchor="middle" fontSize={15} fontWeight={700} fill={gone ? '#334155' : '#f8fafc'}>{a + b}</text>
                    </g>
                );
            })}
        </svg>
    );
}

/**
 * The unit square split by B (a vertical strip of width P(B)) and, within
 * each strip, by A. Three handles: the strip width, and A's height in each
 * strip. With `cond`, the B strip is stretched to fill the square.
 */
/* The "square" is drawn as a 1 × HY rectangle so it fits beside the text; heights
   are scaled by HY on the way in and divided by it on the way out. */
const HY = 0.62;

function AreaModel({ pB, pAgB, pAgNB, cond, show, onPB, onAgB, onAgNB }) {
    const m = areaModel(pB, pAgB, pAgNB);
    const sx = (x) => (cond ? x / pB : x);                 // stretch the B strip when conditioning
    const sy = (p) => p * HY;
    const hot = (block) => show === 'all' || (show === 'joint' && block === 'AB') || (show === 'A' && (block === 'AB' || block === 'ANB'));
    const op = (block) => (hot(block) ? 0.75 : 0.18);
    const clampY = (y) => Math.min(Math.max(y, 0), HY);
    return (
        <Plane2D xRange={[-0.06, 1.06]} yRange={[-0.14, HY + 0.1]} grid={0} axes={false} ariaLabel="Area model: the unit square split by B and by A">
            <Polygon points={[[0, 0], [sx(pB), 0], [sx(pB), sy(pAgB)], [0, sy(pAgB)]]} fill={AB_COLOR} fillOpacity={op('AB')} />
            <Polygon points={[[0, sy(pAgB)], [sx(pB), sy(pAgB)], [sx(pB), HY], [0, HY]]} fill={B_COLOR} fillOpacity={op('B')} />
            {!cond && <Polygon points={[[pB, 0], [1, 0], [1, sy(pAgNB)], [pB, sy(pAgNB)]]} fill={A_COLOR} fillOpacity={op('ANB')} />}
            {!cond && <Polygon points={[[pB, sy(pAgNB)], [1, sy(pAgNB)], [1, HY], [pB, HY]]} fill="#334155" fillOpacity={show === 'all' ? 0.5 : 0.18} />}
            <Polygon points={[[0, 0], [1, 0], [1, HY], [0, HY]]} fill="none" fillOpacity={0} stroke="#94a3b8" strokeWidth={1.5} />
            <Label at={[sx(pB) / 2, sy(pAgB) / 2]} anchor="middle" color="#f8fafc" size={13} weight={700}>{`A ∩ B = ${texNum(m.pAB, 3)}`}</Label>
            {!cond && pAgNB > 0.12 && <Label at={[(1 + pB) / 2, sy(pAgNB) / 2]} anchor="middle" color="#f8fafc" size={12} weight={700}>{`A ∩ Bᶜ = ${texNum(m.pANB, 3)}`}</Label>}
            <Label at={[sx(pB) / 2, -0.07]} anchor="middle" color="#60a5fa" size={12} weight={700}>{cond ? 'B, stretched to width 1' : `B: ${texNum(pB, 2)}`}</Label>
            {!cond && <Label at={[(1 + pB) / 2, -0.07]} anchor="middle" color="#94a3b8" size={12}>{`Bᶜ: ${texNum(1 - pB, 2)}`}</Label>}
            {!cond && <Segment from={[pB, 0]} to={[pB, HY]} color="#e2e8f0" width={2} />}
            {cond && <Label at={[0.5, HY + 0.05]} anchor="middle" color="#f0abfc" size={12} weight={700}>{`P(A | B) = ${texNum(pAgB, 3)} of the stretched strip`}</Label>}
            {!cond && <Point at={[pB, HY + 0.05]} color="#e2e8f0" r={6} onDrag={([x]) => onPB(x)} snap={0.05}
                constrain={([x]) => [Math.min(Math.max(x, 0.05), 0.95), HY + 0.05]} ariaLabel={`Drag to change P(B), now ${pB}`} />}
            <Point at={[sx(pB) / 2, sy(pAgB)]} color={AB_COLOR} r={6} onDrag={([, y]) => onAgB(y / HY)} snap={0.05 * HY}
                constrain={([, y]) => [sx(pB) / 2, clampY(y)]} ariaLabel={`Drag to change P(A given B), now ${pAgB}`} />
            {!cond && <Point at={[(1 + pB) / 2, sy(pAgNB)]} color={A_COLOR} r={6} onDrag={([, y]) => onAgNB(y / HY)} snap={0.05 * HY}
                constrain={([, y]) => [(1 + pB) / 2, clampY(y)]} ariaLabel={`Drag to change P(A given not B), now ${pAgNB}`} />}
        </Plane2D>
    );
}

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
                    className="text-sm px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-rose-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function ConditionalProbabilityPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1700);
    const [ex, setEx] = useState({ part: 'dice', aName: 'high', B: [...keysOf(EVENTS.six.test)], bName: 'six', cond: true, ...RAIN, areaCond: false });
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[currentStep];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
    const hiding = mode === 'guided' && predict.hideExplanation;

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const part = mode === 'guided' ? step.part : ex.part;
    const A = useMemo(() => keysOf(EVENTS[mode === 'guided' ? (step.A ?? 'high') : ex.aName].test), [mode, step, ex.aName]);
    const B = useMemo(() => (mode === 'guided' ? (step.B ? keysOf(EVENTS[step.B].test) : new Set()) : new Set(ex.B)), [mode, step, ex.B]);
    const cond = mode === 'guided' ? step.cond : (part === 'dice' ? ex.cond : ex.areaCond);
    const c = counts(A, B);
    const pB = mode === 'guided' ? (step.pB ?? RAIN.pB) : ex.pB;
    const pAgB = mode === 'guided' ? (step.pAgB ?? RAIN.pAgB) : ex.pAgB;
    const pAgNB = mode === 'guided' ? (step.pAgNB ?? RAIN.pAgNB) : ex.pAgNB;
    const m = areaModel(pB, pAgB, pAgNB);

    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        return step.part === 'dice'
            ? { ...ex, part: 'dice', aName: step.A, B: step.B ? [...keysOf(EVENTS[step.B].test)] : [], bName: step.B, cond: step.cond }
            : { ...ex, part: 'area', pB: step.pB, pAgB: step.pAgB, pAgNB: step.pAgNB, areaCond: step.cond };
    };
    const update = (fn) => setEx(fn(base()));
    const onCell = (key) => update(s => ({ ...s, B: s.B.includes(key) ? s.B.filter(k => k !== key) : [...s.B, key], bName: null }));
    const clamp01 = (v) => round2(Math.min(Math.max(v, 0), 1));

    const formula = part === 'dice'
        ? String.raw`P(A \mid B) = \frac{|A \cap B|}{|B|} = \frac{${c.ab}}{${c.b}}`
            + (c.b ? String.raw` \approx ${texNum(c.ab / c.b, 3)} \qquad \text{vs.}\; P(A) = \tfrac{${c.a}}{36} \approx ${texNum(c.a / 36, 3)}` : '')
        : String.raw`P(A \cap B) = P(B)\,P(A \mid B) = ${texNum(pB, 2)} \times ${texNum(pAgB, 2)} = ${texNum(m.pAB, 3)}`
            + String.raw` \\[4pt] P(A) = ${texNum(m.pAB, 3)} + ${texNum(1 - pB, 2)} \times ${texNum(pAgNB, 2)} = ${texNum(m.pA, 3)}, \quad P(B \mid A) = \frac{${texNum(m.pAB, 3)}}{${texNum(m.pA, 3)}} = \mathbf{${texNum(m.pBgA, 3)}}`;

    const explanation = mode === 'guided' ? step.explanation : part === 'dice'
        ? (c.b === 0
            ? 'B is empty — there is nothing to condition on. Click outcomes to put them in B.'
            : `Knowing B leaves ${c.b} outcomes, and ${c.ab} of them are in A (${EVENTS[ex.aName].label}). So P(A | B) = ${c.ab}/${c.b}${c.ab && frac(c.ab, c.b) !== `${c.ab}/${c.b}` ? ` = ${frac(c.ab, c.b)}` : ''} ≈ ${texNum(c.ab / c.b, 3)}, against P(A) = ${frac(c.a, 36)} without the hint. ${Math.abs(c.ab / c.b - c.a / 36) < 1e-9 ? 'They are equal: knowing B tells you nothing about A — the events are independent.' : ''} Click outcomes to change what you know.`)
        : `P(A ∩ B) = ${texNum(pB, 2)} × ${texNum(pAgB, 2)} = ${texNum(m.pAB, 3)} and P(A) = ${texNum(m.pA, 3)}. Reversed, P(B | A) = ${texNum(m.pBgA, 3)}${Math.abs(pAgB - pAgNB) < 1e-9 ? ' — and since A is equally likely in both strips, A and B are independent: P(B | A) = P(B).' : ', not P(A | B) = ' + texNum(pAgB, 2) + '.'} Drag the three white and coloured dots.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/probability-and-statistics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Probability and Statistics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Conditional Probability</h1>
                    <p className="text-rose-100 max-w-3xl">
                        New information rules outcomes out. Conditioning on B keeps only B and rescales it: P(A | B) is the share of B that A covers.
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
                                        onClick={() => { if (key === 'explore') setEx(base()); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Picture">
                                {[['dice', 'Dice', Dices], ['area', 'Area model', SquareSplitHorizontal]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={part === key} onClick={() => update(s => ({ ...s, part: key }))}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${part === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {part === 'dice' ? (
                            <CondDiceGrid A={A} B={B} cond={cond} onCell={onCell} />
                        ) : (
                            <AreaModel pB={pB} pAgB={pAgB} pAgNB={pAgNB} cond={cond} show={mode === 'guided' ? step.show : 'all'}
                                onPB={(v) => update(s => ({ ...s, pB: Math.min(Math.max(round2(v), 0.05), 0.95) }))}
                                onAgB={(v) => update(s => ({ ...s, pAgB: clamp01(v) }))}
                                onAgNB={(v) => update(s => ({ ...s, pAgNB: clamp01(v) }))} />
                        )}
                        <div className="flex flex-wrap gap-3 text-xs mt-3">
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-sm" style={{ background: A_COLOR }} />A{part === 'area' ? ' (umbrella)' : ''}</span>
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-sm border-2" style={{ borderColor: B_COLOR }} />B{part === 'area' ? ' (rain)' : ''}</span>
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-sm" style={{ background: AB_COLOR }} />A ∩ B</span>
                        </div>

                        {mode === 'guided' ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="rose" />
                                <span className="text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-rose-500" />
                                </label>
                            </div>
                        ) : part === 'dice' ? (
                            <div className="space-y-3 mt-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500 w-12">A</span>
                                    {Object.entries(EVENTS).map(([key, e]) => (
                                        <button key={key} onClick={() => setEx(s => ({ ...s, aName: key }))} aria-pressed={ex.aName === key}
                                            className={`text-xs px-2.5 py-1 rounded-lg border ${ex.aName === key ? 'border-rose-500 text-rose-200 bg-rose-500/10' : 'border-slate-700 text-slate-400 hover:border-rose-500'}`}>{e.label}</button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500 w-12">Given B</span>
                                    {Object.entries(EVENTS).map(([key, e]) => (
                                        <button key={key} onClick={() => setEx(s => ({ ...s, B: [...keysOf(e.test)], bName: key }))} aria-pressed={ex.bName === key}
                                            className={`text-xs px-2.5 py-1 rounded-lg border ${ex.bName === key ? 'border-sky-500 text-sky-200 bg-sky-500/10' : 'border-slate-700 text-slate-400 hover:border-sky-500'}`}>{e.label}</button>
                                    ))}
                                </div>
                                <button onClick={() => setEx(s => ({ ...s, cond: !s.cond }))} aria-pressed={ex.cond}
                                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${ex.cond ? 'border-sky-500 text-sky-200 bg-sky-500/10' : 'border-slate-700 text-slate-400 hover:border-sky-500'}`}>
                                    <Filter className="h-3.5 w-3.5" />Shrink to B
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => setEx(s => ({ ...s, areaCond: !s.areaCond }))} aria-pressed={ex.areaCond}
                                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${ex.areaCond ? 'border-sky-500 text-sky-200 bg-sky-500/10' : 'border-slate-700 text-slate-400 hover:border-sky-500'}`}>
                                    <Filter className="h-3.5 w-3.5" />Condition on B
                                </button>
                                <button onClick={() => setEx(s => ({ ...s, ...RAIN }))}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-500">Rain and umbrellas</button>
                                <button onClick={() => setEx(s => ({ ...s, pB: 0.4, pAgB: 0.5, pAgNB: 0.5 }))}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-500">Independent</button>
                            </div>
                        )}
                    </div>

                    {mode === 'guided' && predict.prompt && <PredictPrompt predict={predict} accent="rose" />}

                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                            <p className="text-rose-200 text-sm leading-relaxed">
                                {hiding ? 'Make your prediction above to reveal this step.' : explanation}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                        <div className="text-slate-100 text-sm sm:text-base">
                            {hiding ? <p className="text-sm text-slate-500">The formula is hidden until you answer.</p> : <Tex block>{formula}</Tex>}
                        </div>
                        {part === 'area' && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <ParamSlider label="P(B)" accent="rose" min={0.05} max={0.95} step={0.05} value={pB}
                                    onChange={(v) => update(s => ({ ...s, pB: v }))} />
                                <ParamSlider label="P(A | B)" accent="rose" min={0} max={1} step={0.05} value={pAgB}
                                    onChange={(v) => update(s => ({ ...s, pAgB: v }))} />
                                <ParamSlider label="P(A | Bᶜ)" accent="rose" min={0} max={1} step={0.05} value={pAgNB}
                                    onChange={(v) => update(s => ({ ...s, pAgNB: v }))} />
                            </div>
                        )}
                        {part === 'dice' && (
                            <p className="text-xs text-slate-500">
                                Click any outcome to add it to B or remove it. The count inside B is all that matters once B is known.
                            </p>
                        )}
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Three rules from one picture</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-rose-300 font-semibold">Definition</span> — P(A | B) = P(A ∩ B) / P(B).</li>
                            <li><span className="text-violet-300 font-semibold">Multiplication</span> — P(A ∩ B) = P(B) · P(A | B).</li>
                            <li><span className="text-sky-300 font-semibold">Total probability</span> — P(A) = P(A | B) P(B) + P(A | Bᶜ) P(Bᶜ).</li>
                            <li><span className="text-amber-300 font-semibold">Independence</span> — P(A | B) = P(A): knowing B changes nothing.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-rose-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
