"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Plus, Minus, Split,
} from 'lucide-react';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   A stage is one decision: a name, its options, a colour, and optionally
   `groups` — either-or blocks of options (soup OR salad) whose sizes add.
   The leaves of the tree are the outcomes, and there are ∏ (options per stage). */
const STAGE_COLORS = ['#e879f9', '#38bdf8', '#fbbf24', '#4ade80'];
const GROUP_COLORS = ['#f472b6', '#a78bfa'];
const MAX_STAGES = 4;

const stage = (name, options, color, groups = null) => ({ name, options, color, groups });
const countOf = (s) => s.options.length;
const leavesOf = (stages) => stages.reduce((p, s) => p * countOf(s), 1);

/** The choice made at each stage on the path to leaf j (mixed radix, last stage fastest). */
const pathOf = (stages, j) => {
    const digits = [];
    let rest = j;
    for (let i = stages.length - 1; i >= 0; i--) {
        const c = countOf(stages[i]);
        digits[i] = rest % c;
        rest = Math.floor(rest / c);
    }
    return digits;
};
/** The leaf reached by choosing option digits[i] at stage i — the inverse of pathOf. */
const leafOf = (stages, digits) => digits.reduce((j, d, i) => j * countOf(stages[i]) + d, 0);

const outcomeText = (stages, j) => pathOf(stages, j).map((d, i) => stages[i].options[d]).join(', ');

/** Explore-mode stages from plain counts; `split` makes stage 1 an either-or of two groups. */
const buildStages = (counts, split) => counts.map((c, i) => {
    if (i === 0 && split) {
        const [a, b] = split;
        const opts = [...Array.from({ length: a }, (_, k) => `A${k + 1}`), ...Array.from({ length: b }, (_, k) => `B${k + 1}`)];
        return stage('Stage 1', opts, STAGE_COLORS[0], [{ name: 'group A', size: a }, { name: 'group B', size: b }]);
    }
    return stage(`Stage ${i + 1}`, Array.from({ length: c }, (_, k) => String(k + 1)), STAGE_COLORS[i]);
});

/* ── guided tour ───────────────────────────────────────── */

const SHIRT = stage('Shirt', ['red', 'blue', 'green'], STAGE_COLORS[0]);
const PANTS = stage('Pants', ['jeans', 'khakis'], STAGE_COLORS[1]);
const SHOES = stage('Shoes', ['sneakers', 'boots'], STAGE_COLORS[2]);
const STARTER = stage('Starter', ['tomato', 'lentil', 'miso', 'greek', 'caesar'], STAGE_COLORS[0],
    [{ name: 'soup', size: 3 }, { name: 'salad', size: 2 }]);
const DRINK = stage('Drink', ['water', 'juice'], STAGE_COLORS[1]);
const DIAL = (i) => stage(`Dial ${i}`, ['1', '2', '3'], STAGE_COLORS[i - 1]);

