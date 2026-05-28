"use client";
import { useState, useEffect, useCallback } from 'react';
import { SkipBack, SkipForward, Play, Pause, RotateCcw, Shuffle, Info } from 'lucide-react';

// ─── Step generation ──────────────────────────────────────────────────────────

function buildTree(arr, lo, hi, idCounter) {
    const id = idCounter.n++;
    const node = { id, lo, hi, arr: arr.slice(lo, hi + 1), left: null, right: null, phase: 'split' };
    if (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        node.left = buildTree(arr, lo, mid, idCounter);
        node.right = buildTree(arr, mid + 1, hi, idCounter);
    }
    return node;
}

function generateSteps(arr) {
    const steps = [];
    const n = arr.length;

    // Build the full recursion tree structure first
    const idCounter = { n: 0 };
    const root = buildTree(arr, 0, n - 1, idCounter);

    // Sorted results per node (filled during merge phase)
    const sortedMap = {};

    function splitSteps(node) {
        steps.push({
            phase: 'split',
            activeId: node.id,
            sortedMap: { ...sortedMap },
            explanation: node.lo === node.hi
                ? `Base case: [${node.arr[0]}] is already sorted (single element).`
                : `Splitting [${node.arr.join(', ')}] → left half [${node.arr.slice(0, Math.floor(node.arr.length / 2)).join(', ')}] and right half [${node.arr.slice(Math.floor(node.arr.length / 2)).join(', ')}].`,
        });

        if (node.lo < node.hi) {
            splitSteps(node.left);
            splitSteps(node.right);
            mergeSteps(node);
        } else {
            sortedMap[node.id] = [...node.arr];
        }
    }

    function mergeSteps(node) {
        const left = sortedMap[node.left.id];
        const right = sortedMap[node.right.id];
        const merged = [];
        let i = 0, j = 0;
        while (i < left.length && j < right.length) {
            if (left[i] <= right[j]) merged.push(left[i++]);
            else merged.push(right[j++]);
        }
        while (i < left.length) merged.push(left[i++]);
        while (j < right.length) merged.push(right[j++]);
        sortedMap[node.id] = merged;

        steps.push({
            phase: 'merge',
            activeId: node.id,
            sortedMap: { ...sortedMap },
            explanation: `Merging [${left.join(', ')}] and [${right.join(', ')}] → [${merged.join(', ')}].`,
        });
    }

    steps.push({
        phase: 'split',
        activeId: root.id,
        sortedMap: {},
        explanation: `Starting merge sort on [${arr.join(', ')}]. We'll recursively split until single elements, then merge back in sorted order.`,
    });

    splitSteps(root);

    steps.push({
        phase: 'done',
        activeId: root.id,
        sortedMap: { ...sortedMap },
        explanation: `Done! Array sorted: [${sortedMap[root.id].join(', ')}].`,
    });

    return { steps, root };
}

// ─── Tree layout ──────────────────────────────────────────────────────────────

const NODE_W = 64;
const NODE_H = 36;
const X_GAP = 16;
const Y_GAP = 72;

