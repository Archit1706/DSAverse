"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw,
    Info, CheckCircle, XCircle, ChevronRight
} from 'lucide-react';

// ─── Stage metadata ───────────────────────────────────────────────────────────
const STAGES = [
    { id: 1, label: 'Blocking Problem', short: 'Blocking' },
    { id: 2, label: 'The Event Loop',   short: 'Loop' },
    { id: 3, label: 'JS Task Queues',   short: 'JS Queues' },
    { id: 4, label: 'Python asyncio',   short: 'asyncio' },
    { id: 5, label: 'Async vs Parallel', short: 'vs Parallel' },
];

// ─── Step generation ──────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];
    const s = (stage, phase, data, explanation) =>
        steps.push({ stage, phase, ...data, explanation });

    // ── Stage 1: The Blocking Problem ─────────────────────────────────────────
    s(1, 'intro', {
        requests: [],
        asyncMode: false,
        totalTime: null,
    }, 'A synchronous server handles one request at a time. While it waits for the database, the thread is blocked — it cannot do anything else. Three requests each taking ~220 ms will take ~660 ms total.');

    s(1, 'blocking_run', {
        asyncMode: false,
        totalTime: '~660 ms',
        requests: [
            { id: 'A', label: 'Request A', segments: [{type:'recv',w:10},{type:'db',w:60},{type:'send',w:10}] },
            { id: 'B', label: 'Request B', segments: [{type:'wait',w:80},{type:'recv',w:10},{type:'db',w:60},{type:'send',w:10}] },
            { id: 'C', label: 'Request C', segments: [{type:'wait',w:160},{type:'recv',w:10},{type:'db',w:60},{type:'send',w:10}] },
        ],
    }, 'With synchronous (blocking) I/O, requests queue behind each other. Request B cannot start until A finishes. Total wall-clock time = sum of all individual times ≈ 660 ms.');

    s(1, 'async_run', {
        asyncMode: true,
        totalTime: '~220 ms',
        requests: [
            { id: 'A', label: 'Request A', segments: [{type:'recv',w:10},{type:'db_async',w:60},{type:'send',w:10}] },
            { id: 'B', label: 'Request B', segments: [{type:'recv',w:10},{type:'db_async',w:60},{type:'send',w:10}] },
            { id: 'C', label: 'Request C', segments: [{type:'recv',w:10},{type:'db_async',w:60},{type:'send',w:10}] },
        ],
    }, 'With async I/O, while one request awaits the database, the thread serves the next request. All three DB queries run concurrently. Total time ≈ single request time — a 3× speedup with zero extra threads.');

    // ── Stage 2: The Event Loop ────────────────────────────────────────────────
    s(2, 'loop_idle', {
        ready: [],
        waiting: [],
        running: null,
        loopPhase: 'idle',
        log: [],
    }, 'The event loop is a continuous cycle: check the ready queue → pick a task → run it until it awaits I/O → suspend it into the waiting queue → repeat. When I/O completes, the OS moves the task back to ready.');

    s(2, 'loop_tasks_arrive', {
        ready: [
            { id: 'fetch_users', label: 'fetch_users()', color: 'blue' },
            { id: 'send_email',  label: 'send_email()',  color: 'green' },
        ],
        waiting: [],
        running: null,
        loopPhase: 'pick',
        log: ['fetch_users() and send_email() added to the ready queue'],
    }, 'Two coroutines are created and placed in the ready queue. The event loop will pick the first one and run it until it suspends.');

    s(2, 'loop_running_A', {
        ready: [{ id: 'send_email', label: 'send_email()', color: 'green' }],
        waiting: [],
        running: { id: 'fetch_users', label: 'fetch_users()', color: 'blue', note: 'running…' },
        loopPhase: 'run',
        log: [
            'fetch_users() and send_email() added to the ready queue',
            'Loop picks fetch_users() → running',
        ],
    }, 'The event loop picks fetch_users() from the ready queue and runs it synchronously until it hits an await statement — for example, awaiting a database query.');

    s(2, 'loop_suspended', {
        ready: [{ id: 'send_email', label: 'send_email()', color: 'green' }],
        waiting: [{ id: 'fetch_users', label: 'fetch_users()', color: 'blue', note: '⏳ await DB query' }],
        running: null,
        loopPhase: 'suspend',
        ioEvent: 'DB query in flight…',
        log: [
            'fetch_users() and send_email() added to the ready queue',
            'Loop picks fetch_users() → running',
            'fetch_users() hits await → suspended to waiting queue',
            'Loop now picks send_email() from ready queue',
        ],
    }, 'fetch_users() hit "await db.query()" — the coroutine is suspended and moved to the waiting queue. The OS will notify the event loop when the DB responds. Meanwhile the loop picks send_email().');

    // ── Stage 3: JS Task Queues ────────────────────────────────────────────────
    const jsCode = [
        "console.log('1: start');",
        "setTimeout(() => console.log('4: timeout'), 0);",
        "Promise.resolve().then(() => console.log('3: promise'));",
        "console.log('2: end');",
    ];

    s(3, 'js_intro', {
        code: jsCode, activeLine: -1,
        callStack: [], microQueue: [], macroQueue: [], output: [], rule: null,
    }, "JavaScript's event loop has two queues: the Microtask Queue (Promises, queueMicrotask) and the Macrotask Queue (setTimeout, setInterval, I/O). Golden rule: after each task, drain ALL microtasks before picking the next macrotask.");

    s(3, 'js_line1', {
        code: jsCode, activeLine: 0,
        callStack: ["console.log('1: start')"],
        microQueue: [], macroQueue: [],
        output: ['1: start'],
        rule: 'Synchronous code runs immediately on the call stack.',
    }, "Line 1: console.log('1: start') runs synchronously on the call stack. Output: '1: start' is logged immediately.");

    s(3, 'js_line2', {
        code: jsCode, activeLine: 1,
        callStack: ['setTimeout(cb, 0)'],
        microQueue: [],
        macroQueue: ['cb → log("4: timeout")'],
        output: ['1: start'],
        rule: 'setTimeout always goes to the Macrotask Queue — even with delay 0.',
    }, "Line 2: setTimeout(cb, 0) — the callback is handed to the browser timer and queued in the Macrotask Queue. setTimeout with 0 ms delay does NOT run immediately.");

    s(3, 'js_line3', {
        code: jsCode, activeLine: 2,
        callStack: ['Promise.resolve().then(cb)'],
        microQueue: ['cb → log("3: promise")'],
        macroQueue: ['cb → log("4: timeout")'],
        output: ['1: start'],
        rule: 'Promise.then() callbacks go to the Microtask Queue.',
    }, "Line 3: Promise.resolve().then(cb) — the promise is already resolved, so the .then() callback is immediately queued in the Microtask Queue. It does NOT run yet; the call stack is still busy.");

    s(3, 'js_line4', {
        code: jsCode, activeLine: 3,
        callStack: ["console.log('2: end')"],
        microQueue: ['cb → log("3: promise")'],
        macroQueue: ['cb → log("4: timeout")'],
        output: ['1: start', '2: end'],
        rule: 'Synchronous code runs to completion before any queued task.',
    }, "Line 4: console.log('2: end') runs synchronously. Call stack is now empty. Next: drain the Microtask Queue before touching the Macrotask Queue.");

    s(3, 'js_micro', {
        code: jsCode, activeLine: 2,
        callStack: ['cb → log("3: promise")'],
        microQueue: [],
        macroQueue: ['cb → log("4: timeout")'],
        output: ['1: start', '2: end', '3: promise'],
        rule: '⚡ Key rule: ALL microtasks run before the next macrotask.',
    }, "Call stack empty → event loop drains the Microtask Queue first. The Promise .then() callback runs: logs '3: promise'. Microtask queue is now empty.");

    s(3, 'js_macro', {
        code: jsCode, activeLine: 1,
        callStack: ['cb → log("4: timeout")'],
        microQueue: [],
        macroQueue: [],
        output: ['1: start', '2: end', '3: promise', '4: timeout'],
        rule: 'Only after ALL microtasks are drained does the loop pick the next macrotask.',
    }, "Now the Macrotask Queue is checked. The setTimeout callback runs: logs '4: timeout'. Final output: 1 → 2 → 3 → 4. This trips up most developers who expect setTimeout(0) to run before the Promise.");

    // ── Stage 4: Python asyncio ────────────────────────────────────────────────
    const pyCode = [
        'import asyncio',
        '',
        'async def task(name, delay):',
        '    print(f"{name}: start")',
        '    await asyncio.sleep(delay)',
        '    print(f"{name}: done")',
        '',
        'async def main():',
        '    await asyncio.gather(',
        '        task("A", 2),',
        '        task("B", 1)',
        '    )',
        '',
        'asyncio.run(main())',
    ];

    s(4, 'py_intro', {
        code: pyCode, activeLine: -1,
        coroutines: [], output: [], t: 0, note: null,
    }, 'In Python, calling an async function does NOT run it — it returns a coroutine object. asyncio.run() creates an event loop. asyncio.gather() schedules multiple coroutines to run concurrently on the SAME single thread.');

    s(4, 'py_gather', {
        code: pyCode, activeLine: 8,
        coroutines: [
            { name: 'task("A", 2)', state: 'ready',   delay: 2, elapsed: 0, color: 'blue' },
            { name: 'task("B", 1)', state: 'ready',   delay: 1, elapsed: 0, color: 'green' },
        ],
        output: [], t: 0, note: 'asyncio.gather() wraps both coroutines as tasks and schedules them.',
    }, 'asyncio.gather() schedules both task("A",2) and task("B",1) as concurrent tasks. They are now in the ready queue. The event loop will run them interleaved — not in parallel, but switching when one awaits.');

    s(4, 'py_start_both', {
        code: pyCode, activeLine: 4,
        coroutines: [
            { name: 'task("A", 2)', state: 'waiting', delay: 2, elapsed: 0, color: 'blue',  note: 'await asyncio.sleep(2)' },
            { name: 'task("B", 1)', state: 'waiting', delay: 1, elapsed: 0, color: 'green', note: 'await asyncio.sleep(1)' },
        ],
        output: ['A: start', 'B: start'], t: 0,
        note: 'Both tasks hit await asyncio.sleep() and suspend immediately.',
    }, 'The loop runs task A until it hits "await asyncio.sleep(2)" — suspends. Then runs task B until "await asyncio.sleep(1)" — suspends. Both are in the waiting queue. Output so far: "A: start", "B: start".');

    s(4, 'py_b_done', {
        code: pyCode, activeLine: 5,
        coroutines: [
            { name: 'task("A", 2)', state: 'waiting', delay: 2, elapsed: 1, color: 'blue',  note: '1s remaining…' },
            { name: 'task("B", 1)', state: 'done',    delay: 1, elapsed: 1, color: 'green', note: '✓ complete at t=1s' },
        ],
        output: ['A: start', 'B: start', 'B: done'], t: 1,
        note: null,
    }, 't = 1 second: task B\'s asyncio.sleep(1) resolves first. The OS wakes the event loop. Task B resumes, prints "B: done", and completes. Task A is still sleeping (1 more second).');

    s(4, 'py_a_done', {
        code: pyCode, activeLine: 5,
        coroutines: [
            { name: 'task("A", 2)', state: 'done', delay: 2, elapsed: 2, color: 'blue',  note: '✓ complete at t=2s' },
            { name: 'task("B", 1)', state: 'done', delay: 1, elapsed: 1, color: 'green', note: '✓ complete at t=1s' },
        ],
        output: ['A: start', 'B: start', 'B: done', 'A: done'], t: 2,
        note: 'Total: 2s (the longer task), NOT 3s (sum). Concurrent I/O overlaps wait time on a single thread.',
    }, 't = 2 seconds: task A\'s asyncio.sleep(2) resolves. A resumes, prints "A: done". Total time: 2s, NOT 3s (sum of 2+1). This is the power of concurrent async I/O.');

    // ── Stage 5: Async vs Parallel ─────────────────────────────────────────────
    s(5, 'comparison_intro', {
        mode: 'both', highlight: null,
        asyncLanes: [
            { name: 'Task A', segments: [{type:'run',w:12,label:'CPU'},{type:'db_async',w:56,label:'await I/O'},{type:'run',w:12,label:'CPU'}] },
            { name: 'Task B', segments: [{type:'wait',w:12,label:''},{type:'run',w:10,label:'CPU'},{type:'db_async',w:44,label:'await I/O'},{type:'run',w:14,label:'CPU'}] },
        ],
        parallelLanes: [
            { name: 'Thread 1', segments: [{type:'run',w:80,label:'Task A runs fully'}] },
            { name: 'Thread 2', segments: [{type:'run',w:80,label:'Task B runs fully'}] },
        ],
        note: null,
    }, 'Async and parallel are different tools for different problems. Async (cooperative multitasking) interleaves I/O-bound tasks on ONE thread. Parallel (preemptive) uses MULTIPLE threads/processes — required for CPU-bound work.');

    s(5, 'async_detail', {
        mode: 'async', highlight: 'async',
        asyncLanes: [
            { name: 'Task A', segments: [{type:'run',w:12,label:'CPU'},{type:'db_async',w:56,label:'await network/DB'},{type:'run',w:12,label:'CPU'}] },
            { name: 'Task B', segments: [{type:'wait',w:12,label:''},{type:'run',w:10,label:'CPU'},{type:'db_async',w:44,label:'await network/DB'},{type:'run',w:14,label:'CPU'}] },
        ],
        parallelLanes: [],
        note: 'One thread. Tasks voluntarily yield at await. No race conditions possible.',
    }, 'Async on a single thread: when Task A awaits, the loop switches to Task B. The CPU segments never overlap — only one task runs at a time, but I/O waits are overlapped. No locks needed. JavaScript\'s event loop and Python\'s asyncio work this way.');

    s(5, 'parallel_detail', {
        mode: 'parallel', highlight: 'parallel',
        asyncLanes: [],
        parallelLanes: [
            { name: 'Thread 1', segments: [{type:'run',w:80,label:'Task A — CPU-bound (e.g. image resize)'}] },
            { name: 'Thread 2', segments: [{type:'run',w:80,label:'Task B — CPU-bound (e.g. video encode)'}] },
        ],
        note: 'Multiple threads. Truly simultaneous. Requires locks for shared state. Python: use multiprocessing to bypass the GIL.',
    }, 'Parallel threads run truly simultaneously across CPU cores — both bars overlap. This is the only way to speed up CPU-bound work. Trade-off: you must protect shared state with mutexes to avoid race conditions. Python\'s GIL prevents true thread parallelism for CPU work — use multiprocessing instead.');

    return steps;
}

