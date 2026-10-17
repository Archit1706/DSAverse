"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, ListTree, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import BTreeCanvas from '@/components/BTreeCanvas';

const quizQuestions = [
    {
        question: 'When a B-tree node overflows, where does the median key go?',
        options: [
            'It stays in the left half',
            'It is promoted into the parent node',
            'It is pushed down into a new leaf',
            'It is discarded and reinserted later',
        ],
        correct: 1,
        explanation: 'The median moves up into the parent, and the remaining keys become two siblings on either side of it. This is why a B-tree grows at the root rather than at the leaves — and why every leaf stays at exactly the same depth.',
    },
    {
        question: 'Why are B-tree nodes made wide rather than binary?',
        options: [
            'Wide nodes use less memory per key',
            'A wider node sorts its keys faster',
            'One disk or cache block costs the same whether you read 1 key or 200, so fanout buys depth for free',
            'Binary trees cannot be kept balanced',
        ],
        correct: 2,
        explanation: 'Reading a block is the unit of cost. Packing hundreds of keys into one block means a tree of a few levels can index millions of records — three block reads instead of twenty pointer-chases down a binary tree.',
    },
    {
        question: 'What guarantees every leaf of a B-tree sits at the same depth?',
        options: [
            'Rebalancing rotations after each insert',
            'The tree only ever grows by splitting the root upward',
            'Keys are inserted in sorted order',
            'A periodic rebuild of the whole tree',
        ],
        correct: 1,
        explanation: 'Splits push a key up, never down. Depth changes only when the root itself splits, which lengthens every root-to-leaf path at once — so the tree is perfectly height-balanced by construction.',
    },
];

const ORDER = 4;                    // max ORDER-1 = 3 keys per node
const MAX_KEYS = ORDER - 1;
const DEFAULT_KEYS = [10, 20, 5, 6, 12, 30, 7, 17];

let idCounter = 0;
const mkNode = (keys = [], children = []) => ({ id: `n${idCounter++}`, keys, children });
const clone = (n) => n ? { id: n.id, keys: [...n.keys], children: n.children.map(clone) } : null;

