"use client";
import { useState, useEffect, useCallback } from 'react';
import { SkipBack, SkipForward, Play, Pause, RotateCcw, Shuffle, Info } from 'lucide-react';

// ─── Union-Find with union by rank + path compression ─────────────────────────

function makeUF(n) {
    return {
        parent: Array.from({ length: n }, (_, i) => i),
        rank:   Array(n).fill(0),
    };
}

function findRoot(uf, x) {
    const path = [];
    while (uf.parent[x] !== x) { path.push(x); x = uf.parent[x]; }
    path.push(x);
    return { root: x, path };
}

function snapUF(uf) {
    return { parent: [...uf.parent], rank: [...uf.rank] };
}

// ─── Step generation ──────────────────────────────────────────────────────────

function generateSteps(n, ops) {
    const steps = [];
    const uf = makeUF(n);

    steps.push({
        ...snapUF(uf),
        highlightA: [], highlightB: [], rootA: null, rootB: null,
        decision: null, rankChanged: null,
        explanation: `Initialise ${n} elements. rank[i] = 0 for all i. Union by rank: always attach the smaller-rank tree under the larger-rank root. Equal ranks → either can be root; increment winner's rank.`,
    });

    for (const [p, q] of ops) {
        const { root: rp, path: pathP } = findRoot(uf, p);
        const { root: rq, path: pathQ } = findRoot(uf, q);

        // Show find paths
        steps.push({
            ...snapUF(uf),
            highlightA: [...pathP], highlightB: [...pathQ], rootA: rp, rootB: rq,
            decision: null, rankChanged: null,
            explanation: `union(${p}, ${q}): find(${p}) → root=${rp} (rank ${uf.rank[rp]}), find(${q}) → root=${rq} (rank ${uf.rank[rq]}).`,
        });

        if (rp === rq) {
            steps.push({
                ...snapUF(uf),
                highlightA: [rp], highlightB: [rq], rootA: rp, rootB: rq,
                decision: 'same',
                explanation: `union(${p}, ${q}): roots are both ${rp}. Already in the same component — no change.`,
            });
            continue;
        }

        let decision, rankChanged = null;
        if (uf.rank[rp] < uf.rank[rq]) {
            decision = `rank[${rp}]=${uf.rank[rp]} < rank[${rq}]=${uf.rank[rq]} → attach ${rp} under ${rq}`;
            uf.parent[rp] = rq;
        } else if (uf.rank[rp] > uf.rank[rq]) {
            decision = `rank[${rp}]=${uf.rank[rp]} > rank[${rq}]=${uf.rank[rq]} → attach ${rq} under ${rp}`;
            uf.parent[rq] = rp;
        } else {
            decision = `rank[${rp}]=rank[${rq}]=${uf.rank[rp]} — equal ranks: attach ${rq} under ${rp}, rank[${rp}]++`;
            uf.parent[rq] = rp;
            uf.rank[rp]++;
            rankChanged = rp;
        }

        steps.push({
            ...snapUF(uf),
            highlightA: [], highlightB: [], rootA: rp, rootB: rq,
            decision, rankChanged,
            explanation: `Decision: ${decision}. Tree stays height-bounded — no runaway chains.`,
        });
    }

    const roots = [...new Set(uf.parent.map((_, i) => {
        let x = i;
        while (uf.parent[x] !== x) x = uf.parent[x];
        return x;
    }))];

    steps.push({
        ...snapUF(uf),
        highlightA: [], highlightB: [], rootA: null, rootB: null,
        decision: null, rankChanged: null,
        explanation: `All unions done. ${roots.length} component(s). Max rank = ${Math.max(...uf.rank)}. With union by rank, tree height ≤ log₂(n) — guaranteed.`,
        done: true,
    });

    return steps;
}

// ─── Forest SVG layout ────────────────────────────────────────────────────────

const NODE_R = 22;
const X_GAP = 58;
const Y_GAP = 70;

function buildChildren(parent) {
    const ch = Array.from({ length: parent.length }, () => []);
    for (let i = 0; i < parent.length; i++) {
        if (parent[i] !== i) ch[parent[i]].push(i);
    }
    return ch;
}

