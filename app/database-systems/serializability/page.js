"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Shuffle, Info, Code2, GitBranch, Clock, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* Schedules are written the textbook way: R1(X) is "T1 reads X". */
const parseOps = (text) => text.split(' ').map(tok => ({ op: tok[0], t: Number(tok[1]), item: tok[3] }));

const PRESETS = [
    { id: 'serial', name: 'Serializable', schedule: parseOps('R1(Y) R2(X) W2(X) R1(X) W1(X) R3(X) W3(Y)') },
    { id: 'lost', name: 'Lost update', schedule: parseOps('R1(X) R2(X) W1(X) W2(X)') },
    { id: 'cycle3', name: 'Three-way cycle', schedule: parseOps('R1(X) W2(X) R2(Y) W3(Y) R3(Z) W1(Z)') },
    { id: 'interleaved', name: 'Interleaved, still serial', schedule: parseOps('R1(X) R2(Y) W1(X) W2(Y) R3(X) R3(Y) W3(Z)') },
];

const opLabel = (o) => `${o.op}${o.t}(${o.item})`;
const conflicts = (a, b) => a.t !== b.t && a.item === b.item && (a.op === 'W' || b.op === 'W');
const KIND_NAME = { RW: 'read–write', WR: 'write–read', WW: 'write–write' };
const kindOf = (a, b) => `${a.op}${b.op}`;

/** A random schedule: three transactions of two or three operations, interleaved. */
function randomSchedule(rand = Math.random) {
    const items = ['X', 'Y', 'Z'];
    const scripts = [1, 2, 3].map(t => Array.from({ length: 2 + Math.floor(rand() * 2) }, () => ({
        t, op: rand() < 0.5 ? 'R' : 'W', item: items[Math.floor(rand() * items.length)],
    })));
    const idx = [0, 0, 0];
    const total = scripts.reduce((n, s) => n + s.length, 0);
    const out = [];
    while (out.length < total) {
        const live = [0, 1, 2].filter(k => idx[k] < scripts[k].length);
        const k = live[Math.floor(rand() * live.length)];
        out.push(scripts[k][idx[k]++]);
    }
    return out;
}

/** Returns the transactions on a cycle, in order, or null. */
function findCycle(txns, edges) {
    const adj = Object.fromEntries(txns.map(t => [t, edges.filter(e => e.from === t).map(e => e.to).sort((a, b) => a - b)]));
    const state = {};
    const stack = [];
    let found = null;
    const dfs = (u) => {
        state[u] = 1;
        stack.push(u);
        for (const v of adj[u]) {
            if (found) return;
            if (state[v] === 1) { found = stack.slice(stack.indexOf(v)); return; }
            if (!state[v]) dfs(v);
        }
        stack.pop();
        state[u] = 2;
    };
    for (const t of txns) if (!state[t] && !found) dfs(t);
    return found;
}

const cycleText = (cycle) => [...cycle, cycle[0]].map(t => `T${t}`).join(' → ');

