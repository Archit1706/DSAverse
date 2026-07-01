"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What does Floyd-Warshall compute?",
        options: [
            "Shortest path from one source to all nodes",
            "Shortest paths between every pair of nodes",
            "A minimum spanning tree",
            "A topological ordering",
        ],
        correct: 1,
        explanation: "Floyd-Warshall is an all-pairs shortest path algorithm: after it runs, dist[i][j] holds the shortest distance from i to j for every pair — a full V×V table.",
    },
    {
        question: "What does the outer loop variable k represent?",
        options: [
            "The source node",
            "The current shortest distance",
            "An intermediate node that paths are now allowed to pass through",
            "The number of edges used",
        ],
        correct: 2,
        explanation: "After iteration k, dist[i][j] is the shortest path using only nodes {0..k} as intermediates. Adding one more allowed intermediate each round is the dynamic-programming insight: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).",
    },
    {
        question: "What is Floyd-Warshall's time and space complexity?",
        options: [
            "O(V + E) time, O(V) space",
            "O(E log V) time, O(V) space",
            "O(V³) time, O(V²) space",
            "O(2^V) time, O(V²) space",
        ],
        correct: 2,
        explanation: "Three nested loops over V nodes give O(V³) time; the distance matrix takes O(V²) space. It handles negative edges (but not negative cycles) — a plus over Dijkstra's.",
    },
];

const V = 4;
const NODES = [
    { id: 0, x: 120, y: 80 }, { id: 1, x: 400, y: 80 },
    { id: 2, x: 400, y: 280 }, { id: 3, x: 120, y: 280 },
];
const EDGES = [[0, 1, 5], [0, 3, 10], [1, 2, 3], [2, 3, 1], [3, 0, 2]];
const INF = Infinity;

function initMatrix() {
    const d = Array.from({ length: V }, (_, i) => Array.from({ length: V }, (_, j) => (i === j ? 0 : INF)));
    for (const [a, b, w] of EDGES) d[a][b] = w;
    return d;
}

function generateSteps() {
    const steps = [];
    const dist = initMatrix();
    const copy = m => m.map(r => [...r]);
    const push = (data, explanation) => steps.push({ matrix: copy(dist), k: null, i: null, j: null, changed: null, phase: 'init', explanation, ...data });

    push({ phase: 'init' },
        'Initialize the distance matrix: 0 on the diagonal, the edge weight where a direct edge exists, and ∞ everywhere else. Floyd-Warshall will repeatedly ask: can routing through one more node make any pair closer?');

    for (let k = 0; k < V; k++) {
        push({ phase: 'pivot', k },
            `Allow node ${k} as an intermediate. For every pair (i, j), check whether going i → ${k} → j beats the current best. The highlighted row ${k} and column ${k} are the two halves of that path.`);
        for (let i = 0; i < V; i++) {
            for (let j = 0; j < V; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    const nd = dist[i][k] + dist[k][j];
                    const old = dist[i][j];
                    dist[i][j] = nd;
                    push({ phase: 'relax', k, i, j, changed: [i, j] },
                        `dist[${i}][${j}]: path through ${k} costs dist[${i}][${k}] + dist[${k}][${j}] = ${dist[i][k]} + ${dist[k][j]} = ${nd}, which beats ${old === INF ? '∞' : old}. Relax it to ${nd}.`);
                }
            }
        }
    }

    push({ phase: 'done' },
        'Every intermediate node has been considered. The matrix now holds the shortest distance between every pair of nodes — the all-pairs shortest paths. (∞ would mean j is unreachable from i.)');
    return steps;
}

const codeExample = `def floyd_warshall(dist, n):         # dist[i][j] = weight or +inf, 0 on diagonal
    for k in range(n):               # allow node k as an intermediate
        for i in range(n):
            for j in range(n):
                # is i -> k -> j shorter than the current i -> j?
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist                      # O(V^3) time, O(V^2) space`;

const fmt = v => (v === INF ? '∞' : v);

