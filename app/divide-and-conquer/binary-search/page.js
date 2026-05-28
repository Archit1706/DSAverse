"use client";
import { useState, useEffect, useCallback } from 'react';
import { SkipBack, SkipForward, Play, Pause, RotateCcw, Shuffle, Info, Search } from 'lucide-react';

// ─── Step generation ──────────────────────────────────────────────────────────

function generateSteps(sortedArr, target) {
    const steps = [];
    const n = sortedArr.length;
    let lo = 0, hi = n - 1;

    steps.push({
        lo, hi, mid: null, compareIdx: null, result: null,
        explanation: `Searching for ${target} in [${sortedArr.join(', ')}]. Starting with lo=0, hi=${n - 1}.`,
    });

    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const val = sortedArr[mid];

        steps.push({
            lo, hi, mid, compareIdx: mid, result: null,
            explanation: `lo=${lo}, hi=${hi} → mid=${mid}, arr[${mid}]=${val}. Comparing ${val} with target ${target}.`,
        });

        if (val === target) {
            steps.push({
                lo, hi, mid, compareIdx: mid, result: 'found',
                explanation: `Found! arr[${mid}] = ${val} = target ${target}. Binary search complete in ${steps.length} steps.`,
            });
            return steps;
        } else if (val < target) {
            steps.push({
                lo, hi, mid, compareIdx: mid, result: 'go-right',
                explanation: `arr[${mid}]=${val} < target ${target}. Move right: lo = mid+1 = ${mid + 1}.`,
            });
            lo = mid + 1;
        } else {
            steps.push({
                lo, hi, mid, compareIdx: mid, result: 'go-left',
                explanation: `arr[${mid}]=${val} > target ${target}. Move left: hi = mid−1 = ${mid - 1}.`,
            });
            hi = mid - 1;
        }
    }

    steps.push({
        lo, hi, mid: null, compareIdx: null, result: 'not-found',
        explanation: `lo=${lo} > hi=${hi}. Search space exhausted — ${target} is not in the array.`,
    });
    return steps;
}

// ─── Decision tree builder ────────────────────────────────────────────────────
// Build a balanced BST structure from the sorted array for display purposes.

function buildDecisionTree(arr, lo, hi, idCounter) {
    if (lo > hi) return null;
    const mid = Math.floor((lo + hi) / 2);
    const id = idCounter.n++;
    return {
        id,
        lo, hi, mid,
        val: arr[mid],
        left: buildDecisionTree(arr, lo, mid - 1, idCounter),
        right: buildDecisionTree(arr, mid + 1, hi, idCounter),
    };
}

const NODE_W = 56;
const NODE_H = 36;
const X_GAP = 12;
const Y_GAP = 70;

