"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle,
} from 'lucide-react';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Sets are bits: an element's membership is a mask (A = 1, B = 2, C = 4). A
   term of the formula is a mask t, meaning |the intersection of the sets in t|,
   with sign + for one set, − for two, + for three. A Venn region (a non-empty
   mask r) is counted once by every applied term t ⊆ r — so its tally is the
   sum of those signs, and with every term applied that sum is exactly 1. */
const popcount = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);
const signOf = (t) => (popcount(t) % 2 === 1 ? 1 : -1);
const termsFor = (k) => (k === 2 ? [1, 2, 3] : [1, 2, 4, 3, 5, 6, 7]);
const regionsFor = (k) => (k === 2 ? [1, 2, 3] : [1, 2, 4, 3, 5, 6, 7]);
const universe = (N) => Array.from({ length: N }, (_, i) => i + 1);
/** |intersection of the sets in t| — elements whose mask contains t. */
const sizeOf = (masks, t) => masks.filter(m => (m & t) === t).length;
const regionSize = (masks, r) => masks.filter(m => m === r).length;
const tallyOf = (r, applied) => applied.filter(t => (r & t) === t).reduce((s, t) => s + signOf(t), 0);
const runningTotal = (masks, applied) => applied.reduce((s, t) => s + signOf(t) * sizeOf(masks, t), 0);
const unionSize = (masks) => masks.filter(m => m !== 0).length;
const divMember = (divisors) => (x) => divisors.reduce((m, d, i) => m | (x % d === 0 ? 1 << i : 0), 0);

const SHORT = ['A', 'B', 'C'];
const termLabel = (t, names = SHORT) => names.filter((_, i) => t & (1 << i)).join(' ∩ ');

/* ── scenarios and the guided tour ─────────────────────── */

