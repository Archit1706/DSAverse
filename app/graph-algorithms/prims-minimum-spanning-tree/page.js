"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Settings2 } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { GraphCustomizer, layoutNodes } from '@/components/GraphCustomizer';

const quizQuestions = [
    {
        question: "What does Prim's algorithm build?",
        options: [
            "The shortest path between two nodes",
            "A minimum spanning tree — the cheapest set of edges connecting all nodes",
            "A topological ordering",
            "All connected components",
        ],
        correct: 1,
        explanation: "Prim's produces a Minimum Spanning Tree (MST): a subset of edges that connects every node with the least possible total weight and no cycles. Note this is not the same as shortest paths.",
    },
    {
        question: "At each step, which edge does Prim's add?",
        options: [
            "The globally smallest unused edge",
            "The cheapest edge crossing from the tree to a node not yet in the tree",
            "A random edge from the frontier",
            "The edge with the most endpoints in the tree",
        ],
        correct: 1,
        explanation: "Prim's grows one tree. It always adds the minimum-weight edge on the 'cut' — the boundary between in-tree nodes and the rest — bringing exactly one new node into the tree each step.",
    },
    {
        question: "How does Prim's differ from Kruskal's?",
        options: [
            "They produce different trees",
            "Prim's grows one tree from a start node; Kruskal's adds globally-cheapest edges anywhere, merging forests with union-find",
            "Prim's only works on directed graphs",
            "Kruskal's cannot handle weights",
        ],
        correct: 1,
        explanation: "Both find an MST. Prim's expands a single connected tree outward from a start node via the cut. Kruskal's sorts all edges and adds the cheapest that doesn't form a cycle, merging separate trees using union-find.",
    },
];

// Default weighted, connected graph
const DEFAULT_NODES = [
    { id: 0, x: 80, y: 180 }, { id: 1, x: 210, y: 90 },
    { id: 2, x: 210, y: 270 }, { id: 3, x: 340, y: 40 },
    { id: 4, x: 340, y: 180 }, { id: 5, x: 340, y: 320 },
    { id: 6, x: 460, y: 180 },
];
const DEFAULT_WEIGHTED_EDGES = [[0, 1, 4], [0, 2, 2], [1, 3, 5], [1, 4, 10], [2, 4, 3], [2, 5, 8], [3, 6, 2], [4, 6, 7], [5, 6, 6]];

const NODE_COLORS = {
    unvisited: { fill: '#334155', stroke: '#64748b', text: '#94a3b8' },
    inQueue:   { fill: '#a16207', stroke: '#eab308', text: '#fef9c3' },
    current:   { fill: '#c2410c', stroke: '#f97316', text: '#fff7ed' },
    inTree:    { fill: '#15803d', stroke: '#22c55e', text: '#f0fdf4' },
};

const ekey = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

