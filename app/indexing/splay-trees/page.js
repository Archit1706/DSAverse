"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, Shuffle, TrendingDown } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import BinaryTreeCanvas, { treeHeight } from '@/components/BinaryTreeCanvas';

const quizQuestions = [
    {
        question: 'What does a splay tree do after every single access?',
        options: [
            'Rebalances the whole tree to minimum height',
            'Rotates the accessed node all the way to the root',
            'Recolours the path from root to the node',
            'Nothing — it only restructures on insert',
        ],
        correct: 1,
        explanation: 'Every access — search, insert, even a failed lookup — splays the node it touched to the root. There is no balance factor and no colour; the access pattern itself is the only thing shaping the tree.',
    },
    {
        question: 'Why does zig-zig rotate the grandparent first, rather than just doing two zigs?',
        options: [
            'It is faster to compute',
            'Rotating the parent first would leave the path just as deep, so the amortised bound fails',
            'It keeps the tree perfectly balanced',
            'It avoids needing a parent pointer',
        ],
        correct: 1,
        explanation: 'Two naive bottom-up single rotations leave the long path largely intact. Rotating the grandparent first roughly halves the depth of every node along that path, which is exactly what the potential-function argument needs for the O(log n) amortised bound.',
    },
    {
        question: 'A splay tree can be O(n) deep. Why is that acceptable?',
        options: [
            'Because it never actually happens in practice',
            'Because the bound is amortised — an expensive access flattens the path, so it cannot repeat',
            'Because lookups skip the deep parts',
            'Because the tree periodically rebuilds itself',
        ],
        correct: 1,
        explanation: 'A single access really can cost O(n), but splaying that long path halves everyone\'s depth on the way out. Paying that cost makes the next accesses cheap, so any sequence of m operations costs O(m log n) overall.',
    },
];

const DEFAULT_KEYS = [10, 20, 30, 40, 50];
// Access the DEEPEST key, not the root: ascending inserts put 10 at the top,
// so splaying it would change nothing and show none of the flattening.
const DEFAULT_ACCESS = [50, 50];

const mk = (val) => ({ val, left: null, right: null });
const clone = (n) => n ? { val: n.val, left: clone(n.left), right: clone(n.right) } : null;
const depthOf = (root, val) => {
    let d = 1, cur = root;
    while (cur && cur.val !== val) { cur = val < cur.val ? cur.left : cur.right; d++; }
    return cur ? d : null;
};

/* Top-down splay is the usual implementation, but the bottom-up form shows the
   three cases explicitly, which is the point of the page. */
function splay(root, val, onStep) {
    const path = [];
    let cur = root;
    while (cur && cur.val !== val) {
        path.push(cur);
        cur = val < cur.val ? cur.left : cur.right;
    }
    if (!cur) return root;           // key absent: nothing to splay
    let node = cur;

    const rotateUp = (child, parent, grandparent) => {
        if (parent.left === child) {
            parent.left = child.right;
            child.right = parent;
        } else {
            parent.right = child.left;
            child.left = parent;
        }
        if (grandparent) {
            if (grandparent.left === parent) grandparent.left = child;
            else grandparent.right = child;
        }
    };

    while (path.length) {
        const parent = path.pop();
        const grandparent = path.length ? path[path.length - 1] : null;
        const greatparent = path.length > 1 ? path[path.length - 2] : null;

        if (!grandparent) {
            onStep('zig', node, parent, null);
            rotateUp(node, parent, null);
            root = node;
        } else {
            const nodeIsLeft = parent.left === node;
            const parentIsLeft = grandparent.left === parent;

            if (nodeIsLeft === parentIsLeft) {
                onStep('zig-zig', node, parent, grandparent);
                // Grandparent FIRST — this is what halves the path depth.
                rotateUp(parent, grandparent, greatparent);
                rotateUp(node, parent, greatparent);
            } else {
                onStep('zig-zag', node, parent, grandparent);
                rotateUp(node, parent, grandparent);
                rotateUp(node, grandparent, greatparent);
            }
            path.pop();              // grandparent consumed
            if (!greatparent) root = node;
        }
    }
    return root;
}