const SCENARIOS = {
    div30: { N: 30, k: 3, names: ['A', 'B', 'C'], long: ['divisible by 2', 'divisible by 3', 'divisible by 5'], member: divMember([2, 3, 5]), unit: 'numbers' },
    class40: {
        N: 40, k: 2, names: ['M', 'P'], long: ['takes maths', 'takes physics'], unit: 'students',
        // students 1–16 maths only, 17–25 both, 26–34 physics only, 35–40 neither
        member: (x) => (x <= 16 ? 1 : x <= 25 ? 3 : x <= 34 ? 2 : 0),
    },
    div100: { N: 100, k: 3, names: ['A', 'B', 'C'], long: ['divisible by 2', 'divisible by 3', 'divisible by 5'], member: divMember([2, 3, 5]), unit: 'numbers' },
};
const masksOf = (sc) => universe(sc.N).map(sc.member);

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (scen, applied, explanation, extra = {}) => steps.push({ scen, applied, explanation, highlight: null, question: null, ask: null, ...extra });
    push('div30', [], 'Which of the numbers 1 to 30 are divisible by 2, 3 or 5? Call the three sets A, B and C. Each circle is a set; the badge in every region will show how many times that region has been counted so far.');
    push('div30', [1], 'Start by adding |A| = 15: the multiples of 2. Every region inside circle A is now counted once.');
    push('div30', [1, 2], 'Add |B| = 10, the multiples of 3. Running total 25 — but 6, 12, 18, 24 and 30 are in both A and B, so they have been counted twice.',
        { question: 'tally', target: 7, nextTerm: 4, ask: ask++ });
    push('div30', [1, 2, 4], 'Add |C| = 6. Running total 31, which is more than 22 numbers can be — the centre region, 30 itself, is now counted 3 times, and the pair-only regions twice.');
    push('div30', [1, 2, 4, 3], 'Subtract |A ∩ B| = 5 (the multiples of 6). Running total 26. The A ∩ B region drops back to 1 — and the centre drops to 2.');
    push('div30', [1, 2, 4, 3, 5], 'Subtract |A ∩ C| = 3 (the multiples of 10). Running total 23.',
        { question: 'tally', target: 7, nextTerm: 6, ask: ask++ });
    push('div30', [1, 2, 4, 3, 5, 6], 'Subtract |B ∩ C| = 2 (the multiples of 15). Running total 21. Every pair region is right again, but the centre was in all three pairs, so it has been subtracted three times: counted 3 − 3 = 0 times. 30 has vanished from the count.',
        { question: 'next-total', nextTerm: 7, ask: ask++ });
    push('div30', [1, 2, 4, 3, 5, 6, 7], 'Add back |A ∩ B ∩ C| = 1 (the multiples of 30). 15 + 10 + 6 − 5 − 3 − 2 + 1 = 22, and every region is counted exactly once.');
    push('div30', [1, 2, 4, 3, 5, 6, 7], 'Check from the outside: the 8 numbers divisible by none of 2, 3, 5 are 1, 7, 11, 13, 17, 19, 23 and 29, and 30 − 8 = 22.', { highlight: 0 });
    push('class40', [], 'A class of 40: 25 students take maths (M), 18 take physics (P), and 9 take both.');
    push('class40', [1, 2], '25 + 18 = 43 is more than the whole class: the 9 who take both were counted once in M and again in P.',
        { question: 'next-total', nextTerm: 3, ask: ask++ });
    push('class40', [1, 2, 3], '|M ∪ P| = 25 + 18 − 9 = 34 take at least one of the two. With two sets the formula is only add, add, subtract.',
        { question: 'neither', ask: ask++ });
    push('class40', [1, 2, 3], 'The rest take neither: 40 − 34 = 6. Counting the complement is often the point — "at least one" problems are usually solved this way.', { highlight: 0 });
    push('div100', [], 'Back to divisibility, now for 1 to 100, with the same three sets.', { question: 'union', ask: ask++ });
    push('div100', [1, 2, 4, 3, 5, 6, 7], '50 + 33 + 20 − 16 − 10 − 6 + 3 = 74. Each term is just ⌊100 / d⌋ for the product d of its divisors, so no number had to be listed.');
    push('div100', [1, 2, 4, 3, 5, 6, 7], 'Add the singles, subtract the pairs, add the triples: each region inside r sets is counted 1 − 1 + 1 … = 1 time in the end. Switch to Explore to toggle terms, change the divisors and click regions.');
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   How many times will the centre be counted after the next term (0–3), what
   the running total becomes, and complements. Wrong totals: the current
   running total, the plain sum of the sets, ±1, and the complement. */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    const sc = SCENARIOS[step.scen];
    const masks = masksOf(sc);
    const names = sc.names;
    let correct, candidates, question, because;
    const singles = termsFor(sc.k).filter(t => popcount(t) === 1).reduce((s, t) => s + sizeOf(masks, t), 0);
    if (step.question === 'tally') {
        const after = [...step.applied, step.nextTerm];
        correct = tallyOf(step.target, after);
        candidates = [0, 1, 2, 3];
        const sgn = signOf(step.nextTerm) > 0 ? 'Add' : 'Subtract';
        question = `${sgn} |${termLabel(step.nextTerm, names)}| next. How many times will the centre region (in all three sets) be counted then?`;
        because = `The centre lies inside ${termLabel(step.nextTerm, names)}, so this term changes its tally from ${tallyOf(step.target, step.applied)} to ${correct}.`;
    } else if (step.question === 'next-total') {
        const after = [...step.applied, step.nextTerm];
        correct = runningTotal(masks, after);
        const now = runningTotal(masks, step.applied);
        candidates = [now, singles, correct + 1, sc.N - correct, correct - 1];
        question = `${signOf(step.nextTerm) > 0 ? 'Add back' : 'Subtract'} |${termLabel(step.nextTerm, names)}| = ${sizeOf(masks, step.nextTerm)}. What is the running total then?`;
        because = `${now} ${signOf(step.nextTerm) > 0 ? '+' : '−'} ${sizeOf(masks, step.nextTerm)} = ${correct}.`;
    } else if (step.question === 'neither') {
        const u = unionSize(masks);
        correct = sc.N - u;
        candidates = [u, sizeOf(masks, 3), correct + 1, sc.N - singles];
        question = `How many of the ${sc.N} ${sc.unit} are in neither set?`;
        because = `${sc.N} − |${names.join(' ∪ ')}| = ${sc.N} − ${u} = ${correct}.`;
    } else {
        correct = unionSize(masks);
        const pairs = termsFor(sc.k).filter(t => popcount(t) === 2).reduce((s, t) => s + sizeOf(masks, t), 0);
        candidates = [singles, singles - pairs, sc.N - correct, correct - 1];
        question = `How many of 1 to ${sc.N} are divisible by 2, 3 or 5?`;
        because = `${termsFor(sc.k).map(t => `${signOf(t) > 0 ? '+' : '−'} ${sizeOf(masks, t)}`).join(' ').replace(/^\+ /, '')} = ${correct}.`;
    }
    const seen = new Set([correct]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (!Number.isInteger(c) || c < 0 || seen.has(c)) continue;
        seen.add(c);
        wrong.push(c);
    }
    const slot = (step.ask * 3 + 1) % 4;
    const ordered = [...wrong];
    ordered.splice(slot, 0, correct);
    return { question, options: ordered.map(String), correct: slot, because };
};

