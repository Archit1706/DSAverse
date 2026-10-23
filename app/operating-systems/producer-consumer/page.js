"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Code2, Shuffle, PackagePlus, Moon, ChevronRight, Lock, AlertTriangle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const quizQuestions = [
    {
        question: 'For a buffer of N slots, what do the semaphores empty and full start at?',
        options: ['empty = 0, full = N', 'empty = N, full = 0', 'empty = 1, full = 1', 'Both start at N'],
        correct: 1,
        explanation: 'empty counts free slots and full counts filled ones. At the start every slot is free, so empty = N and full = 0. Each put moves one unit from empty to full; each take moves it back.',
    },
    {
        question: 'A consumer calls wait(full) while full = 0. What happens?',
        options: [
            'full becomes −1 and the consumer reads garbage',
            'The consumer spins in a loop, checking full over and over',
            'The consumer sleeps on full\'s wait queue until a producer calls signal(full)',
            'The call fails and the consumer must retry later',
        ],
        correct: 2,
        explanation: 'A blocking semaphore puts the caller to sleep instead of letting it spin. The next signal(full) hands the item straight to the sleeping consumer and wakes it — no CPU is wasted while the buffer is empty.',
    },
    {
        question: 'A producer calls wait(mutex) before wait(empty), and the buffer is full. What goes wrong?',
        options: [
            'Nothing — the order of the two waits does not matter',
            'An item is overwritten',
            'Deadlock: the producer sleeps holding the mutex, so no consumer can get in to free a slot',
            'The consumer takes the same item twice',
        ],
        correct: 2,
        explanation: 'The producer sleeps on empty while still holding the mutex. Every consumer then blocks on wait(mutex), so nobody ever signals empty. Always wait on the counting semaphore first and take the mutex last.',
    },
];

const PROGRAMS = {
    producer: [{ op: 'wait', sem: 'empty' }, { op: 'wait', sem: 'mutex' }, { op: 'put' }, { op: 'signal', sem: 'mutex' }, { op: 'signal', sem: 'full' }],
    producerBug: [{ op: 'wait', sem: 'mutex' }, { op: 'wait', sem: 'empty' }, { op: 'put' }, { op: 'signal', sem: 'mutex' }, { op: 'signal', sem: 'full' }],
    consumer: [{ op: 'wait', sem: 'full' }, { op: 'wait', sem: 'mutex' }, { op: 'take' }, { op: 'signal', sem: 'mutex' }, { op: 'signal', sem: 'empty' }],
};
const opText = (o) => (o.op === 'put' ? 'buffer[in] = item' : o.op === 'take' ? 'item = buffer[out]' : `${o.op}(${o.sem})`);
const COLOR = { P1: '#38bdf8', P2: '#818cf8', C1: '#f472b6', C2: '#fb923c' };
const SEMS = ['empty', 'full', 'mutex'];
const SEM_NOTE = { empty: 'free slots', full: 'items ready', mutex: 'buffer lock' };

const rep = (name, n) => Array(n).fill(name);
const PRESETS = [
    { name: 'Fast producer', actors: ['P1', 'C1'], size: 3, bug: false, picks: [...rep('P1', 16), ...rep('C1', 5), ...rep('P1', 5), ...rep('C1', 3)] },
    { name: 'Fast consumer', actors: ['P1', 'C1'], size: 3, bug: false, picks: ['C1', ...rep('P1', 5), ...rep('C1', 5), ...rep('P1', 5), ...rep('C1', 2)] },
    { name: 'Two of each', actors: ['P1', 'P2', 'C1', 'C2'], size: 3, bug: false, picks: 'P1 P2 P1 C1 P2 P1 C2 P2 C1 P1 C1 C2 P2 C2 P1 C1 P2 C2 C1 P1 C2 P2 C1 C2 P1 P2 C1 C2'.split(' ') },
    { name: 'Swapped waits (deadlock)', actors: ['P1', 'C1'], size: 3, bug: true, picks: [...rep('P1', 17), ...rep('C1', 3)] },
];

