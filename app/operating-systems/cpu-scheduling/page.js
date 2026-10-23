"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, Shuffle, GanttChart, Plus, Minus, CheckCircle, AlertTriangle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const quizQuestions = [
    {
        question: 'All processes arrive at time 0. Which non-preemptive policy gives the lowest possible average waiting time?',
        options: ['FCFS', 'SJF', 'Priority', 'They all give the same average'],
        correct: 1,
        explanation: 'Running the shortest job first moves a short wait in front of every long one, and an exchange argument shows no other order can do better. That is why SJF is provably optimal for average waiting time — the catch is that real burst lengths are not known in advance.',
    },
    {
        question: 'A 20 ms job arrives just before three 1 ms jobs. Under FCFS the short jobs wait behind it. What is this called?',
        options: ['Starvation', 'The convoy effect', 'Priority inversion', 'Thrashing'],
        correct: 1,
        explanation: 'The convoy effect: one long CPU burst at the head of a FCFS queue holds up everything behind it, the way a slow truck holds up a line of cars. Average waiting time balloons even though the CPU is never idle.',
    },
    {
        question: 'Under SJF or Priority scheduling, a long or low-priority job may wait forever if short or urgent jobs keep arriving. What is the standard fix?',
        options: ['Make the time quantum smaller', 'Switch to FCFS whenever the queue is long', 'Aging — raise a process\'s priority the longer it waits', 'Run the longest job first'],
        correct: 2,
        explanation: 'Aging gradually increases the priority of a waiting process, so it eventually becomes the most urgent and runs. It bounds the wait without giving up the policy\'s preference for short or urgent work.',
    },
];

const ALGOS = {
    fcfs: { label: 'FCFS', full: 'First-Come, First-Served', preemptive: false, rule: 'The ready process that arrived earliest runs to completion.', tie: 'Ties: lower process number.' },
    sjf: { label: 'SJF', full: 'Shortest Job First', preemptive: false, rule: 'The ready process with the shortest total burst runs to completion.', tie: 'Ties: earlier arrival, then lower number.' },
    srtf: { label: 'SRTF', full: 'Shortest Remaining Time First', preemptive: true, rule: 'The ready process with the least time remaining runs. Every arrival triggers a re-check, so a shorter newcomer preempts.', tie: 'Ties: the running process keeps the CPU, then earlier arrival, then lower number.' },
    priority: { label: 'Priority', full: 'Priority (non-preemptive)', preemptive: false, rule: 'The ready process with the lowest priority number (most urgent) runs to completion.', tie: 'Ties: earlier arrival, then lower number.' },
};
const ALGO_ORDER = ['fcfs', 'sjf', 'srtf', 'priority'];

const COLORS = ['#f59e0b', '#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#a3e635'];
const pname = (idx) => `P${idx + 1}`;

const PRESETS = [
    {
        name: 'Textbook',
        procs: [
            { arrival: 0, burst: 8, priority: 3 },
            { arrival: 1, burst: 4, priority: 1 },
            { arrival: 2, burst: 9, priority: 4 },
            { arrival: 3, burst: 5, priority: 2 },
        ],
    },
    {
        name: 'Convoy',
        procs: [
            { arrival: 0, burst: 12, priority: 3 },
            { arrival: 1, burst: 2, priority: 1 },
            { arrival: 1, burst: 3, priority: 4 },
            { arrival: 2, burst: 1, priority: 2 },
        ],
    },
    {
        name: 'Late arrivals',
        procs: [
            { arrival: 0, burst: 6, priority: 2 },
            { arrival: 2, burst: 2, priority: 3 },
            { arrival: 4, burst: 7, priority: 1 },
            { arrival: 9, burst: 3, priority: 4 },
            { arrival: 18, burst: 2, priority: 2 },
        ],
    },
];

/* Lexicographic comparison of sort keys. */
const lexLess = (a, b) => {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] < b[i];
    }
    return false;
};