const quizQuestions = [
    {
        question: '|A| = 20, |B| = 15 and |A ∩ B| = 6. What is |A ∪ B|?',
        options: ['35', '41', '29', '9'],
        correct: 2,
        explanation: 'The 6 elements in both were counted once in A and again in B, so subtract them once: 20 + 15 − 6 = 29.',
    },
    {
        question: 'For three sets, why is |A ∩ B ∩ C| added back at the end?',
        options: [
            'Because it was never counted',
            'Its elements were added 3 times with the single sets and subtracted 3 times with the pairs, so they are counted 0 times until it is added back',
            'To make the formula symmetric',
            'Because the triple overlap is always empty',
        ],
        correct: 1,
        explanation: 'An element in all three sets is in |A|, |B| and |C| (+3) and in all three pairwise intersections (−3). Adding |A ∩ B ∩ C| gives it its single count.',
    },
    {
        question: 'How many of the numbers 1 to 60 are divisible by 3 or 4?',
        options: ['35', '20', '25', '30'],
        correct: 3,
        explanation: '⌊60/3⌋ + ⌊60/4⌋ − ⌊60/12⌋ = 20 + 15 − 5 = 30. The numbers divisible by both are the multiples of 12.',
    },
];

const codeExample = `from itertools import combinations
from math import lcm

def count_divisible(n, divisors):
    """How many of 1..n are divisible by at least one divisor."""
    total = 0
    for r in range(1, len(divisors) + 1):
        sign = 1 if r % 2 == 1 else -1          # +singles, -pairs, +triples, ...
        for group in combinations(divisors, r):
            total += sign * (n // lcm(*group))  # |intersection| = n // lcm
    return total

print(count_divisible(30, [2, 3, 5]))    # 22
print(count_divisible(100, [2, 3, 5]))   # 74

# Brute force agrees
print(sum(1 for x in range(1, 101) if x % 2 == 0 or x % 3 == 0 or x % 5 == 0))`;

/* ── picture ───────────────────────────────────────────── */

const W = 640;
const SET_COLORS = ['#e879f9', '#38bdf8', '#fbbf24'];
const REGION_COLORS = { 0: '#1e293b', 1: '#c026d3', 2: '#0284c7', 4: '#d97706', 3: '#7c3aed', 5: '#ea580c', 6: '#059669', 7: '#e11d48' };
const GEOM = {
    3: {
        H: 330,
        circles: [[250, 130], [390, 130], [320, 245]], r: 108,
        labels: { 1: [190, 110], 2: [450, 110], 4: [320, 300], 3: [320, 92], 5: [252, 214], 6: [388, 214], 7: [320, 168] },
        names: [[168, 36], [472, 36], [320, 362]],
    },
    2: {
        H: 300,
        circles: [[260, 150], [380, 150]], r: 115,
        labels: { 1: [200, 150], 2: [440, 150], 3: [320, 150] },
        names: [[200, 24], [440, 24]],
    },
};
const tallyColor = (t) => (t === 1 ? '#4ade80' : t === 0 ? '#94a3b8' : t > 1 ? '#fbbf24' : '#fb7185');

/**
 * The Venn diagram, each region painted as the intersection of its circles
 * minus the others (clip paths and masks), with the region's true size and
 * its tally. Clicking anywhere selects the region under the pointer.
 */
