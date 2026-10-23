"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Code2, Shuffle, Zap, Lock, Unlock, AlertTriangle, Moon, ChevronRight } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const quizQuestions = [
    {
        question: 'Two threads each run counter++ once on a shared counter that starts at 0, with no lock. What can the final value be?',
        options: ['Always 2', '1 or 2', '0, 1 or 2', 'Anything from 0 to 2, plus garbage'],
        correct: 1,
        explanation: 'Each increment is load, add, store. If one thread loads before the other stores, both write the same value and one increment is lost, giving 1. Of the 20 possible interleavings, only the 2 that run one thread entirely before the other give 2.',
    },
    {
        question: 'Now each thread runs counter++ 100 times, still with no lock. What is the smallest final value that is possible?',
        options: ['100', '101', '2', '1'],
        correct: 2,
        explanation: 'Surprisingly, 2. T1 loads 0 and stalls; T2 does 99 increments; T1 stores 1, wiping them out; T2 loads 1 and stalls; T1 finishes its other 99; T2 stores 2. Unsynchronised code is not "slightly off" — it can be arbitrarily wrong.',
    },
    {
        question: 'What does wrapping counter++ in lock() / unlock() actually guarantee?',
        options: [
            'T1 always runs before T2',
            'The load, add and store of one thread never interleave with another thread\'s',
            'The threads run in parallel on different cores',
            'counter is cached in a register for speed',
        ],
        correct: 1,
        explanation: 'Mutual exclusion: at most one thread is inside the critical section, so each read-modify-write completes before another starts. It says nothing about which thread goes first — only that they do not overlap.',
    },
];

const PROGRAMS = {
    none: ['load', 'add', 'store'],
    mutex: ['lock', 'load', 'add', 'store', 'unlock'],
    atomic: ['faa'],
};
const CODE = {
    load: 'r = counter', add: 'r = r + 1', store: 'counter = r',
    lock: 'lock(m)', unlock: 'unlock(m)', faa: 'fetch_add(counter, 1)',
};
const OP_LABEL = { load: 'LOAD', add: 'ADD', store: 'STORE', lock: 'LOCK', unlock: 'UNLOCK', faa: 'F&A' };
const MODES = {
    none: { label: 'No lock', note: 'counter++ compiles to three separate instructions.' },
    mutex: { label: 'Mutex', note: 'lock(m) and unlock(m) bracket the critical section.' },
    atomic: { label: 'Atomic', note: 'fetch_add does the read-modify-write as one indivisible instruction.' },
};
const T = (i) => `T${i + 1}`;
const TCOLOR = ['#38bdf8', '#f472b6'];

/* Every way to interleave two 3-instruction threads: choose which 3 of 6
   slots belong to T1. */
const ALL_PATTERNS = (() => {
    const out = [];
    for (let m = 0; m < 64; m++) {
        const bits = [0, 1, 2, 3, 4, 5].map(b => (m >> (5 - b)) & 1);
        if (bits.filter(Boolean).length === 3) out.push(bits);
    }
    return out;
})();

const PRESETS = [
    { name: 'One after the other', picks: [0, 0, 0, 1, 1, 1] },
    { name: 'Lockstep', picks: [0, 1, 0, 1, 0, 1] },
    { name: 'Preempted before the store', picks: [0, 0, 1, 1, 1, 0] },
];

/* Runs the threads under a schedule of picks. A pick names the thread the
   scheduler would like to run; if that thread is finished or asleep on the
   lock, the other one runs instead. Once the picks run out, the lowest-
   numbered runnable thread goes. */
