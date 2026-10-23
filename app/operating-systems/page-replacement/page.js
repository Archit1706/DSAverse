"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, Shuffle, Layers, AlertTriangle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const quizQuestions = [
    {
        question: 'Which of these policies can produce MORE page faults when it is given MORE frames?',
        options: ['LRU', 'Optimal', 'FIFO', 'None of them — more memory never hurts'],
        correct: 2,
        explanation: 'Belady\'s anomaly. LRU and Optimal are stack algorithms: the pages held with f frames are always a subset of those held with f + 1, so adding a frame can only remove faults. FIFO has no such property — on 1,2,3,4,1,2,5,1,2,3,4,5 it faults 9 times with 3 frames and 10 times with 4.',
    },
    {
        question: 'Why does no real kernel use the Optimal policy?',
        options: [
            'It is too slow to compute on every fault',
            'It needs to know which pages will be referenced in the future',
            'It suffers from Belady\'s anomaly',
            'It needs more frames than LRU to work',
        ],
        correct: 1,
        explanation: 'Optimal evicts the page whose next use is farthest away, which requires the future reference string. It is used offline as the yardstick: no policy can fault less on the same string.',
    },
    {
        question: 'Exact LRU needs a timestamp or list update on every memory access. What do kernels use instead?',
        options: [
            'FIFO, because Belady\'s anomaly is rare',
            'Random replacement',
            'Approximations such as the clock (second-chance) algorithm driven by a hardware reference bit',
            'Optimal, computed from profiling data',
        ],
        correct: 2,
        explanation: 'The MMU sets a reference bit when a page is touched; the clock hand sweeps the frames, clearing bits and evicting the first page whose bit is already clear. That approximates "not used recently" at almost no cost per access.',
    },
];

const ALGOS = {
    fifo: { label: 'FIFO', full: 'First-In, First-Out', rule: 'Evict the page that has been in memory longest. Hits change nothing.' },
    lru: { label: 'LRU', full: 'Least Recently Used', rule: 'Evict the page whose last use is furthest in the past. Every hit refreshes a page.' },
    opt: { label: 'Optimal', full: 'Optimal (Belady\'s MIN)', rule: 'Evict the page whose next use is furthest in the future — or that is never used again.' },
};
const ALGO_ORDER = ['fifo', 'lru', 'opt'];
const LINE = { fifo: '#f59e0b', lru: '#38bdf8', opt: '#34d399' };

const PRESETS = [
    { name: 'Textbook', refs: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1], frames: 3, algo: 'lru' },
    { name: "Belady's anomaly", refs: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5], frames: 3, algo: 'fifo' },
    { name: 'Loop of 4', refs: [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4], frames: 3, algo: 'lru' },
];

/* First position at or after `from` where `page` is referenced, or null. */
function nextUseOf(refs, page, from) {
    for (let j = from; j < refs.length; j++) if (refs[j] === page) return j;
    return null;
}