function generateSteps(startNode, nodes, weightedEdges) {
    const steps = [];
    const nsFrom = (inTree, frontier = [], current = null) => {
        const o = {};
        for (const n of nodes) o[n.id] = inTree.has(n.id) ? 'inTree' : 'unvisited';
        for (const f of frontier) if (!inTree.has(f)) o[f] = 'inQueue';
        if (current != null) o[current] = 'current';
        return o;
    };
    const snap = (ns, treeEdges, candidateEdges, chosen, total, explanation) => ({
        nodeStates: ns, treeEdges: [...treeEdges], candidateEdges: [...candidateEdges], chosen, total, explanation,
    });

    const inTree = new Set([startNode]);
    const treeEdges = [];
    let total = 0;

    steps.push(snap(nsFrom(inTree), treeEdges, [], null, 0,
        `Start Prim's from node ${startNode}. The tree begins as a single node {${startNode}}. We'll repeatedly add the cheapest edge that reaches a node not yet in the tree.`));

    while (inTree.size < nodes.length) {
        const candidates = weightedEdges.filter(([a, b]) => inTree.has(a) !== inTree.has(b));
        if (candidates.length === 0) {
            steps.push(snap(nsFrom(inTree), treeEdges, [], null, total,
                `No edge crosses out of the tree — the graph is disconnected, so no spanning tree covers every node. Stopping.`));
            break;
        }
        const frontier = candidates.map(([a, b]) => (inTree.has(a) ? b : a));
        const candKeys = candidates.map(([a, b]) => ekey(a, b));
        steps.push(snap(nsFrom(inTree, frontier), treeEdges, candKeys, null, total,
            `Look at the cut: every edge with exactly one endpoint in the tree is a candidate (${candidates.map(([a, b, w]) => `${a}-${b}:${w}`).join(', ')}). Pick the cheapest.`));

        const min = candidates.reduce((m, e) => (e[2] < m[2] ? e : m), candidates[0]);
        const [ma, mb, mw] = min;
        const outNode = inTree.has(ma) ? mb : ma;
        steps.push(snap(nsFrom(inTree, frontier, outNode), treeEdges, candKeys, ekey(ma, mb), total,
            `Cheapest crossing edge is ${ma}-${mb} (weight ${mw}). Add it to the MST and bring node ${outNode} into the tree.`));

        inTree.add(outNode);
        treeEdges.push(ekey(ma, mb));
        total += mw;
        steps.push(snap(nsFrom(inTree), treeEdges, [], null, total,
            `Node ${outNode} joins the tree via edge ${ma}-${mb}. MST weight so far: ${total}. Tree now has ${inTree.size} of ${nodes.length} nodes.`));
    }

    if (inTree.size === nodes.length) {
        steps.push(snap(nsFrom(inTree), treeEdges, [], null, total,
            `MST complete! ${treeEdges.length} edges connect all ${nodes.length} nodes with minimum total weight ${total}. No cycles, every node reachable.`));
    }
    return steps;
}

const codeExample = `import heapq

def prim(graph, start, n):          # graph[u] = [(v, weight), ...]
    in_tree = [False] * n
    in_tree[start] = True
    # min-heap of crossing edges: (weight, from, to)
    heap = [(w, start, v) for v, w in graph[start]]
    heapq.heapify(heap)
    mst, total = [], 0

    while heap and len(mst) < n - 1:
        w, u, v = heapq.heappop(heap)   # cheapest crossing edge
        if in_tree[v]:
            continue                    # v already in tree -> skip
        in_tree[v] = True
        mst.append((u, v, w)); total += w
        for nxt, wt in graph[v]:        # add v's new crossing edges
            if not in_tree[nxt]:
                heapq.heappush(heap, (wt, v, nxt))

    return mst, total                   # O(E log V)`;

