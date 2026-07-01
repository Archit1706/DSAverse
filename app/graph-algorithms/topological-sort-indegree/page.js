"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What does a topological sort produce, and when does it exist?",
        options: [
            "A shortest path; for any graph",
            "A linear ordering where every edge goes from earlier to later; only for a DAG (no cycles)",
            "A minimum spanning tree; for weighted graphs",
            "The connected components; for undirected graphs",
        ],
        correct: 1,
        explanation: "A topological order lists the nodes so that every directed edge u→v has u before v. It exists only for a Directed Acyclic Graph — a cycle would require a node to come before itself.",
    },
    {
        question: "What does Kahn's algorithm repeatedly do?",
        options: [
            "Remove the node with the highest out-degree",
            "Remove any node whose in-degree is currently zero, then decrement its neighbours' in-degrees",
            "Pick the smallest-weight edge",
            "Run DFS and reverse the finish order",
        ],
        correct: 1,
        explanation: "Kahn's keeps a queue of in-degree-zero nodes (nothing left pointing at them). It removes one, appends it to the order, and decrements each neighbour's in-degree — enqueueing any that hit zero.",
    },
    {
        question: "During Kahn's algorithm, how do you detect that the graph has a cycle?",
        options: [
            "The queue grows without bound",
            "A node's in-degree goes negative",
            "The output order contains fewer than all the nodes when the queue empties",
            "Two nodes share the same in-degree",
        ],
        correct: 2,
        explanation: "If a cycle exists, its nodes never reach in-degree zero, so the queue empties before all nodes are output. Comparing the count of sorted nodes to the total detects the cycle.",
    },
];

// Directed acyclic graph (fixed) — layered left→right
const NODES = [
    { id: 0, x: 70,  y: 180 },
    { id: 1, x: 190, y: 90  }, { id: 2, x: 190, y: 270 },
    { id: 3, x: 310, y: 180 },
    { id: 4, x: 430, y: 90  }, { id: 5, x: 430, y: 270 },
    { id: 6, x: 520, y: 180 },
];
const DIRECTED_EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]];
const OUT = (() => {
    const o = {}; NODES.forEach(n => o[n.id] = []);
    DIRECTED_EDGES.forEach(([a, b]) => o[a].push(b));
    return o;
})();

const NODE_COLORS = {
    unprocessed: { fill: '#334155', stroke: '#64748b', text: '#94a3b8' },
    ready:       { fill: '#a16207', stroke: '#eab308', text: '#fef9c3' },
    current:     { fill: '#c2410c', stroke: '#f97316', text: '#fff7ed' },
    done:        { fill: '#15803d', stroke: '#22c55e', text: '#f0fdf4' },
};
const ekey = (a, b) => `${a}->${b}`;

function generateSteps() {
    const steps = [];
    const indeg = {};
    NODES.forEach(n => indeg[n.id] = 0);
    DIRECTED_EDGES.forEach(([, b]) => indeg[b]++);

    const ns = {};
    NODES.forEach(n => ns[n.id] = indeg[n.id] === 0 ? 'ready' : 'unprocessed');

    const snap = (queue, order, activeEdge, current, explanation, doneSet) => {
        const s = {};
        NODES.forEach(n => {
            if (doneSet.has(n.id)) s[n.id] = 'done';
            else if (n.id === current) s[n.id] = 'current';
            else if (queue.includes(n.id)) s[n.id] = 'ready';
            else s[n.id] = 'unprocessed';
        });
        return { nodeStates: s, indeg: { ...indeg }, queue: [...queue], order: [...order], activeEdge, explanation };
    };

    const done = new Set();
    let queue = NODES.filter(n => indeg[n.id] === 0).map(n => n.id);
    let order = [];

    steps.push(snap(queue, order, null, null,
        `Compute each node's in-degree (the number of edges pointing at it). Nodes with in-degree 0 have no prerequisites and are ready — here: [${queue.join(', ')}]. They seed the queue.`, done));

    while (queue.length > 0) {
        const u = queue.shift();
        order.push(u);
        steps.push(snap(queue, order, null, u,
            `Dequeue node ${u} (in-degree 0) and append it to the order: [${order.join(' → ')}]. Now remove its outgoing edges and update neighbours.`, done));

        for (const v of OUT[u]) {
            indeg[v] -= 1;
            const enq = indeg[v] === 0;
            if (enq) queue.push(v);
            steps.push(snap(queue, order, ekey(u, v), u,
                `Edge ${u}→${v} removed. in-degree[${v}] is now ${indeg[v]}.${enq ? ` It hit 0 — node ${v} is ready, enqueue it.` : ''}`, done));
        }
        done.add(u);
        steps.push(snap(queue, order, null, null,
            `Node ${u} fully processed. Ready queue: [${queue.join(', ') || 'empty'}]. Order so far: [${order.join(' → ')}].`, done));
    }

    const complete = order.length === NODES.length;
    steps.push(snap(queue, order, null, null,
        complete
            ? `Done! A valid topological order is [${order.join(' → ')}]. Every edge points from an earlier node to a later one.`
            : `Queue is empty but only ${order.length}/${NODES.length} nodes were output — the graph has a cycle, so no topological order exists.`, done));
    return steps;
}

