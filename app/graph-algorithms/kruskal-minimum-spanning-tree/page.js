"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Settings2 } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { GraphCustomizer, layoutNodes } from '@/components/GraphCustomizer';

const quizQuestions = [
    {
        question: "How does Kruskal's algorithm decide which edges to keep?",
        options: [
            "It grows a tree outward from a start node",
            "It sorts all edges by weight and adds each one unless it would form a cycle",
            "It adds the most expensive edges first",
            "It picks edges at random until all nodes connect",
        ],
        correct: 1,
        explanation: "Kruskal's is greedy on globally-sorted edges: process edges cheapest-first, adding an edge only if its endpoints are in different components (adding it can't create a cycle). Stop once V−1 edges are chosen.",
    },
    {
        question: "What data structure tells Kruskal's whether an edge would create a cycle?",
        options: [
            "A min-heap",
            "A queue",
            "Union-Find (disjoint set union)",
            "A hash map of visited edges",
        ],
        correct: 2,
        explanation: "Union-Find tracks which nodes are already connected. find(u) == find(v) means u and v are in the same component, so the edge would close a cycle — skip it. Otherwise union(u, v) merges the two components.",
    },
    {
        question: "How does Kruskal's differ from Prim's?",
        options: [
            "Kruskal's finds shortest paths, Prim's finds the MST",
            "Kruskal's sorts all edges globally and merges separate forests with union-find; Prim's grows one connected tree from a start node",
            "They always pick edges in the same order",
            "Prim's cannot handle weighted graphs",
        ],
        correct: 1,
        explanation: "Both build an MST. Kruskal's considers edges globally by weight, merging a forest of trees until one remains. Prim's expands a single tree from a start node via the cheapest edge on its cut. Kruskal's shines on sparse edge lists; Prim's on dense graphs.",
    },
];

const DEFAULT_NODES = [
    { id: 0, x: 80, y: 180 }, { id: 1, x: 210, y: 90 },
    { id: 2, x: 210, y: 270 }, { id: 3, x: 340, y: 40 },
    { id: 4, x: 340, y: 180 }, { id: 5, x: 340, y: 320 },
    { id: 6, x: 460, y: 180 },
];
const DEFAULT_WEIGHTED_EDGES = [[0, 1, 4], [0, 2, 2], [1, 3, 5], [1, 4, 10], [2, 4, 3], [2, 5, 8], [3, 6, 2], [4, 6, 7], [5, 6, 6]];

const SET_COLORS = [
    { fill: '#15803d', stroke: '#22c55e', text: '#f0fdf4' },
    { fill: '#1d4ed8', stroke: '#3b82f6', text: '#eff6ff' },
    { fill: '#a21caf', stroke: '#d946ef', text: '#fdf4ff' },
    { fill: '#b45309', stroke: '#f59e0b', text: '#fffbeb' },
    { fill: '#0f766e', stroke: '#14b8a6', text: '#f0fdfa' },
    { fill: '#be123c', stroke: '#f43f5e', text: '#fff1f2' },
    { fill: '#4d7c0f', stroke: '#84cc16', text: '#f7fee7' },
];
const ekey = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