function layoutForest(parent) {
    const children = buildChildren(parent);
    const roots = parent.map((p, i) => p === i ? i : -1).filter(x => x >= 0);
    const pos = {};
    const counter = { n: 0 };

    function inorder(node, depth) {
        const ch = children[node];
        const mid = Math.floor(ch.length / 2);
        for (let i = 0; i < mid; i++) inorder(ch[i], depth + 1);
        pos[node] = { x: counter.n * X_GAP + X_GAP / 2, y: depth * Y_GAP + NODE_R + 10 };
        counter.n++;
        for (let i = mid; i < ch.length; i++) inorder(ch[i], depth + 1);
    }
    for (const r of roots) inorder(r, 0);
    return pos;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const QS = [
    {
        question: 'When does union by rank increment a root\'s rank?',
        options: [
            'Every union operation',
            'When the two roots have equal rank',
            'When the attached tree is taller',
            'Never — rank is read-only',
        ],
        correct: 1,
        explanation: 'Rank only increments when two trees of equal rank merge. The winner gets rank+1. Otherwise the loser is attached under the winner and no ranks change.',
    },
    {
        question: 'What is the maximum tree height with union by rank on n elements?',
        options: ['n', 'n/2', 'log₂(n)', '√n'],
        correct: 2,
        explanation: "Union by rank guarantees tree height ≤ log₂(n). A tree of rank r has at least 2^r nodes, so rank ≤ log₂(n) — bounding the find() chain length.",
    },
    {
        question: 'Why is union by rank + path compression better than either alone?',
        options: [
            'It uses less space',
            'Rank prevents deep trees; compression flattens them further — giving O(α(n)) amortized per op',
            'It allows undoing unions',
            'It avoids the need for the parent array',
        ],
        correct: 1,
        explanation: 'Union by rank bounds height at O(log n); path compression flattens each found path to 1. Together the amortized cost is O(α(n)) — inverse Ackermann, effectively constant.',
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
    { n: 8,  ops: [[0,1],[2,3],[4,5],[6,7],[0,2],[4,6],[0,4]] },
    { n: 10, ops: [[0,1],[2,3],[4,5],[6,7],[8,9],[0,2],[4,6],[0,4],[0,8]] },
    { n: 7,  ops: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]] },
];