function generateSteps(mode, picks) {
    const prog = PROGRAMS[mode];
    const th = [0, 1].map(() => ({ pc: 0, r: null, state: 'ready' }));
    let counter = 0;
    let lock = null;
    const waiters = [];
    let k = 0;
    const timeline = [];
    const steps = [];
    const idx = (op) => prog.indexOf(op);

    const runnable = (i) => th[i].pc < prog.length && th[i].state !== 'blocked';
    const choose = () => {
        if (!runnable(0) && !runnable(1)) return null;
        if (k < picks.length) {
            const want = picks[k];
            return runnable(want) ? { actor: want, skipped: false } : { actor: 1 - want, skipped: true, wanted: want };
        }
        return { actor: runnable(0) ? 0 : 1, skipped: false };
    };
    /* Holding an increment that is not in memory yet: loaded but not stored. */
    const holdsUnsaved = (i) => mode !== 'atomic' && th[i].pc > idx('load') && th[i].pc <= idx('store');

    const snap = (extra) => {
        const up = choose();
        return {
            mode, picks, pickIndex: k, counter, lock, waiters: [...waiters],
            threads: th.map(t => ({ ...t })),
            timeline: timeline.map(e => ({ ...e })),
            upcoming: up ? { actor: up.actor, op: prog[th[up.actor].pc], skipped: up.skipped } : null,
            event: null,
            ...extra,
        };
    };

    steps.push(snap({
        phase: 'start',
        explanation: `counter starts at 0 and each thread increments it once, so the right answer is 2. ${MODES[mode].note} The schedule strip shows which thread the scheduler runs at each step.`,
    }));

    let guard = 0;
    for (let c = choose(); c && guard++ < 50; c = choose()) {
        const i = c.actor;
        const o = 1 - i;
        const op = prog[th[i].pc];
        if (k < picks.length) k++;
        const event = { actor: i, op };
        let text = c.skipped ? `The schedule picks ${T(c.wanted)}, but ${th[c.wanted].state === 'blocked' ? `${T(c.wanted)} is asleep waiting for the lock` : `${T(c.wanted)} has finished`}, so ${T(i)} runs. ` : '';

        if (op === 'load') {
            const stale = holdsUnsaved(o);
            th[i].r = counter;
            th[i].pc++;
            event.stale = stale;
            text += stale
                ? `${T(i)} loads counter = ${counter} into its register — a stale value: ${T(o)} has already loaded and is holding an increment it has not stored yet.`
                : `${T(i)} loads counter = ${counter} into its register. Nothing is pending elsewhere, so the value is up to date.`;
        } else if (op === 'add') {
            th[i].r += 1;
            th[i].pc++;
            text += `${T(i)} adds 1 in its own register: r = ${th[i].r}. Memory still says ${counter} — only ${T(i)} knows about this increment.`;
        } else if (op === 'store') {
            const lost = th[i].r <= counter;
            const before = counter;
            counter = th[i].r;
            th[i].pc++;
            event.lost = lost;
            text += lost
                ? `${T(i)} stores r = ${th[i].r}, overwriting ${before}. ${T(o)}'s increment is wiped out — a lost update.`
                : `${T(i)} stores r = ${th[i].r}: counter goes ${before} → ${counter}.`;
        } else if (op === 'lock') {
            if (lock === null) {
                lock = i;
                th[i].pc++;
                event.acquired = true;
                text += `${T(i)} calls lock(m). The lock is free, so ${T(i)} takes it and enters the critical section.`;
            } else {
                th[i].state = 'blocked';
                waiters.push(i);
                event.blocked = true;
                text += `${T(i)} calls lock(m), but ${T(lock)} holds it. ${T(i)} is put to sleep on the lock's wait queue — it cannot touch counter until ${T(lock)} unlocks.`;
            }
        } else if (op === 'unlock') {
            th[i].pc++;
            if (waiters.length) {
                const w = waiters.shift();
                lock = w;
                th[w].state = 'ready';
                th[w].pc++;
                event.woke = w;
                text += `${T(i)} unlocks. ${T(w)} was waiting, so the lock passes straight to ${T(w)}, which wakes up inside the critical section.`;
            } else {
                lock = null;
                text += `${T(i)} unlocks; nobody is waiting, so the lock is simply free again.`;
            }
        } else {
            const before = counter;
            counter += 1;
            th[i].pc++;
            text += `${T(i)} runs fetch_add: read ${before}, write ${counter}, as one indivisible instruction. No other thread can slip in between.`;
        }
        if (th[i].pc >= prog.length) th[i].state = 'done';
        timeline.push(event);
        steps.push(snap({ phase: 'exec', event, explanation: text }));
    }

    const ok = counter === 2;
    const lostCount = timeline.filter(e => e.lost).length;
    steps.push(snap({
        phase: 'done', result: counter,
        explanation: ok
            ? `Final counter = 2. Correct${mode === 'none' ? ' — this time. Only 2 of the 20 possible interleavings get here without a lock' : mode === 'mutex' ? ': the lock kept the two read-modify-writes from overlapping' : ': an atomic instruction cannot be split'}.`
            : `Final counter = ${counter}, not 2: ${lostCount} increment${lostCount === 1 ? ' was' : 's were'} lost. Nothing crashed and nothing was reported — the program is simply wrong.`,
    }));
    return steps;
}

