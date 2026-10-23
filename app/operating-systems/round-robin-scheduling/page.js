"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, Shuffle, RefreshCw, Plus, Minus, Cpu } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const quizQuestions = [
    {
        question: 'What does Round Robin become if the time quantum is larger than every CPU burst?',
        options: ['Shortest Job First', 'First-Come, First-Served', 'Priority scheduling', 'It stops preempting and deadlocks'],
        correct: 1,
        explanation: 'If no process ever uses up its quantum, nothing is ever preempted: each runs to completion in the order it reached the queue. That is exactly FCFS.',
    },
    {
        question: 'Shrinking the quantum from 4 to 1 on the same workload mostly…',
        options: [
            'Lowers response time but adds context switches',
            'Lowers both response time and context switches',
            'Raises response time and removes context switches',
            'Has no effect, because total CPU work is unchanged',
        ],
        correct: 0,
        explanation: 'A small quantum lets every waiting process get its first slice sooner, so response time drops. The price is a switch at almost every tick, and each switch costs real time saving and loading registers and refilling caches.',
    },
    {
        question: 'A common rule of thumb for choosing the quantum is that it should be…',
        options: [
            'Exactly one clock tick',
            'Equal to the longest burst in the system',
            'Longer than about 80% of CPU bursts, and much longer than a context switch',
            'Shorter than a context switch, so switching dominates',
        ],
        correct: 2,
        explanation: 'If most bursts finish within one quantum, short interactive jobs complete without being preempted, while long CPU-bound jobs still share fairly. And the quantum must dwarf the switch cost, or the CPU spends its time switching rather than working.',
    },
];

