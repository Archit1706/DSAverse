"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, Shuffle, Landmark, Check, X, ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const quizQuestions = [
    {
        question: 'The system is in an unsafe state. What does that tell you?',
        options: [
            'The processes are deadlocked right now',
            'Deadlock is possible: no order is guaranteed to let everyone finish',
            'At least one process has exceeded its maximum claim',
            'Available is zero for every resource type',
        ],
        correct: 1,
        explanation: 'Unsafe is not the same as deadlocked. It means the OS can no longer guarantee an order in which every process finishes if each one asks for its full maximum. Processes may still release early and everything may work out — the Banker\'s algorithm simply refuses to take that gamble.',
    },
    {
        question: 'How is the Need matrix computed?',
        options: ['Max + Allocation', 'Available − Allocation', 'Max − Allocation', 'Total − Max'],
        correct: 2,
        explanation: 'Need[i][j] = Max[i][j] − Allocation[i][j]: how many more instances of resource j process i may still ask for before it is done. That is why every process must declare its Max up front.',
    },
    {
        question: 'P1 requests resources. Request ≤ Need and Request ≤ Available both hold. What happens next?',
        options: [
            'The request is granted immediately',
            'The OS pretends to grant it and runs the safety check; it is granted only if the resulting state is safe',
            'P1 must wait until another process finishes',
            'The OS kills a process to free resources',
        ],
        correct: 1,
        explanation: 'Passing both checks only means the request is possible. The algorithm tentatively allocates, runs the safety algorithm on the new state, and rolls back (making P1 wait) if that state would be unsafe.',
    },
];

const RES = ['A', 'B', 'C'];
const vec = (v) => `(${v.join(', ')})`;
const leq = (a, b) => a.every((x, j) => x <= b[j]);

const PRESETS = [
    {
        name: 'Textbook (safe)',
        total: [10, 5, 7],
        alloc: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
        max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
    },
    {
        name: 'Unsafe state',
        total: [8, 5, 6],
        alloc: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
        max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
    },
];

const REQUESTS = [
    { name: 'P1 asks (1,0,2)', pid: 1, vec: [1, 0, 2] },
    { name: 'P4 asks (3,3,0)', pid: 4, vec: [3, 3, 0] },
    { name: 'P2 asks (4,0,0)', pid: 2, vec: [4, 0, 0] },
    { name: 'P0 asks (0,0,4)', pid: 0, vec: [0, 0, 4] },
];

/* The safety algorithm, emitting a step to consider each unfinished process
   and a step with the verdict. Passes repeat until one finishes nobody. */
function runSafety(alloc, need, avail, push) {
    const n = alloc.length;
    const work = [...avail];
    const finish = Array(n).fill(false);
    const sequence = [];
    let pass = 0;
    let progress = true;
    while (progress && finish.includes(false)) {
        progress = false;
        pass++;
        for (let i = 0; i < n; i++) {
            if (finish[i]) continue;
            push({
                phase: 'consider', current: i, work: [...work], finish: [...finish], sequence: [...sequence], pass,
                explanation: `Pass ${pass}: can P${i} finish? Compare Need[P${i}] = ${vec(need[i])} with Work = ${vec(work)}, column by column.`,
            });
            const ok = leq(need[i], work);
            const compare = need[i].map((x, j) => ({ need: x, work: work[j], ok: x <= work[j] }));
            if (ok) {
                const before = [...work];
                alloc[i].forEach((x, j) => { work[j] += x; });
                finish[i] = true;
                sequence.push(i);
                progress = true;
                push({
                    phase: 'verdict', current: i, canFinish: true, compare, work: [...work], workBefore: before, released: [...alloc[i]],
                    finish: [...finish], sequence: [...sequence], pass,
                    explanation: `Yes — ${vec(need[i])} ≤ ${vec(before)}. P${i} can get everything it might still ask for, run to completion, and return its allocation ${vec(alloc[i])}. Work grows to ${vec(work)}.`,
                });
            } else {
                const short = compare.map((c, j) => (c.ok ? null : `${RES[j]} (${c.need} > ${c.work})`)).filter(Boolean).join(', ');
                push({
                    phase: 'verdict', current: i, canFinish: false, compare, work: [...work],
                    finish: [...finish], sequence: [...sequence], pass,
                    explanation: `No — P${i} could still need more than Work holds in ${short}. It is skipped for now; it may fit after someone else releases.`,
                });
            }
        }
    }
    return { safe: !finish.includes(false), sequence, finish, work };
}