function generateSteps(keys, accesses) {
    const steps = [];
    let root = null;

    const push = (data, explanation) =>
        steps.push({ tree: clone(root), activeVal: null, caseName: null, involved: [], depth: null, ...data, explanation });

    push({}, 'An empty splay tree. There is no balance factor and no colour here — the only rule is that whatever you touch gets rotated to the root.');

    for (const key of keys) {
        if (!root) {
            root = mk(key);
            push({ activeVal: key }, `Insert ${key} as the root.`);
            continue;
        }
        let cur = root, parent = null;
        while (cur) { parent = cur; cur = key < cur.val ? cur.left : cur.right; }
        if (key < parent.val) parent.left = mk(key); else parent.right = mk(key);
        push({ activeVal: key }, `Insert ${key} below ${parent.val}. Inserting ascending keys deliberately builds a deep right spine — the shape splaying is meant to fix.`);
    }

    push({ depth: treeHeight(root) },
        `All keys inserted. Height is ${treeHeight(root)} — about as unbalanced as a tree can get. Now watch what an access does to it.`);

    for (const target of accesses) {
        const before = depthOf(root, target);
        if (before === null) {
            push({ activeVal: target }, `${target} is not in the tree, so there is nothing to splay.`);
            continue;
        }
        const heightBefore = treeHeight(root);
        push({ activeVal: target, depth: before },
            `Access ${target}. It sits at depth ${before}, so finding it costs ${before} comparison${before === 1 ? '' : 's'}. Splaying now rotates it to the root.`);

        const caseSteps = [];
        root = splay(root, target, (caseName, node, parent, grandparent) => {
            caseSteps.push({ caseName, node: node.val, parent: parent.val, grandparent: grandparent ? grandparent.val : null });
        });

        for (const cs of caseSteps) {
            const detail =
                cs.caseName === 'zig'
                    ? `${cs.node}'s parent ${cs.parent} is the root, so a single rotation finishes the job.`
                    : cs.caseName === 'zig-zig'
                        ? `${cs.node}, ${cs.parent} and ${cs.grandparent} form a straight line. Rotate the grandparent ${cs.grandparent} first, then the parent ${cs.parent} — doing it in that order roughly halves the depth of everything on this path, which is exactly what makes the amortised bound work.`
                        : `${cs.node}, ${cs.parent} and ${cs.grandparent} zig-zag. Rotate ${cs.node} up twice, through ${cs.parent} then ${cs.grandparent}.`;
            push({ activeVal: target, caseName: cs.caseName, involved: [cs.node, cs.parent, cs.grandparent].filter(v => v !== null) },
                `${cs.caseName.toUpperCase()}: ${detail}`);
        }

        const heightAfter = treeHeight(root);
        push({ activeVal: target, depth: 1 },
            before === 1
                ? `${target} was already the root, so splaying leaves the tree as it is. That is the payoff: the second access to a key costs one comparison instead of ${heightBefore}.`
                : `${target} is now the root — depth ${before} became depth 1. Tree height went from ${heightBefore} to ${heightAfter}, and every node along the old path moved up with it. Access ${target} again and it costs a single comparison.`);
    }

    push({ depth: treeHeight(root) },
        `Final height ${treeHeight(root)}. No single access is guaranteed to be cheap, but an expensive one flattens the path it walked — so any sequence of m operations costs O(m log n) in total.`);

    return steps;
}

