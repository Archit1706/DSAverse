"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, ListTree, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: 'What exactly does a radix tree compress compared with a plain trie?',
        options: [
            'Duplicate keys sharing the same value',
            'Chains of nodes that each have exactly one child and end no word',
            'Leaves that store the same suffix',
            'The alphabet, by hashing each character',
        ],
        correct: 1,
        explanation: 'A node with one child and no word ending at it carries no decision — it only passes through. Merging such a chain into a single edge labelled with the whole substring removes the nodes without changing which keys the structure holds.',
    },
    {
        question: 'On which kind of key set does compression help most?',
        options: [
            'Dense sets where every prefix is used',
            'Sparse sets of long keys with few shared prefixes',
            'Sets of single-character keys',
            'Sets where all keys are identical',
        ],
        correct: 1,
        explanation: 'Long keys that diverge early leave long single-child tails, and each tail collapses to one edge. A dense set where every prefix branches has almost nothing to compress — there the radix tree is just a trie with extra bookkeeping.',
    },
    {
        question: 'How does lookup cost change after compression?',
        options: [
            'It becomes O(log n) instead of O(m)',
            'Still O(m) in characters compared, but far fewer nodes are visited',
            'It becomes O(1)',
            'It gets worse, because edge labels must be compared',
        ],
        correct: 1,
        explanation: 'You still compare every character of the key, so the bound stays O(m). What changes is pointer-chasing: one edge can cover many characters, so far fewer nodes — and therefore far fewer cache misses — are touched.',
    },
];

const DEFAULT_WORDS = ['ROMANE', 'ROMANUS', 'ROMULUS', 'RUBENS', 'RUBER'];

let idc = 0;
const mkNode = (isEnd = false) => ({ id: `r${idc++}`, isEnd, children: [] }); // children: [{label, node}]

function buildTrie(words) {
    idc = 0;
    const root = mkNode();
    for (const w of words) {
        let cur = root;
        for (const ch of w) {
            let edge = cur.children.find(e => e.label === ch);
            if (!edge) {
                edge = { label: ch, node: mkNode() };
                cur.children.push(edge);
                cur.children.sort((a, b) => a.label.localeCompare(b.label));
            }
            cur = edge.node;
        }
        cur.isEnd = true;
    }
    return root;
}

const cloneTree = (n) => ({
    id: n.id, isEnd: n.isEnd,
    children: n.children.map(e => ({ label: e.label, node: cloneTree(e.node) })),
});

const countNodes = (n) => 1 + n.children.reduce((s, e) => s + countNodes(e.node), 0);

/** Finds a parent edge whose child can be merged into it. */
function findMergeable(node) {
    for (const edge of node.children) {
        const child = edge.node;
        if (!child.isEnd && child.children.length === 1) {
            return { parentEdge: edge, child };
        }
        const deeper = findMergeable(child);
        if (deeper) return deeper;
    }
    return null;
}

function generateSteps(words) {
    const steps = [];
    let root = buildTrie(words);

    const push = (data, explanation) =>
        steps.push({ tree: cloneTree(root), mergedId: null, searchPath: [], matched: null, ...data, explanation });

    const trieNodes = countNodes(root);
    push({}, `A plain trie for [${words.join(', ')}] — ${trieNodes} nodes, one per character position. Most of them have a single child and end no word, so they make no decision at all.`);

    let merges = 0;
    for (;;) {
        const found = findMergeable(root);
        if (!found) break;
        const { parentEdge, child } = found;
        const childEdge = child.children[0];
        const before = parentEdge.label;

        parentEdge.label = parentEdge.label + childEdge.label;
        parentEdge.node = childEdge.node;
        merges++;

        push({ mergedId: parentEdge.node.id },
            `Edge "${before}" led to a node with one child and no word ending — pure pass-through. Merge it: the edge is now labelled "${parentEdge.label}" and one node is gone. (${countNodes(root)} nodes left.)`);
    }

    const radixNodes = countNodes(root);
    push({},
        `Nothing left to compress. ${trieNodes} nodes became ${radixNodes} after ${merges} merge${merges === 1 ? '' : 's'} — a ${Math.round((1 - radixNodes / trieNodes) * 100)}% reduction. Every remaining node either ends a word or genuinely branches.`);

    // Lookup walk
    const target = words[words.length - 1];
    push({}, `Now look up "${target}". Each edge is compared as a whole string rather than one character at a time.`);

    let cur = root;
    let consumed = '';
    const path = [root.id];
    let failed = false;

    while (consumed !== target) {
        const rest = target.slice(consumed.length);
        const edge = cur.children.find(e => rest.startsWith(e.label));
        if (!edge) {
            failed = true;
            push({ searchPath: [...path] },
                `No edge from here starts "${rest}", so "${target}" is not in the tree.`);
            break;
        }
        consumed += edge.label;
        cur = edge.node;
        path.push(cur.id);
        push({ searchPath: [...path] },
            `Edge "${edge.label}" matches. Consumed "${consumed}" of "${target}" in a single comparison — a plain trie would have taken ${edge.label.length} hop${edge.label.length === 1 ? '' : 's'} to get here.`);
    }

    if (!failed) {
        push({ searchPath: [...path], matched: cur.id },
            `"${target}" found, and the node is marked as a word ending. ${path.length} node${path.length === 1 ? '' : 's'} visited for a ${target.length}-character key.`);
    }

    return steps;
}

