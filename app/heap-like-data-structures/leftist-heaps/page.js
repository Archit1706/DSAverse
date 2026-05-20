'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ArrowLeft, Plus, Minus, Eye, SkipBack, SkipForward, Info, GitMerge, CheckCircle, XCircle, Code } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What does 'npl' (null path length) mean for a node in a leftist heap?",
        options: [
            "The height of the tallest subtree",
            "The shortest path from the node to a null descendant",
            "The number of children the node has",
            "The depth of the node from the root"
        ],
        correct: 1,
        explanation: "npl(node) is the length of the shortest path from that node to a null child. Leaf nodes have npl=0. The leftist property requires npl(left) ≥ npl(right) at every node, keeping the right spine short."
    },
    {
        question: "The leftist property guarantees that which path is always at most O(log n) long?",
        options: ["The leftmost path from root to leaf", "The path to the deepest node", "The right spine (rightmost path)", "The path between any two nodes"],
        correct: 2,
        explanation: "The right spine — the path from root always going right — has length at most O(log n). Merge, insert, and extract-min all operate only on this spine, giving O(log n) complexity."
    },
    {
        question: "In a leftist heap, insert(x) is implemented as:",
        options: ["Add x to an array and heapify-up", "Merge the heap with a singleton node containing x", "Scan the right spine to find the insertion point", "Build a new heap from scratch including x"],
        correct: 1,
        explanation: "Insert is simply merge(heap, singleton(x)). The merge operation handles all positioning and npl maintenance. This elegance is why merge-based heaps like leftist and skew heaps only need one primitive operation."
    }
];