const codeExample = `from collections import deque

def topo_sort_kahn(graph, n):        # graph[u] = [v, ...]
    indeg = [0] * n
    for u in range(n):
        for v in graph[u]:
            indeg[v] += 1

    queue = deque(u for u in range(n) if indeg[u] == 0)
    order = []
    while queue:
        u = queue.popleft()          # a node with no prerequisites
        order.append(u)
        for v in graph[u]:           # "remove" u's edges
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)

    if len(order) != n:
        raise ValueError("graph has a cycle")
    return order                     # O(V + E)`;

export default function TopoSortIndegreePage() {
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => { setStepHistory(generateSteps()); setCurrentStep(0); setIsPlaying(false); }, []);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const state = stepHistory[currentStep] || { nodeStates: {}, indeg: {}, queue: [], order: [], activeEdge: null, explanation: '' };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-cyan-600 to-sky-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/graph-algorithms" className="flex items-center text-white hover:text-cyan-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Graph Algorithms
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Topological Sort — Kahn's Algorithm</h1>
                        <p className="text-xl text-cyan-100 mb-6 max-w-3xl mx-auto">
                            Order a directed acyclic graph so every edge points forward — by repeatedly peeling off nodes that have no remaining prerequisites (in-degree 0).
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(V + E)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(V)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Uses: In-degrees + Queue</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Graph: Directed Acyclic</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            {/* Controls */}
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button onClick={() => setIsPlaying(p => !p)}
                                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
                                    disabled={currentStep >= stepHistory.length - 1 && !isPlaying}>
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => { if (currentStep > 0) setCurrentStep(p => p - 1); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                                    disabled={isPlaying || currentStep === 0}>
                                    <SkipBack size={18} />Step Back
                                </button>
                                <button onClick={() => { if (currentStep < stepHistory.length - 1) setCurrentStep(p => p + 1); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                                    disabled={isPlaying || currentStep >= stepHistory.length - 1}>
                                    <SkipForward size={18} />Step Forward
                                </button>
                                <button onClick={() => { setIsPlaying(false); setCurrentStep(0); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="300" max="2000" value={speed}
                                    onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-xs accent-cyan-500" />
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between text-sm text-slate-400 mb-1">
                                    <span>Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span>{Math.round(((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {/* Directed Graph SVG */}
                            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 mb-6">
                                <svg viewBox="0 0 560 360" className="w-full" style={{ maxHeight: '320px' }}>
                                    <defs>
                                        <marker id="ts-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                                            <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                                        </marker>
                                    </defs>
                                    {DIRECTED_EDGES.map(([a, b], idx) => {
                                        const na = NODES.find(n => n.id === a);
                                        const nb = NODES.find(n => n.id === b);
                                        const dx = nb.x - na.x, dy = nb.y - na.y, len = Math.hypot(dx, dy) || 1;
                                        const ux = dx / len, uy = dy / len;
                                        const x1 = na.x + ux * 24, y1 = na.y + uy * 24;
                                        const x2 = nb.x - ux * 26, y2 = nb.y - uy * 26;
                                        const active = state.activeEdge === ekey(a, b);
                                        const stroke = active ? '#f97316' : '#475569';
                                        return (
                                            <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2}
                                                stroke={stroke} strokeWidth={active ? 3 : 1.6} strokeOpacity={active ? 1 : 0.6}
                                                markerEnd="url(#ts-arrow)" className="transition-all duration-300" />
                                        );
                                    })}
                                    {NODES.map(n => {
                                        const st = state.nodeStates[n.id] || 'unprocessed';
                                        const c = NODE_COLORS[st];
                                        const d = state.indeg[n.id];
                                        return (
                                            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                                                <circle r={st === 'current' ? 26 : 22}
                                                    fill={c.fill} stroke={c.stroke} strokeWidth={2.5}
                                                    className="transition-all duration-300" />
                                                <text textAnchor="middle" dominantBaseline="central"
                                                    fill={c.text} fontSize="14" fontWeight="bold">{n.id}</text>
                                                {st !== 'done' && d !== undefined && (
                                                    <text textAnchor="middle" y={-32} fill="#94a3b8" fontSize="11">in={d}</text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                                <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-slate-400">
                                    {[[NODE_COLORS.unprocessed, 'Waiting (in>0)'], [NODE_COLORS.ready, 'Ready (in=0)'], [NODE_COLORS.current, 'Removing'], [NODE_COLORS.done, 'Sorted']].map(([c, l]) => (
                                        <div key={l} className="flex items-center gap-1.5">
                                            <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" /></svg>
                                            <span>{l}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ready queue */}
                            <div className="mb-4">
                                <span className="text-sm font-semibold text-slate-300">Ready queue (in-degree 0): </span>
                                <div className="flex items-center gap-1 min-h-10 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700/50 mt-1">
                                    {state.queue.length === 0
                                        ? <span className="text-slate-500 text-sm italic">Empty</span>
                                        : state.queue.map((n, i) => (
                                            <React.Fragment key={i}>
                                                <div className="w-8 h-8 rounded-full bg-yellow-600 text-yellow-100 flex items-center justify-center text-sm font-bold">{n}</div>
                                                {i < state.queue.length - 1 && <span className="text-slate-600 text-xs">→</span>}
                                            </React.Fragment>
                                        ))}
                                </div>
                            </div>

                            {/* Topological order */}
                            <div className="mb-6">
                                <span className="text-sm font-semibold text-slate-300">Topological order: </span>
                                <div className="flex items-center gap-1 min-h-10 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700/50 mt-1">
                                    {state.order.length === 0
                                        ? <span className="text-slate-500 text-sm italic">—</span>
                                        : state.order.map((n, i) => (
                                            <React.Fragment key={i}>
                                                <div className="w-8 h-8 rounded-full bg-green-700 text-green-100 flex items-center justify-center text-sm font-bold">{n}</div>
                                                {i < state.order.length - 1 && <span className="text-slate-600 text-xs">→</span>}
                                            </React.Fragment>
                                        ))}
                                </div>
                            </div>

                            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-cyan-300 mb-1">Current Step</h3>
                                        <p className="text-cyan-200 text-sm leading-relaxed">{state.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4"><Clock className="h-5 w-5 text-cyan-500" /><h3 className="font-bold text-white">Algorithm Details</h3></div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(V + E)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(V)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Data Structure:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">Queue</span></div>
                                <div className="flex justify-between"><span className="text-slate-300">Detects cycle:</span><span className="bg-green-500/15 text-green-400 px-2 py-1 rounded">Yes</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Where It's Used</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Build systems & task scheduling (dependencies first)</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Course prerequisites, package installation order</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Detecting cycles in dependency graphs</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Graphs with cycles — no valid ordering exists</span></li>
                            </ul>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : 'Keep practicing!'}</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                                        className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 text-sm font-medium">Try Again</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-sm font-medium text-slate-200 mb-3">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((opt, i) => {
                                            let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                                            if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-white bg-slate-800/50';
                                            else if (i === quizQuestions[quizState.current].correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                                            return <button key={i} onClick={() => handleAnswer(i)} className={cls}>{opt}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQ} className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 text-sm font-medium">
                                                {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium">
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
