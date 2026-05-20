"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What data structure makes Dijkstra's efficient?",
        options: ["Regular Queue", "Stack", "Min-Priority Queue (Min-Heap)", "Hash Map"],
        correct: 2,
        explanation: "A min-priority queue (min-heap) lets Dijkstra's always process the unvisited node with the smallest known distance in O(log V) time, giving the overall O((V+E) log V) complexity."
    },
    {
        question: "Can Dijkstra's algorithm handle negative edge weights?",
        options: ["Yes, always", "No — it may give wrong results", "Only if there are no negative cycles", "Yes, with a special flag"],
        correct: 1,
        explanation: "Dijkstra's greedy assumption breaks with negative edges — once a node is settled it's never revisited, so a later negative edge could have given a shorter path. Use Bellman-Ford for negative weights."
    },
    {
        question: "What does Dijkstra's guarantee at termination?",
        options: ["A minimum spanning tree", "The shortest path from source to all reachable nodes", "Topological order", "Detection of negative cycles"],
        correct: 1,
        explanation: "When Dijkstra's finishes, the distance table holds the shortest path length from the source to every reachable node. Following the predecessor pointers gives the actual path."
    }
];

// Weighted graph
const NODES = [
    { id: 0, x: 80, y: 180 },
    { id: 1, x: 210, y: 90 },
    { id: 2, x: 210, y: 270 },
    { id: 3, x: 340, y: 40 },
    { id: 4, x: 340, y: 180 },
    { id: 5, x: 340, y: 320 },
    { id: 6, x: 460, y: 180 },
];

// Weighted edges [a, b, weight]
const WEIGHTED_EDGES = [
    [0,1,4],[0,2,2],[1,3,5],[1,4,10],[2,4,3],
    [2,5,8],[3,6,2],[4,6,7],[5,6,6]
];

// Build weighted adjacency list: { node: [[neighbor, weight], ...] }
const WADJ = {};
NODES.forEach(n => { WADJ[n.id] = []; });
WEIGHTED_EDGES.forEach(([a, b, w]) => {
    WADJ[a].push([b, w]);
    WADJ[b].push([a, w]);
});

const NODE_COLORS = {
    unvisited: { fill: '#334155', stroke: '#64748b', text: '#94a3b8' },
    inQueue:   { fill: '#a16207', stroke: '#eab308', text: '#fef9c3' },
    current:   { fill: '#c2410c', stroke: '#f97316', text: '#fff7ed' },
    settled:   { fill: '#15803d', stroke: '#22c55e', text: '#f0fdf4' },
};

const INF = Infinity;

