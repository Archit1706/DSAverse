"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, GitBranch, Info, SkipBack, SkipForward, Play, Pause, RotateCcw } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

// ─── Fixed tree ───────────────────────────────────────────────────────────────
//         1
//       /   \
//      2     3
//     / \   / \
//    4   5 6   7
//       /
//      8

const TREE = {
    val: 1,
    left: {
        val: 2,
        left: { val: 4, left: null, right: null },
        right: { val: 5, left: { val: 8, left: null, right: null }, right: null },
    },
    right: {
        val: 3,
        left: { val: 6, left: null, right: null },
        right: { val: 7, left: null, right: null },
    },
};

// Fixed positions (7-node layout, SVG 480×280)
const POS = {
    1: { x: 240, y: 44 },
    2: { x: 130, y: 124 },
    3: { x: 350, y: 124 },
    4: { x: 68,  y: 204 },
    5: { x: 192, y: 204 },
    6: { x: 308, y: 204 },
    7: { x: 412, y: 204 },
    8: { x: 140, y: 280 },
};
const EDGES = [[1,2],[1,3],[2,4],[2,5],[3,6],[3,7],[5,8]];

// ─── Traversal generators ─────────────────────────────────────────────────────

function genInorder(node, visited = [], callStack = []) {
    const steps = [];
    function dfs(n, stack) {
        if (!n) return;
        steps.push({ visited: [...visited], callStack: [...stack, `inorder(${n.val})`], current: n.val, phase: 'enter', explanation: `Call inorder(${n.val}) — first recurse LEFT` });
        dfs(n.left, [...stack, `inorder(${n.val})`]);
        visited.push(n.val);
        steps.push({ visited: [...visited], callStack: [...stack, `inorder(${n.val})`], current: n.val, phase: 'visit', explanation: `Visit ${n.val} ← left done, right next` });
        dfs(n.right, [...stack, `inorder(${n.val})`]);
        steps.push({ visited: [...visited], callStack: [...stack], current: n.val, phase: 'return', explanation: `Return from inorder(${n.val})` });
    }
    dfs(node, []);
    return steps;
}

function genPreorder(node) {
    const steps = [];
    const visited = [];
    function dfs(n, stack) {
        if (!n) return;
        visited.push(n.val);
        steps.push({ visited: [...visited], callStack: [...stack, `preorder(${n.val})`], current: n.val, phase: 'visit', explanation: `Visit ${n.val} first, then recurse left and right` });
        dfs(n.left, [...stack, `preorder(${n.val})`]);
        steps.push({ visited: [...visited], callStack: [...stack], current: n.val, phase: 'return', explanation: `Return from preorder(${n.val})` });
        dfs(n.right, [...stack, `preorder(${n.val})`]);
    }
    dfs(node, []);
    return steps;
}

function genPostorder(node) {
    const steps = [];
    const visited = [];
    function dfs(n, stack) {
        if (!n) return;
        steps.push({ visited: [...visited], callStack: [...stack, `postorder(${n.val})`], current: n.val, phase: 'enter', explanation: `Call postorder(${n.val}) — recurse children first` });
        dfs(n.left, [...stack, `postorder(${n.val})`]);
        dfs(n.right, [...stack, `postorder(${n.val})`]);
        visited.push(n.val);
        steps.push({ visited: [...visited], callStack: [...stack], current: n.val, phase: 'visit', explanation: `Visit ${n.val} ← both children done` });
    }
    dfs(node, []);
    return steps;
}