function Venn({ k, names, masks, applied, highlight, selected, hideOutside, onRegion }) {
    const g = GEOM[k];
    const H = g.H + (k === 3 ? 44 : 10);
    const inside = (x, y) => g.circles.reduce((m, [cx, cy], i) => m | (Math.hypot(x - cx, y - cy) <= g.r ? 1 << i : 0), 0);
    const onClick = (e) => {
        if (!onRegion) return;
        const svg = e.currentTarget.ownerSVGElement ?? e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        onRegion(inside(p.x, p.y));
    };
    const region = (r) => {
        let node = <rect x={0} y={0} width={W} height={H} fill={REGION_COLORS[r]} fillOpacity={selected === r || highlight === r ? 0.75 : 0.32} />;
        for (let i = 0; i < k; i++) {
            const id = r & (1 << i) ? `ie-c${i}` : `ie-n${i}`;
            node = r & (1 << i)
                ? <g clipPath={`url(#${id})`}>{node}</g>
                : <g mask={`url(#${id})`}>{node}</g>;
        }
        return <g key={`reg${r}`}>{node}</g>;
    };
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Venn diagram with region counts and tallies" className="block select-none">
            <defs>
                {g.circles.map(([cx, cy], i) => (
                    <React.Fragment key={i}>
                        <clipPath id={`ie-c${i}`}><circle cx={cx} cy={cy} r={g.r} /></clipPath>
                        <mask id={`ie-n${i}`}>
                            <rect x={0} y={0} width={W} height={H} fill="white" />
                            <circle cx={cx} cy={cy} r={g.r} fill="black" />
                        </mask>
                    </React.Fragment>
                ))}
            </defs>
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} onClick={onClick} style={{ cursor: onRegion ? 'pointer' : 'default' }} />
            <g onClick={onClick} style={{ cursor: onRegion ? 'pointer' : 'default' }}>
                {regionsFor(k).map(region)}
                {g.circles.map(([cx, cy], i) => (
                    <circle key={`o${i}`} cx={cx} cy={cy} r={g.r} fill="none" stroke={SET_COLORS[i]} strokeWidth={2.5} />
                ))}
            </g>
            {g.circles.map((_, i) => (
                <text key={`nm${i}`} x={g.names[i][0]} y={g.names[i][1]} textAnchor="middle" fontSize={13} fontWeight={700} fill={SET_COLORS[i]}>
                    {names[i]} · {sizeOf(masks, 1 << i)}
                </text>
            ))}
            {regionsFor(k).map(r => {
                const [x, y] = g.labels[r];
                const t = tallyOf(r, applied);
                return (
                    <g key={`lb${r}`} transform={`translate(${x}, ${y})`} pointerEvents="none">
                        <text y={-2} textAnchor="middle" fontSize={15} fontWeight={800} fill="#f8fafc">{regionSize(masks, r)}</text>
                        <g transform="translate(0, 14)">
                            <rect x={-17} y={-9} width={34} height={17} rx={8} fill="#020617" fillOpacity={0.85} stroke={tallyColor(t)} />
                            <text y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill={tallyColor(t)}>×{t}</text>
                        </g>
                    </g>
                );
            })}
            <g pointerEvents="none">
                <text x={W - 14} y={H - 14} textAnchor="end" fontSize={12} fill={highlight === 0 || selected === 0 ? '#f8fafc' : '#64748b'}>
                    outside every circle: {hideOutside ? '?' : regionSize(masks, 0)}
                </text>
            </g>
        </svg>
    );
}