const finalValue = (mode, picks) => {
    const s = generateSteps(mode, picks);
    return s[s.length - 1].result;
};

/* Three decisions are visible before they happen:
   - a LOAD: is the other thread holding an unsaved increment? (stale or fresh)
   - a STORE: is the register ahead of memory, or has memory caught up? (lost)
   - a LOCK: is the lock free? (acquire or sleep)
   The schedule strip shows who runs next, so each is answerable from the screen. */
function predictFor(step, next) {
    if (!step || !next || next.phase !== 'exec' || !step.upcoming) return null;
    const { actor, op } = step.upcoming;
    const i = actor, o = 1 - actor;
    const me = step.threads[i];
    const other = step.threads[o];
    let q;
    if (op === 'load' && step.mode === 'none') {
        const stale = Boolean(next.event.stale);
        q = {
            question: `${T(i)} is about to load counter. Will the value it reads be up to date?`,
            good: 'Up to date', bad: `Stale — ${T(o)} has an unsaved increment`, isBad: stale,
            because: stale
                ? `${T(o)} has loaded (r = ${other.r}) but not yet stored, so memory is about to be out of date.`
                : `${T(o)} ${other.pc === 0 ? 'has not loaded yet' : 'has already stored its result'}, so memory holds every finished increment.`,
        };
    } else if (op === 'store' && step.mode === 'none') {
        const lost = Boolean(next.event.lost);
        q = {
            question: `${T(i)} is about to store r = ${me.r} into counter (now ${step.counter}). What happens?`,
            good: 'counter goes up by one', bad: 'An update is lost', isBad: lost,
            because: lost
                ? `r = ${me.r} is not ahead of memory (${step.counter}): ${T(o)} stored after ${T(i)} loaded, and this write erases that.`
                : `r = ${me.r} is exactly one more than memory (${step.counter}), so nothing is overwritten.`,
        };
    } else if (op === 'lock') {
        const blocked = Boolean(next.event.blocked);
        q = {
            question: `${T(i)} calls lock(m). What happens?`,
            good: `${T(i)} acquires the lock`, bad: `${T(i)} blocks and sleeps`, isBad: blocked,
            because: blocked ? `${T(step.lock)} holds the lock, so ${T(i)} must wait.` : 'The lock is free, so the call returns immediately.',
        };
    } else return null;
    // The first load is always fresh and the first lock always succeeds, so a
    // fixed order would let "always click the first button" score well.
    const flip = (me.pc + actor) % 2 === 1;
    const options = flip ? [q.bad, q.good] : [q.good, q.bad];
    return { question: q.question, options, correct: options.indexOf(q.isBad ? q.bad : q.good), because: q.because };
}