function generateSteps(cfg) {
    const { size, bug } = cfg;
    const actors = cfg.actors.map(name => ({ name, kind: name[0] === 'P' ? 'producer' : 'consumer', pc: 0, state: 'ready', blockedOn: null, made: 0, ate: [] }));
    const prog = (a) => (a.kind === 'consumer' ? PROGRAMS.consumer : bug ? PROGRAMS.producerBug : PROGRAMS.producer);
    const sems = { empty: { value: size, queue: [] }, full: { value: 0, queue: [] }, mutex: { value: 1, queue: [] } };
    const buffer = Array(size).fill(null);
    let inP = 0;
    let outP = 0;
    let nextItem = 1;
    let mutexHolder = null;
    const picks = cfg.picks.map(n => cfg.actors.indexOf(n));
    let k = 0;
    const timeline = [];
    const steps = [];

    /* The schedule names a thread; if it is asleep, the next awake thread in
       roster order runs instead. If everyone is asleep, that is a deadlock. */
    const choose = () => {
        if (k >= picks.length) return null;
        const want = picks[k];
        for (let d = 0; d < actors.length; d++) {
            const i = (want + d) % actors.length;
            if (actors[i].state !== 'blocked') return { actor: i, skipped: d > 0, wanted: want };
        }
        return { deadlock: true };
    };
    const snap = (extra) => {
        const c = choose();
        return {
            size, bug, roster: cfg.actors, picks, pickIndex: k,
            actors: actors.map(a => ({ ...a, ate: [...a.ate] })),
            sems: Object.fromEntries(SEMS.map(s => [s, { value: sems[s].value, queue: [...sems[s].queue] }])),
            buffer: buffer.map(b => (b ? { ...b } : null)), inP, outP, mutexHolder,
            timeline: timeline.map(e => ({ ...e })),
            upcoming: c && !c.deadlock ? { actor: c.actor, op: prog(actors[c.actor])[actors[c.actor].pc], skipped: c.skipped } : null,
            event: null,
            ...extra,
        };
    };
    const advance = (i) => { actors[i].pc = (actors[i].pc + 1) % prog(actors[i]).length; };

    steps.push(snap({
        phase: 'start',
        explanation: `A buffer of ${size} slots. empty = ${size} counts free slots, full = 0 counts items ready, and mutex = 1 lets one thread at a time touch the buffer.${bug ? ' This producer takes the mutex BEFORE waiting on empty — watch what that does when the buffer fills.' : ''} The schedule strip shows who the scheduler runs next.`,
    }));

    for (let c = choose(); c; c = choose()) {
        if (c.deadlock) {
            const who = actors.map(a => `${a.name} sleeps on ${a.blockedOn}`).join(', ');
            steps.push(snap({
                phase: 'deadlock',
                explanation: `Every thread is asleep: ${who}.${mutexHolder !== null ? ` ${actors[mutexHolder].name} holds the mutex while it sleeps, so no consumer can ever get in to free a slot.` : ''} Nobody is left to call signal — a deadlock.`,
            }));
            return steps;
        }
        const i = c.actor;
        const a = actors[i];
        const o = prog(a)[a.pc];
        k++;
        const event = { actor: i, ...o };
        let text = c.skipped ? `The schedule picks ${actors[c.wanted].name}, but it is asleep on ${actors[c.wanted].blockedOn}, so ${a.name} runs. ` : '';

        if (o.op === 'wait') {
            const s = sems[o.sem];
            if (s.value > 0) {
                s.value--;
                if (o.sem === 'mutex') mutexHolder = i;
                advance(i);
                event.proceed = true;
                text += o.sem === 'mutex'
                    ? `${a.name} takes the mutex — it alone may touch the buffer now.`
                    : `${a.name} calls wait(${o.sem}): ${o.sem} was ${s.value + 1}, so it continues and ${o.sem} drops to ${s.value}.`;
            } else {
                a.state = 'blocked';
                a.blockedOn = o.sem;
                s.queue.push(i);
                event.blocked = true;
                text += o.sem === 'mutex'
                    ? `${a.name} needs the mutex, but ${actors[mutexHolder].name} holds it. ${a.name} goes to sleep on the mutex.`
                    : `${a.name} calls wait(${o.sem}), but ${o.sem} = 0 — ${o.sem === 'empty' ? 'the buffer is full' : 'there is nothing to take'}. ${a.name} goes to sleep on ${o.sem}'s queue, using no CPU.`;
            }
        } else if (o.op === 'signal') {
            const s = sems[o.sem];
            if (s.queue.length) {
                const w = s.queue.shift();
                actors[w].state = 'ready';
                actors[w].blockedOn = null;
                advance(w);
                if (o.sem === 'mutex') mutexHolder = w;
                event.woke = w;
                text += `${a.name} calls signal(${o.sem}). ${actors[w].name} was asleep on it, so it wakes up and gets the ${o.sem === 'mutex' ? 'mutex' : o.sem === 'full' ? 'item' : 'slot'} directly — ${o.sem} stays at ${s.value}.`;
            } else {
                s.value++;
                if (o.sem === 'mutex') mutexHolder = null;
                text += o.sem === 'mutex'
                    ? `${a.name} releases the mutex; nobody was waiting for it.`
                    : `${a.name} calls signal(${o.sem}): nobody is waiting, so ${o.sem} rises to ${s.value}.`;
            }
            advance(i);
        } else if (o.op === 'put') {
            const item = nextItem++;
            buffer[inP] = { item, by: a.name };
            event.item = item;
            event.slot = inP;
            text += `${a.name} puts item ${item} into slot ${inP}; in moves to ${(inP + 1) % size}.`;
            inP = (inP + 1) % size;
            a.made++;
            advance(i);
        } else {
            const got = buffer[outP];
            buffer[outP] = null;
            event.item = got.item;
            event.slot = outP;
            text += `${a.name} takes item ${got.item} (made by ${got.by}) from slot ${outP}; out moves to ${(outP + 1) % size}.`;
            outP = (outP + 1) % size;
            a.ate.push(got.item);
            advance(i);
        }
        timeline.push(event);
        steps.push(snap({ phase: 'exec', event, explanation: text }));
    }

    const items = buffer.filter(Boolean).length;
    steps.push(snap({
        phase: 'done',
        explanation: `End of the schedule. ${nextItem - 1} item${nextItem === 2 ? '' : 's'} produced, ${actors.reduce((s, x) => s + x.ate.length, 0)} consumed, ${items} still in the buffer. Note that empty + full + (threads between their two semaphore calls) always adds up to ${size}.`,
    }));
    return steps;
}

