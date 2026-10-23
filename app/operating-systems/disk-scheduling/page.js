"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, Shuffle, Disc3, ArrowRight, ArrowLeft as ArrowLeftIcon } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const quizQuestions = [
    {
        question: 'Which algorithm can leave a request at the far edge of the disk waiting indefinitely?',
        options: ['FCFS', 'SSTF', 'SCAN', 'C-LOOK'],
        correct: 1,
        explanation: 'SSTF always takes the closest request. If new requests keep arriving near the head, a distant one is never the closest and can starve. The sweeping algorithms guarantee the head reaches every cylinder on each pass.',
    },
    {
        question: 'What is the difference between SCAN and LOOK?',
        options: [
            'LOOK services requests in arrival order',
            'LOOK reverses at the last pending request instead of travelling to the end of the disk',
            'LOOK only moves in one direction',
            'There is no difference; they are two names for the elevator algorithm',
        ],
        correct: 1,
        explanation: 'SCAN always runs to cylinder 0 or the last cylinder before turning around, even when nothing is waiting out there. LOOK "looks" ahead and turns around as soon as no request remains in its direction, saving that wasted travel.',
    },
    {
        question: 'Why would an OS prefer C-SCAN over SCAN?',
        options: [
            'It always has a smaller total seek distance',
            'It gives more uniform waiting times by treating the cylinders as a circular list',
            'It does not need to know the head position',
            'It services requests in the order they arrive',
        ],
        correct: 1,
        explanation: 'Right after SCAN reverses, the cylinders it just passed are served again soon while the far end waits longest. C-SCAN always sweeps the same way and jumps back, so every cylinder waits about one full sweep — often at the cost of extra head movement.',
    },
];

const MAX = 199;
const ALGOS = {
    fcfs: { label: 'FCFS', rule: 'Serve requests in the order they arrived.' },
    sstf: { label: 'SSTF', rule: 'Serve the pending request closest to the head. Ties go to the lower cylinder.' },
    scan: { label: 'SCAN', rule: 'Sweep in one direction to the end of the disk, then reverse (the elevator).' },
    cscan: { label: 'C-SCAN', rule: 'Sweep to the end of the disk, jump back to the other end, and sweep the same way again.' },
    look: { label: 'LOOK', rule: 'Like SCAN, but turn around at the last pending request instead of the disk end.' },
    clook: { label: 'C-LOOK', rule: 'Like C-SCAN, but sweep only to the last request, then jump to the farthest request on the other side.' },
};
const ALGO_ORDER = ['fcfs', 'sstf', 'scan', 'cscan', 'look', 'clook'];

const PRESETS = [
    { name: 'Textbook', queue: [98, 183, 37, 122, 14, 124, 65, 67], head: 53, dir: 'up' },
    { name: 'Requests near the edges', queue: [10, 190, 20, 180, 5, 170, 195, 15], head: 100, dir: 'down' },
    { name: 'One far request', queue: [60, 72, 55, 80, 66, 190, 70, 58], head: 64, dir: 'down' },
];

/* The list of head stops an algorithm makes. kind: 'service' stops at a
   request, 'edge' runs to a disk end, 'jump' is the circular return. */