/** Every element of the universe, coloured by its region; click one to find its region. */
function ElementGrid({ masks, focusMask, picked, onPick }) {
    const N = masks.length;
    const cols = N <= 40 ? 10 : 20;
    const rows = Math.ceil(N / cols);
    const cw = (W - 24) / cols, ch = 24;
    return (
        <svg viewBox={`0 0 ${W} ${rows * ch + 16}`} width="100%" role="img" aria-label={`The elements 1 to ${N}, coloured by region`} className="block select-none mt-3">
            {masks.map((m, i) => {
                const x = 12 + (i % cols) * cw, y = 8 + Math.floor(i / cols) * ch;
                const on = focusMask === null || focusMask === undefined || m === focusMask;
                return (
                    <g key={i} transform={`translate(${x}, ${y})`} onClick={onPick ? () => onPick(i + 1, m) : undefined} style={{ cursor: onPick ? 'pointer' : 'default' }}>
                        <rect width={cw - 3} height={ch - 4} rx={4} fill={REGION_COLORS[m]} fillOpacity={on ? (m === 0 ? 0.7 : 0.8) : 0.15}
                            stroke={picked === i + 1 ? '#ffffff' : 'none'} strokeWidth={2} />
                        <text x={(cw - 3) / 2} y={(ch - 4) / 2 + 4} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={on ? '#f8fafc' : '#475569'}>{i + 1}</text>
                    </g>
                );
            })}
        </svg>
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
                    className="text-sm px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-fuchsia-500';
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
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

const regionName = (r, k, names) => {
    if (r === 0) return `outside every set`;
    const ins = names.slice(0, k).filter((_, i) => r & (1 << i));
    const outs = names.slice(0, k).filter((_, i) => !(r & (1 << i)));
    return `${ins.join(' ∩ ')}${outs.length ? `, not ${outs.join(' or ')}` : ''}`;
};

export default function InclusionExclusionPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1600);
    const [ex, setEx] = useState({ k: 3, N: 30, divisors: [2, 3, 5], applied: [1, 2, 4, 3, 5, 6, 7], selected: null, picked: null });
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

    const guidedSc = SCENARIOS[step.scen];
    const exploreNames = ex.divisors.slice(0, ex.k).map((d, i) => `${SHORT[i]}: ÷${d}`);
    const k = mode === 'guided' ? guidedSc.k : ex.k;
    const names = mode === 'guided' ? guidedSc.names : SHORT.slice(0, ex.k);
    const masks = useMemo(() => (mode === 'guided'
        ? masksOf(guidedSc)
        : universe(ex.N).map(divMember(ex.divisors.slice(0, ex.k)))), [mode, guidedSc, ex.N, ex.divisors, ex.k]);
    const applied = mode === 'guided' ? step.applied : ex.applied;
    const total = runningTotal(masks, applied);
    const truth = unionSize(masks);

    /* Clicking the picture during the tour switches to Explore. A divisibility
       scene carries over exactly; the class scene becomes the default sets. */
    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        if (step.scen === 'class40') return { k: 2, N: 40, divisors: [2, 3, 5], applied: [...step.applied], selected: null, picked: null };
        return { k: 3, N: guidedSc.N, divisors: [2, 3, 5], applied: [...step.applied], selected: null, picked: null };
    };
    const update = (fn) => setEx(fn(base()));
    const toggleTerm = (t) => update(s => ({ ...s, applied: s.applied.includes(t) ? s.applied.filter(x => x !== t) : termsFor(s.k).filter(x => x === t || s.applied.includes(x)) }));
    const onRegion = (r) => update(s => ({ ...s, selected: s.selected === r ? null : r, picked: null }));
    const onPick = (x, m) => update(s => ({ ...s, picked: x, selected: m }));
    const setK = (v) => update(s => ({ ...s, k: v, applied: termsFor(v), selected: null }));

    const formula = (() => {
        const terms = termsFor(k).map((t, i) => {
            const on = applied.includes(t);
            const sym = String.raw`|${termLabel(t, names).replace(/∩/g, String.raw`\cap`)}|`;
            const signTex = i === 0 ? '' : signOf(t) > 0 ? '+' : '-';
            return { on, sym: `${signTex} ${sym}`, num: `${signTex} ${sizeOf(masks, t)}` };
        });
        const gray = (s, on) => (on ? s : String.raw`\textcolor{#475569}{${s}}`);
        const union = names.join(String.raw` \cup `);
        return String.raw`|${union}| = ${terms.map(t => gray(t.sym, t.on)).join(' ')}`
            + String.raw` \\[4pt] ${terms.map(t => gray(t.num, t.on)).join(' ')} \;\to\; \text{running total } \mathbf{${total}}`
            + (total === truth ? String.raw` = |${union}|` : String.raw` \ne ${truth}`);
    })();

    const explanation = mode === 'guided' ? step.explanation : (() => {
        if (ex.selected !== null) {
            const inRegion = masks.map((m, i) => (m === ex.selected ? i + 1 : null)).filter(Boolean);
            const shownList = inRegion.slice(0, 12).join(', ') + (inRegion.length > 12 ? ', …' : '');
            const t = ex.selected === 0 ? 0 : tallyOf(ex.selected, applied);
            return `${ex.picked ? `${ex.picked} is in the region ` : 'Region '}${regionName(ex.selected, k, names)}: ${inRegion.length} ${inRegion.length === 1 ? 'number' : 'numbers'}${inRegion.length ? ` (${shownList})` : ''}. ${ex.selected === 0 ? 'No term counts these — they are not in the union.' : `The terms switched on count each of them ${t} ${t === 1 ? 'time' : 'times'}${t === 1 ? ', which is right' : t > 1 ? ' — an overcount' : ' — they are missing from the total'}.`}`;
        }
        const bad = regionsFor(k).filter(r => regionSize(masks, r) > 0 && tallyOf(r, applied) !== 1);
        return bad.length === 0
            ? `Every non-empty region is counted exactly once, so the running total ${total} is |${names.join(' ∪ ')}|. Click a region or a number to see what is in it.`
            : `${bad.length} ${bad.length === 1 ? 'region is' : 'regions are'} counted the wrong number of times (badges not ×1), so the running total ${total} is off from the true ${truth}. Switch on the missing terms.`;
    })();

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/combinatorics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Combinatorics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Inclusion-Exclusion</h1>
                    <p className="text-fuchsia-100 max-w-3xl">
                        To count a union of overlapping sets, add the sets, subtract every pairwise overlap, add back the triple overlap — until each region of the Venn diagram is counted exactly once.
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
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Click a region or a number; switch terms on and off'}
                            </span>
                        </div>

                        <Venn k={k} names={mode === 'guided' ? guidedSc.names.map((nm, i) => `${nm}: ${guidedSc.long[i]}`) : exploreNames}
                            masks={masks} applied={applied}
                            highlight={mode === 'guided' ? step.highlight : null} selected={mode === 'explore' ? ex.selected : null}
                            hideOutside={mode === 'guided' && step.question === 'neither' && predict.hideExplanation}
                            onRegion={onRegion} />
                        <ElementGrid masks={masks} focusMask={mode === 'guided' ? step.highlight : ex.selected}
                            picked={mode === 'explore' ? ex.picked : null} onPick={onPick} />

                        {mode === 'guided' ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="fuchsia" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-fuchsia-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {termsFor(ex.k).map(t => (
                                    <button key={t} onClick={() => toggleTerm(t)} aria-pressed={ex.applied.includes(t)}
                                        className={`font-mono text-xs px-2.5 py-1.5 rounded-lg border ${ex.applied.includes(t) ? 'border-fuchsia-500 text-fuchsia-200 bg-fuchsia-500/10' : 'border-slate-700 text-slate-500 hover:border-fuchsia-500'}`}>
                                        {signOf(t) > 0 ? '+' : '−'}|{termLabel(t)}|
                                    </button>
                                ))}
                                <button onClick={() => update(s => ({ ...s, applied: termsFor(s.k) }))}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500">All terms</button>
                                <button onClick={() => update(s => ({ ...s, applied: [] }))}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500">None</button>
                            </div>
                        )}
                    </div>

                    {mode === 'guided' && predict.prompt && <PredictPrompt predict={predict} accent="fuchsia" />}

                    <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-fuchsia-400 mt-0.5 flex-shrink-0" />
                            <p className="text-fuchsia-200 text-sm leading-relaxed">
                                {mode === 'guided' && predict.hideExplanation ? 'Make your prediction above to reveal this step.' : explanation}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                        <div className="text-slate-100 text-sm sm:text-base">
                            {mode === 'guided' && predict.hideExplanation
                                ? <p className="text-sm text-slate-500">The formula is hidden until you answer.</p>
                                : <Tex block>{formula}</Tex>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ParamSlider label="Numbers 1 to N" accent="fuchsia" min={10} max={120} value={mode === 'guided' ? guidedSc.N : ex.N}
                                onChange={(v) => update(s => ({ ...s, N: v, selected: null, picked: null }))} />
                            <div className="flex items-end gap-2">
                                {[2, 3].map(v => (
                                    <button key={v} onClick={() => setK(v)} aria-pressed={k === v}
                                        className={`text-xs px-3 py-1.5 rounded-lg border ${k === v ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-500/10' : 'border-slate-700 text-slate-400 hover:border-fuchsia-500'}`}>
                                        {v} sets
                                    </button>
                                ))}
                            </div>
                            {(mode === 'explore' || step.scen !== 'class40') && Array.from({ length: k }, (_, i) => (
                                <ParamSlider key={i} label={`${SHORT[i]}: divisible by`} accent="fuchsia" min={2} max={12}
                                    value={mode === 'guided' ? [2, 3, 5][i] : ex.divisors[i]}
                                    onChange={(v) => update(s => ({ ...s, divisors: s.divisors.map((d, j) => (j === i ? v : d)), selected: null, picked: null }))} />
                            ))}
                        </div>
                        <p className="text-xs text-slate-500">
                            Each badge is a region&apos;s tally: how many of the switched-on terms contain it. The total is right exactly when every non-empty region reads ×1.
                        </p>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The pattern</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-fuchsia-300 font-semibold">Two sets</span> — |A ∪ B| = |A| + |B| − |A ∩ B|.</li>
                            <li><span className="text-sky-300 font-semibold">Three sets</span> — add singles, subtract pairs, add the triple.</li>
                            <li><span className="text-amber-300 font-semibold">Why it works</span> — a region inside r sets is counted r − C(r, 2) + C(r, 3) − … = 1 times.</li>
                            <li><span className="text-green-300 font-semibold">Complements</span> — &quot;in none&quot; = total − |union|.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-fuchsia-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
