"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Type, Info, SkipBack, SkipForward, Play, Pause, RotateCcw, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

// ─── Trie logic ───────────────────────────────────────────────────────────────

function newNode(ch = '') { return { ch, children: {}, isEnd: false, id: Math.random() }; }

function trieInsert(root, word) {
    let node = root;
    for (const ch of word) {
        if (!node.children[ch]) node.children[ch] = newNode(ch);
        node = node.children[ch];
    }
    node.isEnd = true;
    return root;
}

function buildTrie(words) {
    const root = newNode('');
    for (const w of words) trieInsert(root, w);
    return root;
}

// ─── Step generators ──────────────────────────────────────────────────────────

function genInsertSteps(existingWords, newWord) {
    const steps = [];
    let root = buildTrie(existingWords);
    let node = root;
    const path = [root];

    steps.push({ root, activePath: [], activeChar: null, done: false, explanation: `Start at root. Inserting "${newWord}".` });

    for (let i = 0; i < newWord.length; i++) {
        const ch = newWord[i];
        if (!node.children[ch]) {
            // Create node
            node.children[ch] = newNode(ch);
            const newRoot = buildTrie([...existingWords]); // rebuild for immutability
            // Actually mutate root (we're tracking state)
            steps.push({ root, activePath: newWord.slice(0, i + 1).split(''), activeChar: ch, done: false, explanation: `Character '${ch}' not found → create new node` });
        } else {
            steps.push({ root, activePath: newWord.slice(0, i + 1).split(''), activeChar: ch, done: false, explanation: `Character '${ch}' already exists → follow existing edge` });
        }
        node = node.children[ch];
    }

    node.isEnd = true;
    steps.push({ root, activePath: newWord.split(''), activeChar: null, done: true, explanation: `Mark last node as end-of-word. "${newWord}" is now in the trie.` });
    return steps;
}

function genSearchSteps(root, word) {
    const steps = [];
    let node = root;

    steps.push({ root, activePath: [], activeChar: null, found: null, explanation: `Start at root. Searching for "${word}".` });

    for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        if (!node.children[ch]) {
            steps.push({ root, activePath: word.slice(0, i).split(''), activeChar: ch, found: false, explanation: `Character '${ch}' has no edge from current node → "${word}" NOT FOUND` });
            return steps;
        }
        steps.push({ root, activePath: word.slice(0, i + 1).split(''), activeChar: ch, found: null, explanation: `Follow edge '${ch}' → node exists` });
        node = node.children[ch];
    }

    if (node.isEnd) {
        steps.push({ root, activePath: word.split(''), activeChar: null, found: true, explanation: `Reached end of word and node is marked end-of-word ✓ "${word}" FOUND` });
    } else {
        steps.push({ root, activePath: word.split(''), activeChar: null, found: false, explanation: `Reached end of "${word}" but node is not end-of-word → "${word}" is a prefix only, not a complete word` });
    }
    return steps;
}

// ─── Trie SVG Layout ──────────────────────────────────────────────────────────

