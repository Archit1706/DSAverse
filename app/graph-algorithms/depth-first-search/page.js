"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What data structure underlies DFS (iteratively)?",
        options: ["Queue (FIFO)", "Stack (LIFO)", "Priority Queue", "Circular Buffer"],
        correct: 1,
        explanation: "DFS uses a Stack (Last-In, First-Out). The recursive implementation uses the call stack implicitly. The iterative version uses an explicit stack."
    },
    {
        question: "Which application is DFS best suited for?",
        options: ["Finding shortest path in unweighted graphs", "Topological sorting of a DAG", "Finding all nodes within distance k", "Computing minimum spanning tree"],
        correct: 1,
        explanation: "DFS is the foundation for topological sorting, cycle detection, and finding strongly connected components. Its depth-first nature makes it ideal for these structural graph problems."
    },
    {
        question: "What is DFS's time complexity?",
        options: ["O(V²)", "O(V log V)", "O(V + E)", "O(E log V)"],
        correct: 2,
        explanation: "DFS visits every vertex once and traverses every edge once (in each direction for undirected graphs), giving O(V + E) time complexity — same as BFS."
    }
];

// Same graph as BFS for consistency
const NODES = [
    { id: 0, x: 80, y: 180 },
    { id: 1, x: 210, y: 90 },
    { id: 2, x: 210, y: 270 },
    { id: 3, x: 340, y: 40 },
    { id: 4, x: 340, y: 180 },
    { id: 5, x: 340, y: 320 },
    { id: 6, x: 460, y: 180 },
];

const EDGES = [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[5,6]];

const ADJ = {
    0: [1, 2], 1: [0, 3, 4], 2: [0, 4, 5],
    3: [1, 6], 4: [1, 2, 6], 5: [2, 6], 6: [3, 4, 5]
};

const NODE_COLORS = {
    unvisited:   { fill: '#334155', stroke: '#64748b', text: '#94a3b8' },
    inStack:     { fill: '#a16207', stroke: '#eab308', text: '#fef9c3' },
    current:     { fill: '#c2410c', stroke: '#f97316', text: '#fff7ed' },
    visited:     { fill: '#15803d', stroke: '#22c55e', text: '#f0fdf4' },
    backtracking:{ fill: '#7c3aed', stroke: '#8b5cf6', text: '#ede9fe' },
};

const generateDFSSteps = (startNode) => {
    const steps = [];
    const ns = {};
    NODES.forEach(n => { ns[n.id] = 'unvisited'; });

    steps.push({
        nodeStates: { ...ns }, stack: [], dfsOrder: [], currentNode: -1,
        explanation: `Starting DFS from node ${startNode}. We'll explore as deep as possible along each branch before backtracking.`
    });

    // Recursive DFS simulation (generate steps iteratively)
    const visited = new Set();
    const dfsOrder = [];
    const callStack = [];

    const dfsVisit = (node, steps, ns, callStack) => {
        visited.add(node);
        ns[node] = 'current';
        dfsOrder.push(node);
        callStack.push(node);

        steps.push({
            nodeStates: { ...ns }, stack: [...callStack], dfsOrder: [...dfsOrder], currentNode: node,
            explanation: `Visiting node ${node}. Call stack: [${callStack.join(' → ')}]. DFS order: [${dfsOrder.join(', ')}]`
        });

        for (const nb of ADJ[node]) {
            if (!visited.has(nb)) {
                steps.push({
                    nodeStates: { ...ns }, stack: [...callStack], dfsOrder: [...dfsOrder], currentNode: node,
                    explanation: `From node ${node}: found unvisited neighbor ${nb}. Recursing into ${nb}.`
                });
                dfsVisit(nb, steps, ns, callStack);
                ns[node] = 'current';
                steps.push({
                    nodeStates: { ...ns }, stack: [...callStack], dfsOrder: [...dfsOrder], currentNode: node,
                    explanation: `Returned to node ${node} from ${nb}. Continuing to check remaining neighbors.`
                });
            } else {
                steps.push({
                    nodeStates: { ...ns }, stack: [...callStack], dfsOrder: [...dfsOrder], currentNode: node,
                    explanation: `From node ${node}: neighbor ${nb} already visited — skip.`
                });
            }
        }

        callStack.pop();
        ns[node] = 'visited';
        steps.push({
            nodeStates: { ...ns }, stack: [...callStack], dfsOrder: [...dfsOrder], currentNode: -1,
            explanation: `Node ${node} fully explored. Backtracking. Call stack: [${callStack.length > 0 ? callStack.join(' → ') : 'empty'}]`
        });
    };

    dfsVisit(startNode, steps, ns, callStack);

    steps.push({
        nodeStates: { ...ns }, stack: [], dfsOrder: [...dfsOrder], currentNode: -1,
        explanation: `DFS complete! Final traversal order: ${dfsOrder.join(' → ')}. All nodes reachable from ${startNode} visited.`
    });

    return steps;
};

