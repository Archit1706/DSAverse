"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    FileCode, Layers, Shield, GitFork, Users, RefreshCw, Scale, CheckCircle,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Program',    icon: FileCode    },
    { id: 2, label: 'Anatomy',    icon: Layers      },
    { id: 3, label: 'Isolation',  icon: Shield      },
    { id: 4, label: 'fork() & CoW',icon: GitFork     },
    { id: 5, label: 'Threads',    icon: Users       },
    { id: 6, label: 'Switching',  icon: RefreshCw   },
    { id: 7, label: 'Trade-off',  icon: Scale       },
    { id: 8, label: 'Which?',     icon: CheckCircle },
];

const THREAD_COLORS = ['#f97316', '#22d3ee', '#a855f7'];

// ── Address-space panel geometry ────────────────────────────────────────────────
// segment rows (relative y within panel), top = high address
const SEG_ROWS = [
    { id: 'stack', label: 'Stack', y: 52,  h: 74 },
    { id: 'heap',  label: 'Heap',  y: 150, h: 52 },
    { id: 'data',  label: 'Data',  y: 208, h: 40 },
    { id: 'code',  label: 'Code',  y: 254, h: 40 },
];

function Panel({ px, title, titleColor, step, isChild }) {
    const shared = step.threads > 0;
    const segStyle = (id) => {
        const hot = step.seg === id;
        if (id === 'stack') return { fill: hot ? '#3f3f46' : '#1e293b', stroke: hot ? '#e4e4e7' : '#475569', text: '#cbd5e1' };
        // heap/data/code: shared (green) in thread mode
        if (shared) return { fill: '#0f2a1a', stroke: '#22c55e', text: '#bbf7d0' };
        const hotc = hot ? { fill: '#3f3f46', stroke: '#e4e4e7' } : null;
        const base = { heap: { fill: '#2a220d', stroke: '#a16207' }, data: { fill: '#1e293b', stroke: '#475569' }, code: { fill: '#12203a', stroke: '#3b82f6' } }[id];
        return { ...(hotc || base), text: '#cbd5e1' };
    };

    return (
        <g>
            <rect x={px} y="36" width="200" height="286" rx="10" fill="#0b1220" stroke="#334155" strokeWidth="1.4" />
            <text x={px + 100} y="28" textAnchor="middle" fontSize="11" fontWeight="bold" fill={titleColor} fontFamily="monospace">{title}</text>

            {SEG_ROWS.map(seg => {
                // multi-thread: split stack row into per-thread columns
                if (seg.id === 'stack' && step.threads > 1) {
                    const n = step.threads;
                    const gap = 6, innerX = px + 10, innerW = 180;
                    const cw = (innerW - gap * (n - 1)) / n;
                    return (
                        <g key={seg.id}>
                            {Array.from({ length: n }).map((_, i) => (
                                <g key={i}>
                                    <rect x={innerX + i * (cw + gap)} y={seg.y} width={cw} height={seg.h} rx="5"
                                        fill="#1e293b" stroke={THREAD_COLORS[i]} strokeWidth="1.8" className="pt-seg" />
                                    <text x={innerX + i * (cw + gap) + cw / 2} y={seg.y + seg.h / 2 - 3} textAnchor="middle" fontSize="9" fill={THREAD_COLORS[i]} fontFamily="monospace">stack</text>
                                    <text x={innerX + i * (cw + gap) + cw / 2} y={seg.y + seg.h / 2 + 10} textAnchor="middle" fontSize="9" fill={THREAD_COLORS[i]} fontFamily="monospace">T{i + 1}</text>
                                </g>
                            ))}
                            <text x={px + 100} y={seg.y - 4} textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="monospace">private per thread</text>
                        </g>
                    );
                }
                const st = segStyle(seg.id);
                const isSharedSeg = shared && seg.id !== 'stack';
                const raceHeap = step.race && seg.id === 'heap';
                return (
                    <g key={seg.id} className="pt-seg">
                        <rect x={px + 10} y={seg.y} width="180" height={seg.h} rx="5"
                            fill={raceHeap ? '#2a1207' : st.fill} stroke={raceHeap ? '#f59e0b' : st.stroke} strokeWidth={step.seg === seg.id || raceHeap ? 2 : 1.4} />
                        <text x={px + 100} y={seg.y + seg.h / 2 - 2} textAnchor="middle" fontSize="11" fill={st.text} fontFamily="monospace">{seg.label}</text>
                        {seg.id === 'heap' && !raceHeap && <text x={px + 100} y={seg.y + seg.h / 2 + 13} textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="monospace">new / malloc ↑</text>}
                        {isSharedSeg && <text x={px + 182} y={seg.y + 12} textAnchor="end" fontSize="8" fill="#22c55e" fontFamily="monospace">shared</text>}
                        {raceHeap && (
                            <>
                                <text x={px + 100} y={seg.y + seg.h / 2 + 13} textAnchor="middle" fontSize="9" fill="#fbbf24" fontFamily="monospace">counter (shared!)</text>
                            </>
                        )}
                    </g>
                );
            })}
        </g>
    );
}