/* Before a wait() the semaphore's value decides proceed-or-sleep; before a
   signal() its wait queue decides increment-or-wake. Both are on screen, and
   the schedule strip shows who runs next. */
function predictFor(step, next) {
    if (!step || !next || next.phase !== 'exec' || !step.upcoming) return null;
    const { actor, op } = step.upcoming;
    if (op.op !== 'wait' && op.op !== 'signal') return null;
    const a = step.actors[actor];
    const s = step.sems[op.sem];
    let q;
    if (op.op === 'wait') {
        q = {
            question: `${a.name} calls wait(${op.sem}) and ${op.sem} = ${s.value}. What happens?`,
            good: `${a.name} carries on`, bad: `${a.name} goes to sleep`, isBad: Boolean(next.event.blocked),
            because: s.value > 0 ? `${op.sem} is above zero, so wait just decrements it.` : `${op.sem} is zero: wait must block until someone signals it.`,
        };
    } else {
        const woke = next.event.woke !== undefined;
        q = {
            question: `${a.name} calls signal(${op.sem}). What happens?`,
            good: `${op.sem} goes up by one`, bad: 'A sleeping thread wakes up', isBad: woke,
            because: woke
                ? `${step.actors[s.queue[0]].name} is asleep on ${op.sem}, so signal wakes it instead of incrementing.`
                : `Nobody is asleep on ${op.sem}, so signal just increments it.`,
        };
    }
    const flip = (actor + a.pc) % 2 === 1;
    const options = flip ? [q.bad, q.good] : [q.good, q.bad];
    return { question: q.question, options, correct: options.indexOf(q.isBad ? q.bad : q.good), because: q.because };
}

const randomPicks = () => Array.from({ length: 30 }, () => ['P1', 'P2', 'C1', 'C2'][Math.floor(Math.random() * 4)]);