function planStops(queue, head, dir, algo) {
    let pending = [...queue];
    let pos = head;
    const stops = [];
    const up = dir === 'up';
    const go = (to, kind) => {
        stops.push({ from: pos, to, kind, serviced: pending.includes(to) });
        pending = pending.filter(p => p !== to);
        pos = to;
    };
    const ahead = () => pending.filter(p => (up ? p >= pos : p <= pos)).sort((a, b) => (up ? a - b : b - a));

    if (algo === 'fcfs') {
        queue.forEach(r => go(r, 'service'));
    } else if (algo === 'sstf') {
        while (pending.length) {
            const best = pending.reduce((b, p) => {
                const d = Math.abs(p - pos), db = Math.abs(b - pos);
                return d < db || (d === db && p < b) ? p : b;
            });
            go(best, 'service');
        }
    } else if (algo === 'scan' || algo === 'look') {
        ahead().forEach(p => go(p, 'service'));
        if (pending.length) {
            const end = up ? MAX : 0;
            if (algo === 'scan' && pos !== end) go(end, 'edge');
            [...pending].sort((a, b) => (up ? b - a : a - b)).forEach(p => go(p, 'service'));
        }
    } else if (algo === 'cscan') {
        ahead().forEach(p => go(p, 'service'));
        if (pending.length) {
            const end = up ? MAX : 0;
            if (pos !== end) go(end, 'edge');
            go(up ? 0 : MAX, 'jump');
            [...pending].sort((a, b) => (up ? a - b : b - a)).forEach(p => go(p, 'service'));
        }
    } else {
        ahead().forEach(p => go(p, 'service'));
        if (pending.length) {
            const rest = [...pending].sort((a, b) => (up ? a - b : b - a));
            go(rest[0], 'jump');
            rest.slice(1).forEach(p => go(p, 'service'));
        }
    }
    return stops;
}

function generateSteps(queue, head, dir, algo) {
    const stops = planStops(queue, head, dir, algo);
    const steps = [];
    const path = [head];
    const jumps = [];
    let pending = [...queue];
    const served = [];
    let total = 0;
    let jumpTotal = 0;
    let travel = dir;

    const snap = (extra) => ({
        queue, head0: head, dir, algo,
        head: path[path.length - 1], path: [...path], jumps: [...jumps],
        pending: [...pending], served: [...served], total, jumpTotal, travel,
        moves: path.length - 1, stop: null,
        ...extra,
    });

    steps.push(snap({
        phase: 'start',
        explanation: `The head rests on cylinder ${head}, moving towards ${dir === 'up' ? `higher cylinders (${MAX})` : 'cylinder 0'}. ${queue.length} requests are queued: ${queue.join(', ')}. ${ALGOS[algo].label}: ${ALGOS[algo].rule}`,
    }));

    stops.forEach((s, i) => {
        const d = Math.abs(s.to - s.from);
        const before = travel;
        if (s.kind !== 'jump' && s.to !== s.from) travel = s.to > s.from ? 'up' : 'down';
        const reversed = s.kind === 'service' && s.to !== s.from && travel !== before;
        total += d;
        if (s.kind === 'jump') { jumpTotal += d; jumps.push(path.length); }
        path.push(s.to);
        if (s.serviced) { pending = pending.filter(p => p !== s.to); served.push(s.to); }

        let why;
        if (algo === 'fcfs') why = `${s.to} is next in arrival order — FCFS never reorders, however far it is.`;
        else if (algo === 'sstf') {
            const others = steps[steps.length - 1].pending.filter(p => p !== s.to);
            const runner = others.length ? others.reduce((b, p) => (Math.abs(p - s.from) < Math.abs(b - s.from) ? p : b)) : null;
            why = `${s.to} is the closest pending request (${d} away${runner !== null ? `; the next closest, ${runner}, is ${Math.abs(runner - s.from)} away` : ''}).`;
        } else if (s.kind === 'edge') why = `No request is left in this direction, but some remain behind — ${ALGOS[algo].label} still runs to the end of the disk (${s.to}) before ${algo === 'scan' ? 'reversing' : 'returning'}.`;
        else if (s.kind === 'jump') {
            why = algo === 'cscan'
                ? `C-SCAN returns to cylinder ${s.to} in one quick sweep that serves nothing${s.serviced ? ` (except the request sitting at ${s.to})` : ''}, then sweeps ${dir} again.`
                : `Nothing is left ahead, so C-LOOK jumps back to the farthest request on the other side, ${s.to}, and sweeps ${dir} again.`;
        } else if (reversed) {
            why = algo === 'look'
                ? `Nothing is left ahead, so LOOK turns around right here and takes ${s.to}, the nearest request behind it — no trip to the disk end.`
                : `Having reached the end, SCAN reverses; ${s.to} is the first request it meets on the way back.`;
        } else why = `Still moving ${travel === 'up' ? 'up' : 'down'}, ${s.to} is the next request in that direction.`;

        steps.push(snap({
            phase: 'move', stop: { ...s, index: i, reversed },
            explanation: `${s.from} → ${s.to} (${d} cylinder${d === 1 ? '' : 's'}). ${why} Total so far: ${total}.`,
        }));
    });

    steps.push(snap({
        phase: 'done',
        explanation: `All ${queue.length} requests served in order ${served.join(', ')}. Total head movement: ${total} cylinders${jumpTotal ? `, of which ${jumpTotal} is the return jump` : ''}.`,
    }));
    return steps;
}