const codeExample = `def dfs(graph, start):
    visited = set()
    order = []

    def explore(node):
        visited.add(node)
        order.append(node)

        for neighbor in graph[node]:
            if neighbor not in visited:
                explore(neighbor)   # recurse deeper

    explore(start)
    return order

# Iterative version using an explicit stack
def dfs_iterative(graph, start):
    visited = set()
    stack = [start]
    order = []

    while stack:
        node = stack.pop()   # LIFO — go deep
        if node not in visited:
            visited.add(node)
            order.append(node)
            # Push neighbors in reverse to preserve order
            for nb in reversed(graph[node]):
                if nb not in visited:
                    stack.append(nb)

    return order`;

export default function DFSPage() {
    const [startNode, setStartNode] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        const steps = generateDFSSteps(startNode);
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    }, [startNode]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
        }
    }, [isPlaying, currentStep, stepHistory, speed]);

    const state = stepHistory[currentStep] || { nodeStates: {}, stack: [], dfsOrder: [], currentNode: -1, explanation: '' };

    const handleQuizAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQuestion = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };
    const resetQuiz = () => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const edgeIsTree = (a, b) => {
        const stA = state.nodeStates[a], stB = state.nodeStates[b];
        return (stA === 'visited' || stA === 'current') && (stB === 'visited' || stB === 'current');
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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Depth-First Search</h1>
                        <p className="text-xl text-cyan-100 mb-6 max-w-3xl mx-auto">
                            Watch DFS plunge as deep as possible along each branch, backtracking only when it hits a dead end.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(V + E)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(V)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Uses: Stack</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Cycle Detection: Yes</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            {/* Start node selector */}
                            <div className="flex flex-wrap items-center gap-3 mb-6">
                                <span className="text-sm font-medium text-slate-300">Start Node:</span>
                                {NODES.map(n => (
                                    <button key={n.id} onClick={() => setStartNode(n.id)}
                                        className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${startNode === n.id ? 'bg-cyan-500 text-white scale-110' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                        {n.id}
                                    </button>
                                ))}
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
                                <input type="range" min="300" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-xs accent-cyan-500" />
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between text-sm text-slate-400 mb-1">
                                    <span>Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span>{Math.round(((currentStep + 1) / stepHistory.length) * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                </div>
                            </div>

                            {/* Graph SVG */}
                            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 mb-6">
                                <svg viewBox="0 0 540 360" className="w-full" style={{ maxHeight: '320px' }}>
                                    {EDGES.map(([a, b]) => {
                                        const na = NODES[a], nb = NODES[b];
                                        const tree = edgeIsTree(a, b) || edgeIsTree(b, a);
                                        return (
                                            <line key={`${a}-${b}`}
                                                x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                                                stroke={tree ? '#22c55e' : '#475569'}
                                                strokeWidth={tree ? 2.5 : 1.5}
                                                strokeOpacity={tree ? 1 : 0.5}
                                            />
                                        );
                                    })}
                                    {NODES.map(n => {
                                        const st = state.nodeStates[n.id] || 'unvisited';
                                        const c = NODE_COLORS[st];
                                        return (
                                            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                                                <circle r={n.id === state.currentNode ? 26 : 22}
                                                    fill={c.fill} stroke={c.stroke} strokeWidth={2.5}
                                                    className="transition-all duration-300" />
                                                <text textAnchor="middle" dominantBaseline="central"
                                                    fill={c.text} fontSize="14" fontWeight="bold">{n.id}</text>
                                            </g>
                                        );
                                    })}
                                </svg>
                                <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-slate-400">
                                    {[['#334155','#64748b','Unvisited'], ['#a16207','#eab308','In Stack'], ['#c2410c','#f97316','Current'], ['#15803d','#22c55e','Visited']].map(([fill, stroke, label]) => (
                                        <div key={label} className="flex items-center gap-1.5">
                                            <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={fill} stroke={stroke} strokeWidth="1.5" /></svg>
                                            <span>{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Call stack display */}
                            <div className="mb-6">
                                <span className="text-sm font-semibold text-slate-300">Call Stack (top → bottom):</span>
                                <div className="flex items-center gap-1 min-h-10 bg-slate-800/60 rounded-lg px-3 py-2 mt-2 border border-slate-700/50">
                                    {state.stack.length === 0 ? (
                                        <span className="text-slate-500 text-sm italic">Empty</span>
                                    ) : [...state.stack].reverse().map((n, i) => (
                                        <React.Fragment key={i}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-orange-600 text-orange-100' : 'bg-slate-600 text-slate-200'}`}>{n}</div>
                                            {i < state.stack.length - 1 && <span className="text-slate-600 text-xs">→</span>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {state.dfsOrder.length > 0 && (
                                <div className="mb-6">
                                    <span className="text-sm font-semibold text-slate-300">DFS Order: </span>
                                    <span className="text-sm text-slate-300">{state.dfsOrder.join(' → ')}</span>
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
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-cyan-500" />
                                <h3 className="font-bold text-white">Algorithm Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(V + E)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(V)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Data Structure:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">Stack</span></div>
                                <div className="flex justify-between"><span className="text-slate-300">Finds Cycles:</span><span className="bg-green-500/15 text-green-400 px-2 py-1 rounded">Yes</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">When to Use DFS</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Topological sorting of a DAG</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Detecting cycles in a graph</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Finding strongly connected components</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Maze solving and backtracking problems</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Shortest path (BFS is better)</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Very deep graphs (stack overflow risk)</span></li>
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
