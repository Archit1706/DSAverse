"use client";
import { useState, useEffect, useCallback } from 'react';
import { SkipBack, SkipForward, Play, Pause, RotateCcw, Shuffle, Info } from 'lucide-react';

// ─── Union-Find logic ─────────────────────────────────────────────────────────

function findRoot(parent, x) {
    while (parent[x] !== x) x = parent[x];
    return x;
}

// ─── Step generation ──────────────────────────────────────────────────────────

function generateSteps(n, ops) {
    const steps = [];
    const parent = Array.from({ length: n }, (_, i) => i);

    const snap = (extra) => ({ parent: [...parent], ...extra });

    steps.push({
        ...snap({ pathA: [], pathB: [], rootA: null, rootB: null, activeP: null, activeQ: null }),
        explanation: `Initialise ${n} elements. parent[i] = i (each is its own root). find(x) follows parent links; union(p,q) re-points one root.`,
    });

    for (const [p, q] of ops) {
        // Walk path from p to root
        const pathA = [];
        let x = p;
        while (parent[x] !== x) { pathA.push(x); x = parent[x]; }
        pathA.push(x);
        const rootA = x;

        steps.push({
            ...snap({ pathA: [...pathA], pathB: [], rootA, rootB: null, activeP: p, activeQ: q }),
            explanation: `union(${p}, ${q}): finding root of ${p}. Walking: ${pathA.join(' → ')}. Root = ${rootA}.`,
        });

        // Walk path from q to root
        const pathB = [];
        let y = q;
        while (parent[y] !== y) { pathB.push(y); y = parent[y]; }
        pathB.push(y);
        const rootB = y;

        if (rootA === rootB) {
            steps.push({
                ...snap({ pathA, pathB: [...pathB], rootA, rootB, activeP: p, activeQ: q }),
                explanation: `union(${p}, ${q}): root of ${q} is also ${rootB}. Already connected — no change.`,
            });
            continue;
        }

        steps.push({
            ...snap({ pathA, pathB: [...pathB], rootA, rootB, activeP: p, activeQ: q }),
            explanation: `union(${p}, ${q}): root of ${q} is ${rootB}. Roots differ (${rootA} ≠ ${rootB}) → set parent[${rootA}] = ${rootB}.`,
        });

        parent[rootA] = rootB;

        steps.push({
            ...snap({ pathA: [], pathB: [], rootA: null, rootB: null, activeP: p, activeQ: q }),
            explanation: `Done: parent[${rootA}] = ${rootB}. Trees rooted at ${rootA} and ${rootB} are now one tree under ${rootB}.`,
        });
    }

    steps.push({
        ...snap({ pathA: [], pathB: [], rootA: null, rootB: null, activeP: null, activeQ: null }),
        explanation: `All unions complete. parent = [${parent.join(', ')}]. Distinct roots: ${[...new Set(parent.map((_, i) => findRoot(parent, i)))].length} component(s).`,
        done: true,
    });

    return steps;
}

