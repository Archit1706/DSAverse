"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, Network, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: 'What do the three children of a ternary search tree node mean?',
        options: [
            'Three different alphabets',
            'Lower, equal and higher — equal also advances to the next character of the key',
            'Left subtree, right subtree and an overflow area',
            'Three hash buckets',
        ],
        correct: 1,
        explanation: 'The low and high children compare the same character position, exactly like a BST. Only the equal child consumes a character and moves on to the next position in the key. That one distinction is the whole structure.',
    },
    {
        question: 'How does a TST compare with a trie on memory?',
        options: [
            'A TST uses more, because of the extra pointer',
            'Identical, since both store one character per node',
            'A TST uses far less — a trie node reserves a slot for every letter of the alphabet',
            'It depends only on the number of words',
        ],
        correct: 2,
        explanation: 'A classic trie node holds an array of R pointers (26, or 256 for bytes), most of them null. A TST node holds exactly three. For sparse key sets that is a large saving, at the cost of a few extra comparisons per character.',
    },
    {
        question: 'What is the search cost of a TST?',
        options: [
            'O(1) like a hash table',
            'O(m) exactly, same as a trie',
            'O(log n + m) — a BST-like descent at each of the m character positions',
            'O(n) in all cases',
        ],
        correct: 2,
        explanation: 'At each character position you do a small BST search among the characters that actually appear there, then follow the equal child. That is roughly log n comparisons per position across m positions — slower than a trie\'s direct index, far cheaper in memory.',
    },
];

const DEFAULT_WORDS = ['CUTE', 'CUP', 'AT', 'AS', 'HE', 'US', 'I'];
const DEFAULT_SEARCH = 'CUP';

let idc = 0;
const mkNode = (ch) => ({ id: `t${idc++}`, ch, isEnd: false, lo: null, eq: null, hi: null });
const clone = (n) => n ? { id: n.id, ch: n.ch, isEnd: n.isEnd, lo: clone(n.lo), eq: clone(n.eq), hi: clone(n.hi) } : null;
const countNodes = (n) => n ? 1 + countNodes(n.lo) + countNodes(n.eq) + countNodes(n.hi) : 0;

function generateSteps(words, searchWord) {
    idc = 0;
    const steps = [];
    let root = null;

    const push = (data, explanation) =>
        steps.push({ tree: clone(root), activeId: null, path: [], matched: false, word: null, charIndex: null, ...data, explanation });

    push({}, `An empty ternary search tree. Each node holds one character and three children: lower, equal and higher. Only the equal child advances to the next character of the key.`);

    for (const word of words) {
        push({ word }, `Insert "${word}".`);

        if (!root) root = mkNode(word[0]);
        let node = root;
        let i = 0;
        const path = [];

        for (;;) {
            path.push(node.id);
            if (word[i] < node.ch) {
                if (!node.lo) {
                    node.lo = mkNode(word[i]);
                    push({ activeId: node.lo.id, path: [...path], word, charIndex: i },
                        `'${word[i]}' < '${node.ch}', and there is no lower child — create one holding '${word[i]}'. The character position does not advance.`);
                }
                node = node.lo;
            } else if (word[i] > node.ch) {
                if (!node.hi) {
                    node.hi = mkNode(word[i]);
                    push({ activeId: node.hi.id, path: [...path], word, charIndex: i },
                        `'${word[i]}' > '${node.ch}', and there is no higher child — create one holding '${word[i]}'. Still the same character position.`);
                }
                node = node.hi;
            } else {
                // equal: consume the character
                i++;
                if (i === word.length) {
                    node.isEnd = true;
                    push({ activeId: node.id, path: [...path], word, charIndex: i - 1 },
                        `'${word[i - 1]}' matches, and that was the last character — mark this node as the end of "${word}".`);
                    break;
                }
                if (!node.eq) {
                    node.eq = mkNode(word[i]);
                    push({ activeId: node.eq.id, path: [...path], word, charIndex: i },
                        `'${word[i - 1]}' matches, so advance to character ${i} ('${word[i]}') and follow the equal child — creating it here.`);
                }
                node = node.eq;
            }
        }
    }

    push({}, `All ${words.length} words stored in ${countNodes(root)} nodes, three pointers each. A 26-way trie would reserve 26 slots per node, nearly all of them null.`);

    // Search
    push({ word: searchWord }, `Now search for "${searchWord}". At each character position this is a small BST search, then one step down the equal child.`);

    let node = root;
    let i = 0;
    const path = [];
    let found = false;

    while (node) {
        path.push(node.id);
        if (searchWord[i] < node.ch) {
            push({ activeId: node.id, path: [...path], word: searchWord, charIndex: i },
                `'${searchWord[i]}' < '${node.ch}' — go to the lower child, still comparing character ${i}.`);
            node = node.lo;
        } else if (searchWord[i] > node.ch) {
            push({ activeId: node.id, path: [...path], word: searchWord, charIndex: i },
                `'${searchWord[i]}' > '${node.ch}' — go to the higher child, still comparing character ${i}.`);
            node = node.hi;
        } else {
            i++;
            if (i === searchWord.length) {
                found = node.isEnd;
                push({ activeId: node.id, path: [...path], matched: found, word: searchWord, charIndex: i - 1 },
                    found
                        ? `'${searchWord[i - 1]}' matches and the node is marked as a word ending — "${searchWord}" is in the tree.`
                        : `'${searchWord[i - 1]}' matches, but this node is not marked as a word ending, so "${searchWord}" is only a prefix here, not a stored key.`);
                break;
            }
            push({ activeId: node.id, path: [...path], word: searchWord, charIndex: i },
                `'${searchWord[i - 1]}' matches — follow the equal child and move to character ${i} ('${searchWord[i]}').`);
            node = node.eq;
        }
    }

    if (!node && !found) {
        push({ path: [...path], word: searchWord },
            `Ran out of children before matching every character — "${searchWord}" is not in the tree.`);
    }

    return steps;
}

