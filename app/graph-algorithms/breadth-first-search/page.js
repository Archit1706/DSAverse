"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Settings2 } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { GraphCustomizer, layoutNodes } from '@/components/GraphCustomizer';

const quizQuestions = [
    {
        question: "What data structure does BFS use to track nodes to visit?",
        options: ["Stack (LIFO)", "Queue (FIFO)", "Priority Queue", "Deque"],
        correct: 1,
        explanation: "BFS uses a Queue (First-In, First-Out). This ensures nodes are explored level by level — all nodes at distance 1 before distance 2, and so on."
    },
    {
        question: "What is BFS's time complexity for a graph with V vertices and E edges?",
        options: ["O(V²)", "O(V log V)", "O(V + E)", "O(E log V)"],
        correct: 2,
        explanation: "BFS visits every vertex once and explores every edge once, giving O(V + E). For dense graphs this approaches O(V²), for sparse graphs it's closer to O(V)."
    },
    {
        question: "BFS guarantees the shortest path between two nodes in which type of graph?",
        options: ["Weighted directed graphs", "Unweighted graphs only", "Any graph with positive weights", "Graphs without cycles"],
        correct: 1,
        explanation: "BFS guarantees the shortest path (minimum edges) only in unweighted graphs. For weighted graphs, Dijkstra's or Bellman-Ford must be used."
    }
];

// Default graph
const DEFAULT_NODES = [
    { id: 0, x: 80, y: 180 }, { id: 1, x: 210, y: 90 },
    { id: 2, x: 210, y: 270 }, { id: 3, x: 340, y: 40 },
    { id: 4, x: 340, y: 180 }, { id: 5, x: 340, y: 320 },
    { id: 6, x: 460, y: 180 },
];
const DEFAULT_EDGES = [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[5,6]];
const DEFAULT_ADJ   = { 0:[1,2], 1:[0,3,4], 2:[0,4,5], 3:[1,6], 4:[1,2,6], 5:[2,6], 6:[3,4,5] };

const NODE_COLORS = {
    unvisited: { fill: '#334155', stroke: '#64748b', text: '#94a3b8' },
    inQueue:   { fill: '#a16207', stroke: '#eab308', text: '#fef9c3' },
    current:   { fill: '#c2410c', stroke: '#f97316', text: '#fff7ed' },
    visited:   { fill: '#15803d', stroke: '#22c55e', text: '#f0fdf4' },
};

function generateBFSSteps(startNode, nodes, adj) {
    const steps = [];
    const ns = Object.fromEntries(nodes.map(n => [n.id, 'unvisited']));

    steps.push({ nodeStates: { ...ns }, queue: [], bfsOrder: [], currentNode: -1, level: {},
        explanation: `Starting BFS from node ${startNode}. Initialize the queue with the start node.` });

    const queue = [startNode];
    const visited = new Set([startNode]);
    const levels = { [startNode]: 0 };
    const bfsOrder = [];
    ns[startNode] = 'inQueue';

    steps.push({ nodeStates: { ...ns }, queue: [...queue], bfsOrder: [...bfsOrder], currentNode: -1, level: { ...levels },
        explanation: `Enqueued node ${startNode} (level 0). Queue: [${queue.join(', ')}]` });

    while (queue.length > 0) {
        const current = queue.shift();
        ns[current] = 'current';
        bfsOrder.push(current);

        steps.push({ nodeStates: { ...ns }, queue: [...queue], bfsOrder: [...bfsOrder], currentNode: current, level: { ...levels },
            explanation: `Dequeued node ${current} (level ${levels[current]}). Exploring unvisited neighbors. Queue: [${queue.join(', ') || 'empty'}]` });

        const neighbors = (adj[current] || []).filter(n => !visited.has(n));
        for (const nb of neighbors) {
            visited.add(nb); queue.push(nb);
            levels[nb] = levels[current] + 1;
            ns[nb] = 'inQueue';
            steps.push({ nodeStates: { ...ns }, queue: [...queue], bfsOrder: [...bfsOrder], currentNode: current, level: { ...levels },
                explanation: `Discovered node ${nb} (level ${levels[nb]}) via node ${current}. Enqueued. Queue: [${queue.join(', ')}]` });
        }
        if (!neighbors.length) {
            steps.push({ nodeStates: { ...ns }, queue: [...queue], bfsOrder: [...bfsOrder], currentNode: current, level: { ...levels },
                explanation: `Node ${current} has no unvisited neighbors.` });
        }
        ns[current] = 'visited';
        steps.push({ nodeStates: { ...ns }, queue: [...queue], bfsOrder: [...bfsOrder], currentNode: -1, level: { ...levels },
            explanation: `Node ${current} fully processed. BFS order so far: [${bfsOrder.join(' → ')}]` });
    }

    steps.push({ nodeStates: { ...ns }, queue: [], bfsOrder: [...bfsOrder], currentNode: -1, level: { ...levels },
        explanation: `BFS complete! Traversal order: ${bfsOrder.join(' → ')}. All reachable nodes visited.` });

    return steps;
}

const codeExample = `from collections import deque

def bfs(graph, start):
    visited = set([start])
    queue = deque([start])
    order = []

    while queue:
        node = queue.popleft()   # O(1) dequeue
        order.append(node)

        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    return order`;

