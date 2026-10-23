"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Shuffle, Info, Code2, Database, Clock, Cpu, HardDrive } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const MEMTABLE_CAP = 3;      // entries before a flush
const L0_LIMIT = 2;          // L0 tables before compaction into L1
const BLOOM_BITS = 16;
const h1 = (k) => (k * 7 + 3) % BLOOM_BITS;
const h2 = (k) => (k * 11 + 5) % BLOOM_BITS;

/* Workloads in shorthand: P17=ant puts key 17, D42 deletes 42, G17 reads it. */
const parsePlan = (text) => text.split(' ').map(tok => {
    if (tok[0] === 'P') { const [k, v] = tok.slice(1).split('='); return { kind: 'put', key: Number(k), value: v }; }
    return { kind: tok[0] === 'D' ? 'delete' : 'get', key: Number(tok.slice(1)) };
});

const PRESETS = [
    {
        id: 'tour', name: 'Full tour',
        blurb: 'Writes, two flushes and a compaction, then reads that stop early, skip tables and hit a Bloom false positive.',
        plan: parsePlan('P17=ant P42=bee P8=cat P23=dog P17=elk P51=fox D42 P9=gnu G17 G42 P30=hen G23 G64 P5=owl P9=yak P77=ant G42 G9'),
    },
    {
        id: 'overwrite', name: 'Overwrites and tombstones',
        blurb: 'The same few keys written again and again. Old versions pile up on disk until compaction keeps only the newest.',
        plan: parsePlan('P10=ant P20=bee P30=cat P10=dog D20 P30=elk G20 G10 P10=fox P40=gnu P20=hen G10 G20 G30'),
    },
    {
        id: 'reads', name: 'Reads and Bloom filters',
        blurb: 'A loaded tree answering reads for keys that exist, keys that were never written and keys that only look present.',
        plan: parsePlan('P3=ant P14=bee P25=cat P36=dog P47=elk P58=fox P69=gnu P80=hen P91=owl G14 G15 G36 G50 G91 G2'),
    },
];

const WORDS = ['ant', 'bee', 'cat', 'dog', 'elk', 'fox', 'gnu', 'hen', 'owl', 'yak'];
function randomPlan(rand = Math.random) {
    const keys = [4, 9, 13, 18, 22, 27, 31, 36, 40, 45, 49, 54];
    const pool = keys.filter(() => rand() < 0.6).slice(0, 7);
    if (pool.length < 3) pool.push(...keys.slice(0, 3));
    const plan = [];
    for (let i = 0; i < 16; i++) {
        const x = rand();
        const key = pool[Math.floor(rand() * pool.length)];
        if (x < 0.55) plan.push({ kind: 'put', key, value: WORDS[Math.floor(rand() * WORDS.length)] });
        else if (x < 0.65) plan.push({ kind: 'delete', key });
        else plan.push({ kind: 'get', key: rand() < 0.2 ? keys[Math.floor(rand() * keys.length)] + 1 : key });
    }
    return plan;
}

const opLabel = (op) => (op.kind === 'put' ? `put(${op.key}, ${op.value})` : op.kind === 'delete' ? `delete(${op.key})` : `get(${op.key})`);
const show = (e) => (e.tomb ? 'tombstone' : e.value);

function buildBloom(entries) {
    const bits = Array(BLOOM_BITS).fill(0);
    entries.forEach(e => { bits[h1(e.key)] = 1; bits[h2(e.key)] = 1; });
    return bits;
}

