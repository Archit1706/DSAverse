'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ArrowLeft, Plus, Minus, Eye, SkipBack, SkipForward, Info, GitMerge, CheckCircle, XCircle, Code } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What makes skew heaps 'self-adjusting' and different from leftist heaps?",
        options: [
            "Skew heaps maintain null path length at every node",
            "Skew heaps unconditionally swap left and right children during every merge step",
            "Skew heaps use a separate balance counter per node",
            "Skew heaps only allow insertion, not extraction"
        ],
        correct: 1,
        explanation: "In skew heaps, after recursively merging the right subtree, the children are always unconditionally swapped — no condition checked, no npl stored. This simple rule provides amortized O(log n) performance without any bookkeeping."
    },
    {
        question: "What is the amortized time complexity of merging two skew heaps of sizes m and n?",
        options: ["O(1)", "O(m + n)", "O(log(m + n))", "O(m × n)"],
        correct: 2,
        explanation: "Merge runs in O(log(m+n)) amortized time. Individual operations can be O(n) worst case, but the unconditional swap self-balances the heap over a sequence of operations, giving the O(log n) amortized guarantee."
    },
    {
        question: "Skew heap differs from leftist heap in that skew heap:",
        options: [
            "Stores npl but conditionally skips the swap",
            "Requires no extra metadata per node and always swaps children",
            "Uses a rank field instead of npl",
            "Only works as a max-heap, not min-heap"
        ],
        correct: 1,
        explanation: "Skew heap stores no extra per-node metadata (no npl, no rank) and always swaps children after every merge step. Leftist heap stores npl and only swaps when npl(left) < npl(right). Skew is simpler to implement."
    }
];