function generateSteps(state, mode, request) {
    const n = state.alloc.length;
    const alloc = state.alloc.map(r => [...r]);
    const max = state.max.map(r => [...r]);
    const need = max.map((r, i) => r.map((x, j) => x - alloc[i][j]));
    const avail = state.total.map((t, j) => t - alloc.reduce((s, r) => s + r[j], 0));
    const steps = [];
    let extra = {};
    const push = (s) => steps.push({
        mode, total: state.total, request: mode === 'request' ? request : null,
        alloc: alloc.map(r => [...r]), max: max.map(r => [...r]), need: need.map(r => [...r]), avail: [...avail],
        work: null, finish: Array(n).fill(false), sequence: [], current: null, compare: null, canFinish: null, pass: 0,
        ...extra, ...s,
    });

    push({
        phase: 'start',
        explanation: `${n} processes share ${RES.length} resource types with ${vec(state.total)} instances in total. Each process has declared its Max; Allocation is what it holds now. Available = Total − (column sums of Allocation) = ${vec(avail)}.`,
    });
    push({
        phase: 'need', highlightNeed: true,
        explanation: `Need = Max − Allocation: how much more each process may still request. The Banker's algorithm only ever lends if it can see an order in which every process could receive its full Need.`,
    });

    if (mode === 'request') {
        const { pid, vec: req } = request;
        extra = { reqPid: pid };
        push({ phase: 'request', explanation: `P${pid} requests ${vec(req)}. Three checks decide whether it is granted.` });
        if (!leq(req, need[pid])) {
            push({ phase: 'error', outcome: 'error', explanation: `Check 1 fails: ${vec(req)} exceeds Need[P${pid}] = ${vec(need[pid])}. P${pid} is asking for more than its declared maximum, which is an error — the request is rejected outright.` });
            return steps;
        }
        push({ phase: 'check-need', explanation: `Check 1 passes: ${vec(req)} ≤ Need[P${pid}] = ${vec(need[pid])}, so it is within P${pid}'s declared maximum.` });
        if (!leq(req, avail)) {
            push({ phase: 'wait', outcome: 'wait', explanation: `Check 2 fails: ${vec(req)} > Available = ${vec(avail)}. The resources simply are not free yet, so P${pid} must wait.` });
            return steps;
        }
        push({ phase: 'check-avail', explanation: `Check 2 passes: ${vec(req)} ≤ Available = ${vec(avail)}. Now the real question: would granting it leave the system safe?` });
        req.forEach((x, j) => { avail[j] -= x; alloc[pid][j] += x; need[pid][j] -= x; });
        push({ phase: 'pretend', changedRow: pid, explanation: `Pretend to grant it: Available becomes ${vec(avail)}, Allocation[P${pid}] ${vec(alloc[pid])}, Need[P${pid}] ${vec(need[pid])}. Run the safety algorithm on this hypothetical state.` });
    }

    push({ phase: 'init', work: [...avail], explanation: `Safety algorithm: Work = Available = ${vec(avail)}, and every Finish flag starts false. Look for a process whose whole Need fits in Work.` });
    const res = runSafety(alloc, need, avail, push);

    if (mode === 'request') {
        const { pid, vec: req } = request;
        if (res.safe) {
            push({
                phase: 'granted', outcome: 'granted', work: res.work, finish: res.finish, sequence: res.sequence,
                explanation: `Safe: the sequence ${res.sequence.map(i => `P${i}`).join(' → ')} lets everyone finish. The request is granted and the pretend state becomes real.`,
            });
        } else {
            req.forEach((x, j) => { avail[j] += x; alloc[pid][j] -= x; need[pid][j] += x; });
            push({
                phase: 'refused', outcome: 'refused', work: res.work, finish: res.finish, sequence: res.sequence,
                explanation: `Unsafe: no remaining process fits in Work ${vec(res.work)}, so ${res.finish.map((f, i) => (f ? null : `P${i}`)).filter(Boolean).join(', ')} could be stuck. The pretend allocation is rolled back and P${pid} waits — even though the resources were free.`,
            });
        }
    } else {
        push({
            phase: res.safe ? 'safe' : 'unsafe', outcome: res.safe ? 'safe' : 'unsafe', work: res.work, finish: res.finish, sequence: res.sequence,
            explanation: res.safe
                ? `Every process can finish, so the state is SAFE. Safe sequence: ${res.sequence.map(i => `P${i}`).join(' → ')}. Other safe sequences may exist; finding one is enough.`
                : `A full pass finished nobody, so the state is UNSAFE: ${res.finish.map((f, i) => (f ? null : `P${i}`)).filter(Boolean).join(', ')} cannot be guaranteed to finish. Deadlock is now possible, though not certain.`,
        });
    }
    return steps;
}