function generateSteps(refs, frameCount, algo) {
    const frames = Array(frameCount).fill(null);
    const loadedAt = Array(frameCount).fill(null);
    const lastUsed = Array(frameCount).fill(null);
    const history = [];
    const steps = [];
    let faults = 0;
    let hits = 0;

    const snap = (extra) => ({
        refs, algo, frameCount,
        frames: [...frames], loadedAt: [...loadedAt], lastUsed: [...lastUsed],
        nextUse: frames.map(p => (p === null ? null : nextUseOf(refs, p, extra.next))),
        history: history.map(h => ({ ...h, frames: [...h.frames] })),
        faults, hits, last: null,
        ...extra,
    });

    steps.push(snap({
        phase: 'start', next: 0,
        explanation: `${refs.length} references, ${frameCount} empty frame${frameCount === 1 ? '' : 's'}. ${ALGOS[algo].full}: ${ALGOS[algo].rule} The first reference to any page is always a fault.`,
    }));

    for (let k = 0; k < refs.length; k++) {
        const page = refs[k];
        const at = `#${k + 1}`;
        const resident = frames.indexOf(page);
        let last;
        let text;
        if (resident >= 0) {
            hits++;
            lastUsed[resident] = k;
            last = { page, hit: true, frame: resident, evicted: null };
            text = `${at}: page ${page} is already in frame ${resident} — hit.`;
            if (algo === 'lru') text += ` LRU records it as the most recently used page.`;
            else if (algo === 'fifo') text += ` FIFO does not care: page ${page} keeps its original place in the queue.`;
            else text += ` Nothing moves.`;
        } else {
            faults++;
            const free = frames.indexOf(null);
            if (free >= 0) {
                frames[free] = page;
                loadedAt[free] = k;
                lastUsed[free] = k;
                last = { page, hit: false, frame: free, evicted: null };
                text = `${at}: page ${page} is not in memory — page fault. Frame ${free} is still empty, so it loads there with no eviction.`;
            } else {
                let victim = 0;
                let why;
                if (algo === 'fifo') {
                    for (let f = 1; f < frameCount; f++) if (loadedAt[f] < loadedAt[victim]) victim = f;
                    why = `it has been resident longest (loaded at #${loadedAt[victim] + 1})`;
                } else if (algo === 'lru') {
                    for (let f = 1; f < frameCount; f++) if (lastUsed[f] < lastUsed[victim]) victim = f;
                    why = `it was used least recently (last at #${lastUsed[victim] + 1})`;
                } else {
                    const dist = frames.map(p => nextUseOf(refs, p, k + 1));
                    const far = (f) => (dist[f] === null ? Number.MAX_SAFE_INTEGER : dist[f]);
                    for (let f = 1; f < frameCount; f++) if (far(f) > far(victim)) victim = f;
                    why = dist[victim] === null
                        ? 'it is never used again'
                        : `it is not needed again until #${dist[victim] + 1}, later than any other resident page`;
                }
                const evicted = frames[victim];
                frames[victim] = page;
                loadedAt[victim] = k;
                lastUsed[victim] = k;
                last = { page, hit: false, frame: victim, evicted };
                text = `${at}: page ${page} faults and every frame is full. ${ALGOS[algo].label} evicts page ${evicted} from frame ${victim} because ${why}.`;
            }
        }
        history.push({ ...last, frames: [...frames] });
        steps.push(snap({ phase: 'ref', next: k + 1, last, explanation: text }));
    }

    const ratio = refs.length ? ((hits / refs.length) * 100).toFixed(0) : '0';
    steps.push(snap({
        phase: 'done', next: refs.length,
        explanation: `Done: ${faults} page faults and ${hits} hits out of ${refs.length} references (${ratio}% hit ratio) with ${frameCount} frame${frameCount === 1 ? '' : 's'}. Compare the other policies, or change the frame count, in the chart below.`,
    }));
    return steps;
}

const faultCount = (refs, frames, algo) => {
    const s = generateSteps(refs, frames, algo);
    return s[s.length - 1].faults;
};

/* Before the next reference, everything that decides it is on screen: the
   resident pages, and for each one its load time (FIFO), last use (LRU) or
   next use (Optimal). Options are rotated by position so "Hit" is not always
   the first button. */
function predictFor(step, next) {
    if (!step || !next) return null;
    if (step.next >= step.refs.length || next.phase !== 'ref') return null;
    const page = step.refs[step.next];
    const full = !step.frames.includes(null);
    const FREE = 'Fault — load into a free frame';
    const base = full ? ['Hit', ...step.frames.map(p => `Fault — evict ${p}`)] : ['Hit', FREE];
    const shift = step.next % base.length;
    const options = [...base.slice(shift), ...base.slice(0, shift)];
    const out = next.last;
    const label = out.hit ? 'Hit' : out.evicted === null ? FREE : `Fault — evict ${out.evicted}`;
    let because;
    if (out.hit) {
        because = `Page ${page} is already resident in frame ${out.frame}.`;
    } else if (out.evicted === null) {
        because = `Page ${page} is not resident, but frame ${out.frame} is still empty.`;
    } else {
        const v = out.frame;
        if (step.algo === 'fifo') because = `Memory is full and page ${out.evicted} has been resident longest (loaded at #${step.loadedAt[v] + 1}).`;
        else if (step.algo === 'lru') because = `Memory is full and page ${out.evicted} was used least recently (#${step.lastUsed[v] + 1}).`;
        else {
            const nu = nextUseOf(step.refs, out.evicted, step.next + 1);
            because = nu === null
                ? `Memory is full and page ${out.evicted} is never referenced again${step.frames.filter(p => nextUseOf(step.refs, p, step.next + 1) === null).length > 1 ? ' (several are not, so the lowest frame number is taken — any choice gives the same fault count)' : ''}.`
                : `Memory is full and page ${out.evicted} is next needed at #${nu + 1}, the furthest in the future.`;
        }
    }
    return {
        question: `Next reference: page ${page}. What does ${ALGOS[step.algo].label} do?`,
        options,
        correct: options.indexOf(label),
        because,
    };
}