const totalSeek = (queue, head, dir, algo) => {
    const s = generateSteps(queue, head, dir, algo);
    const last = s[s.length - 1];
    return { total: last.total, jump: last.jumpTotal };
};

/* Before each move, the head position, the travel direction, the queue order
   and the pending requests are all on screen — enough to know the next stop.
   Options: the right stop plus the most tempting wrong ones (nearest on each
   side, the FCFS next, the disk ends), sorted and then rotated. */
function predictFor(step, next) {
    if (!step || !next) return null;
    if (next.phase !== 'move') return null;
    const target = next.stop.to;
    const pos = step.head;
    const below = step.pending.filter(p => p < pos);
    const above = step.pending.filter(p => p > pos);
    const pool = [
        target,
        below.length ? Math.max(...below) : null,
        above.length ? Math.min(...above) : null,
        step.queue.find(q => step.pending.includes(q)) ?? null,
        step.travel === 'up' ? MAX : 0,
        step.travel === 'up' ? 0 : MAX,
        below.length ? Math.min(...below) : null,
        above.length ? Math.max(...above) : null,
    ];
    const picks = [];
    for (const c of pool) {
        if (c === null || picks.includes(c)) continue;
        if (c === pos && c !== target) continue;
        picks.push(c);
        if (picks.length === 4) break;
    }
    if (picks.length < 2) return null;
    picks.sort((a, b) => a - b);
    const shift = (step.moves + pos) % picks.length;
    const order = [...picks.slice(shift), ...picks.slice(0, shift)];
    const s = next.stop;
    const d = Math.abs(s.to - s.from);
    let because;
    if (step.algo === 'fcfs') because = `${s.to} is the oldest request still waiting.`;
    else if (step.algo === 'sstf') because = `${s.to} is the closest pending request, ${d} away.`;
    else if (s.kind === 'edge') because = `Requests remain behind the head, and ${ALGOS[step.algo].label} always finishes the sweep at the disk end.`;
    else if (s.kind === 'jump') because = step.algo === 'cscan' ? `C-SCAN wraps around to the opposite end (${s.to}) and sweeps the same way again.` : `C-LOOK jumps to the farthest pending request on the other side (${s.to}).`;
    else if (s.reversed) because = step.algo === 'look' ? `Nothing remains ahead, so LOOK reverses immediately and takes the nearest request behind (${s.to}).` : `After touching the end, SCAN reverses to the nearest request behind (${s.to}).`;
    else because = `Moving ${step.travel}, ${s.to} is the next pending request in that direction.`;
    return {
        question: `Head at ${pos}, moving ${step.travel}. Where does ${ALGOS[step.algo].label} go next?`,
        options: order.map(c => `Cylinder ${c}`),
        correct: order.indexOf(target),
        because,
    };
}

const randomQueue = () => {
    const set = new Set();
    while (set.size < 8) set.add(Math.floor(Math.random() * (MAX + 1)));
    return [...set];
};

const X = (c) => 24 + (c / MAX) * 572;

