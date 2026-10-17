"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, Columns3, Shuffle, AlertTriangle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: 'Why does giving each slot a bucket of several entries help, when the total capacity is unchanged?',
        options: [
            'It lowers the load factor by definition',
            'A bucket is one cache line, so most collisions cost no extra memory fetch',
            'It makes the hash function more uniform',
            'It removes the need for tombstones',
        ],
        correct: 1,
        explanation: 'Capacity is the same, but locality is not. A bucket sized to a cache line means the first collision is resolved from memory already loaded — no second fetch. Probing to another slot, by contrast, is very likely a cache miss.',
    },
    {
        question: 'What happens when a key hashes to a bucket that is already full?',
        options: [
            'The table immediately resizes',
            'The key is rejected',
            'It probes on to the next bucket, and only spills to overflow if all are full',
            'The bucket grows dynamically to fit it',
        ],
        correct: 2,
        explanation: 'A full bucket falls back to ordinary probing — try the next bucket. Only when no bucket has room does the key go to the overflow area, which is a linear scan and the slowest path in the structure.',
    },
    {
        question: 'What is the main cost of making buckets larger?',
        options: [
            'Lookups scan more entries within a bucket',
            'The hash function becomes slower to compute',
            'Deletes stop working without tombstones',
            'The load factor can exceed 1',
        ],
        correct: 0,
        explanation: 'Every lookup scans the whole bucket before moving on, so a large bucket trades fewer memory fetches for more comparisons. The sweet spot is a bucket that fits one cache line — big enough to absorb collisions, small enough that the scan is trivial.',
    },
];

const DEFAULT_KEYS = [21, 14, 7, 35, 8, 42, 28, 19, 63, 11];
const BUCKETS = 5;
const BUCKET_SIZE = 3;

const generateSteps = (keys) => {
    const steps = [];
    const table = Array.from({ length: BUCKETS }, () => new Array(BUCKET_SIZE).fill(null));
    const overflow = [];

    const snapshot = () => ({ table: table.map(b => [...b]), overflow: [...overflow] });

    steps.push({
        phase: 'initialize', key: null, home: null, bucket: null, cell: null, toOverflow: false,
        ...snapshot(), placed: 0,
        explanation: `${BUCKETS} buckets of ${BUCKET_SIZE} entries each. A bucket is sized to fit one cache line, so the first few collisions cost nothing extra — they are already in memory.`,
    });

    let placed = 0;
    for (const key of keys) {
        const home = key % BUCKETS;
        steps.push({
            phase: 'hashing', key, home, bucket: null, cell: null, toOverflow: false,
            ...snapshot(), placed,
            explanation: `Insert ${key}: h(${key}) = ${key} mod ${BUCKETS} = ${home}. That selects a whole bucket, not a single cell.`,
        });

        let done = false;
        for (let b = 0; b < BUCKETS && !done; b++) {
            const idx = (home + b) % BUCKETS;
            const bucket = table[idx];
            const free = bucket.indexOf(null);

            if (free !== -1) {
                bucket[free] = key;
                placed++;
                done = true;
                steps.push({
                    phase: 'placed', key, home, bucket: idx, cell: free, toOverflow: false,
                    ...snapshot(), placed,
                    explanation: b === 0
                        ? `Bucket ${idx} has room at cell ${free}, so ${key} lands in its home bucket — one memory fetch, no probe.`
                        : `Home bucket was full, so after ${b} bucket probe${b === 1 ? '' : 's'} ${key} lands in bucket ${idx}, cell ${free}. This probe is the expensive part — a likely cache miss.`,
                });
            } else {
                steps.push({
                    phase: 'bucket_full', key, home, bucket: idx, cell: null, toOverflow: false,
                    ...snapshot(), placed,
                    explanation: `Bucket ${idx} is full — all ${BUCKET_SIZE} cells hold [${bucket.join(', ')}]. Probe on to the next bucket.`,
                });
            }
        }

        if (!done) {
            overflow.push(key);
            placed++;
            steps.push({
                phase: 'overflow', key, home, bucket: null, cell: null, toOverflow: true,
                ...snapshot(), placed,
                explanation: `Every bucket is full, so ${key} spills into the overflow area. Overflow is a plain linear scan — the slowest path in the structure, and the signal that it is time to resize.`,
            });
        }
    }

    const used = table.flat().filter(Boolean).length;
    steps.push({
        phase: 'complete', key: null, home: null, bucket: null, cell: null, toOverflow: false,
        ...snapshot(), placed,
        explanation: `${used} of ${BUCKETS * BUCKET_SIZE} bucket cells used${overflow.length ? `, with ${overflow.length} key${overflow.length === 1 ? '' : 's'} in overflow` : ', with nothing in overflow'}. Load factor ${(used / (BUCKETS * BUCKET_SIZE)).toFixed(2)} across the buckets.`,
    });

    return steps;
};

