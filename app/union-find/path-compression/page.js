"use client";
import { useState, useEffect, useCallback } from 'react';
import { SkipBack, SkipForward, Play, Pause, RotateCcw, Shuffle, Info } from 'lucide-react';

// ─── Union-Find with path compression ────────────────────────────────────────

function findWithPath(parent, x) {
    const path = [];
    while (parent[x] !== x) { path.push(x); x = parent[x]; }
    path.push(x); // root
    return { root: x, path };
}

function compressPath(parent, path, root) {
    const newParent = [...parent];
    for (const node of path.slice(0, -1)) {
        newParent[node] = root;
    }
    return newParent;
}

// ─── Step generation ──────────────────────────────────────────────────────────

function generateSteps(n, ops) {
    const steps = [];
    let parent = Array.from({ length: n }, (_, i) => i);

    const snap = (extra) => ({ parent: [...parent], ...extra });

    steps.push({
        ...snap({ highlightPath: [], compressedNodes: [], phase: 'init' }),
        explanation: `Initialise ${n} elements. Path compression: after find(x), every node on the walked path is re-pointed directly to the root — flattening future searches.`,
    });

    for (const op of ops) {
        if (op.type === 'union') {
            const [p, q] = op.args;
            const { root: rp } = findWithPath(parent, p);
            const { root: rq } = findWithPath(parent, q);
            if (rp === rq) {
                steps.push({
                    ...snap({ highlightPath: [p, q], compressedNodes: [], phase: 'union' }),
                    explanation: `union(${p}, ${q}): both already in the same component (root ${rp}). No change.`,
                });
                continue;
            }
            parent[rp] = rq;
            steps.push({
                ...snap({ highlightPath: [rp, rq], compressedNodes: [], phase: 'union' }),
                explanation: `union(${p}, ${q}): root of ${p} is ${rp}, root of ${q} is ${rq}. Set parent[${rp}] = ${rq}.`,
            });
        } else {
            // find with path compression
            const x = op.args[0];
            const { root, path } = findWithPath(parent, x);

            if (path.length === 1) {
                steps.push({
                    ...snap({ highlightPath: path, compressedNodes: [], phase: 'find_root' }),
                    explanation: `find(${x}): ${x} is already the root — no compression needed.`,
                });
                continue;
            }

            // Show the full path walk
            steps.push({
                ...snap({ highlightPath: [...path], compressedNodes: [], phase: 'find_walk' }),
                explanation: `find(${x}): walking parent chain ${path.join(' → ')}. Root = ${root}. Now compress: re-point every node on path directly to ${root}.`,
            });

            // Compress one node at a time for drama
            const beforeParent = [...parent];
            for (let i = 0; i < path.length - 1; i++) {
                const node = path[i];
                if (parent[node] !== root) {
                    parent[node] = root;
                    steps.push({
                        ...snap({ highlightPath: path.slice(i + 1), compressedNodes: path.slice(0, i + 1), phase: 'compressing' }),
                        explanation: `Path compression: parent[${node}] = ${root}. Node ${node} now points directly to root ${root} — skipping ${beforeParent[node] !== root ? `intermediate node ${beforeParent[node]}` : 'nothing new'}.`,
                    });
                }
            }

            steps.push({
                ...snap({ highlightPath: [], compressedNodes: path.slice(0, -1), phase: 'compressed' }),
                explanation: `find(${x}) complete. ${path.slice(0, -1).join(', ')} all point directly to root ${root}. Future finds from these nodes cost O(1).`,
            });
        }
    }

    steps.push({
        ...snap({ highlightPath: [], compressedNodes: [], phase: 'done' }),
        explanation: `All operations complete. The compressed forest is very flat — most nodes point directly to roots. parent = [${parent.join(', ')}].`,
        done: true,
    });

    return steps;
}

// ─── Forest SVG (same layout helper) ─────────────────────────────────────────

const NODE_R = 20;
const X_GAP = 52;
const Y_GAP = 64;