function HeadChart({ step, totalMoves }) {
    const rowH = Math.min(26, Math.max(14, 240 / Math.max(totalMoves, 1)));
    const top = 56;
    const H = top + rowH * totalMoves + 24;
    const pts = step.path.map((c, i) => [X(c), top + i * rowH]);
    const allReq = step.queue;
    // Requests a few cylinders apart would print on top of each other, so
    // neighbours that close alternate between two label rows.
    const labelRow = {};
    [...allReq].sort((a, b) => a - b).reduce((prev, c) => {
        labelRow[c] = prev !== null && c - prev < 10 && labelRow[prev] === 0 ? 1 : 0;
        return c;
    }, null);
    return (
        <svg viewBox={`0 0 620 ${H}`} width="100%">
            {/* axis */}
            <line x1={X(0)} y1={26} x2={X(MAX)} y2={26} stroke="#475569" strokeWidth="1.5" />
            {[0, 50, 100, 150, MAX].map(c => (
                <g key={c}>
                    <line x1={X(c)} y1={22} x2={X(c)} y2={30} stroke="#475569" />
                    <line x1={X(c)} y1={30} x2={X(c)} y2={H - 10} stroke="#1e293b" />
                    <text x={X(c)} y={14} textAnchor="middle" fontSize="9" fill="#64748b">{c}</text>
                </g>
            ))}
            {allReq.map(c => {
                const done = step.served.includes(c);
                return (
                    <g key={c}>
                        <line x1={X(c)} y1={30} x2={X(c)} y2={H - 10} stroke={done ? '#14532d' : '#422006'} strokeDasharray="2 4" />
                        <circle cx={X(c)} cy={26} r="4" fill={done ? '#4ade80' : '#facc15'} />
                        <text x={X(c)} y={40 + labelRow[c] * 9} textAnchor="middle" fontSize="8.5" fill={done ? '#86efac' : '#fde68a'}>{c}</text>
                    </g>
                );
            })}
            {/* path */}
            {pts.slice(1).map(([x, y], i) => {
                const [px, py] = pts[i];
                const isJump = step.jumps.includes(i + 1);
                return (
                    <line key={i} x1={px} y1={py} x2={x} y2={y} stroke={isJump ? '#94a3b8' : '#f59e0b'} strokeWidth={isJump ? 1.5 : 2.5}
                        strokeDasharray={isJump ? '5 4' : undefined} strokeLinecap="round" />
                );
            })}
            {pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 6 : 3.5}
                    fill={i === pts.length - 1 ? '#fde047' : '#f59e0b'} stroke={i === pts.length - 1 ? '#fef9c3' : 'none'} strokeWidth="2" />
            ))}
        </svg>
    );
}