const X_GAP = 62;
const Y_GAP = 72;

function layoutTree(root) {
    const nodes = [];
    const edges = [];
    let leafIndex = 0;

    (function walk(node, depth) {
        const y = depth * Y_GAP + 26;
        if (node.children.length === 0) {
            const x = leafIndex * X_GAP + X_GAP / 2;
            leafIndex++;
            nodes.push({ node, x, y });
            return x;
        }
        const childXs = node.children.map(e => walk(e.node, depth + 1));
        const x = (childXs[0] + childXs[childXs.length - 1]) / 2;
        nodes.push({ node, x, y });
        node.children.forEach((e, i) => {
            edges.push({ from: { x, y }, to: { x: childXs[i], y: (depth + 1) * Y_GAP + 26 }, label: e.label });
        });
        return x;
    })(root, 0);

    const width = Math.max(leafIndex * X_GAP, X_GAP);
    const depth = Math.max(...nodes.map(n => n.y)) + 40;
    return { nodes, edges, width, height: depth };
}

function RadixSVG({ tree, mergedId, searchPath, matched }) {
    if (!tree) return null;
    const { nodes, edges, width, height } = layoutTree(tree);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxHeight: 400 }} className="overflow-visible">
            {edges.map((e, i) => {
                const mx = (e.from.x + e.to.x) / 2;
                const my = (e.from.y + e.to.y) / 2;
                const multi = e.label.length > 1;
                return (
                    <g key={i}>
                        <line x1={e.from.x} y1={e.from.y + 14} x2={e.to.x} y2={e.to.y - 14}
                            stroke={multi ? '#14b8a6' : '#334155'} strokeWidth={multi ? 2.5 : 1.5}
                            style={{ transition: 'stroke 0.35s ease' }} />
                        <rect x={mx - e.label.length * 4 - 5} y={my - 8} width={e.label.length * 8 + 10} height={16} rx="4"
                            fill="#0f172a" stroke={multi ? '#14b8a6' : '#475569'} strokeWidth="1" />
                        <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="middle"
                            fontSize="10" fontWeight="700" fill={multi ? '#5eead4' : '#94a3b8'}>
                            {e.label}
                        </text>
                    </g>
                );
            })}
            {nodes.map(({ node, x, y }) => {
                const onPath = searchPath.includes(node.id);
                const isMatch = node.id === matched;
                const justMerged = node.id === mergedId;
                const fill = isMatch ? '#16a34a' : justMerged ? '#0d9488' : onPath ? '#f59e0b' : node.isEnd ? '#065f46' : '#1e293b';
                const stroke = isMatch ? '#86efac' : justMerged ? '#5eead4' : onPath ? '#fcd34d' : node.isEnd ? '#10b981' : '#475569';
                return (
                    <g key={node.id} transform={`translate(${x},${y})`} style={{ transition: 'transform 0.4s ease' }}>
                        {node.isEnd && <circle r="14" fill="none" stroke={stroke} strokeWidth="1" opacity="0.5" />}
                        <circle r="11" fill={fill} stroke={stroke} strokeWidth="2"
                            style={{ transition: 'fill 0.35s ease, stroke 0.35s ease' }} />
                    </g>
                );
            })}
        </svg>
    );
}