// ── Persistent process/memory stage (acts 1–5) ──────────────────────────────────
function ProcessStage({ step }) {
    return (
        <svg viewBox="0 0 760 380" width="100%" className="max-h-[400px] select-none">
            <style>{`
                .pt-seg { transition: fill .45s ease, stroke .45s ease; }
                .pt-fade { transition: opacity .5s ease; }
                @keyframes ptdash { to { stroke-dashoffset: -20; } }
                .pt-flow { stroke-dasharray: 5 4; animation: ptdash .6s linear infinite; }
                @keyframes ptpulse { 0%,100%{ opacity:.5 } 50%{ opacity:1 } }
                .pt-pulse { animation: ptpulse 1.1s ease-in-out infinite; }
            `}</style>
            <defs>
                <marker id="ptah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* Disk program (act 1.1) */}
            <g className="pt-fade" style={{ opacity: step.diskFile ? 1 : 0 }}>
                <rect x="40" y="150" width="120" height="70" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1.4" />
                <text x="100" y="180" textAnchor="middle" fontSize="12" fill="#cbd5e1" fontFamily="monospace">a.out</text>
                <text x="100" y="198" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">program on disk</text>
                <text x="100" y="240" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">(passive bytes)</text>
            </g>

            {/* CPU core (acts 2+) */}
            <g className="pt-fade" style={{ opacity: step.panelA && !step.diskFile ? 1 : 0 }}>
                <rect x="24" y="150" width="120" height="90" rx="10" fill="#12203a" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="84" y="145" textAnchor="middle" fontSize="10" fill="#60a5fa" fontFamily="monospace">CPU core</text>
                <text x="84" y="188" textAnchor="middle" fontSize="11" fill="#dbeafe" fontFamily="monospace">running:</text>
                <text x="84" y="208" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#93c5fd" fontFamily="monospace">{step.running || '—'}</text>
                <text x="84" y="228" textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="monospace">1 stream at a time</text>
            </g>

            {/* Panel A */}
            <g className="pt-fade" style={{ opacity: step.panelA ? 1 : 0 }}>
                <Panel px={190} title={step.threads > 0 ? 'process — 1 address space' : (step.panelB ? 'Process A' : 'Process')} titleColor={step.panelB ? '#60a5fa' : '#e2e8f0'} step={step} />
                {/* thread execution tokens on the shared heap (race) */}
                {step.race && [0, 1].map(i => (
                    <g key={i}>
                        <circle cx={230 + i * 120} cy="120" r="13" fill={THREAD_COLORS[i]} stroke="#0b1220" strokeWidth="1.5" className="pt-pulse" />
                        <text x={230 + i * 120} y="124" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0b1220" fontFamily="monospace">T{i + 1}</text>
                        <line x1={230 + i * 120} y1="133" x2={290} y2="168" stroke={THREAD_COLORS[i]} strokeWidth="1.4" markerEnd="url(#ptah)" opacity="0.8" />
                    </g>
                ))}
            </g>

            {/* Panel B (isolation / fork) */}
            <g className="pt-fade" style={{ opacity: step.panelB ? 1 : 0 }}>
                <Panel px={510} title={step.cow ? 'Child (fork)' : 'Process B'} titleColor="#f97316" step={{ ...step, threads: 0, race: false, seg: null }} isChild />
            </g>

            {/* Isolation barrier */}
            {step.isolate && (
                <g>
                    <line x1="455" y1="40" x2="455" y2="320" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 5" opacity="0.7" />
                    <line x1="392" y1="150" x2="448" y2="150" stroke="#ef4444" strokeWidth="2" markerEnd="url(#ptah)" className="pt-flow" />
                    <text x="455" y="336" textAnchor="middle" fontSize="10" fill="#f87171" fontFamily="monospace">✕ no access — separate address spaces</text>
                </g>
            )}

            {/* Copy-on-write links */}
            {step.cow && ['data', 'code'].map((id, i) => {
                const seg = SEG_ROWS.find(r => r.id === id);
                const y = seg.y + seg.h / 2;
                const write = step.cow === 'write' && id === 'data';
                return (
                    <g key={id}>
                        <line x1="392" y1={y} x2="508" y2={y}
                            stroke={write ? '#f97316' : '#22c55e'} strokeWidth="1.6"
                            strokeDasharray={write ? '0' : '5 4'} markerEnd="url(#ptah)" opacity="0.85" />
                    </g>
                );
            })}
            {step.cow === 'shared' && <text x="450" y="300" textAnchor="middle" fontSize="9" fill="#22c55e" fontFamily="monospace">pages shared (copy-on-write)</text>}
            {step.cow === 'write' && <text x="450" y="300" textAnchor="middle" fontSize="9" fill="#f97316" fontFamily="monospace">child writes Data → that page is copied</text>}
        </svg>
    );
}