function generateSteps(nodes, weightedEdges) {
    const steps = [];
    const parent = {}; const rank = {};
    nodes.forEach(n => { parent[n.id] = n.id; rank[n.id] = 0; });
    const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const union = (a, b) => {
        let ra = find(a), rb = find(b);
        if (ra === rb) return false;
        if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
        parent[rb] = ra;
        if (rank[ra] === rank[rb]) rank[ra]++;
        return true;
    };

    const sorted = [...weightedEdges].sort((a, b) => a[2] - b[2]);
    const edgeState = {};
    weightedEdges.forEach(([a, b]) => edgeState[ekey(a, b)] = 'pending');
    const mstEdges = [];
    let total = 0, count = 0;

    const snap = (current, sortedIdx, explanation) => ({
        parent: { ...parent }, edgeState: { ...edgeState }, current,
        mstEdges: [...mstEdges], total, count, sortedIdx, explanation,
    });

    steps.push(snap(null, -1,
        `Kruskal's is greedy on globally-sorted edges. First sort every edge ascending by weight: [${sorted.map(([a, b, w]) => `${a}-${b}:${w}`).join(', ')}]. Each node starts as its own union-find set (its own colour). We'll add edges cheapest-first, skipping any that would close a cycle.`));

    for (let idx = 0; idx < sorted.length; idx++) {
        const [a, b, w] = sorted[idx];
        const key = ekey(a, b);
        edgeState[key] = 'current';
        const ra = find(a), rb = find(b);
        steps.push(snap(key, idx, `Consider edge ${a}-${b} (weight ${w}). find(${a}) = set ${ra}, find(${b}) = set ${rb}. ${ra === rb ? 'Same set…' : 'Different sets…'}`));

        if (ra !== rb) {
            union(a, b);
            edgeState[key] = 'added';
            mstEdges.push(key); total += w; count++;
            steps.push(snap(key, idx, `Different sets → adding ${a}-${b} can't form a cycle. Add it to the MST and union the two components (their colours merge). MST weight ${total}, ${count} edge${count > 1 ? 's' : ''} of ${nodes.length - 1}.`));
        } else {
            edgeState[key] = 'skipped';
            steps.push(snap(key, idx, `Same set already → adding ${a}-${b} would create a cycle. Skip it.`));
        }
        if (count === nodes.length - 1) {
            steps.push(snap(null, idx, `The MST now has ${nodes.length - 1} edges connecting all ${nodes.length} nodes — it's complete. Any remaining edges would only add cycles, so Kruskal's can stop early.`));
            break;
        }
    }

    if (count < nodes.length - 1) {
        steps.push(snap(null, sorted.length - 1, `All edges processed. Collected ${count} edge${count === 1 ? '' : 's'} (total weight ${total}). Fewer than ${nodes.length - 1} means the graph isn't fully connected — this is a minimum spanning forest.`));
    }
    return steps;
}

const codeExample = `class DSU:                            # union-find / disjoint set
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # path compression
            x = self.parent[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                 # same set -> would make a cycle
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        return True

def kruskal(n, edges):                   # edges = [(u, v, w), ...]
    dsu = DSU(n)
    mst, total = [], 0
    for u, v, w in sorted(edges, key=lambda e: e[2]):   # cheapest first
        if dsu.union(u, v):              # different sets -> keep it
            mst.append((u, v, w)); total += w
    return mst, total                    # O(E log E)`;

