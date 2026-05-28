"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, TreePine, Info, SkipBack, SkipForward, Play, Pause, RotateCcw, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

// ─── BST helpers ──────────────────────────────────────────────────────────────

function insertNode(root, val) {
    if (!root) return { val, left: null, right: null };
    if (val < root.val) return { ...root, left: insertNode(root.left, val) };
    if (val > root.val) return { ...root, right: insertNode(root.right, val) };
    return root;
}

function buildTree(vals) {
    let t = null;
    for (const v of vals) t = insertNode(t, v);
    return t;
}

function nodeCount(node) {
    if (!node) return 0;
    return 1 + nodeCount(node.left) + nodeCount(node.right);
}

function treeHeight(node) {
    if (!node) return 0;
    return 1 + Math.max(treeHeight(node.left), treeHeight(node.right));
}

// Inorder layout: x positions are inorder index × spacing, y is depth × spacing
function computeLayout(node, depth = 0, counter = { n: 0 }, xGap = 64) {
    if (!node) return { pos: {}, edges: [] };
    const left = computeLayout(node.left, depth + 1, counter, xGap);
    const x = counter.n * xGap + xGap / 2;
    const y = depth * 80 + 50;
    counter.n++;
    const right = computeLayout(node.right, depth + 1, counter, xGap);

    const pos = { ...left.pos, [node.val]: { x, y }, ...right.pos };
    const edges = [...left.edges, ...right.edges];
    if (node.left) edges.push({ from: node.val, to: node.left.val });
    if (node.right) edges.push({ from: node.val, to: node.right.val });
    return { pos, edges };
}

// ─── Step generators ──────────────────────────────────────────────────────────

function genSearch(tree, target) {
    const steps = [];
    let cur = tree;
    const visited = [];
    steps.push({ tree, visited: [], current: tree?.val, phase: 'start', explanation: `Start at root (${tree?.val}). Searching for ${target}.` });
    while (cur) {
        visited.push(cur.val);
        if (target === cur.val) {
            steps.push({ tree, visited: [...visited], current: cur.val, phase: 'found', explanation: `✓ Found ${target}!` });
            return steps;
        } else if (target < cur.val) {
            steps.push({ tree, visited: [...visited], current: cur.val, phase: 'comparing', explanation: `${target} < ${cur.val} → go left` });
            cur = cur.left;
        } else {
            steps.push({ tree, visited: [...visited], current: cur.val, phase: 'comparing', explanation: `${target} > ${cur.val} → go right` });
            cur = cur.right;
        }
    }
    steps.push({ tree, visited: [...visited], current: null, phase: 'not_found', explanation: `Reached null — ${target} is not in the tree.` });
    return steps;
}

function genInsert(tree, val) {
    const steps = [];
    let cur = tree;
    const visited = [];
    if (!tree) {
        const newTree = insertNode(null, val);
        steps.push({ tree: newTree, visited: [val], current: val, phase: 'inserted', explanation: `Tree is empty → ${val} becomes the root.` });
        return steps;
    }
    steps.push({ tree, visited: [], current: tree.val, phase: 'start', explanation: `Start at root (${tree.val}). Inserting ${val}.` });
    while (cur) {
        visited.push(cur.val);
        if (val === cur.val) {
            steps.push({ tree, visited: [...visited], current: cur.val, phase: 'found', explanation: `${val} already exists — BST does not allow duplicates.` });
            return steps;
        } else if (val < cur.val) {
            if (!cur.left) {
                const newTree = insertNode(tree, val);
                steps.push({ tree: newTree, visited: [...visited, val], current: val, phase: 'inserted', explanation: `${val} < ${cur.val} and left child is null → insert ${val} here!` });
                return steps;
            }
            steps.push({ tree, visited: [...visited], current: cur.val, phase: 'comparing', explanation: `${val} < ${cur.val} → go left` });
            cur = cur.left;
        } else {
            if (!cur.right) {
                const newTree = insertNode(tree, val);
                steps.push({ tree: newTree, visited: [...visited, val], current: val, phase: 'inserted', explanation: `${val} > ${cur.val} and right child is null → insert ${val} here!` });
                return steps;
            }
            steps.push({ tree, visited: [...visited], current: cur.val, phase: 'comparing', explanation: `${val} > ${cur.val} → go right` });
            cur = cur.right;
        }
    }
    return steps;
}

// ─── Tree SVG ─────────────────────────────────────────────────────────────────