function genLevelOrder(node) {
    const steps = [];
    const visited = [];
    const queue = [node];
    steps.push({ visited: [], callStack: ['Queue: [1]'], current: null, phase: 'enter', explanation: 'Enqueue root (1). Begin BFS level by level.' });
    while (queue.length) {
        const n = queue.shift();
        if (!n) continue;
        visited.push(n.val);
        const remaining = queue.map(x => x.val);
        if (n.left) { queue.push(n.left); remaining.push(n.left.val); }
        if (n.right) { queue.push(n.right); remaining.push(n.right.val); }
        steps.push({
            visited: [...visited],
            callStack: [`Queue: [${remaining.join(', ')}]`],
            current: n.val,
            phase: 'visit',
            explanation: `Dequeue ${n.val}. ${n.left || n.right ? `Enqueue children: ${[n.left?.val, n.right?.val].filter(Boolean).join(', ')}.` : 'No children.'}`,
        });
    }
    return steps;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
const QUIZ = [
    { question: 'Inorder traversal of a BST produces nodes in what order?', options: ['Random', 'Level by level', 'Ascending sorted order', 'Reverse sorted'], correct: 2, explanation: 'BST property guarantees left < root < right at every node, so inorder (L→Root→R) produces sorted ascending output.' },
    { question: 'Which traversal visits the root node FIRST?', options: ['Inorder', 'Preorder', 'Postorder', 'Level-order'], correct: 1, explanation: 'Preorder: Root → Left → Right. The root is processed before any of its children.' },
    { question: 'Level-order traversal uses which auxiliary data structure?', options: ['Stack', 'Queue', 'Array', 'Hash map'], correct: 1, explanation: 'BFS / Level-order uses a Queue (FIFO). A stack would give DFS behaviour instead.' },
];

function QuizPanel({ qs, setQs }) {
    if (qs.complete) return (
        <div className="text-center py-4">
            <p className="text-white font-bold text-lg mb-1">{qs.score}/{QUIZ.length}</p>
            <button onClick={() => setQs({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 bg-lime-600 text-white rounded-lg text-sm">Retry</button>
        </div>
    );
    const q = QUIZ[qs.current];
    return (
        <div className="space-y-3">
            <p className="text-slate-200 text-sm font-medium">{q.question}</p>
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
            {qs.answered && <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-300">{q.explanation}</div>}
            {qs.answered && <button onClick={() => { if (qs.current + 1 >= QUIZ.length) setQs(s => ({ ...s, complete: true })); else setQs(s => ({ ...s, current: s.current + 1, selected: null, answered: false })); }} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs">{qs.current + 1 >= QUIZ.length ? 'See results' : 'Next →'}</button>}
            <p className="text-slate-500 text-xs text-right">{qs.current + 1}/{QUIZ.length}</p>
        </div>
    );
}

// ─── Code snippets ────────────────────────────────────────────────────────────
const CODE = {
    Inorder: `def inorder(node):
    if not node: return
    inorder(node.left)   # L
    visit(node)          # Root
    inorder(node.right)  # R
# Output for BST: sorted ascending`,
    Preorder: `def preorder(node):
    if not node: return
    visit(node)           # Root
    preorder(node.left)   # L
    preorder(node.right)  # R
# Used for: tree copy, prefix expression`,
    Postorder: `def postorder(node):
    if not node: return
    postorder(node.left)   # L
    postorder(node.right)  # R
    visit(node)            # Root
# Used for: delete tree, postfix expr`,
    'Level Order': `from collections import deque
def level_order(root):
    if not root: return
    q = deque([root])
    while q:
        node = q.popleft()
        visit(node)
        if node.left:  q.append(node.left)
        if node.right: q.append(node.right)`,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const MODES = ['Inorder', 'Preorder', 'Postorder', 'Level Order'];
const EXPECTED = { Inorder: [4,2,8,5,1,6,3,7], Preorder: [1,2,4,5,8,3,6,7], Postorder: [4,8,5,2,6,7,3,1], 'Level Order': [1,2,3,4,5,6,7,8] };

export default function TraversalsPage() {
    const [mode, setMode] = useState('Inorder');
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(850);
    const [qs, setQs] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        let steps;
        if (mode === 'Inorder') steps = genInorder(TREE);
        else if (mode === 'Preorder') steps = genPreorder(TREE);
        else if (mode === 'Postorder') steps = genPostorder(TREE);
        else steps = genLevelOrder(TREE);
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    }, [mode]);

    useEffect(() => {
        if (!isPlaying || !stepHistory.length) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const cur = stepHistory[currentStep] ?? { visited: [], callStack: [], current: null, phase: 'start', explanation: '' };

    function nodeColor(v) {
        if (v === cur.current && cur.phase === 'visit') return '#22c55e';
        if (v === cur.current) return '#fbbf24';
        if (cur.visited.includes(v)) return '#6366f1';
        return '#1e293b';
    }
    function nodeBorder(v) {
        if (v === cur.current) return '#fde68a';
        if (cur.visited.includes(v)) return '#818cf8';
        return '#475569';
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-600 to-green-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/trees" className="flex items-center text-white hover:text-lime-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Trees
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <GitBranch className="h-10 w-10" />Binary Tree Traversals
                        </h1>
                        <p className="text-xl text-lime-100 mb-6 max-w-3xl mx-auto">
                            Four ways to visit every node. Each ordering has distinct use-cases —
                            inorder for sorted output, preorder for copying, postorder for deletion, level-order for BFS.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(h) DFS / O(w) BFS</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Beginner</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Mode tabs + controls */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {MODES.map(m => (
                                    <button key={m} onClick={() => setMode(m)}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-lime-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setCurrentStep(0)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"><SkipBack className="h-3 w-3" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} className="p-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"><SkipForward className="h-3 w-3" /></button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"><RotateCcw className="h-4 w-4" /></button>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500">Fast</span>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(+e.target.value)} className="flex-1 accent-lime-500" />
                                <span className="text-xs text-slate-500">Slow</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                    <div className="bg-lime-500 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${stepHistory.length > 1 ? (currentStep / (stepHistory.length - 1)) * 100 : 0}%` }} />
                                </div>
                                <span className="text-xs text-slate-500">{currentStep + 1}/{stepHistory.length}</span>
                            </div>
                        </div>

                        {/* Tree SVG */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                            <svg viewBox="0 0 480 316" width="100%" className="overflow-visible">
                                {EDGES.map(([a, b], i) => (
                                    <line key={i} x1={POS[a].x} y1={POS[a].y} x2={POS[b].x} y2={POS[b].y} stroke="#334155" strokeWidth="2" />
                                ))}
                                {Object.entries(POS).map(([val, { x, y }]) => {
                                    const v = +val;
                                    const isVisiting = v === cur.current;
                                    return (
                                        <g key={val} transform={`translate(${x},${y})`}>
                                            <circle r={isVisiting ? 22 : 20} fill={nodeColor(v)} stroke={nodeBorder(v)}
                                                strokeWidth={isVisiting ? 2.5 : 1.5} style={{ transition: 'fill 0.35s ease' }} />
                                            <text textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700"
                                                fill={nodeColor(v) === '#1e293b' ? '#e2e8f0' : '#0f172a'}>{val}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>

                        {/* Visit order */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <p className="text-slate-400 text-xs mb-2 font-medium">Visit order so far:</p>
                            <div className="flex flex-wrap gap-2">
                                {EXPECTED[mode].map((v, i) => (
                                    <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${cur.visited.includes(v) ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                        {v}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Call stack */}
                        {mode !== 'Level Order' && cur.callStack?.length > 0 && (
                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                                <p className="text-slate-400 text-xs mb-2 font-medium">Call Stack:</p>
                                <div className="space-y-1">
                                    {[...cur.callStack].reverse().map((frame, i) => (
                                        <div key={i} className={`px-3 py-1 rounded text-xs font-mono ${i === 0 ? 'bg-lime-600/20 text-lime-300 border border-lime-600/30' : 'bg-slate-800 text-slate-400'}`}>
                                            {frame}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {mode === 'Level Order' && cur.callStack?.[0] && (
                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                                <p className="text-slate-400 text-xs mb-2 font-medium">BFS Queue state:</p>
                                <div className="px-3 py-1 rounded text-xs font-mono bg-lime-600/20 text-lime-300 border border-lime-600/30">{cur.callStack[0]}</div>
                            </div>
                        )}

                        <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-lime-400 mt-0.5 flex-shrink-0" />
                                <p className="text-lime-300 text-sm leading-relaxed">{cur.explanation}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <h3 className="text-white font-semibold text-sm mb-3">{mode} Code</h3>
                            <CodeBlock language="python" code={CODE[mode]} />
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <h3 className="text-white font-semibold text-sm mb-3">Expected Output</h3>
                            <div className="space-y-2 text-xs">
                                {MODES.map(m => (
                                    <div key={m} className={`flex justify-between items-center px-2 py-1 rounded ${m === mode ? 'bg-lime-600/20 border border-lime-600/30' : ''}`}>
                                        <span className={m === mode ? 'text-lime-300 font-medium' : 'text-slate-500'}>{m}</span>
                                        <span className={`font-mono ${m === mode ? 'text-lime-200' : 'text-slate-600'}`}>[{EXPECTED[m].join(', ')}]</span>
                                    </div>
                                ))}
                            </div>
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