const generateDijkstraSteps = (startNode) => {
    const steps = [];
    const ns = {};
    NODES.forEach(n => { ns[n.id] = 'unvisited'; });
    const dist = {};
    const prev = {};
    NODES.forEach(n => { dist[n.id] = INF; prev[n.id] = -1; });
    dist[startNode] = 0;

    steps.push({
        nodeStates: { ...ns }, dist: { ...dist }, prev: { ...prev },
        pq: [], currentNode: -1, settledEdges: [],
        explanation: `Starting Dijkstra's from node ${startNode}. Initialize all distances to ∞, source distance to 0.`
    });

    // Simple min-heap simulation using sorted array
    const pq = [{ node: startNode, d: 0 }];
    const settled = new Set();
    const settledEdges = [];
    ns[startNode] = 'inQueue';

    steps.push({
        nodeStates: { ...ns }, dist: { ...dist }, prev: { ...prev },
        pq: [...pq], currentNode: -1, settledEdges: [...settledEdges],
        explanation: `Added node ${startNode} to the priority queue with distance 0. Priority queue: [(${startNode}, d=0)]`
    });

    while (pq.length > 0) {
        // Extract min
        pq.sort((a, b) => a.d - b.d);
        const { node: u, d: du } = pq.shift();

        if (settled.has(u)) {
            steps.push({
                nodeStates: { ...ns }, dist: { ...dist }, prev: { ...prev },
                pq: [...pq], currentNode: -1, settledEdges: [...settledEdges],
                explanation: `Popped node ${u} but it's already settled with a shorter distance — skip.`
            });
            continue;
        }

        settled.add(u);
        ns[u] = 'current';
        steps.push({
            nodeStates: { ...ns }, dist: { ...dist }, prev: { ...prev },
            pq: [...pq], currentNode: u, settledEdges: [...settledEdges],
            explanation: `Settled node ${u} with shortest distance ${dist[u]}. Exploring neighbors.`
        });

        for (const [v, w] of WADJ[u]) {
            if (settled.has(v)) continue;
            const newDist = dist[u] + w;
            steps.push({
                nodeStates: { ...ns }, dist: { ...dist }, prev: { ...prev },
                pq: [...pq], currentNode: u, settledEdges: [...settledEdges],
                explanation: `Edge ${u}→${v} (weight ${w}): current dist[${v}] = ${dist[v] === INF ? '∞' : dist[v]}, new path = ${dist[u]} + ${w} = ${newDist}. ${newDist < dist[v] ? 'Update!' : 'No improvement.'}`
            });

            if (newDist < dist[v]) {
                dist[v] = newDist;
                prev[v] = u;
                if (ns[v] === 'unvisited') ns[v] = 'inQueue';
                pq.push({ node: v, d: newDist });

                steps.push({
                    nodeStates: { ...ns }, dist: { ...dist }, prev: { ...prev },
                    pq: [...pq], currentNode: u, settledEdges: [...settledEdges],
                    explanation: `Updated dist[${v}] = ${newDist}, predecessor = ${u}. Added (${v}, d=${newDist}) to priority queue.`
                });
            }
        }

        ns[u] = 'settled';
        settledEdges.push(u);
        steps.push({
            nodeStates: { ...ns }, dist: { ...dist }, prev: { ...prev },
            pq: [...pq], currentNode: -1, settledEdges: [...settledEdges],
            explanation: `Node ${u} finalized. Shortest distance from ${startNode} to ${u} = ${dist[u]}.`
        });
    }

    steps.push({
        nodeStates: { ...ns }, dist: { ...dist }, prev: { ...prev },
        pq: [], currentNode: -1, settledEdges: [...settledEdges],
        explanation: `Dijkstra's complete! Shortest distances from node ${startNode}: ${NODES.map(n => `${n.id}:${dist[n.id] === INF ? '∞' : dist[n.id]}`).join(', ')}`
    });

    return steps;
};

const codeExample = `import heapq

def dijkstra(graph, start):
    # dist[node] = shortest distance from start
    dist = {node: float('inf') for node in graph}
    dist[start] = 0
    prev = {node: None for node in graph}

    # Min-heap: (distance, node)
    heap = [(0, start)]

    while heap:
        d, u = heapq.heappop(heap)

        # Skip if we already found a shorter path
        if d > dist[u]:
            continue

        for v, weight in graph[u]:
            new_dist = dist[u] + weight
            if new_dist < dist[v]:
                dist[v] = new_dist
                prev[v] = u
                heapq.heappush(heap, (new_dist, v))

    return dist, prev

# Reconstruct path from start to target
def get_path(prev, target):
    path = []
    node = target
    while node is not None:
        path.append(node)
        node = prev[node]
    return list(reversed(path))`;

