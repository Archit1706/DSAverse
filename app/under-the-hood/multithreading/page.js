"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw,
    Info, CheckCircle, XCircle, Lock, Unlock, AlertTriangle
} from 'lucide-react';

// ─── Stage metadata ───────────────────────────────────────────────────────────
const STAGES = [
    { id: 1, label: 'Race Condition',     short: 'Race' },
    { id: 2, label: 'Mutex Lock',         short: 'Mutex' },
    { id: 3, label: 'Deadlock',           short: 'Deadlock' },
    { id: 4, label: 'Prevention',         short: 'Fix' },
];

// ─── Thread/lock state constants ─────────────────────────────────────────────
// thread state:  'idle' | 'running' | 'blocked' | 'done' | 'deadlocked'
// lock state:    'free' | 'locked'

// ─── Step generation ──────────────────────────────────────────────────────────
function generateSteps() {
    const S = [];
    const s = (stage, phase, data, explanation) =>
        S.push({ stage, phase, ...data, explanation });

    // ── Stage 1: Race Condition ───────────────────────────────────────────────
    s(1, 'intro', {
        counter: 0,
        t1: { state: 'idle', reg: null, op: null, color: 'blue' },
        t2: { state: 'idle', reg: null, op: null, color: 'green' },
        highlight: null,
        outcome: null,
    }, 'Two threads each increment a shared counter 1 000 times — expected final value: 2 000. The increment operation is NOT atomic: it compiles to three CPU instructions: READ the value into a register → ADD 1 → WRITE back. Any context switch between these three steps corrupts the result.');

    s(1, 'safe_read_t1', {
        counter: 0,
        t1: { state: 'running', reg: 0,    op: 'READ → reg=0',  color: 'blue' },
        t2: { state: 'idle',    reg: null,  op: null,            color: 'green' },
        highlight: 't1',
        outcome: null,
    }, 'Thread 1 reads the counter (value 0) into its CPU register. So far so good — no context switch yet. reg₁ = 0.');

    s(1, 'safe_add_t1', {
        counter: 0,
        t1: { state: 'running', reg: 1,    op: 'ADD  → reg=1',  color: 'blue' },
        t2: { state: 'idle',    reg: null,  op: null,            color: 'green' },
        highlight: 't1',
        outcome: null,
    }, 'Thread 1 adds 1 to its register: reg₁ = 0 + 1 = 1. The shared counter is still 0 — the result lives only in the CPU register, not yet in memory.');

    s(1, 'race_ctx_switch', {
        counter: 0,
        t1: { state: 'idle',    reg: 1,    op: '⚡ context switch!', color: 'blue' },
        t2: { state: 'running', reg: 0,    op: 'READ → reg=0',       color: 'green' },
        highlight: 'switch',
        outcome: null,
    }, '⚡ Context switch! The OS pauses Thread 1 BEFORE it writes. Thread 2 now runs and reads the counter — still 0, because Thread 1\'s result is only in its own register (reg₁ = 1). Thread 2 gets a stale value: reg₂ = 0.');

    s(1, 'race_t2_add', {
        counter: 0,
        t1: { state: 'idle',    reg: 1,    op: 'waiting…',      color: 'blue' },
        t2: { state: 'running', reg: 1,    op: 'ADD  → reg=1',  color: 'green' },
        highlight: 't2',
        outcome: null,
    }, 'Thread 2 adds 1 to its register: reg₂ = 0 + 1 = 1. Writes back: counter = 1. Thread 1 resumes and also writes reg₁ = 1 → counter = 1. Both increments happened, but the counter only went from 0 to 1 — one update is LOST.');

    s(1, 'race_result', {
        counter: 1,
        t1: { state: 'done', reg: 1, op: 'WRITE → counter=1', color: 'blue' },
        t2: { state: 'done', reg: 1, op: 'WRITE → counter=1', color: 'green' },
        highlight: 'corrupt',
        outcome: { expected: 2000, got: '~1 743', label: 'Lost updates!' },
    }, 'Both threads wrote 1 — but we expected 2. Scaled up to 1 000 iterations each, the counter ends up somewhere around 1 743 instead of 2 000. The exact number varies every run depending on OS scheduling. This non-determinism is what makes race conditions so hard to debug.');

    // ── Stage 2: Mutex ────────────────────────────────────────────────────────
    s(2, 'intro', {
        counter: 0,
        lockState: 'free', lockHolder: null,
        t1: { state: 'idle',    reg: null, op: null,          color: 'blue' },
        t2: { state: 'idle',    reg: null, op: null,          color: 'green' },
        highlight: null, outcome: null,
    }, 'A mutex (mutual exclusion lock) wraps the critical section. Only one thread can hold the lock at a time. Any thread that tries to acquire a held lock is put to sleep by the OS — it consumes zero CPU while blocked.');

    s(2, 't1_acquire', {
        counter: 0,
        lockState: 'locked', lockHolder: 'T1',
        t1: { state: 'running', reg: null, op: 'lock.acquire() ✓', color: 'blue' },
        t2: { state: 'idle',    reg: null, op: null,               color: 'green' },
        highlight: 't1',  outcome: null,
    }, 'Thread 1 calls lock.acquire(). The mutex is free, so T1 takes it immediately — the lock is now held by T1. Thread 2 hasn\'t tried yet.');

    s(2, 't1_critical', {
        counter: 0,
        lockState: 'locked', lockHolder: 'T1',
        t1: { state: 'running', reg: 1, op: 'READ(0) → ADD → reg=1', color: 'blue' },
        t2: { state: 'blocked', reg: null, op: 'lock.acquire() … blocked', color: 'green' },
        highlight: 'lock',  outcome: null,
    }, 'Thread 2 tries to acquire the lock while T1 is inside the critical section. The OS detects the lock is taken and blocks T2 — it\'s put to sleep. T1 safely executes READ → ADD → WRITE without any interference.');

    s(2, 't1_release', {
        counter: 1,
        lockState: 'free', lockHolder: null,
        t1: { state: 'done',    reg: 1, op: 'WRITE(1) → lock.release()', color: 'blue' },
        t2: { state: 'blocked', reg: null, op: 'waking up…',             color: 'green' },
        highlight: 't1',  outcome: null,
    }, 'Thread 1 writes 1 to the counter and releases the lock. The OS wakes Thread 2. counter = 1 ✓.');

    s(2, 't2_critical', {
        counter: 2,
        lockState: 'free', lockHolder: null,
        t1: { state: 'done', reg: 1, op: '✓ done',                       color: 'blue' },
        t2: { state: 'done', reg: 2, op: 'lock → READ(1) → ADD → WRITE(2) → release', color: 'green' },
        highlight: 't2',
        outcome: { expected: 2000, got: '2 000', label: 'Correct!' },
    }, 'Thread 2 acquires the lock, reads counter=1, adds 1, writes 2, releases. counter = 2 ✓. The mutex serialises access to the critical section — we trade some throughput for correctness. Final result: always 2 000.');

    // ── Stage 3: Deadlock ─────────────────────────────────────────────────────
    s(3, 'intro', {
        lockA: 'free', lockB: 'free', holderA: null, holderB: null,
        t1: { state: 'idle', wantA: false, wantB: false, holdsA: false, holdsB: false, color: 'blue' },
        t2: { state: 'idle', wantA: false, wantB: false, holdsA: false, holdsB: false, color: 'green' },
        phase: 'setup', cycleHighlight: false,
    }, 'Deadlock requires 4 conditions (Coffman, 1971): (1) Mutual exclusion — only one thread per lock. (2) Hold and wait — a thread holds one lock while waiting for another. (3) No preemption — locks cannot be forcibly taken. (4) Circular wait — T1 waits for T2, T2 waits for T1. We\'ll watch all four arise simultaneously.');

    s(3, 't1_takes_a', {
        lockA: 'locked', lockB: 'free', holderA: 'T1', holderB: null,
        t1: { state: 'running', wantA: false, wantB: false, holdsA: true,  holdsB: false, color: 'blue',  op: 'acquire(lock_A) ✓' },
        t2: { state: 'idle',    wantA: false, wantB: false, holdsA: false, holdsB: false, color: 'green', op: null },
        phase: 'acquiring', cycleHighlight: false,
    }, 'Thread 1 acquires lock_A. No contention — T1 gets it immediately. T1 now holds lock_A and will next try to acquire lock_B.');

    s(3, 't2_takes_b', {
        lockA: 'locked', lockB: 'locked', holderA: 'T1', holderB: 'T2',
        t1: { state: 'running', wantA: false, wantB: false, holdsA: true,  holdsB: false, color: 'blue',  op: 'holds lock_A, wants lock_B…' },
        t2: { state: 'running', wantA: false, wantB: false, holdsA: false, holdsB: true,  color: 'green', op: 'acquire(lock_B) ✓' },
        phase: 'acquiring', cycleHighlight: false,
    }, 'Thread 2 acquires lock_B simultaneously. No contention — T2 gets it. Now both threads each hold one lock and both want the other. The stage is set for circular wait.');

    s(3, 'circular_wait', {
        lockA: 'locked', lockB: 'locked', holderA: 'T1', holderB: 'T2',
        t1: { state: 'blocked',   wantA: false, wantB: true,  holdsA: true,  holdsB: false, color: 'blue',  op: 'acquire(lock_B) … BLOCKED' },
        t2: { state: 'blocked',   wantA: true,  wantB: false, holdsA: false, holdsB: true,  color: 'green', op: 'acquire(lock_A) … BLOCKED' },
        phase: 'deadlock', cycleHighlight: true,
    }, 'T1 tries to acquire lock_B — blocked (T2 holds it). T2 tries to acquire lock_A — blocked (T1 holds it). Neither will ever release their held lock, because release happens AFTER acquiring the second lock. Circular wait → DEADLOCK. Both threads sleep forever.');

    s(3, 'deadlock_state', {
        lockA: 'locked', lockB: 'locked', holderA: 'T1', holderB: 'T2',
        t1: { state: 'deadlocked', wantA: false, wantB: true, holdsA: true,  holdsB: false, color: 'blue',  op: '💀 DEADLOCKED' },
        t2: { state: 'deadlocked', wantA: true, wantB: false,  holdsA: false, holdsB: true,  color: 'green', op: '💀 DEADLOCKED' },
        phase: 'deadlock', cycleHighlight: true,
    }, 'The program is frozen. No exception is raised, no error is logged — threads just sleep indefinitely. The only way out is an external timeout, a watchdog process, or killing the program. Real-world examples: database row locks, OS resource allocation, Java synchronized blocks acquired in different orders.');

    // ── Stage 4: Deadlock Prevention (lock ordering) ──────────────────────────
    s(4, 'intro', {
        lockA: 'free', lockB: 'free', holderA: null, holderB: null,
        t1: { state: 'idle', holdsA: false, holdsB: false, color: 'blue',  op: null },
        t2: { state: 'idle', holdsA: false, holdsB: false, color: 'green', op: null },
        rule: 'ALWAYS acquire locks in the same global order: lock_A before lock_B.',
        phase: 'setup',
    }, 'The simplest fix: enforce a global lock ordering. Every thread must always acquire lock_A before lock_B — no exceptions. This breaks circular wait (Coffman condition 4) — if both threads compete for lock_A first, one will win and proceed; the other blocks but will eventually get its turn.');

    s(4, 't1_takes_a', {
        lockA: 'locked', lockB: 'free', holderA: 'T1', holderB: null,
        t1: { state: 'running', holdsA: true,  holdsB: false, color: 'blue',  op: 'acquire(lock_A) ✓' },
        t2: { state: 'idle',    holdsA: false, holdsB: false, color: 'green', op: 'about to acquire lock_A…' },
        rule: 'Rule: always lock_A first, then lock_B.',
        phase: 'acquiring',
    }, 'Thread 1 acquires lock_A first (following the rule). Thread 2 is about to try the same.');

    s(4, 't2_blocked_on_a', {
        lockA: 'locked', lockB: 'free', holderA: 'T1', holderB: null,
        t1: { state: 'running', holdsA: true,  holdsB: false, color: 'blue',  op: 'acquires lock_B next…' },
        t2: { state: 'blocked', holdsA: false, holdsB: false, color: 'green', op: 'acquire(lock_A) … BLOCKED' },
        rule: 'T2 cannot hold lock_B while waiting for lock_A — no circular hold!',
        phase: 'progress',
    }, 'Thread 2 tries lock_A and blocks — T1 holds it. Crucially: T2 does NOT hold lock_B yet (it follows the ordering rule). There is NO circular wait. T1 is free to proceed and acquire lock_B without anyone blocking it.');

    s(4, 't1_takes_b', {
        lockA: 'locked', lockB: 'locked', holderA: 'T1', holderB: 'T1',
        t1: { state: 'running', holdsA: true,  holdsB: true,  color: 'blue',  op: 'acquire(lock_B) ✓ → critical section' },
        t2: { state: 'blocked', holdsA: false, holdsB: false, color: 'green', op: 'still waiting for lock_A…' },
        rule: 'T1 holds both locks, T2 holds nothing — no circular dependency.',
        phase: 'progress',
    }, 'Thread 1 acquires lock_B — no one is blocking it. T1 now holds both locks and executes its critical section. Thread 2 is patiently waiting for lock_A. There is no circular wait: T1 holds resources, T2 holds nothing.');

    s(4, 'resolved', {
        lockA: 'free', lockB: 'free', holderA: null, holderB: null,
        t1: { state: 'done', holdsA: false, holdsB: false, color: 'blue',  op: '✓ released both locks' },
        t2: { state: 'done', holdsA: false, holdsB: false, color: 'green', op: '✓ acquired A→B, executed, released' },
        rule: 'Lock ordering eliminates circular wait — deadlock impossible.',
        phase: 'done',
    }, 'Thread 1 finishes and releases both locks. Thread 2 wakes up, acquires lock_A, then lock_B (in order), executes, releases both. No deadlock — ever. Other prevention strategies: lock timeouts (tryLock), deadlock detection algorithms, or restructuring code to need only one lock at a time.');

    return S;
}

