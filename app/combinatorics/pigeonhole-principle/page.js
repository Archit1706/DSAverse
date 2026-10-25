"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Shuffle, Bird, Handshake,
} from 'lucide-react';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';
import { createRng, randomSeed } from '@/lib/random';

/* ── the maths ─────────────────────────────────────────────
   If every one of m holes held at most q − 1 pigeons there would be at most
   m(q − 1) pigeons. So n pigeons force some hole to hold at least
   ⌈n / m⌉ — and spreading them as evenly as possible shows that bound is the
   best anyone can do. */
const ceilDiv = (n, m) => Math.ceil(n / m);
/** The kindest placement: each pigeon takes the emptiest hole, lowest number on ties. */
const evenCounts = (n, m) => Array.from({ length: m }, (_, i) => Math.floor(n / m) + (i < n % m ? 1 : 0));
const fullest = (counts) => counts.reduce((a, b) => Math.max(a, b), 0);

/* Handshakes: people 0..p−1, edges as sorted pairs "i-j". */
const edgeKey = (i, j) => (i < j ? `${i}-${j}` : `${j}-${i}`);
const degreesOf = (p, edges) => {
    const d = new Array(p).fill(0);
    for (const e of edges) { const [i, j] = e.split('-').map(Number); d[i]++; d[j]++; }
    return d;
};
/** Groups of people sharing a handshake count (the collisions the principle promises). */
const collisions = (degrees) => {
    const by = new Map();
    degrees.forEach((d, i) => by.set(d, [...(by.get(d) ?? []), i]));
    return [...by.entries()].filter(([, who]) => who.length > 1).map(([d, who]) => ({ d, who }));
};
/** A seeded random handshake pattern: each pair shakes hands with probability 1/2. */
const randomEdges = (p, seed) => {
    const rng = createRng(seed);
    const out = [];
    for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) if (rng.chance(0.5)) out.push(edgeKey(i, j));
    return out;
};
const PEOPLE = 'ABCDEFGH';

/* ── guided tour ───────────────────────────────────────── */