// ─── Forest SVG layout ────────────────────────────────────────────────────────

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

    function layoutNode(node, depth) {
        for (const c of children[node]) layoutNode(c, depth + 1);
        const x = counter.n * X_GAP + X_GAP / 2;
        const y = depth * Y_GAP + NODE_R + 10;
        pos[node] = { x, y };
        counter.n++;
        // if no children, still advance counter for leaf
        if (children[node].length === 0) return;
        // center parent over children
        const childXs = children[node].map(c => pos[c].x);
        pos[node].x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    }

    // Two-pass: first compute leaf positions, then center parents
    function leafCount(node) {
        if (children[node].length === 0) return 1;
        return children[node].reduce((s, c) => s + leafCount(c), 0);
    }

    // Use inorder approach
    counter.n = 0;
    function inorder(node, depth) {
        // visit left children first
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
        question: 'What is the worst-case time for find() in Quick Union?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
        correct: 2,
        explanation: 'In the worst case, repeated unions create a "tall" linear chain. find() must follow n parent pointers, giving O(n).',
    },
    {
        question: 'After union(p, q), which root becomes the child?',
        options: ["p's root", "q's root", 'The one with more elements', 'It alternates each call'],
        correct: 0,
        explanation: "Quick Union sets parent[root(p)] = root(q), making p's root a child of q's root.",
    },
    {
        question: 'What makes Quick Union potentially worse than Quick Find in practice?',
        options: [
            'It uses more memory',
            'find() can be O(n) on degenerate tall trees, making union() also O(n)',
            'It cannot handle disconnected components',
            'union() is O(n²)',
        ],
        correct: 1,
        explanation: "Quick Union's union() calls find() twice. If trees become tall chains (O(n) each), the amortized cost per operation degrades, erasing the advantage over Quick Find.",
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

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
    { n: 9, ops: [[0,1],[2,3],[4,5],[6,7],[0,2],[4,6],[0,4],[3,8]] },
    { n: 7, ops: [[0,6],[1,2],[3,4],[5,0],[3,5],[1,3]] },
    { n: 8, ops: [[0,1],[2,3],[4,5],[6,7],[0,2],[4,6],[0,4]] },
];