const COLORS = ['#f59e0b', '#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#a3e635'];
const pname = (idx) => `P${idx + 1}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const PRESETS = [
    { name: 'Textbook', quantum: 2, procs: [{ arrival: 0, burst: 5 }, { arrival: 1, burst: 3 }, { arrival: 2, burst: 1 }, { arrival: 3, burst: 2 }, { arrival: 4, burst: 3 }] },
    { name: 'All at once', quantum: 3, procs: [{ arrival: 0, burst: 10 }, { arrival: 0, burst: 4 }, { arrival: 0, burst: 7 }, { arrival: 0, burst: 3 }] },
    { name: 'Long job + interactive', quantum: 4, procs: [{ arrival: 0, burst: 14 }, { arrival: 2, burst: 2 }, { arrival: 4, burst: 1 }, { arrival: 6, burst: 2 }, { arrival: 9, burst: 1 }] },
];

function generateSteps(procs, quantum) {
    const P = procs.map((p, idx) => ({ ...p, idx }));
    const n = P.length;
    const order = [...P].sort((a, b) => a.arrival - b.arrival || a.idx - b.idx);
    let ai = 0;
    const remaining = P.map(p => p.burst);
    const firstRun = Array(n).fill(null);
    const completion = Array(n).fill(null);
    const queue = [];
    const finished = [];
    const gantt = [];
    const steps = [];
    let t = 0;
    let last = null;
    let switches = 0;
    let dispatches = 0;

    /* Everything that has arrived by `now` joins the back of the queue, in
       arrival order. Called before a preempted process is re-queued, so an
       arrival at the same instant goes ahead of it. */
    const admit = (now) => {
        const joined = [];
        while (ai < n && order[ai].arrival <= now) {
            queue.push(order[ai].idx);
            joined.push(order[ai].idx);
            ai++;
        }
        return joined;
    };
    const names = (list) => list.map(pname).join(', ');
    const snap = (extra) => ({
        procs: P, quantum, time: t,
        queue: [...queue], cpu: null, ran: null, slice: 0,
        finished: [...finished],
        remaining: [...remaining],
        firstRun: [...firstRun],
        completion: [...completion],
        gantt: gantt.map(b => ({ ...b })),
        switches, dispatches, joined: [],
        ...extra,
    });

    const joined0 = admit(0);
    steps.push(snap({
        phase: 'start', joined: joined0,
        explanation: `Round Robin with a quantum of ${quantum}: a process gets the CPU for at most ${plural(quantum, 'unit')}, then goes to the back of the ready queue. ${joined0.length ? `${names(joined0)} ${joined0.length === 1 ? 'is' : 'are'} ready at t = 0.` : 'Nothing has arrived yet.'}`,
    }));

    while (finished.length < n) {
        if (queue.length === 0) {
            const from = t;
            const next = order[ai].arrival;
            gantt.push({ pid: null, start: from, end: next });
            t = next;
            const joined = admit(t);
            steps.push(snap({
                phase: 'idle', joined,
                explanation: `The ready queue is empty, so the CPU idles from ${from} to ${t}. ${names(joined)} arrive${joined.length === 1 ? 's' : ''} and join${joined.length === 1 ? 's' : ''} the queue.`,
            }));
            continue;
        }

        const x = queue.shift();
        const isSwitch = last !== null && last !== x;
        if (isSwitch) switches++;
        dispatches++;
        if (firstRun[x] === null) firstRun[x] = t;
        let how;
        if (last === null) how = ' — the first dispatch, so there is no previous context to save';
        else if (isSwitch) how = ` — context switch #${switches}: save ${pname(last)}'s registers, load ${pname(x)}'s`;
        else how = ' again — it was alone in the queue, so no context switch is needed';
        steps.push(snap({
            phase: 'dispatch', cpu: x, isSwitch,
            explanation: `${pname(x)} is at the head of the queue and gets the CPU${how}. It needs ${remaining[x]} more; the quantum is ${quantum}.`,
        }));

        const run = Math.min(quantum, remaining[x]);
        const from = t;
        t += run;
        remaining[x] -= run;
        gantt.push({ pid: x, start: from, end: t });
        const joined = admit(t);
        const done = remaining[x] === 0;
        if (done) {
            completion[x] = t;
            finished.push(x);
        } else {
            queue.push(x);
        }
        last = x;

        let text = `${pname(x)} runs from ${from} to ${t}. `;
        if (done) {
            const tat = t - P[x].arrival;
            text += `It finishes${run < quantum ? `, ${plural(quantum - run, 'unit')} before its quantum ran out — the CPU moves on immediately` : ''}. Turnaround ${tat}, waiting ${tat - P[x].burst}.`;
            if (joined.length) text += ` ${names(joined)} arrived meanwhile and joined the queue.`;
        } else {
            text += `The quantum expires with ${remaining[x]} still to do. `;
            text += joined.length ? `${names(joined)} arrived during the slice and queue first; ${pname(x)} goes in behind them.` : `${pname(x)} goes to the back of the queue.`;
        }
        steps.push(snap({ phase: 'run', ran: x, slice: run, runFrom: from, runTo: t, finishedNow: done, joined, explanation: text }));
    }

    const m = metricsOf(P, completion, firstRun);
    steps.push(snap({
        phase: 'done',
        explanation: `All done at t = ${t} after ${switches} context switch${switches === 1 ? '' : 'es'}. Average response ${m.avgResponse.toFixed(2)}, waiting ${m.avgWaiting.toFixed(2)}, turnaround ${m.avgTurnaround.toFixed(2)}. Try a different quantum and compare.`,
    }));
    return steps;
}

function metricsOf(P, completion, firstRun) {
    const n = P.length;
    let w = 0, tat = 0, r = 0;
    P.forEach(p => {
        tat += completion[p.idx] - p.arrival;
        w += completion[p.idx] - p.arrival - p.burst;
        r += firstRun[p.idx] - p.arrival;
    });
    return { avgWaiting: w / n, avgTurnaround: tat / n, avgResponse: r / n };
}

/* At a dispatch, the remaining time and the quantum on screen decide whether
   this slice ends in completion or preemption. */
function predictFor(step, next) {
    if (!step || !next) return null;
    if (step.phase !== 'dispatch' || next.phase !== 'run') return null;
    const x = step.cpu;
    const rem = step.remaining[x];
    const q = step.quantum;
    const finishes = next.finishedNow;
    return {
        question: `${pname(x)} has ${plural(rem, 'unit')} left and the quantum is ${q}. How does this slice end?`,
        options: ['It finishes within the quantum', 'The quantum expires first'],
        correct: finishes ? 0 : 1,
        because: finishes
            ? `${rem} ≤ ${q}, so ${pname(x)} completes after ${plural(rem, 'unit')}${rem < q ? ' and gives the CPU up early' : ''}.`
            : `${rem} > ${q}: ${pname(x)} runs the full ${q}, is preempted, and rejoins the queue with ${rem - q} left.`,
    };
}