const X_GAP = 54;
const Y_GAP = 70;

function layoutTST(root) {
    const nodes = [];
    const edges = [];
    let leafIndex = 0;

    (function walk(node, depth) {
        if (!node) return null;
        const y = depth * Y_GAP + 26;
        const kids = [
            { key: 'lo', child: node.lo, label: '<' },
            { key: 'eq', child: node.eq, label: '=' },
            { key: 'hi', child: node.hi, label: '>' },
        ].filter(k => k.child);

        if (kids.length === 0) {
            const x = leafIndex * X_GAP + X_GAP / 2;
            leafIndex++;
            nodes.push({ node, x, y });
            return x;
        }

        const xs = kids.map(k => walk(k.child, depth + 1));
        const x = (xs[0] + xs[xs.length - 1]) / 2;
        nodes.push({ node, x, y });
        kids.forEach((k, idx) => {
            edges.push({
                from: { x, y }, to: { x: xs[idx], y: (depth + 1) * Y_GAP + 26 },
                label: k.label, kind: k.key,
            });
        });
        return x;
    })(root, 0);

    return {
        nodes, edges,
        width: Math.max(leafIndex * X_GAP, X_GAP),
        height: (nodes.length ? Math.max(...nodes.map(n => n.y)) : 0) + 40,
    };
}

const EDGE_COLOR = { lo: '#64748b', eq: '#14b8a6', hi: '#64748b' };

function TSTSVG({ tree, activeId, path, matched }) {
    if (!tree) return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Empty tree</div>;
    const { nodes, edges, width, height } = layoutTST(tree);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxHeight: 400 }} className="overflow-visible">
            {edges.map((e, i) => {
                const mx = (e.from.x + e.to.x) / 2;
                const my = (e.from.y + e.to.y) / 2;
                return (
                    <g key={i}>
                        <line x1={e.from.x} y1={e.from.y + 13} x2={e.to.x} y2={e.to.y - 13}
                            stroke={EDGE_COLOR[e.kind]} strokeWidth={e.kind === 'eq' ? 2.5 : 1.5}
                            strokeDasharray={e.kind === 'eq' ? '0' : '3 2'} />
                        <text x={mx + 6} y={my} textAnchor="middle" dominantBaseline="middle"
                            fontSize="10" fontWeight="700" fill={EDGE_COLOR[e.kind]}>{e.label}</text>
                    </g>
                );
            })}
            {nodes.map(({ node, x, y }) => {
                const onPath = path.includes(node.id);
                const isActive = node.id === activeId;
                const fill = isActive && matched ? '#16a34a' : isActive ? '#f59e0b' : onPath ? '#0f766e' : node.isEnd ? '#065f46' : '#1e293b';
                const stroke = isActive && matched ? '#86efac' : isActive ? '#fcd34d' : node.isEnd ? '#10b981' : '#475569';
                return (
                    <g key={node.id} transform={`translate(${x},${y})`} style={{ transition: 'transform 0.4s ease' }}>
                        {node.isEnd && <circle r="16" fill="none" stroke={stroke} strokeWidth="1" opacity="0.5" />}
                        <circle r="13" fill={fill} stroke={stroke} strokeWidth="2"
                            style={{ transition: 'fill 0.35s ease, stroke 0.35s ease' }} />
                        <text textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700"
                            fill={fill === '#1e293b' ? '#e2e8f0' : '#ffffff'}>{node.ch}</text>
                    </g>
                );
            })}
        </svg>
    );
}

