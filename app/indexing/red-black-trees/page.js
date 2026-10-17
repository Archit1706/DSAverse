"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, Network, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import BinaryTreeCanvas, { treeHeight } from '@/components/BinaryTreeCanvas';

const quizQuestions = [
    {
        question: 'A newly inserted node is always coloured red. Why not black?',
        options: [
            'Red nodes are cheaper to allocate',
            'A black node would add 1 to the black-height of one path only, breaking the invariant immediately',
            'Because the root must stay red',
            'So that it can be found faster',
        ],
        correct: 1,
        explanation: 'Every root-to-leaf path must contain the same number of black nodes. Inserting black would add one to exactly one path, violating that at once. Inserting red risks only a red-red pair, which recolouring or a rotation can repair locally.',
    },
    {
        question: 'After a red-red violation, what decides between recolouring and rotating?',
        options: [
            'The depth of the new node',
            'Whether the tree is left- or right-leaning',
            'The colour of the uncle — red means recolour, black means rotate',
            'The total number of nodes',
        ],
        correct: 2,
        explanation: 'A red uncle means the parent and uncle can both go black and the grandparent red, pushing the problem up two levels at no structural cost. A black uncle leaves no such slack, so the shape itself must change with a rotation.',
    },
    {
        question: 'How does a red-black tree compare with an AVL tree?',
        options: [
            'Red-black is always shallower',
            'AVL is more strictly balanced, so it searches faster but rebalances more on writes',
            'They produce identical trees for the same input',
            'AVL cannot support deletion',
        ],
        correct: 1,
        explanation: 'AVL keeps heights within 1, bounding depth near 1.44·log n; red-black allows up to 2·log n. AVL therefore wins on lookup-heavy loads, red-black on write-heavy ones — which is why language library maps usually pick red-black.',
    },
];

const RED = 'R';
const BLACK = 'B';
const DEFAULT_KEYS = [10, 20, 30, 15, 25, 5];

const mk = (val, color = RED) => ({ val, color, left: null, right: null, parent: null });
const clone = (n, parent = null) => {
    if (!n) return null;
    const c = { val: n.val, color: n.color, left: null, right: null, parent };
    c.left = clone(n.left, c);
    c.right = clone(n.right, c);
    return c;
};