const randomRefs = () => {
    const len = 14 + Math.floor(Math.random() * 5);
    const out = [];
    let cur = Math.floor(Math.random() * 7);
    for (let i = 0; i < len; i++) {
        // Mostly local moves, with the odd jump, so hits actually happen.
        cur = Math.random() < 0.7 ? Math.max(0, Math.min(6, cur + Math.floor(Math.random() * 3) - 1)) : Math.floor(Math.random() * 7);
        out.push(cur);
    }
    return out;
};

/* Faults for 1–7 frames under each policy. LRU and Optimal can only go down
   as frames are added; FIFO can go up, which is Belady's anomaly. */
function FaultsChart({ series, frames, algo, onPick }) {
    const W = 420, H = 190, L = 34, R = 12, T = 14, B = 30;
    const xs = [1, 2, 3, 4, 5, 6, 7];
    const maxY = Math.max(...Object.values(series).flat(), 1);
    const x = (f) => L + ((f - 1) * (W - L - R)) / 6;
    const y = (v) => T + (H - T - B) * (1 - v / maxY);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%">
            {[0, 0.5, 1].map(fr => (
                <g key={fr}>
                    <line x1={L} x2={W - R} y1={y(maxY * fr)} y2={y(maxY * fr)} stroke="#1e293b" />
                    <text x={L - 6} y={y(maxY * fr) + 3} textAnchor="end" fontSize="9" fill="#64748b">{Math.round(maxY * fr)}</text>
                </g>
            ))}
            <rect x={x(frames) - 10} y={T - 4} width={20} height={H - T - B + 8} rx="4" fill="rgba(234,179,8,0.10)" />
            {xs.map(f => (
                <text key={f} x={x(f)} y={H - 12} textAnchor="middle" fontSize="10" fill={f === frames ? '#facc15' : '#94a3b8'}
                    style={{ cursor: 'pointer' }} onClick={() => onPick(f)}>{f}</text>
            ))}
            <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle" fontSize="9" fill="#64748b">frames</text>
            {ALGO_ORDER.map(a => (
                <g key={a} opacity={a === algo ? 1 : 0.45}>
                    <polyline fill="none" stroke={LINE[a]} strokeWidth={a === algo ? 2.5 : 1.5}
                        points={series[a].map((v, i) => `${x(i + 1)},${y(v)}`).join(' ')} />
                    {series[a].map((v, i) => (
                        <circle key={i} cx={x(i + 1)} cy={y(v)} r={a === algo ? 3.5 : 2.5} fill={LINE[a]} />
                    ))}
                </g>
            ))}
        </svg>
    );
}

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    const answer = (i) => {
        if (quizState.answered) return;
        setQuizState(s => ({ ...s, selected: i, answered: true, score: i === q.correct ? s.score + 1 : s.score }));
    };
    const next = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };
    if (quizState.complete) {
        return (
            <div className="text-center">
                <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect score!' : 'Keep practicing!'}</p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="px-4 py-2 bg-yellow-500 text-slate-950 rounded-lg hover:bg-yellow-400 transition-colors text-sm font-medium">Try Again</button>
            </div>
        );
    }
    return (
        <div>
            <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
            <p className="text-sm font-medium text-slate-200 mb-3">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                    if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-yellow-500 hover:text-white bg-slate-800/50';
                    else if (i === q.correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                    else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                    else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                    return <button key={i} onClick={() => answer(i)} className={cls}>{opt}</button>;
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-3">{q.explanation}</p>
                    <button onClick={next} className="px-4 py-2 bg-yellow-500 text-slate-950 rounded-lg hover:bg-yellow-400 transition-colors text-sm font-medium">
                        {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                    </button>
                </div>
            )}
        </div>
    );
}

const codeExample = `def page_faults(refs, frames, policy):
    """Count faults for FIFO, LRU or OPT on a reference string."""
    memory = []          # FIFO: load order.  LRU: least -> most recent.
    faults = 0
    for i, page in enumerate(refs):
        if page in memory:
            if policy == "LRU":              # a hit refreshes recency
                memory.remove(page)
                memory.append(page)
            continue

        faults += 1
        if len(memory) == frames:
            if policy == "OPT":
                future = refs[i + 1:]
                # farthest next use; never-used-again counts as infinity
                victim = max(memory, key=lambda p: future.index(p)
                             if p in future else len(future))
            else:
                victim = memory[0]           # oldest load / least recent use
            memory.remove(victim)
        memory.append(page)
    return faults

belady = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
print(page_faults(belady, 3, "FIFO"))   # 9
print(page_faults(belady, 4, "FIFO"))   # 10  <- more frames, more faults`;

