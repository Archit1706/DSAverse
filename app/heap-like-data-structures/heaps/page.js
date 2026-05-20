'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ArrowLeft, Plus, Minus, Eye, SkipBack, SkipForward, Info, CheckCircle, XCircle, Code } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "For a node at index i (0-indexed) in a binary heap array, what index holds its left child?",
        options: ["2i", "2i + 1", "2i + 2", "(i − 1) / 2"],
        correct: 1,
        explanation: "Left child is at 2i+1, right child is at 2i+2, and the parent is at ⌊(i−1)/2⌋. These formulas let you navigate a complete binary tree stored in an array."
    },
    {
        question: "What is the time complexity of building a heap from n unsorted elements using bottom-up heapify (Floyd's algorithm)?",
        options: ["O(n log n)", "O(log n)", "O(n)", "O(n²)"],
        correct: 2,
        explanation: "Bottom-up heapify runs in O(n) time. Although heapify-down is O(log n), most nodes are near the bottom where the subtrees are small — the total work sums to O(n)."
    },
    {
        question: "In a max-heap, which property holds for every node?",
        options: ["Left child ≥ right child at every node", "Parent ≥ both children", "All leaves are at the same depth", "Parent ≤ both children"],
        correct: 1,
        explanation: "The max-heap property requires every parent to be ≥ both its children. This guarantees the maximum element sits at the root and is accessible in O(1)."
    }
];

