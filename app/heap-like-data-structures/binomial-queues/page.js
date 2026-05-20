'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ArrowLeft, Plus, Minus, Eye, SkipBack, SkipForward, Info, CheckCircle, XCircle, Code } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "Merging two binomial queues is analogous to which mathematical operation?",
        options: ["Decimal addition", "Binary number addition", "Matrix multiplication", "Polynomial division"],
        correct: 1,
        explanation: "Binomial queue merging mirrors binary addition: each rank is a 'bit position', at most one tree per rank exists, and two trees of the same rank merge to form a tree of the next rank — exactly like carrying in binary addition."
    },
    {
        question: "A binomial tree B_k contains exactly how many nodes?",
        options: ["k nodes", "k² nodes", "2^k nodes", "k × log k nodes"],
        correct: 2,
        explanation: "Binomial tree B_k has exactly 2^k nodes. B_0 is a single node; B_k is formed by making one B_(k-1) the leftmost child of another, doubling the size each time."
    },
    {
        question: "What is the amortized time complexity of inserting a single element into a binomial queue?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correct: 0,
        explanation: "Insert is O(1) amortized (O(log n) worst case). Like incrementing a binary counter, most inserts only touch a small number of trees; the average over many operations is O(1)."
    }
];

export default function BinomialQueuesPage() {
    const [trees, setTrees] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1200);
    const [inputValue, setInputValue] = useState('');
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const createNode = (value, rank = 0) => ({ value, rank, children: [], id: Math.random() });

    const mergeTrees = (t1, t2) => {
        if (t1.value <= t2.value) return { ...t1, rank: t1.rank + 1, children: [...t1.children, t2] };
        return { ...t2, rank: t2.rank + 1, children: [...t2.children, t1] };
    };

    const mergeQueues = (allTrees) => {
        const sorted = [...allTrees].sort((a, b) => a.rank - b.rank);
        const result = [];
        const steps = [];
        let carry = null;
        let i = 0;

        while (i < sorted.length || carry !== null) {
            const candidates = [];
            if (carry !== null) candidates.push(carry);
            if (i < sorted.length && (candidates.length === 0 || sorted[i].rank === candidates[0].rank)) {
                candidates.push(sorted[i++]);
            }
            if (i < sorted.length && candidates.length > 0 && sorted[i].rank === candidates[0].rank) {
                candidates.push(sorted[i++]);
            }

            if (candidates.length === 1) {
                result.push(candidates[0]);
                carry = null;
                steps.push({ result: [...result], carry: null, explanation: `Tree B${candidates[0].rank} placed in result (no collision at rank ${candidates[0].rank}).`, phase: 'add' });
            } else if (candidates.length === 2) {
                carry = mergeTrees(candidates[0], candidates[1]);
                steps.push({ result: [...result], carry, explanation: `Two B${candidates[0].rank} trees merged into B${carry.rank} (carry — like binary addition carry).`, phase: 'merge' });
            } else if (candidates.length === 3) {
                result.push(candidates[2]);
                carry = mergeTrees(candidates[0], candidates[1]);
                steps.push({ result: [...result], carry, explanation: `Three B${candidates[0].rank} trees: keep one, merge two others into B${carry.rank} carry.`, phase: 'merge' });
            }
        }

        return { result: result.sort((a, b) => a.rank - b.rank), steps };
    };

    const generateSteps = (operation, value = null) => {
        const steps = [];
        let currentTrees = [...trees];

        if (operation === 'insert') {
            const newTree = createNode(value, 0);
            steps.push({
                trees: [newTree],
                carryTree: null,
                operation: 'insert',
                explanation: `Create new B0 tree with value ${value}. Now merge with existing queue using binary-addition logic.`,
                phase: 'create'
            });

            const allTrees = [newTree, ...currentTrees];
            const { result, steps: mergeSteps } = mergeQueues(allTrees);

            for (const ms of mergeSteps) {
                steps.push({
                    trees: ms.result,
                    carryTree: ms.carry,
                    operation: 'insert',
                    explanation: ms.explanation,
                    phase: ms.phase
                });
            }

            steps.push({
                trees: result,
                carryTree: null,
                operation: 'insert',
                explanation: `Insert complete. Queue now contains ${result.length} tree(s) at rank(s) [${result.map(t => t.rank).join(', ')}].`,
                phase: 'complete'
            });

        } else if (operation === 'extractMin') {
            if (currentTrees.length === 0) {
                steps.push({ trees: [], carryTree: null, operation: 'extractMin', explanation: 'Queue is empty — nothing to extract.', phase: 'error' });
                return steps;
            }

            let minTree = currentTrees.reduce((m, t) => t.value < m.value ? t : m, currentTrees[0]);

            steps.push({
                trees: currentTrees,
                carryTree: null,
                highlightId: minTree.id,
                operation: 'extractMin',
                explanation: `Scan all tree roots to find minimum. Found ${minTree.value} in tree B${minTree.rank}.`,
                phase: 'find'
            });

            const remaining = currentTrees.filter(t => t.id !== minTree.id);
            const children = [...minTree.children].sort((a, b) => a.rank - b.rank);

            steps.push({
                trees: remaining,
                carryTree: null,
                operation: 'extractMin',
                explanation: `Removed tree B${minTree.rank} (root ${minTree.value}). Its ${children.length} children become a new binomial queue.`,
                phase: 'remove'
            });

            if (children.length > 0) {
                steps.push({
                    trees: [...remaining, ...children],
                    carryTree: null,
                    operation: 'extractMin',
                    explanation: `Merge ${remaining.length} remaining tree(s) with ${children.length} child tree(s).`,
                    phase: 'merge'
                });
            }

            const { result, steps: mergeSteps } = mergeQueues([...remaining, ...children]);
            for (const ms of mergeSteps) {
                steps.push({ trees: ms.result, carryTree: ms.carry, operation: 'extractMin', explanation: ms.explanation, phase: ms.phase });
            }

            steps.push({
                trees: result,
                carryTree: null,
                operation: 'extractMin',
                explanation: `Extract complete. Removed ${minTree.value}. Queue now has ${result.length} tree(s).`,
                phase: 'complete'
            });

        } else if (operation === 'findMin') {
            if (currentTrees.length === 0) {
                steps.push({ trees: [], carryTree: null, operation: 'findMin', explanation: 'Queue is empty.', phase: 'error' });
                return steps;
            }
            const minTree = currentTrees.reduce((m, t) => t.value < m.value ? t : m, currentTrees[0]);
            steps.push({
                trees: currentTrees,
                carryTree: null,
                highlightId: minTree.id,
                operation: 'findMin',
                explanation: `Scan root list: minimum is ${minTree.value} in tree B${minTree.rank}. O(log n) scan.`,
                phase: 'complete'
            });
        }

        return steps;
    };

    const runOperation = (op, val = null) => {
        const steps = generateSteps(op, val);
        if (!steps.length) return;
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(true);
    };

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) {
            const final = stepHistory[stepHistory.length - 1];
            if (final) setTrees(final.trees);
            setIsPlaying(false);
            return;
        }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setTrees([]); setStepHistory([]); setCurrentStep(0); setIsPlaying(false); };

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
        trees,
        carryTree: null,
        highlightId: null,
        explanation: 'Insert values to build the binomial queue, then try Extract Min.',
        phase: ''
    };

    const getTotalNodes = (ts) => {
        let n = 0;
        const count = (node) => { n++; node.children.forEach(count); };
        ts.forEach(count);
        return n;
    };

    // Render a single binomial tree into SVG elements
    const renderTree = (node, x, y, highlighted, carry = false, level = 0) => {
        const elems = [];
        const r = 18;
        const levelH = 54;
        const nodeSpacing = 38;

        const renderNode = (n, nx, ny) => {
            const isHL = highlighted && n.id === currentState.highlightId;
            const fill = isHL ? '#eab308' : carry ? '#f97316' : ny === y ? '#b45309' : '#92400e';
            const stroke = isHL ? '#ca8a04' : carry ? '#c2410c' : '#78350f';

            const parts = [];
            let cx = nx - (n.children.length * nodeSpacing) / 2;
            n.children.forEach(child => {
                const childW = Math.pow(2, child.rank) * nodeSpacing;
                const childX = cx + childW / 2;
                const childY = ny + levelH;
                parts.push(<line key={`e-${n.id}-${child.id}`} x1={nx} y1={ny + r} x2={childX} y2={childY - r} stroke="#78350f" strokeWidth="1.5" />);
                parts.push(...renderNode(child, childX, childY));
                cx += childW;
            });

            parts.push(
                <g key={`n-${n.id}`}>
                    <circle cx={nx} cy={ny} r={r} fill={fill} stroke={stroke} strokeWidth="2" />
                    <text x={nx} y={ny} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#fef3c7">{n.value}</text>
                </g>
            );
            return parts;
        };

        return renderNode(node, x, y);
    };

    const renderBinomialQueue = () => {
        const ts = currentState.trees;
        const ct = currentState.carryTree;

        if (ts.length === 0 && !ct) {
            return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Empty queue — insert values to begin</div>;
        }

        // Compute total width needed
        let totalW = 30;
        const treeWidths = ts.map(t => Math.max(Math.pow(2, t.rank) * 38, 60));
        treeWidths.forEach(w => { totalW += w + 40; });
        let carryW = 0;
        if (ct) {
            carryW = Math.max(Math.pow(2, ct.rank) * 38, 60) + 60;
            totalW += carryW;
        }
        const svgW = Math.max(400, totalW);
        const svgH = 280;

        let curX = 30;
        return (
            <div className="overflow-x-auto">
                <svg width={svgW} height={svgH} style={{ display: 'block', margin: '0 auto' }}>
                    {ts.map((tree, idx) => {
                        const tw = treeWidths[idx];
                        const rootX = curX + tw / 2;
                        const elems = renderTree(tree, rootX, 50, true);
                        const label = (
                            <text key={`lbl-${tree.id}`} x={rootX} y={28} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#d97706">
                                B{tree.rank}
                            </text>
                        );
                        curX += tw + 40;
                        return [label, ...elems];
                    })}

                    {ct && (() => {
                        const rootX = curX + carryW / 2 - 30;
                        return [
                            <line key="carry-sep" x1={curX - 20} y1={20} x2={curX - 20} y2={svgH - 20} stroke="#475569" strokeWidth="1" strokeDasharray="4,3" />,
                            <text key="carry-lbl" x={rootX} y={28} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#f97316">Carry B{ct.rank}</text>,
                            ...renderTree(ct, rootX, 50, false, true)
                        ];
                    })()}
                </svg>
            </div>
        );
    };

    const codeExample = `class BinomialNode:
    def __init__(self, value):
        self.value = value
        self.rank = 0
        self.children = []

class BinomialQueue:
    def __init__(self):
        self.trees = []  # sorted by rank, at most one per rank

    def _link(self, t1, t2):
        """Merge two B_k trees into one B_(k+1)"""
        if t1.value > t2.value:
            t1, t2 = t2, t1
        t1.children.append(t2)
        t1.rank += 1
        return t1

    def insert(self, value):
        """O(1) amortized — like adding 1 in binary"""
        node = BinomialNode(value)
        self._merge([node])

    def find_min(self):
        """O(log n) — scan root list"""
        return min(t.value for t in self.trees) if self.trees else None

    def extract_min(self):
        """O(log n) — remove min root, merge children"""
        min_tree = min(self.trees, key=lambda t: t.value)
        self.trees.remove(min_tree)
        # children form a binomial queue (reversed order → correct ranks)
        children = list(reversed(min_tree.children))
        self._merge(children)
        return min_tree.value

    def _merge(self, other):
        """Merge another list of trees — binary addition analogy"""
        all_trees = sorted(self.trees + other, key=lambda t: t.rank)
        result, carry = [], None
        i = 0
        while i < len(all_trees) or carry:
            batch = []
            if carry:
                batch.append(carry)
            while i < len(all_trees) and len(batch) < 2:
                if not batch or all_trees[i].rank == batch[0].rank:
                    batch.append(all_trees[i]); i += 1
                else:
                    break
            if len(batch) == 1:
                result.append(batch[0]); carry = None
            else:
                carry = self._link(batch[0], batch[1])
        self.trees = result`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/heap-like-data-structures" className="inline-flex items-center text-amber-100 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Heap Data Structures
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Binomial Queue</h1>
                        <p className="text-xl text-amber-100 max-w-3xl mx-auto">
                            A forest of binomial trees with unique ranks. Merging two queues mirrors
                            binary number addition — carry a tree when two of the same rank collide.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* ── Left: Visualization ── */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-5">Queue Visualization</h2>

                            <div className="space-y-3 mb-5">
                                <div className="flex flex-wrap gap-2">
                                    <input type="number" value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && inputValue && runOperation('insert', parseInt(inputValue)) && setInputValue('')}
                                        placeholder="Enter value"
                                        className="w-36 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500" />
                                    <button onClick={() => { if (!inputValue) return; runOperation('insert', parseInt(inputValue)); setInputValue(''); }}
                                        disabled={isPlaying}
                                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Plus className="h-4 w-4" /> Insert
                                    </button>
                                    <button onClick={() => runOperation('extractMin')} disabled={isPlaying || trees.length === 0}
                                        className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Minus className="h-4 w-4" /> Extract Min
                                    </button>
                                    <button onClick={() => runOperation('findMin')} disabled={isPlaying || trees.length === 0}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Eye className="h-4 w-4" /> Find Min
                                    </button>
                                </div>

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
                                        <input type="range" min={300} max={2500} step={100} value={2800 - speed}
                                            onChange={e => setSpeed(2800 - Number(e.target.value))}
                                            className="w-20 accent-amber-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Tree visualization */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4 min-h-[200px]">
                                {renderBinomialQueue()}
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[
                                    ['Trees', currentState.trees.length],
                                    ['Total Nodes', getTotalNodes(currentState.trees)],
                                    ['Ranks', currentState.trees.map(t => t.rank).join(',') || '—'],
                                ].map(([label, val]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className="text-lg font-bold text-amber-400">{val}</div>
                                        <div className="text-xs text-slate-400">{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Binary representation */}
                            {currentState.trees.length > 0 && (() => {
                                const maxRank = Math.max(...currentState.trees.map(t => t.rank));
                                const bits = Array.from({ length: maxRank + 1 }, (_, i) => currentState.trees.some(t => t.rank === i) ? '1' : '0').reverse();
                                return (
                                    <div className="mb-4 bg-slate-800/60 rounded-lg px-4 py-3">
                                        <p className="text-xs text-slate-400 mb-1">Binary representation of element count</p>
                                        <div className="flex gap-1 items-end">
                                            {bits.map((b, i) => (
                                                <div key={i} className={`w-7 h-7 flex items-center justify-center rounded text-sm font-mono font-bold ${b === '1' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-700 text-slate-500'}`}>{b}</div>
                                            ))}
                                            <span className="text-slate-500 text-xs ml-2">= {getTotalNodes(currentState.trees)} nodes</span>
                                        </div>
                                    </div>
                                );
                            })()}

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
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-4">Complexity</h2>
                            <div className="grid grid-cols-2 gap-3 text-center">
                                {[['Insert', 'O(1)*'], ['Extract Min', 'O(log n)'], ['Find Min', 'O(log n)'], ['Merge', 'O(log n)']].map(([op, c]) => (
                                    <div key={op} className="bg-slate-800/60 rounded-lg p-3">
                                        <div className="text-base font-bold text-amber-400">{c}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">* amortized</p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Binomial Tree B<sub>k</sub></h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>B<sub>0</sub></strong> is a single node; <strong>B<sub>k</sub></strong> = two B<sub>k-1</sub> trees linked together</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span>Exactly <strong>2<sup>k</sup> nodes</strong> and height <strong>k</strong></span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span>Root has <strong>k children</strong>: B<sub>k-1</sub>, B<sub>k-2</sub>, …, B<sub>0</sub></span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span>Min-heap property: every parent ≤ its children</span></li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Binary Addition Analogy</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span>Each rank is a <strong>bit position</strong> — at most one tree per rank</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span>Two B<sub>k</sub> trees merge into B<sub>k+1</sub> — a <strong>carry</strong></span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span>Insert = adding 1 in binary to the node count</span></li>
                            </ul>
                            <div className="mt-3 bg-slate-800/60 rounded-lg px-4 py-3 font-mono text-xs text-amber-300">
                                5 nodes = 101₂ → B₀ + B₂<br />
                                +1 insert → 110₂ → B₁ + B₂
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