function generateSteps(plan, blurb = '') {
    const steps = [];
    let mem = [];                // sorted entries
    let l0 = [];                 // newest first
    let l1 = null;
    let nextId = 1;
    const stats = { puts: 0, diskWrites: 0, flushes: 0, compactions: 0, blooms: 0, skips: 0, searches: 0, falsePositives: 0 };
    const clone = (t) => (t ? { ...t, entries: t.entries.map(e => ({ ...e })), bloom: [...t.bloom] } : null);
    const push = (data, explanation) => steps.push({
        mem: mem.map(e => ({ ...e })), l0: l0.map(clone), l1: clone(l1), stats: { ...stats },
        op: null, phase: null, focus: null, bits: null, found: null, merging: [], getResult: undefined, ...data, explanation,
    });
    const makeTable = (entries, level) => ({ id: `SST-${nextId++}`, level, entries, bloom: buildBloom(entries) });

    push({ phase: 'intro' }, `${blurb} Writes go to a small sorted memtable in memory (capacity ${MEMTABLE_CAP}); full memtables are written out as immutable sorted files, SSTables. Nothing on disk is ever updated in place.`.trim());

    const upsert = (entry) => {
        const i = mem.findIndex(e => e.key === entry.key);
        if (i !== -1) mem[i] = entry; else mem.push(entry);
        mem.sort((a, b) => a.key - b.key);
    };

    const compact = () => {
        const inputs = [...l0, ...(l1 ? [l1] : [])];          // newest first
        push({ phase: 'compact-start', merging: inputs.map(t => t.id) }, `L0 now holds ${l0.length} tables — the limit is ${L0_LIMIT}. Compaction merges ${inputs.map(t => t.id).join(', ')} into a single new L1 table, like the merge step of merge sort.`);
        const seen = new Map();
        const shadowed = [], dropped = [];
        for (const t of inputs) for (const e of t.entries) {
            if (seen.has(e.key)) { shadowed.push(`${e.key}=${show(e)}`); continue; }
            seen.set(e.key, e);
        }
        const merged = [...seen.values()].sort((a, b) => a.key - b.key).filter(e => { if (e.tomb) dropped.push(e.key); return !e.tomb; });
        stats.compactions++;
        stats.diskWrites += merged.length;
        l1 = makeTable(merged, 1);
        l0 = [];
        push({ phase: 'compact', focus: l1.id }, `Merged into ${l1.id} (${merged.length} entries, written sequentially). For each key only the newest version survives${shadowed.length ? ` — the older ${shadowed.join(', ')} ${shadowed.length > 1 ? 'are' : 'is'} discarded` : ''}.${dropped.length ? ` Tombstones for ${dropped.join(', ')} are dropped too: L1 is the bottom level, so nothing older is left for them to hide.` : ''}`);
    };

    const flush = () => {
        const t = makeTable(mem.map(e => ({ ...e })), 0);
        stats.flushes++;
        stats.diskWrites += t.entries.length;
        l0 = [t, ...l0];
        mem = [];
        push({ phase: 'flush', focus: t.id }, `The memtable is full, so it is written to disk as ${t.id}: one sequential write of ${t.entries.length} sorted entries, plus a ${BLOOM_BITS}-bit Bloom filter with bits h1(k) and h2(k) set for each key. ${t.id} is never modified again.`);
        if (l0.length >= L0_LIMIT) compact();
    };

    for (const op of plan) {
        if (op.kind === 'put' || op.kind === 'delete') {
            const entry = op.kind === 'put' ? { key: op.key, value: op.value, tomb: false } : { key: op.key, value: null, tomb: true };
            const replaced = mem.find(e => e.key === op.key);
            upsert(entry);
            stats.puts++;
            push({ phase: op.kind, op, focus: 'mem' }, op.kind === 'put'
                ? `${opLabel(op)} goes straight into the memtable${replaced ? `, replacing ${op.key}=${show(replaced)} there` : ''}. It is also appended to a write-ahead log for durability — but no data file is touched.${l0.some(t => t.entries.some(e => e.key === op.key)) || (l1 && l1.entries.some(e => e.key === op.key)) ? ` An older ${op.key} still sits on disk; it is simply shadowed.` : ''}`
                : `${opLabel(op)} cannot erase anything on disk — SSTables are immutable. It writes a tombstone for ${op.key} into the memtable, a marker that hides every older version.`);
            if (mem.length >= MEMTABLE_CAP) flush();
            continue;
        }

        // get: newest data first, stop at the first hit (a tombstone counts).
        const k = op.key;
        const path = [];
        let result = null;
        let done = false;
        const memHit = mem.find(e => e.key === k);
        path.push({ kind: 'mem', hit: memHit ?? null });
        if (memHit) { result = memHit; done = true; }
        const tables = [...l0, ...(l1 ? [l1] : [])];
        for (const t of tables) {
            if (done) break;
            const maybe = t.bloom[h1(k)] === 1 && t.bloom[h2(k)] === 1;
            path.push({ kind: 'bloom', table: t.id, maybe });
            if (!maybe) continue;
            const hit = t.entries.find(e => e.key === k) ?? null;
            path.push({ kind: 'search', table: t.id, hit });
            if (hit) { result = hit; done = true; }
        }
        const getResult = result && !result.tomb ? result.value : null;
        push({ phase: 'get-start', op, getResult }, `${opLabel(op)}: the newest version of ${k} wins, so the read checks the memtable first, then L0 from newest to oldest, then L1 — and stops at the first table that has ${k}.`);
        for (const p of path) {
            if (p.kind === 'mem') {
                push({ phase: 'get-mem', op, focus: 'mem', found: p.hit, getResult }, p.hit
                    ? `The memtable has ${k} = ${show(p.hit)}. ${p.hit.tomb ? `A tombstone: ${k} was deleted, and the read stops here without looking at the older copies on disk.` : 'Found in memory — no disk access at all.'}`
                    : `${k} is not in the memtable. On to disk.`);
            } else if (p.kind === 'bloom') {
                stats.blooms++;
                if (!p.maybe) stats.skips++;
                push({ phase: 'get-bloom', op, focus: p.table, bits: [h1(k), h2(k)], maybe: p.maybe, getResult }, p.maybe
                    ? `Bloom filter of ${p.table}: bits ${h1(k)} and ${h2(k)} are both set, so ${k} might be there. The table has to be searched.`
                    : `Bloom filter of ${p.table}: bit ${tables.find(t => t.id === p.table).bloom[h1(k)] ? h2(k) : h1(k)} is 0, so ${k} is definitely not in ${p.table}. Skipped without reading it.`);
            } else {
                stats.searches++;
                if (!p.hit) stats.falsePositives++;
                push({ phase: 'get-search', op, focus: p.table, found: p.hit, getResult }, p.hit
                    ? `Binary search in ${p.table} finds ${k} = ${show(p.hit)}.${p.hit.tomb ? ' A tombstone — the key is deleted.' : ''} The read stops: anything in older tables is out of date.`
                    : `Binary search in ${p.table} finds no ${k}: the Bloom filter gave a false positive — other keys happened to set both bits. One wasted read; the search moves on.`);
            }
        }
        push({ phase: 'get-result', op, getResult }, getResult !== null
            ? `${opLabel(op)} returns ${getResult}.`
            : `${opLabel(op)} returns nothing: ${result && result.tomb ? 'the newest version is a tombstone' : `no table holds ${k}`}.`);
    }

    const btree = stats.puts;
    push({ phase: 'done' }, `Done. ${stats.puts} writes became ${stats.flushes} flushes and ${stats.compactions} compaction${stats.compactions === 1 ? '' : 's'}: ${stats.diskWrites} entries written to disk, all sequentially — write amplification ${(stats.diskWrites / Math.max(stats.puts, 1)).toFixed(1)}×. A B-tree would have done about ${btree} random page writes instead, one per update, but could answer each read from a single path. Reads here cost ${stats.searches} table searches, with ${stats.skips} of ${stats.blooms} Bloom checks saving one.`);
    return steps;
}