const STEPS = generateSteps();

// ─── Quiz ─────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: "What is the output order of: console.log(1); setTimeout(()=>console.log(4),0); Promise.resolve().then(()=>console.log(3)); console.log(2);",
        options: ['1, 2, 3, 4', '1, 3, 2, 4', '1, 2, 4, 3', '1, 4, 2, 3'],
        correct: 0,
        explanation: 'Synchronous code (1, 2) runs first. Then ALL microtasks (Promise → 3) drain before any macrotask (setTimeout → 4). Final order: 1, 2, 3, 4.',
    },
    {
        question: 'In Python, what does calling my_coroutine() (an async def function) actually do?',
        options: [
            'Returns a coroutine object without running any code',
            'Starts the coroutine immediately on a new thread',
            'Runs the coroutine synchronously and blocks',
            'Schedules the coroutine on the event loop',
        ],
        correct: 0,
        explanation: 'Calling an async def function creates a coroutine object but does NOT execute it. You need asyncio.run(), await, or asyncio.create_task() to actually run it.',
    },
    {
        question: 'Async/await uses ___ while threading uses ___',
        options: [
            'Cooperative multitasking on one thread / Preemptive multitasking on multiple threads',
            'Preemptive multitasking on one thread / Cooperative multitasking on multiple threads',
            'Multiple processes / Multiple threads',
            'Shared memory / Message passing',
        ],
        correct: 0,
        explanation: 'Async is cooperative — tasks voluntarily yield at await points, all on one thread. Threading is preemptive — the OS can interrupt threads at any time across multiple threads.',
    },
];

