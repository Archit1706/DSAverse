"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, Info, SkipBack, SkipForward, Play, Pause, RotateCcw, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

// ─── Segment Tree Logic ───────────────────────────────────────────────────────

function buildSeg(arr) {
    const n = arr.length;
    const tree = new Array(4 * n).fill(0);
    function build(node, start, end) {
        if (start === end) { tree[node] = arr[start]; return; }
        const mid = Math.floor((start + end) / 2);
        build(2 * node, start, mid);
        build(2 * node + 1, mid + 1, end);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }
    build(1, 0, n - 1);
    return tree;
}

function genBuildSteps(arr) {
    const steps = [];
    const n = arr.length;
    const tree = new Array(4 * n).fill(null);

    function build(node, start, end, path) {
        steps.push({
            tree: [...tree],
            highlight: [...path, node],
            current: node,
            range: [start, end],
            phase: 'visit',
            explanation: `Node ${node} covers arr[${start}..${end}]${start === end ? ` = ${arr[start]}` : ' → split into two halves'}`,
        });
        if (start === end) {
            tree[node] = arr[start];
            steps.push({
                tree: [...tree],
                highlight: [...path, node],
                current: node,
                range: [start, end],
                phase: 'fill',
                explanation: `Leaf node ${node}: tree[${node}] = arr[${start}] = ${arr[start]}`,
            });
            return;
        }
        const mid = Math.floor((start + end) / 2);
        build(2 * node, start, mid, [...path, node]);
        build(2 * node + 1, mid + 1, end, [...path, node]);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
        steps.push({
            tree: [...tree],
            highlight: [...path, node],
            current: node,
            range: [start, end],
            phase: 'merge',
            explanation: `Merge: tree[${node}] = tree[${2 * node}] + tree[${2 * node + 1}] = ${tree[2 * node]} + ${tree[2 * node + 1]} = ${tree[node]}`,
        });
    }
    build(1, 0, n - 1, []);
    steps.push({ tree: [...tree], highlight: [], current: null, range: null, phase: 'done', explanation: 'Segment tree built! tree[1] = total sum of the array.' });
    return { steps, finalTree: [...tree] };
}

function genQuerySteps(tree, arr, l, r) {
    const n = arr.length;
    const steps = [];
    const queryPath = [];

    function query(node, start, end, ql, qr, path) {
        if (qr < start || end < ql) {
            steps.push({ tree, highlight: path, queryPath: [...queryPath], current: node, range: [start, end], phase: 'out', explanation: `Node ${node} [${start}..${end}] is completely outside query [${ql}..${qr}] → return 0` });
            return 0;
        }
        if (ql <= start && end <= qr) {
            queryPath.push(node);
            steps.push({ tree, highlight: path, queryPath: [...queryPath], current: node, range: [start, end], phase: 'in', explanation: `Node ${node} [${start}..${end}] is fully inside query [${ql}..${qr}] → take tree[${node}] = ${tree[node]}` });
            return tree[node];
        }
        const mid = Math.floor((start + end) / 2);
        steps.push({ tree, highlight: path, queryPath: [...queryPath], current: node, range: [start, end], phase: 'partial', explanation: `Node ${node} [${start}..${end}] partially overlaps [${ql}..${qr}] → recurse both children` });
        const left = query(2 * node, start, mid, ql, qr, [...path, 2 * node]);
        const right = query(2 * node + 1, mid + 1, end, ql, qr, [...path, 2 * node + 1]);
        return left + right;
    }
    const result = query(1, 0, n - 1, l, r, [1]);
    steps.push({ tree, highlight: [], queryPath: [...queryPath], current: null, range: null, phase: 'result', explanation: `Query sum(arr[${l}..${r}]) = ${result}` });
    return steps;
}

// ─── Segment Tree SVG ─────────────────────────────────────────────────────────
// For up to 8-element array, we render nodes 1..15 in a 4-level tree