const BucketedHashTablesPage = () => {
    const [keys, setKeys] = useState(DEFAULT_KEYS);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(850);
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
        const n = Math.floor(Math.random() * 4) + 9;
        setKeys(Array.from({ length: n }, () => Math.floor(Math.random() * 90) + 1));
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const s = stepHistory[currentStep] || {
        phase: 'start', key: null, home: null, bucket: null, cell: null, toOverflow: false,
        table: Array.from({ length: BUCKETS }, () => new Array(BUCKET_SIZE).fill(null)),
        overflow: [], placed: 0,
        explanation: 'Click Play to begin',
    };

    const usedCells = s.table.flat().filter(Boolean).length;
    const loadFactor = usedCells / (BUCKETS * BUCKET_SIZE);

    const bucketClass = (b) => {
        if (b === s.bucket && s.phase === 'bucket_full') return 'border-red-400 bg-red-500/10';
        if (b === s.bucket) return 'border-emerald-400 bg-emerald-500/10';
        if (b === s.home) return 'border-teal-600 bg-teal-500/5';
        return 'border-slate-700 bg-slate-800/40';
    };

    const cellClass = (b, c) => {
        const v = s.table[b][c];
        const active = b === s.bucket && c === s.cell;
        if (active) return 'bg-green-500 border-green-400 text-white scale-110';
        if (v === null) return 'bg-slate-800 border-slate-700 text-slate-600';
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

    const codeExample = `class BucketedHashTable:
    """Closed hashing where each slot is a small bucket.

    A bucket is sized to one cache line, so the first few
    collisions are resolved from memory that is already loaded.
    """

    def __init__(self, buckets=5, bucket_size=3):
        self.buckets = buckets
        self.bucket_size = bucket_size
        self.table = [[None] * bucket_size for _ in range(buckets)]
        self.overflow = []

    def _hash(self, key):
        return hash(key) % self.buckets

    def insert(self, key):
        home = self._hash(key)

        # Try the home bucket, then probe bucket by bucket.
        for b in range(self.buckets):
            bucket = self.table[(home + b) % self.buckets]
            for cell in range(self.bucket_size):
                if bucket[cell] is None:
                    bucket[cell] = key
                    return
        # Everything is full: fall back to a linear overflow area.
        self.overflow.append(key)

    def find(self, key):
        home = self._hash(key)
        for b in range(self.buckets):
            bucket = self.table[(home + b) % self.buckets]
            # Scanning a whole bucket is cheap: it is one cache line.
            if key in bucket:
                return (home + b) % self.buckets
            if None in bucket:
                break          # a gap means the key was never pushed past here
        return "overflow" if key in self.overflow else None`;

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
                            <Columns3 className="h-10 w-10" />Closed Hash Tables with Buckets
                        </h1>
                        <p className="text-xl text-emerald-100 mb-6 max-w-3xl mx-auto">
                            Each slot holds several entries. Sized to a cache line, a bucket absorbs the first few collisions
                            without a second memory fetch — and spills to an overflow area only when everything is full.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">{BUCKETS} buckets × {BUCKET_SIZE}</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Lookup: O(1) avg</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Cache-line sized</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Overflow fallback</div>
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
                                <label className="block text-sm font-medium mb-2 text-slate-300">Keys to insert (enough to force an overflow)</label>
                                <input type="text" value={keys.join(', ')}
                                    onChange={e => {
                                        const v = e.target.value.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x) && x >= 0);
                                        if (v.length > 0) setKeys(v.slice(0, 18));
                                    }}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" />
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

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-emerald-700/50 text-center">
                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Current Key</div>
                                    <div className="text-2xl font-bold text-emerald-300">{s.key ?? '—'}</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-teal-700/50 text-center">
                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Home bucket</div>
                                    <div className="text-2xl font-bold text-teal-300">{s.home ?? '—'}</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-600 text-center">
                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Bucket fill</div>
                                    <div className={`text-2xl font-bold ${loadFactor > 0.8 ? 'text-orange-400' : 'text-slate-200'}`}>{loadFactor.toFixed(2)}</div>
                                </div>
                            </div>

                            {/* Buckets */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Buckets — each one is a cache line</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 overflow-x-auto">
                                    <div className="flex gap-4 justify-center min-w-max">
                                        {s.table.map((bucket, b) => (
                                            <div key={b} className={`rounded-xl border-2 p-2.5 transition-all duration-300 ${bucketClass(b)}`}>
                                                <div className="text-[10px] text-slate-400 text-center mb-2 font-semibold">bucket {b}</div>
                                                <div className="flex flex-col gap-1.5">
                                                    {bucket.map((v, c) => (
                                                        <div key={c} className={`w-14 h-10 rounded-md border-2 flex items-center justify-center font-bold text-xs transition-all duration-300 ${cellClass(b, c)}`}>
                                                            {v === null ? '·' : v}
                                                        </div>
                                                    ))}
                                                </div>
                                                {b === s.home && <div className="text-[9px] text-teal-400 text-center mt-1.5">home</div>}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Overflow */}
                                    <div className={`mt-5 rounded-xl border-2 border-dashed p-3 transition-all duration-300 ${s.toOverflow ? 'border-orange-400 bg-orange-500/10' : 'border-slate-700 bg-slate-900/40'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle className={`h-3.5 w-3.5 ${s.toOverflow ? 'text-orange-400' : 'text-slate-600'}`} />
                                            <span className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Overflow area — linear scan</span>
                                        </div>
                                        {s.overflow.length === 0 ? (
                                            <p className="text-xs text-slate-600">empty</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {s.overflow.map((k, i) => (
                                                    <span key={i} className="px-2.5 py-1 rounded-md bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold">{k}</span>
                                                ))}
                                            </div>
                                        )}
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
                                <div className="flex justify-between"><span className="text-slate-300">Search avg:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(1)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Bucket scan:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(B)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Overflow:</span><code className="bg-red-500/15 text-red-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(m×B)</code></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Locality:</strong> a bucket is one cache line, one fetch</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Fewer probes</strong> than single-cell open addressing</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Trade-off:</strong> bigger buckets mean longer scans</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Overflow</strong> is the slow path — resize before you need it</span></li>
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

export default BucketedHashTablesPage;