function ActorCard({ step, i }) {
    const a = step.actors[i];
    const prog = a.kind === 'consumer' ? PROGRAMS.consumer : step.bug ? PROGRAMS.producerBug : PROGRAMS.producer;
    const isActor = step.event && step.event.actor === i;
    const isNext = step.upcoming && step.upcoming.actor === i;
    const color = COLOR[a.name];
    return (
        <div className={`rounded-xl border-2 p-3 transition-colors duration-300 ${isActor ? 'bg-slate-800/80' : 'bg-slate-900/50'}`} style={{ borderColor: isActor ? color : '#334155' }}>
            <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm" style={{ color }}>{a.name} <span className="text-slate-500 font-normal text-xs">{a.kind}</span></span>
                {a.state === 'blocked'
                    ? <span className="flex items-center gap-1 text-[10px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/25 text-indigo-200"><Moon className="h-3 w-3" />on {a.blockedOn}</span>
                    : step.mutexHolder === i
                        ? <span className="flex items-center gap-1 text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200"><Lock className="h-3 w-3" />in buffer</span>
                        : <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">ready</span>}
            </div>
            <div className="space-y-0.5 font-mono text-[11px]">
                {prog.map((o, j) => {
                    const here = j === a.pc;
                    return (
                        <div key={j} className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${here ? (a.state === 'blocked' ? 'bg-indigo-500/15 text-indigo-100' : 'bg-yellow-400/15 text-yellow-100') : 'text-slate-400'}`}>
                            <ChevronRight className={`h-3 w-3 flex-shrink-0 ${here ? 'text-yellow-300' : 'text-transparent'}`} />
                            <span>{opText(o)}</span>
                            {here && isNext && <span className="ml-auto text-[9px] text-yellow-300 uppercase">next</span>}
                        </div>
                    );
                })}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
                {a.kind === 'producer' ? `made ${a.made}` : `took ${a.ate.length ? a.ate.join(', ') : 'nothing yet'}`}
            </div>
        </div>
    );
}

function SemCard({ step, name }) {
    const s = step.sems[name];
    const ev = step.event;
    const touched = ev && ev.sem === name;
    return (
        <div className={`rounded-lg border p-2.5 transition-colors duration-300 ${touched ? 'border-yellow-400/70 bg-yellow-400/5' : 'border-slate-700 bg-slate-800/50'}`}>
            <div className="flex items-baseline justify-between">
                <span className="font-mono text-sm text-slate-200">{name}</span>
                <span className="text-2xl font-bold font-mono text-white ml-2">{s.value}</span>
            </div>
            <div className="text-[10px] text-slate-500 mb-1.5">{SEM_NOTE[name]}</div>
            <div className="flex gap-1 min-h-[10px] mb-1.5">
                {Array.from({ length: s.value }).map((_, j) => <span key={j} className="w-2.5 h-2.5 rounded-full bg-green-400/80" />)}
            </div>
            <div className="flex flex-wrap gap-1 min-h-[20px]">
                {s.queue.map(w => (
                    <span key={w} className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-900" style={{ background: COLOR[step.actors[w].name] }}>
                        <Moon className="h-2.5 w-2.5" />{step.actors[w].name}
                    </span>
                ))}
                {!s.queue.length && <span className="text-[10px] text-slate-600">no sleepers</span>}
            </div>
        </div>
    );
}

function BufferView({ step }) {
    const ev = step.event;
    return (
        <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 text-center">bounded buffer</div>
            <div className="flex justify-center gap-1.5">
                {step.buffer.map((b, j) => {
                    const hot = ev && (ev.op === 'put' || ev.op === 'take') && ev.slot === j;
                    return (
                        <div key={j} className="flex flex-col items-center">
                            <span className={`text-[10px] font-mono h-4 ${step.inP === j ? 'text-sky-300' : 'text-transparent'}`}>in</span>
                            <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${hot ? (ev.op === 'put' ? 'border-green-400 scale-105' : 'border-pink-400 scale-105') : 'border-slate-600'} ${b ? '' : 'bg-slate-900/60'}`}
                                style={b ? { background: `${COLOR[b.by]}33` } : undefined}>
                                {b ? <span className="text-sm font-bold" style={{ color: COLOR[b.by] }}>#{b.item}</span> : <span className="text-slate-700 text-xs">empty</span>}
                            </div>
                            <span className={`text-[10px] font-mono h-4 ${step.outP === j ? 'text-pink-300' : 'text-transparent'}`}>out</span>
                        </div>
                    );
                })}
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

const codeExample = `import threading
from collections import deque

N = 3
buffer = deque()
empty = threading.Semaphore(N)   # free slots
full = threading.Semaphore(0)    # items ready
mutex = threading.Lock()         # one thread in the buffer at a time

def producer(items):
    for item in items:
        empty.acquire()          # wait(empty): sleep while the buffer is full
        with mutex:              # wait(mutex) ... signal(mutex)
            buffer.append(item)
        full.release()           # signal(full): wake a sleeping consumer

def consumer(count, out):
    for _ in range(count):
        full.acquire()           # wait(full): sleep while the buffer is empty
        with mutex:
            item = buffer.popleft()
        empty.release()          # signal(empty): wake a sleeping producer
        out.append(item)

# The bug on this page: take the mutex first, then wait on empty.
# A producer that sleeps on a full buffer still holds the mutex, so no
# consumer can get in to make room - a deadlock.`;

const ProducerConsumerPage = () => {
    const [cfg, setCfg] = useState(PRESETS[0]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(cfg));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [cfg]);

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
    const producers = step.actors.map((a, i) => (a.kind === 'producer' ? i : null)).filter(i => i !== null);
    const consumers = step.actors.map((a, i) => (a.kind === 'consumer' ? i : null)).filter(i => i !== null);
    const remaining = step.picks.slice(step.pickIndex + (step.upcoming ? 1 : 0));

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
                            <PackagePlus className="h-10 w-10" />Producer-Consumer
                        </h1>
                        <p className="text-xl text-yellow-50 mb-6 max-w-3xl mx-auto">
                            Producers fill a bounded buffer and consumers drain it. Three semaphores make each side sleep when it cannot proceed — and wake exactly when it can.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">empty = N · full = 0 · mutex = 1</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">wait / signal</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Blocking, not spinning</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="text-xs text-slate-500 mr-1">Scenarios:</span>
                                {PRESETS.map(p => (
                                    <button key={p.name} onClick={() => setCfg(p)}
                                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${cfg.name === p.name && cfg.size === p.size ? 'border-yellow-500/70 text-yellow-200 bg-yellow-500/10' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60'}`}>
                                        {p.name}
                                    </button>
                                ))}
                                <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                                    Buffer size
                                    <select value={cfg.size} onChange={e => setCfg(c => ({ ...c, size: Number(e.target.value) }))}
                                        className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-100 text-xs">
                                        {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </label>
                            </div>
                            {cfg.bug && (
                                <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-200">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    The producer here calls wait(mutex) before wait(empty) — the two lines are swapped.
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
                                <button onClick={() => setCfg({ name: 'Random', actors: ['P1', 'P2', 'C1', 'C2'], size: cfg.size, bug: false, picks: randomPicks() })}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Random schedule
                                </button>
                                <PredictToggle predict={predict} accent="yellow" />
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
                                        <span key={`e${j}`} title={opText(e)}
                                            className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center text-slate-900 ${e.blocked ? 'opacity-50 ring-2 ring-indigo-400' : ''} ${e.woke !== undefined ? 'ring-2 ring-green-400' : ''}`}
                                            style={{ background: COLOR[step.roster[e.actor]] }}>
                                            {step.roster[e.actor]}
                                        </span>
                                    ))}
                                    {step.upcoming && (
                                        <span className="h-6 px-2 rounded text-[10px] font-mono font-bold border-2 border-dashed flex items-center"
                                            style={{ borderColor: COLOR[step.roster[step.upcoming.actor]], color: COLOR[step.roster[step.upcoming.actor]] }}>
                                            next: {step.roster[step.upcoming.actor]} {opText(step.upcoming.op)}
                                        </span>
                                    )}
                                    {remaining.map((p, j) => (
                                        <span key={`f${j}`} className="w-6 h-6 rounded text-[9px] font-mono flex items-center justify-center border border-slate-700 text-slate-500">{step.roster[p]}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <BufferView step={step} />
                                <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto">
                                    {SEMS.map(s => <SemCard key={s} step={step} name={s} />)}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                    <div className="space-y-3">{producers.map(i => <ActorCard key={i} step={step} i={i} />)}</div>
                                    <div className="space-y-3">{consumers.map(i => <ActorCard key={i} step={step} i={i} />)}</div>
                                </div>
                            </div>

                            {step.phase === 'deadlock' && (
                                <div className="mt-4 flex items-center justify-center gap-2 py-3 rounded-lg border bg-red-500/10 border-red-500/40 text-red-200 font-semibold">
                                    <AlertTriangle className="h-5 w-5" />Deadlock — every thread is asleep
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
                            <h3 className="font-bold text-white mb-3">Semaphore Rules</h3>
                            <div className="space-y-3 text-sm">
                                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60">
                                    <div className="font-mono text-yellow-300 mb-1">wait(s)</div>
                                    <p className="text-xs text-slate-400 leading-relaxed">If s &gt; 0, decrement it and carry on. Otherwise sleep on s&apos;s queue.</p>
                                </div>
                                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60">
                                    <div className="font-mono text-yellow-300 mb-1">signal(s)</div>
                                    <p className="text-xs text-slate-400 leading-relaxed">If a thread sleeps on s, wake the first one and let it finish its wait. Otherwise increment s.</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed mt-4">
                                Order matters: wait on the <em>counting</em> semaphore (empty or full) first, and take the mutex only once you know you can make progress. The Swapped waits scenario shows why.
                            </p>
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

export default ProducerConsumerPage;
