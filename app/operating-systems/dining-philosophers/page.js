"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Code2, Shuffle, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const quizQuestions = [
    {
        question: 'Every philosopher picks up their left fork at the same moment. Why can nobody ever eat?',
        options: [
            'There are not enough forks for anyone',
            'Each holds one fork and waits for the next philosopher\'s, all the way round — a circular wait',
            'The forks are starving each other',
            'Philosophers must eat in numerical order',
        ],
        correct: 1,
        explanation: 'All four Coffman conditions hold: forks are exclusive, everyone holds one while waiting for another, nobody gives one up, and the waits form a cycle P1 → P2 → … → P5 → P1. Break any one and the deadlock disappears.',
    },
    {
        question: 'Numbering the forks and always picking up the lower-numbered one first breaks which condition?',
        options: ['Mutual exclusion', 'Hold and wait', 'No preemption', 'Circular wait'],
        correct: 3,
        explanation: 'Every wait now points from a lower fork to a higher one, so a cycle would need a fork to be both lower and higher than another. In practice it is the last philosopher who flips: they reach for fork 1 first and wait holding nothing, which leaves the cycle open.',
    },
    {
        question: 'Another classic fix lets at most four philosophers sit at the table at once. Why can that never deadlock?',
        options: [
            'Four philosophers need fewer than four forks',
            'With four philosophers and five forks, at least one of them can always get both forks',
            'The fifth philosopher eats for everyone',
            'It makes the forks preemptible',
        ],
        correct: 1,
        explanation: 'Pigeonhole: four people holding at most one fork each leaves a fifth fork free, and it sits next to someone who already holds one. That philosopher can eat, finish, and release both forks, so the system always makes progress.',
    },
];

const N = 5;
const left = (i) => i;
const right = (i) => (i % N) + 1;
const firstFork = (i, mode) => (mode === 'naive' ? left(i) : Math.min(left(i), right(i)));
const secondFork = (i, mode) => (mode === 'naive' ? right(i) : Math.max(left(i), right(i)));
const P = (i) => `P${i}`;
const PROGRAM = ['pick1', 'pick2', 'eat', 'release'];

const ALL = [1, 2, 3, 4, 5];
const PRESETS = [
    { name: 'Everyone grabs at once', picks: Array.from({ length: 8 }, () => ALL).flat() },
    { name: 'Taking turns', picks: [1, 3, 5, 2, 4].flatMap(i => [i, i, i, i]) },
];