export default function FloydWarshallPage() {
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => { setStepHistory(generateSteps()); setCurrentStep(0); setIsPlaying(false); }, []);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const state = stepHistory[currentStep] || { matrix: initMatrix(), k: null, i: null, j: null, changed: null, phase: 'init', explanation: '' };

    const cellClass = (r, c) => {
        const { k, i, j, phase, changed } = state;
        if (changed && changed[0] === r && changed[1] === c) return 'bg-green-500/30 border-green-400 text-green-200 font-bold scale-105';
        if (phase === 'relax') {
            if (r === i && c === k) return 'bg-yellow-500/25 border-yellow-500/60 text-yellow-200';
            if (r === k && c === j) return 'bg-yellow-500/25 border-yellow-500/60 text-yellow-200';
            if (r === i && c === j) return 'bg-orange-500/25 border-orange-500/60 text-orange-200';
        }
        if (k !== null && (r === k || c === k)) return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200';
        if (r === c) return 'bg-slate-800 border-slate-700 text-slate-500';
        return 'bg-slate-800/60 border-slate-700/50 text-slate-300';
    };

    const nodeColor = (id) => {
        const { k, i, j, phase } = state;
        if (phase === 'relax') {
            if (id === k) return { fill: '#0e7490', stroke: '#22d3ee' };
            if (id === i) return { fill: '#1d4ed8', stroke: '#3b82f6' };
            if (id === j) return { fill: '#c2410c', stroke: '#f97316' };
        } else if (id === k && k !== null) return { fill: '#0e7490', stroke: '#22d3ee' };
        return { fill: '#334155', stroke: '#64748b' };
    };

    const handleAnswer = (idx) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: idx, answered: true, score: idx === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Floyd-Warshall</h1>
                        <p className="text-xl text-cyan-100 mb-6 max-w-3xl mx-auto">
                            Compute the shortest path between every pair of nodes at once — by letting paths route through one more intermediate node each round and relaxing the distance matrix.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(V³)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(V²)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">All-Pairs Shortest Path</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Negative edges: OK</div>
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
                                    <span>Intermediate k = <span className="text-cyan-300 font-bold">{state.k === null ? '—' : state.k}</span></span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {/* Distance matrix — primary visual */}
                            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 mb-6">
                                <p className="text-sm font-semibold text-slate-300 mb-3 text-center">Distance matrix <span className="text-slate-500 font-normal">— dist[i][j] = shortest i → j so far</span></p>
                                <div className="flex justify-center">
                                    <div className="inline-grid gap-1" style={{ gridTemplateColumns: `40px repeat(${V}, 52px)` }}>
                                        <div />
                                        {Array.from({ length: V }).map((_, j) => (
                                            <div key={`h${j}`} className={`h-8 flex items-center justify-center text-xs font-bold rounded ${state.k === j ? 'text-cyan-300' : 'text-slate-500'}`}>j={j}</div>
                                        ))}
                                        {Array.from({ length: V }).map((_, i) => (
                                            <React.Fragment key={`r${i}`}>
                                                <div className={`w-10 flex items-center justify-center text-xs font-bold rounded ${state.k === i ? 'text-cyan-300' : 'text-slate-500'}`}>i={i}</div>
                                                {Array.from({ length: V }).map((_, j) => (
                                                    <div key={`c${i}-${j}`}
                                                        className={`h-11 flex items-center justify-center text-sm font-mono rounded border transition-all duration-300 ${cellClass(i, j)}`}>
                                                        {fmt(state.matrix[i][j])}
                                                    </div>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Reference directed weighted graph */}
                            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 mb-6">
                                <p className="text-xs font-semibold text-slate-400 mb-2 text-center">Reference graph (directed, weighted)</p>
                                <svg viewBox="0 0 520 360" className="w-full" style={{ maxHeight: '240px' }}>
                                    <defs>
                                        <marker id="fw-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                                            <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                                        </marker>
                                    </defs>
                                    {EDGES.map(([a, b, w], idx) => {
                                        const na = NODES.find(n => n.id === a), nb = NODES.find(n => n.id === b);
                                        const dx = nb.x - na.x, dy = nb.y - na.y, len = Math.hypot(dx, dy) || 1;
                                        const ux = dx / len, uy = dy / len;
                                        const x1 = na.x + ux * 26, y1 = na.y + uy * 26, x2 = nb.x - ux * 28, y2 = nb.y - uy * 28;
                                        const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2;
                                        return (
                                            <g key={idx}>
                                                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="1.8" strokeOpacity="0.7" markerEnd="url(#fw-arrow)" />
                                                <rect x={mx - 9} y={my - 9} width={18} height={16} rx={3} fill="#1e293b" />
                                                <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="central" fill="#94a3b8" fontSize="10" fontWeight="bold">{w}</text>
                                            </g>
                                        );
                                    })}
                                    {NODES.map(n => {
                                        const c = nodeColor(n.id);
                                        return (
                                            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                                                <circle r={22} fill={c.fill} stroke={c.stroke} strokeWidth={2.5} className="transition-all duration-300" />
                                                <text textAnchor="middle" dominantBaseline="central" fill="#f0fdf4" fontSize="14" fontWeight="bold">{n.id}</text>
                                            </g>
                                        );
                                    })}
                                </svg>
                                {state.phase === 'relax' && (
                                    <p className="text-center text-xs text-slate-400 mt-1">
                                        <span className="text-blue-400 font-bold">i={state.i}</span> →
                                        <span className="text-cyan-400 font-bold"> k={state.k}</span> →
                                        <span className="text-orange-400 font-bold"> j={state.j}</span>
                                    </p>
                                )}
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
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(V³)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(V²)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Technique:</span><span className="bg-cyan-500/15 text-cyan-400 px-2 py-1 rounded">Dynamic Prog.</span></div>
                                <div className="flex justify-between"><span className="text-slate-300">Negative edges:</span><span className="bg-green-500/15 text-green-400 px-2 py-1 rounded">Yes (no neg cycle)</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">When to Use It</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>You need shortest paths between all pairs, not one source</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Small, dense graphs where V³ is affordable</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Graphs with negative edge weights (no negative cycles)</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Large sparse graphs — run Dijkstra from each node instead</span></li>
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
