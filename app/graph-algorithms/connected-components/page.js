"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Settings2 } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { GraphCustomizer, layoutNodes } from '@/components/GraphCustomizer';

const quizQuestions = [
    {
        question: "What is a connected component in an undirected graph?",
        options: [
            "The node with the most edges",
            "A maximal set of nodes that are all reachable from one another",
            "The shortest path between two nodes",
            "Any pair of nodes joined by an edge",
        ],
        correct: 1,
        explanation: "A connected component is a maximal group of nodes where every node can reach every other node in the group. 'Maximal' means you can't add another node without breaking that property.",
    },
    {
        question: "How do you find all connected components?",
        options: [
            "Sort the nodes by degree",
            "Run one BFS from node 0",
            "Scan every node; each unvisited one seeds a new BFS/DFS that claims its whole component",
            "Compute the shortest path between all pairs",
        ],
        correct: 2,
        explanation: "Iterate over all nodes. When you hit an unvisited node, it belongs to a brand-new component — run BFS or DFS from it to mark every reachable node, then continue scanning. The count of such seeds is the number of components.",
    },
    {
        question: "What is the time complexity of finding connected components?",
        options: ["O(V²)", "O(V + E)", "O(E log V)", "O(V!)"],
        correct: 1,
        explanation: "Each node and each edge is visited exactly once across all the BFS/DFS runs combined, giving O(V + E) — the same as a single traversal, just restarted for each new component.",
    },
];

// Default graph — deliberately DISCONNECTED into 3 components
const DEFAULT_NODES = [
    { id: 0, x: 90,  y: 90  }, { id: 1, x: 210, y: 70  }, { id: 2, x: 160, y: 185 },
    { id: 3, x: 370, y: 80  }, { id: 4, x: 475, y: 150 }, { id: 5, x: 395, y: 250 },
    { id: 6, x: 120, y: 305 }, { id: 7, x: 250, y: 305 },
];
const DEFAULT_EDGES = [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5], [6, 7]];
const DEFAULT_ADJ = { 0: [1, 2], 1: [0, 2], 2: [0, 1], 3: [4], 4: [3, 5], 5: [4], 6: [7], 7: [6] };

const COMPONENT_COLORS = [
    { fill: '#15803d', stroke: '#22c55e', text: '#f0fdf4' }, // green
    { fill: '#1d4ed8', stroke: '#3b82f6', text: '#eff6ff' }, // blue
    { fill: '#a21caf', stroke: '#d946ef', text: '#fdf4ff' }, // fuchsia
    { fill: '#b45309', stroke: '#f59e0b', text: '#fffbeb' }, // amber
    { fill: '#0f766e', stroke: '#14b8a6', text: '#f0fdfa' }, // teal
    { fill: '#be123c', stroke: '#f43f5e', text: '#fff1f2' }, // rose
];
const UNVISITED = { fill: '#334155', stroke: '#64748b', text: '#94a3b8' };
const CURRENT = { fill: '#c2410c', stroke: '#f97316', text: '#fff7ed' };

function colorFor(state) {
    if (state === 'unvisited' || state === undefined) return UNVISITED;
    if (state === 'current') return CURRENT;
    const k = parseInt(state.slice(4), 10); // 'compK'
    return COMPONENT_COLORS[k % COMPONENT_COLORS.length];
}

function generateSteps(nodes, adj) {
    const steps = [];
    const ns = Object.fromEntries(nodes.map(n => [n.id, 'unvisited']));
    const snapshot = (comps, current, count, explanation) => ({
        nodeStates: { ...ns },
        comps: comps.map(c => ({ id: c.id, members: [...c.members] })),
        current, count, explanation,
    });

    const comps = [];
    steps.push(snapshot(comps, -1, 0,
        'Goal: find every connected component — a maximal group of mutually reachable nodes. Strategy: scan all nodes; each unvisited node seeds a new component that we grow with BFS.'));

    const visited = new Set();
    let cid = 0;
    for (const node of nodes) {
        const start = node.id;
        if (visited.has(start)) continue;

        const members = [start];
        const queue = [start];
        visited.add(start);
        ns[start] = 'comp' + cid;
        steps.push(snapshot(comps, start, cid,
            `Node ${start} is unvisited → open a new component (${cid}). Seed BFS with node ${start} and grow it to every node it can reach.`));

        while (queue.length) {
            const cur = queue.shift();
            const restore = ns[cur];
            ns[cur] = 'current';
            const nbrs = (adj[cur] || []).filter(x => !visited.has(x));
            for (const nb of nbrs) {
                visited.add(nb);
                queue.push(nb);
                ns[nb] = 'comp' + cid;
                members.push(nb);
            }
            steps.push(snapshot([...comps, { id: cid, members: [...members] }], cur, cid,
                nbrs.length
                    ? `Exploring node ${cur}: neighbours ${nbrs.join(', ')} are new — claim them for component ${cid}. Component now {${members.join(', ')}}.`
                    : `Exploring node ${cur}: all its neighbours are already claimed. Nothing new to add.`));
            ns[cur] = restore; // settle back to its component colour
        }

        comps.push({ id: cid, members: [...members] });
        steps.push(snapshot(comps, -1, cid + 1,
            `Component ${cid} is complete: {${members.join(', ')}} — ${members.length} node${members.length > 1 ? 's' : ''}. BFS found nothing more reachable. Resume scanning for unvisited nodes.`));
        cid++;
    }

    steps.push(snapshot(comps, -1, cid,
        `Finished. The graph has ${cid} connected component${cid > 1 ? 's' : ''}. Every node is coloured by the component it belongs to — nodes never connected to each other end up in different groups.`));
    return steps;
}