function generateSteps(mode, picks) {
    const phil = Array.from({ length: N + 1 }, (_, i) => ({ id: i, pc: 0, waiting: null, meals: 0 }));
    const holder = Array(N + 1).fill(null);
    const queue = Array.from({ length: N + 1 }, () => []);
    let k = 0;
    const timeline = [];
    const steps = [];

    const choose = () => {
        if (k >= picks.length) return null;
        const want = picks[k];
        for (let d = 0; d < N; d++) {
            const i = ((want - 1 + d) % N) + 1;
            if (phil[i].waiting === null) return { actor: i, skipped: d > 0, wanted: want };
        }
        return { deadlock: true };
    };
    const snap = (extra) => {
        const c = choose();
        return {
            mode, picks, pickIndex: k,
            phil: phil.map(p => ({ ...p })), holder: [...holder], queue: queue.map(q => [...q]),
            timeline: timeline.map(e => ({ ...e })),
            upcoming: c && !c.deadlock ? { actor: c.actor, action: PROGRAM[phil[c.actor].pc], skipped: c.skipped } : null,
            event: null,
            ...extra,
        };
    };
    /* Hand a released fork to the first philosopher waiting on it, if any. */
    const release = (f) => {
        holder[f] = null;
        if (!queue[f].length) return null;
        const w = queue[f].shift();
        holder[f] = w;
        phil[w].waiting = null;
        phil[w].pc++;
        return w;
    };

    steps.push(snap({
        phase: 'start',
        explanation: mode === 'naive'
            ? 'Five philosophers, five forks, one between each pair. To eat, a philosopher needs both neighbouring forks. The naive rule: pick up the left fork, then the right.'
            : 'Same table, one change: the forks are numbered, and every philosopher picks up the LOWER-numbered of their two forks first. For P1–P4 that is still the left fork; for P5 (forks 5 and 1) it is fork 1.',
    }));

    for (let c = choose(); c; c = choose()) {
        if (c.deadlock) {
            const cycle = [];
            let x = 1;
            for (let n = 0; n < N + 1 && !cycle.includes(x); n++) { cycle.push(x); x = holder[phil[x].waiting]; }
            const loop = cycle.slice(cycle.indexOf(x));   // drop any tail leading into the cycle
            steps.push(snap({
                phase: 'deadlock', cycle: loop,
                explanation: `Every philosopher is waiting: ${ALL.map(i => `${P(i)} wants fork ${phil[i].waiting} (held by ${P(holder[phil[i].waiting])})`).join(', ')}. The waits form a circle, so nobody will ever eat — deadlock.`,
            }));
            return steps;
        }
        const i = c.actor;
        const p = phil[i];
        const action = PROGRAM[p.pc];
        k++;
        const event = { actor: i, action };
        let text = c.skipped ? `The schedule picks ${P(c.wanted)}, who is waiting for a fork, so ${P(i)} acts instead. ` : '';
        if (action === 'pick1' || action === 'pick2') {
            const f = action === 'pick1' ? firstFork(i, mode) : secondFork(i, mode);
            const other = action === 'pick1' ? secondFork(i, mode) : firstFork(i, mode);
            event.fork = f;
            const why = action === 'pick1'
                ? (mode === 'naive' ? `reaches for its left fork, fork ${f}` : `reaches for the lower of forks ${Math.min(f, other)} and ${Math.max(f, other)}: fork ${f}`)
                : `reaches for its second fork, fork ${f}`;
            if (holder[f] === null) {
                holder[f] = i;
                p.pc++;
                event.blocked = false;
                text += `${P(i)} ${why}. It is free, so ${P(i)} takes it${action === 'pick2' ? ' and now holds both forks' : ''}.`;
            } else {
                p.waiting = f;
                queue[f].push(i);
                event.blocked = true;
                event.heldBy = holder[f];
                text += `${P(i)} ${why}, but ${P(holder[f])} holds it. ${P(i)} waits${action === 'pick2' ? ` — still holding fork ${other}: hold and wait` : ' — holding nothing, so it blocks no one'}.`;
            }
        } else if (action === 'eat') {
            p.meals++;
            p.pc++;
            text += `${P(i)} eats (meal ${p.meals}).`;
        } else {
            const a = secondFork(i, mode);
            const b = firstFork(i, mode);
            const wa = release(a);
            const wb = release(b);
            p.pc = 0;
            event.handed = [wa, wb].filter(w => w !== null);
            const part = (f, w) => (w !== null ? `fork ${f} goes straight to ${P(w)}, who was waiting for it` : `fork ${f} is free`);
            text += `${P(i)} puts both forks down and goes back to thinking: ${part(a, wa)}; ${part(b, wb)}.`;
        }
        timeline.push(event);
        steps.push(snap({ phase: 'exec', event, explanation: text }));
    }

    const meals = ALL.map(i => `${P(i)} ${phil[i].meals}`).join(', ');
    steps.push(snap({
        phase: 'done',
        explanation: `End of the schedule with no deadlock. Meals so far: ${meals}.${mode === 'ordering' ? ' Resource ordering rules out deadlock, but not unfairness — a philosopher can still be unlucky and wait a long time.' : ' This schedule happened to avoid the deadly interleaving; the naive rule does not rule it out.'}`,
    }));
    return steps;
}

/* Before a pick-up, the rule, the fork numbers and who holds each fork are
   all on screen. Options rotate with the philosopher and their meal count. */
function predictFor(step, next) {
    if (!step || !next || next.phase !== 'exec' || !step.upcoming) return null;
    const { actor: i, action } = step.upcoming;
    if (action !== 'pick1' && action !== 'pick2') return null;
    const ev = next.event;
    const label = `${ev.blocked ? 'Waits for' : 'Takes'} fork ${ev.fork}`;
    const meals = step.phil[i].meals;
    let base;
    let question;
    if (action === 'pick1') {
        const l = left(i), r = right(i);
        base = [`Takes fork ${l}`, `Takes fork ${r}`, `Waits for fork ${l}`, `Waits for fork ${r}`];
        question = `${P(i)} gets hungry (forks ${Math.min(l, r)} and ${Math.max(l, r)} beside it). What happens first?`;
    } else {
        const f = secondFork(i, step.mode);
        base = [`Takes fork ${f}`, `Waits for fork ${f}`];
        question = `${P(i)} holds fork ${firstFork(i, step.mode)} and reaches for fork ${f}. What happens?`;
    }
    const shift = (i + meals) % base.length;
    const options = [...base.slice(shift), ...base.slice(0, shift)];
    const ruleNote = action === 'pick1'
        ? (step.mode === 'naive' ? `The naive rule always starts with the left fork (${ev.fork}).` : `Lower number first: fork ${ev.fork}.`)
        : '';
    const because = `${ruleNote} ${ev.blocked ? `Fork ${ev.fork} is held by ${P(ev.heldBy)}, so ${P(i)} must wait.` : `Fork ${ev.fork} is free.`}`.trim();
    return { question, options, correct: options.indexOf(label), because };
}

