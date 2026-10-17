"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, Table, Shuffle, MoveHorizontal } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import BTreeCanvas from '@/components/BTreeCanvas';

const quizQuestions = [
    {
        question: 'In a B+ tree, where do the actual records live?',
        options: [
            'Spread across internal nodes and leaves alike',
            'Only in the leaves; internal nodes hold separators',
            'Only in the root, with leaves holding pointers',
            'In a separate overflow area beside the tree',
        ],
        correct: 1,
        explanation: 'Internal nodes are pure routing — they hold separator keys only. Every record sits in a leaf. That is what lets internal nodes pack in more separators per block, keeping the tree shallower than an equivalent B-tree.',
    },
    {
        question: 'When a B+ tree leaf splits, what happens to the median key?',
        options: [
            'It moves up to the parent and leaves the leaves',
            'It is copied up, and the original stays in the right leaf',
            'It is duplicated into both leaves',
            'It is written to the overflow area',
        ],
        correct: 1,
        explanation: 'A leaf split copies the key up as a separator while keeping it in the right leaf. It has to stay — if it moved, that record would vanish from the leaf level, and the leaf level is the only place records exist. Internal splits still move the median.',
    },
    {
        question: 'Why is "SELECT … WHERE id BETWEEN 100 AND 200" fast on a B+ tree?',
        options: [
            'The separators let it skip straight to key 200',
            'Range queries are cached separately from point queries',
            'Find the first leaf, then follow the leaf links sideways — no climbing back up',
            'The tree re-sorts itself around the queried range',
        ],
        correct: 2,
        explanation: 'One descent locates the start of the range, then the linked leaves are read in order like an array. A plain B-tree would have to walk back up and down the tree between consecutive records, which is why B+ trees dominate database indexes.',
    },
];

const ORDER = 4;
const MAX_KEYS = ORDER - 1;
const DEFAULT_KEYS = [10, 20, 5, 6, 12, 30, 7, 17];

let idCounter = 0;
const mkNode = (keys = [], children = [], leaf = true) => ({ id: `p${idCounter++}`, keys, children, leaf });
const clone = (n) => n ? { id: n.id, keys: [...n.keys], children: n.children.map(clone), leaf: n.leaf } : null;

const leavesOf = (n) => n.leaf ? [n] : n.children.flatMap(leavesOf);

