"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, Table2, Shuffle, Trash2 } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: 'Why can a closed hash table never hold more keys than it has slots?',
        options: [
            'Because the hash function only produces m distinct values',
            'Because every key must occupy a slot of the table itself',
            'Because the load factor is capped by the probe sequence',
            'It can — it resizes automatically when full',
        ],
        correct: 1,
        explanation: 'Closed hashing (open addressing) stores every key inside the table array. With n keys and m slots, α = n/m can never exceed 1, and performance collapses well before that — most implementations resize around α = 0.7.',
    },
    {
        question: 'What is primary clustering, and which probe strategy suffers from it?',
        options: [
            'Keys bunching into long runs of filled slots — linear probing',
            'Two keys sharing a home slot — double hashing',
            'Tombstones accumulating after deletes — quadratic probing',
            'Buckets overflowing into a shared area — all three equally',
        ],
        correct: 0,
        explanation: 'Linear probing walks one slot at a time, so any run of filled slots grows at both ends and merges with its neighbours. Every key landing anywhere in the run must traverse all of it. Quadratic probing and double hashing scatter their probes and avoid this.',
    },
    {
        question: 'Why does deleting a key need a tombstone rather than just clearing the slot?',
        options: [
            'To preserve the original insertion order',
            'To let the table know when to resize',
            'Because an empty slot would end probe sequences early, hiding later keys',
            'Because the hash function cannot be run in reverse',
        ],
        correct: 2,
        explanation: 'A lookup stops at the first truly empty slot. If a delete left a hole mid-sequence, any key that probed past that slot on insert would become unreachable. A tombstone says "keep going" while still being reusable by a later insert.',
    },
];

const DEFAULT_KEYS = [21, 14, 7, 35, 8, 42];
const SIZE = 11;

const probeName = { linear: 'Linear probing', quadratic: 'Quadratic probing', double: 'Double hashing' };

const EMPTY = null;
const TOMB = '__TOMB__';

const generateSteps = (keys, mode, deleteKey, searchKey) => {
    const steps = [];
    const m = SIZE;
    const table = new Array(m).fill(EMPTY);
    const snapshot = () => [...table];

    const h1 = (k) => ((k % m) + m) % m;
    const h2 = (k) => 1 + (((k % (m - 1)) + (m - 1)) % (m - 1));
    const probeAt = (k, i) => {
        if (mode === 'linear') return (h1(k) + i) % m;
        if (mode === 'quadratic') return (h1(k) + i * i) % m;
        return (h1(k) + i * h2(k)) % m;
    };
    const formula = (k, i) => {
        if (mode === 'linear') return `(${h1(k)} + ${i}) mod ${m}`;
        if (mode === 'quadratic') return `(${h1(k)} + ${i}²) mod ${m}`;
        return `(${h1(k)} + ${i}×${h2(k)}) mod ${m}`;
    };

    steps.push({
        phase: 'initialize', key: null, home: null, slot: null, probe: 0,
        table: snapshot(), inserted: 0,
        explanation: `${probeName[mode]} on a table of ${m} slots. Every key lives inside the array itself — there are no chains, so a collision has to find another slot.`,
    });

    let inserted = 0;
    for (const key of keys) {
        const home = h1(key);
        steps.push({
            phase: 'hashing', key, home, slot: null, probe: 0,
            table: snapshot(), inserted,
            explanation: `Insert ${key}: h(${key}) = ${key} mod ${m} = ${home}. That is its home slot — where the probe sequence starts.`,
        });

        let placed = false;
        for (let i = 0; i < m; i++) {
            const slot = probeAt(key, i);
            const occupant = table[slot];

            if (occupant === EMPTY || occupant === TOMB) {
                table[slot] = key;
                inserted++;
                placed = true;
                steps.push({
                    phase: 'placed', key, home, slot, probe: i,
                    table: snapshot(), inserted,
                    explanation: occupant === TOMB
                        ? `Slot ${slot} holds a tombstone, which an insert is free to reuse. ${key} lands here after ${i + 1} probe${i === 0 ? '' : 's'}.`
                        : `Slot ${slot} is free, so ${key} lands here after ${i + 1} probe${i === 0 ? '' : 's'}.`,
                });
                break;
            }

            steps.push({
                phase: 'probing', key, home, slot, probe: i,
                table: snapshot(), inserted,
                explanation: `Probe ${i}: ${formula(key, i)} = ${slot}, which already holds ${occupant}. Collision — advance the probe sequence.`,
            });
        }

        if (!placed) {
            steps.push({
                phase: 'full', key, home, slot: null, probe: m,
                table: snapshot(), inserted,
                explanation: `No free slot found for ${key} in ${m} probes. A closed table genuinely runs out of room — this is the hard ceiling chaining does not have.`,
            });
        }
    }

    // Delete, leaving a tombstone
    const delSlotIdx = table.findIndex(v => v === deleteKey);
    if (delSlotIdx !== -1) {
        steps.push({
            phase: 'deleting', key: deleteKey, home: h1(deleteKey), slot: delSlotIdx, probe: 0,
            table: snapshot(), inserted,
            explanation: `Delete ${deleteKey} from slot ${delSlotIdx}. Clearing the slot outright would be a bug — read the next step.`,
        });
        table[delSlotIdx] = TOMB;
        inserted--;
        steps.push({
            phase: 'tombstone', key: deleteKey, home: h1(deleteKey), slot: delSlotIdx, probe: 0,
            table: snapshot(), inserted,
            explanation: `Slot ${delSlotIdx} becomes a tombstone, not an empty slot. A lookup stops at the first truly empty slot, so a hole here would hide every key that probed past it on the way in.`,
        });
    }

    // Search
    const sHome = h1(searchKey);
    steps.push({
        phase: 'search_start', key: searchKey, home: sHome, slot: null, probe: 0,
        table: snapshot(), inserted,
        explanation: `Look up ${searchKey}. The search repeats the same probe sequence the insert used: h(${searchKey}) = ${sHome}.`,
    });

    let found = false;
    for (let i = 0; i < m; i++) {
        const slot = probeAt(searchKey, i);
        const occupant = table[slot];

        if (occupant === searchKey) {
            found = true;
            steps.push({
                phase: 'search_found', key: searchKey, home: sHome, slot, probe: i,
                table: snapshot(), inserted,
                explanation: `Found ${searchKey} at slot ${slot} after ${i + 1} probe${i === 0 ? '' : 's'}.`,
            });
            break;
        }
        if (occupant === EMPTY) {
            steps.push({
                phase: 'search_missing', key: searchKey, home: sHome, slot, probe: i,
                table: snapshot(), inserted,
                explanation: `Slot ${slot} is genuinely empty, so the probe sequence ends: ${searchKey} is not in the table. An empty slot is the only thing that stops a search.`,
            });
            break;
        }
        steps.push({
            phase: 'search_probe', key: searchKey, home: sHome, slot, probe: i,
            table: snapshot(), inserted,
            explanation: occupant === TOMB
                ? `Slot ${slot} is a tombstone. A search must step straight over it — this is exactly why deletes cannot clear the slot.`
                : `Slot ${slot} holds ${occupant}, not ${searchKey}. Keep probing.`,
        });
    }

    const used = table.filter(v => v !== EMPTY && v !== TOMB).length;
    steps.push({
        phase: 'complete', key: null, home: null, slot: null, probe: 0,
        table: snapshot(), inserted: used,
        explanation: `${used} keys in ${m} slots — load factor ${(used / m).toFixed(2)}. ${found ? '' : 'The lookup missed. '}With ${probeName[mode].toLowerCase()}, probe counts climb sharply as α approaches 1, which is why real tables resize near 0.7.`,
    });

    return steps;
};