const randomPicks = () => Array.from({ length: 40 }, () => 1 + Math.floor(Math.random() * N));

/* Round table geometry: philosopher i at angle a(i); fork f sits between
   philosopher f-1 and philosopher f. */
const CX = 210, CY = 200, PR = 150, FR = 82;
const ang = (i) => (-90 + (i - 1) * 72) * (Math.PI / 180);
const forkAng = (f) => (-90 + (f - 1) * 72 - 36) * (Math.PI / 180);
const PHIL_POS = (i) => [CX + PR * Math.cos(ang(i)), CY + PR * Math.sin(ang(i))];
const FORK_HOME = (f) => [CX + FR * Math.cos(forkAng(f)), CY + FR * Math.sin(forkAng(f))];

function Table({ step }) {
    const deadCycle = step.phase === 'deadlock' ? step.cycle : null;
    const ev = step.event;
    return (
        <svg viewBox="0 0 420 400" width="100%" className="max-w-[460px] mx-auto block">
            <defs>
                <marker id="dp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f87171" />
                </marker>
                <marker id="dp-arrow-soft" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc" />
                </marker>
            </defs>
            <circle cx={CX} cy={CY} r="112" fill="#1c1917" stroke="#78350f" strokeWidth="3" />
            <circle cx={CX} cy={CY} r="104" fill="none" stroke="#451a03" strokeWidth="1" />

            {/* wait-for arrows: waiter -> holder */}
            {ALL.map(i => {
                const f = step.phil[i].waiting;
                if (f === null || step.holder[f] === null) return null;
                const [x1, y1] = PHIL_POS(i);
                const [x2, y2] = PHIL_POS(step.holder[f]);
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                const qx = mx + (CX - mx) * 0.35, qy = my + (CY - my) * 0.35;
                const dx = x2 - qx, dy = y2 - qy, len = Math.hypot(dx, dy) || 1;
                const ex = x2 - (dx * 30) / len, ey = y2 - (dy * 30) / len;
                const sx0 = qx - x1, sy0 = qy - y1, l0 = Math.hypot(sx0, sy0) || 1;
                const sx = x1 + (sx0 * 30) / l0, sy = y1 + (sy0 * 30) / l0;
                return (
                    <path key={`w${i}`} d={`M ${sx} ${sy} Q ${qx} ${qy} ${ex} ${ey}`} fill="none"
                        stroke={deadCycle ? '#f87171' : '#a5b4fc'} strokeWidth={deadCycle ? 2.5 : 1.8} strokeDasharray="5 4"
                        markerEnd={`url(#${deadCycle ? 'dp-arrow' : 'dp-arrow-soft'})`} />
                );
            })}

            {/* forks */}
            {ALL.map(f => {
                const h = step.holder[f];
                const [hx, hy] = FORK_HOME(f);
                let x = hx, y = hy;
                if (h !== null) {
                    const [px, py] = PHIL_POS(h);
                    x = hx + (px - hx) * 0.42;
                    y = hy + (py - hy) * 0.42;
                }
                const rot = (forkAng(f) * 180) / Math.PI + 90;
                const hot = ev && ev.fork === f && (ev.action === 'pick1' || ev.action === 'pick2');
                return (
                    <g key={`f${f}`} style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 0.5s ease' }}>
                        <g transform={`rotate(${rot})`}>
                            <rect x="-3.5" y="-17" width="7" height="34" rx="3"
                                fill={h === null ? '#cbd5e1' : '#fde047'} stroke={hot ? (ev.blocked ? '#f87171' : '#4ade80') : '#0f172a'} strokeWidth={hot ? 2.5 : 1} />
                            <line x1="-2" y1="-17" x2="-2" y2="-25" stroke={h === null ? '#cbd5e1' : '#fde047'} strokeWidth="1.5" />
                            <line x1="2" y1="-17" x2="2" y2="-25" stroke={h === null ? '#cbd5e1' : '#fde047'} strokeWidth="1.5" />
                        </g>
                        {/* number badge, offset towards the table centre so it never sits on the fork */}
                        <circle cx={-Math.cos(forkAng(f)) * 17} cy={-Math.sin(forkAng(f)) * 17} r="8" fill="#0f172a" stroke={h === null ? '#64748b' : '#ca8a04'} strokeWidth="1.2" />
                        <text x={-Math.cos(forkAng(f)) * 17} y={-Math.sin(forkAng(f)) * 17 + 3.5} textAnchor="middle" fontSize="10" fontWeight="800" fill={h === null ? '#e2e8f0' : '#fde047'}>{f}</text>
                    </g>
                );
            })}

            {/* philosophers */}
            {ALL.map(i => {
                const p = step.phil[i];
                const [x, y] = PHIL_POS(i);
                const held = [1, 2, 3, 4, 5].filter(f => step.holder[f] === i).length;
                let fill = '#1e293b', stroke = '#64748b', label = 'thinking';
                if (p.waiting !== null) { fill = 'rgba(99,102,241,0.25)'; stroke = deadCycle ? '#f87171' : '#a5b4fc'; label = `waits for ${p.waiting}`; }
                else if (p.pc === 3) { fill = 'rgba(74,222,128,0.25)'; stroke = '#4ade80'; label = 'eating'; }
                else if (held > 0) { fill = 'rgba(245,158,11,0.2)'; stroke = '#f59e0b'; label = held === 2 ? 'has both' : 'has one'; }
                const active = ev && ev.actor === i;
                const next = step.upcoming && step.upcoming.actor === i;
                return (
                    <g key={`p${i}`}>
                        {next && <circle cx={x} cy={y} r="34" fill="none" stroke="#facc15" strokeDasharray="3 3" strokeWidth="1.5" />}
                        <circle cx={x} cy={y} r="27" fill={fill} stroke={active ? '#facc15' : stroke} strokeWidth={active ? 3 : 2} style={{ transition: 'fill 0.3s ease, stroke 0.3s ease' }} />
                        <text x={x} y={y - 2} textAnchor="middle" fontSize="13" fontWeight="800" fill="#f1f5f9">{P(i)}</text>
                        <text x={x} y={y + 12} textAnchor="middle" fontSize="8.5" fill="#cbd5e1">{label}</text>
                        <text x={x} y={y + (y > CY ? 44 : -36)} textAnchor="middle" fontSize="9" fill="#94a3b8">meals {p.meals}</text>
                    </g>
                );
            })}
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

const codeExample = `import threading

N = 5
forks = [threading.Lock() for _ in range(N)]    # forks 0..N-1

def philosopher(i, meals, eat, think):
    left, right = i, (i + 1) % N

    # Naive: forks[left] then forks[right]. If all N start together,
    # each holds its left fork and waits forever for its right one.

    # Resource ordering: always lock the lower-numbered fork first.
    # The last philosopher (forks N-1 and 0) now reaches for fork 0
    # first, so the circle of waits can never close.
    first, second = min(left, right), max(left, right)

    for _ in range(meals):
        think(i)
        with forks[first]:
            with forks[second]:
                eat(i)

threads = [threading.Thread(target=philosopher, args=(i, 3, print, lambda _: None))
           for i in range(N)]
for t in threads: t.start()
for t in threads: t.join()`;

const DiningPhilosophersPage = () => {
    const [mode, setMode] = useState('naive');
    const [picks, setPicks] = useState(PRESETS[0].picks);
    const [presetName, setPresetName] = useState(PRESETS[0].name);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
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

    const step = stepHistory[currentStep];
    if (!step) return <div className="min-h-screen bg-slate-950" />;
    const hidden = predict.hideExplanation;
    const remaining = step.picks.slice(step.pickIndex + (step.upcoming ? 1 : 0));
    const ACTION_LABEL = { pick1: 'pick up first fork', pick2: 'pick up second fork', eat: 'eat', release: 'put forks down' };

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
                            <UtensilsCrossed className="h-10 w-10" />Dining Philosophers
                        </h1>
                        <p className="text-xl text-yellow-50 mb-6 max-w-3xl mx-auto">
                            Five philosophers share five forks and need two to eat. Grab left-then-right and the table can freeze for good; number the forks and it never can.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Dijkstra, 1965</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Circular wait</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Lock ordering</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {[['naive', 'Naive: left, then right'], ['ordering', 'Resource ordering: lower fork first']].map(([k, l]) => (
                                    <button key={k} onClick={() => setMode(k)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${mode === k
                                            ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-yellow-500/60'}`}>{l}</button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mb-4">
                                Philosopher <span className="font-mono">i</span> sits between fork <span className="font-mono">i</span> (left) and fork <span className="font-mono">i + 1</span> (right); P5&apos;s right fork is fork 1.
                            </p>

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
                                <button onClick={() => { setPicks(randomPicks()); setPresetName('Random'); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Random schedule
                                </button>
                                <PredictToggle predict={predict} accent="yellow" />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs text-slate-500 mr-1">Schedules:</span>
                                {PRESETS.map(p => (
                                    <button key={p.name} onClick={() => { setPicks(p.picks); setPresetName(p.name); }}
                                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${presetName === p.name ? 'border-yellow-500/70 text-yellow-200 bg-yellow-500/10' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60'}`}>
                                        {p.name}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-yellow-500" />
                            </div>

                            {/* Schedule strip */}
                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs uppercase tracking-wide text-slate-500">Schedule</span>
                                    <span className="text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {step.timeline.map((e, j) => (
                                        <span key={`e${j}`} title={ACTION_LABEL[e.action]}
                                            className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${e.blocked ? 'bg-indigo-500/30 text-indigo-200' : e.action === 'eat' ? 'bg-green-500/30 text-green-200' : 'bg-slate-700 text-slate-200'}`}>
                                            {e.actor}
                                        </span>
                                    ))}
                                    {step.upcoming && (
                                        <span className="h-6 px-2 rounded text-[10px] font-mono font-bold border-2 border-dashed border-yellow-400 text-yellow-300 flex items-center">
                                            next: {P(step.upcoming.actor)} {ACTION_LABEL[step.upcoming.action]}
                                        </span>
                                    )}
                                    {remaining.map((p, j) => (
                                        <span key={`f${j}`} className="w-6 h-6 rounded text-[10px] font-mono flex items-center justify-center border border-slate-700 text-slate-500">{p}</span>
                                    ))}
                                </div>
                            </div>

                            <Table step={step} />

                            <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-400 mt-1">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-500" />thinking</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-400" />holding forks</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500/30 border border-green-400" />eating</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500/30 border border-indigo-300" />waiting (dashed arrow to the fork holder)</span>
                            </div>

                            {step.phase === 'deadlock' && (
                                <div className="mt-4 flex items-center justify-center gap-2 py-3 rounded-lg border bg-red-500/10 border-red-500/40 text-red-200 font-semibold">
                                    <AlertTriangle className="h-5 w-5" />Deadlock — {step.cycle.map(P).join(' → ')} → {P(step.cycle[0])}
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
                            <h3 className="font-bold text-white mb-3">Who Picks What First</h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-slate-500 border-b border-slate-700">
                                        <th className="text-left py-1.5">Phil.</th>
                                        <th className="py-1.5">Forks</th>
                                        <th className="py-1.5">Naive</th>
                                        <th className="py-1.5">Ordered</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ALL.map(i => {
                                        const flips = firstFork(i, 'naive') !== firstFork(i, 'ordering');
                                        return (
                                            <tr key={i} className={`border-b border-slate-800 ${flips ? 'bg-yellow-500/10' : ''}`}>
                                                <td className="py-1.5 font-semibold text-slate-200">{P(i)}</td>
                                                <td className="py-1.5 text-center font-mono text-slate-400">{left(i)}, {right(i)}</td>
                                                <td className="py-1.5 text-center font-mono text-slate-300">{firstFork(i, 'naive')} → {secondFork(i, 'naive')}</td>
                                                <td className={`py-1.5 text-center font-mono ${flips ? 'text-yellow-300 font-bold' : 'text-slate-300'}`}>{firstFork(i, 'ordering')} → {secondFork(i, 'ordering')}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <p className="text-xs text-slate-400 leading-relaxed mt-3">
                                Only P5 changes. That single asymmetry is enough: P5 waits for fork 1 holding nothing, so fork 5 stays free for P4, and the circle never closes.
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

export default DiningPhilosophersPage;