function generateSteps(keys) {
    const steps = [];
    let root = null;

    const push = (data, explanation) =>
        steps.push({ tree: clone(root), activeVal: null, violationVal: null, rotatedVals: [], recolouredVals: [], ...data, explanation });

    const rotateLeft = (x) => {
        const y = x.right;
        x.right = y.left;
        if (y.left) y.left.parent = x;
        y.parent = x.parent;
        if (!x.parent) root = y;
        else if (x === x.parent.left) x.parent.left = y;
        else x.parent.right = y;
        y.left = x;
        x.parent = y;
    };
    const rotateRight = (x) => {
        const y = x.left;
        x.left = y.right;
        if (y.right) y.right.parent = x;
        y.parent = x.parent;
        if (!x.parent) root = y;
        else if (x === x.parent.right) x.parent.right = y;
        else x.parent.left = y;
        y.right = x;
        x.parent = y;
    };

    push({}, 'An empty red-black tree. Every node carries a colour, and two rules do all the work: no red node may have a red child, and every root-to-leaf path must cross the same number of black nodes.');

    for (const key of keys) {
        // Plain BST insert, coloured red.
        const node = mk(key, RED);
        if (!root) {
            root = node;
            push({ activeVal: key }, `Insert ${key} as the root. New nodes are always red, but the root must be black — so it is recoloured immediately.`);
            root.color = BLACK;
            push({ activeVal: key, recolouredVals: [key] }, `Root recoloured black. The black-height of the tree is now 1.`);
            continue;
        }

        let cur = root, parent = null;
        while (cur) {
            parent = cur;
            cur = key < cur.val ? cur.left : cur.right;
        }
        node.parent = parent;
        if (key < parent.val) parent.left = node; else parent.right = node;

        push({ activeVal: key },
            `Insert ${key} as a red child of ${parent.val}, exactly as a plain BST would. Red keeps every path's black count unchanged — the only thing that can be wrong now is a red node under a red parent.`);

        if (parent.color === BLACK) {
            push({ activeVal: key },
                `Parent ${parent.val} is black, so there is no red-red violation. Nothing to repair.`);
            continue;
        }

        // Fix red-red violations upward.
        let n = node;
        while (n.parent && n.parent.color === RED) {
            const p = n.parent;
            const g = p.parent;
            if (!g) break;
            const uncle = g.left === p ? g.right : g.left;

            push({ activeVal: n.val, violationVal: n.val },
                `Red-red violation: ${n.val} and its parent ${p.val} are both red. The uncle is ${uncle ? `${uncle.val} (${uncle.color === RED ? 'red' : 'black'})` : 'missing, which counts as black'} — that is what decides the fix.`);

            if (uncle && uncle.color === RED) {
                p.color = BLACK;
                uncle.color = BLACK;
                g.color = RED;
                push({ activeVal: g.val, recolouredVals: [p.val, uncle.val, g.val] },
                    `Red uncle, so recolour only: ${p.val} and ${uncle.val} go black, ${g.val} goes red. Every path through ${g.val} keeps the same black count, and the violation moves up two levels.`);
                n = g;
            } else {
                const pIsLeft = g.left === p;
                const nIsLeft = p.left === n;

                if (pIsLeft && !nIsLeft) {
                    rotateLeft(p);
                    n = p;
                    push({ activeVal: n.val, rotatedVals: [n.val] },
                        `Black uncle and a "zig-zag" (${n.val} is a right child of a left child). One rotation at ${n.val} straightens it into a line first.`);
                } else if (!pIsLeft && nIsLeft) {
                    rotateRight(p);
                    n = p;
                    push({ activeVal: n.val, rotatedVals: [n.val] },
                        `Black uncle and a "zig-zag" (${n.val} is a left child of a right child). Rotate at ${n.val} to straighten it into a line.`);
                }

                const p2 = n.parent;
                const g2 = p2.parent;
                p2.color = BLACK;
                g2.color = RED;
                if (g2.left === p2) rotateRight(g2); else rotateLeft(g2);

                push({ activeVal: p2.val, rotatedVals: [g2.val], recolouredVals: [p2.val, g2.val] },
                    `Now a straight line: recolour ${p2.val} black and ${g2.val} red, then rotate at ${g2.val}. ${p2.val} takes the subtree root, with a red child on each side — the violation is gone and no path changed its black count.`);
                break;
            }
        }

        if (root.color === RED) {
            root.color = BLACK;
            push({ activeVal: root.val, recolouredVals: [root.val] },
                `The root ended up red, so paint it black. This is the one operation that raises the whole tree's black-height — and it raises it for every path at once.`);
        }
    }

    const blackHeight = (n) => !n ? 1 : (n.color === BLACK ? 1 : 0) + blackHeight(n.left);
    push({},
        `Done. Height ${treeHeight(root)}, black-height ${blackHeight(root)}. No red node has a red child, and every root-to-leaf path crosses the same number of black nodes — which is what bounds the height at 2·log(n+1).`);

    return steps;
}

