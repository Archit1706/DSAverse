'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ArrowLeft, Plus, Minus, Eye, SkipBack, SkipForward, Info, CheckCircle, XCircle, Code, Zap } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What is the amortized time complexity of inserting into a Fibonacci heap?",
        options: ["O(log n)", "O(n)", "O(1)", "O(√n)"],
        correct: 2,
        explanation: "Insert is O(1) amortized — the new node is simply added to the root list as a singleton tree. No consolidation happens until extract-min. The lazy approach makes insert extremely fast."
    },
    {
        question: "When does consolidation (linking trees of equal degree) happen in a Fibonacci heap?",
        options: ["After every insert", "After every decrease-key", "Only during extract-min", "Periodically in the background"],
        correct: 2,
        explanation: "Consolidation is deferred until extract-min. This lazy strategy is why insert and decrease-key are O(1) — all expensive work is batched into the extract-min call, which runs in O(log n) amortized."
    },
    {
        question: "Compared to a binary heap, what operation gives the Fibonacci heap a decisive advantage in Dijkstra's algorithm?",
        options: ["Insert O(1) vs O(log n)", "Extract-min O(log n) vs O(log n)", "Decrease-key O(1) vs O(log n)", "Build heap O(n) vs O(n)"],
        correct: 2,
        explanation: "Decrease-key is O(1) amortized in a Fibonacci heap vs O(log n) in a binary heap. Since Dijkstra's calls decrease-key E times and extract-min V times, the total becomes O(E + V log V) instead of O((E + V) log V)."
    }
];