export default function LeftistHeapsPage() {
    const [heap, setHeap] = useState(null);
    const [heap2, setHeap2] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputMain, setInputMain] = useState('');
    const [inputSecond, setInputSecond] = useState('');
    const [idSeq, setIdSeq] = useState(1);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const clone = (node) => node ? JSON.parse(JSON.stringify(node)) : null;
    const newId = () => { setIdSeq(v => v + 1); return idSeq + Math.random(); };

    const getNpl = (n) => n ? n.npl : -1;

    const mergeHeaps = (h1, h2, steps) => {
        if (!h1) return h2;
        if (!h2) return h1;

        if (h1.value > h2.value) [h1, h2] = [h2, h1];

        steps.push({
            heap: clone(h1), heap2: clone(h2),
            highlightIds: [h1.id, h2.id],
            phase: 'compare',
            explanation: `Compare roots ${h1.value} and ${h2.value}. Keep ${h1.value} as root (smaller value). Recursively merge right child of ${h1.value} with the other heap.`
        });

        h1.right = mergeHeaps(h1.right, h2, steps);

        const leftNpl = getNpl(h1.left);
        const rightNpl = getNpl(h1.right);

        if (leftNpl < rightNpl) {
            [h1.left, h1.right] = [h1.right, h1.left];
            steps.push({
                heap: clone(h1), heap2: null,
                highlightIds: [h1.id],
                phase: 'swap',
                explanation: `npl(left)=${leftNpl} < npl(right)=${rightNpl} at node ${h1.value}. Swap children to maintain leftist property (npl(left) ≥ npl(right)).`
            });
        }

        h1.npl = getNpl(h1.right) + 1;
        steps.push({
            heap: clone(h1), heap2: null,
            highlightIds: [h1.id],
            phase: 'npl',
            explanation: `Update npl(${h1.value}) = npl(right) + 1 = ${h1.npl}. The right spine stays short.`
        });

        return h1;
    };

    const generateSteps = (operation, value = null) => {
        const steps = [];
        const h = clone(heap);
        const h2 = clone(heap2);

        if (operation === 'insertMain') {
            const node = { id: idSeq + Math.random(), value, npl: 0, left: null, right: null };
            steps.push({
                heap: h, heap2: node,
                highlightIds: [node.id],
                phase: 'create',
                explanation: `Create singleton node with value ${value} (npl=0). Merge it with Heap A using the merge primitive.`
            });
            const merged = mergeHeaps(h, node, steps);
            steps.push({
                heap: merged, heap2: h2,
                highlightIds: merged ? [merged.id] : [],
                phase: 'complete',
                explanation: `Insert ${value} into Heap A complete.`
            });
        }

        if (operation === 'insertSecond') {
            const node = { id: idSeq + Math.random(), value, npl: 0, left: null, right: null };
            steps.push({
                heap: h, heap2: node,
                highlightIds: [node.id],
                phase: 'create',
                explanation: `Create singleton node with value ${value} (npl=0). Merge it with Heap B.`
            });
            const merged2 = mergeHeaps(h2, node, steps);
            steps.push({
                heap: h, heap2: merged2,
                highlightIds: merged2 ? [merged2.id] : [],
                phase: 'complete',
                explanation: `Insert ${value} into Heap B complete.`
            });
        }

        if (operation === 'extractMin') {
            if (!h) {
                steps.push({ heap: h, heap2: h2, highlightIds: [], phase: 'error', explanation: 'Heap A is empty — nothing to extract.' });
                return steps;
            }
            steps.push({
                heap: h, heap2: h2,
                highlightIds: [h.id],
                phase: 'identify',
                explanation: `Minimum is root ${h.value}. Remove it and merge its left and right children.`
            });
            const merged = mergeHeaps(h.left, h.right, steps);
            steps.push({
                heap: merged, heap2: h2,
                highlightIds: merged ? [merged.id] : [],
                phase: 'complete',
                explanation: `Extract-min complete. Removed ${h.value}. Left and right children merged into new Heap A.`
            });
        }

        if (operation === 'peek') {
            steps.push({
                heap: h, heap2: h2,
                highlightIds: h ? [h.id] : [],
                phase: h ? 'complete' : 'error',
                explanation: h ? `Minimum in Heap A is ${h.value} (always at root). Peek is O(1) — no modification.` : 'Heap A is empty.'
            });
        }

        if (operation === 'mergeAB') {
            if (!h && !h2) {
                steps.push({ heap: null, heap2: null, highlightIds: [], phase: 'error', explanation: 'Both heaps are empty.' });
                return steps;
            }
            steps.push({ heap: h, heap2: h2, highlightIds: [], phase: 'prepare', explanation: 'Merging Heap A and Heap B. The merge follows the right spines of both trees.' });
            const merged = mergeHeaps(h, h2, steps);
            steps.push({
                heap: merged, heap2: null,
                highlightIds: merged ? [merged.id] : [],
                phase: 'complete',
                explanation: 'Merge complete. Result stored in Heap A. Heap B is now empty.'
            });
        }

        return steps;
    };

    const runOperation = (op, val = null) => {
        const steps = generateSteps(op, val);
        if (!steps.length) return;
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    };

    useEffect(() => {
        if (!isPlaying || !stepHistory.length) return;
        if (currentStep >= stepHistory.length - 1) {
            const final = stepHistory[stepHistory.length - 1];
            setHeap(final.heap);
            setHeap2(final.heap2);
            setIsPlaying(false);
            return;
        }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setHeap(null); setHeap2(null); setStepHistory([]); setCurrentStep(0); setIsPlaying(false); };

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
        heap, heap2,
        highlightIds: [],
        phase: '',
        explanation: 'Insert values into Heap A and Heap B, then try merging them together.'
    };

    const countNodes = (n) => !n ? 0 : 1 + countNodes(n.left) + countNodes(n.right);
    const treeHeight = (n) => !n ? 0 : 1 + Math.max(treeHeight(n.left), treeHeight(n.right));

    // Compute tree width needed for proper SVG layout
    const treeWidth = (n) => !n ? 0 : Math.max(50, treeWidth(n.left) + treeWidth(n.right) + 10);

    const drawTree = (node, x, y, level, secondary, svgElems) => {
        if (!node) return;
        const hSpacing = Math.max(200 / Math.pow(2, level), 28);
        const vSpacing = 68;
        const R = 20;
        const isHL = currentState.highlightIds.includes(node.id);
        const fill = isHL ? '#eab308' : secondary ? '#ea580c' : '#b45309';
        const stroke = isHL ? '#ca8a04' : secondary ? '#c2410c' : '#92400e';

        if (node.left) {
            const lx = x - hSpacing, ly = y + vSpacing;
            svgElems.push(<line key={`le-${node.id}`} x1={x} y1={y + R} x2={lx} y2={ly - R} stroke="#78350f" strokeWidth="1.5" />);
            drawTree(node.left, lx, ly, level + 1, secondary, svgElems);
        }
        if (node.right) {
            const rx = x + hSpacing, ry = y + vSpacing;
            svgElems.push(<line key={`re-${node.id}`} x1={x} y1={y + R} x2={rx} y2={ry - R} stroke="#78350f" strokeWidth="1.5" strokeDasharray="4,2" />);
            drawTree(node.right, rx, ry, level + 1, secondary, svgElems);
        }

        svgElems.push(
            <g key={`nd-${node.id}`}>
                <circle cx={x} cy={y} r={R} fill={fill} stroke={stroke} strokeWidth="2" />
                <text x={x} y={y - 3} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#fef3c7">{node.value}</text>
                <text x={x} y={y + 10} textAnchor="middle" fontSize="8" fill="#fbbf24">n={node.npl}</text>
            </g>
        );
    };

    const renderVisualization = () => {
        const h = currentState.heap;
        const h2 = currentState.heap2;

        if (!h && !h2) {
            return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Both heaps empty — insert values to begin</div>;
        }

        const svgW = 560;
        const svgH = 320;
        const elems = [];

        if (h && h2) {
            // Split: left half for heap A, right half for heap B
            elems.push(<text key="la" x={140} y={22} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#d97706">Heap A</text>);
            elems.push(<text key="lb" x={420} y={22} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ea580c">Heap B</text>);
            elems.push(<line key="div" x1={280} y1={10} x2={280} y2={svgH - 10} stroke="#334155" strokeWidth="1" strokeDasharray="4,3" />);
            drawTree(h, 140, 46, 0, false, elems);
            drawTree(h2, 420, 46, 0, true, elems);
        } else if (h) {
            elems.push(<text key="la" x={280} y={22} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#d97706">Heap A</text>);
            drawTree(h, 280, 46, 0, false, elems);
        } else if (h2) {
            elems.push(<text key="lb" x={280} y={22} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ea580c">Heap B</text>);
            drawTree(h2, 280, 46, 0, true, elems);
        }

        return (
            <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" className="block">
                {elems}
            </svg>
        );
    };

    const codeExample = `class LeftistNode:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None
        self.npl = 0  # null path length

class LeftistHeap:
    def __init__(self):
        self.root = None

    def _npl(self, node):
        return -1 if node is None else node.npl

    def merge(self, h1, h2):
        """Core operation — O(log n)"""
        if h1 is None: return h2
        if h2 is None: return h1

        # Keep smaller root on top (min-heap)
        if h1.value > h2.value:
            h1, h2 = h2, h1

        # Recursively merge right spine
        h1.right = self.merge(h1.right, h2)

        # Enforce leftist property: npl(left) >= npl(right)
        if self._npl(h1.left) < self._npl(h1.right):
            h1.left, h1.right = h1.right, h1.left

        # Update npl
        h1.npl = self._npl(h1.right) + 1
        return h1

    def insert(self, value):
        """O(log n) — merge with singleton"""
        node = LeftistNode(value)
        self.root = self.merge(self.root, node)

    def find_min(self):
        """O(1) — always at root"""
        return self.root.value if self.root else None

    def extract_min(self):
        """O(log n) — remove root, merge children"""
        if not self.root: return None
        min_val = self.root.value
        self.root = self.merge(self.root.left, self.root.right)
        return min_val

    def merge_with(self, other):
        """O(log n) — merge two heaps"""
        self.root = self.merge(self.root, other.root)
        other.root = None`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/heap-like-data-structures" className="inline-flex items-center text-amber-100 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Heap Data Structures
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Leftist Heap</h1>
                        <p className="text-xl text-amber-100 max-w-3xl mx-auto">
                            A merge-first heap where the right spine is kept short via the null path length (npl) invariant.
                            All operations reduce to a single merge on the right spine.
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
                            <p className="text-xs text-slate-400 mb-4">Solid edges = left children (heavier side). Dashed edges = right spine (kept short by leftist property).</p>

                            <div className="space-y-3 mb-5">
                                {/* Heap A insert */}
                                <div className="flex flex-wrap gap-2">
                                    <input type="number" value={inputMain}
                                        onChange={e => setInputMain(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && inputMain !== '') { runOperation('insertMain', Number(inputMain)); setInputMain(''); setIdSeq(v => v + 1); } }}
                                        placeholder="Value for Heap A"
                                        className="w-40 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500" />
                                    <button onClick={() => { if (inputMain === '') return; runOperation('insertMain', Number(inputMain)); setInputMain(''); setIdSeq(v => v + 1); }}
                                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Plus className="h-4 w-4" /> Insert A
                                    </button>
                                </div>
                                {/* Heap B insert */}
                                <div className="flex flex-wrap gap-2">
                                    <input type="number" value={inputSecond}
                                        onChange={e => setInputSecond(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && inputSecond !== '') { runOperation('insertSecond', Number(inputSecond)); setInputSecond(''); setIdSeq(v => v + 1); } }}
                                        placeholder="Value for Heap B"
                                        className="w-40 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                                    <button onClick={() => { if (inputSecond === '') return; runOperation('insertSecond', Number(inputSecond)); setInputSecond(''); setIdSeq(v => v + 1); }}
                                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Plus className="h-4 w-4" /> Insert B
                                    </button>
                                </div>
                                {/* Operations */}
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => runOperation('extractMin')} disabled={!heap}
                                        className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                                        <Minus className="h-4 w-4" /> Extract Min A
                                    </button>
                                    <button onClick={() => runOperation('peek')} disabled={!heap}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                                        <Eye className="h-4 w-4" /> Peek A
                                    </button>
                                    <button onClick={() => runOperation('mergeAB')} disabled={!heap && !heap2}
                                        className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                                        <GitMerge className="h-4 w-4" /> Merge A+B
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

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {[
                                    [`Nodes in A`, countNodes(currentState.heap)],
                                    [`Height of A`, treeHeight(currentState.heap)],
                                    [`Nodes in B`, countNodes(currentState.heap2)],
                                    [`Height of B`, treeHeight(currentState.heap2)],
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
                            <h2 className="text-lg font-bold text-slate-100 mb-4">Complexity</h2>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                {[['Merge', 'O(log n)'], ['Insert', 'O(log n)'], ['Extract Min', 'O(log n)'], ['Find Min', 'O(1)'], ['Space', 'O(n)'], ['Right Spine', 'O(log n)']].map(([op, c]) => (
                                    <div key={op} className="bg-slate-800/60 rounded-lg p-3">
                                        <div className="text-base font-bold text-amber-400">{c}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Key Properties</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Min-heap order</strong> — every parent ≤ its children</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Leftist property</strong> — npl(left) ≥ npl(right) at every node</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Short right spine</strong> — guaranteed O(log n) length; merge stays on the right</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>All operations via merge</strong> — insert and extract-min both reduce to merge</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Not balanced</strong> — the tree is intentionally skewed leftward; that's the design</span></li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Applications</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Mergeable priority queues</strong> — when frequent heap merging is needed</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Event simulation</strong> — merging event queues from parallel processes</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Persistent data structures</strong> — functional style; easy to share structure</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Teaching</strong> — elegant example of merge-first design; simpler than Fibonacci heaps</span></li>
                            </ul>
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