const SplayTreesPage = () => {
    const [keys, setKeys] = useState(DEFAULT_KEYS);
    const [accesses, setAccesses] = useState(DEFAULT_ACCESS);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(keys, accesses));
        setCurrentStep(0);
    }, [keys, accesses]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };
    const randomize = () => {
        const n = Math.floor(Math.random() * 3) + 5;
        const pool = Array.from({ length: 40 }, (_, i) => i + 1);
        const picked = [];
        for (let i = 0; i < n; i++) picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
        setKeys(picked);
        // The last-inserted key is the one furthest from the root on a fresh
        // spine, so splaying it is the clearest demonstration.
        setAccesses([picked[picked.length - 1], picked[picked.length - 1]]);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const s = stepHistory[currentStep] || {
        tree: null, activeVal: null, caseName: null, involved: [], depth: null,
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

    const codeExample = `def splay(root, key):
    """Rotate key to the root. Every access does this -- search,
    insert, even a miss -- so the tree reshapes around actual usage.
    """
    path = []
    cur = root
    while cur and cur.val != key:
        path.append(cur)
        cur = cur.left if key < cur.val else cur.right
    if cur is None:
        return root                 # nothing to splay

    node = cur
    while path:
        parent = path.pop()
        grandparent = path[-1] if path else None

        if grandparent is None:
            # ZIG: parent is the root, one rotation finishes.
            rotate_up(node, parent)
            root = node
        elif (parent.left is node) == (grandparent.left is parent):
            # ZIG-ZIG: straight line. Rotate the GRANDPARENT first --
            # doing the parent first would leave the path just as deep
            # and the amortised bound would not hold.
            rotate_up(parent, grandparent)
            rotate_up(node, parent)
            path.pop()
        else:
            # ZIG-ZAG: rotate the node up twice.
            rotate_up(node, parent)
            rotate_up(node, grandparent)
            path.pop()

        if not path:
            root = node
    return root


# No balance factor, no colour, no extra bytes per node.
# A single access may cost O(n), but it flattens the path it walked,
# so m operations cost O(m log n) overall.`;

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
                            <TrendingDown className="h-10 w-10" />Splay Trees
                        </h1>
                        <p className="text-xl text-emerald-100 mb-6 max-w-3xl mx-auto">
                            Self-adjusting: every access rotates its node to the root, so the keys you use most
                            become the cheapest to reach. No balance factors, no colours — just the access pattern.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">O(log n) amortised</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">O(n) worst single access</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">No extra bytes per node</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Zig · Zig-Zig · Zig-Zag</div>
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

                            <div className="grid sm:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Keys to insert</label>
                                    <input type="text" value={keys.join(', ')}
                                        onChange={e => {
                                            const v = e.target.value.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
                                            if (v.length > 0) setKeys([...new Set(v)].slice(0, 10));
                                        }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Then access, in order</label>
                                    <input type="text" value={accesses.join(', ')}
                                        onChange={e => {
                                            const v = e.target.value.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
                                            if (v.length > 0) setAccesses(v.slice(0, 5));
                                        }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                    <p className="text-xs text-slate-500 mt-1">Repeat a key to see the second access cost one comparison.</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="300" max="2200" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-emerald-500" />
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">{s.caseName ? s.caseName.toUpperCase() : s.depth !== null ? `depth ${s.depth}` : '—'}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {/* Case indicator */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {['zig', 'zig-zig', 'zig-zag'].map(c => (
                                    <div key={c} className={`p-3 rounded-lg border text-center transition-all duration-300 ${s.caseName === c ? 'border-emerald-400 bg-emerald-500/15' : 'border-slate-700 bg-slate-800/40'}`}>
                                        <div className={`text-sm font-bold ${s.caseName === c ? 'text-emerald-300' : 'text-slate-500'}`}>{c.toUpperCase()}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            {c === 'zig' ? 'parent is root' : c === 'zig-zig' ? 'straight line' : 'elbow'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Tree</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 min-h-[280px] flex items-center justify-center overflow-x-auto">
                                    <BinaryTreeCanvas
                                        tree={s.tree}
                                        emptyLabel="Empty tree — waiting for the first insertion"
                                        yGap={74}
                                        minXGap={50}
                                        maxXGap={84}
                                        widthBudget={600}
                                        styleFor={(node) => {
                                            const isTarget = node.val === s.activeVal;
                                            const involved = s.involved.includes(node.val);
                                            return {
                                                fill: isTarget ? '#10b981' : involved ? '#0f766e' : '#1e293b',
                                                stroke: isTarget ? '#6ee7b7' : involved ? '#2dd4bf' : '#475569',
                                                text: isTarget || involved ? '#ffffff' : '#e2e8f0',
                                                radius: isTarget ? 22 : 20,
                                                strokeWidth: isTarget || involved ? 2.5 : 1.5,
                                            };
                                        }}
                                    />
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />node being splayed</span>
                                    <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded-full bg-teal-700 inline-block" />parent / grandparent</span>
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
                                <div className="flex justify-between"><span className="text-slate-300">Amortised:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(log n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Single worst:</span><code className="bg-red-500/15 text-red-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Repeated key:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(1)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(n)</code></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Locality for free:</strong> hot keys drift to the top</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">No metadata:</strong> no colour, no height, no balance factor</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Zig-zig order matters</strong> — grandparent first, or the bound fails</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Reads mutate</strong> the tree, which complicates concurrency</span></li>
                            </ul>
                            <Link href="/indexing/red-black-trees" className="mt-4 inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                                Compare with the red-black tree →
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

export default SplayTreesPage;