/* At a "consider" step, Need[i] and Work are both on screen; the next step is
   the verdict. */
function predictFor(step, next) {
    if (!step || !next) return null;
    if (step.phase !== 'consider' || next.phase !== 'verdict') return null;
    const i = step.current;
    const need = step.need[i];
    const work = step.work;
    const yes = next.canFinish;
    const short = need.map((x, j) => (x > work[j] ? `${RES[j]}: ${x} > ${work[j]}` : null)).filter(Boolean).join(', ');
    // Most checks in an unsafe state are "no", so a fixed Yes/No order would
    // let one button score well; the order flips with the row and the pass.
    const YES = 'Yes — its Need fits in Work';
    const NO = 'No — it has to wait for now';
    const options = (i + step.pass) % 2 === 0 ? [YES, NO] : [NO, YES];
    return {
        question: `With Work = ${vec(work)}, can P${i} (Need ${vec(need)}) finish?`,
        options,
        correct: options.indexOf(yes ? YES : NO),
        because: yes
            ? `Every column of Need ${vec(need)} is ≤ Work ${vec(work)}, so P${i} can finish and release its allocation.`
            : `Need exceeds Work in ${short}.`,
    };
}

const randomState = () => {
    const total = RES.map(() => 6 + Math.floor(Math.random() * 5));
    const max = Array.from({ length: 5 }, () => total.map(t => Math.floor(Math.random() * (t + 1))));
    const left = [...total];
    const alloc = max.map(() => [0, 0, 0]);
    [...Array(5).keys()].sort(() => Math.random() - 0.5).forEach(i => {
        RES.forEach((_, j) => {
            const x = Math.min(left[j], Math.floor(Math.random() * (max[i][j] + 1)));
            alloc[i][j] = x;
            left[j] -= x;
        });
    });
    return { name: 'Random', total, alloc, max };
};

/* Need[i] against Work, one unit square per instance: green squares are Work,
   outlined squares are what the process may still need; red where it overflows. */
function Comparator({ need, work, verdict }) {
    const top = Math.max(...need, ...work, 1);
    return (
        <div className="space-y-2">
            {RES.map((r, j) => {
                const over = need[j] > work[j];
                return (
                    <div key={r} className="flex items-center gap-3">
                        <span className="w-5 text-sm font-bold text-slate-300">{r}</span>
                        <div className="flex-1">
                            <div className="flex gap-0.5 mb-0.5">
                                {Array.from({ length: top }).map((_, k) => (
                                    <span key={k} className={`h-3.5 flex-1 max-w-[18px] rounded-sm ${k < work[j] ? 'bg-green-500/80' : 'bg-slate-800'}`} />
                                ))}
                            </div>
                            <div className="flex gap-0.5">
                                {Array.from({ length: top }).map((_, k) => (
                                    <span key={k} className={`h-3.5 flex-1 max-w-[18px] rounded-sm border ${k < need[j]
                                        ? (verdict !== null && over && k >= work[j] ? 'border-red-400 bg-red-500/40' : 'border-yellow-300 bg-yellow-400/20')
                                        : 'border-transparent'}`} />
                                ))}
                            </div>
                        </div>
                        <span className="w-20 text-right text-xs font-mono text-slate-400">
                            {need[j]} {verdict === null ? 'vs' : over ? '>' : '≤'} {work[j]}
                        </span>
                        {verdict !== null && (over ? <X className="h-4 w-4 text-red-400" /> : <Check className="h-4 w-4 text-green-400" />)}
                    </div>
                );
            })}
        </div>
    );
}