export default function DijkstraPage() {
    const [startNode, setStartNode] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateDijkstraSteps(startNode));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [startNode]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const state = stepHistory[currentStep] || { nodeStates: {}, dist: {}, prev: {}, pq: [], currentNode: -1, settledEdges: [], explanation: '' };

    const handleQuizAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQuestion = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };
    const resetQuiz = () => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const isTreeEdge = (a, b) => state.prev[b] === a || state.prev[a] === b;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Dijkstra&apos;s Shortest Path</h1>
                        <p className="text-xl text-cyan-100 mb-6 max-w-3xl mx-auto">
                            Watch Dijkstra&apos;s greedily relax edges to find the shortest path from the source to every reachable node.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O((V+E) log V)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(V)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Uses: Min-Heap</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Non-negative weights only</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap items-center gap-3 mb-6">
                                <span className="text-sm font-medium text-slate-300">Start Node:</span>
                                {NODES.map(n => (
                                    <button key={n.id} onClick={() => setStartNode(n.id)}
                                        className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${startNode === n.id ? 'bg-cyan-500 text-white scale-110' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                        {n.id}
                                    </button>
                                ))}
                            </div>

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
                                <input type="range" min="400" max="2500" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-xs accent-cyan-500" />
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between text-sm text-slate-400 mb-1">
                                    <span>Step {currentStep + 1} of {stepHistory.length}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                </div>
                            </div>

                            {/* Weighted Graph SVG */}
                            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 mb-6">
                                <svg viewBox="0 0 540 360" className="w-full" style={{ maxHeight: '320px' }}>
                                    {/* Edges with weights */}
                                    {WEIGHTED_EDGES.map(([a, b, w]) => {
                                        const na = NODES[a], nb = NODES[b];
                                        const tree = isTreeEdge(a, b);
                                        const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2;
                                        return (
                                            <g key={`${a}-${b}`}>
                                                <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                                                    stroke={tree ? '#22c55e' : '#475569'}
                                                    strokeWidth={tree ? 2.5 : 1.5}
                                                    strokeOpacity={tree ? 1 : 0.5} />
                                                <rect x={mx - 9} y={my - 9} width={18} height={16} rx={3} fill="#1e293b" />
                                                <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="central"
                                                    fill={tree ? '#22c55e' : '#94a3b8'} fontSize="10" fontWeight="bold">{w}</text>
                                            </g>
                                        );
                                    })}
                                    {/* Nodes */}
                                    {NODES.map(n => {
                                        const st = state.nodeStates[n.id] || 'unvisited';
                                        const c = NODE_COLORS[st];
                                        const d = state.dist?.[n.id];
                                        return (
                                            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                                                <circle r={n.id === state.currentNode ? 26 : 22}
                                                    fill={c.fill} stroke={c.stroke} strokeWidth={2.5}
                                                    className="transition-all duration-300" />
                                                <text textAnchor="middle" dominantBaseline="central"
                                                    fill={c.text} fontSize="14" fontWeight="bold">{n.id}</text>
                                                {d !== undefined && (
                                                    <text textAnchor="middle" y={-32} fill="#94a3b8" fontSize="11">
                                                        {d === INF ? '∞' : d}
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                                <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-slate-400">
                                    {[['#334155','#64748b','Unvisited'], ['#a16207','#eab308','In Heap'], ['#c2410c','#f97316','Current'], ['#15803d','#22c55e','Settled']].map(([fill, stroke, label]) => (
                                        <div key={label} className="flex items-center gap-1.5">
                                            <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={fill} stroke={stroke} strokeWidth="1.5" /></svg>
                                            <span>{label}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1.5">
                                        <svg width="20" height="14"><line x1="0" y1="7" x2="20" y2="7" stroke="#22c55e" strokeWidth="2" /></svg>
                                        <span>Shortest path edge</span>
                                    </div>
                                </div>
                            </div>

                            {/* Distance table */}
                            <div className="mb-6 overflow-x-auto">
                                <table className="w-full text-sm text-center">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <td className="py-2 px-3 text-slate-400 text-left">Node</td>
                                            {NODES.map(n => <td key={n.id} className={`py-2 px-3 font-bold ${n.id === state.currentNode ? 'text-orange-400' : 'text-slate-300'}`}>{n.id}</td>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-800">
                                            <td className="py-2 px-3 text-slate-400 text-left">dist</td>
                                            {NODES.map(n => {
                                                const d = state.dist?.[n.id];
                                                const st = state.nodeStates?.[n.id];
                                                return (
                                                    <td key={n.id} className={`py-2 px-3 font-mono font-bold ${st === 'settled' ? 'text-green-400' : st === 'current' ? 'text-orange-400' : st === 'inQueue' ? 'text-yellow-400' : 'text-slate-500'}`}>
                                                        {d === undefined || d === INF ? '∞' : d}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 text-slate-400 text-left">prev</td>
                                            {NODES.map(n => {
                                                const p = state.prev?.[n.id];
                                                return <td key={n.id} className="py-2 px-3 text-slate-500 font-mono">{p === -1 || p === undefined ? '—' : p}</td>;
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
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
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-cyan-500" />
                                <h3 className="font-bold text-white">Algorithm Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O((V+E) log V)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(V)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Data Structure:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">Min-Heap</span></div>
                                <div className="flex justify-between"><span className="text-slate-300">Negative weights:</span><span className="bg-red-500/15 text-red-400 px-2 py-1 rounded">No</span></div>
                                <div className="flex justify-between"><span className="text-slate-300">Greedy:</span><span className="bg-green-500/15 text-green-400 px-2 py-1 rounded">Yes</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">When to Use Dijkstra&apos;s</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Single-source shortest path</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>GPS navigation and routing</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Network packet routing</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Non-negative weighted graphs</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Graphs with negative edges (use Bellman-Ford)</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>All-pairs shortest paths (use Floyd-Warshall)</span></li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : 'Keep practicing!'}</p>
                                    <button onClick={resetQuiz} className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium">Try Again</button>
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
                                            return <button key={i} onClick={() => handleQuizAnswer(i)} className={cls}>{opt}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQuestion} className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium">
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