export default function HeapsPage() {
    const [heap, setHeap] = useState([]);
    const [heapType, setHeapType] = useState('max');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(900);
    const [inputValue, setInputValue] = useState('');
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const generateSteps = (operation, value = null, baseHeap = null) => {
        const steps = [];
        const h = [...(baseHeap ?? heap)];

        if (operation === 'insert') {
            h.push(value);
            steps.push({
                heap: [...h],
                highlightIndices: [h.length - 1],
                explanation: `Insert ${value} at index ${h.length - 1} (end of array). Start bubbling up to restore heap property.`,
                phase: 'add',
                swapIndices: []
            });

            let ci = h.length - 1;
            while (ci > 0) {
                const pi = Math.floor((ci - 1) / 2);
                const shouldSwap = heapType === 'max' ? h[ci] > h[pi] : h[ci] < h[pi];
                if (shouldSwap) {
                    steps.push({
                        heap: [...h],
                        highlightIndices: [ci, pi],
                        explanation: `Compare ${h[ci]} with parent ${h[pi]}. ${heapType === 'max' ? `${h[ci]} > ${h[pi]}` : `${h[ci]} < ${h[pi]}`} — swap needed.`,
                        phase: 'compare',
                        swapIndices: [ci, pi]
                    });
                    [h[ci], h[pi]] = [h[pi], h[ci]];
                    steps.push({
                        heap: [...h],
                        highlightIndices: [pi],
                        explanation: `Swapped. ${value} is now at index ${pi}.`,
                        phase: 'swap',
                        swapIndices: []
                    });
                    ci = pi;
                } else {
                    steps.push({
                        heap: [...h],
                        highlightIndices: [ci],
                        explanation: `Heap property satisfied — ${h[ci]} ${heapType === 'max' ? '≤' : '≥'} parent ${h[Math.floor((ci - 1) / 2)]}. Insertion complete.`,
                        phase: 'complete',
                        swapIndices: []
                    });
                    break;
                }
            }
            if (ci === 0 && (steps.length === 0 || steps[steps.length - 1]?.phase !== 'complete')) {
                steps.push({
                    heap: [...h],
                    highlightIndices: [0],
                    explanation: `${value} reached the root. Insertion complete.`,
                    phase: 'complete',
                    swapIndices: []
                });
            }

        } else if (operation === 'extractRoot') {
            if (h.length === 0) {
                steps.push({ heap: [], highlightIndices: [], explanation: 'Heap is empty — nothing to extract.', phase: 'error', swapIndices: [] });
                return steps;
            }
            const rootVal = h[0];
            steps.push({
                heap: [...h],
                highlightIndices: [0],
                explanation: `Root is ${rootVal} — the ${heapType === 'max' ? 'maximum' : 'minimum'} element. Save it, then replace root with the last element.`,
                phase: 'identify',
                swapIndices: []
            });

            if (h.length === 1) {
                h.pop();
                steps.push({ heap: [], highlightIndices: [], explanation: `Removed ${rootVal}. Heap is now empty.`, phase: 'complete', swapIndices: [] });
                return steps;
            }

            const lastVal = h[h.length - 1];
            h[0] = lastVal;
            h.pop();
            steps.push({
                heap: [...h],
                highlightIndices: [0],
                explanation: `Replaced root with last element (${lastVal}), removed ${rootVal}. Begin heapify-down.`,
                phase: 'replace',
                swapIndices: []
            });

            let ci = 0;
            while (true) {
                const li = 2 * ci + 1;
                const ri = 2 * ci + 2;
                let target = ci;
                if (li < h.length && (heapType === 'max' ? h[li] > h[target] : h[li] < h[target])) target = li;
                if (ri < h.length && (heapType === 'max' ? h[ri] > h[target] : h[ri] < h[target])) target = ri;

                if (target === ci) {
                    steps.push({
                        heap: [...h],
                        highlightIndices: [ci],
                        explanation: `Heap property restored at index ${ci}. Extract complete — removed ${rootVal}.`,
                        phase: 'complete',
                        swapIndices: []
                    });
                    break;
                }

                const parts = [];
                if (li < h.length) parts.push(`left[${li}]=${h[li]}`);
                if (ri < h.length) parts.push(`right[${ri}]=${h[ri]}`);
                steps.push({
                    heap: [...h],
                    highlightIndices: [...new Set([ci, li < h.length ? li : -1, ri < h.length ? ri : -1].filter(x => x >= 0))],
                    explanation: `Compare ${h[ci]} with children (${parts.join(', ')}). Swap with ${h[target]} at index ${target}.`,
                    phase: 'compare',
                    swapIndices: [ci, target]
                });
                [h[ci], h[target]] = [h[target], h[ci]];
                steps.push({
                    heap: [...h],
                    highlightIndices: [target],
                    explanation: `Swapped. Continue heapify-down from index ${target}.`,
                    phase: 'swap',
                    swapIndices: []
                });
                ci = target;
            }

        } else if (operation === 'peek') {
            if (h.length === 0) {
                steps.push({ heap: [...h], highlightIndices: [], explanation: 'Heap is empty.', phase: 'error', swapIndices: [] });
            } else {
                steps.push({
                    heap: [...h],
                    highlightIndices: [0],
                    explanation: `Root (${heapType === 'max' ? 'maximum' : 'minimum'}) value is ${h[0]}. Peek is O(1) — no modification needed.`,
                    phase: 'complete',
                    swapIndices: []
                });
            }
        }

        return steps;
    };

    const runOperation = (op, val = null) => {
        const steps = generateSteps(op, val);
        if (steps.length === 0) return;
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(true);
    };

    const handleInsert = () => {
        if (!inputValue || isNaN(inputValue)) return;
        runOperation('insert', parseInt(inputValue));
        setInputValue('');
    };

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
            const final = stepHistory[stepHistory.length - 1];
            if (final) setHeap(final.heap);
            return;
        }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const switchHeapType = (type) => {
        setHeapType(type);
        setHeap([]);
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
    };

    const reset = () => {
        setHeap([]);
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
    };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };

    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) {
            setQuizState(s => ({ ...s, complete: true }));
        } else {
            setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
        }
    };

    const currentState = stepHistory[currentStep] || {
        heap,
        highlightIndices: [],
        explanation: 'Select an operation to begin. Try inserting a few values first.',
        phase: '',
        swapIndices: []
    };

    const renderHeapTree = () => {
        const h = currentState.heap;
        if (h.length === 0) {
            return (
                <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                    Empty heap — insert a value to begin
                </div>
            );
        }

        const levels = Math.ceil(Math.log2(h.length + 1));
        const svgH = Math.max(160, levels * 70 + 40);
        const VW = 560;
        const nr = h.length <= 7 ? 22 : h.length <= 15 ? 17 : 13;
        const fontSize = h.length <= 7 ? 13 : h.length <= 15 ? 11 : 9;

        const getPos = (i) => {
            const level = Math.floor(Math.log2(i + 1));
            const pos = i - (Math.pow(2, level) - 1);
            const total = Math.pow(2, level);
            return { x: ((pos + 0.5) / total) * VW, y: level * 70 + 36 };
        };

        const getNodeFill = (i) => {
            if (!currentState.highlightIndices.includes(i)) return '#334155';
            if (currentState.phase === 'error') return '#ef4444';
            if (currentState.phase === 'compare') return '#eab308';
            if (currentState.phase === 'complete') return '#22c55e';
            return '#f59e0b';
        };

        const getStroke = (i) => {
            if (!currentState.highlightIndices.includes(i)) return '#475569';
            if (currentState.phase === 'error') return '#dc2626';
            if (currentState.phase === 'compare') return '#ca8a04';
            if (currentState.phase === 'complete') return '#16a34a';
            return '#d97706';
        };

        return (
            <svg viewBox={`0 0 ${VW} ${svgH}`} width="100%" className="block">
                {h.map((_, i) => {
                    if (i === 0) return null;
                    const pi = Math.floor((i - 1) / 2);
                    const cp = getPos(i), pp = getPos(pi);
                    const isSwap = currentState.swapIndices.includes(i) && currentState.swapIndices.includes(pi);
                    return (
                        <line key={`e${i}`} x1={pp.x} y1={pp.y} x2={cp.x} y2={cp.y}
                            stroke={isSwap ? '#f59e0b' : '#334155'} strokeWidth={isSwap ? 2.5 : 1.5} />
                    );
                })}
                {h.map((val, i) => {
                    const { x, y } = getPos(i);
                    return (
                        <g key={`n${i}`}>
                            <circle cx={x} cy={y} r={nr} fill={getNodeFill(i)} stroke={getStroke(i)} strokeWidth="2" />
                            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                                fontSize={fontSize} fontWeight="bold" fill="#f1f5f9">{val}</text>
                            <text x={x} y={y + nr + 9} textAnchor="middle" fontSize="8" fill="#64748b">[{i}]</text>
                        </g>
                    );
                })}
            </svg>
        );
    };

    const codeExample = `class ${heapType === 'max' ? 'MaxHeap' : 'MinHeap'}:
    def __init__(self):
        self.heap = []

    def _parent(self, i): return (i - 1) // 2
    def _left(self, i):   return 2 * i + 1
    def _right(self, i):  return 2 * i + 2

    def insert(self, value):
        self.heap.append(value)
        self._bubble_up(len(self.heap) - 1)

    def _bubble_up(self, i):
        while i > 0:
            p = self._parent(i)
            if self.heap[i] ${heapType === 'max' ? '>' : '<'} self.heap[p]:
                self.heap[i], self.heap[p] = self.heap[p], self.heap[i]
                i = p
            else:
                break

    def extract_root(self):
        if not self.heap: return None
        root = self.heap[0]
        self.heap[0] = self.heap[-1]
        self.heap.pop()
        self._bubble_down(0)
        return root

    def _bubble_down(self, i):
        n = len(self.heap)
        while True:
            target = i
            l, r = self._left(i), self._right(i)
            if l < n and self.heap[l] ${heapType === 'max' ? '>' : '<'} self.heap[target]:
                target = l
            if r < n and self.heap[r] ${heapType === 'max' ? '>' : '<'} self.heap[target]:
                target = r
            if target == i: break
            self.heap[i], self.heap[target] = self.heap[target], self.heap[i]
            i = target

    def peek(self):
        return self.heap[0] if self.heap else None`;

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/heap-like-data-structures" className="inline-flex items-center text-amber-100 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Heap Data Structures
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Binary Heap</h1>
                        <p className="text-xl text-amber-100 max-w-3xl mx-auto">
                            A complete binary tree satisfying the heap property — every parent is
                            {heapType === 'max' ? ' greater than' : ' smaller than'} or equal to its children.
                            Stored efficiently as an array.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* ── Left: Visualization ── */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            {/* Heap type toggle */}
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xl font-bold text-slate-100">Heap Visualization</h2>
                                <div className="flex gap-2">
                                    <button onClick={() => switchHeapType('max')}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${heapType === 'max' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                        Max Heap
                                    </button>
                                    <button onClick={() => switchHeapType('min')}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${heapType === 'min' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                        Min Heap
                                    </button>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="space-y-3 mb-5">
                                <div className="flex flex-wrap gap-2">
                                    <input type="number" value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleInsert()}
                                        placeholder="Enter value (1–99)"
                                        className="w-44 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500" />
                                    <button onClick={handleInsert} disabled={isPlaying}
                                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Plus className="h-4 w-4" /> Insert
                                    </button>
                                    <button onClick={() => runOperation('extractRoot')} disabled={isPlaying || heap.length === 0}
                                        className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Minus className="h-4 w-4" /> Extract Root
                                    </button>
                                    <button onClick={() => runOperation('peek')} disabled={isPlaying || heap.length === 0}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Eye className="h-4 w-4" /> Peek
                                    </button>
                                </div>

                                {/* Playback controls */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                        disabled={currentStep === 0 || isPlaying || stepHistory.length === 0}
                                        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 transition-colors">
                                        <SkipBack className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setIsPlaying(v => !v)} disabled={stepHistory.length === 0}
                                        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                        {isPlaying ? 'Pause' : 'Play'}
                                    </button>
                                    <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))}
                                        disabled={currentStep >= stepHistory.length - 1 || isPlaying || stepHistory.length === 0}
                                        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 transition-colors">
                                        <SkipForward className="h-4 w-4" />
                                    </button>
                                    <button onClick={reset}
                                        className="p-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-200 transition-colors">
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

                            {/* Tree SVG */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4">
                                {renderHeapTree()}
                            </div>

                            {/* Array representation */}
                            <div className="mb-4">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Array Representation</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {currentState.heap.length === 0
                                        ? <span className="text-slate-600 text-sm">[ empty ]</span>
                                        : currentState.heap.map((val, i) => (
                                            <div key={i}
                                                className={`w-11 h-11 flex flex-col items-center justify-center rounded-lg border transition-all duration-200 ${currentState.highlightIndices.includes(i) ? 'bg-amber-500/20 border-amber-500 scale-110' : 'bg-slate-800 border-slate-700'}`}>
                                                <span className="text-xs font-bold text-slate-100">{val}</span>
                                                <span className="text-[9px] text-slate-500">[{i}]</span>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Step explanation */}
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-amber-300 text-sm leading-relaxed">{currentState.explanation}</p>
                                        {stepHistory.length > 0 && (
                                            <p className="text-amber-600 text-xs mt-1.5">Step {currentStep + 1} of {stepHistory.length}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Info ── */}
                    <div className="space-y-5">
                        {/* Complexity */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-4">Complexity</h2>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                {[['Insert', 'O(log n)'], ['Extract Root', 'O(log n)'], ['Peek', 'O(1)']].map(([op, c]) => (
                                    <div key={op} className="bg-slate-800/60 rounded-lg p-3">
                                        <div className="text-base font-bold text-amber-400">{c}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 text-center bg-slate-800/60 rounded-lg p-3">
                                <div className="text-base font-bold text-amber-400">O(n)</div>
                                <div className="text-xs text-slate-400 mt-1">Space (array storage)</div>
                            </div>
                        </div>

                        {/* Properties */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Heap Properties</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-amber-400 mt-0.5">•</span><span><strong>Complete binary tree</strong> — all levels filled except possibly the last, filled left to right</span></li>
                                <li className="flex gap-2"><span className="text-amber-400 mt-0.5">•</span><span><strong>Heap property</strong> — {heapType === 'max' ? 'every parent ≥ both children (max-heap)' : 'every parent ≤ both children (min-heap)'}</span></li>
                                <li className="flex gap-2"><span className="text-amber-400 mt-0.5">•</span><span><strong>Array layout</strong> — left child at 2i+1, right at 2i+2, parent at ⌊(i−1)/2⌋</span></li>
                                <li className="flex gap-2"><span className="text-amber-400 mt-0.5">•</span><span><strong>Height</strong> — always O(log n) due to completeness</span></li>
                            </ul>
                        </div>

                        {/* Applications */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Applications</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                {[
                                    ['Priority Queues', 'OS scheduling, event simulation'],
                                    ['Heap Sort', 'In-place O(n log n) sorting'],
                                    ["Dijkstra's / Prim's", 'Graph shortest paths and MST'],
                                    ['Median Finding', 'Two-heap trick for streaming data'],
                                    ['K-way Merge', 'Merging k sorted arrays efficiently'],
                                ].map(([name, desc]) => (
                                    <li key={name} className="flex gap-2">
                                        <span className="text-amber-400 mt-0.5">•</span>
                                        <span><strong>{name}</strong> — {desc}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-4">Active Recall Quiz</h2>
                            {!quizState.complete ? (
                                <div>
                                    <p className="text-xs text-slate-400 mb-3">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">
                                        {quizQuestions[quizState.current].question}
                                    </p>
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
                                            {quizState.selected === quizQuestions[quizState.current].correct
                                                ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                                : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                                            <span>{quizQuestions[quizState.current].explanation}</span>
                                        </div>
                                    )}
                                    {quizState.answered && (
                                        <button onClick={nextQuestion} className="mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors">
                                            {quizState.current + 1 < quizQuestions.length ? 'Next question →' : 'See results →'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="text-3xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                                    <div className="text-slate-400 text-sm mb-4">
                                        {quizState.score === quizQuestions.length ? 'Perfect score!' : quizState.score >= 2 ? 'Well done!' : 'Keep practicing!'}
                                    </div>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                                        className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
                                        Retry quiz
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Code */}
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