const generateSteps = (keys) => {
    idCounter = 0;
    const steps = [];
    let root = mkNode();

    const push = (data, explanation) => steps.push({ tree: clone(root), ...data, explanation });

    push({ activeId: null, splitId: null, activeKey: null },
        `An empty B-tree of order ${ORDER}: every node holds at most ${MAX_KEYS} keys and, once it has children, one more child than keys.`);

    for (const key of keys) {
        // Descend to a leaf, remembering the path so splits can walk back up.
        const path = [];
        let cur = root;

        push({ activeId: root.id, splitId: null, activeKey: key },
            `Insert ${key}. Start at the root and descend — a B-tree insert always lands in a leaf.`);

        while (cur.children.length > 0) {
            let i = 0;
            while (i < cur.keys.length && key > cur.keys[i]) i++;
            path.push({ node: cur, index: i });
            const next = cur.children[i];

            const bound = i === 0
                ? `${key} < ${cur.keys[0]}`
                : i === cur.keys.length
                    ? `${key} > ${cur.keys[cur.keys.length - 1]}`
                    : `${cur.keys[i - 1]} < ${key} < ${cur.keys[i]}`;

            cur = next;
            push({ activeId: cur.id, splitId: null, activeKey: key },
                `${bound}, so follow child ${i} down to the next level.`);
        }

        // Place the key in the leaf.
        cur.keys.push(key);
        cur.keys.sort((a, b) => a - b);
        push({ activeId: cur.id, splitId: null, activeKey: key },
            cur.keys.length <= MAX_KEYS
                ? `${key} slots into the leaf in sorted order. The node holds ${cur.keys.length} of ${MAX_KEYS} keys — no split needed.`
                : `${key} goes in, but the node now holds ${cur.keys.length} keys, one over the limit of ${MAX_KEYS}. It has to split.`);

        // Split upward while nodes overflow.
        while (cur.keys.length > MAX_KEYS) {
            const mid = Math.floor(cur.keys.length / 2);
            const median = cur.keys[mid];
            const leftKeys = cur.keys.slice(0, mid);
            const rightKeys = cur.keys.slice(mid + 1);
            const hasKids = cur.children.length > 0;
            const leftKids = hasKids ? cur.children.slice(0, mid + 1) : [];
            const rightKids = hasKids ? cur.children.slice(mid + 1) : [];

            push({ activeId: null, splitId: cur.id, activeKey: median },
                `Split: ${median} is the median. [${leftKeys.join(', ')}] stays on the left, [${rightKeys.join(', ')}] becomes a new right sibling, and ${median} is promoted to the parent.`);

            const left = mkNode(leftKeys, leftKids);
            const right = mkNode(rightKeys, rightKids);
            const parentEntry = path.pop();

            if (!parentEntry) {
                root = mkNode([median], [left, right]);
                push({ activeId: root.id, splitId: null, activeKey: median },
                    `There was no parent, so ${median} becomes a new root. This is the only way a B-tree gets taller — and it lengthens every root-to-leaf path at once, so all leaves stay level.`);
                cur = root;
            } else {
                const parent = parentEntry.node;
                const at = parentEntry.index;
                parent.keys.splice(at, 0, median);
                parent.children.splice(at, 1, left, right);
                push({ activeId: parent.id, splitId: null, activeKey: median },
                    parent.keys.length <= MAX_KEYS
                        ? `${median} joins the parent, which now holds ${parent.keys.length} key${parent.keys.length === 1 ? '' : 's'} and ${parent.children.length} children. The split stops here.`
                        : `${median} joins the parent, pushing it to ${parent.keys.length} keys — so the parent splits too. Splits cascade upward.`);
                cur = parent;
            }
        }
    }

    const depth = (n) => n.children.length ? 1 + depth(n.children[0]) : 1;
    const count = (n) => n.keys.length + n.children.reduce((s, c) => s + count(c), 0);
    push({ activeId: null, splitId: null, activeKey: null },
        `${count(root)} keys stored in a tree of height ${depth(root)}. Every leaf is at the same depth, and a lookup touches exactly that many nodes — which on disk means that many block reads.`);

    return steps;
};

