"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Info, SkipBack, SkipForward, Play, Pause, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

// ─── AVL helpers ──────────────────────────────────────────────────────────────

const h = n => (n ? n.h : 0);
const bf = n => (n ? h(n.left) - h(n.right) : 0);
const upH = n => n ? { ...n, h: 1 + Math.max(h(n.left), h(n.right)) } : null;

function rotR(y) {
    const x = y.left, T2 = x.right;
    return upH({ ...x, right: upH({ ...y, left: T2 }) });
}
function rotL(x) {
    const y = x.right, T2 = y.left;
    return upH({ ...y, left: upH({ ...x, right: T2 }) });
}

function avlInsert(node, val) {
    if (!node) return { val, left: null, right: null, h: 1 };
    if (val < node.val) node = upH({ ...node, left: avlInsert(node.left, val) });
    else if (val > node.val) node = upH({ ...node, right: avlInsert(node.right, val) });
    else return node;

    const b = bf(node);
    if (b > 1 && val < node.left.val)  return rotR(node);              // LL
    if (b < -1 && val > node.right.val) return rotL(node);              // RR
    if (b > 1 && val > node.left.val)  return rotR({ ...node, left: rotL(node.left) });  // LR
    if (b < -1 && val < node.right.val) return rotL({ ...node, right: rotR(node.right) }); // RL
    return node;
}

// Returns array of { tree, inserted, rotationType, explanation }
function genAVLSteps(values) {
    const steps = [];
    let tree = null;
    steps.push({ tree: null, rotationType: null, inserted: null, explanation: 'Start with an empty AVL tree. Balance factor shown inside each node.' });
    for (const val of values) {
        const before = tree;
        const newTree = avlInsert(tree, val);
        // Detect rotation by comparing structure
        const rotType = detectRotation(before, val, newTree);
        const rotMsg = rotType ? ` — ${rotType} rotation applied to restore balance` : ' — tree is balanced, no rotation needed';
        steps.push({ tree: newTree, rotationType: rotType, inserted: val, explanation: `Inserted ${val}${rotMsg}.` });
    }
    return steps;
}