const STEPS = generateSteps();

// ─── Quiz ─────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'Two threads each run counter++ 1 000 times. Without synchronization, what is the most likely final value?',
        options: [
            'Somewhere between 1 000 and 2 000 — non-deterministic',
            'Exactly 2 000 — the result is always correct',
            'Always 1 000 — one thread\'s work is always lost',
            'It depends on the programming language',
        ],
        correct: 0,
        explanation: 'counter++ is not atomic — it compiles to READ / ADD / WRITE. Context switches between these steps cause lost updates. The result is non-deterministic, typically between 1 000 and 2 000, varying every run.',
    },
    {
        question: 'Which of the four Coffman conditions must be broken to prevent deadlock?',
        options: [
            'Break circular wait — acquire all locks in a consistent global order',
            'Break mutual exclusion — allow multiple threads per lock',
            'Break hold-and-wait — threads must acquire all locks at startup',
            'Any one of the four conditions is sufficient',
        ],
        correct: 3,
        explanation: 'Breaking ANY one of the four conditions prevents deadlock. In practice: breaking circular wait (lock ordering) is simplest. Breaking hold-and-wait (acquire all at once) is sometimes used in databases. Breaking mutual exclusion is only possible for read-only resources.',
    },
    {
        question: 'Thread 1: lock(A) → lock(B). Thread 2: lock(B) → lock(A). What is the risk?',
        options: [
            'Deadlock — if each thread acquires its first lock simultaneously',
            'Race condition — both threads can enter the critical section at once',
            'Starvation — Thread 2 will never get CPU time',
            'No risk — mutexes prevent all concurrency bugs automatically',
        ],
        correct: 0,
        explanation: 'Different lock-acquisition orders create a circular dependency. If T1 holds A and T2 holds B simultaneously, each waits for the other\'s lock forever — textbook deadlock. Fix: both threads must acquire A before B.',
    },
];