function buildChildren(parent) {
    const ch = Array.from({ length: parent.length }, () => []);
    for (let i = 0; i < parent.length; i++) {
        if (parent[i] !== i) ch[parent[i]].push(i);
    }
    return ch;
}

function layoutForest(parent) {
    const n = parent.length;
    const children = buildChildren(parent);
    const roots = parent.map((p, i) => p === i ? i : -1).filter(x => x >= 0);
    const pos = {};
    const counter = { n: 0 };

    function inorder(node, depth) {
        const ch = children[node];
        const midIdx = Math.floor(ch.length / 2);
        for (let i = 0; i < midIdx; i++) inorder(ch[i], depth + 1);
        pos[node] = { x: counter.n * X_GAP + X_GAP / 2, y: depth * Y_GAP + NODE_R + 10 };
        counter.n++;
        for (let i = midIdx; i < ch.length; i++) inorder(ch[i], depth + 1);
    }

    for (const r of roots) inorder(r, 0);
    return pos;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const QS = [
    {
        question: 'What does path compression do to the parent pointers after find(x)?',
        options: [
            'Deletes intermediate nodes',
            'Makes all nodes on the path point directly to the root',
            'Reverses the path direction',
            'Copies the root node for every member',
        ],
        correct: 1,
        explanation: 'Path compression re-points every node visited during find(x) directly to the root, flattening the tree for all future operations through those nodes.',
    },
    {
        question: "What is the amortized cost per operation with path compression alone (without union by rank)?",
        options: ['O(1)', 'O(log n)', 'O(log* n)', 'O(α(n))'],
        correct: 2,
        explanation: 'Path compression alone gives O(log* n) amortized (iterated logarithm). Combined with union by rank it improves to O(α(n)) — the inverse Ackermann function.',
    },
    {
        question: 'After a find(x) with a path of length 5, how many additional steps does the same find(x) cost?',
        options: ['5', '4', '1 (just returns parent[x])', '0 (already cached)'],
        correct: 2,
        explanation: "After compression, parent[x] = root directly. A second find(x) follows exactly one pointer — O(1) — regardless of the original chain length.",
    },
];

function QuizPanel({ qs, setQs }) {
    if (qs.complete) return (
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 text-center">
            <p className="text-2xl font-bold text-purple-400 mb-1">{qs.score}/{QS.length}</p>
            <p className="text-slate-400 text-sm mb-3">{qs.score === QS.length ? 'Perfect!' : 'Keep going!'}</p>
            <button onClick={() => setQs({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors">Retake</button>
        </div>
    );
    const q = QS[qs.current];
    return (
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Active Recall</span>
                <span className="text-xs text-slate-500">{qs.current + 1}/{QS.length}</span>
            </div>
            <p className="text-slate-200 text-sm font-medium leading-snug">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ';
                    if (!qs.answered) cls += 'border-slate-600 text-slate-300 hover:border-purple-500 cursor-pointer';
                    else if (i === q.correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                    else if (i === qs.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                    else cls += 'border-slate-700 text-slate-500';
                    return <button key={i} className={cls} onClick={() => {
                        if (qs.answered) return;
                        setQs(s => ({ ...s, selected: i, answered: true, score: i === q.correct ? s.score + 1 : s.score }));
                    }}>{opt}</button>;
                })}
            </div>
            {qs.answered && <div className="text-xs text-slate-400 bg-slate-700/40 rounded-lg p-3">{q.explanation}</div>}
            {qs.answered && (
                <button onClick={() => {
                    if (qs.current + 1 >= QS.length) setQs(s => ({ ...s, complete: true }));
                    else setQs(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
                }} className="w-full text-xs bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition-colors">
                    {qs.current + 1 >= QS.length ? 'See Results' : 'Next'}
                </button>
            )}
        </div>
    );
}

// ─── Presets: build a tall tree first, then compress via finds ────────────────

const PRESETS = [
    {
        n: 8,
        ops: [
            { type: 'union', args: [0, 1] },
            { type: 'union', args: [1, 2] },
            { type: 'union', args: [2, 3] },
            { type: 'union', args: [3, 4] },
            { type: 'find',  args: [0] },   // compress long chain
            { type: 'union', args: [5, 6] },
            { type: 'union', args: [6, 7] },
            { type: 'find',  args: [5] },   // compress another chain
            { type: 'union', args: [4, 7] },
        ],
    },
    {
        n: 7,
        ops: [
            { type: 'union', args: [0, 6] },
            { type: 'union', args: [1, 0] },
            { type: 'union', args: [2, 1] },
            { type: 'union', args: [3, 2] },
            { type: 'find',  args: [3] },
            { type: 'union', args: [4, 5] },
            { type: 'union', args: [3, 4] },
        ],
    },
    {
        n: 9,
        ops: [
            { type: 'union', args: [0, 1] },
            { type: 'union', args: [1, 2] },
            { type: 'union', args: [2, 3] },
            { type: 'union', args: [4, 5] },
            { type: 'union', args: [5, 6] },
            { type: 'find',  args: [0] },
            { type: 'find',  args: [4] },
            { type: 'union', args: [3, 6] },
            { type: 'union', args: [7, 8] },
            { type: 'union', args: [8, 3] },
        ],
    },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PathCompressionPage() {
    const [preset, setPreset] = useState(PRESETS[0]);
    const [steps, setSteps] = useState([]);
    const [cur, setCur] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const rebuild = useCallback((p) => {
        setSteps(generateSteps(p.n, p.ops));
        setCur(0); setPlaying(false);
    }, []);
    useEffect(() => { rebuild(preset); }, [preset, rebuild]);

    useEffect(() => {
        if (!playing || steps.length === 0) return;
        if (cur >= steps.length - 1) { setPlaying(false); return; }
        const t = setTimeout(() => setCur(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [playing, cur, steps, speed]);

    const step = steps[cur] || {};
    const parent = step.parent || Array.from({ length: preset.n }, (_, i) => i);
    const highlightPath = new Set(step.highlightPath || []);
    const compressedNodes = new Set(step.compressedNodes || []);

    const pos = layoutForest(parent);
    const nodeIds = Object.keys(pos).map(Number);
    const maxX = nodeIds.length ? Math.max(...nodeIds.map(id => pos[id].x)) + X_GAP / 2 + 10 : 500;
    const maxY = nodeIds.length ? Math.max(...nodeIds.map(id => pos[id].y)) + NODE_R + 20 : 200;

    function nodeFill(i) {
        if (compressedNodes.has(i)) return '#22c55e';
        if (highlightPath.has(i) && step.phase === 'compressing') return '#facc15';
        if (highlightPath.has(i)) return '#a78bfa';
        if (parent[i] === i) return '#7e22ce';
        return '#334155';
    }
    function nodeStroke(i) {
        if (compressedNodes.has(i)) return '#4ade80';
        if (highlightPath.has(i)) return '#c4b5fd';
        if (parent[i] === i) return '#a855f7';
        return '#475569';
    }

    const phaseLabel = { init: 'Init', find_walk: 'Walking Path', find_root: 'At Root', compressing: 'Compressing!', compressed: 'Compressed', union: 'Union', done: 'Done' };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="bg-gradient-to-r from-purple-600 to-violet-700 py-10 px-4">
                <div className="max-w-5xl mx-auto">
                    <p className="text-purple-200 text-sm font-semibold uppercase tracking-widest mb-1">Union-Find</p>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Path Compression</h1>
                    <p className="text-purple-100 max-w-2xl">After find(x), every node on the walked path is re-pointed directly to the root. Tall chains flatten to stars in one pass.</p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                {/* Controls */}
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCur(0)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"><RotateCcw className="h-4 w-4" /></button>
                        <button onClick={() => setCur(s => Math.max(0, s - 1))} disabled={cur === 0} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipBack className="h-4 w-4" /></button>
                        <button onClick={() => setPlaying(p => !p)} className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors">
                            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setCur(s => Math.min(steps.length - 1, s + 1))} disabled={cur >= steps.length - 1} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipForward className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                        <span className="text-xs text-slate-400">Speed</span>
                        <input type="range" min="300" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-purple-500" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {PRESETS.map((p, i) => (
                            <button key={i} onClick={() => setPreset(p)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${preset === p ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                                Preset {i + 1}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-slate-500 ml-auto">Step {cur + 1}/{steps.length}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-5">
                        {/* Forest SVG */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5 overflow-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Forest</h2>
                                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${step.phase === 'compressing' ? 'bg-yellow-500/20 text-yellow-300' : step.phase === 'compressed' ? 'bg-green-500/20 text-green-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                    {phaseLabel[step.phase] || ''}
                                </span>
                            </div>
                            <svg viewBox={`0 0 ${maxX} ${maxY}`} width="100%" style={{ minHeight: 160 }}>
                                <defs>
                                    <marker id="arrowpc" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                                        <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                                    </marker>
                                </defs>
                                {nodeIds.map(i => {
                                    if (parent[i] === i) return null;
                                    const from = pos[i], to = pos[parent[i]];
                                    if (!from || !to) return null;
                                    const dx = to.x - from.x, dy = to.y - from.y;
                                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                                    const ux = dx / len, uy = dy / len;
                                    const x1 = from.x + ux * NODE_R, y1 = from.y + uy * NODE_R;
                                    const x2 = to.x - ux * NODE_R, y2 = to.y - uy * NODE_R;
                                    const compressed = compressedNodes.has(i);
                                    return (
                                        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                                            stroke={compressed ? '#22c55e' : highlightPath.has(i) ? '#a78bfa' : '#475569'}
                                            strokeWidth={compressed ? 2.5 : 1.5}
                                            markerEnd="url(#arrowpc)" />
                                    );
                                })}
                                {nodeIds.map(i => {
                                    if (!pos[i]) return null;
                                    const { x, y } = pos[i];
                                    const isRoot = parent[i] === i;
                                    return (
                                        <g key={i}>
                                            {isRoot && <circle cx={x} cy={y} r={NODE_R + 4} fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" />}
                                            <circle cx={x} cy={y} r={NODE_R} fill={nodeFill(i)} stroke={nodeStroke(i)} strokeWidth="2"
                                                style={{ transition: 'fill 0.4s, stroke 0.4s' }} />
                                            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                                                fontSize="13" fontWeight="700" fill="white" style={{ pointerEvents: 'none' }}>{i}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                            <div className="flex gap-4 mt-3 flex-wrap text-xs text-slate-400">
                                {[['bg-purple-500','Walking path'],['bg-yellow-400','Being compressed'],['bg-green-500','Compressed → root'],['bg-violet-800','Root node']].map(([bg,lbl]) => (
                                    <div key={lbl} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${bg}`} />{lbl}</div>
                                ))}
                            </div>
                        </div>

                        {/* Operations list */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Operation Sequence</h2>
                            <div className="flex flex-wrap gap-2">
                                {preset.ops.map((op, i) => {
                                    const label = op.type === 'union' ? `union(${op.args[0]},${op.args[1]})` : `find(${op.args[0]})`;
                                    return (
                                        <span key={i} className={`text-xs font-mono px-3 py-1 rounded-full border ${op.type === 'find' ? 'bg-purple-500/10 border-purple-500/40 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                            {label}
                                        </span>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-slate-600 mt-2">Purple = find() with compression</p>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                                <p className="text-purple-300 text-sm leading-relaxed">{step.explanation || '…'}</p>
                            </div>
                        </div>
                        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Complexity</p>
                            <div className="space-y-2 text-xs">
                                {[['find(x)', 'O(log* n) amort.', 'text-yellow-400'], ['union(p,q)', 'O(log* n) amort.', 'text-yellow-400'], ['Space', 'O(n)', 'text-slate-300']].map(([op, c, col]) => (
                                    <div key={op} className="flex justify-between">
                                        <span className="text-slate-400 font-mono">{op}</span>
                                        <span className={`font-mono font-semibold ${col}`}>{c}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <QuizPanel qs={quizState} setQs={setQuizState} />
                    </div>
                </div>
            </div>
        </div>
    );
}