const TernarySearchTreePage = () => {
    const [words, setWords] = useState(DEFAULT_WORDS);
    const [searchWord, setSearchWord] = useState(DEFAULT_SEARCH);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(950);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(words, searchWord));
        setCurrentStep(0);
    }, [words, searchWord]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };
    const PRESETS = [
        [['CUTE', 'CUP', 'AT', 'AS', 'HE', 'US', 'I'], 'CUP'],
        [['CAT', 'CAR', 'CARD', 'BAT', 'DOG'], 'CARD'],
        [['SEA', 'SEE', 'SHE', 'SHELL', 'SO'], 'SHELL'],
    ];
    const randomize = () => {
        const [w, s] = PRESETS[Math.floor(Math.random() * PRESETS.length)];
        setWords(w);
        setSearchWord(s);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const s = stepHistory[currentStep] || {
        tree: null, activeId: null, path: [], matched: false, word: null, charIndex: null,
        explanation: 'Click Play to begin',
    };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `class TSTNode:
    __slots__ = ("ch", "is_end", "lo", "eq", "hi")

    def __init__(self, ch):
        self.ch = ch
        self.is_end = False
        self.lo = self.eq = self.hi = None   # exactly three pointers


def insert(node, key, i=0):
    """lo/hi compare the SAME character position, like a BST.
    Only eq consumes a character and moves on."""
    if node is None:
        node = TSTNode(key[i])

    if key[i] < node.ch:
        node.lo = insert(node.lo, key, i)        # same position
    elif key[i] > node.ch:
        node.hi = insert(node.hi, key, i)        # same position
    elif i + 1 < len(key):
        node.eq = insert(node.eq, key, i + 1)    # advance
    else:
        node.is_end = True
    return node


def search(node, key, i=0):
    if node is None:
        return False
    if key[i] < node.ch:
        return search(node.lo, key, i)
    if key[i] > node.ch:
        return search(node.hi, key, i)
    if i + 1 == len(key):
        return node.is_end
    return search(node.eq, key, i + 1)


# Three pointers per node instead of a trie's R (26, or 256 for bytes),
# at the cost of a short BST descent at each character position.`;

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
                            <Network className="h-10 w-10" />Ternary Search Tree
                        </h1>
                        <p className="text-xl text-emerald-100 mb-6 max-w-3xl mx-auto">
                            One character per node and exactly three children. Lower and higher compare the same position;
                            only the equal child advances — a BST and a trie meeting in the middle.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Search: O(log n + m)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">3 pointers per node</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Prefix-search capable</div>
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

                            <div className="grid sm:grid-cols-3 gap-4 mb-6">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Words to insert</label>
                                    <input type="text" value={words.join(', ')}
                                        onChange={e => {
                                            const v = e.target.value.split(',').map(x => x.trim().toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean);
                                            if (v.length > 0) setWords([...new Set(v)].slice(0, 8));
                                        }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Then search for</label>
                                    <input type="text" value={searchWord}
                                        onChange={e => {
                                            const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                                            if (v) setSearchWord(v.slice(0, 10));
                                        }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="300" max="2200" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-emerald-500" />
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">{s.word ? `"${s.word}"` : '—'}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {/* Key with the current character highlighted */}
                            {s.word && (
                                <div className="mb-6 flex items-center justify-center gap-1.5">
                                    {s.word.split('').map((c, i) => (
                                        <div key={i} className={`w-9 h-9 rounded-md border-2 flex items-center justify-center font-bold text-sm transition-all duration-300 ${i === s.charIndex
                                            ? 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110'
                                            : i < (s.charIndex ?? 0)
                                                ? 'bg-emerald-800/60 border-emerald-600 text-emerald-200'
                                                : 'bg-slate-700 border-slate-600 text-slate-200'}`}>
                                            {c}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Tree — solid teal edges advance a character</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 min-h-[280px] flex items-center justify-center overflow-x-auto">
                                    <TSTSVG tree={s.tree} activeId={s.activeId} path={s.path} matched={s.matched} />
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-4 h-0.5 bg-teal-500 inline-block" />equal (advances)</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-4 h-0.5 bg-slate-500 inline-block" style={{ borderTop: '1px dashed' }} />lower / higher</span>
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
                                <div className="flex justify-between"><span className="text-slate-300">Search:</span><code className="bg-sky-500/15 text-sky-400 px-2 py-1 rounded">O(log n + m)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Insert:</span><code className="bg-sky-500/15 text-sky-400 px-2 py-1 rounded">O(log n + m)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Pointers/node:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">3</code></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">m = key length, n = total characters stored</p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Only equal advances</strong> the character position</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">3 pointers</strong> instead of a trie&apos;s 26 or 256</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Insertion order matters</strong> — it shapes each position&apos;s BST</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Keeps prefix search,</strong> unlike a hash table</span></li>
                            </ul>
                            <Link href="/trees/trie" className="mt-4 inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                                Compare with the trie →
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

export default TernarySearchTreePage;