const RedBlackTreesPage = () => {
    const [keys, setKeys] = useState(DEFAULT_KEYS);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
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
        const n = Math.floor(Math.random() * 3) + 6;
        const pool = Array.from({ length: 40 }, (_, i) => i + 1);
        const picked = [];
        for (let i = 0; i < n; i++) picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
        setKeys(picked);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const s = stepHistory[currentStep] || {
        tree: null, activeVal: null, violationVal: null, rotatedVals: [], recolouredVals: [],
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

    const codeExample = `RED, BLACK = True, False


class Node:
    def __init__(self, val):
        self.val = val
        self.color = RED          # new nodes are ALWAYS red
        self.left = self.right = self.parent = None


class RedBlackTree:
    """Two rules do all the work:
         1. a red node may not have a red child
         2. every root-to-leaf path crosses the same number of black nodes
       Together they bound the height at 2*log2(n+1).
    """

    def insert(self, val):
        node = Node(val)
        self._bst_insert(node)    # ordinary BST insert
        self._fix(node)
        self.root.color = BLACK   # the only op that raises black-height

    def _fix(self, n):
        while n.parent and n.parent.color == RED:
            p, g = n.parent, n.parent.parent
            if g is None:
                break
            uncle = g.right if g.left is p else g.left

            if uncle and uncle.color == RED:
                # Red uncle: pure recolouring, no rotation needed.
                p.color = uncle.color = BLACK
                g.color = RED
                n = g                      # violation moves up two levels
            else:
                # Black uncle: the shape itself has to change.
                if g.left is p and p.right is n:
                    self._rotate_left(p); n = p     # straighten zig-zag
                elif g.right is p and p.left is n:
                    self._rotate_right(p); n = p

                n.parent.color = BLACK
                n.parent.parent.color = RED
                if n.parent.parent.left is n.parent:
                    self._rotate_right(n.parent.parent)
                else:
                    self._rotate_left(n.parent.parent)
                break`;

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
                            <Network className="h-10 w-10" />Red-Black Trees
                        </h1>
                        <p className="text-xl text-emerald-100 mb-6 max-w-3xl mx-auto">
                            Balance by colour rather than strict height. A red uncle is repaired by recolouring alone;
                            only a black uncle forces the shape to change.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Search: O(log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Height ≤ 2·log(n+1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">≤ 2 rotations per insert</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
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
                                        if (v.length > 0) setKeys([...new Set(v)].slice(0, 12));
                                    }}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                <p className="text-xs text-slate-500 mt-1">Try 10, 20, 30 — ascending keys force a rotation straight away.</p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="300" max="2200" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-emerald-500" />
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">
                                        {s.violationVal !== null ? 'Red-red violation' : s.rotatedVals.length ? 'Rotating' : s.recolouredVals.length ? 'Recolouring' : '—'}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Tree</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 min-h-[260px] flex items-center justify-center overflow-x-auto">
                                    <BinaryTreeCanvas
                                        tree={s.tree}
                                        emptyLabel="Empty tree — waiting for the first insertion"
                                        yGap={78}
                                        minXGap={52}
                                        maxXGap={84}
                                        widthBudget={600}
                                        styleFor={(node) => {
                                            const isRed = node.color === RED;
                                            const violating = node.val === s.violationVal;
                                            const rotated = s.rotatedVals.includes(node.val);
                                            const recoloured = s.recolouredVals.includes(node.val);
                                            return {
                                                fill: isRed ? '#dc2626' : '#0f172a',
                                                stroke: violating ? '#fbbf24' : rotated ? '#38bdf8' : recoloured ? '#6ee7b7' : isRed ? '#fca5a5' : '#64748b',
                                                text: '#ffffff',
                                                radius: node.val === s.activeVal ? 22 : 20,
                                                strokeWidth: violating || rotated || recoloured ? 3 : 1.5,
                                            };
                                        }}
                                    />
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded-full bg-red-600 inline-block" />red node</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded-full bg-slate-900 border border-slate-500 inline-block" />black node</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded-full border-2 border-amber-400 inline-block" />violation</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded-full border-2 border-sky-400 inline-block" />rotated</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded-full border-2 border-emerald-300 inline-block" />recoloured</span>
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
                                <div className="flex justify-between"><span className="text-slate-300">Rotations:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">≤ 2</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(n)</code></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">The Two Rules</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">No red-red:</strong> a red node cannot have a red child</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Equal black-height</strong> on every root-to-leaf path</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Together</strong> these bound height at 2·log(n+1)</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Looser than AVL,</strong> so writes are cheaper and reads slightly slower</span></li>
                            </ul>
                            <Link href="/trees/avl-tree" className="mt-4 inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                                Compare with the AVL tree →
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

export default RedBlackTreesPage;
