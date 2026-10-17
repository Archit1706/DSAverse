"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, Hash, Shuffle, Search } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: 'In an "open hash table", where do colliding keys actually live?',
        options: [
            'In the next free slot of the table itself',
            'In a chain hanging off the slot, outside the table array',
            'They are rejected until the table is resized',
            'In a second table with a different hash function',
        ],
        correct: 1,
        explanation: 'Open hashing (separate chaining) stores each slot\'s keys in a list outside the table array, so the table never runs out of space for a collision. The confusingly named "closed hashing" is the one that keeps every key inside the table.',
    },
    {
        question: 'The load factor α is n/m. What does it tell you here?',
        options: [
            'The fraction of slots that are occupied, capped at 1',
            'The average chain length, which can exceed 1',
            'The number of resize operations performed',
            'The probability that the hash function is uniform',
        ],
        correct: 1,
        explanation: 'With chaining, n keys spread over m slots gives an average chain length of exactly α. Unlike open addressing, α can go above 1 — the table keeps working, lookups just get slower in proportion.',
    },
    {
        question: 'What makes a lookup degrade to O(n)?',
        options: [
            'A load factor above 0.75',
            'Deleting more keys than you insert',
            'Every key hashing to the same slot',
            'Using a table size that is a power of two',
        ],
        correct: 2,
        explanation: 'If the hash function sends every key to one slot, the table becomes a single linked list and lookup is a linear scan. This is why hash quality matters as much as table size.',
    },
];

// Chosen so the keys spread across slots with a couple of real chains.
// Multiples of the table size would all land in slot 0 and show only the
// degenerate case.
const DEFAULT_KEYS = [21, 8, 15, 3, 10, 29, 44];
const DEFAULT_SIZE = 7;

const generateSteps = (keys, size, searchKey) => {
    const steps = [];
    const table = Array.from({ length: size }, () => []);

    const snapshot = () => table.map(chain => [...chain]);

    steps.push({
        phase: 'initialize', key: null, hash: null, slot: null, chainIndex: null,
        table: snapshot(), probes: 0, inserted: 0,
        explanation: `An empty table of ${size} slots. Each slot holds a chain — a list that grows when keys collide — so a collision never has to look elsewhere for space.`,
    });

    keys.forEach((key, i) => {
        const hash = ((key % size) + size) % size;

        steps.push({
            phase: 'hashing', key, hash, slot: null, chainIndex: null,
            table: snapshot(), probes: 0, inserted: i,
            explanation: `Insert ${key}: h(${key}) = ${key} mod ${size} = ${hash}. The hash alone decides the slot — there is no searching for a free one.`,
        });

        const chain = table[hash];
        if (chain.length === 0) {
            steps.push({
                phase: 'placing', key, hash, slot: hash, chainIndex: 0,
                table: snapshot(), probes: 1, inserted: i,
                explanation: `Slot ${hash} is empty, so ${key} starts a new chain there.`,
            });
        } else {
            steps.push({
                phase: 'collision', key, hash, slot: hash, chainIndex: null,
                table: snapshot(), probes: 1, inserted: i,
                explanation: `Collision. Slot ${hash} already holds [${chain.join(', ')}], so ${key} is appended to that chain rather than displacing anything.`,
            });
        }

        chain.push(key);

        steps.push({
            phase: 'inserted', key, hash, slot: hash, chainIndex: chain.length - 1,
            table: snapshot(), probes: chain.length, inserted: i + 1,
            explanation: `${key} sits at position ${chain.length - 1} of slot ${hash}'s chain. Load factor is now ${((i + 1) / size).toFixed(2)} — the average chain length.`,
        });
    });

    // Search demo
    const sHash = ((searchKey % size) + size) % size;
    steps.push({
        phase: 'search_hash', key: searchKey, hash: sHash, slot: null, chainIndex: null,
        table: snapshot(), probes: 0, inserted: keys.length,
        explanation: `Now look up ${searchKey}. Hashing costs the same as it did on insert: h(${searchKey}) = ${sHash}.`,
    });

    const target = table[sHash];
    let found = false;
    for (let c = 0; c < target.length; c++) {
        const hit = target[c] === searchKey;
        steps.push({
            phase: hit ? 'search_found' : 'search_scan',
            key: searchKey, hash: sHash, slot: sHash, chainIndex: c,
            table: snapshot(), probes: c + 1, inserted: keys.length,
            explanation: hit
                ? `Found ${searchKey} after ${c + 1} comparison${c === 0 ? '' : 's'}. Only this one chain was ever touched — the rest of the table is irrelevant.`
                : `Slot ${sHash} holds ${target[c]}, not ${searchKey}. Walk to the next link in the chain.`,
        });
        if (hit) { found = true; break; }
    }

    if (!found) {
        steps.push({
            phase: 'search_missing', key: searchKey, hash: sHash, slot: sHash, chainIndex: null,
            table: snapshot(), probes: target.length, inserted: keys.length,
            explanation: `Chain at slot ${sHash} is exhausted without a match, so ${searchKey} is not in the table. A miss costs the full chain length.`,
        });
    }

    const longest = table.reduce((m, c) => Math.max(m, c.length), 0);
    steps.push({
        phase: 'complete', key: null, hash: null, slot: null, chainIndex: null,
        table: snapshot(), probes: 0, inserted: keys.length,
        explanation: `${keys.length} keys in ${size} slots: load factor ${(keys.length / size).toFixed(2)}, longest chain ${longest}. Average lookup touches about ${(keys.length / size).toFixed(2)} links — this is why chaining stays fast only while α stays small.`,
    });

    return steps;
};