const RadixTreePage = () => {
    const [words, setWords] = useState(DEFAULT_WORDS);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(words));
        setCurrentStep(0);
    }, [words]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };
    const PRESETS = [
        ['ROMANE', 'ROMANUS', 'ROMULUS', 'RUBENS', 'RUBER'],
        ['TEST', 'TESTER', 'TESTING', 'TEAM', 'TOAST'],
        ['CAR', 'CART', 'CARTON', 'CAT', 'DOG'],
        ['INTERNET', 'INTERN', 'INTERVAL', 'INSIDE'],
    ];
    const randomize = () => {
        const next = PRESETS[Math.floor(Math.random() * PRESETS.length)];
        setWords(next);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const s = stepHistory[currentStep] || { tree: null, mergedId: null, searchPath: [], matched: null, explanation: 'Click Play to begin' };
    const liveNodes = s.tree ? countNodes(s.tree) : 0;

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `class RadixNode:
    def __init__(self):
        self.edges = {}        # first char -> (label, child)
        self.is_end = False


def compress(node):
    """Collapse every single-child, non-terminal chain into one edge.

    Such a node makes no decision: it has nothing to branch on and
    ends no word, so merging it changes nothing about which keys
    the structure holds.
    """
    for first, (label, child) in list(node.edges.items()):
        compress(child)
        if not child.is_end and len(child.edges) == 1:
            (grand_label, grandchild), = child.edges.values()
            node.edges[first] = (label + grand_label, grandchild)


def search(root, key):
    """Still O(len(key)) character comparisons -- but far fewer
    nodes are visited, so far fewer cache misses."""
    node, i = root, 0
    while i < len(key):
        entry = node.edges.get(key[i])
        if entry is None:
            return False
        label, child = entry
        if not key.startswith(label, i):
            return False       # edge diverges mid-label
        i += len(label)        # one hop covers the whole label
        node = child
    return node.is_end`;

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
                            <ListTree className="h-10 w-10" />Radix Tree
                        </h1>
                        <p className="text-xl text-emerald-100 mb-6 max-w-3xl mx-auto">
                            A trie with its single-child chains collapsed. Each edge carries a whole substring instead of
                            one character, so the same keys live in far fewer nodes.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Search: O(m)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Path compression</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Fewer cache misses</div>
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
                                <button onClick={randomize} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"><Shuffle size={18} />Another Set</button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Words (comma-separated)</label>
                                <input type="text" value={words.join(', ')}
                                    onChange={e => {
                                        const v = e.target.value.split(',').map(x => x.trim().toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean);
                                        if (v.length > 0) setWords([...new Set(v)].slice(0, 6));
                                    }}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="300" max="2200" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-emerald-500" />
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">{liveNodes} nodes</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Tree — teal edges carry more than one character</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 min-h-[280px] flex items-center justify-center overflow-x-auto">
                                    <RadixSVG tree={s.tree} mergedId={s.mergedId} searchPath={s.searchPath} matched={s.matched} />
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded-full bg-teal-600 inline-block" />just merged</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />on search path</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded-full bg-emerald-800 border border-emerald-500 inline-block" />word ends here</span>
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
                                <div className="flex justify-between"><span className="text-slate-300">Search:</span><code className="bg-sky-500/15 text-sky-400 px-2 py-1 rounded">O(m)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Insert:</span><code className="bg-sky-500/15 text-sky-400 px-2 py-1 rounded">O(m)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Nodes vs trie:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">far fewer</code></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">m = key length, n = total characters stored</p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Merge rule:</strong> one child and no word ending</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Same keys,</strong> fewer nodes and fewer pointers</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Cost:</strong> inserts may have to split an edge again</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Used in</strong> IP routing tables and key-value stores</span></li>
                            </ul>
                            <Link href="/trees/trie" className="mt-4 inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                                Compare with the uncompressed trie →
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

export default RadixTreePage;