export default function PrimsMSTPage() {
    const [customGraph, setCustomGraph] = useState(null);
    const [showCustomizer, setShowCustomizer] = useState(false);

    const nodes = customGraph ? layoutNodes(customGraph.nodeCount) : DEFAULT_NODES;
    const weightedEdges = customGraph ? customGraph.edges : DEFAULT_WEIGHTED_EDGES;

    const [startNode, setStartNode] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => { setStartNode(prev => Math.min(prev, nodes.length - 1)); }, [nodes.length]);

    useEffect(() => {
        const safeStart = Math.min(startNode, nodes.length - 1);
        setStepHistory(generateSteps(safeStart, nodes, weightedEdges));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [startNode, customGraph]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const state = stepHistory[currentStep] || { nodeStates: {}, treeEdges: [], candidateEdges: [], chosen: null, total: 0, explanation: '' };

    const edgeStyle = (a, b) => {
        const k = ekey(a, b);
        if (state.treeEdges.includes(k)) return { stroke: '#22c55e', width: 3, opacity: 1, label: '#22c55e' };
        if (state.chosen === k) return { stroke: '#f97316', width: 3, opacity: 1, label: '#f97316' };
        if (state.candidateEdges.includes(k)) return { stroke: '#eab308', width: 2.5, opacity: 0.9, label: '#eab308' };
        return { stroke: '#475569', width: 1.5, opacity: 0.5, label: '#94a3b8' };
    };

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
                onApply={(result) => { setCustomGraph(result); setStartNode(0); }} weighted={true} />

            <div className="bg-gradient-to-r from-cyan-600 to-sky-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/graph-algorithms" className="flex items-center text-white hover:text-cyan-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Graph Algorithms
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Prim's Minimum Spanning Tree</h1>
                        <p className="text-xl text-cyan-100 mb-6 max-w-3xl mx-auto">
                            Watch a minimum spanning tree grow outward from a start node — at every step, the cheapest edge crossing the cut pulls one new node into the tree.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(E log V)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(V + E)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Uses: Min-Heap</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Greedy: Cut Property</div>
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
                                <div className="flex items-center gap-2 mr-2">
                                    <span className="text-sm font-medium text-slate-300">Start Node:</span>
                                    {nodes.map(n => (
                                        <button key={n.id} onClick={() => setStartNode(n.id)}
                                            className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${startNode === n.id ? 'bg-cyan-500 text-white scale-110' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                            {n.id}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setShowCustomizer(true)}
                                    className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${customGraph ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-cyan-500 hover:text-cyan-300'}`}>
                                    <Settings2 className="h-4 w-4" />
                                    {customGraph ? 'Custom Graph' : 'Customize Graph'}
                                </button>
                                {customGraph && (
                                    <button onClick={() => { setCustomGraph(null); setStartNode(0); }}
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
                                    <span>MST weight: <span className="text-cyan-300 font-bold">{state.total}</span></span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {/* Graph SVG — weighted */}
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
                                        const st = state.nodeStates[n.id] || 'unvisited';
                                        const c = NODE_COLORS[st];
                                        return (
                                            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                                                <circle r={st === 'current' ? 26 : 22}
                                                    fill={c.fill} stroke={c.stroke} strokeWidth={2.5}
                                                    className="transition-all duration-300" />
                                                <text textAnchor="middle" dominantBaseline="central"
                                                    fill={c.text} fontSize="14" fontWeight="bold">{n.id}</text>
                                            </g>
                                        );
                                    })}
                                </svg>
                                <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-slate-400">
                                    {[[NODE_COLORS.unvisited, 'Not in tree'], [NODE_COLORS.inQueue, 'Frontier (cut)'], [NODE_COLORS.current, 'Joining'], [NODE_COLORS.inTree, 'In MST']].map(([c, l]) => (
                                        <div key={l} className="flex items-center gap-1.5">
                                            <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" /></svg>
                                            <span>{l}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1.5">
                                        <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#22c55e" strokeWidth="3" /></svg>
                                        <span>MST edge</span>
                                    </div>
                                </div>
                            </div>

                            {/* MST edges list */}
                            <div className="mb-6 text-sm">
                                <span className="font-semibold text-slate-300">MST edges: </span>
                                {state.treeEdges.length === 0
                                    ? <span className="text-slate-500 italic">none yet</span>
                                    : <span className="text-green-300 font-mono">{state.treeEdges.join(', ')}</span>}
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
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(E log V)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(V + E)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Data Structure:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">Min-Heap</span></div>
                                <div className="flex justify-between"><span className="text-slate-300">Strategy:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">Greedy (cut)</span></div>
                            </div>
                            {customGraph && (
                                <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400">
                                    <span className="text-cyan-400 font-medium">Custom graph: </span>
                                    {customGraph.nodeCount} nodes, {customGraph.edges.length} edges
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Idea: The Cut Property</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>The cheapest edge crossing any cut is always safe to add to the MST</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Great for dense graphs with an adjacency-matrix variant</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Always yields one connected tree as it grows</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Not for shortest paths — that's Dijkstra's job</span></li>
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