function layoutTree(node, depth = 0, counter = { n: 0 }) {
    if (!node) return { pos: {}, edges: [] };
    const left = layoutTree(node.left, depth + 1, counter);
    const x = counter.n * (NODE_W + X_GAP) + (NODE_W + X_GAP) / 2;
    const y = depth * Y_GAP + 40;
    counter.n++;
    const right = layoutTree(node.right, depth + 1, counter);
    const pos = { ...left.pos, ...right.pos, [node.id]: { x, y, node } };
    const edges = [...left.edges, ...right.edges];
    if (node.left) edges.push({ from: node.id, to: node.left.id, label: '<' });
    if (node.right) edges.push({ from: node.id, to: node.right.id, label: '>' });
    return { pos, edges };
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const quizQuestions = [
    {
        question: 'What is the time complexity of binary search?',
        options: ['O(n)', 'O(n²)', 'O(log n)', 'O(n log n)'],
        correct: 2,
        explanation: 'Binary search halves the search space at each step. Starting from n, after k steps the space is n/2^k. When n/2^k = 1, k = log₂(n).',
    },
    {
        question: 'What precondition must the array satisfy for binary search to work?',
        options: ['It must have an even number of elements', 'It must be sorted', 'Elements must be unique', 'It must be stored in a hash table'],
        correct: 1,
        explanation: 'Binary search relies on the sorted order to decide which half to eliminate. On an unsorted array it can miss the target entirely.',
    },
    {
        question: 'In the worst case, how many comparisons does binary search make on an array of 16 elements?',
        options: ['4', '5', '8', '16'],
        correct: 1,
        explanation: 'log₂(16) = 4 splits, but you need one final comparison to confirm found or not-found — so 5 comparisons in the worst case.',
    },
];

function QuizPanel({ qs, setQs }) {
    if (qs.complete) return (
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 text-center">
            <p className="text-2xl font-bold text-sky-400 mb-1">{qs.score}/{quizQuestions.length}</p>
            <p className="text-slate-400 text-sm mb-4">{qs.score === quizQuestions.length ? 'Perfect score!' : 'Keep practicing!'}</p>
            <button onClick={() => setQs({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg transition-colors">Retake Quiz</button>
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
                    return <button key={i} className={cls} onClick={() => {
                        if (qs.answered) return;
                        setQs(s => ({ ...s, selected: i, answered: true, score: i === q.correct ? s.score + 1 : s.score }));
                    }}>{opt}</button>;
                })}
            </div>
            {qs.answered && <div className="text-xs text-slate-400 bg-slate-700/40 rounded-lg p-3 leading-relaxed">{q.explanation}</div>}
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

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
    { arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 },
    { arr: [1, 3, 5, 7, 9, 11, 13], target: 7 },
    { arr: [4, 8, 15, 16, 23, 42], target: 15 },
    { arr: [10, 20, 30, 40, 50, 60, 70, 80], target: 55 },
];

function randomPreset() {
    const n = 6 + Math.floor(Math.random() * 5);
    const s = new Set();
    while (s.size < n) s.add(1 + Math.floor(Math.random() * 99));
    const arr = [...s].sort((a, b) => a - b);
    const target = Math.random() < 0.6 ? arr[Math.floor(Math.random() * arr.length)] : 1 + Math.floor(Math.random() * 99);
    return { arr, target };
}

export default function BinarySearchPage() {
    const [preset, setPreset] = useState(PRESETS[0]);
    const [targetInput, setTargetInput] = useState(String(PRESETS[0].target));
    const [stepHistory, setStepHistory] = useState([]);
    const [dtRoot, setDtRoot] = useState(null);
    const [layout, setLayout] = useState({ pos: {}, edges: [] });
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const rebuild = useCallback((p, tgt) => {
        const t = Number(tgt);
        const steps = generateSteps(p.arr, isNaN(t) ? p.target : t);
        const idCounter = { n: 0 };
        const r = buildDecisionTree(p.arr, 0, p.arr.length - 1, idCounter);
        const lay = layoutTree(r);
        setDtRoot(r);
        setLayout(lay);
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    }, []);

    useEffect(() => { rebuild(preset, targetInput); }, [preset, targetInput, rebuild]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const step = stepHistory[currentStep] || {};
    const { pos, edges } = layout;
    const nodeIds = Object.keys(pos);
    const maxX = nodeIds.length ? Math.max(...nodeIds.map(id => pos[id].x)) + NODE_W / 2 + 20 : 500;
    const maxY = nodeIds.length ? Math.max(...nodeIds.map(id => pos[id].y)) + NODE_H / 2 + 20 : 300;

    // Which node ids are on the "visited path" up to current step
    const visitedMids = new Set(
        stepHistory.slice(0, currentStep + 1)
            .filter(s => s.mid !== null)
            .map(s => s.mid)
    );

    function getNodeFill(node) {
        if (step.compareIdx === node.mid && step.result === 'found') return { fill: '#22c55e', stroke: '#4ade80', text: '#fff' };
        if (step.compareIdx === node.mid && step.result === 'not-found') return { fill: '#ef4444', stroke: '#f87171', text: '#fff' };
        if (step.compareIdx === node.mid) return { fill: '#facc15', stroke: '#fde047', text: '#0f172a' };
        if (visitedMids.has(node.mid)) return { fill: '#0369a1', stroke: '#0284c7', text: '#e0f2fe' };
        if (step.lo !== undefined && step.hi !== undefined && node.mid >= step.lo && node.mid <= step.hi)
            return { fill: '#1e3a5f', stroke: '#1d4ed8', text: '#93c5fd' };
        return { fill: '#1e293b', stroke: '#334155', text: '#64748b' };
    }

    function renderTree(node) {
        if (!node || !pos[node.id]) return null;
        const { x, y } = pos[node.id];
        const c = getNodeFill(node);
        return (
            <g key={node.id}>
                <rect x={x - NODE_W / 2} y={y - NODE_H / 2} width={NODE_W} height={NODE_H}
                    rx="6" fill={c.fill} stroke={c.stroke} strokeWidth="1.5"
                    style={{ transition: 'fill 0.3s, stroke 0.3s' }} />
                <text x={x} y={y - 3} textAnchor="middle" dominantBaseline="middle"
                    fontSize="12" fontWeight="700" fill={c.text} style={{ pointerEvents: 'none' }}>
                    {node.val}
                </text>
                <text x={x} y={y + 10} textAnchor="middle" dominantBaseline="middle"
                    fontSize="8" fill={c.text} opacity="0.7" style={{ pointerEvents: 'none' }}>
                    idx {node.mid}
                </text>
                {renderTree(node.left)}
                {renderTree(node.right)}
            </g>
        );
    }

    const tgt = Number(targetInput);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 py-10 px-4">
                <div className="max-w-6xl mx-auto">
                    <p className="text-sky-200 text-sm font-semibold uppercase tracking-widest mb-1">Divide &amp; Conquer</p>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Binary Search — Decision Tree</h1>
                    <p className="text-sky-100 text-base max-w-2xl">
                        Each comparison is a node in the decision tree — go left if target is smaller, right if larger. Eliminated branches fade out.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Controls */}
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentStep(0)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"><RotateCcw className="h-4 w-4" /></button>
                        <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipBack className="h-4 w-4" /></button>
                        <button onClick={() => setIsPlaying(p => !p)} className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 transition-colors">
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={currentStep >= stepHistory.length - 1} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipForward className="h-4 w-4" /></button>
                        <button onClick={() => { const p = randomPreset(); setPreset(p); setTargetInput(String(p.target)); }} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"><Shuffle className="h-4 w-4" /></button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)}
                            className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none"
                            placeholder="Target" />
                        <span className="text-xs text-slate-500">({!isNaN(tgt) && preset.arr.includes(tgt) ? '✓ in array' : '✗ not in array'})</span>
                    </div>

                    <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                        <span className="text-xs text-slate-400">Speed</span>
                        <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-sky-500" />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {PRESETS.map((p, i) => (
                            <button key={i} onClick={() => { setPreset(p); setTargetInput(String(p.target)); }}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${JSON.stringify(preset) === JSON.stringify(p) ? 'border-sky-500 bg-sky-500/20 text-sky-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                                n={p.arr.length}, t={p.target}
                            </button>
                        ))}
                    </div>

                    <span className="text-xs text-slate-500">Step {currentStep + 1}/{stepHistory.length}</span>
                </div>

                {/* Main viz + sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Array row */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Sorted Array</h2>
                            <div className="flex gap-2 flex-wrap">
                                {preset.arr.map((v, i) => {
                                    let cls = 'flex flex-col items-center gap-0.5 ';
                                    let boxCls = 'w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-bold transition-all duration-300 ';
                                    if (step.compareIdx === i && step.result === 'found') boxCls += 'bg-green-500 border-green-400 text-white scale-110';
                                    else if (step.compareIdx === i) boxCls += 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
                                    else if (step.lo !== undefined && step.hi !== undefined && i >= step.lo && i <= step.hi) boxCls += 'bg-sky-800/50 border-sky-700 text-sky-200';
                                    else if (step.lo !== undefined && (i < step.lo || i > step.hi)) boxCls += 'bg-slate-800 border-slate-700 text-slate-600';
                                    else boxCls += 'bg-slate-700 border-slate-600 text-slate-100';
                                    return (
                                        <div key={i} className={cls}>
                                            <div className={boxCls}>{v}</div>
                                            <span className="text-[9px] text-slate-600">{i}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {step.lo !== undefined && step.hi !== undefined && step.result !== 'found' && step.result !== 'not-found' && (
                                <div className="mt-2 text-xs text-slate-500">
                                    Active range: [{step.lo}..{step.hi}]
                                    {step.mid !== null && <span className="text-yellow-400 ml-2">mid={step.mid}</span>}
                                </div>
                            )}
                        </div>

                        {/* Decision tree */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5 overflow-auto">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Decision Tree</h2>
                            <svg viewBox={`0 0 ${maxX} ${maxY}`} width="100%" style={{ minHeight: 200 }}>
                                {edges.map(({ from, to, label }) => {
                                    if (!pos[from] || !pos[to]) return null;
                                    const pf = pos[from], pt = pos[to];
                                    const mx = (pf.x + pt.x) / 2, my = (pf.y + pt.y) / 2;
                                    return (
                                        <g key={`${from}-${to}`}>
                                            <line x1={pf.x} y1={pf.y + NODE_H / 2} x2={pt.x} y2={pt.y - NODE_H / 2}
                                                stroke="#334155" strokeWidth="1.5" />
                                            <text x={mx - 6} y={my} fontSize="9" fill="#64748b">{label}</text>
                                        </g>
                                    );
                                })}
                                {dtRoot && renderTree(dtRoot)}
                            </svg>
                            <div className="flex gap-4 mt-2 flex-wrap">
                                {[
                                    { color: 'bg-yellow-400', label: 'Comparing' },
                                    { color: 'bg-green-500', label: 'Found' },
                                    { color: 'bg-red-500', label: 'Not Found' },
                                    { color: 'bg-sky-800', label: 'Active range' },
                                    { color: 'bg-slate-800', label: 'Eliminated' },
                                ].map(({ color, label }) => (
                                    <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <div className={`w-3 h-3 rounded-sm ${color}`} /> {label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sky-300 text-sm leading-relaxed">{step.explanation || '…'}</p>
                            </div>
                        </div>

                        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Result</p>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${step.result === 'found' ? 'bg-green-500/20 text-green-300' : step.result === 'not-found' ? 'bg-red-500/20 text-red-300' : 'bg-sky-500/20 text-sky-300'}`}>
                                {step.result === 'found' ? `Found at index ${step.mid}` : step.result === 'not-found' ? 'Not found' : 'Searching…'}
                            </span>
                            <div className="mt-3 space-y-1 text-xs text-slate-400">
                                <div className="flex justify-between"><span>Array size</span><span className="text-slate-300">{preset.arr.length}</span></div>
                                <div className="flex justify-between"><span>Target</span><span className="text-slate-300">{targetInput}</span></div>
                                <div className="flex justify-between"><span>Comparisons</span><span className="text-slate-300">{stepHistory.filter(s => s.mid !== null).length}</span></div>
                                <div className="flex justify-between"><span>Max possible</span><span className="text-slate-300">{Math.ceil(Math.log2(preset.arr.length + 1))}</span></div>
                            </div>
                        </div>

                        <QuizPanel qs={quizState} setQs={setQuizState} />
                    </div>
                </div>
            </div>
        </div>
    );
}