export default function FibonacciHeapsPage() {
    const [roots, setRoots] = useState([]);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [nodeIdCounter, setNodeIdCounter] = useState(1);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const cloneRoots = (list) => JSON.parse(JSON.stringify(list));
    const getMin = (list) => list.length === 0 ? null : list.reduce((m, n) => n.key < m.key ? n : m, list[0]);
    const snap = (list, explanation, phase = 'info', highlightedIds = []) => ({ roots: cloneRoots(list), explanation, phase, highlightedIds });

    const generateSteps = (operation, value = null) => {
        const steps = [];
        let cur = cloneRoots(roots);

        if (operation === 'insert') {
            const newNode = { id: nodeIdCounter + Math.random(), key: value, degree: 0, children: [] };
            steps.push(snap(cur, `Create a singleton tree with key ${value}. In a Fibonacci heap, insert is lazy — just append to the root list.`, 'create', [newNode.id]));
            cur.push(newNode);
            const min = getMin(cur);
            steps.push(snap(cur, `Inserted ${value} into root list. Root list now has ${cur.length} tree(s). Current minimum: ${min ? min.key : 'none'}. O(1) amortized.`, 'complete', [newNode.id]));
        }

        if (operation === 'peekMin') {
            const min = getMin(cur);
            if (!min) {
                steps.push(snap(cur, 'Heap is empty — no minimum to show.', 'error'));
            } else {
                steps.push(snap(cur, `Current minimum is ${min.key}. Finding minimum is O(1) — just follow the min pointer.`, 'complete', [min.id]));
            }
        }

        if (operation === 'extractMin') {
            const min = getMin(cur);
            if (!min) {
                steps.push(snap(cur, 'Heap is empty. Cannot extract minimum.', 'error'));
                return steps;
            }

            steps.push(snap(cur, `Identify minimum root: ${min.key}. Remove it and promote its children to the root list.`, 'identify', [min.id]));

            cur = cur.filter(n => n.id !== min.id);
            steps.push(snap(cur, `Removed root ${min.key} from root list.`, 'remove'));

            if (min.children.length > 0) {
                const promoted = min.children.map(c => ({ ...c }));
                cur.push(...promoted);
                steps.push(snap(cur, `Promoted ${promoted.length} child tree(s) of ${min.key} to root list. Root list now has ${cur.length} tree(s).`, 'promote', promoted.map(c => c.id)));
            }

            // Consolidation
            steps.push(snap(cur, `Begin consolidation: link trees of equal degree (like binomial queue merge) until all degrees are unique.`, 'consolidate'));

            const degTable = new Map();
            const queue = [...cur];
            cur = [];

            while (queue.length > 0) {
                let x = queue.shift();
                while (degTable.has(x.degree)) {
                    let y = degTable.get(x.degree);
                    degTable.delete(x.degree);
                    if (y.key < x.key) [x, y] = [y, x];
                    steps.push(snap(
                        [...degTable.values(), ...queue, x, y],
                        `Link degree-${x.degree} trees: ${y.key} becomes child of ${x.key} (smaller key wins). Degree of ${x.key} increases to ${x.degree + 1}.`,
                        'link', [x.id, y.id]
                    ));
                    x.children.push(y);
                    x.degree += 1;
                }
                degTable.set(x.degree, x);
            }

            cur = [...degTable.values()];
            const newMin = getMin(cur);
            steps.push(snap(cur, `Consolidation complete. Root list now has ${cur.length} tree(s) with unique degrees. New minimum: ${newMin ? newMin.key : 'none'}.`, 'complete', newMin ? [newMin.id] : []));
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
        if (!isPlaying || !stepHistory.length) return;
        if (currentStep >= stepHistory.length - 1) {
            setRoots(stepHistory[stepHistory.length - 1].roots);
            setIsPlaying(false);
            return;
        }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setRoots([]); setStepHistory([]); setCurrentStep(0); setIsPlaying(false); };

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
        roots,
        explanation: 'Insert several values, then try Extract Min to see consolidation in action.',
        phase: '',
        highlightedIds: []
    };

    const minNode = getMin(currentState.roots);

    // Render a tree rooted at `node` as nested SVG elements
    // Returns [elements, totalWidth]
    const renderTreeSVG = (node, x, y, highlightedIds, isHighlight) => {
        const R = 18;
        const VGAP = 52;
        const HGAP = 44;

        const measure = (n) => Math.max(R * 2 + 4, n.children.reduce((w, c) => w + measure(c) + 4, 0));

        const draw = (n, cx, cy) => {
            const elems = [];
            const isHL = highlightedIds.includes(n.id);
            const isMinNode = minNode && n.id === minNode.id;
            const fill = isHL ? '#eab308' : isMinNode ? '#22c55e' : '#334155';
            const stroke = isHL ? '#ca8a04' : isMinNode ? '#16a34a' : '#475569';
            const textFill = (isHL || isMinNode) ? '#1e293b' : '#f1f5f9';

            let childX = cx - (n.children.reduce((w, c) => w + measure(c) + 4, -4)) / 2;
            n.children.forEach(child => {
                const cw = measure(child);
                const childCX = childX + cw / 2;
                elems.push(<line key={`e-${n.id}-${child.id}`} x1={cx} y1={cy + R} x2={childCX} y2={cy + VGAP - R} stroke="#475569" strokeWidth="1.5" />);
                elems.push(...draw(child, childCX, cy + VGAP));
                childX += cw + 4;
            });

            elems.push(
                <g key={`nd-${n.id}`}>
                    <circle cx={cx} cy={cy} r={R} fill={fill} stroke={stroke} strokeWidth="2" />
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill={textFill}>{n.key}</text>
                    <text x={cx} y={cy + R + 10} textAnchor="middle" fontSize="8" fill="#64748b">d={n.degree}</text>
                    {isMinNode && <text x={cx} y={cy - R - 6} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#4ade80">MIN</text>}
                </g>
            );
            return elems;
        };

        return draw(node, x, y);
    };

    const renderRootList = () => {
        const rs = currentState.roots;
        if (rs.length === 0) {
            return <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Empty heap — insert values to begin</div>;
        }

        const TREE_GAP = 50;
        const VGAP = 52;
        const measure = (n) => Math.max(40, n.children.reduce((w, c) => w + measure(c) + 4, 0));
        const treeH = (n) => n.children.length === 0 ? 50 : 50 + VGAP * Math.max(...n.children.map(c => Math.ceil(Math.log2(Math.pow(2, c.degree) + 1) + 1)));

        const treeWidths = rs.map(measure);
        const totalW = treeWidths.reduce((s, w) => s + w, 0) + TREE_GAP * (rs.length + 1);
        const svgW = Math.max(380, totalW);
        const svgH = Math.max(120, Math.max(...rs.map(treeH)) + 60);

        let curX = TREE_GAP;
        return (
            <div className="overflow-x-auto">
                <svg width={svgW} height={svgH} style={{ display: 'block', margin: '0 auto' }}>
                    {/* Root list connector line */}
                    <line x1={20} y1={40} x2={svgW - 20} y2={40} stroke="#334155" strokeWidth="1" strokeDasharray="4,3" />
                    <text x={14} y={44} fontSize="9" fill="#475569">root list</text>

                    {rs.map((node, idx) => {
                        const tw = treeWidths[idx];
                        const cx = curX + tw / 2;
                        const elems = renderTreeSVG(node, cx, 70, currentState.highlightedIds, true);
                        // connector dot on root list line
                        elems.unshift(<line key={`cl-${node.id}`} x1={cx} y1={40} x2={cx} y2={52} stroke="#475569" strokeWidth="1.5" />);
                        curX += tw + TREE_GAP;
                        return elems;
                    })}
                </svg>
            </div>
        );
    };

    const codeExample = `class FibNode:
    def __init__(self, key):
        self.key = key
        self.degree = 0
        self.parent = None
        self.children = []
        self.marked = False  # for decrease-key

class FibonacciHeap:
    def __init__(self):
        self.root_list = []
        self.min_node = None
        self.n = 0

    def insert(self, key):
        """O(1) — just add to root list"""
        node = FibNode(key)
        self.root_list.append(node)
        if not self.min_node or key < self.min_node.key:
            self.min_node = node
        self.n += 1
        return node

    def find_min(self):
        """O(1) — follow min pointer"""
        return self.min_node.key if self.min_node else None

    def extract_min(self):
        """O(log n) amortized — includes consolidation"""
        z = self.min_node
        if z is None: return None

        # Promote children of min to root list
        for child in z.children:
            child.parent = None
            self.root_list.append(child)

        self.root_list.remove(z)
        self.n -= 1

        if not self.root_list:
            self.min_node = None
        else:
            self._consolidate()

        return z.key

    def _consolidate(self):
        """Link trees of equal degree until all degrees unique"""
        max_degree = int(self.n ** 0.5) + 2
        A = [None] * max_degree

        for root in list(self.root_list):
            x = root
            d = x.degree
            while A[d] is not None:
                y = A[d]
                if x.key > y.key:
                    x, y = y, x
                # Link y under x
                self.root_list.remove(y)
                x.children.append(y)
                y.parent = x
                x.degree += 1
                A[d] = None
                d += 1
            A[d] = x

        self.min_node = min(self.root_list, key=lambda n: n.key)

    def decrease_key(self, node, new_key):
        """O(1) amortized — the key advantage over binary heaps"""
        node.key = new_key
        parent = node.parent
        if parent and node.key < parent.key:
            self._cut(node, parent)
            self._cascading_cut(parent)
        if node.key < self.min_node.key:
            self.min_node = node

    def _cut(self, node, parent):
        parent.children.remove(node)
        parent.degree -= 1
        node.parent = None
        node.marked = False
        self.root_list.append(node)

    def _cascading_cut(self, node):
        p = node.parent
        if p:
            if not node.marked:
                node.marked = True
            else:
                self._cut(node, p)
                self._cascading_cut(p)`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/heap-like-data-structures" className="inline-flex items-center text-amber-100 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Heap Data Structures
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Fibonacci Heap</h1>
                        <p className="text-xl text-amber-100 max-w-3xl mx-auto">
                            A lazy heap that defers all restructuring to extract-min. Insert and decrease-key
                            run in O(1) amortized — critical for fast graph algorithms.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* ── Left: Visualization ── */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-5">Root List Visualization</h2>

                            <div className="space-y-3 mb-5">
                                <div className="flex flex-wrap gap-2">
                                    <input type="number" value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && inputValue !== '') {
                                                runOperation('insert', Number(inputValue));
                                                setNodeIdCounter(v => v + 1);
                                                setInputValue('');
                                            }
                                        }}
                                        placeholder="Enter key"
                                        className="w-36 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500" />
                                    <button onClick={() => {
                                        if (inputValue === '') return;
                                        runOperation('insert', Number(inputValue));
                                        setNodeIdCounter(v => v + 1);
                                        setInputValue('');
                                    }} disabled={isPlaying}
                                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Plus className="h-4 w-4" /> Insert
                                    </button>
                                    <button onClick={() => runOperation('peekMin')} disabled={isPlaying || roots.length === 0}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Eye className="h-4 w-4" /> Peek Min
                                    </button>
                                    <button onClick={() => runOperation('extractMin')} disabled={isPlaying || roots.length === 0}
                                        className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Minus className="h-4 w-4" /> Extract Min
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
                                        <input type="range" min={200} max={2000} step={100} value={2200 - speed}
                                            onChange={e => setSpeed(2200 - Number(e.target.value))}
                                            className="w-20 accent-amber-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Root list tree visualization */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4 min-h-[160px]">
                                {renderRootList()}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[
                                    ['Root Trees', currentState.roots.length],
                                    ['Min Key', minNode ? minNode.key : '—'],
                                    ['Total Nodes', currentState.roots.reduce((s, r) => s + 1 + r.children.length, 0)],
                                ].map(([label, val]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className="text-lg font-bold text-amber-400">{val}</div>
                                        <div className="text-xs text-slate-400">{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="flex gap-4 mb-4 text-xs text-slate-400">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Minimum node</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> Active step</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-600 inline-block" /> Regular node</span>
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
                                {[['Insert', 'O(1)', true], ['Peek Min', 'O(1)', true], ['Extract Min', 'O(log n)*', false], ['Decrease Key', 'O(1)*', true], ['Merge', 'O(1)', true], ['Space', 'O(n)', false]].map(([op, c, good]) => (
                                    <div key={op} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className={`text-base font-bold ${good ? 'text-emerald-400' : 'text-amber-400'}`}>{c}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">* amortized — O(log n) worst case for extract-min</p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Key Properties</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Lazy insert</strong> — new nodes go straight to root list, O(1)</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Deferred consolidation</strong> — linking only happens during extract-min</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Degree bound</strong> — after consolidation, max degree is O(log n)</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Min pointer</strong> — always tracks the root with the smallest key</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Marked nodes</strong> — track which non-root nodes have lost a child (for decrease-key cascading cuts)</span></li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="h-5 w-5 text-amber-400" />
                                <h2 className="text-lg font-bold text-slate-100">Why It Matters</h2>
                            </div>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Dijkstra's</strong> — O(E + V log V) with Fibonacci heap vs O((E+V) log V) with binary heap</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong>Prim's MST</strong> — same improvement for dense graphs</span></li>
                                <li className="flex gap-2"><span className="text-amber-400">•</span><span>Primarily <strong>theoretical value</strong> — large constants make binary heaps faster in practice for typical n</span></li>
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