function getTreeLayout(n) {
    // Returns positions for nodes 1..(2n-1) in a balanced binary tree
    const maxNodes = 2 * n - 1; // actually up to 4n for segment tree
    // We'll just show up to depth 4 (nodes 1..15)
    const positions = {};
    const svgW = 560;
    function pos(node, depth, leftX, rightX) {
        if (depth > 3 || node > 15) return;
        const x = (leftX + rightX) / 2;
        const y = depth * 80 + 44;
        positions[node] = { x, y };
        pos(2 * node, depth + 1, leftX, x);
        pos(2 * node + 1, depth + 1, x, rightX);
    }
    pos(1, 0, 0, svgW);
    return positions;
}

function SegTreeSVG({ tree, highlight, queryPath, current, range }) {
    const positions = getTreeLayout(8);
    const edges = [];
    for (let i = 1; i <= 7; i++) {
        if (positions[2 * i]) edges.push({ from: i, to: 2 * i });
        if (positions[2 * i + 1]) edges.push({ from: i, to: 2 * i + 1 });
    }

    function nodeFill(idx) {
        if (queryPath?.includes(idx)) return '#22c55e';
        if (idx === current) return '#fbbf24';
        if (highlight?.includes(idx)) return '#6366f1';
        if (tree[idx] !== null && tree[idx] !== undefined) return '#1e3a5f';
        return '#1e293b';
    }

    return (
        <svg viewBox="0 0 560 380" width="100%" className="overflow-visible">
            {edges.map((e, i) => {
                const p1 = positions[e.from]; const p2 = positions[e.to];
                if (!p1 || !p2) return null;
                return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#334155" strokeWidth="1.5" />;
            })}
            {Object.entries(positions).map(([idx, { x, y }]) => {
                const i = +idx;
                const val = tree[i];
                const isActive = i === current;
                const fill = nodeFill(i);
                return (
                    <g key={idx} transform={`translate(${x},${y})`}>
                        <circle r={isActive ? 22 : 20} fill={fill} stroke={isActive ? '#fde68a' : '#475569'} strokeWidth={isActive ? 2 : 1.5}
                            style={{ transition: 'fill 0.35s ease' }} />
                        <text textAnchor="middle" dominantBaseline="middle" fontSize={Math.abs(val) > 99 ? '9' : '12'} fontWeight="700"
                            fill={fill === '#1e293b' ? '#475569' : fill === '#1e3a5f' ? '#94a3b8' : '#0f172a'}>
                            {val !== null && val !== undefined ? val : '?'}
                        </text>
                        <text textAnchor="middle" fontSize="8" fill="#64748b" y="30">{i}</text>
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
const QUIZ = [
    { question: 'What is the time complexity of a range-sum query on a segment tree?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'], correct: 2, explanation: 'At each level the query visits at most 2 nodes, and there are O(log n) levels → O(log n) total.' },
    { question: 'How many nodes does a segment tree need for an n-element array?', options: ['n', '2n', 'Up to 4n', 'n²'], correct: 2, explanation: 'The tree needs at most 4n space in the array representation. A perfect binary tree with n leaves needs 2n-1 nodes, but segment trees need extra for safety.' },
    { question: 'What is the time complexity of a point update?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], correct: 1, explanation: 'A point update follows the path from leaf to root, updating O(log n) ancestors.' },
];

function QuizPanel({ qs, setQs }) {
    if (qs.complete) return (
        <div className="text-center py-4">
            <p className="text-white font-bold mb-1">{qs.score}/{QUIZ.length}</p>
            <button onClick={() => setQs({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 bg-lime-600 text-white rounded-lg text-sm">Retry</button>
        </div>
    );
    const q = QUIZ[qs.current];
    return (
        <div className="space-y-3">
            <p className="text-slate-200 text-sm font-medium">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ';
                    if (!qs.answered) cls += 'border-slate-600 text-slate-300 hover:border-lime-500 hover:text-lime-300';
                    else if (i === q.correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                    else if (i === qs.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                    else cls += 'border-slate-700 text-slate-500';
                    return <button key={i} className={cls} onClick={() => { if (!qs.answered) { const ok = i === q.correct; setQs(s => ({ ...s, selected: i, answered: true, score: ok ? s.score + 1 : s.score })); } }}>{opt}</button>;
                })}
            </div>
            {qs.answered && <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-300">{q.explanation}</div>}
            {qs.answered && <button onClick={() => { if (qs.current + 1 >= QUIZ.length) setQs(s => ({ ...s, complete: true })); else setQs(s => ({ ...s, current: s.current + 1, selected: null, answered: false })); }} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs">{qs.current + 1 >= QUIZ.length ? 'See results' : 'Next →'}</button>}
            <p className="text-slate-500 text-xs text-right">{qs.current + 1}/{QUIZ.length}</p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DEFAULT_ARR = [2, 1, 5, 3, 4, 8, 6, 7];
const ARR_PRESETS = [[2,1,5,3,4,8,6,7],[1,3,5,7,9,11,13,15],[8,7,6,5,4,3,2,1],[1,-2,3,-4,5,-6,7,-8]];

export default function SegmentTreePage() {
    const [arr, setArr] = useState(DEFAULT_ARR);
    const [arrPresetIdx, setArrPresetIdx] = useState(0);
    const [mode, setMode] = useState('build'); // 'build' | 'query'
    const [queryL, setQueryL] = useState(1);
    const [queryR, setQueryR] = useState(4);
    const [builtTree, setBuiltTree] = useState(null);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [qs, setQs] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        if (mode === 'build') {
            const { steps, finalTree } = genBuildSteps(arr);
            setStepHistory(steps);
            setBuiltTree(finalTree);
            setCurrentStep(0);
            setIsPlaying(false);
        } else {
            if (!builtTree) return;
            const steps = genQuerySteps(builtTree, arr, queryL, queryR);
            setStepHistory(steps);
            setCurrentStep(0);
            setIsPlaying(false);
        }
    }, [arr, mode, queryL, queryR, builtTree]);

    // Build first, then allow query
    useEffect(() => {
        const { steps, finalTree } = genBuildSteps(arr);
        setBuiltTree(finalTree);
    }, [arr]);

    useEffect(() => {
        if (!isPlaying || !stepHistory.length) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const cur = stepHistory[currentStep] ?? { tree: builtTree ?? new Array(32).fill(null), highlight: [], queryPath: [], current: null, range: null, phase: 'start', explanation: '' };

    function handleShuffle() {
        const next = ARR_PRESETS[(arrPresetIdx + 1) % ARR_PRESETS.length];
        setArrPresetIdx(i => (i + 1) % ARR_PRESETS.length);
        setArr(next);
        setMode('build');
    }

    const phaseAccent = cur.phase === 'result' || cur.phase === 'in' ? 'lime' : cur.phase === 'out' ? 'red' : 'yellow';

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-600 to-green-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/trees" className="flex items-center text-white hover:text-lime-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Trees
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Layers className="h-10 w-10" />Segment Tree
                        </h1>
                        <p className="text-xl text-lime-100 mb-6 max-w-3xl mx-auto">
                            Divide-and-conquer tree that answers range-sum queries and point updates in O(log n).
                            Each internal node stores the aggregate of its segment.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Build: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Query: O(log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Update: O(log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Advanced</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Controls */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3">
                            {/* Array display */}
                            <div>
                                <p className="text-slate-400 text-xs mb-2">Array (index 0-based):</p>
                                <div className="flex gap-1.5">
                                    {arr.map((v, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border transition-colors ${mode === 'query' && i >= queryL && i <= queryR ? 'bg-lime-600/30 border-lime-500 text-lime-300' : 'bg-slate-800 border-slate-600 text-slate-200'}`}>{v}</div>
                                            <span className="text-[10px] text-slate-500">{i}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Mode toggle */}
                            <div className="flex gap-2 flex-wrap items-center">
                                <div className="flex rounded-lg border border-slate-700 overflow-hidden text-sm">
                                    {['build', 'query'].map(m => (
                                        <button key={m} onClick={() => setMode(m)}
                                            className={`px-4 py-1.5 capitalize font-medium transition-colors ${mode === m ? 'bg-lime-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                            {m}
                                        </button>
                                    ))}
                                </div>
                                {mode === 'query' && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-400">Range:</span>
                                        <input type="number" value={queryL} min="0" max={arr.length - 1} onChange={e => setQueryL(Math.max(0, Math.min(+e.target.value, queryR)))}
                                            className="w-14 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-center text-sm focus:outline-none focus:border-lime-500" />
                                        <span className="text-slate-500">to</span>
                                        <input type="number" value={queryR} min={queryL} max={arr.length - 1} onChange={e => setQueryR(Math.max(queryL, Math.min(+e.target.value, arr.length - 1)))}
                                            className="w-14 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-center text-sm focus:outline-none focus:border-lime-500" />
                                    </div>
                                )}
                                <button onClick={handleShuffle} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 ml-auto"><Shuffle className="h-4 w-4" /></button>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setCurrentStep(0)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"><SkipBack className="h-3 w-3" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} className="p-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"><SkipForward className="h-3 w-3" /></button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"><RotateCcw className="h-4 w-4" /></button>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500">Fast</span>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(+e.target.value)} className="flex-1 accent-lime-500" />
                                <span className="text-xs text-slate-500">Slow</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                    <div className="bg-lime-500 h-1.5 rounded-full transition-all"
                                        style={{ width: `${stepHistory.length > 1 ? (currentStep / (stepHistory.length - 1)) * 100 : 0}%` }} />
                                </div>
                                <span className="text-xs text-slate-500">{currentStep + 1}/{stepHistory.length}</span>
                            </div>
                        </div>

                        {/* Tree SVG */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 overflow-x-auto">
                            <p className="text-slate-500 text-xs mb-2">Node index shown below each circle. tree[1] = sum of entire array.</p>
                            <SegTreeSVG tree={cur.tree ?? builtTree ?? new Array(32).fill(null)} highlight={cur.highlight ?? []} queryPath={cur.queryPath ?? []} current={cur.current} range={cur.range} />
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                            {[['bg-slate-800 border border-slate-600', 'Empty / default'], ['bg-blue-900', 'Filled'], ['bg-indigo-600', 'Active path'], ['bg-yellow-400', 'Currently visiting'], ['bg-green-500', 'Included in query result']].map(([c, l]) => (
                                <span key={l} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded-full ${c}`} />{l}</span>
                            ))}
                        </div>

                        <div className={`bg-${phaseAccent}-500/10 border border-${phaseAccent}-500/20 rounded-lg p-4`}>
                            <div className="flex items-start gap-2">
                                <Info className={`h-4 w-4 text-${phaseAccent}-400 mt-0.5 flex-shrink-0`} />
                                <p className={`text-${phaseAccent}-300 text-sm leading-relaxed`}>{cur.explanation}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <h3 className="text-white font-semibold text-sm mb-3">Build & Query</h3>
                            <CodeBlock language="python" code={`def build(node, start, end):
    if start == end:
        tree[node] = arr[start]; return
    mid = (start + end) // 2
    build(2*node, start, mid)
    build(2*node+1, mid+1, end)
    tree[node] = tree[2*node] + tree[2*node+1]

def query(node, start, end, l, r):
    if r < start or end < l:
        return 0        # outside range
    if l <= start and end <= r:
        return tree[node] # fully inside
    mid = (start + end) // 2
    return (query(2*node, start, mid, l, r)
          + query(2*node+1, mid+1, end, l, r))`} />
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <h3 className="text-white font-semibold text-sm mb-4">Quick Check</h3>
                            <QuizPanel qs={qs} setQs={setQs} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