const generateSteps = () => {
    const steps = [];
    const push = (kind, stages, explanation, extra = {}) => steps.push({ kind, stages, explanation, pending: null, highlight: null, ask: null, ...extra });
    let ask = 0;

    push('opening', [], 'How many outfits can you make from 3 shirts, 2 pairs of pants and 2 pairs of shoes? Instead of listing them, build a decision tree: one level per decision, one branch per option. The root is the moment before any choice.');
    push('grow', [SHIRT], 'First decision: the shirt. Three branches leave the root, one per shirt — 3 partial outfits so far.');
    push('intro', [SHIRT], 'Next decision: the pants. There are 2, and both go with every shirt, so each of the 3 shirt branches will split into 2.',
        { pending: PANTS, ask: ask++ });
    push('grow', [SHIRT, PANTS], 'Every shirt branch split the same way: 3 × 2 = 6 leaves. The number of pants did not depend on which shirt was picked, so the tree is perfectly regular — that is the multiplication rule.');
    push('intro', [SHIRT, PANTS], 'Next: the shoes, 2 pairs, which again go with everything. Each of the 6 leaves will grow 2 new branches.',
        { pending: SHOES });
    push('grow', [SHIRT, PANTS, SHOES], '3 × 2 × 2 = 12 leaves. Each stage multiplied the count by its number of options, so the total is the product of the stage sizes — no listing needed.');
    push('path', [SHIRT, PANTS, SHOES], 'Follow one path from the root: blue, then khakis, then boots. It ends at leaf 8 of 12. Every leaf is exactly one outfit and every outfit is exactly one leaf, so counting leaves counts outfits.',
        { highlight: leafOf([SHIRT, PANTS, SHOES], [1, 1, 1]) });
    push('intro', [SHIRT, PANTS, SHOES], 'Now choose in a different order: shoes first, then pants, then the shirt. The tree will have a different shape.',
        { pending: 'reorder', ask: ask++ });
    push('reordered', [SHOES, PANTS, SHIRT], '2 × 2 × 3 = 12 again. The root now has 2 branches instead of 3, but the leaves are the same 12 outfits in a different order. Multiplication does not care about order, so neither does the count.');
    push('intro', [], 'A new menu. Lunch starts with a soup (tomato, lentil or miso) or a salad (greek or caesar) — one or the other, never both. How many ways are there to choose the starter?',
        { pending: STARTER, ask: ask++ });
    push('grow', [STARTER], '3 soup branches and 2 salad branches leave the root: 3 + 2 = 5 starters. When the options are either-or and no option is in both groups, the counts add — the addition rule. Multiplying, 3 × 2, would count soup-and-salad pairs, which this menu does not serve.');
    push('intro', [STARTER], 'Then a drink: water or juice, with any starter. Each of the 5 starter branches will split into 2.',
        { pending: DRINK, ask: ask++ });
    push('grow', [STARTER, DRINK], '(3 + 2) × 2 = 10 lunches. The two rules combine: add within a stage when its options are either-or, multiply across stages that happen one after another.');
    push('intro', [DIAL(1)], 'A lock has three dials, each set to 1, 2 or 3. The first dial gives 3 branches. Repeats are allowed: 1-1-1 is a valid code. How many settings do the first two dials have?',
        { pending: DIAL(2), ask: ask++ });
    push('grow', [DIAL(1), DIAL(2)], '3 × 3 = 9 settings for two dials. The second dial still has all 3 values, because using 2 on the first dial does not use it up.');
    push('intro', [DIAL(1), DIAL(2)], 'The third dial has 3 values too. Each of the 9 leaves will split into 3.',
        { pending: DIAL(3), ask: ask++ });
    push('grow', [DIAL(1), DIAL(2), DIAL(3)], '3 × 3 × 3 = 3³ = 27 codes. When every stage has the same n options, k stages give nᵏ. Forbid repeats and the choices shrink to 3 × 2 × 1 = 6 — the permutations on the next page.');
    push('closing', [DIAL(1), DIAL(2), DIAL(3)], 'Multiply across stages done one after another; add across either-or groups that do not overlap. Switch to Explore to build your own tree: use the + and − on each stage, add stages, and click any leaf to read its outcome.');
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Asked before a stage grows: how many leaves will there be? The wrong
   answers are the usual slips — adding where you should multiply, one stage
   too many, forgetting the new stage — and for the either-or starter, the
   reverse slip of multiplying where you should add. */
const predictFor = (step) => {
    if (!step || step.kind !== 'intro' || step.ask === null) return null;
    const now = leavesOf(step.stages);
    let correct, candidates, question, because;
    if (step.pending === 'reorder') {
        correct = now;
        const sizes = step.stages.map(countOf);
        candidates = [now * 2, sizes.reduce((a, b) => a + b, 0), sizes[1] * sizes[2]];
        question = 'Shoes first, then pants, then the shirt. How many leaves will the new tree have?';
        because = `The stages are the same three, only reordered: 2 × 2 × 3 = 3 × 2 × 2 = ${correct}. The shape changes, the count cannot.`;
    } else if (step.pending.groups) {
        const [a, b] = step.pending.groups.map(g => g.size);
        correct = a + b;
        candidates = [a * b, a, b, a + b + 1];
        question = `A ${step.pending.groups[0].name} (${a} kinds) or a ${step.pending.groups[1].name} (${b} kinds), not both. How many ways to choose?`;
        because = `Either-or choices from groups that do not overlap add: ${a} + ${b} = ${correct}. ${a} × ${b} = ${a * b} would count a ${step.pending.groups[0].name} together with a ${step.pending.groups[1].name}.`;
    } else {
        const m = countOf(step.pending);
        const all = step.stages.reduce((s, x) => s + countOf(x), 0) + m;
        correct = now * m;
        candidates = [now + m, now * (m + 1), now, all, correct + 1];
        question = `${step.pending.name}: ${m} options, each available on every one of the ${now} current branches. How many leaves after it grows?`;
        because = `Each of the ${now} leaves splits into ${m}: ${now} × ${m} = ${correct}. Adding (${now} + ${m}) would treat the new stage as an alternative instead of a further decision.`;
    }
    const seen = new Set([correct]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (c < 1 || seen.has(c)) continue;
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
        question: 'A café offers 4 sandwiches, 3 sides and 2 drinks. A meal is one of each. How many different meals are there?',
        options: ['9', '24', '12', '14'],
        correct: 1,
        explanation: 'Three decisions, one after another, and every option goes with every other: 4 × 3 × 2 = 24. Adding (4 + 3 + 2 = 9) would count choosing just one item.',
    },
    {
        question: 'You can get to work on one of 3 bus routes or one of 4 train lines, but not both. How many ways are there to get to work?',
        options: ['12', '3', '7', '4'],
        correct: 2,
        explanation: 'This is one either-or decision between two groups that do not overlap, so the counts add: 3 + 4 = 7. Multiplying would count a bus ride followed by a train ride.',
    },
    {
        question: 'Choosing the shoes first instead of the shirt changes the shape of the decision tree. What happens to the number of leaves?',
        options: [
            'Nothing — the product of the stage sizes is the same in any order',
            'It grows, because the first stage counts most',
            'It shrinks, because the root has fewer branches',
            'It only stays the same when every stage has the same number of options',
        ],
        correct: 0,
        explanation: 'The leaves are the same outcomes reached in a different order, and multiplication is commutative: 2 × 2 × 3 = 3 × 2 × 2 = 12.',
    },
];

const codeExample = `from itertools import product
from math import prod

shirts = ['red', 'blue', 'green']
pants  = ['jeans', 'khakis']
shoes  = ['sneakers', 'boots']

outfits = list(product(shirts, pants, shoes))   # every leaf of the tree
print(len(outfits))                              # 12
print(prod(len(s) for s in (shirts, pants, shoes)))   # 3 * 2 * 2 = 12

# Addition rule: a soup OR a salad, never both
soups, salads = ['tomato', 'lentil', 'miso'], ['greek', 'caesar']
starters = soups + salads           # disjoint groups, so 3 + 2 = 5
drinks = ['water', 'juice']
print(len(list(product(starters, drinks))))   # (3 + 2) * 2 = 10

# Same n options at each of k stages: n ** k
print(len(list(product('123', repeat=3))))    # 27`;

/* ── picture ───────────────────────────────────────────── */

const W = 640;

function SvgButton({ x, y, onClick, label, children }) {
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } };
    return (
        <g transform={`translate(${x}, ${y})`} onClick={onClick} onKeyDown={onKey}
            role="button" tabIndex={0} aria-label={label} style={{ cursor: 'pointer' }} className="focus:outline-none">
            <rect x={-9} y={-9} width={18} height={18} rx={4} fill="#1e293b" stroke="#475569" />
            {children}
        </g>
    );
}

