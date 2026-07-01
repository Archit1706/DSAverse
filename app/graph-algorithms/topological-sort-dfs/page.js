"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "In DFS-based topological sort, when is a node recorded?",
        options: [
            "As soon as DFS first visits it (pre-order)",
            "When it finishes — after all nodes reachable from it are done (post-order)",
            "When its in-degree reaches zero",
            "In the order nodes were created",
        ],
        correct: 1,
        explanation: "A node is pushed onto the finish stack only when DFS returns from it — i.e. after every descendant has finished. That's post-order. It guarantees the node's dependents were recorded first.",
    },
    {
        question: "Why do we reverse the finish order to get the topological order?",
        options: [
            "To sort the nodes numerically",
            "Because a node finishes AFTER everything reachable from it, so reversing puts it BEFORE them",
            "Reversing is optional — the finish order is already topological",
            "To detect cycles",
        ],
        correct: 1,
        explanation: "If u → v, then v finishes before u (u is still on the stack while v completes). So the finish order has dependents before dependencies; reversing it makes every edge point from earlier to later.",
    },
    {
        question: "How does the DFS approach compare to Kahn's algorithm?",
        options: [
            "DFS is O(V²), Kahn's is O(V + E)",
            "Both are O(V + E); DFS uses recursion + a finish stack, Kahn's uses in-degrees + a queue",
            "DFS only works on trees",
            "Kahn's cannot detect cycles but DFS can't either",
        ],
        correct: 1,
        explanation: "Both run in O(V + E) and produce a valid (not necessarily identical) topological order. DFS records nodes on completion and reverses; Kahn's repeatedly removes in-degree-zero nodes. Both can detect cycles.",
    },
];

// Same directed acyclic graph as the Kahn's visualizer
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
    unvisited: { fill: '#334155', stroke: '#64748b', text: '#94a3b8' },
    active:    { fill: '#c2410c', stroke: '#f97316', text: '#fff7ed' },
    done:      { fill: '#15803d', stroke: '#22c55e', text: '#f0fdf4' },
};
const ekey = (a, b) => `${a}->${b}`;

function generateSteps() {
    const steps = [];
    const visited = new Set();
    const finished = new Set();
    const callStack = [];
    const finishOrder = [];

    const snap = (activeEdge, explanation, extra = {}) => {
        const ns = {};
        NODES.forEach(n => ns[n.id] = finished.has(n.id) ? 'done' : callStack.includes(n.id) ? 'active' : 'unvisited');
        return { nodeStates: ns, callStack: [...callStack], finishOrder: [...finishOrder], activeEdge, explanation, ...extra };
    };

    steps.push(snap(null, `DFS-based topological sort: run depth-first search, and whenever a node finishes (all its out-edges explored), push it onto a finish stack. Reversing that stack at the end gives a topological order.`));

    function visit(u) {
        visited.add(u);
        callStack.push(u);
        steps.push(snap(null, `Enter node ${u}: mark it visited and push it onto the DFS stack. Now explore its out-neighbours.`));
        for (const v of OUT[u]) {
            if (!visited.has(v)) {
                steps.push(snap(ekey(u, v), `Edge ${u}→${v}: ${v} is unvisited — recurse into it.`));
                visit(v);
            } else {
                steps.push(snap(ekey(u, v), `Edge ${u}→${v}: ${v} is already visited — skip.`));
            }
        }
        callStack.pop();
        finished.add(u);
        finishOrder.push(u);
        steps.push(snap(null, `Node ${u} has no more unvisited out-neighbours — it's finished. Pop it off the DFS stack and push it onto the finish stack: [${finishOrder.join(', ')}].`));
    }

    for (const n of NODES) {
        if (!visited.has(n.id)) {
            steps.push(snap(null, `Node ${n.id} hasn't been visited yet — start a fresh DFS from it.`));
            visit(n.id);
        }
    }

    const topo = [...finishOrder].reverse();
    steps.push(snap(null, `Every node has finished. Finish stack (bottom → top) is [${finishOrder.join(', ')}]. Reverse it to get a valid topological order: [${topo.join(' → ')}] — every edge now points from an earlier node to a later one.`, { topo }));
    return steps;
}

const codeExample = `def topo_sort_dfs(graph, n):         # graph[u] = [v, ...]
    visited = [False] * n
    finish = []                      # nodes in completion order

    def dfs(u):
        visited[u] = True
        for v in graph[u]:
            if not visited[v]:
                dfs(v)
        finish.append(u)             # push on completion (post-order)

    for u in range(n):
        if not visited[u]:
            dfs(u)

    return finish[::-1]              # reverse = topological order · O(V + E)`;