// ── Context-switch timeline (act 6) ──────────────────────────────────────────────
function SwitchTimeline({ step }) {
    const slices = step.slices; // array of labels
    const n = slices.length;
    return (
        <div className="w-full py-4">
            <div className="text-[11px] text-slate-500 font-mono mb-2 text-center">one core · time →</div>
            <div className="relative h-16 rounded-xl border border-slate-700/60 bg-slate-950/60 overflow-hidden flex">
                {slices.map((s, i) => (
                    <div key={i} className="flex-1 border-r border-slate-800/60 last:border-0 flex items-center justify-center text-xs font-mono text-slate-500">
                        {s}
                    </div>
                ))}
                {/* sliding "now running" highlight */}
                <div className="absolute top-0 h-full rounded-lg border-2 flex items-center justify-center text-sm font-mono font-bold transition-all duration-700"
                    style={{
                        width: `${100 / n}%`,
                        left: `${(step.slice / n) * 100}%`,
                        background: (step.switchKind === 'process' ? '#f97316' : '#22d3ee') + '22',
                        borderColor: step.switchKind === 'process' ? '#f97316' : '#22d3ee',
                        color: step.switchKind === 'process' ? '#fdba74' : '#67e8f9',
                    }}>
                    {slices[step.slice]}
                </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
                <RefreshCw className="h-4 w-4 text-zinc-400" />
                <span className="text-xs text-slate-400">on each switch: save registers → load next context</span>
            </div>
            <div className={`mt-3 mx-auto max-w-md px-4 py-2.5 rounded-xl border text-xs text-center ${step.switchKind === 'process' ? 'border-orange-500/40 bg-orange-500/10 text-orange-300' : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'}`}>
                {step.switchKind === 'process'
                    ? 'Process switch: also swap the page table + flush the TLB → heavier'
                    : 'Thread switch (same process): address space stays → TLB warm → cheap'}
            </div>
        </div>
    );
}