// ─── Segment colour map ───────────────────────────────────────────────────────
const SEG_COLOR = {
    recv:     'bg-blue-500',
    db:       'bg-red-500',
    db_async: 'bg-yellow-500',
    send:     'bg-green-500',
    wait:     'bg-slate-700/60',
    run:      'bg-green-500',
};
const SEG_LABEL = { recv:'recv', db:'DB wait', db_async:'DB wait', send:'send', wait:'idle', run:'run' };

// ─── Scene: Blocking ──────────────────────────────────────────────────────────
function SceneBlocking({ step }) {
    const { requests, asyncMode, totalTime, phase } = step;

    if (phase === 'intro') {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-8">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md text-center">
                    <div className="text-5xl mb-4">🧱</div>
                    <h3 className="text-white font-bold text-xl mb-2">Synchronous Server</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        One thread. One request at a time.<br />
                        While waiting for the DB, the thread is blocked.
                    </p>
                </div>
                <div className="w-full max-w-md space-y-2">
                    {['Request A', 'Request B', 'Request C'].map(r => (
                        <div key={r} className="flex items-center gap-3">
                            <span className="text-slate-400 text-sm w-24">{r}</span>
                            <div className="flex-1 h-9 bg-slate-800 rounded-lg border border-slate-700/50 flex items-center justify-center">
                                <span className="text-slate-600 text-xs">recv(10ms) + DB(200ms) + send(10ms)</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className={`self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                asyncMode ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
                {asyncMode ? '⚡ Async Mode' : '🧱 Blocking Mode'}
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-24 text-slate-500 text-xs">Request</div>
                    <div className="text-slate-500 text-xs">Timeline →</div>
                </div>
                {requests.map(req => (
                    <div key={req.id} className="flex items-center gap-3">
                        <div className="w-24 text-slate-300 text-sm font-medium">{req.label}</div>
                        <div className="flex gap-0.5 h-9 items-stretch">
                            {req.segments.map((seg, i) => (
                                <div
                                    key={i}
                                    className={`${SEG_COLOR[seg.type]} rounded-sm flex items-center justify-center`}
                                    style={{ width: `${seg.w * 2}px` }}
                                >
                                    {seg.w > 15 && (
                                        <span className="text-[10px] font-medium text-white/80 px-1 truncate">
                                            {SEG_LABEL[seg.type]}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
                {[
                    { color: 'bg-blue-500',    label: 'recv' },
                    { color: 'bg-red-500',     label: 'DB wait (blocking)' },
                    { color: 'bg-yellow-500',  label: 'DB wait (async)' },
                    { color: 'bg-green-500',   label: 'send' },
                    { color: 'bg-slate-700/60',label: 'idle (queued)' },
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-sm ${l.color}`} />
                        <span className="text-slate-400 text-xs">{l.label}</span>
                    </div>
                ))}
            </div>

            {totalTime && (
                <div className={`mt-auto rounded-xl p-4 border ${
                    asyncMode ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm">Total wall-clock time</span>
                        <span className={`font-bold text-2xl ${asyncMode ? 'text-green-400' : 'text-red-400'}`}>
                            {totalTime}
                        </span>
                    </div>
                    {asyncMode && (
                        <p className="text-green-300/70 text-xs mt-1">3× faster — same single thread, zero extra workers!</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Scene: Event Loop ────────────────────────────────────────────────────────
function SceneEventLoop({ step }) {
    const { ready, waiting, running, loopPhase, ioEvent, log } = step;
    const phases = ['idle', 'pick', 'run', 'suspend'];

    return (
        <div className="flex flex-col gap-5 h-full">
            {/* Phase indicator */}
            <div className="flex items-center gap-1.5 text-xs">
                {['Idle', 'Pick', 'Run', 'Suspend'].map((ph, i) => {
                    const active = phases[i] === loopPhase;
                    return (
                        <div key={ph} className={`px-3 py-1.5 rounded-full border font-medium transition-all ${
                            active ? 'bg-zinc-600/50 border-zinc-400 text-zinc-200' : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}>
                            {ph}
                        </div>
                    );
                })}
                <div className="flex-1 border-t border-dashed border-slate-700 mx-2" />
                <span className="text-slate-500">repeats forever</span>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
                {/* Ready queue */}
                <div className="bg-slate-800/60 rounded-xl border border-green-700/40 p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        <span className="text-green-300 text-sm font-semibold">Ready Queue</span>
                        <span className="ml-auto text-slate-500 text-[10px]">FIFO</span>
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                        {ready.length === 0
                            ? <div className="text-slate-600 text-xs text-center my-auto">empty</div>
                            : ready.map(t => (
                                <div key={t.id} className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                                    t.color === 'blue' ? 'bg-blue-500/15 border-blue-500/40 text-blue-300' : 'bg-green-500/15 border-green-500/40 text-green-300'
                                }`}>{t.label}</div>
                            ))
                        }
                    </div>
                </div>

                {/* Waiting queue */}
                <div className="bg-slate-800/60 rounded-xl border border-yellow-700/40 p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <span className="text-yellow-300 text-sm font-semibold">Waiting Queue</span>
                        <span className="ml-auto text-slate-500 text-[10px]">suspended</span>
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                        {waiting.length === 0
                            ? <div className="text-slate-600 text-xs text-center my-auto">empty</div>
                            : waiting.map(t => (
                                <div key={t.id} className="px-3 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/8 text-sm">
                                    <div className="text-yellow-200 font-medium">{t.label}</div>
                                    {t.note && <div className="text-slate-400 text-xs mt-0.5">{t.note}</div>}
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>

            {/* Running */}
            <div className="bg-slate-800/60 rounded-xl border border-zinc-600/50 p-3">
                <div className="text-slate-500 text-xs mb-1.5">Currently running</div>
                {running ? (
                    <div className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm font-medium ${
                        running.color === 'blue' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-green-500/20 border-green-500/50 text-green-300'
                    }`}>
                        <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        {running.label}
                    </div>
                ) : (
                    <div className="text-slate-600 text-sm px-3 py-2">— idle —</div>
                )}
            </div>

            {ioEvent && (
                <div className="flex gap-2">
                    <div className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-300 text-xs flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                        I/O in flight: {ioEvent}
                    </div>
                </div>
            )}

            {log.length > 0 && (
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 space-y-1">
                    {log.map((l, i) => (
                        <div key={i} className={`text-xs flex gap-2 ${i === log.length - 1 ? 'text-zinc-300' : 'text-slate-500'}`}>
                            <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-60" />
                            {l}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Scene: JS Task Queues ────────────────────────────────────────────────────
function SceneJSQueues({ step }) {
    const { code, activeLine, callStack, microQueue, macroQueue, output, rule } = step;

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 font-mono text-sm">
                {code.map((line, i) => (
                    <div key={i} className={`px-2 py-0.5 rounded transition-colors ${i === activeLine ? 'bg-yellow-500/20 text-yellow-200' : 'text-slate-400'}`}>
                        <span className="text-slate-600 mr-3 select-none">{i + 1}</span>
                        {line}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-3 flex-1">
                {/* Call Stack */}
                <div className="bg-slate-800/60 rounded-xl border border-blue-700/40 p-3 flex flex-col">
                    <div className="text-blue-300 text-xs font-semibold mb-1 text-center">Call Stack</div>
                    <div className="text-slate-600 text-[10px] text-center mb-2">LIFO ↑ TOS</div>
                    <div className="flex-1 flex flex-col-reverse gap-1.5">
                        {callStack.map((item, i) => (
                            <div key={i} className="bg-blue-500/20 border border-blue-500/40 rounded px-2 py-1.5 text-blue-200 text-[11px] text-center font-mono">
                                {item}
                            </div>
                        ))}
                    </div>
                    {callStack.length === 0 && <div className="text-slate-600 text-xs text-center mt-auto">empty</div>}
                </div>

                {/* Microtask Queue */}
                <div className="bg-slate-800/60 rounded-xl border border-purple-700/40 p-3 flex flex-col">
                    <div className="text-purple-300 text-xs font-semibold mb-1 text-center">Microtask</div>
                    <div className="text-slate-600 text-[10px] text-center mb-2">Promise / queueMicrotask</div>
                    <div className="flex flex-col gap-1.5 flex-1">
                        {microQueue.map((item, i) => (
                            <div key={i} className="bg-purple-500/20 border border-purple-500/40 rounded px-2 py-1.5 text-purple-200 text-[11px] text-center">
                                {item}
                            </div>
                        ))}
                    </div>
                    {microQueue.length === 0 && <div className="text-slate-600 text-xs text-center mt-auto">empty</div>}
                </div>

                {/* Macrotask Queue */}
                <div className="bg-slate-800/60 rounded-xl border border-orange-700/40 p-3 flex flex-col">
                    <div className="text-orange-300 text-xs font-semibold mb-1 text-center">Macrotask</div>
                    <div className="text-slate-600 text-[10px] text-center mb-2">setTimeout / I/O</div>
                    <div className="flex flex-col gap-1.5 flex-1">
                        {macroQueue.map((item, i) => (
                            <div key={i} className="bg-orange-500/20 border border-orange-500/40 rounded px-2 py-1.5 text-orange-200 text-[11px] text-center">
                                {item}
                            </div>
                        ))}
                    </div>
                    {macroQueue.length === 0 && <div className="text-slate-600 text-xs text-center mt-auto">empty</div>}
                </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-700 p-3">
                <div className="text-slate-500 text-xs mb-1.5">Console output</div>
                <div className="flex gap-2 flex-wrap min-h-[28px]">
                    {output.map((o, i) => (
                        <span key={i} className="bg-green-500/15 text-green-300 px-2 py-0.5 rounded font-mono text-sm border border-green-500/20">
                            {o}
                        </span>
                    ))}
                </div>
            </div>

            {rule && (
                <div className="bg-zinc-500/10 border border-zinc-500/30 rounded-lg px-3 py-2">
                    <p className="text-zinc-300 text-xs font-medium">{rule}</p>
                </div>
            )}
        </div>
    );
}

// ─── Scene: Python asyncio ────────────────────────────────────────────────────
function ScenePython({ step }) {
    const { code, activeLine, coroutines, output, t, note } = step;

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 font-mono text-xs">
                {code.map((line, i) => (
                    <div key={i} className={`px-2 py-px rounded ${i === activeLine ? 'bg-yellow-500/20 text-yellow-200' : 'text-slate-400'}`}>
                        <span className="text-slate-600 mr-3 select-none w-4 inline-block text-right">{line ? i + 1 : ''}</span>
                        {line}
                    </div>
                ))}
            </div>

            {coroutines.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {coroutines.map(co => (
                        <div key={co.name} className={`rounded-xl border p-3 transition-all ${
                            co.state === 'done'    ? (co.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-green-500/10 border-green-500/30') :
                            co.state === 'waiting' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                                     'bg-slate-800/60 border-slate-700'
                        }`}>
                            <div className={`text-sm font-bold mb-1 font-mono ${co.color === 'blue' ? 'text-blue-300' : 'text-green-300'}`}>
                                {co.name}
                            </div>
                            <div className={`text-xs font-semibold mb-2 ${
                                co.state === 'done'    ? 'text-green-400' :
                                co.state === 'waiting' ? 'text-yellow-400' : 'text-slate-400'
                            }`}>
                                {co.state === 'done' ? '✓ DONE' : co.state === 'waiting' ? '⏳ WAITING' : '● READY'}
                            </div>
                            <div className="text-slate-500 text-xs">delay: {co.delay}s</div>
                            {co.note && <div className="text-slate-400 text-xs mt-1">{co.note}</div>}
                            <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${co.color === 'blue' ? 'bg-blue-400' : 'bg-green-400'}`}
                                    style={{ width: `${Math.min(100, (co.elapsed / co.delay) * 100)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {t !== undefined && (
                <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl p-3 border border-slate-700">
                    <div className="text-slate-400 text-sm">Elapsed:</div>
                    <div className="text-2xl font-bold text-zinc-300">t = {t}s</div>
                    {t === 2 && <div className="ml-auto text-green-400 text-sm font-semibold">vs 3s sequential ✓</div>}
                </div>
            )}

            <div className="bg-slate-900 rounded-xl border border-slate-700 p-3">
                <div className="text-slate-500 text-xs mb-1.5">Output</div>
                <div className="font-mono text-sm space-y-0.5 min-h-[24px]">
                    {output.map((line, i) => (
                        <div key={i} className={line.startsWith('A') ? 'text-blue-300' : 'text-green-300'}>{line}</div>
                    ))}
                    {output.length === 0 && <div className="text-slate-600">—</div>}
                </div>
            </div>

            {note && (
                <div className="bg-zinc-500/10 border border-zinc-500/30 rounded-lg px-3 py-2">
                    <p className="text-zinc-300 text-xs">{note}</p>
                </div>
            )}
        </div>
    );
}

// ─── Scene: Async vs Parallel ─────────────────────────────────────────────────
function SceneAsyncVsParallel({ step }) {
    const { mode, asyncLanes, parallelLanes, highlight, note } = step;

    const Lane = ({ lane }) => (
        <div className="flex items-center gap-3">
            <div className="w-20 text-slate-300 text-sm font-medium flex-shrink-0">{lane.name}</div>
            <div className="flex gap-0.5 h-8 items-stretch">
                {lane.segments.map((seg, i) => (
                    <div
                        key={i}
                        className={`${SEG_COLOR[seg.type] || 'bg-slate-800'} rounded-sm flex items-center justify-center`}
                        style={{ width: `${seg.w * 2}px` }}
                    >
                        {seg.w > 18 && (
                            <span className="text-[10px] font-medium text-white/80 px-1 truncate">{seg.label}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-5 h-full">
            {(mode === 'both' || mode === 'async') && asyncLanes.length > 0 && (
                <div className={`rounded-xl border p-5 transition-all ${highlight === 'async' ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 bg-slate-800/40'}`}>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 rounded-full bg-blue-400" />
                        <h3 className="text-white font-semibold">Async / Event Loop</h3>
                        <span className="ml-auto bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded">1 thread</span>
                    </div>
                    <div className="space-y-3">
                        {asyncLanes.map(lane => <Lane key={lane.name} lane={lane} />)}
                    </div>
                    <p className="text-slate-500 text-xs mt-3">CPU segments never overlap — but I/O wait time is shared ✓</p>
                </div>
            )}

            {(mode === 'both' || mode === 'parallel') && parallelLanes.length > 0 && (
                <div className={`rounded-xl border p-5 transition-all ${highlight === 'parallel' ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 bg-slate-800/40'}`}>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                        <h3 className="text-white font-semibold">Parallel / Threads</h3>
                        <span className="ml-auto bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded">N threads</span>
                    </div>
                    <div className="space-y-3">
                        {parallelLanes.map(lane => <Lane key={lane.name} lane={lane} />)}
                    </div>
                    <p className="text-slate-500 text-xs mt-3">CPU segments overlap simultaneously — requires locks for shared state</p>
                </div>
            )}

            <div className="mt-auto bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="text-left text-slate-400 font-medium px-4 py-2 text-xs">Scenario</th>
                            <th className="text-center text-blue-400 font-medium px-4 py-2 text-xs">Async</th>
                            <th className="text-center text-green-400 font-medium px-4 py-2 text-xs">Parallel</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {[
                            ['HTTP server (many connections)', '✓ Perfect',  '✓ Works'],
                            ['DB / network I/O',               '✓ Perfect',  '⚠ Overkill'],
                            ['Image / video processing',       '✗ No gain',  '✓ Required'],
                            ['Scientific computing / ML',      '✗ No gain',  '✓ Required'],
                        ].map(([sc, a, p]) => (
                            <tr key={sc}>
                                <td className="text-slate-300 px-4 py-2 text-xs">{sc}</td>
                                <td className={`text-center px-4 py-2 text-xs ${a.startsWith('✓') ? 'text-blue-400' : a.startsWith('⚠') ? 'text-yellow-400' : 'text-slate-600'}`}>{a}</td>
                                <td className={`text-center px-4 py-2 text-xs ${p.startsWith('✓') ? 'text-green-400' : p.startsWith('⚠') ? 'text-yellow-400' : 'text-slate-600'}`}>{p}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {note && (
                <div className="bg-zinc-500/10 border border-zinc-500/30 rounded-lg px-3 py-2">
                    <p className="text-zinc-300 text-xs">{note}</p>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AsyncAwaitPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = STEPS[currentStep];

    useEffect(() => {
        if (!isPlaying) return;
        if (currentStep >= STEPS.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, speed]);

    const reset   = () => { setCurrentStep(0); setIsPlaying(false); };
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Async / Await &amp; the Event Loop</h1>
                    <p className="text-zinc-200 max-w-2xl text-sm">
                        From the blocking problem to cooperative multitasking — see exactly how async/await,
                        microtasks, macrotasks, and Python asyncio work under the hood.
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
                    <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl border border-slate-700/50 p-6 min-h-[540px] flex flex-col">
                        <div className="flex items-center justify-between mb-5">
                            <span className="text-xs bg-zinc-600/40 text-zinc-300 px-2.5 py-1 rounded-md font-medium">
                                Stage {step.stage} — {STAGES[step.stage - 1].label}
                            </span>
                            <span className="text-slate-500 text-xs">
                                {currentStep + 1} / {STEPS.length}
                            </span>
                        </div>

                        <div className="flex-1">
                            {step.stage === 1 && <SceneBlocking step={step} />}
                            {step.stage === 2 && <SceneEventLoop step={step} />}
                            {step.stage === 3 && <SceneJSQueues step={step} />}
                            {step.stage === 4 && <ScenePython step={step} />}
                            {step.stage === 5 && <SceneAsyncVsParallel step={step} />}
                        </div>

                        {/* Controls */}
                        <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <button onClick={reset} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Reset">
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

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 flex-1">
                            <div className="text-slate-300 text-sm font-semibold mb-4">Active Recall Quiz</div>

                            {quizState.complete ? (
                                <div className="text-center py-4">
                                    <div className={`text-3xl font-bold mb-2 ${
                                        quizState.score === QUIZ.length ? 'text-green-400' :
                                        quizState.score >= 2           ? 'text-yellow-400' : 'text-red-400'
                                    }`}>{quizState.score}/{QUIZ.length}</div>
                                    <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                                        {quizState.score === QUIZ.length
                                            ? 'Perfect — async internals locked in.'
                                            : quizState.score >= 2
                                            ? 'Solid. Review microtask/macrotask ordering.'
                                            : 'Review the event loop stages and queue rules.'}
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
                                                        {answered && correct           && <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                                                        {answered && selected && !correct && <XCircle    className="h-3.5 w-3.5 flex-shrink-0" />}
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