function layoutTree(node, depth = 0, counter = { n: 0 }) {
    if (!node) return { pos: {}, edges: [], width: 0 };

    const left = layoutTree(node.left, depth + 1, counter);
    const x = counter.n * (NODE_W + X_GAP) + (NODE_W + X_GAP) / 2;
    const y = depth * Y_GAP + 40;
    counter.n++;
    const right = layoutTree(node.right, depth + 1, counter);

    const pos = { ...left.pos, ...right.pos, [node.id]: { x, y } };
    const edges = [...left.edges, ...right.edges];

    if (node.left) edges.push({ from: node.id, to: node.left.id });
    if (node.right) edges.push({ from: node.id, to: node.right.id });

    return { pos, edges };
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const quizQuestions = [
    {
        question: 'What is the time complexity of merge sort?',
        options: ['O(n²)', 'O(n log n)', 'O(log n)', 'O(n)'],
        correct: 1,
        explanation: 'Merge sort splits the array O(log n) times and does O(n) work at each level, giving O(n log n) total.',
    },
    {
        question: 'Why does merge sort need O(n) extra space?',
        options: [
            'For the recursion call stack',
            'To store the sorted output before copying back',
            'To hold temporary arrays during merging',
            'Both B and C — the merge step requires an auxiliary buffer',
        ],
        correct: 3,
        explanation: 'The merge step cannot be done in-place efficiently; it needs an auxiliary buffer of size O(n) to hold elements being merged.',
    },
    {
        question: 'How many levels does the recursion tree have for an array of size n?',
        options: ['n', 'n/2', 'log₂(n)', 'n²'],
        correct: 2,
        explanation: 'Each level halves the subarray size, so after log₂(n) splits every subarray has exactly 1 element — giving log₂(n) + 1 levels.',
    },
];

function QuizPanel({ qs, setQs }) {
    if (qs.complete) return (
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 text-center">
            <p className="text-2xl font-bold text-sky-400 mb-1">{qs.score}/{quizQuestions.length}</p>
            <p className="text-slate-400 text-sm mb-4">{qs.score === quizQuestions.length ? 'Perfect score!' : 'Keep practicing!'}</p>
            <button onClick={() => setQs({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg transition-colors">
                Retake Quiz
            </button>
        </div>
    );

    const q = quizQuestions[qs.current];
    return (
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Active Recall</span>
                <span className="text-xs text-slate-500">{qs.current + 1}/{quizQuestions.length}</span>
            </div>
            <p className="text-slate-200 text-sm font-medium leading-snug">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ';
                    if (!qs.answered) cls += 'border-slate-600 text-slate-300 hover:border-sky-500 hover:text-sky-300 cursor-pointer';
                    else if (i === q.correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                    else if (i === qs.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                    else cls += 'border-slate-700 text-slate-500';
                    return (
                        <button key={i} className={cls} onClick={() => {
                            if (qs.answered) return;
                            setQs(s => ({ ...s, selected: i, answered: true, score: i === q.correct ? s.score + 1 : s.score }));
                        }}>{opt}</button>
                    );
                })}
            </div>
            {qs.answered && (
                <div className="text-xs text-slate-400 bg-slate-700/40 rounded-lg p-3 leading-relaxed">{q.explanation}</div>
            )}
            {qs.answered && (
                <button onClick={() => {
                    if (qs.current + 1 >= quizQuestions.length) setQs(s => ({ ...s, complete: true }));
                    else setQs(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
                }} className="w-full text-xs bg-sky-600 hover:bg-sky-500 text-white py-2 rounded-lg transition-colors">
                    {qs.current + 1 >= quizQuestions.length ? 'See Results' : 'Next Question'}
                </button>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PRESETS = [
    [38, 27, 43, 3, 9, 82, 10],
    [5, 2, 8, 1, 9, 3],
    [64, 34, 25, 12, 22, 11, 90],
    [4, 7, 2, 9, 1, 5],
    [15, 3, 11, 8, 20, 2, 6, 14],
];

function randomArr() {
    const n = 5 + Math.floor(Math.random() * 4);
    const s = new Set();
    while (s.size < n) s.add(1 + Math.floor(Math.random() * 99));
    return [...s];
}

export default function MergeSortPage() {
    const [arr, setArr] = useState(PRESETS[0]);
    const [stepHistory, setStepHistory] = useState([]);
    const [root, setRoot] = useState(null);
    const [layout, setLayout] = useState({ pos: {}, edges: [] });
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const reset = useCallback((a) => {
        const { steps, root: r } = generateSteps(a);
        const lay = layoutTree(r);
        setRoot(r);
        setLayout(lay);
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    }, []);

    useEffect(() => { reset(arr); }, [arr, reset]);

    // Animation
    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const step = stepHistory[currentStep] || {};
    const { pos, edges } = layout;

    // ─── SVG dimensions
    const nodeIds = root ? Object.keys(pos) : [];
    const maxX = nodeIds.length ? Math.max(...nodeIds.map(id => pos[id].x)) + NODE_W / 2 + 20 : 600;
    const maxY = nodeIds.length ? Math.max(...nodeIds.map(id => pos[id].y)) + NODE_H / 2 + 20 : 300;

    function nodeColor(node) {
        if (!step.activeId && step.activeId !== 0) return 'bg-slate-700';
        if (node.id === step.activeId) {
            return step.phase === 'merge' ? 'bg-green-500 border-green-400' : 'bg-yellow-400 border-yellow-300 text-slate-900';
        }
        if (step.sortedMap && step.sortedMap[node.id] !== undefined) return 'bg-sky-700 border-sky-600';
        return 'bg-slate-700 border-slate-600';
    }

    function nodeTextColor(node) {
        if (node.id === step.activeId && step.phase !== 'merge') return 'text-slate-900';
        return 'text-white';
    }

    function renderNode(node) {
        if (!node || !pos[node.id]) return null;
        const { x, y } = pos[node.id];
        const sorted = step.sortedMap && step.sortedMap[node.id];
        const isActive = node.id === step.activeId;
        let fill = '#334155'; // slate-700
        let stroke = '#475569'; // slate-600
        let textFill = '#f1f5f9';
        if (isActive && step.phase === 'split') { fill = '#facc15'; stroke = '#fde047'; textFill = '#0f172a'; }
        else if (isActive && step.phase === 'merge') { fill = '#22c55e'; stroke = '#4ade80'; textFill = '#fff'; }
        else if (isActive && step.phase === 'done') { fill = '#22c55e'; stroke = '#4ade80'; textFill = '#fff'; }
        else if (sorted) { fill = '#0369a1'; stroke = '#0284c7'; textFill = '#e0f2fe'; }

        const displayArr = sorted || node.arr;
        const label = displayArr.slice(0, 5).join(',') + (displayArr.length > 5 ? '…' : '');
        const w = Math.max(NODE_W, label.length * 7 + 20);

        return (
            <g key={node.id}>
                <rect x={x - w / 2} y={y - NODE_H / 2} width={w} height={NODE_H}
                    rx="6" fill={fill} stroke={stroke} strokeWidth="1.5"
                    style={{ transition: 'fill 0.3s, stroke 0.3s' }} />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize="11" fontWeight="600" fill={textFill} style={{ transition: 'fill 0.3s', pointerEvents: 'none' }}>
                    {label}
                </text>
                {renderNode(node.left)}
                {renderNode(node.right)}
            </g>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 py-10 px-4">
                <div className="max-w-6xl mx-auto">
                    <p className="text-sky-200 text-sm font-semibold uppercase tracking-widest mb-1">Divide &amp; Conquer</p>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Merge Sort — Recursion Tree</h1>
                    <p className="text-sky-100 text-base max-w-2xl">
                        Watch the array split recursively into halves all the way to single elements, then see sorted subarrays merge back up level by level.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Controls */}
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentStep(0)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors" title="Reset"><RotateCcw className="h-4 w-4" /></button>
                        <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipBack className="h-4 w-4" /></button>
                        <button onClick={() => setIsPlaying(p => !p)} className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 transition-colors">
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={currentStep >= stepHistory.length - 1} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipForward className="h-4 w-4" /></button>
                        <button onClick={() => setArr(randomArr())} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors" title="New random array"><Shuffle className="h-4 w-4" /></button>
                    </div>

                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <span className="text-xs text-slate-400 whitespace-nowrap">Speed</span>
                        <input type="range" min="200" max="2000" value={speed}
                            onChange={e => setSpeed(Number(e.target.value))}
                            className="flex-1 accent-sky-500" />
                        <span className="text-xs text-slate-400 whitespace-nowrap">{speed > 1500 ? 'Slow' : speed > 700 ? 'Med' : 'Fast'}</span>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {PRESETS.map((p, i) => (
                            <button key={i} onClick={() => setArr(p)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${JSON.stringify(arr) === JSON.stringify(p) ? 'border-sky-500 bg-sky-500/20 text-sky-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                                [{p.slice(0, 4).join(',')}…]
                            </button>
                        ))}
                    </div>

                    <span className="text-xs text-slate-500 ml-auto">Step {currentStep + 1} / {stepHistory.length}</span>
                </div>

                {/* Tree + sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recursion tree */}
                    <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5 overflow-auto">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Recursion Tree</h2>
                        <svg viewBox={`0 0 ${maxX} ${maxY}`} width="100%" style={{ minHeight: 220 }}>
                            {/* Edges */}
                            {edges.map(({ from, to }) => {
                                if (!pos[from] || !pos[to]) return null;
                                const pf = pos[from], pt = pos[to];
                                return (
                                    <line key={`${from}-${to}`}
                                        x1={pf.x} y1={pf.y + NODE_H / 2}
                                        x2={pt.x} y2={pt.y - NODE_H / 2}
                                        stroke="#334155" strokeWidth="1.5" />
                                );
                            })}
                            {/* Nodes */}
                            {root && renderNode(root)}
                        </svg>
                        {/* Legend */}
                        <div className="flex gap-4 mt-3 flex-wrap">
                            {[
                                { color: 'bg-yellow-400', label: 'Splitting' },
                                { color: 'bg-green-500', label: 'Merging' },
                                { color: 'bg-sky-700', label: 'Sorted' },
                                { color: 'bg-slate-700', label: 'Pending' },
                            ].map(({ color, label }) => (
                                <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <div className={`w-3 h-3 rounded-sm ${color}`} />
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Explanation */}
                        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sky-300 text-sm leading-relaxed">{step.explanation || '…'}</p>
                            </div>
                        </div>

                        {/* Phase badge */}
                        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Current Phase</p>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${step.phase === 'split' ? 'bg-yellow-500/20 text-yellow-300' : step.phase === 'merge' ? 'bg-green-500/20 text-green-300' : 'bg-sky-500/20 text-sky-300'}`}>
                                {step.phase === 'split' ? 'Divide' : step.phase === 'merge' ? 'Merge' : 'Complete'}
                            </span>
                            <div className="mt-3 space-y-1 text-xs text-slate-400">
                                <div className="flex justify-between">
                                    <span>Array size</span><span className="text-slate-300">{arr.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tree depth</span><span className="text-slate-300">{Math.ceil(Math.log2(arr.length + 1))}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total steps</span><span className="text-slate-300">{stepHistory.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quiz */}
                        <QuizPanel qs={quizState} setQs={setQuizState} />
                    </div>
                </div>
            </div>
        </div>
    );
}