// ─── Helper: thread state pill ────────────────────────────────────────────────
function StatePill({ state }) {
    const map = {
        idle:        'bg-slate-700 text-slate-400',
        running:     'bg-blue-500/20 text-blue-300 border border-blue-500/40',
        blocked:     'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
        done:        'bg-green-500/20 text-green-400 border border-green-500/40',
        deadlocked:  'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse',
    };
    const label = { idle: 'IDLE', running: 'RUNNING', blocked: 'BLOCKED', done: 'DONE', deadlocked: 'DEADLOCKED' };
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[state] || map.idle}`}>
            {label[state] || state.toUpperCase()}
        </span>
    );
}

// ─── Scene: Race Condition ────────────────────────────────────────────────────
function SceneRace({ step }) {
    const { counter, t1, t2, highlight, outcome } = step;

    const ThreadCard = ({ t, label }) => (
        <div className={`flex-1 rounded-xl border p-4 transition-all ${
            t.state === 'running'    ? (t.color === 'blue' ? 'border-blue-500/50 bg-blue-500/8' : 'border-green-500/50 bg-green-500/8') :
            t.state === 'done'       ? 'border-slate-700 bg-slate-800/40 opacity-70' :
                                       'border-slate-700 bg-slate-800/40'
        }`}>
            <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-bold ${t.color === 'blue' ? 'text-blue-300' : 'text-green-300'}`}>{label}</span>
                <StatePill state={t.state} />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">CPU register</span>
                    <code className={`text-sm font-bold px-2 py-0.5 rounded ${
                        t.reg !== null ? (t.color === 'blue' ? 'bg-blue-500/20 text-blue-200' : 'bg-green-500/20 text-green-200') : 'bg-slate-700 text-slate-500'
                    }`}>{t.reg !== null ? t.reg : '—'}</code>
                </div>
                {t.op && (
                    <div className={`text-xs px-2 py-1.5 rounded font-mono ${
                        highlight === 'switch' ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30' :
                        highlight === 'corrupt' ? 'bg-red-500/15 text-red-300' :
                        t.color === 'blue' ? 'bg-blue-500/10 text-blue-200' : 'bg-green-500/10 text-green-200'
                    }`}>{t.op}</div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-5 h-full">
            {/* Shared memory box */}
            <div className={`rounded-xl border-2 p-4 text-center transition-all ${
                highlight === 'corrupt'
                    ? 'border-red-500/60 bg-red-500/10'
                    : highlight === 'switch'
                    ? 'border-yellow-500/40 bg-yellow-500/5'
                    : 'border-slate-600 bg-slate-800/50'
            }`}>
                <div className="text-slate-400 text-xs mb-1 font-medium uppercase tracking-wide">Shared Memory</div>
                <div className="text-slate-500 text-xs mb-2 font-mono">counter (at address 0x4A2F)</div>
                <div className={`text-4xl font-bold transition-all ${
                    highlight === 'corrupt' ? 'text-red-400' :
                    highlight === 'switch'  ? 'text-yellow-300' :
                                             'text-white'
                }`}>{counter}</div>
                {highlight === 'corrupt' && (
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-red-400 text-xs font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Write overwritten — update lost!
                    </div>
                )}
            </div>

            {/* Threads */}
            <div className="flex gap-4 flex-1">
                <ThreadCard t={t1} label="Thread 1" />

                {/* Context switch indicator */}
                <div className="flex flex-col items-center justify-center gap-1 w-8 flex-shrink-0">
                    {highlight === 'switch' ? (
                        <>
                            <div className="w-0.5 flex-1 bg-yellow-500/60" />
                            <div className="bg-yellow-500/20 border border-yellow-500/40 rounded px-1 py-1">
                                <span className="text-yellow-300 text-[9px] font-bold" style={{ writingMode: 'vertical-rl' }}>CTX</span>
                            </div>
                            <div className="w-0.5 flex-1 bg-yellow-500/60" />
                        </>
                    ) : (
                        <div className="w-0.5 flex-1 bg-slate-700" />
                    )}
                </div>

                <ThreadCard t={t2} label="Thread 2" />
            </div>

            {/* Outcome */}
            {outcome && (
                <div className={`rounded-xl p-4 border ${
                    outcome.label === 'Correct!'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                }`}>
                    <div className="flex items-center justify-between text-sm">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">Expected:</span>
                                <span className="text-green-400 font-bold">{outcome.expected}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">Got:</span>
                                <span className={`font-bold text-lg ${outcome.label === 'Correct!' ? 'text-green-400' : 'text-red-400'}`}>{outcome.got}</span>
                            </div>
                        </div>
                        <div className={`text-lg font-bold ${outcome.label === 'Correct!' ? 'text-green-400' : 'text-red-400'}`}>
                            {outcome.label}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Scene: Mutex ─────────────────────────────────────────────────────────────
function SceneMutex({ step }) {
    const { counter, lockState, lockHolder, t1, t2, highlight, outcome } = step;

    const ThreadCard = ({ t, label }) => (
        <div className={`flex-1 rounded-xl border p-4 transition-all ${
            t.state === 'running'  ? (t.color === 'blue' ? 'border-blue-500/50 bg-blue-500/8' : 'border-green-500/50 bg-green-500/8') :
            t.state === 'blocked'  ? 'border-yellow-500/40 bg-yellow-500/5' :
            t.state === 'done'     ? 'border-slate-700/50 bg-slate-800/30 opacity-60' :
                                     'border-slate-700 bg-slate-800/40'
        }`}>
            <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-bold ${t.color === 'blue' ? 'text-blue-300' : 'text-green-300'}`}>{label}</span>
                <StatePill state={t.state} />
            </div>
            {t.reg !== null && (
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-xs">register</span>
                    <code className={`text-sm font-bold px-2 py-0.5 rounded ${
                        t.color === 'blue' ? 'bg-blue-500/20 text-blue-200' : 'bg-green-500/20 text-green-200'
                    }`}>{t.reg}</code>
                </div>
            )}
            {t.op && (
                <div className={`text-xs px-2 py-1.5 rounded font-mono ${
                    t.state === 'blocked' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' :
                    t.state === 'done'    ? 'bg-green-500/10 text-green-300' :
                    t.color === 'blue'    ? 'bg-blue-500/10 text-blue-200' : 'bg-green-500/10 text-green-200'
                }`}>{t.op}</div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Counter + Lock */}
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4 text-center">
                    <div className="text-slate-400 text-xs mb-1 uppercase tracking-wide">counter</div>
                    <div className="text-4xl font-bold text-white">{counter}</div>
                </div>

                <div className={`rounded-xl border-2 p-4 text-center transition-all ${
                    lockState === 'free'
                        ? 'border-green-500/50 bg-green-500/8'
                        : lockHolder === 'T1'
                        ? 'border-blue-500/50 bg-blue-500/8'
                        : 'border-green-500/50 bg-green-500/8'
                }`}>
                    <div className="text-slate-400 text-xs mb-1 uppercase tracking-wide">Mutex Lock</div>
                    <div className="flex items-center justify-center gap-2">
                        {lockState === 'free'
                            ? <Unlock className="h-8 w-8 text-green-400" />
                            : <Lock    className="h-8 w-8 text-blue-400" />
                        }
                    </div>
                    <div className={`text-xs font-bold mt-1 ${lockState === 'free' ? 'text-green-400' : 'text-blue-300'}`}>
                        {lockState === 'free' ? 'FREE' : `HELD BY ${lockHolder}`}
                    </div>
                </div>
            </div>

            {/* Threads */}
            <div className="flex gap-4 flex-1">
                <ThreadCard t={t1} label="Thread 1" />
                <div className="flex items-center justify-center w-6 flex-shrink-0">
                    <div className="w-0.5 h-full bg-slate-700" />
                </div>
                <ThreadCard t={t2} label="Thread 2" />
            </div>

            {/* Critical section highlight */}
            {highlight === 'lock' && (
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                    <Lock className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                    <p className="text-blue-300 text-xs">T1 is inside the critical section. T2 is sleeping — zero CPU wasted while blocked.</p>
                </div>
            )}

            {outcome && (
                <div className={`rounded-xl p-4 border ${
                    outcome.label === 'Correct!'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                }`}>
                    <div className="flex items-center justify-between text-sm">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">Expected:</span>
                                <span className="text-green-400 font-bold">{outcome.expected}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">Got:</span>
                                <span className="font-bold text-lg text-green-400">{outcome.got}</span>
                            </div>
                        </div>
                        <div className="text-green-400 text-lg font-bold">{outcome.label}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Scene: Deadlock ──────────────────────────────────────────────────────────
function SceneDeadlock({ step }) {
    const { lockA, lockB, holderA, holderB, t1, t2, cycleHighlight, rule, phase } = step;

    const isDeadlock = t1.state === 'deadlocked' || t1.state === 'blocked';

    const LockBox = ({ label, state, holder, wantedBy }) => (
        <div className={`rounded-xl border-2 p-4 text-center transition-all ${
            state === 'free' ? 'border-green-500/40 bg-green-500/8' :
            holder === 'T1'  ? 'border-blue-500/50 bg-blue-500/8' :
                               'border-green-500/50 bg-green-500/8'
        }`}>
            <div className="text-slate-400 text-xs mb-2 uppercase tracking-wide font-medium">{label}</div>
            <div className="flex justify-center mb-1">
                {state === 'free'
                    ? <Unlock className="h-7 w-7 text-green-400" />
                    : <Lock   className="h-7 w-7 text-yellow-400" />
                }
            </div>
            <div className={`text-xs font-bold ${state === 'free' ? 'text-green-400' : 'text-yellow-300'}`}>
                {state === 'free' ? 'FREE' : `HELD BY ${holder}`}
            </div>
            {wantedBy && state === 'locked' && (
                <div className={`mt-1.5 text-[10px] font-semibold ${cycleHighlight ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>
                    ← wanted by {wantedBy}
                </div>
            )}
        </div>
    );

    const ThreadRow = ({ t, label }) => (
        <div className={`rounded-xl border p-4 transition-all ${
            t.state === 'deadlocked' ? 'border-red-500/50 bg-red-500/8' :
            t.state === 'blocked'    ? 'border-yellow-500/40 bg-yellow-500/5' :
            t.state === 'running'    ? (t.color === 'blue' ? 'border-blue-500/40 bg-blue-500/8' : 'border-green-500/40 bg-green-500/8') :
            t.state === 'done'       ? 'border-slate-700/50 bg-slate-800/30' :
                                       'border-slate-700 bg-slate-800/40'
        }`}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-sm font-bold flex-shrink-0 ${t.color === 'blue' ? 'text-blue-300' : 'text-green-300'}`}>{label}</span>
                    <StatePill state={t.state} />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                    <span className={`px-2 py-0.5 rounded font-mono ${
                        (phase === 'acquiring' || phase === 'deadlock' || phase === 'progress' || phase === 'done')
                            ? (t.holdsA ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-500')
                            : 'bg-slate-700 text-slate-500'
                    }`}>lock_A {t.holdsA ? '✓' : '○'}</span>
                    <span className={`px-2 py-0.5 rounded font-mono ${
                        (phase === 'acquiring' || phase === 'deadlock' || phase === 'progress' || phase === 'done')
                            ? (t.holdsB ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-500')
                            : 'bg-slate-700 text-slate-500'
                    }`}>lock_B {t.holdsB ? '✓' : '○'}</span>
                </div>
                {t.op && (
                    <code className={`text-xs flex-shrink-0 px-2 py-1 rounded ${
                        t.state === 'deadlocked' ? 'bg-red-500/10 text-red-300' :
                        t.state === 'blocked'    ? 'bg-yellow-500/10 text-yellow-300' :
                        t.state === 'done'       ? 'bg-green-500/10 text-green-300' :
                        t.color === 'blue'       ? 'bg-blue-500/10 text-blue-200' : 'bg-green-500/10 text-green-200'
                    }`}>{t.op}</code>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-5 h-full">
            {/* Locks */}
            <div className="grid grid-cols-2 gap-4">
                <LockBox label="lock_A" state={lockA} holder={holderA}
                    wantedBy={t2.wantA ? 'T2' : null} />
                <LockBox label="lock_B" state={lockB} holder={holderB}
                    wantedBy={t1.wantB ? 'T1' : null} />
            </div>

            {/* Circular wait diagram */}
            {cycleHighlight && (
                <div className={`rounded-xl border p-3 text-center transition-all ${
                    t1.state === 'deadlocked'
                        ? 'border-red-500/50 bg-red-500/8'
                        : 'border-yellow-500/40 bg-yellow-500/5'
                }`}>
                    <div className="flex items-center justify-center gap-2 text-sm font-mono">
                        <span className="text-blue-300">T1 holds A</span>
                        <span className="text-slate-500">→ wants B →</span>
                        <span className={t1.state === 'deadlocked' ? 'text-red-400 font-bold' : 'text-yellow-300'}>
                            {t1.state === 'deadlocked' ? '💀 DEADLOCK' : 'CIRCULAR WAIT'}
                        </span>
                        <span className="text-slate-500">← holds B ←</span>
                        <span className="text-green-300">T2 holds B</span>
                    </div>
                    {t1.state === 'deadlocked' && (
                        <p className="text-red-400/70 text-xs mt-1">Program frozen — both threads sleep forever</p>
                    )}
                </div>
            )}

            {/* Thread rows */}
            <div className="space-y-3 flex-1">
                <ThreadRow t={t1} label="Thread 1" />
                <ThreadRow t={t2} label="Thread 2" />
            </div>

            {rule && (
                <div className="bg-zinc-500/10 border border-zinc-500/30 rounded-lg px-3 py-2">
                    <p className="text-zinc-300 text-xs font-medium">{rule}</p>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MultithreadingPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = STEPS[currentStep];

    useEffect(() => {
        if (!isPlaying) return;
        if (currentStep >= STEPS.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, speed]);

    const reset    = () => { setCurrentStep(0); setIsPlaying(false); };
    const stepBack = () => { setCurrentStep(s => Math.max(0, s - 1)); setIsPlaying(false); };
    const stepFwd  = () => { setCurrentStep(s => Math.min(STEPS.length - 1, s + 1)); setIsPlaying(false); };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === QUIZ[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= QUIZ.length)
            setQuizState(s => ({ ...s, complete: true }));
        else
            setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const firstStepOfStage = (id) => STEPS.findIndex(s => s.stage === id);
    const stepsInStage     = (id) => STEPS.filter(s => s.stage === id);

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-600 to-slate-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/under-the-hood" className="flex items-center text-white hover:text-zinc-300 transition-colors mb-6 w-fit text-sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />Back to Under the Hood
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Race Conditions, Mutex &amp; Deadlock</h1>
                    <p className="text-zinc-200 max-w-2xl text-sm">
                        Why counter++ isn't atomic, how a mutex prevents data corruption,
                        what creates a deadlock, and how lock ordering breaks the cycle.
                    </p>
                </div>
            </div>

            {/* Stage tabs */}
            <div className="bg-slate-900/80 border-b border-slate-700/50 sticky top-16 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-1 py-2 overflow-x-auto">
                        {STAGES.map(st => {
                            const active = step.stage === st.id;
                            const done   = step.stage > st.id;
                            return (
                                <button
                                    key={st.id}
                                    onClick={() => { setCurrentStep(firstStepOfStage(st.id)); setIsPlaying(false); }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                                        active ? 'bg-zinc-600 text-white' :
                                        done   ? 'text-zinc-400 hover:text-zinc-200' :
                                                 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                        active ? 'bg-white text-zinc-700' :
                                        done   ? 'bg-zinc-500/40 text-zinc-300' :
                                                 'bg-slate-700 text-slate-500'
                                    }`}>{st.id}</span>
                                    <span className="hidden sm:inline">{st.label}</span>
                                    <span className="sm:hidden">{st.short}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Visualization panel */}
                    <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl border border-slate-700/50 p-6 min-h-[560px] flex flex-col">
                        <div className="flex items-center justify-between mb-5">
                            <span className="text-xs bg-zinc-600/40 text-zinc-300 px-2.5 py-1 rounded-md font-medium">
                                Stage {step.stage} — {STAGES[step.stage - 1].label}
                            </span>
                            <span className="text-slate-500 text-xs">{currentStep + 1} / {STEPS.length}</span>
                        </div>

                        <div className="flex-1">
                            {step.stage === 1 && <SceneRace  step={step} />}
                            {step.stage === 2 && <SceneMutex step={step} />}
                            {(step.stage === 3 || step.stage === 4) && <SceneDeadlock step={step} />}
                        </div>

                        {/* Controls */}
                        <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <button onClick={reset} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button onClick={stepBack} disabled={currentStep === 0} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-40">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => setIsPlaying(p => !p)} className="px-5 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white flex items-center gap-2 font-medium text-sm transition-colors">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={stepFwd} disabled={currentStep === STEPS.length - 1} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-40">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex-1 max-w-[180px]">
                                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-zinc-500 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                <span>Fast</span>
                                <input type="range" min="300" max="2500" value={speed} onChange={e => setSpeed(+e.target.value)}
                                    className="w-20 accent-zinc-500" />
                                <span>Slow</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="flex flex-col gap-4">
                        {/* Explanation */}
                        <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                                <p className="text-zinc-300 text-sm leading-relaxed">{step.explanation}</p>
                            </div>
                        </div>

                        {/* Stage progress */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <div className="text-slate-400 text-xs font-medium mb-3">Progress</div>
                            <div className="space-y-2.5">
                                {STAGES.map(st => {
                                    const stSteps  = stepsInStage(st.id);
                                    const firstIdx = firstStepOfStage(st.id);
                                    const stepIdx  = currentStep - firstIdx;
                                    const isDone   = step.stage > st.id;
                                    const isActive = step.stage === st.id;
                                    return (
                                        <div key={st.id} className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                                isDone   ? 'bg-green-500 text-white' :
                                                isActive ? 'bg-zinc-500 text-white' :
                                                           'bg-slate-700 text-slate-500'
                                            }`}>
                                                {isDone ? '✓' : st.id}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-xs font-medium truncate ${
                                                    isActive ? 'text-white' : isDone ? 'text-slate-400' : 'text-slate-600'
                                                }`}>{st.label}</div>
                                                {isActive && (
                                                    <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-zinc-500 rounded-full transition-all"
                                                            style={{ width: `${((stepIdx + 1) / stSteps.length) * 100}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Coffman conditions reference */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <div className="text-slate-400 text-xs font-medium mb-3">Coffman Conditions (all 4 needed for deadlock)</div>
                            <div className="space-y-2">
                                {[
                                    { n: 1, label: 'Mutual exclusion',  desc: 'Only one thread per resource' },
                                    { n: 2, label: 'Hold and wait',     desc: 'Holds one lock, waits for another' },
                                    { n: 3, label: 'No preemption',     desc: 'Locks can\'t be forcibly taken' },
                                    { n: 4, label: 'Circular wait',     desc: 'T1 waits for T2, T2 waits for T1' },
                                ].map(c => (
                                    <div key={c.n} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg transition-all ${
                                        step.stage === 3 && step.phase === 'deadlock' ? 'bg-red-500/8 border border-red-500/20' : ''
                                    }`}>
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                                            step.stage === 3 && step.phase === 'deadlock' ? 'bg-red-500 text-white' :
                                            step.stage === 4 && c.n === 4                 ? 'bg-green-500/20 text-green-400 line-through' :
                                                                                            'bg-slate-700 text-slate-400'
                                        }`}>{c.n}</span>
                                        <div>
                                            <div className={`text-xs font-medium ${
                                                step.stage === 4 && c.n === 4 ? 'text-green-400 line-through' : 'text-slate-300'
                                            }`}>{c.label}</div>
                                            <div className="text-slate-500 text-[10px]">{c.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <div className="text-slate-300 text-sm font-semibold mb-4">Active Recall Quiz</div>

                            {quizState.complete ? (
                                <div className="text-center py-4">
                                    <div className={`text-3xl font-bold mb-2 ${
                                        quizState.score === QUIZ.length ? 'text-green-400' :
                                        quizState.score >= 2           ? 'text-yellow-400' : 'text-red-400'
                                    }`}>{quizState.score}/{QUIZ.length}</div>
                                    <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                                        {quizState.score === QUIZ.length
                                            ? 'Nailed it — concurrency bugs don\'t stand a chance.'
                                            : quizState.score >= 2
                                            ? 'Good grasp. Review the Coffman conditions once more.'
                                            : 'Revisit the deadlock and race condition stages.'}
                                    </p>
                                    <button
                                        onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                                        className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded-lg text-sm transition-colors"
                                    >Retake</button>
                                </div>
                            ) : (
                                <>
                                    <div className="text-slate-500 text-xs mb-2">Q{quizState.current + 1} of {QUIZ.length}</div>
                                    <p className="text-slate-200 text-sm mb-3 leading-relaxed">{QUIZ[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {QUIZ[quizState.current].options.map((opt, i) => {
                                            const answered = quizState.answered;
                                            const correct  = i === QUIZ[quizState.current].correct;
                                            const selected = i === quizState.selected;
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => handleQuizAnswer(i)}
                                                    disabled={answered}
                                                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                                                        !answered             ? 'border-slate-600 text-slate-300 hover:border-zinc-500 hover:text-white' :
                                                        correct               ? 'border-green-500 bg-green-500/10 text-green-300' :
                                                        selected && !correct  ? 'border-red-500 bg-red-500/10 text-red-300' :
                                                                                'border-slate-700 text-slate-500'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        {answered && correct            && <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                                                        {answered && selected && !correct && <XCircle   className="h-3.5 w-3.5 flex-shrink-0" />}
                                                        {opt}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-slate-400 text-xs mb-3 leading-relaxed">
                                                {QUIZ[quizState.current].explanation}
                                            </p>
                                            <button onClick={nextQuestion}
                                                className="w-full py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded-lg text-sm transition-colors">
                                                {quizState.current + 1 < QUIZ.length ? 'Next Question →' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