const randomWorkload = () => {
    const n = 3 + Math.floor(Math.random() * 3);
    return Array.from({ length: n }, (_, i) => ({
        arrival: i === 0 ? 0 : Math.floor(Math.random() * 9),
        burst: 1 + Math.floor(Math.random() * 8),
    }));
};

const GROW_KEYFRAMES = '@keyframes osGanttGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }';

function Gantt({ step, total }) {
    const { gantt, time } = step;
    const pct = (v) => `${(v / total) * 100}%`;
    const ticks = [...new Set([0, ...gantt.map(b => b.end)])];
    return (
        <div>
            <style>{GROW_KEYFRAMES}</style>
            <div className="relative h-12 bg-slate-800/60 rounded-lg border border-slate-700">
                {gantt.map((b, i) => (
                    <div key={i}
                        className={`absolute top-1.5 bottom-1.5 rounded-md flex items-center justify-center text-xs font-bold border ${b.pid === null ? 'border-slate-600 text-slate-500' : 'border-slate-950/50 text-slate-900'}`}
                        style={{
                            left: pct(b.start), width: pct(b.end - b.start),
                            background: b.pid === null
                                ? 'repeating-linear-gradient(45deg, #1e293b, #1e293b 4px, #334155 4px, #334155 8px)'
                                : COLORS[b.pid],
                            transformOrigin: 'left', animation: 'osGanttGrow 0.5s ease-out',
                        }}>
                        {b.end - b.start >= total / 25 ? (b.pid === null ? '' : pname(b.pid)) : ''}
                    </div>
                ))}
                <div className="absolute -top-1 -bottom-1 w-0.5 bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.8)]"
                    style={{ left: pct(time), transition: 'left 0.5s ease' }} />
            </div>
            <div className="relative h-5 mt-1">
                {ticks.map(tm => (
                    <span key={tm} className="absolute -translate-x-1/2 text-[10px] text-slate-400 font-mono" style={{ left: pct(tm) }}>{tm}</span>
                ))}
            </div>
        </div>
    );
}

/* CPU slot on the left, the ready queue running right from it, and a lane of
   finished processes underneath. Chips are keyed by process and positioned
   absolutely, so moving between slots is a CSS transition: the head slides
   onto the CPU, a preempted process slides to the back. */
const SLOT = 68;
const QX = 112;
const TOP = 26;
const BOTTOM = 112;