function scheduleKey(p, algo, remaining, running) {
    if (algo === 'fcfs') return [p.arrival, p.idx];
    if (algo === 'sjf') return [p.burst, p.arrival, p.idx];
    if (algo === 'srtf') return [remaining[p.idx], p.idx === running ? 0 : 1, p.arrival, p.idx];
    return [p.priority, p.arrival, p.idx];
}

function pickNext(ready, algo, remaining, running) {
    return ready.reduce((best, p) =>
        lexLess(scheduleKey(p, algo, remaining, running), scheduleKey(best, algo, remaining, running)) ? p : best);
}

/* The value each policy sorts on, used for the "why" text. */
function primaryOf(p, algo, remaining) {
    if (algo === 'fcfs') return p.arrival;
    if (algo === 'sjf') return p.burst;
    if (algo === 'srtf') return remaining[p.idx];
    return p.priority;
}
const PRIMARY_NAME = { fcfs: 'arrival', sjf: 'burst', srtf: 'remaining', priority: 'priority' };

function generateSteps(procs, algo) {
    const P = procs.map((p, idx) => ({ ...p, idx }));
    const n = P.length;
    const remaining = P.map(p => p.burst);
    const firstStart = Array(n).fill(null);
    const completion = Array(n).fill(null);
    const gantt = [];
    const steps = [];
    let t = 0;
    let running = null;
    let decisions = 0;

    const byArrival = (list) => [...list].sort((a, b) => a.arrival - b.arrival || a.idx - b.idx).map(p => p.idx);
    const snap = (extra) => ({
        procs: P, algo, time: t,
        gantt: gantt.map(b => ({ ...b })),
        remaining: [...remaining],
        firstStart: [...firstStart],
        completion: [...completion],
        running, decisions,
        ready: [], chosen: null,
        ...extra,
    });

    const a = ALGOS[algo];
    steps.push(snap({
        phase: 'start',
        explanation: `${a.full}: ${a.rule} ${a.preemptive ? 'Decisions happen whenever a process arrives or finishes.' : 'Decisions happen only when the CPU becomes free — once dispatched, a process keeps the CPU until it finishes.'}`,
    }));

    while (completion.some(c => c === null)) {
        const ready = P.filter(p => completion[p.idx] === null && p.arrival <= t);

        if (ready.length === 0) {
            const next = Math.min(...P.filter(p => completion[p.idx] === null).map(p => p.arrival));
            const from = t;
            gantt.push({ pid: null, start: from, end: next });
            t = next;
            running = null;
            steps.push(snap({
                phase: 'idle',
                explanation: `Nothing is ready at t = ${from}, so the CPU sits idle until the next arrival at t = ${next}. Idle time does not count towards anyone's waiting time.`,
            }));
            continue;
        }

        const readyIdx = byArrival(ready);
        const listing = readyIdx.map(i => `${pname(i)} (${PRIMARY_NAME[algo]} ${primaryOf(P[i], algo, remaining)})`).join(', ');
        const decideText = ready.length === 1
            ? `t = ${t}. Only ${pname(readyIdx[0])} is ready, so there is nothing to choose.`
            : `t = ${t}. Ready: ${listing}. ${a.label} picks by ${PRIMARY_NAME[algo]}${algo === 'priority' ? ' (lowest number is most urgent)' : ''}.${running !== null ? ` ${pname(running)} is mid-run and competes on its remaining time.` : ''}`;
        steps.push(snap({ phase: 'decide', ready: readyIdx, explanation: decideText }));

        const chosen = pickNext(ready, algo, remaining, running);
        let run = remaining[chosen.idx];
        if (algo === 'srtf') {
            const later = P.filter(p => completion[p.idx] === null && p.arrival > t).map(p => p.arrival);
            if (later.length) run = Math.min(run, Math.min(...later) - t);
        }

        const preempted = running !== null && running !== chosen.idx ? running : null;
        const firstRun = firstStart[chosen.idx] === null;
        if (firstRun) firstStart[chosen.idx] = t;
        const last = gantt[gantt.length - 1];
        const continued = Boolean(last && last.pid === chosen.idx && last.end === t);
        if (continued) last.end = t + run;
        else gantt.push({ pid: chosen.idx, start: t, end: t + run });

        const from = t;
        t += run;
        remaining[chosen.idx] -= run;
        decisions++;
        const finished = remaining[chosen.idx] === 0;
        if (finished) {
            completion[chosen.idx] = t;
            running = null;
        } else {
            running = chosen.idx;
        }

        const c = chosen;
        let text;
        if (continued) text = `${pname(c.idx)} keeps the CPU and runs on to t = ${t}.`;
        else if (preempted !== null) text = `${pname(c.idx)} preempts ${pname(preempted)} and runs from ${from} to ${t}.`;
        else text = `${pname(c.idx)} gets the CPU and runs from ${from} to ${t}.`;
        if (finished) {
            const tat = t - c.arrival;
            text += ` It finishes: turnaround = ${t} − ${c.arrival} = ${tat}, waiting = ${tat} − ${c.burst} = ${tat - c.burst}.`;
        } else {
            text += ` A new arrival at t = ${t} forces a re-check with ${remaining[c.idx]} unit${remaining[c.idx] === 1 ? '' : 's'} still left.`;
        }
        steps.push(snap({ phase: 'run', ready: readyIdx, chosen: c.idx, preempted, continued, runFrom: from, runTo: t, finished, explanation: text }));
    }

    const m = metricsOf(P, completion, firstStart);
    steps.push(snap({
        phase: 'done',
        explanation: `All ${n} processes finished at t = ${t}. Average waiting time ${m.avgWaiting.toFixed(2)}, average turnaround ${m.avgTurnaround.toFixed(2)}, average response ${m.avgResponse.toFixed(2)}. Switch policy to see how the same workload fares.`,
    }));
    return steps;
}