export default function BFSPage() {
    const [customGraph, setCustomGraph] = useState(null);   // null = use default
    const [showCustomizer, setShowCustomizer] = useState(false);

    const nodes = customGraph ? layoutNodes(customGraph.nodeCount) : DEFAULT_NODES;
    const edges = customGraph ? customGraph.edges : DEFAULT_EDGES;
    const adj   = customGraph ? customGraph.adj   : DEFAULT_ADJ;

    const [startNode, setStartNode] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    // Clamp startNode when graph changes
    useEffect(() => {
        setStartNode(prev => Math.min(prev, nodes.length - 1));
    }, [nodes.length]);

    useEffect(() => {
        const safeStart = Math.min(startNode, nodes.length - 1);
        setStepHistory(generateBFSSteps(safeStart, nodes, adj));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [startNode, customGraph]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const state = stepHistory[currentStep] || { nodeStates: {}, queue: [], bfsOrder: [], currentNode: -1, level: {}, explanation: '' };

    const edgeIsTree = (a, b) => {
        const sA = state.nodeStates[a], sB = state.nodeStates[b];
        return (sA === 'visited' || sA === 'current') && (sB === 'visited' || sB === 'inQueue' || sB === 'current');
    };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const handleApplyGraph = (result) => {
        setCustomGraph(result);   // null = reset to default
        setStartNode(0);
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <GraphCustomizer open={showCustomizer} onClose={() => setShowCustomizer(false)}
                onApply={handleApplyGraph} weighted={false} />

            <div className="bg-gradient-to-r from-cyan-600 to-sky-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/graph-algorithms" className="flex items-center text-white hover:text-cyan-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Graph Algorithms
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Breadth-First Search</h1>
                        <p className="text-xl text-cyan-100 mb-6 max-w-3xl mx-auto">
                            Watch BFS explore the graph level by level, discovering all nodes reachable from the start before going deeper.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(V + E)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(V)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Uses: Queue</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Shortest Path: Yes</div>
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
                                <button onClick={() => isPlaying ? setIsPlaying(false) : setIsPlaying(true)}
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
                                    <span>{Math.round(((currentStep + 1) / stepHistory.length) * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                </div>
                            </div>

                            {/* Graph SVG */}
                            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 mb-6">
                                <svg viewBox="0 0 540 360" className="w-full" style={{ maxHeight: '320px' }}>
                                    {edges.map(([a, b], idx) => {
                                        const na = nodes.find(n => n.id === a);
                                        const nb = nodes.find(n => n.id === b);
                                        if (!na || !nb) return null;
                                        const tree = edgeIsTree(a, b) || edgeIsTree(b, a);
                                        return (
                                            <line key={idx} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                                                stroke={tree ? '#22c55e' : '#475569'}
                                                strokeWidth={tree ? 2.5 : 1.5}
                                                strokeOpacity={tree ? 1 : 0.5} />
                                        );
                                    })}
                                    {nodes.map(n => {
                                        const st = state.nodeStates[n.id] || 'unvisited';
                                        const c  = NODE_COLORS[st];
                                        const lv = state.level[n.id];
                                        return (
                                            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                                                <circle r={n.id === state.currentNode ? 26 : 22}
                                                    fill={c.fill} stroke={c.stroke} strokeWidth={2.5}
                                                    className="transition-all duration-300" />
                                                <text textAnchor="middle" dominantBaseline="central"
                                                    fill={c.text} fontSize="14" fontWeight="bold">{n.id}</text>
                                                {lv !== undefined && (
                                                    <text textAnchor="middle" y={-32} fill="#94a3b8" fontSize="11">d={lv}</text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                                <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-slate-400">
                                    {[['#334155','#64748b','Unvisited'],['#a16207','#eab308','In Queue'],['#c2410c','#f97316','Current'],['#15803d','#22c55e','Visited']].map(([f,s,l]) => (
                                        <div key={l} className="flex items-center gap-1.5">
                                            <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={f} stroke={s} strokeWidth="1.5" /></svg>
                                            <span>{l}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Queue */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-semibold text-slate-300">Queue (front → back):</span>
                                </div>
                                <div className="flex items-center gap-1 min-h-10 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700/50">
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

                            {state.bfsOrder.length > 0 && (
                                <div className="mb-6 text-sm">
                                    <span className="font-semibold text-slate-300">BFS Order: </span>
                                    <span className="text-slate-300">{state.bfsOrder.join(' → ')}</span>
                                </div>
                            )}

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
                                <div className="flex justify-between"><span className="text-slate-300">Shortest Path:</span><span className="bg-green-500/15 text-green-400 px-2 py-1 rounded">Yes (unweighted)</span></div>
                            </div>
                            {customGraph && (
                                <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400">
                                    <span className="text-cyan-400 font-medium">Custom graph: </span>
                                    {customGraph.nodeCount} nodes, {customGraph.edges.length} edges
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">When to Use BFS</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Shortest path in unweighted graphs</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Finding all nodes within a given distance</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Checking if a graph is bipartite</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Weighted shortest path (use Dijkstra's)</span></li>
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