const generateSteps = (keys, range) => {
    idCounter = 0;
    const steps = [];
    let root = mkNode([], [], true);

    const push = (data, explanation) => steps.push({
        tree: clone(root), activeId: null, splitId: null, activeKey: null,
        foundKeys: [], scanRange: [], ...data, explanation,
    });

    push({}, `An empty B+ tree of order ${ORDER}. Every record will live in a leaf; internal nodes will hold nothing but separators pointing the way down.`);

    for (const key of keys) {
        const path = [];
        let cur = root;

        push({ activeId: root.id, activeKey: key },
            `Insert ${key}. Descend from the root — in a B+ tree every insert ends in a leaf, without exception.`);

        while (!cur.leaf) {
            let i = 0;
            while (i < cur.keys.length && key >= cur.keys[i]) i++;
            path.push({ node: cur, index: i });
            cur = cur.children[i];
            push({ activeId: cur.id, activeKey: key },
                `Separators route the descent: follow child ${i} to the next level. Internal keys are signposts, not records.`);
        }

        cur.keys.push(key);
        cur.keys.sort((a, b) => a - b);
        push({ activeId: cur.id, activeKey: key },
            cur.keys.length <= MAX_KEYS
                ? `${key} is stored in the leaf. The leaf holds ${cur.keys.length} of ${MAX_KEYS} records.`
                : `${key} goes in, but the leaf now holds ${cur.keys.length} records — one too many. It splits.`);

        // Leaf overflow: copy the median up, keep it in the right leaf.
        if (cur.keys.length > MAX_KEYS) {
            const mid = Math.floor(cur.keys.length / 2);
            const leftKeys = cur.keys.slice(0, mid);
            const rightKeys = cur.keys.slice(mid);
            const separator = rightKeys[0];

            push({ splitId: cur.id, activeKey: separator },
                `Leaf split: [${leftKeys.join(', ')}] and [${rightKeys.join(', ')}]. ${separator} is copied up as a separator — and stays in the right leaf, because a record may never leave the leaf level.`);

            const left = mkNode(leftKeys, [], true);
            const right = mkNode(rightKeys, [], true);
            let entry = path.pop();

            if (!entry) {
                root = mkNode([separator], [left, right], false);
                push({ activeId: root.id, activeKey: separator },
                    `A new root holds the separator ${separator}. Note it appears twice now: once as a signpost above, once as a record in the right leaf.`);
            } else {
                const parent = entry.node;
                parent.keys.splice(entry.index, 0, separator);
                parent.children.splice(entry.index, 1, left, right);
                push({ activeId: parent.id, activeKey: separator },
                    `${separator} joins the parent as a separator. The parent now has ${parent.keys.length} key${parent.keys.length === 1 ? '' : 's'}.`);

                // Internal overflow: median MOVES up (it is not a record).
                let node = parent;
                while (node.keys.length > MAX_KEYS) {
                    const m = Math.floor(node.keys.length / 2);
                    const median = node.keys[m];
                    const lKeys = node.keys.slice(0, m);
                    const rKeys = node.keys.slice(m + 1);
                    const lKids = node.children.slice(0, m + 1);
                    const rKids = node.children.slice(m + 1);

                    push({ splitId: node.id, activeKey: median },
                        `Internal split: ${median} moves up. Unlike a leaf split it is not copied — a separator is not a record, so nothing is lost by removing it from this level.`);

                    const l = mkNode(lKeys, lKids, false);
                    const r = mkNode(rKeys, rKids, false);
                    entry = path.pop();

                    if (!entry) {
                        root = mkNode([median], [l, r], false);
                        push({ activeId: root.id, activeKey: median },
                            `${median} becomes the new root. The tree is one level taller, and every leaf is still at the same depth.`);
                        node = root;
                    } else {
                        const p = entry.node;
                        p.keys.splice(entry.index, 0, median);
                        p.children.splice(entry.index, 1, l, r);
                        push({ activeId: p.id, activeKey: median },
                            `${median} joins its parent, which now holds ${p.keys.length} keys.`);
                        node = p;
                    }
                }
            }
        }
    }

    // Range scan across the linked leaves.
    const [lo, hi] = range;
    const leaves = leavesOf(root);
    push({ activeId: root.id }, `Now run a range scan for ${lo} ≤ key ≤ ${hi}. One descent finds where the range starts.`);

    const startLeaf = leaves.find(l => l.keys.some(k => k >= lo)) ?? leaves[leaves.length - 1];
    push({ activeId: startLeaf.id, scanRange: [startLeaf.id] },
        `Descent lands on the leaf holding the first key ≥ ${lo}. From here the tree is never climbed again.`);

    const scanned = [];
    const hits = [];
    for (let i = leaves.indexOf(startLeaf); i < leaves.length; i++) {
        const leaf = leaves[i];
        scanned.push(leaf.id);
        const inRange = leaf.keys.filter(k => k >= lo && k <= hi);
        hits.push(...inRange);
        const past = leaf.keys.some(k => k > hi);
        push({ scanRange: [...scanned], foundKeys: [...hits] },
            past
                ? `Leaf ${i} contains a key past ${hi}, so the scan stops. Collected [${hits.join(', ')}].`
                : `Leaf ${i} contributes [${inRange.join(', ') || 'nothing'}]. Follow the leaf link sideways to the next leaf — no climbing.`);
        if (past) break;
    }

    push({ scanRange: [...scanned], foundKeys: [...hits] },
        `Range scan complete: [${hits.join(', ')}]. One descent plus a sideways walk. A plain B-tree would have to climb up and back down between consecutive records — this is why B+ trees are what databases actually use.`);

    return steps;
};