function Matrix({ title, rows, step, tone, highlightAll, changedRow }) {
    return (
        <div>
            <div className={`text-xs font-semibold mb-1.5 ${tone}`}>{title}</div>
            <table className="text-sm font-mono border-separate border-spacing-0.5">
                <thead>
                    <tr>{RES.map(r => <th key={r} className="w-8 text-[11px] text-slate-500 font-normal">{r}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        const isCur = step.current === i;
                        const done = step.finish[i];
                        return (
                            <tr key={i}>
                                {row.map((v, j) => (
                                    <td key={j} className={`w-8 h-7 text-center rounded transition-colors duration-300 ${isCur ? 'bg-yellow-400/25 text-yellow-100' : changedRow === i ? 'bg-sky-500/25 text-sky-100' : highlightAll ? 'bg-yellow-500/10 text-yellow-200' : done ? 'bg-green-500/10 text-green-300/70' : 'bg-slate-800 text-slate-200'}`}>
                                        {v}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
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

const codeExample = `def is_safe(available, alloc, need):
    """Banker's safety algorithm. Returns (safe, sequence)."""
    work = list(available)
    finish = [False] * len(alloc)
    sequence = []
    progress = True
    while progress and not all(finish):
        progress = False
        for i in range(len(alloc)):
            if not finish[i] and all(n <= w for n, w in zip(need[i], work)):
                # P_i can run to completion and hand back what it holds
                work = [w + a for w, a in zip(work, alloc[i])]
                finish[i] = True
                sequence.append(i)
                progress = True
    return all(finish), sequence

def request(pid, req, available, alloc, need):
    if any(r > n for r, n in zip(req, need[pid])):
        raise ValueError("exceeds maximum claim")
    if any(r > a for r, a in zip(req, available)):
        return "wait"                      # not free yet
    # pretend to grant, then test the state that would result
    available = [a - r for a, r in zip(available, req)]
    alloc = [row[:] for row in alloc]; need = [row[:] for row in need]
    alloc[pid] = [a + r for a, r in zip(alloc[pid], req)]
    need[pid] = [n - r for n, r in zip(need[pid], req)]
    safe, _ = is_safe(available, alloc, need)
    return "granted" if safe else "wait (unsafe)"`;

const OUTCOME_TONE = {
    safe: 'bg-green-500/10 border-green-500/40 text-green-200',
    granted: 'bg-green-500/10 border-green-500/40 text-green-200',
    unsafe: 'bg-red-500/10 border-red-500/40 text-red-200',
    refused: 'bg-red-500/10 border-red-500/40 text-red-200',
    wait: 'bg-amber-500/10 border-amber-500/40 text-amber-200',
    error: 'bg-red-500/10 border-red-500/40 text-red-200',
};
const OUTCOME_LABEL = { safe: 'Safe state', unsafe: 'Unsafe state', granted: 'Request granted', refused: 'Request refused — unsafe', wait: 'Must wait — not available', error: 'Error — exceeds maximum claim' };

const BankersPage = () => {
    const [state, setState] = useState(PRESETS[0]);
    const [mode, setMode] = useState('safety');
    const [request, setRequest] = useState({ pid: REQUESTS[0].pid, vec: REQUESTS[0].vec });
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(state, mode, request));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [state, mode, request]);

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

    const step = stepHistory[currentStep];
    if (!step) return <div className="min-h-screen bg-slate-950" />;
    const hidden = predict.hideExplanation;
    const showCompare = step.current !== null && (step.phase === 'consider' || step.phase === 'verdict');
    const workShown = step.work ?? null;
    const released = step.phase === 'verdict' && step.canFinish ? step.released : null;

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
                            <Landmark className="h-10 w-10" />Banker&apos;s Algorithm
                        </h1>
                        <p className="text-xl text-yellow-50 mb-6 max-w-3xl mx-auto">
                            Deadlock avoidance the way a cautious bank lends: never hand out resources unless there is still some order in which every customer can be paid in full.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Need = Max − Allocation</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Safety: O(m·n²)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Deadlock avoidance</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                {[['safety', 'Safety check'], ['request', 'Resource request']].map(([k, l]) => (
                                    <button key={k} onClick={() => setMode(k)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${mode === k
                                            ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-yellow-500/60'}`}>{l}</button>
                                ))}
                                <span className="text-xs text-slate-500 ml-2">State:</span>
                                {PRESETS.map(p => (
                                    <button key={p.name} onClick={() => setState(p)}
                                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${state.name === p.name ? 'border-yellow-500/70 text-yellow-200 bg-yellow-500/10' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60'}`}>{p.name}</button>
                                ))}
                            </div>

                            {mode === 'request' && (
                                <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/60">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        {REQUESTS.map(r => (
                                            <button key={r.name} onClick={() => setRequest({ pid: r.pid, vec: r.vec })}
                                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${request.pid === r.pid && vec(request.vec) === vec(r.vec) ? 'border-yellow-500/70 text-yellow-200 bg-yellow-500/10' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-yellow-500/60'}`}>{r.name}</button>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <select value={request.pid} onChange={e => setRequest(r => ({ ...r, pid: Number(e.target.value) }))}
                                            className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-100 text-sm">
                                            {state.alloc.map((_, i) => <option key={i} value={i}>P{i}</option>)}
                                        </select>
                                        <span className="text-slate-400">requests</span>
                                        {RES.map((r, j) => (
                                            <label key={r} className="flex items-center gap-1 text-slate-400 text-xs">{r}
                                                <input type="number" min="0" max="9" value={request.vec[j]}
                                                    onChange={e => { const v = Math.max(0, Math.min(9, parseInt(e.target.value, 10) || 0)); setRequest(q => ({ ...q, vec: q.vec.map((x, k) => (k === j ? v : x)) })); }}
                                                    className="w-12 px-1.5 py-1 bg-slate-900 border border-slate-600 rounded text-center text-slate-100 text-xs font-mono" />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                                <button onClick={() => setState(randomState())}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Randomize
                                </button>
                                <PredictToggle predict={predict} accent="yellow" />
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-yellow-500" />
                            </div>

                            <div className="mb-2 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                <span className="text-sm text-slate-500">{step.pass ? `pass ${step.pass}` : step.phase}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 mb-5">
                                <div className="bg-yellow-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            {/* Matrices */}
                            <div className="overflow-x-auto">
                                <div className="flex gap-5 min-w-max items-start">
                                    <div>
                                        <div className="text-xs font-semibold mb-1.5 text-slate-500">&nbsp;</div>
                                        <div className="text-[11px] h-[22px]" />
                                        {step.alloc.map((_, i) => (
                                            <div key={i} className={`h-7 mb-0.5 flex items-center gap-1.5 text-sm font-bold ${step.current === i ? 'text-yellow-300' : step.finish[i] ? 'text-green-400' : 'text-slate-300'}`}>
                                                P{i}
                                                {step.finish[i] && <Check className="h-3.5 w-3.5" />}
                                                {step.reqPid === i && step.phase !== 'start' && step.phase !== 'need' && <span className="text-[9px] px-1 rounded bg-sky-500/30 text-sky-200">req</span>}
                                            </div>
                                        ))}
                                    </div>
                                    <Matrix title="Allocation" rows={step.alloc} step={step} tone="text-slate-300" changedRow={step.phase === 'pretend' ? step.changedRow : null} />
                                    <Matrix title="Max" rows={step.max} step={step} tone="text-slate-300" />
                                    <Matrix title="Need = Max − Alloc" rows={step.need} step={step} tone="text-yellow-300" highlightAll={step.highlightNeed} changedRow={step.phase === 'pretend' ? step.changedRow : null} />
                                    <div className="pl-2 border-l border-slate-700/60">
                                        <div className="text-xs font-semibold mb-1.5 text-slate-300">Available</div>
                                        <div className="flex gap-0.5 mb-4">
                                            {step.avail.map((v, j) => <span key={j} className={`w-8 h-7 rounded flex items-center justify-center text-sm font-mono ${step.phase === 'pretend' ? 'bg-sky-500/25 text-sky-100' : 'bg-slate-800 text-slate-200'}`}>{v}</span>)}
                                        </div>
                                        <div className="text-xs font-semibold mb-1.5 text-green-300">Work</div>
                                        <div className="flex gap-0.5">
                                            {(workShown ?? [null, null, null]).map((v, j) => (
                                                <span key={j} className={`w-8 h-7 rounded flex items-center justify-center text-sm font-mono transition-colors duration-300 ${v === null ? 'bg-slate-900 text-slate-700' : released && released[j] > 0 && !hidden ? 'bg-green-500/40 text-green-50' : 'bg-green-500/15 text-green-200'}`}>{v ?? '–'}</span>
                                            ))}
                                        </div>
                                        {released && !hidden && <div className="text-[10px] text-green-300 mt-1 font-mono">+{vec(released)} released</div>}
                                        <div className="text-[10px] text-slate-500 mt-3">Total {vec(step.total)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Comparator */}
                            {showCompare && (
                                <div className="mt-5 p-4 rounded-lg bg-slate-800/40 border border-slate-700/60">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-slate-200">Need[P{step.current}] <span className="text-slate-500 font-normal">(outlined)</span> vs Work <span className="text-slate-500 font-normal">(green)</span></span>
                                        {step.phase === 'verdict' && !hidden && (
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${step.canFinish ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                                {step.canFinish ? 'can finish' : 'must wait'}
                                            </span>
                                        )}
                                    </div>
                                    <Comparator need={step.need[step.current]} work={step.phase === 'verdict' && step.canFinish ? step.workBefore : step.work}
                                        verdict={step.phase === 'verdict' && !hidden ? step.canFinish : null} />
                                </div>
                            )}

                            {/* Safe sequence */}
                            <div className="mt-5 flex flex-wrap items-center gap-2 min-h-[36px]">
                                <span className="text-xs uppercase tracking-wide text-slate-500 mr-1">Safe sequence</span>
                                {step.sequence.length === 0 && <span className="text-xs text-slate-600">empty</span>}
                                {step.sequence.map((p, k) => (
                                    <React.Fragment key={k}>
                                        {k > 0 && <ArrowRight className="h-3.5 w-3.5 text-slate-600" />}
                                        <span className="px-2.5 py-1 rounded-md bg-green-500/20 border border-green-500/50 text-green-200 text-sm font-bold">P{p}</span>
                                    </React.Fragment>
                                ))}
                            </div>

                            {step.outcome && (
                                <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-lg border font-semibold ${OUTCOME_TONE[step.outcome]}`}>
                                    {['safe', 'granted'].includes(step.outcome) ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                                    {OUTCOME_LABEL[step.outcome]}
                                </div>
                            )}

                            {predict.prompt && (
                                <div className="mt-5">
                                    <PredictPrompt predict={predict} accent="yellow" />
                                </div>
                            )}

                            <div className="mt-5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-yellow-200 text-sm leading-relaxed">
                                        {hidden ? 'Make your prediction above to reveal this step.' : step.explanation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-yellow-500" />
                                <h3 className="font-bold text-white">The Vocabulary</h3>
                            </div>
                            <dl className="space-y-2.5 text-sm">
                                {[
                                    ['Available', 'Instances of each resource free right now.'],
                                    ['Max', 'The most each process will ever hold, declared up front.'],
                                    ['Allocation', 'What each process holds at this moment.'],
                                    ['Need', 'Max − Allocation: what it may still ask for.'],
                                    ['Work', 'The safety check\'s running total of what would be free.'],
                                    ['Safe state', 'Some order lets every process get its full Need and finish.'],
                                ].map(([k, d]) => (
                                    <div key={k}>
                                        <dt className="font-semibold text-yellow-300">{k}</dt>
                                        <dd className="text-slate-400 text-xs leading-relaxed">{d}</dd>
                                    </div>
                                ))}
                            </dl>
                            <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs text-slate-400 leading-relaxed">
                                Safe ⊂ not deadlocked. The algorithm stays inside the safe region, giving up some utilisation — a request can be refused even when the resources are sitting idle.
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

export default BankersPage;