function ThreadCard({ step, i }) {
    const prog = PROGRAMS[step.mode];
    const t = step.threads[i];
    const ev = step.event;
    const isActor = ev && ev.actor === i;
    const isNext = step.upcoming && step.upcoming.actor === i;
    return (
        <div className={`rounded-xl border-2 p-3 transition-colors duration-300 ${isActor ? 'bg-slate-800/80' : 'bg-slate-900/50'}`}
            style={{ borderColor: isActor ? TCOLOR[i] : '#334155' }}>
            <div className="flex items-center justify-between mb-2">
                <span className="font-bold" style={{ color: TCOLOR[i] }}>Thread {i + 1}</span>
                <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-1 ${t.state === 'blocked' ? 'bg-indigo-500/25 text-indigo-200' : t.state === 'done' ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-400'}`}>
                    {t.state === 'blocked' && <Moon className="h-3 w-3" />}{t.state === 'blocked' ? 'asleep' : t.state}
                </span>
            </div>
            <div className="space-y-1 mb-3 font-mono text-xs">
                {prog.map((op, j) => {
                    const done = j < t.pc;
                    const here = j === t.pc && t.state !== 'done';
                    const critical = step.mode === 'mutex' && op !== 'lock' && op !== 'unlock';
                    return (
                        <div key={j} className={`flex items-center gap-2 px-2 py-1 rounded ${here ? 'bg-yellow-400/15 text-yellow-100' : done ? 'text-slate-500' : 'text-slate-300'} ${critical ? 'border-l-2 border-amber-500/50 ml-1' : ''}`}>
                            <ChevronRight className={`h-3 w-3 flex-shrink-0 ${here ? 'text-yellow-300' : 'text-transparent'}`} />
                            <span className={done ? 'line-through decoration-slate-600' : ''}>{CODE[op]}</span>
                            {here && isNext && <span className="ml-auto text-[9px] text-yellow-300 uppercase">next</span>}
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">register r</span>
                <span className={`font-mono text-lg font-bold px-2 rounded ${isActor && (ev.op === 'load' || ev.op === 'add') ? 'bg-yellow-400/20 text-yellow-100' : 'text-slate-100'}`}>{t.r ?? '—'}</span>
            </div>
            {isActor && ev.stale && <div className="mt-2 text-[11px] flex items-center gap-1 text-red-300"><AlertTriangle className="h-3 w-3" />stale read</div>}
        </div>
    );
}

function PatternStrip({ picks, active, result, onPick }) {
    return (
        <button onClick={onPick}
            className={`flex items-center gap-1.5 p-1.5 rounded-md border transition-colors ${active ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'}`}>
            <span className="flex gap-0.5">
                {picks.map((p, i) => <span key={i} className="w-2.5 h-4 rounded-sm" style={{ background: TCOLOR[p] }} />)}
            </span>
            <span className={`text-xs font-bold font-mono w-4 text-center ${result === 2 ? 'text-green-400' : 'text-red-400'}`}>{result}</span>
        </button>
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

const codeExample = `import threading

counter = 0
lock = threading.Lock()

def unsafe(n):
    global counter
    for _ in range(n):
        counter += 1      # load, add, store: a thread switch can land
                          # between them, even under CPython's GIL

def safe(n):
    global counter
    for _ in range(n):
        with lock:        # only one thread in here at a time
            counter += 1

def run(worker, n=200_000):
    global counter
    counter = 0
    threads = [threading.Thread(target=worker, args=(n,)) for _ in range(4)]
    for t in threads: t.start()
    for t in threads: t.join()
    return counter

print(run(unsafe))   # may be less than 800000, and differ run to run
print(run(safe))     # always 800000`;

const RaceConditionsPage = () => {
    const [mode, setMode] = useState('none');
    const [picks, setPicks] = useState(PRESETS[1].picks);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(mode, picks));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [mode, picks]);

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

    const explorer = useMemo(() => ALL_PATTERNS.map(p => ({ picks: p, result: finalValue(mode, p) })), [mode]);
    const correctCount = explorer.filter(e => e.result === 2).length;

    const step = stepHistory[currentStep];
    if (!step) return <div className="min-h-screen bg-slate-950" />;
    const hidden = predict.hideExplanation;
    const ev = step.event;
    const flash = ev && !hidden && (ev.op === 'store' || ev.op === 'faa');
    const samePicks = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

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
                            <Zap className="h-10 w-10" />Race Conditions
                        </h1>
                        <p className="text-xl text-yellow-50 mb-6 max-w-3xl mx-auto">
                            Two threads, one shared counter, one line of code each. Whether the answer is right depends entirely on how the scheduler interleaves three tiny instructions.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">20 interleavings</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Lost updates</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Mutex · Atomic</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {Object.entries(MODES).map(([k, m]) => (
                                    <button key={k} onClick={() => setMode(k)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${mode === k
                                            ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-yellow-500/60'}`}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-slate-300 mb-4">{MODES[mode].note}</p>

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
                                <button onClick={() => setPicks(ALL_PATTERNS[Math.floor(Math.random() * ALL_PATTERNS.length)])}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Random schedule
                                </button>
                                <PredictToggle predict={predict} accent="yellow" />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs text-slate-500 mr-1">Schedules:</span>
                                {PRESETS.map(p => (
                                    <button key={p.name} onClick={() => setPicks(p.picks)}
                                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${samePicks(p.picks, picks) ? 'border-yellow-500/70 text-yellow-200 bg-yellow-500/10' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60'}`}>
                                        {p.name}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-yellow-500" />
                            </div>

                            {/* Schedule strip */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs uppercase tracking-wide text-slate-500">Schedule</span>
                                    <span className="text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {step.timeline.map((e, j) => (
                                        <span key={`e${j}`} className={`px-2 py-1 rounded text-[11px] font-mono font-bold text-slate-900 ${e.lost ? 'ring-2 ring-red-400' : ''} ${e.stale ? 'ring-2 ring-orange-400' : ''}`}
                                            style={{ background: TCOLOR[e.actor] }}>
                                            {T(e.actor)} {OP_LABEL[e.op]}{e.blocked ? ' · sleeps' : ''}
                                        </span>
                                    ))}
                                    {step.upcoming && (
                                        <span className="px-2 py-1 rounded text-[11px] font-mono font-bold border-2 border-dashed"
                                            style={{ borderColor: TCOLOR[step.upcoming.actor], color: TCOLOR[step.upcoming.actor] }}>
                                            next: {T(step.upcoming.actor)} {OP_LABEL[step.upcoming.op]}
                                        </span>
                                    )}
                                    {step.picks.slice(step.pickIndex + (step.upcoming && step.pickIndex < step.picks.length ? 1 : 0)).map((p, j) => (
                                        <span key={`f${j}`} className="px-2 py-1 rounded text-[11px] font-mono border border-slate-700 text-slate-500">{T(p)}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Threads and memory */}
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
                                <ThreadCard step={step} i={0} />
                                <div className="flex sm:flex-col items-center justify-center gap-4 px-2">
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">shared memory</div>
                                        <div className={`w-24 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${flash && ev.lost ? 'border-red-400 bg-red-500/15 scale-105' : flash ? 'border-green-400 bg-green-500/10 scale-105' : 'border-slate-600 bg-slate-800/70'}`}>
                                            <span className="text-[10px] font-mono text-slate-400">counter</span>
                                            <span className="text-3xl font-bold font-mono text-white">{step.counter}</span>
                                        </div>
                                        {flash && ev.lost && <div className="mt-1 text-[11px] text-red-300 font-semibold">update lost</div>}
                                    </div>
                                    {step.mode === 'mutex' && (
                                        <div className="text-center">
                                            <div className={`w-24 rounded-xl border-2 py-2 flex flex-col items-center transition-colors duration-300 ${step.lock === null ? 'border-green-500/60 bg-green-500/10' : 'border-amber-500/70 bg-amber-500/10'}`}>
                                                {step.lock === null ? <Unlock className="h-5 w-5 text-green-300" /> : <Lock className="h-5 w-5 text-amber-300" />}
                                                <span className="text-xs font-mono mt-1" style={{ color: step.lock === null ? '#86efac' : TCOLOR[step.lock] }}>
                                                    {step.lock === null ? 'free' : `held by ${T(step.lock)}`}
                                                </span>
                                                {step.waiters.length > 0 && <span className="text-[10px] text-indigo-300 mt-0.5">waiting: {step.waiters.map(T).join(', ')}</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <ThreadCard step={step} i={1} />
                            </div>

                            {step.phase === 'done' && (
                                <div className={`mt-4 flex items-center justify-center gap-3 py-3 rounded-lg border font-semibold ${step.result === 2 ? 'bg-green-500/10 border-green-500/40 text-green-200' : 'bg-red-500/10 border-red-500/40 text-red-200'}`}>
                                    expected 2 · got {step.result}
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

                        {/* Interleaving explorer */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                                <h3 className="font-bold text-white">Every interleaving</h3>
                                <span className={`text-sm font-mono font-bold ${correctCount === ALL_PATTERNS.length ? 'text-green-300' : 'text-red-300'}`}>
                                    {correctCount} of {ALL_PATTERNS.length} give 2
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">
                                Each strip is one schedule of six turns (<span style={{ color: TCOLOR[0] }}>T1</span> / <span style={{ color: TCOLOR[1] }}>T2</span>); the number is the final counter in <span className="text-slate-300">{MODES[mode].label.toLowerCase()}</span> mode. Click one to replay it.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {explorer.map((e, i) => (
                                    <PatternStrip key={i} picks={e.picks} result={e.result} active={samePicks(e.picks, picks)} onPick={() => setPicks(e.picks)} />
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                                {mode === 'none'
                                    ? 'Only the two schedules that run one thread to completion before the other starts are correct. Testing a racy program a few times proves very little: most runs may happen to land on a lucky schedule.'
                                    : mode === 'mutex'
                                        ? 'Same twenty schedules, all correct. When the scheduler picks a thread that is asleep on the lock, the other one runs instead — the lock removes the bad interleavings rather than making them unlikely.'
                                        : 'With one indivisible instruction per thread there is nothing to interleave inside an increment, so every schedule is correct.'}
                            </p>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-3">Beyond the Overview</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-3">
                                The <Link href="/under-the-hood/multithreading" className="text-yellow-300 hover:text-yellow-200 underline underline-offset-2">Multithreading</Link> explainer shows one bad interleaving. This page lets you try them all and see exactly which conditions cause the damage:
                            </p>
                            <ul className="space-y-2.5 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="mt-1 w-2.5 h-2.5 rounded-sm ring-2 ring-orange-400 flex-shrink-0" /><span><strong className="text-slate-100">Stale read:</strong> loading while the other thread holds an increment it has not stored.</span></li>
                                <li className="flex gap-2"><span className="mt-1 w-2.5 h-2.5 rounded-sm ring-2 ring-red-400 flex-shrink-0" /><span><strong className="text-slate-100">Lost update:</strong> storing a register that memory has already caught up with.</span></li>
                                <li className="flex gap-2"><Moon className="h-3.5 w-3.5 mt-0.5 text-indigo-300 flex-shrink-0" /><span><strong className="text-slate-100">Sleeping on a lock</strong> costs no CPU; the unlocker hands the lock straight to the waiter.</span></li>
                            </ul>
                            <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs text-slate-400 leading-relaxed">
                                Real hardware adds a further twist this model leaves out: without barriers, CPUs and compilers may reorder memory operations, so even code that looks correctly interleaved can misbehave.
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

export default RaceConditionsPage;