export default function SkewHeapsPage() {
    const [heap, setHeap] = useState(null);
    const [heap2, setHeap2] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [mergeValue, setMergeValue] = useState('');
    const [idSeq, setIdSeq] = useState(1);
    const [totalSwaps, setTotalSwaps] = useState(0);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const clone = (n) => n ? JSON.parse(JSON.stringify(n)) : null;

    // Merge with step recording
    const mergeWithSteps = (h1, h2, steps) => {
        if (!h1) return h2;
        if (!h2) return h1;

        if (h1.value > h2.value) [h1, h2] = [h2, h1];

        steps.push({
            heap: clone(h1), heap2: clone(h2),
            highlightIds: [h1.id, h2.id],
            explanation: `Compare roots ${h1.value} and ${h2.value}. Keep ${h1.value} as root (smaller). Recursively merge ${h2.value}'s subtree with ${h1.value}'s right child.`,
            phase: 'compare',
            swapped: false
        });

        h1.right = mergeWithSteps(h2, h1.right, steps);

        steps.push({
            heap: clone(h1), heap2: null,
            highlightIds: [h1.id],
            explanation: `Right subtree of ${h1.value} is set. Now apply the SKEW operation: unconditionally swap left and right children of ${h1.value}.`,
            phase: 'pre-swap',
            swapped: false
        });

        [h1.left, h1.right] = [h1.right, h1.left];

        steps.push({
            heap: clone(h1), heap2: null,
            highlightIds: [h1.id],
            explanation: `SKEW: Swapped children of ${h1.value}. This self-adjusts the tree without any balance bookkeeping.`,
            phase: 'swap',
            swapped: true
        });

        return h1;
    };

    // Silent merge (no steps) for building second heap from CSV
    const silentMerge = (a, b) => {
        if (!a) return b;
        if (!b) return a;
        if (a.value > b.value) [a, b] = [b, a];
        a.right = silentMerge(b, a.right);
        [a.left, a.right] = [a.right, a.left];
        return a;
    };

    const generateSteps = (operation, value = null, mergeHeap = null) => {
        const steps = [];
        let h = clone(heap);

        if (operation === 'insert') {
            const node = { id: idSeq + Math.random(), value, left: null, right: null };
            if (!h) {
                h = node;
                steps.push({ heap: clone(h), heap2: null, highlightIds: [node.id], explanation: `First node inserted. Heap initialised with ${value}.`, phase: 'complete', swapped: false });
            } else {
                steps.push({ heap: clone(h), heap2: clone(node), highlightIds: [node.id], explanation: `Create node ${value} as a singleton heap. Begin merging with main heap.`, phase: 'prepare', swapped: false });
                h = mergeWithSteps(h, node, steps);
                steps.push({ heap: clone(h), heap2: null, highlightIds: [], explanation: `Insert complete. Node ${value} is now part of the heap.`, phase: 'complete', swapped: false });
            }

        } else if (operation === 'extractMin') {
            if (!h) {
                steps.push({ heap: null, heap2: null, highlightIds: [], explanation: 'Heap is empty — nothing to extract.', phase: 'error', swapped: false });
                return steps;
            }
            const minVal = h.value;
            steps.push({ heap: clone(h), heap2: null, highlightIds: [h.id], explanation: `Minimum is root ${minVal}. Remove it and merge its left and right subtrees.`, phase: 'identify', swapped: false });

            const left = h.left, right = h.right;
            if (!left && !right) {
                h = null;
                steps.push({ heap: null, heap2: null, highlightIds: [], explanation: `Removed ${minVal}. Heap is now empty.`, phase: 'complete', swapped: false });
            } else {
                if (left && right) {
                    steps.push({ heap: clone(left), heap2: clone(right), highlightIds: [], explanation: `Merge left subtree (root ${left.value}) with right subtree (root ${right.value}).`, phase: 'merging', swapped: false });
                }
                h = mergeWithSteps(left, right, steps);
                steps.push({ heap: clone(h), heap2: null, highlightIds: [], explanation: `Extract-min complete. Removed ${minVal}. Heap restructured via merge.`, phase: 'complete', swapped: false });
            }

        } else if (operation === 'merge') {
            if (!h && !mergeHeap) return steps;
            steps.push({ heap: clone(h), heap2: clone(mergeHeap), highlightIds: [], explanation: 'Merging two skew heaps by following their right spines and applying unconditional swaps.', phase: 'prepare', swapped: false });
            h = mergeWithSteps(h, mergeHeap, steps);
            steps.push({ heap: clone(h), heap2: null, highlightIds: [], explanation: 'Merge complete. All nodes combined into a single skew heap.', phase: 'complete', swapped: false });

        } else if (operation === 'findMin') {
            if (!h) {
                steps.push({ heap: null, heap2: null, highlightIds: [], explanation: 'Heap is empty.', phase: 'error', swapped: false });
            } else {
                steps.push({ heap: clone(h), heap2: null, highlightIds: [h.id], explanation: `Minimum value is ${h.value} (always at root). Find-min is O(1).`, phase: 'complete', swapped: false });
            }
        }

        return steps;
    };

    const runOperation = (op, val = null, mergeHeap = null) => {
        const steps = generateSteps(op, val, mergeHeap);
        if (!steps.length) return;
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(true);
    };

    useEffect(() => {
        if (!isPlaying || !stepHistory.length) return;
        if (currentStep >= stepHistory.length - 1) {
            const final = stepHistory[stepHistory.length - 1];
            setHeap(final.heap);
            setHeap2(final.heap2 ?? null);
            setIsPlaying(false);
            return;
        }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    useEffect(() => {
        setTotalSwaps(stepHistory.filter(s => s.swapped).length);
    }, [stepHistory]);

    const reset = () => { setHeap(null); setHeap2(null); setStepHistory([]); setCurrentStep(0); setIsPlaying(false); setTotalSwaps(0); };

    const handleInsert = () => {
        if (!inputValue || isNaN(inputValue)) return;
        setIdSeq(v => v + 1);
        runOperation('insert', parseInt(inputValue));
        setInputValue('');
    };

    const handleMerge = () => {
        if (!mergeValue.trim()) return;
        const vals = mergeValue.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
        if (!vals.length) return;

        let newHeap = null;
        vals.forEach(val => {
            const node = { id: idSeq + Math.random(), value: val, left: null, right: null };
            newHeap = silentMerge(newHeap, node);
        });
        setIdSeq(v => v + vals.length);
        runOperation('merge', null, newHeap);
        setMergeValue('');
    };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const currentState = stepHistory[currentStep] || {
        heap, heap2: null,
        highlightIds: [],
        explanation: 'Insert values to build the heap. Notice the unconditional child swap on every merge step.',
        phase: '',
        swapped: false
    };

    const countNodes = (n) => !n ? 0 : 1 + countNodes(n.left) + countNodes(n.right);
    const getHeight = (n) => !n ? 0 : 1 + Math.max(getHeight(n.left), getHeight(n.right));

    const drawSkewTree = (node, x, y, level, elems, isSecond = false) => {
        if (!node) return;
        const hSpacing = Math.max(180 / Math.pow(1.9, level), 26);
        const vSpacing = 66;
        const R = 20;
        const isHL = currentState.highlightIds.includes(node.id);
        const fill = isHL ? '#eab308' : isSecond ? '#ea580c' : '#b45309';
        const stroke = isHL ? '#ca8a04' : isSecond ? '#c2410c' : '#92400e';

        if (node.left) {
            const lx = x - hSpacing, ly = y + vSpacing;
            elems.push(<line key={`le-${node.id}`} x1={x} y1={y + R} x2={lx} y2={ly - R} stroke="#78350f" strokeWidth="1.5" />);
            drawSkewTree(node.left, lx, ly, level + 1, elems, isSecond);
        }
        if (node.right) {
            const rx = x + hSpacing, ry = y + vSpacing;
            elems.push(<line key={`re-${node.id}`} x1={x} y1={y + R} x2={rx} y2={ry - R} stroke="#78350f" strokeWidth="1.5" strokeDasharray="4,2" />);
            drawSkewTree(node.right, rx, ry, level + 1, elems, isSecond);
        }

        elems.push(
            <g key={`nd-${node.id}`}>
                <circle cx={x} cy={y} r={R} fill={fill} stroke={stroke} strokeWidth="2" />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#fef3c7">{node.value}</text>
            </g>
        );
    };

    const renderVisualization = () => {
        const h = currentState.heap;
        const h2 = currentState.heap2;

        if (!h && !h2) {
            return <div className="flex items-center justify-center h-44 text-slate-500 text-sm">Empty heap — insert values to begin</div>;
        }

        const svgW = 560;
        const svgH = 300;
        const elems = [];

        if (h && h2) {
            elems.push(<text key="la" x={140} y={22} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#d97706">Heap 1</text>);
            elems.push(<text key="lb" x={420} y={22} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ea580c">Heap 2</text>);
            elems.push(<line key="div" x1={280} y1={10} x2={280} y2={svgH - 10} stroke="#334155" strokeWidth="1" strokeDasharray="4,3" />);
            drawSkewTree(h, 140, 46, 0, elems, false);
            drawSkewTree(h2, 420, 46, 0, elems, true);
        } else if (h) {
            drawSkewTree(h, 280, 46, 0, elems, false);
        } else if (h2) {
            drawSkewTree(h2, 280, 46, 0, elems, true);
        }

        return (
            <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" className="block">
                {elems}
            </svg>
        );
    };

    const codeExample = `class SkewNode:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None
        # No extra fields needed! (unlike leftist heap's npl)

class SkewHeap:
    def __init__(self):
        self.root = None

    def merge(self, h1, h2):
        """
        Core operation — O(log n) amortized.
        Key: ALWAYS swap children after merging right subtree.
        """
        if h1 is None: return h2
        if h2 is None: return h1

        # Min-heap: keep smaller root on top
        if h1.value > h2.value:
            h1, h2 = h2, h1

        # Recursively merge h2 with h1's right child
        h1.right = self.merge(h2, h1.right)

        # SKEW: unconditionally swap left and right
        # This is the ONLY difference from leftist heaps!
        h1.left, h1.right = h1.right, h1.left

        return h1

    def insert(self, value):
        """O(log n) amortized"""
        node = SkewNode(value)
        self.root = self.merge(self.root, node)

    def find_min(self):
        """O(1)"""
        return self.root.value if self.root else None

    def extract_min(self):
        """O(log n) amortized"""
        if not self.root: return None
        min_val = self.root.value
        # Merge the two subtrees of the root
        self.root = self.merge(self.root.left, self.root.right)
        return min_val

    def merge_with(self, other):
        """O(log n) amortized"""
        self.root = self.merge(self.root, other.root)
        other.root = None  # other becomes empty

# Comparison: leftist vs skew
# Leftist: if npl(left) < npl(right): swap  ← conditional
# Skew:    always swap                        ← unconditional`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/heap-like-data-structures" className="inline-flex items-center text-amber-100 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Heap Data Structures
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Skew Heap</h1>
                        <p className="text-xl text-amber-100 max-w-3xl mx-auto">
                            A self-adjusting merge-based heap that unconditionally swaps children on every
                            merge step — no bookkeeping needed, yet O(log n) amortized performance is guaranteed.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* ── Left: Visualization ── */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-5">Heap Visualization</h2>
                            <p className="text-xs text-slate-400 mb-4">Watch the highlighted node swap its children (SKEW) after each recursive merge call.</p>

                            <div className="space-y-3 mb-5">
                                {/* Insert */}
                                <div className="flex flex-wrap gap-2">
                                    <input type="number" value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleInsert()}
                                        placeholder="Enter value"
                                        className="w-36 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500" />
                                    <button onClick={handleInsert} disabled={isPlaying}
                                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Plus className="h-4 w-4" /> Insert
                                    </button>
                                    <button onClick={() => runOperation('extractMin')} disabled={isPlaying || !heap}
                                        className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Minus className="h-4 w-4" /> Extract Min
                                    </button>
                                    <button onClick={() => runOperation('findMin')} disabled={isPlaying || !heap}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Eye className="h-4 w-4" /> Find Min
                                    </button>
                                </div>
                                {/* Merge */}
                                <div className="flex gap-2">
                                    <input type="text" value={mergeValue}
                                        onChange={e => setMergeValue(e.target.value)}
                                        placeholder="Values to merge (e.g. 5,12,3)"
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500" />
                                    <button onClick={handleMerge} disabled={isPlaying}
                                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <GitMerge className="h-4 w-4" /> Merge
                                    </button>
                                </div>
                                {/* Playback */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                        disabled={currentStep === 0 || isPlaying || !stepHistory.length}
                                        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200">
                                        <SkipBack className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setIsPlaying(v => !v)} disabled={!stepHistory.length}
                                        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                        {isPlaying ? 'Pause' : 'Play'}
                                    </button>
                                    <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))}
                                        disabled={currentStep >= stepHistory.length - 1 || isPlaying || !stepHistory.length}
                                        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200">
                                        <SkipForward className="h-4 w-4" />
                                    </button>
                                    <button onClick={reset} className="p-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-200">
                                        <RotateCcw className="h-4 w-4" />
                                    </button>
                                    <div className="flex items-center gap-2 ml-auto">
                                        <span className="text-xs text-slate-400">Speed</span>
                                        <input type="range" min={200} max={2000} step={100} value={2200 - speed}
                                            onChange={e => setSpeed(2200 - Number(e.target.value))}
                                            className="w-20 accent-amber-500" />
                                    </div>
                                </div>
                            </div>

                            {/* SVG Tree */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4">
                                {renderVisualization()}
                            </div>

                            {/* Swap highlight */}
                            {currentState.swapped && (
                                <div className="mb-4 px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg text-xs text-orange-300 font-semibold">
                                    SKEW applied — children swapped at highlighted node
                                </div>
                            )}

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[
                                    ['Nodes', countNodes(currentState.heap)],
                                    ['Height', getHeight(currentState.heap)],
                                    ['Swaps (op)', totalSwaps],
                                ].map(([label, val]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className="text-lg font-bold text-amber-400">{val}</div>
                                        <div className="text-xs text-slate-400">{label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-amber-300 text-sm leading-relaxed">{currentState.explanation}</p>
                                        {stepHistory.length > 0 && <p className="text-amber-600 text-xs mt-1.5">Step {currentStep + 1} of {stepHistory.length}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Info ── */}
                    <div className="space-y-5">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-4">Complexity (Amortized)</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[['Insert', 'O(log n)*'], ['Extract Min', 'O(log n)*'], ['Find Min', 'O(1)'], ['Merge', 'O(log n)*'], ['Space', 'O(n)'], ['Per-node data', 'None']].map(([op, c]) => (
                                    <div key={op} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className="text-base font-bold text-amber-400">{c}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">* amortized — worst case can be O(n)</p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">The Skewing Process</h2>
                            <ol className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-3 items-start">
                                    <span className="flex-shrink-0 w-5 h-5 bg-amber-500/20 text-amber-300 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                    <span>Compare roots — keep the smaller as new root (min-heap property)</span>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <span className="flex-shrink-0 w-5 h-5 bg-amber-500/20 text-amber-300 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                    <span>Recursively merge the larger root's subtree with the smaller root's right child</span>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <span className="flex-shrink-0 w-5 h-5 bg-orange-500/20 text-orange-300 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                    <span><strong className="text-orange-300">SKEW</strong> — unconditionally swap left and right children. Always. No condition checked.</span>
                                </li>
                            </ol>
                            <div className="mt-4 p-3 bg-slate-800/60 rounded-lg text-xs text-slate-400">
                                The unconditional swap distributes "heavy" nodes across the tree over time, ensuring the amortized O(log n) bound without storing any balance information.
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Skew vs Leftist Heap</h2>
                            <div className="space-y-2 text-sm">
                                {[
                                    ['Extra data per node', 'npl field', 'none', false],
                                    ['Swap condition', 'npl(left) < npl(right)', 'always swap', false],
                                    ['Complexity', 'O(log n) worst', 'O(log n) amortized', false],
                                    ['Implementation', 'slightly complex', 'very simple', true],
                                ].map(([prop, leftist, skew, skewWins]) => (
                                    <div key={prop} className="grid grid-cols-3 gap-2 items-start text-xs">
                                        <span className="text-slate-400 font-semibold pt-1">{prop}</span>
                                        <span className="bg-slate-800/60 rounded px-2 py-1 text-slate-300">{leftist}</span>
                                        <span className={`rounded px-2 py-1 ${skewWins ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-800/60 text-slate-300'}`}>{skew}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-4">Active Recall Quiz</h2>
                            {!quizState.complete ? (
                                <div>
                                    <p className="text-xs text-slate-400 mb-3">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((opt, idx) => (
                                            <button key={idx} onClick={() => handleQuizAnswer(idx)}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                                                    !quizState.answered
                                                        ? 'border-slate-600 bg-slate-800 hover:border-amber-500 hover:bg-amber-500/10 text-slate-200'
                                                        : idx === quizQuestions[quizState.current].correct
                                                            ? 'border-green-500 bg-green-500/10 text-green-300'
                                                            : idx === quizState.selected
                                                                ? 'border-red-500 bg-red-500/10 text-red-300'
                                                                : 'border-slate-700 bg-slate-800/50 text-slate-500'
                                                }`}>
                                                <span className="font-mono text-xs mr-2">{String.fromCharCode(65 + idx)}.</span>{opt}
                                            </button>
                                        ))}
                                    </div>
                                    {quizState.answered && (
                                        <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${quizState.selected === quizQuestions[quizState.current].correct ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                                            {quizState.selected === quizQuestions[quizState.current].correct ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                                            <span>{quizQuestions[quizState.current].explanation}</span>
                                        </div>
                                    )}
                                    {quizState.answered && (
                                        <button onClick={nextQuestion} className="mt-3 text-sm text-amber-400 hover:text-amber-300">
                                            {quizState.current + 1 < quizQuestions.length ? 'Next question →' : 'See results →'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="text-3xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                                    <div className="text-slate-400 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : quizState.score >= 2 ? 'Well done!' : 'Keep practicing!'}</div>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="text-sm text-amber-400 hover:text-amber-300">Retry quiz</button>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(v => !v)}
                                className="flex items-center gap-2 text-lg font-bold text-slate-100 w-full mb-3 hover:text-amber-300 transition-colors">
                                <Code className="h-5 w-5 text-amber-400" />
                                Implementation
                                <span className="text-xs text-slate-500 ml-auto">{showCode ? 'hide' : 'show'}</span>
                            </button>
                            {showCode && <CodeBlock code={codeExample} language="python" />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