export default function TopoSortDFSPage() {
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

    const state = stepHistory[currentStep] || { nodeStates: {}, callStack: [], finishOrder: [], activeEdge: null, explanation: '', topo: null };

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Topological Sort — DFS</h1>
                        <p className="text-xl text-cyan-100 mb-6 max-w-3xl mx-auto">
                            Run depth-first search on a DAG, push each node onto a stack the moment it finishes, then reverse the stack — that's your topological order.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(V + E)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(V)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Uses: DFS + Stack</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Order: Reverse post-order</div>
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
                                        <marker id="td-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
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
                                        return (
                                            <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2}
                                                stroke={active ? '#f97316' : '#475569'} strokeWidth={active ? 3 : 1.6} strokeOpacity={active ? 1 : 0.6}
                                                markerEnd="url(#td-arrow)" className="transition-all duration-300" />
                                        );
                                    })}
                                    {NODES.map(n => {
                                        const st = state.nodeStates[n.id] || 'unvisited';
                                        const c = NODE_COLORS[st];
                                        const fo = state.finishOrder.indexOf(n.id);
                                        return (
                                            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                                                <circle r={st === 'active' ? 26 : 22}
                                                    fill={c.fill} stroke={c.stroke} strokeWidth={2.5}
                                                    className="transition-all duration-300" />
                                                <text textAnchor="middle" dominantBaseline="central"
                                                    fill={c.text} fontSize="14" fontWeight="bold">{n.id}</text>
                                                {fo >= 0 && (
                                                    <text textAnchor="middle" y={-32} fill="#22c55e" fontSize="11">#{fo + 1}</text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                                <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-slate-400">
                                    {[[NODE_COLORS.unvisited, 'Unvisited'], [NODE_COLORS.active, 'On DFS stack'], [NODE_COLORS.done, 'Finished (#=finish order)']].map(([c, l]) => (
                                        <div key={l} className="flex items-center gap-1.5">
                                            <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" /></svg>
                                            <span>{l}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* DFS stack */}
                            <div className="mb-4">
                                <span className="text-sm font-semibold text-slate-300">DFS call stack (bottom → top): </span>
                                <div className="flex items-center gap-1 min-h-10 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700/50 mt-1">
                                    {state.callStack.length === 0
                                        ? <span className="text-slate-500 text-sm italic">Empty</span>
                                        : state.callStack.map((n, i) => (
                                            <React.Fragment key={i}>
                                                <div className="w-8 h-8 rounded-full bg-orange-600 text-orange-100 flex items-center justify-center text-sm font-bold">{n}</div>
                                                {i < state.callStack.length - 1 && <span className="text-slate-600 text-xs">→</span>}
                                            </React.Fragment>
                                        ))}
                                </div>
                            </div>

                            {/* Finish stack */}
                            <div className="mb-4">
                                <span className="text-sm font-semibold text-slate-300">Finish stack (push on completion): </span>
                                <div className="flex items-center gap-1 min-h-10 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700/50 mt-1">
                                    {state.finishOrder.length === 0
                                        ? <span className="text-slate-500 text-sm italic">—</span>
                                        : state.finishOrder.map((n, i) => (
                                            <React.Fragment key={i}>
                                                <div className="w-8 h-8 rounded-full bg-green-700 text-green-100 flex items-center justify-center text-sm font-bold">{n}</div>
                                                {i < state.finishOrder.length - 1 && <span className="text-slate-600 text-xs">,</span>}
                                            </React.Fragment>
                                        ))}
                                </div>
                            </div>

                            {/* Topological order (reversed) */}
                            {state.topo && (
                                <div className="mb-6">
                                    <span className="text-sm font-semibold text-cyan-300">Topological order (reverse of finish stack): </span>
                                    <div className="flex items-center gap-1 bg-cyan-500/10 rounded-lg px-3 py-2 border border-cyan-500/30 mt-1">
                                        {state.topo.map((n, i) => (
                                            <React.Fragment key={i}>
                                                <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-bold">{n}</div>
                                                {i < state.topo.length - 1 && <span className="text-cyan-500 text-xs">→</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
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
                                <div className="flex justify-between"><span className="text-slate-300">Data Structure:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">Stack / recursion</span></div>
                                <div className="flex justify-between"><span className="text-slate-300">Order:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">Reverse post-order</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">DFS vs Kahn's</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Elegant recursion — record each node as it finishes</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Reuses ordinary DFS; also finds cycles via a "gray" node revisit</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Same O(V + E) as Kahn's, just a different bookkeeping</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Deep graphs can overflow the recursion stack (use an explicit stack)</span></li>
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