export default function KruskalMSTPage() {
    const [customGraph, setCustomGraph] = useState(null);
    const [showCustomizer, setShowCustomizer] = useState(false);

    const nodes = customGraph ? layoutNodes(customGraph.nodeCount) : DEFAULT_NODES;
    const weightedEdges = customGraph ? customGraph.edges : DEFAULT_WEIGHTED_EDGES;

    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => { setStepHistory(generateSteps(nodes, weightedEdges)); setCurrentStep(0); setIsPlaying(false); }, [customGraph]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const state = stepHistory[currentStep] || { parent: {}, edgeState: {}, current: null, mstEdges: [], total: 0, count: 0, sortedIdx: -1, explanation: '' };

    const rootOf = (id) => {
        let x = id, p = state.parent;
        if (p[x] === undefined) return id;
        while (p[x] !== x) x = p[x];
        return x;
    };
    const nodeColor = (id) => SET_COLORS[rootOf(id) % SET_COLORS.length];

    const edgeStyle = (a, b) => {
        const st = state.edgeState[ekey(a, b)];
        if (st === 'added') return { stroke: '#22c55e', width: 3, opacity: 1, label: '#22c55e' };
        if (st === 'current') return { stroke: '#f97316', width: 3, opacity: 1, label: '#f97316' };
        if (st === 'skipped') return { stroke: '#ef4444', width: 1.5, opacity: 0.35, label: '#ef4444' };
        return { stroke: '#475569', width: 1.5, opacity: 0.5, label: '#94a3b8' };
    };

    const sortedEdges = [...weightedEdges].sort((a, b) => a[2] - b[2]);

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
            <GraphCustomizer open={showCustomizer} onClose={() => setShowCustomizer(false)}
                onApply={(result) => setCustomGraph(result)} weighted={true} />

            <div className="bg-gradient-to-r from-cyan-600 to-sky-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/graph-algorithms" className="flex items-center text-white hover:text-cyan-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Graph Algorithms
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Kruskal's Minimum Spanning Tree</h1>
                        <p className="text-xl text-cyan-100 mb-6 max-w-3xl mx-auto">
                            Build an MST by sorting every edge and greedily keeping the cheapest ones — using union-find to skip any edge that would close a cycle. Watch separate forests merge into one tree.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(E log E)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(V)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Uses: Union-Find</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Greedy: Sorted edges</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            {/* Graph selector bar */}
                            <div className="flex flex-wrap items-center gap-3 mb-5 pb-5 border-b border-slate-700/50">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-300">MST edges:</span>
                                    <span className="px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-sm font-bold">{state.count} / {nodes.length - 1}</span>
                                    <span className="text-sm font-medium text-slate-300 ml-2">Weight:</span>
                                    <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-300 text-sm font-bold">{state.total}</span>
                                </div>
                                <button onClick={() => setShowCustomizer(true)}
                                    className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${customGraph ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-cyan-500 hover:text-cyan-300'}`}>
                                    <Settings2 className="h-4 w-4" />
                                    {customGraph ? 'Custom Graph' : 'Customize Graph'}
                                </button>
                                {customGraph && (
                                    <button onClick={() => setCustomGraph(null)}
                                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2">
                                        Reset to default
                                    </button>
                                )}
                            </div>

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
                                <input type="range" min="400" max="2500" value={speed}
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

                            {/* Graph SVG — weighted, nodes colored by union-find set */}
                            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 mb-6">
                                <svg viewBox="0 0 540 360" className="w-full" style={{ maxHeight: '320px' }}>
                                    {weightedEdges.map(([a, b, w], idx) => {
                                        const na = nodes.find(n => n.id === a);
                                        const nb = nodes.find(n => n.id === b);
                                        if (!na || !nb) return null;
                                        const es = edgeStyle(a, b);
                                        const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2;
                                        return (
                                            <g key={idx}>
                                                <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                                                    stroke={es.stroke} strokeWidth={es.width} strokeOpacity={es.opacity}
                                                    className="transition-all duration-300" />
                                                <rect x={mx - 9} y={my - 9} width={18} height={16} rx={3} fill="#1e293b" />
                                                <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="central"
                                                    fill={es.label} fontSize="10" fontWeight="bold">{w}</text>
                                            </g>
                                        );
                                    })}
                                    {nodes.map(n => {
                                        const c = nodeColor(n.id);
                                        return (
                                            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                                                <circle r={22} fill={c.fill} stroke={c.stroke} strokeWidth={2.5}
                                                    className="transition-all duration-300" />
                                                <text textAnchor="middle" dominantBaseline="central"
                                                    fill={c.text} fontSize="14" fontWeight="bold">{n.id}</text>
                                            </g>
                                        );
                                    })}
                                </svg>
                                <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-slate-400">
                                    <div className="flex items-center gap-1.5"><svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#22c55e" strokeWidth="3" /></svg><span>In MST</span></div>
                                    <div className="flex items-center gap-1.5"><svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#f97316" strokeWidth="3" /></svg><span>Considering</span></div>
                                    <div className="flex items-center gap-1.5"><svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#ef4444" strokeWidth="2" strokeOpacity="0.4" /></svg><span>Skipped (cycle)</span></div>
                                    <span className="text-slate-500">· node colour = union-find set</span>
                                </div>
                            </div>

                            {/* Sorted edge list */}
                            <div className="mb-6">
                                <span className="text-sm font-semibold text-slate-300">Edges sorted by weight:</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {sortedEdges.map(([a, b, w], i) => {
                                        const st = state.edgeState[ekey(a, b)];
                                        const isCur = i === state.sortedIdx;
                                        let cls = 'px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ';
                                        if (st === 'added') cls += 'border-green-500 bg-green-500/10 text-green-300';
                                        else if (st === 'skipped') cls += 'border-red-500/60 bg-red-500/10 text-red-300/70 line-through';
                                        else if (st === 'current' || isCur) cls += 'border-orange-500 bg-orange-500/10 text-orange-300 scale-105';
                                        else cls += 'border-slate-700 bg-slate-800/50 text-slate-400';
                                        return <span key={i} className={cls}>{a}-{b}<span className="text-slate-500 ml-1">({w})</span></span>;
                                    })}
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
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(E log E)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(V)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Data Structure:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">Union-Find</span></div>
                                <div className="flex justify-between"><span className="text-slate-300">Strategy:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">Greedy (sorted)</span></div>
                            </div>
                            {customGraph && (
                                <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400">
                                    <span className="text-cyan-400 font-medium">Custom graph: </span>
                                    {customGraph.nodeCount} nodes, {customGraph.edges.length} edges
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Kruskal's vs Prim's</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Sorts edges globally — great when edges are few (sparse)</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Union-Find makes the cycle check near O(1)</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Merges a forest of trees; Prim's grows one tree</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Sorting cost hurts on very dense graphs — prefer Prim's there</span></li>
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