const OpenHashTablesPage = () => {
    const [keys, setKeys] = useState(DEFAULT_KEYS);
    const [size, setSize] = useState(DEFAULT_SIZE);
    const [searchKey, setSearchKey] = useState(29);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(keys, size, searchKey));
        setCurrentStep(0);
    }, [keys, size, searchKey]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };
    const randomize = () => {
        const n = Math.floor(Math.random() * 3) + 7;
        const next = Array.from({ length: n }, () => Math.floor(Math.random() * 90) + 1);
        setKeys(next);
        setSearchKey(next[Math.floor(Math.random() * next.length)]);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const s = stepHistory[currentStep] || {
        phase: 'start', key: null, hash: null, slot: null, chainIndex: null,
        table: Array.from({ length: size }, () => []), probes: 0, inserted: 0,
        explanation: 'Click Play to begin',
    };

    const isSearch = s.phase.startsWith('search');
    const loadFactor = (s.inserted / size);

    const slotColor = (i) => {
        if (i !== s.slot) return 'border-slate-600 bg-slate-800/60';
        if (s.phase === 'collision') return 'border-red-400 bg-red-500/20';
        if (s.phase === 'search_found') return 'border-green-400 bg-green-500/20';
        if (isSearch) return 'border-yellow-300 bg-yellow-400/20';
        return 'border-emerald-400 bg-emerald-500/20';
    };

    const nodeColor = (slotIdx, chainIdx) => {
        const active = slotIdx === s.slot && chainIdx === s.chainIndex;
        if (!active) return 'bg-slate-700 border-slate-600 text-slate-200';
        if (s.phase === 'search_found' || s.phase === 'inserted') return 'bg-green-500 border-green-400 text-white scale-110';
        if (s.phase === 'search_scan') return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        return 'bg-emerald-500 border-emerald-400 text-white scale-110';
    };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `class OpenHashTable:
    """Open hashing, a.k.a. separate chaining.

    Every slot owns a list, so a collision extends that list
    instead of looking for space elsewhere in the table.
    """

    def __init__(self, size=7):
        self.size = size
        self.slots = [[] for _ in range(size)]
        self.count = 0

    def _hash(self, key):
        return hash(key) % self.size

    def insert(self, key, value=None):
        chain = self.slots[self._hash(key)]
        for i, (k, _) in enumerate(chain):
            if k == key:
                chain[i] = (key, value)    # overwrite, not append
                return
        chain.append((key, value))
        self.count += 1

    def get(self, key):
        for k, v in self.slots[self._hash(key)]:
            if k == key:
                return v
        raise KeyError(key)

    def delete(self, key):
        chain = self.slots[self._hash(key)]
        for i, (k, _) in enumerate(chain):
            if k == key:
                del chain[i]               # no tombstone needed
                self.count -= 1
                return
        raise KeyError(key)

    @property
    def load_factor(self):
        # Average chain length. Unlike open addressing this may
        # exceed 1.0 -- the table keeps working, just more slowly.
        return self.count / self.size`;

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
                            <Hash className="h-10 w-10" />Open Hash Tables
                        </h1>
                        <p className="text-xl text-emerald-100 mb-3 max-w-3xl mx-auto">
                            Separate chaining: each slot owns a list, so a collision extends a chain instead of hunting for free space.
                        </p>
                        <p className="text-sm text-emerald-200/80 max-w-3xl mx-auto mb-6">
                            Also called <strong>separate chaining</strong>. The older name &quot;open hashing&quot; means keys may live
                            <em> outside</em> the table array — not to be confused with &quot;open addressing&quot;, which is the opposite approach.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Lookup: O(1) avg</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Worst: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">α may exceed 1</div>
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
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Keys to insert</label>
                                    <input type="text" value={keys.join(', ')}
                                        onChange={e => {
                                            const v = e.target.value.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x) && x >= 0);
                                            if (v.length > 0) setKeys(v.slice(0, 12));
                                        }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Table size (m)</label>
                                    <input type="number" min="3" max="13" value={size}
                                        onChange={e => { const v = parseInt(e.target.value, 10); if (v >= 3 && v <= 13) setSize(v); }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="300" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-emerald-500" />
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">Phase: {s.phase}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {/* Registers */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-emerald-700/50 text-center">
                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Current Key</div>
                                    <div className="text-2xl font-bold text-emerald-300">{s.key ?? '—'}</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-teal-700/50 text-center">
                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">h(key)</div>
                                    <div className="text-2xl font-bold text-teal-300">{s.hash ?? '—'}</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-600 text-center">
                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Load factor α</div>
                                    <div className={`text-2xl font-bold ${loadFactor > 1 ? 'text-orange-400' : 'text-slate-200'}`}>{loadFactor.toFixed(2)}</div>
                                </div>
                            </div>

                            {/* Table + chains */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Table — each slot owns a chain</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 overflow-x-auto">
                                    <div className="flex gap-3 justify-center min-w-max">
                                        {s.table.map((chain, i) => (
                                            <div key={i} className="flex flex-col items-center" style={{ width: '58px' }}>
                                                <div className="text-[10px] text-slate-500 mb-1">slot {i}</div>
                                                <div className={`w-full h-11 rounded-lg border-2 flex items-center justify-center text-xs font-semibold text-slate-400 transition-all duration-300 ${slotColor(i)}`}>
                                                    {chain.length === 0 ? '∅' : `${chain.length}`}
                                                </div>
                                                {chain.map((k, c) => (
                                                    <div key={c} className="flex flex-col items-center">
                                                        <div className="w-px h-3 bg-emerald-600/60" />
                                                        <div className={`w-full px-2 py-1.5 rounded-md border-2 font-bold text-xs transition-all duration-300 ${nodeColor(i, c)}`} style={{ minWidth: '46px', textAlign: 'center' }}>
                                                            {k}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">
                                        <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />placed</span>
                                        <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-red-500 inline-block" />collision</span>
                                        <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />scanning</span>
                                        <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-green-500 inline-block" />found</span>
                                    </div>
                                </div>
                            </div>

                            {/* Search control */}
                            <div className="mb-6 flex items-center gap-3">
                                <Search className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                <label className="text-sm text-slate-300 flex-shrink-0">Look up key</label>
                                <input type="number" value={searchKey}
                                    onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setSearchKey(v); }}
                                    className="w-24 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                <span className="text-xs text-slate-500">after the inserts finish</span>
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
                                <div className="flex justify-between"><span className="text-slate-300">Insert:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(1)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Search avg:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(1 + α)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Search worst:</span><code className="bg-red-500/15 text-red-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(n + m)</code></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Never fills up:</strong> chains grow, so α can exceed 1</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Simple deletes:</strong> unlink the node, no tombstone</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Cost:</strong> pointer chasing hurts cache locality</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Hash quality</strong> matters as much as table size</span></li>
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

export default OpenHashTablesPage;