function QueueLine({ step }) {
    const n = step.procs.length;
    const pos = {};
    step.queue.forEach((idx, i) => { pos[idx] = { x: QX + i * SLOT, y: TOP, o: 1 }; });
    if (step.cpu !== null) pos[step.cpu] = { x: 8, y: TOP, o: 1 };
    step.finished.forEach((idx, i) => { pos[idx] = { x: QX + i * SLOT, y: BOTTOM, o: 0.55 }; });
    step.procs.forEach(p => { if (!pos[p.idx]) pos[p.idx] = { x: QX + n * SLOT, y: TOP, o: 0 }; });
    const width = QX + (n + 1) * SLOT;
    const ranFrac = step.phase === 'run' ? step.slice / step.quantum : 0;

    return (
        <div className="overflow-x-auto">
            <div className="relative" style={{ width, height: 176 }}>
                <span className="absolute text-[10px] uppercase tracking-wider text-slate-500" style={{ left: 8, top: 4 }}>CPU</span>
                <span className="absolute text-[10px] uppercase tracking-wider text-slate-500" style={{ left: QX, top: 4 }}>Ready queue — head first</span>
                <span className="absolute text-[10px] uppercase tracking-wider text-slate-500" style={{ left: QX, top: BOTTOM - 20 }}>Finished</span>

                {/* CPU socket */}
                <div className={`absolute rounded-xl border-2 border-dashed transition-colors duration-300 ${step.cpu !== null ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-700'}`}
                    style={{ left: 2, top: TOP - 6, width: 72, height: 70 }} />
                <Cpu className={`absolute h-4 w-4 ${step.cpu !== null ? 'text-yellow-300' : 'text-slate-700'}`} style={{ left: 31, top: TOP + 68 }} />
                {/* quantum gauge under the CPU */}
                <div className="absolute h-1.5 bg-slate-800 rounded-full overflow-hidden" style={{ left: 8, top: TOP + 90, width: 60 }}>
                    <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${ranFrac * 100}%` }} />
                </div>
                <span className="absolute text-[10px] text-slate-500 font-mono" style={{ left: 8, top: TOP + 96 }}>
                    {step.phase === 'run' ? `${step.slice}/${step.quantum} used` : `q = ${step.quantum}`}
                </span>

                {/* queue rail */}
                <div className="absolute border-t border-dashed border-slate-700" style={{ left: QX - 8, top: TOP + 58, width: width - QX }} />

                {step.procs.map(p => {
                    const at = pos[p.idx];
                    const onCpu = step.cpu === p.idx;
                    const justRan = step.phase === 'run' && step.ran === p.idx;
                    const joined = step.joined.includes(p.idx);
                    return (
                        <div key={p.idx}
                            className={`absolute rounded-lg border-2 flex flex-col items-center justify-center font-bold text-slate-900 ${onCpu ? 'border-yellow-200 shadow-[0_0_14px_rgba(250,204,21,0.6)]' : justRan ? 'border-white/70' : joined ? 'border-sky-200' : 'border-slate-950/40'}`}
                            style={{
                                left: at.x, top: at.y, width: 56, height: 52, opacity: at.o,
                                background: COLORS[p.idx],
                                transition: 'left 0.55s ease, top 0.55s ease, opacity 0.4s ease',
                            }}>
                            <span className="text-sm leading-none">{pname(p.idx)}</span>
                            <span className="text-[10px] font-mono leading-none mt-1">{step.remaining[p.idx]} left</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* Context switches and average response for every quantum 1–8 on the current
   workload: the trade-off the quantum is choosing between. */
function TradeoffChart({ rows, quantum, onPick }) {
    const W = 400, H = 150, base = 120, top = 18;
    const maxS = Math.max(...rows.map(r => r.switches), 1);
    const maxR = Math.max(...rows.map(r => r.avgResponse), 1);
    const colW = W / rows.length;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="select-none">
            {rows.map((r, i) => {
                const x = i * colW;
                const hs = ((base - top) * r.switches) / maxS;
                const hr = ((base - top) * r.avgResponse) / maxR;
                const active = r.q === quantum;
                return (
                    <g key={r.q} onClick={() => onPick(r.q)} style={{ cursor: 'pointer' }}>
                        <rect x={x + 2} y={4} width={colW - 4} height={H - 8} rx="6" fill={active ? 'rgba(234,179,8,0.10)' : 'transparent'} stroke={active ? 'rgba(234,179,8,0.5)' : 'transparent'} />
                        <rect x={x + colW / 2 - 15} y={base - hs} width={13} height={Math.max(hs, 1)} rx="2" fill="#eab308" opacity={active ? 1 : 0.55} />
                        <rect x={x + colW / 2 + 2} y={base - hr} width={13} height={Math.max(hr, 1)} rx="2" fill="#38bdf8" opacity={active ? 1 : 0.55} />
                        <text x={x + colW / 2 - 8.5} y={base - hs - 4} textAnchor="middle" fontSize="9" fill="#fde68a">{r.switches}</text>
                        <text x={x + colW / 2 + 8.5} y={base - hr - 4} textAnchor="middle" fontSize="9" fill="#bae6fd">{r.avgResponse.toFixed(1)}</text>
                        <text x={x + colW / 2} y={base + 16} textAnchor="middle" fontSize="11" fontWeight={active ? 700 : 400} fill={active ? '#facc15' : '#94a3b8'}>q={r.q}</text>
                    </g>
                );
            })}
            <line x1="0" y1={base} x2={W} y2={base} stroke="#334155" />
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

const codeExample = `from collections import deque

def round_robin(procs, quantum):
    """procs: list of (pid, arrival, burst)."""
    pending = deque(sorted(procs, key=lambda p: p[1]))
    remaining = {pid: burst for pid, _, burst in procs}
    ready, t, last, switches = deque(), 0, None, 0
    first_run, completion = {}, {}

    def admit(now):
        # Arrivals join before a preempted process is re-queued.
        while pending and pending[0][1] <= now:
            ready.append(pending.popleft()[0])

    admit(t)
    while ready or pending:
        if not ready:                     # idle until the next arrival
            t = pending[0][1]
            admit(t)
            continue
        pid = ready.popleft()
        if last is not None and pid != last:
            switches += 1                 # save one context, load another
        first_run.setdefault(pid, t)
        run = min(quantum, remaining[pid])
        t += run
        remaining[pid] -= run
        admit(t)
        if remaining[pid] > 0:
            ready.append(pid)             # quantum expired: back of the line
        else:
            completion[pid] = t
        last = pid
    return completion, first_run, switches`;

const RoundRobinPage = () => {
    const [procs, setProcs] = useState(PRESETS[0].procs);
    const [quantum, setQuantum] = useState(PRESETS[0].quantum);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(procs, quantum));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [procs, quantum]);

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

    const tradeoff = useMemo(() => Array.from({ length: 8 }, (_, i) => {
        const s = generateSteps(procs, i + 1);
        const last = s[s.length - 1];
        return { q: i + 1, switches: last.switches, ...metricsOf(last.procs, last.completion, last.firstRun) };
    }), [procs]);

    const step = stepHistory[currentStep];
    if (!step) return <div className="min-h-screen bg-slate-950" />;
    const total = stepHistory[stepHistory.length - 1].time;
    const doneIdx = step.procs.filter(p => step.completion[p.idx] !== null);
    const startedIdx = step.procs.filter(p => step.firstRun[p.idx] !== null);
    const avg = (list, f) => (list.length ? (list.reduce((s, p) => s + f(p), 0) / list.length).toFixed(2) : '—');

    const editProc = (idx, field, value) => {
        const v = parseInt(value, 10);
        if (isNaN(v)) return;
        const [lo, hi] = field === 'arrival' ? [0, 20] : [1, 15];
        setProcs(ps => ps.map((p, i) => (i === idx ? { ...p, [field]: Math.max(lo, Math.min(hi, v)) } : p)));
    };

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
                            <RefreshCw className="h-10 w-10" />Round Robin Scheduling
                        </h1>
                        <p className="text-xl text-yellow-50 mb-6 max-w-3xl mx-auto">
                            Everyone gets a turn of at most one time quantum, then goes to the back of the line. The quantum sets the trade-off between responsiveness and switching overhead.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Preemptive</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">FIFO ready queue</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">No starvation</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap items-center gap-3 mb-5">
                                <span className="text-sm font-medium text-slate-300">Time quantum</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(q => (
                                        <button key={q} onClick={() => setQuantum(q)}
                                            className={`w-9 h-9 rounded-lg text-sm font-bold border transition-colors ${quantum === q
                                                ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-yellow-500/60'}`}>
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 mb-5">
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
                                <button onClick={() => setProcs(randomWorkload())}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Randomize
                                </button>
                                <PredictToggle predict={predict} accent="yellow" />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs text-slate-500 mr-1">Presets:</span>
                                {PRESETS.map(p => (
                                    <button key={p.name} onClick={() => { setProcs(p.procs); setQuantum(p.quantum); }}
                                        className="px-3 py-1 text-xs rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60 hover:text-white transition-colors">
                                        {p.name} <span className="text-slate-500">q={p.quantum}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-yellow-500" />
                            </div>

                            <div className="mb-2 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                <span className="text-sm text-slate-500 font-mono">t = {step.time}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 mb-6">
                                <div className="bg-yellow-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700/60 mb-5">
                                <QueueLine step={step} />
                            </div>

                            <h3 className="text-sm font-semibold text-slate-300 mb-2">Gantt chart <span className="text-slate-500 font-normal">— one block per slice</span></h3>
                            <Gantt step={step} total={total} />

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                {[
                                    ['Context switches', step.switches, 'text-yellow-300'],
                                    ['Avg response', avg(startedIdx, p => step.firstRun[p.idx] - p.arrival), 'text-sky-300'],
                                    ['Avg waiting', avg(doneIdx, p => step.completion[p.idx] - p.arrival - p.burst), 'text-slate-200'],
                                    ['Avg turnaround', avg(doneIdx, p => step.completion[p.idx] - p.arrival), 'text-slate-200'],
                                ].map(([label, v, tone]) => (
                                    <div key={label} className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 text-center">
                                        <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">{label}</div>
                                        <div className={`text-xl font-bold font-mono ${tone}`}>{v}</div>
                                    </div>
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

                        {/* Trade-off */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-1">Choosing the quantum</h3>
                            <p className="text-xs text-slate-500 mb-3">This workload under every quantum from 1 to 8. Click a column to replay it.</p>
                            <div className="flex gap-4 text-xs mb-2">
                                <span className="flex items-center gap-1.5 text-slate-300"><span className="w-3 h-3 rounded-sm bg-yellow-500" />context switches</span>
                                <span className="flex items-center gap-1.5 text-slate-300"><span className="w-3 h-3 rounded-sm bg-sky-400" />average response time</span>
                            </div>
                            <TradeoffChart rows={tradeoff} quantum={quantum} onPick={setQuantum} />
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                Small quanta reach every process quickly (short response) but switch constantly. Large quanta switch rarely and drift towards FCFS, so a long job at the front makes everyone wait.
                            </p>
                        </div>

                        {/* Process table */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">Processes</h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setProcs(ps => (ps.length <= 2 ? ps : ps.slice(0, -1)))} disabled={procs.length <= 2} aria-label="Remove a process"
                                        className="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:border-yellow-500/60 disabled:opacity-40"><Minus size={14} /></button>
                                    <button onClick={() => setProcs(ps => (ps.length >= 6 ? ps : [...ps, { arrival: Math.min(20, ps.length * 2), burst: 3 }]))} disabled={procs.length >= 6} aria-label="Add a process"
                                        className="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:border-yellow-500/60 disabled:opacity-40"><Plus size={14} /></button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-slate-400 text-xs border-b border-slate-700">
                                            <th className="text-left py-2 pr-2">PID</th>
                                            <th className="py-2 px-1">Arrival</th>
                                            <th className="py-2 px-1">Burst</th>
                                            <th className="py-2 px-1">First run</th>
                                            <th className="py-2 px-1">Response</th>
                                            <th className="py-2 px-1">Completion</th>
                                            <th className="py-2 px-1">Turnaround</th>
                                            <th className="py-2 px-1">Waiting</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {step.procs.map(p => {
                                            const ct = step.completion[p.idx];
                                            const fr = step.firstRun[p.idx];
                                            return (
                                                <tr key={p.idx} className={`border-b border-slate-800 ${step.cpu === p.idx ? 'bg-yellow-500/10' : ''}`}>
                                                    <td className="py-2 pr-2">
                                                        <span className="inline-flex items-center gap-2 font-bold text-slate-100">
                                                            <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[p.idx] }} />{pname(p.idx)}
                                                        </span>
                                                    </td>
                                                    {['arrival', 'burst'].map(f => (
                                                        <td key={f} className="py-2 px-1 text-center">
                                                            <input type="number" value={procs[p.idx]?.[f] ?? p[f]} onChange={e => editProc(p.idx, f, e.target.value)}
                                                                className="w-14 px-1.5 py-1 bg-slate-800 border border-slate-700 rounded text-center text-slate-100 text-xs font-mono focus:border-yellow-500 outline-none" />
                                                        </td>
                                                    ))}
                                                    <td className="py-2 px-1 text-center font-mono text-slate-200">{fr ?? '—'}</td>
                                                    <td className="py-2 px-1 text-center font-mono text-sky-300">{fr !== null ? fr - p.arrival : '—'}</td>
                                                    <td className="py-2 px-1 text-center font-mono text-slate-200">{ct ?? '—'}</td>
                                                    <td className="py-2 px-1 text-center font-mono text-slate-200">{ct !== null ? ct - p.arrival : '—'}</td>
                                                    <td className="py-2 px-1 text-center font-mono text-yellow-300">{ct !== null ? ct - p.arrival - p.burst : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-yellow-500" />
                                <h3 className="font-bold text-white">The Rules</h3>
                            </div>
                            <ol className="space-y-3 text-sm text-slate-300 list-decimal list-inside">
                                <li>The ready queue is first-in, first-out.</li>
                                <li>The head runs for <span className="text-yellow-300 font-mono">min(q, remaining)</span>.</li>
                                <li>If it finishes early, the next process starts at once — leftover quantum is not wasted.</li>
                                <li>Otherwise it is preempted and rejoins at the back.</li>
                                <li>An arrival at the same instant a quantum expires queues <em>ahead</em> of the preempted process.</li>
                                <li>Loading a different process than the one that just ran is a context switch.</li>
                            </ol>
                            <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs text-slate-400 leading-relaxed">
                                With <span className="font-mono text-slate-200">n</span> ready processes, no one waits more than <span className="font-mono text-slate-200">(n − 1) × q</span> for their next turn — which is why Round Robin cannot starve anyone.
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

export default RoundRobinPage;