function generateSteps(schedule) {
    const steps = [];
    const txns = [...new Set(schedule.map(o => o.t))].sort((a, b) => a - b);
    const edges = [];
    const found = [];
    const snap = () => ({ edges: edges.map(e => ({ ...e, items: [...e.items] })), found: found.map(p => [...p]) });
    const push = (data, explanation) => steps.push({ schedule, txns, pair: null, cycle: null, order: [], ready: [], positions: null, ...snap(), ...data, explanation });

    push({ phase: 'intro' }, `${txns.length} transactions, ${schedule.length} operations, interleaved in time from left to right. Two operations conflict when they belong to different transactions, touch the same item and at least one of them writes. Conflicting operations can never be swapped, so their order pins down the order of their transactions.`);

    for (let j = 0; j < schedule.length; j++) {
        for (let i = 0; i < j; i++) {
            const a = schedule[i], b = schedule[j];
            if (!conflicts(a, b)) continue;
            const kind = kindOf(a, b);
            push({ phase: 'pair', pair: [i, j] },
                `${opLabel(a)} at time ${i + 1} and ${opLabel(b)} at time ${j + 1} conflict: both touch ${a.item}, they belong to different transactions, and this is a ${KIND_NAME[kind]} pair. Whatever serial order we pick, T${a.t} has to come before T${b.t}.`);
            found.push([i, j]);
            const existing = edges.find(e => e.from === a.t && e.to === b.t);
            if (existing) {
                if (!existing.items.includes(a.item)) existing.items.push(a.item);
                push({ phase: 'edge', pair: [i, j], newEdge: null },
                    `T${a.t} → T${b.t} is already in the graph, so this conflict adds nothing new — it is one more reason for the same order.`);
            } else {
                const before = findCycle(txns, edges);
                edges.push({ from: a.t, to: b.t, items: [a.item] });
                const after = findCycle(txns, edges);
                const closes = !before && after;
                push({ phase: 'edge', pair: [i, j], newEdge: { from: a.t, to: b.t }, cycle: closes ? after : null },
                    `Edge T${a.t} → T${b.t} goes into the precedence graph, labelled ${a.item}.${closes ? ` It closes a cycle, ${cycleText(after)}: no serial order can satisfy every edge any more.` : ''}`);
            }
        }
    }

    push({ phase: 'check' }, found.length
        ? `All ${found.length} conflicting pairs are in the graph. A schedule is conflict-serializable exactly when its precedence graph has no cycle.`
        : 'No two operations conflict, so the graph has no edges and any serial order is equivalent.');

    const cycle = findCycle(txns, edges);
    if (cycle) {
        push({ phase: 'cycle', cycle, verdict: false },
            `Cycle ${cycleText(cycle)}: each transaction on it must come before the next, all the way round. No serial order satisfies that, so the schedule is not conflict-serializable. A scheduler using two-phase locking would never have let it happen.`);
        return steps;
    }

    const order = [];
    let remaining = [...txns];
    while (remaining.length) {
        const ready = remaining.filter(t => !edges.some(e => e.to === t && remaining.includes(e.from)));
        const pick = ready[0];
        order.push(pick);
        remaining = remaining.filter(t => t !== pick);
        push({ phase: 'topo', order: [...order], ready, pick },
            ready.length > 1
                ? `T${ready.join(' and T')} have no incoming edges from the transactions still left. Any of them can go next — the orders are equivalent — so take T${pick}.`
                : `T${pick} is the only transaction left with no incoming edge from the others, so it goes next.`);
    }

    const rank = Object.fromEntries(order.map((t, k) => [t, k]));
    const sorted = schedule.map((o, i) => i).sort((x, y) => rank[schedule[x].t] - rank[schedule[y].t] || x - y);
    const positions = Object.fromEntries(sorted.map((opIdx, pos) => [opIdx, pos]));
    push({ phase: 'serial', order, positions, verdict: true },
        `Equivalent serial schedule: ${order.map(t => `T${t}`).join(' → ')}. Every conflicting pair still happens in the same order — every arc still points right — so running the transactions one after another this way gives the same result as the interleaving.`);
    return steps;
}

/* Three questions the screen answers on its own: which way the edge for the
   highlighted pair points, whether the finished graph has a cycle, and which
   transaction is free to go next once there is only one. */