/**
 * A left-to-right decision tree: the root at the left, one column per stage,
 * leaves on the right. Every node sits at the middle of the leaves below it,
 * so the layout is a pure function of the stage sizes.
 */
function DecisionTree({ stages, pending, highlight, onLeaf, onDelta, onAdd, onRemove, editable }) {
    const d = stages.length;
    const L = leavesOf(stages);
    const showLeafText = d > 0 && L <= 27;
    const labelSpace = showLeafText ? 170 : 30;
    const ghost = pending && pending !== 'reorder' ? pending : null;
    const cols = Math.max(d + (ghost ? 1 : 0), 1);
    const colW = Math.min(150, (W - 50 - labelSpace) / cols);
    const top = 58;
    const sp = Math.min(26, Math.max(1.2, 400 / L));
    const H = Math.max(240, top + L * sp + 24);
    const off = Math.max(0, (H - 24 - top - L * sp) / 2);   // centre a small tree vertically
    const xOf = (level) => 30 + level * colW;
    const yOf = (level, t) => {
        const n = L / stages.slice(0, level).reduce((p, s) => p * countOf(s), 1);   // leaves under one node
        return top + off + (t * n + n / 2) * sp;
    };

    const path = highlight === null || highlight === undefined || highlight >= L ? null : pathOf(stages, highlight);
    const onPath = (level, t) => {
        if (!path) return false;
        const under = L / stages.slice(0, level).reduce((p, s) => p * countOf(s), 1);
        return Math.floor(highlight / under) === t;
    };

    const edges = [], nodes = [];
    let count = 1;
    for (let level = 1; level <= d; level++) {
        const s = stages[level - 1];
        const c = countOf(s);
        const nodeCount = count * c;
        const thin = nodeCount > 64;
        for (let t = 0; t < nodeCount; t++) {
            const parent = Math.floor(t / c);
            const opt = t % c;
            let color = s.color;
            if (s.groups) color = opt < s.groups[0].size ? GROUP_COLORS[0] : GROUP_COLORS[1];
            const hot = onPath(level, t);
            edges.push(<line key={`e${level}-${t}`} x1={xOf(level - 1)} y1={yOf(level - 1, parent)} x2={xOf(level)} y2={yOf(level, t)}
                stroke={hot ? '#ffffff' : color} strokeWidth={hot ? 3 : thin ? 0.6 : 1.6} opacity={path && !hot ? 0.35 : 0.9} />);
            if (!thin) {
                nodes.push(<circle key={`n${level}-${t}`} cx={xOf(level)} cy={yOf(level, t)} r={nodeCount > 30 ? 2.5 : 4.5}
                    fill={hot ? '#ffffff' : color} stroke="#020617" strokeWidth={1} />);
                if (nodeCount <= 9 && level < d) {
                    nodes.push(<text key={`l${level}-${t}`} x={xOf(level) + 6} y={yOf(level, t) - 7} fontSize={11} fill={hot ? '#ffffff' : color}>{s.options[opt]}</text>);
                }
            }
        }
        count = nodeCount;
    }

    const leafRows = [];
    if (d > 0) {
        for (let j = 0; j < L; j++) {
            const y = yOf(d, j);
            const hot = highlight === j;
            leafRows.push(
                <g key={`r${j}`}>
                    {showLeafText && (
                        <text x={xOf(d) + 10} y={y + 4} fontSize={sp < 16 ? 9.5 : 11} fill={hot ? '#ffffff' : '#94a3b8'} fontWeight={hot ? 700 : 400}>
                            {j + 1}. {outcomeText(stages, j)}
                        </text>
                    )}
                    {onLeaf && L <= 128 && (
                        <rect x={xOf(d) - 8} y={y - sp / 2} width={W - xOf(d) + 8} height={sp} fill="transparent"
                            style={{ cursor: 'pointer' }} onClick={() => onLeaf(j)} />
                    )}
                </g>
            );
        }
    }

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Decision tree with ${d} stages and ${L} leaves`} className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            {/* stage headers, with + / − handles */}
            {stages.map((s, i) => {
                const x = (xOf(i) + xOf(i + 1)) / 2;
                const canEdit = editable && !s.groups;
                return (
                    <g key={`h${i}`}>
                        <text x={x} y={22} fontSize={12} fontWeight={700} fill={s.color} textAnchor="middle">{s.name}</text>
                        <text x={x} y={40} fontSize={12} fill="#cbd5e1" textAnchor="middle">
                            {s.groups ? s.groups.map(g => g.size).join(' + ') : `× ${countOf(s)}`}
                        </text>
                        {canEdit && (
                            <>
                                <SvgButton x={x - 34} y={36} onClick={() => onDelta(i, -1)} label={`One fewer option at ${s.name}`}>
                                    <line x1={-4} y1={0} x2={4} y2={0} stroke="#e2e8f0" strokeWidth={2} />
                                </SvgButton>
                                <SvgButton x={x + 34} y={36} onClick={() => onDelta(i, 1)} label={`One more option at ${s.name}`}>
                                    <line x1={-4} y1={0} x2={4} y2={0} stroke="#e2e8f0" strokeWidth={2} />
                                    <line x1={0} y1={-4} x2={0} y2={4} stroke="#e2e8f0" strokeWidth={2} />
                                </SvgButton>
                            </>
                        )}
                    </g>
                );
            })}
            {ghost && (
                <g opacity={0.8}>
                    <text x={(xOf(d) + xOf(d + 1)) / 2} y={22} fontSize={12} fontWeight={700} fill={ghost.color} textAnchor="middle">{ghost.name}</text>
                    <text x={(xOf(d) + xOf(d + 1)) / 2} y={40} fontSize={12} fill="#cbd5e1" textAnchor="middle">
                        {ghost.groups ? ghost.groups.map(g => `${g.size} ${g.name}`).join(' or ') : `× ${countOf(ghost)} ?`}
                    </text>
                    <line x1={xOf(d) + 8} y1={50} x2={xOf(d + 1) - 8} y2={50} stroke={ghost.color} strokeDasharray="4 4" />
                </g>
            )}
            {editable && (
                <g>
                    {d < MAX_STAGES && (
                        <SvgButton x={W - 46} y={20} onClick={onAdd} label="Add a stage">
                            <line x1={-4} y1={0} x2={4} y2={0} stroke="#e879f9" strokeWidth={2} />
                            <line x1={0} y1={-4} x2={0} y2={4} stroke="#e879f9" strokeWidth={2} />
                        </SvgButton>
                    )}
                    {d > 1 && (
                        <SvgButton x={W - 20} y={20} onClick={onRemove} label="Remove the last stage">
                            <line x1={-4} y1={-4} x2={4} y2={4} stroke="#fb7185" strokeWidth={2} />
                            <line x1={4} y1={-4} x2={-4} y2={4} stroke="#fb7185" strokeWidth={2} />
                        </SvgButton>
                    )}
                    <text x={W - 33} y={46} fontSize={9.5} fill="#64748b" textAnchor="middle">stage</text>
                </g>
            )}
            {edges}
            {nodes}
            <circle cx={xOf(0)} cy={yOf(0, 0)} r={6} fill="#f1f5f9" stroke="#020617" strokeWidth={1.5} />
            {leafRows}
            <text x={W - 12} y={H - 10} fontSize={13} fontWeight={700} fill="#f0abfc" textAnchor="end">
                {L} {L === 1 ? 'leaf' : 'leaves'}
            </text>
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

const texProduct = (stages) => {
    if (!stages.length) return String.raw`\text{no decisions yet: } 1 \text{ outcome}`;
    const parts = stages.map(s => (s.groups
        ? `(${s.groups.map((g, gi) => String.raw`\textcolor{${GROUP_COLORS[gi]}}{${g.size}}`).join(' + ')})`
        : String.raw`\textcolor{${s.color}}{${countOf(s)}}`));
    return parts.join(String.raw` \times `) + String.raw` = \mathbf{${leavesOf(stages)}}`;
};

export default function CountingPrinciplePage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [counts, setCounts] = useState([3, 2, 2]);       // explore-mode stage sizes
    const [split, setSplit] = useState(null);              // explore: stage 1 as an either-or of [a, b]
    const [selected, setSelected] = useState(null);        // explore: the clicked leaf
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

    const exploreStages = useMemo(() => buildStages(split ? [split[0] + split[1], ...counts.slice(1)] : counts, split), [counts, split]);
    const stages = mode === 'guided' ? step.stages : exploreStages;
    const L = leavesOf(stages);
    const highlight = mode === 'guided' ? step.highlight : (selected !== null && selected < L ? selected : null);

    /* Grabbing a handle during the tour switches to Explore, starting from
       the tree on screen, so the picture never jumps. */
    const takeOver = () => {
        if (mode !== 'guided') return { counts, split };
        const shown = step.stages.length ? step.stages : [SHIRT];
        const nextSplit = shown[0].groups ? shown[0].groups.map(g => g.size) : null;
        const nextCounts = shown.map(countOf);
        setCounts(nextCounts); setSplit(nextSplit); setSelected(step.highlight);
        setMode('explore'); setIsPlaying(false);
        return { counts: nextCounts, split: nextSplit };
    };
    const setStageCount = (i, value) => {
        const base = takeOver();
        const next = [...base.counts];
        next[i] = Math.min(Math.max(value, 1), 4);
        setCounts(next);
    };
    const onDelta = (i, delta) => {
        const base = takeOver();
        setStageCount(i, base.counts[i] + delta);
    };
    const onAdd = () => {
        const base = takeOver();
        if (base.counts.length < MAX_STAGES) setCounts([...base.counts, 2]);
    };
    const onRemove = () => {
        const base = takeOver();
        if (base.counts.length > 1) setCounts(base.counts.slice(0, -1));
    };
    const onLeaf = (j) => { takeOver(); setSelected(s => (s === j ? null : j)); };
    const toggleSplit = () => {
        const base = takeOver();
        if (base.split) { setSplit(null); setCounts([Math.min(base.split[0] + base.split[1], 4), ...base.counts.slice(1)]); }
        else setSplit([2, 1]);
    };

    const explanation = mode === 'guided'
        ? step.explanation
        : highlight !== null
            ? `Leaf ${highlight + 1} of ${L}: ${outcomeText(stages, highlight)}. Reading the path from the root names one choice per stage, and no other path ends at this leaf — that one-to-one match is why counting leaves counts outcomes.`
            : split
                ? `Stage 1 is either-or: ${split[0]} options from group A or ${split[1]} from group B, so it has ${split[0]} + ${split[1]} = ${split[0] + split[1]} branches. The later stages multiply that: ${L} outcomes in all.`
                : `${stages.length} ${stages.length === 1 ? 'stage' : 'stages'}, and every option of each stage goes with every path before it, so the leaves multiply: ${stages.map(countOf).join(' × ')} = ${L}. Click a leaf to read its outcome.`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/combinatorics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Combinatorics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Counting Principle</h1>
                    <p className="text-fuchsia-100 max-w-3xl">
                        When decisions happen one after another, the number of outcomes is the product of the number of options at each stage. A decision tree shows why: every stage multiplies the leaves.
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
                                        onClick={() => { if (key === 'explore') takeOver(); else { setMode('guided'); } }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : 'Use + and − on a stage, or click a leaf'}
                            </span>
                        </div>

                        <DecisionTree stages={stages} pending={mode === 'guided' ? step.pending : null} highlight={highlight}
                            editable onLeaf={onLeaf} onDelta={onDelta} onAdd={onAdd} onRemove={onRemove} />

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
                                {[['Outfits', [3, 2, 2], null], ['Lunch', [5, 2], [3, 2]], ['Lock', [3, 3, 3], null], ['Coin flips', [2, 2, 2, 2], null]].map(([name, c, sp]) => (
                                    <button key={name} onClick={() => { setCounts(c); setSplit(sp); setSelected(null); }}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500">{name}</button>
                                ))}
                                <button onClick={toggleSplit} aria-pressed={Boolean(split)}
                                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${split ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-500/10' : 'border-slate-700 text-slate-400 hover:border-fuchsia-500'}`}>
                                    <Split className="h-3.5 w-3.5" />Stage 1 either-or
                                </button>
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
                            <Tex block>{texProduct(stages)}</Tex>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(mode === 'guided' ? stages.map(countOf) : counts).map((c, i) => (
                                i === 0 && (mode === 'guided' ? stages[0]?.groups : split) ? (
                                    <div key="split" className="space-y-2">
                                        {[0, 1].map(g => (
                                            <ParamSlider key={g} label={`Stage 1, group ${g === 0 ? 'A' : 'B'} (either-or)`} accent="fuchsia" min={1} max={3}
                                                value={mode === 'guided' ? stages[0].groups[g].size : split[g]}
                                                onChange={(v) => { const base = takeOver(); const sp = [...(base.split ?? [2, 1])]; sp[g] = v; setSplit(sp); }} />
                                        ))}
                                    </div>
                                ) : (
                                    <ParamSlider key={i} label={`${stages[i]?.name ?? `Stage ${i + 1}`}: options`} accent="fuchsia" min={1} max={4}
                                        value={c} onChange={(v) => setStageCount(i, v)} />
                                )
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={onAdd} disabled={stages.length >= MAX_STAGES}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500 disabled:opacity-40">
                                <Plus className="h-3.5 w-3.5" />Add a stage
                            </button>
                            <button onClick={onRemove} disabled={stages.length <= 1}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500 disabled:opacity-40">
                                <Minus className="h-3.5 w-3.5" />Remove the last stage
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Each factor is coloured like its stage in the tree. A bracketed sum is an either-or stage: its groups add, and the result multiplies with everything else.
                        </p>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Two rules</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-fuchsia-300 font-semibold">Multiply</span> — for decisions made one after another, when every option of a stage goes with every earlier path.</li>
                            <li><span className="text-pink-300 font-semibold">Add</span> — for one either-or decision between groups that share no option.</li>
                            <li><span className="text-sky-300 font-semibold">Leaves = outcomes</span> — each path from the root is one outcome, and no two paths give the same one.</li>
                            <li><span className="text-amber-300 font-semibold">Same n at k stages</span> — nᵏ, as with the lock&apos;s 3³ = 27 codes.</li>
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