/* A top-down strip of the cylinders with the arm sliding over it. */
function ArmStrip({ step }) {
    return (
        <div className="relative h-14 mb-2">
            <div className="absolute left-[3.9%] right-[3.9%] top-6 h-2 rounded-full bg-slate-800 border border-slate-700" />
            {step.queue.map(c => (
                <div key={c} className={`absolute top-[18px] w-2.5 h-2.5 -translate-x-1/2 rounded-full transition-colors duration-300 ${step.served.includes(c) ? 'bg-green-400' : 'bg-yellow-400'}`}
                    style={{ left: `${(X(c) / 620) * 100}%`, top: 21 }} />
            ))}
            <div className="absolute -translate-x-1/2 flex flex-col items-center" style={{ left: `${(X(step.head) / 620) * 100}%`, transition: 'left 0.6s ease', top: 0 }}>
                <span className="text-[10px] font-mono text-yellow-200 bg-slate-900/80 px-1 rounded">{step.head}</span>
                <div className="w-1 h-9 bg-yellow-300 rounded-full shadow-[0_0_10px_rgba(253,224,71,0.7)]" />
            </div>
        </div>
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

const codeExample = `def disk_schedule(queue, head, policy, up=True, max_cyl=199):
    """Return the head's stops and the total seek distance."""
    pending, pos, stops = list(queue), head, []

    def go(to):
        nonlocal pos
        stops.append(to)
        if to in pending:
            pending.remove(to)
        pos = to

    def ahead():
        side = [p for p in pending if (p >= pos if up else p <= pos)]
        return sorted(side, reverse=not up)

    if policy == "FCFS":
        for r in queue:
            go(r)
    elif policy == "SSTF":
        while pending:
            go(min(pending, key=lambda p: (abs(p - pos), p)))
    else:
        for p in ahead():
            go(p)                                   # sweep in direction
        if pending:
            end, start = (max_cyl, 0) if up else (0, max_cyl)
            if policy in ("SCAN", "C-SCAN") and pos != end:
                go(end)                             # run to the disk edge
            if policy in ("SCAN", "LOOK"):          # reverse
                for p in sorted(pending, reverse=up):
                    go(p)
            else:                                   # circular: jump back
                if policy == "C-SCAN":
                    go(start)
                for p in sorted(pending, reverse=not up):
                    go(p)

    total, prev = 0, head
    for s in stops:
        total += abs(s - prev)
        prev = s
    return stops, total

print(disk_schedule([98, 183, 37, 122, 14, 124, 65, 67], 53, "SSTF"))
# ([65, 67, 37, 14, 98, 122, 124, 183], 236)`;

const DiskSchedulingPage = () => {
    const [queue, setQueue] = useState(PRESETS[0].queue);
    const [queueText, setQueueText] = useState(PRESETS[0].queue.join(', '));
    const [head, setHead] = useState(PRESETS[0].head);
    const [dir, setDir] = useState(PRESETS[0].dir);
    const [algo, setAlgo] = useState('sstf');
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(queue, head, dir, algo));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [queue, head, dir, algo]);

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

    const comparison = useMemo(() => ALGO_ORDER.map(a => ({ key: a, ...totalSeek(queue, head, dir, a) })), [queue, head, dir]);
    const maxTotal = Math.max(...comparison.map(c => c.total), 1);

    const step = stepHistory[currentStep];
    if (!step) return <div className="min-h-screen bg-slate-950" />;
    const totalMoves = stepHistory[stepHistory.length - 1].moves;

    const applyQueue = (text) => {
        setQueueText(text);
        const seen = new Set();
        const parsed = text.split(/[\s,]+/).filter(Boolean).map(Number)
            .filter(v => Number.isInteger(v) && v >= 0 && v <= MAX && !seen.has(v) && seen.add(v));
        if (parsed.length >= 1) setQueue(parsed.slice(0, 12));
    };
    const loadPreset = (p) => { setQueue(p.queue); setQueueText(p.queue.join(', ')); setHead(p.head); setDir(p.dir); };
    const shuffle = () => { const q = randomQueue(); setQueue(q); setQueueText(q.join(', ')); setHead(Math.floor(Math.random() * (MAX + 1))); };

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
                            <Disc3 className="h-10 w-10" />Disk Scheduling
                        </h1>
                        <p className="text-xl text-yellow-50 mb-6 max-w-3xl mx-auto">
                            On a spinning disk, moving the head between cylinders is the slow part. Six algorithms order the same queue of requests — and travel very different distances to serve it.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Cylinders 0–{MAX}</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Seek = |from − to|</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">FCFS · SSTF · SCAN · C-SCAN · LOOK · C-LOOK</div>
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
                                        className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${algo === k
                                            ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-yellow-500/60'}`}>
                                        {ALGOS[k].label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-slate-300 mb-4"><span className="text-yellow-400 font-semibold">{ALGOS[algo].label}.</span> {ALGOS[algo].rule}</p>

                            <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 mb-4 items-end">
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-400">Request queue (arrival order, 0–{MAX})</label>
                                    <input type="text" value={queueText} onChange={e => applyQueue(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm font-mono focus:border-yellow-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-400">Head at</label>
                                    <input type="number" min="0" max={MAX} value={head}
                                        onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setHead(Math.max(0, Math.min(MAX, v))); }}
                                        className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm font-mono focus:border-yellow-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-400">Initial direction</label>
                                    <div className="flex rounded-lg overflow-hidden border border-slate-600">
                                        <button onClick={() => setDir('down')} className={`px-3 py-2 text-xs flex items-center gap-1 ${dir === 'down' ? 'bg-yellow-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300'}`}><ArrowLeftIcon className="h-3.5 w-3.5" />to 0</button>
                                        <button onClick={() => setDir('up')} className={`px-3 py-2 text-xs flex items-center gap-1 ${dir === 'up' ? 'bg-yellow-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300'}`}>to {MAX}<ArrowRight className="h-3.5 w-3.5" /></button>
                                    </div>
                                </div>
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

                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-yellow-500" />
                            </div>

                            <div className="mb-2 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                <span className="text-sm text-slate-500 flex items-center gap-1">
                                    moving {step.travel === 'up' ? <>up <ArrowRight className="h-3.5 w-3.5" /></> : <><ArrowLeftIcon className="h-3.5 w-3.5" /> down</>}
                                </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                                <div className="bg-yellow-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            <ArmStrip step={step} />
                            <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/60">
                                <HeadChart step={step} totalMoves={totalMoves} />
                            </div>

                            <div className="grid grid-cols-3 gap-3 mt-4">
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-yellow-500/30 text-center">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Total seek</div>
                                    <div className="text-2xl font-bold text-yellow-300 font-mono">{step.total}</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 text-center">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Served</div>
                                    <div className="text-2xl font-bold text-green-300 font-mono">{step.served.length}/{step.queue.length}</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 text-center">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Return jumps</div>
                                    <div className="text-2xl font-bold text-slate-300 font-mono">{step.jumpTotal}</div>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="text-slate-500 mr-1">Queue in arrival order:</span>
                                {step.queue.map(c => (
                                    <span key={c} className={`px-2 py-0.5 rounded font-mono border ${step.served.includes(c) ? 'border-green-600/50 text-green-300/80 bg-green-500/10 line-through' : 'border-yellow-600/50 text-yellow-200 bg-yellow-500/10'}`}>{c}</span>
                                ))}
                            </div>

                            {predict.prompt && (
                                <div className="mt-5">
                                    <PredictPrompt predict={predict} accent="yellow" />
                                </div>
                            )}

                            <div className="mt-5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-yellow-200 text-sm leading-relaxed">
                                        {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-1">Total head movement — same queue, every algorithm</h3>
                            <p className="text-xs text-slate-500 mb-4">The grey part of a bar is the circular return jump. Click a row to replay it.</p>
                            <div className="space-y-2">
                                {comparison.map(c => (
                                    <button key={c.key} onClick={() => setAlgo(c.key)} className="w-full flex items-center gap-3 group">
                                        <span className={`w-16 text-left text-xs font-semibold ${c.key === algo ? 'text-yellow-300' : 'text-slate-400 group-hover:text-slate-200'}`}>{ALGOS[c.key].label}</span>
                                        <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden flex">
                                            <div className={`h-full transition-all duration-500 ${c.key === algo ? 'bg-yellow-500' : 'bg-slate-600 group-hover:bg-slate-500'}`}
                                                style={{ width: `${((c.total - c.jump) / maxTotal) * 100}%` }} />
                                            <div className="h-full bg-slate-500/50" style={{ width: `${(c.jump / maxTotal) * 100}%` }} />
                                        </div>
                                        <span className="w-12 text-right font-mono text-xs text-slate-300">{c.total}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-yellow-500" />
                                <h3 className="font-bold text-white">Conventions Used Here</h3>
                            </div>
                            <ul className="space-y-2.5 text-sm text-slate-300">
                                <li>The head stops as soon as the queue is empty.</li>
                                <li>SCAN and C-SCAN run to the disk end only while requests remain behind the head.</li>
                                <li>The circular return (dashed) <span className="text-yellow-300">is counted</span> in the total. Some textbooks leave it out — subtract the grey bar to compare.</li>
                                <li>SSTF breaks ties towards the lower cylinder.</li>
                            </ul>
                            <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs text-slate-400 leading-relaxed">
                                SSDs have no head to move, so Linux pairs them with simple schedulers such as <span className="font-mono text-slate-200">none</span> or <span className="font-mono text-slate-200">mq-deadline</span>; these algorithms matter for spinning disks.
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

export default DiskSchedulingPage;