function layoutTrie(root) {
    const nodes = [];
    const edges = [];
    let counter = { x: 0 };
    const xGap = 52, yGap = 72;

    function dfs(node, depth, parentX, parentY) {
        // Get children in alphabetical order
        const childKeys = Object.keys(node.children).sort();
        if (childKeys.length === 0) {
            const x = counter.x * xGap + xGap / 2;
            counter.x++;
            nodes.push({ id: node.id || node.ch, ch: node.ch || 'root', x, y: depth * yGap + 30, isEnd: node.isEnd, isRoot: !node.ch });
            if (parentX !== undefined) edges.push({ x1: parentX, y1: parentY, x2: x, y2: depth * yGap + 30, ch: node.ch });
            return x;
        }
        // Place children first to get their x range, then center parent
        const childXs = childKeys.map(k => dfs(node.children[k], depth + 1, undefined, undefined));
        const x = (childXs[0] + childXs[childXs.length - 1]) / 2;
        nodes.push({ id: node.id || node.ch, ch: node.ch || 'root', x, y: depth * yGap + 30, isEnd: node.isEnd, isRoot: !node.ch });
        if (parentX !== undefined) edges.push({ x1: parentX, y1: parentY, x2: x, y2: depth * yGap + 30, ch: node.ch });
        // Now update edges from children to this node
        childKeys.forEach((k, i) => {
            const childNode = nodes.find(n => n.ch === k && n.y === (depth + 1) * yGap + 30);
            // edges already added during child dfs if parentX was provided
        });
        return x;
    }

    // Two-pass: first compute positions, then add edges
    const positions = {};
    let xc = { n: 0 };

    function computePositions(node, depth) {
        const childKeys = Object.keys(node.children).sort();
        if (childKeys.length === 0) {
            const x = xc.n * xGap + xGap / 2;
            xc.n++;
            positions[node.id || 'root'] = { x, y: depth * yGap + 30, isEnd: node.isEnd, ch: node.ch || '' };
            return x;
        }
        const childXs = childKeys.map(k => computePositions(node.children[k], depth + 1));
        const x = (childXs[0] + childXs[childXs.length - 1]) / 2;
        positions[node.id || 'root'] = { x, y: depth * yGap + 30, isEnd: node.isEnd, ch: node.ch || '' };
        return x;
    }

    computePositions(root, 0);

    function addEdges(node, parentId) {
        const childKeys = Object.keys(node.children).sort();
        const nodeId = node.id || 'root';
        if (parentId !== null) {
            const p = positions[parentId];
            const c = positions[nodeId];
            if (p && c) edges.push({ x1: p.x, y1: p.y, x2: c.x, y2: c.y, ch: node.ch });
        }
        for (const k of childKeys) addEdges(node.children[k], nodeId);
    }
    addEdges(root, null);

    return { positions, edges };
}