const BPlusTreesPage = () => {
    const [keys, setKeys] = useState(DEFAULT_KEYS);
    const [range, setRange] = useState([6, 17]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(keys, range));
        setCurrentStep(0);
    }, [keys, range]);

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
        const sorted = [...picked].sort((a, b) => a - b);
        setKeys(picked);
        setRange([sorted[1], sorted[Math.min(sorted.length - 2, 4)]]);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const s = stepHistory[currentStep] || {
        tree: null, activeId: null, splitId: null, activeKey: null,
        foundKeys: [], scanRange: [], explanation: 'Click Play to begin',
    };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `class BPlusNode:
    def __init__(self, leaf=True):
        self.keys = []
        self.children = []
        self.leaf = leaf
        self.next = None       # leaf-level linked list


class BPlusTree:
    """Every record lives in a leaf; internal nodes are pure routing."""

    def __init__(self, order=4):
        self.order = order
        self.root = BPlusNode()

    @property
    def max_keys(self):
        return self.order - 1

    def _find_leaf(self, key):
        node = self.root
        while not node.leaf:
            i = 0
            while i < len(node.keys) and key >= node.keys[i]:
                i += 1
            node = node.children[i]
        return node

    def split_leaf(self, leaf):
        mid = len(leaf.keys) // 2
        right = BPlusNode(leaf=True)
        right.keys = leaf.keys[mid:]
        leaf.keys = leaf.keys[:mid]

        # Keep the leaf chain intact -- this is what range scans walk.
        right.next = leaf.next
        leaf.next = right

        # COPY up: the separator also stays in the right leaf, because
        # a record may never leave the leaf level.
        return right.keys[0], right

    def split_internal(self, node):
        mid = len(node.keys) // 2
        median = node.keys[mid]
        right = BPlusNode(leaf=False)
        right.keys = node.keys[mid + 1:]
        right.children = node.children[mid + 1:]
        node.keys = node.keys[:mid]
        node.children = node.children[:mid + 1]
        # MOVE up: a separator is not a record, so nothing is lost.
        return median, right

    def range_scan(self, lo, hi):
        """One descent, then walk sideways -- never back up the tree."""
        leaf = self._find_leaf(lo)
        out = []
        while leaf:
            for k in leaf.keys:
                if k > hi:
                    return out
                if k >= lo:
                    out.append(k)
            leaf = leaf.next
        return out`;

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
                            <Table className="h-10 w-10" />B+ Trees
                        </h1>
                        <p className="text-xl text-emerald-100 mb-6 max-w-3xl mx-auto">
                            The database index. Every record lives in a leaf, the leaves are linked, and a range query
                            walks sideways instead of climbing back up the tree.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Order {ORDER}</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Records in leaves only</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Linked leaf chain</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Range scan: O(log n + k)</div>
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

                            <div className="grid sm:grid-cols-3 gap-4 mb-6">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Keys to insert, in order</label>
                                    <input type="text" value={keys.join(', ')}
                                        onChange={e => {
                                            const v = e.target.value.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
                                            if (v.length > 0) setKeys([...new Set(v)].slice(0, 14));
                                        }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1 text-sm font-medium mb-2 text-slate-300"><MoveHorizontal className="h-3.5 w-3.5" />Range scan</label>
                                    <div className="flex items-center gap-1.5">
                                        <input type="number" value={range[0]}
                                            onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setRange([v, range[1]]); }}
                                            className="w-full px-2 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                        <span className="text-slate-500 text-sm">–</span>
                                        <input type="number" value={range[1]}
                                            onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setRange([range[0], v]); }}
                                            className="w-full px-2 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="300" max="2200" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-emerald-500" />
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">{s.scanRange.length ? 'Range scan' : s.splitId ? 'Splitting' : s.activeKey !== null ? `Key ${s.activeKey}` : '—'}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Tree — dashed arrows are the leaf chain</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 min-h-[260px] flex items-center justify-center overflow-x-auto">
                                    <BTreeCanvas
                                        tree={s.tree}
                                        activeId={s.activeId}
                                        splitId={s.splitId}
                                        activeKey={s.activeKey}
                                        foundKeys={s.foundKeys}
                                        scanRange={s.scanRange}
                                        showLeafLinks
                                    />
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-amber-600 inline-block" />visiting</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-red-900 inline-block border border-red-400" />splitting</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-teal-900 inline-block border border-teal-400" />in range scan</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-green-600 inline-block" />matched key</span>
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
                                <div className="flex justify-between"><span className="text-slate-300">Range of k:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(log n + k)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(n)</code></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">B-Tree vs B+ Tree</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Records:</strong> leaves only, never internal nodes</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Leaf split copies</strong> the key up; internal split moves it</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Higher fanout:</strong> separators are smaller than records</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Linked leaves</strong> make ORDER BY and BETWEEN cheap</span></li>
                            </ul>
                            <Link href="/indexing/b-trees" className="mt-4 inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                                Compare with the B-tree →
                            </Link>
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

export default BPlusTreesPage;