const ClosedHashTablesPage = () => {
    const [keys, setKeys] = useState(DEFAULT_KEYS);
    const [mode, setMode] = useState('linear');
    const [deleteKey, setDeleteKey] = useState(14);
    const [searchKey, setSearchKey] = useState(35);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(keys, mode, deleteKey, searchKey));
        setCurrentStep(0);
    }, [keys, mode, deleteKey, searchKey]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };
    const randomize = () => {
        const n = Math.floor(Math.random() * 2) + 6;
        const next = Array.from({ length: n }, () => Math.floor(Math.random() * 90) + 1);
        setKeys(next);
        setDeleteKey(next[1]);
        setSearchKey(next[next.length - 1]);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const s = stepHistory[currentStep] || {
        phase: 'start', key: null, home: null, slot: null, probe: 0,
        table: new Array(SIZE).fill(EMPTY), inserted: 0,
        explanation: 'Click Play to begin',
    };

    const loadFactor = s.inserted / SIZE;

    const slotClass = (i) => {
        const v = s.table[i];
        const active = i === s.slot;
        if (active) {
            if (s.phase === 'placed' || s.phase === 'search_found') return 'bg-green-500 border-green-400 text-white scale-110';
            if (s.phase === 'tombstone' || s.phase === 'deleting') return 'bg-orange-500 border-orange-400 text-white scale-110';
            if (s.phase === 'probing' || s.phase === 'search_probe') return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
            if (s.phase === 'search_missing') return 'bg-red-500/30 border-red-500 text-red-200 scale-105';
            return 'bg-emerald-500 border-emerald-400 text-white scale-110';
        }
        if (v === TOMB) return 'bg-slate-800 border-orange-700/60 text-orange-400/70';
        if (v === EMPTY) return 'bg-slate-800 border-slate-700 text-slate-600';
        if (i === s.home) return 'bg-teal-800/60 border-teal-600 text-teal-100';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `EMPTY, TOMBSTONE = object(), object()


class ClosedHashTable:
    """Closed hashing, a.k.a. open addressing.

    Every key lives in the table array itself, so a collision
    probes for another slot instead of growing a chain.
    """

    def __init__(self, size=11, mode="linear"):
        self.size = size
        self.mode = mode
        self.slots = [EMPTY] * size
        self.count = 0

    def _h1(self, key):
        return hash(key) % self.size

    def _h2(self, key):
        # Must never return 0, or the probe would never move.
        return 1 + hash(key) % (self.size - 1)

    def _probe(self, key, i):
        if self.mode == "linear":
            return (self._h1(key) + i) % self.size
        if self.mode == "quadratic":
            return (self._h1(key) + i * i) % self.size
        return (self._h1(key) + i * self._h2(key)) % self.size

    def insert(self, key):
        for i in range(self.size):
            slot = self._probe(key, i)
            if self.slots[slot] in (EMPTY, TOMBSTONE):
                self.slots[slot] = key     # tombstones are reusable
                self.count += 1
                return slot
        raise RuntimeError("table full")

    def find(self, key):
        for i in range(self.size):
            slot = self._probe(key, i)
            if self.slots[slot] is EMPTY:
                return None                # only EMPTY ends the search
            if self.slots[slot] == key:
                return slot
        return None

    def delete(self, key):
        slot = self.find(key)
        if slot is None:
            raise KeyError(key)
        # NOT EMPTY: that would truncate probe sequences and
        # make later keys unreachable.
        self.slots[slot] = TOMBSTONE
        self.count -= 1`;

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
                            <Table2 className="h-10 w-10" />Closed Hash Tables
                        </h1>
                        <p className="text-xl text-emerald-100 mb-3 max-w-3xl mx-auto">
                            Open addressing: every key lives in the table itself, probing forward until it finds a free slot.
                        </p>
                        <p className="text-sm text-emerald-200/80 max-w-3xl mx-auto mb-6">
                            Also called <strong>open addressing</strong>. &quot;Closed hashing&quot; means keys stay <em>inside</em> the
                            table array — the opposite of the &quot;open hashing&quot; on the chaining page, despite how the names read.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Lookup: O(1) avg</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">α ≤ 1 always</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Cache friendly</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Needs tombstones</div>
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

                            {/* Probe strategy */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Probe strategy</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(probeName).map(([k, label]) => (
                                        <button key={k} onClick={() => { setMode(k); setIsPlaying(false); }}
                                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${mode === k ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    {mode === 'linear' && 'probe(k, i) = (h(k) + i) mod m — simple and cache friendly, but prone to primary clustering.'}
                                    {mode === 'quadratic' && 'probe(k, i) = (h(k) + i²) mod m — spreads probes out, but may not reach every slot.'}
                                    {mode === 'double' && 'probe(k, i) = (h₁(k) + i·h₂(k)) mod m — each key gets its own stride, scattering probes best.'}
                                </p>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-4 mb-6">
                                <div className="sm:col-span-1">
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Keys to insert</label>
                                    <input type="text" value={keys.join(', ')}
                                        onChange={e => {
                                            const v = e.target.value.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x) && x >= 0);
                                            if (v.length > 0) setKeys(v.slice(0, 9));
                                        }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1 text-sm font-medium mb-2 text-slate-300"><Trash2 className="h-3.5 w-3.5" />Then delete</label>
                                    <input type="number" value={deleteKey}
                                        onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setDeleteKey(v); }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Then look up</label>
                                    <input type="number" value={searchKey}
                                        onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setSearchKey(v); }}
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

                            <div className="grid grid-cols-4 gap-3 mb-6">
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-emerald-700/50 text-center">
                                    <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Key</div>
                                    <div className="text-xl font-bold text-emerald-300">{s.key ?? '—'}</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-teal-700/50 text-center">
                                    <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Home</div>
                                    <div className="text-xl font-bold text-teal-300">{s.home ?? '—'}</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-yellow-700/50 text-center">
                                    <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Probe i</div>
                                    <div className="text-xl font-bold text-yellow-300">{s.probe}</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-600 text-center">
                                    <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">α</div>
                                    <div className={`text-xl font-bold ${loadFactor > 0.7 ? 'text-orange-400' : 'text-slate-200'}`}>{loadFactor.toFixed(2)}</div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Table — every key lives inside the array</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 overflow-x-auto">
                                    <div className="flex gap-2 justify-center min-w-max">
                                        {s.table.map((v, i) => (
                                            <div key={i} className="text-center" style={{ width: '54px' }}>
                                                <div className="text-[10px] text-slate-500 mb-1">{i}</div>
                                                <div className={`h-14 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all duration-300 ${slotClass(i)}`}>
                                                    {v === EMPTY ? '∅' : v === TOMB ? '✕' : v}
                                                </div>
                                                {i === s.home && <div className="text-[9px] text-teal-400 mt-1">home</div>}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">
                                        <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />probing</span>
                                        <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-green-500 inline-block" />placed / found</span>
                                        <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-orange-500 inline-block" />tombstone (✕)</span>
                                        <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-slate-700 inline-block" />empty (∅)</span>
                                    </div>
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
                                <div className="flex justify-between"><span className="text-slate-300">Search avg:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(1/(1−α))</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Search worst:</span><code className="bg-red-500/15 text-red-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(m)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Max α:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">1.0</code></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">No pointers:</strong> one contiguous array, cache friendly</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Tombstones:</strong> a delete marks, it never clears</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Clustering:</strong> linear probing merges runs of filled slots</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Resize near α = 0.7</strong> — cost explodes as α → 1</span></li>
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

export default ClosedHashTablesPage;