const SOCKS = ['red', 'blue', 'green'];
const SOCK_COLORS = ['#f87171', '#60a5fa', '#4ade80'];
const GUIDED_EDGES = ['0-1', '0-2', '0-3', '0-4', '1-2', '1-3', '2-4', '3-4', '4-5'];

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const holes = (n, explanation, extra = {}) => steps.push({ part: 'holes', m: 5, counts: evenCounts(n, 5), incoming: false, holeNames: null, question: null, ask: null, explanation, ...extra });
    const socks = (counts, explanation, extra = {}) => steps.push({ part: 'holes', m: 3, counts, incoming: false, holeNames: SOCKS, question: null, ask: null, explanation, ...extra });
    const hands = (explanation, extra = {}) => steps.push({ part: 'hands', p: 6, edges: GUIDED_EDGES, showHoles: false, mergeEnds: false, question: null, ask: null, explanation, ...extra });

    holes(0, 'Five pigeonholes. Pigeons arrive one at a time, and each is as kind as possible: it takes the emptiest hole, so collisions are put off as long as they can be.');
    holes(3, 'Three pigeons, three different holes. No hole is shared yet.');
    holes(5, 'Five pigeons, one in every hole. Now a sixth arrives.', { incoming: true, question: 'fullest', next: 6, ask: ask++ });
    holes(6, 'Every hole was already taken, so pigeon 6 must share: some hole now holds 2. This is the pigeonhole principle — more pigeons than holes forces a collision, wherever they go.');
    holes(8, 'Eight pigeons. The kind placement keeps the fullest hole at 2.');
    holes(10, 'Ten pigeons, exactly 2 in every hole — the most the holes can take without any of them reaching 3. Pigeon 11 is coming.', { incoming: true, question: 'fullest', next: 11, ask: ask++ });
    holes(11, 'Pigeon 11 makes some hole hold 3. In general n pigeons in m holes force a hole with at least ⌈n / m⌉: if every hole had at most 2, there would be at most 5 × 2 = 10 pigeons.');
    holes(11, '⌈11 / 5⌉ = 3, and the kind placement shows 3 is the best possible — no arrangement keeps every hole under 3. The principle proves something must exist without saying which hole it is.');
    socks([0, 0, 0], 'A drawer of socks in three colours: red, blue and green. In the dark you pull socks out one at a time. The colours are the holes and the socks are the pigeons.',
        { question: 'socks', ask: ask++ });
    socks([2, 1, 1], 'Three socks could all differ — one per colour — so 3 is not enough. But the fourth has to match one of them: 4 socks guarantee a pair, since ⌈4 / 3⌉ = 2.');
    hands('A less obvious one. Six people at a party, A to F; some pairs shook hands (the lines). Each person\'s number is how many hands they shook.',
        { question: 'counts', ask: ask++ });
    hands('Each person shook between 0 and 5 hands — six possible counts, holes 0 to 5, for six people. Six pigeons in six holes do not force a collision… yet.',
        { showHoles: true, question: 'ends', ask: ask++ });
    hands('No: someone who shook 5 hands shook everyone, including the person who supposedly shook none. Holes 0 and 5 cannot both be used, so at most 5 holes are available.',
        { showHoles: true, mergeEnds: true, question: 'holes', ask: ask++ });
    hands('Six people, at most five usable counts: two people must share a count. Here B, C and D all shook 3 hands, and A and E shook 4. It works for any party with at least two people, however the handshakes go.',
        { showHoles: true, mergeEnds: true, highlightCollisions: true });
    hands('To use the principle, decide what the pigeons are, what the holes are, and show there are more pigeons than holes. Switch to Explore: drop pigeons by hand, or try to build a party where everyone shook a different number of hands.',
        { showHoles: true, highlightCollisions: true });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Numeric questions about the bound (⌈n / m⌉ against its neighbours and n),
   the socks (m + 1 against m, 2m and 2), the number of possible handshake
   counts (p against p − 1, p + 1 and the number of pairs), one about the two
   end holes, and how many holes are really left (p − 1). */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    let correct, candidates, question, because;
    if (step.question === 'fullest') {
        const n = step.next, m = step.m;
        correct = ceilDiv(n, m);
        candidates = [correct - 1, correct + 1, n, m];
        question = `Pigeon ${n} arrives. Wherever it lands, what is the fewest pigeons the fullest hole can have?`;
        because = `${m} holes with at most ${correct - 1} each hold at most ${m * (correct - 1)} pigeons, fewer than ${n}. So some hole has at least ⌈${n} / ${m}⌉ = ${correct}.`;
    } else if (step.question === 'socks') {
        const m = step.m;
        correct = m + 1;
        candidates = [m, 2 * m, 2, m + 2];
        question = `How many socks must you pull out to be sure of two the same colour?`;
        because = `With ${m} colours you could draw ${m} different ones. One more — sock ${m + 1} — must repeat a colour.`;
    } else if (step.question === 'counts') {
        const p = step.p;
        correct = p;
        candidates = [p - 1, p + 1, (p * (p - 1)) / 2, p - 2];
        question = `With ${p} people, how many different handshake counts are possible for one person?`;
        because = `A person can shake hands with none of the other ${p - 1} up to all of them: 0, 1, …, ${p - 1} — that is ${p} counts.`;
    } else if (step.question === 'ends') {
        const p = step.p;
        const options = [
            `No — the one who shook ${p - 1} shook everyone, including the 0`,
            'Yes, the two are unrelated',
            'Only when the number of people is even',
            `Only when nobody else shook ${p - 1} hands`,
        ];
        const slot = (step.ask * 3 + 1) % 4;
        const ordered = options.slice(1);
        ordered.splice(slot, 0, options[0]);
        return {
            question: `Can one person have shaken 0 hands while another shook all ${p - 1}?`,
            options: ordered, correct: slot,
            because: `Shaking ${p - 1} hands means shaking hands with every other person — so nobody can have shaken 0.`,
        };
    } else {
        const p = step.p;
        correct = p - 1;
        candidates = [p, p - 2, Math.floor(p / 2)];
        question = `So how many handshake counts can actually occur together at this party of ${p}?`;
        because = `Counts 0 to ${p - 1}, but never both 0 and ${p - 1}: at most ${p - 1} values for ${p} people, so two of them must match.`;
    }
    const seen = new Set([correct]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (!Number.isInteger(c) || c < 1 || seen.has(c)) continue;
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
        question: 'A school has 400 students. Why must two of them share a birthday?',
        options: [
            'Because birthdays cluster in summer',
            'Only if the school is large enough — 400 is not',
            'There are at most 366 possible birthdays, and 400 students are more pigeons than holes',
            'Because of the birthday paradox, which needs only 23',
        ],
        correct: 2,
        explanation: 'Birthdays are the holes (366 of them, counting 29 February) and students the pigeons. 400 > 366, so some birthday is shared — guaranteed, not just likely.',
    },
    {
        question: '50 letters go into 7 mailboxes. What is the most you can promise about the fullest mailbox?',
        options: ['It holds at least 7', 'It holds at least 8', 'It holds exactly 7', 'It holds at least 50 / 7 rounded down, 7'],
        correct: 1,
        explanation: '⌈50 / 7⌉ = 8: with at most 7 in every box there would be at most 49 letters. And 8 is the best promise, since 8, 7, 7, 7, 7, 7, 7 is possible.',
    },
    {
        question: 'In the handshake argument for n people, what are the pigeons and what are the holes?',
        options: [
            'Pigeons: handshakes; holes: people',
            'Pigeons: people; holes: the possible handshake counts, of which at most n − 1 can occur',
            'Pigeons: pairs of people; holes: handshakes',
            'Pigeons: people; holes: the n other people',
        ],
        correct: 1,
        explanation: 'Each person goes into the hole labelled with their handshake count. Counts run from 0 to n − 1, but 0 and n − 1 cannot both occur, leaving n − 1 holes for n people.',
    },
];