function randomOps(n) {
    const ops = [];
    const used = new Set();
    const count = Math.min(n, 8);
    for (let i = 0; i < count; i++) {
        let p, q, key;
        do {
            p = Math.floor(Math.random() * n);
            q = Math.floor(Math.random() * n);
            key = `${Math.min(p,q)}-${Math.max(p,q)}`;
        } while (p === q || used.has(key));
        used.add(key);
        ops.push([p, q]);
    }
    return ops;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function QuickUnionPage() {
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
    const pathA = new Set(step.pathA || []);
    const pathB = new Set(step.pathB || []);

    const pos = layoutForest(parent);
    const nodeIds = Object.keys(pos).map(Number);
    const maxX = nodeIds.length ? Math.max(...nodeIds.map(id => pos[id].x)) + X_GAP / 2 + 10 : 500;
    const maxY = nodeIds.length ? Math.max(...nodeIds.map(id => pos[id].y)) + NODE_R + 20 : 200;

    function nodeFill(i) {
        if (i === step.rootA) return '#22c55e';
        if (i === step.rootB) return '#3b82f6';
        if (pathA.has(i)) return '#facc15';
        if (pathB.has(i)) return '#fb923c';
        if (i === step.activeP || i === step.activeQ) return '#a78bfa';
        return '#334155';
    }
    function nodeStroke(i) {
        if (i === step.rootA) return '#4ade80';
        if (i === step.rootB) return '#60a5fa';
        if (pathA.has(i)) return '#fde047';
        if (pathB.has(i)) return '#fdba74';
        if (i === step.activeP || i === step.activeQ) return '#c4b5fd';
        return '#475569';
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="bg-gradient-to-r from-purple-600 to-violet-700 py-10 px-4">
                <div className="max-w-5xl mx-auto">
                    <p className="text-purple-200 text-sm font-semibold uppercase tracking-widest mb-1">Union-Find</p>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Quick Union</h1>
                    <p className="text-purple-100 max-w-2xl">Each element stores a parent pointer forming a forest of trees. find() walks the chain; union() re-points one root. Trees can grow tall — O(n) worst case.</p>
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
                        <button onClick={() => { const n = 6 + Math.floor(Math.random() * 4); setPreset({ n, ops: randomOps(n) }); }} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"><Shuffle className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                        <span className="text-xs text-slate-400">Speed</span>
                        <input type="range" min="300" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-purple-500" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {PRESETS.map((p, i) => (
                            <button key={i} onClick={() => setPreset(p)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${preset === p ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                                n={p.n}, {p.ops.length} ops
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-slate-500 ml-auto">Step {cur + 1}/{steps.length}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-5">
                        {/* Forest SVG */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5 overflow-auto">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Union-Find Forest</h2>
                            <svg viewBox={`0 0 ${maxX} ${maxY}`} width="100%" style={{ minHeight: 160 }}>
                                {/* Edges (parent arrows) */}
                                {nodeIds.map(i => {
                                    if (parent[i] === i) return null;
                                    const from = pos[i], to = pos[parent[i]];
                                    if (!from || !to) return null;
                                    const dx = to.x - from.x, dy = to.y - from.y;
                                    const len = Math.sqrt(dx * dx + dy * dy);
                                    const ux = dx / len, uy = dy / len;
                                    // shorten by NODE_R on each end
                                    const x1 = from.x + ux * NODE_R, y1 = from.y + uy * NODE_R;
                                    const x2 = to.x - ux * NODE_R, y2 = to.y - uy * NODE_R;
                                    const isPath = pathA.has(i) || pathB.has(i);
                                    return (
                                        <g key={i}>
                                            <line x1={x1} y1={y1} x2={x2} y2={y2}
                                                stroke={isPath ? '#facc15' : '#475569'} strokeWidth={isPath ? 2.5 : 1.5}
                                                markerEnd="url(#arrow)" />
                                        </g>
                                    );
                                })}
                                <defs>
                                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                                        <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                                    </marker>
                                </defs>
                                {/* Nodes */}
                                {nodeIds.map(i => {
                                    if (!pos[i]) return null;
                                    const { x, y } = pos[i];
                                    const isRoot = parent[i] === i;
                                    return (
                                        <g key={i}>
                                            {isRoot && <circle cx={x} cy={y} r={NODE_R + 4} fill="none" stroke={nodeStroke(i)} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />}
                                            <circle cx={x} cy={y} r={NODE_R} fill={nodeFill(i)} stroke={nodeStroke(i)} strokeWidth="2"
                                                style={{ transition: 'fill 0.3s, stroke 0.3s' }} />
                                            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                                                fontSize="13" fontWeight="700" fill="white" style={{ pointerEvents: 'none' }}>{i}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                            <div className="flex gap-4 mt-3 flex-wrap text-xs text-slate-400">
                                {[['bg-yellow-400', 'Path from p'], ['bg-orange-400', 'Path from q'], ['bg-green-500', 'Root of p'], ['bg-blue-500', 'Root of q'], ['bg-purple-500', 'Active node']].map(([bg, lbl]) => (
                                    <div key={lbl} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${bg}`} />{lbl}</div>
                                ))}
                                <div className="flex items-center gap-1.5"><div className="w-4 h-0 border-t border-dashed border-slate-400" />Root node</div>
                            </div>
                        </div>

                        {/* parent[] array */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">parent[ ] array</h2>
                            <div className="flex gap-2 flex-wrap">
                                {parent.map((p, i) => {
                                    const isRoot = p === i;
                                    const inPathA = pathA.has(i), inPathB = pathB.has(i);
                                    let cls = 'w-11 h-11 flex items-center justify-center rounded-xl border-2 text-sm font-bold transition-all duration-300 ';
                                    if (inPathA) cls += 'bg-yellow-400 border-yellow-300 text-slate-900';
                                    else if (inPathB) cls += 'bg-orange-400 border-orange-300 text-slate-900';
                                    else if (isRoot) cls += 'bg-purple-600 border-purple-400 text-white';
                                    else cls += 'bg-slate-700 border-slate-600 text-slate-200';
                                    return (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <div className={cls}>{p}</div>
                                            <span className="text-[9px] text-slate-500 font-mono">[{i}]</span>
                                        </div>
                                    );
                                })}
                            </div>
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
                                {[['find(x)', 'O(n) worst', 'text-red-400'], ['union(p,q)', 'O(n) worst', 'text-red-400'], ['Space', 'O(n)', 'text-slate-300']].map(([op, c, col]) => (
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