function TrieSVG({ root, activePath, found }) {
    if (!root) return null;
    const { positions, edges } = layoutTrie(root);
    const posEntries = Object.entries(positions);
    if (!posEntries.length) return null;

    const xs = posEntries.map(([, p]) => p.x);
    const ys = posEntries.map(([, p]) => p.y);
    const svgW = Math.max(...xs) + 40;
    const svgH = Math.max(...ys) + 40;

    function nodeFill(id, isEnd, ch) {
        if (ch === '' || !ch) return '#1e3a5f'; // root
        const depth = activePath.findIndex((_, i) => activePath.slice(0, i + 1).join('') === activePath.slice(0, i + 1).join(''));
        const pathIdx = activePath.indexOf(ch);
        // Check if this node is on the active path by character sequence
        // This is a simplification — in a full implementation we'd track node IDs
        if (found === true && activePath.length > 0) {
            // All path nodes green
        }
        if (isEnd) return '#166534';
        return '#1e293b';
    }

    // Determine which node IDs are on the active path
    // Walk the trie along activePath and collect node IDs
    const activeNodeIds = new Set();
    let cur = root;
    activeNodeIds.add(root.id || 'root');
    for (const ch of activePath) {
        if (cur.children[ch]) {
            cur = cur.children[ch];
            activeNodeIds.add(cur.id);
        } else break;
    }

    function nodeStyle(id, isEnd) {
        const isActive = activeNodeIds.has(id);
        if (found === true && isActive) return { fill: '#22c55e', stroke: '#86efac' };
        if (found === false && isActive) return { fill: '#ef4444', stroke: '#fca5a5' };
        if (isActive) return { fill: '#fbbf24', stroke: '#fde68a' };
        if (isEnd) return { fill: '#166534', stroke: '#4ade80' };
        return { fill: '#1e293b', stroke: '#475569' };
    }

    return (
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" className="overflow-visible">
            {edges.map((e, i) => (
                <g key={i}>
                    <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#334155" strokeWidth="1.5" />
                    <text x={(e.x1 + e.x2) / 2 - 8} y={(e.y1 + e.y2) / 2} fontSize="11" fill="#64748b" fontWeight="600">{e.ch}</text>
                </g>
            ))}
            {posEntries.map(([id, { x, y, isEnd, ch }]) => {
                const style = nodeStyle(id, isEnd);
                const isRoot = !ch;
                return (
                    <g key={id} transform={`translate(${x},${y})`}>
                        <circle r="18" fill={style.fill} stroke={style.stroke} strokeWidth="2"
                            style={{ transition: 'fill 0.35s ease' }} />
                        {isEnd && <circle r="22" fill="none" stroke={style.stroke} strokeWidth="1" opacity="0.5" />}
                        <text textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="700"
                            fill={style.fill === '#1e293b' ? '#475569' : style.fill === '#1e3a5f' ? '#94a3b8' : '#0f172a'}>
                            {isRoot ? '•' : ch}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
const QUIZ = [
    { question: 'What is the time complexity of inserting a word of length L into a Trie?', options: ['O(1)', 'O(L)', 'O(n)', 'O(L log n)'], correct: 1, explanation: 'Each character is processed exactly once, creating or traversing one node per character → O(L).' },
    { question: 'What makes a Trie better than a hash map for prefix search?', options: ['O(1) lookup', 'Supports prefix queries natively', 'Less memory usage', 'Faster hash computation'], correct: 1, explanation: 'Tries store words as shared prefix paths, enabling all words with a given prefix to be found by traversing to the prefix node and listing descendants.' },
    { question: 'Which application is a Trie BEST suited for?', options: ['Range sum queries', 'Shortest path in a graph', 'Autocomplete / spell check', 'Sorting integers'], correct: 2, explanation: 'Tries are ideal for prefix-based operations: autocomplete engines use tries to find all words starting with a typed prefix in O(prefix length) time.' },
];

function QuizPanel({ qs, setQs }) {
    if (qs.complete) return (
        <div className="text-center py-4">
            <p className="text-white font-bold mb-1">{qs.score}/{QUIZ.length}</p>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

const WORD_SETS = [
    ['code', 'coder', 'coding', 'cup', 'cat'],
    ['apple', 'app', 'apply', 'apt', 'bat'],
    ['the', 'there', 'their', 'them', 'then'],
    ['ab', 'abc', 'abcd', 'bcd', 'bc'],
];
const SEARCH_WORDS = ['code', 'coder', 'cod', 'dog', 'cup', 'cat', 'ca'];

export default function TriePage() {
    const [wordSetIdx, setWordSetIdx] = useState(0);
    const [words, setWords] = useState(WORD_SETS[0]);
    const [mode, setMode] = useState('insert'); // 'insert' | 'search'
    const [insertIdx, setInsertIdx] = useState(0);
    const [searchWord, setSearchWord] = useState('code');
    const [searchInput, setSearchInput] = useState('code');
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [qs, setQs] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const fullTrie = useCallback(() => buildTrie(words), [words]);

    useEffect(() => {
        if (mode === 'insert') {
            const idx = Math.min(insertIdx, words.length - 1);
            const steps = genInsertSteps(words.slice(0, idx), words[idx]);
            setStepHistory(steps);
            setCurrentStep(0);
            setIsPlaying(false);
        } else {
            const root = fullTrie();
            const steps = genSearchSteps(root, searchWord);
            setStepHistory(steps);
            setCurrentStep(0);
            setIsPlaying(false);
        }
    }, [mode, insertIdx, words, searchWord, fullTrie]);

    useEffect(() => {
        if (!isPlaying || !stepHistory.length) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const cur = stepHistory[currentStep] ?? { root: fullTrie(), activePath: [], found: null, explanation: '' };

    function handleShuffle() {
        const next = (wordSetIdx + 1) % WORD_SETS.length;
        setWordSetIdx(next);
        setWords(WORD_SETS[next]);
        setInsertIdx(0);
        setMode('insert');
    }

    const accentColor = cur.found === true ? 'lime' : cur.found === false ? 'red' : 'yellow';

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-lime-600 to-green-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/trees" className="flex items-center text-white hover:text-lime-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Trees
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Type className="h-10 w-10" />Trie (Prefix Tree)
                        </h1>
                        <p className="text-xl text-lime-100 mb-6 max-w-3xl mx-auto">
                            Each path from root to an end-of-word node spells a complete word.
                            Shared prefixes share edges — making prefix queries and autocomplete O(L).
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Insert/Search: O(L)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(N·L·A)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Prefix Tree</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Intermediate</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Controls */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3">
                            <div className="flex flex-wrap gap-2 items-center">
                                <div className="flex rounded-lg border border-slate-700 overflow-hidden text-sm">
                                    {['insert', 'search'].map(m => (
                                        <button key={m} onClick={() => setMode(m)}
                                            className={`px-4 py-1.5 capitalize font-medium transition-colors ${mode === m ? 'bg-lime-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                            {m}
                                        </button>
                                    ))}
                                </div>

                                {mode === 'insert' ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {words.map((w, i) => (
                                            <button key={w} onClick={() => setInsertIdx(i)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${insertIdx === i ? 'bg-lime-600 text-white' : i < insertIdx ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                                {w}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400 text-sm">Word:</span>
                                        <input type="text" value={searchInput}
                                            onChange={e => setSearchInput(e.target.value.toLowerCase())}
                                            onBlur={() => setSearchWord(searchInput)}
                                            onKeyDown={e => e.key === 'Enter' && setSearchWord(searchInput)}
                                            className="w-28 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-lime-500 font-mono"
                                            placeholder="type word" />
                                    </div>
                                )}

                                <button onClick={handleShuffle} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 ml-auto"><Shuffle className="h-4 w-4" /></button>
                            </div>

                            {mode === 'insert' && (
                                <p className="text-slate-500 text-xs">
                                    Words in set: <span className="text-lime-400 font-mono">{words.join(', ')}</span>
                                    {' '} — select a word above to see its insertion
                                </p>
                            )}

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
                                    <div className="bg-lime-500 h-1.5 rounded-full transition-all"
                                        style={{ width: `${stepHistory.length > 1 ? (currentStep / (stepHistory.length - 1)) * 100 : 0}%` }} />
                                </div>
                                <span className="text-xs text-slate-500">{currentStep + 1}/{stepHistory.length}</span>
                            </div>
                        </div>

                        {/* Trie SVG */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6 min-h-64 overflow-x-auto">
                            {cur.root ? (
                                <TrieSVG root={cur.root} activePath={cur.activePath ?? []} found={cur.found ?? null} />
                            ) : (
                                <div className="flex items-center justify-center h-48 text-slate-500">Empty trie</div>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                            {[['bg-slate-800 border border-slate-700', 'Internal node'], ['bg-green-900', 'End-of-word node'], ['bg-yellow-400', 'Active path (insert)'], ['bg-green-500', 'Found'], ['bg-red-500', 'Not found / mismatch']].map(([c, l]) => (
                                <span key={l} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded-full ${c}`} />{l}</span>
                            ))}
                        </div>

                        <div className={`bg-${accentColor}-500/10 border border-${accentColor}-500/20 rounded-lg p-4`}>
                            <div className="flex items-start gap-2">
                                <Info className={`h-4 w-4 text-${accentColor}-400 mt-0.5 flex-shrink-0`} />
                                <p className={`text-${accentColor}-300 text-sm leading-relaxed`}>{cur.explanation}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <h3 className="text-white font-semibold text-sm mb-3">Implementation</h3>
                            <CodeBlock language="python" code={`class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return node.is_end

    def starts_with(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return True`} />
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