function metricsOf(P, completion, firstStart) {
    const n = P.length;
    let w = 0, tat = 0, r = 0;
    P.forEach(p => {
        const ct = completion[p.idx];
        tat += ct - p.arrival;
        w += ct - p.arrival - p.burst;
        r += firstStart[p.idx] - p.arrival;
    });
    return { avgWaiting: w / n, avgTurnaround: tat / n, avgResponse: r / n };
}

/* At a decision point with two or more ready processes, the next step shows
   which one the policy dispatched. Everything the rule needs (arrival, burst,
   remaining, priority, who is mid-run) is on screen in the ready queue.
   Options are rotated by the number of decisions made so far: listing them by
   process number would put the FCFS winner first almost every time. */
function predictFor(step, next) {
    if (!step || !next) return null;
    if (step.phase !== 'decide' || step.ready.length < 2) return null;
    if (next.phase !== 'run') return null;
    const cands = [...step.ready].sort((a, b) => a - b);
    const shift = step.decisions % cands.length;
    const order = [...cands.slice(shift), ...cands.slice(0, shift)];
    const winner = next.chosen;
    const w = step.procs[winner];
    const val = primaryOf(w, step.algo, step.remaining);
    const tied = step.ready.filter(i => i !== winner && primaryOf(step.procs[i], step.algo, step.remaining) === val);
    let because;
    if (step.algo === 'fcfs') because = `${pname(winner)} arrived earliest (t = ${w.arrival}) of the ready processes.`;
    else if (step.algo === 'sjf') because = `${pname(winner)} has the shortest total burst (${w.burst}).`;
    else if (step.algo === 'priority') because = `${pname(winner)} has priority ${w.priority}, the most urgent of those ready.`;
    else if (step.running === winner) because = `${pname(winner)} is already running and still has the least remaining time (${val}), so the arrival does not preempt it.`;
    else if (step.running !== null) because = `${pname(winner)} has ${val} left — less than ${pname(step.running)}'s ${step.remaining[step.running]} — so it preempts.`;
    else because = `${pname(winner)} has the least remaining time (${val}).`;
    if (tied.length) {
        let rule;
        if (step.algo === 'srtf' && step.running === winner) rule = 'the running process keeps the CPU on a tie';
        else if (tied.every(i => step.procs[i].arrival > w.arrival)) rule = 'the earlier arrival wins the tie';
        else if (tied.every(i => step.procs[i].arrival === w.arrival)) rule = 'the lower process number wins the tie';
        else rule = 'earlier arrival, then lower process number, breaks the tie';
        because += ` It ties with ${tied.map(pname).join(', ')} on ${PRIMARY_NAME[step.algo]}; ${rule}.`;
    }
    return {
        question: `t = ${step.time}: which process does ${ALGOS[step.algo].label} dispatch?`,
        options: order.map(pname),
        correct: order.indexOf(winner),
        because,
    };
}