const codeExample = `from math import ceil
from itertools import combinations
import random

def fullest_hole(n, m):
    """The fewest pigeons the fullest of m holes can have, for n pigeons."""
    return ceil(n / m)

print(fullest_hole(11, 5))   # 3
print(fullest_hole(4, 3))    # 2: four socks, three colours -> a pair

# Handshakes: two people always share a count
def handshake_counts(people, shakes):
    return [sum(p in pair for pair in shakes) for p in people]

people = range(6)
random.seed(7)
shakes = [pair for pair in combinations(people, 2) if random.random() < 0.5]
counts = handshake_counts(people, shakes)
print(counts, len(set(counts)) < len(counts))   # always True`;

/* ── pictures ──────────────────────────────────────────── */

const W = 640;

function PigeonGlyph({ x, y, color = '#e2e8f0', scale = 1 }) {
    return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`}>
            <ellipse cx={0} cy={0} rx={10} ry={7} fill={color} />
            <circle cx={8} cy={-5} r={4.5} fill={color} />
            <polygon points="12,-5 16,-4 12,-3" fill="#f59e0b" />
            <circle cx={9} cy={-6} r={1} fill="#020617" />
            <path d="M -9 -1 L -15 -5 L -12 1 Z" fill={color} />
        </g>
    );
}

/**
 * A row of holes with their occupants stacked inside. The fullest hole is
 * outlined; clicking a hole drops the next pigeon into it.
 */
function HoleRow({ counts, holeNames, holeColors, incoming, onHole, bound }) {
    const m = counts.length;
    const holeW = Math.min(100, (W - 40) / m);
    const top = 70, holeH = 200;
    const max = fullest(counts);
    const n = counts.reduce((a, b) => a + b, 0);
    const per = Math.max(max, 6);
    const slotH = Math.min(26, (holeH - 16) / per);
    return (
        <svg viewBox={`0 0 ${W} ${top + holeH + 44}`} width="100%" role="img" aria-label={`${n} pigeons in ${m} holes`} className="block select-none">
            <rect x={0} y={0} width={W} height={top + holeH + 44} fill="#020617" rx={8} />
            <text x={16} y={22} fontSize={12} fill="#94a3b8">{n} {holeNames ? 'socks' : 'pigeons'} · {m} holes{onHole ? ' · click a hole to drop one in' : ''}</text>
            <text x={W - 16} y={22} fontSize={12} fill="#f0abfc" textAnchor="end" fontWeight={700}>
                fullest: {max}{n > 0 ? ` ≥ ⌈${n}/${m}⌉ = ${bound}` : ''}
            </text>
            {incoming && <PigeonGlyph x={W / 2} y={48} color="#f0abfc" scale={1.2} />}
            {counts.map((c, i) => {
                const x = 20 + i * holeW;
                const isMax = c === max && c > 1;
                const color = holeColors ? holeColors[i] : '#e2e8f0';
                return (
                    <g key={i} onClick={onHole ? () => onHole(i) : undefined} style={{ cursor: onHole ? 'pointer' : 'default' }}
                        role={onHole ? 'button' : undefined} tabIndex={onHole ? 0 : undefined} aria-label={onHole ? `Drop one into hole ${i + 1}` : undefined}
                        onKeyDown={onHole ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHole(i); } } : undefined}
                        className="focus:outline-none">
                        <rect x={x + 4} y={top} width={holeW - 8} height={holeH} rx={8} fill="#0f172a"
                            stroke={isMax ? '#f0abfc' : '#334155'} strokeWidth={isMax ? 2.5 : 1.5} />
                        {Array.from({ length: c }, (_, j) => (
                            holeNames
                                ? <rect key={j} x={x + holeW / 2 - 9} y={top + holeH - 8 - (j + 1) * slotH} width={18} height={Math.max(slotH - 4, 3)} rx={3} fill={color} />
                                : <PigeonGlyph key={j} x={x + holeW / 2 - 2} y={top + holeH - 8 - (j + 0.5) * slotH} scale={Math.min(1, slotH / 18)} color={isMax ? '#f0abfc' : color} />
                        ))}
                        <text x={x + holeW / 2} y={top + holeH + 18} textAnchor="middle" fontSize={12} fontWeight={700} fill={isMax ? '#f0abfc' : '#cbd5e1'}>{c}</text>
                        <text x={x + holeW / 2} y={top + holeH + 34} textAnchor="middle" fontSize={10} fill="#64748b">{holeNames ? holeNames[i] : `hole ${i + 1}`}</text>
                    </g>
                );
            })}
        </svg>
    );
}

/**
 * People on a circle with their handshakes, and below them the holes 0 to
 * p − 1, each person dropped into the hole of their handshake count.
 */
function HandshakeStage({ p, edges, showHoles, mergeEnds, highlightCollisions, selected, onPerson }) {
    const cx = W / 2, cy = 130, R = 95;
    const pos = (i) => [cx + R * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / p), cy + R * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / p)];
    const deg = degreesOf(p, edges);
    const coll = collisions(deg);
    const hot = new Set(highlightCollisions ? coll.flatMap(c => c.who) : []);
    const holeTop = 260, holeW = Math.min(80, (W - 40) / p);
    const used0 = deg.includes(0), usedTop = deg.includes(p - 1);
    const H = showHoles ? holeTop + 120 : 250;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${p} people and their handshakes`} className="block select-none">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            <text x={16} y={22} fontSize={12} fill="#94a3b8">{edges.length} handshakes{onPerson ? ' · click two people to add or remove one' : ''}</text>
            {edges.map(e => {
                const [i, j] = e.split('-').map(Number);
                const [x1, y1] = pos(i), [x2, y2] = pos(j);
                return <line key={e} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth={2} opacity={0.7} />;
            })}
            {Array.from({ length: p }, (_, i) => {
                const [x, y] = pos(i);
                const on = hot.has(i), sel = selected === i;
                return (
                    <g key={i} transform={`translate(${x}, ${y})`} onClick={onPerson ? () => onPerson(i) : undefined}
                        role={onPerson ? 'button' : undefined} tabIndex={onPerson ? 0 : undefined} aria-label={onPerson ? `Person ${PEOPLE[i]}, ${deg[i]} handshakes` : undefined}
                        onKeyDown={onPerson ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPerson(i); } } : undefined}
                        style={{ cursor: onPerson ? 'pointer' : 'default' }} className="focus:outline-none">
                        <circle r={19} fill={on ? '#a21caf' : '#1e293b'} stroke={sel ? '#ffffff' : on ? '#f0abfc' : '#475569'} strokeWidth={sel ? 3 : 2} />
                        <text y={5} textAnchor="middle" fontSize={14} fontWeight={700} fill="#f8fafc">{PEOPLE[i]}</text>
                        <g transform={`translate(${Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / p) * 32}, ${Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / p) * 32})`}>
                            <circle r={10} fill="#020617" stroke="#fbbf24" />
                            <text y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fbbf24">{deg[i]}</text>
                        </g>
                    </g>
                );
            })}
            {showHoles && (
                <g>
                    <text x={16} y={holeTop - 10} fontSize={12} fill="#94a3b8">holes = possible handshake counts</text>
                    {Array.from({ length: p }, (_, d) => {
                        const x = 20 + d * holeW;
                        const who = deg.map((v, i) => (v === d ? i : null)).filter(i => i !== null);
                        // 0 and p − 1 cannot both be used: cross out whichever end this party does not use
                        const dead = mergeEnds && ((d === 0 && (usedTop || !used0)) || (d === p - 1 && !usedTop && used0));
                        const shared = who.length > 1;
                        return (
                            <g key={d}>
                                <rect x={x + 4} y={holeTop} width={holeW - 8} height={70} rx={8} fill="#0f172a"
                                    stroke={shared && highlightCollisions ? '#f0abfc' : dead ? '#7f1d1d' : '#334155'} strokeWidth={shared && highlightCollisions ? 2.5 : 1.5}
                                    strokeDasharray={dead ? '5 4' : undefined} />
                                {dead && <line x1={x + 10} y1={holeTop + 6} x2={x + holeW - 10} y2={holeTop + 64} stroke="#f87171" strokeWidth={2} opacity={0.7} />}
                                {who.map((i, j) => (
                                    <text key={i} x={x + holeW / 2} y={holeTop + 20 + j * 15} textAnchor="middle" fontSize={12} fontWeight={700}
                                        fill={hot.has(i) ? '#f0abfc' : '#e2e8f0'}>{PEOPLE[i]}</text>
                                ))}
                                <text x={x + holeW / 2} y={holeTop + 88} textAnchor="middle" fontSize={12} fontWeight={700} fill={dead ? '#f87171' : '#fbbf24'}>{d}</text>
                            </g>
                        );
                    })}
                </g>
            )}
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