/* Two decisions the screen settles: whether a Bloom filter lets a table be
   skipped (the bits are drawn), and what a get returns (every copy of the
   key is visible, and newest wins). */
const predictFor = (step, next) => {
    if (!step || !next) return null;
    if (next.phase === 'get-bloom') {
        const [a, b] = next.bits;
        return {
            question: `Checking ${next.focus} for key ${next.op.key}: h1 = ${a}, h2 = ${b}. What does its Bloom filter say?`,
            options: ['Skip it — definitely absent', 'Search it — maybe present'],
            correct: next.maybe ? 1 : 0,
            because: next.maybe ? `Bits ${a} and ${b} are both 1. That only means "maybe": other keys can set the same bits.` : 'At least one of the two bits is 0, which no key in the table could have left unset.',
        };
    }
    if (next.phase === 'get-start') {
        const k = next.op.key;
        const copies = [...step.mem, ...step.l0.flatMap(t => t.entries), ...(step.l1 ? step.l1.entries : [])].filter(e => e.key === k && !e.tomb);
        const values = [...new Set(copies.map(e => e.value))].sort();
        if (values.length === 0) return null;
        const options = [...values, 'Nothing (not found)'];
        return {
            question: `${opLabel(next.op)}: what does it return?`,
            options,
            correct: next.getResult === null ? options.length - 1 : options.indexOf(next.getResult),
            because: next.getResult === null
                ? `The newest version of ${k} — checking memtable, then L0 newest first, then L1 — is a tombstone, or ${k} was never written.`
                : `${next.getResult} is the newest version: it is found first when checking the memtable, then L0 newest first, then L1.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'Why are writes cheap in an LSM tree?',
        options: [
            'They skip durability',
            'They go to an in-memory memtable and reach disk only in large sequential flushes',
            'They overwrite the old value in place',
            'They are compressed',
        ],
        correct: 1,
        explanation: 'A write is a memtable insert plus a sequential log append. Disk sees only big sorted batches (flushes and compactions) instead of one random page write per update as in a B-tree.',
    },
    {
        question: 'A Bloom filter says "maybe present" for a key. What do you know?',
        options: ['The key is definitely in the table', 'The key might be in the table — you must search to be sure', 'The key is definitely not in the table', 'The table is corrupt'],
        correct: 1,
        explanation: 'Bloom filters have false positives but no false negatives. "No" lets the read skip the table; "maybe" still needs a search, which may come back empty.',
    },
    {
        question: 'How is a key deleted in an LSM tree?',
        options: [
            'Its entry is removed from every SSTable immediately',
            'A tombstone is written; compaction eventually drops the older versions and the tombstone itself',
            'The memtable is cleared',
            'Deletes are not supported',
        ],
        correct: 1,
        explanation: 'SSTables are immutable, so a delete is just another write — a marker that shadows older versions. Space is reclaimed only when compaction merges the tombstone down to the bottom level.',
    },
];

function TableCard({ t, step, label }) {
    const focused = step.focus === t.id;
    const merging = step.merging.includes(t.id);
    const k = step.op ? step.op.key : null;
    const searching = focused && step.phase === 'get-search';
    return (
        <div className={`rounded-lg border-2 p-2 min-w-[9.5rem] transition-all duration-500 ${merging ? 'border-amber-400 bg-amber-500/10' : focused ? (step.phase === 'get-bloom' ? (step.maybe ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-500 bg-slate-800/80 opacity-70') : 'border-blue-400 bg-blue-500/10') : 'border-slate-600 bg-slate-800'}`}
            style={step.phase === 'flush' && focused ? { animation: 'lsmdrop 0.6s ease' } : undefined}>
            <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11px] font-bold text-slate-200">{t.id}</span>
                <span className="text-[10px] text-slate-500">{label}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-1.5">
                {t.entries.map(e => {
                    const hit = searching && e.key === k;
                    return (
                        <span key={e.key} className={`font-mono text-[10px] px-1 py-0.5 rounded ${hit ? 'bg-green-500/30 text-green-200' : e.tomb ? 'bg-red-500/15 text-red-300 line-through' : 'bg-slate-700 text-slate-200'}`}>
                            {e.key}:{e.tomb ? '⊥' : e.value}
                        </span>
                    );
                })}
                {t.entries.length === 0 && <span className="text-[10px] text-slate-600">empty</span>}
            </div>
            <div className="flex gap-px" title="Bloom filter bits">
                {t.bloom.map((b, i) => {
                    const probed = focused && step.bits && step.bits.includes(i);
                    return <span key={i} className={`h-2.5 flex-1 rounded-sm ${probed ? (b ? 'bg-yellow-300' : 'bg-red-500') : b ? 'bg-teal-500/70' : 'bg-slate-700'}`} />;
                })}
            </div>
        </div>
    );
}

function LsmTreesPage() {
    const [presetId, setPresetId] = useState('tour');
    const [plan, setPlan] = useState(PRESETS[0].plan);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        const preset = PRESETS.find(p => p.id === presetId);
        setStepHistory(generateSteps(plan, preset ? preset.blurb : 'A random workload.'));
        setCurrentStep(0);
    }, [plan, presetId]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
    // usePredict keys answers by step index, so a new run (another preset,
    // level or shuffle) must start with none recorded.
    const resetPredict = predict.reset;
    useEffect(() => { resetPredict(); }, [stepHistory, resetPredict]);

    const choosePreset = (p) => { setIsPlaying(false); setPresetId(p.id); setPlan(p.plan); };
    const shuffle = () => { setIsPlaying(false); setPresetId(null); setPlan(randomPlan()); };
    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const step = stepHistory[currentStep];

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const codeExample = `TOMBSTONE = object()

class LSMTree:
    def __init__(self, cap=3, l0_limit=2):
        self.mem, self.l0, self.l1 = {}, [], []    # l0: newest first
        self.cap, self.l0_limit = cap, l0_limit

    def put(self, key, value):
        self.mem[key] = value                      # + append to the WAL
        if len(self.mem) >= self.cap:
            self.l0.insert(0, SSTable(sorted(self.mem.items())))
            self.mem = {}
            if len(self.l0) >= self.l0_limit:
                self.compact()

    def delete(self, key):
        self.put(key, TOMBSTONE)

    def get(self, key):
        if key in self.mem:
            v = self.mem[key]
            return None if v is TOMBSTONE else v
        for table in self.l0 + self.l1:            # newest first
            if not table.bloom.might_contain(key):
                continue                           # skip: no disk read
            v = table.search(key)                  # binary search
            if v is not None:
                return None if v is TOMBSTONE else v
        return None

    def compact(self):
        merged = {}
        for table in reversed(self.l0 + self.l1):  # oldest first,
            merged.update(table.items())           # so newer wins
        live = [(k, v) for k, v in sorted(merged.items()) if v is not TOMBSTONE]
        self.l0, self.l1 = [], [SSTable(live)]`;

    return (
        <div className="min-h-screen bg-slate-950">
            <style>{'@keyframes lsmdrop { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: none; } }'}</style>
            <div className="bg-gradient-to-r from-blue-500 to-teal-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/database-systems" className="flex items-center text-white hover:text-blue-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Database Systems
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Database className="h-10 w-10" />LSM Trees
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Never update a file in place: buffer writes in memory, flush them as sorted immutable files, and merge those files in the background. Reads pay for it by checking several places — and Bloom filters cut that cost.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Write: O(1) amortised</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Read: O(levels)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">RocksDB · Cassandra · LevelDB</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs uppercase tracking-wide text-slate-500 mr-1">Workload</span>
                                {PRESETS.map(p => (
                                    <button key={p.id} onClick={() => choosePreset(p)}
                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${p.id === presetId ? 'bg-blue-500/20 border-blue-400 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                        {p.name}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-3 mb-5">
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50">
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={isPlaying || currentStep === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50">
                                    <SkipBack size={18} />Step Back
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50">
                                    <SkipForward size={18} />Step Forward
                                </button>
                                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={shuffle} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Random Workload
                                </button>
                                <PredictToggle predict={predict} accent="blue" />
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-blue-500" />
                            </div>

                            <div className="mb-5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm font-mono text-blue-300">{step && step.op ? opLabel(step.op) : ''}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {step && (
                                <div className="space-y-3 mb-5">
                                    {/* Memory */}
                                    <div className={`rounded-lg border p-3 transition-colors ${step.focus === 'mem' ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700/60 bg-slate-800/50'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500"><Cpu className="h-3.5 w-3.5" />Memtable (memory, sorted)</span>
                                            <span className="text-[10px] text-slate-500">{step.mem.length}/{MEMTABLE_CAP}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 min-h-[1.75rem]">
                                            {step.mem.map(e => {
                                                const hit = step.phase === 'get-mem' && step.found && step.found.key === e.key;
                                                const fresh = step.op && step.op.key === e.key && (step.phase === 'put' || step.phase === 'delete');
                                                return (
                                                    <span key={e.key} className={`font-mono text-xs px-2 py-1 rounded border transition-colors ${hit ? 'border-green-400 bg-green-500/20 text-green-200' : fresh ? 'border-blue-400 bg-blue-500/20 text-blue-100' : e.tomb ? 'border-red-500/50 text-red-300' : 'border-slate-600 text-slate-200'}`}>
                                                        {e.key}:{e.tomb ? '⊥ tombstone' : e.value}
                                                    </span>
                                                );
                                            })}
                                            {step.mem.length === 0 && <span className="text-xs text-slate-600">empty</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <div className="flex-1 border-t border-dashed border-slate-600" />flush: one sequential write<div className="flex-1 border-t border-dashed border-slate-600" />
                                    </div>

                                    {/* Disk */}
                                    <div className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-3 space-y-3">
                                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500"><HardDrive className="h-3.5 w-3.5" />SSTables on disk (immutable)</div>
                                        <div>
                                            <div className="text-[11px] text-slate-400 mb-1">L0 — newest first, keys may overlap (limit {L0_LIMIT})</div>
                                            <div className="flex flex-wrap gap-2 min-h-[3rem]">
                                                {step.l0.map((t, i) => <TableCard key={t.id} t={t} step={step} label={i === 0 ? 'newest' : 'older'} />)}
                                                {step.l0.length === 0 && <span className="text-xs text-slate-600 self-center">empty</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] text-slate-400 mb-1">L1 — one sorted run, one version per key</div>
                                            <div className="flex flex-wrap gap-2 min-h-[3rem]">
                                                {step.l1 ? <TableCard t={step.l1} step={step} label="bottom" /> : <span className="text-xs text-slate-600 self-center">empty</span>}
                                            </div>
                                        </div>
                                        <div className="font-mono text-[10px] text-slate-500">Bloom: {BLOOM_BITS} bits, h1(k) = (7k + 3) mod 16, h2(k) = (11k + 5) mod 16</div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            ['Writes', step.stats.puts],
                                            ['Entries written to disk', step.stats.diskWrites],
                                            ['Table searches', step.stats.searches],
                                            ['Bloom skips', `${step.stats.skips}/${step.stats.blooms}`],
                                        ].map(([label, v]) => (
                                            <div key={label} className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-2 text-center">
                                                <div className="text-lg font-bold text-slate-100">{v}</div>
                                                <div className="text-[10px] text-slate-500">{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {predict.prompt && (
                                <div className="mb-4">
                                    <PredictPrompt predict={predict} accent="blue" />
                                </div>
                            )}

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-blue-200 text-sm leading-relaxed">
                                        {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step?.explanation ?? 'Click Play to begin.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-blue-400" />
                                <h3 className="font-bold text-white">LSM Tree vs B-Tree</h3>
                            </div>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-slate-500 text-left">
                                        <th className="font-medium pb-2" />
                                        <th className="font-medium pb-2">LSM tree</th>
                                        <th className="font-medium pb-2">B-tree</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-300">
                                    {[
                                        ['Write', 'memtable + sequential flush', 'random in-place page write'],
                                        ['Read', 'memtable, then each level', 'one root-to-leaf path'],
                                        ['Delete', 'tombstone, removed later', 'remove from the leaf'],
                                        ['Extra work', 'background compaction', 'page splits'],
                                        ['Best for', 'write-heavy ingest', 'read-heavy, range scans'],
                                    ].map(([k, a, b]) => (
                                        <tr key={k} className="border-t border-slate-800 align-top">
                                            <td className="py-1.5 pr-2 text-slate-500">{k}</td>
                                            <td className="py-1.5 pr-2">{a}</td>
                                            <td className="py-1.5">{b}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                Real engines keep many levels, each about ten times larger than the one above, and split each level into many small SSTables so compaction can work on a slice at a time.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect score!' : 'Keep practicing!'}</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">Try Again</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-sm font-medium text-slate-200 mb-3">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((option, i) => {
                                            let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                                            if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-blue-500 hover:text-white bg-slate-800/50';
                                            else if (i === quizQuestions[quizState.current].correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                                            return <button key={i} onClick={() => handleQuizAnswer(i)} className={cls}>{option}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQuestion} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                                                {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python Code
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LsmTreesPage;