// ── Compare / recap cards ─────────────────────────────────────────────────────
function CompareCards({ cols }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {cols.map((c, i) => (
                <div key={i} className={`rounded-xl border p-4 ${c.tone === 'proc' ? 'border-blue-500/40 bg-blue-500/5' : 'border-orange-500/40 bg-orange-500/5'}`}>
                    <div className={`flex items-center gap-2 mb-3 text-sm font-bold ${c.tone === 'proc' ? 'text-blue-300' : 'text-orange-300'}`}>
                        {c.tone === 'proc' ? <Shield className="h-4 w-4" /> : <Users className="h-4 w-4" />}{c.name}
                    </div>
                    <div className="space-y-1.5">
                        {c.pts.map((p, j) => (
                            <div key={j} className="flex items-start gap-2 text-[11px] text-slate-400">
                                <span className={p.good ? 'text-green-500' : 'text-red-400'}>{p.good ? '+' : '−'}</span>{p.t}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
function RecapCards({ wins }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            {wins.map((w, i) => (
                <div key={i} className="px-3 py-2.5 rounded-xl border border-zinc-700/60 bg-slate-900/50">
                    <div className="text-xs font-semibold text-zinc-200">{w.t}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{w.d}</div>
                </div>
            ))}
        </div>
    );
}

// ── Step generation ───────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });

    // ═══ ACT 1: Program vs Process ═══
    s(1, 'Program vs Process', { diskFile: true },
        'First, a distinction people blur constantly. A program is a passive thing: a file of machine code sitting on disk (a.out, your .exe). It does nothing on its own — it is just bytes. Running it is a separate event entirely.');
    s(1, 'Program vs Process', { panelA: true, running: 'Process', seg: null },
        'When the OS runs that program, it creates a process: a live instance with its own private chunk of memory, its own CPU state, and an entry in the OS\'s books. You can launch the same program five times and get five independent processes. The program is the recipe; the process is the meal being cooked.');

    // ═══ ACT 2: Anatomy ═══
    s(2, 'Anatomy of a Process', { panelA: true, running: 'Process', seg: 'code' },
        'A process\'s memory (its address space) has a standard layout. Code (text): the machine instructions, read-only. Data: global and static variables.');
    s(2, 'Anatomy of a Process', { panelA: true, running: 'Process', seg: 'heap' },
        'The Heap: dynamically allocated memory (new / malloc), which grows upward on demand. This is where objects you allocate at runtime live.');
    s(2, 'Anatomy of a Process', { panelA: true, running: 'Process', seg: 'stack' },
        'The Stack: local variables and function call frames, growing the other way. Alongside the memory, the OS keeps a Process Control Block (PCB) for each process: its PID, saved registers, program counter, page table pointer, and open file descriptors. The PCB is everything needed to pause and later resume the process.');

    // ═══ ACT 3: Isolation ═══
    s(3, 'Process Isolation', { panelA: true, panelB: true, running: 'A', running2: 'B' },
        'Start a second program and you get a second process — Process B — with a completely separate address space. Each process\'s pointers are virtual addresses translated through its OWN page table (see the Virtual Memory visualizer), so the same numeric address means different physical memory in each.');
    s(3, 'Process Isolation', { panelA: true, panelB: true, isolate: true },
        'The payoff is isolation. Process A simply cannot read or write Process B\'s memory — the hardware blocks it. If A crashes or is compromised, B is untouched. This is the bedrock of OS stability and security. The cost: to cooperate, processes need explicit Inter-Process Communication (pipes, sockets, shared-memory segments) — they can\'t just share a variable.');

    // ═══ ACT 4: fork & Copy-on-Write ═══
    s(4, 'fork() & Copy-on-Write', { panelA: true, panelB: true, cow: null },
        'On Unix, new processes are born by fork(): the calling process is cloned. The child gets a duplicate of the parent\'s entire address space — same code, data, heap, and stack contents. But eagerly copying, say, 2 GB of memory just to often immediately exec() a new program would be enormously wasteful.');
    s(4, 'fork() & Copy-on-Write', { panelA: true, panelB: true, cow: 'shared' },
        'So the kernel cheats with copy-on-write. Right after fork, parent and child SHARE the same physical pages, marked read-only (green dashed links). No data is actually copied. Both processes run believing they have private memory.');
    s(4, 'fork() & Copy-on-Write', { panelA: true, panelB: true, cow: 'write' },
        'The copy happens lazily, only on a write. The moment the child modifies a page — here its Data — the kernel traps, duplicates just that one page, and gives the child its private copy (solid orange link). Untouched pages stay shared forever. fork() becomes nearly free, and you only pay for what you actually change.');

    // ═══ ACT 5: Threads ═══
    s(5, 'Threads', { panelA: true, threads: 1, running: 'thread', seg: null },
        'Now the other model. Instead of a whole new process, you can spawn threads inside one process. A thread is an independent stream of execution — its own path through the code — but it lives in the SAME address space as its siblings.');
    s(5, 'Threads', { panelA: true, threads: 3, running: 'T1' },
        'Here are three threads in one process. They all SHARE the Code, Data, and Heap (green) — one copy, visible to every thread. What each thread gets privately is only its own Stack (its call frames and locals) plus its own registers and program counter. That is the entire difference: shared everything, except the stack.');
    s(5, 'Threads', { panelA: true, threads: 2, race: true, running: 'T1,T2' },
        'Sharing the heap is threads\' superpower and their peril. Two threads can read and update the same object with zero copying — fast and direct. But if both write the same shared variable without coordination, you get a data race and corrupted results (see the Multithreading visualizer for the counter race and mutex fix). Shared memory is why threads are powerful and why locks exist.');

    // ═══ ACT 6: Context Switching ═══
    s(6, 'Context Switching', { switchTimeline: true, slices: ['T1', 'T2', 'T3', 'T1', 'T2'], slice: 0, switchKind: 'thread' },
        'One CPU core runs exactly one execution stream at a time. The illusion of many things running at once comes from the OS rapidly time-slicing: run T1 for a few milliseconds, save its state, load T2, and so on. Watch the "now running" slot advance across the timeline.');
    s(6, 'Context Switching', { switchTimeline: true, slices: ['T1', 'T2', 'T3', 'T1', 'T2'], slice: 2, switchKind: 'thread' },
        'Each switch saves the outgoing context\'s registers into its control block and loads the next one\'s. Between threads of the SAME process this is cheap: they share the address space, so the page table and the TLB stay valid — no translation caches to rebuild.');
    s(6, 'Context Switching', { switchTimeline: true, slices: ['P1', 'P2', 'P1', 'P2', 'P1'], slice: 1, switchKind: 'process' },
        'Switching between different PROCESSES is heavier. On top of saving and restoring registers, the kernel must swap the active page table and flush the TLB, so address translations start cold and must be rebuilt. This is a real reason thread-based concurrency can outperform process-based when switching is frequent.');

    // ═══ ACT 7: Trade-off ═══
    s(7, 'The Trade-off', {
        compare: [
            { name: 'Processes', tone: 'proc', pts: [
                { good: true,  t: 'Full isolation — a crash or exploit is contained' },
                { good: true,  t: 'Sidestep the GIL for true CPU parallelism (Python)' },
                { good: false, t: 'Heavier to create; more memory per instance' },
                { good: false, t: 'Must use IPC to communicate (no shared variables)' },
            ] },
            { name: 'Threads', tone: 'thread', pts: [
                { good: true,  t: 'Cheap to create; share the heap directly' },
                { good: true,  t: 'Fast context switches (same address space)' },
                { good: false, t: 'One thread\'s bad write can corrupt the whole process' },
                { good: false, t: 'Shared state needs locks → races & deadlocks' },
            ] },
        ],
    }, 'The choice is a trade between isolation and sharing. Processes are safe but heavy and must talk through IPC. Threads are light and share memory directly, but that shared memory is a loaded gun: one errant write corrupts everyone, and coordinating access demands locks, with all the races and deadlocks that entails.');

    // ═══ ACT 8: Which to use ═══
    s(8, 'Which Should You Use?', {
        recap: true,
        wins: [
            { t: 'CPU-bound parallelism', d: 'Use processes (e.g. Python multiprocessing) to use many cores and dodge the GIL.' },
            { t: 'I/O-bound concurrency', d: 'Use threads or async — they wait on the network/disk cheaply while sharing state.' },
            { t: 'Isolation & robustness', d: 'Use processes when a crash or untrusted code must not take down the rest (browsers do this per tab).' },
            { t: 'Tight shared state', d: 'Use threads when tasks must share large in-memory data with minimal copying — guarded by locks.' },
        ],
    }, 'So: reach for processes when you need isolation, fault-tolerance, or true multicore CPU parallelism; reach for threads (or async) when tasks are I/O-bound or must share memory cheaply. Real systems mix both — a web browser runs a process per tab for safety, and many threads inside each for concurrency. Same hardware, two tools, chosen by whether you value isolation or sharing more.');

    return steps;
}

// ── Router ──────────────────────────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.switchTimeline) return <SwitchTimeline step={step} />;
    if (step.compare) return <CompareCards cols={step.compare} />;
    if (step.recap) return <RecapCards wins={step.wins} />;
    return <ProcessStage step={step} />;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'Two threads in the same process — what do they share, and what stays private?',
        options: [
            'They share everything, including the stack',
            'They share code, data, and heap; each has its own stack and registers',
            'They share only the stack',
            'Nothing is shared — threads are fully isolated',
        ],
        correct: 1,
        explanation: 'Threads live in one address space, so code, global data, and the heap are shared (one copy, visible to all). Each thread has its own stack (call frames + locals) plus its own registers and program counter. Shared heap is exactly why threads need locks.',
    },
    {
        question: 'What does copy-on-write achieve after fork()?',
        options: [
            'It encrypts the child\'s memory',
            'It eagerly copies the whole address space for safety',
            'Parent and child share physical pages until one writes, then only that page is copied',
            'It prevents the child from ever writing memory',
        ],
        correct: 2,
        explanation: 'Copy-on-write shares the parent\'s pages with the child as read-only. Only when one side writes a page does the kernel duplicate that single page. Unmodified pages stay shared, making fork() fast and memory-efficient.',
    },
    {
        question: 'Why is switching between two processes more expensive than between two threads of one process?',
        options: [
            'Processes have smaller stacks',
            'A process switch must also swap the page table and flush the TLB; threads share the address space so it stays warm',
            'Threads cannot be switched at all',
            'Processes do not use registers',
        ],
        correct: 1,
        explanation: 'Both switches save/restore registers. But a process switch also changes the active address space — swapping the page table and flushing the TLB — so address translations must be rebuilt cold. Threads of the same process share the address space, so that cost is avoided.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — processes vs threads, nailed!' : 'Review the explanations to reinforce the concepts.'}
                </div>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors">Retake Quiz</button>
            </div>
        );
    }
    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Question {quizState.current + 1} / {QUIZ.length}</div>
            <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'border-slate-700 text-slate-400 hover:border-zinc-500 hover:text-slate-200';
                    if (quizState.answered) {
                        if (i === q.correct) cls = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) cls = 'border-red-500 bg-red-500/10 text-red-300';
                        else cls = 'border-slate-800 text-slate-600';
                    }
                    return (
                        <button key={i} onClick={() => {
                            if (quizState.answered) return;
                            const correct = i === q.correct;
                            setQuizState(st => ({ ...st, selected: i, answered: true, score: correct ? st.score + 1 : st.score }));
                        }} className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}>{opt}</button>
                    );
                })}
            </div>
            {quizState.answered && <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2 leading-relaxed">{q.explanation}</div>}
            {quizState.answered && (
                <button onClick={() => {
                    if (quizState.current + 1 >= QUIZ.length) setQuizState(st => ({ ...st, complete: true }));
                    else setQuizState(st => ({ ...st, current: st.current + 1, selected: null, answered: false }));
                }} className="mt-3 w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-white transition-colors">
                    {quizState.current + 1 >= QUIZ.length ? 'See Score' : 'Next Question'}
                </button>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const STEPS = generateSteps();

export default function ProcessesVsThreadsPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying,   setIsPlaying]   = useState(false);
    const [speed,       setSpeed]       = useState(1300);
    const [quizState,   setQuizState]   = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        if (!isPlaying || STEPS.length === 0) return;
        if (currentStep >= STEPS.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, speed]);

    const step = STEPS[currentStep];
    const pct  = Math.round(((currentStep + 1) / STEPS.length) * 100);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-600 to-slate-700 px-4 py-6">
                <div className="max-w-7xl mx-auto">
                    <Link href="/under-the-hood" className="flex items-center gap-1.5 text-zinc-300 hover:text-white text-sm mb-4 w-fit transition-colors">
                        <ArrowLeft className="h-4 w-4" />Back to Under the Hood
                    </Link>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Processes vs Threads</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                Address spaces, the PCB, fork() &amp; copy-on-write, why threads share the heap but not the stack, and the cost of a context switch
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-xs text-zinc-400 font-mono">{currentStep + 1} / {STEPS.length}</div>
                            <div className="text-[10px] text-zinc-600 mt-0.5">steps</div>
                        </div>
                    </div>

                    {/* Act timeline */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                        {ACTS.map(act => {
                            const ActIcon = act.icon;
                            const isCurrent = step?.act === act.id;
                            const isDone    = step?.act > act.id;
                            return (
                                <button key={act.id} onClick={() => {
                                    const firstStepOfAct = STEPS.findIndex(s => s.act === act.id);
                                    if (firstStepOfAct >= 0) { setCurrentStep(firstStepOfAct); setIsPlaying(false); }
                                }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        isCurrent ? 'bg-white/20 text-white border border-white/30'
                                        : isDone ? 'bg-white/5 text-zinc-400 border border-white/10'
                                        : 'bg-transparent text-zinc-600 border border-transparent hover:border-white/10 hover:text-zinc-400'
                                    }`}>
                                    <ActIcon className="h-3 w-3" />{act.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-slate-800">
                <div className="h-full bg-gradient-to-r from-zinc-500 to-slate-400 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>

            {/* Main 2-col layout */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60">
                                <div>
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Act {step?.act} of 8</span>
                                    <span className="text-slate-600 mx-2">·</span>
                                    <span className="text-sm font-semibold text-slate-200">{step?.actName}</span>
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono">step {currentStep + 1}</span>
                            </div>
                            <div className="px-5 py-3 min-h-[400px] flex items-center">
                                <VisualizationPanel step={step} />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mt-4 bg-slate-900/50 border border-slate-800/60 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Reset">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Previous">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => setIsPlaying(p => !p)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors text-sm font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Next">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 sm:ml-auto">
                                <span className="text-xs text-slate-500">Speed</span>
                                <input type="range" min="200" max="2000" value={speed}
                                    onChange={e => setSpeed(Number(e.target.value))} className="w-24 accent-zinc-400" />
                                <span className="text-xs text-slate-600 font-mono w-14">{speed > 1500 ? 'slow' : speed < 500 ? 'fast' : 'normal'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                                <p className="text-zinc-300 text-sm leading-relaxed">{step?.explanation}</p>
                            </div>
                        </div>

                        {/* Reference */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Shared vs private</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [2], label: 'Code / Data', note: 'threads: shared' },
                                    { acts: [2, 5], label: 'Heap', note: 'threads: shared' },
                                    { acts: [2, 5], label: 'Stack', note: 'per-thread' },
                                    { acts: [3], label: 'Address space', note: 'per-process' },
                                    { acts: [4], label: 'fork()', note: 'copy-on-write' },
                                    { acts: [6], label: 'Switch cost', note: 'proc > thread' },
                                ].map(row => (
                                    <div key={row.label} className={`flex justify-between gap-2 px-2 py-1 rounded-lg transition-colors ${step && row.acts.includes(step.act) ? 'bg-zinc-700/50 text-zinc-200' : 'text-slate-500'}`}>
                                        <span>{row.label}</span>
                                        <span className="font-mono text-[10px] text-right">{row.note}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quiz */}
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2 px-1">Active Recall</p>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