function randomOps(n) {
    const ops = [];
    const used = new Set();
    const count = Math.min(n + 1, 9);
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

export default function UnionByRankPage() {
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
    const rank   = step.rank   || Array(preset.n).fill(0);
    const highlightA = new Set(step.highlightA || []);
    const highlightB = new Set(step.highlightB || []);

    const pos = layoutForest(parent);
    const nodeIds = Object.keys(pos).map(Number);
    const maxX = nodeIds.length ? Math.max(...nodeIds.map(id => pos[id].x)) + X_GAP / 2 + 10 : 500;
    const maxY = nodeIds.length ? Math.max(...nodeIds.map(id => pos[id].y)) + NODE_R + 30 : 200;

    function nodeFill(i) {
        if (i === step.rankChanged) return '#f59e0b';
        if (i === step.rootA) return '#22c55e';
        if (i === step.rootB) return '#3b82f6';
        if (highlightA.has(i)) return '#a78bfa';
        if (highlightB.has(i)) return '#f472b6';
        if (parent[i] === i) return '#7e22ce';
        return '#334155';
    }
    function nodeStroke(i) {
        if (i === step.rankChanged) return '#fcd34d';
        if (i === step.rootA) return '#4ade80';
        if (i === step.rootB) return '#60a5fa';
        if (highlightA.has(i) || highlightB.has(i)) return '#c4b5fd';
        if (parent[i] === i) return '#a855f7';
        return '#475569';
    }

    // Rank color badge
    const RANK_COLS = ['#64748b','#8b5cf6','#3b82f6','#22c55e','#f59e0b','#ef4444'];

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="bg-gradient-to-r from-purple-600 to-violet-700 py-10 px-4">
                <div className="max-w-5xl mx-auto">
                    <p className="text-purple-200 text-sm font-semibold uppercase tracking-widest mb-1">Union-Find</p>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Union by Rank</h1>
                    <p className="text-purple-100 max-w-2xl">Always attach the shallower tree under the deeper one. Rank labels on every node show the decision. Tree height stays bounded at O(log n).</p>
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
                        <button onClick={() => { const n = 6 + Math.floor(Math.random() * 5); setPreset({ n, ops: randomOps(n) }); }} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"><Shuffle className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                        <span className="text-xs text-slate-400">Speed</span>
                        <input type="range" min="300" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-purple-500" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {PRESETS.map((p, i) => (
                            <button key={i} onClick={() => setPreset(p)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${preset === p ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                                n={p.n}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-slate-500 ml-auto">Step {cur + 1}/{steps.length}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-5">
                        {/* Forest SVG with rank labels */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5 overflow-auto">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Forest — rank shown inside each node</h2>
                            <svg viewBox={`0 0 ${maxX} ${maxY}`} width="100%" style={{ minHeight: 160 }}>
                                <defs>
                                    <marker id="arrowubr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                                        <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                                    </marker>
                                </defs>
                                {/* Edges */}
                                {nodeIds.map(i => {
                                    if (parent[i] === i) return null;
                                    const from = pos[i], to = pos[parent[i]];
                                    if (!from || !to) return null;
                                    const dx = to.x - from.x, dy = to.y - from.y;
                                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                                    const ux = dx / len, uy = dy / len;
                                    return (
                                        <line key={i}
                                            x1={from.x + ux * NODE_R} y1={from.y + uy * NODE_R}
                                            x2={to.x - ux * NODE_R} y2={to.y - uy * NODE_R}
                                            stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowubr)" />
                                    );
                                })}
                                {/* Nodes — show both node id and rank */}
                                {nodeIds.map(i => {
                                    if (!pos[i]) return null;
                                    const { x, y } = pos[i];
                                    const isRoot = parent[i] === i;
                                    const r = rank[i];
                                    const rankCol = RANK_COLS[Math.min(r, RANK_COLS.length - 1)];
                                    return (
                                        <g key={i}>
                                            {isRoot && <circle cx={x} cy={y} r={NODE_R + 5} fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" />}
                                            <circle cx={x} cy={y} r={NODE_R} fill={nodeFill(i)} stroke={nodeStroke(i)} strokeWidth="2"
                                                style={{ transition: 'fill 0.35s, stroke 0.35s' }} />
                                            {/* Node id (top half) */}
                                            <text x={x} y={y - 4} textAnchor="middle" dominantBaseline="middle"
                                                fontSize="11" fontWeight="700" fill="white" style={{ pointerEvents: 'none' }}>{i}</text>
                                            {/* Rank badge (bottom half) */}
                                            <text x={x} y={y + 8} textAnchor="middle" dominantBaseline="middle"
                                                fontSize="9" fontWeight="600" fill={rankCol} style={{ pointerEvents: 'none' }}>r{r}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                            <div className="flex gap-4 mt-3 flex-wrap text-xs text-slate-400">
                                {[['bg-purple-500','Path A'],['bg-pink-400','Path B'],['bg-green-500','Root A (higher rank)'],['bg-blue-500','Root B'],['bg-amber-400','Rank just incremented']].map(([bg,lbl]) => (
                                    <div key={lbl} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${bg}`} />{lbl}</div>
                                ))}
                            </div>
                        </div>

                        {/* Rank array */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">rank[ ] array</h2>
                            <div className="flex gap-2 flex-wrap">
                                {rank.map((r, i) => {
                                    const isRoot = parent[i] === i;
                                    const changed = i === step.rankChanged;
                                    let cls = 'w-11 h-11 flex items-center justify-center rounded-xl border-2 text-sm font-bold transition-all duration-300 ';
                                    if (changed) cls += 'bg-amber-500 border-amber-400 text-slate-900 scale-110';
                                    else if (isRoot) cls += 'bg-purple-700 border-purple-500 text-white';
                                    else cls += 'bg-slate-700 border-slate-600 text-slate-400';
                                    return (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <div className={cls}>{r}</div>
                                            <span className="text-[9px] text-slate-500 font-mono">[{i}]</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Decision banner */}
                        {step.decision && (
                            <div className="bg-violet-900/30 border border-violet-500/30 rounded-xl p-4">
                                <p className="text-xs text-violet-400 font-semibold uppercase mb-1">Rank Decision</p>
                                <p className="text-violet-200 text-sm font-mono">{step.decision}</p>
                            </div>
                        )}
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
                                {[
                                    ['find(x)', 'O(log n)', 'text-yellow-400'],
                                    ['union(p,q)', 'O(log n)', 'text-yellow-400'],
                                    ['With compression', 'O(α(n))', 'text-green-400'],
                                    ['Space', 'O(n)', 'text-slate-300'],
                                ].map(([op, c, col]) => (
                                    <div key={op} className="flex justify-between">
                                        <span className="text-slate-400 font-mono">{op}</span>
                                        <span className={`font-mono font-semibold ${col}`}>{c}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-700 space-y-1 text-xs">
                                <div className="flex justify-between"><span className="text-slate-400">Max rank</span><span className="text-purple-300 font-mono">{Math.max(...rank)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">log₂(n)</span><span className="text-slate-300 font-mono">{Math.ceil(Math.log2(preset.n + 1))}</span></div>
                            </div>
                        </div>
                        <QuizPanel qs={quizState} setQs={setQuizState} />
                    </div>
                </div>
            </div>
        </div>
    );
}