const randomWorkload = () => {
    const n = 4 + Math.floor(Math.random() * 2);
    return Array.from({ length: n }, (_, i) => ({
        arrival: i === 0 ? 0 : Math.floor(Math.random() * 9),
        burst: 1 + Math.floor(Math.random() * 9),
        priority: 1 + Math.floor(Math.random() * 5),
    }));
};

const GROW_KEYFRAMES = '@keyframes osGanttGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }';

function Gantt({ step, total }) {
    const { gantt, time, procs } = step;
    const pct = (v) => `${(v / total) * 100}%`;
    const arrivals = {};
    procs.forEach(p => { (arrivals[p.arrival] ||= []).push(p.idx); });
    const ticks = [...new Set([0, ...gantt.map(b => b.end)])];
    return (
        <div>
            <style>{GROW_KEYFRAMES}</style>
            {/* arrival markers */}
            <div className="relative h-8 mb-1">
                {Object.entries(arrivals).map(([at, ids]) => (
                    <div key={at} className="absolute -translate-x-1/2 flex flex-col items-center" style={{ left: pct(Number(at)) }}>
                        <span className={`text-[10px] font-mono whitespace-nowrap ${Number(at) <= time ? 'text-slate-300' : 'text-slate-600'}`}>
                            {ids.map(pname).join(' ')}
                        </span>
                        <span className={`w-0 h-0 border-x-4 border-x-transparent border-t-[6px] ${Number(at) <= time ? 'border-t-yellow-400' : 'border-t-slate-600'}`} />
                    </div>
                ))}
            </div>
            <div className="relative h-14 bg-slate-800/60 rounded-lg border border-slate-700">
                {gantt.map((b, i) => (
                    <div key={i}
                        className={`absolute top-1.5 bottom-1.5 rounded-md flex items-center justify-center text-xs font-bold border ${b.pid === null ? 'border-slate-600 text-slate-500' : 'border-slate-950/40 text-slate-900'}`}
                        style={{
                            left: pct(b.start),
                            width: pct(b.end - b.start),
                            background: b.pid === null
                                ? 'repeating-linear-gradient(45deg, #1e293b, #1e293b 4px, #334155 4px, #334155 8px)'
                                : COLORS[b.pid],
                            transition: 'width 0.5s ease',
                            transformOrigin: 'left',
                            animation: 'osGanttGrow 0.5s ease-out',
                        }}>
                        {b.end - b.start >= total / 30 ? (b.pid === null ? 'idle' : pname(b.pid)) : ''}
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

const codeExample = `def schedule(procs, policy):
    """procs: list of (pid, arrival, burst, priority).
    Returns the Gantt chart and per-process metrics."""
    info = {pid: (a, b, pr) for pid, a, b, pr in procs}
    remaining = {pid: b for pid, a, b, pr in procs}
    t, running, gantt, done = 0, None, [], {}

    def key(pid):
        a, b, pr = info[pid]
        if policy == "FCFS":
            return (a, pid)
        if policy == "SJF":
            return (b, a, pid)
        if policy == "SRTF":                      # running process wins ties
            return (remaining[pid], pid != running, a, pid)
        return (pr, a, pid)                        # Priority: low number = urgent

    while len(done) < len(procs):
        ready = [p for p in remaining if p not in done and info[p][0] <= t]
        if not ready:                              # CPU idles until next arrival
            t = min(info[p][0] for p in remaining if p not in done)
            continue
        pid = min(ready, key=key)
        run = remaining[pid]
        if policy == "SRTF":                       # re-check at the next arrival
            later = [info[p][0] for p in remaining
                     if p not in done and info[p][0] > t]
            if later:
                run = min(run, min(later) - t)
        gantt.append((pid, t, t + run))
        t += run
        remaining[pid] -= run
        running = pid
        if remaining[pid] == 0:
            arrival, burst, _ = info[pid]
            done[pid] = {"completion": t,
                         "turnaround": t - arrival,
                         "waiting": t - arrival - burst}
            running = None
    return gantt, done`;

const CpuSchedulingPage = () => {
    const [procs, setProcs] = useState(PRESETS[0].procs);
    const [algo, setAlgo] = useState('sjf');
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(procs, algo));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [procs, algo]);

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

    /* Every policy on the same workload, so the effect of switching is visible
       before the animation finishes. */
    const comparison = useMemo(() => ALGO_ORDER.map(k => {
        const s = generateSteps(procs, k);
        const last = s[s.length - 1];
        return { key: k, ...metricsOf(last.procs, last.completion, last.firstStart) };
    }), [procs]);
    const maxAvg = Math.max(...comparison.map(c => c.avgWaiting), 1);

    const step = stepHistory[currentStep];
    if (!step) return <div className="min-h-screen bg-slate-950" />;
    const total = stepHistory[stepHistory.length - 1].time;
    const finishedCount = step.completion.filter(c => c !== null).length;
    const doneMetrics = step.procs.filter(p => step.completion[p.idx] !== null).map(p => {
        const ct = step.completion[p.idx];
        return { tat: ct - p.arrival, wt: ct - p.arrival - p.burst };
    });
    const runningAvgWait = doneMetrics.length ? doneMetrics.reduce((s, m) => s + m.wt, 0) / doneMetrics.length : null;

    const editProc = (idx, field, value) => {
        const v = parseInt(value, 10);
        if (isNaN(v)) return;
        const limits = { arrival: [0, 20], burst: [1, 15], priority: [1, 9] }[field];
        const clamped = Math.max(limits[0], Math.min(limits[1], v));
        setProcs(ps => ps.map((p, i) => (i === idx ? { ...p, [field]: clamped } : p)));
    };
    const addProc = () => setProcs(ps => (ps.length >= 6 ? ps : [...ps, { arrival: Math.min(20, ps.length * 2), burst: 3, priority: 3 }]));
    const removeProc = () => setProcs(ps => (ps.length <= 2 ? ps : ps.slice(0, -1)));

    const rowTone = (idx) => {
        if (step.phase === 'run' && step.chosen === idx) return 'bg-yellow-500/10';
        if (step.completion[idx] !== null) return 'opacity-80';
        return '';
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
                            <GanttChart className="h-10 w-10" />CPU Scheduling
                        </h1>
                        <p className="text-xl text-yellow-50 mb-6 max-w-3xl mx-auto">
                            One CPU, several processes that want it. Four policies decide who goes next — watch the Gantt chart grow and the average waiting time change with the policy.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">FCFS · SJF · SRTF · Priority</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Waiting = Turnaround − Burst</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Turnaround = Completion − Arrival</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            {/* Policy selector */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {ALGO_ORDER.map(k => (
                                    <button key={k} onClick={() => setAlgo(k)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${algo === k
                                            ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-yellow-500/60'}`}>
                                        {ALGOS[k].label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-slate-300 mb-1"><span className="text-yellow-400 font-semibold">{ALGOS[algo].full}.</span> {ALGOS[algo].rule}</p>
                            <p className="text-xs text-slate-500 mb-5">{ALGOS[algo].tie} {ALGOS[algo].preemptive ? 'Preemptive.' : 'Non-preemptive.'}</p>

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
                                    <button key={p.name} onClick={() => setProcs(p.procs)}
                                        className="px-3 py-1 text-xs rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60 hover:text-white transition-colors">
                                        {p.name}
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

                            {/* Gantt chart */}
                            <h3 className="text-sm font-semibold text-slate-300 mb-2">Gantt chart</h3>
                            <Gantt step={step} total={total} />

                            {/* Ready queue */}
                            <div className="mt-5 p-4 bg-slate-800/50 rounded-lg border border-slate-700/60">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-slate-300">Ready queue <span className="text-slate-500 font-normal">(arrival order)</span></h3>
                                    <span className="text-xs text-slate-500">{finishedCount} of {step.procs.length} finished</span>
                                </div>
                                {step.phase === 'decide' || step.phase === 'run' ? (
                                    <div className="flex flex-wrap gap-2">
                                        {step.ready.map(i => {
                                            const p = step.procs[i];
                                            const isChosen = step.phase === 'run' && step.chosen === i;
                                            const isRunning = step.phase === 'decide' && step.running === i;
                                            return (
                                                <div key={i} className={`px-3 py-2 rounded-lg border-2 text-xs transition-all duration-300 ${isChosen ? 'border-yellow-300 bg-yellow-400/20 scale-105' : 'border-slate-600 bg-slate-900/60'}`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i] }} />
                                                        <span className="font-bold text-slate-100">{pname(i)}</span>
                                                        {isRunning && <span className="text-[10px] text-yellow-300 uppercase tracking-wide">on CPU</span>}
                                                        {isChosen && <span className="text-[10px] text-yellow-300 uppercase tracking-wide">dispatched</span>}
                                                    </div>
                                                    <div className="font-mono text-slate-400 space-x-2">
                                                        <span className={algo === 'fcfs' ? 'text-yellow-300' : ''}>arr {p.arrival}</span>
                                                        <span className={algo === 'sjf' ? 'text-yellow-300' : ''}>burst {p.burst}</span>
                                                        {algo === 'srtf' && <span className="text-yellow-300">left {step.phase === 'run' && step.chosen === i ? step.remaining[i] + (step.runTo - step.runFrom) : step.remaining[i]}</span>}
                                                        <span className={algo === 'priority' ? 'text-yellow-300' : ''}>pri {p.priority}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">{step.phase === 'idle' ? 'Empty — the CPU is idle.' : step.phase === 'done' ? 'Empty — every process has finished.' : 'Processes join as their arrival time is reached.'}</p>
                                )}
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

                        {/* Process table */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">Processes</h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={removeProc} disabled={procs.length <= 2} aria-label="Remove a process"
                                        className="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:border-yellow-500/60 disabled:opacity-40"><Minus size={14} /></button>
                                    <button onClick={addProc} disabled={procs.length >= 6} aria-label="Add a process"
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
                                            <th className="py-2 px-1">Priority</th>
                                            <th className="py-2 px-1 text-left">Progress</th>
                                            <th className="py-2 px-1">Completion</th>
                                            <th className="py-2 px-1">Turnaround</th>
                                            <th className="py-2 px-1">Waiting</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {step.procs.map(p => {
                                            const ct = step.completion[p.idx];
                                            const doneFrac = (p.burst - step.remaining[p.idx]) / p.burst;
                                            return (
                                                <tr key={p.idx} className={`border-b border-slate-800 transition-colors ${rowTone(p.idx)}`}>
                                                    <td className="py-2 pr-2">
                                                        <span className="inline-flex items-center gap-2 font-bold text-slate-100">
                                                            <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[p.idx] }} />{pname(p.idx)}
                                                        </span>
                                                    </td>
                                                    {['arrival', 'burst', 'priority'].map(f => (
                                                        <td key={f} className="py-2 px-1 text-center">
                                                            <input type="number" value={procs[p.idx]?.[f] ?? p[f]} onChange={e => editProc(p.idx, f, e.target.value)}
                                                                className="w-14 px-1.5 py-1 bg-slate-800 border border-slate-700 rounded text-center text-slate-100 text-xs font-mono focus:border-yellow-500 outline-none" />
                                                        </td>
                                                    ))}
                                                    <td className="py-2 px-1 min-w-[90px]">
                                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${doneFrac * 100}%`, background: COLORS[p.idx] }} />
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{step.remaining[p.idx]} left</div>
                                                    </td>
                                                    <td className="py-2 px-1 text-center font-mono text-slate-200">{ct ?? '—'}</td>
                                                    <td className="py-2 px-1 text-center font-mono text-slate-200">{ct !== null ? ct - p.arrival : '—'}</td>
                                                    <td className="py-2 px-1 text-center font-mono text-yellow-300">{ct !== null ? ct - p.arrival - p.burst : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 text-center">
                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Avg waiting so far</div>
                                    <div className="text-2xl font-bold text-yellow-300 font-mono">{runningAvgWait === null ? '—' : runningAvgWait.toFixed(2)}</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 text-center">
                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Avg turnaround so far</div>
                                    <div className="text-2xl font-bold text-slate-200 font-mono">
                                        {doneMetrics.length ? (doneMetrics.reduce((s, m) => s + m.tat, 0) / doneMetrics.length).toFixed(2) : '—'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Comparison */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-1">Average waiting time — same workload, every policy</h3>
                            <p className="text-xs text-slate-500 mb-4">Click a policy to replay it. Lower is better.</p>
                            <div className="space-y-2">
                                {comparison.map(c => (
                                    <button key={c.key} onClick={() => setAlgo(c.key)} className="w-full flex items-center gap-3 group">
                                        <span className={`w-16 text-left text-xs font-semibold ${c.key === algo ? 'text-yellow-300' : 'text-slate-400 group-hover:text-slate-200'}`}>{ALGOS[c.key].label}</span>
                                        <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden">
                                            <div className={`h-full rounded transition-all duration-500 ${c.key === algo ? 'bg-yellow-500' : 'bg-slate-600 group-hover:bg-slate-500'}`}
                                                style={{ width: `${Math.max(2, (c.avgWaiting / maxAvg) * 100)}%` }} />
                                        </div>
                                        <span className="w-24 text-right font-mono text-xs text-slate-300">{c.avgWaiting.toFixed(2)} <span className="text-slate-500">/ {c.avgTurnaround.toFixed(1)}</span></span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2 text-right">waiting / turnaround</p>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-yellow-500" />
                                <h3 className="font-bold text-white">The Four Policies</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                {[
                                    ['FCFS', 'Simple and fair in order, but suffers the convoy effect.', false],
                                    ['SJF', 'Optimal average wait when all arrive together; needs burst lengths up front.', true],
                                    ['SRTF', 'Preemptive SJF. Best average wait overall; most context switches.', true],
                                    ['Priority', 'Urgent work first. Low-priority jobs can starve without aging.', true],
                                ].map(([k, d, risk]) => (
                                    <div key={k} className={`p-3 rounded-lg border ${ALGOS[algo].label === k ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-slate-700/60 bg-slate-800/30'}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-slate-100">{k}</span>
                                            {risk
                                                ? <span className="flex items-center gap-1 text-[10px] text-red-300"><AlertTriangle className="h-3 w-3" />can starve</span>
                                                : <span className="flex items-center gap-1 text-[10px] text-green-300"><CheckCircle className="h-3 w-3" />no starvation</span>}
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

export default CpuSchedulingPage;