function TreeSVG({ tree, visited, current, phase }) {
    if (!tree) return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Empty tree</div>;

    const n = nodeCount(tree);
    const h = treeHeight(tree);
    const xGap = Math.max(48, Math.min(80, 560 / n));
    const { pos, edges } = computeLayout(tree, 0, { n: 0 }, xGap);
    const svgW = n * xGap;
    const svgH = h * 80 + 40;

    function fillColor(v) {
        if (phase === 'found' && v === current) return '#22c55e';
        if (phase === 'inserted' && v === current) return '#84cc16';
        if (phase === 'not_found' && visited.includes(v)) return '#ef4444';
        if (v === current) return '#fbbf24';
        if (visited.includes(v)) return '#6366f1';
        return '#1e293b';
    }
    function strokeColor(v) {
        if (v === current) return '#fde68a';
        if (visited.includes(v)) return '#818cf8';
        return '#475569';
    }
    function textColor(v) {
        const f = fillColor(v);
        return f === '#1e293b' ? '#e2e8f0' : '#0f172a';
    }

    return (
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" className="overflow-visible">
            {edges.map((e, i) => {
                const p1 = pos[e.from]; const p2 = pos[e.to];
                if (!p1 || !p2) return null;
                return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#334155" strokeWidth="2" />;
            })}
            {Object.entries(pos).map(([val, { x, y }]) => {
                const v = +val;
                const isActive = v === current;
                return (
                    <g key={val} transform={`translate(${x},${y})`} style={{ transition: 'transform 0.4s ease' }}>
                        <circle r={isActive ? 22 : 20} fill={fillColor(v)} stroke={strokeColor(v)} strokeWidth={isActive ? 2.5 : 1.5}
                            style={{ transition: 'fill 0.35s ease, r 0.2s ease' }} />
                        <text textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700" fill={textColor(v)}>
                            {val}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const QUIZ = [
    {
        question: 'What is the average-case time complexity of BST search?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correct: 1,
        explanation: 'In a balanced BST, each step halves the remaining search space → O(log n). A degenerate (sorted-insertion) tree degrades to O(n).',
    },
    {
        question: 'You insert values [1, 2, 3, 4, 5] into a BST. What is the resulting shape?',
        options: ['A balanced complete tree', 'A right-skewed linked list', 'A left-skewed linked list', 'A random shape'],
        correct: 1,
        explanation: 'Inserting already-sorted values always follows the right child, producing a right-skewed degenerate tree — the BST worst case.',
    },
    {
        question: 'Where is the minimum element in a BST always located?',
        options: ['The root', 'A random leaf', 'The leftmost node', 'The rightmost node'],
        correct: 2,
        explanation: 'Every left child is smaller than its parent. Following left pointers to the end always yields the minimum.',
    },
];

function QuizPanel({ qs, setQs }) {
    if (qs.complete) return (
        <div className="text-center py-4">
            <p className="text-white font-bold text-lg mb-1">{qs.score}/{QUIZ.length} correct</p>
            <p className="text-slate-400 text-sm mb-4">{qs.score === QUIZ.length ? 'Perfect!' : 'Keep practising!'}</p>
            <button onClick={() => setQs({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                className="px-4 py-2 bg-lime-600 hover:bg-lime-500 text-white rounded-lg text-sm transition-colors">
                Retry
            </button>
        </div>
    );
    const q = QUIZ[qs.current];
    return (
        <div className="space-y-3">
            <p className="text-slate-200 text-sm font-medium leading-snug">{q.question}</p>
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
            {qs.answered && (
                <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-300 leading-relaxed">{q.explanation}</div>
            )}
            {qs.answered && (
                <button onClick={() => { if (qs.current + 1 >= QUIZ.length) setQs(s => ({ ...s, complete: true })); else setQs(s => ({ ...s, current: s.current + 1, selected: null, answered: false })); }}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs transition-colors">
                    {qs.current + 1 >= QUIZ.length ? 'See results' : 'Next question →'}
                </button>
            )}
            <p className="text-slate-500 text-xs text-right">{qs.current + 1} / {QUIZ.length}</p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DEFAULT_VALS = [50, 30, 70, 20, 40, 60, 80];
const INSERT_PRESETS = [10, 35, 55, 65, 90, 15, 45, 25, 75];
const SEARCH_PRESETS = [20, 40, 60, 80, 35, 99];

export default function BSTPage() {
    const [tree, setTree] = useState(() => buildTree(DEFAULT_VALS));
    const [operation, setOperation] = useState('search');
    const [targetVal, setTargetVal] = useState(40);
    const [inputStr, setInputStr] = useState('40');
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [qs, setQs] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const insertIdx = useRef(0);
    const searchIdx = useRef(0);

    const regen = useCallback(() => {
        const steps = operation === 'search' ? genSearch(tree, targetVal) : genInsert(tree, targetVal);
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    }, [tree, operation, targetVal]);

    useEffect(() => { regen(); }, [regen]);

    useEffect(() => {
        if (!isPlaying || !stepHistory.length) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const cur = stepHistory[currentStep] ?? { tree, visited: [], current: null, phase: 'start', explanation: '' };

    function pickNextTarget(op) {
        if (op === 'insert') {
            const v = INSERT_PRESETS[insertIdx.current % INSERT_PRESETS.length];
            insertIdx.current++;
            return v;
        }
        const v = SEARCH_PRESETS[searchIdx.current % SEARCH_PRESETS.length];
        searchIdx.current++;
        return v;
    }

    function handleShuffle() {
        const newTree = buildTree(DEFAULT_VALS);
        setTree(newTree);
        const v = pickNextTarget(operation);
        setTargetVal(v);
        setInputStr(String(v));
    }

    function handleApplyInsert() {
        if (cur.phase === 'inserted' && cur.tree) {
            setTree(cur.tree);
            const v = pickNextTarget('insert');
            setTargetVal(v);
            setInputStr(String(v));
        }
    }

    function commitInput(str) {
        const n = parseInt(str, 10);
        if (!isNaN(n)) setTargetVal(n);
    }

    const phaseAccent = cur.phase === 'found' || cur.phase === 'inserted' ? 'lime' : cur.phase === 'not_found' ? 'red' : 'yellow';

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-600 to-green-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/trees" className="flex items-center text-white hover:text-lime-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Trees
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <TreePine className="h-10 w-10" />Binary Search Tree
                        </h1>
                        <p className="text-xl text-lime-100 mb-6 max-w-3xl mx-auto">
                            Left subtree holds smaller values, right holds larger.
                            This ordering enables O(log n) search, insert, and delete on a balanced tree.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Avg: O(log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Worst: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Intermediate</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Visualization */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Controls */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex rounded-lg border border-slate-700 overflow-hidden text-sm">
                                    {['search', 'insert'].map(op => (
                                        <button key={op} onClick={() => { setOperation(op); const v = pickNextTarget(op); setTargetVal(v); setInputStr(String(v)); }}
                                            className={`px-4 py-1.5 capitalize transition-colors font-medium ${operation === op ? 'bg-lime-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                            {op}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-sm">Value:</span>
                                    <input type="number" value={inputStr}
                                        onChange={e => setInputStr(e.target.value)}
                                        onBlur={e => commitInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && commitInput(inputStr)}
                                        className="w-20 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm text-center focus:outline-none focus:border-lime-500" />
                                </div>
                                <div className="flex items-center gap-1.5 ml-auto">
                                    <button onClick={() => setCurrentStep(0)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Go to start"><SkipBack className="h-4 w-4" /></button>
                                    <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"><SkipBack className="h-3 w-3" /></button>
                                    <button onClick={() => setIsPlaying(p => !p)} className="p-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white transition-colors">
                                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    </button>
                                    <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"><SkipForward className="h-3 w-3" /></button>
                                    <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Reset"><RotateCcw className="h-4 w-4" /></button>
                                    <button onClick={handleShuffle} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="New tree"><Shuffle className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 w-8">Fast</span>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(+e.target.value)} className="flex-1 accent-lime-500" />
                                <span className="text-xs text-slate-500 w-8">Slow</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                    <div className="bg-lime-500 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${stepHistory.length > 1 ? (currentStep / (stepHistory.length - 1)) * 100 : 0}%` }} />
                                </div>
                                <span className="text-xs text-slate-500 whitespace-nowrap">{currentStep + 1} / {stepHistory.length}</span>
                            </div>
                        </div>

                        {/* Tree SVG */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6 min-h-72 overflow-x-auto">
                            <TreeSVG tree={cur.tree ?? tree} visited={cur.visited ?? []} current={cur.current} phase={cur.phase ?? 'start'} />
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 text-xs text-slate-400 px-1">
                            {[['bg-slate-700', 'Unvisited'], ['bg-yellow-400', 'Comparing'], ['bg-indigo-500', 'Path taken'], ['bg-green-500', 'Found / Inserted'], ['bg-red-500', 'Not found path']].map(([c, l]) => (
                                <span key={l} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded-full ${c}`} />{l}</span>
                            ))}
                        </div>

                        {/* Explanation */}
                        <div className={`bg-${phaseAccent}-500/10 border border-${phaseAccent}-500/20 rounded-lg p-4`}>
                            <div className="flex items-start gap-2">
                                <Info className={`h-4 w-4 text-${phaseAccent}-400 mt-0.5 flex-shrink-0`} />
                                <p className={`text-${phaseAccent}-300 text-sm leading-relaxed`}>{cur.explanation}</p>
                            </div>
                        </div>

                        {/* Apply insert */}
                        {operation === 'insert' && cur.phase === 'inserted' && (
                            <button onClick={handleApplyInsert}
                                className="w-full py-2.5 bg-lime-600 hover:bg-lime-500 text-white rounded-lg text-sm font-medium transition-colors">
                                Keep this tree → insert next value
                            </button>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <h3 className="text-white font-semibold text-sm mb-3">Implementation</h3>
                            <CodeBlock language="python" code={`class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def search(node, val):
    if not node:
        return False       # not found
    if val == node.val:
        return True        # found!
    elif val < node.val:
        return search(node.left, val)
    else:
        return search(node.right, val)

def insert(node, val):
    if not node:
        return Node(val)
    if val < node.val:
        node.left = insert(node.left, val)
    elif val > node.val:
        node.right = insert(node.right, val)
    return node`} />
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