const codeExample = `def connected_components(graph, n):
    visited = [False] * n
    components = []

    for start in range(n):          # scan every node
        if visited[start]:
            continue
        # start a brand-new component
        comp, queue = [], [start]
        visited[start] = True
        while queue:                # BFS to claim the whole component
            node = queue.pop(0)
            comp.append(node)
            for nb in graph[node]:
                if not visited[nb]:
                    visited[nb] = True
                    queue.append(nb)
        components.append(comp)

    return components               # O(V + E) overall`;

export default function ConnectedComponentsPage() {
    const [customGraph, setCustomGraph] = useState(null);
    const [showCustomizer, setShowCustomizer] = useState(false);

    const nodes = customGraph ? layoutNodes(customGraph.nodeCount) : DEFAULT_NODES;
    const edges = customGraph ? customGraph.edges : DEFAULT_EDGES;
    const adj = customGraph ? customGraph.adj : DEFAULT_ADJ;

    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(nodes, adj));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [customGraph]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const state = stepHistory[currentStep] || { nodeStates: {}, comps: [], current: -1, count: 0, explanation: '' };

    const edgeComp = (a, b) => {
        const sA = state.nodeStates[a], sB = state.nodeStates[b];
        if (sA && sA === sB && sA.startsWith('comp')) return colorFor(sA).stroke;
        return null;
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
                onApply={(result) => setCustomGraph(result)} weighted={false} />

            <div className="bg-gradient-to-r from-cyan-600 to-sky-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/graph-algorithms" className="flex items-center text-white hover:text-cyan-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Graph Algorithms
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Connected Components</h1>
                        <p className="text-xl text-cyan-100 mb-6 max-w-3xl mx-auto">
                            Watch the graph split into its connected components — run BFS from each unvisited node, and colour every group of mutually reachable nodes.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(V + E)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(V)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Uses: BFS / DFS</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Graph: Undirected</div>
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
                                    <span className="text-sm font-medium text-slate-300">Components found:</span>
                                    <span className="px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-sm font-bold">{state.count}</span>
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

                            {/* Graph SVG */}
                            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 mb-6">
                                <svg viewBox="0 0 540 360" className="w-full" style={{ maxHeight: '320px' }}>
                                    {edges.map(([a, b], idx) => {
                                        const na = nodes.find(n => n.id === a);
                                        const nb = nodes.find(n => n.id === b);
                                        if (!na || !nb) return null;
                                        const cc = edgeComp(a, b);
                                        return (
                                            <line key={idx} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                                                stroke={cc || '#475569'} strokeWidth={cc ? 2.5 : 1.5}
                                                strokeOpacity={cc ? 1 : 0.5} className="transition-all duration-300" />
                                        );
                                    })}
                                    {nodes.map(n => {
                                        const st = state.nodeStates[n.id] || 'unvisited';
                                        const c = colorFor(st);
                                        return (
                                            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                                                <circle r={n.id === state.current ? 26 : 22}
                                                    fill={c.fill} stroke={c.stroke} strokeWidth={2.5}
                                                    className="transition-all duration-300" />
                                                <text textAnchor="middle" dominantBaseline="central"
                                                    fill={c.text} fontSize="14" fontWeight="bold">{n.id}</text>
                                            </g>
                                        );
                                    })}
                                </svg>
                                <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={UNVISITED.fill} stroke={UNVISITED.stroke} strokeWidth="1.5" /></svg>
                                        <span>Unvisited</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={CURRENT.fill} stroke={CURRENT.stroke} strokeWidth="1.5" /></svg>
                                        <span>Exploring</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={COMPONENT_COLORS[0].fill} stroke={COMPONENT_COLORS[0].stroke} strokeWidth="1.5" /></svg>
                                        <span>Component (one colour each)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Components list */}
                            <div className="mb-6">
                                <span className="text-sm font-semibold text-slate-300">Components:</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {state.comps.length === 0
                                        ? <span className="text-slate-500 text-sm italic">None yet</span>
                                        : state.comps.map(c => {
                                            const col = COMPONENT_COLORS[c.id % COMPONENT_COLORS.length];
                                            return (
                                                <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                                                    style={{ borderColor: col.stroke, background: col.fill + '22' }}>
                                                    <span className="w-3 h-3 rounded-full" style={{ background: col.fill, border: `1.5px solid ${col.stroke}` }} />
                                                    <span className="text-xs font-mono" style={{ color: col.stroke }}>{`{${c.members.join(', ')}}`}</span>
                                                </div>
                                            );
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
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(V + E)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(V)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Traversal:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">BFS or DFS</span></div>
                                <div className="flex justify-between"><span className="text-slate-300">Graph type:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">Undirected</span></div>
                            </div>
                            {customGraph && (
                                <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400">
                                    <span className="text-cyan-400 font-medium">Custom graph: </span>
                                    {customGraph.nodeCount} nodes, {customGraph.edges.length} edges
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">When to Use It</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Counting isolated groups (networks, clusters)</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Flood fill / island counting on grids</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Checking if a whole graph is connected (count == 1)</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Directed graphs — use strongly-connected-components instead</span></li>
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