const predictFor = (step, next) => {
    if (!step || !next) return null;
    if (step.phase === 'pair' && next.phase === 'edge') {
        const [i, j] = step.pair;
        const a = step.schedule[i], b = step.schedule[j];
        const lo = Math.min(a.t, b.t), hi = Math.max(a.t, b.t);
        const options = [`T${lo} → T${hi}`, `T${hi} → T${lo}`];
        return {
            question: `${opLabel(a)} at time ${i + 1} and ${opLabel(b)} at time ${j + 1} conflict. Which edge does this pair put in the precedence graph?`,
            options,
            correct: options.indexOf(`T${a.t} → T${b.t}`),
            because: `The edge always points from the transaction whose operation came first (T${a.t}, at time ${i + 1}) to the one that came later.`,
        };
    }
    if (step.phase === 'check' && step.found.length > 0) {
        const serializable = next.phase !== 'cycle';
        return {
            question: 'Every conflict is in the graph. Is the schedule conflict-serializable?',
            options: ['Yes — the graph is acyclic', 'No — the graph has a cycle'],
            correct: serializable ? 0 : 1,
            because: serializable
                ? 'Follow the arrows from any transaction: you never get back to where you started, so a topological order exists.'
                : `${cycleText(next.cycle)} is a cycle, so no order can put every transaction before its successors.`,
        };
    }
    if (step.phase === 'topo' && next.phase === 'topo') {
        const remaining = step.txns.filter(t => !step.order.includes(t));
        if (remaining.length < 2 || next.ready.length !== 1) return null;
        return {
            question: `${step.order.map(t => `T${t}`).join(', ')} placed. Which transaction can go next?`,
            options: remaining.map(t => `T${t}`),
            correct: remaining.indexOf(next.pick),
            because: `Only T${next.pick} has no incoming edge from a transaction that has not been placed yet.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'Which pair of operations does NOT conflict?',
        options: ['R1(X) then W2(X)', 'W1(X) then R2(X)', 'R1(X) then R2(X)', 'W1(X) then W2(X)'],
        correct: 2,
        explanation: 'Two reads of the same item give the same values whichever runs first, so they can be swapped freely. Every pair involving at least one write on the same item, from different transactions, conflicts.',
    },
    {
        question: 'The precedence graph of a schedule contains T1 → T2 and T2 → T1. What follows?',
        options: [
            'The schedule is equivalent to T1 then T2',
            'The schedule is not conflict-serializable',
            'The schedule must deadlock',
            'Nothing — two-transaction cycles are harmless',
        ],
        correct: 1,
        explanation: 'T1 must precede T2 because of one conflict and follow it because of another. No serial order satisfies both, so the schedule is not conflict-serializable.',
    },
    {
        question: 'How do you find the equivalent serial order of a conflict-serializable schedule?',
        options: [
            'Order transactions by their first operation',
            'Order transactions by their commit time — always',
            'Topologically sort the precedence graph',
            'Any order works',
        ],
        correct: 2,
        explanation: 'Any topological order of the acyclic precedence graph puts every transaction before the ones its conflicts point to, which is exactly what an equivalent serial schedule needs.',
    },
];

const TXN_STYLE = {
    1: { fill: '#1e3a8a', stroke: '#60a5fa', text: '#dbeafe', tw: 'text-blue-300' },
    2: { fill: '#7c2d12', stroke: '#fb923c', text: '#ffedd5', tw: 'text-orange-300' },
    3: { fill: '#4c1d95', stroke: '#a78bfa', text: '#ede9fe', tw: 'text-violet-300' },
    4: { fill: '#134e4a', stroke: '#2dd4bf', text: '#ccfbf1', tw: 'text-teal-300' },
};

const SLOT = 64, LEFT = 56, LANE = 52, TOP = 30, OPW = 54, OPH = 28;

function ScheduleView({ step }) {
    const { schedule, txns } = step;
    const laneOf = Object.fromEntries(txns.map((t, k) => [t, k]));
    const width = LEFT + schedule.length * SLOT + 10;
    const height = TOP + txns.length * LANE;
    const pos = (i) => (step.positions ? step.positions[i] : i);
    const center = (i) => ({ x: LEFT + pos(i) * SLOT + OPW / 2, y: TOP + laneOf[schedule[i].t] * LANE });
    const current = step.pair;
    const inCurrent = (i) => current && current.includes(i);
    const arc = ([i, j]) => {
        const a = center(i), b = center(j);
        const bend = Math.max(18, Math.abs(b.x - a.x) * 0.25);
        const sx = a.x + OPW / 2 - 4, ex = b.x - OPW / 2 + 4;
        return `M ${sx} ${a.y} C ${sx + bend} ${a.y}, ${ex - bend} ${b.y}, ${ex} ${b.y}`;
    };
    const showArrow = step.phase !== 'pair';
    return (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="overflow-visible">
            <defs>
                <marker id="ser-arrow-cur" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#facc15" />
                </marker>
                <marker id="ser-arrow-old" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
                <marker id="ser-arrow-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#4ade80" />
                </marker>
            </defs>
            {txns.map((t, k) => (
                <g key={t}>
                    <line x1={LEFT - 6} y1={TOP + k * LANE} x2={width - 4} y2={TOP + k * LANE} stroke="#1e293b" strokeWidth="2" />
                    <text x={8} y={TOP + k * LANE + 4} fontSize="13" fontWeight="700" fill={TXN_STYLE[t].stroke}>T{t}</text>
                </g>
            ))}
            {!step.positions && schedule.map((_, i) => (
                <text key={i} x={LEFT + i * SLOT + OPW / 2} y={12} textAnchor="middle" fontSize="9" fill="#475569">t{i + 1}</text>
            ))}
            {step.found.map((p, k) => {
                const isCur = current && p[0] === current[0] && p[1] === current[1];
                if (isCur) return null;
                return <path key={k} d={arc(p)} fill="none" stroke={step.phase === 'serial' ? '#4ade80' : '#475569'} strokeWidth="1.5" opacity={step.phase === 'serial' ? 0.8 : 0.6}
                    markerEnd={step.phase === 'serial' ? 'url(#ser-arrow-ok)' : 'url(#ser-arrow-old)'} />;
            })}
            {current && (
                <path d={arc(current)} fill="none" stroke="#facc15" strokeWidth="2.5" strokeDasharray={showArrow ? undefined : '5 4'}
                    markerEnd={showArrow ? 'url(#ser-arrow-cur)' : undefined} />
            )}
            {schedule.map((o, i) => {
                const st = TXN_STYLE[o.t];
                const c = center(i);
                return (
                    <g key={i} style={{ transform: `translate(${c.x - OPW / 2}px, ${c.y - OPH / 2}px)`, transition: 'transform 0.7s ease' }}>
                        <rect width={OPW} height={OPH} rx="6" fill={inCurrent(i) ? '#facc15' : st.fill} stroke={inCurrent(i) ? '#fde047' : st.stroke} strokeWidth="1.5"
                            style={{ transition: 'fill 0.3s ease' }} />
                        <text x={OPW / 2} y={OPH / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="monospace" fill={inCurrent(i) ? '#0f172a' : st.text}>
                            {o.op}({o.item})
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

const NODE_POS = {
    2: [{ x: 70, y: 110 }, { x: 250, y: 110 }],
    3: [{ x: 70, y: 60 }, { x: 250, y: 60 }, { x: 160, y: 190 }],
    4: [{ x: 70, y: 60 }, { x: 250, y: 60 }, { x: 250, y: 190 }, { x: 70, y: 190 }],
};

function GraphView({ step }) {
    const { txns } = step;
    const layout = NODE_POS[Math.max(2, Math.min(4, txns.length))] ?? NODE_POS[3];
    const at = Object.fromEntries(txns.map((t, k) => [t, layout[k] ?? layout[0]]));
    const R = 24;
    const onCycle = (e) => {
        if (!step.cycle) return false;
        const k = step.cycle.indexOf(e.from);
        return k !== -1 && step.cycle[(k + 1) % step.cycle.length] === e.to;
    };
    const isNew = (e) => step.newEdge && step.newEdge.from === e.from && step.newEdge.to === e.to;
    const edgePath = (e) => {
        const a = at[e.from], b = at[e.to];
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const nx = -uy, ny = ux;
        const mx = (a.x + b.x) / 2 + nx * 26, my = (a.y + b.y) / 2 + ny * 26;
        const sx = a.x + ux * R + nx * 6, sy = a.y + uy * R + ny * 6;
        const ex = b.x - ux * (R + 3) + nx * 6, ey = b.y - uy * (R + 3) + ny * 6;
        return { d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, lx: (sx + 2 * mx + ex) / 4, ly: (sy + 2 * my + ey) / 4 };
    };
    return (
        <svg viewBox="0 0 320 250" width="100%" className="overflow-visible block mx-auto" style={{ maxWidth: 400 }}>
            <defs>
                {[['norm', '#94a3b8'], ['new', '#facc15'], ['cyc', '#f87171'], ['ok', '#4ade80']].map(([id, color]) => (
                    <marker key={id} id={`pg-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                    </marker>
                ))}
            </defs>
            {step.edges.map((e, k) => {
                const p = edgePath(e);
                const cyc = onCycle(e);
                const fresh = isNew(e) && !cyc;
                const done = step.phase === 'serial' || step.phase === 'topo';
                const color = cyc ? '#f87171' : fresh ? '#facc15' : done ? '#4ade80' : '#94a3b8';
                const marker = cyc ? 'cyc' : fresh ? 'new' : done ? 'ok' : 'norm';
                return (
                    <g key={k}>
                        <path d={p.d} fill="none" stroke={color} strokeWidth={cyc || fresh ? 3 : 2} markerEnd={`url(#pg-${marker})`}
                            style={{ transition: 'stroke 0.3s ease' }} />
                        <text x={p.lx} y={p.ly} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{e.items.join(',')}</text>
                    </g>
                );
            })}
            {txns.map(t => {
                const p = at[t];
                const st = TXN_STYLE[t];
                const placed = step.order.indexOf(t);
                const inCycle = step.phase === 'cycle' && step.cycle && step.cycle.includes(t);
                const ready = step.phase === 'topo' && step.ready.includes(t) && placed === -1;
                return (
                    <g key={t}>
                        <circle cx={p.x} cy={p.y} r={R} fill={inCycle ? '#7f1d1d' : placed !== -1 ? '#14532d' : st.fill}
                            stroke={inCycle ? '#f87171' : placed !== -1 ? '#4ade80' : ready ? '#facc15' : st.stroke} strokeWidth="2.5"
                            style={{ transition: 'fill 0.4s ease, stroke 0.4s ease' }} />
                        <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#f8fafc">T{t}</text>
                        {placed !== -1 && (
                            <g>
                                <circle cx={p.x + 20} cy={p.y - 20} r="10" fill="#22c55e" />
                                <text x={p.x + 20} y={p.y - 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#052e16">{placed + 1}</text>
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

function SerializabilityPage() {
    const [presetId, setPresetId] = useState('serial');
    const [schedule, setSchedule] = useState(PRESETS[0].schedule);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(schedule));
        setCurrentStep(0);
    }, [schedule]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
    // usePredict keys answers by step index, so a new run (another preset,
    // level or shuffle) must start with none recorded.
    const resetPredict = predict.reset;
    useEffect(() => { resetPredict(); }, [stepHistory, resetPredict]);

    const choosePreset = (p) => { setIsPlaying(false); setPresetId(p.id); setSchedule(p.schedule); };
    const shuffle = () => { setIsPlaying(false); setPresetId(null); setSchedule(randomSchedule()); };
    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const step = stepHistory[currentStep];
    const currentKind = step && step.pair ? kindOf(step.schedule[step.pair[0]], step.schedule[step.pair[1]]) : null;

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const codeExample = `from itertools import combinations

def precedence_graph(schedule):
    """schedule: list of (txn, op, item), e.g. (1, 'R', 'X')."""
    edges = set()
    for (i, a), (j, b) in combinations(enumerate(schedule), 2):
        ta, op_a, x = a
        tb, op_b, y = b
        if ta != tb and x == y and 'W' in (op_a, op_b):
            edges.add((ta, tb))          # earlier txn -> later txn
    return edges

def serial_order(schedule):
    """A topological order of the graph, or None if it has a cycle."""
    edges = precedence_graph(schedule)
    left = {t for t, _, _ in schedule}
    order = []
    while left:
        free = sorted(t for t in left
                      if not any(u in left and v == t for u, v in edges))
        if not free:
            return None                  # every node has an incoming edge: cycle
        order.append(free[0])
        left.remove(free[0])
    return order

s = [(1,'R','X'), (2,'R','X'), (1,'W','X'), (2,'W','X')]
print(serial_order(s))   # None -- the lost update is not serializable`;

    const verdict = step && (step.phase === 'cycle' ? false : step.phase === 'serial' ? true : null);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-blue-500 to-teal-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/database-systems" className="flex items-center text-white hover:text-blue-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Database Systems
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <GitBranch className="h-10 w-10" />Serializability
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            An interleaved schedule is safe when it is equivalent to running the transactions one at a time. The precedence graph tells you whether it is — and in which order.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Pairs: O(n²)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Cycle check: O(T + E)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Acyclic ⇔ serializable</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs uppercase tracking-wide text-slate-500 mr-1">Schedule</span>
                                {PRESETS.map(p => (
                                    <button key={p.id} onClick={() => choosePreset(p)}
                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${p.id === presetId ? 'bg-blue-500/20 border-blue-400 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                        {p.name}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-3 mb-5">
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50">
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={isPlaying || currentStep === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50">
                                    <SkipBack size={18} />Step Back
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50">
                                    <SkipForward size={18} />Step Forward
                                </button>
                                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={shuffle} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Shuffle
                                </button>
                                <PredictToggle predict={predict} accent="blue" />
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-blue-500" />
                            </div>

                            <div className="mb-5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">{step ? `${step.found.length} conflicts · ${step.edges.length} edges` : ''}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {step && (
                                <div className="space-y-4 mb-5">
                                    <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs uppercase tracking-wide text-slate-500">{step.phase === 'serial' ? 'Equivalent serial schedule' : 'Schedule (time →)'}</span>
                                            {step.phase === 'serial' && <span className="text-xs text-green-400 font-semibold">{step.order.map(t => `T${t}`).join(' → ')}</span>}
                                        </div>
                                        <ScheduleView step={step} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                        <div className="md:col-span-3 bg-slate-800/50 rounded-lg border border-slate-700/60 p-4">
                                            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Precedence graph</div>
                                            <GraphView step={step} />
                                        </div>
                                        <div className="md:col-span-2 space-y-3">
                                            <div className={`rounded-lg border p-3 transition-colors ${verdict === true ? 'border-green-500 bg-green-500/10' : verdict === false ? 'border-red-500 bg-red-500/10' : 'border-slate-700/60 bg-slate-800/50'}`}>
                                                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Verdict</div>
                                                <div className={`flex items-center gap-2 text-sm font-semibold ${verdict === true ? 'text-green-300' : verdict === false ? 'text-red-300' : 'text-slate-400'}`}>
                                                    {verdict === true && <CheckCircle className="h-4 w-4" />}
                                                    {verdict === false && <XCircle className="h-4 w-4" />}
                                                    {verdict === true ? 'Conflict-serializable' : verdict === false ? 'Not conflict-serializable' : 'Still collecting conflicts'}
                                                </div>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                                <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Conflicting pairs</div>
                                                {step.found.length === 0 && !step.pair
                                                    ? <div className="text-xs text-slate-600">none found yet</div>
                                                    : (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {step.found.map(([i, j], k) => (
                                                                <span key={k} className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                                                                    {opLabel(step.schedule[i])}·{opLabel(step.schedule[j])}
                                                                </span>
                                                            ))}
                                                            {step.phase === 'pair' && (
                                                                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-yellow-400/20 border border-yellow-400/60 text-yellow-200">
                                                                    {opLabel(step.schedule[step.pair[0]])}·{opLabel(step.schedule[step.pair[1]])}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {predict.prompt && (
                                <div className="mb-4">
                                    <PredictPrompt predict={predict} accent="blue" />
                                </div>
                            )}

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-blue-200 text-sm leading-relaxed">
                                        {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step?.explanation ?? 'Click Play to begin.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-blue-400" />
                                <h3 className="font-bold text-white">When Two Operations Conflict</h3>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">Same item, different transactions:</p>
                            <div className="space-y-2 text-sm">
                                {[['RR', 'read → read', false], ['RW', 'read → write', true], ['WR', 'write → read', true], ['WW', 'write → write', true]].map(([k, label, c]) => (
                                    <div key={k} className={`flex justify-between items-center rounded-lg px-2 py-1.5 border transition-colors ${currentKind === k ? 'border-yellow-400/60 bg-yellow-400/10' : 'border-transparent'}`}>
                                        <span className="text-slate-300 font-mono">{label}</span>
                                        <code className={`px-2 py-0.5 rounded text-xs ${c ? 'bg-red-500/15 text-red-300' : 'bg-green-500/15 text-green-300'}`}>{c ? 'conflict' : 'swappable'}</code>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                Conflict-serializability is the test real schedulers enforce. A few schedules — with blind writes — are view-serializable without being conflict-serializable, but checking view-serializability is NP-complete.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect score!' : 'Keep practicing!'}</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">Try Again</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-sm font-medium text-slate-200 mb-3">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((option, i) => {
                                            let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                                            if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-blue-500 hover:text-white bg-slate-800/50';
                                            else if (i === quizQuestions[quizState.current].correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                                            return <button key={i} onClick={() => handleQuizAnswer(i)} className={cls}>{option}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQuestion} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                                                {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python Code
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SerializabilityPage;