function detectRotation(before, val, after) {
    if (!before) return null;
    // Simple heuristic: check if root changed or structure significantly changed
    // We re-insert and check which case fired
    if (!before) return null;
    const b = bf(before);
    if (!before.left && !before.right) return null;

    function check(node) {
        if (!node) return null;
        const balance = bf(node);
        if (balance > 1) {
            if (node.left && val < node.left.val) return 'LL';
            if (node.left && val > node.left.val) return 'LR';
        }
        if (balance < -1) {
            if (node.right && val > node.right.val) return 'RR';
            if (node.right && val < node.right.val) return 'RL';
        }
        return check(node.left) || check(node.right);
    }
    // Check on before-rotation tree (the tree just after naive BST insert but before balancing)
    function bstOnly(node, v) {
        if (!node) return { val: v, left: null, right: null, h: 1 };
        if (v < node.val) return upH({ ...node, left: bstOnly(node.left, v) });
        if (v > node.val) return upH({ ...node, right: bstOnly(node.right, v) });
        return node;
    }
    const afterBST = bstOnly(before, val);
    return check(afterBST);
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function computeLayout(node, depth = 0, counter = { n: 0 }, xGap = 72) {
    if (!node) return { pos: {}, edges: [] };
    const left = computeLayout(node.left, depth + 1, counter, xGap);
    const x = counter.n * xGap + xGap / 2;
    const y = depth * 90 + 55;
    counter.n++;
    const right = computeLayout(node.right, depth + 1, counter, xGap);
    const pos = { ...left.pos, [node.val]: { x, y, bf: bf(node) }, ...right.pos };
    const edges = [...left.edges, ...right.edges];
    if (node.left) edges.push({ from: node.val, to: node.left.val });
    if (node.right) edges.push({ from: node.val, to: node.right.val });
    return { pos, edges };
}

function nodeCount(node) { return node ? 1 + nodeCount(node.left) + nodeCount(node.right) : 0; }
function treeH(node) { return node ? 1 + Math.max(treeH(node.left), treeH(node.right)) : 0; }

function AVLTreeSVG({ tree, inserted, rotationType }) {
    if (!tree) return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Empty tree — waiting for first insertion</div>;

    const n = nodeCount(tree);
    const depth = treeH(tree);
    const xGap = Math.max(52, Math.min(88, 600 / n));
    const { pos, edges } = computeLayout(tree, 0, { n: 0 }, xGap);
    const svgW = n * xGap;
    const svgH = depth * 90 + 60;

    function nodeFill(val, balance) {
        if (val === inserted) return '#84cc16';  // lime — newly inserted
        if (Math.abs(balance) > 1) return '#ef4444'; // red — unbalanced
        if (balance === 0) return '#166534';
        return '#15803d';
    }
    function bfColor(balance) {
        if (Math.abs(balance) > 1) return '#fca5a5';
        if (balance !== 0) return '#fde68a';
        return '#bbf7d0';
    }

    return (
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" className="overflow-visible">
            {edges.map((e, i) => {
                const p1 = pos[e.from]; const p2 = pos[e.to];
                if (!p1 || !p2) return null;
                return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#334155" strokeWidth="2" />;
            })}
            {Object.entries(pos).map(([val, { x, y, bf: balance }]) => {
                const v = +val;
                const fill = nodeFill(v, balance);
                return (
                    <g key={val} transform={`translate(${x},${y})`}>
                        <circle r="22" fill={fill} stroke={v === inserted ? '#d9f99d' : '#4ade80'} strokeWidth="1.5"
                            style={{ transition: 'fill 0.4s ease' }} />
                        <text textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="700" fill="white" dy="-3">{val}</text>
                        <text textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={bfColor(balance)} dy="10">
                            bf={balance > 0 ? '+' : ''}{balance}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
    { label: 'RR Rotation', values: [10, 20, 30], hint: 'Inserting 30 makes 10 right-heavy (bf=-2) → Left Rotate' },
    { label: 'LL Rotation', values: [30, 20, 10], hint: 'Inserting 10 makes 30 left-heavy (bf=+2) → Right Rotate' },
    { label: 'LR Rotation', values: [30, 10, 20], hint: 'Left-Right case: double rotation needed' },
    { label: 'RL Rotation', values: [10, 30, 20], hint: 'Right-Left case: double rotation needed' },
    { label: 'Mixed (6 nodes)', values: [10, 20, 30, 40, 50, 25], hint: 'Multiple rotations as tree grows' },
    { label: 'Larger tree', values: [15, 10, 20, 8, 12, 25, 5], hint: 'See how AVL maintains O(log n) height' },
];

const QUIZ = [
    { question: 'What balance factor makes an AVL node "unbalanced"?', options: ['> 0', '> 1 or < -1', '= 1', '≠ 0'], correct: 1, explanation: 'AVL allows balance factors of -1, 0, or +1. If |bf| > 1, a rotation is needed.' },
    { question: 'How many rotations does an LR (Left-Right) case require?', options: ['1', '2', '3', '0'], correct: 1, explanation: 'LR requires a left rotation on the left child, then a right rotation on the unbalanced node — two single rotations.' },
    { question: 'What is the guaranteed height of an AVL tree with n nodes?', options: ['O(n)', 'O(n²)', 'O(log n)', 'O(n log n)'], correct: 2, explanation: 'AVL rotations keep the tree balanced, guaranteeing height O(log n) and thus O(log n) search/insert/delete.' },
];

function QuizPanel({ qs, setQs }) {
    if (qs.complete) return (
        <div className="text-center py-4">
            <p className="text-white font-bold text-lg mb-1">{qs.score}/{QUIZ.length}</p>
            <p className="text-slate-400 text-sm mb-4">{qs.score === QUIZ.length ? 'Perfect!' : 'Keep practising!'}</p>
            <button onClick={() => setQs({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 bg-lime-600 hover:bg-lime-500 text-white rounded-lg text-sm">Retry</button>
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
            {qs.answered && <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-300">{q.explanation}</div>}
            {qs.answered && <button onClick={() => { if (qs.current + 1 >= QUIZ.length) setQs(s => ({ ...s, complete: true })); else setQs(s => ({ ...s, current: s.current + 1, selected: null, answered: false })); }} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs">{qs.current + 1 >= QUIZ.length ? 'See results' : 'Next →'}</button>}
            <p className="text-slate-500 text-xs text-right">{qs.current + 1}/{QUIZ.length}</p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AVLPage() {
    const [presetIdx, setPresetIdx] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [qs, setQs] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        const steps = genAVLSteps(PRESETS[presetIdx].values);
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    }, [presetIdx]);

    useEffect(() => {
        if (!isPlaying || !stepHistory.length) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const cur = stepHistory[currentStep] ?? { tree: null, inserted: null, rotationType: null, explanation: '' };
    const preset = PRESETS[presetIdx];

    const rotColors = { LL: 'text-blue-400', RR: 'text-orange-400', LR: 'text-purple-400', RL: 'text-pink-400' };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-600 to-green-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/trees" className="flex items-center text-white hover:text-lime-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Trees
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <RotateCcw className="h-10 w-10" />AVL Tree
                        </h1>
                        <p className="text-xl text-lime-100 mb-6 max-w-3xl mx-auto">
                            Self-balancing BST that tracks a balance factor at every node.
                            When |bf| exceeds 1, a rotation (LL, RR, LR, or RL) restores balance.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">O(log n) all ops</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">4 Rotation Types</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Advanced</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Preset selector */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {PRESETS.map((p, i) => (
                                    <button key={i} onClick={() => setPresetIdx(i)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${presetIdx === i ? 'bg-lime-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-slate-400 text-xs">{preset.hint}</p>
                            <p className="text-slate-500 text-xs">Insert sequence: <span className="text-lime-400 font-mono">[{preset.values.join(', ')}]</span></p>

                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setCurrentStep(0)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"><SkipBack className="h-3 w-3" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} className="p-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white transition-colors">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"><SkipForward className="h-3 w-3" /></button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"><RotateCcw className="h-4 w-4" /></button>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500">Fast</span>
                                <input type="range" min="300" max="2500" value={speed} onChange={e => setSpeed(+e.target.value)} className="flex-1 accent-lime-500" />
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

                        {/* Rotation badge */}
                        {cur.rotationType && (
                            <div className="flex items-center gap-3 bg-slate-800/70 rounded-lg px-4 py-2 border border-slate-700">
                                <span className="text-slate-400 text-sm">Rotation:</span>
                                <span className={`font-bold text-lg font-mono ${rotColors[cur.rotationType] || 'text-white'}`}>{cur.rotationType}</span>
                                <span className="text-slate-400 text-sm">{
                                    cur.rotationType === 'LL' ? '→ single Right Rotate' :
                                    cur.rotationType === 'RR' ? '→ single Left Rotate' :
                                    cur.rotationType === 'LR' ? '→ Left Rotate child, then Right Rotate root' :
                                    '→ Right Rotate child, then Left Rotate root'
                                }</span>
                            </div>
                        )}

                        {/* Tree */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6 min-h-72 overflow-x-auto">
                            <AVLTreeSVG tree={cur.tree} inserted={cur.inserted} rotationType={cur.rotationType} />
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                            {[['bg-lime-500', 'Just inserted'], ['bg-green-800', 'Balanced (bf=0)'], ['bg-green-700', 'Balanced (bf=±1)'], ['bg-red-500', 'Unbalanced (|bf|>1)']].map(([c, l]) => (
                                <span key={l} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded-full ${c}`} />{l}</span>
                            ))}
                        </div>

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
                            <h3 className="text-white font-semibold text-sm mb-3">Rotation Cases</h3>
                            <div className="space-y-2 text-xs text-slate-300">
                                {[
                                    { type: 'LL', color: 'text-blue-400', desc: 'New node in left subtree of left child → Right Rotate' },
                                    { type: 'RR', color: 'text-orange-400', desc: 'New node in right subtree of right child → Left Rotate' },
                                    { type: 'LR', color: 'text-purple-400', desc: 'New node in right subtree of left child → Left then Right Rotate' },
                                    { type: 'RL', color: 'text-pink-400', desc: 'New node in left subtree of right child → Right then Left Rotate' },
                                ].map(r => (
                                    <div key={r.type} className="flex gap-2 items-start">
                                        <span className={`font-bold font-mono ${r.color} w-6 flex-shrink-0`}>{r.type}</span>
                                        <span className="text-slate-400">{r.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <h3 className="text-white font-semibold text-sm mb-3">AVL Insert</h3>
                            <CodeBlock language="python" code={`def insert(node, val):
    # 1. Normal BST insert
    if not node: return Node(val)
    if val < node.val:
        node.left = insert(node.left, val)
    elif val > node.val:
        node.right = insert(node.right, val)
    else: return node  # duplicate

    # 2. Update height
    node.h = 1 + max(height(node.left),
                     height(node.right))

    # 3. Check balance
    b = balance_factor(node)

    # LL case
    if b > 1 and val < node.left.val:
        return rotate_right(node)
    # RR case
    if b < -1 and val > node.right.val:
        return rotate_left(node)
    # LR case
    if b > 1 and val > node.left.val:
        node.left = rotate_left(node.left)
        return rotate_right(node)
    # RL case
    if b < -1 and val < node.right.val:
        node.right = rotate_right(node.right)
        return rotate_left(node)

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