export default function PigeonholePrinciplePage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [ex, setEx] = useState({ part: 'holes', counts: evenCounts(7, 5), p: 6, edges: GUIDED_EDGES, selected: null, seed: 7 });
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

    const part = mode === 'guided' ? step.part : ex.part;
    const counts = mode === 'guided' ? (step.counts ?? []) : ex.counts;
    const n = counts.reduce((a, b) => a + b, 0);
    const m = counts.length;
    const p = mode === 'guided' ? (step.p ?? 6) : ex.p;
    const edges = mode === 'guided' ? (step.edges ?? GUIDED_EDGES) : ex.edges;
    const deg = useMemo(() => degreesOf(p, edges), [p, edges]);
    const hiding = mode === 'guided' && predict.hideExplanation;

    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        return step.part === 'holes'
            ? { ...ex, part: 'holes', counts: [...step.counts], selected: null }
            : { ...ex, part: 'hands', p: step.p, edges: [...step.edges], selected: null };
    };
    const update = (fn) => setEx(fn(base()));
    const onHole = (i) => update(s => (s.counts.reduce((a, b) => a + b, 0) >= 40 ? s : { ...s, counts: s.counts.map((c, j) => (j === i ? c + 1 : c)) }));
    const setN = (v) => update(s => {
        const c = [...s.counts];
        let cur = c.reduce((a, b) => a + b, 0);
        while (cur < v) { const i = c.indexOf(Math.min(...c)); c[i]++; cur++; }      // add to the emptiest hole
        while (cur > v) { const i = c.indexOf(Math.max(...c)); c[i]--; cur--; }      // take from the fullest
        return { ...s, counts: c };
    });
    const setM = (v) => update(s => {
        let c = [...s.counts];
        if (v < c.length) { const extra = c.slice(v).reduce((a, b) => a + b, 0); c = c.slice(0, v); c[v - 1] += extra; }
        while (c.length < v) c.push(0);
        return { ...s, counts: c };
    });
    const spread = () => update(s => ({ ...s, counts: evenCounts(s.counts.reduce((a, b) => a + b, 0), s.counts.length) }));
    const onPerson = (i) => update(s => {
        if (s.selected === null) return { ...s, selected: i };
        if (s.selected === i) return { ...s, selected: null };
        const key = edgeKey(s.selected, i);
        return { ...s, edges: s.edges.includes(key) ? s.edges.filter(e => e !== key) : [...s.edges, key], selected: null };
    });
    const setP = (v) => update(s => ({ ...s, p: v, edges: s.edges.filter(e => e.split('-').every(x => Number(x) < v)), selected: null }));
    const shuffle = () => update(s => { const seed = randomSeed(); return { ...s, seed, edges: randomEdges(s.p, seed), selected: null }; });

    const bound = n > 0 ? ceilDiv(n, m) : 0;
    const coll = collisions(deg);
    const formula = part === 'holes'
        ? String.raw`\text{fullest hole} \ge \left\lceil \frac{n}{m} \right\rceil = \left\lceil \frac{${n}}{${m}} \right\rceil = \mathbf{${bound}}`
            + String.raw`\qquad \text{since } ${m} \times ${Math.max(bound - 1, 0)} = ${m * Math.max(bound - 1, 0)} < ${n}`
        : String.raw`\text{${p} people},\; \text{counts in } \{0, \dots, ${p - 1}\},\; \text{never both } 0 \text{ and } ${p - 1} \;\Rightarrow\; \le ${p - 1} \text{ holes} < ${p}`;

    const explanation = mode === 'guided' ? step.explanation : part === 'holes'
        ? (n === 0
            ? 'No pigeons yet. Click a hole to drop one in, or slide n.'
            : `${n} pigeons in ${m} holes. The fullest hole has ${fullest(counts)}, and nothing can push it below ⌈${n} / ${m}⌉ = ${bound}: ${m} holes with at most ${bound - 1} each hold only ${m * (bound - 1)}. ${fullest(counts) === bound ? 'This placement is as even as possible.' : 'Spread them out to reach the bound.'}`)
        : `Handshake counts: ${deg.map((d, i) => `${PEOPLE[i]} ${d}`).join(', ')}. ${coll.length
            ? `${coll.map(c => `${c.who.map(i => PEOPLE[i]).join(', ').replace(/, ([^,]*)$/, ' and $1')} share ${c.d}`).join('; ')}. Try to make every count different — the principle says you cannot.`
            : 'Every count differs?'}`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/combinatorics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Combinatorics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">The Pigeonhole Principle</h1>
                    <p className="text-fuchsia-100 max-w-3xl">
                        Put more pigeons than holes and two must share. Obvious — and yet it proves that something exists without ever finding it, from matching socks to people who shook the same number of hands.
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
                            {mode === 'explore' ? (
                                <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Example">
                                    {[['holes', 'Pigeons', Bird], ['hands', 'Handshakes', Handshake]].map(([key, label, Icon]) => (
                                        <button key={key} role="tab" aria-selected={ex.part === key} onClick={() => setEx(s => ({ ...s, part: key, selected: null }))}
                                            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${ex.part === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                            <Icon className="h-4 w-4" />{label}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                            )}
                        </div>

                        {part === 'holes' ? (
                            <HoleRow counts={counts} holeNames={mode === 'guided' ? step.holeNames : null}
                                holeColors={mode === 'guided' && step.holeNames ? SOCK_COLORS : null}
                                incoming={mode === 'guided' && step.incoming} onHole={onHole} bound={bound} />
                        ) : (
                            <HandshakeStage p={p} edges={edges}
                                showHoles={mode === 'explore' || step.showHoles} mergeEnds={mode === 'explore' || step.mergeEnds}
                                highlightCollisions={mode === 'explore' || step.highlightCollisions}
                                selected={mode === 'explore' ? ex.selected : null} onPerson={onPerson} />
                        )}

                        {mode === 'guided' ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(pl => !pl)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
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
                        ) : ex.part === 'holes' ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={spread} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500">Spread as evenly as possible</button>
                                <button onClick={() => update(s => ({ ...s, counts: s.counts.map(() => 0) }))}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500">Empty the holes</button>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={shuffle} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500">
                                    <Shuffle className="h-3.5 w-3.5" />Random handshakes
                                </button>
                                <button onClick={() => update(s => ({ ...s, edges: [], selected: null }))}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-fuchsia-500">No handshakes</button>
                                <span className="text-xs text-slate-500">seed {ex.seed}</span>
                            </div>
                        )}
                    </div>

                    {mode === 'guided' && predict.prompt && <PredictPrompt predict={predict} accent="fuchsia" />}

                    <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-fuchsia-400 mt-0.5 flex-shrink-0" />
                            <p className="text-fuchsia-200 text-sm leading-relaxed">
                                {hiding ? 'Make your prediction above to reveal this step.' : explanation}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                        <div className="text-slate-100 text-sm sm:text-base">
                            {hiding ? <p className="text-sm text-slate-500">The formula is hidden until you answer.</p> : <Tex block>{formula}</Tex>}
                        </div>
                        {part === 'holes' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ParamSlider label="n (pigeons)" accent="fuchsia" min={0} max={40} value={n} onChange={setN}
                                    hint="Adds to the emptiest hole, removes from the fullest" />
                                <ParamSlider label="m (holes)" accent="fuchsia" min={1} max={10} value={m} onChange={setM} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ParamSlider label="People" accent="fuchsia" min={2} max={8} value={p} onChange={setP} />
                            </div>
                        )}
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Using the principle</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-fuchsia-300 font-semibold">Pigeons</span> — the things being sorted: people, socks, numbers.</li>
                            <li><span className="text-sky-300 font-semibold">Holes</span> — the categories they fall into: birthdays, colours, remainders.</li>
                            <li><span className="text-amber-300 font-semibold">n &gt; m</span> — some hole holds two or more.</li>
                            <li><span className="text-green-300 font-semibold">General form</span> — some hole holds at least ⌈n / m⌉, and an even spread shows that is best.</li>
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