const BTreesPage = () => {
    const [keys, setKeys] = useState(DEFAULT_KEYS);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(keys));
        setCurrentStep(0);
    }, [keys]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };
    const randomize = () => {
        const n = Math.floor(Math.random() * 3) + 8;
        const pool = Array.from({ length: 40 }, (_, i) => i + 1);
        const picked = [];
        for (let i = 0; i < n; i++) picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
        setKeys(picked);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const s = stepHistory[currentStep] || { tree: null, activeId: null, splitId: null, activeKey: null, explanation: 'Click Play to begin' };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `class BTreeNode:
    def __init__(self, leaf=True):
        self.keys = []
        self.children = []
        self.leaf = leaf


class BTree:
    """Order-m B-tree: at most m-1 keys and m children per node."""

    def __init__(self, order=4):
        self.order = order
        self.root = BTreeNode()

    @property
    def max_keys(self):
        return self.order - 1

    def insert(self, key):
        # Split the root first so the descent never meets a full node.
        if len(self.root.keys) == self.max_keys:
            old = self.root
            self.root = BTreeNode(leaf=False)
            self.root.children.append(old)
            self._split_child(self.root, 0)
        self._insert_nonfull(self.root, key)

    def _split_child(self, parent, i):
        full = parent.children[i]
        mid = len(full.keys) // 2
        median = full.keys[mid]

        right = BTreeNode(leaf=full.leaf)
        right.keys = full.keys[mid + 1:]
        full.keys = full.keys[:mid]
        if not full.leaf:
            right.children = full.children[mid + 1:]
            full.children = full.children[:mid + 1]

        # The median moves UP -- this is why the tree grows at the root.
        parent.keys.insert(i, median)
        parent.children.insert(i + 1, right)

    def _insert_nonfull(self, node, key):
        if node.leaf:
            node.keys.append(key)
            node.keys.sort()
            return
        i = 0
        while i < len(node.keys) and key > node.keys[i]:
            i += 1
        if len(node.children[i].keys) == self.max_keys:
            self._split_child(node, i)
            if key > node.keys[i]:
                i += 1
        self._insert_nonfull(node.children[i], key)

    def search(self, key, node=None):
        node = self.root if node is None else node
        i = 0
        while i < len(node.keys) and key > node.keys[i]:
            i += 1
        if i < len(node.keys) and node.keys[i] == key:
            return node
        return None if node.leaf else self.search(key, node.children[i])`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/indexing" className="flex items-center text-white hover:text-emerald-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Indexing
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <ListTree className="h-10 w-10" />B-Trees
                        </h1>
                        <p className="text-xl text-emerald-100 mb-6 max-w-3xl mx-auto">
                            Wide nodes keep the tree shallow. When one overflows it splits, promoting its median key upward —
                            so the tree grows at the root and every leaf stays at the same depth.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Order {ORDER}</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Max {MAX_KEYS} keys/node</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Search: O(log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">All leaves level</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button onClick={() => setIsPlaying(p => !p)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium" disabled={currentStep >= stepHistory.length - 1 && !isPlaying}>
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => { if (currentStep > 0) setCurrentStep(p => p - 1); }} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium" disabled={isPlaying || currentStep === 0}><SkipBack size={18} />Step Back</button>
                                <button onClick={() => { if (currentStep < stepHistory.length - 1) setCurrentStep(p => p + 1); }} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium" disabled={isPlaying || currentStep >= stepHistory.length - 1}><SkipForward size={18} />Step Forward</button>
                                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"><RotateCcw size={18} />Reset</button>
                                <button onClick={randomize} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"><Shuffle size={18} />Randomize</button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Keys to insert, in order</label>
                                <input type="text" value={keys.join(', ')}
                                    onChange={e => {
                                        const v = e.target.value.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
                                        if (v.length > 0) setKeys([...new Set(v)].slice(0, 14));
                                    }}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                <p className="text-xs text-slate-500 mt-1">Duplicates are dropped — a B-tree index stores each key once.</p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="300" max="2200" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-emerald-500" />
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">{s.splitId ? 'Splitting' : s.activeKey !== null ? `Key ${s.activeKey}` : '—'}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Tree</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 min-h-[260px] flex items-center justify-center overflow-x-auto">
                                    <BTreeCanvas tree={s.tree} activeId={s.activeId} splitId={s.splitId} activeKey={s.activeKey} />
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-amber-600 inline-block" />visiting</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-red-900 inline-block border border-red-400" />splitting</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-amber-500 inline-block" />key in play</span>
                                </div>
                            </div>

                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-emerald-300 mb-1">Current Step</h3>
                                        <p className="text-emerald-200 text-sm leading-relaxed">{s.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4"><Clock className="h-5 w-5 text-emerald-500" /><h3 className="font-bold text-white">Complexity</h3></div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-300">Search:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(log n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Insert:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(log n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Delete:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(log n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(n)</code></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Grows upward:</strong> only a root split adds height</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Perfectly balanced</strong> by construction, no rotations</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Fanout beats depth:</strong> one block read per level</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Real orders</strong> are in the hundreds, not 4</span></li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : 'Keep practicing!'}</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium">Try Again</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-sm font-medium text-slate-200 mb-3">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((opt, i) => {
                                            let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                                            if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-white bg-slate-800/50';
                                            else if (i === quizQuestions[quizState.current].correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                                            return <button key={i} onClick={() => handleAnswer(i)} className={cls}>{opt}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQ} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium">
                                                {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python Code
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BTreesPage;