const PageReplacementPage = () => {
    const [refs, setRefs] = useState(PRESETS[0].refs);
    const [refText, setRefText] = useState(PRESETS[0].refs.join(', '));
    const [frames, setFrames] = useState(PRESETS[0].frames);
    const [algo, setAlgo] = useState(PRESETS[0].algo);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(refs, frames, algo));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [refs, frames, algo]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
    // New input means new steps; answers are keyed by step index and no longer apply.
    const resetPredict = predict.reset;
    useEffect(() => { resetPredict(); }, [stepHistory, resetPredict]);

    const series = useMemo(() => {
        const out = {};
        ALGO_ORDER.forEach(a => { out[a] = [1, 2, 3, 4, 5, 6, 7].map(f => faultCount(refs, f, a)); });
        return out;
    }, [refs]);
    const anomaly = useMemo(() => {
        for (let i = 0; i < 6; i++) if (series.fifo[i + 1] > series.fifo[i]) return { f: i + 1, a: series.fifo[i], b: series.fifo[i + 1] };
        return null;
    }, [series]);

    const step = stepHistory[currentStep];
    if (!step) return <div className="min-h-screen bg-slate-950" />;

    const applyRefs = (text) => {
        setRefText(text);
        const parsed = text.split(/[\s,]+/).filter(Boolean).map(Number).filter(v => Number.isInteger(v) && v >= 0 && v <= 9);
        if (parsed.length >= 1) setRefs(parsed.slice(0, 24));
    };
    const loadPreset = (p) => { setRefs(p.refs); setRefText(p.refs.join(', ')); setFrames(p.frames); setAlgo(p.algo); };
    const shuffle = () => { const r = randomRefs(); setRefs(r); setRefText(r.join(', ')); };

    const showOutcome = step.phase === 'ref';
    const out = step.last;
    // FIFO queue position (1 = oldest) and LRU recency rank (1 = least recent) for the badges.
    const rankBy = (vals) => {
        const occupied = vals.map((v, i) => ({ v, i })).filter(o => step.frames[o.i] !== null).sort((a, b) => a.v - b.v);
        const r = {};
        occupied.forEach((o, k) => { r[o.i] = k + 1; });
        return r;
    };
    const fifoRank = rankBy(step.loadedAt);
    const lruRank = rankBy(step.lastUsed);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/operating-systems" className="flex items-center text-white hover:text-yellow-100 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Operating Systems
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Layers className="h-10 w-10" />Page Replacement
                        </h1>
                        <p className="text-xl text-yellow-50 mb-6 max-w-3xl mx-auto">
                            When RAM is full and a page faults, something has to go. FIFO, LRU and Optimal each pick a different victim — and only one of them gets worse with more memory.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">FIFO · LRU · Optimal</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">O(f) per reference</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Belady&apos;s anomaly</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {ALGO_ORDER.map(k => (
                                    <button key={k} onClick={() => setAlgo(k)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${algo === k
                                            ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-yellow-500/60'}`}>
                                        {ALGOS[k].label}
                                    </button>
                                ))}
                                <div className="flex items-center gap-1 ml-auto">
                                    <span className="text-xs text-slate-400 mr-1">Frames</span>
                                    {[1, 2, 3, 4, 5, 6].map(f => (
                                        <button key={f} onClick={() => setFrames(f)}
                                            className={`w-8 h-8 rounded-md text-sm font-bold border transition-colors ${frames === f
                                                ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-yellow-500/60'}`}>{f}</button>
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-slate-300 mb-4"><span className="text-yellow-400 font-semibold">{ALGOS[algo].full}.</span> {ALGOS[algo].rule}</p>

                            <div className="mb-4">
                                <label className="block text-xs font-medium mb-1 text-slate-400">Reference string (pages 0–9, up to 24)</label>
                                <input type="text" value={refText} onChange={e => applyRefs(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm font-mono focus:border-yellow-500 outline-none" />
                            </div>

                            <div className="flex flex-wrap gap-3 mb-4">
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-slate-950 rounded-lg hover:bg-yellow-400 transition-colors font-medium disabled:opacity-50">
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={isPlaying || currentStep === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50">
                                    <SkipBack size={18} />Step Back
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50">
                                    <SkipForward size={18} />Step Forward
                                </button>
                                <button onClick={() => { setIsPlaying(false); setCurrentStep(0); predict.reset(); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={shuffle}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Randomize
                                </button>
                                <PredictToggle predict={predict} accent="yellow" />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs text-slate-500 mr-1">Presets:</span>
                                {PRESETS.map(p => (
                                    <button key={p.name} onClick={() => loadPreset(p)}
                                        className="px-3 py-1 text-xs rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60 hover:text-white transition-colors">
                                        {p.name}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-yellow-500" />
                            </div>

                            {/* Reference string */}
                            <div className="overflow-x-auto mb-5">
                                <div className="flex gap-1 min-w-max">
                                    {step.refs.map((p, i) => {
                                        const h = step.history[i];
                                        const isNext = i === step.next;
                                        let tone = 'bg-slate-800 border-slate-700 text-slate-400';
                                        if (h) tone = h.hit ? 'bg-green-500/20 border-green-500/60 text-green-300' : 'bg-red-500/20 border-red-500/60 text-red-300';
                                        if (isNext) tone = 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
                                        return (
                                            <div key={i} className="flex flex-col items-center">
                                                <div className={`w-8 h-9 rounded-md border-2 flex items-center justify-center font-bold text-sm font-mono transition-all duration-300 ${tone}`}>{p}</div>
                                                <span className={`text-[9px] mt-0.5 font-mono ${isNext ? 'text-yellow-300' : 'text-slate-600'}`}>{i + 1}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Frames */}
                            <div className="grid sm:grid-cols-[1fr_auto] gap-5 items-start">
                                <div className="space-y-2">
                                    {step.frames.map((p, f) => {
                                        const isTarget = showOutcome && out && out.frame === f;
                                        const isHitFrame = isTarget && out.hit;
                                        const isLoad = isTarget && !out.hit;
                                        let tone = p === null ? 'border-dashed border-slate-700 bg-slate-900/40' : 'border-slate-600 bg-slate-800/70';
                                        if (isHitFrame) tone = 'border-green-400 bg-green-500/15';
                                        if (isLoad) tone = 'border-red-400 bg-red-500/10';
                                        let meta = null;
                                        if (p !== null) {
                                            if (algo === 'fifo') meta = <>loaded #{step.loadedAt[f] + 1} <span className="text-yellow-300">· queue {fifoRank[f]}</span></>;
                                            else if (algo === 'lru') meta = <>last used #{step.lastUsed[f] + 1} <span className="text-yellow-300">· recency {lruRank[f]}</span></>;
                                            else meta = step.nextUse[f] === null ? <span className="text-yellow-300">never used again</span> : <>next use <span className="text-yellow-300">#{step.nextUse[f] + 1}</span></>;
                                        }
                                        return (
                                            <div key={f} className={`flex items-center gap-4 px-4 py-2.5 rounded-xl border-2 transition-all duration-300 ${tone}`}>
                                                <span className="text-[10px] uppercase tracking-wider text-slate-500 w-14">Frame {f}</span>
                                                <span key={`${p}-${step.loadedAt[f]}`}
                                                    className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl font-bold font-mono transition-transform duration-300 ${p === null ? 'text-slate-700' : 'bg-slate-950/60 text-slate-100'} ${isLoad ? 'scale-110 text-red-200' : ''} ${isHitFrame ? 'scale-110 text-green-200' : ''}`}>
                                                    {p === null ? '–' : p}
                                                </span>
                                                <span className="text-xs text-slate-400 font-mono flex-1">{meta}</span>
                                                {isLoad && out.evicted !== null && (
                                                    <span className="text-xs text-red-300 font-mono line-through decoration-2">{out.evicted}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <p className="text-[11px] text-slate-500">
                                        {algo === 'fifo' && 'Queue 1 is the oldest load — the next FIFO victim.'}
                                        {algo === 'lru' && 'Recency 1 is the least recently used page — the next LRU victim.'}
                                        {algo === 'opt' && 'Next use is counted from the upcoming reference; the furthest (or never) is the victim.'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 sm:w-36">
                                    <div className="p-3 bg-slate-800/60 rounded-lg border border-red-500/30 text-center">
                                        <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Page faults</div>
                                        <div className="text-3xl font-bold text-red-300 font-mono">{step.faults}</div>
                                    </div>
                                    <div className="p-3 bg-slate-800/60 rounded-lg border border-green-500/30 text-center">
                                        <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Hits</div>
                                        <div className="text-3xl font-bold text-green-300 font-mono">{step.hits}</div>
                                    </div>
                                </div>
                            </div>

                            {predict.prompt && (
                                <div className="mt-5">
                                    <PredictPrompt predict={predict} accent="yellow" />
                                </div>
                            )}

                            <div className="mt-5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    {/* The prompt asks about the upcoming reference; this text
                                        describes the one just processed, so it stays visible. */}
                                    <p className="text-yellow-200 text-sm leading-relaxed">{step.explanation}</p>
                                </div>
                            </div>
                        </div>

                        {/* Frame table */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-1">Frame contents after each reference</h3>
                            <p className="text-xs text-slate-500 mb-4">The textbook table, filled one column at a time. Red columns are faults.</p>
                            <div className="overflow-x-auto">
                                <table className="text-xs font-mono border-separate border-spacing-0.5">
                                    <thead>
                                        <tr>
                                            <th className="text-slate-500 font-normal pr-2 text-left">ref</th>
                                            {step.refs.map((p, i) => (
                                                <th key={i} className={`w-7 h-7 rounded ${i < step.history.length ? 'text-slate-200' : 'text-slate-600'}`}>{p}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: step.frameCount }).map((_, f) => (
                                            <tr key={f}>
                                                <td className="text-slate-500 pr-2">F{f}</td>
                                                {step.refs.map((_, i) => {
                                                    const h = step.history[i];
                                                    if (!h) return <td key={i} className="w-7 h-7 rounded bg-slate-900/40" />;
                                                    const v = h.frames[f];
                                                    const changed = !h.hit && h.frame === f;
                                                    return (
                                                        <td key={i} className={`w-7 h-7 rounded text-center ${changed ? 'bg-red-500/30 text-red-100 font-bold' : h.hit && h.frame === f ? 'bg-green-500/25 text-green-200' : 'bg-slate-800 text-slate-300'}`}>
                                                            {v === null ? '' : v}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        <tr>
                                            <td className="text-slate-500 pr-2">fault</td>
                                            {step.refs.map((_, i) => {
                                                const h = step.history[i];
                                                return <td key={i} className={`w-7 h-5 text-center ${h && !h.hit ? 'text-red-400' : 'text-green-500'}`}>{h ? (h.hit ? '·' : 'F') : ''}</td>;
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Faults vs frames */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-1">Faults as frames are added</h3>
                            <p className="text-xs text-slate-500 mb-3">Same reference string, 1 to 7 frames. Click a frame count to replay it.</p>
                            <div className="flex gap-4 text-xs mb-2">
                                {ALGO_ORDER.map(a => (
                                    <span key={a} className="flex items-center gap-1.5 text-slate-300">
                                        <span className="w-3 h-0.5" style={{ background: LINE[a] }} />{ALGOS[a].label} <span className="text-slate-500 font-mono">{series[a][frames - 1]}</span>
                                    </span>
                                ))}
                            </div>
                            <FaultsChart series={series} frames={frames} algo={algo} onPick={setFrames} />
                            {anomaly ? (
                                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-amber-200 leading-relaxed">
                                        Belady&apos;s anomaly on this string: FIFO faults <strong>{anomaly.a}</strong> times with {anomaly.f} frames but <strong>{anomaly.b}</strong> with {anomaly.f + 1}. LRU and Optimal never do this — they only go down.
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-3 text-xs text-slate-400">No anomaly on this string — every line only goes down. Load the Belady preset to see FIFO climb.</p>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-yellow-500" />
                                <h3 className="font-bold text-white">The Three Policies</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                {[
                                    ['fifo', 'Cheap: a queue of load order. Ignores how often a page is used, and can suffer Belady\'s anomaly.'],
                                    ['lru', 'Uses the recent past to predict the near future. Exact LRU needs work on every access, so kernels approximate it.'],
                                    ['opt', 'Looks into the future, so it cannot be built — but it is the lower bound every other policy is measured against.'],
                                ].map(([k, d]) => (
                                    <div key={k} className={`p-3 rounded-lg border ${algo === k ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-slate-700/60 bg-slate-800/30'}`}>
                                        <div className="font-semibold text-slate-100 mb-1 flex items-center gap-2">
                                            <span className="w-3 h-0.5" style={{ background: LINE[k] }} />{ALGOS[k].label}
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">{d}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-medium">
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

export default PageReplacementPage;
